use super::xml_escape;
use yona_rust_vcs::SvnProperty;

pub(crate) fn supportedlock_item(request: &str) -> String {
    if !wants(request, "supportedlock") {
        return String::new();
    }
    "        <D:supportedlock>\n    <D:lockentry>\n      <D:lockscope><D:exclusive/></D:lockscope>\n      <D:locktype><D:write/></D:locktype>\n    </D:lockentry>\n  </D:supportedlock>\n".to_string()
}

pub(crate) fn supported_report_set_item(request: &str) -> String {
    if !wants(request, "supported-report-set") {
        return String::new();
    }
    let report_names = [
        "log-report",
        "dated-rev-report",
        "update-report",
        "replay-report",
        "file-revs-report",
        "mergeinfo-report",
        "get-deleted-rev-report",
        "list-report",
        "inherited-props-report",
        "get-locks-report",
        "get-location-segments-report",
        "get-locations-report",
    ];
    let reports = report_names
        .iter()
        .map(|name| {
            format!(
                r#"          <D:supported-report><D:report><S:{name}/></D:report></D:supported-report>
"#
            )
        })
        .collect::<String>();
    format!(
        r#"        <D:supported-report-set>
{reports}        </D:supported-report-set>
"#
    )
}

pub(crate) fn activity_collection_set_item(
    activity_collection_href: Option<&str>,
    request: &str,
) -> String {
    if !wants(request, "activity-collection-set") {
        return String::new();
    }
    let Some(href) = activity_collection_href else {
        return String::new();
    };
    format!(
        "        <D:activity-collection-set><D:href>{}</D:href></D:activity-collection-set>\n",
        xml_escape(href)
    )
}

pub(crate) fn displayname_item(href: &str, request: &str) -> String {
    if !wants(request, "displayname") {
        return String::new();
    }
    let displayname = href
        .trim_end_matches('/')
        .rsplit('/')
        .find(|segment| !segment.is_empty())
        .unwrap_or_default();
    if displayname.is_empty() {
        String::new()
    } else {
        format!(
            "        <D:displayname>{}</D:displayname>\n",
            xml_escape(displayname)
        )
    }
}

pub(crate) fn file_etag(
    revision: Option<i64>,
    baseline_relative_path: Option<&str>,
) -> Option<String> {
    let revision = revision?;
    let path = baseline_relative_path?.trim_matches('/');
    (!path.is_empty()).then(|| format!("\"{revision}:{path}\""))
}

fn property_items(properties: &[SvnProperty]) -> String {
    properties
        .iter()
        .filter_map(|property| {
            let (prefix, name) = property_xml_name(&property.name)?;
            Some(format!(
                "        <{prefix}:{name}>{}</{prefix}:{name}>\n",
                xml_escape(&property.value)
            ))
        })
        .collect()
}

pub(crate) fn property_items_for_request(properties: &[SvnProperty], request: &str) -> String {
    if is_propname(request) {
        return property_name_items(properties);
    }
    if wants(request, "allprop") {
        return property_items(properties);
    }
    properties
        .iter()
        .filter(|property| wants(request, property.name.as_str()))
        .filter_map(|property| {
            let (prefix, name) = property_xml_name(&property.name)?;
            Some(format!(
                "        <{prefix}:{name}>{}</{prefix}:{name}>\n",
                xml_escape(&property.value)
            ))
        })
        .collect()
}

pub(crate) fn property_name_items(properties: &[SvnProperty]) -> String {
    properties
        .iter()
        .filter_map(|property| {
            let (prefix, name) = property_xml_name(&property.name)?;
            Some(format!("        <{prefix}:{name}/>\n"))
        })
        .collect()
}

fn property_xml_name(name: &str) -> Option<(&'static str, String)> {
    let clean = name.trim();
    if clean.is_empty() {
        return None;
    }
    if let Some(rest) = clean.strip_prefix("svn:") {
        if xml_local_name(rest) {
            return Some(("SVN", rest.to_string()));
        }
        return None;
    }
    if xml_local_name(clean) {
        return Some(("C", clean.to_string()));
    }
    None
}

fn xml_local_name(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    chars.all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-' | '.'))
}

pub(crate) fn wants(request: &str, property_name: &str) -> bool {
    let request = request.trim();
    request.is_empty()
        || request.contains("<D:allprop")
        || request.contains("<allprop")
        || request.contains(&format!(":{property_name}"))
        || request.contains(&format!("<{property_name}"))
}

pub(crate) fn is_propname(request: &str) -> bool {
    let request = request.trim();
    request.contains("<D:propname") || request.contains("<propname")
}
