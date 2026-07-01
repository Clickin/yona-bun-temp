use axum::{extract::Path, http::HeaderMap, response::Response, routing::post, Json, Router};

use crate::api_types::*;
use crate::{
    auth_ui_capabilities_from_config, rest_json_response, rest_owned_view, Context,
    PilotServiceImpl, RestRouteError,
};

use super::auth::{legacy_obfuscated_default_admin_contact, secret_admin_setup_required};

#[cfg(debug_assertions)]
pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    Router::new().route(
        "/_pilot/{method_name}",
        post(
            move |headers: HeaderMap,
                  Path(method_name): Path<String>,
                  Json(payload): Json<serde_json::Value>| {
                let service = service.clone();
                async move { rest_debug_method(headers, method_name, payload, service).await }
            },
        ),
    )
}

pub(crate) async fn rest_debug_method(
    headers: HeaderMap,
    method_name: String,
    payload: serde_json::Value,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    macro_rules! call {
        ($method:ident, $request:ty, $view:ty) => {{
            let request: $request = serde_json::from_value(payload).map_err(|error| {
                RestRouteError::bad_request(format!("invalid debug method request: {error}"))
            })?;
            let request = rest_owned_view::<$view>(&request)?;
            let (payload, ctx) = service
                .$method(Context::new(headers), request)
                .await
                .map_err(RestRouteError::from_connect_error)?;
            Ok(rest_json_response(payload, ctx))
        }};
    }

    match method_name.as_str() {
        "ReadCurrentSession" => call!(
            read_current_session,
            ReadCurrentSessionRequest,
            ReadCurrentSessionRequestView<'static>
        ),
        "ReadAuthUiCapabilities" => {
            let _request: ReadAuthUiCapabilitiesRequest =
                serde_json::from_value(payload).map_err(|error| {
                    RestRouteError::bad_request(format!("invalid debug method request: {error}"))
                })?;
            let mut response = auth_ui_capabilities_from_config(&service.auth_ui);
            response.default_admin_contact =
                legacy_obfuscated_default_admin_contact(&service).await?;
            response.secret_setup_required = secret_admin_setup_required(&service)
                .await
                .map_err(RestRouteError::from_connect_error)?;
            Ok(rest_json_response(response, Context::new(headers)))
        }
        "SignInWithPassword" => call!(
            sign_in_with_password,
            SignInWithPasswordRequest,
            SignInWithPasswordRequestView<'static>
        ),
        "RegisterWithPassword" => call!(
            register_with_password,
            RegisterWithPasswordRequest,
            RegisterWithPasswordRequestView<'static>
        ),
        "VerifyUser" => call!(
            verify_user,
            VerifyUserRequest,
            VerifyUserRequestView<'static>
        ),
        "SignOut" => call!(sign_out, SignOutRequest, SignOutRequestView<'static>),
        "ReadWorkspaceOverview" => call!(
            read_workspace_overview,
            ReadWorkspaceOverviewRequest,
            ReadWorkspaceOverviewRequestView<'static>
        ),
        "SetDefaultLandingPath" => call!(
            set_default_landing_path,
            SetDefaultLandingPathRequest,
            SetDefaultLandingPathRequestView<'static>
        ),
        "UpdateProfile" => call!(
            update_profile,
            UpdateProfileRequest,
            UpdateProfileRequestView<'static>
        ),
        "ChangePassword" => call!(
            change_password,
            ChangePasswordRequest,
            ChangePasswordRequestView<'static>
        ),
        "ResetVisitedProjects" => call!(
            reset_visited_projects,
            ResetVisitedProjectsRequest,
            ResetVisitedProjectsRequestView<'static>
        ),
        "AddWorkspaceEmail" => call!(
            add_workspace_email,
            AddWorkspaceEmailRequest,
            AddWorkspaceEmailRequestView<'static>
        ),
        "DeleteWorkspaceEmail" => call!(
            delete_workspace_email,
            DeleteWorkspaceEmailRequest,
            DeleteWorkspaceEmailRequestView<'static>
        ),
        "SendWorkspaceEmailValidation" => call!(
            send_workspace_email_validation,
            SendWorkspaceEmailValidationRequest,
            SendWorkspaceEmailValidationRequestView<'static>
        ),
        "SetMainWorkspaceEmail" => call!(
            set_main_workspace_email,
            SetMainWorkspaceEmailRequest,
            SetMainWorkspaceEmailRequestView<'static>
        ),
        "ResetApiToken" => call!(
            reset_api_token,
            ResetApiTokenRequest,
            ResetApiTokenRequestView<'static>
        ),
        "ToggleWorkspaceNotification" => call!(
            toggle_workspace_notification,
            ToggleWorkspaceNotificationRequest,
            ToggleWorkspaceNotificationRequestView<'static>
        ),
        "CreateOrganization" => call!(
            create_organization,
            CreateOrganizationRequest,
            CreateOrganizationRequestView<'static>
        ),
        "ReadOrganizationDetail" => call!(
            read_organization_detail,
            ReadOrganizationDetailRequest,
            ReadOrganizationDetailRequestView<'static>
        ),
        "ReadOrganizationSettings" => call!(
            read_organization_settings,
            ReadOrganizationSettingsRequest,
            ReadOrganizationSettingsRequestView<'static>
        ),
        "ReadOrganizationAdmin" => call!(
            read_organization_admin,
            ReadOrganizationAdminRequest,
            ReadOrganizationAdminRequestView<'static>
        ),
        "ReadOrganizationContainer" => call!(
            read_organization_container,
            ReadOrganizationContainerRequest,
            ReadOrganizationContainerRequestView<'static>
        ),
        "UpdateOrganization" => call!(
            update_organization,
            UpdateOrganizationRequest,
            UpdateOrganizationRequestView<'static>
        ),
        "AddOrganizationMember" => call!(
            add_organization_member,
            AddOrganizationMemberRequest,
            AddOrganizationMemberRequestView<'static>
        ),
        "UpdateOrganizationMemberRole" => call!(
            update_organization_member_role,
            UpdateOrganizationMemberRoleRequest,
            UpdateOrganizationMemberRoleRequestView<'static>
        ),
        "DeleteOrganizationMember" => call!(
            delete_organization_member,
            DeleteOrganizationMemberRequest,
            DeleteOrganizationMemberRequestView<'static>
        ),
        "AcceptOrganizationEnrollment" => call!(
            accept_organization_enrollment,
            AcceptOrganizationEnrollmentRequest,
            AcceptOrganizationEnrollmentRequestView<'static>
        ),
        "EnrollOrganization" => call!(
            enroll_organization,
            EnrollOrganizationRequest,
            EnrollOrganizationRequestView<'static>
        ),
        "CancelEnrollOrganization" => call!(
            cancel_enroll_organization,
            CancelEnrollOrganizationRequest,
            CancelEnrollOrganizationRequestView<'static>
        ),
        "LeaveOrganization" => call!(
            leave_organization,
            LeaveOrganizationRequest,
            LeaveOrganizationRequestView<'static>
        ),
        "DeleteOrganization" => call!(
            delete_organization,
            DeleteOrganizationRequest,
            DeleteOrganizationRequestView<'static>
        ),
        "CreateProject" => call!(
            create_project,
            CreateProjectRequest,
            CreateProjectRequestView<'static>
        ),
        "ReadProjectDetail" => call!(
            read_project_detail,
            ReadProjectDetailRequest,
            ReadProjectDetailRequestView<'static>
        ),
        "ReadProjectSettings" => call!(
            read_project_settings,
            ReadProjectSettingsRequest,
            ReadProjectSettingsRequestView<'static>
        ),
        "ReadProjectContainer" => call!(
            read_project_container,
            ReadProjectContainerRequest,
            ReadProjectContainerRequestView<'static>
        ),
        "UpdateProjectOverview" => call!(
            update_project_overview,
            UpdateProjectOverviewRequest,
            UpdateProjectOverviewRequestView<'static>
        ),
        "ToggleProjectWatch" => call!(
            toggle_project_watch,
            ToggleProjectWatchRequest,
            ToggleProjectWatchRequestView<'static>
        ),
        "EnrollProject" => call!(
            enroll_project,
            EnrollProjectRequest,
            EnrollProjectRequestView<'static>
        ),
        "CancelEnrollProject" => call!(
            cancel_enroll_project,
            CancelEnrollProjectRequest,
            CancelEnrollProjectRequestView<'static>
        ),
        "ToggleFavoriteProject" => call!(
            toggle_favorite_project,
            ToggleFavoriteProjectRequest,
            ToggleFavoriteProjectRequestView<'static>
        ),
        "ListProjects" => call!(
            list_projects,
            ListProjectsRequest,
            ListProjectsRequestView<'static>
        ),
        "ListOrganizations" => call!(
            list_organizations,
            ListOrganizationsRequest,
            ListOrganizationsRequestView<'static>
        ),
        "ListOrganizationIssues" => call!(
            list_organization_issues,
            ListOrganizationIssuesRequest,
            ListOrganizationIssuesRequestView<'static>
        ),
        "ListProjectIssues" => call!(
            list_project_issues,
            ListProjectIssuesRequest,
            ListProjectIssuesRequestView<'static>
        ),
        "ReadIssueDetail" => call!(
            read_issue_detail,
            ReadIssueDetailRequest,
            ReadIssueDetailRequestView<'static>
        ),
        "UpdateIssueState" => call!(
            update_issue_state,
            UpdateIssueStateRequest,
            UpdateIssueStateRequestView<'static>
        ),
        unknown => Err(RestRouteError::not_found(format!(
            "debug method not found: {unknown}"
        ))),
    }
}
