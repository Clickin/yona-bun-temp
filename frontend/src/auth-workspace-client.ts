import type {
  ListProjectIssuesResponse,
  ListProjectLabelCategoriesResponse,
  ListProjectLabelsResponse,
  ListProjectMilestonesResponse,
  ListOrganizationsResponse,
  ListProjectsResponse,
  MassUpdateIssuesResponse,
  OrganizationAdminView,
  OrganizationContainer,
  OrganizationDetail,
  OrganizationRedirectResult,
  ProjectContainer,
  ProjectDetail,
  ProjectLabelCategoryMutationResponse,
  ProjectLabelMutationResponse,
  ProjectMilestoneDeleteResponse,
  ProjectMilestoneMutationResponse,
  ReadCodeBrowserResponse,
  ReadCurrentSessionResponse,
  ReadIssueDetailResponse,
  ReadOrganizationMembersResponse,
  ReadProjectMembersResponse,
  ReadWorkspaceOverviewResponse,
  RecordRecentProjectVisitResponse,
  ToggleFavoriteProjectResponse,
} from "./api/types";
import {
  completePasswordResetRest,
  readAuthUiCapabilitiesRest,
  registerWithPasswordRest,
  requestPasswordResetRest,
  signInWithPasswordRest,
  signOutRest,
  verifyUserRest,
} from "./api/auth";
import {
  assignIssueRest,
  searchIssueAssignableUsersRest,
  searchIssueMentionUsersRest,
  searchIssueSharableUsersRest,
  searchProjectAssignableUsersRest,
  searchProjectIssueReferencesRest,
  shareIssueRest,
  toggleFavoriteIssueRest,
  unshareIssueRest,
  unvoteIssueCommentRest,
  unvoteIssueRest,
  unwatchIssueRest,
  voteIssueCommentRest,
  voteIssueRest,
  watchIssueRest,
  type IssueAssignableUsersInput,
  type IssueAssignableUsersResponse,
  type IssueMentionUsersInput,
  type IssueMentionUsersResponse,
  type IssueSharableUsersInput,
  type ProjectAssignableUsersInput,
  type ProjectIssueReferencesInput,
  type ProjectIssueReferencesResponse,
} from "./api/issue-meta";
import {
  closeProjectMilestoneRest,
  createProjectMilestoneRest,
  deleteProjectMilestoneRest,
  listProjectMilestonesRest,
  openProjectMilestoneRest,
  readProjectMilestoneRest,
  updateProjectMilestoneRest,
} from "./api/milestones";
import {
  acceptOrganizationEnrollmentRest,
  addOrganizationMemberRest,
  cancelEnrollOrganizationRest,
  cancelEnrollProjectRest,
  createOrganizationRest,
  createProjectRest,
  deleteOrganizationMemberRest,
  deleteOrganizationRest,
  enrollOrganizationRest,
  enrollProjectRest,
  leaveOrganizationRest,
  listOrganizationsRest,
  listProjectsRest,
  readOrganizationAdminRest,
  readOrganizationContainerRest,
  readOrganizationDetailRest,
  readOrganizationMembersRest,
  readOrganizationSettingsRest,
  readProjectContainerRest,
  readProjectDetailRest,
  readProjectMembersRest,
  readProjectSettingsRest,
  toggleFavoriteProjectRest,
  toggleProjectWatchRest,
  updateOrganizationMemberRoleRest,
  updateOrganizationRest,
  updateProjectOverviewRest,
  updateProjectRest,
} from "./api/org-project";
import {
  copyProjectLabelsRest,
  createProjectLabelCategoryRest,
  createProjectLabelRest,
  deleteProjectLabelCategoryRest,
  deleteProjectLabelRest,
  listProjectLabelCategoriesRest,
  listProjectLabelsRest,
  updateProjectLabelCategoryRest,
  updateProjectLabelRest,
  type ProjectLabelCopyResponse,
} from "./api/project-labels";
import {
  listNotificationsRest,
  type NotificationsListInput,
  type NotificationsListResponse,
} from "./api/notifications";
import {
  readPublicUserProfile as readPublicUserProfileRest,
  type PublicUserProfileInput,
  type PublicUserProfileResponse,
} from "./api/users";
import { restFetch } from "./api/rest-client";
import { readCurrentSessionRest } from "./api/session";
import {
  addWorkspaceEmailRest,
  changePasswordRest,
  deleteWorkspaceEmailRest,
  readWorkspaceOverviewRest,
  recordRecentProjectVisitRest,
  resetApiTokenRest,
  resetVisitedProjectsRest,
  sendWorkspaceEmailValidationRest,
  setDefaultLandingPathRest,
  setMainWorkspaceEmailRest,
  toggleWorkspaceNotificationRest,
  updateProfileRest,
} from "./api/workspace";
import { prefixBasePath, type RuntimeConfig } from "./runtime-config";

type RequestInput = Record<string, any>;

export interface SessionBootstrapPayload {
  session: null | {
    csrfToken: string;
    projection: ReadCurrentSessionResponse;
    userId: bigint | number;
  };
  user: null | {
    emailAddress: string;
    id: bigint | number;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    name: string;
  };
}

export interface SessionBootstrapResult {
  csrfToken: string;
  payload: SessionBootstrapPayload;
}

export interface ProjectIssueListOptions {
  assigneeId?: bigint | number;
  assigneeLoginId?: string;
  authorLoginId?: string;
  labelIds?: Array<bigint | number>;
  milestoneId?: bigint | number;
  pageNum?: number;
  state?: string;
}

export interface OrganizationIssueListOptions {
  assigneeId?: bigint | number;
  authorId?: bigint | number;
  filter?: string;
  itemsPerPage?: number;
  mentionId?: bigint | number;
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
  projectNames?: string[];
  state?: string;
}

type IssueShareClientInput = RequestInput & {
  targetType?: "project" | "user" | string;
};

export interface UserIssueListOptions {
  filter?: string;
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
  pageSize?: number;
  query?: string;
  state?: string;
}

export type DirectIssueFormOptionsResponse = {
  bodyMarkdown: string;
  referCommentId: string;
  selectedProject: {
    ownerName: string;
    projectName: string;
  };
};

export type IssueParentOption = {
  id: bigint | number;
  issueNumber: bigint | number;
  selected: boolean;
  title: string;
};

export type IssueParentOptionsResponse = {
  items: IssueParentOption[];
};

export type RestIssueListItem = ListProjectIssuesResponse["items"][number] & {
  assigneeAvatarUrl?: string;
  assigneeLoginId?: string;
  authorAvatarUrl?: string;
  authorLoginId?: string;
  childClosedCount?: number;
  childIssues?: Array<{
    assigneeLabel: string;
    createdLabel: string;
    isDraft?: boolean;
    issueNumber: bigint | number;
    labels: Array<{ color: string; id: bigint | number; name: string }>;
    state: string;
    title: string;
  }>;
  childOpenCount?: number;
  commentParentLinks?: Array<{
    id: bigint | number;
    parentCommentId?: bigint | number | null;
  }>;
  dueDateLabel?: string;
  dueDateOverdue?: boolean;
  id?: bigint | number;
  parentIssueNumber?: bigint | number | null;
  parentIssueTitle?: string;
  weight?: number;
};

export type ProjectIssueListRestResponse = Omit<ListProjectIssuesResponse, "items"> & {
  items: RestIssueListItem[];
  draftItems?: RestIssueListItem[];
};

export type OrganizationIssueListRestResponse = Omit<ListProjectIssuesResponse, "items"> & {
  closedIssueCount: number;
  items: RestIssueListItem[];
  openIssueCount: number;
  organizationName: string;
  visibleProjects: Array<{ ownerName: string; projectName: string }>;
};

export type UserIssueListRestResponse = Omit<
  ListProjectIssuesResponse,
  "items" | "ownerName" | "projectName"
> & {
  closedIssueCount: number;
  filter: string;
  items: RestIssueListItem[];
  openIssueCount: number;
  sideFilterCounts?: {
    favorite?: number;
    mentioned?: number;
    shared?: number;
  };
  state: string;
  viewerUserId?: bigint | number;
};

export type RestIssueDetailResponse = ReadIssueDetailResponse & {
  authorId?: bigint | number | null;
  childClosedCount?: number;
  childIssues?: Array<{
    assigneeLabel: string;
    createdLabel: string;
    isDraft?: boolean;
    issueNumber: bigint | number;
    labels: Array<{ color: string; id: bigint | number; name: string }>;
    state: string;
    title: string;
  }>;
  childOpenCount?: number;
  createdLabel?: string;
  dueDateLabel?: string;
  historyMarkdown?: string;
  issueId?: bigint | number;
  issueVoters?: Array<{
    avatarUrl: string;
    emailAddress?: string;
    loginId: string;
    userId: bigint | number;
    userLabel: string;
  }>;
  isDraft?: boolean;
  parentIssueId?: bigint | number | null;
  parentIssueNumber?: bigint | number | null;
  parentIssueTitle?: string;
  weight?: number;
};

export type IssueWeightResponse = {
  weight: number;
};

export interface CodeBrowserOptions {
  branch?: string;
  path?: string;
}

export interface ProjectMilestoneListOptions {
  orderBy?: string;
  orderDir?: string;
  state?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNonEmptyStringField(value: Record<string, unknown>, fieldName: string): null | string {
  const fieldValue = value[fieldName];
  if (typeof fieldValue !== "string") {
    return null;
  }
  const trimmed = fieldValue.trim();
  return trimmed === "" ? null : trimmed;
}

function extractAttachmentId(payload: unknown): null | string {
  if (!isObjectRecord(payload)) {
    return null;
  }

  const directAttachmentId =
    readNonEmptyStringField(payload, "attachmentId") ?? readNonEmptyStringField(payload, "id");
  if (directAttachmentId) {
    return directAttachmentId;
  }

  const nestedAttachment = payload.attachment;
  if (isObjectRecord(nestedAttachment)) {
    return readNonEmptyStringField(nestedAttachment, "id");
  }

  return null;
}

export async function readSessionBootstrap(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionBootstrapResult> {
  const response = await fetchImpl(`${runtimeConfig.apiBaseUrl}/auth/session`, {
    credentials: "include",
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Session bootstrap failed with ${response.status}.`);
  }

  const csrfToken = response.headers.get("x-csrf-token")?.trim();
  if (!csrfToken) {
    throw new Error("Session bootstrap did not return a CSRF token.");
  }

  return {
    csrfToken,
    payload: (await response.json()) as SessionBootstrapPayload,
  };
}

export async function readCurrentSession(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
) {
  return readCurrentSessionRest(runtimeConfig, fetchImpl);
}

export async function readAuthUiCapabilities(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
) {
  return readAuthUiCapabilitiesRest(runtimeConfig, fetchImpl);
}

export async function signInWithPassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return signInWithPasswordRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function registerWithPassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return registerWithPasswordRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function requestPasswordReset(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return requestPasswordResetRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function completePasswordReset(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return completePasswordResetRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function signOut(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
) {
  return signOutRest(runtimeConfig, csrfToken, fetchImpl);
}

export async function verifyUser(
  runtimeConfig: RuntimeConfig,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return verifyUserRest(runtimeConfig, input, fetchImpl);
}

export async function uploadProfileAvatar(
  runtimeConfig: RuntimeConfig,
  filename: string,
  blob: Blob,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const formData = new FormData();
  formData.set("file", blob, filename);

  const response = await fetchImpl(prefixBasePath(runtimeConfig.basePath, "/files"), {
    body: formData,
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Avatar upload failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const attachmentId = extractAttachmentId(payload);
  if (!attachmentId) {
    throw new Error("Avatar upload did not return an attachment id.");
  }

  return attachmentId;
}

export async function readWorkspaceOverview(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return readWorkspaceOverviewRest(runtimeConfig, fetchImpl);
}

export async function readPublicUserProfile(
  runtimeConfig: RuntimeConfig,
  input: PublicUserProfileInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicUserProfileResponse> {
  return readPublicUserProfileRest(runtimeConfig, input, fetchImpl);
}

export async function listProjects(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return listProjectsRest(runtimeConfig, fetchImpl);
}

export async function listOrganizations(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListOrganizationsResponse> {
  return listOrganizationsRest(runtimeConfig, fetchImpl);
}

function encodeIssuePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function appendIssueQueryParam(
  searchParams: URLSearchParams,
  key: string,
  value: Array<bigint | number | string> | bigint | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      appendIssueQueryParam(searchParams, key, entry);
    }
    return;
  }
  if (typeof value === "string" && value.trim() === "") {
    return;
  }
  searchParams.append(key, String(value));
}

function issueQueryString(
  values: Record<
    string,
    Array<bigint | number | string> | bigint | number | string | null | undefined
  >,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    appendIssueQueryParam(searchParams, key, value);
  }
  const query = searchParams.toString();
  return query === "" ? "" : `?${query}`;
}

function projectIssuesRestPath(ownerName: string, projectName: string): string {
  return `/projects/${encodeIssuePathSegment(ownerName)}/${encodeIssuePathSegment(projectName)}/issues`;
}

function projectIssueDetailRestPath(
  ownerName: string,
  projectName: string,
  issueNumber: bigint | number,
): string {
  return `${projectIssuesRestPath(ownerName, projectName)}/${String(issueNumber)}`;
}

type IssueMutationRestInput = (RequestInput | RequestInput) & {
  dueDate?: string;
  isDraft?: boolean;
  isPublish?: boolean;
  parentIssueId?: bigint | number | string | null;
  referCommentId?: bigint | number | string | null;
};

function issueMutationRestBody(input: IssueMutationRestInput) {
  const referCommentId = input.referCommentId ? input.referCommentId : undefined;
  return {
    assigneeLoginId: input.assigneeLoginId ?? "",
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown ?? "",
    dueDate: input.dueDate ?? "",
    isDraft: input.isDraft ?? false,
    isPublish: input.isPublish ?? false,
    labelIds: input.labelIds ?? [],
    milestoneId: input.milestoneId && input.milestoneId !== 0n ? input.milestoneId : undefined,
    parentIssueId: input.parentIssueId ? input.parentIssueId : undefined,
    referCommentId,
    title: input.title ?? "",
  };
}

function issueCommentRestBody(
  input:
    | (RequestInput & {
        parentCommentId?: bigint | number | string | null;
      })
    | RequestInput,
) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    contentsMarkdown: input.contentsMarkdown ?? "",
    parentCommentId: "parentCommentId" in input ? input.parentCommentId : undefined,
  };
}

function massUpdateIssuesRestBody(input: RequestInput) {
  return {
    addLabelIds: input.addLabelIds ?? [],
    assigneeLoginId: input.assigneeLoginId ?? "",
    assigneeUpdate: input.assigneeUpdate ?? false,
    issueNumbers: input.issueNumbers ?? [],
    milestoneId: input.milestoneId && input.milestoneId !== 0n ? input.milestoneId : undefined,
    milestoneUpdate: input.milestoneUpdate ?? false,
    removeLabelIds: input.removeLabelIds ?? [],
    state: input.state ?? "",
  };
}

export async function listOrganizationIssues(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  input: OrganizationIssueListOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationIssueListRestResponse> {
  return restFetch<OrganizationIssueListRestResponse>(
    runtimeConfig,
    `/organizations/${encodeIssuePathSegment(organizationName)}/issues${issueQueryString({
      assigneeId: input.assigneeId,
      authorId: input.authorId,
      filter: input.filter,
      itemsPerPage: input.itemsPerPage,
      mentionId: input.mentionId,
      orderBy: input.orderBy,
      orderDir: input.orderDir,
      pageNum: input.pageNum ?? 1,
      projectNames: input.projectNames,
      state: input.state,
    })}`,
    { fetchImpl },
  );
}

export async function listProjectIssues(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: ProjectIssueListOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectIssueListRestResponse> {
  return restFetch<ProjectIssueListRestResponse>(
    runtimeConfig,
    `${projectIssuesRestPath(ownerName, projectName)}${issueQueryString({
      assigneeId: input.assigneeId,
      assigneeLoginId: input.assigneeLoginId,
      authorLoginId: input.authorLoginId,
      labelIds: input.labelIds,
      milestoneId: input.milestoneId,
      pageNum: input.pageNum ?? 1,
      state: input.state,
    })}`,
    { fetchImpl },
  );
}

export async function listUserIssues(
  runtimeConfig: RuntimeConfig,
  input: UserIssueListOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<UserIssueListRestResponse> {
  return restFetch<UserIssueListRestResponse>(
    runtimeConfig,
    `/user/issues${issueQueryString({
      filter: input.filter,
      orderBy: input.orderBy,
      orderDir: input.orderDir,
      pageNum: input.pageNum ?? 1,
      pageSize: input.pageSize,
      query: input.query,
      state: input.state,
    })}`,
    { fetchImpl },
  );
}

export async function readIssueDetail(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  issueNumber: bigint | number,
  fetchImpl: typeof fetch = fetch,
): Promise<RestIssueDetailResponse> {
  return restFetch<RestIssueDetailResponse>(
    runtimeConfig,
    projectIssueDetailRestPath(ownerName, projectName, issueNumber),
    { fetchImpl },
  );
}

export async function readDirectIssueFormOptions(
  runtimeConfig: RuntimeConfig,
  input: { commentId?: bigint | number | string | null; mine?: boolean } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<DirectIssueFormOptionsResponse> {
  const response = await restFetch<DirectIssueFormOptionsResponse>(
    runtimeConfig,
    `/user/issues/new-options${issueQueryString({
      commentId: input.commentId,
      mine: input.mine ? "true" : undefined,
    })}`,
    { fetchImpl },
  );
  return {
    bodyMarkdown: response.bodyMarkdown ?? "",
    referCommentId: response.referCommentId ?? "",
    selectedProject: {
      ownerName: response.selectedProject?.ownerName ?? "",
      projectName: response.selectedProject?.projectName ?? "",
    },
  };
}

export async function listIssueParentOptions(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: { currentIssueNumber?: bigint | number | string | null } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<IssueParentOptionsResponse> {
  return restFetch<IssueParentOptionsResponse>(
    runtimeConfig,
    `${projectIssuesRestPath(ownerName, projectName)}/parent-options${issueQueryString({
      currentIssueNumber: input.currentIssueNumber,
    })}`,
    { fetchImpl },
  );
}

export async function updateIssueState(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    `${projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n)}/state`,
    {
      body: { state: input.state ?? "" },
      csrfToken,
      fetchImpl,
      method: "PUT",
    },
  );
}

export async function updateIssueWeight(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  delta: 1 | -1,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueWeightResponse> {
  return restFetch<IssueWeightResponse>(
    runtimeConfig,
    `${projectIssueDetailRestPath(
      input.ownerName ?? "",
      input.projectName ?? "",
      input.issueNumber ?? 0n,
    )}/${delta > 0 ? "upvoteWeight" : "downvoteWeight"}`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export async function createIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput & {
    dueDate?: string;
    isDraft?: boolean;
    isPublish?: boolean;
    parentIssueId?: bigint | number | string | null;
    referCommentId?: bigint | number | string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<RestIssueDetailResponse> {
  return restFetch<RestIssueDetailResponse>(
    runtimeConfig,
    projectIssuesRestPath(input.ownerName ?? "", input.projectName ?? ""),
    {
      body: issueMutationRestBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export async function updateIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput & {
    dueDate?: string;
    isDraft?: boolean;
    isPublish?: boolean;
    parentIssueId?: bigint | number | string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<RestIssueDetailResponse> {
  return restFetch<RestIssueDetailResponse>(
    runtimeConfig,
    projectIssueDetailRestPath(
      input.ownerName ?? "",
      input.projectName ?? "",
      input.issueNumber ?? 0n,
    ),
    {
      body: issueMutationRestBody(input),
      csrfToken,
      fetchImpl,
      method: "PUT",
    },
  );
}

export async function deleteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await restFetch(
    runtimeConfig,
    projectIssueDetailRestPath(
      input.ownerName ?? "",
      input.projectName ?? "",
      input.issueNumber ?? 0n,
    ),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export async function createIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput & {
    parentCommentId?: bigint | number | string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    `${projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n)}/comments`,
    {
      body: issueCommentRestBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export async function updateIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    `${projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n)}/comments/${String(input.commentId ?? 0n)}`,
    {
      body: issueCommentRestBody(input),
      csrfToken,
      fetchImpl,
      method: "PUT",
    },
  );
}

export async function deleteIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    `${projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n)}/comments/${String(input.commentId ?? 0n)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export async function watchIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return watchIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function unwatchIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unwatchIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function voteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return voteIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function unvoteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unvoteIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function voteIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return voteIssueCommentRest(
    runtimeConfig,
    csrfToken,
    {
      commentId: input.commentId ?? 0n,
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function unvoteIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unvoteIssueCommentRest(
    runtimeConfig,
    csrfToken,
    {
      commentId: input.commentId ?? 0n,
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function toggleFavoriteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return toggleFavoriteIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function assignIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return assignIssueRest(
    runtimeConfig,
    csrfToken,
    {
      assigneeLoginId: input.assigneeLoginId ?? "",
      issueNumber: input.issueNumber ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function searchIssueAssignableUsers(
  runtimeConfig: RuntimeConfig,
  input: IssueAssignableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  return searchIssueAssignableUsersRest(runtimeConfig, input, fetchImpl);
}

export async function searchIssueSharableUsers(
  runtimeConfig: RuntimeConfig,
  input: IssueSharableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  return searchIssueSharableUsersRest(runtimeConfig, input, fetchImpl);
}

export async function searchIssueMentionUsers(
  runtimeConfig: RuntimeConfig,
  input: IssueMentionUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueMentionUsersResponse> {
  return searchIssueMentionUsersRest(runtimeConfig, input, fetchImpl);
}

export async function searchProjectAssignableUsers(
  runtimeConfig: RuntimeConfig,
  input: ProjectAssignableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  return searchProjectAssignableUsersRest(runtimeConfig, input, fetchImpl);
}

export async function searchProjectIssueReferences(
  runtimeConfig: RuntimeConfig,
  input: ProjectIssueReferencesInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectIssueReferencesResponse> {
  return searchProjectIssueReferencesRest(runtimeConfig, input, fetchImpl);
}

export async function listNotifications(
  runtimeConfig: RuntimeConfig,
  input: NotificationsListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<NotificationsListResponse> {
  return listNotificationsRest(runtimeConfig, input, fetchImpl);
}

export async function shareIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueShareClientInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return shareIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      loginId: input.loginId ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
      targetType: input.targetType,
    },
    fetchImpl,
  );
}

export async function unshareIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueShareClientInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unshareIssueRest(
    runtimeConfig,
    csrfToken,
    {
      issueNumber: input.issueNumber ?? 0n,
      loginId: input.loginId ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
      targetType: input.targetType,
    },
    fetchImpl,
  );
}

export async function massUpdateIssues(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<MassUpdateIssuesResponse> {
  return restFetch<MassUpdateIssuesResponse>(
    runtimeConfig,
    `${projectIssuesRestPath(input.ownerName ?? "", input.projectName ?? "")}/mass-update`,
    {
      body: massUpdateIssuesRestBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export async function listProjectLabels(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectLabelsResponse> {
  return listProjectLabelsRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function listProjectLabelCategories(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectLabelCategoriesResponse> {
  return listProjectLabelCategoriesRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function createProjectLabel(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return createProjectLabelRest(
    runtimeConfig,
    csrfToken,
    {
      categoryIsExclusive: input.categoryIsExclusive ?? false,
      categoryName: input.categoryName ?? "",
      labelColor: input.labelColor ?? "",
      labelName: input.labelName ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function updateProjectLabel(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return updateProjectLabelRest(
    runtimeConfig,
    csrfToken,
    {
      categoryId: input.categoryId ?? 0n,
      labelColor: input.labelColor ?? "",
      labelId: input.labelId ?? 0n,
      labelName: input.labelName ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function deleteProjectLabel(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await deleteProjectLabelRest(
    runtimeConfig,
    csrfToken,
    {
      labelId: input.labelId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function copyProjectLabels(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: {
    fromOwnerName: string;
    fromProjectName: string;
    ownerName: string;
    projectName: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCopyResponse> {
  return copyProjectLabelsRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function createProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return createProjectLabelCategoryRest(
    runtimeConfig,
    csrfToken,
    {
      categoryIsExclusive: input.categoryIsExclusive ?? false,
      categoryName: input.categoryName ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function updateProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return updateProjectLabelCategoryRest(
    runtimeConfig,
    csrfToken,
    {
      categoryId: input.categoryId ?? 0n,
      categoryIsExclusive: input.categoryIsExclusive ?? false,
      categoryName: input.categoryName ?? "",
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function deleteProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await deleteProjectLabelCategoryRest(
    runtimeConfig,
    csrfToken,
    {
      categoryId: input.categoryId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function listProjectMilestones(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: ProjectMilestoneListOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectMilestonesResponse> {
  return listProjectMilestonesRest(runtimeConfig, ownerName, projectName, input, fetchImpl);
}

export async function readProjectMilestone(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  milestoneId: bigint | number,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return readProjectMilestoneRest(runtimeConfig, ownerName, projectName, milestoneId, fetchImpl);
}

export async function createProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return createProjectMilestoneRest(
    runtimeConfig,
    csrfToken,
    {
      attachmentIds: input.attachmentIds,
      contentsMarkdown: input.contentsMarkdown,
      dueDate: input.dueDate,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
      state: input.state,
      title: input.title ?? "",
    },
    fetchImpl,
  );
}

export async function updateProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return updateProjectMilestoneRest(
    runtimeConfig,
    csrfToken,
    {
      attachmentIds: input.attachmentIds,
      contentsMarkdown: input.contentsMarkdown,
      dueDate: input.dueDate,
      milestoneId: input.milestoneId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
      state: input.state,
      title: input.title ?? "",
    },
    fetchImpl,
  );
}

export async function deleteProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneDeleteResponse> {
  return deleteProjectMilestoneRest(
    runtimeConfig,
    csrfToken,
    {
      milestoneId: input.milestoneId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function openProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return openProjectMilestoneRest(
    runtimeConfig,
    csrfToken,
    {
      milestoneId: input.milestoneId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function closeProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return closeProjectMilestoneRest(
    runtimeConfig,
    csrfToken,
    {
      milestoneId: input.milestoneId ?? 0n,
      ownerName: input.ownerName ?? "",
      projectName: input.projectName ?? "",
    },
    fetchImpl,
  );
}

export async function setDefaultLandingPath(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return setDefaultLandingPathRest(runtimeConfig, csrfToken, path, fetchImpl);
}

export async function updateProfile(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return updateProfileRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function changePassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
) {
  return changePasswordRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function resetVisitedProjects(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return resetVisitedProjectsRest(runtimeConfig, csrfToken, fetchImpl);
}

export async function addWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return addWorkspaceEmailRest(runtimeConfig, csrfToken, email, fetchImpl);
}

export async function deleteWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return deleteWorkspaceEmailRest(runtimeConfig, csrfToken, id, fetchImpl);
}

export async function sendWorkspaceEmailValidation(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return sendWorkspaceEmailValidationRest(runtimeConfig, csrfToken, id, fetchImpl);
}

export async function setMainWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return setMainWorkspaceEmailRest(runtimeConfig, csrfToken, id, fetchImpl);
}

export async function resetApiToken(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return resetApiTokenRest(runtimeConfig, csrfToken, fetchImpl);
}

export async function toggleWorkspaceNotification(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  projectId: string,
  eventType: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return toggleWorkspaceNotificationRest(
    runtimeConfig,
    csrfToken,
    { eventType, projectId },
    fetchImpl,
  );
}

export async function createOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createOrganizationRest(
    runtimeConfig,
    csrfToken,
    {
      description: input.description ?? "",
      organizationName: input.organizationName ?? "",
    },
    fetchImpl,
  );
}

export async function readOrganizationDetail(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return readOrganizationDetailRest(runtimeConfig, organizationName, fetchImpl);
}

export async function readOrganizationAdmin(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return readOrganizationAdminRest(runtimeConfig, organizationName, fetchImpl);
}

export async function readOrganizationContainer(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return readOrganizationContainerRest(runtimeConfig, organizationName, fetchImpl);
}

export async function readOrganizationSettings(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return readOrganizationSettingsRest(runtimeConfig, organizationName, fetchImpl);
}

export async function readOrganizationMembers(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadOrganizationMembersResponse> {
  return readOrganizationMembersRest(runtimeConfig, organizationName, fetchImpl);
}

export async function updateOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return updateOrganizationRest(
    runtimeConfig,
    csrfToken,
    input.currentOrganizationName ?? "",
    {
      description: input.description ?? "",
      organizationName: input.organizationName ?? "",
    },
    fetchImpl,
  );
}

export async function addOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return addOrganizationMemberRest(
    runtimeConfig,
    csrfToken,
    {
      loginId: input.loginId ?? "",
      organizationName: input.organizationName ?? "",
    },
    fetchImpl,
  );
}

export async function updateOrganizationMemberRole(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return updateOrganizationMemberRoleRest(
    runtimeConfig,
    csrfToken,
    {
      organizationName: input.organizationName ?? "",
      role: input.role ?? "",
      userId: input.userId ?? 0n,
    },
    fetchImpl,
  );
}

export async function deleteOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return deleteOrganizationMemberRest(
    runtimeConfig,
    csrfToken,
    {
      organizationName: input.organizationName ?? "",
      userId: input.userId ?? 0n,
    },
    fetchImpl,
  );
}

export async function acceptOrganizationEnrollment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return acceptOrganizationEnrollmentRest(
    runtimeConfig,
    csrfToken,
    {
      organizationName: input.organizationName ?? "",
      userId: input.userId ?? 0n,
    },
    fetchImpl,
  );
}

export async function enrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return enrollOrganizationRest(runtimeConfig, csrfToken, organizationName, fetchImpl);
}

export async function cancelEnrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return cancelEnrollOrganizationRest(runtimeConfig, csrfToken, organizationName, fetchImpl);
}

export async function leaveOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return leaveOrganizationRest(runtimeConfig, csrfToken, organizationName, fetchImpl);
}

export async function deleteOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return deleteOrganizationRest(runtimeConfig, csrfToken, organizationName, fetchImpl);
}

export async function createProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput & ProjectMenuSettingsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createProjectRest(
    runtimeConfig,
    csrfToken,
    input.ownerName ?? "",
    {
      ...projectMenuSettingsInput(input),
      overview: input.overview ?? "",
      projectName: input.projectName ?? "",
      projectScope: input.projectScope ?? "",
      vcs: input.vcs,
    },
    fetchImpl,
  );
}

export async function readProjectDetail(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return readProjectDetailRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function readProjectContainer(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return readProjectContainerRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function readProjectSettings(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return readProjectSettingsRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function readProjectMembers(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadProjectMembersResponse> {
  return readProjectMembersRest(runtimeConfig, ownerName, projectName, fetchImpl);
}

export async function updateProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput & ProjectMenuSettingsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return updateProjectRest(
    runtimeConfig,
    csrfToken,
    input.currentOwnerName ?? "",
    input.currentProjectName ?? "",
    {
      ...projectMenuSettingsInput(input),
      defaultReviewerCount: input.defaultReviewerCount,
      isUsingReviewerCount: input.isUsingReviewerCount,
      ownerName: input.ownerName ?? "",
      overview: input.overview ?? "",
      projectName: input.projectName ?? "",
      projectScope: input.projectScope ?? "",
    },
    fetchImpl,
  );
}

type ProjectMenuSettingsInput = {
  board?: boolean;
  code?: boolean;
  defaultReviewerCount?: number;
  issue?: boolean;
  isUsingReviewerCount?: boolean;
  milestone?: boolean;
  pullRequest?: boolean;
  review?: boolean;
  vcs?: string;
};

function projectMenuSettingsInput(input: ProjectMenuSettingsInput): ProjectMenuSettingsInput {
  return {
    ...(input.board !== undefined ? { board: input.board } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.issue !== undefined ? { issue: input.issue } : {}),
    ...(input.milestone !== undefined ? { milestone: input.milestone } : {}),
    ...(input.pullRequest !== undefined ? { pullRequest: input.pullRequest } : {}),
    ...(input.review !== undefined ? { review: input.review } : {}),
  };
}

export async function readCodeBrowser(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: CodeBrowserOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCodeBrowserResponse> {
  const searchParams = new URLSearchParams();
  if (input.branch) {
    searchParams.set("branch", input.branch);
  }
  if (input.path) {
    searchParams.set("path", input.path);
  }
  const query = searchParams.toString();
  const path = `/projects/${encodeURIComponent(ownerName)}/${encodeURIComponent(projectName)}/code${
    query ? `?${query}` : ""
  }`;
  return restFetch<ReadCodeBrowserResponse>(runtimeConfig, path, {
    fetchImpl,
    method: "GET",
  });
}

export async function updateProjectOverview(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: RequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return updateProjectOverviewRest(
    runtimeConfig,
    csrfToken,
    input.ownerName ?? "",
    input.projectName ?? "",
    input.overview ?? "",
    fetchImpl,
  );
}

export async function enrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return enrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName, fetchImpl);
}

export async function cancelEnrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return cancelEnrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName, fetchImpl);
}

export async function toggleFavoriteProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ToggleFavoriteProjectResponse> {
  return toggleFavoriteProjectRest(runtimeConfig, csrfToken, ownerName, projectName, fetchImpl);
}

export async function toggleProjectWatch(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  watching: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return toggleProjectWatchRest(
    runtimeConfig,
    csrfToken,
    ownerName,
    projectName,
    watching,
    fetchImpl,
  );
}

export async function recordRecentProjectVisit(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordRecentProjectVisitResponse> {
  return recordRecentProjectVisitRest(
    runtimeConfig,
    csrfToken,
    { ownerName, projectName },
    fetchImpl,
  );
}
