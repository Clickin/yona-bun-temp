type LooseJsonValue = ReturnType<typeof JSON.parse>;

export type YonaRecord = Record<string, LooseJsonValue>;

export type YonaLabel = YonaRecord & {
  color: string;
  id: bigint | number | string;
  name: string;
};

export type YonaUserItem = YonaRecord & {
  avatarUrl: string;
  loginId: string;
  role: string;
  userId: bigint | number | string;
  userLabel: string;
};

export type YonaProjectItem = YonaRecord & {
  ownerName: string;
  projectName: string;
};

export type YonaIssueListItem = YonaRecord & {
  childIssues?: YonaIssueListItem[];
  labels: YonaLabel[];
};

export type YonaAttachment = YonaRecord & {
  id: bigint | number | string;
  mimeType?: string;
  name: string;
  size?: bigint | number | string;
  sizeLabel?: string;
  url: string;
};

export type YonaIssueComment = YonaRecord & {
  attachments?: YonaAttachment[];
  voters: YonaUserItem[];
};

export type YonaIssueTimelineItem = YonaRecord & {
  comment?: YonaIssueComment;
};

export type EnrollmentMutationResult = YonaRecord;

export type OrganizationRedirectResult = YonaRecord & {
  redirectPath?: string;
};

export type ReadAuthUiCapabilitiesResponse = YonaRecord;

export type ReadCurrentSessionResponse = YonaRecord;

export type VerifyUserResponse = YonaRecord;

export type WorkspaceProfile = YonaRecord & {
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

export type WorkspaceIssueItem = YonaRecord & {
  childClosedCount?: number;
  childIssues?: YonaIssueListItem[];
  childOpenCount?: number;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  dueDateText?: string;
  labels?: YonaLabel[];
  milestoneId?: bigint | number | string;
  milestoneTitle?: string;
  parentIssueNumber?: bigint | number | string;
  parentIssueTitle?: string;
};

export type WorkspacePullRequestItem = YonaRecord;

export type WorkspaceMemberProjectItem = YonaRecord & {
  notifications: YonaRecord[];
};

export type ReadWorkspaceOverviewResponse = YonaRecord & {
  emails: YonaRecord[];
  favoriteProjects: YonaRecord[];
  issueItems: WorkspaceIssueItem[];
  memberProjects: WorkspaceMemberProjectItem[];
  profile?: WorkspaceProfile;
  pullRequestItems: WorkspacePullRequestItem[];
  recentProjects: YonaRecord[];
  watchedProjects: WorkspaceMemberProjectItem[];
};

export type ListProjectsResponse = YonaRecord & {
  items: YonaRecord[];
  projects?: YonaRecord[];
};

export type ListOrganizationsResponse = YonaRecord & {
  items: YonaRecord[];
  organizations?: YonaRecord[];
};

export type OrganizationDetail = YonaRecord;

export type ReadOrganizationMembersResponse = YonaRecord & {
  enrollmentRequests: YonaUserItem[];
  members: YonaUserItem[];
};

export type OrganizationAdminView = YonaRecord & {
  enrollmentRequests: YonaUserItem[];
  members: YonaUserItem[];
  roleOptions: YonaRecord[];
};

export type OrganizationContainer = YonaRecord & {
  adminMembers: YonaUserItem[];
  memberMembers: YonaUserItem[];
  visibleProjects: YonaProjectItem[];
};

export type ProjectDetail = YonaRecord & {
  enrollmentRequestCount: number;
  members: YonaUserItem[];
};

export type ReadProjectMembersResponse = YonaRecord & {
  enrollmentRequests: YonaUserItem[];
  members: YonaUserItem[];
};

export type ReadCodeBrowserResponse = YonaRecord & {
  breadcrumbs: YonaRecord[];
  branches: YonaRecord[];
  entries: YonaRecord[];
};

export type ProjectContainer = ProjectDetail;

export type ToggleFavoriteProjectResponse = YonaRecord;

export type RecordRecentProjectVisitResponse = YonaRecord;

export type ListProjectIssuesResponse = YonaRecord & {
  items: YonaIssueListItem[];
  ownerName?: string;
  projectName?: string;
};

export type ReadIssueDetailResponse = YonaRecord & {
  attachments: YonaAttachment[];
  comments: YonaIssueComment[];
  labels: YonaLabel[];
  sharers: YonaUserItem[];
  timeline: YonaIssueTimelineItem[];
};

export type MassUpdateIssuesResponse = YonaRecord;

export type ListProjectLabelsResponse = YonaRecord & {
  labels: YonaRecord[];
};

export type ListProjectLabelCategoriesResponse = YonaRecord & {
  categories: YonaRecord[];
};

export type ProjectLabelMutationResponse = YonaRecord;

export type ProjectLabelCategoryMutationResponse = YonaRecord;

export type ListProjectMilestonesResponse = YonaRecord & {
  milestones: ProjectMilestone[];
};

export type ProjectMilestoneIssue = YonaRecord & {
  labels: YonaLabel[];
};

export type ProjectMilestone = YonaRecord & {
  attachments: YonaRecord[];
  closedIssues: ProjectMilestoneIssue[];
  openIssues: ProjectMilestoneIssue[];
};

export type ProjectMilestoneMutationResponse = YonaRecord & {
  milestone?: ProjectMilestone;
};

export type ProjectMilestoneDeleteResponse = YonaRecord;
