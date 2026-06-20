use axum::{
    http::HeaderMap,
    response::{IntoResponse, Response},
};
use serde::Deserialize;

use crate::generated::yona::pilot::v1::WorkspaceIssueItem;
use crate::persistence::{self, PilotRepository};
use crate::{
    base_path_href, escape_html_attr, escape_html_text, normalize_identifier,
    require_authenticated_user, session::SessionManager, ConnectError, PilotBackend,
    RestRouteError,
};

use super::{filter_workspace_issue_items_by_read_acl, WORKSPACE_DAYS_AGO};

#[derive(Deserialize)]
pub(super) struct DirectUserSidebarQuery {
    hash: Option<String>,
    path: Option<String>,
}

pub(super) async fn direct_user_sidebar(
    headers: HeaderMap,
    query: DirectUserSidebarQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    site_name: String,
) -> Response {
    let session_user_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let iframe_path = legacy_sidebar_iframe_path(&base_path, query);
    let authenticated_sidebar = match (backend, session_user_id) {
        (PilotBackend::Repository(repository), Some(user_id)) => {
            match render_legacy_authenticated_sidebar(&repository, user_id, &base_path).await {
                Ok(sidebar) => Some(sidebar),
                Err(error) => return error.into_response(),
            }
        }
        (PilotBackend::Repository(_), None) => None,
        (PilotBackend::Static, Some(_)) => {
            return RestRouteError::not_implemented("sidebar requires repository backend")
                .into_response();
        }
        (PilotBackend::Static, None) => None,
    };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        render_legacy_user_sidebar_page(
            &base_path,
            &iframe_path,
            authenticated_sidebar.as_deref(),
            &site_name,
        ),
    )
        .into_response()
}

pub(super) async fn direct_user_menu_tab_content_list(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let repository = match backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("usermenu requires repository backend")
                .into_response();
        }
    };
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let actor = match require_authenticated_user(&repository, session.user_id).await {
        Ok(actor) => actor,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let menu =
        match render_legacy_usermenu_tab_content_for_actor(&repository, &actor, &base_path).await {
            Ok(menu) => menu,
            Err(error) => {
                return error.into_response();
            }
        };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        menu,
    )
        .into_response()
}

async fn render_legacy_authenticated_sidebar(
    repository: &PilotRepository,
    user_id: i64,
    base_path: &str,
) -> Result<String, RestRouteError> {
    let actor = require_authenticated_user(repository, Some(user_id))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let menu = render_legacy_usermenu_tab_content_for_actor(repository, &actor, base_path).await?;
    Ok(render_legacy_sidebar_inner(base_path, &actor, &menu))
}

async fn render_legacy_usermenu_tab_content_for_actor(
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    base_path: &str,
) -> Result<String, RestRouteError> {
    let recent_projects = repository
        .list_recent_projects_for_user(actor.id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let member_projects = repository
        .list_member_projects_for_user(actor.id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let recent_issue_records = repository
        .list_recent_workspace_issues_for_user(actor.id, u64::from(WORKSPACE_DAYS_AGO))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let recent_issues =
        filter_workspace_issue_items_by_read_acl(repository, actor.id, recent_issue_records)
            .await
            .map_err(RestRouteError::from_connect_error)?;

    Ok(render_legacy_usermenu_tab_content_list(
        base_path,
        &actor.login_id,
        &recent_projects,
        &member_projects,
        &recent_issues,
    ))
}

fn legacy_sidebar_iframe_path(base_path: &str, query: DirectUserSidebarQuery) -> String {
    let path = query
        .path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("/notifications");
    let mut iframe_path = if path.starts_with('/') {
        base_path_href(base_path, path)
    } else {
        base_path_href(base_path, &format!("/{path}"))
    };
    if let Some(hash) = query
        .hash
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        iframe_path.push('#');
        iframe_path.push_str(hash.trim_start_matches('#'));
    }
    iframe_path
}

fn render_legacy_user_sidebar_page(
    base_path: &str,
    iframe_path: &str,
    authenticated_sidebar: Option<&str>,
    site_name: &str,
) -> String {
    let escaped_site_name = escape_html_text(site_name);
    format!(
        r#"<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>{escaped_site_name}</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<link rel="shortcut icon" type="image/x-icon" href="{favicon}">
<link rel="stylesheet" type="text/css" media="all" href="{bootstrap}">
<link rel="stylesheet" type="text/css" media="all" href="{yobicon}">
<link rel="stylesheet" type="text/css" media="all" href="{usermenu_css}">
<link rel="stylesheet" type="text/css" media="all" href="{yobi_css}">
</head>
<body class="framed-body" id="html-body">
    <div id="sidebar" class="sidebar hide-in-mobile">
        {sidebar}
    <div id="sidebar-bottom" class="sidebar-bottom" style="
        position: absolute;
        bottom: 8px;
        right: 15px;
        color: gray;
    ">Yona, made by <i class="yobicon-hearts" style="
        color: red;
        vertical-align: middle;
    "></i></div>
    </div>
    <div id="mainFrame" class="show-in-mobile-100vh">
        <iframe name="mainFrame" id="mainFrameId" frameborder="0" class="mainFrame" height="100%" width="100%" src="{iframe_path}" ></iframe>
    </div>
    <script type="text/javascript">
        var UsermenuToggleFavoriteProjectUrl = "{favorite_project_url}";
        var UsermenuToggleFoveriteOrganizationUrl = "{favorite_organization_url}";
        var UsermenuGetFoveriteProjectsUrl = "{favorite_projects_url}";
        var UsermenuToggleFavoriteIssueUrl = "{favorite_issue_url}";
        var UsermenuGetFoveriteIssuesUrl = "{favorite_issues_url}";
        var UsermenuUrl = "{usermenu_url}";
    </script>
    <script type="text/javascript" src="{usermenu_js}"></script>
</body>
</html>
"#,
        favicon = escape_html_attr(&base_path_href(base_path, "/assets/images/favicon.ico")),
        bootstrap = escape_html_attr(&base_path_href(
            base_path,
            "/assets/bootstrap/css/bootstrap.css"
        )),
        yobicon = escape_html_attr(&base_path_href(
            base_path,
            "/assets/stylesheets/yobicon/style.css"
        )),
        usermenu_css = escape_html_attr(&base_path_href(
            base_path,
            "/assets/stylesheets/usermenu.css"
        )),
        yobi_css = escape_html_attr(&base_path_href(base_path, "/assets/stylesheets/yobi.css")),
        sidebar = authenticated_sidebar.unwrap_or_default(),
        iframe_path = escape_html_attr(iframe_path),
        favorite_project_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteProjects/")),
        favorite_organization_url = escape_html_attr(&base_path_href(
            base_path,
            "/-_-api/v1/favoriteOrganizations/"
        )),
        favorite_projects_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteProjects")),
        favorite_issue_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteIssues/")),
        favorite_issues_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteIssues")),
        usermenu_url = escape_html_attr(&base_path_href(base_path, "/user/usermenuTabContentList")),
        usermenu_js = escape_html_attr(&base_path_href(
            base_path,
            "/assets/javascripts/common/yona.Usermenu.js"
        )),
    )
}

fn render_legacy_sidebar_inner(
    base_path: &str,
    actor: &persistence::AppUserRecord,
    menu_content: &str,
) -> String {
    format!(
        r##"<div class="row-fluid user-menu-wrap">
    <span class="user-menu"><a href="{profile_href}" target="mainFrame">
        <span class="avatar-wrap smaller">
            <img src="{avatar_url}" />
        </span>
        <span class="caret-text hide-in-mobile">{display_name}</span>
    </a></span>
    <span class="user-menu"><a href="{settings_href}" target="mainFrame">userinfo.accountSetting</a></span>
    <a href="{logout_href}"><span class="user-menu logout label">title.logout</span></a>
    <div class="pin-in-sidebar" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i></div>
</div>
<ul class="nav nav-tabs nm">
    <li class="myOrganizationList">
        <a href="#myOrganizationList" data-toggle="tab">
        title.favorite
        </a>
    </li>
    <li class="myProjectList">
        <a href="#myProjectList" data-toggle="tab">
        title.project
        </a>
    </li>
    <li class="myRecentIssueList">
        <a href="#myRecentIssueList" data-toggle="tab">
            title.recently.visited.issue
        </a>
    </li>
    <li>
        <div class=""><i class="yobicon-refresh refresh-button"></i></div>
    </li>
</ul>
<div class="tab-content tab-box">
    <div id="usermenu-tab-content-list" class="tab-content">
        {menu_content}
    </div>
</div>
    <script>
         $(function(){{
             var activeMenu = localStorage.getItem('sidebarActiveMenu')
             if (activeMenu == null) {{
                $('.myOrganizationList').addClass('active');
                 $('#myOrganizationList').addClass('active');
             }} else {{
                 $('.'+activeMenu).addClass('active');
                 $('#'+activeMenu).addClass('active');
             }}

             $('.refresh-button').on('click', function(){{
                 window.location.reload();
             }});

             $('.myOrganizationList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myOrganizationList');
                 $(".sidebar-bottom").hide();
             }})
             $('.myProjectList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myProjectList');
                 $(".sidebar-bottom").hide();
             }})
             $('.myRecentIssueList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myRecentIssueList');
                 $(".sidebar-bottom").show();
             }})

             $(".pin-in-sidebar").on("click", function () {{
                 localStorage.setItem('shallWeOpenLeftNavigation', "false");
                 window.location = window.location.href;
             }});

         }})
    </script>
"##,
        profile_href =
            escape_html_attr(&base_path_href(base_path, &format!("/{}", actor.login_id))),
        avatar_url = escape_html_attr(&base_path_href(
            base_path,
            "/assets/images/default-avatar-32.png"
        )),
        display_name = escape_html_text(&actor.display_name),
        settings_href = escape_html_attr(&base_path_href(base_path, "/user/editform")),
        logout_href = escape_html_attr(&base_path_href(base_path, "/users/logout")),
        menu_content = menu_content,
    )
}

fn render_legacy_usermenu_tab_content_list(
    base_path: &str,
    actor_login_id: &str,
    recent_projects: &[persistence::ProjectListEntry],
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
    recent_issues: &[WorkspaceIssueItem],
) -> String {
    format!(
        r#"<div class="tab-pane user-project-list active" id="myOrganizationList">
{}
</div>
<div class="tab-pane user-project-list" id="myProjectList">
{}
</div>
<div class="tab-pane user-project-list" id="myRecentIssueList">
{}
</div>
"#,
        render_legacy_usermenu_organizations(base_path, actor_login_id, member_projects),
        render_legacy_usermenu_projects(
            base_path,
            actor_login_id,
            recent_projects,
            member_projects
        ),
        render_legacy_usermenu_recent_issues(base_path, recent_issues)
    )
}

fn render_legacy_usermenu_organizations(
    base_path: &str,
    actor_login_id: &str,
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
) -> String {
    let body = if member_projects.is_empty() {
        render_legacy_usermenu_no_result("organizations", true)
    } else {
        let projects = member_projects
            .iter()
            .map(|project| {
                render_legacy_usermenu_project_item(
                    base_path,
                    &project.owner_name,
                    &project.project_name,
                    &project.project_scope,
                    false,
                )
            })
            .collect::<Vec<_>>()
            .join("");
        format!(
            r#"<ul class="tab-pane user-ul active" id="organizations">
<li class="org-li">
<div class="org-list project-flex-container all-orgs">
<div class="project-item project-item-container">
<div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
<div class="projectName-owner all-org-names flex-item">
<div class="project-name org-name flex-item">{}</div>
<div class="project-owner flex-item sub-project-counter"></div>
</div>
</div>
<div class="star-org flex-item"></div>
</div>
<ul class="project-ul">
{}
</ul>
</li>
<ul class="etc-favorites"></ul>
</ul>"#,
            escape_html_text(actor_login_id),
            projects
        )
    };

    format!(
        r#"<div class="search-result">
<div class="group">
<input class="search-input org-search" type="text" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
{}
</div>"#,
        body
    )
}

fn render_legacy_usermenu_projects(
    base_path: &str,
    actor_login_id: &str,
    recent_projects: &[persistence::ProjectListEntry],
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
) -> String {
    let created_projects = member_projects
        .iter()
        .filter(|project| {
            normalize_identifier(&project.owner_name) == normalize_identifier(actor_login_id)
        })
        .cloned()
        .collect::<Vec<_>>();
    let joined_projects = member_projects
        .iter()
        .filter(|project| {
            normalize_identifier(&project.owner_name) != normalize_identifier(actor_login_id)
        })
        .cloned()
        .collect::<Vec<_>>();

    format!(
        r##"<div>
<div class="search-result">
<div class="tab-pane myproject-list-wrap" >
<div class="group">
<input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
<div class="subtab-wrap subtab-group">
<ul class="nav-subtab unstyled">
<li class="active"><a href="#recentlyVisited" data-toggle="tab">title.recently.visited</a></li>
<li><a href="#createdByMe" data-toggle="tab">title.createdByMe</a></li>
<li><a href="#watching" data-toggle="tab">title.watching</a></li>
<li><a href="#joinmember" data-toggle="tab">title.joinmember</a></li>
</ul>
</div>
<div class="tab-content">
{}
{}
{}
{}
</div>
</div>
</div>
</div>"##,
        render_legacy_usermenu_project_entries(base_path, "recentlyVisited", recent_projects, true),
        render_legacy_usermenu_project_records(base_path, "watching", &[], false),
        render_legacy_usermenu_project_records(base_path, "createdByMe", &created_projects, false),
        render_legacy_usermenu_project_records(base_path, "joinmember", &joined_projects, false)
    )
}

fn render_legacy_usermenu_project_entries(
    base_path: &str,
    id: &str,
    projects: &[persistence::ProjectListEntry],
    active: bool,
) -> String {
    if projects.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = projects
        .iter()
        .map(|project| {
            render_legacy_usermenu_project_item(
                base_path,
                &project.owner_name,
                &project.project_name,
                "",
                false,
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_project_records(
    base_path: &str,
    id: &str,
    projects: &[persistence::WorkspaceMemberProjectRecord],
    active: bool,
) -> String {
    if projects.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = projects
        .iter()
        .map(|project| {
            render_legacy_usermenu_project_item(
                base_path,
                &project.owner_name,
                &project.project_name,
                &project.project_scope,
                false,
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_recent_issues(
    base_path: &str,
    recent_issues: &[WorkspaceIssueItem],
) -> String {
    format!(
        r#"<div>
<div class="search-result">
<div class="tab-pane myproject-list-wrap" >
<div class="group">
<input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
<div class="tab-content">
{}
</div>
</div>
</div>
</div>"#,
        render_legacy_usermenu_issue_entries(
            base_path,
            "recentlyVisitedIssues",
            recent_issues,
            true
        )
    )
}

fn render_legacy_usermenu_issue_entries(
    base_path: &str,
    id: &str,
    issues: &[WorkspaceIssueItem],
    active: bool,
) -> String {
    if issues.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = issues
        .iter()
        .map(|issue| {
            let path = format!(
                "/{}/{}/issue/{}",
                issue.owner_name, issue.project_name, issue.issue_number
            );
            let href = base_path_href(base_path, &path);
            format!(
                r##"<li class="user-li " data-location="{}">
<div class="project-list project-flex-container" data-toggle='popover' data-trigger="hover" data-placement="right" data-content="#{}">
<div class="project-item project-item-container">
<div class="issue-item projectName-owner flex-item">
<div class="issue-title-start">-</div><div class="issue-title flex-item"><a href="{}">{}</a></div>
</div>
</div>
</div>
</li>"##,
                escape_html_attr(&href),
                issue.issue_number,
                escape_html_attr(&href),
                escape_html_text(&issue.title)
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_project_item(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    project_scope: &str,
    favored: bool,
) -> String {
    let path = format!("/{owner_name}/{project_name}");
    let href = base_path_href(base_path, &path);
    let lock_icon = if normalize_identifier(project_scope) == "private" {
        r#" <i class="yobicon-lock yobicon-small"></i>"#
    } else {
        ""
    };
    let star_class = if favored { "starred" } else { "" };
    format!(
        r#"<li class="user-li " data-location="{}">
<div class="project-list project-flex-container">
<div class="project-item project-item-container">
<div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
<div class="projectName-owner flex-item">
<div class="project-name flex-item"><a href="{}">{}{}</a></div>
<div class="project-owner flex-item"><a href="{}">{}</a></div>
</div>
</div>
<div class="star-project flex-item" data-project-id="">
<i class="star {} material-icons">star</i>
</div>
</div>
</li>"#,
        escape_html_attr(&href),
        escape_html_attr(&href),
        escape_html_text(project_name),
        lock_icon,
        escape_html_attr(&base_path_href(base_path, &format!("/{owner_name}"))),
        escape_html_text(owner_name),
        star_class
    )
}

fn render_legacy_usermenu_no_result(id: &str, active: bool) -> String {
    format!(
        r#"<div id="{}" class="no-result tab-pane user-ul {}">title.no.results</div>"#,
        escape_html_attr(id),
        if active { "active" } else { "" }
    )
}

fn render_legacy_usermenu_list(id: &str, active: bool, rows: &str) -> String {
    format!(
        r#"<ul class="tab-pane user-ul {}" id="{}">
{}
</ul>"#,
        if active { "active" } else { "" },
        escape_html_attr(id),
        rows
    )
}
