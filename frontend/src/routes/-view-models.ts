export interface WorkspaceOverviewViewModel {
  apiToken?: string;
  defaultLandingPath: string;
  daysAgo?: number;
  emails?: Array<{ emailAddress: string; id: string; valid: boolean }>;
  favoriteProjects: Array<{ ownerName: string; projectName: string }>;
  issueItems?: Array<{
    assigneeLabel: string;
    authorLabel: string;
    commentCount: number;
    issueNumber: number;
    ownerName: string;
    projectName: string;
    state: string;
    title: string;
    updatedLabel: string;
  }>;
  memberProjects?: Array<{
    createdLabel: string;
    lastPushedLabel: string;
    memberCount: number;
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
    watchCount: number;
  }>;
  profile?: {
    avatarUrl: string;
    connectedSocialProviders: string[];
    displayName: string;
    englishName: string;
    isBlocked: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    primaryEmailAddress: string;
    sinceLabel: string;
  };
  pullRequestItems?: Array<{
    commentCount: number;
    contributorLabel: string;
    ownerName: string;
    projectName: string;
    pullRequestNumber: number;
    receiverLabel: string;
    state: string;
    title: string;
    updatedLabel: string;
  }>;
  recentProjects: Array<{ ownerName: string; projectName: string }>;
  watchedProjects?: Array<{
    notifications: Array<{ enabled: boolean; eventType: string; label: string }>;
    ownerName: string;
    projectId: string;
    projectName: string;
  }>;
  session: {
    defaultLandingPath: string;
    emailAddress: string;
    isAnonymous: boolean;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    userLabel: string;
  };
}

export interface OrganizationDetailViewModel {
  adminMembers?: Array<{ avatarUrl: string; loginId: string; role: string; userLabel: string }>;
  description: string;
  enrollmentRequested?: boolean;
  memberMembers?: Array<{ avatarUrl: string; loginId: string; role: string; userLabel: string }>;
  organizationName: string;
  viewerCanCreateProject?: boolean;
  viewerCanEnroll?: boolean;
  viewerCanLeave?: boolean;
  viewerCanUpdate: boolean;
  visibleProjects?: Array<{
    createdLabel: string;
    isWatching: boolean;
    lastPushedLabel: string;
    logoUrl: string;
    memberCount: number;
    originOwnerName: string;
    originProjectName: string;
    overview: string;
    ownerName: string;
    projectName: string;
    projectScope: string;
    watchCount: number;
  }>;
}

export interface OrganizationMembersViewModel {
  enrollmentRequests: Array<{ loginId: string; userLabel: string }>;
  members: Array<{ loginId: string; role: string; userLabel: string }>;
}

export interface OrganizationAdminViewModel {
  deleteAllowed: boolean;
  enrollmentRequests: Array<{
    avatarUrl: string;
    loginId: string;
    userId: string;
    userLabel: string;
  }>;
  members: Array<{
    avatarUrl: string;
    loginId: string;
    role: string;
    userId: string;
    userLabel: string;
  }>;
  organizationName: string;
  roleOptions: Array<{ label: string; role: string }>;
  viewerCanUpdate: boolean;
}

export interface OrganizationIssueListItemViewModel {
  assigneeLabel: string;
  authorLabel: string;
  commentCount: number;
  issueNumber: number;
  labels: Array<{ color: string; id: number; name: string }>;
  milestoneTitle: string;
  ownerName: string;
  projectName: string;
  state: string;
  title: string;
  updatedLabel: string;
  voterCount: number;
  watcherCount: number;
}

export interface OrganizationIssueListViewModel {
  closedIssueCount: number;
  items: OrganizationIssueListItemViewModel[];
  openIssueCount: number;
  organizationName: string;
  pageNum: number;
  pageSize: number;
  totalCount: number;
  visibleProjects: Array<{ ownerName: string; projectName: string }>;
}

export interface ProjectDetailViewModel {
  backgroundUrl?: string;
  boardCount?: number;
  cloneUrl?: string;
  codeMemberOnly?: boolean;
  currentMilestone?: {
    closedIssueCount: number;
    completionPercent: number;
    dueDateLabel: string;
    openIssueCount: number;
    title: string;
  };
  dashboard?: {
    assignees?: Array<{
      avatarUrl: string;
      loginId: string;
      openIssueCount: number;
      userId: number;
      userLabel: string;
    }>;
    labels: Array<{
      categoryId?: number | null;
      categoryIsExclusive?: boolean;
      categoryName: string;
      color: string;
      id: number;
      name: string;
      openIssueCount: number;
    }>;
    unassignedOpenIssueCount?: number;
  };
  defaultTab?: string;
  defaultReviewerCount?: number;
  enrollmentRequested: boolean;
  isUsingReviewerCount?: boolean;
  history?: {
    items: Array<{
      actorAvatarUrl: string;
      actorName: string;
      actorUrl: string;
      createdLabel: string;
      itemType: string;
      shortTitle: string;
      title: string;
      url: string;
    }>;
  };
  isFavorited: boolean;
  isForked?: boolean;
  isWatching?: boolean;
  logoUrl?: string;
  memberCount?: number;
  maxReviewerCount?: number;
  members?: Array<{ avatarUrl: string; loginId: string; role: string; userLabel: string }>;
  openIssueCount?: number;
  openPullRequestCount?: number;
  organizationName: string;
  originOwnerName?: string;
  originProjectName?: string;
  overview: string;
  overviewEditable?: boolean;
  ownerName: string;
  projectName: string;
  projectScope: string;
  readmeFile?: {
    bodyHtml: string;
    bodyMarkdown: string;
    name: string;
  };
  reviewCount?: number;
  showAdmin?: boolean;
  showBoard?: boolean;
  showCode?: boolean;
  showIssue?: boolean;
  showMilestone?: boolean;
  showPullRequest?: boolean;
  showReview?: boolean;
  viewerCanEnroll: boolean;
  viewerCanUpdate: boolean;
  viewerCanWatch?: boolean;
  watchCount?: number;
}

export interface ProjectMembersViewModel {
  enrollmentRequests: Array<{ loginId: string; userLabel: string }>;
  members: Array<{ loginId: string; role: string; userLabel: string }>;
}

export interface CodeBrowserViewModel {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  entries: Array<{
    commitDate: string;
    commitMessage: string;
    commitShortId: string;
    kind: string;
    name: string;
    path: string;
    size: number;
  }>;
  file?: {
    html?: string;
    isBinary: boolean;
    isTooLarge: boolean;
    mimeType: string;
    name: string;
    path: string;
    size: number;
    text: string;
  };
  noHead: boolean;
  ownerName: string;
  path: string;
  projectName: string;
  selectedBranch: string;
}

export interface ProjectIssueListItemViewModel {
  assigneeLabel: string;
  authorLabel: string;
  commentCount: number;
  issueNumber: number;
  labels: Array<{ color: string; id: number; name: string }>;
  milestoneTitle: string;
  ownerName: string;
  projectName: string;
  state: string;
  title: string;
  updatedLabel: string;
  voterCount: number;
  watcherCount: number;
}

export interface ProjectIssueListViewModel {
  items: ProjectIssueListItemViewModel[];
  ownerName: string;
  pageNum: number;
  pageSize: number;
  projectName: string;
  totalCount: number;
}

export interface UserIssueListViewModel {
  closedIssueCount: number;
  filter: string;
  items: ProjectIssueListItemViewModel[];
  openIssueCount: number;
  pageNum: number;
  pageSize: number;
  state: string;
  totalCount: number;
}

export interface ProjectIssueDetailViewModel {
  assigneeLabel: string;
  assigneeLoginId: string;
  attachments: Array<{ id: number; name: string; url: string }>;
  authorAvatarUrl: string;
  authorLabel: string;
  authorLoginId: string;
  bodyHtml: string;
  bodyMarkdown: string;
  commentCount: number;
  comments: Array<{
    authorAvatarUrl: string;
    authorLabel: string;
    authorLoginId: string;
    contentsHtml: string;
    contentsMarkdown: string;
    createdLabel: string;
    id: number;
    viewerCanDelete: boolean;
    viewerCanUpdate: boolean;
    viewerHasVoted: boolean;
    voterCount: number;
    viaEmail?: boolean;
    voters: Array<{ avatarUrl: string; loginId: string; userId: number; userLabel: string }>;
  }>;
  hasVoted: boolean;
  historyHtml: string;
  historyMarkdown: string;
  isFavorited: boolean;
  isWatching: boolean;
  issueNumber: number;
  labels: Array<{ color: string; id: number; name: string }>;
  milestoneTitle: string;
  ownerName: string;
  projectName: string;
  sharers: Array<{ loginId: string; userId: number; userLabel: string }>;
  state: string;
  timeline: Array<{
    comment?: {
      authorAvatarUrl: string;
      authorLabel: string;
      authorLoginId: string;
      contentsHtml: string;
      contentsMarkdown: string;
      createdLabel: string;
      id: number;
      viewerCanDelete: boolean;
      viewerCanUpdate: boolean;
      viewerHasVoted: boolean;
      voterCount: number;
      viaEmail?: boolean;
      voters: Array<{ avatarUrl: string; loginId: string; userId: number; userLabel: string }>;
    };
    createdLabel: string;
    eventType: string;
    id: number;
    kind: string;
  }>;
  title: string;
  viewerCanComment: boolean;
  viewerCanDelete: boolean;
  viewerCanManageSharers: boolean;
  viewerCanUpdate: boolean;
  viewerHasInheritedShare: boolean;
  viewerIsDirectSharer: boolean;
  voterCount: number;
  watcherCount: number;
}

export interface ProjectMilestoneIssueViewModel {
  assigneeLabel: string;
  commentCount: number;
  issueNumber: number;
  labels: Array<{ color: string; id: number; name: string }>;
  state: string;
  title: string;
  updatedLabel: string;
}

export interface ProjectMilestoneViewModel {
  attachments: Array<{ id: number; name: string; url: string }>;
  closedIssueCount: number;
  closedIssues: ProjectMilestoneIssueViewModel[];
  completionPercent: number;
  contentsHtml: string;
  contentsMarkdown: string;
  dueDateLabel: string;
  id: number;
  openIssueCount: number;
  openIssues: ProjectMilestoneIssueViewModel[];
  state: string;
  title: string;
  viewerCanDelete: boolean;
  viewerCanUpdate: boolean;
}

export interface ProjectMilestoneListViewModel {
  milestones: ProjectMilestoneViewModel[];
  orderBy: string;
  orderDir: string;
  state: string;
}

export interface AuthUiCapabilitiesViewModel {
  emailVerificationEnabled: boolean;
  loginIdPlaceholder?: string;
  passwordPlaceholder?: string;
  signupRequireConfirm: boolean;
  socialLoginOnly: boolean;
}

export interface ProjectDirectoryViewModel {
  items: Array<{
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
  }>;
}

export interface OrganizationDirectoryViewModel {
  items: Array<{
    description: string;
    organizationName: string;
  }>;
}
