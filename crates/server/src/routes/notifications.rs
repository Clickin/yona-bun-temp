use axum::{
    extract::Query,
    http::HeaderMap,
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use serde::Deserialize;

use crate::{
    base_path_href, escape_html_attr, escape_html_text, format_project_date_label, persistence,
    session::SessionManager, PilotBackend, RestRouteError,
};

#[derive(Default, Deserialize)]
#[serde(default)]
struct DirectNotificationPartialQuery {
    from: Option<u32>,
    size: Option<u32>,
    limit: Option<u32>,
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    Router::new().route(
        "/notification",
        get(
            move |headers: HeaderMap, Query(query): Query<DirectNotificationPartialQuery>| {
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                async move {
                    direct_notification_partial(headers, query, session_manager, backend, base_path)
                        .await
                }
            },
        ),
    )
}

async fn direct_notification_partial(
    headers: HeaderMap,
    query: DirectNotificationPartialQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let from = query.from.unwrap_or(0);
    let size = query
        .size
        .or(query.limit)
        .filter(|size| *size > 0)
        .unwrap_or(20);
    let Some(user_id) = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
    else {
        return Html(render_legacy_notification_partial(
            &[],
            from,
            size,
            &base_path,
        ))
        .into_response();
    };
    let PilotBackend::Repository(repository) = backend else {
        return RestRouteError::not_implemented("notifications require repository backend")
            .into_response();
    };
    match repository
        .list_notifications_for_user(user_id, from, size)
        .await
    {
        Ok(record) => Html(render_legacy_notification_partial(
            &record.items,
            from,
            size,
            &base_path,
        ))
        .into_response(),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

fn render_legacy_notification_partial(
    items: &[persistence::NotificationItemRecord],
    from: u32,
    size: u32,
    base_path: &str,
) -> String {
    if items.is_empty() {
        return r#"<div class="warning-none">
        <i class="yobicon-danger"></i> notification.none
    </div>"#
            .to_string();
    }

    let mut html = String::new();
    for item in items {
        html.push_str(&render_legacy_notification_item(item, base_path));
    }
    let next_from = from.saturating_add(size);
    html.push_str(&format!(
        r##"<li><a href="javascript:void(0);" id="notification-more" class="ybtn">More</a></li>
<script type="text/javascript">
    $(document).ready(function(){{
        $("#notification-more").click(function() {{
            $("#notification-more").remove();
            $.get("{}", function(data) {{
                $('.activity-streams').append(data);
            }});
        }});
    }});
</script>"##,
        escape_html_attr(&base_path_href(
            base_path,
            &format!("/notification?from={next_from}&size={size}")
        ))
    ));
    html
}

fn render_legacy_notification_item(
    item: &persistence::NotificationItemRecord,
    base_path: &str,
) -> String {
    let message_id = format!("message-{}", item.id);
    let stream_type =
        if item.event_type == "ISSUE_BODY_CHANGED" || item.event_type == "COMMENT_UPDATED" {
            "updated".to_string()
        } else {
            item.type_icon.clone()
        };
    let stream_type_body = if stream_type == "updated" {
        "Edit".to_string()
    } else {
        format!(
            r#"<i class="yobicon-{}"></i>"#,
            escape_html_attr(&item.type_icon)
        )
    };
    let title = if item.target_path.is_empty() {
        escape_html_text(&item.target_title)
    } else {
        format!(
            r#"<a href="{}">{}</a>"#,
            escape_html_attr(&base_path_href(base_path, &item.target_path)),
            escape_html_text(&item.target_title)
        )
    };
    let actor_avatar = if item.actor.login_id.is_empty() {
        format!(
            r#"<div class="smaller">
                            <img src="{}" width="42" height="42">
                        </div>"#,
            escape_html_attr(&base_path_href(
                base_path,
                "/assets/images/default-avatar-64.png"
            ))
        )
    } else {
        format!(
            r#"<a class="avatar-wrap smaller" href="{}">
                            <img src="{}" >
                        </a>"#,
            escape_html_attr(&base_path_href(
                base_path,
                &format!("/{}", item.actor.login_id)
            )),
            escape_html_attr(&item.actor.avatar_url)
        )
    };
    let actor_label = if item.actor.login_id.is_empty() {
        String::new()
    } else {
        format!(
            r#"<a href="{}" class="author">{}</a>@{}"#,
            escape_html_attr(&base_path_href(
                base_path,
                &format!("/{}", item.actor.login_id)
            )),
            escape_html_text(&item.actor.display_name),
            escape_html_text(&item.actor.login_id)
        )
    };
    let created_at = item
        .created
        .map(|created| created.format("%Y-%m-%d %H:%M:%S").to_string())
        .unwrap_or_default();
    format!(
        r#"<li class="notification-stream">
        <div class="stream-type {stream_type}">
                {stream_type_body}
        </div>
        <div class="stream-desc" data-target="{message_id}" data-toggle="learnmore">
            <div class="stream-info">
                <div class="title">
                    {title}
                </div>
                <div class="message-wrap nowrap" id="{message_id}">
                    <div class="message">{message}</div>
                </div>
                <div class="meta">
                    {actor_avatar}
                    {actor_label}
                    <span class="ago pull-right" title="{created_at}">
                        {created_label}
                    </span>
                </div>
            </div>
        </div>
    </li>"#,
        stream_type = escape_html_attr(&stream_type),
        stream_type_body = stream_type_body,
        message_id = escape_html_attr(&message_id),
        title = title,
        message = render_legacy_notification_message(&item.message),
        actor_avatar = actor_avatar,
        actor_label = actor_label,
        created_at = escape_html_attr(&created_at),
        created_label = escape_html_text(&format_project_date_label(item.created)),
    )
}

fn render_legacy_notification_message(message: &str) -> String {
    escape_html_text(message).replace('\n', "<br/>\n")
}
