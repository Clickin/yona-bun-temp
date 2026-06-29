import type { IssueReferenceMetadata, MentionReferenceMetadata } from "../api/issue-meta";

export interface IssueLabelViewModel {
  categoryId?: number | null;
  categoryIsExclusive?: boolean;
  categoryName?: string;
  color: string;
  id: number;
  name: string;
}

export interface WorkspaceOverviewViewModel {
  apiToken?: string;
  defaultLandingPath: string;
  daysAgo?: number;
  emails?: Array<{ emailAddress: string; id: string; valid: boolean }>;
  favoriteProjects: Array<{
    logoUrl?: string;
    ownerId?: string | number;
    ownerName: string;
    overview?: string;
    projectId?: string | number;
    projectName: string;
    projectScope?: string;
  }>;
  issueItems?: Array<{
    assigneeLabel: string;
    assigneeLoginId?: string;
    authorLabel: string;
    authorLoginId?: string;
    commentCount: number;
    id?: number;
    issueNumber: number;
    ownerName: string;
    projectName: string;
    state: string;
    title: string;
    updatedLabel: string;
  }>;
  memberProjects?: Array<{
    createdLabel: string;
    isWatching?: boolean;
    lastPushedLabel: string;
    logoUrl?: string;
    memberCount: number;
    originOwnerName?: string;
    originProjectName?: string;
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
    viewerCanLeave?: boolean;
    viewerCanWatch?: boolean;
    watchCount: number;
  }>;
  profile?: {
    avatarUrl: string;
    connectedSocialProviders: string[];
    displayName: string;
    englishName: string;
    isBlocked: boolean;
    isGuest?: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    primaryEmailAddress: string;
    sinceLabel: string;
  };
  pullRequestItems?: Array<{
    commentCount: number;
    contributorLabel: string;
    contributorLoginId?: string;
    ownerName: string;
    projectName: string;
    pullRequestNumber: number;
    receiverLabel: string;
    receiverLoginId?: string;
    state: string;
    title: string;
    updatedLabel: string;
  }>;
  recentProjects: Array<{
    logoUrl?: string;
    ownerId?: string | number;
    ownerName: string;
    overview?: string;
    projectId?: string | number;
    projectName: string;
    projectScope?: string;
  }>;
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
  logoUrl?: string;
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
  assigneeAvatarUrl?: string;
  assigneeLabel: string;
  assigneeLoginId?: string;
  authorAvatarUrl?: string;
  authorLabel: string;
  authorLoginId?: string;
  childClosedCount?: number;
  childIssues?: Array<{
    assigneeLabel: string;
    commentCount?: number;
    createdLabel: string;
    isDraft?: boolean;
    issueNumber: number;
    labels: IssueLabelViewModel[];
    state: string;
    title: string;
    voterCount?: number;
  }>;
  childOpenCount?: number;
  commentCount: number;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  id?: number;
  issueNumber: number;
  labels: Array<{
    categoryId?: number | null;
    categoryIsExclusive?: boolean;
    categoryName?: string;
    color: string;
    id: number;
    name: string;
  }>;
  milestoneTitle: string;
  ownerName: string;
  parentIssueNumber?: number;
  parentIssueTitle?: string;
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
    id: number;
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
    milestones?: Array<{
      closedIssueCount: number;
      completionPercent: number;
      id: number;
      openIssueCount: number;
      title: string;
    }>;
    noMilestoneOpenIssueCount?: number;
    pullRequests?: Array<{
      contributorAvatarUrl: string;
      contributorLoginId: string;
      contributorUserId: number;
      contributorUserLabel: string;
      createdLabel: string;
      pullRequestNumber: number;
      title: string;
    }>;
    unassignedOpenIssueCount?: number;
  };
  defaultTab?: string;
  defaultReviewerCount?: number;
  enrollmentRequestCount?: number;
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
  projectId?: number;
  projectName: string;
  projectScope: string;
  readmeFile?: {
    bodyMarkdown: string;
    mentionReferences?: MentionReferenceMetadata[];
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
  viewerCanLeave?: boolean;
  viewerCanUpdate: boolean;
  viewerCanWatch?: boolean;
  viewerUserId?: number;
  vcs?: string;
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
    authorAvatarUrl?: string;
    authorLabel?: string;
    authorLoginId?: string;
    commitDate: string;
    commitMessage: string;
    commitShortId: string;
    kind: string;
    name: string;
    path: string;
    size: number;
  }>;
  file?: {
    authorAvatarUrl?: string;
    authorLabel?: string;
    authorLoginId?: string;
    commitDate?: string;
    commitId?: string;
    commentCount?: number;
    commitMessage?: string;
    commitShortId?: string;
    html?: string;
    isBinary: boolean;
    isTooLarge: boolean;
    mimeType: string;
    mentionReferences?: MentionReferenceMetadata[];
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
  assigneeAvatarUrl?: string;
  assigneeLabel: string;
  assigneeLoginId?: string;
  authorAvatarUrl?: string;
  authorLabel: string;
  authorLoginId?: string;
  childClosedCount?: number;
  childIssues?: Array<{
    assigneeLabel: string;
    commentCount?: number;
    createdLabel: string;
    isDraft?: boolean;
    issueNumber: number;
    labels: Array<{ color: string; id: number; name: string }>;
    state: string;
    title: string;
    voterCount?: number;
  }>;
  childOpenCount?: number;
  commentCount: number;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  id?: number;
  issueNumber: number;
  labels: IssueLabelViewModel[];
  milestoneTitle: string;
  ownerName: string;
  parentIssueNumber?: number;
  parentIssueTitle?: string;
  projectName: string;
  state: string;
  title: string;
  updatedLabel: string;
  voterCount: number;
  watcherCount: number;
  weight?: number;
}

export interface ProjectIssueListViewModel {
  draftItems: ProjectIssueListItemViewModel[];
  items: ProjectIssueListItemViewModel[];
  ownerName: string;
  pageNum: number;
  pageSize: number;
  projectName: string;
  totalCount: number;
}

export interface ProjectIssueParentOptionViewModel {
  id: number;
  issueNumber: number;
  selected: boolean;
  title: string;
}

export interface UserIssueListViewModel {
  closedIssueCount: number;
  filter: string;
  items: ProjectIssueListItemViewModel[];
  openIssueCount: number;
  pageNum: number;
  pageSize: number;
  sideFilterCounts: {
    favorite: number;
    mentioned: number;
    shared: number;
  };
  state: string;
  totalCount: number;
  viewerUserId: number;
}

export interface ProjectIssueDetailViewModel {
  assigneeAvatarUrl: string;
  assigneeLabel: string;
  assigneeLoginId: string;
  attachments: Array<{ id: number; name: string; url: string }>;
  authorAvatarUrl: string;
  authorId?: number;
  authorLabel: string;
  authorLoginId: string;
  bodyMarkdown: string;
  commentCount: number;
  createdLabel: string;
  dueDateLabel: string;
  comments: Array<{
    attachments?: Array<{
      id: number;
      mimeType?: string;
      name: string;
      size?: number | string;
      sizeLabel?: string;
      url: string;
    }>;
    authorAvatarUrl: string;
    authorId?: number;
    authorLabel: string;
    authorLoginId: string;
    contentsMarkdown: string;
    createdLabel: string;
    id: number;
    issueReferences?: IssueReferenceMetadata[];
    mentionReferences?: MentionReferenceMetadata[];
    parentCommentId?: number;
    viewerCanDelete: boolean;
    viewerCanUpdate: boolean;
    viewerHasVoted: boolean;
    voterCount: number;
    viaEmail?: boolean;
    voters: Array<{ avatarUrl: string; loginId: string; userId: number; userLabel: string }>;
  }>;
  childClosedCount: number;
  childIssues: Array<{
    assigneeLabel: string;
    commentCount?: number;
    createdLabel: string;
    isDraft: boolean;
    issueNumber: number;
    labels: IssueLabelViewModel[];
    state: string;
    title: string;
    voterCount?: number;
  }>;
  childOpenCount: number;
  hasVoted: boolean;
  historyMarkdown: string;
  issueReferences?: IssueReferenceMetadata[];
  mentionReferences?: MentionReferenceMetadata[];
  issueId?: number;
  isFavorited: boolean;
  isDraft: boolean;
  isWatching: boolean;
  issueNumber: number;
  labels: IssueLabelViewModel[];
  milestoneId: number;
  milestoneTitle: string;
  ownerName: string;
  parentIssueId: number;
  parentIssueNumber: number;
  parentIssueState: string;
  parentIssueTitle: string;
  projectName: string;
  sharers: Array<{ loginId: string; userId: number; userLabel: string }>;
  state: string;
  timeline: Array<{
    comment?: {
      attachments?: Array<{
        id: number;
        mimeType?: string;
        name: string;
        size?: number | string;
        sizeLabel?: string;
        url: string;
      }>;
      authorAvatarUrl: string;
      authorId?: number;
      authorLabel: string;
      authorLoginId: string;
      contentsMarkdown: string;
      createdLabel: string;
      id: number;
      issueReferences?: IssueReferenceMetadata[];
      mentionReferences?: MentionReferenceMetadata[];
      parentCommentId?: number;
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
    newValue: string;
    oldValue: string;
    resourceHref?: string;
    resourceLabel?: string;
    resourceTitle?: string;
    senderLoginId: string;
    senderLabel?: string;
    targetLoginId?: string;
    targetLabel?: string;
  }>;
  title: string;
  viewerCanComment: boolean;
  viewerCanDelete: boolean;
  viewerCanManageSharers: boolean;
  viewerCanUpdate: boolean;
  viewerUserId?: number;
  viewerHasInheritedShare: boolean;
  viewerIsDirectSharer: boolean;
  voterCount: number;
  issueVoters?: Array<{
    avatarUrl: string;
    emailAddress?: string;
    loginId: string;
    userId: number;
    userLabel: string;
  }>;
  watcherCount: number;
  weight?: number;
}

export interface ProjectMilestoneIssueViewModel {
  assigneeAvatarUrl?: string;
  assigneeLabel: string;
  assigneeLoginId?: string;
  authorLabel?: string;
  authorLoginId?: string;
  childClosedCount?: number;
  childOpenCount?: number;
  commentCount: number;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  id?: number;
  issueNumber: number;
  labels: Array<{ color: string; id: number; name: string }>;
  milestoneId?: number;
  milestoneTitle?: string;
  parentIssueNumber?: number;
  parentIssueTitle?: string;
  state: string;
  title: string;
  updatedLabel: string;
  voterCount?: number;
  watcherCount?: number;
  weight?: number;
}

export interface ProjectMilestoneViewModel {
  attachments: Array<{ id: number; name: string; url: string }>;
  closedIssueCount: number;
  closedIssues: ProjectMilestoneIssueViewModel[];
  completionPercent: number;
  contentsMarkdown: string;
  dueDateLabel: string;
  dueDateOverdue?: boolean;
  id: number;
  issueReferences?: IssueReferenceMetadata[];
  mentionReferences?: MentionReferenceMetadata[];
  openIssueCount: number;
  openIssues: ProjectMilestoneIssueViewModel[];
  state: string;
  title: string;
  untilLabel?: string;
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
  enabledSocialProviders?: string[];
  enabled_social_providers?: string[];
  loginIdPlaceholder?: string;
  passwordPlaceholder?: string;
  secretSetupRequired?: boolean;
  signupRequireConfirm: boolean;
  socialLoginOnly: boolean;
}

export interface ProjectDirectoryViewModel {
  items: Array<{
    createdLabel: string;
    lastPushedLabel: string;
    logoUrl: string;
    memberCount: number;
    members?: Array<{ avatarUrl: string; loginId: string; userLabel: string }>;
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
    watchCount: number;
  }>;
}

export interface OrganizationDirectoryViewModel {
  items: Array<{
    createdLabel: string;
    description: string;
    logoUrl: string;
    organizationName: string;
  }>;
}
