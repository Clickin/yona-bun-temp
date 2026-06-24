use base64::{engine::general_purpose, Engine as _};
use md5::{Digest, Md5};
use std::collections::BTreeSet;
use std::path::Path;

use super::{date, href, svndiff, xml, xml_escape, SvnProtocolRoute};

pub(crate) fn depth_includes(entry: &yoram_vcs::SvnTreeEntry, depth: &str) -> bool {
    match depth.to_ascii_lowercase().as_str() {
        "empty" => false,
        "files" => !entry.is_dir,
        _ => true,
    }
}

pub(crate) fn entries_recursive(
    route: &SvnProtocolRoute,
    entries: &[yoram_vcs::SvnTreeEntry],
    base_entries: &[yoram_vcs::SvnTreeEntry],
    parent_path: &str,
    revision: i64,
    base_revision: i64,
    revision_log: &yoram_vcs::SvnLogEntry,
    indent_level: usize,
    start_empty: bool,
    repo_path: &Path,
    inline_text_deltas: bool,
) -> String {
    let parent_path = parent_path.trim_matches('/');
    let child_names = entries
        .iter()
        .filter_map(|entry| immediate_child_name(parent_path, &entry.path))
        .chain(
            base_entries
                .iter()
                .filter_map(|entry| immediate_child_name(parent_path, &entry.path)),
        )
        .collect::<BTreeSet<_>>();
    let mut output = String::new();
    for name in child_names {
        let child_path = if parent_path.is_empty() {
            name.clone()
        } else {
            format!("{parent_path}/{name}")
        };
        let child_entry = entries
            .iter()
            .find(|entry| entry.path.trim_matches('/') == child_path);
        let is_dir = child_entry.map(|entry| entry.is_dir).unwrap_or_else(|| {
            entries.iter().any(|entry| {
                entry
                    .path
                    .trim_matches('/')
                    .starts_with(&format!("{child_path}/"))
            })
        });
        let base_child_exists = base_entries
            .iter()
            .any(|entry| entry.path.trim_matches('/') == child_path);
        let target_child_exists = child_entry.is_some()
            || entries.iter().any(|entry| {
                entry
                    .path
                    .trim_matches('/')
                    .starts_with(&format!("{child_path}/"))
            });
        if base_child_exists && !target_child_exists {
            let indent = "  ".repeat(indent_level);
            output.push_str(&format!(
                r#"{indent}<S:delete-entry name="{}" rev="{base_revision}"/>
"#,
                xml_escape(&name)
            ));
            continue;
        }
        if is_dir {
            let indent = "  ".repeat(indent_level);
            let child_indent = "  ".repeat(indent_level + 1);
            let nested = entries_recursive(
                route,
                entries,
                base_entries,
                &child_path,
                revision,
                base_revision,
                revision_log,
                indent_level + 1,
                start_empty,
                repo_path,
                inline_text_deltas,
            );
            let directory_element = if start_empty {
                "add-directory"
            } else {
                "open-directory"
            };
            let revision_attribute = if start_empty {
                String::new()
            } else {
                format!(r#" rev="{base_revision}""#)
            };
            output.push_str(&format!(
                r#"{indent}<S:{directory_element} name="{}"{revision_attribute} bc-url="{}">
{child_indent}<D:checked-in><D:href>{}</D:href></D:checked-in>
{}
{}{indent}</S:{directory_element}>
"#,
                xml_escape(&name),
                xml_escape(&href::baseline_collection(route, revision, &child_path)),
                xml_escape(&href::version(route, revision, &child_path)),
                entry_props(revision_log, indent_level + 1),
                nested
            ));
        } else if let Some(entry) = child_entry {
            let inline_delta = if inline_text_deltas {
                yoram_vcs::svn_cat_file(repo_path, Some(revision), entry.path.trim_matches('/'))
                    .ok()
            } else {
                None
            };
            output.push_str(&file_entry(
                route,
                entry,
                revision,
                base_revision,
                revision_log,
                indent_level,
                start_empty,
                inline_delta.as_deref(),
            ));
        }
    }
    output
}

fn immediate_child_name(parent_path: &str, path: &str) -> Option<String> {
    let path = path.trim_matches('/');
    if path.is_empty() || path == parent_path {
        return None;
    }
    let relative = if parent_path.is_empty() {
        path
    } else {
        path.strip_prefix(&format!("{parent_path}/"))?
    };
    relative.split('/').next().map(str::to_string)
}

pub(crate) fn file_entry(
    route: &SvnProtocolRoute,
    entry: &yoram_vcs::SvnTreeEntry,
    revision: i64,
    base_revision: i64,
    revision_log: &yoram_vcs::SvnLogEntry,
    indent_level: usize,
    start_empty: bool,
    inline_delta: Option<&[u8]>,
) -> String {
    let indent = "  ".repeat(indent_level);
    let child_indent = "  ".repeat(indent_level + 1);
    let name = entry
        .path
        .trim_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(entry.path.as_str());
    let checked_in_revision = if inline_delta.is_some() && !start_empty {
        base_revision
    } else {
        revision
    };
    let version_href = href::version(route, checked_in_revision, entry.path.trim_matches('/'));
    let file_element = if start_empty { "add-file" } else { "open-file" };
    let revision_attribute = if start_empty {
        String::new()
    } else {
        format!(r#" rev="{base_revision}""#)
    };
    let inline_props = if let Some(contents) = inline_delta {
        format!(
            r#"{child_indent}<S:prop><V:md5-checksum xmlns:V="{}">{}</V:md5-checksum></S:prop>
"#,
            "http://subversion.tigris.org/xmlns/dav/",
            md5_hex(contents)
        )
    } else {
        String::new()
    };
    let file_text = if let Some(contents) = inline_delta {
        format!(
            r#"{child_indent}<S:txdelta>{}</S:txdelta>
"#,
            general_purpose::STANDARD.encode(svndiff::svndiff0_fulltext(contents))
        )
    } else {
        format!("{child_indent}<S:fetch-file/>\n")
    };
    format!(
        r#"{indent}<S:{file_element} name="{}"{revision_attribute}>
{child_indent}<D:checked-in><D:href>{}</D:href></D:checked-in>
{}
{inline_props}
{child_indent}<S:baseline-relative-path>{}</S:baseline-relative-path>
{file_text}
{indent}</S:{file_element}>
"#,
        xml_escape(name),
        xml_escape(&version_href),
        entry_props(revision_log, indent_level + 1),
        xml_escape(entry.path.trim_matches('/'))
    )
}

fn md5_hex(contents: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(contents);
    format!("{:x}", hasher.finalize())
}

pub(crate) fn inline_text_deltas(request: &str) -> bool {
    request.contains("<S:dst-path>")
        && !xml::text(request, "text-deltas")
            .as_deref()
            .is_some_and(|value| value.eq_ignore_ascii_case("no"))
}

pub(crate) fn entry_props(
    revision_log: &yoram_vcs::SvnLogEntry,
    indent_level: usize,
) -> String {
    let indent = "  ".repeat(indent_level);
    let mut props = format!(
        r#"{indent}<S:set-prop name="svn:entry:committed-rev">{}</S:set-prop>
"#,
        revision_log.revision
    );
    if !revision_log.date.is_empty() {
        props.push_str(&format!(
            r#"{indent}<S:set-prop name="svn:entry:committed-date">{}</S:set-prop>
"#,
            xml_escape(&date::committed_date(&revision_log.date))
        ));
    }
    if !revision_log.author.is_empty() {
        props.push_str(&format!(
            r#"{indent}<S:set-prop name="svn:entry:last-author">{}</S:set-prop>
"#,
            xml_escape(&revision_log.author)
        ));
    }
    props
}

pub(crate) fn depth(request: &str) -> String {
    if let Some(depth) = xml::text(request, "depth") {
        return depth;
    }
    if xml::text(request, "recursive")
        .as_deref()
        .is_some_and(|value| value.eq_ignore_ascii_case("no"))
    {
        return "files".to_string();
    }
    "infinity".to_string()
}

pub(crate) fn start_empty(request: &str) -> bool {
    if !request.contains("<S:entry") {
        return true;
    }
    request.contains("start-empty=\"true\"") || request.contains("start-empty='true'")
}

pub(crate) fn entry_revision(request: &str) -> Option<i64> {
    let entry_start = request.find("<S:entry")?;
    let entry_end = request[entry_start..].find('>')? + entry_start;
    let entry = &request[entry_start..entry_end];
    ["rev=\"", "rev='"].iter().find_map(|marker| {
        let value = entry.split_once(marker)?.1;
        let quote = if *marker == "rev=\"" { '"' } else { '\'' };
        value.split_once(quote)?.0.parse::<i64>().ok()
    })
}
