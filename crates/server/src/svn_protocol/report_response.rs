use axum::body::Bytes;
use axum::response::Response;
use std::path::Path as StdPath;

use super::{
    report_file_revs, report_list, report_locations, report_log, report_mergeinfo, report_misc,
    report_replay, report_revisions, report_update, svn_protocol_not_implemented_response,
    SvnProtocolRoute,
};

pub(super) fn report(repo_path: &StdPath, route: &SvnProtocolRoute, body: &Bytes) -> Response {
    let request = String::from_utf8_lossy(body);
    if request.contains("log-report") {
        return report_log::log(repo_path, route, &request);
    }
    if request.contains("dated-rev-report") {
        return report_revisions::dated_rev(repo_path, route, &request);
    }
    if request.contains("update-report") {
        return report_update::update(repo_path, route, &request);
    }
    if request.contains("replay-report")
        || request.contains("<S:replay")
        || request.contains("<s:replay")
    {
        return report_replay::replay(repo_path, route, &request);
    }
    if request.contains("file-revs-report") {
        return report_file_revs::file_revs(repo_path, route, &request);
    }
    if request.contains("mergeinfo-report") {
        return report_mergeinfo::mergeinfo(repo_path, route, &request);
    }
    if request.contains("get-deleted-rev-report") {
        return report_revisions::deleted_rev(repo_path, route, &request);
    }
    if request.contains("list-report") {
        return report_list::list(repo_path, route, &request);
    }
    if request.contains("inherited-props-report") {
        return report_misc::inherited_props(repo_path, route, &request);
    }
    if request.contains("get-locks-report") {
        return report_misc::get_locks(repo_path, route);
    }
    if request.contains("get-location-segments") {
        return report_locations::location_segments(repo_path, route, &request);
    }
    if request.contains("get-locations") {
        return report_locations::locations(repo_path, route, &request);
    }
    svn_protocol_not_implemented_response(route, "REPORT")
}
