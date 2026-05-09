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
  canRead: boolean;
  canReadChanges: boolean;
  canReview: boolean;
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
  id: number;
  path: string;
  prevCommitId: string;
  startLine?: number;
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
  ownerName: string;
  permissions: PullRequestPermissions;
  projectName: string;
  pullRequestNumber: number;
  receiver: PullRequestUser;
  reviewers: PullRequestUser[];
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
      contentsHtml: comment.contentsHtml ?? "",
      contentsMarkdown: comment.contentsMarkdown ?? "",
      createdLabel: comment.createdLabel ?? "",
      id: comment.id ?? 0,
      threadId: comment.threadId ?? 0,
    })),
    commitId: thread.commitId ?? "",
    createdLabel: thread.createdLabel ?? "",
    endLine: thread.endLine,
    id: thread.id ?? 0,
    path: thread.path ?? "",
    prevCommitId: thread.prevCommitId ?? "",
    startLine: thread.startLine,
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
    ownerName: response.ownerName ?? "",
    permissions: {
      canComment: response.permissions?.canComment ?? false,
      canRead: response.permissions?.canRead ?? false,
      canReadChanges: response.permissions?.canReadChanges ?? false,
      canReview: response.permissions?.canReview ?? false,
      canUpdate: response.permissions?.canUpdate ?? false,
      canUpdateState: response.permissions?.canUpdateState ?? false,
    },
    projectName: response.projectName ?? "",
    pullRequestNumber: response.pullRequestNumber ?? 0,
    receiver: normalizeUser(response.receiver),
    reviewers: (response.reviewers ?? []).map(normalizeUser),
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
