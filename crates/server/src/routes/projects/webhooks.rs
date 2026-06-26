use super::*;
use yoram_integrations::{deliver_webhook_with_config, OutboundWebhook, WebhookDeliveryOutcome};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectWebhook {
    git_push: bool,
    id: i64,
    payload_url: String,
    secret: String,
    webhook_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectWebhookDelivery {
    created_label: String,
    error_message: Option<String>,
    event_type: String,
    id: i64,
    payload_url: String,
    request_body: String,
    response_body: Option<String>,
    status: String,
    webhook_id: i64,
    webhook_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectWebhooksResponse {
    deliveries: Vec<RestProjectWebhookDelivery>,
    owner_name: String,
    project_name: String,
    viewer_can_update: bool,
    webhook_types: Vec<&'static str>,
    webhooks: Vec<RestProjectWebhook>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectWebhookBody {
    #[serde(default)]
    git_push: bool,
    payload_url: String,
    #[serde(default)]
    secret: String,
    webhook_type: String,
}
fn project_webhook_type_options() -> Vec<&'static str> {
    vec!["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"]
}

fn project_webhook_type_code(value: &str) -> Result<i16, RestRouteError> {
    match value.trim() {
        "SIMPLE" => Ok(0),
        "DETAIL_SLACK" => Ok(1),
        "DETAIL_HANGOUT_CHAT" => Ok(2),
        "JSON" => Ok(3),
        _ => Err(RestRouteError::bad_request("invalid webhook type")),
    }
}

pub(crate) fn project_webhook_type_label(value: i16) -> String {
    match value {
        1 => "DETAIL_SLACK",
        2 => "DETAIL_HANGOUT_CHAT",
        3 => "JSON",
        _ => "SIMPLE",
    }
    .to_string()
}

fn rest_project_webhook_from_record(
    record: persistence::ProjectWebhookRecord,
) -> RestProjectWebhook {
    RestProjectWebhook {
        git_push: record.git_push,
        id: record.id,
        payload_url: record.payload_url,
        secret: record.secret,
        webhook_type: project_webhook_type_label(record.webhook_type),
    }
}

fn rest_project_webhook_delivery_from_record(
    record: persistence::ProjectWebhookDeliveryRecord,
) -> RestProjectWebhookDelivery {
    RestProjectWebhookDelivery {
        created_label: format_project_date_label(record.created_at),
        error_message: record.error_message,
        event_type: record.event_type,
        id: record.id,
        payload_url: record.payload_url,
        request_body: record.request_body,
        response_body: record.response_body,
        status: record.status,
        webhook_id: record.webhook_id,
        webhook_type: record.webhook_type,
    }
}

fn build_project_webhooks_response(
    authorization: &persistence::ProjectAuthorizationRecord,
    webhooks: persistence::ProjectWebhookListRecord,
    deliveries: Vec<persistence::ProjectWebhookDeliveryRecord>,
) -> Result<RestProjectWebhooksResponse, RestRouteError> {
    Ok(RestProjectWebhooksResponse {
        deliveries: deliveries
            .into_iter()
            .map(rest_project_webhook_delivery_from_record)
            .collect(),
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        viewer_can_update: project_update_allowed(authorization)
            .map_err(RestRouteError::from_connect_error)?,
        webhook_types: project_webhook_type_options(),
        webhooks: webhooks
            .webhooks
            .into_iter()
            .map(rest_project_webhook_from_record)
            .collect(),
    })
}

fn legacy_webhook_event_key<'a>(event_type: &'a str) -> &'a str {
    match event_type {
        "COMMENT_UPDATED" => "notification.type.comment.updated",
        "ISSUE_ASSIGNEE_CHANGED" => "notification.type.issue.assignee.changed",
        "ISSUE_BODY_CHANGED" => "notification.type.issue.body.changed",
        "ISSUE_MILESTONE_CHANGED" => "notification.type.milestone.changed",
        "ISSUE_STATE_CHANGED" => "notification.type.issue.state.changed",
        "NEW_COMMENT" => "notification.type.new.comment",
        "NEW_ISSUE" => "notification.type.new.issue",
        "NEW_POSTING" => "notification.type.new.posting",
        "NEW_PULL_REQUEST" => "notification.type.new.pullrequest",
        "NEW_REVIEW_COMMENT" => "notification.type.new.simple.comment",
        "PULL_REQUEST_MERGED" => "pullRequest.event.message.merged",
        "RESOURCE_DELETED" => "notification.type.issue.deleted",
        _ => event_type,
    }
}

fn legacy_pull_request_review_key(reviewed: bool) -> &'static str {
    if reviewed {
        "notification.pullrequest.reviewed"
    } else {
        "notification.pullrequest.unreviewed"
    }
}

fn legacy_webhook_link(url: &str, label: &str, escape_label: bool) -> String {
    let label = if escape_label {
        label.replace('>', "&gt;")
    } else {
        label.to_string()
    };
    format!(" <{url}|{label}>")
}

fn legacy_hangout_thread_json(thread_name: Option<&str>) -> serde_json::Value {
    match thread_name {
        Some(name) if !name.trim().is_empty() => serde_json::json!({ "name": name }),
        _ => serde_json::json!({}),
    }
}

fn slack_webhook_color<'a>(service: &'a PilotServiceImpl, event_type: &str) -> &'a str {
    service
        .slack_webhook_colors
        .get(event_type)
        .map(String::as_str)
        .unwrap_or("")
}

fn webhook_response_thread_name(response_body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(response_body).ok()?;
    match value.get("thread")?.get("name")? {
        serde_json::Value::String(name) => Some(name.clone()),
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

async fn read_existing_webhook_thread_name(
    repository: &PilotRepository,
    webhook_id: i64,
    resource_type: &str,
    resource_id: &str,
) -> Option<String> {
    repository
        .read_webhook_thread(webhook_id, resource_type, resource_id)
        .await
        .ok()
        .flatten()
        .map(|record| record.thread_id)
}

async fn persist_hangout_webhook_thread_from_delivery(
    repository: &PilotRepository,
    webhook_id: i64,
    resource_type: &str,
    resource_id: &str,
    existing_thread_name: Option<&str>,
    delivery: Result<WebhookDeliveryOutcome, String>,
) {
    if existing_thread_name.is_some() {
        return;
    }
    let Ok(outcome) = delivery else {
        return;
    };
    let Some(response_body) = outcome.response_body else {
        return;
    };
    let Some(thread_id) = webhook_response_thread_name(&response_body) else {
        return;
    };
    let _ = repository
        .create_webhook_thread(persistence::CreateWebhookThreadInput {
            resource_id: resource_id.to_string(),
            resource_type: resource_type.to_string(),
            thread_id,
            webhook_id,
        })
        .await;
}

pub(crate) async fn record_project_webhook_delivery(
    repository: &PilotRepository,
    webhook: &persistence::ProjectWebhookRecord,
    event_type: &str,
    webhook_type: &str,
    request_body: &str,
    delivery: &Result<WebhookDeliveryOutcome, String>,
) {
    let (status, response_body, error_message) = match delivery {
        Ok(outcome) => (
            "SUCCESS".to_string(),
            outcome.response_body.clone(),
            None::<String>,
        ),
        Err(error) => ("FAILURE".to_string(), None, Some(error.clone())),
    };
    let _ = repository
        .create_webhook_delivery(persistence::CreateWebhookDeliveryInput {
            error_message,
            event_type: event_type.to_string(),
            payload_url: webhook.payload_url.clone(),
            request_body: request_body.to_string(),
            response_body,
            status,
            webhook_id: webhook.id,
            webhook_type: webhook_type.to_string(),
        })
        .await;
}

fn issue_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    issue: &persistence::IssueRecord,
    request_message: &str,
    detail_markdown: &str,
    color: &str,
    thread_name: Option<&str>,
) -> String {
    match webhook.webhook_type {
        1 => {
            let mut fields = Vec::new();
            if !issue.milestone_title.trim().is_empty() {
                fields.push(serde_json::json!({
                    "title": "notification.type.milestone.changed",
                    "value": issue.milestone_title,
                    "short": true,
                }));
            }
            fields.push(serde_json::json!({
                "title": "",
                "value": issue.assignee_label,
                "short": true,
            }));
            fields.push(serde_json::json!({
                "title": "issue.state",
                "value": issue.state,
                "short": true,
            }));
            serde_json::json!({
                "text": request_message,
                "attachments": [{
                    "text": detail_markdown,
                    "fields": fields,
                    "color": color,
                }],
            })
            .to_string()
        }
        2 => serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string(),
        _ => serde_json::json!({
            "text": request_message,
        })
        .to_string(),
    }
}

fn posting_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    request_message: &str,
    thread_name: Option<&str>,
) -> String {
    if webhook.webhook_type == 2 {
        serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string()
    } else {
        serde_json::json!({
            "text": request_message,
        })
        .to_string()
    }
}

fn posting_comment_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    request_message: &str,
    detail_markdown: &str,
    color: &str,
    thread_name: Option<&str>,
) -> String {
    match webhook.webhook_type {
        1 => serde_json::json!({
            "text": request_message,
            "attachments": [{
                "text": detail_markdown,
                "fields": null,
                "color": color,
            }],
        })
        .to_string(),
        2 => serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string(),
        _ => serde_json::json!({
            "text": request_message,
        })
        .to_string(),
    }
}

pub(crate) async fn dispatch_posting_webhooks(
    repository: &PilotRepository,
    posting: &persistence::PostingRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    target_fragment: Option<&str>,
    public_origin: &str,
    base_path: &str,
    service: &PilotServiceImpl,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&posting.owner_name, &posting.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let mut path = format!(
        "/{}/{}/post/{}",
        posting.owner_name, posting.project_name, posting.post_number
    );
    if let Some(fragment) = target_fragment {
        path.push_str(fragment);
    }
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!("#{}: {}", posting.post_number, posting.title);
    let resource_id = posting.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "BOARD_POST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let request_message = format!(
            "[{}] {} {}{}",
            project.project_name,
            actor.display_name,
            legacy_webhook_event_key(event_type),
            legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1)
        );
        let body = posting_webhook_payload(&webhook, &request_message, thread_name.as_deref());
        let request_body = body.clone();
        let delivery = deliver_webhook_with_config(
            OutboundWebhook {
                body,
                event_type: event_type.to_string(),
                payload_url: webhook.payload_url.clone(),
                secret: webhook.secret.clone(),
                webhook_type,
            },
            &service.integrations,
        );
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "BOARD_POST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}

pub(crate) async fn dispatch_posting_comment_webhooks(
    repository: &PilotRepository,
    posting: &persistence::PostingRecord,
    comment: &persistence::PostingCommentRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    public_origin: &str,
    base_path: &str,
    service: &PilotServiceImpl,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&posting.owner_name, &posting.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let path = format!(
        "/{}/{}/post/{}#comment-{}",
        posting.owner_name, posting.project_name, posting.post_number, comment.id
    );
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!("#{}: {}", posting.post_number, posting.title);
    let resource_id = posting.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "BOARD_POST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let request_message = format!(
            "[{}] {} {}{}",
            project.project_name,
            actor.display_name,
            legacy_webhook_event_key(event_type),
            legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1)
        );
        let body = posting_comment_webhook_payload(
            &webhook,
            &request_message,
            &comment.contents_markdown,
            slack_webhook_color(service, event_type),
            thread_name.as_deref(),
        );
        let request_body = body.clone();
        let delivery = deliver_webhook_with_config(
            OutboundWebhook {
                body,
                event_type: event_type.to_string(),
                payload_url: webhook.payload_url.clone(),
                secret: webhook.secret.clone(),
                webhook_type,
            },
            &service.integrations,
        );
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "BOARD_POST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}

pub(crate) async fn dispatch_issue_webhooks(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    detail_markdown: &str,
    target_fragment: Option<&str>,
    public_origin: &str,
    base_path: &str,
    service: &PilotServiceImpl,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&issue.owner_name, &issue.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let mut path = format!(
        "/{}/{}/issue/{}",
        issue.owner_name, issue.project_name, issue.issue_number
    );
    if let Some(fragment) = target_fragment {
        path.push_str(fragment);
    }
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!("#{}: {}", issue.issue_number, issue.title);
    let resource_id = issue.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "ISSUE_POST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let request_message = format!(
            "[{}] {} {}{}",
            project.project_name,
            actor.display_name,
            legacy_webhook_event_key(event_type),
            legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1)
        );
        let body = issue_webhook_payload(
            &webhook,
            issue,
            &request_message,
            detail_markdown,
            slack_webhook_color(service, event_type),
            thread_name.as_deref(),
        );
        let request_body = body.clone();
        let delivery = deliver_webhook_with_config(
            OutboundWebhook {
                body,
                event_type: event_type.to_string(),
                payload_url: webhook.payload_url.clone(),
                secret: webhook.secret.clone(),
                webhook_type,
            },
            &service.integrations,
        );
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "ISSUE_POST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}

fn pull_request_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    pull_request: &persistence::PullRequestDetailRecord,
    request_message: &str,
    detail_markdown: &str,
    color: &str,
    thread_name: Option<&str>,
) -> String {
    match webhook.webhook_type {
        1 => serde_json::json!({
            "text": request_message,
            "attachments": [{
                "text": detail_markdown,
                "fields": [
                    {
                        "title": "pullRequest.sender",
                        "value": pull_request.contributor.user_label,
                        "short": false,
                    },
                    {
                        "title": "pullRequest.from",
                        "value": pull_request.from_branch,
                        "short": true,
                    },
                    {
                        "title": "pullRequest.to",
                        "value": pull_request.to_branch,
                        "short": true,
                    },
                ],
                "color": color,
            }],
        })
        .to_string(),
        2 => serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string(),
        _ => serde_json::json!({
            "text": request_message,
        })
        .to_string(),
    }
}

pub(crate) async fn dispatch_pull_request_webhooks(
    repository: &PilotRepository,
    pull_request: &persistence::PullRequestDetailRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    detail_markdown: &str,
    target_fragment: Option<&str>,
    reviewed: Option<bool>,
    public_origin: &str,
    base_path: &str,
    service: &PilotServiceImpl,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&pull_request.owner_name, &pull_request.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let mut path = format!(
        "/{}/{}/pullRequest/{}",
        pull_request.owner_name, pull_request.project_name, pull_request.pull_request_number
    );
    if let Some(fragment) = target_fragment {
        path.push_str(fragment);
    }
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!(
        "#{}: {}",
        pull_request.pull_request_number, pull_request.title
    );
    let resource_id = pull_request.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "PULL_REQUEST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let link = legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1);
        let request_message = if event_type == "PULL_REQUEST_REVIEW_STATE_CHANGED" {
            format!(
                "[{}] {} {}{}",
                project.project_name,
                legacy_pull_request_review_key(reviewed.unwrap_or(true)),
                actor.display_name,
                link
            )
        } else {
            format!(
                "[{}] {} {}{}",
                project.project_name,
                actor.display_name,
                legacy_webhook_event_key(event_type),
                link
            )
        };
        let body = pull_request_webhook_payload(
            &webhook,
            pull_request,
            &request_message,
            detail_markdown,
            slack_webhook_color(service, event_type),
            thread_name.as_deref(),
        );
        let request_body = body.clone();
        let delivery = deliver_webhook_with_config(
            OutboundWebhook {
                body,
                event_type: event_type.to_string(),
                payload_url: webhook.payload_url.clone(),
                secret: webhook.secret.clone(),
                webhook_type,
            },
            &service.integrations,
        );
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "PULL_REQUEST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}
pub(super) async fn rest_read_project_webhooks(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project webhooks require repository backend",
        ));
    };
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let webhooks = repository
        .list_project_webhooks(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
}

pub(super) async fn rest_create_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectWebhookBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project webhooks require repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let payload_url = body.payload_url.trim().to_string();
    let secret = body.secret.trim().to_string();
    if payload_url.is_empty() {
        return Err(RestRouteError::bad_request(
            "project.webhook.payloadUrl.empty",
        ));
    }
    if payload_url.len() > 2000 {
        return Err(RestRouteError::bad_request(
            "project.webhook.payloadUrl.maxLength",
        ));
    }
    if secret.len() > 250 {
        return Err(RestRouteError::bad_request(
            "project.webhook.secret.maxLength",
        ));
    }
    let webhook_type = project_webhook_type_code(&body.webhook_type)?;
    let webhooks = repository
        .create_project_webhook(persistence::CreateProjectWebhookInput {
            git_push: body.git_push,
            payload_url,
            project_id: authorization.project.id,
            secret,
            webhook_type,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
}

pub(super) async fn rest_delete_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    webhook_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project webhooks require repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let Some(webhooks) = repository
        .delete_project_webhook(authorization.project.id, webhook_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    else {
        return Err(RestRouteError::not_found("project webhook not found"));
    };
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
}

pub(super) async fn direct_create_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let body = RestProjectWebhookBody {
        git_push: form.contains_key("gitPush")
            || form
                .get("gitPush")
                .is_some_and(|value| matches!(value.as_str(), "true" | "on" | "1")),
        payload_url: form_value(&form, &["payloadUrl", "payload_url"]).to_string(),
        secret: form_value(&form, &["secret"]).to_string(),
        webhook_type: form_value(&form, &["webhookType", "webhook_type"]).to_string(),
    };
    match rest_create_project_webhook(
        headers,
        owner_name.clone(),
        project_name.clone(),
        body,
        service.clone(),
    )
    .await
    {
        Ok(_) => redirect_to(
            &service.base_path,
            &format!("/{owner_name}/{project_name}/webhooks"),
        ),
        Err(error) => error.into_response(),
    }
}

pub(super) async fn direct_delete_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    webhook_id: i64,
    service: PilotServiceImpl,
) -> Response {
    match rest_delete_project_webhook(headers, owner_name, project_name, webhook_id, service).await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}
