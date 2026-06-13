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

export type WorkspaceFilesInput = {
  filter?: string;
  page?: number;
};

export type WorkspaceFileItem = {
  containerId: number;
  containerType: string;
  createdLabel: string;
  downloadUrl: string;
  id: number;
  locationHref: string;
  locationLabel: string;
  mimeType: string;
  name: string;
  previewUrl: string;
  size: number;
  sizeLabel: string;
  url: string;
};

export type WorkspaceFilesResponse = {
  files: WorkspaceFileItem[];
  filter: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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

export async function listWorkspaceFilesRest(
  runtimeConfig: RuntimeConfig,
  input: WorkspaceFilesInput = {},
  fetchImpl: typeof fetch = fetch,
): Promise<WorkspaceFilesResponse> {
  const searchParams = new URLSearchParams();
  const filter = input.filter?.trim() ?? "";
  if (filter !== "") {
    searchParams.set("filter", filter);
  }
  if (input.page && input.page > 1) {
    searchParams.set("pageNum", String(input.page));
  }
  const query = searchParams.toString();
  const response = await restFetch<WorkspaceFilesResponse>(
    runtimeConfig,
    `/workspace/files${query === "" ? "" : `?${query}`}`,
    { fetchImpl },
  );
  return {
    ...response,
    files: response.files ?? [],
    filter: response.filter ?? filter,
    page: response.page ?? input.page ?? 1,
    pageSize: response.pageSize ?? 50,
    total: response.total ?? 0,
    totalPages: response.totalPages ?? 0,
  };
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
