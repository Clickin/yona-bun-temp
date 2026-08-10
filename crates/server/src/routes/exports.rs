use axum::{
    body::Body,
    extract::{Path, Query},
    http::{header, HeaderMap, HeaderValue},
    response::Response,
    routing::{get, post},
    Router,
};
use bytes::Bytes;
use futures::future::BoxFuture;
use futures::{Stream, StreamExt, TryStreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::VecDeque;
use std::pin::Pin;
use std::task::{Context as TaskContext, Poll};
use tokio::sync::mpsc;

use super::site_admin::{
    normalize_site_import_project_member_role, rest_import_site_data_from_source,
    rest_site_export_issue_from_record, rest_site_export_milestone_from_record,
    rest_site_export_post_from_record, rest_site_export_project_label_from_record,
    ImportRecordSource, RestSiteExportIssueItem, RestSiteExportMilestoneItem,
    RestSiteExportPostItem, RestSiteExportProjectLabelItem, RestSiteExportProjectMemberItem,
    RestSiteImportCheckpoint, RestSiteImportCountSet, RestSiteImportOrganizationItem,
    RestSiteImportOrganizationMemberItem, RestSiteImportProjectItem, RestSiteImportPullRequestItem,
    RestSiteImportResponse, RestSiteImportUserItem,
};
use crate::persistence::{IssueListFilter, MilestoneListFilter, PostingListFilter};
use crate::{
    append_response_headers, internal_error, require_project_read, rest_actor_id,
    rest_json_response, rest_require_migration_actor, rest_repository, ConnectError, Context,
    PilotBackend, PilotServiceImpl, RestRouteError,
};

const NDJSON_CONTENT_TYPE: &str = "application/x-ndjson";

// ── NDJSON line envelopes ────────────────────────────────────────────────

#[derive(Serialize)]
struct NdjsonEnvelope<T: Serialize> {
    kind: &'static str,
    #[serde(flatten)]
    record: T,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NdjsonProjectLine {
    kind: &'static str,
    id: i64,
    organization_id: i64,
    owner: String,
    project_name: String,
    project_description: String,
    project_created_date: String,
    project_vcs: String,
    project_scope: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NdjsonDoneLine {
    kind: &'static str,
    member_count: u32,
    issue_count: u32,
    post_count: u32,
    milestone_count: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct NdjsonProjectImportLine {
    id: i64,
    organization_id: i64,
    #[serde(alias = "owner")]
    owner_name: String,
    #[serde(alias = "projectDescription")]
    overview: String,
    project_name: String,
    #[serde(alias = "projectCreatedDate")]
    created_at: String,
    #[serde(alias = "projectVcs")]
    vcs: String,
    project_scope: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct ProjectImportQuery {
    dry_run: bool,
}

// ── Export handler ───────────────────────────────────────────────────────

async fn rest_project_export(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let _authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;

    let project = repository
        .read_project_by_owner_and_name(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;

    let project_line = serde_json::to_string(&NdjsonProjectLine {
        kind: "project",
        id: project.id,
        organization_id: project.organization_id.unwrap_or_default(),
        owner: owner_name.clone(),
        project_name: project_name.clone(),
        project_description: project.overview.unwrap_or_default(),
        project_created_date: project
            .created_date
            .map(|value| value.to_string())
            .unwrap_or_default(),
        project_vcs: project.vcs,
        project_scope: project.project_scope,
    })
    .map_err(|error| RestRouteError::internal(error.to_string()))?;

    let (tx, rx) = mpsc::channel::<Result<Bytes, RestRouteError>>(1);
    let stream_service = service.clone();
    let stream_owner = owner_name.clone();
    let stream_project = project_name.clone();
    tokio::spawn(async move {
        if send_line(&tx, &project_line).await.is_err() {
            return;
        }
        if let Err(error) =
            stream_project_ndjson(&stream_service, &stream_owner, &stream_project, &tx).await
        {
            let _ = tx.send(Err(error)).await;
        }
    });

    let mut response = Response::new(Body::from_stream(
        BodyReceiverStream { rx }.map_err(|error| std::io::Error::other(error.to_string())),
    ));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(NDJSON_CONTENT_TYPE),
    );
    let ctx = Context::new(headers);
    append_response_headers(response.headers_mut(), &ctx.response_headers);
    Ok(response)
}

struct BodyReceiverStream {
    rx: mpsc::Receiver<Result<Bytes, RestRouteError>>,
}

impl Stream for BodyReceiverStream {
    type Item = Result<Bytes, RestRouteError>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut TaskContext<'_>) -> Poll<Option<Self::Item>> {
        self.rx.poll_recv(cx)
    }
}

async fn send_line(
    tx: &mpsc::Sender<Result<Bytes, RestRouteError>>,
    line: &str,
) -> Result<(), RestRouteError> {
    let bytes = Bytes::from(format!("{line}\n"));
    tx.send(Ok(bytes))
        .await
        .map_err(|_| RestRouteError::internal("project export client disconnected"))
}

async fn send_record<T: Serialize>(
    tx: &mpsc::Sender<Result<Bytes, RestRouteError>>,
    kind: &'static str,
    record: T,
) -> Result<(), RestRouteError> {
    let line = serde_json::to_string(&NdjsonEnvelope { kind, record })
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    send_line(tx, &line).await
}

async fn stream_project_ndjson(
    service: &PilotServiceImpl,
    owner_name: &str,
    project_name: &str,
    tx: &mpsc::Sender<Result<Bytes, RestRouteError>>,
) -> Result<(), RestRouteError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project export requires repository backend",
        ));
    };
    let data_root = &service.data_root;

    let mut member_count = 0u32;
    let mut issue_count = 0u32;
    let mut post_count = 0u32;
    let mut milestone_count = 0u32;

    let members = repository
        .read_project_members(owner_name, project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for member in members.members {
        let item = RestSiteExportProjectMemberItem {
            id: 0,
            login_id: member.login_id,
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            role: normalize_site_import_project_member_role(&member.role),
        };
        send_record(tx, "member", item).await?;
        member_count += 1;
    }

    let labels = repository
        .list_project_labels(owner_name, project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for label in labels {
        let item = rest_site_export_project_label_from_record(owner_name, project_name, &label);
        send_record(tx, "label", item).await?;
    }

    let milestones = repository
        .list_project_milestones(
            owner_name,
            project_name,
            MilestoneListFilter {
                order_by: "dueDate".to_string(),
                order_dir: "asc".to_string(),
                state: "all".to_string(),
            },
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for milestone in milestones {
        let item = rest_site_export_milestone_from_record(
            data_root,
            owner_name,
            project_name,
            &milestone,
        );
        send_record(tx, "milestone", item).await?;
        milestone_count += 1;
    }

    for state in ["open", "closed"] {
        let mut page = 1u32;
        loop {
            let record = repository
                .list_project_issues_for_export(
                    owner_name,
                    project_name,
                    IssueListFilter {
                        assignee_id: None,
                        assignee_login_id: None,
                        author_id: None,
                        author_login_id: None,
                        commenter_id: None,
                        due_date: None,
                        draft_author_login_id: None,
                        filter: None,
                        label_ids: Vec::new(),
                        milestone_id: None,
                        order_by: "number".to_string(),
                        order_dir: "desc".to_string(),
                        page_num: page,
                        state: Some(state.to_string()),
                    },
                )
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?;
            for item in record.items {
                let issue_number = item.issue_number;
                let detail = repository
                    .read_issue_detail(owner_name, project_name, issue_number)
                    .await
                    .map_err(internal_error)
                    .map_err(RestRouteError::from_connect_error)?
                    .ok_or_else(|| {
                        RestRouteError::internal("project export issue disappeared")
                    })?;
                let export_item = rest_site_export_issue_from_record(data_root, &detail);
                send_record(tx, "issue", export_item).await?;
                issue_count += 1;
            }
            let total_pages =
                (record.total_count + record.page_size - 1) / record.page_size.max(1);
            if page >= total_pages {
                break;
            }
            page += 1;
        }
    }

    let mut page = 1u32;
    let readme_post = loop {
        let record = repository
            .list_project_postings_filtered(
                owner_name,
                project_name,
                PostingListFilter {
                    filter: None,
                    label_ids: Vec::new(),
                    order_by: "updatedDate".to_string(),
                    order_dir: "desc".to_string(),
                    page_num: page,
                },
                None,
            )
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
        for item in record.items {
            let post_number = item.post_number;
            let detail = repository
                .read_posting_detail_for_viewer(owner_name, project_name, post_number, None)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .ok_or_else(|| RestRouteError::internal("project export post disappeared"))?;
            let export_item = rest_site_export_post_from_record(data_root, &detail);
            send_record(tx, "post", export_item).await?;
            post_count += 1;
        }
        let total_pages = (record.total_count + record.page_size - 1) / record.page_size.max(1);
        if page >= total_pages {
            break record.readme;
        }
        page += 1;
    };
    if let Some(readme) = readme_post {
        let export_item = rest_site_export_post_from_record(data_root, &readme);
        send_record(tx, "post", export_item).await?;
        post_count += 1;
    }

    let done_line = serde_json::to_string(&NdjsonDoneLine {
        kind: "done",
        member_count,
        issue_count,
        post_count,
        milestone_count,
    })
    .map_err(|error| RestRouteError::internal(error.to_string()))?;
    send_line(tx, &done_line).await
}

// ── Import handler ───────────────────────────────────────────────────────

async fn rest_project_import(
    headers: HeaderMap,
    Path((owner_name, project_name)): Path<(String, String)>,
    Query(query): Query<ProjectImportQuery>,
    body: Body,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    // Session path keeps prior behavior (no CSRF); Bearer/Yona-Token path is
    // the migration-tool entry point. Auth material resolves before the
    // repository so anonymous requests keep the prior 401 ordering.
    let user_id = rest_require_migration_actor(&service, &headers, false).await?;
    let repository = rest_repository(&service)?;

    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(user_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;

    if !authorization.viewer.is_site_admin && !authorization.viewer.is_project_manager {
        let error = ConnectError::permission_denied("site admin or project owner required");
        return Err(RestRouteError::from_connect_error(error));
    }

    let mut source = NdjsonImportRecordSource::new(body.into_data_stream(), owner_name, project_name);
    if query.dry_run {
        let counts = source.count_records().await?;
        let mut response = RestSiteImportResponse::dry_run(
            counts,
            RestSiteImportCountSet::default(),
            Vec::new(),
            Vec::new(),
            RestSiteImportCheckpoint::streaming(),
        );
        response.streaming = true;
        let ctx = Context::new(headers);
        return Ok(rest_json_response(response, ctx));
    }

    let (status, response) = rest_import_site_data_from_source(
        &service,
        repository,
        &mut source,
        RestSiteImportCheckpoint::streaming(),
        true,
    )
    .await?;
    let ctx = Context::new(headers);
    let mut http_response = rest_json_response(response, ctx);
    *http_response.status_mut() = status;
    Ok(http_response)
}

// ── NDJSON import record source ──────────────────────────────────────────

enum NdjsonRecord {
    Project(RestSiteImportProjectItem),
    Member(RestSiteExportProjectMemberItem),
    Label(RestSiteExportProjectLabelItem),
    Milestone(RestSiteExportMilestoneItem),
    Post(RestSiteExportPostItem),
    Issue(RestSiteExportIssueItem),
    Done,
}

struct NdjsonImportRecordSource {
    stream: axum::body::BodyDataStream,
    line_buffer: Vec<u8>,
    buffered_members: VecDeque<RestSiteExportProjectMemberItem>,
    buffered_labels: VecDeque<RestSiteExportProjectLabelItem>,
    buffered_milestones: VecDeque<RestSiteExportMilestoneItem>,
    pending: Option<NdjsonRecord>,
    project_returned: bool,
    owner_name: String,
    project_name: String,
}

impl NdjsonImportRecordSource {
    fn new(
        stream: axum::body::BodyDataStream,
        owner_name: String,
        project_name: String,
    ) -> Self {
        Self {
            stream,
            line_buffer: Vec::new(),
            buffered_members: VecDeque::new(),
            buffered_labels: VecDeque::new(),
            buffered_milestones: VecDeque::new(),
            pending: None,
            project_returned: false,
            owner_name,
            project_name,
        }
    }

    fn validate_ref(&self, record_owner: &str, record_project: &str) -> Result<(), RestRouteError> {
        if record_owner.trim() == self.owner_name && record_project.trim() == self.project_name {
            Ok(())
        } else {
            Err(RestRouteError::bad_request(
                "ndjson record owner/project does not match import path",
            ))
        }
    }

    async fn read_record(&mut self) -> Result<Option<NdjsonRecord>, RestRouteError> {
        loop {
            if let Some(line_end) = self.line_buffer.iter().position(|&byte| byte == b'\n') {
                let line: Vec<u8> = self.line_buffer.drain(..=line_end).collect();
                let line = &line[..line.len() - 1];
                if line.iter().all(|byte| byte.is_ascii_whitespace()) {
                    continue;
                }
                return self.parse_line(line).map(Some);
            }
            match self.stream.next().await {
                Some(Ok(chunk)) => self.line_buffer.extend_from_slice(&chunk),
                Some(Err(error)) => {
                    return Err(RestRouteError::bad_request(format!(
                        "invalid ndjson import body: {error}"
                    )));
                }
                None => return Ok(None),
            }
        }
    }

    fn parse_line(&mut self, line: &[u8]) -> Result<NdjsonRecord, RestRouteError> {
        let value: Value = serde_json::from_slice(line).map_err(|error| {
            RestRouteError::bad_request(format!("invalid ndjson record: {error}"))
        })?;
        let kind = value
            .get("kind")
            .and_then(Value::as_str)
            .ok_or_else(|| RestRouteError::bad_request("ndjson record missing kind"))?;
        match kind {
            "project" => {
                let line: NdjsonProjectImportLine = serde_json::from_value(value).map_err(
                    |error| {
                        RestRouteError::bad_request(format!("invalid project record: {error}"))
                    },
                )?;
                Ok(NdjsonRecord::Project(RestSiteImportProjectItem {
                    created_at: line.created_at,
                    id: line.id,
                    organization_id: line.organization_id,
                    owner_name: line.owner_name,
                    overview: line.overview,
                    project_name: line.project_name,
                    project_scope: line.project_scope,
                    vcs: line.vcs,
                }))
            }
            "member" => parse_item::<RestSiteExportProjectMemberItem>(value).map(NdjsonRecord::Member),
            "label" => parse_item::<RestSiteExportProjectLabelItem>(value).map(NdjsonRecord::Label),
            "milestone" => parse_item::<RestSiteExportMilestoneItem>(value)
                .map(NdjsonRecord::Milestone),
            "post" => parse_item::<RestSiteExportPostItem>(value).map(NdjsonRecord::Post),
            "issue" => parse_item::<RestSiteExportIssueItem>(value).map(NdjsonRecord::Issue),
            "done" => Ok(NdjsonRecord::Done),
            other => Err(RestRouteError::bad_request(format!(
                "unsupported ndjson record kind: {other}"
            ))),
        }
    }

    fn stash_pending(&mut self, record: NdjsonRecord) -> Result<(), RestRouteError> {
        if self.pending.is_some() {
            return Err(RestRouteError::bad_request("ndjson records out of order"));
        }
        self.pending = Some(record);
        Ok(())
    }

    fn take_pending_matching(
        &mut self,
        matches: impl FnOnce(&NdjsonRecord) -> bool,
    ) -> Option<NdjsonRecord> {
        if self.pending.as_ref().is_some_and(matches) {
            self.pending.take()
        } else {
            None
        }
    }

    /// Consumes the whole stream (dry-run), validating every record against the
    /// import path and counting records per section.
    async fn count_records(&mut self) -> Result<RestSiteImportCountSet, RestRouteError> {
        let mut counts = RestSiteImportCountSet::default();
        loop {
            match self.read_record().await? {
                Some(NdjsonRecord::Project(project)) => {
                    self.validate_ref(&project.owner_name, &project.project_name)?;
                    counts.projects = counts.projects.saturating_add(1);
                }
                Some(NdjsonRecord::Member(member)) => {
                    self.validate_ref(&member.owner_name, &member.project_name)?;
                    counts.project_members = counts.project_members.saturating_add(1);
                }
                Some(NdjsonRecord::Label(label)) => {
                    self.validate_ref(&label.owner_name, &label.project_name)?;
                    counts.labels = counts.labels.saturating_add(1);
                }
                Some(NdjsonRecord::Milestone(milestone)) => {
                    self.validate_ref(&milestone.owner_name, &milestone.project_name)?;
                    counts.milestones = counts.milestones.saturating_add(1);
                    counts.attachments =
                        counts.attachments.saturating_add(milestone.attachments.len() as u32);
                }
                Some(NdjsonRecord::Post(post)) => {
                    self.validate_ref(&post.owner_name, &post.project_name)?;
                    counts.posts = counts.posts.saturating_add(1);
                    counts.attachments =
                        counts.attachments.saturating_add(post.attachments.len() as u32);
                }
                Some(NdjsonRecord::Issue(issue)) => {
                    self.validate_ref(&issue.owner_name, &issue.project_name)?;
                    counts.issues = counts.issues.saturating_add(1);
                    counts.attachments =
                        counts.attachments.saturating_add(issue.attachments.len() as u32);
                }
                Some(NdjsonRecord::Done) | None => break,
            }
        }
        Ok(counts)
    }
}

impl ImportRecordSource for NdjsonImportRecordSource {
    fn next_user(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteImportUserItem>, RestRouteError>> {
        Box::pin(async move { Ok(None) })
    }

    fn next_organization(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteImportOrganizationItem>, RestRouteError>> {
        Box::pin(async move { Ok(None) })
    }

    fn next_organization_member(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteImportOrganizationMemberItem>, RestRouteError>> {
        Box::pin(async move { Ok(None) })
    }

    fn next_pull_request(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteImportPullRequestItem>, RestRouteError>> {
        Box::pin(async move { Ok(None) })
    }

    fn next_project(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteImportProjectItem>, RestRouteError>> {
        Box::pin(async move {
            if self.project_returned {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Project(project)) => {
                        self.validate_ref(&project.owner_name, &project.project_name)?;
                        self.project_returned = true;
                        return Ok(Some(project));
                    }
                    Some(NdjsonRecord::Member(member)) => {
                        self.buffered_members.push_back(member);
                    }
                    Some(NdjsonRecord::Label(label)) => {
                        self.buffered_labels.push_back(label);
                    }
                    Some(NdjsonRecord::Milestone(milestone)) => {
                        self.buffered_milestones.push_back(milestone);
                    }
                    Some(NdjsonRecord::Post(_)) | Some(NdjsonRecord::Issue(_)) => {
                        return Err(RestRouteError::bad_request(
                            "post/issue before project metadata",
                        ));
                    }
                    Some(NdjsonRecord::Done) | None => {
                        return Err(RestRouteError::bad_request("missing project metadata"));
                    }
                }
            }
        })
    }

    fn next_member(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteExportProjectMemberItem>, RestRouteError>> {
        Box::pin(async move {
            if let Some(NdjsonRecord::Member(member)) = self
                .take_pending_matching(|record| matches!(record, NdjsonRecord::Member(_)))
            {
                return Ok(Some(member));
            }
            if let Some(member) = self.buffered_members.pop_front() {
                return Ok(Some(member));
            }
            if self.pending.is_some() {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Member(member)) => {
                        self.validate_ref(&member.owner_name, &member.project_name)?;
                        return Ok(Some(member));
                    }
                    Some(NdjsonRecord::Label(label)) => {
                        self.buffered_labels.push_back(label);
                    }
                    Some(NdjsonRecord::Milestone(milestone)) => {
                        self.buffered_milestones.push_back(milestone);
                    }
                    Some(NdjsonRecord::Project(_)) => {
                        return Err(RestRouteError::bad_request("duplicate project metadata"));
                    }
                    Some(record @ (NdjsonRecord::Post(_)
                    | NdjsonRecord::Issue(_)
                    | NdjsonRecord::Done)) => {
                        self.stash_pending(record)?;
                        return Ok(None);
                    }
                    None => return Ok(None),
                }
            }
        })
    }

    fn next_label(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteExportProjectLabelItem>, RestRouteError>> {
        Box::pin(async move {
            if let Some(NdjsonRecord::Label(label)) = self
                .take_pending_matching(|record| matches!(record, NdjsonRecord::Label(_)))
            {
                return Ok(Some(label));
            }
            if let Some(label) = self.buffered_labels.pop_front() {
                return Ok(Some(label));
            }
            if self.pending.is_some() {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Label(label)) => {
                        self.validate_ref(&label.owner_name, &label.project_name)?;
                        return Ok(Some(label));
                    }
                    Some(NdjsonRecord::Milestone(milestone)) => {
                        self.buffered_milestones.push_back(milestone);
                    }
                    Some(NdjsonRecord::Project(_)) => {
                        return Err(RestRouteError::bad_request("duplicate project metadata"));
                    }
                    Some(NdjsonRecord::Member(_)) => {
                        return Err(RestRouteError::bad_request("ndjson records out of order"));
                    }
                    Some(record @ (NdjsonRecord::Post(_)
                    | NdjsonRecord::Issue(_)
                    | NdjsonRecord::Done)) => {
                        self.stash_pending(record)?;
                        return Ok(None);
                    }
                    None => return Ok(None),
                }
            }
        })
    }

    fn next_milestone(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteExportMilestoneItem>, RestRouteError>> {
        Box::pin(async move {
            if let Some(NdjsonRecord::Milestone(milestone)) = self
                .take_pending_matching(|record| matches!(record, NdjsonRecord::Milestone(_)))
            {
                return Ok(Some(milestone));
            }
            if let Some(milestone) = self.buffered_milestones.pop_front() {
                return Ok(Some(milestone));
            }
            if self.pending.is_some() {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Milestone(milestone)) => {
                        self.validate_ref(&milestone.owner_name, &milestone.project_name)?;
                        return Ok(Some(milestone));
                    }
                    Some(NdjsonRecord::Project(_)) => {
                        return Err(RestRouteError::bad_request("duplicate project metadata"));
                    }
                    Some(NdjsonRecord::Member(_)) | Some(NdjsonRecord::Label(_)) => {
                        return Err(RestRouteError::bad_request("ndjson records out of order"));
                    }
                    Some(record @ (NdjsonRecord::Post(_)
                    | NdjsonRecord::Issue(_)
                    | NdjsonRecord::Done)) => {
                        self.stash_pending(record)?;
                        return Ok(None);
                    }
                    None => return Ok(None),
                }
            }
        })
    }

    fn next_post(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteExportPostItem>, RestRouteError>> {
        Box::pin(async move {
            if let Some(NdjsonRecord::Post(post)) = self
                .take_pending_matching(|record| matches!(record, NdjsonRecord::Post(_)))
            {
                return Ok(Some(post));
            }
            if self.pending.is_some() {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Post(post)) => {
                        self.validate_ref(&post.owner_name, &post.project_name)?;
                        return Ok(Some(post));
                    }
                    Some(record @ (NdjsonRecord::Issue(_) | NdjsonRecord::Done)) => {
                        self.stash_pending(record)?;
                        return Ok(None);
                    }
                    Some(NdjsonRecord::Project(_)) => {
                        return Err(RestRouteError::bad_request("duplicate project metadata"));
                    }
                    Some(NdjsonRecord::Member(_))
                    | Some(NdjsonRecord::Label(_))
                    | Some(NdjsonRecord::Milestone(_)) => {
                        return Err(RestRouteError::bad_request("ndjson records out of order"));
                    }
                    None => return Ok(None),
                }
            }
        })
    }

    fn next_issue(
        &mut self,
    ) -> BoxFuture<'_, Result<Option<RestSiteExportIssueItem>, RestRouteError>> {
        Box::pin(async move {
            if let Some(NdjsonRecord::Issue(issue)) = self
                .take_pending_matching(|record| matches!(record, NdjsonRecord::Issue(_)))
            {
                return Ok(Some(issue));
            }
            if self.pending.is_some() {
                return Ok(None);
            }
            loop {
                match self.read_record().await? {
                    Some(NdjsonRecord::Issue(issue)) => {
                        self.validate_ref(&issue.owner_name, &issue.project_name)?;
                        return Ok(Some(issue));
                    }
                    Some(record @ (NdjsonRecord::Post(_) | NdjsonRecord::Done)) => {
                        self.stash_pending(record)?;
                        return Ok(None);
                    }
                    Some(NdjsonRecord::Project(_)) => {
                        return Err(RestRouteError::bad_request("duplicate project metadata"));
                    }
                    Some(NdjsonRecord::Member(_))
                    | Some(NdjsonRecord::Label(_))
                    | Some(NdjsonRecord::Milestone(_)) => {
                        return Err(RestRouteError::bad_request("ndjson records out of order"));
                    }
                    None => return Ok(None),
                }
            }
        })
    }
}

fn parse_item<T: serde::de::DeserializeOwned>(value: Value) -> Result<T, RestRouteError> {
    serde_json::from_value(value)
        .map_err(|error| RestRouteError::bad_request(format!("invalid ndjson record: {error}")))
}

// ── Routes ───────────────────────────────────────────────────────────────

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/owners/{owner_name}/projects/{project_name}/exports",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move {
                        rest_project_export(headers, owner_name, project_name, service).await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/imports",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<ProjectImportQuery>,
                      body: Body| {
                    let service = service.clone();
                    async move {
                        rest_project_import(
                            headers,
                            Path((owner_name, project_name)),
                            Query(query),
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
}
