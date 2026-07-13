type LooseJsonValue = ReturnType<typeof JSON.parse>;

export type YoramRecord = Record<string, LooseJsonValue>;

export type YoramLabel = YoramRecord & {
  color: string;
  id: bigint | number | string;
  name: string;
};

export type YoramUserItem = YoramRecord & {
  avatarUrl: string;
  loginId: string;
  role: string;
  userId: bigint | number | string;
  userLabel: string;
};

export type YoramProjectItem = YoramRecord & {
  ownerName: string;
  projectName: string;
};

export type YoramIssueListItem = YoramRecord & {
  childIssues?: YoramIssueListItem[];
  labels: YoramLabel[];
};

export type YoramAttachment = YoramRecord & {
  id: bigint | number | string;
  mimeType?: string;
  name: string;
  size?: bigint | number | string;
  sizeLabel?: string;
  url: string;
};

export type YoramIssueComment = YoramRecord & {
  attachments?: YoramAttachment[];
  voters: YoramUserItem[];
};

export type YoramIssueTimelineItem = YoramRecord & {
  comment?: YoramIssueComment;
};

export type EnrollmentMutationResult = YoramRecord;

export type OrganizationRedirectResult = YoramRecord & {
  redirectPath?: string;
};

export type ReadAuthUiCapabilitiesResponse = YoramRecord;

export type ReadCurrentSessionResponse = YoramRecord;

export type VerifyUserResponse = YoramRecord;

export type WorkspaceProfile = YoramRecord & {
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

export type WorkspaceIssueItem = YoramRecord & {
  childClosedCount?: number;
  childIssues?: YoramIssueListItem[];
  childOpenCount?: number;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  dueDateText?: string;
  labels?: YoramLabel[];
  milestoneId?: bigint | number | string;
  milestoneTitle?: string;
  parentIssueNumber?: bigint | number | string;
  parentIssueTitle?: string;
};

export type WorkspacePullRequestItem = YoramRecord;

export type WorkspaceSidebarProjectItem = YoramRecord & {
  isFavorited: boolean;
  logoUrl: string;
  overview: string;
  ownerName: string;
  projectId: bigint | number | string;
  projectName: string;
  projectScope: string;
};

export type WorkspaceSidebarOrganizationItem = YoramRecord & {
  isFavorited: boolean;
  organizationId: bigint | number | string;
  organizationName: string;
  projectCount: null | number;
  projects: WorkspaceSidebarProjectItem[];
};

export type WorkspaceMemberProjectItem = WorkspaceSidebarProjectItem & {
  notifications: YoramRecord[];
};

export type ReadWorkspaceOverviewResponse = YoramRecord & {
  emails: YoramRecord[];
  favoriteOrganizations: WorkspaceSidebarOrganizationItem[];
  favoriteProjects: WorkspaceSidebarProjectItem[];
  issueItems: WorkspaceIssueItem[];
  memberProjects: WorkspaceMemberProjectItem[];
  organizations: WorkspaceSidebarOrganizationItem[];
  ownProjects: WorkspaceSidebarProjectItem[];
  profile?: WorkspaceProfile;
  pullRequestItems: WorkspacePullRequestItem[];
  recentProjects: WorkspaceSidebarProjectItem[];
  watchedProjects: WorkspaceMemberProjectItem[];
};

export type ListProjectsResponse = YoramRecord & {
  items: YoramRecord[];
  projects?: YoramRecord[];
};

export type ListOrganizationsResponse = YoramRecord & {
  items: YoramRecord[];
  organizations?: YoramRecord[];
};

export type OrganizationDetail = YoramRecord;

export type ReadOrganizationMembersResponse = YoramRecord & {
  enrollmentRequests: YoramUserItem[];
  members: YoramUserItem[];
};

export type OrganizationAdminView = YoramRecord & {
  enrollmentRequests: YoramUserItem[];
  members: YoramUserItem[];
  roleOptions: YoramRecord[];
};

export type OrganizationContainer = YoramRecord & {
  adminMembers: YoramUserItem[];
  memberMembers: YoramUserItem[];
  visibleProjects: YoramProjectItem[];
};

export type ProjectDetail = YoramRecord & {
  enrollmentRequestCount: number;
  members: YoramUserItem[];
};

export type ReadProjectMembersResponse = YoramRecord & {
  enrollmentRequests: YoramUserItem[];
  members: YoramUserItem[];
};

export type ReadCodeBrowserResponse = YoramRecord & {
  breadcrumbs: YoramRecord[];
  branches: YoramRecord[];
  entries: YoramRecord[];
};

export type ProjectContainer = ProjectDetail & {
  backgroundUrl: string;
  boardCount: number;
  cloneUrl: string;
  codeMemberOnly: boolean;
  currentMilestone: YoramRecord | null;
  defaultTab: string;
  enrollmentRequested: boolean;
  isFavorited: boolean;
  isForked: boolean;
  isWatching: boolean;
  logoUrl: string;
  memberCount: number;
  openIssueCount: number;
  openPullRequestCount: number;
  organizationName: string;
  originOwnerName: string;
  originProjectName: string;
  overview: string;
  overviewEditable: boolean;
  ownerName: string;
  projectId: bigint | number | string;
  projectName: string;
  projectScope: string;
  reviewCount: number;
  showAdmin: boolean;
  showBoard: boolean;
  showCode: boolean;
  showIssue: boolean;
  showMilestone: boolean;
  showPullRequest: boolean;
  showReview: boolean;
  vcs: string;
  viewerCanEnroll: boolean;
  viewerCanLeave: boolean;
  viewerCanUpdate: boolean;
  viewerCanWatch: boolean;
  viewerUserId: bigint | number | string;
  watchCount: number;
};

export type ToggleFavoriteProjectResponse = YoramRecord & {
  favorited: boolean;
  ownerName: string;
  projectName: string;
};

export type ToggleFavoriteOrganizationResponse = YoramRecord & {
  favorited: boolean;
  organizationName: string;
};

export type RecordRecentProjectVisitResponse = YoramRecord;

export type ListProjectIssuesResponse = YoramRecord & {
  items: YoramIssueListItem[];
  ownerName?: string;
  projectName?: string;
};

export type ReadIssueDetailResponse = YoramRecord & {
  attachments: YoramAttachment[];
  comments: YoramIssueComment[];
  labels: YoramLabel[];
  sharers: YoramUserItem[];
  timeline: YoramIssueTimelineItem[];
};

export type MassUpdateIssuesResponse = YoramRecord;

export type ListProjectLabelsResponse = YoramRecord & {
  labels: YoramRecord[];
};

export type ListProjectLabelCategoriesResponse = YoramRecord & {
  categories: YoramRecord[];
};

export type ProjectLabelMutationResponse = YoramRecord;

export type ProjectLabelCategoryMutationResponse = YoramRecord;

export type ListProjectMilestonesResponse = YoramRecord & {
  milestones: ProjectMilestone[];
};

export type ProjectMilestoneIssue = YoramRecord & {
  labels: YoramLabel[];
};

export type ProjectMilestone = YoramRecord & {
  attachments: YoramRecord[];
  closedIssues: ProjectMilestoneIssue[];
  openIssues: ProjectMilestoneIssue[];
};

export type ProjectMilestoneMutationResponse = YoramRecord & {
  milestone?: ProjectMilestone;
};

export type ProjectMilestoneDeleteResponse = YoramRecord;
