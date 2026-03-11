import { and, desc, eq, max } from "drizzle-orm";
import type { PullRequestDetail, PullRequestState, PullRequestSummary } from "@yona/contracts";
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
