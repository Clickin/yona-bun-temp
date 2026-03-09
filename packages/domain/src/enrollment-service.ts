import {
  enrollmentMutationResultSchema,
  type EnrollmentMutationResult,
  type EnrollmentRequestRef,
} from "@yona/contracts";
import {
  createEnrollmentRequest,
  deleteEnrollmentRequest,
  readProjectAuthorization,
} from "@yona/db";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  type DomainActor,
} from "./errors";

export { DomainConflictError, DomainNotFoundError, DomainPermissionError };

export interface EnrollmentServiceDeps {
  createEnrollmentRequest: typeof createEnrollmentRequest;
  deleteEnrollmentRequest: typeof deleteEnrollmentRequest;
  readProjectAuthorization: typeof readProjectAuthorization;
}

const defaultDeps: EnrollmentServiceDeps = {
  createEnrollmentRequest,
  deleteEnrollmentRequest,
  readProjectAuthorization,
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

function isProjectGuest(viewer: {
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
}) {
  return !viewer.isProjectManager && !viewer.isProjectMember && !viewer.isSiteAdmin;
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
