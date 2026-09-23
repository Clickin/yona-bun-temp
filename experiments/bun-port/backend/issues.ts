import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "@sqlbraid/core";
import { sql } from "@sqlbraid/sqlite";
import { database, initializeDatabase } from "./database";

export interface Issue {
  id: bigint;
  projectId: string;
  authorUserId: string;
  assigneeUserId: string | null;
  number: bigint;
  title: string;
  state: "open" | "closed";
  isDraft: boolean;
  body: string | null;
  createdAt: Date;
  createdAtPrecise: string;
  optionalSummary: undefined;
}

export interface IssueCommittedEvent {
  eventId: string;
  type: "issue.committed";
  issueId: string;
  projectId: string;
  committedAt: string;
}

interface IssueRow {
  id: string;
  project_id: string;
  author_user_id: string;
  assignee_user_id: string | null;
  number: number | bigint;
  title: string;
  state: "open" | "closed";
  is_draft: number | bigint;
  body: string | null;
  created_at: string;
  created_at_precise: string;
}

interface ProjectAccessRow {
  scope: "public" | "private";
  can_read: number | bigint | null;
  can_create: number | bigint | null;
  can_update: number | bigint | null;
}

interface ProjectNumberRow {
  last_issue_number: number | bigint;
}

export class IssueError extends Error {
  constructor(
    readonly code: "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

export async function listIssues(
  userId: string,
  projectId: string,
  state: "open" | "closed" | "all" = "open",
): Promise<Issue[]> {
  await initializeDatabase();
  const access = await projectAccess(database, userId, projectId);
  if (access.scope !== "public" && !access.can_read) {
    throw new IssueError("FORBIDDEN", "Project read is not allowed");
  }
  const rows = await database.all(sql.rows<IssueRow>`
    SELECT id, project_id, author_user_id, assignee_user_id, number, title, state, is_draft,
           body, created_at, created_at_precise
    FROM issue
    WHERE project_id = ${projectId}
      AND is_draft = 0
      AND (${state} = 'all' OR state = ${state})
    ORDER BY weight DESC, is_draft DESC, created_at DESC, number DESC
  `);
  return rows.map(toIssue);
}

export async function readIssue(userId: string, projectId: string, id: bigint): Promise<Issue> {
  await initializeDatabase();
  const access = await projectAccess(database, userId, projectId);
  if (access.scope !== "public" && !access.can_read) {
    throw new IssueError("FORBIDDEN", "Project read is not allowed");
  }
  const row = await database.maybeOne(sql.rows<IssueRow>`
    SELECT id, project_id, author_user_id, assignee_user_id, number, title, state, is_draft,
           body, created_at, created_at_precise
    FROM issue
    WHERE id = ${id.toString()} AND project_id = ${projectId}
  `);
  if (!row) throw new IssueError("NOT_FOUND", "Issue not found");
  return toIssue(row);
}

export async function createIssue(
  userId: string,
  projectId: string,
  title: string,
  body: string | null,
): Promise<Issue> {
  await initializeDatabase();
  return database.tx(async (tx) => {
    const access = await projectAccess(tx, userId, projectId);
    if (!(access.can_create || access.scope === "public")) {
      throw new IssueError("FORBIDDEN", "Issue creation is not allowed");
    }

    await tx.execute(sql.command`
      UPDATE project SET last_issue_number = last_issue_number + 1 WHERE id = ${projectId}
    `);
    const counter = await tx.maybeOne(sql.rows<ProjectNumberRow>`
      SELECT last_issue_number FROM project WHERE id = ${projectId}
    `);
    if (!counter) throw new IssueError("NOT_FOUND", "Project not found");

    const id = (1n << 60n) + randomBytes(8).readBigUInt64BE();
    const createdAt = new Date();
    const timestamp = createdAt.toISOString();
    const number = BigInt(counter.last_issue_number);
    const event: IssueCommittedEvent = {
      eventId: randomUUID(),
      type: "issue.committed",
      issueId: id.toString(),
      projectId,
      committedAt: timestamp,
    };
    await tx.execute(sql.command`
      INSERT INTO issue
        (id, project_id, author_user_id, assignee_user_id, number, title, state,
         is_draft, weight, body, created_at, created_at_precise)
      VALUES
        (${id.toString()}, ${projectId}, ${userId}, NULL, ${number}, ${title.trim()},
         'open', 0, 0, ${body}, ${timestamp}, ${timestamp})
    `);
    await tx.execute(sql.command`
      INSERT INTO issue_event_outbox
        (event_id, event_type, issue_id, project_id, payload_json, created_at)
      VALUES
        (${event.eventId}, ${event.type}, ${event.issueId}, ${event.projectId}, ${JSON.stringify(event)}, ${event.committedAt})
    `);

    return {
      id,
      projectId,
      authorUserId: userId,
      assigneeUserId: null,
      number,
      title: title.trim(),
      state: "open",
      isDraft: false,
      body,
      createdAt,
      createdAtPrecise: timestamp,
      optionalSummary: undefined,
    };
  });
}

export async function updateIssue(
  userId: string,
  projectId: string,
  id: bigint,
  patch: { title?: string; body?: string | null },
): Promise<Issue> {
  await initializeDatabase();
  return database.tx(async (tx) => {
    const current = await tx.maybeOne(sql.rows<IssueRow>`
      SELECT id, project_id, author_user_id, assignee_user_id, number, title, state,
             is_draft, body, created_at, created_at_precise
      FROM issue
      WHERE id = ${id.toString()} AND project_id = ${projectId}
    `);
    if (!current) throw new IssueError("NOT_FOUND", "Issue not found");

    const access = await projectAccess(tx, userId, projectId);
    if (
      !(
        access.can_update ||
        current.author_user_id === userId ||
        current.assignee_user_id === userId
      )
    ) {
      throw new IssueError("FORBIDDEN", "Issue update is not allowed");
    }
    const title = patch.title === undefined ? current.title : patch.title.trim();
    const body = patch.body === undefined ? current.body : patch.body;
    if (title === current.title && body === current.body) return toIssue(current);
    if (patch.title !== undefined && patch.body !== undefined) {
      await tx.execute(sql.command`
        UPDATE issue SET title = ${title}, body = ${body}
        WHERE id = ${id.toString()} AND project_id = ${projectId}
      `);
    } else if (patch.title !== undefined) {
      await tx.execute(sql.command`
        UPDATE issue SET title = ${title}
        WHERE id = ${id.toString()} AND project_id = ${projectId}
      `);
    } else if (patch.body !== undefined) {
      await tx.execute(sql.command`
        UPDATE issue SET body = ${body}
        WHERE id = ${id.toString()} AND project_id = ${projectId}
      `);
    }
    const event: IssueCommittedEvent = {
      eventId: randomUUID(),
      type: "issue.committed",
      issueId: current.id,
      projectId,
      committedAt: new Date().toISOString(),
    };
    await tx.execute(sql.command`
      INSERT INTO issue_event_outbox
        (event_id, event_type, issue_id, project_id, payload_json, created_at)
      VALUES
        (${event.eventId}, ${event.type}, ${event.issueId}, ${event.projectId}, ${JSON.stringify(event)}, ${event.committedAt})
    `);
    const updated = await tx.maybeOne(sql.rows<IssueRow>`
      SELECT id, project_id, author_user_id, assignee_user_id, number, title, state,
             is_draft, body, created_at, created_at_precise
      FROM issue
      WHERE id = ${id.toString()} AND project_id = ${projectId}
    `);
    if (!updated) throw new IssueError("NOT_FOUND", "Issue not found");
    return toIssue(updated);
  });
}

async function projectAccess(
  source: Database,
  userId: string,
  projectId: string,
): Promise<ProjectAccessRow> {
  const access = await source.maybeOne(sql.rows<ProjectAccessRow>`
    SELECT p.scope, m.can_read, m.can_create, m.can_update
    FROM project p
    LEFT JOIN project_member m ON m.project_id = p.id AND m.user_id = ${userId}
    WHERE p.id = ${projectId}
  `);
  if (!access) throw new IssueError("NOT_FOUND", "Project not found");
  return access;
}

function toIssue(row: IssueRow): Issue {
  return {
    id: BigInt(row.id),
    projectId: row.project_id,
    authorUserId: row.author_user_id,
    assigneeUserId: row.assignee_user_id,
    number: BigInt(row.number),
    title: row.title,
    state: row.state,
    isDraft: Boolean(row.is_draft),
    body: row.body,
    createdAt: new Date(row.created_at),
    createdAtPrecise: row.created_at_precise,
    optionalSummary: undefined,
  };
}
