/// Site-level format transformer.
///
/// Takes raw table rows from the legacy Yona `/sites/export` dump (keys are
/// the exchanger table names, e.g. `N4USER`, `ORGANIZATION`, `PROJECT`,
/// `ISSUE`, `PULL_REQUEST`, ...; fields snake_case; timestamps epoch millis)
/// and transforms them into the Yoram import format (`RestSiteImportPayload`).
///
/// Legacy ids are preserved so the new app (which adopts the same schema)
/// keeps every FK cross-reference without rebinding.
use std::collections::HashMap;

use chrono::{TimeZone, Utc};
use serde::Serialize;

/// A single batch of transformed data ready for import.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformationContext {
    pub format: String,
    pub users: Vec<serde_json::Value>,
    pub organizations: Vec<serde_json::Value>,
    pub organization_members: Vec<serde_json::Value>,
    pub projects: Vec<serde_json::Value>,
    pub project_members: Vec<serde_json::Value>,
    pub labels: Vec<serde_json::Value>,
    pub milestones: Vec<serde_json::Value>,
    pub issues: Vec<serde_json::Value>,
    pub posts: Vec<serde_json::Value>,
    pub pull_requests: Vec<serde_json::Value>,
}

impl TransformationContext {
    pub fn new() -> Self {
        Self {
            format: "yobi-data".to_string(),
            users: Vec::new(),
            organizations: Vec::new(),
            organization_members: Vec::new(),
            projects: Vec::new(),
            project_members: Vec::new(),
            labels: Vec::new(),
            milestones: Vec::new(),
            issues: Vec::new(),
            posts: Vec::new(),
            pull_requests: Vec::new(),
        }
    }

    pub fn counts(&self) -> Vec<(&'static str, usize)> {
        vec![
            ("users", self.users.len()),
            ("organizations", self.organizations.len()),
            ("organization_members", self.organization_members.len()),
            ("projects", self.projects.len()),
            ("project_members", self.project_members.len()),
            ("labels", self.labels.len()),
            ("milestones", self.milestones.len()),
            ("issues", self.issues.len()),
            ("posts", self.posts.len()),
            ("pull_requests", self.pull_requests.len()),
        ]
    }
}

impl Default for TransformationContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Indexed view over the legacy dump tables.
struct Dump {
    n4user: Vec<serde_json::Value>,
    organization: Vec<serde_json::Value>,
    organization_user: Vec<serde_json::Value>,
    project: Vec<serde_json::Value>,
    project_user: Vec<serde_json::Value>,
    issue: Vec<serde_json::Value>,
    issue_comment: Vec<serde_json::Value>,
    posting: Vec<serde_json::Value>,
    posting_comment: Vec<serde_json::Value>,
    issue_label: Vec<serde_json::Value>,
    issue_label_category: Vec<serde_json::Value>,
    label: Vec<serde_json::Value>,
    project_label: Vec<serde_json::Value>,
    milestone: Vec<serde_json::Value>,
    issue_issue_label: Vec<serde_json::Value>,
    attachment: Vec<serde_json::Value>,
    assignee: Vec<serde_json::Value>,
    role: Vec<serde_json::Value>,
    site_admin: Vec<serde_json::Value>,
    pull_request: Vec<serde_json::Value>,
    pull_request_event: Vec<serde_json::Value>,
    review_comment: Vec<serde_json::Value>,
    commit_comment: Vec<serde_json::Value>,
    comment_thread: Vec<serde_json::Value>,
}

fn row<'a>(rows: &'a [serde_json::Value], id: i64) -> Option<&'a serde_json::Value> {
    if id <= 0 {
        return None;
    }
    rows.iter()
        .find(|row| row.get("id").and_then(|value| value.as_i64()) == Some(id))
}

fn text<'a>(row: &'a serde_json::Value, field: &str) -> &'a str {
    row.get(field)
        .and_then(|value| value.as_str())
        .unwrap_or("")
}

fn int(row: &serde_json::Value, field: &str) -> i64 {
    row.get(field).and_then(|value| value.as_i64()).unwrap_or(0)
}

fn bool_value(row: &serde_json::Value, field: &str) -> bool {
    row.get(field)
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

fn is_null_or_missing(row: &serde_json::Value, field: &str) -> bool {
    row.get(field).map(|value| value.is_null()).unwrap_or(true)
}

/// Convert a legacy epoch-millis timestamp (or null/missing) to the import
/// string format `%Y-%m-%dT%H:%M:%S+0000`.
fn ts(row: &serde_json::Value, field: &str) -> String {
    let millis = row.get(field).and_then(|value| value.as_i64());
    match millis {
        Some(millis) if millis > 0 => match Utc.timestamp_millis_opt(millis) {
            chrono::LocalResult::Single(datetime) => {
                datetime.format("%Y-%m-%dT%H:%M:%S+0000").to_string()
            }
            _ => String::new(),
        },
        _ => String::new(),
    }
}

/// Legacy issue/milestone raw state int (MariaDB 1=open, 2=closed).
fn issue_state(row: &serde_json::Value, field: &str) -> String {
    match int(row, field) {
        2 => "closed".to_string(),
        _ => "open".to_string(),
    }
}

impl Dump {
    fn from_tables(tables: &[(String, Vec<serde_json::Value>)]) -> Self {
        let mut dump = Self {
            n4user: Vec::new(),
            organization: Vec::new(),
            organization_user: Vec::new(),
            project: Vec::new(),
            project_user: Vec::new(),
            issue: Vec::new(),
            issue_comment: Vec::new(),
            posting: Vec::new(),
            posting_comment: Vec::new(),
            issue_label: Vec::new(),
            issue_label_category: Vec::new(),
            label: Vec::new(),
            project_label: Vec::new(),
            milestone: Vec::new(),
            issue_issue_label: Vec::new(),
            attachment: Vec::new(),
            assignee: Vec::new(),
            role: Vec::new(),
            site_admin: Vec::new(),
            pull_request: Vec::new(),
            pull_request_event: Vec::new(),
            review_comment: Vec::new(),
            commit_comment: Vec::new(),
            comment_thread: Vec::new(),
        };
        for (name, rows) in tables {
            let rows = rows.clone();
            match name.to_ascii_uppercase().as_str() {
                "N4USER" | "USERS" => dump.n4user = rows,
                "ORGANIZATION" => dump.organization = rows,
                "ORGANIZATION_USER" => dump.organization_user = rows,
                "PROJECT" => dump.project = rows,
                "PROJECT_USER" => dump.project_user = rows,
                "ISSUE" => dump.issue = rows,
                "ISSUE_COMMENT" => dump.issue_comment = rows,
                "POSTING" | "POSTS" => dump.posting = rows,
                "POSTING_COMMENT" => dump.posting_comment = rows,
                "ISSUE_LABEL" => dump.issue_label = rows,
                "ISSUE_LABEL_CATEGORY" => dump.issue_label_category = rows,
                "LABEL" => dump.label = rows,
                "PROJECT_LABEL" => dump.project_label = rows,
                "MILESTONE" => dump.milestone = rows,
                "ISSUE_ISSUE_LABEL" => dump.issue_issue_label = rows,
                "ATTACHMENT" => dump.attachment = rows,
                "ASSIGNEE" => dump.assignee = rows,
                "ROLE" => dump.role = rows,
                "SITE_ADMIN" => dump.site_admin = rows,
                "PULL_REQUEST" => dump.pull_request = rows,
                "PULL_REQUEST_EVENT" => dump.pull_request_event = rows,
                "REVIEW_COMMENT" => dump.review_comment = rows,
                "COMMIT_COMMENT" => dump.commit_comment = rows,
                "COMMENT_THREAD" => dump.comment_thread = rows,
                _ => {}
            }
        }
        dump
    }

    fn user_login_id(&self, user_id: i64) -> String {
        row(&self.n4user, user_id)
            .map(|user| text(user, "login_id").to_string())
            .unwrap_or_default()
    }

    fn user_name(&self, user_id: i64) -> String {
        row(&self.n4user, user_id)
            .map(|user| text(user, "name").to_string())
            .unwrap_or_default()
    }

    fn role_name(&self, role_id: i64) -> String {
        row(&self.role, role_id)
            .map(|role| text(role, "name").to_string())
            .unwrap_or_default()
    }

    fn is_site_admin(&self, user_id: i64) -> bool {
        self.site_admin
            .iter()
            .any(|row| int(row, "admin_id") == user_id)
    }

    /// Resolve legacy assignee table id -> user id (the new app stores the
    /// user id directly on the issue row).
    fn assignee_user_id(&self, assignee_id: i64) -> i64 {
        row(&self.assignee, assignee_id)
            .map(|row| int(row, "user_id"))
            .unwrap_or(0)
    }

    fn project_owner_and_name(&self, project_id: i64) -> (String, String) {
        match row(&self.project, project_id) {
            Some(project) => (
                text(project, "owner").to_string(),
                text(project, "name").to_string(),
            ),
            None => (String::new(), String::new()),
        }
    }

    fn milestone_title(&self, milestone_id: i64) -> String {
        row(&self.milestone, milestone_id)
            .map(|row| text(row, "title").to_string())
            .unwrap_or_default()
    }

    fn label_category(&self, category_id: i64) -> (String, bool) {
        match row(&self.issue_label_category, category_id) {
            Some(category) => (
                text(category, "name").to_string(),
                bool_value(category, "is_exclusive"),
            ),
            None => (String::new(), false),
        }
    }

    /// Attachments for a container (legacy container_type strings).
    fn attachments_for(&self, container_type: &str, container_id: i64) -> Vec<serde_json::Value> {
        self.attachment
            .iter()
            .filter(|row| {
                text(row, "container_type") == container_type
                    && int(row, "container_id") == container_id
            })
            .map(transform_attachment)
            .collect()
    }

    /// Issue labels (from ISSUE_ISSUE_LABEL joins), owner/project resolved.
    fn issue_labels(&self, issue_id: i64) -> Vec<serde_json::Value> {
        let issue = match row(&self.issue, issue_id) {
            Some(issue) => issue,
            None => return Vec::new(),
        };
        let project_id = int(issue, "project_id");
        let (owner_name, project_name) = self.project_owner_and_name(project_id);
        self.issue_issue_label
            .iter()
            .filter(|join| int(join, "issue_id") == issue_id)
            .filter_map(|join| {
                let label_id = int(join, "issue_label_id");
                let label = row(&self.issue_label, label_id)?;
                let (category_name, category_is_exclusive) =
                    self.label_category(int(label, "category_id"));
                Some(serde_json::json!({
                    "categoryIsExclusive": category_is_exclusive,
                    "categoryName": category_name,
                    "color": text(label, "color"),
                    "id": label_id,
                    "name": text(label, "name"),
                    "ownerName": owner_name,
                    "projectName": project_name,
                }))
            })
            .collect()
    }

    fn issue_comments(&self, issue_id: i64) -> Vec<serde_json::Value> {
        let mut comments: Vec<serde_json::Value> = self
            .issue_comment
            .iter()
            .filter(|comment| int(comment, "issue_id") == issue_id)
            .map(|comment| {
                let comment_id = int(comment, "id");
                let author_id = int(comment, "author_id");
                serde_json::json!({
                    "authorLoginId": text(comment, "author_login_id"),
                    "attachments": self.attachments_for("ISSUE_COMMENT", comment_id),
                    "contentsMarkdown": text(comment, "contents"),
                    "createdAt": ts(comment, "created_date"),
                    "id": comment_id,
                    "childComments": [],
                    "authorName": self.user_name(author_id),
                })
            })
            .collect();
        comments.sort_by_key(|comment| int(comment, "id"));
        comments
    }

    fn posting_comments(&self, posting_id: i64) -> Vec<serde_json::Value> {
        let mut comments: Vec<serde_json::Value> = self
            .posting_comment
            .iter()
            .filter(|comment| int(comment, "posting_id") == posting_id)
            .map(|comment| {
                let comment_id = int(comment, "id");
                let author_id = int(comment, "author_id");
                serde_json::json!({
                    "authorLoginId": text(comment, "author_login_id"),
                    "attachments": self.attachments_for("NONISSUE_COMMENT", comment_id),
                    "contentsMarkdown": text(comment, "contents"),
                    "createdAt": ts(comment, "created_date"),
                    "id": comment_id,
                    "childComments": [],
                    "authorName": self.user_name(author_id),
                })
            })
            .collect();
        comments.sort_by_key(|comment| int(comment, "id"));
        comments
    }
}

fn transform_attachment(row: &serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "id": int(row, "id"),
        "name": text(row, "name"),
        "hash": text(row, "hash"),
        "mimeType": text(row, "mime_type"),
        "size": int(row, "size"),
        "createdAt": ts(row, "created_date"),
    })
}

fn transform_user(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let login_id = text(row, "login_id");
    if login_id.is_empty() {
        return None;
    }
    let user_id = int(row, "id");
    Some(serde_json::json!({
        "id": user_id,
        "loginId": login_id,
        "displayName": text(row, "name"),
        "emailAddress": text(row, "email"),
        "password": text(row, "password"),
        "passwordSalt": text(row, "password_salt"),
        "state": text(row, "state").to_ascii_uppercase(),
        "isSiteAdmin": dump.is_site_admin(user_id),
        "createdAt": ts(row, "created_date"),
        "lastStateModifiedAt": ts(row, "last_state_modified_date"),
    }))
}

fn transform_organization(row: &serde_json::Value) -> Option<serde_json::Value> {
    let name = text(row, "name");
    if name.is_empty() {
        return None;
    }
    Some(serde_json::json!({
        "id": int(row, "id"),
        "name": name,
        "description": text(row, "descr"),
        "createdAt": ts(row, "created"),
    }))
}

fn transform_organization_member(
    dump: &Dump,
    row: &serde_json::Value,
) -> Option<serde_json::Value> {
    let organization_id = int(row, "organization_id");
    let user_id = int(row, "user_id");
    if organization_id <= 0 || user_id <= 0 {
        return None;
    }
    Some(serde_json::json!({
        "id": int(row, "id"),
        "organizationId": organization_id,
        "userId": user_id,
        "role": dump.role_name(int(row, "role_id")),
    }))
}

fn transform_project(row: &serde_json::Value) -> Option<serde_json::Value> {
    let owner = text(row, "owner");
    let name = text(row, "name");
    if owner.is_empty() || name.is_empty() {
        return None;
    }
    let vcs = match text(row, "vcs").to_ascii_lowercase().as_str() {
        "svn" | "subversion" => "Subversion".to_string(),
        _ => "GIT".to_string(),
    };
    let scope = match text(row, "project_scope").to_ascii_uppercase().as_str() {
        "PUBLIC" => "public",
        "PROTECTED" => "protected",
        _ => "private",
    };
    Some(serde_json::json!({
        "id": int(row, "id"),
        "ownerName": owner,
        "projectName": name,
        "overview": text(row, "overview"),
        "projectScope": scope,
        "projectVcs": vcs,
        "organizationId": int(row, "organization_id"),
        "createdAt": ts(row, "created_date"),
    }))
}

fn transform_project_member(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let project_id = int(row, "project_id");
    let user_id = int(row, "user_id");
    if project_id <= 0 || user_id <= 0 {
        return None;
    }
    let (owner_name, project_name) = dump.project_owner_and_name(project_id);
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some(serde_json::json!({
        "id": int(row, "id"),
        "loginId": dump.user_login_id(user_id),
        "ownerName": owner_name,
        "projectName": project_name,
        "role": dump.role_name(int(row, "role_id")),
    }))
}

fn transform_label(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let label_id = int(row, "id");
    let project_id = int(row, "project_id");
    let name = text(row, "name");
    if label_id <= 0 || project_id <= 0 || name.is_empty() {
        return None;
    }
    let (owner_name, project_name) = dump.project_owner_and_name(project_id);
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    let (category_name, category_is_exclusive) = dump.label_category(int(row, "category_id"));
    Some(serde_json::json!({
        "categoryIsExclusive": category_is_exclusive,
        "categoryName": category_name,
        "color": text(row, "color"),
        "id": label_id,
        "name": name,
        "ownerName": owner_name,
        "projectName": project_name,
    }))
}

fn transform_milestone(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let milestone_id = int(row, "id");
    let project_id = int(row, "project_id");
    let title = text(row, "title");
    if milestone_id <= 0 || project_id <= 0 || title.is_empty() {
        return None;
    }
    let (owner_name, project_name) = dump.project_owner_and_name(project_id);
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    // The import parses due dates as day-precision `%Y-%m-%d`.
    let due_date = row
        .get("due_date")
        .and_then(|value| value.as_i64())
        .map(|millis| {
            Utc.timestamp_millis_opt(millis)
                .single()
                .map(|datetime| datetime.format("%Y-%m-%d").to_string())
                .unwrap_or_default()
        })
        .unwrap_or_default();
    Some(serde_json::json!({
        "attachments": dump.attachments_for("MILESTONE", milestone_id),
        "contentsMarkdown": text(row, "contents"),
        "dueDate": due_date,
        "id": milestone_id,
        "ownerName": owner_name,
        "projectName": project_name,
        "state": issue_state(row, "state"),
        "title": title,
    }))
}

fn transform_issue(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let issue_id = int(row, "id");
    let project_id = int(row, "project_id");
    if issue_id <= 0 || project_id <= 0 {
        return None;
    }
    let (owner_name, project_name) = dump.project_owner_and_name(project_id);
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    let assignee_id = dump.assignee_user_id(int(row, "assignee_id"));
    let milestone_id = int(row, "milestone_id");
    let attachments = dump.attachments_for("ISSUE_POST", issue_id);
    Some(serde_json::json!({
        "assigneeLoginId": dump.user_login_id(assignee_id),
        "authorLoginId": text(row, "author_login_id"),
        "attachments": attachments,
        "bodyMarkdown": text(row, "body"),
        "comments": dump.issue_comments(issue_id),
        "createdAt": ts(row, "created_date"),
        "historyMarkdown": "",
        "id": issue_id,
        "issueNumber": int(row, "number").to_string(),
        "labels": dump.issue_labels(issue_id),
        "milestoneTitle": dump.milestone_title(milestone_id),
        "ownerName": owner_name,
        "projectName": project_name,
        "state": issue_state(row, "state"),
        "title": text(row, "title"),
        "updatedAt": ts(row, "updated_date"),
    }))
}

fn transform_post(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let post_id = int(row, "id");
    let project_id = int(row, "project_id");
    if post_id <= 0 || project_id <= 0 {
        return None;
    }
    let (owner_name, project_name) = dump.project_owner_and_name(project_id);
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some(serde_json::json!({
        "authorLoginId": text(row, "author_login_id"),
        "attachments": dump.attachments_for("BOARD_POST", post_id),
        "bodyMarkdown": text(row, "body"),
        "comments": dump.posting_comments(post_id),
        "createdAt": ts(row, "created_date"),
        "historyMarkdown": "",
        "id": post_id,
        "labels": [],
        "notice": int(row, "notice") != 0,
        "ownerName": owner_name,
        "postNumber": int(row, "number").to_string(),
        "projectName": project_name,
        "readme": int(row, "readme") != 0,
        "title": text(row, "title"),
        "updatedAt": ts(row, "updated_date"),
    }))
}

fn transform_pull_request(dump: &Dump, row: &serde_json::Value) -> Option<serde_json::Value> {
    let pr_id = int(row, "id");
    let to_project_id = int(row, "to_project_id");
    if pr_id <= 0 || to_project_id <= 0 {
        return None;
    }
    // Legacy dump exports `state` as the State enum ordinal (1=OPEN, 2=CLOSED,
    // 3=REJECTED, 4=CONFLICT, 5=RESOLVED, 6=MERGED, 7=DRAFT).
    let state = match row.get("state").and_then(|value| value.as_i64()) {
        Some(1) => "OPEN".to_string(),
        Some(2) => "CLOSED".to_string(),
        Some(3) => "REJECTED".to_string(),
        Some(4) => "CONFLICT".to_string(),
        Some(5) => "RESOLVED".to_string(),
        Some(6) => "MERGED".to_string(),
        Some(7) => "DRAFT".to_string(),
        _ => text(row, "state").to_ascii_uppercase(),
    };
    let is_merged = state == "MERGED";
    // Threads for this PR, with their review comments.
    let threads: Vec<serde_json::Value> = dump
        .comment_thread
        .iter()
        .filter(|thread| int(thread, "pull_request_id") == pr_id)
        .map(|thread| {
            let thread_id = int(thread, "id");
            let author_id = int(thread, "author_id");
            serde_json::json!({
                "id": thread_id,
                "authorId": author_id,
                "authorLoginId": text(thread, "author_login_id"),
                "authorName": text(thread, "author_name"),
                "dtype": text(thread, "dtype"),
                "state": text(thread, "state"),
                "createdAt": ts(thread, "created_date"),
                "pullRequestId": pr_id,
                "projectId": to_project_id,
                "commitId": text(thread, "commit_id"),
                "path": text(thread, "path"),
                "line": int(thread, "end_line"),
            })
        })
        .collect();
    let thread_ids: std::collections::HashSet<i64> =
        threads.iter().map(|thread| int(thread, "id")).collect();
    let review_comments: Vec<serde_json::Value> = dump
        .review_comment
        .iter()
        .filter(|comment| thread_ids.contains(&int(comment, "thread_id")))
        .map(|comment| {
            let comment_id = int(comment, "id");
            let author_id = int(comment, "author_id");
            serde_json::json!({
                "id": comment_id,
                "authorId": author_id,
                "authorLoginId": text(comment, "author_login_id"),
                "authorName": text(comment, "author_name"),
                "bodyMarkdown": text(comment, "contents"),
                "createdAt": ts(comment, "created_date"),
                "commitId": "",
                "path": "",
                "line": 0,
                "threadId": int(comment, "thread_id"),
            })
        })
        .collect();
    let commit_ids: std::collections::HashSet<String> = threads
        .iter()
        .filter_map(|thread| {
            let commit_id = text(thread, "commit_id");
            if commit_id.is_empty() {
                None
            } else {
                Some(commit_id.to_string())
            }
        })
        .collect();
    let commit_comments: Vec<serde_json::Value> = dump
        .commit_comment
        .iter()
        .filter(|comment| {
            int(comment, "project_id") == to_project_id
                && commit_ids.contains(text(comment, "commit_id"))
        })
        .map(|comment| {
            let comment_id = int(comment, "id");
            let author_id = int(comment, "author_id");
            serde_json::json!({
                "id": comment_id,
                "authorId": author_id,
                "authorLoginId": text(comment, "author_login_id"),
                "authorName": text(comment, "author_name"),
                "bodyMarkdown": text(comment, "contents"),
                "createdAt": ts(comment, "created_date"),
                "commitId": text(comment, "commit_id"),
                "path": text(comment, "path"),
                "line": int(comment, "line"),
                "threadId": 0,
            })
        })
        .collect();
    let events: Vec<serde_json::Value> = dump
        .pull_request_event
        .iter()
        .filter(|event| int(event, "pull_request_id") == pr_id)
        .map(|event| {
            serde_json::json!({
                "id": int(event, "id"),
                "pullRequestId": pr_id,
                "senderLoginId": text(event, "sender_login_id"),
                "eventType": text(event, "event_type"),
                "oldValue": text(event, "old_value"),
                "newValue": text(event, "new_value"),
                "createdAt": ts(event, "created"),
            })
        })
        .collect();
    Some(serde_json::json!({
        "id": pr_id,
        "projectId": to_project_id,
        "contributorId": int(row, "contributor_id"),
        "receiverId": int(row, "receiver_id"),
        "number": int(row, "number"),
        "title": text(row, "title"),
        "bodyMarkdown": text(row, "body"),
        "state": state,
        "isMerged": is_merged,
        "mergedCommitIdFrom": text(row, "merged_commit_id_from"),
        "mergedCommitIdTo": text(row, "merged_commit_id_to"),
        "createdAt": ts(row, "created"),
        "updatedAt": ts(row, "updated"),
        "events": events,
        "threads": threads,
        "reviewComments": review_comments,
        "commitComments": commit_comments,
    }))
}

/// Transform a full legacy site dump into the import payload.
pub fn transform_dump(tables: &[(String, Vec<serde_json::Value>)]) -> TransformationContext {
    let dump = Dump::from_tables(tables);
    let mut ctx = TransformationContext::new();
    for row in &dump.n4user {
        if let Some(item) = transform_user(&dump, row) {
            ctx.users.push(item);
        }
    }
    for row in &dump.organization {
        if let Some(item) = transform_organization(row) {
            ctx.organizations.push(item);
        }
    }
    for row in &dump.organization_user {
        if let Some(item) = transform_organization_member(&dump, row) {
            ctx.organization_members.push(item);
        }
    }
    for row in &dump.project {
        if let Some(item) = transform_project(row) {
            ctx.projects.push(item);
        }
    }
    // Legacy allows multiple role rows per user/project (e.g. sitemanager +
    // manager); the import payload keys on (owner, project, loginId) so keep
    // one row per key, preferring the manager role.
    let mut member_by_key: HashMap<(String, String, String), serde_json::Value> = HashMap::new();
    for row in &dump.project_user {
        if let Some(item) = transform_project_member(&dump, row) {
            let key = (
                item["ownerName"].as_str().unwrap_or("").to_string(),
                item["projectName"].as_str().unwrap_or("").to_string(),
                item["loginId"].as_str().unwrap_or("").to_string(),
            );
            let is_manager = item["role"].as_str().unwrap_or("") == "manager";
            match member_by_key.get_mut(&key) {
                Some(existing) => {
                    if is_manager {
                        *existing = item;
                    }
                }
                None => {
                    member_by_key.insert(key, item);
                }
            }
        }
    }
    let mut members = member_by_key.into_values().collect::<Vec<_>>();
    members.sort_by(|left, right| {
        left["ownerName"]
            .as_str()
            .cmp(&right["ownerName"].as_str())
            .then_with(|| {
                left["projectName"]
                    .as_str()
                    .cmp(&right["projectName"].as_str())
            })
            .then_with(|| left["loginId"].as_str().cmp(&right["loginId"].as_str()))
    });
    ctx.project_members = members;
    for row in &dump.issue_label {
        if let Some(item) = transform_label(&dump, row) {
            ctx.labels.push(item);
        }
    }
    for row in &dump.milestone {
        if let Some(item) = transform_milestone(&dump, row) {
            ctx.milestones.push(item);
        }
    }
    for row in &dump.issue {
        if let Some(item) = transform_issue(&dump, row) {
            ctx.issues.push(item);
        }
    }
    for row in &dump.posting {
        if let Some(item) = transform_post(&dump, row) {
            ctx.posts.push(item);
        }
    }
    for row in &dump.pull_request {
        if let Some(item) = transform_pull_request(&dump, row) {
            ctx.pull_requests.push(item);
        }
    }
    ctx
}

/// Transform a single table's rows into the target format (kept for
/// table-by-table callers; prefer [`transform_dump`] which can resolve
/// cross-table references).
pub fn transform_table(
    table_name: &str,
    rows: Vec<serde_json::Value>,
    ctx: &mut TransformationContext,
) {
    let tables = vec![(table_name.to_string(), rows)];
    let transformed = transform_dump(&tables);
    ctx.users.extend(transformed.users);
    ctx.organizations.extend(transformed.organizations);
    ctx.organization_members
        .extend(transformed.organization_members);
    ctx.projects.extend(transformed.projects);
    ctx.project_members.extend(transformed.project_members);
    ctx.labels.extend(transformed.labels);
    ctx.milestones.extend(transformed.milestones);
    ctx.issues.extend(transformed.issues);
    ctx.posts.extend(transformed.posts);
    ctx.pull_requests.extend(transformed.pull_requests);
}

/// Build a row index map for a table (for tests).
#[allow(dead_code)]
fn index_by_id(rows: &[serde_json::Value]) -> HashMap<i64, &serde_json::Value> {
    rows.iter()
        .filter_map(|row| {
            row.get("id")
                .and_then(|value| value.as_i64())
                .map(|id| (id, row))
        })
        .collect()
}

/// `#[serde(default)]` helper: legacy dump timestamps may be `null`.
#[allow(dead_code)]
fn is_null(value: &serde_json::Value, field: &str) -> bool {
    is_null_or_missing(value, field)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_dump() -> Vec<(String, Vec<serde_json::Value>)> {
        vec![
            (
                "N4USER".to_string(),
                vec![serde_json::json!({
                    "id": 1,
                    "name": "Alice",
                    "login_id": "alice",
                    "password": "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU=",
                    "password_salt": "c2FsdC1mb3ItdGVzdA==",
                    "email": "alice@example.com",
                    "created_date": 1577836801000_i64,
                    "state": "ACTIVE",
                    "last_state_modified_date": 1577836802000_i64,
                })],
            ),
            (
                "SITE_ADMIN".to_string(),
                vec![serde_json::json!({"id": 1, "admin_id": 1})],
            ),
            (
                "ORGANIZATION".to_string(),
                vec![serde_json::json!({
                    "id": 10,
                    "name": "myorg",
                    "descr": "Org description",
                    "created": 1577836800000_i64,
                })],
            ),
            (
                "ORGANIZATION_USER".to_string(),
                vec![serde_json::json!({
                    "id": 100,
                    "user_id": 1,
                    "organization_id": 10,
                    "role_id": 2,
                })],
            ),
            (
                "ROLE".to_string(),
                vec![
                    serde_json::json!({"id": 1, "name": "manager"}),
                    serde_json::json!({"id": 2, "name": "org_admin"}),
                    serde_json::json!({"id": 3, "name": "member"}),
                ],
            ),
            (
                "PROJECT".to_string(),
                vec![serde_json::json!({
                    "id": 20,
                    "name": "repo",
                    "overview": "A project",
                    "vcs": "GIT",
                    "owner": "myorg",
                    "created_date": 1577836800000_i64,
                    "organization_id": 10,
                    "project_scope": "protected",
                })],
            ),
            (
                "PROJECT_USER".to_string(),
                vec![serde_json::json!({
                    "id": 200,
                    "user_id": 1,
                    "project_id": 20,
                    "role_id": 1,
                })],
            ),
            (
                "ISSUE_LABEL_CATEGORY".to_string(),
                vec![serde_json::json!({
                    "id": 30,
                    "project_id": 20,
                    "name": "Type",
                    "is_exclusive": false,
                })],
            ),
            (
                "ISSUE_LABEL".to_string(),
                vec![serde_json::json!({
                    "id": 31,
                    "color": "#f44336",
                    "name": "Bug",
                    "project_id": 20,
                    "category_id": 30,
                })],
            ),
            (
                "MILESTONE".to_string(),
                vec![serde_json::json!({
                    "id": 40,
                    "title": "Sprint 1",
                    "due_date": 1577923200000_i64,
                    "contents": "milestone body",
                    "state": 1,
                    "project_id": 20,
                })],
            ),
            (
                "ISSUE".to_string(),
                vec![serde_json::json!({
                    "id": 50,
                    "title": "First issue",
                    "body": "issue body",
                    "created_date": 1577836800000_i64,
                    "num_of_comments": 1,
                    "milestone_id": 40,
                    "author_id": 1,
                    "author_login_id": "alice",
                    "author_name": "Alice",
                    "state": 2,
                    "project_id": 20,
                    "assignee_id": 0,
                    "number": 1,
                    "updated_date": 1577836800000_i64,
                    "due_date": null,
                })],
            ),
            (
                "ISSUE_ISSUE_LABEL".to_string(),
                vec![serde_json::json!({"issue_id": 50, "issue_label_id": 31})],
            ),
            (
                "ISSUE_COMMENT".to_string(),
                vec![serde_json::json!({
                    "id": 51,
                    "created_date": 1577836800000_i64,
                    "author_id": 1,
                    "author_login_id": "alice",
                    "author_name": "Alice",
                    "issue_id": 50,
                    "contents": "a comment",
                })],
            ),
            (
                "POSTING".to_string(),
                vec![serde_json::json!({
                    "id": 60,
                    "title": "Board post",
                    "body": "post body",
                    "created_date": 1577836800000_i64,
                    "num_of_comments": 0,
                    "author_id": 1,
                    "author_login_id": "alice",
                    "author_name": "Alice",
                    "project_id": 20,
                    "number": 1,
                    "notice": 1,
                    "updated_date": 1577836800000_i64,
                    "readme": 0,
                })],
            ),
            (
                "PULL_REQUEST".to_string(),
                vec![serde_json::json!({
                    "id": 70,
                    "title": "Fix bug",
                    "body": "pr body",
                    "to_project_id": 20,
                    "from_project_id": 20,
                    "to_branch": "main",
                    "from_branch": "fix",
                    "contributor_id": 1,
                    "receiver_id": 1,
                    "created": 1577836800000_i64,
                    "updated": 1577836800000_i64,
                    "state": "OPEN",
                    "number": 1,
                })],
            ),
            (
                "PULL_REQUEST_EVENT".to_string(),
                vec![serde_json::json!({
                    "id": 71,
                    "pull_request_id": 70,
                    "created": 1577836800000_i64,
                    "sender_login_id": "alice",
                    "event_type": "NEW_PULL_REQUEST",
                    "new_value": "Fix bug",
                })],
            ),
        ]
    }

    #[test]
    fn test_transform_dump_preserves_ids_and_fks() {
        let ctx = transform_dump(&sample_dump());
        assert_eq!(ctx.users.len(), 1);
        assert_eq!(ctx.users[0]["id"], 1);
        assert_eq!(
            ctx.users[0]["password"],
            "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU="
        );
        assert_eq!(ctx.users[0]["passwordSalt"], "c2FsdC1mb3ItdGVzdA==");
        assert_eq!(ctx.users[0]["isSiteAdmin"], true);
        assert_eq!(ctx.users[0]["loginId"], "alice");
        assert_eq!(ctx.organizations.len(), 1);
        assert_eq!(ctx.organizations[0]["id"], 10);
        assert_eq!(ctx.organizations[0]["name"], "myorg");
        assert_eq!(ctx.organization_members.len(), 1);
        assert_eq!(ctx.organization_members[0]["role"], "org_admin");
        assert_eq!(ctx.projects.len(), 1);
        assert_eq!(ctx.projects[0]["id"], 20);
        assert_eq!(ctx.projects[0]["organizationId"], 10);
        assert_eq!(ctx.project_members.len(), 1);
        assert_eq!(ctx.project_members[0]["role"], "manager");
        assert_eq!(ctx.labels.len(), 1);
        assert_eq!(ctx.labels[0]["id"], 31);
        assert_eq!(ctx.milestones.len(), 1);
        assert_eq!(ctx.milestones[0]["id"], 40);
        assert_eq!(ctx.milestones[0]["state"], "open");
        assert_eq!(ctx.issues.len(), 1);
        let issue = &ctx.issues[0];
        assert_eq!(issue["id"], 50);
        assert_eq!(issue["issueNumber"], "1");
        assert_eq!(issue["state"], "closed");
        assert_eq!(issue["ownerName"], "myorg");
        assert_eq!(issue["projectName"], "repo");
        assert_eq!(issue["milestoneTitle"], "Sprint 1");
        assert_eq!(issue["labels"][0]["name"], "Bug");
        assert_eq!(issue["comments"][0]["contentsMarkdown"], "a comment");
        assert_eq!(issue["comments"][0]["id"], 51);
        assert_eq!(ctx.posts.len(), 1);
        assert_eq!(ctx.posts[0]["id"], 60);
        assert_eq!(ctx.posts[0]["notice"], true);
        assert_eq!(ctx.pull_requests.len(), 1);
        let pr = &ctx.pull_requests[0];
        assert_eq!(pr["id"], 70);
        assert_eq!(pr["projectId"], 20);
        assert_eq!(pr["contributorId"], 1);
        assert_eq!(pr["state"], "OPEN");
        assert_eq!(pr["events"][0]["eventType"], "NEW_PULL_REQUEST");
    }

    #[test]
    fn test_transform_skips_missing_project_owner() {
        let dump = vec![(
            "ISSUE".to_string(),
            vec![serde_json::json!({"id": 1, "project_id": 999, "number": 1})],
        )];
        let ctx = transform_dump(&dump);
        assert!(ctx.issues.is_empty());
    }

    #[test]
    fn test_transform_table_accumulates() {
        let mut ctx = TransformationContext::new();
        let rows = vec![serde_json::json!({"id": 5, "login_id": "a", "name": "A", "email": "a@x"})];
        transform_table("N4USER", rows, &mut ctx);
        assert_eq!(ctx.users.len(), 1);
        assert!(ctx.projects.is_empty());
    }

    #[test]
    fn test_unknown_table_is_skipped() {
        let mut ctx = TransformationContext::new();
        transform_table("unknown_table", vec![serde_json::json!({})], &mut ctx);
        assert!(ctx.users.is_empty());
        assert!(ctx.projects.is_empty());
    }
}
