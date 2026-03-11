import { and, desc, eq, sql } from "drizzle-orm";
import type {
  PersonalNotificationItem,
  PersonalProjectEntry,
  ProjectNotificationPreference,
  ProjectNotificationType,
  UserPublicProfile,
} from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullableDate(value: Date | null | string): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "NULL" ? null : trimmed;
}

function caseInsensitiveMatch(column: unknown, value: string) {
  return sql`LOWER(${column}) = ${normalizeIdentifier(value)}`;
}

async function readProjectTarget(
  ownerName: string,
  projectName: string,
  db: DatabaseType,
): Promise<null | { id: number; ownerName: string; projectName: string }> {
  const schema = getDbSchema(db);
  const [row] = await db
    .select({
      id: schema.project.id,
      ownerName: schema.project.owner,
      projectName: schema.project.name,
    })
    .from(schema.project)
    .where(
      and(
        caseInsensitiveMatch(schema.project.owner, ownerName),
        caseInsensitiveMatch(schema.project.name, projectName),
      ),
    )
    .limit(1);

  const normalizedOwnerName = normalizeNullableText(row?.ownerName ?? null);
  const normalizedProjectName = normalizeNullableText(row?.projectName ?? null);

  if (!row || !normalizedOwnerName || !normalizedProjectName) {
    return null;
  }

  return {
    id: row.id,
    ownerName: normalizedOwnerName,
    projectName: normalizedProjectName,
  };
}

export async function readUserPublicProfileByLoginId(
  loginId: string,
  db = getDb(),
): Promise<null | UserPublicProfile> {
  const schema = getDbSchema(db);
  const [row] = await db
    .select({
      createdDate: schema.n4user.createdDate,
      loginId: schema.n4user.loginId,
      userLabel: schema.n4user.name,
    })
    .from(schema.n4user)
    .where(caseInsensitiveMatch(schema.n4user.loginId, loginId))
    .limit(1);

  const normalizedLoginId = normalizeNullableText(row?.loginId ?? null);
  if (!row || !normalizedLoginId) {
    return null;
  }

  return {
    joinedAt: normalizeNullableDate(row.createdDate),
    loginId: normalizedLoginId,
    userLabel: normalizeNullableText(row.userLabel) ?? normalizedLoginId,
  };
}

export async function listFavoriteProjectsForUser(
  userId: number,
  db = getDb(),
  limit = 20,
): Promise<PersonalProjectEntry[]> {
  const schema = getDbSchema(db);
  const rows = await db
    .select({
      ownerName: schema.project.owner,
      projectName: schema.project.name,
    })
    .from(schema.favoriteProject)
    .innerJoin(schema.project, eq(schema.favoriteProject.projectId, schema.project.id))
    .where(eq(schema.favoriteProject.userId, userId))
    .orderBy(desc(schema.favoriteProject.id))
    .limit(limit);

  return rows
    .map((row: { ownerName: null | string; projectName: null | string }) => {
      const ownerName = normalizeNullableText(row.ownerName);
      const projectName = normalizeNullableText(row.projectName);
      if (!ownerName || !projectName) {
        return null;
      }

      return {
        ownerName,
        projectName,
      };
    })
    .filter((row: null | PersonalProjectEntry): row is PersonalProjectEntry => row !== null);
}

export async function listRecentProjectsForUser(
  userId: number,
  db = getDb(),
  limit = 20,
): Promise<PersonalProjectEntry[]> {
  const schema = getDbSchema(db);
  const rows = await db
    .select({
      ownerName: schema.project.owner,
      projectName: schema.project.name,
    })
    .from(schema.recentProject)
    .innerJoin(schema.project, eq(schema.recentProject.projectId, schema.project.id))
    .where(eq(schema.recentProject.userId, userId))
    .orderBy(desc(schema.recentProject.id))
    .limit(limit);

  return rows
    .map((row: { ownerName: null | string; projectName: null | string }) => {
      const ownerName = normalizeNullableText(row.ownerName);
      const projectName = normalizeNullableText(row.projectName);
      if (!ownerName || !projectName) {
        return null;
      }

      return {
        ownerName,
        projectName,
      };
    })
    .filter((row: null | PersonalProjectEntry): row is PersonalProjectEntry => row !== null);
}

export async function listNotificationsForUser(
  userId: number,
  db = getDb(),
  limit = 30,
): Promise<PersonalNotificationItem[]> {
  const schema = getDbSchema(db);
  const rows = await db
    .select({
      createdAt: schema.notificationEvent.created,
      eventId: schema.notificationEvent.id,
      eventType: schema.notificationEvent.eventType,
      resourceId: schema.notificationEvent.resourceId,
      resourceType: schema.notificationEvent.resourceType,
      title: schema.notificationEvent.title,
    })
    .from(schema.notificationEventN4user)
    .innerJoin(
      schema.notificationEvent,
      eq(schema.notificationEventN4user.notificationEventId, schema.notificationEvent.id),
    )
    .where(eq(schema.notificationEventN4user.n4userId, userId))
    .orderBy(desc(schema.notificationEvent.created), desc(schema.notificationEvent.id))
    .limit(limit);

  return rows.map(
    (row: {
      createdAt: Date | null | string;
      eventId: number;
      eventType: null | string;
      resourceId: null | string;
      resourceType: null | string;
      title: null | string;
    }) => ({
      createdAt: normalizeNullableDate(row.createdAt),
      eventId: row.eventId,
      eventType: normalizeNullableText(row.eventType),
      resourceId: normalizeNullableText(row.resourceId),
      resourceType: normalizeNullableText(row.resourceType),
      title: normalizeNullableText(row.title),
    }),
  );
}

export async function toggleFavoriteProjectForUser(
  userId: number,
  input: PersonalProjectEntry,
  db = getDb(),
): Promise<{ favorited: boolean; ownerName: string; projectName: string }> {
  const schema = getDbSchema(db);
  const projectTarget = await readProjectTarget(input.ownerName, input.projectName, db);
  if (!projectTarget) {
    throw new Error("Project not found.");
  }

  const [existing] = await db
    .select({ id: schema.favoriteProject.id })
    .from(schema.favoriteProject)
    .where(
      and(
        eq(schema.favoriteProject.userId, userId),
        eq(schema.favoriteProject.projectId, projectTarget.id),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(schema.favoriteProject).where(eq(schema.favoriteProject.id, existing.id));
    return {
      favorited: false,
      ownerName: projectTarget.ownerName,
      projectName: projectTarget.projectName,
    };
  }

  await db.insert(schema.favoriteProject).values({
    owner: projectTarget.ownerName,
    projectId: projectTarget.id,
    projectName: projectTarget.projectName,
    userId,
  });

  return {
    favorited: true,
    ownerName: projectTarget.ownerName,
    projectName: projectTarget.projectName,
  };
}

export async function trackRecentProjectVisitForUser(
  userId: number,
  input: PersonalProjectEntry,
  db = getDb(),
): Promise<PersonalProjectEntry> {
  const schema = getDbSchema(db);
  const projectTarget = await readProjectTarget(input.ownerName, input.projectName, db);
  if (!projectTarget) {
    throw new Error("Project not found.");
  }

  await db
    .delete(schema.recentProject)
    .where(
      and(
        eq(schema.recentProject.userId, userId),
        eq(schema.recentProject.projectId, projectTarget.id),
      ),
    );

  await db.insert(schema.recentProject).values({
    owner: projectTarget.ownerName,
    projectId: projectTarget.id,
    projectName: projectTarget.projectName,
    userId,
  });

  return {
    ownerName: projectTarget.ownerName,
    projectName: projectTarget.projectName,
  };
}

export async function setProjectNotificationAllowed(
  userId: number,
  input: {
    allowed: boolean;
    notificationType: ProjectNotificationType;
    ownerName: string;
    projectName: string;
  },
  db = getDb(),
): Promise<ProjectNotificationPreference> {
  const schema = getDbSchema(db);
  const projectTarget = await readProjectTarget(input.ownerName, input.projectName, db);
  if (!projectTarget) {
    throw new Error("Project not found.");
  }

  const [existing] = await db
    .select({ id: schema.userProjectNotification.id })
    .from(schema.userProjectNotification)
    .where(
      and(
        eq(schema.userProjectNotification.userId, userId),
        eq(schema.userProjectNotification.projectId, projectTarget.id),
        caseInsensitiveMatch(
          schema.userProjectNotification.notificationType,
          input.notificationType,
        ),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.userProjectNotification)
      .set({
        allowed: input.allowed,
        notificationType: input.notificationType,
      })
      .where(eq(schema.userProjectNotification.id, existing.id));
  } else {
    await db.insert(schema.userProjectNotification).values({
      allowed: input.allowed,
      notificationType: input.notificationType,
      projectId: projectTarget.id,
      userId,
    });
  }

  return {
    allowed: input.allowed,
    notificationType: input.notificationType,
    ownerName: projectTarget.ownerName,
    projectName: projectTarget.projectName,
  };
}
