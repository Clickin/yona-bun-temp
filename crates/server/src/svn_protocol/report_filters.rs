use std::path::Path;

use super::xml_escape;
use yona_rust_vcs::VcsError;

pub(crate) struct LocationSegment {
    pub(crate) path: String,
    pub(crate) range_start: i64,
    pub(crate) range_end: i64,
}

pub(crate) fn location_segments(
    repo_path: &Path,
    path: &str,
    start_revision: i64,
    end_revision: i64,
) -> Result<Vec<LocationSegment>, VcsError> {
    if start_revision < 0 || end_revision < 0 {
        return Err(VcsError::InvalidPath);
    }
    let mut segments = Vec::new();
    let mut current_path = path.trim_matches('/').to_string();
    let mut current_range_end = start_revision;
    let mut revision = start_revision;
    while revision >= end_revision && revision > 0 {
        let copy = yona_rust_vcs::svn_changed_paths(repo_path, revision)?
            .into_iter()
            .find(|changed_path| {
                changed_path.path.trim_matches('/') == current_path.trim_matches('/')
                    && changed_path.copy_from_path.is_some()
                    && changed_path.copy_from_revision.is_some()
            });
        if let Some(copy) = copy {
            segments.push(LocationSegment {
                path: current_path.clone(),
                range_start: revision,
                range_end: current_range_end,
            });
            current_path = copy.copy_from_path.unwrap_or_default();
            current_range_end = copy
                .copy_from_revision
                .unwrap_or(revision.saturating_sub(1));
            revision = current_range_end;
            continue;
        }
        revision -= 1;
    }
    let range_start = end_revision.max(1);
    if current_range_end >= range_start {
        segments.push(LocationSegment {
            path: current_path,
            range_start,
            range_end: current_range_end,
        });
    }
    Ok(segments)
}

pub(crate) fn replay_included(path: &str, filter_path: Option<&str>) -> bool {
    let Some(filter_path) = filter_path else {
        return true;
    };
    let path = path.trim_matches('/');
    let filter_path = filter_path.trim_matches('/');
    path == filter_path || path.starts_with(&format!("{filter_path}/"))
}

pub(crate) fn log_path_included(changed_path: &str, filter_path: &str) -> bool {
    let changed_path = changed_path.trim_matches('/');
    let filter_path = filter_path.trim_matches('/');
    changed_path == filter_path
        || changed_path.starts_with(&format!("{filter_path}/"))
        || filter_path.starts_with(&format!("{changed_path}/"))
}

pub(crate) fn replay_operation(
    path: &yona_rust_vcs::SvnChangedPath,
    low_water_mark: i64,
) -> String {
    let name = xml_escape(path.path.trim_matches('/'));
    match (&path.action, path.is_dir) {
        (yona_rust_vcs::SvnChangedAction::Added, true)
        | (yona_rust_vcs::SvnChangedAction::Replaced, true) => format!(
            r#"    <S:add-directory name="{name}">
    </S:add-directory>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Added, false)
        | (yona_rust_vcs::SvnChangedAction::Replaced, false) => format!(
            r#"    <S:add-file name="{name}">
      <S:close-file/>
    </S:add-file>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Deleted, _) => {
            format!(r#"    <S:delete-entry name="{name}" rev="{low_water_mark}"/>"#) + "\n"
        }
        (yona_rust_vcs::SvnChangedAction::Modified, true) => format!(
            r#"    <S:open-directory name="{name}" rev="{low_water_mark}">
    </S:open-directory>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Modified, false) => format!(
            r#"    <S:open-file name="{name}" rev="{low_water_mark}">
      <S:close-file/>
    </S:open-file>
"#
        ),
    }
}
