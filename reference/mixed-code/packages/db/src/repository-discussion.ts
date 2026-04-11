import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type {
  CreateRepositoryCommitDiscussionCommentOutput,
  DeleteRepositoryCommitDiscussionCommentOutput,
  ListRepositoryCommitDiscussionThreadsOutput,
  RepositoryCommitDiscussionCodeRange,
  RepositoryCommitDiscussionThread,
  RepositoryCommitDiscussionThreadState,
  UpdateRepositoryCommitDiscussionThreadStateOutput,
} from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

export interface RepositoryCommitDiscussionThreadRecord {
  authorId: null | number;
  commitId: string;
  projectId: number;
  state: RepositoryCommitDiscussionThreadState;
  threadId: number;
}

export interface RepositoryCommitDiscussionCommentRecord {
  authorId: null | number;
  commentId: number;
  commitId: string;
  projectId: number;
  threadAuthorId: null | number;
  threadId: number;
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "NULL" ? null : trimmed;
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

function normalizeThreadState(value: null | string): null | RepositoryCommitDiscussionThreadState {
  const normalized = normalizeNullableText(value)?.toLowerCase();
  if (normalized === "closed" || normalized === "open") {
    return normalized;
  }

  return null;
}

function parsePositiveIntId(value: number): null | number {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toNullableDbString(value: null | string | undefined): null | string {
  return value === undefined ? null : value;
}

function mapRange(row: {
  endColumn: null | number;
  endLine: null | number;
  endSide: null | string;
  path: null | string;
  startColumn: null | number;
  startLine: null | number;
  startSide: null | string;
}): null | RepositoryCommitDiscussionCodeRange {
  const path = normalizeNullableText(row.path);
  const startSide = normalizeNullableText(row.startSide);
  const endSide = normalizeNullableText(row.endSide);
  const normalizedStartLine = parsePositiveIntId(row.startLine ?? 0);
  const normalizedEndLine = parsePositiveIntId(row.endLine ?? 0);
  const startColumn = row.startColumn;
  const endColumn = row.endColumn;
  const normalizedStartColumn =
    typeof startColumn === "number" && Number.isInteger(startColumn) && startColumn >= 0
      ? startColumn
      : null;
  const normalizedEndColumn =
    typeof endColumn === "number" && Number.isInteger(endColumn) && endColumn >= 0
      ? endColumn
      : null;

  if (
    !path ||
    (startSide !== "A" && startSide !== "B") ||
    (endSide !== "A" && endSide !== "B") ||
    normalizedStartLine === null ||
    normalizedEndLine === null ||
    normalizedStartColumn === null ||
    normalizedEndColumn === null
  ) {
    return null;
  }

  return {
    endColumn: normalizedEndColumn,
    endLine: normalizedEndLine,
    endSide,
    path,
    startColumn: normalizedStartColumn,
    startLine: normalizedStartLine,
    startSide,
  };
}

async function readThreadSnapshots(
  input: {
    commitId: string;
    projectId: number;
    state?: RepositoryCommitDiscussionThreadState;
    threadIds?: number[];
  },
  db: DatabaseType,
): Promise<ListRepositoryCommitDiscussionThreadsOutput> {
  const schema = getDbSchema(db);
  const predicates = [
    eq(schema.commentThread.projectId, input.projectId),
    eq(schema.commentThread.commitId, input.commitId),
    isNull(schema.commentThread.pullRequestId),
  ];

  if (input.state) {
    predicates.push(eq(schema.commentThread.state, input.state));
  }

  if (input.threadIds && input.threadIds.length > 0) {
    predicates.push(inArray(schema.commentThread.id, input.threadIds));
  }

  const threadRows = await (db as any)
    .select({
      authorLoginId: schema.commentThread.authorLoginId,
      authorName: schema.commentThread.authorName,
      commitId: schema.commentThread.commitId,
      createdAt: schema.commentThread.createdDate,
      endColumn: schema.commentThread.endColumn,
      endLine: schema.commentThread.endLine,
      endSide: schema.commentThread.endSide,
      path: schema.commentThread.path,
      startColumn: schema.commentThread.startColumn,
      startLine: schema.commentThread.startLine,
      startSide: schema.commentThread.startSide,
      state: schema.commentThread.state,
      threadId: schema.commentThread.id,
    })
    .from(schema.commentThread)
    .where(and(...predicates))
    .orderBy(desc(schema.commentThread.createdDate), desc(schema.commentThread.id));

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
      authorLoginId: schema.reviewComment.authorLoginId,
      authorName: schema.reviewComment.authorName,
      commentId: schema.reviewComment.id,
      createdAt: schema.reviewComment.createdDate,
      contents: schema.reviewComment.contents,
      threadId: schema.reviewComment.threadId,
    })
    .from(schema.reviewComment)
    .where(inArray(schema.reviewComment.threadId, threadIds))
    .orderBy(
      asc(schema.reviewComment.threadId),
      asc(schema.reviewComment.createdDate),
      asc(schema.reviewComment.id),
    );

  const commentsByThreadId = new Map<
    number,
    NonNullable<RepositoryCommitDiscussionThread["comments"]>
  >();

  for (const row of commentRows as Array<any>) {
    const threadId = row.threadId;
    const commentId = row.commentId;
    const authorLoginId = normalizeNullableText(row.authorLoginId);
    const authorName = normalizeNullableText(row.authorName);
    const contents = normalizeNullableText(row.contents);
    if (
      !Number.isInteger(threadId) ||
      threadId <= 0 ||
      !Number.isInteger(commentId) ||
      commentId <= 0 ||
      !authorLoginId ||
      !authorName ||
      !contents
    ) {
      continue;
    }

    const comments = commentsByThreadId.get(threadId) ?? [];
    comments.push({
      authorLoginId,
      authorName,
      commentId,
      contents,
      createdAt: normalizeNullableDate(row.createdAt),
    });
    commentsByThreadId.set(threadId, comments);
  }

  return threadRows
    .map((row: any) => {
      const threadId = row.threadId;
      const authorLoginId = normalizeNullableText(row.authorLoginId);
      const authorName = normalizeNullableText(row.authorName);
      const commitId = normalizeNullableText(row.commitId);
      const state = normalizeThreadState(row.state);
      if (
        !Number.isInteger(threadId) ||
        threadId <= 0 ||
        !authorLoginId ||
        !authorName ||
        !commitId ||
        !state
      ) {
        return null;
      }

      const range = mapRange(row);
      const comments = commentsByThreadId.get(threadId) ?? [];
      if (comments.length === 0) {
        return null;
      }

      return {
        authorLoginId,
        authorName,
        comments,
        commitId,
        createdAt: normalizeNullableDate(row.createdAt),
        path: normalizeNullableText(row.path),
        prevCommitId: null,
        range,
        state,
        threadId,
        threadType: range ? "ranged" : "non_ranged",
      } satisfies RepositoryCommitDiscussionThread;
    })
    .filter(
      (
        thread: null | RepositoryCommitDiscussionThread,
      ): thread is RepositoryCommitDiscussionThread => thread !== null,
    );
}

export async function listRepositoryCommitDiscussionThreads(
  input: {
    commitId: string;
    projectId: number;
    state?: RepositoryCommitDiscussionThreadState;
  },
  db: DatabaseType = getDb(),
): Promise<ListRepositoryCommitDiscussionThreadsOutput> {
  return readThreadSnapshots(input, db);
}

export async function readRepositoryCommitDiscussionThread(
  input: {
    commitId: string;
    projectId: number;
    threadId: number;
  },
  db: DatabaseType = getDb(),
): Promise<null | RepositoryCommitDiscussionThreadRecord> {
  const parsedThreadId = parsePositiveIntId(input.threadId);
  if (parsedThreadId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      authorId: schema.commentThread.authorId,
      commitId: schema.commentThread.commitId,
      projectId: schema.commentThread.projectId,
      state: schema.commentThread.state,
      threadId: schema.commentThread.id,
    })
    .from(schema.commentThread)
    .where(
      and(
        eq(schema.commentThread.id, parsedThreadId),
        eq(schema.commentThread.projectId, input.projectId),
        eq(schema.commentThread.commitId, input.commitId),
        isNull(schema.commentThread.pullRequestId),
      ),
    )
    .limit(1);

  const commitId = normalizeNullableText(row?.commitId ?? null);
  const state = normalizeThreadState(row?.state ?? null);
  if (
    !row ||
    !Number.isInteger(row.threadId) ||
    row.threadId <= 0 ||
    !Number.isInteger(row.projectId) ||
    row.projectId <= 0 ||
    !commitId ||
    !state
  ) {
    return null;
  }

  return {
    authorId: typeof row.authorId === "number" ? row.authorId : null,
    commitId,
    projectId: row.projectId,
    state,
    threadId: row.threadId,
  };
}

export async function readRepositoryCommitDiscussionComment(
  input: {
    commentId: number;
    commitId: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<null | RepositoryCommitDiscussionCommentRecord> {
  const parsedCommentId = parsePositiveIntId(input.commentId);
  if (parsedCommentId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      authorId: schema.reviewComment.authorId,
      commentId: schema.reviewComment.id,
      commitId: schema.commentThread.commitId,
      projectId: schema.commentThread.projectId,
      threadAuthorId: schema.commentThread.authorId,
      threadId: schema.commentThread.id,
    })
    .from(schema.reviewComment)
    .innerJoin(schema.commentThread, eq(schema.reviewComment.threadId, schema.commentThread.id))
    .where(
      and(
        eq(schema.reviewComment.id, parsedCommentId),
        eq(schema.commentThread.projectId, input.projectId),
        eq(schema.commentThread.commitId, input.commitId),
        isNull(schema.commentThread.pullRequestId),
      ),
    )
    .limit(1);

  const commitId = normalizeNullableText(row?.commitId ?? null);
  if (
    !row ||
    !Number.isInteger(row.commentId) ||
    row.commentId <= 0 ||
    !Number.isInteger(row.threadId) ||
    row.threadId <= 0 ||
    !Number.isInteger(row.projectId) ||
    row.projectId <= 0 ||
    !commitId
  ) {
    return null;
  }

  return {
    authorId: typeof row.authorId === "number" ? row.authorId : null,
    commentId: row.commentId,
    commitId,
    projectId: row.projectId,
    threadAuthorId: typeof row.threadAuthorId === "number" ? row.threadAuthorId : null,
    threadId: row.threadId,
  };
}

export async function createRepositoryCommitDiscussionComment(
  input: {
    authorId: number;
    authorLoginId: string;
    authorName: string;
    commitId: string;
    contents: string;
    projectId: number;
    range?: RepositoryCommitDiscussionCodeRange;
    threadId?: number;
  },
  db: DatabaseType = getDb(),
): Promise<CreateRepositoryCommitDiscussionCommentOutput> {
  const schema = getDbSchema(db);
  const now = new Date();
  let threadId = input.threadId ?? null;

  if (threadId !== null) {
    const existingThread = await readRepositoryCommitDiscussionThread(
      {
        commitId: input.commitId,
        projectId: input.projectId,
        threadId,
      },
      db,
    );
    if (!existingThread) {
      throw new Error("Repository discussion thread not found.");
    }
  } else {
    const [insertedThread] = await (db as any)
      .insert(schema.commentThread)
      .values({
        authorId: input.authorId,
        authorLoginId: input.authorLoginId,
        authorName: input.authorName,
        commitId: input.commitId,
        createdDate: now,
        dtype: input.range ? "CodeCommentThread" : "NonRangedCodeCommentThread",
        endColumn: input.range?.endColumn ?? null,
        endLine: input.range?.endLine ?? null,
        endSide: toNullableDbString(input.range?.endSide),
        path: toNullableDbString(input.range?.path),
        projectId: input.projectId,
        pullRequestId: null,
        startColumn: input.range?.startColumn ?? null,
        startLine: input.range?.startLine ?? null,
        startSide: toNullableDbString(input.range?.startSide),
        state: "open",
      })
      .returning({
        threadId: schema.commentThread.id,
      });

    threadId = parsePositiveIntId(insertedThread?.threadId ?? 0);
    if (threadId === null) {
      throw new Error("Failed to create repository discussion thread.");
    }
  }

  await (db as any).insert(schema.reviewComment).values({
    authorId: input.authorId,
    authorLoginId: input.authorLoginId,
    authorName: input.authorName,
    contents: input.contents,
    createdDate: now,
    threadId,
  });

  const [thread] = await readThreadSnapshots(
    {
      commitId: input.commitId,
      projectId: input.projectId,
      threadIds: [threadId],
    },
    db,
  );
  if (!thread) {
    throw new Error("Failed to read repository discussion thread.");
  }

  return thread;
}

export async function updateRepositoryCommitDiscussionThreadState(
  input: {
    commitId: string;
    projectId: number;
    state: RepositoryCommitDiscussionThreadState;
    threadId: number;
  },
  db: DatabaseType = getDb(),
): Promise<UpdateRepositoryCommitDiscussionThreadStateOutput> {
  const parsedThreadId = parsePositiveIntId(input.threadId);
  if (parsedThreadId === null) {
    throw new Error("Invalid repository discussion thread id.");
  }

  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.commentThread)
    .set({
      state: input.state,
    })
    .where(
      and(
        eq(schema.commentThread.id, parsedThreadId),
        eq(schema.commentThread.projectId, input.projectId),
        eq(schema.commentThread.commitId, input.commitId),
        isNull(schema.commentThread.pullRequestId),
      ),
    );

  const [thread] = await readThreadSnapshots(
    {
      commitId: input.commitId,
      projectId: input.projectId,
      threadIds: [parsedThreadId],
    },
    db,
  );
  if (!thread) {
    throw new Error("Repository discussion thread not found.");
  }

  return thread;
}

export async function deleteRepositoryCommitDiscussionComment(
  input: {
    commentId: number;
    commitId: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<DeleteRepositoryCommitDiscussionCommentOutput> {
  const comment = await readRepositoryCommitDiscussionComment(input, db);
  if (!comment) {
    throw new Error("Repository discussion comment not found.");
  }

  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.reviewComment)
    .where(eq(schema.reviewComment.id, comment.commentId));

  const [remainingCountRow] = await (db as any)
    .select({
      total: sql<number>`count(*)`,
    })
    .from(schema.reviewComment)
    .where(eq(schema.reviewComment.threadId, comment.threadId));

  const remainingComments = Number(remainingCountRow?.total ?? 0);
  if (!Number.isFinite(remainingComments) || remainingComments <= 0) {
    await (db as any)
      .delete(schema.commentThread)
      .where(eq(schema.commentThread.id, comment.threadId));
    return {
      deletedCommentId: comment.commentId,
      threadDeleted: true,
      threadId: comment.threadId,
    };
  }

  return {
    deletedCommentId: comment.commentId,
    threadDeleted: false,
    threadId: comment.threadId,
  };
}
