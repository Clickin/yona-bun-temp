import type {
  ReadCurrentSessionResponse,
  ReadWorkspaceOverviewResponse,
  RecordRecentProjectVisitResponse,
} from "../gen/yona/pilot/v1/pilot_pb";
import type { RuntimeConfig } from "../runtime-config";
import { restFetch } from "./rest-client";

type WorkspaceRecentProjectVisitInput = {
  ownerName: string;
  projectName: string;
};

type WorkspaceNotificationInput = {
  eventType: string;
  projectId: string;
};

export function readWorkspaceOverviewRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace", {
    fetchImpl,
  });
}

export function setDefaultLandingPathRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return restFetch<ReadWorkspaceOverviewResponse>(
    runtimeConfig,
    "/workspace/default-landing-path",
    {
      body: { path },
      csrfToken,
      fetchImpl,
      method: "PUT",
    },
  );
}

export function updateProfileRest<TInput extends object>(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: TInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace/profile", {
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
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace/recent-projects", {
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
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace/emails", {
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
  return restFetch<ReadWorkspaceOverviewResponse>(
    runtimeConfig,
    `/workspace/emails/${encodeURIComponent(id)}`,
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function sendWorkspaceEmailValidationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return restFetch<ReadWorkspaceOverviewResponse>(
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
  return restFetch<ReadWorkspaceOverviewResponse>(
    runtimeConfig,
    `/workspace/emails/${encodeURIComponent(id)}/main`,
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function resetApiTokenRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace/api-token/reset", {
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
  return restFetch<ReadWorkspaceOverviewResponse>(runtimeConfig, "/workspace/notifications", {
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
  return restFetch<RecordRecentProjectVisitResponse>(
    runtimeConfig,
    "/workspace/recent-projects",
    {
      body: input,
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}
