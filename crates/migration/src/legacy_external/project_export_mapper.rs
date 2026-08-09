use base64::engine::general_purpose;
use base64::Engine;
use serde::{Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

#[derive(Debug)]
pub enum ProjectExportMapError {
    InvalidJson(serde_json::Error),
    AttachmentContent(std::io::Error),
    Emit(std::io::Error),
}

impl std::fmt::Display for ProjectExportMapError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => {
                write!(formatter, "invalid legacy project export JSON: {error}")
            }
            Self::AttachmentContent(error) => {
                write!(formatter, "failed to read legacy export attachment content: {error}")
            }
            Self::Emit(error) => write!(formatter, "failed to emit import record: {error}"),
        }
    }
}

impl std::error::Error for ProjectExportMapError {}

impl From<serde_json::Error> for ProjectExportMapError {
    fn from(error: serde_json::Error) -> Self {
        Self::InvalidJson(error)
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyProjectExport {
    owner: String,
    project_name: String,
    project_description: String,
    project_vcs: String,
    project_scope: String,
    authors: Vec<LegacyUserRef>,
    assignees: Vec<LegacyUserRef>,
    members: Vec<LegacyMemberRef>,
    labels: Vec<LegacyLabel>,
    issues: Vec<LegacyPosting>,
    posts: Vec<LegacyPosting>,
    milestones: Vec<LegacyMilestone>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyUserRef {
    login_id: String,
    name: String,
    email: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyMemberRef {
    login_id: String,
    name: String,
    email: String,
    role: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct YobiDataLabelItem {
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub color: String,
    pub name: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyLabel {
    #[serde(alias = "name")]
    label_name: String,
    label_color: String,
    category: String,
    is_exclusive: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct YobiDataMilestoneItem {
    pub title: String,
    pub state: String,
    pub description: String,
    pub due_date: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyMilestone {
    title: String,
    state: String,
    description: String,
    due_date: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyPosting {
    number: serde_json::Value,
    title: String,
    author: LegacyUserRef,
    body: String,
    state: String,
    assignees: Vec<LegacyUserRef>,
    milestone_title: String,
    labels: Vec<LegacyLabel>,
    comments: Vec<LegacyComment>,
    attachments: Vec<LegacyAttachment>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyComment {
    author: LegacyUserRef,
    body: String,
    child_comments: Vec<LegacyComment>,
    attachments: Vec<LegacyAttachment>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct LegacyAttachment {
    id: i64,
    name: String,
    hash: String,
    mime_type: String,
    size: i64,
    container_type: String,
    container_id: String,
    owner_login_id: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataSnapshot {
    pub format: String,
    pub provenance: String,
    pub users: Vec<YobiDataUserItem>,
    pub projects: Vec<YobiDataProjectItem>,
    pub project_members: Vec<YobiDataProjectMemberItem>,
    pub labels: Vec<YobiDataLabelItem>,
    pub milestones: Vec<YobiDataMilestoneItem>,
    pub posts: Vec<YobiDataPostItem>,
    pub issues: Vec<YobiDataIssueItem>,
    pub unsupported_sections: Vec<String>,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataUserItem {
    pub display_name: String,
    pub email_address: String,
    pub is_site_admin: bool,
    pub login_id: String,
    pub state: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataProjectItem {
    pub owner_name: String,
    pub overview: String,
    pub project_name: String,
    pub project_scope: String,
    pub vcs: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataProjectMemberItem {
    pub login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub role: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataPostItem {
    pub author_login_id: String,
    pub attachments: Vec<YobiDataAttachmentItem>,
    pub body_markdown: String,
    pub comments: Vec<YobiDataCommentItem>,
    pub history_markdown: String,
    pub labels: Vec<YobiDataLabelItem>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: String,
    pub project_name: String,
    pub readme: bool,
    pub title: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataIssueItem {
    pub assignee_login_id: String,
    pub author_login_id: String,
    pub attachments: Vec<YobiDataAttachmentItem>,
    pub body_markdown: String,
    pub comments: Vec<YobiDataCommentItem>,
    pub history_markdown: String,
    pub issue_number: String,
    pub labels: Vec<YobiDataLabelItem>,
    pub milestone_title: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataCommentItem {
    pub author_login_id: String,
    pub attachments: Vec<YobiDataAttachmentItem>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub child_comments: Vec<YobiDataCommentItem>,
    pub contents_markdown: String,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct YobiDataAttachmentItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_sha256: Option<String>,
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub size: i64,
    pub legacy_hash: String,
    pub legacy_container_type: String,
    pub legacy_container_id: String,
    pub legacy_owner_login_id: String,
}

pub fn map_project_export_json_to_yobi_data(
    payload: &str,
) -> Result<YobiDataSnapshot, ProjectExportMapError> {
    map_project_export_json_to_yobi_data_with_attachment_content_base64(payload, &BTreeMap::new())
}

pub fn map_project_export_json_to_yobi_data_with_attachment_content_base64(
    payload: &str,
    attachment_content_base64: &BTreeMap<i64, String>,
) -> Result<YobiDataSnapshot, ProjectExportMapError> {
    let export: LegacyProjectExport = serde_json::from_str(payload)?;
    Ok(map_project_export_to_yobi_data(
        export,
        attachment_content_base64,
    ))
}

fn map_project_export_to_yobi_data(
    export: LegacyProjectExport,
    attachment_content_base64: &BTreeMap<i64, String>,
) -> YobiDataSnapshot {
    let mut users = BTreeMap::new();
    for user in &export.authors {
        insert_user(&mut users, user);
    }
    for user in &export.assignees {
        insert_user(&mut users, user);
    }
    for member in &export.members {
        insert_member(&mut users, member);
    }
    for issue in &export.issues {
        insert_user(&mut users, &issue.author);
        for assignee in &issue.assignees {
            insert_user(&mut users, assignee);
        }
        insert_comment_users(&mut users, &issue.comments);
    }
    for post in &export.posts {
        insert_user(&mut users, &post.author);
        insert_comment_users(&mut users, &post.comments);
    }

    let mut unsupported_sections = Vec::new();
    if export
        .issues
        .iter()
        .chain(export.posts.iter())
        .any(|posting| posting.body.contains("/files/"))
    {
        unsupported_sections.push("markdownFileLinkRewrite".to_string());
    }
    if export
        .issues
        .iter()
        .chain(export.posts.iter())
        .flat_map(posting_attachments)
        .any(|attachment| {
            !attachment_content_base64
                .get(&attachment.id)
                .map_or(false, |content| !content.trim().is_empty())
        })
    {
        unsupported_sections.push("attachmentContentFiles".to_string());
    }

    let labels = export.labels.iter().map(map_label).collect();
    let milestones = export.milestones.iter().map(map_milestone).collect();

    YobiDataSnapshot {
        format: "yobi-data".to_string(),
        provenance: "legacy-project-api-export".to_string(),
        users: users.into_values().collect(),
        projects: vec![YobiDataProjectItem {
            owner_name: export.owner.clone(),
            overview: export.project_description,
            project_name: export.project_name.clone(),
            project_scope: export.project_scope.to_ascii_lowercase(),
            vcs: export.project_vcs,
        }],
        project_members: export
            .members
            .iter()
            .filter_map(|member| {
                let login_id = member.login_id.trim();
                if login_id.is_empty() {
                    return None;
                }
                Some(YobiDataProjectMemberItem {
                    login_id: login_id.to_string(),
                    owner_name: export.owner.clone(),
                    project_name: export.project_name.clone(),
                    role: normalize_project_member_role(&member.role),
                })
            })
            .collect(),
        labels,
        milestones,
        posts: export
            .posts
            .iter()
            .map(|post| YobiDataPostItem {
                author_login_id: post.author.login_id.trim().to_string(),
                attachments: post
                    .attachments
                    .iter()
                    .map(|attachment| map_attachment(attachment, attachment_content_base64))
                    .collect(),
                body_markdown: post.body.clone(),
                comments: post
                    .comments
                    .iter()
                    .map(|comment| map_comment(comment, attachment_content_base64))
                    .collect(),
                history_markdown: String::new(),
                labels: post.labels.iter().map(map_label).collect(),
                notice: false,
                owner_name: export.owner.clone(),
                post_number: posting_number(&post.number),
                project_name: export.project_name.clone(),
                readme: false,
                title: post.title.clone(),
            })
            .collect(),
        issues: export
            .issues
            .iter()
            .map(|issue| YobiDataIssueItem {
                assignee_login_id: issue
                    .assignees
                    .first()
                    .map(|user| user.login_id.trim().to_string())
                    .unwrap_or_default(),
                author_login_id: issue.author.login_id.trim().to_string(),
                attachments: issue
                    .attachments
                    .iter()
                    .map(|attachment| map_attachment(attachment, attachment_content_base64))
                    .collect(),
                body_markdown: issue.body.clone(),
                comments: issue
                    .comments
                    .iter()
                    .map(|comment| map_comment(comment, attachment_content_base64))
                    .collect(),
                history_markdown: String::new(),
                issue_number: posting_number(&issue.number),
                labels: issue.labels.iter().map(map_label).collect(),
                milestone_title: issue.milestone_title.clone(),
                owner_name: export.owner.clone(),
                project_name: export.project_name.clone(),
                state: normalize_state(&issue.state),
                title: issue.title.clone(),
            })
            .collect(),
        unsupported_sections,
    }
}

fn insert_comment_users(
    users: &mut BTreeMap<String, YobiDataUserItem>,
    comments: &[LegacyComment],
) {
    for comment in comments {
        insert_user(users, &comment.author);
        insert_comment_users(users, &comment.child_comments);
    }
}

fn insert_member(users: &mut BTreeMap<String, YobiDataUserItem>, member: &LegacyMemberRef) {
    let _role = member.role.trim();
    insert_user(
        users,
        &LegacyUserRef {
            login_id: member.login_id.clone(),
            name: member.name.clone(),
            email: member.email.clone(),
        },
    );
}

fn insert_user(users: &mut BTreeMap<String, YobiDataUserItem>, user: &LegacyUserRef) {
    let login_id = user.login_id.trim();
    if login_id.is_empty() {
        return;
    }
    users
        .entry(login_id.to_string())
        .or_insert_with(|| YobiDataUserItem {
            display_name: if user.name.trim().is_empty() {
                login_id.to_string()
            } else {
                user.name.trim().to_string()
            },
            email_address: user.email.trim().to_string(),
            is_site_admin: false,
            login_id: login_id.to_string(),
            state: "ACTIVE".to_string(),
        });
}

fn map_comment(
    comment: &LegacyComment,
    attachment_content_base64: &BTreeMap<i64, String>,
) -> YobiDataCommentItem {
    YobiDataCommentItem {
        author_login_id: comment.author.login_id.trim().to_string(),
        attachments: comment
            .attachments
            .iter()
            .map(|attachment| map_attachment(attachment, attachment_content_base64))
            .collect(),
        child_comments: comment
            .child_comments
            .iter()
            .map(|comment| map_comment(comment, attachment_content_base64))
            .collect(),
        contents_markdown: comment.body.clone(),
    }
}

fn map_label(label: &LegacyLabel) -> YobiDataLabelItem {
    YobiDataLabelItem {
        category_is_exclusive: label.is_exclusive,
        category_name: label.category.clone(),
        color: label.label_color.clone(),
        name: label.label_name.clone(),
    }
}

fn map_milestone(milestone: &LegacyMilestone) -> YobiDataMilestoneItem {
    YobiDataMilestoneItem {
        title: milestone.title.clone(),
        state: normalize_state(&milestone.state),
        description: milestone.description.clone(),
        due_date: milestone.due_date.clone(),
    }
}

fn map_attachment(
    attachment: &LegacyAttachment,
    attachment_content_base64: &BTreeMap<i64, String>,
) -> YobiDataAttachmentItem {
    let content_base64 = attachment_content_base64
        .get(&attachment.id)
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty());
    let content_sha256 = content_base64
        .as_deref()
        .and_then(content_sha256_from_base64);

    YobiDataAttachmentItem {
        content_base64,
        content_sha256,
        id: attachment.id,
        mime_type: attachment.mime_type.clone(),
        name: attachment.name.clone(),
        size: attachment.size,
        legacy_hash: attachment.hash.clone(),
        legacy_container_type: attachment.container_type.clone(),
        legacy_container_id: attachment.container_id.clone(),
        legacy_owner_login_id: attachment.owner_login_id.clone(),
    }
}

fn content_sha256_from_base64(content_base64: &str) -> Option<String> {
    general_purpose::STANDARD
        .decode(content_base64)
        .ok()
        .map(|bytes| sha256_hex(&bytes))
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut hex = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(&mut hex, "{byte:02x}");
    }
    hex
}

fn posting_number(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Number(number) => number.to_string(),
        serde_json::Value::String(text) => text.trim().to_string(),
        _ => String::new(),
    }
}

fn normalize_state(state: &str) -> String {
    if state.trim().eq_ignore_ascii_case("closed") {
        "closed".to_string()
    } else {
        "open".to_string()
    }
}

fn normalize_project_member_role(role: &str) -> String {
    if role.trim().eq_ignore_ascii_case("manager") {
        "manager".to_string()
    } else {
        "member".to_string()
    }
}

fn posting_attachments(posting: &LegacyPosting) -> Vec<&LegacyAttachment> {
    let mut attachments = Vec::new();
    attachments.extend(posting.attachments.iter());
    collect_comment_attachments(&posting.comments, &mut attachments);
    attachments
}

fn collect_comment_attachments<'a>(
    comments: &'a [LegacyComment],
    attachments: &mut Vec<&'a LegacyAttachment>,
) {
    for comment in comments {
        attachments.extend(comment.attachments.iter());
        collect_comment_attachments(&comment.child_comments, attachments);
    }
}

// ── Streaming import records (Yoram NDJSON project import) ───────────────

/// One record emitted while streaming a yona-export JSON. Field shapes mirror
/// the Yoram NDJSON import contract (`crates/server` `RestSiteExport*Item`).
#[derive(Clone, Debug)]
pub enum YonaImportRecord {
    Project(YonaImportProjectRecord),
    Member(YonaImportMemberRecord),
    Label(YonaImportLabelRecord),
    Milestone(YonaImportMilestoneRecord),
    Post(YonaImportPostRecord),
    Issue(YonaImportIssueRecord),
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportProjectRecord {
    pub owner: String,
    pub project_name: String,
    pub project_description: String,
    pub project_created_date: String,
    pub project_vcs: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportMemberRecord {
    pub login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub role: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportLabelRecord {
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub color: String,
    pub name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportMilestoneRecord {
    pub attachments: Vec<YonaImportAttachmentRecord>,
    pub contents_markdown: String,
    pub due_date: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportPostRecord {
    pub author_login_id: String,
    pub attachments: Vec<YonaImportAttachmentRecord>,
    pub body_markdown: String,
    pub comments: Vec<YonaImportCommentRecord>,
    pub history_markdown: String,
    pub labels: Vec<YonaImportLabelRefRecord>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: String,
    pub project_name: String,
    pub readme: bool,
    pub title: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportIssueRecord {
    pub assignee_login_id: String,
    pub author_login_id: String,
    pub attachments: Vec<YonaImportAttachmentRecord>,
    pub body_markdown: String,
    pub comments: Vec<YonaImportCommentRecord>,
    pub history_markdown: String,
    pub issue_number: String,
    pub labels: Vec<YonaImportLabelRefRecord>,
    pub milestone_title: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportCommentRecord {
    pub author_login_id: String,
    pub attachments: Vec<YonaImportAttachmentRecord>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub child_comments: Vec<YonaImportCommentRecord>,
    pub contents_markdown: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportLabelRefRecord {
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub color: String,
    pub name: String,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct YonaImportAttachmentRecord {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_sha256: Option<String>,
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub size: i64,
}

/// Streams a yona-export JSON (nested arrays) record by record, invoking
/// `emit` for each `YonaImportRecord` in document order. Only one array
/// element (plus buffered scalar metadata) is held in memory at a time.
///
/// `attachment_content_base64` resolves raw attachment bytes on demand by
/// legacy attachment id (`Ok(None)` = no content available). Scalars
/// (owner/projectName/...) are buffered until the first array key, at which
/// point the `Project` record is emitted.
///
/// Array keys are emitted in document order, which for a yona-export JSON is
/// members -> labels -> issues -> posts -> milestones. Callers that need the
/// Yoram NDJSON canonical order (members, labels, milestones, issues, posts)
/// should emit in two passes over the file (see the yona-export-to-yobi-data
/// CLI): pass one keeps project/member/label/milestone records, pass two keeps
/// issue/post records.
pub fn stream_yona_export_to_import_records<R: std::io::Read, F>(
    reader: R,
    attachment_content_base64: impl Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
    mut emit: F,
) -> Result<(), ProjectExportMapError>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
{
    let mut deserializer = serde_json::Deserializer::from_reader(reader);
    let visitor = YonaExportRootVisitor {
        owner: String::new(),
        project_name: String::new(),
        project_description: String::new(),
        project_created_date: String::new(),
        project_vcs: String::new(),
        project_scope: String::new(),
        attachment_content_base64,
        emit: &mut emit,
    };
    deserializer
        .deserialize_any(visitor)
        .map_err(ProjectExportMapError::from)?;
    Ok(())
}

struct YonaExportRootVisitor<'emit, F, G> {
    owner: String,
    project_name: String,
    project_description: String,
    project_created_date: String,
    project_vcs: String,
    project_scope: String,
    attachment_content_base64: G,
    emit: &'emit mut F,
}

#[derive(Clone, Copy)]
enum YonaSectionKind {
    Members,
    Labels,
    Milestones,
    Posts,
    Issues,
}

impl<'de, 'emit, F, G> serde::de::Visitor<'de> for YonaExportRootVisitor<'emit, F, G>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
    G: Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
{
    type Value = ();

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("a yona project export JSON object")
    }

    fn visit_map<A>(mut self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::MapAccess<'de>,
    {
        let mut project_emitted = false;
        while let Some(key) = map.next_key::<String>()? {
            match key.as_str() {
                "owner" => self.owner = map.next_value()?,
                "projectName" => self.project_name = map.next_value()?,
                "projectDescription" => self.project_description = map.next_value()?,
                "projectCreatedDate" => self.project_created_date = map.next_value()?,
                "projectVcs" => self.project_vcs = map.next_value()?,
                "projectScope" => self.project_scope = map.next_value()?,
                "authors" | "assignees" | "memberCount" | "issueCount" | "postCount"
                | "milestoneCount" => {
                    let _: serde::de::IgnoredAny = map.next_value()?;
                }
                "members" => {
                    if !project_emitted {
                        emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
                        project_emitted = true;
                    }
                    map.next_value_seed(YonaSectionSeed {
                        state: &mut self,
                        kind: YonaSectionKind::Members,
                    })?;
                }
                "labels" => {
                    if !project_emitted {
                        emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
                        project_emitted = true;
                    }
                    map.next_value_seed(YonaSectionSeed {
                        state: &mut self,
                        kind: YonaSectionKind::Labels,
                    })?;
                }
                "milestones" => {
                    if !project_emitted {
                        emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
                        project_emitted = true;
                    }
                    map.next_value_seed(YonaSectionSeed {
                        state: &mut self,
                        kind: YonaSectionKind::Milestones,
                    })?;
                }
                "issues" => {
                    if !project_emitted {
                        emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
                        project_emitted = true;
                    }
                    map.next_value_seed(YonaSectionSeed {
                        state: &mut self,
                        kind: YonaSectionKind::Issues,
                    })?;
                }
                "posts" => {
                    if !project_emitted {
                        emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
                        project_emitted = true;
                    }
                    map.next_value_seed(YonaSectionSeed {
                        state: &mut self,
                        kind: YonaSectionKind::Posts,
                    })?;
                }
                _other => {
                    let _: serde::de::IgnoredAny = map.next_value()?;
                }
            }
        }
        if !project_emitted {
            emit_project_record(&mut self).map_err(serde::de::Error::custom)?;
        }
        Ok(())
    }
}

fn emit_project_record<F, G>(
    state: &mut YonaExportRootVisitor<'_, F, G>,
) -> Result<(), serde_json::Error>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
    G: Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
{
    let record = YonaImportRecord::Project(YonaImportProjectRecord {
        owner: state.owner.clone(),
        project_name: state.project_name.clone(),
        project_description: state.project_description.clone(),
        project_created_date: state.project_created_date.clone(),
        project_vcs: state.project_vcs.clone(),
        project_scope: state.project_scope.to_ascii_lowercase(),
    });
    (state.emit)(record).map_err(serde::de::Error::custom)
}

struct YonaSectionSeed<'a, 'emit, F, G> {
    state: &'a mut YonaExportRootVisitor<'emit, F, G>,
    kind: YonaSectionKind,
}

impl<'de, 'a, 'emit, F, G> serde::de::DeserializeSeed<'de> for YonaSectionSeed<'a, 'emit, F, G>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
    G: Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
{
    type Value = ();

    fn deserialize<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_any(YonaSectionVisitor {
            state: self.state,
            kind: self.kind,
        })
    }
}

struct YonaSectionVisitor<'a, 'emit, F, G> {
    state: &'a mut YonaExportRootVisitor<'emit, F, G>,
    kind: YonaSectionKind,
}

impl<'de, 'a, 'emit, F, G> serde::de::Visitor<'de> for YonaSectionVisitor<'a, 'emit, F, G>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
    G: Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
{
    type Value = ();

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("a yona export section array")
    }

    fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::SeqAccess<'de>,
    {
        let attachment_content_base64 = self.state.attachment_content_base64;
        match self.kind {
            YonaSectionKind::Members => {
                while let Some(member) = seq.next_element::<LegacyMemberRef>()? {
                    let login_id = member.login_id.trim().to_string();
                    if login_id.is_empty() {
                        continue;
                    }
                    let record = YonaImportRecord::Member(YonaImportMemberRecord {
                        login_id,
                        owner_name: self.state.owner.clone(),
                        project_name: self.state.project_name.clone(),
                        role: normalize_project_member_role(&member.role),
                    });
                    emit_record(self.state.emit, record).map_err(serde::de::Error::custom)?;
                }
            }
            YonaSectionKind::Labels => {
                while let Some(label) = seq.next_element::<LegacyLabel>()? {
                    let record = YonaImportRecord::Label(YonaImportLabelRecord {
                        category_is_exclusive: label.is_exclusive,
                        category_name: label.category.clone(),
                        color: label.label_color.clone(),
                        name: label.label_name.clone(),
                        owner_name: self.state.owner.clone(),
                        project_name: self.state.project_name.clone(),
                    });
                    emit_record(self.state.emit, record).map_err(serde::de::Error::custom)?;
                }
            }
            YonaSectionKind::Milestones => {
                while let Some(milestone) = seq.next_element::<LegacyMilestone>()? {
                    let record = YonaImportRecord::Milestone(YonaImportMilestoneRecord {
                        attachments: Vec::new(),
                        contents_markdown: milestone.description.clone(),
                        due_date: milestone.due_date.clone(),
                        owner_name: self.state.owner.clone(),
                        project_name: self.state.project_name.clone(),
                        state: normalize_state(&milestone.state),
                        title: milestone.title.clone(),
                    });
                    emit_record(self.state.emit, record).map_err(serde::de::Error::custom)?;
                }
            }
            YonaSectionKind::Posts => {
                while let Some(posting) = seq.next_element::<LegacyPosting>()? {
                    let record = map_posting_to_post_record(
                        &posting,
                        &self.state.owner,
                        &self.state.project_name,
                        attachment_content_base64,
                    )
                    .map_err(serde::de::Error::custom)?;
                    emit_record(self.state.emit, record).map_err(serde::de::Error::custom)?;
                }
            }
            YonaSectionKind::Issues => {
                while let Some(posting) = seq.next_element::<LegacyPosting>()? {
                    let record = map_posting_to_issue_record(
                        &posting,
                        &self.state.owner,
                        &self.state.project_name,
                        attachment_content_base64,
                    )
                    .map_err(serde::de::Error::custom)?;
                    emit_record(self.state.emit, record).map_err(serde::de::Error::custom)?;
                }
            }
        }
        Ok(())
    }

    fn visit_u64<E>(self, _value: u64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        // Legacy exports may write "members" as a bare count when the member
        // list was not eagerly loaded; treat it as an empty section.
        if matches!(self.kind, YonaSectionKind::Members) {
            Ok(())
        } else {
            Err(E::custom("expected yona export section array"))
        }
    }

    fn visit_i64<E>(self, _value: i64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        self.visit_u64(0)
    }
}

fn emit_record<F>(
    emit: &mut F,
    record: YonaImportRecord,
) -> Result<(), serde_json::Error>
where
    F: FnMut(YonaImportRecord) -> Result<(), ProjectExportMapError>,
{
    emit(record).map_err(serde::de::Error::custom)
}

fn map_posting_to_post_record(
    posting: &LegacyPosting,
    owner: &str,
    project_name: &str,
    attachment_content_base64: impl Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
) -> Result<YonaImportRecord, ProjectExportMapError> {
    Ok(YonaImportRecord::Post(YonaImportPostRecord {
        author_login_id: posting.author.login_id.trim().to_string(),
        attachments: posting
            .attachments
            .iter()
            .map(|attachment| map_attachment_record(attachment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        body_markdown: posting.body.clone(),
        comments: posting
            .comments
            .iter()
            .map(|comment| map_comment_record(comment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        history_markdown: String::new(),
        labels: posting.labels.iter().map(map_label_ref_record).collect(),
        notice: false,
        owner_name: owner.to_string(),
        post_number: posting_number(&posting.number),
        project_name: project_name.to_string(),
        readme: false,
        title: posting.title.clone(),
    }))
}

fn map_posting_to_issue_record(
    posting: &LegacyPosting,
    owner: &str,
    project_name: &str,
    attachment_content_base64: impl Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
) -> Result<YonaImportRecord, ProjectExportMapError> {
    Ok(YonaImportRecord::Issue(YonaImportIssueRecord {
        assignee_login_id: posting
            .assignees
            .first()
            .map(|user| user.login_id.trim().to_string())
            .unwrap_or_default(),
        author_login_id: posting.author.login_id.trim().to_string(),
        attachments: posting
            .attachments
            .iter()
            .map(|attachment| map_attachment_record(attachment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        body_markdown: posting.body.clone(),
        comments: posting
            .comments
            .iter()
            .map(|comment| map_comment_record(comment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        history_markdown: String::new(),
        issue_number: posting_number(&posting.number),
        labels: posting.labels.iter().map(map_label_ref_record).collect(),
        milestone_title: posting.milestone_title.clone(),
        owner_name: owner.to_string(),
        project_name: project_name.to_string(),
        state: normalize_state(&posting.state),
        title: posting.title.clone(),
    }))
}

fn map_comment_record(
    comment: &LegacyComment,
    attachment_content_base64: impl Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
) -> Result<YonaImportCommentRecord, ProjectExportMapError> {
    Ok(YonaImportCommentRecord {
        author_login_id: comment.author.login_id.trim().to_string(),
        attachments: comment
            .attachments
            .iter()
            .map(|attachment| map_attachment_record(attachment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        child_comments: comment
            .child_comments
            .iter()
            .map(|comment| map_comment_record(comment, attachment_content_base64))
            .collect::<Result<_, _>>()?,
        contents_markdown: comment.body.clone(),
    })
}

fn map_label_ref_record(label: &LegacyLabel) -> YonaImportLabelRefRecord {
    YonaImportLabelRefRecord {
        category_is_exclusive: label.is_exclusive,
        category_name: label.category.clone(),
        color: label.label_color.clone(),
        name: label.label_name.clone(),
    }
}

fn map_attachment_record(
    attachment: &LegacyAttachment,
    attachment_content_base64: impl Fn(i64) -> std::io::Result<Option<Vec<u8>>> + Copy,
) -> Result<YonaImportAttachmentRecord, ProjectExportMapError> {
    let content_bytes = attachment_content_base64(attachment.id)
        .map_err(ProjectExportMapError::AttachmentContent)?;
    let content_base64 =
        content_bytes.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));
    let content_sha256 = content_bytes.as_deref().map(sha256_hex);
    Ok(YonaImportAttachmentRecord {
        content_base64,
        content_sha256,
        id: attachment.id,
        mime_type: attachment.mime_type.clone(),
        name: attachment.name.clone(),
        size: attachment.size,
    })
}
