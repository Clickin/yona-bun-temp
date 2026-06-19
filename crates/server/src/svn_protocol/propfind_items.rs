use super::{href, lock as lock_helpers, propfind, xml_escape, SvnProtocolRoute};

pub(crate) struct RevisionProvenance {
    pub(crate) creationdate: String,
    pub(crate) creator_displayname: String,
    pub(crate) getlastmodified: String,
}

pub(crate) fn collection(
    route: &SvnProtocolRoute,
    href: &str,
    path: &str,
    version_revision: Option<i64>,
    repository_uuid: Option<&str>,
    provenance: Option<&RevisionProvenance>,
    request: &str,
) -> String {
    if propfind::is_propname(request) {
        let displayname = "        <D:displayname/>\n";
        let supportedlock = "        <D:supportedlock/>\n";
        let version_name = version_revision
            .is_some()
            .then_some("        <D:version-name/>\n")
            .unwrap_or_default();
        let checked_in = version_revision
            .is_some()
            .then_some("        <D:checked-in/>\n")
            .unwrap_or_default();
        let baseline_collection = version_revision
            .is_some()
            .then_some("        <D:baseline-collection/>\n")
            .unwrap_or_default();
        let repository_uuid = repository_uuid
            .is_some()
            .then_some("        <S:repository-uuid/>\n")
            .unwrap_or_default();
        let baseline_relative_path = (!path.trim_matches('/').is_empty())
            .then_some("        <S:baseline-relative-path/>\n")
            .unwrap_or_default();
        let creationdate = provenance
            .is_some()
            .then_some("        <D:creationdate/>\n")
            .unwrap_or_default();
        let creator_displayname = provenance
            .is_some()
            .then_some("        <D:creator-displayname/>\n")
            .unwrap_or_default();
        let getlastmodified = provenance
            .is_some()
            .then_some("        <D:getlastmodified/>\n")
            .unwrap_or_default();
        let supported_report_set = "        <D:supported-report-set/>\n";
        return format!(
            r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
{displayname}{supportedlock}{version_name}{checked_in}{baseline_collection}{repository_uuid}        <D:version-controlled-configuration/>
{baseline_relative_path}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
            xml_escape(href)
        );
    }
    let checked_in = version_revision
        .filter(|_| {
            propfind::wants(request, "checked-in")
                || propfind::wants(request, "version-controlled-configuration")
        })
        .map(|revision| {
            format!(
                "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
                xml_escape(&href::version(route, revision, path))
            )
        })
        .unwrap_or_default();
    let baseline_collection = version_revision
        .filter(|_| {
            propfind::wants(request, "baseline-collection")
                || propfind::wants(request, "version-controlled-configuration")
        })
        .map(|revision| {
            format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&href::baseline_collection(route, revision, ""))
            )
        })
        .unwrap_or_default();
    let version_name = version_revision
        .filter(|_| {
            propfind::wants(request, "version-name")
                || propfind::wants(request, "version-controlled-configuration")
        })
        .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let vcc_href = format!("{}/!svn/vcc/default", href::project(route));
    let repository_uuid = repository_uuid
        .filter(|_| propfind::wants(request, "repository-uuid"))
        .map(|uuid| {
            format!(
                "        <S:repository-uuid>{}</S:repository-uuid>\n",
                xml_escape(uuid)
            )
        })
        .unwrap_or_default();
    let baseline_relative_path = path.trim_matches('/');
    let baseline_relative_path = if baseline_relative_path.is_empty() {
        String::new()
    } else {
        format!(
            "        <S:baseline-relative-path>{}</S:baseline-relative-path>\n",
            xml_escape(baseline_relative_path)
        )
    };
    let baseline_relative_path = if propfind::wants(request, "baseline-relative-path") {
        baseline_relative_path
    } else {
        String::new()
    };
    let resourcetype = if propfind::wants(request, "resourcetype") {
        "        <D:resourcetype><D:collection/></D:resourcetype>\n"
    } else {
        ""
    };
    let displayname = propfind::displayname_item(href, request);
    let supportedlock = propfind::supportedlock_item(request);
    let supported_report_set = propfind::supported_report_set_item(request);
    let version_controlled_configuration = if propfind::wants(
        request,
        "version-controlled-configuration",
    ) {
        format!(
                "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
                xml_escape(&vcc_href)
            )
    } else {
        String::new()
    };
    let creationdate = propfind::wants(request, "creationdate")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creationdate>{}</D:creationdate>\n",
                xml_escape(&metadata.creationdate)
            )
        })
        .unwrap_or_default();
    let creator_displayname = propfind::wants(request, "creator-displayname")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creator-displayname>{}</D:creator-displayname>\n",
                xml_escape(&metadata.creator_displayname)
            )
        })
        .unwrap_or_default();
    let getlastmodified = propfind::wants(request, "getlastmodified")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:getlastmodified>{}</D:getlastmodified>\n",
                xml_escape(&metadata.getlastmodified)
            )
        })
        .unwrap_or_default();
    format!(
        r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{resourcetype}{displayname}{supportedlock}{version_name}{checked_in}{baseline_collection}{repository_uuid}{version_controlled_configuration}{baseline_relative_path}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
        xml_escape(href)
    )
}

pub(crate) fn file(
    route: &SvnProtocolRoute,
    href: &str,
    content_length: Option<usize>,
    version_revision: Option<i64>,
    version_href: Option<&str>,
    baseline_relative_path: Option<&str>,
    properties: &[yona_rust_vcs::SvnProperty],
    lock: Option<(&SvnProtocolRoute, &yona_rust_vcs::SvnLock)>,
    repository_uuid: Option<&str>,
    provenance: Option<&RevisionProvenance>,
    request: &str,
) -> String {
    if propfind::is_propname(request) {
        let content_length = content_length
            .is_some()
            .then_some("        <D:getcontentlength/>\n")
            .unwrap_or_default();
        let displayname = "        <D:displayname/>\n";
        let supportedlock = "        <D:supportedlock/>\n";
        let content_type = "        <D:getcontenttype/>\n";
        let etag = propfind::file_etag(version_revision, baseline_relative_path)
            .is_some()
            .then_some("        <D:getetag/>\n")
            .unwrap_or_default();
        let version_name = version_revision
            .is_some()
            .then_some("        <D:version-name/>\n")
            .unwrap_or_default();
        let checked_in = version_href
            .is_some()
            .then_some("        <D:checked-in/>\n")
            .unwrap_or_default();
        let baseline_collection = version_revision
            .is_some()
            .then_some("        <D:baseline-collection/>\n")
            .unwrap_or_default();
        let baseline_relative_path = baseline_relative_path
            .is_some()
            .then_some("        <S:baseline-relative-path/>\n")
            .unwrap_or_default();
        let repository_uuid = repository_uuid
            .is_some()
            .then_some("        <S:repository-uuid/>\n")
            .unwrap_or_default();
        let creationdate = provenance
            .is_some()
            .then_some("        <D:creationdate/>\n")
            .unwrap_or_default();
        let creator_displayname = provenance
            .is_some()
            .then_some("        <D:creator-displayname/>\n")
            .unwrap_or_default();
        let getlastmodified = provenance
            .is_some()
            .then_some("        <D:getlastmodified/>\n")
            .unwrap_or_default();
        let supported_report_set = "        <D:supported-report-set/>\n";
        let property_items = propfind::property_name_items(properties);
        return format!(
            r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
{displayname}{supportedlock}{content_length}{content_type}{etag}{version_name}{checked_in}{baseline_collection}{baseline_relative_path}{repository_uuid}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}        <D:version-controlled-configuration/>
{property_items}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
            xml_escape(href)
        );
    }
    let resourcetype = propfind::wants(request, "resourcetype")
        .then_some("        <D:resourcetype/>\n")
        .unwrap_or_default();
    let displayname = propfind::displayname_item(href, request);
    let supportedlock = propfind::supportedlock_item(request);
    let content_length = propfind::wants(request, "getcontentlength")
        .then_some(content_length)
        .flatten()
        .map(|length| format!("        <D:getcontentlength>{length}</D:getcontentlength>\n"))
        .unwrap_or_default();
    let content_type = propfind::wants(request, "getcontenttype")
        .then_some("        <D:getcontenttype>application/octet-stream</D:getcontenttype>\n")
        .unwrap_or_default();
    let etag = propfind::wants(request, "getetag")
        .then(|| propfind::file_etag(version_revision, baseline_relative_path))
        .flatten()
        .map(|etag| format!("        <D:getetag>{}</D:getetag>\n", xml_escape(&etag)))
        .unwrap_or_default();
    let wants_vcc = propfind::wants(request, "version-controlled-configuration");
    let version_name = (propfind::wants(request, "version-name") || wants_vcc)
        .then_some(version_revision)
        .flatten()
        .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let checked_in = (propfind::wants(request, "checked-in") || wants_vcc)
        .then_some(version_href)
        .flatten()
        .map(|href| {
            format!(
                "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
                xml_escape(href)
            )
        })
        .unwrap_or_default();
    let baseline_collection = (propfind::wants(request, "baseline-collection") || wants_vcc)
        .then_some(version_revision)
        .flatten()
        .map(|revision| {
            format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&href::baseline_collection(route, revision, ""))
            )
        })
        .unwrap_or_default();
    let baseline_relative_path = propfind::wants(request, "baseline-relative-path")
        .then_some(baseline_relative_path)
        .flatten()
        .map(|path| {
            format!(
                "        <S:baseline-relative-path>{}</S:baseline-relative-path>\n",
                xml_escape(path.trim_matches('/'))
            )
        })
        .unwrap_or_default();
    let vcc_href = format!("{}/!svn/vcc/default", href::project(route));
    let repository_uuid = propfind::wants(request, "repository-uuid")
        .then_some(repository_uuid)
        .flatten()
        .map(|uuid| {
            format!(
                "        <S:repository-uuid>{}</S:repository-uuid>\n",
                xml_escape(uuid)
            )
        })
        .unwrap_or_default();
    let creationdate = propfind::wants(request, "creationdate")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creationdate>{}</D:creationdate>\n",
                xml_escape(&metadata.creationdate)
            )
        })
        .unwrap_or_default();
    let creator_displayname = propfind::wants(request, "creator-displayname")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creator-displayname>{}</D:creator-displayname>\n",
                xml_escape(&metadata.creator_displayname)
            )
        })
        .unwrap_or_default();
    let getlastmodified = propfind::wants(request, "getlastmodified")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:getlastmodified>{}</D:getlastmodified>\n",
                xml_escape(&metadata.getlastmodified)
            )
        })
        .unwrap_or_default();
    let version_controlled_configuration = if wants_vcc {
        format!(
            "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
            xml_escape(&vcc_href)
        )
    } else {
        String::new()
    };
    let property_items = propfind::property_items_for_request(properties, request);
    let supported_report_set = propfind::supported_report_set_item(request);
    let deadprop_count = if property_items.is_empty() {
        String::new()
    } else {
        "        <SD:deadprop-count>1</SD:deadprop-count>\n".to_string()
    };
    let lock_discovery = lock
        .map(|(route, lock)| lock_helpers::discovery_item(&href::project(route), lock))
        .unwrap_or_default();
    format!(
        r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{resourcetype}{displayname}{supportedlock}{content_length}{content_type}{etag}{version_name}{checked_in}{baseline_collection}{baseline_relative_path}{repository_uuid}{creationdate}{creator_displayname}{getlastmodified}{version_controlled_configuration}{supported_report_set}
{deadprop_count}{property_items}{lock_discovery}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
        xml_escape(href)
    )
}
