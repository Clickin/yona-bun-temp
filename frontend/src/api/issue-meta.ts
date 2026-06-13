import { queryOptions } from "@tanstack/react-query";
import type { ReadIssueDetailResponse } from "../gen/yona/pilot/v1/pilot_pb";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type IssueScopeInput = {
  issueNumber: bigint | number;
  ownerName: string;
  projectName: string;
};

type ProjectScopeInput = {
  ownerName: string;
  projectName: string;
};

type IssueCommentScopeInput = IssueScopeInput & {
  commentId: bigint | number;
};

type IssueAssigneeInput = IssueScopeInput & {
  assigneeLoginId: string;
};

export type IssueAssignableUserSearchType = "englishName" | "loginId" | "name";

export type IssueAssignableUsersInput = IssueScopeInput & {
  query: string;
  type?: IssueAssignableUserSearchType | string;
};

export type IssueSharableUsersInput = IssueScopeInput & {
  query: string;
  type?: IssueAssignableUserSearchType | string;
};

export type ProjectAssignableUsersInput = ProjectScopeInput & {
  query: string;
  type?: IssueAssignableUserSearchType | string;
};

export type ProjectIssueReferencesInput = ProjectScopeInput & {
  query: string;
};

export type IssueAssignableUserItem = {
  avatarUrl: string;
  displayName: string;
  loginId: string;
  pureNameOnly: string;
  type: "project" | "user";
};

export type IssueAssignableUsersResponse = {
  items: IssueAssignableUserItem[];
  total: number;
  truncated: boolean;
};

export type IssueMentionUserSearchContext = "issue-body" | "issue-comment";

export type IssueMentionUsersInput = IssueScopeInput & {
  context: IssueMentionUserSearchContext | string;
  query: string;
};

export type IssueMentionUserItem = {
  avatarUrl: string;
  displayName: string;
  loginId: string;
  searchText: string;
  type: "organization" | "project" | "user";
};

export type IssueMentionUsersResponse = {
  items: IssueMentionUserItem[];
  total: number;
  truncated: boolean;
};

export type ProjectIssueReferenceItem = {
  issueNumber: number;
  state: string;
  title: string;
};

export type IssueReferenceMetadata = ProjectIssueReferenceItem & {
  ownerName: string;
  projectName: string;
};

export type MentionReferenceMetadata = {
  kind: "organization" | "project" | "user" | string;
  label: string;
  loginId: string;
  ownerName: string;
  projectName: string;
};

export type ProjectIssueReferencesResponse = {
  items: ProjectIssueReferenceItem[];
  total: number;
  truncated: boolean;
};

type IssueShareInput = IssueScopeInput & {
  loginId: string;
  targetType?: "project" | "user" | string;
};

function toInt64Number(value: bigint | number): number {
  return Number(value);
}

function projectPath(input: ProjectScopeInput, suffix = ""): string {
  return `/owners/${encodeURIComponent(input.ownerName)}/projects/${encodeURIComponent(
    input.projectName,
  )}${suffix}`;
}

function issuePath(input: IssueScopeInput, suffix = ""): string {
  return `${projectPath(input)}/issues/${toInt64Number(input.issueNumber)}${suffix}`;
}

function issueCommentPath(input: IssueCommentScopeInput, suffix = ""): string {
  return `${issuePath(input)}/comments/${toInt64Number(input.commentId)}${suffix}`;
}

function normalizeIssueDetailResponse(response: ReadIssueDetailResponse): ReadIssueDetailResponse {
  return {
    ...response,
    assigneeLabel: response.assigneeLabel ?? "",
    assigneeLoginId: response.assigneeLoginId ?? "",
    authorLabel: response.authorLabel ?? "",
    bodyHtml: response.bodyHtml ?? "",
    bodyMarkdown: response.bodyMarkdown ?? "",
    commentCount: response.commentCount ?? 0,
    hasVoted: response.hasVoted ?? false,
    isFavorited: response.isFavorited ?? false,
    isWatching: response.isWatching ?? false,
    issueNumber: response.issueNumber ?? "0",
    milestoneTitle: response.milestoneTitle ?? "",
    ownerName: response.ownerName ?? "",
    projectName: response.projectName ?? "",
    state: response.state ?? "",
    title: response.title ?? "",
    viewerCanComment: response.viewerCanComment ?? false,
    viewerCanDelete: response.viewerCanDelete ?? false,
    viewerCanManageSharers: response.viewerCanManageSharers ?? false,
    viewerCanUpdate: response.viewerCanUpdate ?? false,
    viewerHasInheritedShare: response.viewerHasInheritedShare ?? false,
    viewerIsDirectSharer: response.viewerIsDirectSharer ?? false,
    voterCount: response.voterCount ?? 0,
    issueVoters: (response as unknown as { issueVoters?: unknown[] }).issueVoters ?? [],
    watcherCount: response.watcherCount ?? 0,
    attachments: response.attachments ?? [],
    comments: (response.comments ?? []).map((comment) => ({
      ...comment,
      authorLabel: comment.authorLabel ?? "",
      contentsHtml: comment.contentsHtml ?? "",
      contentsMarkdown: comment.contentsMarkdown ?? "",
      createdLabel: comment.createdLabel ?? "",
      id: comment.id ?? "0",
      viewerCanDelete: comment.viewerCanDelete ?? false,
      viewerCanUpdate: comment.viewerCanUpdate ?? false,
      viewerHasVoted: comment.viewerHasVoted ?? false,
      voterCount: comment.voterCount ?? 0,
      viaEmail: comment.viaEmail ?? false,
      attachments: comment.attachments ?? [],
      mentionReferences: normalizeMentionReferences(comment.mentionReferences),
      voters: comment.voters ?? [],
    })),
    labels: response.labels ?? [],
    mentionReferences: normalizeMentionReferences(response.mentionReferences),
    sharers: (response.sharers ?? []).map((sharer) => ({
      ...sharer,
      loginId: sharer.loginId ?? "",
      userId: sharer.userId ?? "0",
      userLabel: sharer.userLabel ?? "",
    })),
    timeline: (response.timeline ?? []).map((item) => ({
      ...item,
      createdLabel: item.createdLabel ?? "",
      eventType: item.eventType ?? "",
      id: item.id ?? "0",
      kind: item.kind ?? "",
      newValue: item.newValue ?? "",
      oldValue: item.oldValue ?? "",
      senderLoginId: item.senderLoginId ?? "",
      comment: item.comment
        ? {
            ...item.comment,
            authorLabel: item.comment.authorLabel ?? "",
            contentsHtml: item.comment.contentsHtml ?? "",
            contentsMarkdown: item.comment.contentsMarkdown ?? "",
            createdLabel: item.comment.createdLabel ?? "",
            id: item.comment.id ?? "0",
            viewerCanDelete: item.comment.viewerCanDelete ?? false,
            viewerCanUpdate: item.comment.viewerCanUpdate ?? false,
            viewerHasVoted: item.comment.viewerHasVoted ?? false,
            voterCount: item.comment.voterCount ?? 0,
            viaEmail: item.comment.viaEmail ?? false,
            attachments: item.comment.attachments ?? [],
            mentionReferences: normalizeMentionReferences(item.comment.mentionReferences),
            voters: item.comment.voters ?? [],
          }
        : item.comment,
    })),
  } as unknown as ReadIssueDetailResponse;
}

function normalizeIssueAssignableUsersResponse(
  response: Partial<IssueAssignableUsersResponse>,
): IssueAssignableUsersResponse {
  const items: IssueAssignableUserItem[] = (response.items ?? []).map((item) => ({
    avatarUrl: item.avatarUrl ?? "",
    displayName: item.displayName ?? "",
    loginId: item.loginId ?? "",
    pureNameOnly: item.pureNameOnly ?? "",
    type: item.type === "project" ? "project" : "user",
  }));
  return {
    items,
    total: response.total ?? items.length,
    truncated: response.truncated ?? false,
  };
}

function normalizeIssueMentionUsersResponse(
  response: Partial<IssueMentionUsersResponse>,
): IssueMentionUsersResponse {
  const items = (response.items ?? []).map((item) => ({
    avatarUrl: item.avatarUrl ?? "",
    displayName: item.displayName ?? "",
    loginId: item.loginId ?? "",
    searchText: item.searchText ?? "",
    type: item.type ?? "user",
  }));
  return {
    items,
    total: response.total ?? items.length,
    truncated: response.truncated ?? false,
  };
}

function normalizeProjectIssueReferencesResponse(
  response: Partial<ProjectIssueReferencesResponse>,
): ProjectIssueReferencesResponse {
  const items = (response.items ?? []).map((item) => ({
    issueNumber: item.issueNumber ?? 0,
    state: item.state ?? "",
    title: item.title ?? "",
  }));
  return {
    items,
    total: response.total ?? items.length,
    truncated: response.truncated ?? false,
  };
}

export function normalizeIssueReferences(
  references: Partial<IssueReferenceMetadata>[] | undefined,
): IssueReferenceMetadata[] {
  return (references ?? []).map((reference) => ({
    issueNumber: reference.issueNumber ?? 0,
    ownerName: reference.ownerName ?? "",
    projectName: reference.projectName ?? "",
    state: reference.state ?? "",
    title: reference.title ?? "",
  }));
}

export function normalizeMentionReferences(
  references: Partial<MentionReferenceMetadata>[] | undefined,
): MentionReferenceMetadata[] {
  return (references ?? []).map((reference) => ({
    kind: reference.kind ?? "",
    label: reference.label ?? "",
    loginId: reference.loginId ?? "",
    ownerName: reference.ownerName ?? "",
    projectName: reference.projectName ?? "",
  }));
}

export function watchIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/watch`, {
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeIssueDetailResponse);
}

export function unwatchIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/watch`, {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  }).then(normalizeIssueDetailResponse);
}

export function voteIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/vote`, {
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeIssueDetailResponse);
}

export function unvoteIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/vote`, {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  }).then(normalizeIssueDetailResponse);
}

export function voteIssueCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueCommentScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issueCommentPath(input)}/vote`, {
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeIssueDetailResponse);
}

export function unvoteIssueCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueCommentScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issueCommentPath(input)}/vote`, {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  }).then(normalizeIssueDetailResponse);
}

export function toggleFavoriteIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/favorite`, {
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeIssueDetailResponse);
}

export function searchIssueAssignableUsersRest(
  runtimeConfig: RuntimeConfig,
  input: IssueAssignableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  if (input.type) {
    query.set("type", input.type);
  }
  return restFetch<Partial<IssueAssignableUsersResponse>>(
    runtimeConfig,
    `${issuePath(input)}/assignable-users?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeIssueAssignableUsersResponse);
}

export function searchIssueSharableUsersRest(
  runtimeConfig: RuntimeConfig,
  input: IssueSharableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  if (input.type) {
    query.set("type", input.type);
  }
  return restFetch<Partial<IssueAssignableUsersResponse>>(
    runtimeConfig,
    `${issuePath(input)}/sharable-users?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeIssueAssignableUsersResponse);
}

export function searchIssueMentionUsersRest(
  runtimeConfig: RuntimeConfig,
  input: IssueMentionUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueMentionUsersResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  query.set("context", input.context);
  return restFetch<Partial<IssueMentionUsersResponse>>(
    runtimeConfig,
    `${issuePath(input)}/mention-users?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeIssueMentionUsersResponse);
}

export function searchProjectAssignableUsersRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectAssignableUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueAssignableUsersResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  if (input.type) {
    query.set("type", input.type);
  }
  return restFetch<Partial<IssueAssignableUsersResponse>>(
    runtimeConfig,
    `${projectPath(input)}/assignable-users?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeIssueAssignableUsersResponse);
}

export function searchProjectIssueReferencesRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectIssueReferencesInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectIssueReferencesResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  return restFetch<Partial<ProjectIssueReferencesResponse>>(
    runtimeConfig,
    `${projectPath(input)}/issue-references?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeProjectIssueReferencesResponse);
}

export type ProjectIssueReferencesQueryOptions = {
  queryFn: () => Promise<ProjectIssueReferencesResponse>;
  queryKey: ReturnType<typeof apiQueryKeys.project.issueReferences>;
};

export function projectIssueReferencesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectIssueReferencesInput,
): ProjectIssueReferencesQueryOptions {
  const queryKey = apiQueryKeys.project.issueReferences(input.ownerName, input.projectName, {
    query: input.query,
  });
  const queryFn = () => searchProjectIssueReferencesRest(runtimeConfig, input);
  const options = queryOptions({
    queryFn,
    queryKey,
  });
  return {
    queryFn,
    queryKey: options.queryKey,
  };
}

export function assignIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueAssigneeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/assignee`, {
    body: {
      assigneeLoginId: input.assigneeLoginId,
    },
    csrfToken,
    fetchImpl,
    method: "PUT",
  }).then(normalizeIssueDetailResponse);
}

export function shareIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueShareInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  return restFetch<ReadIssueDetailResponse>(runtimeConfig, `${issuePath(input)}/sharers`, {
    body: {
      loginId: input.loginId,
      ...(input.targetType ? { targetType: input.targetType } : {}),
    },
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeIssueDetailResponse);
}

export function unshareIssueRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueShareInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadIssueDetailResponse> {
  const targetTypeSuffix = input.targetType
    ? `?${new URLSearchParams({ targetType: input.targetType }).toString()}`
    : "";
  return restFetch<ReadIssueDetailResponse>(
    runtimeConfig,
    `${issuePath(input)}/sharers/${encodeURIComponent(input.loginId)}${targetTypeSuffix}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizeIssueDetailResponse);
}
