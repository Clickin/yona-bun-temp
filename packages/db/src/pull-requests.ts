import { and, asc, desc, eq, exists, inArray, max, or, sql } from "drizzle-orm";
import type {
  PullRequestDetail,
  PullRequestReviewThread,
  PullRequestReviewThreadFilterInput,
  PullRequestReviewThreadState,
  PullRequestState,
  PullRequestSummary,
} from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

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

function normalizeThreadState(value: null | string): null | PullRequestReviewThreadState {
  const normalizedValue = normalizeNullableText(value)?.toLowerCase();
  if (normalizedValue === "closed" || normalizedValue === "open") {
    return normalizedValue;
  }

  return null;
}

function createContainsPredicate(column: unknown, value: string) {
  return sql`lower(coalesce(${column}, '')) like ${`%${value.toLowerCase()}%`}`;
}

function pullRequestStateFromRaw(value: null | number): PullRequestState {
  if (value === 2) {
    return "merged";
  }

  if (value === 1) {
    return "closed";
  }

  return "open";
}

function pullRequestStateToRaw(value: PullRequestState): number {
  if (value === "merged") {
    return 2;
  }

  if (value === "closed") {
    return 1;
  }

  return 0;
}

export async function listPullRequestsByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<PullRequestSummary[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      contributorLoginId: schema.n4user.loginId,
      contributorName: schema.n4user.name,
      createdAt: schema.pullRequest.created,
      fromBranch: schema.pullRequest.fromBranch,
      pullRequestNumber: schema.pullRequest.number,
      state: schema.pullRequest.state,
      title: schema.pullRequest.title,
      toBranch: schema.pullRequest.toBranch,
    })
    .from(schema.pullRequest)
    .leftJoin(schema.n4user, eq(schema.pullRequest.contributorId, schema.n4user.id))
    .where(eq(schema.pullRequest.toProjectId, projectId))
    .orderBy(desc(schema.pullRequest.number));

  return rows
    .map((row: any) => {
      const title = normalizeNullableText(row.title);
      const contributorLoginId = normalizeNullableText(row.contributorLoginId);
      const contributorName = normalizeNullableText(row.contributorName);
      const fromBranch = normalizeNullableText(row.fromBranch);
      const toBranch = normalizeNullableText(row.toBranch);
      if (
        !title ||
        !contributorLoginId ||
        !contributorName ||
        !fromBranch ||
        !toBranch ||
        !Number.isInteger(row.pullRequestNumber) ||
        row.pullRequestNumber <= 0
      ) {
        return null;
      }

      return {
        contributorLoginId,
        contributorName,
        createdAt: normalizeNullableDate(row.createdAt),
        fromBranch,
        ownerName,
        projectName,
        pullRequestNumber: row.pullRequestNumber,
        state: pullRequestStateFromRaw(row.state ?? null),
        title,
        toBranch,
      } satisfies PullRequestSummary;
    })
    .filter((row: PullRequestSummary | null): row is PullRequestSummary => row !== null);
}

export async function readPullRequestByProjectAndNumber(
  projectId: number,
  pullRequestNumber: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<PullRequestDetail | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      body: schema.pullRequest.body,
      contributorLoginId: schema.n4user.loginId,
      contributorName: schema.n4user.name,
      createdAt: schema.pullRequest.created,
      fromBranch: schema.pullRequest.fromBranch,
      pullRequestNumber: schema.pullRequest.number,
      state: schema.pullRequest.state,
      title: schema.pullRequest.title,
      toBranch: schema.pullRequest.toBranch,
    })
    .from(schema.pullRequest)
    .leftJoin(schema.n4user, eq(schema.pullRequest.contributorId, schema.n4user.id))
    .where(
      and(
        eq(schema.pullRequest.toProjectId, projectId),
        eq(schema.pullRequest.number, pullRequestNumber),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const title = normalizeNullableText(row.title);
  const contributorLoginId = normalizeNullableText(row.contributorLoginId);
  const contributorName = normalizeNullableText(row.contributorName);
  const fromBranch = normalizeNullableText(row.fromBranch);
  const toBranch = normalizeNullableText(row.toBranch);
  if (
    !title ||
    !contributorLoginId ||
    !contributorName ||
    !fromBranch ||
    !toBranch ||
    !Number.isInteger(row.pullRequestNumber) ||
    row.pullRequestNumber <= 0
  ) {
    return null;
  }

  return {
    body: normalizeNullableText(row.body),
    contributorLoginId,
    contributorName,
    createdAt: normalizeNullableDate(row.createdAt),
    fromBranch,
    ownerName,
    projectName,
    pullRequestNumber: row.pullRequestNumber,
    state: pullRequestStateFromRaw(row.state ?? null),
    title,
    toBranch,
  } satisfies PullRequestDetail;
}

export async function createPullRequestRecord(
  input: {
    body: null | string;
    contributorId: number;
    fromBranch: string;
    projectId: number;
    title: string;
    toBranch: string;
  },
  db: DatabaseType = getDb(),
): Promise<number> {
  const schema = getDbSchema(db);
  const now = new Date();
  const [nextNumberRow] = await (db as any)
    .select({
      maxPullRequestNumber: max(schema.pullRequest.number),
    })
    .from(schema.pullRequest)
    .where(eq(schema.pullRequest.toProjectId, input.projectId));

  const nextPullRequestNumber = (nextNumberRow?.maxPullRequestNumber ?? 0) + 1;
  const [inserted] = await (db as any)
    .insert(schema.pullRequest)
    .values({
      body: input.body,
      contributorId: input.contributorId,
      created: now,
      fromBranch: input.fromBranch,
      fromProjectId: input.projectId,
      number: nextPullRequestNumber,
      receiverId: input.contributorId,
      state: 0,
      title: input.title,
      toBranch: input.toBranch,
      toProjectId: input.projectId,
      updated: now,
    })
    .returning({
      pullRequestNumber: schema.pullRequest.number,
    });

  if (
    !inserted ||
    !Number.isInteger(inserted.pullRequestNumber) ||
    inserted.pullRequestNumber <= 0
  ) {
    throw new Error("Failed to create pull request record.");
  }

  return inserted.pullRequestNumber;
}

export async function listPullRequestReviewThreadsByProject(
  input: {
    projectId: number;
    projectName: string;
  } & Pick<
    PullRequestReviewThreadFilterInput,
    "authorLoginId" | "filter" | "participantLoginId" | "state"
  >,
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewThread[]> {
  const schema = getDbSchema(db);
  const predicates = [
    eq(schema.commentThread.projectId, input.projectId),
    sql`${schema.commentThread.pullRequestId} is not null`,
  ];

  if (input.state) {
    predicates.push(sql`lower(coalesce(${schema.commentThread.state}, '')) = ${input.state}`);
  }

  if (input.authorLoginId) {
    predicates.push(eq(schema.commentThread.authorLoginId, input.authorLoginId));
  }

  if (input.participantLoginId) {
    predicates.push(
      exists(
        (db as any)
          .select({ value: sql`1` })
          .from(schema.commentThreadN4user)
          .innerJoin(schema.n4user, eq(schema.commentThreadN4user.n4userId, schema.n4user.id))
          .where(
            and(
              eq(schema.commentThreadN4user.commentThreadId, schema.commentThread.id),
              eq(schema.n4user.loginId, input.participantLoginId),
            ),
          ),
      ),
    );
  }

  if (input.filter) {
    predicates.push(
      or(
        createContainsPredicate(schema.commentThread.commitId, input.filter),
        createContainsPredicate(schema.commentThread.path, input.filter),
        exists(
          (db as any)
            .select({ value: sql`1` })
            .from(schema.reviewComment)
            .where(
              and(
                eq(schema.reviewComment.threadId, schema.commentThread.id),
                createContainsPredicate(schema.reviewComment.contents, input.filter),
              ),
            ),
        ),
      )!,
    );
  }

  const threadRows = await (db as any)
    .select({
      authorLoginId: schema.commentThread.authorLoginId,
      authorName: schema.commentThread.authorName,
      commitId: schema.commentThread.commitId,
      createdAt: schema.commentThread.createdDate,
      path: schema.commentThread.path,
      state: schema.commentThread.state,
      threadId: schema.commentThread.id,
    })
    .from(schema.commentThread)
    .where(and(...predicates))
    .orderBy(desc(schema.commentThread.createdDate), desc(schema.commentThread.id));

  if (threadRows.length === 0) {
    return [];
  }

  const threadIds = threadRows
    .map((row: any) => row.threadId)
    .filter(
      (threadId: unknown): threadId is number =>
        typeof threadId === "number" && Number.isInteger(threadId) && threadId > 0,
    );
  if (threadIds.length === 0) {
    return [];
  }

  const commentRows = await (db as any)
    .select({
      createdAt: schema.reviewComment.createdDate,
      text: schema.reviewComment.contents,
      threadId: schema.reviewComment.threadId,
    })
    .from(schema.reviewComment)
    .where(inArray(schema.reviewComment.threadId, threadIds))
    .orderBy(
      asc(schema.reviewComment.threadId),
      asc(schema.reviewComment.createdDate),
      asc(schema.reviewComment.id),
    );

  const participantRows = await (db as any)
    .select({
      loginId: schema.n4user.loginId,
      threadId: schema.commentThreadN4user.commentThreadId,
    })
    .from(schema.commentThreadN4user)
    .innerJoin(schema.n4user, eq(schema.commentThreadN4user.n4userId, schema.n4user.id))
    .where(inArray(schema.commentThreadN4user.commentThreadId, threadIds))
    .orderBy(asc(schema.commentThreadN4user.commentThreadId), asc(schema.n4user.loginId));

  const commentsByThreadId = new Map<
    number,
    Array<{ createdAt: Date | null | string; text: null | string }>
  >();
  for (const row of commentRows as Array<any>) {
    const threadId = row.threadId;
    if (!Number.isInteger(threadId) || threadId <= 0) {
      continue;
    }

    const entries = commentsByThreadId.get(threadId) ?? [];
    entries.push({
      createdAt: row.createdAt,
      text: row.text,
    });
    commentsByThreadId.set(threadId, entries);
  }

  const participantsByThreadId = new Map<number, string[]>();
  for (const row of participantRows as Array<any>) {
    const threadId = row.threadId;
    const loginId = normalizeNullableText(row.loginId);
    if (!Number.isInteger(threadId) || threadId <= 0 || !loginId) {
      continue;
    }

    const participants = participantsByThreadId.get(threadId) ?? [];
    if (!participants.includes(loginId)) {
      participants.push(loginId);
    }
    participantsByThreadId.set(threadId, participants);
  }

  return threadRows
    .map((row: any) => {
      const threadId = row.threadId;
      const authorLoginId = normalizeNullableText(row.authorLoginId);
      const authorName = normalizeNullableText(row.authorName);
      const state = normalizeThreadState(row.state);
      if (!Number.isInteger(threadId) || threadId <= 0 || !authorLoginId || !authorName || !state) {
        return null;
      }

      const comments = commentsByThreadId.get(threadId) ?? [];
      const firstComment = comments.find((comment) => normalizeNullableText(comment.text) !== null);
      const text = normalizeNullableText(firstComment?.text ?? null);
      if (!text) {
        return null;
      }

      const lastCommentAt = comments.reduce<Date | null>((latest, comment) => {
        const value = normalizeNullableDate(comment.createdAt);
        if (!value) {
          return latest;
        }
        if (!latest || value.getTime() > latest.getTime()) {
          return value;
        }
        return latest;
      }, null);

      return {
        authorLoginId,
        authorName,
        commitId: normalizeNullableText(row.commitId),
        createdAt: normalizeNullableDate(row.createdAt),
        lastCommentAt,
        participants: participantsByThreadId.get(threadId) ?? [],
        path: normalizeNullableText(row.path),
        projectName: input.projectName,
        state,
        text,
        threadId: String(threadId),
      } satisfies PullRequestReviewThread;
    })
    .filter((row: PullRequestReviewThread | null): row is PullRequestReviewThread => row !== null);
}

export async function updatePullRequestStateByProjectAndNumber(
  input: {
    projectId: number;
    pullRequestNumber: number;
    state: PullRequestState;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.pullRequest)
    .set({
      state: pullRequestStateToRaw(input.state),
      updated: new Date(),
    })
    .where(
      and(
        eq(schema.pullRequest.toProjectId, input.projectId),
        eq(schema.pullRequest.number, input.pullRequestNumber),
      ),
    );
}
