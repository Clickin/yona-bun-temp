import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type SiteUserState = "ACTIVE" | "DELETED" | "GUEST" | "LOCKED" | "SITE_ADMIN";

export type SiteUsersQueryInput = {
  pageNum: number;
  pageSize: number;
  query: string;
  state: SiteUserState;
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

export type SiteUserTab = {
  state: SiteUserState;
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

export const SITE_USER_STATES: SiteUserState[] = [
  "ACTIVE",
  "LOCKED",
  "DELETED",
  "GUEST",
  "SITE_ADMIN",
];

export const DEFAULT_SITE_USERS_QUERY: SiteUsersQueryInput = {
  pageNum: 1,
  pageSize: 30,
  query: "",
  state: "ACTIVE",
};

function normalizeSiteUserState(value: unknown): SiteUserState {
  const normalized = String(value ?? "").toUpperCase();
  return SITE_USER_STATES.includes(normalized as SiteUserState)
    ? (normalized as SiteUserState)
    : "ACTIVE";
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

function normalizeSiteUsersResponse(response: Partial<SiteUsersResponse>): SiteUsersResponse {
  const items = (response.items ?? []).map((item) => ({
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
  }));
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
