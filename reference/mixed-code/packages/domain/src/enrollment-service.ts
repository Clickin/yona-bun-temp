import {
  enrollmentMutationResultSchema,
  type EnrollmentMutationResult,
  type EnrollmentRequestRef,
  type OrganizationEnrollmentRequestRef,
} from "@yona/contracts";
import {
  createEnrollmentRequest,
  createOrganizationEnrollmentRequest,
  deleteEnrollmentRequest,
  deleteOrganizationEnrollmentRequest,
  readOrganizationAuthorization,
  readProjectAuthorization,
} from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  type DomainActor,
} from "./errors";

export { DomainConflictError, DomainNotFoundError, DomainPermissionError };

export interface EnrollmentServiceDeps {
  createEnrollmentRequest: typeof createEnrollmentRequest;
  createOrganizationEnrollmentRequest?: typeof createOrganizationEnrollmentRequest;
  deleteEnrollmentRequest: typeof deleteEnrollmentRequest;
  deleteOrganizationEnrollmentRequest?: typeof deleteOrganizationEnrollmentRequest;
  readOrganizationAuthorization?: typeof readOrganizationAuthorization;
  readProjectAuthorization: typeof readProjectAuthorization;
}

const defaultDeps: EnrollmentServiceDeps = {
  createEnrollmentRequest,
  createOrganizationEnrollmentRequest,
  deleteEnrollmentRequest,
  deleteOrganizationEnrollmentRequest,
  readOrganizationAuthorization,
  readProjectAuthorization,
};

function isProjectGuest(viewer: {
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
}) {
  return !viewer.isProjectManager && !viewer.isProjectMember && !viewer.isSiteAdmin;
}

function isOrganizationGuest(viewer: {
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isSiteAdmin: boolean;
}) {
  return !viewer.isOrganizationAdmin && !viewer.isOrganizationMember && !viewer.isSiteAdmin;
}

function toEnrollmentMutationResult(): EnrollmentMutationResult {
  return enrollmentMutationResultSchema.parse({
    ok: true,
  });
}

export async function enrollProject(
  actor: DomainActor,
  input: EnrollmentRequestRef,
  deps: EnrollmentServiceDeps = defaultDeps,
): Promise<EnrollmentMutationResult> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readProjectAuthorization(
    input.ownerName,
    input.projectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  if (!isProjectGuest(authorization.viewer)) {
    throw new DomainConflictError("Project enrollment is only available to guests.");
  }

  await deps.createEnrollmentRequest(authorization.project.id, actor.actorId);

  return toEnrollmentMutationResult();
}

export async function cancelEnrollProject(
  actor: DomainActor,
  input: EnrollmentRequestRef,
  deps: EnrollmentServiceDeps = defaultDeps,
): Promise<EnrollmentMutationResult> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readProjectAuthorization(
    input.ownerName,
    input.projectName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Project not found.");
  }

  if (!isProjectGuest(authorization.viewer)) {
    throw new DomainConflictError("Project enrollment is only available to guests.");
  }

  await deps.deleteEnrollmentRequest(authorization.project.id, actor.actorId);

  return toEnrollmentMutationResult();
}

export async function enrollOrganization(
  actor: DomainActor,
  input: OrganizationEnrollmentRequestRef,
  deps: EnrollmentServiceDeps = defaultDeps,
): Promise<EnrollmentMutationResult> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readOrganizationAuthorization!(
    input.organizationName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  if (!isOrganizationGuest(authorization.viewer)) {
    throw new DomainConflictError("Organization enrollment is only available to guests.");
  }

  await deps.createOrganizationEnrollmentRequest!(authorization.organization.id, actor.actorId);

  return toEnrollmentMutationResult();
}

export async function cancelEnrollOrganization(
  actor: DomainActor,
  input: OrganizationEnrollmentRequestRef,
  deps: EnrollmentServiceDeps = defaultDeps,
): Promise<EnrollmentMutationResult> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readOrganizationAuthorization!(
    input.organizationName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  if (!isOrganizationGuest(authorization.viewer)) {
    throw new DomainConflictError("Organization enrollment is only available to guests.");
  }

  await deps.deleteOrganizationEnrollmentRequest!(authorization.organization.id, actor.actorId);

  return toEnrollmentMutationResult();
}
