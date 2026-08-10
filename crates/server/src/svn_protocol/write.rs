use axum::body::Bytes;
use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::{Path, PathBuf};

use super::svndiff;
use yoram_vcs::VcsError;

/// Staging area for client-supplied commit messages, keyed by activity id.
/// Lives next to the repository so no shared server state is needed.
fn activity_log_path(repo_path: &Path, activity_id: &str) -> PathBuf {
    repo_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(".svn-activities")
        .join(format!("{activity_id}.log"))
}

pub(crate) fn store_activity_log(repo_path: &Path, activity_id: &str, message: &str) {
    let path = activity_log_path(repo_path, activity_id);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&path, message);
}

pub(crate) fn activity_log(repo_path: &Path, activity_id: &str) -> Option<String> {
    std::fs::read_to_string(activity_log_path(repo_path, activity_id))
        .ok()
        .map(|message| message.trim().to_string())
        .filter(|message| !message.is_empty())
}

pub(crate) fn clear_activity_log(repo_path: &Path, activity_id: &str) {
    let _ = std::fs::remove_file(activity_log_path(repo_path, activity_id));
}

pub(crate) fn revision_response(status: StatusCode, revision: i64) -> Response {
    let mut response = status.into_response();
    add_dav_headers(&mut response);
    insert_revision_header(&mut response, revision);
    response
}

pub(crate) fn insert_revision_header(response: &mut Response, revision: i64) {
    if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
        response.headers_mut().insert("svn-revision", value);
    }
}

pub(crate) fn put_contents(repo_path: &Path, path: &str, body: &Bytes) -> Result<Bytes, VcsError> {
    if !body.starts_with(b"SVN\0") {
        return Ok(body.clone());
    }
    let source = match yoram_vcs::svn_cat_file(repo_path, None, path) {
        Ok(bytes) => bytes,
        Err(VcsError::NotFound) => Vec::new(),
        Err(error) => return Err(error),
    };
    svndiff::apply_svndiff0(&source, body).map(Bytes::from)
}

fn add_dav_headers(response: &mut Response) {
    response
        .headers_mut()
        .insert("dav", HeaderValue::from_static("1,2"));
    response
        .headers_mut()
        .insert("ms-author-via", HeaderValue::from_static("DAV"));
}
