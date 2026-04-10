import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { create } from "@bufbuild/protobuf";
import {
  CancelEnrollProjectRequestSchema,
  CreateOrganizationRequestSchema,
  CreateProjectRequestSchema,
  EnrollProjectRequestSchema,
  ListOrganizationsRequestSchema,
  ListProjectsRequestSchema,
  PilotService,
  ReadAuthUiCapabilitiesRequestSchema,
  ReadCurrentSessionRequestSchema,
  ReadOrganizationDetailRequestSchema,
  ReadOrganizationMembersRequestSchema,
  ReadOrganizationSettingsRequestSchema,
  ReadProjectDetailRequestSchema,
  ReadProjectMembersRequestSchema,
  ReadProjectSettingsRequestSchema,
  ReadWorkspaceOverviewRequestSchema,
  RecordRecentProjectVisitRequestSchema,
  RegisterWithPasswordRequestSchema,
  SetDefaultLandingPathRequestSchema,
  SignInWithPasswordRequestSchema,
  SignOutRequestSchema,
  ToggleFavoriteProjectRequestSchema,
  UpdateOrganizationRequestSchema,
  UpdateProjectRequestSchema,
  type OrganizationDetail,
  type ListOrganizationsResponse,
  type ListProjectsResponse,
  type ProjectDetail,
  type ReadCurrentSessionResponse,
  type ReadOrganizationMembersResponse,
  type ReadProjectMembersResponse,
  type ReadWorkspaceOverviewResponse,
  type RecordRecentProjectVisitResponse,
  type ToggleFavoriteProjectResponse,
} from "./gen/yona/pilot/v1/pilot_pb";
import {
  resolveCurrentPath,
  routeDocumentTitle,
  routeHref,
  type AppRoute,
} from "./route-table";
import type { RuntimeConfig } from "./runtime-config";

export interface SessionBootstrapPayload {
  session: null | {
    csrfToken: string;
    projection: ReadCurrentSessionResponse;
    userId: bigint | number;
  };
  user: null | {
    emailAddress: string;
    id: bigint | number;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    name: string;
  };
}

export interface SessionBootstrapResult {
  csrfToken: string;
  payload: SessionBootstrapPayload;
}

function createFetchWithCredentials(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) =>
    fetchImpl(input, {
      ...init,
      credentials: "include",
    });
}

function createPilotClient(runtimeConfig: RuntimeConfig, fetchImpl: typeof fetch = fetch) {
  const transport = createConnectTransport({
    baseUrl: runtimeConfig.rpcBaseUrl,
    fetch: createFetchWithCredentials(fetchImpl),
    useBinaryFormat: false,
  });
  return createClient(PilotService, transport);
}

export async function readSessionBootstrap(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionBootstrapResult> {
  const response = await fetchImpl(`${runtimeConfig.apiBaseUrl}/auth/session`, {
    credentials: "include",
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Session bootstrap failed with ${response.status}.`);
  }

  const csrfToken = response.headers.get("x-csrf-token")?.trim();
  if (!csrfToken) {
    throw new Error("Session bootstrap did not return a CSRF token.");
  }

  return {
    csrfToken,
    payload: (await response.json()) as SessionBootstrapPayload,
  };
}

export async function readCurrentSession(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).readCurrentSession(
    create(ReadCurrentSessionRequestSchema),
  );
}

export async function readAuthUiCapabilities(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).readAuthUiCapabilities(
    create(ReadAuthUiCapabilitiesRequestSchema),
  );
}

export async function signInWithPassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof SignInWithPasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).signInWithPassword(
    create(SignInWithPasswordRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function registerWithPassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof RegisterWithPasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).registerWithPassword(
    create(RegisterWithPasswordRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function signOut(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).signOut(
    create(SignOutRequestSchema),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readWorkspaceOverview(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readWorkspaceOverview(
    create(ReadWorkspaceOverviewRequestSchema),
  );
}

export async function listProjects(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).listProjects(
    create(ListProjectsRequestSchema),
  );
}

export async function listOrganizations(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListOrganizationsResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).listOrganizations(
    create(ListOrganizationsRequestSchema),
  );
}

export async function setDefaultLandingPath(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).setDefaultLandingPath(
    create(SetDefaultLandingPathRequestSchema, { path }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function createOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateOrganizationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).createOrganization(
    create(CreateOrganizationRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readOrganizationDetail(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationDetail(
    create(ReadOrganizationDetailRequestSchema, { organizationName }),
  );
}

export async function readOrganizationSettings(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationSettings(
    create(ReadOrganizationSettingsRequestSchema, { organizationName }),
  );
}

export async function readOrganizationMembers(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadOrganizationMembersResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationMembers(
    create(ReadOrganizationMembersRequestSchema, { organizationName }),
  );
}

export async function updateOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateOrganizationRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).updateOrganization(
    create(UpdateOrganizationRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function createProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof CreateProjectRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).createProject(
    create(CreateProjectRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function readProjectDetail(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectDetail(
    create(ReadProjectDetailRequestSchema, { ownerName, projectName }),
  );
}

export async function readProjectSettings(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectSettings(
    create(ReadProjectSettingsRequestSchema, { ownerName, projectName }),
  );
}

export async function readProjectMembers(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadProjectMembersResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectMembers(
    create(ReadProjectMembersRequestSchema, { ownerName, projectName }),
  );
}

export async function updateProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProject(
    create(UpdateProjectRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function enrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).enrollProject(
    create(EnrollProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function cancelEnrollProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).cancelEnrollProject(
    create(CancelEnrollProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function toggleFavoriteProject(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ToggleFavoriteProjectResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleFavoriteProject(
    create(ToggleFavoriteProjectRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function recordRecentProjectVisit(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordRecentProjectVisitResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).recordRecentProjectVisit(
    create(RecordRecentProjectVisitRequestSchema, { ownerName, projectName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export { resolveCurrentPath, routeDocumentTitle, routeHref };
export type { AppRoute };
