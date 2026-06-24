use axum::body::Bytes;
use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path;

use super::svndiff;
use yoram_vcs::VcsError;

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
