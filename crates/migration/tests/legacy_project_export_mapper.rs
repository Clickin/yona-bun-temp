#![recursion_limit = "256"]

use serde_json::json;
use yona_rust_pilot_migration::legacy_external::project_export_mapper::map_project_export_json_to_yobi_data;

#[test]
fn maps_legacy_project_api_export_to_yobi_data_snapshot_core_fields() {
    let payload = json!({
        "owner": "alice",
        "projectName": "demo",
        "projectDescription": "Legacy project",
        "projectVcs": "GIT",
        "projectScope": "PUBLIC",
        "authors": [{
            "loginId": "author",
            "name": "Author User",
            "email": "author@example.com"
        }],
        "assignees": [{
            "loginId": "assignee",
            "name": "Assignee User",
            "email": "assignee@example.com"
        }],
        "members": [{
            "loginId": "alice",
            "name": "Alice Owner",
            "role": "manager",
            "email": "alice@example.com"
        }],
        "labels": [{
            "labelName": "Bug",
            "labelColor": "#2196f3",
            "category": "Type",
            "isExclusive": false
        }],
        "milestones": [{
            "id": 7,
            "title": "M1",
            "state": "open",
            "description": "First milestone",
            "dueDate": "2026-06-30 PM 11:59:59 +0900"
        }],
        "issues": [{
            "number": 3,
            "id": 30,
            "title": "Legacy issue",
            "type": "ISSUE_POST",
            "author": {
                "loginId": "author",
                "name": "Author User",
                "email": "author@example.com"
            },
            "createdAt": "2026-06-01T00:00:00Z",
            "updatedAt": "2026-06-02T00:00:00Z",
            "body": "legacy issue body",
            "assignees": [{
                "loginId": "assignee",
                "name": "Assignee User",
                "email": "assignee@example.com"
            }],
            "state": "CLOSED",
            "labels": [{
                "labelName": "Bug",
                "labelColor": "#2196f3",
                "category": "Type"
            }],
            "milestoneTitle": "M1",
            "attachments": [{
                "id": 301,
                "name": "issue.png",
                "hash": "issue-hash",
                "mimeType": "image/png",
                "size": 123,
                "containerType": "ISSUE_POST",
                "containerId": "30",
                "ownerLoginId": "author"
            }],
            "comments": [{
                "id": 40,
                "type": "ISSUE_COMMENT",
                "author": {
                    "loginId": "commenter",
                    "name": "Commenter User",
                    "email": "commenter@example.com"
                },
                "createdAt": "2026-06-03T00:00:00Z",
                "body": "issue comment",
                "attachments": [{
                    "id": 401,
                    "name": "issue-comment.txt",
                    "hash": "issue-comment-hash",
                    "mimeType": "text/plain",
                    "size": 45,
                    "containerType": "ISSUE_COMMENT",
                    "containerId": "40",
                    "ownerLoginId": "commenter"
                }]
            }]
        }],
        "posts": [{
            "number": 4,
            "id": 50,
            "title": "Legacy post",
            "type": "BOARD_POST",
            "author": {
                "loginId": "author",
                "name": "Author User",
                "email": "author@example.com"
            },
            "body": "legacy post body",
            "labels": [{
                "labelName": "Bug",
                "labelColor": "#2196f3",
                "category": "Type"
            }],
            "attachments": [{
                "id": 501,
                "name": "post.png",
                "hash": "post-hash",
                "mimeType": "image/png",
                "size": 67,
                "containerType": "BOARD_POST",
                "containerId": "50",
                "ownerLoginId": "author"
            }],
            "comments": [{
                "author": {
                    "loginId": "commenter",
                    "name": "Commenter User",
                    "email": "commenter@example.com"
                },
                "body": "post comment"
            }]
        }]
    });

    let snapshot = map_project_export_json_to_yobi_data(&payload.to_string()).unwrap();

    assert_eq!(snapshot.format, "yobi-data");
    assert_eq!(snapshot.provenance, "legacy-project-api-export");
    assert_eq!(snapshot.users.len(), 4);
    assert!(snapshot.users.iter().any(|user| {
        user.login_id == "alice"
            && user.display_name == "Alice Owner"
            && user.email_address == "alice@example.com"
    }));
    assert_eq!(snapshot.projects[0].owner_name, "alice");
    assert_eq!(snapshot.projects[0].project_name, "demo");
    assert_eq!(snapshot.projects[0].overview, "Legacy project");
    assert_eq!(snapshot.projects[0].project_scope, "public");
    assert_eq!(snapshot.labels[0].name, "Bug");
    assert_eq!(snapshot.labels[0].category_name, "Type");
    assert_eq!(snapshot.labels[0].color, "#2196f3");
    assert_eq!(snapshot.milestones[0].title, "M1");

    let issue = &snapshot.issues[0];
    assert_eq!(issue.issue_number, "3");
    assert_eq!(issue.title, "Legacy issue");
    assert_eq!(issue.body_markdown, "legacy issue body");
    assert_eq!(issue.state, "closed");
    assert_eq!(issue.assignee_login_id, "assignee");
    assert_eq!(issue.milestone_title, "M1");
    assert_eq!(issue.labels[0].name, "Bug");
    assert_eq!(issue.comments[0].contents_markdown, "issue comment");
    assert_eq!(issue.attachments[0].name, "issue.png");
    assert_eq!(issue.attachments[0].mime_type, "image/png");
    assert_eq!(issue.attachments[0].size, 123);
    assert_eq!(issue.attachments[0].legacy_hash, "issue-hash");
    assert_eq!(issue.comments[0].attachments[0].name, "issue-comment.txt");

    let post = &snapshot.posts[0];
    assert_eq!(post.post_number, "4");
    assert_eq!(post.title, "Legacy post");
    assert_eq!(post.body_markdown, "legacy post body");
    assert_eq!(post.comments[0].contents_markdown, "post comment");
    assert_eq!(post.attachments[0].name, "post.png");
}

#[test]
fn mapper_defers_child_comments_link_rewrite_and_attachment_content_files() {
    let payload = json!({
        "owner": "alice",
        "projectName": "demo",
        "members": [{
            "loginId": "alice",
            "name": "Alice Owner",
            "role": "manager",
            "email": "alice@example.com"
        }],
        "issues": [{
            "number": "9",
            "title": "Linked issue",
            "author": {
                "loginId": "alice",
                "name": "Alice Owner",
                "email": "alice@example.com"
            },
            "body": "see /files/123",
            "comments": [{
                "author": {
                    "loginId": "alice",
                    "name": "Alice Owner",
                    "email": "alice@example.com"
                },
                "body": "parent",
                "childComments": [{
                    "author": {
                        "loginId": "alice",
                        "name": "Alice Owner",
                        "email": "alice@example.com"
                    },
                    "body": "child"
                }]
            }]
        }]
    });

    let snapshot = map_project_export_json_to_yobi_data(&payload.to_string()).unwrap();

    assert_eq!(snapshot.issues[0].body_markdown, "see /files/123");
    assert_eq!(snapshot.issues[0].comments.len(), 1);
    assert_eq!(snapshot.issues[0].comments[0].contents_markdown, "parent");
    assert!(snapshot
        .unsupported_sections
        .contains(&"childComments".to_string()));
    assert!(snapshot
        .unsupported_sections
        .contains(&"markdownFileLinkRewrite".to_string()));
    assert!(snapshot
        .unsupported_sections
        .contains(&"attachmentContentFiles".to_string()));
}
