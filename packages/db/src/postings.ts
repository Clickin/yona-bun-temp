import { and, desc, eq, max } from "drizzle-orm";
import type { PostingComment, PostingDetail, PostingSummary } from "@yona/contracts";
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

export async function listPostingsByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<PostingSummary[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      authorLoginId: schema.posting.authorLoginId,
      authorName: schema.posting.authorName,
      createdAt: schema.posting.createdDate,
      postingNumber: schema.posting.number,
      title: schema.posting.title,
    })
    .from(schema.posting)
    .where(eq(schema.posting.projectId, projectId))
    .orderBy(desc(schema.posting.number));

  return rows
    .map((row: any) => {
      const title = normalizeNullableText(row.title);
      const authorLoginId = normalizeNullableText(row.authorLoginId);
      const authorName = normalizeNullableText(row.authorName);
      if (
        !title ||
        !authorLoginId ||
        !authorName ||
        !Number.isInteger(row.postingNumber) ||
        row.postingNumber <= 0
      ) {
        return null;
      }

      return {
        authorLoginId,
        authorName,
        createdAt: normalizeNullableDate(row.createdAt),
        ownerName,
        postingNumber: row.postingNumber,
        projectName,
        title,
      } satisfies PostingSummary;
    })
    .filter((row: PostingSummary | null): row is PostingSummary => row !== null);
}

export async function readPostingByProjectAndNumber(
  projectId: number,
  postingNumber: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<PostingDetail | null> {
  const schema = getDbSchema(db);
  const [postingRow] = await (db as any)
    .select({
      authorLoginId: schema.posting.authorLoginId,
      authorName: schema.posting.authorName,
      body: schema.posting.body,
      createdAt: schema.posting.createdDate,
      postingId: schema.posting.id,
      postingNumber: schema.posting.number,
      title: schema.posting.title,
    })
    .from(schema.posting)
    .where(and(eq(schema.posting.projectId, projectId), eq(schema.posting.number, postingNumber)))
    .limit(1);

  if (!postingRow) {
    return null;
  }

  const comments = await (db as any)
    .select({
      authorLoginId: schema.postingComment.authorLoginId,
      authorName: schema.postingComment.authorName,
      commentId: schema.postingComment.id,
      contents: schema.postingComment.contents,
      createdAt: schema.postingComment.createdDate,
    })
    .from(schema.postingComment)
    .where(eq(schema.postingComment.postingId, postingRow.postingId))
    .orderBy(schema.postingComment.id);

  const title = normalizeNullableText(postingRow.title);
  const authorLoginId = normalizeNullableText(postingRow.authorLoginId);
  const authorName = normalizeNullableText(postingRow.authorName);
  if (
    !title ||
    !authorLoginId ||
    !authorName ||
    !Number.isInteger(postingRow.postingNumber) ||
    postingRow.postingNumber <= 0
  ) {
    return null;
  }

  return {
    authorLoginId,
    authorName,
    body: normalizeNullableText(postingRow.body),
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
        } satisfies PostingComment;
      })
      .filter((row: PostingComment | null): row is PostingComment => row !== null),
    createdAt: normalizeNullableDate(postingRow.createdAt),
    ownerName,
    postingNumber: postingRow.postingNumber,
    projectName,
    title,
  } satisfies PostingDetail;
}

export async function createPostingRecord(
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
      maxPostingNumber: max(schema.posting.number),
    })
    .from(schema.posting)
    .where(eq(schema.posting.projectId, input.projectId));

  const nextPostingNumber = (nextNumberRow?.maxPostingNumber ?? 0) + 1;
  const [inserted] = await (db as any)
    .insert(schema.posting)
    .values({
      authorId: input.authorId,
      authorLoginId: input.authorLoginId,
      authorName: input.authorName,
      body: input.body,
      createdDate: now,
      number: nextPostingNumber,
      projectId: input.projectId,
      title: input.title,
      updatedDate: now,
    })
    .returning({
      postingNumber: schema.posting.number,
    });

  if (!inserted || !Number.isInteger(inserted.postingNumber) || inserted.postingNumber <= 0) {
    throw new Error("Failed to create posting record.");
  }

  return inserted.postingNumber;
}

export async function createPostingCommentRecord(
  input: {
    authorId: number;
    authorLoginId: string;
    authorName: string;
    contents: string;
    postingId: number;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any).insert(schema.postingComment).values({
    authorId: input.authorId,
    authorLoginId: input.authorLoginId,
    authorName: input.authorName,
    contents: input.contents,
    createdDate: new Date(),
    postingId: input.postingId,
    projectId: input.projectId,
  });
}

export async function readPostingIdByProjectAndNumber(
  projectId: number,
  postingNumber: number,
  db: DatabaseType = getDb(),
): Promise<number | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      postingId: schema.posting.id,
    })
    .from(schema.posting)
    .where(and(eq(schema.posting.projectId, projectId), eq(schema.posting.number, postingNumber)))
    .limit(1);

  return row?.postingId ?? null;
}
