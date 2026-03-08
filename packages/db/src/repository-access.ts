import { and, eq, inArray, sql } from "drizzle-orm";
import type { ProjectScope } from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

const PROJECT_MANAGER_ROLE_ID = 1;
const PROJECT_MEMBER_ROLE_ID = 2;
const ORG_ADMIN_ROLE_ID = 6;
const ORG_MEMBER_ROLE_ID = 7;

export interface RepositoryAccessFactsRecord {
  isAnonymous: boolean;
  isCodeAccessibleMemberOnly: boolean;
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
  projectId: number;
  projectScope: ProjectScope;
}

function normalizeProjectScope(value: null | string): ProjectScope {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "public" || normalized === "protected" || normalized === "private") {
    return normalized;
  }

  return "private";
}

function parseRepositoryId(repositoryId: string): null | number {
  const parsed = Number.parseInt(repositoryId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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

export async function loadRepositoryAccessFacts(
  repositoryId: string,
  userId: null | number,
  db = getDb(),
): Promise<RepositoryAccessFactsRecord | null> {
  const parsedRepositoryId = parseRepositoryId(repositoryId);
  if (parsedRepositoryId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [project] = await (db as any)
    .select({
      id: schema.project.id,
      isCodeAccessibleMemberOnly: schema.project.isCodeAccessibleMemberOnly,
      organizationId: schema.project.organizationId,
      projectScope: schema.project.projectScope,
    })
    .from(schema.project)
    .where(eq(schema.project.id, parsedRepositoryId))
    .limit(1);

  if (!project) {
    return null;
  }

  if (userId === null) {
    return {
      isAnonymous: true,
      isCodeAccessibleMemberOnly: Boolean(project.isCodeAccessibleMemberOnly),
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
      isSiteAdmin: false,
      projectId: project.id,
      projectScope: normalizeProjectScope(project.projectScope),
    };
  }

  const isProjectMember = await membershipExists(
    {
      predicate: and(
        eq(schema.projectUser.projectId, project.id),
        eq(schema.projectUser.userId, userId),
        inArray(schema.projectUser.roleId, [PROJECT_MANAGER_ROLE_ID, PROJECT_MEMBER_ROLE_ID]),
      ),
      table: schema.projectUser,
    },
    db,
  );
  const isProjectManager = await membershipExists(
    {
      predicate: and(
        eq(schema.projectUser.projectId, project.id),
        eq(schema.projectUser.userId, userId),
        eq(schema.projectUser.roleId, PROJECT_MANAGER_ROLE_ID),
      ),
      table: schema.projectUser,
    },
    db,
  );
  const isOrganizationMember =
    project.organizationId === null
      ? false
      : await membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, project.organizationId),
              eq(schema.organizationUser.userId, userId),
              inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
            ),
            table: schema.organizationUser,
          },
          db,
        );
  const isOrganizationAdmin =
    project.organizationId === null
      ? false
      : await membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, project.organizationId),
              eq(schema.organizationUser.userId, userId),
              eq(schema.organizationUser.roleId, ORG_ADMIN_ROLE_ID),
            ),
            table: schema.organizationUser,
          },
          db,
        );
  const isSiteAdmin = await membershipExists(
    {
      predicate: eq(schema.siteAdmin.adminId, userId),
      table: schema.siteAdmin,
    },
    db,
  );

  return {
    isAnonymous: false,
    isCodeAccessibleMemberOnly: Boolean(project.isCodeAccessibleMemberOnly),
    isOrganizationAdmin,
    isOrganizationMember,
    isProjectManager,
    isProjectMember,
    isSiteAdmin,
    projectId: project.id,
    projectScope: normalizeProjectScope(project.projectScope),
  };
}
