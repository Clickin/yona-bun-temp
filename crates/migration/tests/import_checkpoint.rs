use serde_json::json;
use yoram_migration::import_checkpoint::{
    summarize_site_import_report_json, ImportCheckpointSummaryStatus,
};

#[test]
fn dry_run_report_summarizes_validated_resume_keys() {
    let report = json!({
        "dryRun": true,
        "importedUsers": 0,
        "validationErrors": [{
            "field": "contentBase64",
            "index": 0,
            "message": "site.import.attachment.tooLarge",
            "section": "attachments"
        }],
        "unsupportedSections": ["pullRequests"],
        "checkpoint": {
            "version": 1,
            "failure": null,
            "sections": [{
                "section": "users",
                "total": 2,
                "validated": 2,
                "completed": 0,
                "skipped": 1,
                "nextIndex": 0,
                "resourceKeys": ["users:admin", "users:dry-imported"],
                "resourceKeysTruncated": false
            }, {
                "section": "projects",
                "total": 1,
                "validated": 1,
                "completed": 0,
                "skipped": 0,
                "nextIndex": 0,
                "resourceKeys": ["projects:dry-imported/dry-restored"],
                "resourceKeysTruncated": false
            }, {
                "section": "attachments",
                "total": 2,
                "validated": 2,
                "completed": 0,
                "skipped": 1,
                "nextIndex": 0,
                "resourceKeys": ["attachments:701:dry.txt", "attachments:702:too-large.bin"],
                "resourceKeysTruncated": false
            }]
        }
    });

    let summary = summarize_site_import_report_json(&report.to_string()).expect("summary");

    assert_eq!(summary.version, 1);
    assert!(summary.dry_run);
    assert_eq!(
        summary.status,
        ImportCheckpointSummaryStatus::DryRunComplete
    );
    assert!(summary.complete);
    assert!(!summary.failed);
    assert!(!summary.truncated);
    assert_eq!(summary.validation_error_count, 1);
    assert_eq!(summary.unsupported_sections, vec!["pullRequests"]);
    assert_eq!(summary.counters.total, 5);
    assert_eq!(summary.counters.validated, 5);
    assert_eq!(summary.counters.completed, 0);
    assert_eq!(summary.counters.skipped, 2);
    assert_eq!(summary.counters.remaining, 3);
    assert_eq!(
        summary
            .next_resource_keys
            .get("projects")
            .map(String::as_str),
        Some("projects:dry-imported/dry-restored")
    );
    assert_eq!(
        summary.next_retry.as_ref().map(|retry| (
            retry.section.as_str(),
            retry.index,
            retry.resource_key.as_deref()
        )),
        Some(("users", 0, Some("users:admin")))
    );
    assert!(summary
        .resumable_sections
        .iter()
        .any(|section| section.section == "attachments"
            && section.next_resource_key.as_deref() == Some("attachments:701:dry.txt")));
}

#[test]
fn failed_live_report_summarizes_failure_and_retry_anchor() {
    let report = json!({
        "dryRun": false,
        "validationErrors": [],
        "unsupportedSections": [],
        "checkpoint": {
            "version": 1,
            "failure": {
                "section": "issues.comments",
                "index": 0,
                "resourceKey": "issues.comments:rollback-owner/rollback-project#1:forced",
                "message": "forced issue comment import failure"
            },
            "sections": [{
                "section": "users",
                "total": 1,
                "validated": 1,
                "completed": 1,
                "skipped": 0,
                "nextIndex": 1,
                "resourceKeys": ["users:rollback-owner"],
                "resourceKeysTruncated": false
            }, {
                "section": "issues",
                "total": 1,
                "validated": 1,
                "completed": 0,
                "skipped": 0,
                "nextIndex": 0,
                "resourceKeys": ["issues:rollback-owner/rollback-project#1"],
                "resourceKeysTruncated": false
            }, {
                "section": "attachments",
                "total": 300,
                "validated": 300,
                "completed": 256,
                "skipped": 0,
                "nextIndex": 256,
                "resourceKeys": [],
                "resourceKeysTruncated": true
            }]
        }
    });

    let summary = summarize_site_import_report_json(&report.to_string()).expect("summary");

    assert_eq!(summary.status, ImportCheckpointSummaryStatus::Failed);
    assert!(!summary.complete);
    assert!(summary.failed);
    assert!(summary.truncated);
    assert_eq!(
        summary
            .failure
            .as_ref()
            .map(|failure| failure.section.as_str()),
        Some("issues.comments")
    );
    assert_eq!(
        summary.next_retry.as_ref().map(|retry| (
            retry.section.as_str(),
            retry.index,
            retry.resource_key.as_deref()
        )),
        Some((
            "issues.comments",
            0,
            Some("issues.comments:rollback-owner/rollback-project#1:forced")
        ))
    );
    assert_eq!(
        summary.next_resource_keys.get("issues").map(String::as_str),
        Some("issues:rollback-owner/rollback-project#1")
    );
    assert_eq!(
        summary
            .next_resource_keys
            .get("attachments")
            .map(String::as_str),
        Some("attachments:<truncated:256>")
    );
    assert_eq!(summary.counters.total, 302);
    assert_eq!(summary.counters.completed, 257);
    assert_eq!(summary.counters.remaining, 45);
}

#[test]
fn unsupported_checkpoint_version_fails_cleanly() {
    let report = json!({
        "dryRun": true,
        "validationErrors": [],
        "unsupportedSections": [],
        "checkpoint": {
            "version": 2,
            "failure": null,
            "sections": []
        }
    });

    let error = summarize_site_import_report_json(&report.to_string()).expect_err("error");

    assert_eq!(
        error.to_string(),
        "unsupported import checkpoint version: 2"
    );
}

#[test]
fn malformed_checkpoint_counts_fail_cleanly() {
    let report = json!({
        "dryRun": false,
        "validationErrors": [],
        "unsupportedSections": [],
        "checkpoint": {
            "version": 1,
            "failure": null,
            "sections": [{
                "section": "users",
                "total": 1,
                "validated": 2,
                "completed": 0,
                "skipped": 0,
                "nextIndex": 0,
                "resourceKeys": ["users:admin"],
                "resourceKeysTruncated": false
            }]
        }
    });

    let error = summarize_site_import_report_json(&report.to_string()).expect_err("error");

    assert_eq!(
        error.to_string(),
        "malformed import checkpoint: section `users` validated count 2 exceeds total 1"
    );
}

#[test]
fn malformed_checkpoint_duplicate_sections_fail_cleanly() {
    let report = json!({
        "dryRun": false,
        "validationErrors": [],
        "unsupportedSections": [],
        "checkpoint": {
            "version": 1,
            "failure": null,
            "sections": [{
                "section": "users",
                "total": 1,
                "validated": 1,
                "completed": 1,
                "skipped": 0,
                "nextIndex": 1,
                "resourceKeys": ["users:admin"],
                "resourceKeysTruncated": false
            }, {
                "section": "users",
                "total": 1,
                "validated": 1,
                "completed": 0,
                "skipped": 0,
                "nextIndex": 0,
                "resourceKeys": ["users:other"],
                "resourceKeysTruncated": false
            }]
        }
    });

    let error = summarize_site_import_report_json(&report.to_string()).expect_err("error");

    assert_eq!(
        error.to_string(),
        "malformed import checkpoint: duplicate section `users`"
    );
}

#[test]
fn generic_import_failure_sentinel_is_supported() {
    let report = json!({
        "dryRun": false,
        "validationErrors": [],
        "unsupportedSections": [],
        "checkpoint": {
            "version": 1,
            "failure": {
                "section": "import",
                "index": 0,
                "resourceKey": "import:<unknown>",
                "message": "site.import.failed"
            },
            "sections": [{
                "section": "users",
                "total": 0,
                "validated": 0,
                "completed": 0,
                "skipped": 0,
                "nextIndex": 0,
                "resourceKeys": [],
                "resourceKeysTruncated": false
            }]
        }
    });

    let summary = summarize_site_import_report_json(&report.to_string()).expect("summary");

    assert_eq!(summary.status, ImportCheckpointSummaryStatus::Failed);
    assert_eq!(
        summary.next_retry.as_ref().map(|retry| (
            retry.section.as_str(),
            retry.index,
            retry.resource_key.as_deref()
        )),
        Some(("import", 0, Some("import:<unknown>")))
    );
}
