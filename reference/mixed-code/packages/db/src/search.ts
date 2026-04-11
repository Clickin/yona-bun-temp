import { and, asc, desc, eq, exists, inArray, or, sql } from "drizzle-orm";
import type { SearchInput, SearchPage, SearchResult } from "../../contracts/src/search";
import { makeSearchSnippets } from "../../contracts/src/search";
import { getDb, type DatabaseType } from "./index";
import { readOrganizationByName, readProjectByOwnerAndName } from "./org-project";
import { SQLITE_SEARCH_DOCUMENT_FTS_TABLE } from "./search-projection";
import { getDbSchema } from "./runtime-schema";

const ORG_MEMBER_ROLE_IDS = [6, 7] as const;
const PROJECT_MEMBER_ROLE_IDS = [1, 2] as const;
const DEFAULT_SNIPPET_RADIUS = 40;

function quoteIdentifier(dbType: DatabaseType["dbType"], identifier: string): string {
  if (dbType === "mysql") {
    return `\`${identifier}\``;
  }

  return `"${identifier}"`;
}

function qualifyIdentifier(
  dbType: DatabaseType["dbType"],
  tableName: string,
  columnName: string,
): string {
  return `${quoteIdentifier(dbType, tableName)}.${quoteIdentifier(dbType, columnName)}`;
}

export interface SearchActorContext {
  actorId: null | number;
  isSiteAdmin: boolean;
}

interface SearchRow {
  documentBody: null | string;
  documentId: number;
  documentText: string;
  documentTitle: null | string;
  documentType: string;
  issueNumber: null | number;
  issueOwnerName: null | string;
  issueProjectName: null | string;
  issueTitle: null | string;
  postingNumber: null | number;
  postingOwnerName: null | string;
  postingProjectName: null | string;
  postingTitle: null | string;
  projectName: null | string;
  projectOwnerName: null | string;
  rank: number;
  reviewCommentId: null | number;
  reviewOwnerName: null | string;
  reviewProjectName: null | string;
  searchId: number;
  userLabel: null | string;
  userLoginId: null | string;
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toUpperCase() === "NULL") {
    return null;
  }

  return trimmed;
}

function parseCursor(cursor: null | string | undefined): number {
  if (!cursor) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function createEmptySearchPage(pageSize: number): SearchPage {
  return {
    counts: {
      returned: 0,
      total: 0,
    },
    items: [],
    nextCursor: null,
    pageSize,
  };
}

function buildSnippetCandidates(row: SearchRow): string[] {
  const candidates: string[] = [];
  const values = [row.documentBody, row.documentTitle, row.documentText];

  for (const value of values) {
    const normalizedValue = normalizeNullableText(value);
    if (normalizedValue) {
      candidates.push(normalizedValue);
    }
  }

  return candidates;
}

function createSnippets(row: SearchRow, query: string): string[] {
  const snippets: string[] = [];
  const candidates = buildSnippetCandidates(row);

  for (const candidate of candidates) {
    const candidateSnippets = makeSearchSnippets(candidate, query, DEFAULT_SNIPPET_RADIUS);
    for (const snippet of candidateSnippets) {
      snippets.push(snippet);
    }
    if (snippets.length > 0) {
      break;
    }
  }

  return snippets;
}

function createResultFromRow(row: SearchRow, input: SearchInput): null | SearchResult {
  if (row.documentType === "user") {
    const loginId = normalizeNullableText(row.userLoginId);
    if (!loginId) {
      return null;
    }

    return {
      loginId,
      scope: input.scope,
      snippets: createSnippets(row, input.query),
      type: "user",
      userLabel: normalizeNullableText(row.userLabel) ?? loginId,
    };
  }

  if (row.documentType === "project") {
    const ownerName = normalizeNullableText(row.projectOwnerName);
    const projectName = normalizeNullableText(row.projectName);
    if (!ownerName || !projectName) {
      return null;
    }

    return {
      ownerName,
      projectName,
      scope: input.scope,
      snippets: createSnippets(row, input.query),
      type: "project",
    };
  }

  if (row.documentType === "issue") {
    const ownerName = normalizeNullableText(row.issueOwnerName);
    const projectName = normalizeNullableText(row.issueProjectName);
    const title = normalizeNullableText(row.issueTitle);
    if (!ownerName || !projectName || !title || !row.issueNumber || row.issueNumber <= 0) {
      return null;
    }

    return {
      issueNumber: row.issueNumber,
      ownerName,
      projectName,
      scope: input.scope,
      snippets: createSnippets(row, input.query),
      title,
      type: "issue",
    };
  }

  if (row.documentType === "posting") {
    const ownerName = normalizeNullableText(row.postingOwnerName);
    const projectName = normalizeNullableText(row.postingProjectName);
    const title = normalizeNullableText(row.postingTitle);
    if (!ownerName || !projectName || !title || !row.postingNumber || row.postingNumber <= 0) {
      return null;
    }

    return {
      ownerName,
      postingNumber: row.postingNumber,
      projectName,
      scope: input.scope,
      snippets: createSnippets(row, input.query),
      title,
      type: "posting",
    };
  }

  if (row.documentType === "review_comment") {
    const ownerName = normalizeNullableText(row.reviewOwnerName);
    const projectName = normalizeNullableText(row.reviewProjectName);
    if (!ownerName || !projectName || !row.reviewCommentId || row.reviewCommentId <= 0) {
      return null;
    }

    return {
      ownerName,
      projectName,
      reviewCommentId: row.reviewCommentId,
      scope: input.scope,
      snippets: createSnippets(row, input.query),
      type: "review_comment",
    };
  }

  return null;
}

function createSearchMatchPredicate(
  db: DatabaseType,
  searchDocument: ReturnType<typeof getDbSchema>["searchDocument"],
  query: string,
) {
  if (db.dbType === "postgres") {
    const postgresSearchDocument =
      searchDocument as (typeof import("@drizzle/pg/schema"))["searchDocument"];

    return sql<boolean>`
      ${postgresSearchDocument.searchVector} @@ plainto_tsquery('simple', ${query})
    `;
  }

  if (db.dbType === "mysql") {
    return sql<boolean>`
      MATCH (${searchDocument.title}, ${searchDocument.body}, ${searchDocument.path}, ${searchDocument.documentText})
      AGAINST (${query} IN NATURAL LANGUAGE MODE) > 0
    `;
  }

  const sqliteFtsTable = quoteIdentifier(db.dbType, SQLITE_SEARCH_DOCUMENT_FTS_TABLE);

  return sql<boolean>`
    EXISTS (
      SELECT 1
      FROM ${sql.raw(sqliteFtsTable)}
      WHERE rowid = ${searchDocument.id}
        AND ${sql.raw(sqliteFtsTable)} MATCH ${query}
    )
  `;
}

function createRankExpression(
  db: DatabaseType,
  searchDocument: ReturnType<typeof getDbSchema>["searchDocument"],
  query: string,
) {
  if (db.dbType === "postgres") {
    const postgresSearchDocument =
      searchDocument as (typeof import("@drizzle/pg/schema"))["searchDocument"];

    return sql<number>`
      ts_rank(${postgresSearchDocument.searchVector}, plainto_tsquery('simple', ${query}))
    `;
  }

  if (db.dbType === "mysql") {
    return sql<number>`
      MATCH (${searchDocument.title}, ${searchDocument.body}, ${searchDocument.path}, ${searchDocument.documentText})
      AGAINST (${query} IN NATURAL LANGUAGE MODE)
    `;
  }

  const sqliteFtsTable = quoteIdentifier(db.dbType, SQLITE_SEARCH_DOCUMENT_FTS_TABLE);

  return sql<number>`
    (
      SELECT bm25(${sql.raw(sqliteFtsTable)})
      FROM ${sql.raw(sqliteFtsTable)}
      WHERE rowid = ${searchDocument.id}
        AND ${sql.raw(sqliteFtsTable)} MATCH ${query}
    )
  `;
}

function createPermissionPredicate(
  actor: SearchActorContext,
  db: DatabaseType,
  searchDocument: ReturnType<typeof getDbSchema>["searchDocument"],
) {
  if (actor.isSiteAdmin) {
    return sql<boolean>`1 = 1`;
  }

  const publicPredicate = eq(searchDocument.accessScope, "public");
  if (actor.actorId === null) {
    return publicPredicate;
  }

  const schema = getDbSchema(db);
  const organizationMembershipPredicate = exists(
    (db as any)
      .select({ value: sql<number>`1` })
      .from(schema.organizationUser)
      .where(
        and(
          eq(schema.organizationUser.organizationId, searchDocument.organizationId),
          eq(schema.organizationUser.userId, actor.actorId),
          inArray(schema.organizationUser.roleId, [...ORG_MEMBER_ROLE_IDS]),
        ),
      ),
  );
  const projectMembershipPredicate = exists(
    (db as any)
      .select({ value: sql<number>`1` })
      .from(schema.projectUser)
      .where(
        and(
          eq(schema.projectUser.projectId, searchDocument.projectId),
          eq(schema.projectUser.userId, actor.actorId),
          inArray(schema.projectUser.roleId, [...PROJECT_MEMBER_ROLE_IDS]),
        ),
      ),
  );

  return or(
    publicPredicate,
    and(eq(searchDocument.accessScope, "organization_member"), organizationMembershipPredicate),
    and(eq(searchDocument.accessScope, "project_member"), projectMembershipPredicate),
    and(
      eq(searchDocument.accessScope, "private_actor"),
      eq(searchDocument.principalUserId, actor.actorId),
    ),
  );
}

async function createScopePredicate(
  input: SearchInput,
  db: DatabaseType,
  searchDocument: ReturnType<typeof getDbSchema>["searchDocument"],
) {
  if (input.scope === "global") {
    return sql<boolean>`1 = 1`;
  }

  if (input.scope === "organization") {
    const organization = await readOrganizationByName(input.organizationName, db);
    if (!organization) {
      return null;
    }

    return eq(searchDocument.organizationId, organization.id);
  }

  const project = await readProjectByOwnerAndName(input.ownerName, input.projectName, db);
  if (!project) {
    return null;
  }

  return eq(searchDocument.projectId, project.id);
}

function createTypePredicate(
  input: SearchInput,
  searchDocument: ReturnType<typeof getDbSchema>["searchDocument"],
) {
  if (!input.types || input.types.length === 0) {
    return sql<boolean>`1 = 1`;
  }

  return inArray(searchDocument.documentType, input.types);
}

export async function searchDocuments(
  input: SearchInput,
  actor: SearchActorContext,
  db: DatabaseType = getDb(),
): Promise<SearchPage> {
  const schema = getDbSchema(db);
  const dbType = db.dbType;
  const searchDocument = schema.searchDocument;
  const normalizedQuery = input.query.trim();
  const cursor = parseCursor(input.cursor);
  const pageSize = input.pageSize;
  const scopePredicate = await createScopePredicate(input, db, searchDocument);

  if (!scopePredicate) {
    return createEmptySearchPage(pageSize);
  }

  const predicate = and(
    scopePredicate,
    createPermissionPredicate(actor, db, searchDocument),
    createTypePredicate(input, searchDocument),
    createSearchMatchPredicate(db, searchDocument, normalizedQuery),
  );
  const rankExpression = createRankExpression(db, searchDocument, normalizedQuery);

  const searchDocumentDocumentId = qualifyIdentifier(dbType, "search_document", "document_id");
  const projectTable = quoteIdentifier(dbType, "project");
  const issueTable = quoteIdentifier(dbType, "issue");
  const postingTable = quoteIdentifier(dbType, "posting");
  const reviewCommentTable = quoteIdentifier(dbType, "review_comment");
  const commentThreadTable = quoteIdentifier(dbType, "comment_thread");
  const userTable = quoteIdentifier(dbType, "n4user");

  const userLoginIdExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'user' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "n4user", "login_id")} FROM ${userTable} WHERE ${qualifyIdentifier(dbType, "n4user", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const userLabelExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'user' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "n4user", "name")} FROM ${userTable} WHERE ${qualifyIdentifier(dbType, "n4user", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const projectOwnerNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'project' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "owner")} FROM ${projectTable} WHERE ${qualifyIdentifier(dbType, "project", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const projectNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'project' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "name")} FROM ${projectTable} WHERE ${qualifyIdentifier(dbType, "project", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const issueOwnerNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'issue' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "owner")} FROM ${issueTable} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "issue", "project_id")} WHERE ${qualifyIdentifier(dbType, "issue", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const issueProjectNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'issue' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "name")} FROM ${issueTable} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "issue", "project_id")} WHERE ${qualifyIdentifier(dbType, "issue", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const issueNumberExpression = sql<null | number>`CASE
    WHEN ${searchDocument.documentType} = 'issue' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "issue", "number")} FROM ${issueTable} WHERE ${qualifyIdentifier(dbType, "issue", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const issueTitleExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'issue' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "issue", "title")} FROM ${issueTable} WHERE ${qualifyIdentifier(dbType, "issue", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const postingOwnerNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'posting' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "owner")} FROM ${postingTable} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "posting", "project_id")} WHERE ${qualifyIdentifier(dbType, "posting", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const postingProjectNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'posting' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "name")} FROM ${postingTable} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "posting", "project_id")} WHERE ${qualifyIdentifier(dbType, "posting", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const postingNumberExpression = sql<null | number>`CASE
    WHEN ${searchDocument.documentType} = 'posting' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "posting", "number")} FROM ${postingTable} WHERE ${qualifyIdentifier(dbType, "posting", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const postingTitleExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'posting' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "posting", "title")} FROM ${postingTable} WHERE ${qualifyIdentifier(dbType, "posting", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const reviewOwnerNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'review_comment' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "owner")} FROM ${reviewCommentTable} INNER JOIN ${commentThreadTable} ON ${qualifyIdentifier(dbType, "comment_thread", "id")} = ${qualifyIdentifier(dbType, "review_comment", "thread_id")} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "comment_thread", "project_id")} WHERE ${qualifyIdentifier(dbType, "review_comment", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const reviewProjectNameExpression = sql<null | string>`CASE
    WHEN ${searchDocument.documentType} = 'review_comment' THEN (
      ${sql.raw(
        `SELECT ${qualifyIdentifier(dbType, "project", "name")} FROM ${reviewCommentTable} INNER JOIN ${commentThreadTable} ON ${qualifyIdentifier(dbType, "comment_thread", "id")} = ${qualifyIdentifier(dbType, "review_comment", "thread_id")} INNER JOIN ${projectTable} ON ${qualifyIdentifier(dbType, "project", "id")} = ${qualifyIdentifier(dbType, "comment_thread", "project_id")} WHERE ${qualifyIdentifier(dbType, "review_comment", "id")} = ${searchDocumentDocumentId}`,
      )}
    )
    ELSE NULL
  END`;
  const reviewCommentIdExpression = sql<null | number>`CASE
    WHEN ${searchDocument.documentType} = 'review_comment' THEN ${searchDocument.documentId}
    ELSE NULL
  END`;

  const [countRow] = await (db as any)
    .select({ total: sql<number>`count(*)` })
    .from(searchDocument)
    .where(predicate);
  const rows = (await (db as any)
    .select({
      documentBody: searchDocument.body,
      documentId: searchDocument.documentId,
      documentText: searchDocument.documentText,
      documentTitle: searchDocument.title,
      documentType: searchDocument.documentType,
      issueNumber: issueNumberExpression,
      issueOwnerName: issueOwnerNameExpression,
      issueProjectName: issueProjectNameExpression,
      issueTitle: issueTitleExpression,
      postingNumber: postingNumberExpression,
      postingOwnerName: postingOwnerNameExpression,
      postingProjectName: postingProjectNameExpression,
      postingTitle: postingTitleExpression,
      projectName: projectNameExpression,
      projectOwnerName: projectOwnerNameExpression,
      rank: rankExpression,
      reviewCommentId: reviewCommentIdExpression,
      reviewOwnerName: reviewOwnerNameExpression,
      reviewProjectName: reviewProjectNameExpression,
      searchId: searchDocument.id,
      userLabel: userLabelExpression,
      userLoginId: userLoginIdExpression,
    })
    .from(searchDocument)
    .where(predicate)
    .orderBy(
      dbType === "sqlite" ? asc(rankExpression) : desc(rankExpression),
      asc(searchDocument.id),
    )
    .limit(pageSize + 1)
    .offset(cursor)) as SearchRow[];

  const items: SearchResult[] = [];
  let nextCursor: null | string = null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (index >= pageSize) {
      nextCursor = String(cursor + pageSize);
      break;
    }

    const item = createResultFromRow(row, input);
    if (item) {
      items.push(item);
    }
  }

  return {
    counts: {
      returned: items.length,
      total: Number(countRow?.total ?? 0),
    },
    items,
    nextCursor,
    pageSize,
  };
}
