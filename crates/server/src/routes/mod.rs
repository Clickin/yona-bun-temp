use axum::{routing::any, Router};

use crate::session::SessionManager;
use crate::{
    AssetMode, AuthUiConfig, BrowserRuntimeConfig, PilotBackend, PilotServiceImpl,
    SiteUpdateConfig, SmtpRuntimeConfig, TranslationProxyConfig,
};

mod auth;
mod boards;
mod code;
#[cfg(debug_assertions)]
mod debug;
mod files;
mod issues;
mod legacy_runtime;
mod messages;
mod notifications;
mod projects;
mod pull_requests;
mod search;
mod site_admin;
mod users;
mod utils;
mod workspace;

pub(crate) use auth::rest_routes as auth_rest_routes;
pub(crate) use auth::routes as auth_routes;
pub(crate) use auth::{
    auth_register_with_password, auth_session_read, auth_sign_in_with_password, auth_sign_out,
    auth_verify_user,
};
pub(crate) use boards::read_posting_access;
pub(crate) use boards::rest_routes as board_rest_routes;
pub(crate) use boards::routes as board_routes;
pub(crate) use code::rest_routes as code_rest_routes;
pub(crate) use code::rest_update_commit_discussion_thread_state;
pub(crate) use code::routes as code_routes;
#[cfg(debug_assertions)]
pub(crate) use debug::routes as debug_routes;
pub(crate) use files::routes as file_routes;
pub(crate) use files::{
    detect_upload_mime_type, legacy_content_disposition_filename, uploaded_file_path,
};
pub(crate) use issues::rest_routes as issue_rest_routes;
pub(crate) use issues::routes as issue_routes;
pub(crate) use issues::{
    issue_assignment_mutation, issue_attachment_from_record, issue_comment_participation_mutation,
    issue_detail_read, issue_favorite_toggle, issue_milestone_from_record,
    issue_milestone_from_record_with_issue_references, issue_participation_mutation,
    issue_state_update, legacy_external_assignable_users_result, legacy_external_label_id,
    organization_issues_list, project_issues_list, project_label_categories_list,
    project_label_category_create, project_label_category_delete, project_label_category_update,
    project_label_create, project_label_delete, project_label_update, project_labels_list,
    read_issue_access, resolve_issue_reference_search_project, rest_list_user_issues,
    rest_project_issue_filter_from_query, rest_read_direct_issue_form_options,
    visible_user_issue_items, RestDirectIssueFormQuery, RestProjectIssuesQuery,
    RestUserIssuesQuery,
};
pub(crate) use legacy_runtime::routes as legacy_runtime_routes;
pub(crate) use notifications::rest_routes as notification_rest_routes;
pub(crate) use notifications::routes as notification_routes;
pub(crate) use projects::rest_routes as project_rest_routes;
pub(crate) use projects::routes as project_routes;
pub(crate) use projects::{
    delete_project_repository_storage, dispatch_issue_webhooks, dispatch_pull_request_webhooks,
    organization_admin_read, organization_container_read, organization_create, organization_delete,
    organization_detail_read, organization_enroll, organization_enroll_cancel,
    organization_enrollment_accept, organization_leave, organization_list, organization_member_add,
    organization_member_delete, organization_member_role_update, organization_members_read,
    organization_settings_read, organization_update, project_container_read, project_create,
    project_detail_read, project_enroll, project_enroll_cancel, project_favorite_toggle,
    project_list, project_milestone_create, project_milestone_delete, project_milestone_list,
    project_milestone_read, project_milestone_state_mutation, project_milestone_update,
    project_overview_update, project_settings_read, project_update, project_watch_toggle,
    project_webhook_type_label, recent_project_visit_record, record_project_webhook_delivery,
    rest_delete_project_member, rest_project_menu_settings,
};
pub(crate) use pull_requests::rest_routes as pull_request_rest_routes;
pub(crate) use pull_requests::routes as pull_request_routes;
pub(crate) use pull_requests::{
    rest_commit_thread_from_record, rest_review_thread_filter, RestReviewThread,
    RestReviewThreadListQuery,
};
pub(crate) use search::routes as search_routes;
pub(crate) use site_admin::rest_routes as site_admin_rest_routes;
pub(crate) use site_admin::routes as site_admin_routes;
pub(crate) use users::rest_routes as user_rest_routes;
pub(crate) use users::routes as user_routes;
pub(crate) use utils::{
    absolute_app_url, accepts_legacy_json, anonymous_current_session_response,
    append_response_headers, attach_session_headers, auth_social_providers_from_option,
    auth_ui_capabilities_from_config, base_path_href, build_organization_admin_response,
    build_organization_container_response, build_project_container_response, code_branch_error,
    code_browser_error, code_file_record_is_renderable_markdown, code_path_is_markdown,
    configured_auth_social_providers, configured_bool_env, configured_env_value,
    configured_max_uploaded_file_size, configured_project_default_menus,
    configured_project_default_scope, configured_site_name, configured_supported_languages,
    configured_trimmed_string, confirmation_session_required,
    confirmation_session_required_from_config, current_session_response_from_user,
    decode_query_component, default_project_menu_keys, default_public_origin, default_smtp_from,
    default_supported_languages, deserialize_i64_vec_from_strings_or_numbers,
    deserialize_optional_i64_from_string_or_number, direct_project_update_allowed,
    direct_status_from_connect_error, escape_html_attr, escape_html_text, form_bool, form_value,
    format_project_date_label, gravatar_url, headers_with_form_csrf, internal_error,
    issue_label_category_from_record, issue_label_css, issue_label_from_record,
    legacy_content_update_body_from_value, legacy_external_api_auth_error_response,
    legacy_external_api_hello, legacy_external_attachment_result,
    legacy_external_authenticated_user_id, legacy_external_date_string,
    legacy_external_parse_datetime, legacy_external_post_author,
    legacy_external_temporary_upload_file_ids, legacy_json_find_value, map_project_scope,
    max_uploaded_file_size_from_option, normalize_identifier, normalize_issue_label_color,
    normalize_milestone_state, optional_i64_string, organization_detail_with_logo_from_record,
    organization_logo_url, parse_attachment_ids, parse_milestone_due_date, parse_rest_query_i64,
    parse_rest_query_u32, percent_encode_uri_component, project_code_menu_visible,
    project_default_menus_from_option, project_default_scope_from_option,
    project_detail_from_record, project_detail_with_logo_from_record, project_logo_url,
    project_read_allowed, project_resource_create_allowed, project_update_allowed,
    random_site_admin_password, random_storage_token, redirect_to, require_authenticated_user,
    require_project_authorization, require_project_read, require_project_resource_create,
    require_session, require_valid_csrf, resolve_current_session_response, rest_actor_id,
    rest_board_label_from_record, rest_json_response, rest_not_found_response, rest_owned_view,
    rest_read_current_session, rest_repository, rest_require_project_code_read,
    send_password_reset_mail, send_project_transfer_request_mail, send_signup_verification_mail,
    send_workspace_email_validation_mail, site_export_filename_stamp, site_name_from_option,
    supported_languages_from_option, trimmed_option, user_issue_filter_name, user_issue_state,
    visible_code_projects_for_organization, visible_projects_for_organization,
    workspace_invalid_argument, ProjectCreatableResource, RestBoardLabel,
    RestIssueAssignableUsersQuery, RestProjectDeleteResponse, RestRouteError,
    LEGACY_DEFAULT_MAX_FILE_SIZE,
};
pub(crate) use workspace::rest_routes as workspace_rest_routes;
pub(crate) use workspace::routes as workspace_routes;
pub(crate) use workspace::{
    direct_toggle_workspace_notification, filter_workspace_issue_items_by_read_acl_for_viewer,
    filter_workspace_member_projects_by_read_acl_for_viewer,
    filter_workspace_pull_request_items_by_read_acl_for_viewer, workspace_api_token_reset,
    workspace_avatar_url, workspace_default_landing_path_set, workspace_email_add,
    workspace_email_delete, workspace_email_validation_send, workspace_main_email_set,
    workspace_notification_toggle, workspace_overview_read, workspace_password_change,
    workspace_profile_from_record, workspace_profile_update, workspace_visited_projects_reset,
};

pub(crate) fn rest_api_routes(
    service: PilotServiceImpl,
    site_update: SiteUpdateConfig,
    smtp: SmtpRuntimeConfig,
    auth_ui: AuthUiConfig,
) -> Router {
    let session_manager = service.session_manager.clone();
    let backend = service.backend.clone();
    let base_path = service.base_path.clone();
    let pull_request_service = service.clone();

    let router = Router::new()
        .merge(auth_rest_routes(service.clone(), auth_ui.clone()))
        .merge(user_rest_routes(service.clone()))
        .merge(site_admin_rest_routes(
            service.clone(),
            site_update.clone(),
            smtp.clone(),
        ))
        .merge(workspace_rest_routes(service.clone()))
        .merge(notification_rest_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .merge(search_routes(session_manager.clone(), backend.clone()))
        .merge(issue_rest_routes(service.clone()))
        .merge(board_rest_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .merge(code_rest_routes(
            service.clone(),
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .merge(project_rest_routes(service.clone()))
        .merge(pull_request_rest_routes(pull_request_service));

    #[cfg(debug_assertions)]
    {
        router.merge(debug_routes(service, auth_ui))
    }
    #[cfg(not(debug_assertions))]
    {
        router
    }
}

pub(crate) fn app_routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    public_origin: String,
    site_name: String,
    project_default_scope: String,
    translation_proxy: TranslationProxyConfig,
    site_update: SiteUpdateConfig,
    smtp: SmtpRuntimeConfig,
    max_uploaded_file_size: usize,
    rest_router: Router,
) -> Router {
    Router::new()
        .merge(auth_routes(
            session_manager.clone(),
            backend.clone(),
            assets.clone(),
            browser_runtime.clone(),
            base_path.clone(),
            public_origin.clone(),
            site_name.clone(),
            smtp.clone(),
        ))
        .nest("/api/v1", rest_router)
        .merge(legacy_runtime_routes(
            session_manager.clone(),
            backend.clone(),
            assets,
            browser_runtime,
            base_path.clone(),
            site_name,
            project_default_scope,
        ))
        .merge(workspace_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
            public_origin.clone(),
            smtp.clone(),
        ))
        .merge(user_routes(
            session_manager.clone(),
            backend.clone(),
            translation_proxy,
        ))
        .merge(board_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .merge(issue_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
            public_origin.clone(),
        ))
        .merge(static_compat_routes())
        .merge(notification_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .merge(project_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
        ))
        .route(
            "/api/v1/{*rest_path}",
            any(|| async { rest_not_found_response() }),
        )
        .merge(file_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
            max_uploaded_file_size,
        ))
        .merge(pull_request_routes(
            session_manager.clone(),
            backend.clone(),
            base_path.clone(),
            public_origin.clone(),
        ))
        .merge(site_admin_routes(
            session_manager.clone(),
            backend.clone(),
            site_update,
            smtp,
            base_path.clone(),
            max_uploaded_file_size,
        ))
        .merge(code_routes(session_manager, backend, base_path))
}

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
