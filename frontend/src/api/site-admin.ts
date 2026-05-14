import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type SiteUserState = "ACTIVE" | "DELETED" | "GUEST" | "LOCKED" | "SITE_ADMIN";
export type SiteIssueState = "OPEN" | "CLOSED";

export type SiteUsersQueryInput = {
  pageNum: number;
  pageSize: number;
  query: string;
  state: SiteUserState;
};

export type SiteProjectsQueryInput = {
  filter: string;
  pageNum: number;
  pageSize: number;
};

export type SitePostsQueryInput = {
  pageNum: number;
  pageSize: number;
};

export type SiteIssuesQueryInput = {
  pageNum: number;
  pageSize: number;
  state: SiteIssueState;
};

export type SiteUserListItem = {
  avatarUrl: string;
  createdAt: string;
  createdLabel: string;
  displayName: string;
  emailAddress: string;
  id: string;
  isGuest: boolean;
  isSiteAdmin: boolean;
  lastStateModifiedAt: string;
  lastStateModifiedLabel: string;
  loginId: string;
  state: string;
};

export type SiteUserPasswordResetResponse = {
  isSuccess: boolean;
  loginId: string;
  name: string;
  newPassword: string;
};

export type SiteUserDeleteResponse = {
  ok: boolean;
  redirectPath: string;
};

export type SiteProjectListItem = {
  createdAt: string;
  createdLabel: string;
  deletePath: string;
  id: string;
  logoUrl: string;
  overview: string;
  ownerName: string;
  projectName: string;
  projectPath: string;
};

export type SiteProjectDeleteResponse = {
  ok: boolean;
  redirectPath: string;
};

export type SitePostListItem = {
  authorAvatarUrl: string;
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  commentsPath: string;
  createdAt: string;
  createdLabel: string;
  id: string;
  ownerName: string;
  postNumber: string;
  postPath: string;
  projectName: string;
  projectPath: string;
  title: string;
};

export type SiteIssueListItem = {
  authorAvatarUrl: string;
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  commentsPath: string;
  createdAt: string;
  createdLabel: string;
  id: string;
  issueNumber: string;
  issuePath: string;
  ownerName: string;
  projectName: string;
  projectPath: string;
  state: SiteIssueState;
  title: string;
};

export type SiteUserTab = {
  state: SiteUserState;
  total: number;
};

export type SiteIssueTab = {
  state: SiteIssueState;
  total: number;
};

export type SiteUsersResponse = {
  hasMore: boolean;
  items: SiteUserListItem[];
  pageNum: number;
  pageSize: number;
  query: string;
  state: SiteUserState;
  tabs: SiteUserTab[];
  total: number;
};

export type SiteProjectsResponse = {
  filter: string;
  hasMore: boolean;
  items: SiteProjectListItem[];
  pageNum: number;
  pageSize: number;
  total: number;
};

export type SitePostsResponse = {
  hasMore: boolean;
  items: SitePostListItem[];
  pageNum: number;
  pageSize: number;
  total: number;
};

export type SiteIssuesResponse = {
  hasMore: boolean;
  items: SiteIssueListItem[];
  pageNum: number;
  pageSize: number;
  state: SiteIssueState;
  tabs: SiteIssueTab[];
  total: number;
};

export type SiteDiagnosticsResponse = {
  errors: string[];
  hasErrors: boolean;
  total: number;
};

export type SiteUpdateResponse = {
  currentVersion: string;
  hasUpdate: boolean;
  isWatched: boolean;
  releaseUrl: string | null;
  versionToUpdate: string | null;
};

export type SiteMailResponse = {
  errorMessage: string | null;
  notConfiguredItems: string[];
  sender: string;
  sended: boolean;
};

export type SiteMailInput = {
  body: string;
  from: string;
  subject: string;
  to: string;
};

export const SITE_USER_STATES: SiteUserState[] = [
  "ACTIVE",
  "LOCKED",
  "DELETED",
  "GUEST",
  "SITE_ADMIN",
];

export const SITE_ISSUE_STATES: SiteIssueState[] = ["OPEN", "CLOSED"];

export const DEFAULT_SITE_USERS_QUERY: SiteUsersQueryInput = {
  pageNum: 1,
  pageSize: 30,
  query: "",
  state: "ACTIVE",
};

export const DEFAULT_SITE_PROJECTS_QUERY: SiteProjectsQueryInput = {
  filter: "",
  pageNum: 1,
  pageSize: 25,
};

export const DEFAULT_SITE_POSTS_QUERY: SitePostsQueryInput = {
  pageNum: 1,
  pageSize: 30,
};

export const DEFAULT_SITE_ISSUES_QUERY: SiteIssuesQueryInput = {
  pageNum: 1,
  pageSize: 30,
  state: "OPEN",
};

function normalizeSiteUserState(value: unknown): SiteUserState {
  const normalized = String(value ?? "").toUpperCase();
  return SITE_USER_STATES.includes(normalized as SiteUserState)
    ? (normalized as SiteUserState)
    : "ACTIVE";
}

function normalizeSiteIssueState(value: unknown): SiteIssueState {
  const normalized = String(value ?? "").toUpperCase();
  return SITE_ISSUE_STATES.includes(normalized as SiteIssueState)
    ? (normalized as SiteIssueState)
    : "OPEN";
}

export function normalizeSiteUsersQuery(
  input: Partial<SiteUsersQueryInput> = {},
): SiteUsersQueryInput {
  return {
    pageNum: Math.max(1, Number(input.pageNum || DEFAULT_SITE_USERS_QUERY.pageNum)),
    pageSize: Math.max(1, Number(input.pageSize || DEFAULT_SITE_USERS_QUERY.pageSize)),
    query: input.query ?? "",
    state: normalizeSiteUserState(input.state),
  };
}

export function normalizeSiteProjectsQuery(
  input: Partial<SiteProjectsQueryInput> = {},
): SiteProjectsQueryInput {
  return {
    filter: input.filter ?? "",
    pageNum: Math.max(1, Number(input.pageNum || DEFAULT_SITE_PROJECTS_QUERY.pageNum)),
    pageSize: Math.max(1, Number(input.pageSize || DEFAULT_SITE_PROJECTS_QUERY.pageSize)),
  };
}

export function normalizeSitePostsQuery(
  input: Partial<SitePostsQueryInput> = {},
): SitePostsQueryInput {
  return {
    pageNum: Math.max(1, Number(input.pageNum || DEFAULT_SITE_POSTS_QUERY.pageNum)),
    pageSize: Math.max(1, Number(input.pageSize || DEFAULT_SITE_POSTS_QUERY.pageSize)),
  };
}

export function normalizeSiteIssuesQuery(
  input: Partial<SiteIssuesQueryInput> = {},
): SiteIssuesQueryInput {
  return {
    pageNum: Math.max(1, Number(input.pageNum || DEFAULT_SITE_ISSUES_QUERY.pageNum)),
    pageSize: Math.max(1, Number(input.pageSize || DEFAULT_SITE_ISSUES_QUERY.pageSize)),
    state: normalizeSiteIssueState(input.state),
  };
}

function normalizeSiteUsersResponse(response: Partial<SiteUsersResponse>): SiteUsersResponse {
  const items = (response.items ?? []).map(normalizeSiteUserItem);
  const state = normalizeSiteUserState(response.state);
  return {
    hasMore: response.hasMore ?? false,
    items,
    pageNum: response.pageNum ?? DEFAULT_SITE_USERS_QUERY.pageNum,
    pageSize: response.pageSize ?? DEFAULT_SITE_USERS_QUERY.pageSize,
    query: response.query ?? "",
    state,
    tabs: (
      response.tabs ?? SITE_USER_STATES.map((tabState) => ({ state: tabState, total: 0 }))
    ).map((tab) => ({
      state: normalizeSiteUserState(tab.state),
      total: tab.total ?? 0,
    })),
    total: response.total ?? items.length,
  };
}

function normalizeSiteUserItem(item: Partial<SiteUserListItem>): SiteUserListItem {
  return {
    avatarUrl: item.avatarUrl ?? "",
    createdAt: item.createdAt ?? "",
    createdLabel: item.createdLabel ?? "",
    displayName: item.displayName ?? "",
    emailAddress: item.emailAddress ?? "",
    id: item.id ?? "",
    isGuest: item.isGuest ?? false,
    isSiteAdmin: item.isSiteAdmin ?? false,
    lastStateModifiedAt: item.lastStateModifiedAt ?? "",
    lastStateModifiedLabel: item.lastStateModifiedLabel ?? "",
    loginId: item.loginId ?? "",
    state: item.state ?? "",
  };
}

function normalizeSiteUserPasswordResetResponse(
  response: Partial<SiteUserPasswordResetResponse>,
): SiteUserPasswordResetResponse {
  return {
    isSuccess: response.isSuccess ?? false,
    loginId: response.loginId ?? "",
    name: response.name ?? "",
    newPassword: response.newPassword ?? "",
  };
}

function normalizeSiteUserDeleteResponse(
  response: Partial<SiteUserDeleteResponse>,
): SiteUserDeleteResponse {
  return {
    ok: response.ok ?? false,
    redirectPath: response.redirectPath ?? "/sites/userList",
  };
}

function normalizeSiteProjectsResponse(
  response: Partial<SiteProjectsResponse>,
): SiteProjectsResponse {
  const items = (response.items ?? []).map((item) => ({
    createdAt: item.createdAt ?? "",
    createdLabel: item.createdLabel ?? "",
    deletePath: item.deletePath ?? "",
    id: item.id ?? "",
    logoUrl: item.logoUrl ?? "",
    overview: item.overview ?? "",
    ownerName: item.ownerName ?? "",
    projectName: item.projectName ?? "",
    projectPath: item.projectPath ?? "",
  }));
  return {
    filter: response.filter ?? "",
    hasMore: response.hasMore ?? false,
    items,
    pageNum: response.pageNum ?? DEFAULT_SITE_PROJECTS_QUERY.pageNum,
    pageSize: response.pageSize ?? DEFAULT_SITE_PROJECTS_QUERY.pageSize,
    total: response.total ?? items.length,
  };
}

function normalizeSiteProjectDeleteResponse(
  response: Partial<SiteProjectDeleteResponse>,
): SiteProjectDeleteResponse {
  return {
    ok: response.ok ?? false,
    redirectPath: response.redirectPath ?? "/sites/projectList",
  };
}

function normalizeSitePostsResponse(response: Partial<SitePostsResponse>): SitePostsResponse {
  const items = (response.items ?? []).map((item) => ({
    authorAvatarUrl: item.authorAvatarUrl ?? "",
    authorLabel: item.authorLabel ?? "",
    authorLoginId: item.authorLoginId ?? "",
    commentCount: item.commentCount ?? 0,
    commentsPath: item.commentsPath ?? "",
    createdAt: item.createdAt ?? "",
    createdLabel: item.createdLabel ?? "",
    id: item.id ?? "",
    ownerName: item.ownerName ?? "",
    postNumber: item.postNumber ?? "",
    postPath: item.postPath ?? "",
    projectName: item.projectName ?? "",
    projectPath: item.projectPath ?? "",
    title: item.title ?? "",
  }));
  return {
    hasMore: response.hasMore ?? false,
    items,
    pageNum: response.pageNum ?? DEFAULT_SITE_POSTS_QUERY.pageNum,
    pageSize: response.pageSize ?? DEFAULT_SITE_POSTS_QUERY.pageSize,
    total: response.total ?? items.length,
  };
}

function normalizeSiteIssuesResponse(response: Partial<SiteIssuesResponse>): SiteIssuesResponse {
  const items = (response.items ?? []).map((item) => ({
    authorAvatarUrl: item.authorAvatarUrl ?? "",
    authorLabel: item.authorLabel ?? "",
    authorLoginId: item.authorLoginId ?? "",
    commentCount: item.commentCount ?? 0,
    commentsPath: item.commentsPath ?? "",
    createdAt: item.createdAt ?? "",
    createdLabel: item.createdLabel ?? "",
    id: item.id ?? "",
    issueNumber: item.issueNumber ?? "",
    issuePath: item.issuePath ?? "",
    ownerName: item.ownerName ?? "",
    projectName: item.projectName ?? "",
    projectPath: item.projectPath ?? "",
    state: normalizeSiteIssueState(item.state),
    title: item.title ?? "",
  }));
  const state = normalizeSiteIssueState(response.state);
  return {
    hasMore: response.hasMore ?? false,
    items,
    pageNum: response.pageNum ?? DEFAULT_SITE_ISSUES_QUERY.pageNum,
    pageSize: response.pageSize ?? DEFAULT_SITE_ISSUES_QUERY.pageSize,
    state,
    tabs: (
      response.tabs ?? SITE_ISSUE_STATES.map((tabState) => ({ state: tabState, total: 0 }))
    ).map((tab) => ({
      state: normalizeSiteIssueState(tab.state),
      total: tab.total ?? 0,
    })),
    total: response.total ?? items.length,
  };
}

function normalizeSiteDiagnosticsResponse(
  response: Partial<SiteDiagnosticsResponse>,
): SiteDiagnosticsResponse {
  const errors = (response.errors ?? []).map(String);
  return {
    errors,
    hasErrors: response.hasErrors ?? errors.length > 0,
    total: response.total ?? errors.length,
  };
}

function normalizeSiteUpdateResponse(response: Partial<SiteUpdateResponse>): SiteUpdateResponse {
  return {
    currentVersion: response.currentVersion ?? "",
    hasUpdate: response.hasUpdate ?? Boolean(response.versionToUpdate),
    isWatched: response.isWatched ?? true,
    releaseUrl: response.releaseUrl ?? null,
    versionToUpdate: response.versionToUpdate ?? null,
  };
}

function normalizeSiteMailResponse(response: Partial<SiteMailResponse>): SiteMailResponse {
  return {
    errorMessage: response.errorMessage ?? null,
    notConfiguredItems: (response.notConfiguredItems ?? []).map(String),
    sender: response.sender ?? "",
    sended: response.sended ?? false,
  };
}

export function listSiteUsersRest(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteUsersQueryInput> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUsersResponse> {
  const query = normalizeSiteUsersQuery(input);
  const params = new URLSearchParams();
  params.set("state", query.state);
  params.set("query", query.query);
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  return restFetch<Partial<SiteUsersResponse>>(runtimeConfig, `/sites/users?${params}`, {
    fetchImpl,
  }).then(normalizeSiteUsersResponse);
}

function postSiteUserActionRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  action: "toggle-account-lock" | "toggle-guest-mode" | "toggle-site-admin",
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserListItem> {
  return restFetch<Partial<SiteUserListItem>>(
    runtimeConfig,
    `/sites/users/${encodeURIComponent(loginId)}/${action}`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeSiteUserItem);
}

export function toggleSiteUserRoleRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserListItem> {
  return postSiteUserActionRest(runtimeConfig, csrfToken, loginId, "toggle-site-admin", fetchImpl);
}

export function toggleSiteUserAccountLockRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserListItem> {
  return postSiteUserActionRest(
    runtimeConfig,
    csrfToken,
    loginId,
    "toggle-account-lock",
    fetchImpl,
  );
}

export function toggleSiteUserGuestModeRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserListItem> {
  return postSiteUserActionRest(runtimeConfig, csrfToken, loginId, "toggle-guest-mode", fetchImpl);
}

export function resetSiteUserPasswordRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserPasswordResetResponse> {
  return restFetch<Partial<SiteUserPasswordResetResponse>>(
    runtimeConfig,
    `/sites/users/${encodeURIComponent(loginId)}/reset-password`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  ).then(normalizeSiteUserPasswordResetResponse);
}

export function deleteSiteUserRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserDeleteResponse> {
  return restFetch<Partial<SiteUserDeleteResponse>>(
    runtimeConfig,
    `/sites/users/${encodeURIComponent(userId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizeSiteUserDeleteResponse);
}

export function listSiteProjectsRest(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteProjectsQueryInput> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SiteProjectsResponse> {
  const query = normalizeSiteProjectsQuery(input);
  const params = new URLSearchParams();
  params.set("filter", query.filter);
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  return restFetch<Partial<SiteProjectsResponse>>(runtimeConfig, `/sites/projects?${params}`, {
    fetchImpl,
  }).then(normalizeSiteProjectsResponse);
}

export function deleteSiteProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  projectId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteProjectDeleteResponse> {
  return restFetch<Partial<SiteProjectDeleteResponse>>(
    runtimeConfig,
    `/sites/projects/${encodeURIComponent(projectId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  ).then(normalizeSiteProjectDeleteResponse);
}

export function listSitePostsRest(
  runtimeConfig: RuntimeConfig,
  input: Partial<SitePostsQueryInput> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SitePostsResponse> {
  const query = normalizeSitePostsQuery(input);
  const params = new URLSearchParams();
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  return restFetch<Partial<SitePostsResponse>>(runtimeConfig, `/sites/posts?${params}`, {
    fetchImpl,
  }).then(normalizeSitePostsResponse);
}

export function listSiteIssuesRest(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteIssuesQueryInput> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SiteIssuesResponse> {
  const query = normalizeSiteIssuesQuery(input);
  const params = new URLSearchParams();
  params.set("state", query.state);
  params.set("pageNum", String(query.pageNum));
  params.set("pageSize", String(query.pageSize));
  return restFetch<Partial<SiteIssuesResponse>>(runtimeConfig, `/sites/issues?${params}`, {
    fetchImpl,
  }).then(normalizeSiteIssuesResponse);
}

export function readSiteDiagnosticsRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteDiagnosticsResponse> {
  return restFetch<Partial<SiteDiagnosticsResponse>>(runtimeConfig, "/sites/diagnostics", {
    fetchImpl,
  }).then(normalizeSiteDiagnosticsResponse);
}

export function readSiteUpdateRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUpdateResponse> {
  return restFetch<Partial<SiteUpdateResponse>>(runtimeConfig, "/sites/update", {
    fetchImpl,
  }).then(normalizeSiteUpdateResponse);
}

export function unwatchSiteUpdateRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUpdateResponse> {
  return restFetch<Partial<SiteUpdateResponse>>(runtimeConfig, "/sites/update/unwatch", {
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeSiteUpdateResponse);
}

export function readSiteMailRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteMailResponse> {
  return restFetch<Partial<SiteMailResponse>>(runtimeConfig, "/sites/mail", {
    fetchImpl,
  }).then(normalizeSiteMailResponse);
}

export function sendSiteMailRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: SiteMailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteMailResponse> {
  return restFetch<Partial<SiteMailResponse>>(runtimeConfig, "/sites/mail", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  }).then(normalizeSiteMailResponse);
}

export function listSiteUsersQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteUsersQueryInput> = {},
) {
  const query = normalizeSiteUsersQuery(input);
  return queryOptions({
    queryFn: () => listSiteUsersRest(runtimeConfig, query),
    queryKey: apiQueryKeys.siteAdmin.users(query),
  });
}

export function listSiteProjectsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteProjectsQueryInput> = {},
) {
  const query = normalizeSiteProjectsQuery(input);
  return queryOptions({
    queryFn: () => listSiteProjectsRest(runtimeConfig, query),
    queryKey: apiQueryKeys.siteAdmin.projects(query),
  });
}

export function listSitePostsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: Partial<SitePostsQueryInput> = {},
) {
  const query = normalizeSitePostsQuery(input);
  return queryOptions({
    queryFn: () => listSitePostsRest(runtimeConfig, query),
    queryKey: apiQueryKeys.siteAdmin.posts(query),
  });
}

export function listSiteIssuesQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteIssuesQueryInput> = {},
) {
  const query = normalizeSiteIssuesQuery(input);
  return queryOptions({
    queryFn: () => listSiteIssuesRest(runtimeConfig, query),
    queryKey: apiQueryKeys.siteAdmin.issues(query),
  });
}

export function readSiteDiagnosticsQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteDiagnosticsRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.diagnostics(),
  });
}

export function readSiteUpdateQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteUpdateRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.update(),
  });
}

export function readSiteMailQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteMailRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.mail(),
  });
}
