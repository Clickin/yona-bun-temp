mod anonymous_access;
mod app_config;
mod assets;
mod excel_export;
mod ldap;
mod mailbox;
mod markdown;
mod notification_mail;
pub mod persistence;
mod password;
mod router;
mod routes;
mod service;
mod state;
pub(crate) use password::{hash_password_with_argon2id, verify_password, PasswordVerification};

pub use app_config::{
    repository_config_from_startup, AppRuntimeConfig, AuthUiConfig, LdapFixtureUser,
    LdapRuntimeConfig, OAuthProviderRuntimeConfig, OAuthRuntimeConfig, RuntimeConfig,
    SiteUpdateConfig, SmtpRuntimeConfig, TranslationProxyConfig,
};
pub(crate) use markdown::{
    issue_reference_metadata_from_resolved, markdown_issue_references_for_project,
    markdown_commit_references_for_project, markdown_mention_references,
    mention_reference_metadata_from_resolved,
    rest_issue_reference_metadata_from_resolved, rest_mention_reference_metadata_from_resolved,
    rewrite_code_browser_markdown_image_links, rewrite_project_readme_markdown_links,
    MarkdownCommitReference, MarkdownIssueReference, MarkdownMentionReference,
    RestIssueReferenceMetadata,
    RestMentionReferenceMetadata,
};
pub use notification_mail::{
    deliver_due_notification_mails, deliver_due_notification_mails_with_config,
    deliver_notification_mail_scheduler_tick, deliver_notification_mail_scheduler_tick_with_config,
    notification_mail_add_noreferrer_to_external_links,
    notification_mail_apply_legacy_html_postprocessing,
    notification_mail_scheduler_config_from_startup, spawn_notification_mail_scheduler,
    NotificationMailDeliveryConfig, NotificationMailSchedulerConfig,
};
pub(crate) use routes::{
    absolute_app_url, accepts_legacy_json, anonymous_current_session_response,
    append_response_headers, attach_session_headers, auth_sign_in_with_password,
    auth_social_providers_from_option, auth_ui_capabilities_from_config, base_path_href,
    build_organization_admin_response, build_organization_container_response,
    build_project_container_response, code_branch_error, code_browser_error,
    code_file_record_is_renderable_markdown, code_path_is_markdown,
    confirmation_session_required_from_config, current_session_response_from_user,
    decode_query_component, default_project_menu_keys, default_public_origin,
    default_supported_languages, delete_project_repository_storage,
    deserialize_i64_vec_from_strings_or_numbers, deserialize_optional_i64_from_string_or_number,
    detect_upload_mime_type, direct_project_update_allowed, direct_status_from_connect_error,
    direct_toggle_workspace_notification, dispatch_issue_webhooks,
    dispatch_posting_comment_webhooks, dispatch_posting_webhooks, dispatch_pull_request_webhooks,
    escape_html_attr, escape_html_text, filter_workspace_issue_items_by_read_acl_for_viewer,
    filter_workspace_member_projects_by_read_acl_for_viewer,
    filter_workspace_pull_request_items_by_read_acl_for_viewer, form_bool, form_value,
    format_project_date_label, gravatar_url, headers_with_form_csrf, internal_error,
    issue_attachment_from_record, issue_comment_participation_mutation, issue_favorite_toggle,
    issue_label_category_from_record, issue_label_css, issue_label_from_record,
    issue_milestone_from_record, issue_milestone_from_record_with_issue_references,
    issue_participation_mutation, legacy_content_disposition_filename,
    legacy_content_update_body_from_value, legacy_external_api_auth_error_response,
    legacy_external_api_hello, legacy_external_assignable_users_result,
    legacy_external_attachment_result, legacy_external_authenticated_user_id,
    legacy_external_date_string, legacy_external_label_id, legacy_external_parse_datetime,
    legacy_external_post_author, legacy_external_temporary_upload_file_ids, legacy_json_find_value,
    map_project_scope, max_uploaded_file_size_from_option, normalize_identifier,
    normalize_issue_label_color, normalize_milestone_state, optional_i64_string,
    organization_detail_with_logo_from_record, organization_logo_url, parse_attachment_ids,
    parse_milestone_due_date, parse_rest_query_i64, parse_rest_query_u32,
    percent_encode_uri_component, persist_preferred_language_from_headers,
    project_code_menu_visible, project_default_menus_from_option,
    project_default_scope_from_option, project_detail_from_record,
    project_detail_with_logo_from_record, project_label_categories_list,
    project_label_category_create, project_label_category_delete, project_label_category_update,
    project_label_create, project_label_delete, project_label_update, project_labels_list,
    project_logo_url, project_milestone_create, project_milestone_delete, project_milestone_list,
    project_milestone_read, project_milestone_state_mutation, project_milestone_update,
    project_read_allowed, project_resource_create_allowed, project_update_allowed,
    project_webhook_type_label, random_site_admin_password, random_storage_token,
    read_issue_access, read_posting_access, recent_project_visit_record,
    record_project_webhook_delivery, redirect_to, require_authenticated_user,
    require_project_authorization, require_project_read, require_project_resource_create,
    require_session, require_valid_csrf, resolve_current_session_response,
    resolve_issue_reference_search_project, rest_actor_id, rest_board_label_from_record,
    rest_commit_thread_from_record, rest_json_response, rest_list_user_issues, rest_owned_view,
    rest_project_issue_filter_from_query, rest_project_menu_settings, rest_read_current_session,
    rest_read_direct_issue_form_options, rest_repository, rest_require_project_code_read,
    rest_review_thread_filter, rest_update_commit_discussion_thread_state,
    send_password_reset_mail, send_project_transfer_request_mail,
    send_workspace_email_validation_mail, site_export_filename_stamp, site_name_from_option,
    supported_languages_from_option, trimmed_option, user_issue_filter_name, user_issue_state,
    visible_code_projects_for_organization, visible_projects_for_organization,
    visible_user_issue_items, workspace_avatar_url, workspace_invalid_argument,
    workspace_profile_from_record, ProjectCreatableResource, RestBoardLabel,
    RestIssueAssignableUsersQuery, RestProjectDeleteResponse, RestProjectIssuesQuery,
    RestReviewThread, RestReviewThreadListQuery, RestRouteError, LEGACY_DEFAULT_MAX_FILE_SIZE,
};
#[cfg(debug_assertions)]
pub(crate) use routes::{
    auth_register_with_password, auth_session_read, auth_sign_out, auth_verify_user,
    issue_detail_read, issue_state_update, organization_admin_read, organization_container_read,
    organization_create, organization_delete, organization_detail_read, organization_enroll,
    organization_enroll_cancel, organization_enrollment_accept, organization_issues_list,
    organization_leave, organization_list, organization_member_add, organization_member_delete,
    organization_member_role_update, organization_settings_read, organization_update,
    project_container_read, project_create, project_detail_read, project_enroll,
    project_enroll_cancel, project_favorite_toggle, project_issues_list, project_list,
    project_overview_update, project_settings_read, project_watch_toggle,
    workspace_api_token_reset, workspace_default_landing_path_set, workspace_email_add,
    workspace_email_delete, workspace_email_validation_send, workspace_main_email_set,
    workspace_notification_toggle, workspace_overview_read, workspace_password_change,
    workspace_profile_update, workspace_visited_projects_reset,
};
pub(crate) use state::{
    repository_provisioning_lock, site_import_staging_lock, AssetMode, BrowserRuntimeConfig,
    ConnectError, Context, ErrorCode, PilotBackend, PilotServiceImpl, RuntimeRegistry,
    LEGACY_LOGIN_INVALID_MESSAGE, LEGACY_LOGIN_REQUIRED_MESSAGE, LEGACY_MIN_PASSWORD_LENGTH,
    SITE_UPDATE_NOTIFICATION_WATCHED,
};
pub mod runtime_config;
mod server_config;
pub mod session;
mod smart_http;
mod svn_protocol;

pub async fn reconcile_site_import_staging_uploads_for_startup(
    data_root: &std::path::Path,
    repository: &persistence::PilotRepository,
) -> Result<(), String> {
    routes::reconcile_site_import_staging_uploads_for_startup(data_root, repository)
        .await
        .map_err(|error| error.to_string())
}

pub use mailbox::{
    mailbox_polling_config_from_startup, poll_mailbox_scheduler_tick,
    process_mailbox_parsed_message, process_mailbox_raw_message, spawn_mailbox_polling_scheduler,
    MailboxPollingConfig,
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
pub(crate) use smart_http::{
    smart_http_authorization, smart_http_basic_challenge_response,
    smart_http_principal_from_headers, SmartHttpAccessFailure, SmartHttpPermission,
};

mod api_types;
pub use api_types::*;
