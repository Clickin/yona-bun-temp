use base64::{engine::general_purpose, Engine as _};
use std::path::Path as StdPath;

pub(crate) fn lock(lock: &yoram_vcs::SvnLock) -> String {
    let comment = if lock.comment.is_empty() {
        String::new()
    } else {
        format!(
            "    <S:comment>{}</S:comment>\n",
            super::xml_escape(&lock.comment)
        )
    };
    let expiration = lock
        .expires
        .as_ref()
        .map(|value| {
            format!(
                "    <S:expirationdate>{}</S:expirationdate>\n",
                super::xml_escape(value)
            )
        })
        .unwrap_or_default();
    format!(
        r#"  <S:lock>
    <S:path>{}</S:path>
    <S:token>{}</S:token>
    <S:owner>{}</S:owner>
{comment}    <S:creationdate>{}</S:creationdate>
{expiration}  </S:lock>
"#,
        super::xml_escape(&lock.path),
        super::xml_escape(&lock.token),
        super::xml_escape(&lock.owner),
        super::xml_escape(&lock.created)
    )
}

pub(crate) fn log(
    entry: &yoram_vcs::SvnLogEntry,
    changed_paths: &[yoram_vcs::SvnChangedPath],
) -> String {
    let changed_paths = changed_paths
        .iter()
        .map(log_changed_path)
        .collect::<String>();
    format!(
        r#"  <S:log-item>
    <D:version-name>{}</D:version-name>
    <S:creator-displayname>{}</S:creator-displayname>
    <S:date>{}</S:date>
{changed_paths}    <D:comment>{}</D:comment>
  </S:log-item>
"#,
        entry.revision,
        super::xml_escape(&entry.author),
        super::xml_escape(&super::date::committed_date(&entry.date)),
        super::xml_escape(&entry.message)
    )
}

pub(crate) fn file_rev(path: &str, entry: &yoram_vcs::SvnLogEntry, contents: &[u8]) -> String {
    let txdelta = general_purpose::STANDARD.encode(super::svndiff::svndiff0_fulltext(contents));
    format!(
        r#"  <S:file-rev path="/{}" rev="{}">
    <S:rev-prop name="svn:author">{}</S:rev-prop>
    <S:rev-prop name="svn:date">{}</S:rev-prop>
    <S:rev-prop name="svn:log">{}</S:rev-prop>
    <S:txdelta>{}</S:txdelta>
  </S:file-rev>
"#,
        super::xml_escape(path.trim_matches('/')),
        entry.revision,
        super::xml_escape(&entry.author),
        super::xml_escape(&super::date::committed_date(&entry.date)),
        super::xml_escape(&entry.message),
        txdelta
    )
}

pub(crate) fn mergeinfo(path: &str, mergeinfo: &str) -> String {
    let response_path = if path.trim_matches('/').is_empty() {
        String::new()
    } else {
        format!("/{}", super::xml_escape(path.trim_matches('/')))
    };
    format!(
        r#"  <S:mergeinfo-item>
    <S:mergeinfo-path>{}</S:mergeinfo-path>
    <S:mergeinfo-info>{}</S:mergeinfo-info>
  </S:mergeinfo-item>
"#,
        response_path,
        super::xml_escape(mergeinfo)
    )
}

pub(crate) fn list(
    repo_path: &StdPath,
    revision: i64,
    entry: &yoram_vcs::SvnTreeEntry,
    author: &str,
    date: &str,
) -> String {
    let node_kind = if entry.is_dir { "dir" } else { "file" };
    let size = if entry.is_dir {
        String::new()
    } else {
        match yoram_vcs::svn_cat_file(repo_path, Some(revision), &entry.path) {
            Ok(bytes) => format!(r#" size="{}""#, bytes.len()),
            Err(_) => String::new(),
        }
    };
    let date_attr = if date.trim().is_empty() {
        String::new()
    } else {
        format!(r#" date="{}""#, super::xml_escape(date))
    };
    let author_element = if author.trim().is_empty() {
        String::new()
    } else {
        format!(
            "    <D:creator-displayname>{}</D:creator-displayname>\n",
            super::xml_escape(author)
        )
    };
    format!(
        r#"  <S:item node-kind="{node_kind}"{size} created-rev="{revision}"{date_attr}>
{author_element}    {}
  </S:item>
"#,
        super::xml_escape(entry.path.trim_matches('/'))
    )
}

pub(crate) fn inherited_props(item: &yoram_vcs::SvnInheritedPropertySet) -> String {
    item.properties
        .iter()
        .map(|property| {
            format!(
                "  <S:iprop-item>\n    <S:iprop-path>{}</S:iprop-path>\n    <S:iprop-propname>{}</S:iprop-propname>\n    <S:iprop-propval>{}</S:iprop-propval>\n  </S:iprop-item>\n",
                super::xml_escape(&item.path),
                super::xml_escape(&property.name),
                super::xml_escape(&property.value)
            )
        })
        .collect()
}

pub(crate) fn proppatch_multistatus(
    href: &str,
    patches: &[yoram_vcs::SvnPropertyPatch],
) -> String {
    let mut properties = String::new();
    for patch in patches {
        properties.push_str(&format!(
            "        <D:{}/>\n",
            super::xml_escape(&patch.name)
        ));
    }
    format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{properties}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#,
        super::xml_escape(href)
    )
}

fn log_changed_path(changed_path: &yoram_vcs::SvnChangedPath) -> String {
    let tag_name = match changed_path.action {
        yoram_vcs::SvnChangedAction::Added => "added-path",
        yoram_vcs::SvnChangedAction::Modified => "modified-path",
        yoram_vcs::SvnChangedAction::Deleted => "deleted-path",
        yoram_vcs::SvnChangedAction::Replaced => "replaced-path",
    };
    let node_kind = if changed_path.is_dir { "dir" } else { "file" };
    let copyfrom = match (
        changed_path.copy_from_path.as_deref(),
        changed_path.copy_from_revision,
    ) {
        (Some(path), Some(revision)) => format!(
            r#" copyfrom-path="/{}" copyfrom-rev="{revision}""#,
            super::xml_escape(path.trim_matches('/'))
        ),
        _ => String::new(),
    };
    format!(
        r#"    <S:{tag_name} node-kind="{node_kind}"{copyfrom}>/{}</S:{tag_name}>
"#,
        super::xml_escape(changed_path.path.trim_matches('/'))
    )
}
