import type {
  OrganizationAdminViewModel,
  OrganizationDirectoryViewModel,
  OrganizationDetailViewModel,
  OrganizationMembersViewModel,
  ProjectDirectoryViewModel,
  ProjectDetailViewModel,
  ProjectMembersViewModel,
  AuthUiCapabilitiesViewModel,
  WorkspaceOverviewViewModel,
} from "./routes/-view-models";
import {
  readAuthUiCapabilities,
  readCurrentSession,
  readOrganizationAdmin,
  readOrganizationContainer,
  readOrganizationDetail,
  readOrganizationMembers,
  listOrganizations,
  readProjectContainer,
  readProjectDetail,
  readProjectMembers,
  listProjects,
  readWorkspaceOverview,
} from "./auth-workspace-client";

export function toWorkspaceOverview(
  session: Awaited<ReturnType<typeof readCurrentSession>>,
  overview: Awaited<ReturnType<typeof readWorkspaceOverview>>,
): WorkspaceOverviewViewModel {
  return {
    apiToken: overview.apiToken,
    defaultLandingPath: overview.defaultLandingPath,
    daysAgo: overview.daysAgo,
    emails: overview.emails.map((email) => ({
      emailAddress: email.emailAddress,
      id: email.id,
      valid: email.valid,
    })),
    favoriteProjects: overview.favoriteProjects.map((project) => ({
      ownerName: project.ownerName,
      projectName: project.projectName,
    })),
    issueItems: overview.issueItems.map((item) => ({
      assigneeLabel: item.assigneeLabel,
      authorLabel: item.authorLabel,
      commentCount: item.commentCount,
      issueNumber: Number(item.issueNumber),
      ownerName: item.ownerName,
      projectName: item.projectName,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
    })),
    memberProjects: overview.memberProjects.map((project) => ({
      createdLabel: project.createdLabel,
      lastPushedLabel: project.lastPushedLabel,
      memberCount: project.memberCount,
      ownerName: project.ownerName,
      overview: project.overview,
      projectName: project.projectName,
      projectScope: project.projectScope,
      watchCount: project.watchCount,
    })),
    profile: overview.profile
      ? {
          avatarUrl: overview.profile.avatarUrl,
          connectedSocialProviders: [...overview.profile.connectedSocialProviders],
          displayName: overview.profile.displayName,
          englishName: overview.profile.englishName,
          isBlocked: overview.profile.isBlocked,
          isSiteAdmin: overview.profile.isSiteAdmin,
          loginId: overview.profile.loginId,
          primaryEmailAddress: overview.profile.primaryEmailAddress,
          sinceLabel: overview.profile.sinceLabel,
        }
      : undefined,
    pullRequestItems: overview.pullRequestItems.map((item) => ({
      commentCount: item.commentCount,
      contributorLabel: item.contributorLabel,
      ownerName: item.ownerName,
      projectName: item.projectName,
      pullRequestNumber: Number(item.pullRequestNumber),
      receiverLabel: item.receiverLabel,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
    })),
    recentProjects: overview.recentProjects.map((project) => ({
      ownerName: project.ownerName,
      projectName: project.projectName,
    })),
    watchedProjects: overview.watchedProjects.map((project) => ({
      notifications: project.notifications.map((notification) => ({
        enabled: notification.enabled,
        eventType: notification.eventType,
        label: notification.label,
      })),
      ownerName: project.ownerName,
      projectId: project.projectId,
      projectName: project.projectName,
    })),
    session: {
      defaultLandingPath: session.defaultLandingPath,
      emailAddress: session.emailAddress,
      isAnonymous: session.isAnonymous,
      isConfirmed: session.isConfirmed,
      isSiteAdmin: session.isSiteAdmin,
      loginId: session.loginId,
      userLabel: session.userLabel,
    },
  };
}

export function toOrganizationDetailView(
  detail: Awaited<ReturnType<typeof readOrganizationDetail>>,
): OrganizationDetailViewModel {
  return {
    description: detail.description,
    organizationName: detail.organizationName,
    viewerCanUpdate: detail.viewerCanUpdate,
  };
}

export function toOrganizationContainerView(
  detail: Awaited<ReturnType<typeof readOrganizationContainer>>,
): OrganizationDetailViewModel {
  return {
    adminMembers: detail.adminMembers.map((member) => ({
      avatarUrl: member.avatarUrl,
      loginId: member.loginId,
      role: member.role,
      userLabel: member.userLabel,
    })),
    description: detail.description,
    enrollmentRequested: detail.enrollmentRequested,
    memberMembers: detail.memberMembers.map((member) => ({
      avatarUrl: member.avatarUrl,
      loginId: member.loginId,
      role: member.role,
      userLabel: member.userLabel,
    })),
    organizationName: detail.organizationName,
    viewerCanCreateProject: detail.viewerCanCreateProject,
    viewerCanEnroll: detail.viewerCanEnroll,
    viewerCanLeave: detail.viewerCanLeave,
    viewerCanUpdate: detail.viewerCanUpdate,
    visibleProjects: detail.visibleProjects.map((project) => ({
      createdLabel: project.createdLabel,
      isWatching: project.isWatching,
      lastPushedLabel: project.lastPushedLabel,
      logoUrl: project.logoUrl,
      memberCount: project.memberCount,
      originOwnerName: project.originOwnerName,
      originProjectName: project.originProjectName,
      overview: project.overview,
      ownerName: project.ownerName,
      projectName: project.projectName,
      projectScope: project.projectScope,
      watchCount: project.watchCount,
    })),
  };
}

export function toOrganizationAdminView(
  detail: Awaited<ReturnType<typeof readOrganizationAdmin>>,
): OrganizationAdminViewModel {
  return {
    deleteAllowed: detail.deleteAllowed,
    enrollmentRequests: detail.enrollmentRequests.map((item) => ({
      avatarUrl: item.avatarUrl,
      loginId: item.loginId,
      userId: item.userId.toString(),
      userLabel: item.userLabel,
    })),
    members: detail.members.map((item) => ({
      avatarUrl: item.avatarUrl,
      loginId: item.loginId,
      role: item.role,
      userId: item.userId.toString(),
      userLabel: item.userLabel,
    })),
    organizationName: detail.organizationName,
    roleOptions: detail.roleOptions.map((item) => ({
      label: item.label,
      role: item.role,
    })),
    viewerCanUpdate: detail.viewerCanUpdate,
  };
}

export function toAuthUiCapabilitiesView(
  response: Awaited<ReturnType<typeof readAuthUiCapabilities>>,
): AuthUiCapabilitiesViewModel {
  return {
    emailVerificationEnabled: response.emailVerificationEnabled,
    signupRequireConfirm: response.signupRequireConfirm,
    socialLoginOnly: response.socialLoginOnly,
  };
}

export function toOrganizationMembersView(
  response: Awaited<ReturnType<typeof readOrganizationMembers>>,
): OrganizationMembersViewModel {
  return {
    enrollmentRequests: response.enrollmentRequests.map((item) => ({
      loginId: item.loginId,
      userLabel: item.userLabel,
    })),
    members: response.members.map((item) => ({
      loginId: item.loginId,
      role: item.role,
      userLabel: item.userLabel,
    })),
  };
}

export function toOrganizationDirectoryView(
  response: Awaited<ReturnType<typeof listOrganizations>>,
): OrganizationDirectoryViewModel {
  return {
    items: response.items.map((item) => ({
      description: item.description,
      organizationName: item.organizationName,
    })),
  };
}

export function toProjectDetailView(
  detail: Awaited<ReturnType<typeof readProjectDetail>>,
): ProjectDetailViewModel {
  return {
    enrollmentRequested: detail.enrollmentRequested,
    isFavorited: detail.isFavorited,
    organizationName: detail.organizationName,
    overview: detail.overview,
    ownerName: detail.ownerName,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
    viewerCanEnroll: detail.viewerCanEnroll,
    viewerCanUpdate: detail.viewerCanUpdate,
  };
}

export function toProjectContainerView(
  detail: Awaited<ReturnType<typeof readProjectContainer>>,
): ProjectDetailViewModel {
  return {
    backgroundUrl: detail.backgroundUrl,
    boardCount: detail.boardCount,
    cloneUrl: detail.cloneUrl,
    codeMemberOnly: detail.codeMemberOnly,
    currentMilestone: detail.currentMilestone
      ? {
          closedIssueCount: detail.currentMilestone.closedIssueCount,
          completionPercent: detail.currentMilestone.completionPercent,
          dueDateLabel: detail.currentMilestone.dueDateLabel,
          openIssueCount: detail.currentMilestone.openIssueCount,
          title: detail.currentMilestone.title,
        }
      : undefined,
    defaultTab: detail.defaultTab,
    enrollmentRequested: detail.enrollmentRequested,
    isFavorited: detail.isFavorited,
    isForked: detail.isForked,
    isWatching: detail.isWatching,
    logoUrl: detail.logoUrl,
    memberCount: detail.memberCount,
    members: detail.members.map((member) => ({
      avatarUrl: member.avatarUrl,
      loginId: member.loginId,
      role: member.role,
      userLabel: member.userLabel,
    })),
    openIssueCount: detail.openIssueCount,
    openPullRequestCount: detail.openPullRequestCount,
    organizationName: detail.organizationName,
    originOwnerName: detail.originOwnerName,
    originProjectName: detail.originProjectName,
    overview: detail.overview,
    overviewEditable: detail.overviewEditable,
    ownerName: detail.ownerName,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
    reviewCount: detail.reviewCount,
    showAdmin: detail.showAdmin,
    showBoard: detail.showBoard,
    showCode: detail.showCode,
    showIssue: detail.showIssue,
    showMilestone: detail.showMilestone,
    showPullRequest: detail.showPullRequest,
    showReview: detail.showReview,
    viewerCanEnroll: detail.viewerCanEnroll,
    viewerCanUpdate: detail.viewerCanUpdate,
    viewerCanWatch: detail.viewerCanWatch,
    watchCount: detail.watchCount,
  };
}

export function toProjectMembersView(
  response: Awaited<ReturnType<typeof readProjectMembers>>,
): ProjectMembersViewModel {
  return {
    enrollmentRequests: response.enrollmentRequests.map((item) => ({
      loginId: item.loginId,
      userLabel: item.userLabel,
    })),
    members: response.members.map((item) => ({
      loginId: item.loginId,
      role: item.role,
      userLabel: item.userLabel,
    })),
  };
}

export function toProjectDirectoryView(
  response: Awaited<ReturnType<typeof listProjects>>,
): ProjectDirectoryViewModel {
  return {
    items: response.items.map((item) => ({
      overview: item.overview,
      ownerName: item.ownerName,
      projectName: item.projectName,
      projectScope: item.projectScope,
    })),
  };
}
