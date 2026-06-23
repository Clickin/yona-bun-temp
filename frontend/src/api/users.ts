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
    queryFn: () => readPublicUserProfile(runtimeConfig, input),
    queryKey: apiQueryKeys.user.profile(input.loginId, {
      daysAgo: input.daysAgo ?? null,
      selected: input.selected ?? null,
    }),
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
