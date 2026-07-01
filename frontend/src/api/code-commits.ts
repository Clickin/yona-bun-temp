import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import type { IssueReferenceMetadata, MentionReferenceMetadata } from "./issue-meta";
import { normalizeIssueReferences, normalizeMentionReferences } from "./issue-meta";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type CodeReviewComment = {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  canDelete: boolean;
  contentsHtml: string;
  contentsMarkdown: string;
  createdLabel: string;
  id: number;
  issueReferences?: IssueReferenceMetadata[];
  mentionReferences?: MentionReferenceMetadata[];
  threadId: number;
  viaEmail: boolean;
};

export type CodeReviewThread = {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  comments: CodeReviewComment[];
  commitId: string;
  createdLabel: string;
  endLine?: number;
  id: number;
  path: string;
  prevCommitId: string;
  startLine?: number;
  state: string;
};

export type CodeCommitDetailResponse = {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commit: {
    authorDate: string;
    authorEmail: string;
    authorName: string;
    commentCount: number;
    commitId: string;
    commitShortId: string;
    message: string;
    shortMessage: string;
  } | null;
  files: Array<{ path: string; patch: string }>;
  isWatching: boolean;
  issueReferences?: IssueReferenceMetadata[];
  noHead: boolean;
  ownerName: string;
  parentCommit: { commitId: string; commitShortId: string } | null;
  path: string;
  permissions: {
    canComment: boolean;
    canUpdateThreadState: boolean;
  };
  projectName: string;
  selectedBranch: string;
  threads: CodeReviewThread[];
};

export type CodeHistoryCommit = {
  authorAvatarUrl: string;
  authorDate: string;
  authorEmail: string;
  authorLoginId: string;
  authorName: string;
  commentCount: number;
  commitId: string;
  commitShortId: string;
  message: string;
  shortMessage: string;
};

export type CodeHistoryResponse = {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commits: CodeHistoryCommit[];
  hasNewer: boolean;
  hasOlder: boolean;
  noHead: boolean;
  ownerName: string;
  page: number;
  path: string;
  projectName: string;
  selectedBranch: string;
};

export type CodeCommitDetailQuery = {
  branch?: string;
  path?: string;
};

export type CommitDiscussionScopeInput = {
  commitId: string;
  ownerName: string;
  projectName: string;
};

export type CommitDiscussionCommentInput = CommitDiscussionScopeInput & {
  attachmentIds?: number[];
  contentsMarkdown: string;
  endLine?: number;
  path?: string;
  startLine?: number;
  threadId?: number;
};

export type CommitDiscussionCommentDeleteInput = CommitDiscussionScopeInput & {
  commentId: number;
};

export type CommitDiscussionCommentUpdateInput = CommitDiscussionScopeInput & {
  attachmentIds?: number[];
  commentId: number;
  contentsMarkdown: string;
};

export type CommitDiscussionThreadStateInput = CommitDiscussionScopeInput & {
  threadId: number;
};

function normalizeComment(comment: Partial<CodeReviewComment>): CodeReviewComment {
  return {
    authorId: comment.authorId ?? 0,
    authorLabel: comment.authorLabel ?? "",
    authorLoginId: comment.authorLoginId ?? "",
    canDelete: comment.canDelete ?? false,
    contentsHtml: comment.contentsHtml ?? "",
    contentsMarkdown: comment.contentsMarkdown ?? "",
    createdLabel: comment.createdLabel ?? "",
    id: comment.id ?? 0,
    issueReferences: normalizeIssueReferences(comment.issueReferences),
    mentionReferences: normalizeMentionReferences(comment.mentionReferences),
    threadId: comment.threadId ?? 0,
    viaEmail: comment.viaEmail ?? false,
  };
}

function normalizeThread(thread: Partial<CodeReviewThread>): CodeReviewThread {
  return {
    authorId: thread.authorId ?? 0,
    authorLabel: thread.authorLabel ?? "",
    authorLoginId: thread.authorLoginId ?? "",
    comments: (thread.comments ?? []).map(normalizeComment),
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

function normalizeCommitDetail(
  response: Partial<CodeCommitDetailResponse>,
): CodeCommitDetailResponse {
  return {
    branches: response.branches ?? [],
    breadcrumbs: response.breadcrumbs ?? [],
    commit: response.commit ?? null,
    files: response.files ?? [],
    isWatching: response.isWatching ?? false,
    issueReferences: normalizeIssueReferences(response.issueReferences),
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    parentCommit: response.parentCommit ?? null,
    path: response.path ?? "",
    permissions: {
      canComment: response.permissions?.canComment ?? false,
      canUpdateThreadState: response.permissions?.canUpdateThreadState ?? false,
    },
    projectName: response.projectName ?? "",
    selectedBranch: response.selectedBranch ?? "",
    threads: (response.threads ?? []).map(normalizeThread),
  };
}

function normalizeHistoryCommit(commit: Partial<CodeHistoryCommit>): CodeHistoryCommit {
  return {
    authorAvatarUrl: commit.authorAvatarUrl ?? "",
    authorDate: commit.authorDate ?? "",
    authorEmail: commit.authorEmail ?? "",
    authorLoginId: commit.authorLoginId ?? "",
    authorName: commit.authorName ?? "",
    commentCount: commit.commentCount ?? 0,
    commitId: commit.commitId ?? "",
    commitShortId: commit.commitShortId ?? "",
    message: commit.message ?? "",
    shortMessage: commit.shortMessage ?? "",
  };
}

function normalizeHistory(response: Partial<CodeHistoryResponse>): CodeHistoryResponse {
  return {
    branches: response.branches ?? [],
    breadcrumbs: response.breadcrumbs ?? [],
    commits: (response.commits ?? []).map(normalizeHistoryCommit),
    hasNewer: response.hasNewer ?? false,
    hasOlder: response.hasOlder ?? false,
    noHead: response.noHead ?? false,
    ownerName: response.ownerName ?? "",
    page: response.page ?? 0,
    path: response.path ?? "",
    projectName: response.projectName ?? "",
    selectedBranch: response.selectedBranch ?? "",
  };
}

function projectPath(input: { ownerName: string; projectName: string }, suffix = "") {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function commitPath(input: CommitDiscussionScopeInput, suffix = "") {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}/commit/${encodeURIComponent(input.commitId)}${suffix}`;
}

function commitSearch(input: CodeCommitDetailQuery = {}) {
  const search = new URLSearchParams();
  if (input.branch) {
    search.set("branch", input.branch);
  }
  if (input.path) {
    search.set("path", input.path);
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

function historySearch(input: { branch?: string; page?: number; path?: string } = {}) {
  const search = new URLSearchParams();
  if (input.branch) {
    search.set("branch", input.branch);
  }
  if (input.page) {
    search.set("page", String(input.page));
  }
  if (input.path) {
    search.set("path", input.path);
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

function commentBody(input: CommitDiscussionCommentInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    contentsMarkdown: input.contentsMarkdown,
    endLine: input.endLine,
    path: input.path,
    startLine: input.startLine,
    threadId: input.threadId,
  };
}

export function readCodeCommitDetailRest(
  runtimeConfig: RuntimeConfig,
  input: CommitDiscussionScopeInput & { query?: CodeCommitDetailQuery },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    `${commitPath(input)}${commitSearch(input.query)}`,
    { fetchImpl, method: "GET" },
  ).then(normalizeCommitDetail);
}

export function readCodeHistoryRest(
  runtimeConfig: RuntimeConfig,
  input: { branch?: string; ownerName: string; page?: number; path?: string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeHistoryResponse> {
  return restFetch<Partial<CodeHistoryResponse>>(
    runtimeConfig,
    `${projectPath(input, "/commits")}${historySearch(input)}`,
    { fetchImpl, method: "GET" },
  ).then(normalizeHistory);
}

export function createCommitDiscussionCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionCommentInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    commitPath(input, "/comments"),
    {
      body: commentBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeCommitDetail);
}

export function deleteCommitDiscussionCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionCommentDeleteInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    commitPath(input, `/comments/${input.commentId}`),
    { csrfToken, fetchImpl, method: "DELETE" },
  ).then(normalizeCommitDetail);
}

export function watchCommitRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionScopeInput & { query?: CodeCommitDetailQuery },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    `${commitPath(input, "/watch")}${commitSearch(input.query)}`,
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeCommitDetail);
}

export function unwatchCommitRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionScopeInput & { query?: CodeCommitDetailQuery },
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    `${commitPath(input, "/watch")}${commitSearch(input.query)}`,
    { csrfToken, fetchImpl, method: "DELETE" },
  ).then(normalizeCommitDetail);
}

export function updateCommitDiscussionCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionCommentUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeCommitDetailResponse> {
  return restFetch<Partial<CodeCommitDetailResponse>>(
    runtimeConfig,
    commitPath(input, `/comments/${input.commentId}`),
    {
      body: {
        attachmentIds: input.attachmentIds ?? [],
        contentsMarkdown: input.contentsMarkdown,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizeCommitDetail);
}

export function closeCommitDiscussionThreadRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionThreadStateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeReviewThread> {
  return restFetch<Partial<CodeReviewThread>>(
    runtimeConfig,
    commitPath(input, `/threads/${input.threadId}/close`),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeThread);
}

export function openCommitDiscussionThreadRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: CommitDiscussionThreadStateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CodeReviewThread> {
  return restFetch<Partial<CodeReviewThread>>(
    runtimeConfig,
    commitPath(input, `/threads/${input.threadId}/open`),
    { csrfToken, fetchImpl, method: "POST" },
  ).then(normalizeThread);
}

export function codeCommitDetailQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: CommitDiscussionScopeInput & { query?: CodeCommitDetailQuery },
) {
  const normalizedQuery = {
    branch: input.query?.branch ?? "",
    path: input.query?.path ?? "",
  };
  return queryOptions({
    queryFn: () => readCodeCommitDetailRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.commitDetail(
      input.ownerName,
      input.projectName,
      input.commitId,
      normalizedQuery,
    ),
  });
}

export function codeHistoryQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: { branch?: string; ownerName: string; page?: number; path?: string; projectName: string },
) {
  return queryOptions({
    queryFn: () => readCodeHistoryRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.codeHistory(input.ownerName, input.projectName, {
      branch: input.branch ?? "",
      page: input.page ?? 0,
      path: input.path ?? "",
    }),
  });
}
