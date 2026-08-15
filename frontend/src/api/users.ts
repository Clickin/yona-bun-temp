import { queryOptions } from "@tanstack/react-query";
import type {
  WorkspaceIssueItem,
  WorkspaceMemberProjectItem,
  WorkspaceProfile,
  WorkspacePullRequestItem,
} from "./types";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";
import { prefixBasePath } from "../runtime-config";

type WorkspaceProfileWithGuest = WorkspaceProfile & { isGuest?: boolean };

export type PublicUserProfileResponse = {
  daysAgo: number;
  issueItems: WorkspaceIssueItem[];
  memberProjects: WorkspaceMemberProjectItem[];
  profile?: WorkspaceProfileWithGuest;
  pullRequestItems: WorkspacePullRequestItem[];
  redirectPath?: string;
  selected: string;
  viewerCanEditProfile: boolean;
};

export type PublicUserProfileInput = {
  daysAgo?: number | null;
  loginId: string;
  selected?: string | null;
};

export type UserStatisticsResponse = {
  assignedIssue: number;
  issue: number;
  issueComment: number;
  issueCommentVoter: number;
  issueVoter: number;
  posting: number;
  postingComment: number;
};

export type LegacyMemberUserSearchItem = {
  info: string;
  loginId: string;
};

export type LegacyMemberUserSearchResponse = {
  items: LegacyMemberUserSearchItem[];
  total: number;
  truncated: boolean;
};

function normalizePublicUserProfileResponse(
  response: PublicUserProfileResponse,
): PublicUserProfileResponse {
  return {
    ...response,
    issueItems: response.issueItems ?? [],
    memberProjects: response.memberProjects ?? [],
    profile: response.profile
      ? {
          ...response.profile,
          avatarUrl: response.profile.avatarUrl ?? "",
          connectedSocialProviders: response.profile.connectedSocialProviders ?? [],
          displayName: response.profile.displayName ?? "",
          englishName: response.profile.englishName ?? "",
          isBlocked: response.profile.isBlocked ?? false,
          isGuest: (response.profile as WorkspaceProfileWithGuest).isGuest ?? false,
          isSiteAdmin: response.profile.isSiteAdmin ?? false,
          loginId: response.profile.loginId ?? "",
          primaryEmailAddress: response.profile.primaryEmailAddress ?? "",
          sinceLabel: response.profile.sinceLabel ?? "",
        }
      : undefined,
    pullRequestItems: response.pullRequestItems ?? [],
    redirectPath: response.redirectPath || undefined,
  };
}

function publicUserProfilePath(input: PublicUserProfileInput): string {
  const query = new URLSearchParams();
  if (input.daysAgo && input.daysAgo > 0) {
    query.set("daysAgo", String(input.daysAgo));
  }
  if (input.selected && input.selected.trim() !== "") {
    query.set("selected", input.selected);
  }
  const suffix = query.toString();
  return `/users/${encodeURIComponent(input.loginId)}/profile${suffix ? `?${suffix}` : ""}`;
}

function normalizeUserStatisticsResponse(response: UserStatisticsResponse): UserStatisticsResponse {
  return {
    assignedIssue: response.assignedIssue ?? 0,
    issue: response.issue ?? 0,
    issueComment: response.issueComment ?? 0,
    issueCommentVoter: response.issueCommentVoter ?? 0,
    issueVoter: response.issueVoter ?? 0,
    posting: response.posting ?? 0,
    postingComment: response.postingComment ?? 0,
  };
}

function parseLegacyContentRange(value: string | null, itemCount: number) {
  const match = /^items\s+([0-9]+)\/([0-9]+)$/.exec(value ?? "");
  if (!match) {
    return { total: itemCount, truncated: false };
  }
  const returned = Number.parseInt(match[1] ?? "0", 10);
  const total = Number.parseInt(match[2] ?? String(itemCount), 10);
  return {
    total,
    truncated: returned < total,
  };
}

function normalizeLegacyMemberUserSearchResponse(
  payload: unknown,
  contentRange: string | null,
): LegacyMemberUserSearchResponse {
  const items = Array.isArray(payload)
    ? payload.map((item) => {
        const candidate = item as Partial<LegacyMemberUserSearchItem>;
        return {
          info: candidate.info ?? "",
          loginId: candidate.loginId ?? "",
        };
      })
    : [];
  const range = parseLegacyContentRange(contentRange, items.length);
  return {
    items,
    total: range.total,
    truncated: range.truncated,
  };
}

export async function searchLegacyMemberUsers(
  runtimeConfig: RuntimeConfig,
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LegacyMemberUserSearchResponse> {
  const params = new URLSearchParams();
  params.set("query", query);
  const response = await fetchImpl(
    prefixBasePath(runtimeConfig.basePath, `/-_-api/v1/users?${params.toString()}`),
    {
      credentials: "same-origin",
      headers: new Headers({ Accept: "application/json" }),
      method: "GET",
    },
  );
  if (!response.ok) {
    throw new Error(`Legacy users search failed with ${response.status}.`);
  }
  const payload = response.status === 204 ? [] : await response.json().catch(() => []);

  return normalizeLegacyMemberUserSearchResponse(payload, response.headers.get("Content-Range"));
}

export async function readPublicUserProfile(
  runtimeConfig: RuntimeConfig,
  input: PublicUserProfileInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicUserProfileResponse> {
  const response = await restFetch<PublicUserProfileResponse>(
    runtimeConfig,
    publicUserProfilePath(input),
    { fetchImpl },
  );
  return normalizePublicUserProfileResponse(response);
}

export function readPublicUserProfileQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: PublicUserProfileInput,
) {
  return queryOptions({
    // retry: 0 — legacy 404 profile answers immediately; TanStack Query's
    // retryer pauses between attempts while the document is unfocused, so a
    // retrying 404 never reaches isError in hidden WTR iframes (missing
    // profile error-wrap never renders).
    queryFn: () => readPublicUserProfile(runtimeConfig, input),
    queryKey: apiQueryKeys.user.profile(input.loginId, {
      daysAgo: input.daysAgo ?? null,
      selected: input.selected ?? null,
    }),
    retry: 0,
  });
}

export async function readUserStatistics(
  runtimeConfig: RuntimeConfig,
  loginId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UserStatisticsResponse> {
  const response = await restFetch<UserStatisticsResponse>(
    runtimeConfig,
    `/users/${encodeURIComponent(loginId)}/statistics`,
    { fetchImpl },
  );
  return normalizeUserStatisticsResponse(response);
}

export function readUserStatisticsQueryOptions(runtimeConfig: RuntimeConfig, loginId: string) {
  return queryOptions({
    queryFn: () => readUserStatistics(runtimeConfig, loginId),
    queryKey: apiQueryKeys.user.statistics(loginId),
  });
}
