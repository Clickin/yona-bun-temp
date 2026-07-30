/// Site-level format transformer.
///
/// Takes raw table rows from the legacy Yona `/sites/export` format and transforms
/// them into the Yoram import format (`RestSiteImportPayload`).
use serde::Serialize;

/// A single batch of transformed data ready for import.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformationContext {
    pub format: String,
    pub users: Vec<serde_json::Value>,
    pub projects: Vec<serde_json::Value>,
    pub project_members: Vec<serde_json::Value>,
    pub labels: Vec<serde_json::Value>,
    pub milestones: Vec<serde_json::Value>,
    pub issues: Vec<serde_json::Value>,
    pub posts: Vec<serde_json::Value>,
}

impl TransformationContext {
    pub fn new() -> Self {
        Self {
            format: "yobi-data".to_string(),
            users: Vec::new(),
            projects: Vec::new(),
            project_members: Vec::new(),
            labels: Vec::new(),
            milestones: Vec::new(),
            issues: Vec::new(),
            posts: Vec::new(),
        }
    }
}

impl Default for TransformationContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Transform a legacy `n4user` row to a user import item.
fn transform_user(row: &serde_json::Value) -> Option<serde_json::Value> {
    Some(serde_json::json!({
        "loginId": row.get("login_id")?.as_str()?,
        "displayName": row.get("name").or_else(|| row.get("display_name")).and_then(|v| v.as_str()).unwrap_or(""),
        "emailAddress": row.get("email").or_else(|| row.get("email_address")).and_then(|v| v.as_str()).unwrap_or(""),
        "state": row.get("state").and_then(|v| v.as_str()).unwrap_or("active"),
        "isSiteAdmin": row.get("is_site_admin").or_else(|| row.get("site_admin")).and_then(|v| v.as_bool()).unwrap_or(false),
    }))
}

/// Transform a legacy `project` row to a project import item.
fn transform_project(row: &serde_json::Value) -> Option<serde_json::Value> {
    Some(serde_json::json!({
        "ownerName": row.get("owner_name")?.as_str()?,
        "projectName": row.get("name").or_else(|| row.get("project_name"))?.as_str()?,
        "overview": row.get("overview").and_then(|v| v.as_str()).unwrap_or(""),
        "projectScope": row.get("project_scope").and_then(|v| v.as_str()).unwrap_or("private"),
        "projectVcs": row.get("vcs").and_then(|v| v.as_str()).unwrap_or("GIT"),
    }))
}

/// Transform a legacy `project_user` row to a project member import item.
fn transform_project_member(row: &serde_json::Value) -> Option<serde_json::Value> {
    Some(serde_json::json!({
        "loginId": row.get("user_login_id").or_else(|| row.get("login_id"))?.as_str()?,
        "ownerName": row.get("project_owner_name").or_else(|| row.get("owner_name"))?.as_str()?,
        "projectName": row.get("project_name")?.as_str()?,
        "role": row.get("role").and_then(|v| v.as_str()).unwrap_or("member"),
    }))
}

/// Transform a legacy `label` row to a label import item.
fn transform_label(row: &serde_json::Value) -> Option<serde_json::Value> {
    Some(serde_json::json!({
        "categoryName": row.get("category").or_else(|| row.get("category_name")).and_then(|v| v.as_str()).unwrap_or(""),
        "name": row.get("name").or_else(|| row.get("label_name"))?.as_str()?,
        "color": row.get("color").and_then(|v| v.as_str()).unwrap_or("#000000"),
        "ownerName": row.get("project_owner_name").or_else(|| row.get("owner_name"))?.as_str()?,
        "projectName": row.get("project_name")?.as_str()?,
    }))
}

/// Transform a legacy `milestone` row to a milestone import item.
fn transform_milestone(row: &serde_json::Value) -> Option<serde_json::Value> {
    // Extract project identifiers: either from nested "project" object or flattened fields
    let (owner_name, project_name) = row
        .get("project")
        .and_then(|v| v.as_object())
        .map(|proj| {
            (
                proj.get("owner_name")
                    .or_else(|| proj.get("owner"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
                proj.get("project_name")
                    .or_else(|| proj.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            )
        })
        .unwrap_or_else(|| {
            (
                row.get("owner_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
                row.get("project_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            )
        });

    Some(serde_json::json!({
        "title": row.get("title")?.as_str()?,
        "state": row.get("state").and_then(|v| v.as_str()).unwrap_or("open"),
        "dueDate": row.get("due_date").and_then(|v| v.as_str()).unwrap_or(""),
        "ownerName": owner_name,
        "projectName": project_name,
    }))
}

/// Transform all rows from a table into the target format.
pub fn transform_table(
    table_name: &str,
    rows: Vec<serde_json::Value>,
    ctx: &mut TransformationContext,
) {
    match table_name {
        "n4user" | "users" => {
            for row in rows {
                if let Some(item) = transform_user(&row) {
                    ctx.users.push(item);
                }
            }
        }
        "project" | "projects" => {
            for row in rows {
                if let Some(item) = transform_project(&row) {
                    ctx.projects.push(item);
                }
            }
        }
        "project_user" | "project_members" => {
            for row in rows {
                if let Some(item) = transform_project_member(&row) {
                    ctx.project_members.push(item);
                }
            }
        }
        "label" | "labels" => {
            for row in rows {
                if let Some(item) = transform_label(&row) {
                    ctx.labels.push(item);
                }
            }
        }
        "milestone" | "milestones" => {
            for row in rows {
                if let Some(item) = transform_milestone(&row) {
                    ctx.milestones.push(item);
                }
            }
        }
        "issue" | "issues" => {
            ctx.issues.extend(rows);
        }
        "posting" | "posts" => {
            ctx.posts.extend(rows);
        }
        _ => {
            // Unknown table — skip
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_user() {
        let row = serde_json::json!({
            "login_id": "alice",
            "name": "Alice",
            "email": "alice@example.com",
            "state": "active",
            "site_admin": true,
        });
        let result = transform_user(&row).unwrap();
        assert_eq!(result["loginId"], "alice");
        assert_eq!(result["isSiteAdmin"], true);
    }

    #[test]
    fn test_transform_project() {
        let row = serde_json::json!({
            "owner_name": "myorg",
            "project_name": "myproject",
            "overview": "A test project",
            "project_scope": "public",
            "vcs": "GIT",
        });
        let result = transform_project(&row).unwrap();
        assert_eq!(result["projectName"], "myproject");
        assert_eq!(result["projectScope"], "public");
    }

    #[test]
    fn test_transform_table_accumulates() {
        let mut ctx = TransformationContext::new();
        let rows = vec![
            serde_json::json!({"login_id": "a", "name": "A", "email": "a@x"}),
        ];
        transform_table("n4user", rows, &mut ctx);
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