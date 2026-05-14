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
} from "../gen/yona/pilot/v1/pilot_pb";
import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

type OrganizationNameInput = {
  organizationName: string;
};

type OrganizationUpdateInput = OrganizationNameInput & {
  description: string;
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
  overview: string;
  projectName: string;
  projectScope: string;
};

type ProjectUpdateInput = ProjectPathInput & {
  overview: string;
  projectScope: string;
};

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

export type ProjectWatchersResponse = {
  ownerName: string;
  projectName: string;
  totalCount: number;
  watchers: ProjectWatcher[];
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

export function listOrganizationsRest(
  runtimeConfig: RuntimeConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListOrganizationsResponse> {
  return restFetch<ListOrganizationsResponse>(runtimeConfig, "/organizations", {
    fetchImpl,
    method: "GET",
  });
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
      overview: input.overview,
      projectName: input.projectName,
      projectScope: input.projectScope,
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
): Promise<ProjectDetail> {
  return restFetch<ProjectDetail>(runtimeConfig, projectPath(ownerName, projectName, "/settings"), {
    fetchImpl,
    method: "GET",
  });
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
