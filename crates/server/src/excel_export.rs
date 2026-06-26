use axum::response::{IntoResponse, Response};
use http::{HeaderMap, HeaderValue, Method, StatusCode};

use crate::{
    decode_query_component, internal_error, persistence, require_project_read,
    rest_project_issue_filter_from_query, rest_require_project_code_read,
    rest_review_thread_filter, PilotBackend, PilotServiceImpl, RestProjectIssuesQuery,
    RestReviewThreadListQuery, RestRouteError,
};

pub(crate) struct DirectIssueExcelRoute {
    pub(crate) owner_name: String,
    pub(crate) project_name: String,
    pub(crate) query: RestProjectIssuesQuery,
}

pub(crate) struct DirectReviewExcelRoute {
    pub(crate) owner_name: String,
    pub(crate) project_name: String,
    pub(crate) query: RestReviewThreadListQuery,
}

pub(crate) fn direct_issue_excel_route_from_request(
    method: &Method,
    path: &str,
    raw_query: Option<&str>,
    base_path: &str,
) -> Option<DirectIssueExcelRoute> {
    if method != Method::GET && method != Method::HEAD {
        return None;
    }
    let mut relative = path;
    if base_path != "/" {
        if relative == base_path {
            relative = "/";
        } else if let Some(stripped) = relative.strip_prefix(&format!("{base_path}/")) {
            relative = stripped;
        }
    }
    let segments = relative
        .trim_start_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    if segments.len() != 3 || segments[2] != "issues" {
        return None;
    }
    let query = RestProjectIssuesQuery::from_raw_query(raw_query).ok()?;
    if !query.format.eq_ignore_ascii_case("xls") {
        return None;
    }
    Some(DirectIssueExcelRoute {
        owner_name: decode_query_component(segments[0]),
        project_name: decode_query_component(segments[1]),
        query,
    })
}

pub(crate) fn direct_review_excel_route_from_request(
    method: &Method,
    path: &str,
    raw_query: Option<&str>,
    base_path: &str,
) -> Option<DirectReviewExcelRoute> {
    if method != Method::GET && method != Method::HEAD {
        return None;
    }
    let mut relative = path;
    if base_path != "/" {
        if relative == base_path {
            relative = "/";
        } else if let Some(stripped) = relative.strip_prefix(&format!("{base_path}/")) {
            relative = stripped;
        }
    }
    let segments = relative
        .trim_start_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    if segments.len() != 3 || segments[2] != "reviews" {
        return None;
    }
    let query = RestReviewThreadListQuery::from_raw_query(raw_query).ok()?;
    if !query.format.eq_ignore_ascii_case("xls") {
        return None;
    }
    Some(DirectReviewExcelRoute {
        owner_name: decode_query_component(segments[0]),
        project_name: decode_query_component(segments[1]),
        query,
    })
}

pub(crate) async fn direct_issue_excel_export(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    mut query: RestProjectIssuesQuery,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization =
        match require_project_read(repository, &owner_name, &project_name, actor_id).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    query.page_num = 1;
    let filter = match rest_project_issue_filter_from_query(query) {
        Ok(filter) => filter,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let record = match repository
        .list_project_issues_for_export(
            &authorization.project.owner_name,
            &authorization.project.project_name,
            filter,
        )
        .await
    {
        Ok(record) => record,
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    direct_issue_excel_export_response(&authorization.project.project_name, record.items.as_slice())
}

fn direct_issue_excel_export_response(
    project_name: &str,
    items: &[persistence::ProjectIssueListItemRecord],
) -> Response {
    let mut body =
        "\u{feff}Number\tTitle\tState\tAuthor\tAssignee\tMilestone\tLabels\tComments\tVotes\tWatchers\tCreated\tUpdated\n"
            .to_string();
    for item in items {
        let labels = item
            .labels
            .iter()
            .map(|label| {
                if label.category_name.is_empty() {
                    label.name.clone()
                } else {
                    format!("{}: {}", label.category_name, label.name)
                }
            })
            .collect::<Vec<_>>()
            .join(", ");
        let columns = [
            item.issue_number.to_string(),
            item.title.clone(),
            item.state.clone(),
            issue_export_user_label(&item.author_label, &item.author_login_id),
            item.assignee_label.clone(),
            item.milestone_title.clone(),
            labels,
            item.comment_count.to_string(),
            item.voter_count.to_string(),
            item.watcher_count.to_string(),
            item.created_label.clone(),
            item.updated_label.clone(),
        ];
        body.push_str(
            &columns
                .iter()
                .map(|value| issue_export_tsv_cell(value))
                .collect::<Vec<_>>()
                .join("\t"),
        );
        body.push('\n');
    }

    let filename = format!("{}-issues.xls", sanitize_download_filename(project_name));
    let disposition = format!("attachment; filename=\"{filename}\"");
    let mut response = body.into_response();
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/vnd.ms-excel; charset=utf-8"),
    );
    if let Ok(header_value) = HeaderValue::from_str(&disposition) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_DISPOSITION, header_value);
    }
    response
}

fn issue_export_user_label(label: &str, login_id: &str) -> String {
    if label.trim().is_empty() {
        login_id.to_string()
    } else if login_id.trim().is_empty() || label == login_id {
        label.to_string()
    } else {
        format!("{label} ({login_id})")
    }
}

fn issue_export_tsv_cell(value: &str) -> String {
    value
        .replace('\t', " ")
        .replace(['\r', '\n'], " ")
        .trim()
        .to_string()
}

fn sanitize_download_filename(value: &str) -> String {
    value
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

pub(crate) async fn direct_review_excel_export(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    mut query: RestReviewThreadListQuery,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = match rest_require_project_code_read(
        repository,
        &owner_name,
        &project_name,
        actor_id,
    )
    .await
    {
        Ok(authorization) => authorization,
        Err(error) => return error.into_response(),
    };
    query.page_num = 1;
    let record = match repository
        .list_project_review_threads_for_export(
            &authorization.project,
            rest_review_thread_filter(query),
        )
        .await
    {
        Ok(record) => record,
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    direct_review_excel_export_response(
        &authorization.project.project_name,
        record.items.as_slice(),
    )
}

fn direct_review_excel_export_response(
    project_name: &str,
    items: &[persistence::ReviewThreadRecord],
) -> Response {
    let mut body =
        "\u{feff}Thread\tState\tAuthor\tPath\tLines\tCommit\tComments\tCreated\n".to_string();
    for item in items {
        let latest_comment = item
            .comments
            .last()
            .map(|comment| comment.contents_markdown.as_str())
            .unwrap_or_default();
        let columns = [
            item.id.to_string(),
            item.state.clone(),
            issue_export_user_label(&item.author_label, &item.author_login_id),
            item.path.clone(),
            review_thread_line_label(item),
            item.commit_id.clone(),
            latest_comment.to_string(),
            item.created_label.clone(),
        ];
        body.push_str(
            &columns
                .iter()
                .map(|value| issue_export_tsv_cell(value))
                .collect::<Vec<_>>()
                .join("\t"),
        );
        body.push('\n');
    }

    let filename = format!("{}-reviews.xls", sanitize_download_filename(project_name));
    let disposition = format!("attachment; filename=\"{filename}\"");
    let mut response = body.into_response();
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/vnd.ms-excel; charset=utf-8"),
    );
    if let Ok(header_value) = HeaderValue::from_str(&disposition) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_DISPOSITION, header_value);
    }
    response
}

fn review_thread_line_label(item: &persistence::ReviewThreadRecord) -> String {
    match (item.start_line, item.end_line) {
        (Some(start), Some(end)) if start != end => format!("{start}-{end}"),
        (Some(line), _) => line.to_string(),
        _ => String::new(),
    }
}
