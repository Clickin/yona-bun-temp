import {
  projectDetailSchema,
  type ProjectCreateInput,
  type ProjectDetail,
  type ProjectRef,
  type ProjectUpdateInput,
} from "@yona/contracts";
import {
  createProjectRecord,
  grantProjectManager,
  projectIdentifierExists,
  readOrganizationAuthorization,
  readProjectAuthorization,
  updateProjectRecord,
  userLoginIdExists,
} from "@yona/db";
import { authorizeProjectAccess } from "./project-authorization";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  type DomainActor,
} from "./errors";

export { DomainConflictError, DomainNotFoundError, DomainPermissionError, DomainValidationError };

export interface ProjectServiceDeps {
  createProjectRecord: typeof createProjectRecord;
  grantProjectManager: typeof grantProjectManager;
  projectIdentifierExists: typeof projectIdentifierExists;
  readOrganizationAuthorization: typeof readOrganizationAuthorization;
  readProjectAuthorization: typeof readProjectAuthorization;
  updateProjectRecord: typeof updateProjectRecord;
  userLoginIdExists: typeof userLoginIdExists;
}

const defaultDeps: ProjectServiceDeps = {
  createProjectRecord,
  grantProjectManager,
  projectIdentifierExists,
  readOrganizationAuthorization,
  readProjectAuthorization,
  updateProjectRecord,
  userLoginIdExists,
};

function requireAuthenticatedActor(actor: DomainActor): asserts actor is DomainActor & {
  actorId: number;
  loginId: string;
} {
  if (actor.isAnonymous || actor.actorId === null || actor.loginId === null) {
    throw new DomainPermissionError("Authentication required.", {
      requiresAuthentication: true,
    });
  }
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function toProjectDetail(
  record: {
    organizationName: null | string;
    ownerName: string;
    overview: null | string;
    projectName: string;
    projectScope: "private" | "protected" | "public";
  },
  viewerCanUpdate: boolean,
): ProjectDetail {
  return projectDetailSchema.parse({
    organizationName: record.organizationName,
    ownerName: record.ownerName,
    overview: record.overview,
    projectName: record.projectName,
    projectScope: record.projectScope,
    viewerCanUpdate,
  });
}

export async function createProject(
  actor: DomainActor,
  input: ProjectCreateInput,
  deps: ProjectServiceDeps = defaultDeps,
): Promise<ProjectDetail> {
  requireAuthenticatedActor(actor);

  if (await deps.projectIdentifierExists(input.ownerName, input.projectName)) {
    throw new DomainConflictError("Project name is already in use for this owner.");
  }

  const organization = await deps.readOrganizationAuthorization(input.ownerName, actor.actorId);
  if (organization) {
    if (!organization.viewer.isOrganizationAdmin) {
      throw new DomainPermissionError("Organization project creation is not allowed.");
    }

    const created = await deps.createProjectRecord({
      organizationId: organization.organization.id,
      organizationName: organization.organization.organizationName,
      ownerName: organization.organization.organizationName,
      overview: input.overview,
      projectName: input.projectName,
      projectScope: input.projectScope,
    });
    await deps.grantProjectManager(created.id, actor.actorId);

    return toProjectDetail(created, true);
  }

  const ownerExists = await deps.userLoginIdExists(input.ownerName);
  if (!ownerExists || normalizeIdentity(actor.loginId) !== normalizeIdentity(input.ownerName)) {
    throw new DomainValidationError("Project owner is invalid.");
  }

  const created = await deps.createProjectRecord({
    organizationId: null,
    organizationName: null,
    ownerName: input.ownerName,
    overview: input.overview,
    projectName: input.projectName,
    projectScope: input.projectScope,
  });
  await deps.grantProjectManager(created.id, actor.actorId);

  return toProjectDetail(created, true);
}

export async function readProjectDetail(
  actor: DomainActor,
  input: ProjectRef,
  deps: ProjectServiceDeps = defaultDeps,
): Promise<ProjectDetail> {
  const authorization = await deps.readProjectAuthorization(
    input.ownerName,
    input.projectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  const readDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "read",
  );
  if (!readDecision.allowed) {
    throw new DomainPermissionError("Project read is not allowed.", {
      requiresAuthentication: actor.actorId === null,
    });
  }

  const updateDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "update",
  );

  return toProjectDetail(authorization.project, updateDecision.allowed);
}

export async function readProjectSettings(
  actor: DomainActor,
  input: ProjectRef,
  deps: ProjectServiceDeps = defaultDeps,
): Promise<ProjectDetail> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readProjectAuthorization(
    input.ownerName,
    input.projectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  const updateDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "update",
  );
  if (!updateDecision.allowed) {
    throw new DomainPermissionError("Project update is not allowed.");
  }

  return toProjectDetail(authorization.project, true);
}

export async function updateProject(
  actor: DomainActor,
  input: ProjectUpdateInput,
  deps: ProjectServiceDeps = defaultDeps,
): Promise<ProjectDetail> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readProjectAuthorization(
    input.currentOwnerName,
    input.currentProjectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  const updateDecision = authorizeProjectAccess(
    {
      ...authorization.viewer,
      projectScope: authorization.project.projectScope,
    },
    "update",
  );
  if (!updateDecision.allowed) {
    throw new DomainPermissionError("Project update is not allowed.");
  }

  const isRename = authorization.project.projectName !== input.projectName;
  if (
    isRename &&
    (await deps.projectIdentifierExists(authorization.project.ownerName, input.projectName, {
      excludeProjectId: authorization.project.id,
    }))
  ) {
    throw new DomainConflictError("Project name is already in use for this owner.");
  }

  const updated = await deps.updateProjectRecord(input);
  if (!updated) {
    throw new DomainNotFoundError("Project not found.");
  }

  return toProjectDetail(updated, true);
}
