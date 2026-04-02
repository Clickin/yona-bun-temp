import { and, asc, desc, eq, exists, inArray, max, or, sql } from "drizzle-orm";
import type {
  PullRequestDetail,
  PullRequestReviewComment,
  PullRequestReviewCommentDeleteOutput,
  PullRequestReviewCounts,
  PullRequestReviewSummary,
  PullRequestReviewThread,
  PullRequestReviewThreadFilterInput,
  PullRequestReviewThreadOrderBy,
  PullRequestReviewThreadOrderDir,
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

function parsePositiveIntId(value: number): null | number {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toNullableDbString(value: null | string | undefined): null | string {
  return value === undefined ? null : value;
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
      id: schema.pullRequest.id,
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

  const pullRequestId = parsePositiveIntId(row.id ?? 0);
  if (pullRequestId === null) {
    return null;
  }

  const [threadSummaryRows, reviewerCountRows] = await Promise.all([
    (db as any)
      .select({
        closedThreadCount: sql<number>`sum(case when lower(coalesce(${schema.commentThread.state}, '')) = 'closed' then 1 else 0 end)`,
        openThreadCount: sql<number>`sum(case when lower(coalesce(${schema.commentThread.state}, '')) = 'open' then 1 else 0 end)`,
      })
      .from(schema.commentThread)
      .where(eq(schema.commentThread.pullRequestId, pullRequestId)),
    (db as any)
      .select({
        reviewerCount: sql<number>`count(*)`,
      })
      .from(schema.pullRequestReviewers)
      .where(eq(schema.pullRequestReviewers.pullRequestId, pullRequestId)),
  ]);
  const threadSummaryRow = threadSummaryRows[0];
  const reviewerCountRow = reviewerCountRows[0];

  const title = normalizeNullableText(row.title);
  const contributorLoginId = normalizeNullableText(row.contributorLoginId);
  const contributorName = normalizeNullableText(row.contributorName);
  const fromBranch = normalizeNullableText(row.fromBranch);
  const toBranch = normalizeNullableText(row.toBranch);
  const reviewSummary = {
    closedThreadCount: Number(threadSummaryRow?.closedThreadCount ?? 0),
    openThreadCount: Number(threadSummaryRow?.openThreadCount ?? 0),
    reviewerCount: Number(reviewerCountRow?.reviewerCount ?? 0),
  } satisfies PullRequestReviewSummary;
  if (
    !title ||
    !contributorLoginId ||
    !contributorName ||
    !fromBranch ||
    !toBranch ||
    !Number.isInteger(row.pullRequestNumber) ||
    row.pullRequestNumber <= 0 ||
    !Number.isFinite(reviewSummary.closedThreadCount) ||
    reviewSummary.closedThreadCount < 0 ||
    !Number.isFinite(reviewSummary.openThreadCount) ||
    reviewSummary.openThreadCount < 0 ||
    !Number.isFinite(reviewSummary.reviewerCount) ||
    reviewSummary.reviewerCount < 0
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
    reviewSummary,
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

const DEFAULT_REVIEW_ORDER_BY: PullRequestReviewThreadOrderBy = "createdDate";
const DEFAULT_REVIEW_ORDER_DIR: PullRequestReviewThreadOrderDir = "desc";

type PullRequestReviewThreadListInput = {
  projectId: number;
  projectName: string;
  pullRequestId?: number;
} & Pick<
  PullRequestReviewThreadFilterInput,
  "authorLoginId" | "filter" | "orderBy" | "orderDir" | "participantLoginId" | "state"
>;

type PullRequestReviewThreadCountInput = Pick<
  PullRequestReviewThreadFilterInput,
  "authorLoginId" | "filter" | "participantLoginId" | "state"
> & {
  currentLoginId: string;
  projectId: number;
};

type PullRequestReviewThreadPredicateInput = Pick<
  PullRequestReviewThreadFilterInput,
  "authorLoginId" | "filter" | "participantLoginId" | "state"
> & {
  projectId: number;
  pullRequestId?: number;
};

type PullRequestReviewThreadPredicateOverrides = Partial<
  Pick<PullRequestReviewThreadFilterInput, "authorLoginId" | "participantLoginId" | "state">
>;

function resolveReviewOverride<T extends keyof PullRequestReviewThreadPredicateOverrides>(
  overrides: PullRequestReviewThreadPredicateOverrides,
  key: T,
  fallback: PullRequestReviewThreadPredicateInput[T],
) {
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : fallback;
}

function createPullRequestReviewThreadPredicates(
  input: PullRequestReviewThreadPredicateInput,
  schema: ReturnType<typeof getDbSchema>,
  db: DatabaseType,
  overrides: PullRequestReviewThreadPredicateOverrides = {},
) {
  const predicates = [eq(schema.commentThread.projectId, input.projectId)];
  if (input.pullRequestId !== undefined) {
    predicates.push(eq(schema.commentThread.pullRequestId, input.pullRequestId));
  } else {
    predicates.push(sql`${schema.commentThread.pullRequestId} is not null`);
  }
  const state = resolveReviewOverride(overrides, "state", input.state);
  const authorLoginId = resolveReviewOverride(overrides, "authorLoginId", input.authorLoginId);
  const participantLoginId = resolveReviewOverride(
    overrides,
    "participantLoginId",
    input.participantLoginId,
  );

  if (state) {
    predicates.push(sql`lower(coalesce(${schema.commentThread.state}, '')) = ${state}`);
  }

  if (authorLoginId) {
    predicates.push(eq(schema.commentThread.authorLoginId, authorLoginId));
  }

  if (participantLoginId) {
    predicates.push(
      exists(
        (db as any)
          .select({ value: sql`1` })
          .from(schema.commentThreadN4user)
          .innerJoin(schema.n4user, eq(schema.commentThreadN4user.n4userId, schema.n4user.id))
          .where(
            and(
              eq(schema.commentThreadN4user.commentThreadId, schema.commentThread.id),
              eq(schema.n4user.loginId, participantLoginId),
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

  return predicates;
}

function createPullRequestReviewThreadOrdering(
  input: Pick<PullRequestReviewThreadFilterInput, "orderBy" | "orderDir">,
  schema: ReturnType<typeof getDbSchema>,
) {
  const orderBy = input.orderBy ?? DEFAULT_REVIEW_ORDER_BY;
  const orderDir = input.orderDir ?? DEFAULT_REVIEW_ORDER_DIR;
  if (orderBy !== "createdDate" || orderDir === "desc") {
    return [desc(schema.commentThread.createdDate), desc(schema.commentThread.id)] as const;
  }

  return [asc(schema.commentThread.createdDate), asc(schema.commentThread.id)] as const;
}

async function countPullRequestReviewThreadsByProject(
  input: PullRequestReviewThreadPredicateInput,
  db: DatabaseType,
  overrides: PullRequestReviewThreadPredicateOverrides = {},
): Promise<number> {
  const schema = getDbSchema(db);
  const predicates = createPullRequestReviewThreadPredicates(input, schema, db, overrides);
  const [row] = await (db as any)
    .select({ total: sql<number>`count(*)` })
    .from(schema.commentThread)
    .where(and(...predicates));

  const total = Number(row?.total ?? 0);
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

export async function readPullRequestReviewCountsByProject(
  input: PullRequestReviewThreadCountInput,
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewCounts> {
  const baseInput: PullRequestReviewThreadPredicateInput = {
    authorLoginId: input.authorLoginId,
    filter: input.filter,
    participantLoginId: input.participantLoginId,
    projectId: input.projectId,
    state: input.state,
  };

  const [all, involvingYou, createdByYou, open, closed] = await Promise.all([
    countPullRequestReviewThreadsByProject(baseInput, db, {
      authorLoginId: undefined,
      participantLoginId: undefined,
    }),
    countPullRequestReviewThreadsByProject(baseInput, db, {
      authorLoginId: undefined,
      participantLoginId: input.currentLoginId,
    }),
    countPullRequestReviewThreadsByProject(baseInput, db, {
      authorLoginId: input.currentLoginId,
      participantLoginId: undefined,
    }),
    countPullRequestReviewThreadsByProject(baseInput, db, {
      state: "open",
    }),
    countPullRequestReviewThreadsByProject(baseInput, db, {
      state: "closed",
    }),
  ]);

  return {
    all,
    closed,
    createdByYou,
    involvingYou,
    open,
  } satisfies PullRequestReviewCounts;
}

export async function listPullRequestReviewThreadsByProject(
  input: PullRequestReviewThreadListInput,
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewThread[]> {
  const schema = getDbSchema(db);
  const predicates = createPullRequestReviewThreadPredicates(input, schema, db);
  const ordering = createPullRequestReviewThreadOrdering(input, schema);

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
    .orderBy(...ordering);

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
      authorLoginId: schema.reviewComment.authorLoginId,
      authorName: schema.reviewComment.authorName,
      commentId: schema.reviewComment.id,
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

  const commentsByThreadId = new Map<number, PullRequestReviewComment[]>();
  for (const row of commentRows as Array<any>) {
    const threadId = row.threadId;
    const commentId = parsePositiveIntId(row.commentId ?? 0);
    const authorLoginId = normalizeNullableText(row.authorLoginId);
    const authorName = normalizeNullableText(row.authorName);
    const contents = normalizeNullableText(row.text);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      continue;
    }
    if (commentId === null || !authorLoginId || !authorName || !contents) {
      continue;
    }

    const entries = commentsByThreadId.get(threadId) ?? [];
    entries.push({
      authorLoginId,
      authorName,
      commentId,
      contents,
      createdAt: row.createdAt,
    } satisfies PullRequestReviewComment);
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
      const firstComment = comments.find(
        (comment) => normalizeNullableText(comment.contents) !== null,
      );
      const text = normalizeNullableText(firstComment?.contents ?? null);
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
        comments,
        commitId: normalizeNullableText(row.commitId),
        createdAt: normalizeNullableDate(row.createdAt),
        lastCommentAt,
        participants: participantsByThreadId.get(threadId) ?? [],
        path: normalizeNullableText(row.path),
        projectName: input.projectName,
        replyCount: Math.max(comments.length - 1, 0),
        state,
        text,
        threadId: String(threadId),
      } satisfies PullRequestReviewThread;
    })
    .filter((row: PullRequestReviewThread | null): row is PullRequestReviewThread => row !== null);
}

export async function listPullRequestReviewThreadsByPullRequest(
  input: PullRequestReviewThreadListInput & { pullRequestId: number },
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewThread[]> {
  return listPullRequestReviewThreadsByProject(input, db);
}

export interface PullRequestRecord {
  fromBranch: string;
  fromProjectId: number;
  id: number;
  isConflict: boolean;
  isMerging: boolean;
  mergedCommitIdFrom: null | string;
  mergedCommitIdTo: null | string;
  pullRequestNumber: number;
  state: PullRequestState;
  toBranch: string;
  toProjectId: number;
}

export interface PullRequestReviewThreadRecord {
  authorId: null | number;
  projectId: number;
  pullRequestId: number;
  state: PullRequestReviewThreadState;
  threadId: number;
}

export interface PullRequestReviewCommentRecord {
  authorId: null | number;
  commentId: number;
  projectId: number;
  pullRequestId: number;
  threadAuthorId: null | number;
  threadId: number;
}

export async function readPullRequestRecordByProjectAndNumber(
  projectId: number,
  pullRequestNumber: number,
  db: DatabaseType = getDb(),
): Promise<PullRequestRecord | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      fromBranch: schema.pullRequest.fromBranch,
      fromProjectId: schema.pullRequest.fromProjectId,
      id: schema.pullRequest.id,
      isConflict: schema.pullRequest.isConflict,
      isMerging: schema.pullRequest.isMerging,
      mergedCommitIdFrom: schema.pullRequest.mergedCommitIdFrom,
      mergedCommitIdTo: schema.pullRequest.mergedCommitIdTo,
      pullRequestNumber: schema.pullRequest.number,
      state: schema.pullRequest.state,
      toBranch: schema.pullRequest.toBranch,
      toProjectId: schema.pullRequest.toProjectId,
    })
    .from(schema.pullRequest)
    .where(
      and(
        eq(schema.pullRequest.toProjectId, projectId),
        eq(schema.pullRequest.number, pullRequestNumber),
      ),
    )
    .limit(1);

  const id = parsePositiveIntId(row?.id ?? 0);
  const fromProjectId = parsePositiveIntId(row?.fromProjectId ?? 0);
  const toProjectId = parsePositiveIntId(row?.toProjectId ?? 0);
  const number = parsePositiveIntId(row?.pullRequestNumber ?? 0);
  const fromBranch = normalizeNullableText(row?.fromBranch ?? null);
  const toBranch = normalizeNullableText(row?.toBranch ?? null);
  if (
    !row ||
    id === null ||
    fromProjectId === null ||
    toProjectId === null ||
    number === null ||
    !fromBranch ||
    !toBranch
  ) {
    return null;
  }

  return {
    fromBranch,
    fromProjectId,
    id,
    isConflict: Boolean(row.isConflict),
    isMerging: Boolean(row.isMerging),
    mergedCommitIdFrom: normalizeNullableText(row.mergedCommitIdFrom),
    mergedCommitIdTo: normalizeNullableText(row.mergedCommitIdTo),
    pullRequestNumber: number,
    state: pullRequestStateFromRaw(row.state ?? null),
    toBranch,
    toProjectId,
  } satisfies PullRequestRecord;
}

export async function readPullRequestReviewThread(
  input: {
    projectId: number;
    pullRequestId: number;
    threadId: number;
  },
  db: DatabaseType = getDb(),
): Promise<null | PullRequestReviewThreadRecord> {
  const parsedThreadId = parsePositiveIntId(input.threadId);
  if (parsedThreadId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      authorId: schema.commentThread.authorId,
      projectId: schema.commentThread.projectId,
      pullRequestId: schema.commentThread.pullRequestId,
      state: schema.commentThread.state,
      threadId: schema.commentThread.id,
    })
    .from(schema.commentThread)
    .where(
      and(
        eq(schema.commentThread.id, parsedThreadId),
        eq(schema.commentThread.projectId, input.projectId),
        eq(schema.commentThread.pullRequestId, input.pullRequestId),
      ),
    )
    .limit(1);

  const projectId = parsePositiveIntId(row?.projectId ?? 0);
  const pullRequestId = parsePositiveIntId(row?.pullRequestId ?? 0);
  const state = normalizeThreadState(row?.state ?? null);
  if (!row || projectId === null || pullRequestId === null || state === null) {
    return null;
  }

  return {
    authorId: typeof row.authorId === "number" ? row.authorId : null,
    projectId,
    pullRequestId,
    state,
    threadId: parsedThreadId,
  };
}

export async function readPullRequestReviewComment(
  input: {
    commentId: number;
    projectId: number;
    pullRequestId: number;
  },
  db: DatabaseType = getDb(),
): Promise<null | PullRequestReviewCommentRecord> {
  const parsedCommentId = parsePositiveIntId(input.commentId);
  if (parsedCommentId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      authorId: schema.reviewComment.authorId,
      commentId: schema.reviewComment.id,
      projectId: schema.commentThread.projectId,
      pullRequestId: schema.commentThread.pullRequestId,
      threadAuthorId: schema.commentThread.authorId,
      threadId: schema.commentThread.id,
    })
    .from(schema.reviewComment)
    .innerJoin(schema.commentThread, eq(schema.reviewComment.threadId, schema.commentThread.id))
    .where(
      and(
        eq(schema.reviewComment.id, parsedCommentId),
        eq(schema.commentThread.projectId, input.projectId),
        eq(schema.commentThread.pullRequestId, input.pullRequestId),
      ),
    )
    .limit(1);

  const projectId = parsePositiveIntId(row?.projectId ?? 0);
  const pullRequestId = parsePositiveIntId(row?.pullRequestId ?? 0);
  const threadId = parsePositiveIntId(row?.threadId ?? 0);
  if (
    !row ||
    projectId === null ||
    pullRequestId === null ||
    threadId === null ||
    !Number.isInteger(row.commentId) ||
    row.commentId <= 0
  ) {
    return null;
  }

  return {
    authorId: typeof row.authorId === "number" ? row.authorId : null,
    commentId: row.commentId,
    projectId,
    pullRequestId,
    threadAuthorId: typeof row.threadAuthorId === "number" ? row.threadAuthorId : null,
    threadId,
  };
}

export async function createPullRequestReviewComment(
  input: {
    authorId: number;
    authorLoginId: string;
    authorName: string;
    commitId?: string;
    contents: string;
    path?: string;
    projectId: number;
    pullRequestId: number;
    range?: {
      endColumn: number;
      endLine: number;
      endSide: "A" | "B";
      path: string;
      startColumn: number;
      startLine: number;
      startSide: "A" | "B";
    };
    threadId?: number;
  },
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewThread> {
  const schema = getDbSchema(db);
  const now = new Date();
  let threadId = input.threadId ?? null;

  if (threadId !== null) {
    const existingThread = await readPullRequestReviewThread(
      {
        projectId: input.projectId,
        pullRequestId: input.pullRequestId,
        threadId,
      },
      db,
    );
    if (!existingThread) {
      throw new Error("Pull request review thread not found.");
    }
  } else {
    const [insertedThread] = await (db as any)
      .insert(schema.commentThread)
      .values({
        authorId: input.authorId,
        authorLoginId: input.authorLoginId,
        authorName: input.authorName,
        commitId: toNullableDbString(input.commitId),
        createdDate: now,
        dtype: input.range ? "CodeCommentThread" : "NonRangedCodeCommentThread",
        endColumn: input.range?.endColumn ?? null,
        endLine: input.range?.endLine ?? null,
        endSide: toNullableDbString(input.range?.endSide),
        path: toNullableDbString(input.range?.path ?? input.path),
        projectId: input.projectId,
        pullRequestId: input.pullRequestId,
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
      throw new Error("Failed to create pull request review thread.");
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

  const [thread] = await listPullRequestReviewThreadsByPullRequest(
    {
      projectId: input.projectId,
      projectName,
      pullRequestId: input.pullRequestId,
    },
    db,
  ).then((threads) =>
    threads.filter((candidateThread) => candidateThread.threadId === String(threadId)),
  );

  if (!thread) {
    throw new Error("Failed to read pull request review thread.");
  }

  return thread;
}

export async function updatePullRequestReviewThreadState(
  input: {
    projectId: number;
    projectName: string;
    pullRequestId: number;
    state: PullRequestReviewThreadState;
    threadId: number;
  },
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewThread> {
  const parsedThreadId = parsePositiveIntId(input.threadId);
  if (parsedThreadId === null) {
    throw new Error("Invalid pull request review thread id.");
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
        eq(schema.commentThread.pullRequestId, input.pullRequestId),
      ),
    );

  const [thread] = await listPullRequestReviewThreadsByPullRequest(
    {
      projectId: input.projectId,
      projectName: input.projectName,
      pullRequestId: input.pullRequestId,
    },
    db,
  ).then((threads) =>
    threads.filter((candidateThread) => candidateThread.threadId === String(parsedThreadId)),
  );

  if (!thread) {
    throw new Error("Pull request review thread not found.");
  }

  return thread;
}

export async function deletePullRequestReviewComment(
  input: {
    commentId: number;
    projectId: number;
    pullRequestId: number;
  },
  db: DatabaseType = getDb(),
): Promise<PullRequestReviewCommentDeleteOutput> {
  const comment = await readPullRequestReviewComment(input, db);
  if (!comment) {
    throw new Error("Pull request review comment not found.");
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

export async function updatePullRequestMergeStateByProjectAndNumber(
  input: {
    mergedCommitIdFrom: string;
    mergedCommitIdTo: string;
    projectId: number;
    pullRequestNumber: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.pullRequest)
    .set({
      isConflict: false,
      isMerging: false,
      mergedCommitIdFrom: input.mergedCommitIdFrom,
      mergedCommitIdTo: input.mergedCommitIdTo,
      state: pullRequestStateToRaw("merged"),
      updated: new Date(),
    })
    .where(
      and(
        eq(schema.pullRequest.toProjectId, input.projectId),
        eq(schema.pullRequest.number, input.pullRequestNumber),
      ),
    );
}
