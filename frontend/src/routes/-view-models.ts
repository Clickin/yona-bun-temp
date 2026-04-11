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
  defaultTab?: string;
  enrollmentRequested: boolean;
  isFavorited: boolean;
  isForked?: boolean;
  isWatching?: boolean;
  logoUrl?: string;
  memberCount?: number;
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

export interface AuthUiCapabilitiesViewModel {
  emailVerificationEnabled: boolean;
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
