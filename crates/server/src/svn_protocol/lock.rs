use http::HeaderMap;
use std::time::SystemTime;

pub(crate) fn new_token() -> String {
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("opaquelocktoken:yona-{}-{nanos}", std::process::id())
}

pub(crate) fn token_header(headers: &HeaderMap) -> Option<String> {
    let value = headers.get("lock-token")?.to_str().ok()?.trim();
    let value = value
        .strip_prefix('<')
        .and_then(|token| token.strip_suffix('>'))
        .unwrap_or(value);
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

pub(crate) fn discovery_body(project_href: &str, lock: &yoram_vcs::SvnLock) -> String {
    let item = discovery_item(project_href, lock);
    format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
{item}</D:prop>"#
    )
}

pub(crate) fn discovery_item(project_href: &str, lock: &yoram_vcs::SvnLock) -> String {
    let href = format!("{project_href}{}", lock.path);
    let created = if lock.created.is_empty() {
        String::new()
    } else {
        format!(
            "\n        <D:creationdate>{}</D:creationdate>",
            super::xml_escape(&lock.created)
        )
    };
    format!(
        r#"        <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>0</D:depth>
      <D:owner>{}</D:owner>
      <D:timeout>Infinite</D:timeout>
      <D:locktoken><D:href>{}</D:href></D:locktoken>
      <D:lockroot><D:href>{}</D:href></D:lockroot>{created}
    </D:activelock>
  </D:lockdiscovery>
"#,
        super::xml_escape(&lock.owner),
        super::xml_escape(&lock.token),
        super::xml_escape(&href)
    )
}
