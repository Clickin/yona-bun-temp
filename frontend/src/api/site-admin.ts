import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type SiteUserState = "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN";

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
