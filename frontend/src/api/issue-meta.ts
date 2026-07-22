import { queryOptions } from "@tanstack/react-query";
import type { ReadIssueDetailResponse } from "./types";
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

export type IssueFormProjectOption = {
  logoUrl: string;
  ownerName: string;
  projectId: number;
  projectName: string;
};

export type ProjectIssueFormOptionsResponse = {
  canCreateIssueAssignee: boolean;
  canCreateIssueMilestone: boolean;
  canManageIssueLabels: boolean;
  currentProject: IssueFormProjectOption;
  issueTemplateMarkdown: string;
  movableIssueProjects: IssueFormProjectOption[];
};

export type ProjectTitleHeadItem = {
  category: string;
  categoryId?: number;
  frequency: number;
  id?: number;
  isExclusive?: boolean;
  labelColor?: string;
  name: string;
  searchText: string;
};

export type ProjectTitleHeadsResponse = {
  result: ProjectTitleHeadItem[];
};

type IssueCommentScopeInput = IssueScopeInput & {
  commentId: bigint | number;
};

type IssueAssigneeInput = IssueScopeInput & {
  assigneeLoginId: string;
};

export type IssueContentUpdateInput = IssueScopeInput & {
  content: string;
  original: string;
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

export type ProjectIssueSearchUsersInput = ProjectScopeInput & {
  role: "assignee" | "author";
};

export type ProjectIssueReferencesInput = ProjectScopeInput & {
  query: string;
};

export type ProjectMentionUsersInput = ProjectScopeInput & {
  context: IssueMentionUserSearchContext | string;
  query: string;
};

export type IssueAssignableUserItem = {
  avatarUrl: string;
  displayName: string;
  loginId: string;
  pureNameOnly: string;
  type: "project" | "user";
  userId?: string;
};

export type IssueAssignableUsersResponse = {
  items: IssueAssignableUserItem[];
  total: number;
  truncated: boolean;
};

export type ProjectIssueSearchUserItem = {
  avatarUrl: string;
  displayName: string;
  loginId: string;
  pureNameOnly: string;
  userId: string;
};

export type ProjectIssueSearchUsersResponse = {
  items: ProjectIssueSearchUserItem[];
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

export type MarkdownIssueReference = IssueReferenceMetadata & {
  token: string;
};

export type MarkdownMentionReference = MentionReferenceMetadata & {
  token: string;
};

export type MarkdownCommitReference = {
  commitId: string;
  ownerName: string;
  projectName: string;
  shortId: string;
  token: string;
};

export type CommitReferenceMetadata = Omit<MarkdownCommitReference, "token">;

export type ProjectMarkdownReferencesInput = ProjectScopeInput & {
  bodyMarkdown: string;
};

export type ProjectMarkdownReferencesResponse = {
  commitReferences: MarkdownCommitReference[];
  issueReferences: MarkdownIssueReference[];
  mentionReferences: MarkdownMentionReference[];
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

function projectIssuesPath(input: ProjectScopeInput, suffix = ""): string {
  return `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
    input.projectName,
  )}/issues${suffix}`;
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
    canBeDeleted: response.canBeDeleted ?? true,
    commentCount: response.commentCount ?? 0,
    hasVoted: response.hasVoted ?? false,
    historyMarkdown: response.historyMarkdown ?? "",
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
      resourceHref: item.resourceHref ?? "",
      resourceLabel: item.resourceLabel ?? "",
      resourceTitle: item.resourceTitle ?? "",
      senderLoginId: item.senderLoginId ?? "",
      senderLabel: item.senderLabel ?? "",
      targetLoginId: item.targetLoginId ?? "",
      targetLabel: item.targetLabel ?? "",
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
    userId: String((item as unknown as { userId?: unknown }).userId ?? ""),
  }));
  return {
    items,
    total: response.total ?? items.length,
    truncated: response.truncated ?? false,
  };
}

function normalizeIssueFormProjectOption(
  project: Partial<IssueFormProjectOption> | undefined,
): IssueFormProjectOption {
  return {
    logoUrl: project?.logoUrl ?? "",
    ownerName: project?.ownerName ?? "",
    projectId: Number(project?.projectId ?? 0),
    projectName: project?.projectName ?? "",
  };
}

function normalizeProjectIssueFormOptionsResponse(
  response: Partial<ProjectIssueFormOptionsResponse>,
): ProjectIssueFormOptionsResponse {
  return {
    canCreateIssueAssignee: response.canCreateIssueAssignee ?? false,
    canCreateIssueMilestone: response.canCreateIssueMilestone ?? false,
    canManageIssueLabels: response.canManageIssueLabels ?? false,
    currentProject: normalizeIssueFormProjectOption(response.currentProject),
    issueTemplateMarkdown: response.issueTemplateMarkdown ?? "",
    movableIssueProjects: (response.movableIssueProjects ?? []).map((project) =>
      normalizeIssueFormProjectOption(project),
    ),
  };
}

function normalizeProjectTitleHeadsResponse(
  response: Partial<ProjectTitleHeadsResponse>,
): ProjectTitleHeadsResponse {
  return {
    result: (response.result ?? []).map((item) => ({
      category: item.category ?? "",
      categoryId:
        item.categoryId === undefined || item.categoryId === null
          ? undefined
          : Number(item.categoryId),
      frequency: Number(item.frequency ?? 0),
      id: item.id === undefined || item.id === null ? undefined : Number(item.id),
      isExclusive: item.isExclusive ?? false,
      labelColor: item.labelColor ?? "",
      name: item.name ?? "",
      searchText: item.searchText ?? item.name ?? "",
    })),
  };
}

export function readProjectIssueFormOptionsRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectIssueFormOptionsResponse> {
  return restFetch<Partial<ProjectIssueFormOptionsResponse>>(
    runtimeConfig,
    projectIssuesPath(input, "/form-options"),
    { fetchImpl },
  ).then(normalizeProjectIssueFormOptionsResponse);
}

export function searchProjectTitleHeadsRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectScopeInput & { query: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectTitleHeadsResponse> {
  const query = new URLSearchParams({ query: input.query });
  return restFetch<Partial<ProjectTitleHeadsResponse>>(
    runtimeConfig,
    `${projectPath(input, "/title-heads")}?${query.toString()}`,
    { fetchImpl },
  ).then(normalizeProjectTitleHeadsResponse);
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

function normalizeProjectIssueSearchUsersResponse(
  response: Partial<ProjectIssueSearchUsersResponse>,
): ProjectIssueSearchUsersResponse {
  return {
    items: (response.items ?? []).map((item) => ({
      avatarUrl: item.avatarUrl ?? "",
      displayName: item.displayName ?? "",
      loginId: item.loginId ?? "",
      pureNameOnly: item.pureNameOnly ?? "",
      userId: String(item.userId ?? ""),
    })),
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

function normalizeProjectMarkdownReferencesResponse(
  response: Partial<ProjectMarkdownReferencesResponse>,
): ProjectMarkdownReferencesResponse {
  return {
    commitReferences: (response.commitReferences ?? []).map((reference) => ({
      commitId: reference.commitId ?? "",
      ownerName: reference.ownerName ?? "",
      projectName: reference.projectName ?? "",
      shortId: reference.shortId ?? "",
      token: reference.token ?? "",
    })),
    issueReferences: (response.issueReferences ?? []).map((reference) => ({
      issueNumber: Number(reference.issueNumber ?? 0),
      ownerName: reference.ownerName ?? "",
      projectName: reference.projectName ?? "",
      state: reference.state ?? "",
      title: reference.title ?? "",
      token: reference.token ?? "",
    })),
    mentionReferences: (response.mentionReferences ?? []).map((reference) => ({
      kind: reference.kind ?? "",
      label: reference.label ?? "",
      loginId: reference.loginId ?? "",
      ownerName: reference.ownerName ?? "",
      projectName: reference.projectName ?? "",
      token: reference.token ?? "",
    })),
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

export function normalizeCommitReferences(
  references: Partial<CommitReferenceMetadata>[] | undefined,
): CommitReferenceMetadata[] {
  return (references ?? []).map((reference) => ({
    commitId: reference.commitId ?? "",
    ownerName: reference.ownerName ?? "",
    projectName: reference.projectName ?? "",
    shortId: reference.shortId ?? "",
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

export async function updateIssueContentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: IssueContentUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  return restFetch<unknown>(runtimeConfig, `${issuePath(input)}/content`, {
    body: {
      content: input.content,
      original: input.original,
    },
    csrfToken,
    fetchImpl,
    method: "PATCH",
  });
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

export function searchProjectMentionUsersRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectMentionUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueMentionUsersResponse> {
  const query = new URLSearchParams();
  query.set("query", input.query);
  query.set("context", input.context);
  return restFetch<Partial<IssueMentionUsersResponse>>(
    runtimeConfig,
    `${projectPath(input, "/mention-users")}?${query.toString()}`,
    { fetchImpl },
  ).then(normalizeIssueMentionUsersResponse);
}

export function listProjectIssueSearchUsersRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectIssueSearchUsersInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectIssueSearchUsersResponse> {
  const query = new URLSearchParams();
  query.set("role", input.role);
  return restFetch<Partial<ProjectIssueSearchUsersResponse>>(
    runtimeConfig,
    `${projectPath(input)}/issue-search-users?${query.toString()}`,
    {
      fetchImpl,
    },
  ).then(normalizeProjectIssueSearchUsersResponse);
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

export function readProjectMarkdownReferencesRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectMarkdownReferencesInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMarkdownReferencesResponse> {
  return restFetch<Partial<ProjectMarkdownReferencesResponse>>(
    runtimeConfig,
    projectPath(input, "/markdown-references"),
    {
      body: { bodyMarkdown: input.bodyMarkdown },
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeProjectMarkdownReferencesResponse);
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
