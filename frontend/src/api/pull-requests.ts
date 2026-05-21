import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type PullRequestListCategory = "closed" | "open" | "sent";
export type PullRequestState = "closed" | "conflict" | "merged" | "open" | string;

export type PullRequestListQuery = {
  category: PullRequestListCategory | string;
  contributorId?: number;
  filter?: string;
  pageNum?: number;
};

export type OrganizationPullRequestListQuery = {
  category: "closed" | "open" | string;
  filter?: string;
  pageNum?: number;
};

export type ReviewThreadListQuery = {
  authorId?: number;
  filter?: string;
  orderBy?: "createdDate" | "updatedDate" | string;
  orderDir?: "asc" | "desc" | string;
  pageNum?: number;
  participantId?: number;
  state?: "closed" | "open" | string;
};

export type PullRequestListItem = {
  commentThreadCount: number;
  conflict: boolean;
  contributorLabel: string;
  contributorLoginId: string;
  createdLabel: string;
  fromBranch: string;
  fromOwnerName: string;
  fromProjectName: string;
  id: number;
  ownerName: string;
  projectName: string;
  pullRequestNumber: number;
  receiverLabel: string;
  receiverLoginId: string;
  reviewerCount: number;
  state: PullRequestState;
  title: string;
  toBranch: string;
  updatedLabel: string;
};

export type PullRequestListResponse = {
  category: string;
  items: PullRequestListItem[];
  pageNum: number;
  pageSize: number;
  totalCount: number;
};

export type PullRequestUser = {
  loginId: string;
  userId: number;
  userLabel: string;
};

export type PullRequestPermissions = {
  canComment: boolean;
  canDeleteSourceBranch: boolean;
  canRead: boolean;
  canReadChanges: boolean;
  canReview: boolean;
  canRestoreSourceBranch: boolean;
  canUpdate: boolean;
  canUpdateState: boolean;
};

export type PullRequestEvent = {
  createdLabel: string;
  eventType: string;
  id: number;
  newValue: string;
  oldValue: string;
  senderLoginId: string;
};

export type ReviewComment = {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  canDelete: boolean;
  contentsHtml: string;
  contentsMarkdown: string;
  createdLabel: string;
  id: number;
  threadId: number;
};

export type ReviewThread = {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  comments: ReviewComment[];
  commitId: string;
  createdLabel: string;
  endLine?: number;
  endSide?: string;
  id: number;
  path: string;
  prevCommitId: string;
  startLine?: number;
  startSide?: string;
  state: string;
};

export type PullRequestCommit = {
  authorDateLabel: string;
  authorEmail: string;
  commitId: string;
  commitMessage: string;
  commitShortId: string;
  state: string;
};

export type PullRequestDetailResponse = {
  bodyHtml: string;
  bodyMarkdown: string;
  commits: PullRequestCommit[];
  conflict: boolean;
  contributor: PullRequestUser;
  createdLabel: string;
  events: PullRequestEvent[];
  fromBranch: string;
  fromOwnerName: string;
  fromProjectName: string;
  id: number;
  isWatching: boolean;
  mergedCommitIdFrom: string;
  mergedCommitIdTo: string;
  ownerName: string;
  permissions: PullRequestPermissions;
  projectName: string;
  pullRequestNumber: number;
  receiver: PullRequestUser;
  reviewers: PullRequestUser[];
  sourceBranchExists: boolean;
  state: PullRequestState;
  threads: ReviewThread[];
  title: string;
  toBranch: string;
  updatedLabel: string;
  watcherCount: number;
};

export type PullRequestChangedFile = {
  path: string;
  patch: string;
};

export type PullRequestChangesResponse = {
  commits: PullRequestCommit[];
  files: PullRequestChangedFile[];
  pullRequest: PullRequestDetailResponse;
  threads: ReviewThread[];
};

export type PullRequestProjectOption = {
  id: number;
  ownerName: string;
  projectName: string;
  selected: boolean;
};

export type PullRequestBranchOption = {
  name: string;
  selected: boolean;
};

export type PullRequestFormSelected = {
  fromBranch: string;
  fromProjectId: number;
  toBranch: string;
  toProjectId: number;
};

export type PullRequestFormOptionsResponse = {
  fromBranches: PullRequestBranchOption[];
  fromProjects: PullRequestProjectOption[];
  mode: "create" | "edit" | string;
  pullRequest?: PullRequestDetailResponse;
  selected: PullRequestFormSelected;
  toBranches: PullRequestBranchOption[];
  toProjects: PullRequestProjectOption[];
};

export type PullRequestFormOptionsQuery = Partial<PullRequestFormSelected>;

export type PullRequestCreateInput = ProjectScopeInput & {
  attachmentIds?: number[];
  bodyMarkdown: string;
  fromBranch: string;
  fromProjectId: number;
  title: string;
  toBranch: string;
  toProjectId: number;
};

export type PullRequestEditInput = PullRequestScopeInput & {
  attachmentIds?: number[];
  bodyMarkdown: string;
  title: string;
};

export type PullRequestCommentInput = PullRequestScopeInput & {
  attachmentIds?: number[];
  commitId?: string;
  contentsMarkdown: string;
  endLine?: number;
  endSide?: string;
  path?: string;
  prevCommitId?: string;
  startLine?: number;
  startSide?: string;
  threadId?: number;
};

export type PullRequestCommentEditInput = PullRequestScopeInput & {
  attachmentIds?: number[];
  commentId: number;
  contentsMarkdown: string;
};

export type ReviewThreadListResponse = {
  closedCount: number;
  items: ReviewThread[];
  openCount: number;
  pageNum: number;
  pageSize: number;
  state: string;
  totalCount: number;
};

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

type PullRequestScopeInput = ProjectScopeInput & {
  pullRequestNumber: bigint | number;
};

function toNumber(value: bigint | number): number {
  return Number(value);
}

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/owners/${encodeURIComponent(input.ownerName)}/projects/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function pullRequestPath(input: PullRequestScopeInput, suffix = ""): string {
  return `${projectPath(input)}/pull-requests/${toNumber(input.pullRequestNumber)}${suffix}`;
}

function pullRequestListSearch(input: PullRequestListQuery): string {
  const search = new URLSearchParams();
  search.set("category", input.category || "open");
  if (input.contributorId) {
    search.set("contributorId", String(input.contributorId));
  }
  if (input.filter) {
    search.set("filter", input.filter);
  }
  search.set("pageNum", String(input.pageNum || 1));
  return search.toString();
}

function organizationPullRequestListSearch(input: OrganizationPullRequestListQuery): string {
  const search = new URLSearchParams();
  search.set("category", input.category || "open");
  if (input.filter) {
    search.set("filter", input.filter);
  }
  search.set("pageNum", String(input.pageNum || 1));
  return search.toString();
}

function reviewThreadListSearch(input: ReviewThreadListQuery): string {
  const search = new URLSearchParams();
  search.set("state", input.state || "open");
  if (input.filter) {
    search.set("filter", input.filter);
  }
  if (input.authorId) {
    search.set("authorId", String(input.authorId));
  }
  if (input.participantId) {
    search.set("participantId", String(input.participantId));
  }
  if (input.orderBy) {
    search.set("orderBy", input.orderBy);
  }
  if (input.orderDir) {
    search.set("orderDir", input.orderDir);
  }
  search.set("pageNum", String(input.pageNum || 1));
  return search.toString();
}

function pullRequestFormOptionsSearch(input: PullRequestFormOptionsQuery = {}): string {
  const search = new URLSearchParams();
  if (input.fromProjectId) {
    search.set("fromProjectId", String(input.fromProjectId));
  }
  if (input.toProjectId) {
    search.set("toProjectId", String(input.toProjectId));
  }
  if (input.fromBranch) {
    search.set("fromBranch", input.fromBranch);
  }
  if (input.toBranch) {
    search.set("toBranch", input.toBranch);
  }
  const serialized = search.toString();
  return serialized === "" ? "" : `?${serialized}`;
}

function normalizeUser(user: Partial<PullRequestUser> | undefined): PullRequestUser {
  return {
    loginId: user?.loginId ?? "",
    userId: user?.userId ?? 0,
    userLabel: user?.userLabel ?? "",
  };
}

function normalizeListItem(item: Partial<PullRequestListItem>): PullRequestListItem {
  return {
    commentThreadCount: item.commentThreadCount ?? 0,
    conflict: item.conflict ?? false,
    contributorLabel: item.contributorLabel ?? "",
    contributorLoginId: item.contributorLoginId ?? "",
    createdLabel: item.createdLabel ?? "",
    fromBranch: item.fromBranch ?? "",
    fromOwnerName: item.fromOwnerName ?? "",
    fromProjectName: item.fromProjectName ?? "",
    id: item.id ?? 0,
    ownerName: item.ownerName ?? "",
    projectName: item.projectName ?? "",
    pullRequestNumber: item.pullRequestNumber ?? 0,
    receiverLabel: item.receiverLabel ?? "",
    receiverLoginId: item.receiverLoginId ?? "",
    reviewerCount: item.reviewerCount ?? 0,
    state: item.state ?? "open",
    title: item.title ?? "",
    toBranch: item.toBranch ?? "",
    updatedLabel: item.updatedLabel ?? "",
  };
}

function normalizeThread(thread: Partial<ReviewThread>): ReviewThread {
  return {
    authorId: thread.authorId ?? 0,
    authorLabel: thread.authorLabel ?? "",
    authorLoginId: thread.authorLoginId ?? "",
    comments: (thread.comments ?? []).map((comment) => ({
      authorId: comment.authorId ?? 0,
      authorLabel: comment.authorLabel ?? "",
      authorLoginId: comment.authorLoginId ?? "",
      canDelete: comment.canDelete ?? false,
      contentsHtml: comment.contentsHtml ?? "",
      contentsMarkdown: comment.contentsMarkdown ?? "",
      createdLabel: comment.createdLabel ?? "",
      id: comment.id ?? 0,
      threadId: comment.threadId ?? 0,
    })),
    commitId: thread.commitId ?? "",
    createdLabel: thread.createdLabel ?? "",
    endLine: thread.endLine,
    endSide: thread.endSide,
    id: thread.id ?? 0,
    path: thread.path ?? "",
    prevCommitId: thread.prevCommitId ?? "",
    startLine: thread.startLine,
    startSide: thread.startSide,
    state: thread.state ?? "open",
  };
}

function normalizeDetail(response: Partial<PullRequestDetailResponse>): PullRequestDetailResponse {
  return {
    bodyHtml: response.bodyHtml ?? "",
    bodyMarkdown: response.bodyMarkdown ?? "",
    commits: response.commits ?? [],
    conflict: response.conflict ?? false,
    contributor: normalizeUser(response.contributor),
    createdLabel: response.createdLabel ?? "",
    events: response.events ?? [],
    fromBranch: response.fromBranch ?? "",
    fromOwnerName: response.fromOwnerName ?? "",
    fromProjectName: response.fromProjectName ?? "",
    id: response.id ?? 0,
    isWatching: response.isWatching ?? false,
    mergedCommitIdFrom: response.mergedCommitIdFrom ?? "",
    mergedCommitIdTo: response.mergedCommitIdTo ?? "",
    ownerName: response.ownerName ?? "",
    permissions: {
      canComment: response.permissions?.canComment ?? false,
      canDeleteSourceBranch: response.permissions?.canDeleteSourceBranch ?? false,
      canRead: response.permissions?.canRead ?? false,
      canReadChanges: response.permissions?.canReadChanges ?? false,
      canReview: response.permissions?.canReview ?? false,
      canRestoreSourceBranch: response.permissions?.canRestoreSourceBranch ?? false,
      canUpdate: response.permissions?.canUpdate ?? false,
      canUpdateState: response.permissions?.canUpdateState ?? false,
    },
    projectName: response.projectName ?? "",
    pullRequestNumber: response.pullRequestNumber ?? 0,
    receiver: normalizeUser(response.receiver),
    reviewers: (response.reviewers ?? []).map(normalizeUser),
    sourceBranchExists: response.sourceBranchExists ?? false,
    state: response.state ?? "open",
    threads: (response.threads ?? []).map(normalizeThread),
    title: response.title ?? "",
    toBranch: response.toBranch ?? "",
    updatedLabel: response.updatedLabel ?? "",
    watcherCount: response.watcherCount ?? 0,
  };
}

function normalizeListResponse(
  response: Partial<PullRequestListResponse>,
): PullRequestListResponse {
  return {
    category: response.category ?? "open",
    items: (response.items ?? []).map(normalizeListItem),
    pageNum: response.pageNum ?? 1,
    pageSize: response.pageSize ?? 15,
    totalCount: response.totalCount ?? 0,
  };
}

function normalizeReviewThreadList(
  response: Partial<ReviewThreadListResponse>,
): ReviewThreadListResponse {
  return {
    closedCount: response.closedCount ?? 0,
    items: (response.items ?? []).map(normalizeThread),
    openCount: response.openCount ?? 0,
    pageNum: response.pageNum ?? 1,
    pageSize: response.pageSize ?? 15,
    state: response.state ?? "open",
    totalCount: response.totalCount ?? 0,
  };
}

function normalizeProjectOption(
  option: Partial<PullRequestProjectOption> | undefined,
): PullRequestProjectOption {
  return {
    id: option?.id ?? 0,
    ownerName: option?.ownerName ?? "",
    projectName: option?.projectName ?? "",
    selected: option?.selected ?? false,
  };
}

function normalizeBranchOption(
  option: Partial<PullRequestBranchOption> | undefined,
): PullRequestBranchOption {
  return {
    name: option?.name ?? "",
    selected: option?.selected ?? false,
  };
}

function normalizeFormOptions(
  response: Partial<PullRequestFormOptionsResponse>,
): PullRequestFormOptionsResponse {
  return {
    fromBranches: (response.fromBranches ?? []).map(normalizeBranchOption),
    fromProjects: (response.fromProjects ?? []).map(normalizeProjectOption),
    mode: response.mode ?? "create",
    pullRequest: response.pullRequest ? normalizeDetail(response.pullRequest) : undefined,
    selected: {
      fromBranch: response.selected?.fromBranch ?? "",
      fromProjectId: response.selected?.fromProjectId ?? 0,
      toBranch: response.selected?.toBranch ?? "",
      toProjectId: response.selected?.toProjectId ?? 0,
    },
    toBranches: (response.toBranches ?? []).map(normalizeBranchOption),
    toProjects: (response.toProjects ?? []).map(normalizeProjectOption),
  };
}

function createPullRequestBody(input: PullRequestCreateInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown,
    fromBranch: input.fromBranch,
    fromProjectId: input.fromProjectId,
    title: input.title,
    toBranch: input.toBranch,
    toProjectId: input.toProjectId,
  };
}

function editPullRequestBody(input: PullRequestEditInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown,
    title: input.title,
  };
}

function commentPullRequestBody(input: PullRequestCommentInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    commitId: input.commitId,
    contentsMarkdown: input.contentsMarkdown,
    endLine: input.endLine,
    endSide: input.endSide,
    path: input.path,
    prevCommitId: input.prevCommitId,
    startLine: input.startLine,
    startSide: input.startSide,
    threadId: input.threadId,
  };
}

function editPullRequestCommentBody(input: PullRequestCommentEditInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    contentsMarkdown: input.contentsMarkdown,
  };
}

export async function listProjectPullRequests(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & PullRequestListQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestListResponse> {
  const payload = await restFetch<Partial<PullRequestListResponse>>(
    runtimeConfig,
    `${projectPath(input)}/pull-requests?${pullRequestListSearch(input)}`,
    { fetchImpl, method: "GET" },
  );
  return normalizeListResponse(payload);
}

export async function listOrganizationPullRequests(
  runtimeConfig: RuntimeConfig,
  input: { organizationName: string } & OrganizationPullRequestListQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestListResponse> {
  const payload = await restFetch<Partial<PullRequestListResponse>>(
    runtimeConfig,
    `/organizations/${encodeURIComponent(
      input.organizationName,
    )}/pull-requests?${organizationPullRequestListSearch(input)}`,
    { fetchImpl, method: "GET" },
  );
  return normalizeListResponse(payload);
}

export async function readPullRequestCreateFormOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { query?: PullRequestFormOptionsQuery },
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestFormOptionsResponse> {
  const payload = await restFetch<Partial<PullRequestFormOptionsResponse>>(
    runtimeConfig,
    `${projectPath(input)}/pull-requests/form-options${pullRequestFormOptionsSearch(input.query)}`,
    { fetchImpl, method: "GET" },
  );
  return normalizeFormOptions(payload);
}

export async function readPullRequestEditFormOptions(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestFormOptionsResponse> {
  const payload = await restFetch<Partial<PullRequestFormOptionsResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/form-options"),
    { fetchImpl, method: "GET" },
  );
  return normalizeFormOptions(payload);
}

export async function readPullRequestDetail(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  const payload = await restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input),
    { fetchImpl, method: "GET" },
  );
  return normalizeDetail(payload);
}

export async function readPullRequestChanges(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestChangesResponse> {
  const payload = await restFetch<Partial<PullRequestChangesResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/changes"),
    { fetchImpl, method: "GET" },
  );
  return {
    commits: payload.commits ?? [],
    files: payload.files ?? [],
    pullRequest: normalizeDetail(payload.pullRequest ?? {}),
    threads: (payload.threads ?? []).map(normalizeThread),
  };
}

export async function listProjectReviews(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & ReviewThreadListQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewThreadListResponse> {
  const payload = await restFetch<Partial<ReviewThreadListResponse>>(
    runtimeConfig,
    `${projectPath(input)}/reviews?${reviewThreadListSearch(input)}`,
    { fetchImpl, method: "GET" },
  );
  return normalizeReviewThreadList(payload);
}

export function createPullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestCreateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    `${projectPath(input)}/pull-requests`,
    {
      body: createPullRequestBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeDetail);
}

export function updatePullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestEditInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(runtimeConfig, pullRequestPath(input), {
    body: editPullRequestBody(input),
    csrfToken,
    fetchImpl,
    method: "PATCH",
  }).then(normalizeDetail);
}

export function closePullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/close"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function openPullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/open"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function acceptPullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/accept"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function deletePullRequestSourceBranchRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/source-branch"),
    { csrfToken, fetchImpl, method: "DELETE" },
  ).then(normalizeDetail);
}

export function restorePullRequestSourceBranchRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/source-branch"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function reviewPullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/review"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function unreviewPullRequestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/unreview"),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeDetail);
}

export function createPullRequestCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestCommentInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, "/comments"),
    {
      body: commentPullRequestBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeDetail);
}

export function deletePullRequestCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput & { commentId: number },
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, `/comments/${input.commentId}`),
    { csrfToken, fetchImpl, method: "DELETE" },
  ).then(normalizeDetail);
}

export function updatePullRequestCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestCommentEditInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PullRequestDetailResponse> {
  return restFetch<Partial<PullRequestDetailResponse>>(
    runtimeConfig,
    pullRequestPath(input, `/comments/${input.commentId}`),
    {
      body: editPullRequestCommentBody(input),
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizeDetail);
}

export function closePullRequestThreadRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput & { threadId: number },
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewThread> {
  return restFetch<Partial<ReviewThread>>(
    runtimeConfig,
    pullRequestPath(input, `/threads/${input.threadId}/close`),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeThread);
}

export function openPullRequestThreadRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: PullRequestScopeInput & { threadId: number },
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewThread> {
  return restFetch<Partial<ReviewThread>>(
    runtimeConfig,
    pullRequestPath(input, `/threads/${input.threadId}/open`),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeThread);
}

export function projectPullRequestListQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & PullRequestListQuery,
) {
  return queryOptions({
    queryFn: () => listProjectPullRequests(runtimeConfig, input),
    queryKey: apiQueryKeys.project.pullRequestList(input.ownerName, input.projectName, {
      category: input.category || "open",
      contributorId: input.contributorId ?? 0,
      filter: input.filter ?? "",
      pageNum: input.pageNum ?? 1,
    }),
  });
}

export function pullRequestCreateFormOptionsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { query?: PullRequestFormOptionsQuery },
) {
  const normalizedQuery = {
    fromBranch: input.query?.fromBranch ?? "",
    fromProjectId: input.query?.fromProjectId ?? 0,
    toBranch: input.query?.toBranch ?? "",
    toProjectId: input.query?.toProjectId ?? 0,
  };
  return queryOptions({
    queryFn: () => readPullRequestCreateFormOptions(runtimeConfig, input),
    queryKey: apiQueryKeys.project.pullRequestCreateFormOptions(
      input.ownerName,
      input.projectName,
      normalizedQuery,
    ),
  });
}

export function pullRequestEditFormOptionsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
) {
  const pullRequestNumber = toNumber(input.pullRequestNumber);
  return queryOptions({
    queryFn: () => readPullRequestEditFormOptions(runtimeConfig, input),
    queryKey: apiQueryKeys.project.pullRequestEditFormOptions(
      input.ownerName,
      input.projectName,
      pullRequestNumber,
    ),
  });
}

export function organizationPullRequestListQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: { organizationName: string } & OrganizationPullRequestListQuery,
) {
  return queryOptions({
    queryFn: () => listOrganizationPullRequests(runtimeConfig, input),
    queryKey: apiQueryKeys.organization.pullRequestList(input.organizationName, {
      category: input.category || "open",
      filter: input.filter ?? "",
      pageNum: input.pageNum ?? 1,
    }),
  });
}

export function pullRequestDetailQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
) {
  const pullRequestNumber = toNumber(input.pullRequestNumber);
  return queryOptions({
    queryFn: () => readPullRequestDetail(runtimeConfig, input),
    queryKey: apiQueryKeys.project.pullRequestDetail(
      input.ownerName,
      input.projectName,
      pullRequestNumber,
    ),
  });
}

export function pullRequestChangesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: PullRequestScopeInput,
) {
  const pullRequestNumber = toNumber(input.pullRequestNumber);
  return queryOptions({
    queryFn: () => readPullRequestChanges(runtimeConfig, input),
    queryKey: apiQueryKeys.project.pullRequestChanges(
      input.ownerName,
      input.projectName,
      pullRequestNumber,
    ),
  });
}

export function projectReviewsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & ReviewThreadListQuery,
) {
  return queryOptions({
    queryFn: () => listProjectReviews(runtimeConfig, input),
    queryKey: apiQueryKeys.project.reviewList(input.ownerName, input.projectName, {
      authorId: input.authorId ?? 0,
      filter: input.filter ?? "",
      orderBy: input.orderBy ?? "",
      orderDir: input.orderDir ?? "",
      pageNum: input.pageNum ?? 1,
      participantId: input.participantId ?? 0,
      state: input.state ?? "open",
    }),
  });
}
