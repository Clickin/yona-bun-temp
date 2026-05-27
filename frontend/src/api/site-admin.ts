import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type SiteUserState = "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN";
export type SiteIssueState = "closed" | "open";

export interface SiteUserListInput {
  page: number;
  query: string;
  state: SiteUserState;
}

export interface SiteUser {
  createdAt: string;
  displayName: string;
  emailAddress: string;
  id: number;
  isGuest: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  state: SiteUserState;
}

export interface SiteUserListResponse {
  page: number;
  pageSize: number;
  query: string;
  siteAdminCount: number;
  state: SiteUserState;
  total: number;
  totalPages: number;
  users: SiteUser[];
}

export interface SiteUserMutationResponse {
  user: SiteUser;
}

export interface SiteUserPasswordResetResponse {
  isSuccess: boolean;
  loginId: string;
  name: string;
  newPassword: string;
}

export interface SiteProjectListInput {
  filter: string;
  page: number;
}

export interface SiteProject {
  createdAt: string;
  id: number;
  ownerName: string;
  overview: string;
  projectName: string;
}

export interface SiteProjectListResponse {
  filter: string;
  page: number;
  pageSize: number;
  projects: SiteProject[];
  total: number;
  totalPages: number;
}

export interface SiteProjectDeleteResponse {
  ok: boolean;
  redirectPath: string;
}

export interface SitePostListInput {
  page: number;
}

export interface SitePost {
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  createdLabel: string;
  labels: Array<{ id: string; name: string }>;
  notice: boolean;
  ownerName: string;
  postNumber: string;
  projectName: string;
  readme: boolean;
  title: string;
  updatedLabel: string;
}

export interface SitePostListResponse {
  page: number;
  pageSize: number;
  posts: SitePost[];
  total: number;
  totalPages: number;
}

export interface SiteIssueListInput {
  page: number;
  state: SiteIssueState;
}

export interface SiteIssue {
  assigneeLabel: string;
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  createdLabel: string;
  issueNumber: string;
  labels: Array<{ id: string; name: string }>;
  milestoneTitle: string;
  ownerName: string;
  projectName: string;
  state: SiteIssueState;
  title: string;
  updatedLabel: string;
  voterCount: number;
  watcherCount: number;
}

export interface SiteIssueListResponse {
  issues: SiteIssue[];
  page: number;
  pageSize: number;
  state: SiteIssueState;
  total: number;
  totalPages: number;
}

export interface SiteDiagnosticsResponse {
  errorCount: number;
  errors: string[];
}

export interface SiteUpdateResponse {
  currentVersion: string;
  error: string | null;
  message: string;
  releaseUrl: string | null;
  versionToUpdate: string | null;
}

export interface SiteMailOptionsResponse {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
}

export interface SiteMailSendInput {
  body: string;
  from: string;
  subject: string;
  to: string;
}

export interface SiteMailListInput {
  all: boolean;
  projects: string[];
}

export interface SiteMailListResponse {
  recipients: string[];
}

function siteUsersPath(input: SiteUserListInput): string {
  const params = new URLSearchParams();
  params.set("state", input.state);
  if (input.query.trim() !== "") {
    params.set("query", input.query.trim());
  }
  params.set("page", String(input.page));
  return `/site/users?${params.toString()}`;
}

function siteProjectsPath(input: SiteProjectListInput): string {
  const params = new URLSearchParams();
  if (input.filter.trim() !== "") {
    params.set("filter", input.filter.trim());
  }
  params.set("page", String(input.page));
  return `/site/projects?${params.toString()}`;
}

function sitePostsPath(input: SitePostListInput): string {
  const params = new URLSearchParams();
  params.set("page", String(input.page));
  return `/site/posts?${params.toString()}`;
}

function siteIssuesPath(input: SiteIssueListInput): string {
  const params = new URLSearchParams();
  params.set("state", input.state);
  params.set("page", String(input.page));
  return `/site/issues?${params.toString()}`;
}

function siteUserPath(loginId: string, action: "account-lock" | "guest" | "site-admin"): string {
  return `/site/users/${encodeURIComponent(loginId)}/${action}/toggle`;
}

export function readSiteUsersRest(
  runtimeConfig: RuntimeConfig,
  input: SiteUserListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserListResponse> {
  return restFetch<SiteUserListResponse>(runtimeConfig, siteUsersPath(input), {
    fetchImpl,
    method: "GET",
  });
}

export function readSiteProjectsRest(
  runtimeConfig: RuntimeConfig,
  input: SiteProjectListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteProjectListResponse> {
  return restFetch<SiteProjectListResponse>(runtimeConfig, siteProjectsPath(input), {
    fetchImpl,
    method: "GET",
  });
}

export function readSitePostsRest(
  runtimeConfig: RuntimeConfig,
  input: SitePostListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SitePostListResponse> {
  return restFetch<SitePostListResponse>(runtimeConfig, sitePostsPath(input), {
    fetchImpl,
    method: "GET",
  });
}

export function readSiteIssuesRest(
  runtimeConfig: RuntimeConfig,
  input: SiteIssueListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteIssueListResponse> {
  return restFetch<SiteIssueListResponse>(runtimeConfig, siteIssuesPath(input), {
    fetchImpl,
    method: "GET",
  });
}

export function readSiteDiagnosticsRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteDiagnosticsResponse> {
  return restFetch<SiteDiagnosticsResponse>(runtimeConfig, "/site/diagnostics", {
    fetchImpl,
    method: "GET",
  });
}

export function readSiteMailRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteMailOptionsResponse> {
  return restFetch<SiteMailOptionsResponse>(runtimeConfig, "/site/mail", {
    fetchImpl,
    method: "GET",
  });
}

export function readSiteUpdateRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUpdateResponse> {
  return restFetch<SiteUpdateResponse>(runtimeConfig, "/site/update", {
    fetchImpl,
    method: "GET",
  });
}

export function sendSiteMailRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: SiteMailSendInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteMailOptionsResponse> {
  return restFetch<SiteMailOptionsResponse>(runtimeConfig, "/site/mail/test", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function readSiteMailListRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: SiteMailListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteMailListResponse> {
  return restFetch<SiteMailListResponse>(runtimeConfig, "/site/mail-list", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function toggleSiteUserAdminRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserMutationResponse> {
  return restFetch<SiteUserMutationResponse>(runtimeConfig, siteUserPath(loginId, "site-admin"), {
    body: {},
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function toggleSiteUserAccountLockRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserMutationResponse> {
  return restFetch<SiteUserMutationResponse>(runtimeConfig, siteUserPath(loginId, "account-lock"), {
    body: {},
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function toggleSiteUserGuestRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserMutationResponse> {
  return restFetch<SiteUserMutationResponse>(runtimeConfig, siteUserPath(loginId, "guest"), {
    body: {},
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function resetSiteUserPasswordRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserPasswordResetResponse> {
  return restFetch<SiteUserPasswordResetResponse>(
    runtimeConfig,
    `/site/users/${encodeURIComponent(loginId)}/password/reset`,
    {
      body: {},
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function deleteSiteUserRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteUserMutationResponse> {
  return restFetch<SiteUserMutationResponse>(
    runtimeConfig,
    `/site/users/${encodeURIComponent(loginId)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function deleteSiteProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  projectId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteProjectDeleteResponse> {
  return restFetch<SiteProjectDeleteResponse>(runtimeConfig, `/site/projects/${projectId}`, {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  });
}

export function siteUsersQueryOptions(runtimeConfig: RuntimeConfig, input: SiteUserListInput) {
  return queryOptions({
    queryFn: () => readSiteUsersRest(runtimeConfig, input),
    queryKey: apiQueryKeys.siteAdmin.users(input),
  });
}

export function siteProjectsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: SiteProjectListInput,
) {
  return queryOptions({
    queryFn: () => readSiteProjectsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.siteAdmin.projects(input),
  });
}

export function sitePostsQueryOptions(runtimeConfig: RuntimeConfig, input: SitePostListInput) {
  return queryOptions({
    queryFn: () => readSitePostsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.siteAdmin.posts(input),
  });
}

export function siteIssuesQueryOptions(runtimeConfig: RuntimeConfig, input: SiteIssueListInput) {
  return queryOptions({
    queryFn: () => readSiteIssuesRest(runtimeConfig, input),
    queryKey: apiQueryKeys.siteAdmin.issues(input),
  });
}

export function siteDiagnosticsQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteDiagnosticsRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.diagnostics(),
  });
}

export function siteMailOptionsQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteMailRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.mail(),
  });
}

export function siteUpdateQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => readSiteUpdateRest(runtimeConfig),
    queryKey: apiQueryKeys.siteAdmin.update(),
  });
}
