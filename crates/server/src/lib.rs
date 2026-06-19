mod anonymous_access;
mod app_config;
mod assets;
mod excel_export;
mod mailbox;
mod markdown;
mod notification_mail;
pub mod persistence;
mod router;
mod routes;
mod service;
mod state;

pub use app_config::{
    AppRuntimeConfig, AuthUiConfig, RuntimeConfig, SiteUpdateConfig, TranslationProxyConfig,
};
pub(crate) use excel_export::{
    direct_issue_excel_export, direct_issue_excel_route_from_request, direct_review_excel_export,
    direct_review_excel_route_from_request,
};
pub(crate) use markdown::{
    issue_reference_metadata_from_resolved, markdown_issue_numbers,
    markdown_issue_references_for_project, markdown_mention_references, markdown_mention_tokens,
    mention_reference_metadata_from_resolved, rest_issue_reference_metadata_from_resolved,
    rest_mention_reference_metadata_from_resolved, rewrite_code_browser_markdown_image_links,
    rewrite_project_readme_markdown_links, MarkdownIssueReference, MarkdownMentionReference,
    RestIssueReferenceMetadata, RestMentionReferenceMetadata,
};
pub use notification_mail::{
    deliver_due_notification_mails, deliver_due_notification_mails_with_config,
    deliver_notification_mail_scheduler_tick, deliver_notification_mail_scheduler_tick_with_config,
    notification_mail_add_noreferrer_to_external_links,
    notification_mail_apply_legacy_html_postprocessing,
    notification_mail_scheduler_config_from_env, notification_mail_scheduler_config_from_startup,
    spawn_notification_mail_scheduler, NotificationMailDeliveryConfig,
    NotificationMailSchedulerConfig,
};
pub(crate) use routes::{
    absolute_app_url, accepts_legacy_json, anonymous_current_session_response,
    append_response_headers, attach_session_headers, auth_register_with_password,
    auth_session_read, auth_sign_in_with_password, auth_sign_out,
    auth_social_providers_from_option, auth_ui_capabilities_from_config, auth_verify_user,
    base_path_href, build_organization_admin_response, build_organization_container_response,
    build_project_container_response, build_workspace_overview_response, code_branch_error,
    code_browser_error, code_file_record_is_renderable_markdown, code_path_is_markdown,
    configured_auth_social_providers, configured_bool_env, configured_env_value,
    configured_max_uploaded_file_size, configured_project_default_menus,
    configured_project_default_scope, configured_site_name, configured_supported_languages,
    configured_trimmed_string, confirmation_session_required,
    confirmation_session_required_from_config, current_session_response_from_user,
    decode_query_component, default_project_menu_keys, default_public_origin, default_smtp_from,
    default_supported_languages, delete_project_repository_storage,
    deserialize_i64_vec_from_strings_or_numbers, deserialize_optional_i64_from_string_or_number,
    detect_upload_mime_type, direct_project_update_allowed, direct_status_from_connect_error,
    direct_toggle_workspace_notification, dispatch_issue_webhooks, dispatch_pull_request_webhooks,
    escape_html_attr, escape_html_text, filter_workspace_issue_items_by_read_acl_for_viewer,
    filter_workspace_member_projects_by_read_acl_for_viewer,
    filter_workspace_pull_request_items_by_read_acl_for_viewer, form_bool, form_value,
    format_project_date_label, gravatar_url, headers_with_form_csrf, internal_error,
    issue_assignment_mutation, issue_attachment_from_record, issue_can_mutate,
    issue_comment_participation_mutation, issue_detail_read, issue_detail_response_from_access,
    issue_detail_response_from_record,
    issue_detail_response_from_record_with_repository_issue_references,
    issue_detail_response_from_record_with_sharer_flags, issue_favorite_toggle,
    issue_label_category_from_record, issue_label_css, issue_label_from_record,
    issue_list_filter_from_request, issue_milestone_from_record,
    issue_milestone_from_record_with_issue_references, issue_participation_mutation,
    issue_state_update, legacy_content_disposition_filename, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_api_hello,
    legacy_external_api_token_from_headers, legacy_external_assignable_users_result,
    legacy_external_attachment_result, legacy_external_authenticated_user_id,
    legacy_external_date_string, legacy_external_label_id, legacy_external_parse_datetime,
    legacy_external_post_author, legacy_external_temporary_upload_file_ids,
    legacy_issue_comment_create_body_from_value, legacy_issue_detect_change_body_from_value,
    legacy_issue_update_body_from_value, legacy_json_find_value, map_project_scope,
    max_uploaded_file_size_from_env_value, max_uploaded_file_size_from_option,
    milestone_list_filter_from_request, milestone_mutation_input, normalize_identifier,
    normalize_issue_label_color, normalize_milestone_state, optional_i64_string,
    organization_admin_member_from_record, organization_admin_read, organization_container_read,
    organization_create, organization_delete, organization_detail_from_record,
    organization_detail_read, organization_detail_with_logo_from_record, organization_enroll,
    organization_enroll_cancel, organization_enrollment_accept,
    organization_enrollment_request_summary_from_record, organization_issue_list_item_to_proto,
    organization_issues_list, organization_leave, organization_list, organization_logo_url,
    organization_member_add, organization_member_delete, organization_member_role_update,
    organization_member_summary_from_record, organization_members_read, organization_role_options,
    organization_settings_read, organization_update, parse_attachment_ids,
    parse_milestone_due_date, parse_rest_query_i64, parse_rest_query_u32,
    percent_encode_uri_component, posting_can_create, posting_can_update,
    project_code_menu_visible, project_container_read, project_create,
    project_default_menus_from_option, project_default_scope_from_option,
    project_detail_from_record, project_detail_read, project_detail_with_logo_from_record,
    project_enroll, project_enroll_cancel, project_favorite_toggle,
    project_issue_list_item_to_proto, project_issues_list, project_label_categories_list,
    project_label_category_create, project_label_category_delete, project_label_category_update,
    project_label_create, project_label_delete, project_label_update, project_labels_list,
    project_list, project_logo_url, project_member_summary_from_record, project_milestone_create,
    project_milestone_delete, project_milestone_list, project_milestone_read,
    project_milestone_state_mutation, project_milestone_summary_from_record,
    project_milestone_update, project_overview_update, project_read_allowed,
    project_resource_create_allowed, project_settings_read, project_update, project_update_allowed,
    project_watch_toggle, project_webhook_type_label, random_site_admin_password,
    random_storage_token, read_issue_access, read_posting_access,
    read_posting_comment_create_access, recent_project_visit_record,
    record_project_webhook_delivery, redirect_to, require_authenticated_user,
    require_project_authorization, require_project_read, require_project_resource_create,
    require_session, require_valid_csrf, resolve_current_session_response,
    resolve_issue_reference_search_project, rest_actor_id, rest_board_label_from_record,
    rest_commit_thread_from_record, rest_delete_project_member,
    rest_issue_detail_response_from_access_with_repository_issue_references, rest_json_response,
    rest_list_user_issues, rest_not_found_response, rest_owned_view,
    rest_project_issue_filter_from_query, rest_project_menu_settings, rest_read_current_session,
    rest_read_direct_issue_form_options, rest_repository, rest_require_project_code_read,
    rest_review_thread_filter, rest_update_commit_discussion_thread_state,
    send_password_reset_mail, send_project_transfer_request_mail,
    send_workspace_email_validation_mail, site_export_filename_stamp, site_name_from_option,
    site_update_https_fetch_command, supported_languages_from_option, trimmed_option,
    uploaded_file_path, user_issue_filter_name, user_issue_state,
    visible_code_projects_for_organization, visible_projects_for_organization,
    visible_user_issue_items, workspace_api_token_reset, workspace_avatar_url,
    workspace_default_landing_path_set, workspace_email_add, workspace_email_delete,
    workspace_email_validation_send, workspace_invalid_argument, workspace_main_email_set,
    workspace_notification_toggle, workspace_overview_read, workspace_password_change,
    workspace_profile_from_record, workspace_profile_update, workspace_visited_projects_reset,
    ProjectCreatableResource, RestBoardLabel, RestIssueAssignableUsersQuery,
    RestProjectDeleteResponse, RestProjectIssuesQuery, RestReviewThread, RestReviewThreadListQuery,
    RestRouteError, LEGACY_DEFAULT_MAX_FILE_SIZE,
};
pub(crate) use state::{
    repository_provisioning_lock, yona_data_root, AssetMode, BrowserRuntimeConfig, ConnectError,
    Context, ErrorCode, PilotBackend, PilotServiceImpl, LEGACY_LOGIN_INVALID_MESSAGE,
    LEGACY_LOGIN_REQUIRED_MESSAGE, LEGACY_MIN_PASSWORD_LENGTH, SITE_UPDATE_NOTIFICATION_WATCHED,
};
pub mod runtime_config;
mod server_config;
pub mod session;
mod smart_http;
mod svn_protocol;

use axum::extract::Path;
use axum::extract::{Multipart, Query, RawQuery};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{delete, get, post, put};
use std::{collections::HashMap, vec};

use assets::serve_frontend_page;
use generated::yona::pilot::v1::*;
pub use mailbox::{
    mailbox_polling_config_from_env, mailbox_polling_config_from_startup,
    poll_mailbox_scheduler_tick, process_mailbox_parsed_message, process_mailbox_raw_message,
    spawn_mailbox_polling_scheduler, MailboxPollingConfig,
};
pub(crate) use persistence::PilotRepository;
pub use router::{
    create_router, create_router_with_app_repository, create_router_with_embedded_assets,
    create_router_with_embedded_assets_and_app_config, create_router_with_filesystem_assets,
    create_router_with_filesystem_assets_and_app_config, create_router_with_repository,
    create_router_with_repository_and_app_config,
    create_router_with_repository_and_embedded_assets,
    create_router_with_repository_and_embedded_assets_and_app_config,
    create_router_with_repository_and_filesystem_assets,
    create_router_with_repository_and_filesystem_assets_and_app_config,
};
#[cfg(test)]
pub(crate) use server_config::split_configured_command;
pub(crate) use server_config::{
    configured_command_parts, parse_legacy_bool, parse_legacy_duration_ms,
};
pub(crate) use smart_http::{
    direct_smart_http_request, route_from_path as smart_http_route_from_path,
    smart_http_authorization, smart_http_basic_challenge_response,
    smart_http_principal_from_headers, SmartHttpAccessFailure, SmartHttpPermission,
};
use yona_rust_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_project_name,
    normalize_default_landing_path, ProjectAccessFacts, ProjectOperation,
};
use yona_rust_vcs::ProjectHistoryCommitRecord;

pub use yona_rust_pilot_protocol as generated;

pub mod embedded_assets {
    include!(concat!(env!("OUT_DIR"), "/_embedded_assets.rs"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_uploaded_file_size_uses_legacy_default_and_env_override() {
        assert_eq!(
            max_uploaded_file_size_from_env_value(None),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
        assert_eq!(
            max_uploaded_file_size_from_env_value(Some("")),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
        assert_eq!(max_uploaded_file_size_from_env_value(Some("4096")), 4096);
        assert_eq!(
            max_uploaded_file_size_from_env_value(Some("not-a-number")),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
    }

    #[test]
    fn configured_commands_preserve_quoted_programs_and_arguments() {
        let (program, args) = configured_command_parts(
            r#""/opt/Yona Tools/fetch mailbox" --mode "unseen only" 'folder name'"#,
            "empty",
        )
        .expect("configured command");
        assert_eq!(program, "/opt/Yona Tools/fetch mailbox");
        assert_eq!(args, vec!["--mode", "unseen only", "folder name"]);

        assert_eq!(
            split_configured_command(r#"runner escaped\ value "two words""#)
                .expect("escaped command"),
            vec!["runner", "escaped value", "two words"]
        );
        assert!(split_configured_command(r#""unterminated"#).is_err());
    }

    #[test]
    fn site_update_https_fetch_command_preserves_quoted_override() {
        let config = SiteUpdateConfig {
            https_fetch_command: r#""/opt/Yona Tools/fetch update" --header "X-Test: yes""#
                .to_string(),
            ..SiteUpdateConfig::default()
        };
        let (program, args) =
            site_update_https_fetch_command("https://downloads.example/yona.zip", &config)
                .expect("fetch command");
        assert_eq!(program, "/opt/Yona Tools/fetch update");
        assert_eq!(
            args,
            vec![
                "--header".to_string(),
                "X-Test: yes".to_string(),
                "https://downloads.example/yona.zip".to_string(),
            ]
        );
    }

    #[test]
    fn markdown_mention_tokens_follow_legacy_boundaries() {
        assert_eq!(
            markdown_mention_tokens("@testOwner @testOwner/testProject @nforge @nforge/yobi"),
            vec![
                "nforge".to_string(),
                "nforge/yobi".to_string(),
                "testOwner".to_string(),
                "testOwner/testProject".to_string(),
            ]
        );
        assert!(
            markdown_mention_tokens("mail@example.com owner/@ignored path/@ignored").is_empty()
        );
    }
}
