import {
  organizationMemberDirectorySchema,
  organizationDetailSchema,
  type OrganizationCreateInput,
  type OrganizationDetail,
  type OrganizationMemberDirectory,
  type OrganizationRef,
  type OrganizationUpdateInput,
} from "@yona/contracts";
import {
  createOrganizationRecord,
  grantOrganizationAdmin,
  organizationNameExists,
  readOrganizationAuthorization,
  readOrganizationByName,
  readOrganizationMembers,
  updateOrganizationRecord,
  userLoginIdExists,
} from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  type DomainActor,
} from "./errors";

export { DomainConflictError, DomainNotFoundError, DomainPermissionError };

export interface OrganizationServiceDeps {
  createOrganizationRecord: typeof createOrganizationRecord;
  grantOrganizationAdmin: typeof grantOrganizationAdmin;
  organizationNameExists: typeof organizationNameExists;
  readOrganizationAuthorization: typeof readOrganizationAuthorization;
  readOrganizationByName: typeof readOrganizationByName;
  readOrganizationMembers: typeof readOrganizationMembers;
  updateOrganizationRecord: typeof updateOrganizationRecord;
  userLoginIdExists: typeof userLoginIdExists;
}

const defaultDeps: OrganizationServiceDeps = {
  createOrganizationRecord,
  grantOrganizationAdmin,
  organizationNameExists,
  readOrganizationAuthorization,
  readOrganizationByName,
  readOrganizationMembers,
  updateOrganizationRecord,
  userLoginIdExists,
};

function canUpdateOrganization(viewer: { isOrganizationAdmin: boolean; isSiteAdmin: boolean }) {
  return viewer.isSiteAdmin || viewer.isOrganizationAdmin;
}

function toOrganizationDetail(
  record: {
    description: null | string;
    organizationName: string;
  },
  viewerCanUpdate: boolean,
): OrganizationDetail {
  return organizationDetailSchema.parse({
    description: record.description,
    organizationName: record.organizationName,
    viewerCanUpdate,
  });
}

function toOrganizationMemberDirectory(record: {
  enrollmentRequests: {
    loginId: string;
    userLabel: string;
  }[];
  members: {
    loginId: string;
    role: "org_admin" | "org_member";
    userLabel: string;
  }[];
}): OrganizationMemberDirectory {
  return organizationMemberDirectorySchema.parse(record);
}

export async function createOrganization(
  actor: DomainActor,
  input: OrganizationCreateInput,
  deps: OrganizationServiceDeps = defaultDeps,
): Promise<OrganizationDetail> {
  requireAuthenticatedActor(actor);

  const [existingOrganization, existingUser] = await Promise.all([
    deps.organizationNameExists(input.organizationName),
    deps.userLoginIdExists(input.organizationName),
  ]);

  if (existingOrganization || existingUser) {
    throw new DomainConflictError("Organization name is already in use.");
  }

  const created = await deps.createOrganizationRecord(input);
  await deps.grantOrganizationAdmin(created.id, actor.actorId);

  return toOrganizationDetail(created, true);
}

export async function readOrganizationDetail(
  actor: DomainActor,
  input: OrganizationRef,
  deps: OrganizationServiceDeps = defaultDeps,
): Promise<OrganizationDetail> {
  if (actor.actorId !== null) {
    const authorization = await deps.readOrganizationAuthorization(
      input.organizationName,
      actor.actorId,
    );
    if (authorization) {
      return toOrganizationDetail(
        authorization.organization,
        canUpdateOrganization(authorization.viewer),
      );
    }
  }

  const organization = await deps.readOrganizationByName(input.organizationName);
  if (!organization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  return toOrganizationDetail(organization, false);
}

export async function readOrganizationSettings(
  actor: DomainActor,
  input: OrganizationRef,
  deps: OrganizationServiceDeps = defaultDeps,
): Promise<OrganizationDetail> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readOrganizationAuthorization(
    input.organizationName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  if (!canUpdateOrganization(authorization.viewer)) {
    throw new DomainPermissionError("Organization update is not allowed.");
  }

  return toOrganizationDetail(authorization.organization, true);
}

export async function updateOrganization(
  actor: DomainActor,
  input: OrganizationUpdateInput,
  deps: OrganizationServiceDeps = defaultDeps,
): Promise<OrganizationDetail> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readOrganizationAuthorization(
    input.currentOrganizationName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  if (!canUpdateOrganization(authorization.viewer)) {
    throw new DomainPermissionError("Organization update is not allowed.");
  }

  const isRename = authorization.organization.organizationName !== input.organizationName;
  if (isRename) {
    const [existingOrganization, existingUser] = await Promise.all([
      deps.organizationNameExists(input.organizationName, {
        excludeOrganizationId: authorization.organization.id,
      }),
      deps.userLoginIdExists(input.organizationName),
    ]);

    if (existingOrganization || existingUser) {
      throw new DomainConflictError("Organization name is already in use.");
    }
  }

  const updated = await deps.updateOrganizationRecord(input);
  if (!updated) {
    throw new DomainNotFoundError("Organization not found.");
  }

  return toOrganizationDetail(updated, true);
}

export async function listOrganizationMembers(
  actor: DomainActor,
  input: OrganizationRef,
  deps: OrganizationServiceDeps = defaultDeps,
): Promise<OrganizationMemberDirectory> {
  requireAuthenticatedActor(actor);

  const authorization = await deps.readOrganizationAuthorization(
    input.organizationName,
    actor.actorId,
  );
  if (!authorization) {
    throw new DomainNotFoundError("Organization not found.");
  }

  if (!canUpdateOrganization(authorization.viewer)) {
    throw new DomainPermissionError("Organization update is not allowed.");
  }

  return toOrganizationMemberDirectory(
    await deps.readOrganizationMembers(authorization.organization.id),
  );
}
