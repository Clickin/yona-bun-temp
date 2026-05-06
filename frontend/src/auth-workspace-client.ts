import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { create } from "@bufbuild/protobuf";
import {
  AcceptOrganizationEnrollmentRequestSchema,
  AddOrganizationMemberRequestSchema,
  AddWorkspaceEmailRequestSchema,
  ChangePasswordRequestSchema,
  CancelEnrollOrganizationRequestSchema,
  CancelEnrollProjectRequestSchema,
  AssignIssueRequestSchema,
  CreateIssueCommentRequestSchema,
  CreateIssueRequestSchema,
  CreateProjectMilestoneRequestSchema,
  CreateProjectLabelCategoryRequestSchema,
  CreateProjectLabelRequestSchema,
  DeleteIssueCommentRequestSchema,
  CreateOrganizationRequestSchema,
  CreateProjectRequestSchema,
  DeleteIssueRequestSchema,
  DeleteProjectMilestoneRequestSchema,
  DeleteProjectLabelCategoryRequestSchema,
  DeleteProjectLabelRequestSchema,
  DeleteOrganizationMemberRequestSchema,
  DeleteOrganizationRequestSchema,
  DeleteWorkspaceEmailRequestSchema,
  EnrollOrganizationRequestSchema,
  EnrollProjectRequestSchema,
  IssueCommentParticipationRequestSchema,
  ListOrganizationsRequestSchema,
  ListProjectsRequestSchema,
  PilotService,
  ResetApiTokenRequestSchema,
  ResetVisitedProjectsRequestSchema,
  ReadCodeBrowserRequestSchema,
  LeaveOrganizationRequestSchema,
  IssueParticipationRequestSchema,
  IssueShareRequestSchema,
  ListProjectLabelsRequestSchema,
  ListProjectMilestonesRequestSchema,
  MassUpdateIssuesRequestSchema,
  MilestoneStateMutationRequestSchema,
  ReadOrganizationAdminRequestSchema,
  ReadOrganizationContainerRequestSchema,
  ReadOrganizationDetailRequestSchema,
  ReadOrganizationMembersRequestSchema,
  ReadOrganizationSettingsRequestSchema,
  ReadProjectMilestoneRequestSchema,
  ReadProjectContainerRequestSchema,
  ReadProjectDetailRequestSchema,
  ReadProjectMembersRequestSchema,
  ReadProjectSettingsRequestSchema,
  ReadWorkspaceOverviewRequestSchema,
  RecordRecentProjectVisitRequestSchema,
  RegisterWithPasswordRequestSchema,
  SendWorkspaceEmailValidationRequestSchema,
  SetMainWorkspaceEmailRequestSchema,
  SetDefaultLandingPathRequestSchema,
  SignInWithPasswordRequestSchema,
  SignOutRequestSchema,
  ToggleWorkspaceNotificationRequestSchema,
  ToggleFavoriteProjectRequestSchema,
  ToggleProjectWatchRequestSchema,
  UpdateOrganizationMemberRoleRequestSchema,
  UpdateProfileRequestSchema,
  UpdateOrganizationRequestSchema,
  UpdateProjectRequestSchema,
  UpdateProjectOverviewRequestSchema,
  UpdateIssueStateRequestSchema,
  UpdateIssueCommentRequestSchema,
  UpdateIssueRequestSchema,
  UpdateProjectMilestoneRequestSchema,
  UpdateProjectLabelCategoryRequestSchema,
  UpdateProjectLabelRequestSchema,
  VerifyUserRequestSchema,
  type ListProjectLabelCategoriesResponse,
  type ListOrganizationIssuesResponse,
  type ListProjectIssuesResponse,
  type ListUserIssuesResponse,
  type ListProjectLabelsResponse,
  type ListProjectMilestonesResponse,
  type MassUpdateIssuesResponse,
  type OrganizationAdminView,
  type OrganizationContainer,
  type OrganizationDetail,
  type OrganizationRedirectResult,
  type ListOrganizationsResponse,
  type ListProjectsResponse,
  type ProjectContainer,
  type ProjectDetail,
  type ProjectLabelCategoryMutationResponse,
  type ProjectLabelMutationResponse,
  type ProjectMilestoneDeleteResponse,
  type ProjectMilestoneMutationResponse,
  type ReadCodeBrowserResponse,
  type ReadIssueDetailResponse,
  type ReadCurrentSessionResponse,
  type ReadOrganizationMembersResponse,
  type ReadProjectMembersResponse,
  type ReadWorkspaceOverviewResponse,
  type RecordRecentProjectVisitResponse,
  type ToggleFavoriteProjectResponse,
} from "./gen/yona/pilot/v1/pilot_pb";
import {
  readAuthUiCapabilitiesRest,
  registerWithPasswordRest,
  signInWithPasswordRest,
  signOutRest,
  verifyUserRest,
} from "./api/auth";
import {
  assignIssueRest,
  shareIssueRest,
  toggleFavoriteIssueRest,
  unshareIssueRest,
  unvoteIssueCommentRest,
  unvoteIssueRest,
  unwatchIssueRest,
  voteIssueCommentRest,
  voteIssueRest,
  watchIssueRest,
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
  createProjectLabelCategoryRest,
  createProjectLabelRest,
  deleteProjectLabelCategoryRest,
  deleteProjectLabelRest,
  listProjectLabelCategoriesRest,
  listProjectLabelsRest,
  updateProjectLabelCategoryRest,
  updateProjectLabelRest,
} from "./api/project-labels";
import { restFetch } from "./api/rest-client";
import { readCurrentSessionRest } from "./api/session";
import { prefixBasePath, type RuntimeConfig } from "./runtime-config";

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
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
  projectNames?: string[];
  state?: string;
}

export interface UserIssueListOptions {
  filter?: string;
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
  pageSize?: number;
  query?: string;
  state?: string;
}

export interface CodeBrowserOptions {
  branch?: string;
  path?: string;
}

export interface ProjectMilestoneListOptions {
  orderBy?: string;
  orderDir?: string;
  state?: string;
}

function createFetchWithCredentials(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) =>
    fetchImpl(input, {
      ...init,
      credentials: "include",
    });
}

function createPilotClient(runtimeConfig: RuntimeConfig, fetchImpl: typeof fetch = fetch) {
  const transport = createConnectTransport({
    baseUrl: runtimeConfig.rpcBaseUrl,
    fetch: createFetchWithCredentials(fetchImpl),
    useBinaryFormat: false,
  });
  return createClient(PilotService, transport);
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
  input: MessageInitShape<typeof SignInWithPasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return signInWithPasswordRest(runtimeConfig, csrfToken, input, fetchImpl);
}

export async function registerWithPassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof RegisterWithPasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return registerWithPasswordRest(runtimeConfig, csrfToken, input, fetchImpl);
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
  input: MessageInitShape<typeof VerifyUserRequestSchema>,
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
  return createPilotClient(runtimeConfig, fetchImpl).readWorkspaceOverview(
    create(ReadWorkspaceOverviewRequestSchema),
  );
}

export async function listProjects(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).listProjects(
    create(ListProjectsRequestSchema),
  );
}

export async function listOrganizations(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListOrganizationsResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).listOrganizations(
    create(ListOrganizationsRequestSchema),
  );
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
  values: Record<string, Array<bigint | number | string> | bigint | number | string | null | undefined>,
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

function issueMutationRestBody(
  input:
    | MessageInitShape<typeof CreateIssueRequestSchema>
    | MessageInitShape<typeof UpdateIssueRequestSchema>,
) {
  return {
    assigneeLoginId: input.assigneeLoginId ?? "",
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown ?? "",
    labelIds: input.labelIds ?? [],
    milestoneId: input.milestoneId && input.milestoneId !== 0n ? input.milestoneId : undefined,
    title: input.title ?? "",
  };
}

function issueCommentRestBody(
  input:
    | MessageInitShape<typeof CreateIssueCommentRequestSchema>
    | MessageInitShape<typeof UpdateIssueCommentRequestSchema>,
) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    contentsMarkdown: input.contentsMarkdown ?? "",
  };
}

function massUpdateIssuesRestBody(input: MessageInitShape<typeof MassUpdateIssuesRequestSchema>) {
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
): Promise<ListOrganizationIssuesResponse> {
  return restFetch<ListOrganizationIssuesResponse>(
    runtimeConfig,
    `/organizations/${encodeIssuePathSegment(organizationName)}/issues${issueQueryString({
      assigneeId: input.assigneeId,
      authorId: input.authorId,
      filter: input.filter,
      itemsPerPage: input.itemsPerPage,
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
): Promise<ListProjectIssuesResponse> {
  return restFetch<ListProjectIssuesResponse>(
    runtimeConfig,
    `${projectIssuesRestPath(ownerName, projectName)}${issueQueryString({
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
): Promise<ListUserIssuesResponse> {
  return restFetch<ListUserIssuesResponse>(
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
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    projectIssueDetailRestPath(ownerName, projectName, issueNumber),
    { fetchImpl },
  );
}

export async function updateIssueState(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateIssueStateRequestSchema>,
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

export async function createIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateIssueRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
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
  input: MessageInitShape<typeof UpdateIssueRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n),
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
  input: MessageInitShape<typeof DeleteIssueRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await restFetch(
    runtimeConfig,
    projectIssueDetailRestPath(input.ownerName ?? "", input.projectName ?? "", input.issueNumber ?? 0n),
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
  input: MessageInitShape<typeof CreateIssueCommentRequestSchema>,
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
  input: MessageInitShape<typeof UpdateIssueCommentRequestSchema>,
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
  input: MessageInitShape<typeof DeleteIssueCommentRequestSchema>,
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
  input: MessageInitShape<typeof IssueParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return watchIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function unwatchIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unwatchIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function voteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return voteIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function unvoteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unvoteIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function voteIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueCommentParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return voteIssueCommentRest(runtimeConfig, csrfToken, {
    commentId: input.commentId ?? 0n,
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function unvoteIssueComment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueCommentParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unvoteIssueCommentRest(runtimeConfig, csrfToken, {
    commentId: input.commentId ?? 0n,
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function toggleFavoriteIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueParticipationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return toggleFavoriteIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function assignIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof AssignIssueRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return assignIssueRest(runtimeConfig, csrfToken, {
    assigneeLoginId: input.assigneeLoginId ?? "",
    issueNumber: input.issueNumber ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function shareIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueShareRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return shareIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    loginId: input.loginId ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function unshareIssue(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof IssueShareRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return unshareIssueRest(runtimeConfig, csrfToken, {
    issueNumber: input.issueNumber ?? 0n,
    loginId: input.loginId ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function massUpdateIssues(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof MassUpdateIssuesRequestSchema>,
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
  input: MessageInitShape<typeof CreateProjectLabelRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return createProjectLabelRest(runtimeConfig, csrfToken, {
    categoryIsExclusive: input.categoryIsExclusive ?? false,
    categoryName: input.categoryName ?? "",
    labelColor: input.labelColor ?? "",
    labelName: input.labelName ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function updateProjectLabel(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectLabelRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelMutationResponse> {
  return updateProjectLabelRest(runtimeConfig, csrfToken, {
    categoryId: input.categoryId ?? 0n,
    labelColor: input.labelColor ?? "",
    labelId: input.labelId ?? 0n,
    labelName: input.labelName ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function deleteProjectLabel(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof DeleteProjectLabelRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await deleteProjectLabelRest(runtimeConfig, csrfToken, {
    labelId: input.labelId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function createProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateProjectLabelCategoryRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return createProjectLabelCategoryRest(runtimeConfig, csrfToken, {
    categoryIsExclusive: input.categoryIsExclusive ?? false,
    categoryName: input.categoryName ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function updateProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectLabelCategoryRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectLabelCategoryMutationResponse> {
  return updateProjectLabelCategoryRest(runtimeConfig, csrfToken, {
    categoryId: input.categoryId ?? 0n,
    categoryIsExclusive: input.categoryIsExclusive ?? false,
    categoryName: input.categoryName ?? "",
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function deleteProjectLabelCategory(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof DeleteProjectLabelCategoryRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await deleteProjectLabelCategoryRest(runtimeConfig, csrfToken, {
    categoryId: input.categoryId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
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
  input: MessageInitShape<typeof CreateProjectMilestoneRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return createProjectMilestoneRest(runtimeConfig, csrfToken, {
    attachmentIds: input.attachmentIds,
    contentsMarkdown: input.contentsMarkdown,
    dueDate: input.dueDate,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
    state: input.state,
    title: input.title ?? "",
  }, fetchImpl);
}

export async function updateProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectMilestoneRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return updateProjectMilestoneRest(runtimeConfig, csrfToken, {
    attachmentIds: input.attachmentIds,
    contentsMarkdown: input.contentsMarkdown,
    dueDate: input.dueDate,
    milestoneId: input.milestoneId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
    state: input.state,
    title: input.title ?? "",
  }, fetchImpl);
}

export async function deleteProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof DeleteProjectMilestoneRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneDeleteResponse> {
  return deleteProjectMilestoneRest(runtimeConfig, csrfToken, {
    milestoneId: input.milestoneId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function openProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof MilestoneStateMutationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return openProjectMilestoneRest(runtimeConfig, csrfToken, {
    milestoneId: input.milestoneId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function closeProjectMilestone(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof MilestoneStateMutationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMilestoneMutationResponse> {
  return closeProjectMilestoneRest(runtimeConfig, csrfToken, {
    milestoneId: input.milestoneId ?? 0n,
    ownerName: input.ownerName ?? "",
    projectName: input.projectName ?? "",
  }, fetchImpl);
}

export async function setDefaultLandingPath(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).setDefaultLandingPath(
    create(SetDefaultLandingPathRequestSchema, { path }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function updateProfile(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProfileRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProfile(
    create(UpdateProfileRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function changePassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof ChangePasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).changePassword(
    create(ChangePasswordRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function resetVisitedProjects(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).resetVisitedProjects(
    create(ResetVisitedProjectsRequestSchema),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function addWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).addWorkspaceEmail(
    create(AddWorkspaceEmailRequestSchema, { email }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteWorkspaceEmail(
    create(DeleteWorkspaceEmailRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function sendWorkspaceEmailValidation(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).sendWorkspaceEmailValidation(
    create(SendWorkspaceEmailValidationRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function setMainWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).setMainWorkspaceEmail(
    create(SetMainWorkspaceEmailRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function resetApiToken(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).resetApiToken(
    create(ResetApiTokenRequestSchema),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function toggleWorkspaceNotification(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  projectId: string,
  eventType: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleWorkspaceNotification(
    create(ToggleWorkspaceNotificationRequestSchema, { eventType, projectId }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function createOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateOrganizationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).createOrganization(
    create(CreateOrganizationRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readOrganizationDetail(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationDetail(
    create(ReadOrganizationDetailRequestSchema, { organizationName }),
  );
}

export async function readOrganizationAdmin(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationAdmin(
    create(ReadOrganizationAdminRequestSchema, { organizationName }),
  );
}

export async function readOrganizationContainer(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationContainer(
    create(ReadOrganizationContainerRequestSchema, { organizationName }),
  );
}

export async function readOrganizationSettings(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationSettings(
    create(ReadOrganizationSettingsRequestSchema, { organizationName }),
  );
}

export async function readOrganizationMembers(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadOrganizationMembersResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationMembers(
    create(ReadOrganizationMembersRequestSchema, { organizationName }),
  );
}

export async function updateOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateOrganizationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).updateOrganization(
    create(UpdateOrganizationRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function addOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof AddOrganizationMemberRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).addOrganizationMember(
    create(AddOrganizationMemberRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function updateOrganizationMemberRole(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateOrganizationMemberRoleRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).updateOrganizationMemberRole(
    create(UpdateOrganizationMemberRoleRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof DeleteOrganizationMemberRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteOrganizationMember(
    create(DeleteOrganizationMemberRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function acceptOrganizationEnrollment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof AcceptOrganizationEnrollmentRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).acceptOrganizationEnrollment(
    create(AcceptOrganizationEnrollmentRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function enrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).enrollOrganization(
    create(EnrollOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function cancelEnrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).cancelEnrollOrganization(
    create(CancelEnrollOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function leaveOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return createPilotClient(runtimeConfig, fetchImpl).leaveOrganization(
    create(LeaveOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteOrganization(
    create(DeleteOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function createProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateProjectRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).createProject(
    create(CreateProjectRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readProjectDetail(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectDetail(
    create(ReadProjectDetailRequestSchema, { ownerName, projectName }),
  );
}

export async function readProjectContainer(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectContainer(
    create(ReadProjectContainerRequestSchema, { ownerName, projectName }),
  );
}

export async function readProjectSettings(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectSettings(
    create(ReadProjectSettingsRequestSchema, { ownerName, projectName }),
  );
}

export async function readProjectMembers(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadProjectMembersResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectMembers(
    create(ReadProjectMembersRequestSchema, { ownerName, projectName }),
  );
}

export async function updateProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProject(
    create(UpdateProjectRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readCodeBrowser(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  input: CodeBrowserOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCodeBrowserResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readCodeBrowser(
    create(ReadCodeBrowserRequestSchema, {
      branch: input.branch ?? "",
      ownerName,
      path: input.path ?? "",
      projectName,
    }),
  );
}

export async function updateProjectOverview(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectOverviewRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProjectOverview(
    create(UpdateProjectOverviewRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function enrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).enrollProject(
    create(EnrollProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function cancelEnrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).cancelEnrollProject(
    create(CancelEnrollProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function toggleFavoriteProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ToggleFavoriteProjectResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleFavoriteProject(
    create(ToggleFavoriteProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function toggleProjectWatch(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  watching: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleProjectWatch(
    create(ToggleProjectWatchRequestSchema, { ownerName, projectName, watching }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function recordRecentProjectVisit(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordRecentProjectVisitResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).recordRecentProjectVisit(
    create(RecordRecentProjectVisitRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}
