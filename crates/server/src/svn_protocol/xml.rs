pub(crate) fn i64(xml: &str, tag: &str) -> Option<i64> {
    text(xml, tag)?.parse::<i64>().ok()
}

pub(crate) fn text(xml: &str, tag: &str) -> Option<String> {
    let start = xml
        .find(&format!("<S:{tag}>"))
        .or_else(|| xml.find(&format!("<D:{tag}>")))
        .or_else(|| xml.find(&format!("<{tag}>")))?;
    let value_start = xml[start..].find('>')? + start + 1;
    let end = xml[value_start..].find('<')? + value_start;
    Some(xml[value_start..end].trim().to_string())
}

pub(crate) fn sections<'a>(xml: &'a str, tag: &str) -> Vec<&'a str> {
    let mut sections = Vec::new();
    let mut rest = xml;
    loop {
        let Some(open_start) = find_tag(rest, tag) else {
            break;
        };
        let after_open = &rest[open_start..];
        let Some(open_end) = after_open.find('>') else {
            break;
        };
        let content_start = open_start + open_end + 1;
        let Some(close_start_relative) = find_close_tag(&rest[content_start..], tag) else {
            break;
        };
        let content_end = content_start + close_start_relative;
        sections.push(&rest[content_start..content_end]);
        rest = &rest[content_end..];
    }
    sections
}

pub(crate) fn property_patches(request: &str) -> Option<Vec<yoram_vcs::SvnPropertyPatch>> {
    let mut patches = Vec::new();
    for section in sections(request, "set") {
        patches.extend(property_elements(section, true));
    }
    for section in sections(request, "remove") {
        patches.extend(property_elements(section, false));
    }
    Some(patches)
}

fn find_tag(xml: &str, tag: &str) -> Option<usize> {
    xml.find(&format!("<S:{tag}"))
        .or_else(|| xml.find(&format!("<s:{tag}")))
        .or_else(|| xml.find(&format!("<D:{tag}")))
        .or_else(|| xml.find(&format!("<d:{tag}")))
        .or_else(|| xml.find(&format!("<{tag}")))
}

fn find_close_tag(xml: &str, tag: &str) -> Option<usize> {
    xml.find(&format!("</S:{tag}>"))
        .or_else(|| xml.find(&format!("</s:{tag}>")))
        .or_else(|| xml.find(&format!("</D:{tag}>")))
        .or_else(|| xml.find(&format!("</d:{tag}>")))
        .or_else(|| xml.find(&format!("</{tag}>")))
}

fn property_elements(section: &str, set_value: bool) -> Vec<yoram_vcs::SvnPropertyPatch> {
    let prop_body = sections(section, "prop")
        .into_iter()
        .next()
        .unwrap_or(section);
    let mut patches = Vec::new();
    let mut rest = prop_body;
    while let Some(open_start) = rest.find('<') {
        rest = &rest[open_start + 1..];
        if rest.starts_with('/') || rest.starts_with('!') || rest.starts_with('?') {
            continue;
        }
        let Some(open_end) = rest.find('>') else {
            break;
        };
        let raw_name = rest[..open_end]
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .trim_end_matches('/');
        let Some(name) = property_name(raw_name) else {
            rest = &rest[open_end + 1..];
            continue;
        };
        if set_value {
            let close_tag = format!("</{raw_name}>");
            let value_start = open_end + 1;
            let value = rest[value_start..]
                .find(&close_tag)
                .map(|end| rest[value_start..value_start + end].to_string())
                .unwrap_or_default();
            patches.push(yoram_vcs::SvnPropertyPatch {
                name,
                value: Some(value),
            });
        } else {
            patches.push(yoram_vcs::SvnPropertyPatch { name, value: None });
        }
        rest = &rest[open_end + 1..];
    }
    patches
}

fn property_name(raw_name: &str) -> Option<String> {
    let raw_name = raw_name.trim();
    if raw_name.is_empty() {
        return None;
    }
    let local_name = raw_name
        .strip_prefix("C:")
        .or_else(|| raw_name.strip_prefix("c:"))
        .or_else(|| raw_name.strip_prefix("S:"))
        .or_else(|| raw_name.strip_prefix("s:"))
        .or_else(|| raw_name.strip_prefix("D:"))
        .or_else(|| raw_name.strip_prefix("d:"))
        .unwrap_or(raw_name);
    if local_name.eq_ignore_ascii_case("prop") || local_name.eq_ignore_ascii_case("propertyupdate")
    {
        return None;
    }
    Some(local_name.to_string())
}
