import { and, desc, eq, max } from "drizzle-orm";
import type { IssueComment, IssueDetail, IssueState, IssueSummary } from "@yona/contracts";
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

function issueStateFromRaw(value: null | number): IssueState {
  return value === 0 ? "open" : "closed";
}

function issueStateToRaw(value: IssueState): number {
  return value === "open" ? 0 : 1;
}

export async function listIssuesByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<IssueSummary[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      authorLoginId: schema.issue.authorLoginId,
      authorName: schema.issue.authorName,
      createdAt: schema.issue.createdDate,
      issueNumber: schema.issue.number,
      state: schema.issue.state,
      title: schema.issue.title,
    })
    .from(schema.issue)
    .where(eq(schema.issue.projectId, projectId))
    .orderBy(desc(schema.issue.number));

  return rows
    .map((row: any) => {
      const title = normalizeNullableText(row.title);
      const authorLoginId = normalizeNullableText(row.authorLoginId);
      const authorName = normalizeNullableText(row.authorName);
      if (
        !title ||
        !authorLoginId ||
        !authorName ||
        !Number.isInteger(row.issueNumber) ||
        row.issueNumber <= 0
      ) {
        return null;
      }

      return {
        authorLoginId,
        authorName,
        createdAt: normalizeNullableDate(row.createdAt),
        issueNumber: row.issueNumber,
        ownerName,
        projectName,
        state: issueStateFromRaw(row.state ?? null),
        title,
      } satisfies IssueSummary;
    })
    .filter((row: IssueSummary | null): row is IssueSummary => row !== null);
}

export async function readIssueByProjectAndNumber(
  projectId: number,
  issueNumber: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<IssueDetail | null> {
  const schema = getDbSchema(db);
  const [issueRow] = await (db as any)
    .select({
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
    .where(and(eq(schema.issue.projectId, projectId), eq(schema.issue.number, issueNumber)))
    .limit(1);

  if (!issueRow) {
    return null;
  }

  const comments = await (db as any)
    .select({
      authorLoginId: schema.issueComment.authorLoginId,
      authorName: schema.issueComment.authorName,
      commentId: schema.issueComment.id,
      contents: schema.issueComment.contents,
      createdAt: schema.issueComment.createdDate,
    })
    .from(schema.issueComment)
    .where(eq(schema.issueComment.issueId, issueRow.issueId))
    .orderBy(schema.issueComment.id);

  const title = normalizeNullableText(issueRow.title);
  const authorLoginId = normalizeNullableText(issueRow.authorLoginId);
  const authorName = normalizeNullableText(issueRow.authorName);
  if (
    !title ||
    !authorLoginId ||
    !authorName ||
    !Number.isInteger(issueRow.issueNumber) ||
    issueRow.issueNumber <= 0
  ) {
    return null;
  }

  return {
    authorLoginId,
    authorName,
    body: normalizeNullableText(issueRow.body),
    comments: comments
      .map((row: any) => {
        const commentAuthorLoginId = normalizeNullableText(row.authorLoginId);
        const commentAuthorName = normalizeNullableText(row.authorName);
        if (
          !commentAuthorLoginId ||
          !commentAuthorName ||
          !Number.isInteger(row.commentId) ||
          row.commentId <= 0
        ) {
          return null;
        }

        return {
          authorLoginId: commentAuthorLoginId,
          authorName: commentAuthorName,
          commentId: row.commentId,
          contents: normalizeNullableText(row.contents) ?? "",
          createdAt: normalizeNullableDate(row.createdAt),
        } satisfies IssueComment;
      })
      .filter((row: IssueComment | null): row is IssueComment => row !== null),
    createdAt: normalizeNullableDate(issueRow.createdAt),
    issueNumber: issueRow.issueNumber,
    ownerName,
    projectName,
    state: issueStateFromRaw(issueRow.state ?? null),
    title,
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
    .select({
      maxIssueNumber: max(schema.issue.number),
    })
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
    .returning({
      issueNumber: schema.issue.number,
    });

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
    .select({
      issueId: schema.issue.id,
    })
    .from(schema.issue)
    .where(and(eq(schema.issue.projectId, projectId), eq(schema.issue.number, issueNumber)))
    .limit(1);

  return row?.issueId ?? null;
}

export async function updateIssueStateByProjectAndNumber(
  input: {
    issueNumber: number;
    projectId: number;
    state: IssueState;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.issue)
    .set({
      state: issueStateToRaw(input.state),
      updatedDate: new Date(),
    })
    .where(
      and(eq(schema.issue.projectId, input.projectId), eq(schema.issue.number, input.issueNumber)),
    );
}
