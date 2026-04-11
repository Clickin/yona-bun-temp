import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { create } from "@bufbuild/protobuf";
import {
  AcceptOrganizationEnrollmentRequestSchema,
  AddOrganizationMemberRequestSchema,
  AddWorkspaceEmailRequestSchema,
  ChangePasswordRequestSchema,
  CancelEnrollOrganizationRequestSchema,
  CancelEnrollProjectRequestSchema,
  CreateOrganizationRequestSchema,
  CreateProjectRequestSchema,
  DeleteOrganizationMemberRequestSchema,
  DeleteOrganizationRequestSchema,
  DeleteWorkspaceEmailRequestSchema,
  EnrollOrganizationRequestSchema,
  EnrollProjectRequestSchema,
  ListOrganizationsRequestSchema,
  ListProjectsRequestSchema,
  PilotService,
  ResetApiTokenRequestSchema,
  ResetVisitedProjectsRequestSchema,
  ReadAuthUiCapabilitiesRequestSchema,
  ReadCurrentSessionRequestSchema,
  LeaveOrganizationRequestSchema,
  ReadOrganizationAdminRequestSchema,
  ReadOrganizationContainerRequestSchema,
  ReadOrganizationDetailRequestSchema,
  ReadOrganizationMembersRequestSchema,
  ReadOrganizationSettingsRequestSchema,
  ReadProjectContainerRequestSchema,
  ReadProjectDetailRequestSchema,
  ReadProjectMembersRequestSchema,
  ReadProjectSettingsRequestSchema,
  ReadWorkspaceOverviewRequestSchema,
  RecordRecentProjectVisitRequestSchema,
  RegisterWithPasswordRequestSchema,
  SendWorkspaceEmailValidationRequestSchema,
  SetMainWorkspaceEmailRequestSchema,
  SetDefaultLandingPathRequestSchema,
  SignInWithPasswordRequestSchema,
  SignOutRequestSchema,
  ToggleWorkspaceNotificationRequestSchema,
  ToggleFavoriteProjectRequestSchema,
  ToggleProjectWatchRequestSchema,
  UpdateOrganizationMemberRoleRequestSchema,
  UpdateProfileRequestSchema,
  UpdateOrganizationRequestSchema,
  UpdateProjectRequestSchema,
  UpdateProjectOverviewRequestSchema,
  VerifyUserRequestSchema,
  type OrganizationAdminView,
  type OrganizationContainer,
  type OrganizationDetail,
  type OrganizationRedirectResult,
  type ListOrganizationsResponse,
  type ListProjectsResponse,
  type ProjectContainer,
  type ProjectDetail,
  type ReadCurrentSessionResponse,
  type ReadOrganizationMembersResponse,
  type ReadProjectMembersResponse,
  type ReadWorkspaceOverviewResponse,
  type RecordRecentProjectVisitResponse,
  type ToggleFavoriteProjectResponse,
} from "./gen/yona/pilot/v1/pilot_pb";
import { prefixBasePath, type RuntimeConfig } from "./runtime-config";

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNonEmptyStringField(
  value: Record<string, unknown>,
  fieldName: string,
): null | string {
  const fieldValue = value[fieldName];
  if (typeof fieldValue !== "string") {
    return null;
  }
  const trimmed = fieldValue.trim();
  return trimmed === "" ? null : trimmed;
}

function extractAttachmentId(payload: unknown): null | string {
  if (!isObjectRecord(payload)) {
    return null;
  }

  const directAttachmentId =
    readNonEmptyStringField(payload, "attachmentId") ??
    readNonEmptyStringField(payload, "id");
  if (directAttachmentId) {
    return directAttachmentId;
  }

  const nestedAttachment = payload.attachment;
  if (isObjectRecord(nestedAttachment)) {
    return readNonEmptyStringField(nestedAttachment, "id");
  }

  return null;
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

export async function verifyUser(
  runtimeConfig: RuntimeConfig,
  input: MessageInitShape<typeof VerifyUserRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).verifyUser(
    create(VerifyUserRequestSchema, input),
  );
}

export async function uploadProfileAvatar(
  runtimeConfig: RuntimeConfig,
  filename: string,
  blob: Blob,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const formData = new FormData();
  formData.set("file", blob, filename);

  const response = await fetchImpl(prefixBasePath(runtimeConfig.basePath, "/files"), {
    body: formData,
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Avatar upload failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const attachmentId = extractAttachmentId(payload);
  if (!attachmentId) {
    throw new Error("Avatar upload did not return an attachment id.");
  }

  return attachmentId;
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

export async function updateProfile(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProfileRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProfile(
    create(UpdateProfileRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function changePassword(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof ChangePasswordRequestSchema>,
  fetchImpl: typeof fetch = fetch,
) {
  return createPilotClient(runtimeConfig, fetchImpl).changePassword(
    create(ChangePasswordRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function resetVisitedProjects(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).resetVisitedProjects(
    create(ResetVisitedProjectsRequestSchema),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function addWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).addWorkspaceEmail(
    create(AddWorkspaceEmailRequestSchema, { email }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteWorkspaceEmail(
    create(DeleteWorkspaceEmailRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function sendWorkspaceEmailValidation(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).sendWorkspaceEmailValidation(
    create(SendWorkspaceEmailValidationRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function setMainWorkspaceEmail(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).setMainWorkspaceEmail(
    create(SetMainWorkspaceEmailRequestSchema, { id }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function resetApiToken(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).resetApiToken(
    create(ResetApiTokenRequestSchema),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function toggleWorkspaceNotification(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  projectId: string,
  eventType: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadWorkspaceOverviewResponse> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleWorkspaceNotification(
    create(ToggleWorkspaceNotificationRequestSchema, { eventType, projectId }),
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

export async function readOrganizationAdmin(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationAdmin(
    create(ReadOrganizationAdminRequestSchema, { organizationName }),
  );
}

export async function readOrganizationContainer(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).readOrganizationContainer(
    create(ReadOrganizationContainerRequestSchema, { organizationName }),
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

export async function addOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof AddOrganizationMemberRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).addOrganizationMember(
    create(AddOrganizationMemberRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function updateOrganizationMemberRole(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateOrganizationMemberRoleRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).updateOrganizationMemberRole(
    create(UpdateOrganizationMemberRoleRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteOrganizationMember(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof DeleteOrganizationMemberRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteOrganizationMember(
    create(DeleteOrganizationMemberRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function acceptOrganizationEnrollment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof AcceptOrganizationEnrollmentRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return createPilotClient(runtimeConfig, fetchImpl).acceptOrganizationEnrollment(
    create(AcceptOrganizationEnrollmentRequestSchema, input),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function enrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).enrollOrganization(
    create(EnrollOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function cancelEnrollOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).cancelEnrollOrganization(
    create(CancelEnrollOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function leaveOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return createPilotClient(runtimeConfig, fetchImpl).leaveOrganization(
    create(LeaveOrganizationRequestSchema, { organizationName }),
    { headers: { "x-csrf-token": csrfToken } },
  );
}

export async function deleteOrganization(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return createPilotClient(runtimeConfig, fetchImpl).deleteOrganization(
    create(DeleteOrganizationRequestSchema, { organizationName }),
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

export async function readProjectContainer(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).readProjectContainer(
    create(ReadProjectContainerRequestSchema, { ownerName, projectName }),
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

export async function updateProjectOverview(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: MessageInitShape<typeof UpdateProjectOverviewRequestSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).updateProjectOverview(
    create(UpdateProjectOverviewRequestSchema, input),
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

export async function toggleProjectWatch(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  watching: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return createPilotClient(runtimeConfig, fetchImpl).toggleProjectWatch(
    create(ToggleProjectWatchRequestSchema, { ownerName, projectName, watching }),
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
