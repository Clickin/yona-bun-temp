import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import type {
  IssueAssignee,
  IssueComment,
  IssueDetail,
  IssueState,
  IssueSummary,
  IssueTimelineComment,
  IssueTimelineEvent,
} from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

const ISSUE_RESOURCE_TYPE = "issue_post";
const PROJECT_RESOURCE_TYPE = "project";
const PROJECT_MANAGER_ROLE_ID = 1;
const PROJECT_MEMBER_ROLE_ID = 2;
const ORG_ADMIN_ROLE_ID = 6;
const ORG_MEMBER_ROLE_ID = 7;

type IssueReadOptions = {
  db?: DatabaseType;
  viewerId?: null | number;
};

function isDatabaseType(value: unknown): value is DatabaseType {
  return !!value && typeof value === "object" && "dbType" in value;
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

  const trimmed = `${value}`.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "NULL" ? null : trimmed;
}

function normalizeProjectScope(value: null | string): "private" | "protected" | "public" {
  if (value === "public" || value === "protected") {
    return value;
  }

  return "private";
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function caseInsensitiveMatch(column: unknown, value: string) {
  return sql`LOWER(${column}) = ${normalizeIdentifier(value)}`;
}

function issueStateFromRaw(value: null | number): IssueState {
  return value === 0 ? "open" : "closed";
}

function issueStateToRaw(value: IssueState): number {
  return value === "open" ? 0 : 1;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function resolveReadOptions(
  viewerOrOptions?: DatabaseType | IssueReadOptions | null | number,
  dbArg: DatabaseType = getDb(),
): { db: DatabaseType; viewerId: null | number } {
  if (typeof viewerOrOptions === "number" || viewerOrOptions === null) {
    return {
      db: dbArg,
      viewerId: viewerOrOptions ?? null,
    };
  }

  if (isDatabaseType(viewerOrOptions)) {
    return {
      db: viewerOrOptions,
      viewerId: null,
    };
  }

  const options = viewerOrOptions as IssueReadOptions | undefined;

  return {
    db: options?.db ?? dbArg,
    viewerId: options?.viewerId ?? null,
  };
}

function mapIssueAssignee(row: {
  assigneeLoginId: null | string;
  assigneeName: null | string;
}): IssueAssignee | null {
  const loginId = normalizeNullableText(row.assigneeLoginId);
  const name = normalizeNullableText(row.assigneeName);
  if (!loginId || !name) {
    return null;
  }

  return {
    loginId,
    name,
  } satisfies IssueAssignee;
}

function mapIssueComment(row: {
  authorLoginId: null | string;
  authorName: null | string;
  commentId: number;
  contents: null | string;
  createdAt: Date | null | string;
}): IssueComment | null {
  const authorLoginId = normalizeNullableText(row.authorLoginId);
  const authorName = normalizeNullableText(row.authorName);
  if (!authorLoginId || !authorName || !isPositiveInteger(row.commentId)) {
    return null;
  }

  return {
    authorLoginId,
    authorName,
    commentId: row.commentId,
    contents: normalizeNullableText(row.contents) ?? "",
    createdAt: normalizeNullableDate(row.createdAt),
  } satisfies IssueComment;
}

function compareTimelineItems(
  a: IssueTimelineComment | IssueTimelineEvent,
  b: IssueTimelineComment | IssueTimelineEvent,
): number {
  const timeDiff = (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  if (timeDiff !== 0) {
    return timeDiff;
  }

  if (a.kind !== b.kind) {
    return a.kind === "comment" ? -1 : 1;
  }

  if (a.kind === "comment" && b.kind === "comment") {
    return a.commentId - b.commentId;
  }

  return (a as IssueTimelineEvent).eventId - (b as IssueTimelineEvent).eventId;
}

async function findOrCreateAssigneeId(
  userId: number,
  projectId: number,
  db: DatabaseType,
): Promise<number> {
  const schema = getDbSchema(db);
  const [existing] = await (db as any)
    .select({ assigneeId: schema.assignee.id })
    .from(schema.assignee)
    .where(and(eq(schema.assignee.projectId, projectId), eq(schema.assignee.userId, userId)))
    .limit(1);

  if (isPositiveInteger(existing?.assigneeId)) {
    return existing.assigneeId;
  }

  const [created] = await (db as any)
    .insert(schema.assignee)
    .values({ projectId, userId })
    .returning({ assigneeId: schema.assignee.id });

  if (!isPositiveInteger(created?.assigneeId)) {
    throw new Error("Failed to create assignee record.");
  }

  return created.assigneeId;
}

async function filterReadableWatcherIds(
  input: {
    assigneeUserId: null | number;
    authorId: null | number;
    projectId: number;
    watcherIds: number[];
  },
  db: DatabaseType,
): Promise<number[]> {
  if (input.watcherIds.length === 0) {
    return [];
  }

  const schema = getDbSchema(db);
  const [projectRow] = await (db as any)
    .select({
      organizationId: schema.project.organizationId,
      projectScope: schema.project.projectScope,
    })
    .from(schema.project)
    .where(eq(schema.project.id, input.projectId))
    .limit(1);

  if (!projectRow) {
    return [];
  }

  const projectScope = normalizeProjectScope(projectRow.projectScope ?? null);
  if (projectScope === "public") {
    return input.watcherIds;
  }

  const allowed = new Set<number>();

  const projectMembers = await (db as any)
    .select({ userId: schema.projectUser.userId })
    .from(schema.projectUser)
    .where(
      and(
        eq(schema.projectUser.projectId, input.projectId),
        inArray(schema.projectUser.userId, input.watcherIds),
        inArray(schema.projectUser.roleId, [PROJECT_MANAGER_ROLE_ID, PROJECT_MEMBER_ROLE_ID]),
      ),
    );
  for (const row of projectMembers) {
    if (isPositiveInteger(row.userId)) {
      allowed.add(row.userId);
    }
  }

  const siteAdmins = await (db as any)
    .select({ userId: schema.siteAdmin.adminId })
    .from(schema.siteAdmin)
    .where(inArray(schema.siteAdmin.adminId, input.watcherIds));
  for (const row of siteAdmins) {
    if (isPositiveInteger(row.userId)) {
      allowed.add(row.userId);
    }
  }

  if (projectRow.organizationId !== null) {
    const organizationRows = await (db as any)
      .select({
        roleId: schema.organizationUser.roleId,
        userId: schema.organizationUser.userId,
      })
      .from(schema.organizationUser)
      .where(
        and(
          eq(schema.organizationUser.organizationId, projectRow.organizationId),
          inArray(schema.organizationUser.userId, input.watcherIds),
          inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
        ),
      );

    for (const row of organizationRows) {
      if (!isPositiveInteger(row.userId)) {
        continue;
      }

      if (row.roleId === ORG_ADMIN_ROLE_ID) {
        allowed.add(row.userId);
        continue;
      }

      if (projectScope === "protected" && row.roleId === ORG_MEMBER_ROLE_ID) {
        allowed.add(row.userId);
      }
    }
  }

  if (isPositiveInteger(input.authorId)) {
    allowed.add(input.authorId);
  }
  if (isPositiveInteger(input.assigneeUserId)) {
    allowed.add(input.assigneeUserId);
  }

  return input.watcherIds.filter((watcherId: number) => allowed.has(watcherId));
}

async function readIssueParticipation(
  input: {
    assigneeUserId: null | number;
    authorId: null | number;
    issueId: number;
    projectId: number;
    viewerId: null | number;
  },
  db: DatabaseType,
): Promise<{
  hasVoted: boolean;
  isWatching: boolean;
  voterCount: number;
  watcherCount: number;
}> {
  const schema = getDbSchema(db);
  const [commentRows, projectWatchRows, voterRows, issueWatchRows, issueUnwatchRows] =
    await Promise.all([
      (db as any)
        .select({ userId: schema.issueComment.authorId })
        .from(schema.issueComment)
        .where(eq(schema.issueComment.issueId, input.issueId)),
      (db as any)
        .select({ userId: schema.watch.userId })
        .from(schema.watch)
        .where(
          and(
            eq(schema.watch.resourceId, input.projectId.toString()),
            eq(schema.watch.resourceType, PROJECT_RESOURCE_TYPE),
          ),
        ),
      (db as any)
        .select({ userId: schema.issueVoter.userId })
        .from(schema.issueVoter)
        .where(eq(schema.issueVoter.issueId, input.issueId)),
      (db as any)
        .select({ userId: schema.watch.userId })
        .from(schema.watch)
        .where(
          and(
            eq(schema.watch.resourceId, input.issueId.toString()),
            eq(schema.watch.resourceType, ISSUE_RESOURCE_TYPE),
          ),
        ),
      (db as any)
        .select({ userId: schema.unwatch.userId })
        .from(schema.unwatch)
        .where(
          and(
            eq(schema.unwatch.resourceId, input.issueId.toString()),
            eq(schema.unwatch.resourceType, ISSUE_RESOURCE_TYPE),
          ),
        ),
    ]);

  const voterIds = new Set<number>();
  const watcherIds = new Set<number>();

  if (isPositiveInteger(input.authorId)) {
    watcherIds.add(input.authorId);
  }
  if (isPositiveInteger(input.assigneeUserId)) {
    watcherIds.add(input.assigneeUserId);
  }

  for (const row of commentRows) {
    if (isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
    }
  }

  for (const row of voterRows) {
    if (isPositiveInteger(row.userId)) {
      voterIds.add(row.userId);
      watcherIds.add(row.userId);
    }
  }

  for (const row of projectWatchRows) {
    if (isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
    }
  }

  for (const row of issueWatchRows) {
    if (isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
    }
  }

  for (const row of issueUnwatchRows) {
    if (isPositiveInteger(row.userId)) {
      watcherIds.delete(row.userId);
    }
  }

  const effectiveWatcherIds = await filterReadableWatcherIds(
    {
      assigneeUserId: input.assigneeUserId,
      authorId: input.authorId,
      projectId: input.projectId,
      watcherIds: [...watcherIds],
    },
    db,
  );

  return {
    hasVoted: input.viewerId !== null ? voterIds.has(input.viewerId) : false,
    isWatching: input.viewerId !== null ? effectiveWatcherIds.includes(input.viewerId) : false,
    voterCount: voterIds.size,
    watcherCount: effectiveWatcherIds.length,
  };
}

async function readIssueRowsByProject(projectId: number, db: DatabaseType) {
  const schema = getDbSchema(db);
  return (db as any)
    .select({
      assigneeLoginId: schema.n4user.loginId,
      assigneeName: schema.n4user.name,
      assigneeUserId: schema.assignee.userId,
      authorId: schema.issue.authorId,
      authorLoginId: schema.issue.authorLoginId,
      authorName: schema.issue.authorName,
      body: schema.issue.body,
      createdAt: schema.issue.createdDate,
      issueId: schema.issue.id,
      issueNumber: schema.issue.number,
      state: schema.issue.state,
      title: schema.issue.title,
    })
    .from(schema.issue)
    .leftJoin(schema.assignee, eq(schema.issue.assigneeId, schema.assignee.id))
    .leftJoin(schema.n4user, eq(schema.assignee.userId, schema.n4user.id))
    .where(eq(schema.issue.projectId, projectId))
    .orderBy(desc(schema.issue.number));
}

async function readReadableWatcherIdsForProject(
  input: {
    assigneeUserIds: number[];
    authorIds: number[];
    projectId: number;
    watcherIds: number[];
  },
  db: DatabaseType,
): Promise<Set<number>> {
  if (input.watcherIds.length === 0) {
    return new Set<number>();
  }

  const schema = getDbSchema(db);
  const [projectRow] = await (db as any)
    .select({
      organizationId: schema.project.organizationId,
      projectScope: schema.project.projectScope,
    })
    .from(schema.project)
    .where(eq(schema.project.id, input.projectId))
    .limit(1);

  if (!projectRow) {
    return new Set<number>();
  }

  const projectScope = normalizeProjectScope(projectRow.projectScope ?? null);
  if (projectScope === "public") {
    return new Set(input.watcherIds);
  }

  const candidateWatcherIds = [...new Set(input.watcherIds)];
  const [projectMembers, siteAdmins, organizationRows] = await Promise.all([
    (db as any)
      .select({ userId: schema.projectUser.userId })
      .from(schema.projectUser)
      .where(
        and(
          eq(schema.projectUser.projectId, input.projectId),
          inArray(schema.projectUser.userId, candidateWatcherIds),
          inArray(schema.projectUser.roleId, [PROJECT_MANAGER_ROLE_ID, PROJECT_MEMBER_ROLE_ID]),
        ),
      ),
    (db as any)
      .select({ userId: schema.siteAdmin.adminId })
      .from(schema.siteAdmin)
      .where(inArray(schema.siteAdmin.adminId, candidateWatcherIds)),
    projectRow.organizationId === null
      ? Promise.resolve([] as Array<{ roleId: null | number; userId: null | number }>)
      : (db as any)
          .select({
            roleId: schema.organizationUser.roleId,
            userId: schema.organizationUser.userId,
          })
          .from(schema.organizationUser)
          .where(
            and(
              eq(schema.organizationUser.organizationId, projectRow.organizationId),
              inArray(schema.organizationUser.userId, candidateWatcherIds),
              inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
            ),
          ),
  ]);

  const readableWatcherIds = new Set<number>();

  for (const row of projectMembers) {
    if (isPositiveInteger(row.userId)) {
      readableWatcherIds.add(row.userId);
    }
  }

  for (const row of siteAdmins) {
    if (isPositiveInteger(row.userId)) {
      readableWatcherIds.add(row.userId);
    }
  }

  for (const row of organizationRows) {
    if (!isPositiveInteger(row.userId)) {
      continue;
    }

    if (row.roleId === ORG_ADMIN_ROLE_ID) {
      readableWatcherIds.add(row.userId);
      continue;
    }

    if (projectScope === "protected" && row.roleId === ORG_MEMBER_ROLE_ID) {
      readableWatcherIds.add(row.userId);
    }
  }

  for (const authorId of input.authorIds) {
    if (isPositiveInteger(authorId)) {
      readableWatcherIds.add(authorId);
    }
  }

  for (const assigneeUserId of input.assigneeUserIds) {
    if (isPositiveInteger(assigneeUserId)) {
      readableWatcherIds.add(assigneeUserId);
    }
  }

  return readableWatcherIds;
}

async function readIssueListParticipation(
  rows: any[],
  projectId: number,
  db: DatabaseType,
): Promise<Map<number, { voterCount: number; watcherCount: number }>> {
  const issueIds = rows
    .map((row: any) => row.issueId)
    .filter((issueId: unknown): issueId is number => isPositiveInteger(issueId));
  const participationByIssueId = new Map<number, { voterCount: number; watcherCount: number }>();

  if (issueIds.length === 0) {
    return participationByIssueId;
  }

  const authorIds = rows
    .map((row: any) => row.authorId)
    .filter((authorId: unknown): authorId is number => isPositiveInteger(authorId));
  const assigneeUserIds = rows
    .map((row: any) => row.assigneeUserId)
    .filter((assigneeUserId: unknown): assigneeUserId is number =>
      isPositiveInteger(assigneeUserId),
    );

  const schema = getDbSchema(db);
  const [commentRows, voterRows, issueWatchRows, issueUnwatchRows, projectWatchRows] =
    await Promise.all([
      (db as any)
        .select({
          issueId: schema.issueComment.issueId,
          userId: schema.issueComment.authorId,
        })
        .from(schema.issueComment)
        .where(inArray(schema.issueComment.issueId, issueIds)),
      (db as any)
        .select({
          issueId: schema.issueVoter.issueId,
          userId: schema.issueVoter.userId,
        })
        .from(schema.issueVoter)
        .where(inArray(schema.issueVoter.issueId, issueIds)),
      (db as any)
        .select({
          issueId: schema.watch.resourceId,
          userId: schema.watch.userId,
        })
        .from(schema.watch)
        .where(
          and(
            inArray(
              schema.watch.resourceId,
              issueIds.map((issueId) => issueId.toString()),
            ),
            eq(schema.watch.resourceType, ISSUE_RESOURCE_TYPE),
          ),
        ),
      (db as any)
        .select({
          issueId: schema.unwatch.resourceId,
          userId: schema.unwatch.userId,
        })
        .from(schema.unwatch)
        .where(
          and(
            inArray(
              schema.unwatch.resourceId,
              issueIds.map((issueId) => issueId.toString()),
            ),
            eq(schema.unwatch.resourceType, ISSUE_RESOURCE_TYPE),
          ),
        ),
      (db as any)
        .select({ userId: schema.watch.userId })
        .from(schema.watch)
        .where(
          and(
            eq(schema.watch.resourceId, projectId.toString()),
            eq(schema.watch.resourceType, PROJECT_RESOURCE_TYPE),
          ),
        ),
    ]);

  const watcherIdsByIssueId = new Map<number, Set<number>>();
  const voterIdsByIssueId = new Map<number, Set<number>>();
  const issueUnwatchIdsByIssueId = new Map<number, Set<number>>();

  for (const row of rows) {
    if (!isPositiveInteger(row.issueId)) {
      continue;
    }

    const watcherIds = new Set<number>();
    if (isPositiveInteger(row.authorId)) {
      watcherIds.add(row.authorId);
    }
    if (isPositiveInteger(row.assigneeUserId)) {
      watcherIds.add(row.assigneeUserId);
    }

    watcherIdsByIssueId.set(row.issueId, watcherIds);
    voterIdsByIssueId.set(row.issueId, new Set<number>());
  }

  for (const row of commentRows) {
    const issueId = Number(row.issueId);
    const watcherIds = watcherIdsByIssueId.get(issueId);
    if (watcherIds && isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
    }
  }

  for (const row of voterRows) {
    const issueId = Number(row.issueId);
    const watcherIds = watcherIdsByIssueId.get(issueId);
    const voterIds = voterIdsByIssueId.get(issueId);
    if (watcherIds && voterIds && isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
      voterIds.add(row.userId);
    }
  }

  for (const row of issueWatchRows) {
    const issueId = Number(row.issueId);
    const watcherIds = watcherIdsByIssueId.get(issueId);
    if (watcherIds && isPositiveInteger(row.userId)) {
      watcherIds.add(row.userId);
    }
  }

  for (const row of issueUnwatchRows) {
    const issueId = Number(row.issueId);
    if (!isPositiveInteger(row.userId)) {
      continue;
    }

    const issueUnwatchIds = issueUnwatchIdsByIssueId.get(issueId) ?? new Set<number>();
    issueUnwatchIds.add(row.userId);
    issueUnwatchIdsByIssueId.set(issueId, issueUnwatchIds);
  }

  const projectWatcherIds = new Set<number>();
  for (const row of projectWatchRows) {
    if (isPositiveInteger(row.userId)) {
      projectWatcherIds.add(row.userId);
    }
  }

  const allWatcherIds = new Set<number>();
  for (const issueId of issueIds) {
    const watcherIds = watcherIdsByIssueId.get(issueId) ?? new Set<number>();
    for (const userId of projectWatcherIds) {
      watcherIds.add(userId);
    }
    for (const userId of issueUnwatchIdsByIssueId.get(issueId) ?? []) {
      watcherIds.delete(userId);
    }
    for (const userId of watcherIds) {
      allWatcherIds.add(userId);
    }
  }

  const readableWatcherIds = await readReadableWatcherIdsForProject(
    {
      assigneeUserIds,
      authorIds,
      projectId,
      watcherIds: [...allWatcherIds],
    },
    db,
  );

  for (const issueId of issueIds) {
    const watcherIds = watcherIdsByIssueId.get(issueId) ?? new Set<number>();
    participationByIssueId.set(issueId, {
      voterCount: voterIdsByIssueId.get(issueId)?.size ?? 0,
      watcherCount: [...watcherIds].filter((userId: number) => readableWatcherIds.has(userId))
        .length,
    });
  }

  return participationByIssueId;
}

export async function listIssuesByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<IssueSummary[]> {
  const rows = await readIssueRowsByProject(projectId, db);
  const participationByIssueId = await readIssueListParticipation(rows, projectId, db);
  const mapped = rows.map((row: any) => {
    const title = normalizeNullableText(row.title);
    const authorLoginId = normalizeNullableText(row.authorLoginId);
    const authorName = normalizeNullableText(row.authorName);
    if (
      !title ||
      !authorLoginId ||
      !authorName ||
      !isPositiveInteger(row.issueId) ||
      !isPositiveInteger(row.issueNumber)
    ) {
      return null;
    }

    const participation = participationByIssueId.get(row.issueId) ?? {
      voterCount: 0,
      watcherCount: 0,
    };

    return {
      assignee: mapIssueAssignee(row),
      authorLoginId,
      authorName,
      createdAt: normalizeNullableDate(row.createdAt),
      issueNumber: row.issueNumber,
      ownerName,
      projectName,
      state: issueStateFromRaw(row.state ?? null),
      title,
      voterCount: participation.voterCount,
      watcherCount: participation.watcherCount,
    } satisfies IssueSummary;
  });

  return mapped.filter((row: IssueSummary | null): row is IssueSummary => row !== null);
}
export async function readIssueByProjectAndNumber(
  projectId: number,
  issueNumber: number,
  ownerName: string,
  projectName: string,
  viewerOrOptions?: DatabaseType | IssueReadOptions | null | number,
  dbArg: DatabaseType = getDb(),
): Promise<IssueDetail | null> {
  const { db, viewerId } = resolveReadOptions(viewerOrOptions, dbArg);
  const schema = getDbSchema(db);
  const [issueRow] = await (db as any)
    .select({
      assigneeLoginId: schema.n4user.loginId,
      assigneeName: schema.n4user.name,
      assigneeUserId: schema.assignee.userId,
      authorId: schema.issue.authorId,
      authorLoginId: schema.issue.authorLoginId,
      authorName: schema.issue.authorName,
      body: schema.issue.body,
      createdAt: schema.issue.createdDate,
      issueId: schema.issue.id,
      issueNumber: schema.issue.number,
      state: schema.issue.state,
      title: schema.issue.title,
    })
    .from(schema.issue)
    .leftJoin(schema.assignee, eq(schema.issue.assigneeId, schema.assignee.id))
    .leftJoin(schema.n4user, eq(schema.assignee.userId, schema.n4user.id))
    .where(and(eq(schema.issue.projectId, projectId), eq(schema.issue.number, issueNumber)))
    .limit(1);

  if (!issueRow) {
    return null;
  }

  const [commentRows, eventRows, participation] = await Promise.all([
    (db as any)
      .select({
        authorLoginId: schema.issueComment.authorLoginId,
        authorName: schema.issueComment.authorName,
        commentId: schema.issueComment.id,
        contents: schema.issueComment.contents,
        createdAt: schema.issueComment.createdDate,
      })
      .from(schema.issueComment)
      .where(eq(schema.issueComment.issueId, issueRow.issueId))
      .orderBy(schema.issueComment.id),
    (db as any)
      .select({
        createdAt: schema.issueEvent.created,
        eventId: schema.issueEvent.id,
        eventType: schema.issueEvent.eventType,
        newValue: schema.issueEvent.newValue,
        oldValue: schema.issueEvent.oldValue,
        senderLoginId: schema.issueEvent.senderLoginId,
      })
      .from(schema.issueEvent)
      .where(eq(schema.issueEvent.issueId, issueRow.issueId))
      .orderBy(schema.issueEvent.id),
    readIssueParticipation(
      {
        assigneeUserId: isPositiveInteger(issueRow.assigneeUserId) ? issueRow.assigneeUserId : null,
        authorId: isPositiveInteger(issueRow.authorId) ? issueRow.authorId : null,
        issueId: issueRow.issueId,
        projectId,
        viewerId,
      },
      db,
    ),
  ]);

  const title = normalizeNullableText(issueRow.title);
  const authorLoginId = normalizeNullableText(issueRow.authorLoginId);
  const authorName = normalizeNullableText(issueRow.authorName);
  if (!title || !authorLoginId || !authorName || !isPositiveInteger(issueRow.issueNumber)) {
    return null;
  }

  const comments = commentRows
    .map((row: any) =>
      mapIssueComment({
        authorLoginId: row.authorLoginId,
        authorName: row.authorName,
        commentId: row.commentId,
        contents: row.contents,
        createdAt: row.createdAt,
      }),
    )
    .filter((row: IssueComment | null): row is IssueComment => row !== null);

  const timelineComments = comments.map(
    (comment: IssueComment) =>
      ({
        ...comment,
        kind: "comment",
      }) satisfies IssueTimelineComment,
  );
  const timelineEvents = eventRows
    .map((row: any) => {
      const eventType = normalizeNullableText(row.eventType);
      if (!eventType || !isPositiveInteger(row.eventId)) {
        return null;
      }

      return {
        createdAt: normalizeNullableDate(row.createdAt),
        eventId: row.eventId,
        eventType,
        kind: "event",
        newValue: normalizeNullableText(row.newValue),
        oldValue: normalizeNullableText(row.oldValue),
        senderLoginId: normalizeNullableText(row.senderLoginId),
      } satisfies IssueTimelineEvent;
    })
    .filter((row: IssueTimelineEvent | null): row is IssueTimelineEvent => row !== null);

  return {
    assignee: mapIssueAssignee(issueRow),
    authorLoginId,
    authorName,
    body: normalizeNullableText(issueRow.body),
    comments,
    createdAt: normalizeNullableDate(issueRow.createdAt),
    hasVoted: participation.hasVoted,
    isWatching: participation.isWatching,
    issueNumber: issueRow.issueNumber,
    ownerName,
    projectName,
    state: issueStateFromRaw(issueRow.state ?? null),
    timeline: [...timelineComments, ...timelineEvents].toSorted(compareTimelineItems),
    title,
    voterCount: participation.voterCount,
    watcherCount: participation.watcherCount,
  } satisfies IssueDetail;
}

export async function createIssueRecord(
  input: {
    authorId: number;
    authorLoginId: string;
    authorName: string;
    body: null | string;
    projectId: number;
    title: string;
  },
  db: DatabaseType = getDb(),
): Promise<number> {
  const schema = getDbSchema(db);
  const now = new Date();
  const [nextNumberRow] = await (db as any)
    .select({ maxIssueNumber: max(schema.issue.number) })
    .from(schema.issue)
    .where(eq(schema.issue.projectId, input.projectId));

  const nextIssueNumber = (nextNumberRow?.maxIssueNumber ?? 0) + 1;
  const [inserted] = await (db as any)
    .insert(schema.issue)
    .values({
      authorId: input.authorId,
      authorLoginId: input.authorLoginId,
      authorName: input.authorName,
      body: input.body,
      createdDate: now,
      number: nextIssueNumber,
      projectId: input.projectId,
      state: 0,
      title: input.title,
      updatedDate: now,
    })
    .returning({ issueNumber: schema.issue.number });

  if (!inserted || !Number.isInteger(inserted.issueNumber) || inserted.issueNumber <= 0) {
    throw new Error("Failed to create issue record.");
  }

  return inserted.issueNumber;
}

export async function createIssueCommentRecord(
  input: {
    authorId: number;
    authorLoginId: string;
    authorName: string;
    contents: string;
    issueId: number;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any).insert(schema.issueComment).values({
    authorId: input.authorId,
    authorLoginId: input.authorLoginId,
    authorName: input.authorName,
    contents: input.contents,
    createdDate: new Date(),
    issueId: input.issueId,
    projectId: input.projectId,
  });
}

export async function readIssueIdByProjectAndNumber(
  projectId: number,
  issueNumber: number,
  db: DatabaseType = getDb(),
): Promise<number | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({ issueId: schema.issue.id })
    .from(schema.issue)
    .where(and(eq(schema.issue.projectId, projectId), eq(schema.issue.number, issueNumber)))
    .limit(1);

  return row?.issueId ?? null;
}

export async function readUserRecordByLoginId(
  loginId: string,
  db: DatabaseType = getDb(),
): Promise<null | { loginId: string; name: string; userId: number }> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      loginId: schema.n4user.loginId,
      name: schema.n4user.name,
      userId: schema.n4user.id,
    })
    .from(schema.n4user)
    .where(caseInsensitiveMatch(schema.n4user.loginId, loginId))
    .limit(1);

  const normalizedLoginId = normalizeNullableText(row?.loginId ?? null);
  const normalizedName = normalizeNullableText(row?.name ?? null);
  if (!normalizedLoginId || !normalizedName || !isPositiveInteger(row?.userId)) {
    return null;
  }

  return {
    loginId: normalizedLoginId,
    name: normalizedName,
    userId: row.userId,
  };
}

async function insertIssueEventRecord(
  input: {
    created: Date;
    eventType: string;
    issueId: number;
    newValue: null | string;
    oldValue: null | string;
    senderLoginId: string;
  },
  db: DatabaseType,
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any).insert(schema.issueEvent).values({
    created: input.created,
    eventType: input.eventType,
    issueId: input.issueId,
    newValue: input.newValue,
    oldValue: input.oldValue,
    senderLoginId: input.senderLoginId,
  });
}

async function readIssueMutationRowByProjectAndNumber(
  input: { issueNumber: number; projectId: number },
  db: DatabaseType,
): Promise<null | {
  assigneeLoginId: null | string;
  assigneeUserId: null | number;
  issueId: number;
  state: null | number;
}> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      assigneeLoginId: schema.n4user.loginId,
      assigneeUserId: schema.assignee.userId,
      issueId: schema.issue.id,
      state: schema.issue.state,
    })
    .from(schema.issue)
    .leftJoin(schema.assignee, eq(schema.issue.assigneeId, schema.assignee.id))
    .leftJoin(schema.n4user, eq(schema.assignee.userId, schema.n4user.id))
    .where(
      and(eq(schema.issue.projectId, input.projectId), eq(schema.issue.number, input.issueNumber)),
    )
    .limit(1);

  if (!isPositiveInteger(row?.issueId)) {
    return null;
  }

  return {
    assigneeLoginId: normalizeNullableText(row.assigneeLoginId),
    assigneeUserId: isPositiveInteger(row.assigneeUserId) ? row.assigneeUserId : null,
    issueId: row.issueId,
    state: row.state ?? null,
  };
}

export async function updateIssueStateByProjectAndNumber(
  input: {
    issueNumber: number;
    projectId: number;
    senderLoginId: string;
    state: IssueState;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const currentIssue = await readIssueMutationRowByProjectAndNumber(input, db);
  if (!currentIssue) {
    return;
  }

  const previousState = issueStateFromRaw(currentIssue.state);
  if (previousState === input.state) {
    return;
  }

  const schema = getDbSchema(db);
  const now = new Date();
  await (db as any)
    .update(schema.issue)
    .set({
      state: issueStateToRaw(input.state),
      updatedDate: now,
    })
    .where(
      and(eq(schema.issue.projectId, input.projectId), eq(schema.issue.number, input.issueNumber)),
    );

  await insertIssueEventRecord(
    {
      created: now,
      eventType: "issue.state.changed",
      issueId: currentIssue.issueId,
      newValue: input.state,
      oldValue: previousState,
      senderLoginId: input.senderLoginId,
    },
    db,
  );
}

export async function assignIssueRecord(
  input: {
    issueId: number;
    projectId: number;
    userId: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  const assigneeId = await findOrCreateAssigneeId(input.userId, input.projectId, db);
  await (db as any)
    .update(schema.issue)
    .set({
      assigneeId,
      updatedDate: new Date(),
    })
    .where(eq(schema.issue.id, input.issueId));
}

export async function unassignIssueRecord(
  input: { issueId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.issue)
    .set({
      assigneeId: null,
      updatedDate: new Date(),
    })
    .where(eq(schema.issue.id, input.issueId));
}

export async function watchIssueRecord(
  input: { issueId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.watch)
    .where(
      and(
        eq(schema.watch.resourceId, input.issueId.toString()),
        eq(schema.watch.resourceType, ISSUE_RESOURCE_TYPE),
        eq(schema.watch.userId, input.userId),
      ),
    );
  await (db as any).insert(schema.watch).values({
    resourceId: input.issueId.toString(),
    resourceType: ISSUE_RESOURCE_TYPE,
    userId: input.userId,
  });
  await (db as any)
    .delete(schema.unwatch)
    .where(
      and(
        eq(schema.unwatch.resourceId, input.issueId.toString()),
        eq(schema.unwatch.resourceType, ISSUE_RESOURCE_TYPE),
        eq(schema.unwatch.userId, input.userId),
      ),
    );
}

export async function unwatchIssueRecord(
  input: { issueId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.unwatch)
    .where(
      and(
        eq(schema.unwatch.resourceId, input.issueId.toString()),
        eq(schema.unwatch.resourceType, ISSUE_RESOURCE_TYPE),
        eq(schema.unwatch.userId, input.userId),
      ),
    );
  await (db as any).insert(schema.unwatch).values({
    resourceId: input.issueId.toString(),
    resourceType: ISSUE_RESOURCE_TYPE,
    userId: input.userId,
  });
  await (db as any)
    .delete(schema.watch)
    .where(
      and(
        eq(schema.watch.resourceId, input.issueId.toString()),
        eq(schema.watch.resourceType, ISSUE_RESOURCE_TYPE),
        eq(schema.watch.userId, input.userId),
      ),
    );
}

export async function voteIssueRecord(
  input: { issueId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  const [existing] = await (db as any)
    .select({ userId: schema.issueVoter.userId })
    .from(schema.issueVoter)
    .where(
      and(eq(schema.issueVoter.issueId, input.issueId), eq(schema.issueVoter.userId, input.userId)),
    )
    .limit(1);

  if (!existing) {
    await (db as any).insert(schema.issueVoter).values({
      issueId: input.issueId,
      userId: input.userId,
    });
  }
}

export async function unvoteIssueRecord(
  input: { issueId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.issueVoter)
    .where(
      and(eq(schema.issueVoter.issueId, input.issueId), eq(schema.issueVoter.userId, input.userId)),
    );
}

export async function assignIssueByProjectAndNumber(
  input: { assigneeLoginId: string; issueNumber: number; projectId: number; senderLoginId: string },
  db: DatabaseType = getDb(),
): Promise<void> {
  const currentIssue = await readIssueMutationRowByProjectAndNumber(input, db);
  if (!currentIssue) {
    return;
  }

  const assignee = await readUserRecordByLoginId(input.assigneeLoginId, db);
  if (!assignee) {
    if (currentIssue.assigneeUserId === null) {
      return;
    }

    await unassignIssueRecord({ issueId: currentIssue.issueId }, db);
    await insertIssueEventRecord(
      {
        created: new Date(),
        eventType: "issue.assignee.changed",
        issueId: currentIssue.issueId,
        newValue: null,
        oldValue: currentIssue.assigneeLoginId,
        senderLoginId: input.senderLoginId,
      },
      db,
    );
    return;
  }

  if (currentIssue.assigneeUserId === assignee.userId) {
    return;
  }

  await assignIssueRecord(
    { issueId: currentIssue.issueId, projectId: input.projectId, userId: assignee.userId },
    db,
  );
  await insertIssueEventRecord(
    {
      created: new Date(),
      eventType: "issue.assignee.changed",
      issueId: currentIssue.issueId,
      newValue: assignee.loginId,
      oldValue: currentIssue.assigneeLoginId,
      senderLoginId: input.senderLoginId,
    },
    db,
  );
}

export async function unassignIssueByProjectAndNumber(
  input: { issueNumber: number; projectId: number; senderLoginId: string },
  db: DatabaseType = getDb(),
): Promise<void> {
  const currentIssue = await readIssueMutationRowByProjectAndNumber(input, db);
  if (!currentIssue || currentIssue.assigneeUserId === null) {
    return;
  }

  await unassignIssueRecord({ issueId: currentIssue.issueId }, db);
  await insertIssueEventRecord(
    {
      created: new Date(),
      eventType: "issue.assignee.changed",
      issueId: currentIssue.issueId,
      newValue: null,
      oldValue: currentIssue.assigneeLoginId,
      senderLoginId: input.senderLoginId,
    },
    db,
  );
}
export async function watchIssueByProjectAndNumber(
  input: { issueNumber: number; projectId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const issueId = await readIssueIdByProjectAndNumber(input.projectId, input.issueNumber, db);
  if (issueId !== null) {
    await watchIssueRecord({ issueId, userId: input.userId }, db);
  }
}

export async function unwatchIssueByProjectAndNumber(
  input: { issueNumber: number; projectId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const issueId = await readIssueIdByProjectAndNumber(input.projectId, input.issueNumber, db);
  if (issueId !== null) {
    await unwatchIssueRecord({ issueId, userId: input.userId }, db);
  }
}

export async function voteIssueByProjectAndNumber(
  input: { issueNumber: number; projectId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const issueId = await readIssueIdByProjectAndNumber(input.projectId, input.issueNumber, db);
  if (issueId !== null) {
    await voteIssueRecord({ issueId, userId: input.userId }, db);
  }
}

export async function unvoteIssueByProjectAndNumber(
  input: { issueNumber: number; projectId: number; userId: number },
  db: DatabaseType = getDb(),
): Promise<void> {
  const issueId = await readIssueIdByProjectAndNumber(input.projectId, input.issueNumber, db);
  if (issueId !== null) {
    await unvoteIssueRecord({ issueId, userId: input.userId }, db);
  }
}
