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
  description: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}

export interface OrganizationMembersViewModel {
  enrollmentRequests: Array<{ loginId: string; userLabel: string }>;
  members: Array<{ loginId: string; role: string; userLabel: string }>;
}

export interface ProjectDetailViewModel {
  enrollmentRequested: boolean;
  isFavorited: boolean;
  organizationName: string;
  overview: string;
  ownerName: string;
  projectName: string;
  projectScope: string;
  viewerCanEnroll: boolean;
  viewerCanUpdate: boolean;
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
