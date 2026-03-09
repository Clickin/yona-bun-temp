import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type {
  OrganizationCreateInput,
  OrganizationUpdateInput,
  ProjectCreateInput,
  ProjectScope,
  ProjectUpdateInput,
} from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

const PROJECT_MANAGER_ROLE_ID = 1;
const PROJECT_MEMBER_ROLE_ID = 2;
const ORG_ADMIN_ROLE_ID = 6;
const ORG_MEMBER_ROLE_ID = 7;

export interface OrganizationRecord {
  createdAt: Date | null;
  description: null | string;
  id: number;
  organizationName: string;
}

export interface OrganizationAuthorizationRecord {
  organization: OrganizationRecord;
  viewer: {
    isOrganizationAdmin: boolean;
    isOrganizationMember: boolean;
    isSiteAdmin: boolean;
  };
}

export interface ProjectRecord {
  id: number;
  organizationId: null | number;
  organizationName: null | string;
  ownerName: string;
  overview: null | string;
  projectName: string;
  projectScope: ProjectScope;
}

export interface ProjectAuthorizationRecord {
  project: ProjectRecord;
  viewer: {
    isAnonymous: boolean;
    isOrganizationAdmin: boolean;
    isOrganizationMember: boolean;
    isProjectManager: boolean;
    isProjectMember: boolean;
    isSiteAdmin: boolean;
  };
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toUpperCase() === "NULL") {
    return null;
  }

  return trimmed;
}

function normalizeOptionalDate(value: Date | null | string): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeProjectScope(value: null | string): ProjectScope {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "public" || normalized === "protected" || normalized === "private") {
    return normalized;
  }

  return "private";
}

function caseInsensitiveMatch(column: unknown, value: string) {
  return sql`LOWER(${column}) = ${normalizeIdentifier(value)}`;
}

function buildProjectSiteUrl(projectName: string): string {
  return `http://localhost:9000/${projectName}`;
}

async function membershipExists(
  input: {
    predicate: unknown;
    table: unknown;
  },
  db: DatabaseType,
): Promise<boolean> {
  const [row] = await (db as any)
    .select({ value: sql<number>`1` })
    .from(input.table)
    .where(input.predicate)
    .limit(1);

  return row !== undefined;
}

function mapOrganizationRecord(row: {
  createdAt: Date | null | string;
  description: null | string;
  id: number;
  organizationName: null | string;
}): OrganizationRecord | null {
  const organizationName = normalizeNullableText(row.organizationName);
  if (!organizationName) {
    return null;
  }

  return {
    createdAt: normalizeOptionalDate(row.createdAt),
    description: normalizeNullableText(row.description),
    id: row.id,
    organizationName,
  };
}

function mapProjectRecord(row: {
  id: number;
  organizationId: null | number;
  organizationName: null | string;
  ownerName: null | string;
  overview: null | string;
  projectName: null | string;
  projectScope: null | string;
}): ProjectRecord | null {
  const ownerName = normalizeNullableText(row.ownerName);
  const projectName = normalizeNullableText(row.projectName);

  if (!ownerName || !projectName) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organizationId ?? null,
    organizationName: normalizeNullableText(row.organizationName),
    ownerName,
    overview: normalizeNullableText(row.overview),
    projectName,
    projectScope: normalizeProjectScope(row.projectScope),
  };
}

async function selectSingleOrganization(
  predicate: unknown,
  db = getDb(),
): Promise<OrganizationRecord | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      createdAt: schema.organization.created,
      description: schema.organization.descr,
      id: schema.organization.id,
      organizationName: schema.organization.name,
    })
    .from(schema.organization)
    .where(predicate)
    .limit(1);

  return row ? mapOrganizationRecord(row) : null;
}

async function selectSingleProject(
  predicate: unknown,
  db = getDb(),
): Promise<ProjectRecord | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      id: schema.project.id,
      organizationId: schema.project.organizationId,
      organizationName: schema.organization.name,
      ownerName: schema.project.owner,
      overview: schema.project.overview,
      projectName: schema.project.name,
      projectScope: schema.project.projectScope,
    })
    .from(schema.project)
    .leftJoin(schema.organization, eq(schema.project.organizationId, schema.organization.id))
    .where(predicate)
    .limit(1);

  return row ? mapProjectRecord(row) : null;
}

export async function userLoginIdExists(loginId: string, db = getDb()): Promise<boolean> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({ value: sql<number>`1` })
    .from(schema.n4user)
    .where(caseInsensitiveMatch(schema.n4user.loginId, loginId))
    .limit(1);

  return row !== undefined;
}

export async function readOrganizationByName(
  organizationName: string,
  db = getDb(),
): Promise<OrganizationRecord | null> {
  const schema = getDbSchema(db);
  return selectSingleOrganization(
    caseInsensitiveMatch(schema.organization.name, organizationName),
    db,
  );
}

export async function organizationNameExists(
  organizationName: string,
  options: {
    excludeOrganizationId?: number;
  } = {},
  db = getDb(),
): Promise<boolean> {
  const schema = getDbSchema(db);
  const predicate =
    options.excludeOrganizationId === undefined
      ? caseInsensitiveMatch(schema.organization.name, organizationName)
      : and(
          caseInsensitiveMatch(schema.organization.name, organizationName),
          ne(schema.organization.id, options.excludeOrganizationId),
        );

  const [row] = await (db as any)
    .select({ value: sql<number>`1` })
    .from(schema.organization)
    .where(predicate)
    .limit(1);

  return row !== undefined;
}

export async function createOrganizationRecord(
  input: OrganizationCreateInput,
  db = getDb(),
): Promise<OrganizationRecord> {
  const schema = getDbSchema(db);
  const now = new Date();

  return (db as any).transaction(async (tx: DatabaseType) => {
    await (tx as any).insert(schema.organization).values({
      created: now,
      descr: input.description,
      name: input.organizationName,
    });

    const created = await readOrganizationByName(input.organizationName, tx);
    if (!created) {
      throw new Error("Failed to load newly created organization.");
    }

    return created;
  });
}

export async function grantOrganizationAdmin(
  organizationId: number,
  userId: number,
  db = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  const [existingMembership] = await (db as any)
    .select({
      id: schema.organizationUser.id,
    })
    .from(schema.organizationUser)
    .where(
      and(
        eq(schema.organizationUser.organizationId, organizationId),
        eq(schema.organizationUser.userId, userId),
      ),
    )
    .limit(1);

  if (existingMembership) {
    await (db as any)
      .update(schema.organizationUser)
      .set({
        roleId: ORG_ADMIN_ROLE_ID,
      })
      .where(eq(schema.organizationUser.id, existingMembership.id));
    return;
  }

  await (db as any).insert(schema.organizationUser).values({
    organizationId,
    roleId: ORG_ADMIN_ROLE_ID,
    userId,
  });
}

export async function readOrganizationAuthorization(
  organizationName: string,
  userId: null | number,
  db = getDb(),
): Promise<OrganizationAuthorizationRecord | null> {
  const organization = await readOrganizationByName(organizationName, db);
  if (!organization) {
    return null;
  }

  if (userId === null) {
    return {
      organization,
      viewer: {
        isOrganizationAdmin: false,
        isOrganizationMember: false,
        isSiteAdmin: false,
      },
    };
  }

  const schema = getDbSchema(db);
  const [isOrganizationAdmin, isOrganizationMember, isSiteAdmin] = await Promise.all([
    membershipExists(
      {
        predicate: and(
          eq(schema.organizationUser.organizationId, organization.id),
          eq(schema.organizationUser.userId, userId),
          eq(schema.organizationUser.roleId, ORG_ADMIN_ROLE_ID),
        ),
        table: schema.organizationUser,
      },
      db,
    ),
    membershipExists(
      {
        predicate: and(
          eq(schema.organizationUser.organizationId, organization.id),
          eq(schema.organizationUser.userId, userId),
          inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
        ),
        table: schema.organizationUser,
      },
      db,
    ),
    membershipExists(
      {
        predicate: eq(schema.siteAdmin.adminId, userId),
        table: schema.siteAdmin,
      },
      db,
    ),
  ]);

  return {
    organization,
    viewer: {
      isOrganizationAdmin,
      isOrganizationMember,
      isSiteAdmin,
    },
  };
}

export async function updateOrganizationRecord(
  input: OrganizationUpdateInput,
  db = getDb(),
): Promise<OrganizationRecord | null> {
  const schema = getDbSchema(db);

  return (db as any).transaction(async (tx: DatabaseType) => {
    const current = await readOrganizationByName(input.currentOrganizationName, tx);
    if (!current) {
      return null;
    }

    await (tx as any)
      .update(schema.organization)
      .set({
        descr: input.description,
        name: input.organizationName,
      })
      .where(eq(schema.organization.id, current.id));

    if (current.organizationName !== input.organizationName) {
      await (tx as any)
        .update(schema.project)
        .set({
          owner: input.organizationName,
        })
        .where(eq(schema.project.organizationId, current.id));
    }

    return readOrganizationByName(input.organizationName, tx);
  });
}

export async function readProjectByOwnerAndName(
  ownerName: string,
  projectName: string,
  db = getDb(),
): Promise<ProjectRecord | null> {
  const schema = getDbSchema(db);
  return selectSingleProject(
    and(
      caseInsensitiveMatch(schema.project.owner, ownerName),
      caseInsensitiveMatch(schema.project.name, projectName),
    ),
    db,
  );
}

export async function projectIdentifierExists(
  ownerName: string,
  projectName: string,
  options: {
    excludeProjectId?: number;
  } = {},
  db = getDb(),
): Promise<boolean> {
  const schema = getDbSchema(db);
  const basePredicate = and(
    caseInsensitiveMatch(schema.project.owner, ownerName),
    caseInsensitiveMatch(schema.project.name, projectName),
  );
  const predicate =
    options.excludeProjectId === undefined
      ? basePredicate
      : and(basePredicate, ne(schema.project.id, options.excludeProjectId));

  const [row] = await (db as any)
    .select({ value: sql<number>`1` })
    .from(schema.project)
    .where(predicate)
    .limit(1);

  return row !== undefined;
}

export async function createProjectRecord(
  input: {
    organizationId: null | number;
    organizationName: null | string;
    ownerName: string;
    overview: ProjectCreateInput["overview"];
    projectName: string;
    projectScope: ProjectScope;
  },
  db = getDb(),
): Promise<ProjectRecord> {
  const schema = getDbSchema(db);
  const now = new Date();

  return (db as any).transaction(async (tx: DatabaseType) => {
    await (tx as any).insert(schema.project).values({
      createdDate: now,
      name: input.projectName,
      organizationId: input.organizationId,
      overview: input.overview,
      owner: input.ownerName,
      projectScope: input.projectScope,
      siteurl: buildProjectSiteUrl(input.projectName),
      vcs: "GIT",
    });

    const created = await readProjectByOwnerAndName(input.ownerName, input.projectName, tx);
    if (!created) {
      throw new Error("Failed to load newly created project.");
    }

    return created;
  });
}

export async function grantProjectManager(
  projectId: number,
  userId: number,
  db = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  const [existingMembership] = await (db as any)
    .select({
      id: schema.projectUser.id,
    })
    .from(schema.projectUser)
    .where(and(eq(schema.projectUser.projectId, projectId), eq(schema.projectUser.userId, userId)))
    .limit(1);

  if (existingMembership) {
    await (db as any)
      .update(schema.projectUser)
      .set({
        roleId: PROJECT_MANAGER_ROLE_ID,
      })
      .where(eq(schema.projectUser.id, existingMembership.id));
    return;
  }

  await (db as any).insert(schema.projectUser).values({
    projectId,
    roleId: PROJECT_MANAGER_ROLE_ID,
    userId,
  });
}

export async function readProjectAuthorization(
  ownerName: string,
  projectName: string,
  userId: null | number,
  db = getDb(),
): Promise<ProjectAuthorizationRecord | null> {
  const project = await readProjectByOwnerAndName(ownerName, projectName, db);
  if (!project) {
    return null;
  }

  if (userId === null) {
    return {
      project,
      viewer: {
        isAnonymous: true,
        isOrganizationAdmin: false,
        isOrganizationMember: false,
        isProjectManager: false,
        isProjectMember: false,
        isSiteAdmin: false,
      },
    };
  }

  const schema = getDbSchema(db);
  const [
    isProjectMember,
    isProjectManager,
    isOrganizationMember,
    isOrganizationAdmin,
    isSiteAdmin,
  ] = await Promise.all([
    membershipExists(
      {
        predicate: and(
          eq(schema.projectUser.projectId, project.id),
          eq(schema.projectUser.userId, userId),
          inArray(schema.projectUser.roleId, [PROJECT_MANAGER_ROLE_ID, PROJECT_MEMBER_ROLE_ID]),
        ),
        table: schema.projectUser,
      },
      db,
    ),
    membershipExists(
      {
        predicate: and(
          eq(schema.projectUser.projectId, project.id),
          eq(schema.projectUser.userId, userId),
          eq(schema.projectUser.roleId, PROJECT_MANAGER_ROLE_ID),
        ),
        table: schema.projectUser,
      },
      db,
    ),
    project.organizationId === null
      ? Promise.resolve(false)
      : membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, project.organizationId),
              eq(schema.organizationUser.userId, userId),
              inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
            ),
            table: schema.organizationUser,
          },
          db,
        ),
    project.organizationId === null
      ? Promise.resolve(false)
      : membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, project.organizationId),
              eq(schema.organizationUser.userId, userId),
              eq(schema.organizationUser.roleId, ORG_ADMIN_ROLE_ID),
            ),
            table: schema.organizationUser,
          },
          db,
        ),
    membershipExists(
      {
        predicate: eq(schema.siteAdmin.adminId, userId),
        table: schema.siteAdmin,
      },
      db,
    ),
  ]);

  return {
    project,
    viewer: {
      isAnonymous: false,
      isOrganizationAdmin,
      isOrganizationMember,
      isProjectManager,
      isProjectMember,
      isSiteAdmin,
    },
  };
}

export async function updateProjectRecord(
  input: ProjectUpdateInput,
  db = getDb(),
): Promise<ProjectRecord | null> {
  const schema = getDbSchema(db);

  return (db as any).transaction(async (tx: DatabaseType) => {
    const current = await readProjectByOwnerAndName(
      input.currentOwnerName,
      input.currentProjectName,
      tx,
    );
    if (!current) {
      return null;
    }

    await (tx as any)
      .update(schema.project)
      .set({
        name: input.projectName,
        overview: input.overview,
        projectScope: input.projectScope,
        siteurl: buildProjectSiteUrl(input.projectName),
      })
      .where(eq(schema.project.id, current.id));

    return readProjectByOwnerAndName(current.ownerName, input.projectName, tx);
  });
}
