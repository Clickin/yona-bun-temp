use buffa::view::OwnedView;

use crate::generated::yona::pilot::v1::*;
use crate::*;

impl PilotServiceImpl {
    pub(crate) async fn read_current_session(
        &self,
        ctx: Context,
        _request: OwnedView<ReadCurrentSessionRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        auth_session_read(self, ctx).await
    }

    pub(crate) async fn sign_in_with_password(
        &self,
        ctx: Context,
        request: OwnedView<SignInWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        auth_sign_in_with_password(self, ctx, request).await
    }

    pub(crate) async fn register_with_password(
        &self,
        ctx: Context,
        request: OwnedView<RegisterWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        auth_register_with_password(self, ctx, request).await
    }

    pub(crate) async fn verify_user(
        &self,
        ctx: Context,
        request: OwnedView<VerifyUserRequestView<'static>>,
    ) -> Result<(VerifyUserResponse, Context), ConnectError> {
        auth_verify_user(self, ctx, request).await
    }

    pub(crate) async fn sign_out(
        &self,
        ctx: Context,
        _request: OwnedView<SignOutRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        auth_sign_out(self, ctx).await
    }

    pub(crate) async fn read_workspace_overview(
        &self,
        ctx: Context,
        _request: OwnedView<ReadWorkspaceOverviewRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_overview_read(self, ctx).await
    }

    pub(crate) async fn set_default_landing_path(
        &self,
        ctx: Context,
        request: OwnedView<SetDefaultLandingPathRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_default_landing_path_set(self, ctx, request).await
    }

    pub(crate) async fn update_profile(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProfileRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_profile_update(self, ctx, request).await
    }

    pub(crate) async fn change_password(
        &self,
        ctx: Context,
        request: OwnedView<ChangePasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        workspace_password_change(self, ctx, request).await
    }

    pub(crate) async fn reset_visited_projects(
        &self,
        ctx: Context,
        _request: OwnedView<ResetVisitedProjectsRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_visited_projects_reset(self, ctx).await
    }

    pub(crate) async fn add_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<AddWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_email_add(self, ctx, request).await
    }

    pub(crate) async fn delete_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<DeleteWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_email_delete(self, ctx, request).await
    }

    pub(crate) async fn send_workspace_email_validation(
        &self,
        ctx: Context,
        request: OwnedView<SendWorkspaceEmailValidationRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_email_validation_send(self, ctx, request).await
    }

    pub(crate) async fn set_main_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<SetMainWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_main_email_set(self, ctx, request).await
    }

    pub(crate) async fn reset_api_token(
        &self,
        ctx: Context,
        _request: OwnedView<ResetApiTokenRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_api_token_reset(self, ctx).await
    }

    pub(crate) async fn toggle_workspace_notification(
        &self,
        ctx: Context,
        request: OwnedView<ToggleWorkspaceNotificationRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        workspace_notification_toggle(self, ctx, request).await
    }

    pub(crate) async fn create_organization(
        &self,
        ctx: Context,
        request: OwnedView<CreateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        organization_create(self, ctx, request).await
    }

    pub(crate) async fn read_organization_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationDetailRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        organization_detail_read(self, ctx, request).await
    }

    pub(crate) async fn read_organization_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationSettingsRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        organization_settings_read(self, ctx, request).await
    }

    pub(crate) async fn read_organization_members(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationMembersRequestView<'static>>,
    ) -> Result<(ReadOrganizationMembersResponse, Context), ConnectError> {
        organization_members_read(self, ctx, request).await
    }

    pub(crate) async fn read_organization_admin(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationAdminRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        organization_admin_read(self, ctx, request).await
    }

    pub(crate) async fn read_organization_container(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationContainerRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        organization_container_read(self, ctx, request).await
    }

    pub(crate) async fn update_organization(
        &self,
        ctx: Context,
        request: OwnedView<UpdateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        organization_update(self, ctx, request).await
    }

    pub(crate) async fn add_organization_member(
        &self,
        ctx: Context,
        request: OwnedView<AddOrganizationMemberRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        organization_member_add(self, ctx, request).await
    }

    pub(crate) async fn update_organization_member_role(
        &self,
        ctx: Context,
        request: OwnedView<UpdateOrganizationMemberRoleRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        organization_member_role_update(self, ctx, request).await
    }

    pub(crate) async fn delete_organization_member(
        &self,
        ctx: Context,
        request: OwnedView<DeleteOrganizationMemberRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        organization_member_delete(self, ctx, request).await
    }

    pub(crate) async fn accept_organization_enrollment(
        &self,
        ctx: Context,
        request: OwnedView<AcceptOrganizationEnrollmentRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        organization_enrollment_accept(self, ctx, request).await
    }

    pub(crate) async fn enroll_organization(
        &self,
        ctx: Context,
        request: OwnedView<EnrollOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        organization_enroll(self, ctx, request).await
    }

    pub(crate) async fn cancel_enroll_organization(
        &self,
        ctx: Context,
        request: OwnedView<CancelEnrollOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        organization_enroll_cancel(self, ctx, request).await
    }

    pub(crate) async fn leave_organization(
        &self,
        ctx: Context,
        request: OwnedView<LeaveOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
        organization_leave(self, ctx, request).await
    }

    pub(crate) async fn delete_organization(
        &self,
        ctx: Context,
        request: OwnedView<DeleteOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
        organization_delete(self, ctx, request).await
    }

    pub(crate) async fn create_project(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        project_create(self, ctx, request).await
    }

    pub(crate) async fn read_project_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectDetailRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        project_detail_read(self, ctx, request).await
    }

    pub(crate) async fn read_project_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectSettingsRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        project_settings_read(self, ctx, request).await
    }

    pub(crate) async fn read_project_container(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectContainerRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        project_container_read(self, ctx, request).await
    }

    pub(crate) async fn update_project_overview(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectOverviewRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        project_overview_update(self, ctx, request).await
    }

    pub(crate) async fn toggle_project_watch(
        &self,
        ctx: Context,
        request: OwnedView<ToggleProjectWatchRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        project_watch_toggle(self, ctx, request).await
    }

    pub(crate) async fn update_project(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        project_update(self, ctx, request).await
    }

    pub(crate) async fn enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<EnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        project_enroll(self, ctx, request).await
    }

    pub(crate) async fn cancel_enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<CancelEnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        project_enroll_cancel(self, ctx, request).await
    }

    pub(crate) async fn toggle_favorite_project(
        &self,
        ctx: Context,
        request: OwnedView<ToggleFavoriteProjectRequestView<'static>>,
    ) -> Result<(ToggleFavoriteProjectResponse, Context), ConnectError> {
        project_favorite_toggle(self, ctx, request).await
    }

    pub(crate) async fn record_recent_project_visit(
        &self,
        ctx: Context,
        request: OwnedView<RecordRecentProjectVisitRequestView<'static>>,
    ) -> Result<(RecordRecentProjectVisitResponse, Context), ConnectError> {
        recent_project_visit_record(self, ctx, request).await
    }

    pub(crate) async fn list_projects(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectsRequestView<'static>>,
    ) -> Result<(ListProjectsResponse, Context), ConnectError> {
        project_list(self, ctx, request).await
    }

    pub(crate) async fn list_organizations(
        &self,
        ctx: Context,
        request: OwnedView<ListOrganizationsRequestView<'static>>,
    ) -> Result<(ListOrganizationsResponse, Context), ConnectError> {
        organization_list(self, ctx, request).await
    }

    pub(crate) async fn list_organization_issues(
        &self,
        ctx: Context,
        request: OwnedView<ListOrganizationIssuesRequestView<'static>>,
    ) -> Result<(ListOrganizationIssuesResponse, Context), ConnectError> {
        organization_issues_list(self, ctx, request).await
    }

    pub(crate) async fn list_project_issues(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectIssuesRequestView<'static>>,
    ) -> Result<(ListProjectIssuesResponse, Context), ConnectError> {
        project_issues_list(self, ctx, request).await
    }

    pub(crate) async fn read_issue_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadIssueDetailRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_detail_read(self, ctx, request).await
    }

    pub(crate) async fn update_issue_state(
        &self,
        ctx: Context,
        request: OwnedView<UpdateIssueStateRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_state_update(self, ctx, request).await
    }

    pub(crate) async fn watch_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_participation_mutation(self, ctx, request, "watch").await
    }

    pub(crate) async fn unwatch_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_participation_mutation(self, ctx, request, "unwatch").await
    }

    pub(crate) async fn vote_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_participation_mutation(self, ctx, request, "vote").await
    }

    pub(crate) async fn unvote_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_participation_mutation(self, ctx, request, "unvote").await
    }

    pub(crate) async fn vote_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_comment_participation_mutation(self, ctx, request, "vote").await
    }

    pub(crate) async fn unvote_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_comment_participation_mutation(self, ctx, request, "unvote").await
    }

    pub(crate) async fn toggle_favorite_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_favorite_toggle(self, ctx, request).await
    }

    pub(crate) async fn assign_issue(
        &self,
        ctx: Context,
        request: OwnedView<AssignIssueRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        issue_assignment_mutation(self, ctx, request).await
    }

    pub(crate) async fn list_project_labels(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectLabelsRequestView<'static>>,
    ) -> Result<(ListProjectLabelsResponse, Context), ConnectError> {
        project_labels_list(self, ctx, request).await
    }

    pub(crate) async fn list_project_label_categories(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectLabelsRequestView<'static>>,
    ) -> Result<(ListProjectLabelCategoriesResponse, Context), ConnectError> {
        project_label_categories_list(self, ctx, request).await
    }

    pub(crate) async fn create_project_label(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
        project_label_create(self, ctx, request).await
    }

    pub(crate) async fn update_project_label(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
        project_label_update(self, ctx, request).await
    }

    pub(crate) async fn delete_project_label(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
        project_label_delete(self, ctx, request).await
    }

    pub(crate) async fn create_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
        project_label_category_create(self, ctx, request).await
    }

    pub(crate) async fn update_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
        project_label_category_update(self, ctx, request).await
    }

    pub(crate) async fn delete_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
        project_label_category_delete(self, ctx, request).await
    }

    pub(crate) async fn list_project_milestones(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectMilestonesRequestView<'static>>,
    ) -> Result<(ListProjectMilestonesResponse, Context), ConnectError> {
        project_milestone_list(self, ctx, request).await
    }

    pub(crate) async fn read_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        project_milestone_read(self, ctx, request).await
    }

    pub(crate) async fn create_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        project_milestone_create(self, ctx, request).await
    }

    pub(crate) async fn update_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        project_milestone_update(self, ctx, request).await
    }

    pub(crate) async fn delete_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneDeleteResponse, Context), ConnectError> {
        project_milestone_delete(self, ctx, request).await
    }

    pub(crate) async fn open_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<MilestoneStateMutationRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        project_milestone_state_mutation(self, ctx, request, "open").await
    }

    pub(crate) async fn close_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<MilestoneStateMutationRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        project_milestone_state_mutation(self, ctx, request, "closed").await
    }
}
