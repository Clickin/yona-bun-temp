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

function siteUsersPath(input: SiteUserListInput): string {
  const params = new URLSearchParams();
  params.set("state", input.state);
  if (input.query.trim() !== "") {
    params.set("query", input.query.trim());
  }
  params.set("page", String(input.page));
  return `/site/users?${params.toString()}`;
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

export function siteUsersQueryOptions(runtimeConfig: RuntimeConfig, input: SiteUserListInput) {
  return queryOptions({
    queryFn: () => readSiteUsersRest(runtimeConfig, input),
    queryKey: apiQueryKeys.siteAdmin.users(input),
  });
}
