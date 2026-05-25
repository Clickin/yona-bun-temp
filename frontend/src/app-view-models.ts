import type {
  OrganizationAdminViewModel,
  CodeBrowserViewModel,
  OrganizationDirectoryViewModel,
  OrganizationDetailViewModel,
  OrganizationIssueListViewModel,
  OrganizationMembersViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
  ProjectMilestoneIssueViewModel,
  ProjectMilestoneListViewModel,
  ProjectMilestoneViewModel,
  ProjectDirectoryViewModel,
  ProjectDetailViewModel,
  ProjectMembersViewModel,
  AuthUiCapabilitiesViewModel,
  UserIssueListViewModel,
  WorkspaceOverviewViewModel,
} from "./routes/-view-models";
import {
  readAuthUiCapabilities,
  readCurrentSession,
  readOrganizationAdmin,
  readOrganizationContainer,
  readOrganizationDetail,
  listOrganizationIssues,
  listUserIssues,
  readOrganizationMembers,
  readCodeBrowser,
  listOrganizations,
  listProjectIssues,
  listProjectMilestones,
  readIssueDetail,
  readProjectMilestone,
  readProjectContainer,
  readProjectDetail,
  readProjectMembers,
  listProjects,
  readWorkspaceOverview,
} from "./auth-workspace-client";
import type { IssueReferenceMetadata, MentionReferenceMetadata } from "./api/issue-meta";
import { normalizeIssueReferences, normalizeMentionReferences } from "./api/issue-meta";

function issueReferencesFrom(value: unknown): IssueReferenceMetadata[] {
  return normalizeIssueReferences(
    (value as { issueReferences?: Partial<IssueReferenceMetadata>[] } | null | undefined)
      ?.issueReferences,
  );
}

function mentionReferencesFrom(value: unknown): MentionReferenceMetadata[] {
  return normalizeMentionReferences(
    (value as { mentionReferences?: Partial<MentionReferenceMetadata>[] } | null | undefined)
      ?.mentionReferences,
  );
}

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
    loginIdPlaceholder: response.loginIdPlaceholder,
    passwordPlaceholder: response.passwordPlaceholder,
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
  const detailWithReadme = detail as typeof detail & {
    dashboard?: {
      assignees?: Array<{
        avatarUrl?: string;
        loginId?: string;
        openIssueCount?: number;
        userId?: number;
        userLabel?: string;
      }>;
      labels?: Array<{
        categoryId?: number | null;
        categoryIsExclusive?: boolean;
        categoryName?: string;
        color?: string;
        id?: number;
        name?: string;
        openIssueCount?: number;
      }>;
      unassignedOpenIssueCount?: number;
    };
    history?: {
      items?: Array<{
        actorAvatarUrl?: string;
        actorName?: string;
        actorUrl?: string;
        createdLabel?: string;
        itemType?: string;
        shortTitle?: string;
        title?: string;
        url?: string;
      }>;
    };
    defaultReviewerCount?: number;
    isUsingReviewerCount?: boolean;
    maxReviewerCount?: number;
    readmeFile?: { bodyHtml?: string; bodyMarkdown?: string; name?: string } | null;
  };
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
    dashboard: {
      assignees: (detailWithReadme.dashboard?.assignees ?? []).map((assignee) => ({
        avatarUrl: assignee.avatarUrl ?? "",
        loginId: assignee.loginId ?? "",
        openIssueCount: assignee.openIssueCount ?? 0,
        userId: assignee.userId ?? 0,
        userLabel: assignee.userLabel ?? "",
      })),
      labels: (detailWithReadme.dashboard?.labels ?? []).map((label) => ({
        categoryId: label.categoryId ?? null,
        categoryIsExclusive: label.categoryIsExclusive ?? false,
        categoryName: label.categoryName ?? "",
        color: label.color ?? "",
        id: label.id ?? 0,
        name: label.name ?? "",
        openIssueCount: label.openIssueCount ?? 0,
      })),
      unassignedOpenIssueCount: detailWithReadme.dashboard?.unassignedOpenIssueCount ?? undefined,
    },
    defaultTab: detail.defaultTab,
    defaultReviewerCount: detailWithReadme.defaultReviewerCount ?? 1,
    enrollmentRequested: detail.enrollmentRequested,
    history: {
      items: (detailWithReadme.history?.items ?? []).map((item) => ({
        actorAvatarUrl: item.actorAvatarUrl ?? "",
        actorName: item.actorName ?? "",
        actorUrl: item.actorUrl ?? "#",
        createdLabel: item.createdLabel ?? "",
        itemType: item.itemType ?? "",
        shortTitle: item.shortTitle ?? "",
        title: item.title ?? "",
        url: item.url ?? "#",
      })),
    },
    isFavorited: detail.isFavorited,
    isForked: detail.isForked,
    isUsingReviewerCount: detailWithReadme.isUsingReviewerCount ?? false,
    isWatching: detail.isWatching,
    logoUrl: detail.logoUrl,
    memberCount: detail.memberCount,
    maxReviewerCount: detailWithReadme.maxReviewerCount ?? 1,
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
    readmeFile: detailWithReadme.readmeFile
      ? {
          bodyHtml: detailWithReadme.readmeFile.bodyHtml ?? "",
          bodyMarkdown: detailWithReadme.readmeFile.bodyMarkdown ?? "",
          name: detailWithReadme.readmeFile.name ?? "README.md",
        }
      : undefined,
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

export function toCodeBrowserView(
  response: Awaited<ReturnType<typeof readCodeBrowser>>,
): CodeBrowserViewModel {
  const responseFile = response.file as
    | (NonNullable<typeof response.file> & { html?: string })
    | undefined;
  return {
    branches: response.branches.map((branch) => ({ name: branch.name })),
    breadcrumbs: response.breadcrumbs.map((breadcrumb) => ({
      name: breadcrumb.name,
      path: breadcrumb.path,
    })),
    entries: response.entries.map((entry) => ({
      commitDate: entry.commitDate,
      commitMessage: entry.commitMessage,
      commitShortId: entry.commitShortId,
      kind: entry.kind,
      name: entry.name,
      path: entry.path,
      size: Number(entry.size),
    })),
    file: responseFile
      ? {
          html: responseFile.html ?? "",
          isBinary: responseFile.isBinary,
          isTooLarge: responseFile.isTooLarge,
          mimeType: responseFile.mimeType,
          name: responseFile.name,
          path: responseFile.path,
          size: Number(responseFile.size),
          text: responseFile.text,
        }
      : undefined,
    noHead: response.noHead,
    ownerName: response.ownerName,
    path: response.path,
    projectName: response.projectName,
    selectedBranch: response.selectedBranch,
  };
}

export function toProjectIssueListView(
  response: Awaited<ReturnType<typeof listProjectIssues>>,
): ProjectIssueListViewModel {
  return {
    items: response.items.map((item) => ({
      assigneeLabel: item.assigneeLabel,
      authorLabel: item.authorLabel,
      commentCount: Number(item.commentCount),
      issueNumber: Number(item.issueNumber),
      labels: item.labels.map((label) => ({
        color: label.color,
        id: Number(label.id),
        name: label.name,
      })),
      milestoneTitle: item.milestoneTitle,
      ownerName: item.ownerName,
      projectName: item.projectName,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
      voterCount: item.voterCount,
      watcherCount: item.watcherCount,
    })),
    ownerName: response.ownerName,
    pageNum: response.pageNum,
    pageSize: response.pageSize,
    projectName: response.projectName,
    totalCount: response.totalCount,
  };
}

export function toUserIssueListView(
  response: Awaited<ReturnType<typeof listUserIssues>>,
): UserIssueListViewModel {
  return {
    closedIssueCount: response.closedIssueCount,
    filter: response.filter,
    items: response.items.map((item) => ({
      assigneeLabel: item.assigneeLabel,
      authorLabel: item.authorLabel,
      commentCount: Number(item.commentCount),
      issueNumber: Number(item.issueNumber),
      labels: item.labels.map((label) => ({
        color: label.color,
        id: Number(label.id),
        name: label.name,
      })),
      milestoneTitle: item.milestoneTitle,
      ownerName: item.ownerName,
      projectName: item.projectName,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
      voterCount: item.voterCount,
      watcherCount: item.watcherCount,
    })),
    openIssueCount: response.openIssueCount,
    pageNum: response.pageNum,
    pageSize: response.pageSize,
    state: response.state,
    totalCount: response.totalCount,
  };
}

export function toOrganizationIssueListView(
  response: Awaited<ReturnType<typeof listOrganizationIssues>>,
): OrganizationIssueListViewModel {
  return {
    closedIssueCount: response.closedIssueCount,
    items: response.items.map((item) => ({
      assigneeLabel: item.assigneeLabel,
      authorLabel: item.authorLabel,
      commentCount: Number(item.commentCount),
      issueNumber: Number(item.issueNumber),
      labels: item.labels.map((label) => ({
        color: label.color,
        id: Number(label.id),
        name: label.name,
      })),
      milestoneTitle: item.milestoneTitle,
      ownerName: item.ownerName,
      projectName: item.projectName,
      state: item.state,
      title: item.title,
      updatedLabel: item.updatedLabel,
      voterCount: item.voterCount,
      watcherCount: item.watcherCount,
    })),
    openIssueCount: response.openIssueCount,
    organizationName: response.organizationName,
    pageNum: response.pageNum,
    pageSize: response.pageSize,
    totalCount: response.totalCount,
    visibleProjects: response.visibleProjects.map((project) => ({
      ownerName: project.ownerName,
      projectName: project.projectName,
    })),
  };
}

type IssueDetailResponseWithHistory = Awaited<ReturnType<typeof readIssueDetail>> & {
  historyHtml?: string;
  historyMarkdown?: string;
};

export function toProjectIssueDetailView(
  response: IssueDetailResponseWithHistory,
): ProjectIssueDetailViewModel {
  return {
    assigneeAvatarUrl: response.assigneeAvatarUrl,
    assigneeLabel: response.assigneeLabel,
    assigneeLoginId: response.assigneeLoginId,
    attachments: response.attachments.map((attachment) => ({
      id: Number(attachment.id),
      name: attachment.name,
      url: attachment.url,
    })),
    authorAvatarUrl: response.authorAvatarUrl,
    authorLabel: response.authorLabel,
    authorLoginId: response.authorLoginId,
    bodyHtml: response.bodyHtml,
    bodyMarkdown: response.bodyMarkdown,
    commentCount: response.commentCount,
    comments: response.comments.map((comment) => ({
      authorAvatarUrl: comment.authorAvatarUrl,
      authorLabel: comment.authorLabel,
      authorLoginId: comment.authorLoginId,
      contentsHtml: comment.contentsHtml,
      contentsMarkdown: comment.contentsMarkdown,
      createdLabel: comment.createdLabel,
      id: Number(comment.id),
      issueReferences: issueReferencesFrom(comment),
      mentionReferences: mentionReferencesFrom(comment),
      viewerCanDelete: comment.viewerCanDelete,
      viewerCanUpdate: comment.viewerCanUpdate,
      viewerHasVoted: comment.viewerHasVoted,
      voterCount: comment.voterCount,
      viaEmail: comment.viaEmail,
      voters: comment.voters.map((voter) => ({
        avatarUrl: voter.avatarUrl,
        loginId: voter.loginId,
        userId: Number(voter.userId),
        userLabel: voter.userLabel,
      })),
    })),
    hasVoted: response.hasVoted,
    historyHtml: response.historyHtml ?? "",
    historyMarkdown: response.historyMarkdown ?? "",
    issueReferences: issueReferencesFrom(response),
    mentionReferences: mentionReferencesFrom(response),
    isFavorited: response.isFavorited,
    isWatching: response.isWatching,
    issueNumber: Number(response.issueNumber),
    labels: response.labels.map((label) => ({
      color: label.color,
      id: Number(label.id),
      name: label.name,
    })),
    milestoneTitle: response.milestoneTitle,
    ownerName: response.ownerName,
    projectName: response.projectName,
    sharers: response.sharers.map((sharer) => ({
      loginId: sharer.loginId,
      userId: Number(sharer.userId),
      userLabel: sharer.userLabel,
    })),
    state: response.state,
    timeline: response.timeline.map((item) => ({
      comment: item.comment
        ? {
            authorAvatarUrl: item.comment.authorAvatarUrl,
            authorLabel: item.comment.authorLabel,
            authorLoginId: item.comment.authorLoginId,
            contentsHtml: item.comment.contentsHtml,
            contentsMarkdown: item.comment.contentsMarkdown,
            createdLabel: item.comment.createdLabel,
            id: Number(item.comment.id),
            issueReferences: issueReferencesFrom(item.comment),
            mentionReferences: mentionReferencesFrom(item.comment),
            viewerCanDelete: item.comment.viewerCanDelete,
            viewerCanUpdate: item.comment.viewerCanUpdate,
            viewerHasVoted: item.comment.viewerHasVoted,
            voterCount: item.comment.voterCount,
            viaEmail: item.comment.viaEmail,
            voters: item.comment.voters.map((voter) => ({
              avatarUrl: voter.avatarUrl,
              loginId: voter.loginId,
              userId: Number(voter.userId),
              userLabel: voter.userLabel,
            })),
          }
        : undefined,
      createdLabel: item.createdLabel,
      eventType: item.eventType,
      id: Number(item.id),
      kind: item.kind,
      newValue: item.newValue,
      oldValue: item.oldValue,
      senderLoginId: item.senderLoginId,
    })),
    title: response.title,
    viewerCanComment: response.viewerCanComment,
    viewerCanDelete: response.viewerCanDelete,
    viewerCanManageSharers: response.viewerCanManageSharers,
    viewerCanUpdate: response.viewerCanUpdate,
    viewerHasInheritedShare: response.viewerHasInheritedShare,
    viewerIsDirectSharer: response.viewerIsDirectSharer,
    voterCount: response.voterCount,
    watcherCount: response.watcherCount,
  };
}

function toProjectMilestoneIssueView(
  item: Awaited<
    ReturnType<typeof listProjectMilestones>
  >["milestones"][number]["openIssues"][number],
): ProjectMilestoneIssueViewModel {
  return {
    assigneeLabel: item.assigneeLabel,
    commentCount: item.commentCount,
    issueNumber: Number(item.issueNumber),
    labels: item.labels.map((label) => ({
      color: label.color,
      id: Number(label.id),
      name: label.name,
    })),
    state: item.state,
    title: item.title,
    updatedLabel: item.updatedLabel,
  };
}

function toProjectMilestoneView(
  milestone: Awaited<ReturnType<typeof listProjectMilestones>>["milestones"][number],
): ProjectMilestoneViewModel {
  return {
    attachments: milestone.attachments.map((attachment) => ({
      id: Number(attachment.id),
      name: attachment.name,
      url: attachment.url,
    })),
    closedIssueCount: milestone.closedIssueCount,
    closedIssues: milestone.closedIssues.map(toProjectMilestoneIssueView),
    completionPercent: milestone.completionPercent,
    contentsHtml: milestone.contentsHtml,
    contentsMarkdown: milestone.contentsMarkdown,
    dueDateLabel: milestone.dueDateLabel,
    id: Number(milestone.id),
    issueReferences: issueReferencesFrom(milestone),
    openIssueCount: milestone.openIssueCount,
    openIssues: milestone.openIssues.map(toProjectMilestoneIssueView),
    state: milestone.state,
    title: milestone.title,
    viewerCanDelete: milestone.viewerCanDelete,
    viewerCanUpdate: milestone.viewerCanUpdate,
  };
}

export function toProjectMilestoneListView(
  response: Awaited<ReturnType<typeof listProjectMilestones>>,
  state: string,
  orderBy: string,
  orderDir: string,
): ProjectMilestoneListViewModel {
  return {
    milestones: response.milestones.map(toProjectMilestoneView),
    orderBy,
    orderDir,
    state,
  };
}

export function toProjectMilestoneDetailView(
  response: Awaited<ReturnType<typeof readProjectMilestone>>,
): ProjectMilestoneViewModel | null {
  return response.milestone ? toProjectMilestoneView(response.milestone) : null;
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
