import type {
  ReadCurrentSessionResponse,
  ReadWorkspaceOverviewResponse,
  RecordRecentProjectVisitResponse,
} from "../gen/yona/pilot/v1/pilot_pb";
import type { RuntimeConfig } from "../runtime-config";
import { restFetch, type RestFetchOptions } from "./rest-client";

type WorkspaceRecentProjectVisitInput = {
  ownerName: string;
  projectName: string;
};

type WorkspaceNotificationInput = {
  eventType: string;
  projectId: string;
};

function normalizeWorkspaceOverview(
  response: ReadWorkspaceOverviewResponse,
): ReadWorkspaceOverviewResponse {
  return {
    ...response,
    emails: response.emails ?? [],
    favoriteProjects: response.favoriteProjects ?? [],
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
    recentProjects: response.recentProjects ?? [],
    watchedProjects: (response.watchedProjects ?? []).map((project) => ({
      ...project,
      notifications: project.notifications ?? [],
    })),
  };
}

async function workspaceOverviewRest(
  runtimeConfig: RuntimeConfig,
  path: string,
  options: RestFetchOptions = {},
): Promise<ReadWorkspaceOverviewResponse> {
  const response = await restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, path, options);
  return normalizeWorkspaceOverview(response);
}

export function readWorkspaceOverviewRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace", {
    fetchImpl,
  });
}

export function setDefaultLandingPathRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/default-landing-path", {
    body: { path },
    csrfToken,
    fetchImpl,
    method: "PUT",
  });
}

export function updateProfileRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/profile", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "PATCH",
  });
}

export function changePasswordRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadCurrentSessionResponse> {
  return restFetch<ReadCurrentSessionResponse>(runtimeConfig, "/workspace/password", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function resetVisitedProjectsRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/recent-projects", {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  });
}

export function addWorkspaceEmailRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/emails", {
    body: { email },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function deleteWorkspaceEmailRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, `/workspace/emails/${encodeURIComponent(id)}`, {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  });
}

export function sendWorkspaceEmailValidationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(
    runtimeConfig,
    `/workspace/emails/${encodeURIComponent(id)}/validation`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function setMainWorkspaceEmailRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, `/workspace/emails/${encodeURIComponent(id)}/main`, {
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function resetApiTokenRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/api-token/reset", {
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function toggleWorkspaceNotificationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: WorkspaceNotificationInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return workspaceOverviewRest(runtimeConfig, "/workspace/notifications", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function recordRecentProjectVisitRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: WorkspaceRecentProjectVisitInput,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordRecentProjectVisitResponse> {
  return restFetch<RecordRecentProjectVisitResponse>(runtimeConfig, "/workspace/recent-projects", {
    body: input,
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}
