/// TO targets — writes transformed data to a running Yoram instance or to stdout/file.
use std::path::PathBuf;

use anyhow::{Context as _, Result};

/// Write a full site import payload to a Yoram instance.
///
/// POST {base_url}/api/v1/site/import
pub fn write_site_import(
    base_url: &str,
    token: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value> {
    let url = format!("{}/api/v1/site/import", base_url.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(payload)
        .send()
        .context("Failed to send site import request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        anyhow::bail!(
            "Site import request failed: HTTP {} — {}",
            status,
            body,
        );
    }

    response.json().context("Failed to parse site import response")
}

/// Write data to a JSON file (streaming).
pub fn write_to_file(path: &PathBuf, payload: &serde_json::Value) -> Result<()> {
    let file = std::fs::File::create(path)
        .with_context(|| format!("Failed to create output file {}", path.display()))?;
    serde_json::to_writer_pretty(file, payload)
        .with_context(|| format!("Failed to write JSON to {}", path.display()))?;
    Ok(())
}

/// Write data to stdout (streaming).
pub fn write_to_stdout(payload: &serde_json::Value) -> Result<()> {
    serde_json::to_writer_pretty(std::io::stdout().lock(), payload)
        .context("Failed to write JSON to stdout")?;
    println!();
    Ok(())
}

/// Convert a legacy `ProjectApi.exports` response (project/members/labels/
/// milestones/issues/posts) into NDJSON import lines.
///
/// Line kinds match `crates/server/src/routes/exports.rs`:
/// project, member, label, milestone, post, issue, done.
pub fn project_export_to_ndjson(payload: &serde_json::Value) -> Result<Vec<String>> {
    let owner = payload
        .get("owner")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    let project_name = payload
        .get("projectName")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    if owner.is_empty() || project_name.is_empty() {
        anyhow::bail!("project export missing owner/projectName");
    }
    let project_vcs = payload
        .get("projectVcs")
        .and_then(|value| value.as_str())
        .unwrap_or("GIT")
        .to_string();
    let project_scope = payload
        .get("projectScope")
        .and_then(|value| value.as_str())
        .unwrap_or("PRIVATE")
        .to_ascii_lowercase();
    let mut lines = Vec::new();
    lines.push(line("project", &serde_json::json!({
        "id": 0,
        "organizationId": 0,
        "owner": owner,
        "projectName": project_name,
        "projectDescription": payload.get("projectDescription").and_then(|v| v.as_str()).unwrap_or(""),
        "projectCreatedDate": payload.get("projectCreatedDate").and_then(|v| v.as_str()).unwrap_or(""),
        "projectVcs": project_vcs,
        "projectScope": project_scope,
    }))?);

    let mut member_count = 0u32;
    let mut label_count = 0u32;
    let mut milestone_count = 0u32;
    let mut issue_count = 0u32;
    let mut post_count = 0u32;

    if let Some(members) = payload.get("members").and_then(|value| value.as_array()) {
        for member in members {
            lines.push(line("member", &serde_json::json!({
                "id": 0,
                "loginId": member.get("loginId").and_then(|v| v.as_str()).unwrap_or(""),
                "ownerName": owner,
                "projectName": project_name,
                "role": member.get("role").and_then(|v| v.as_str()).unwrap_or("member"),
            }))?);
            member_count += 1;
        }
    }

    if let Some(labels) = payload.get("labels").and_then(|value| value.as_array()) {
        for label in labels {
            lines.push(line("label", &serde_json::json!({
                "categoryIsExclusive": label.get("isExclusive").and_then(|v| v.as_bool()).unwrap_or(false),
                "categoryName": label.get("category").and_then(|v| v.as_str()).unwrap_or(""),
                "color": label.get("labelColor").and_then(|v| v.as_str()).unwrap_or("#999999"),
                "id": 0,
                "name": label.get("labelName").and_then(|v| v.as_str()).unwrap_or(""),
                "ownerName": owner,
                "projectName": project_name,
            }))?);
            label_count += 1;
        }
    }

    if let Some(milestones) = payload.get("milestones").and_then(|value| value.as_array()) {
        for milestone in milestones {
            lines.push(line("milestone", &serde_json::json!({
                "attachments": [],
                "contentsMarkdown": milestone.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                "dueDate": milestone.get("dueDate").and_then(|v| v.as_str()).unwrap_or(""),
                "id": milestone.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                "ownerName": owner,
                "projectName": project_name,
                "state": milestone.get("state").and_then(|v| v.as_str()).unwrap_or("open"),
                "title": milestone.get("title").and_then(|v| v.as_str()).unwrap_or(""),
            }))?);
            milestone_count += 1;
        }
    }

    if let Some(issues) = payload.get("issues").and_then(|value| value.as_array()) {
        for item in issues {
            let is_issue = item
                .get("type")
                .and_then(|value| value.as_str())
                .is_some_and(|kind| kind == "ISSUE_POST");
            let kind = if is_issue { "issue" } else { "post" };
            let item_json = if is_issue {
                serde_json::json!({
                    "assigneeLoginId": item.get("assignees").and_then(|v| v.as_array())
                        .and_then(|assignees| assignees.first())
                        .and_then(|assignee| assignee.get("loginId"))
                        .and_then(|v| v.as_str()).unwrap_or(""),
                    "authorLoginId": item.get("author").and_then(|v| v.get("loginId")).and_then(|v| v.as_str()).unwrap_or(""),
                    "attachments": [],
                    "bodyMarkdown": item.get("body").and_then(|v| v.as_str()).unwrap_or(""),
                    "comments": project_export_comments(item),
                    "createdAt": item.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                    "historyMarkdown": "",
                    "id": item.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                    "issueNumber": item.get("number").and_then(|v| v.as_i64()).map(|n| n.to_string()).unwrap_or_default(),
                    "labels": [],
                    "milestoneTitle": item.get("milestoneTitle").and_then(|v| v.as_str()).unwrap_or(""),
                    "ownerName": owner,
                    "projectName": project_name,
                    "state": item.get("state").and_then(|v| v.as_str()).unwrap_or("open").to_ascii_lowercase(),
                    "title": item.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "updatedAt": item.get("updatedAt").and_then(|v| v.as_str()).unwrap_or(""),
                })
            } else {
                serde_json::json!({
                    "authorLoginId": item.get("author").and_then(|v| v.get("loginId")).and_then(|v| v.as_str()).unwrap_or(""),
                    "attachments": [],
                    "bodyMarkdown": item.get("body").and_then(|v| v.as_str()).unwrap_or(""),
                    "comments": project_export_comments(item),
                    "createdAt": item.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                    "historyMarkdown": "",
                    "id": item.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                    "labels": [],
                    "notice": false,
                    "ownerName": owner,
                    "postNumber": item.get("number").and_then(|v| v.as_i64()).map(|n| n.to_string()).unwrap_or_default(),
                    "projectName": project_name,
                    "readme": false,
                    "title": item.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "updatedAt": item.get("updatedAt").and_then(|v| v.as_str()).unwrap_or(""),
                })
            };
            lines.push(line(kind, &item_json)?);
            if is_issue {
                issue_count += 1;
            } else {
                post_count += 1;
            }
        }
    }

    lines.push(line(
        "done",
        &serde_json::json!({
            "memberCount": member_count,
            "issueCount": issue_count,
            "postCount": post_count,
            "milestoneCount": milestone_count,
        }),
    )?);
    let _ = label_count;
    Ok(lines)
}

/// Slice a site-dump transform context into NDJSON import lines for one
/// project (owner/project names must match).
pub fn context_project_to_ndjson(
    ctx: &crate::site_transform::TransformationContext,
    owner: &str,
    project: &str,
) -> Result<Vec<String>> {
    let mut lines = Vec::new();
    let mut member_count = 0u32;
    let mut issue_count = 0u32;
    let mut post_count = 0u32;
    let mut milestone_count = 0u32;

    let project_item = ctx
        .projects
        .iter()
        .find(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
        .cloned()
        .unwrap_or_else(|| {
            serde_json::json!({
                "id": 0,
                "ownerName": owner,
                "projectName": project,
                "overview": "",
                "projectScope": "private",
                "projectVcs": "GIT",
                "organizationId": 0,
                "createdAt": "",
            })
        });
    lines.push(line("project", &serde_json::json!({
        "id": project_item.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
        "organizationId": project_item.get("organizationId").and_then(|v| v.as_i64()).unwrap_or(0),
        "owner": owner,
        "projectName": project,
        "projectDescription": project_item.get("overview").and_then(|v| v.as_str()).unwrap_or(""),
        "projectCreatedDate": project_item.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
        "projectVcs": project_item.get("projectVcs").and_then(|v| v.as_str()).unwrap_or("GIT"),
        "projectScope": project_item.get("projectScope").and_then(|v| v.as_str()).unwrap_or("private"),
    }))?);

    for member in ctx
        .project_members
        .iter()
        .filter(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
    {
        lines.push(line("member", member)?);
        member_count += 1;
    }
    for label in ctx
        .labels
        .iter()
        .filter(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
    {
        lines.push(line("label", label)?);
    }
    for milestone in ctx
        .milestones
        .iter()
        .filter(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
    {
        lines.push(line("milestone", milestone)?);
        milestone_count += 1;
    }
    for issue in ctx
        .issues
        .iter()
        .filter(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
    {
        lines.push(line("issue", issue)?);
        issue_count += 1;
    }
    for post in ctx
        .posts
        .iter()
        .filter(|item| {
            item.get("ownerName").and_then(|v| v.as_str()) == Some(owner)
                && item.get("projectName").and_then(|v| v.as_str()) == Some(project)
        })
    {
        lines.push(line("post", post)?);
        post_count += 1;
    }
    lines.push(line(
        "done",
        &serde_json::json!({
            "memberCount": member_count,
            "issueCount": issue_count,
            "postCount": post_count,
            "milestoneCount": milestone_count,
        }),
    )?);
    Ok(lines)
}

fn project_export_comments(item: &serde_json::Value) -> Vec<serde_json::Value> {
    item.get("comments")
        .and_then(|value| value.as_array())
        .map(|comments| {
            comments
                .iter()
                .map(|comment| {
                    serde_json::json!({
                        "authorLoginId": comment.get("author").and_then(|v| v.get("loginId")).and_then(|v| v.as_str()).unwrap_or(""),
                        "attachments": [],
                        "contentsMarkdown": comment.get("body").and_then(|v| v.as_str()).unwrap_or(""),
                        "createdAt": comment.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                        "id": comment.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn line(kind: &str, record: &serde_json::Value) -> Result<String> {
    let mut line_value = record.clone();
    if let Some(object) = line_value.as_object_mut() {
        object.insert("kind".to_string(), serde_json::Value::String(kind.to_string()));
    }
    Ok(serde_json::to_string(&line_value)?)
}

/// Stream NDJSON project import lines to a Yoram instance.
///
/// POST {base_url}/api/v1/owners/{owner}/projects/{project}/imports
pub fn write_project_import_ndjson(
    base_url: &str,
    token: &str,
    owner: &str,
    project: &str,
    lines: &[String],
    dry_run: bool,
) -> Result<serde_json::Value> {
    let mut url = format!(
        "{}/api/v1/owners/{}/projects/{}/imports",
        base_url.trim_end_matches('/'),
        owner,
        project,
    );
    if dry_run {
        url.push_str("?dryRun=true");
    }
    let body = lines.join("\n");

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/x-ndjson")
        .body(body)
        .send()
        .context("Failed to send project NDJSON import request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        anyhow::bail!(
            "Project NDJSON import request failed: HTTP {} — {}",
            status,
            body,
        );
    }

    response.json().context("Failed to parse project NDJSON import response")
}

// ponytail: attachment upload via multipart deferred — use the import endpoint for now

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_to_file_roundtrip() {
        let dir = std::env::temp_dir();
        let path = dir.join("yona_migrate_test_write.json");
        let _ = std::fs::remove_file(&path);
        let payload = serde_json::json!({"hello": "world"});
        write_to_file(&path, &payload).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        let _ = std::fs::remove_file(&path);
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["hello"], "world");
    }

    #[test]
    fn test_line_adds_kind() {
        let line = line("project", &serde_json::json!({"owner": "o"})).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(parsed["kind"], "project");
        assert_eq!(parsed["owner"], "o");
    }

    #[test]
    fn test_project_export_to_ndjson_shape() {
        let payload = serde_json::json!({
            "owner": "alice",
            "projectName": "repo",
            "projectDescription": "desc",
            "projectCreatedDate": "2020-01-01 12:00:00 +0000",
            "projectVcs": "GIT",
            "projectScope": "PUBLIC",
            "members": [{"loginId": "alice", "name": "Alice", "role": "manager", "email": "a@x"}],
            "labels": [{"labelName": "Bug", "labelColor": "#f00", "category": "Type", "isExclusive": false}],
            "milestones": [{"id": 5, "title": "M1", "state": "open", "description": "d"}],
            "issues": [{
                "id": 9,
                "number": 1,
                "type": "ISSUE_POST",
                "title": "T",
                "body": "B",
                "author": {"loginId": "alice"},
                "state": "OPEN",
                "comments": [{"id": 1, "author": {"loginId": "alice"}, "body": "c", "createdAt": "x"}],
                "createdAt": "2020-01-01T00:00:00Z",
                "updatedAt": "2020-01-01T00:00:00Z"
            }]
        });
        let lines = project_export_to_ndjson(&payload).unwrap();
        // project, member, label, milestone, issue, done
        assert_eq!(lines.len(), 6);
        let first: serde_json::Value = serde_json::from_str(&lines[0]).unwrap();
        assert_eq!(first["kind"], "project");
        assert_eq!(first["owner"], "alice");
        let issue_line: serde_json::Value = serde_json::from_str(&lines[4]).unwrap();
        assert_eq!(issue_line["kind"], "issue");
        assert_eq!(issue_line["issueNumber"], "1");
        assert_eq!(issue_line["authorLoginId"], "alice");
        assert_eq!(issue_line["comments"][0]["contentsMarkdown"], "c");
        let done: serde_json::Value = serde_json::from_str(&lines[5]).unwrap();
        assert_eq!(done["kind"], "done");
        assert_eq!(done["issueCount"], 1);
    }

    #[test]
    fn test_context_project_to_ndjson_slices_by_project() {
        let mut ctx = crate::site_transform::TransformationContext::new();
        ctx.projects.push(serde_json::json!({
            "id": 1, "ownerName": "alice", "projectName": "repo",
            "overview": "o", "projectScope": "private", "projectVcs": "GIT", "createdAt": ""
        }));
        ctx.project_members.push(serde_json::json!({
            "id": 0, "loginId": "alice", "ownerName": "alice", "projectName": "repo", "role": "manager"
        }));
        ctx.issues.push(serde_json::json!({
            "id": 2, "ownerName": "alice", "projectName": "repo", "issueNumber": "1", "title": "t"
        }));
        // other project must be excluded
        ctx.issues.push(serde_json::json!({
            "id": 3, "ownerName": "alice", "projectName": "other", "issueNumber": "1", "title": "t2"
        }));
        let lines = context_project_to_ndjson(&ctx, "alice", "repo").unwrap();
        let kinds: Vec<String> = lines
            .iter()
            .map(|line| {
                let value: serde_json::Value = serde_json::from_str(line).unwrap();
                value["kind"].as_str().unwrap().to_string()
            })
            .collect();
        assert_eq!(kinds, vec!["project", "member", "issue", "done"]);
        let done: serde_json::Value = serde_json::from_str(lines.last().unwrap()).unwrap();
        assert_eq!(done["issueCount"], 1);
    }
}
