import { queryOptions } from "@tanstack/react-query";
import type {
  WorkspaceIssueItem,
  WorkspaceMemberProjectItem,
  WorkspaceProfile,
  WorkspacePullRequestItem,
} from "../gen/yona/pilot/v1/pilot_pb";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type PublicUserProfileResponse = {
  daysAgo: number;
  issueItems: WorkspaceIssueItem[];
  memberProjects: WorkspaceMemberProjectItem[];
  profile?: WorkspaceProfile;
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
