import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type BoardLabel = {
  categoryId: string;
  categoryIsExclusive: boolean;
  categoryName: string;
  color: string;
  id: string;
  name: string;
};

export type BoardAttachment = {
  id: string;
  mimeType: string;
  name: string;
  size: number;
};

export type BoardPostComment = {
  attachments: BoardAttachment[];
  authorId: string;
  authorLabel: string;
  authorLoginId: string;
  contentsHtml: string;
  contentsMarkdown: string;
  createdLabel: string;
  id: string;
  parentCommentId: string;
};

export type BoardPostListItem = {
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  createdLabel: string;
  labels: BoardLabel[];
  notice: boolean;
  ownerName: string;
  postNumber: string;
  projectName: string;
  readme: boolean;
  title: string;
  updatedLabel: string;
};

export type BoardPostDetail = BoardPostListItem & {
  attachments: BoardAttachment[];
  authorId: string;
  bodyHtml: string;
  bodyMarkdown: string;
  comments: BoardPostComment[];
  id: string;
  isWatching: boolean;
  permissions: BoardPostPermissions;
  watcherCount: number;
};

export type BoardPostPermissions = {
  canComment: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canRead: boolean;
  canSetNotice: boolean;
  canWatch: boolean;
  canUpdate: boolean;
};

export type BoardDefaultPermissions = {
  canAttachFiles: boolean;
  canCreate: boolean;
  canMarkNotice: boolean;
  canMarkReadme: boolean;
};

export type BoardPage = {
  pageNum: number;
  pageSize: number;
  totalCount: number;
};

export type BoardPostFormOptions = {
  canAttachFiles: boolean;
  canMarkNotice: boolean;
  canMarkReadme: boolean;
  defaultPermissions: BoardDefaultPermissions;
  labels: BoardLabel[];
};

export type ProjectPostsInput = {
  filter?: string;
  labelIds?: Array<number | string>;
  orderBy?: string;
  orderDir?: string;
  ownerName: string;
  pageNum?: number;
  projectName: string;
};

export type OrganizationBoardsInput = {
  filter?: string;
  orderBy?: string;
  orderDir?: string;
  organizationName: string;
  pageNum?: number;
  projectNames?: string[];
};

export type ProjectPostsResponse = {
  items: BoardPostListItem[];
  notices: BoardPostListItem[];
  ownerName: string;
  pageNum: number;
  pageSize: number;
  projectName: string;
  readme: BoardPostDetail | null;
  totalCount: number;
};

export type OrganizationBoardsResponse = {
  items: BoardPostListItem[];
  organizationName: string;
  pageNum: number;
  pageSize: number;
  totalCount: number;
  visibleProjects: Array<{ ownerName: string; projectName: string }>;
};

export type BoardPostMutationInput = {
  attachmentIds?: Array<number | string>;
  bodyMarkdown: string;
  labelIds?: Array<number | string>;
  notice?: boolean;
  ownerName: string;
  projectName: string;
  readme?: boolean;
  title: string;
};

export type BoardPostUpdateInput = BoardPostMutationInput & {
  postNumber: number | string;
};

export type BoardCommentInput = {
  attachmentIds?: Array<number | string>;
  contentsMarkdown: string;
  ownerName: string;
  postNumber: number | string;
  projectName: string;
};

export type BoardCommentUpdateInput = BoardCommentInput & {
  commentId: number | string;
};

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function projectPostsPath(ownerName: string, projectName: string): string {
  return `/projects/${encodePathSegment(ownerName)}/${encodePathSegment(projectName)}/posts`;
}

function projectPostPath(ownerName: string, projectName: string, postNumber: number | string) {
  return `${projectPostsPath(ownerName, projectName)}/${String(postNumber)}`;
}

function appendQueryParam(
  query: URLSearchParams,
  key: string,
  value: Array<number | string> | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryParam(query, key, item);
    }
    return;
  }
  if (typeof value === "string" && value.trim() === "") {
    return;
  }
  query.append(key, String(value));
}

function queryString(values: Record<string, Array<number | string> | number | string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    appendQueryParam(query, key, value);
  }
  const serialized = query.toString();
  return serialized === "" ? "" : `?${serialized}`;
}

function normalizedProjectPostsKey(input: ProjectPostsInput) {
  return {
    filter: input.filter ?? "",
    labelIds: (input.labelIds ?? []).map((value) => Number(value)),
    orderBy: input.orderBy ?? "",
    orderDir: input.orderDir ?? "",
    pageNum: input.pageNum ?? 1,
  };
}

function normalizedOrganizationBoardsKey(input: OrganizationBoardsInput) {
  return {
    filter: input.filter ?? "",
    orderBy: input.orderBy ?? "",
    orderDir: input.orderDir ?? "",
    pageNum: input.pageNum ?? 1,
    projectNames: input.projectNames ?? [],
  };
}

function normalizeLabels(labels: Partial<BoardLabel>[] | undefined): BoardLabel[] {
  return (labels ?? []).map((label) => ({
    categoryId: label.categoryId ?? "",
    categoryIsExclusive: label.categoryIsExclusive ?? false,
    categoryName: label.categoryName ?? "",
    color: label.color ?? "",
    id: label.id ?? "",
    name: label.name ?? "",
  }));
}

function normalizeAttachments(
  attachments: Partial<BoardAttachment>[] | undefined,
): BoardAttachment[] {
  return (attachments ?? []).map((attachment) => ({
    id: attachment.id ?? "",
    mimeType: attachment.mimeType ?? "",
    name: attachment.name ?? "",
    size: attachment.size ?? 0,
  }));
}

function normalizePostListItem(item: Partial<BoardPostListItem>): BoardPostListItem {
  return {
    authorLabel: item.authorLabel ?? "",
    authorLoginId: item.authorLoginId ?? "",
    commentCount: item.commentCount ?? 0,
    createdLabel: item.createdLabel ?? "",
    labels: normalizeLabels(item.labels),
    notice: item.notice ?? false,
    ownerName: item.ownerName ?? "",
    postNumber: item.postNumber ?? "",
    projectName: item.projectName ?? "",
    readme: item.readme ?? false,
    title: item.title ?? "",
    updatedLabel: item.updatedLabel ?? "",
  };
}

function normalizePermissions(
  response: Partial<BoardPostDetail> & {
    permissions?: Partial<BoardPostPermissions> & {
      canMarkNotice?: boolean;
      canMarkReadme?: boolean;
    };
    viewerCanComment?: boolean;
    viewerCanCreate?: boolean;
    viewerCanDelete?: boolean;
    viewerCanRead?: boolean;
    viewerCanSetNotice?: boolean;
    viewerCanWatch?: boolean;
    viewerCanUpdate?: boolean;
  },
): BoardPostPermissions {
  return {
    canComment: response.permissions?.canComment ?? response.viewerCanComment ?? false,
    canCreate: response.permissions?.canCreate ?? response.viewerCanCreate ?? false,
    canDelete: response.permissions?.canDelete ?? response.viewerCanDelete ?? false,
    canRead: response.permissions?.canRead ?? response.viewerCanRead ?? true,
    canSetNotice:
      response.permissions?.canSetNotice ??
      response.permissions?.canMarkNotice ??
      response.viewerCanSetNotice ??
      false,
    canWatch: response.permissions?.canWatch ?? response.viewerCanWatch ?? false,
    canUpdate: response.permissions?.canUpdate ?? response.viewerCanUpdate ?? false,
  };
}

function normalizePostDetail(response: Partial<BoardPostDetail>): BoardPostDetail {
  return {
    ...normalizePostListItem(response),
    attachments: normalizeAttachments(response.attachments),
    authorId: response.authorId ?? "",
    bodyHtml: response.bodyHtml ?? "",
    bodyMarkdown: response.bodyMarkdown ?? "",
    comments: (response.comments ?? []).map((comment) => ({
      attachments: normalizeAttachments(comment.attachments),
      authorId: comment.authorId ?? "",
      authorLabel: comment.authorLabel ?? "",
      authorLoginId: comment.authorLoginId ?? "",
      contentsHtml: comment.contentsHtml ?? "",
      contentsMarkdown: comment.contentsMarkdown ?? "",
      createdLabel: comment.createdLabel ?? "",
      id: comment.id ?? "",
      parentCommentId: comment.parentCommentId ?? "",
    })),
    id: response.id ?? "",
    isWatching: response.isWatching ?? false,
    permissions: normalizePermissions(response),
    watcherCount: response.watcherCount ?? 0,
  };
}

function normalizePage(response: Partial<BoardPage> | undefined): BoardPage {
  return {
    pageNum: response?.pageNum ?? 1,
    pageSize: response?.pageSize ?? 15,
    totalCount: response?.totalCount ?? 0,
  };
}

function normalizeDefaultPermissions(
  response: Partial<BoardDefaultPermissions> | undefined,
): BoardDefaultPermissions {
  return {
    canAttachFiles: response?.canAttachFiles ?? false,
    canCreate: response?.canCreate ?? false,
    canMarkNotice: response?.canMarkNotice ?? false,
    canMarkReadme: response?.canMarkReadme ?? false,
  };
}

function normalizeProjectPostsResponse(
  response: Partial<ProjectPostsResponse> & {
    items?: BoardPostListItem[];
    page?: BoardPage;
    pageNum?: number;
    pageSize?: number;
    posts?: BoardPostListItem[];
    totalCount?: number;
  },
): ProjectPostsResponse {
  const page = normalizePage(
    response.page ?? {
      pageNum: response.pageNum,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
    },
  );
  return {
    items: (response.items ?? response.posts ?? []).map(normalizePostListItem),
    notices: (response.notices ?? []).map(normalizePostListItem),
    ownerName: response.ownerName ?? "",
    pageNum: page.pageNum,
    pageSize: page.pageSize,
    projectName: response.projectName ?? "",
    readme: response.readme ? normalizePostDetail(response.readme) : null,
    totalCount: page.totalCount,
  };
}

function normalizeOrganizationBoardsResponse(
  response: Partial<OrganizationBoardsResponse> & {
    items?: BoardPostListItem[];
    page?: BoardPage;
    pageNum?: number;
    pageSize?: number;
    posts?: BoardPostListItem[];
    projects?: Array<{ ownerName: string; projectName: string }>;
    totalCount?: number;
    visibleProjects?: Array<{ ownerName: string; projectName: string }>;
  },
): OrganizationBoardsResponse {
  const page = normalizePage(
    response.page ?? {
      pageNum: response.pageNum,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
    },
  );
  return {
    items: (response.items ?? response.posts ?? []).map(normalizePostListItem),
    organizationName: response.organizationName ?? "",
    pageNum: page.pageNum,
    pageSize: page.pageSize,
    totalCount: page.totalCount,
    visibleProjects: response.visibleProjects ?? response.projects ?? [],
  };
}

function normalizePostFormOptions(response: Partial<BoardPostFormOptions>): BoardPostFormOptions {
  return {
    canAttachFiles: response.canAttachFiles ?? false,
    canMarkNotice: response.canMarkNotice ?? false,
    canMarkReadme: response.canMarkReadme ?? false,
    defaultPermissions: normalizeDefaultPermissions(response.defaultPermissions),
    labels: normalizeLabels(response.labels),
  };
}

function postMutationBody(input: BoardPostMutationInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    bodyMarkdown: input.bodyMarkdown,
    labelIds: input.labelIds ?? [],
    notice: input.notice ?? false,
    readme: input.readme ?? false,
    title: input.title,
  };
}

function commentMutationBody(input: BoardCommentInput) {
  return {
    attachmentIds: input.attachmentIds ?? [],
    contentsMarkdown: input.contentsMarkdown,
  };
}

export function listProjectPostsRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectPostsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectPostsResponse> {
  return restFetch<Partial<ProjectPostsResponse>>(
    runtimeConfig,
    `${projectPostsPath(input.ownerName, input.projectName)}${queryString({
      filter: input.filter,
      labelIds: input.labelIds,
      orderBy: input.orderBy,
      orderDir: input.orderDir,
      pageNum: input.pageNum ?? 1,
    })}`,
    { fetchImpl },
  ).then(normalizeProjectPostsResponse);
}

export function readProjectPostRest(
  runtimeConfig: RuntimeConfig,
  input: { ownerName: string; postNumber: number | string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    projectPostPath(input.ownerName, input.projectName, input.postNumber),
    { fetchImpl },
  ).then(normalizePostDetail);
}

export function readProjectPostFormOptionsRest(
  runtimeConfig: RuntimeConfig,
  input: { ownerName: string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostFormOptions> {
  return restFetch<Partial<BoardPostFormOptions>>(
    runtimeConfig,
    `${projectPostsPath(input.ownerName, input.projectName)}/form-options`,
    { fetchImpl },
  ).then(normalizePostFormOptions);
}

export function listOrganizationBoardsRest(
  runtimeConfig: RuntimeConfig,
  input: OrganizationBoardsInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationBoardsResponse> {
  return restFetch<Partial<OrganizationBoardsResponse>>(
    runtimeConfig,
    `/organizations/${encodePathSegment(input.organizationName)}/boards${queryString({
      filter: input.filter,
      orderBy: input.orderBy,
      orderDir: input.orderDir,
      pageNum: input.pageNum ?? 1,
      projectNames: input.projectNames,
    })}`,
    { fetchImpl },
  ).then(normalizeOrganizationBoardsResponse);
}

export function createProjectPostRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: BoardPostMutationInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    projectPostsPath(input.ownerName, input.projectName),
    {
      body: postMutationBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizePostDetail);
}

export function updateProjectPostRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: BoardPostUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    projectPostPath(input.ownerName, input.projectName, input.postNumber),
    {
      body: postMutationBody(input),
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizePostDetail);
}

export async function deleteProjectPostRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: { ownerName: string; postNumber: number | string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await restFetch(
    runtimeConfig,
    projectPostPath(input.ownerName, input.projectName, input.postNumber),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function createPostCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: BoardCommentInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    `${projectPostPath(input.ownerName, input.projectName, input.postNumber)}/comments`,
    {
      body: commentMutationBody(input),
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizePostDetail);
}

export function updatePostCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: BoardCommentUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    `${projectPostPath(input.ownerName, input.projectName, input.postNumber)}/comments/${String(input.commentId)}`,
    {
      body: commentMutationBody(input),
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  ).then(normalizePostDetail);
}

export function deletePostCommentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: {
    commentId: number | string;
    ownerName: string;
    postNumber: number | string;
    projectName: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    `${projectPostPath(input.ownerName, input.projectName, input.postNumber)}/comments/${String(input.commentId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizePostDetail);
}

export function watchPostRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: { ownerName: string; postNumber: number | string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    `${projectPostPath(input.ownerName, input.projectName, input.postNumber)}/watch`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizePostDetail);
}

export function unwatchPostRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: { ownerName: string; postNumber: number | string; projectName: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BoardPostDetail> {
  return restFetch<Partial<BoardPostDetail>>(
    runtimeConfig,
    `${projectPostPath(input.ownerName, input.projectName, input.postNumber)}/watch`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizePostDetail);
}

export function listProjectPostsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPostsInput,
) {
  return queryOptions({
    queryFn: () => listProjectPostsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.posts(
      input.ownerName,
      input.projectName,
      normalizedProjectPostsKey(input),
    ),
  });
}

export function readProjectPostQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: { ownerName: string; postNumber: number | string; projectName: string },
) {
  return queryOptions({
    queryFn: () => readProjectPostRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.post(input.ownerName, input.projectName, input.postNumber),
  });
}

export function readProjectPostFormOptionsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: { ownerName: string; projectName: string },
) {
  return queryOptions({
    queryFn: () => readProjectPostFormOptionsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.postFormOptions(input.ownerName, input.projectName),
  });
}

export function listOrganizationBoardsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: OrganizationBoardsInput,
) {
  return queryOptions({
    queryFn: () => listOrganizationBoardsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.organization.boards(
      input.organizationName,
      normalizedOrganizationBoardsKey(input),
    ),
  });
}
