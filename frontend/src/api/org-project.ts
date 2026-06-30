import type {
  EnrollmentMutationResult,
  ListOrganizationsResponse,
  ListProjectsResponse,
  OrganizationAdminView,
  OrganizationContainer,
  OrganizationDetail,
  OrganizationRedirectResult,
  ProjectContainer,
  ProjectDetail,
  ReadOrganizationMembersResponse,
  ReadProjectMembersResponse,
  ToggleFavoriteProjectResponse,
} from "./types";
import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type OrganizationNameInput = {
  organizationName: string;
};

type OrganizationUpdateInput = OrganizationNameInput & {
  description: string;
  logoAttachmentId?: number;
};

type OrganizationMembershipInput = OrganizationNameInput & {
  userId: bigint | number;
};

type ProjectPathInput = {
  ownerName: string;
  projectName: string;
};

type ProjectMembershipInput = ProjectPathInput & {
  userId: bigint | number;
};

type ProjectCreateInput = {
  board?: boolean;
  code?: boolean;
  issue?: boolean;
  milestone?: boolean;
  overview: string;
  pullRequest?: boolean;
  projectName: string;
  projectScope: string;
  review?: boolean;
  vcs?: string;
};

type ProjectImportInput = ProjectCreateInput & {
  authId?: string;
  authPw?: string;
  ownerName: string;
  url: string;
};

export type ProjectImportResponse = {
  ownerName: string;
  projectName: string;
  redirectPath: string;
};

export type ProjectCreateOwnerOption = {
  avatarUrl?: string;
  organization: boolean;
  ownerName: string;
  selected: boolean;
};

export type ProjectCreateFormOptionsResponse = {
  ownerOptions: ProjectCreateOwnerOption[];
  selectedOwnerName: string;
};

type ProjectUpdateInput = ProjectPathInput & {
  board?: boolean;
  code?: boolean;
  defaultBranch?: string;
  defaultReviewerCount?: number;
  issue?: boolean;
  isCodeAccessibleMemberOnly?: boolean;
  isUsingReviewerCount?: boolean;
  milestone?: boolean;
  overview: string;
  pullRequest?: boolean;
  projectScope: string;
  review?: boolean;
};

function projectMenuBody(input: {
  board?: boolean;
  code?: boolean;
  issue?: boolean;
  milestone?: boolean;
  pullRequest?: boolean;
  review?: boolean;
}) {
  return {
    ...(input.board !== undefined ? { board: input.board } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.issue !== undefined ? { issue: input.issue } : {}),
    ...(input.milestone !== undefined ? { milestone: input.milestone } : {}),
    ...(input.pullRequest !== undefined ? { pullRequest: input.pullRequest } : {}),
    ...(input.review !== undefined ? { review: input.review } : {}),
  };
}

export type ProjectWatcher = {
  avatarUrl: string;
  loginId: string;
  userId: number;
  userLabel: string;
};

export type ProjectMemberEntry = {
  avatarUrl: string;
  isOwner: boolean;
  loginId: string;
  role: string;
  userId: number;
  userLabel: string;
};

export type ProjectEnrollmentRequestEntry = {
  avatarUrl: string;
  loginId: string;
  userId: number;
  userLabel: string;
};

export type ProjectMemberRoleOption = {
  label: string;
  role: string;
};

export type ProjectMembersResponse = {
  enrollmentRequests: ProjectEnrollmentRequestEntry[];
  members: ProjectMemberEntry[];
  ownerName: string;
  projectName: string;
  redirectPath?: string;
  roleOptions: ProjectMemberRoleOption[];
  viewerCanUpdate: boolean;
};

export type ProjectDeleteResponse = {
  ok: boolean;
  redirectPath: string;
};

export type ProjectWatchersResponse = {
  ownerName: string;
  projectName: string;
  totalCount: number;
  watchers: ProjectWatcher[];
};

export type ProjectWebhookType = "DETAIL_HANGOUT_CHAT" | "DETAIL_SLACK" | "JSON" | "SIMPLE";

export type ProjectWebhook = {
  gitPush: boolean;
  id: number;
  payloadUrl: string;
  secret: string;
  webhookType: ProjectWebhookType;
};

export type ProjectWebhookDelivery = {
  createdLabel: string;
  errorMessage?: string | null;
  eventType: string;
  id: number;
  payloadUrl: string;
  requestBody: string;
  responseBody?: string | null;
  status: string;
  webhookId: number;
  webhookType: ProjectWebhookType | string;
};

export type ProjectWebhooksResponse = {
  deliveries: ProjectWebhookDelivery[];
  ownerName: string;
  projectName: string;
  viewerCanUpdate: boolean;
  webhookTypes: ProjectWebhookType[];
  webhooks: ProjectWebhook[];
};

export type ProjectWebhookInput = {
  gitPush: boolean;
  payloadUrl: string;
  secret: string;
  webhookType: ProjectWebhookType;
};

export type ProjectTransferResponse = {
  acceptPath?: string;
  confirmKey?: string;
  destination?: string;
  newProjectName?: string;
  ownerName: string;
  projectName: string;
  redirectPath?: string;
  transferId?: number;
  viewerCanTransfer: boolean;
};

export type ProjectTransferInput = {
  destination: string;
};

export type ProjectChangeVcsResponse = {
  currentVcs: string;
  nextVcs: string;
  ownerName: string;
  projectName: string;
  redirectPath?: string;
  viewerCanChange: boolean;
};

export type ProjectForkSource = {
  isForked: boolean;
  overview: string;
  ownerName: string;
  projectName: string;
  projectScope: string;
  vcs: string;
};

export type ProjectForkOwnerOption = {
  organization: boolean;
  ownerName: string;
  selected: boolean;
};

export type ProjectForkSelected = {
  ownerName: string;
  projectName: string;
  projectScope: string;
};

export type ProjectForkSummary = {
  ownerName: string;
  projectName: string;
};

export type ProjectForkOptionsResponse = {
  canFork: boolean;
  existingForks: ProjectForkSummary[];
  ownerOptions: ProjectForkOwnerOption[];
  selected: ProjectForkSelected;
  source: ProjectForkSource;
};

export type ProjectForkInput = {
  owner: string;
  name: string;
  projectScope: string;
};

export type ProjectForkResponse = {
  ok: boolean;
  project: ProjectDetail;
  redirectPath: string;
};

function toInt64Number(value: bigint | number): number {
  return Number(value);
}

function organizationPath(organizationName: string, suffix = ""): string {
  return `/organizations/${encodeURIComponent(organizationName)}${suffix}`;
}

function ownerProjectsPath(ownerName: string): string {
  return `/owners/${encodeURIComponent(ownerName)}/projects`;
}

function projectPath(ownerName: string, projectName: string, suffix = ""): string {
  return `/owners/${encodeURIComponent(ownerName)}/projects/${encodeURIComponent(projectName)}${suffix}`;
}

export function listProjectsRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return restFetch<ListProjectsResponse>(runtimeConfig, "/projects", {
    fetchImpl,
    method: "GET",
  });
}

export function listProjectsQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => listProjectsRest(runtimeConfig),
    queryKey: apiQueryKeys.project.list(),
  });
}

export function listOrganizationsRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListOrganizationsResponse> {
  return restFetch<ListOrganizationsResponse>(runtimeConfig, "/organizations", {
    fetchImpl,
    method: "GET",
  });
}

export function listOrganizationsQueryOptions(runtimeConfig: RuntimeConfig) {
  return queryOptions({
    queryFn: () => listOrganizationsRest(runtimeConfig),
    queryKey: apiQueryKeys.organization.list(),
  });
}

export function projectCreateFormOptionsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: { owner?: string } = {},
) {
  return queryOptions({
    queryFn: () => readProjectCreateFormOptionsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.project.createFormOptions(input.owner ?? ""),
  });
}

export function readProjectCreateFormOptionsRest(
  runtimeConfig: RuntimeConfig,
  input: { owner?: string } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectCreateFormOptionsResponse> {
  const query = input.owner ? `?owner=${encodeURIComponent(input.owner)}` : "";
  return restFetch<ProjectCreateFormOptionsResponse>(
    runtimeConfig,
    `/projects/form-options${query}`,
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function createOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: OrganizationUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return restFetch<OrganizationDetail>(runtimeConfig, "/organizations", {
    body: {
      description: input.description,
      logoAttachmentId: input.logoAttachmentId,
      organizationName: input.organizationName,
    },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function readOrganizationDetailRest(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return restFetch<OrganizationDetail>(runtimeConfig, organizationPath(organizationName), {
    fetchImpl,
    method: "GET",
  });
}

export function organizationDetailQueryOptions(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
) {
  return queryOptions({
    queryFn: () => readOrganizationDetailRest(runtimeConfig, organizationName),
    queryKey: apiQueryKeys.organization.base(organizationName),
  });
}

export function readOrganizationAdminRest(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return restFetch<OrganizationAdminView>(
    runtimeConfig,
    organizationPath(organizationName, "/admin"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readOrganizationContainerRest(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return restFetch<OrganizationContainer>(
    runtimeConfig,
    organizationPath(organizationName, "/container"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readOrganizationSettingsRest(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return restFetch<OrganizationDetail>(
    runtimeConfig,
    organizationPath(organizationName, "/settings"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readOrganizationMembersRest(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadOrganizationMembersResponse> {
  return restFetch<ReadOrganizationMembersResponse>(
    runtimeConfig,
    organizationPath(organizationName, "/members"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function updateOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  currentOrganizationName: string,
  input: OrganizationUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationDetail> {
  return restFetch<OrganizationDetail>(runtimeConfig, organizationPath(currentOrganizationName), {
    body: {
      description: input.description,
      logoAttachmentId: input.logoAttachmentId,
      organizationName: input.organizationName,
    },
    csrfToken,
    fetchImpl,
    method: "PATCH",
  });
}

export function addOrganizationMemberRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: OrganizationNameInput & { loginId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return restFetch<OrganizationAdminView>(
    runtimeConfig,
    organizationPath(input.organizationName, "/members"),
    {
      body: {
        loginId: input.loginId,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function updateOrganizationMemberRoleRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: OrganizationMembershipInput & { role: string },
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return restFetch<OrganizationAdminView>(
    runtimeConfig,
    organizationPath(input.organizationName, `/members/${toInt64Number(input.userId)}`),
    {
      body: {
        role: input.role,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export function deleteOrganizationMemberRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: OrganizationMembershipInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return restFetch<OrganizationAdminView>(
    runtimeConfig,
    organizationPath(input.organizationName, `/members/${toInt64Number(input.userId)}`),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function acceptOrganizationEnrollmentRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: OrganizationMembershipInput,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationAdminView> {
  return restFetch<OrganizationAdminView>(
    runtimeConfig,
    organizationPath(input.organizationName, `/enrollments/${toInt64Number(input.userId)}/accept`),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function enrollOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return restFetch<OrganizationContainer>(
    runtimeConfig,
    organizationPath(organizationName, "/enroll"),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function cancelEnrollOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationContainer> {
  return restFetch<OrganizationContainer>(
    runtimeConfig,
    organizationPath(organizationName, "/enroll"),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function leaveOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return restFetch<OrganizationRedirectResult>(
    runtimeConfig,
    organizationPath(organizationName, "/leave"),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function deleteOrganizationRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  organizationName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizationRedirectResult> {
  return restFetch<OrganizationRedirectResult>(runtimeConfig, organizationPath(organizationName), {
    csrfToken,
    fetchImpl,
    method: "DELETE",
  });
}

export function createProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  input: ProjectCreateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return restFetch<ProjectDetail>(runtimeConfig, ownerProjectsPath(ownerName), {
    body: {
      ...projectMenuBody(input),
      overview: input.overview,
      projectName: input.projectName,
      projectScope: input.projectScope,
      ...(input.vcs !== undefined ? { vcs: input.vcs } : {}),
    },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function importProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectImportInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectImportResponse> {
  return restFetch<ProjectImportResponse>(runtimeConfig, "/projects/import", {
    body: {
      ...projectMenuBody(input),
      authId: input.authId ?? "",
      authPw: input.authPw ?? "",
      ownerName: input.ownerName,
      overview: input.overview,
      projectName: input.projectName,
      projectScope: input.projectScope,
      url: input.url,
      ...(input.vcs !== undefined ? { vcs: input.vcs } : {}),
    },
    csrfToken,
    fetchImpl,
    method: "POST",
  });
}

export function readProjectDetailRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return restFetch<ProjectDetail>(runtimeConfig, projectPath(ownerName, projectName), {
    fetchImpl,
    method: "GET",
  });
}

export function deleteProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDeleteResponse> {
  return restFetch<ProjectDeleteResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function readProjectTransferRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectTransferResponse> {
  return restFetch<ProjectTransferResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/transfer"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectTransferQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectTransferRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.transfer(input.ownerName, input.projectName),
  });
}

export function requestProjectTransferRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput & ProjectTransferInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectTransferResponse> {
  return restFetch<ProjectTransferResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, "/transfer"),
    {
      body: {
        destination: input.destination,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function readProjectChangeVcsRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectChangeVcsResponse> {
  return restFetch<ProjectChangeVcsResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/change-vcs"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectChangeVcsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectChangeVcsRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.changeVcs(input.ownerName, input.projectName),
  });
}

export function changeProjectVcsRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectChangeVcsResponse> {
  return restFetch<ProjectChangeVcsResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, "/change-vcs"),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function readProjectForkOptionsRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectForkOptionsResponse> {
  return restFetch<ProjectForkOptionsResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/fork-options"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectForkOptionsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectForkOptionsRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.forkOptions(input.ownerName, input.projectName),
  });
}

export function forkProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput & ProjectForkInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectForkResponse> {
  return restFetch<ProjectForkResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, "/fork"),
    {
      body: {
        name: input.name,
        owner: input.owner,
        projectScope: input.projectScope,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function readProjectContainerRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return restFetch<ProjectContainer>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/container"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectContainerQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectContainerRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.container(input.ownerName, input.projectName),
  });
}

export function readProjectSettingsRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return restFetch<ProjectContainer>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/settings"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectMembersRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReadProjectMembersResponse> {
  return restFetch<ReadProjectMembersResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/members"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

function readProjectMemberDirectoryRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMembersResponse> {
  return restFetch<ProjectMembersResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/members"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectMembersQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () =>
      readProjectMemberDirectoryRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.members(input.ownerName, input.projectName),
  });
}

export function addProjectMemberRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput & { loginId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMembersResponse> {
  return restFetch<ProjectMembersResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, "/members"),
    {
      body: {
        loginId: input.loginId,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function updateProjectMemberRoleRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectMembershipInput & { role: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMembersResponse> {
  return restFetch<ProjectMembersResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, `/members/${toInt64Number(input.userId)}`),
    {
      body: {
        role: input.role,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export function deleteProjectMemberRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectMembershipInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectMembersResponse> {
  return restFetch<ProjectMembersResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, `/members/${toInt64Number(input.userId)}`),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function readProjectWatchersRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectWatchersResponse> {
  return restFetch<ProjectWatchersResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/watchers"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectWatchersQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectWatchersRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.watchers(input.ownerName, input.projectName),
  });
}

export function readProjectWebhooksRest(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectWebhooksResponse> {
  return restFetch<ProjectWebhooksResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/webhooks"),
    {
      fetchImpl,
      method: "GET",
    },
  );
}

export function readProjectWebhooksQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: ProjectPathInput,
) {
  return queryOptions({
    queryFn: () => readProjectWebhooksRest(runtimeConfig, input.ownerName, input.projectName),
    queryKey: apiQueryKeys.project.webhooks(input.ownerName, input.projectName),
  });
}

export function createProjectWebhookRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput & ProjectWebhookInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectWebhooksResponse> {
  return restFetch<ProjectWebhooksResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, "/webhooks"),
    {
      body: {
        gitPush: input.gitPush,
        payloadUrl: input.payloadUrl,
        secret: input.secret,
        webhookType: input.webhookType,
      },
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function deleteProjectWebhookRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  input: ProjectPathInput & { webhookId: bigint | number },
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectWebhooksResponse> {
  return restFetch<ProjectWebhooksResponse>(
    runtimeConfig,
    projectPath(input.ownerName, input.projectName, `/webhooks/${toInt64Number(input.webhookId)}`),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function updateProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  currentOwnerName: string,
  currentProjectName: string,
  input: ProjectUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectDetail> {
  return restFetch<ProjectDetail>(
    runtimeConfig,
    projectPath(currentOwnerName, currentProjectName),
    {
      body: {
        ...projectMenuBody(input),
        ...(input.defaultReviewerCount !== undefined
          ? { defaultReviewerCount: input.defaultReviewerCount }
          : {}),
        ...(input.isCodeAccessibleMemberOnly !== undefined
          ? { isCodeAccessibleMemberOnly: input.isCodeAccessibleMemberOnly }
          : {}),
        ...(input.isUsingReviewerCount !== undefined
          ? { isUsingReviewerCount: input.isUsingReviewerCount }
          : {}),
        overview: input.overview,
        projectName: input.projectName,
        projectScope: input.projectScope,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export function updateProjectOverviewRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  overview: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return restFetch<ProjectContainer>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/overview"),
    {
      body: {
        overview,
      },
      csrfToken,
      fetchImpl,
      method: "PATCH",
    },
  );
}

export function enrollProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EnrollmentMutationResult> {
  return restFetch<EnrollmentMutationResult>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/enroll"),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function cancelEnrollProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EnrollmentMutationResult> {
  return restFetch<EnrollmentMutationResult>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/enroll"),
    {
      csrfToken,
      fetchImpl,
      method: "DELETE",
    },
  );
}

export function toggleFavoriteProjectRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ToggleFavoriteProjectResponse> {
  return restFetch<ToggleFavoriteProjectResponse>(
    runtimeConfig,
    projectPath(ownerName, projectName, "/favorite"),
    {
      csrfToken,
      fetchImpl,
      method: "POST",
    },
  );
}

export function toggleProjectWatchRest(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  ownerName: string,
  projectName: string,
  watching: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectContainer> {
  return restFetch<ProjectContainer>(runtimeConfig, projectPath(ownerName, projectName, "/watch"), {
    csrfToken,
    fetchImpl,
    method: watching ? "POST" : "DELETE",
  });
}
