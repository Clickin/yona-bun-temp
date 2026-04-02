import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { relations as mysqlRelations } from "@drizzle/mysql/relations";
import * as mysqlSchema from "@drizzle/mysql/schema";
import { relations as pgRelations } from "@drizzle/pg/relations";
import * as pgSchema from "@drizzle/pg/schema";
import { relations as sqliteRelations } from "@drizzle/sqlite/relations";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { drizzle } from "drizzle-orm/bun-sql";

const DIALECT_ENV = "YONA_DB_DIALECT";
const DATABASE_URL_ENV = "YONA_DB_URL";
const DEFAULT_DIALECT = "sqlite";
const DEFAULT_SQLITE_URL = "sqlite://./.yona-data/yona.db";

type Dialect = "postgres" | "mysql" | "sqlite";

let cachedDb: ReturnType<typeof createDatabase> | undefined;

function readEnv(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;

  if (processEnv && Object.prototype.hasOwnProperty.call(processEnv, name)) {
    return processEnv[name];
  }

  return (globalThis as { Bun?: { env?: Record<string, string | undefined> } }).Bun?.env?.[name];
}

function requireDialect(): Dialect {
  const value = readEnv(DIALECT_ENV);

  if (!value) {
    return DEFAULT_DIALECT;
  }

  if (value === "postgres" || value === "mysql" || value === "sqlite") {
    return value;
  }

  throw new Error(`Invalid ${DIALECT_ENV}: "${value}". Expected one of: postgres, mysql, sqlite.`);
}

function requireConnectionUrl(dialect: Dialect): string {
  const value = readEnv(DATABASE_URL_ENV);

  if (value) {
    return value;
  }

  if (dialect === "sqlite") {
    return DEFAULT_SQLITE_URL;
  }

  throw new Error(`${DATABASE_URL_ENV} is required when ${DIALECT_ENV} is "${dialect}".`);
}

function validateConnectionUrl(dialect: Dialect, url: string): void {
  if (dialect === "postgres") {
    if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
      return;
    }

    throw new Error(
      `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="postgres": "${url}". Expected postgres:// or postgresql://.`,
    );
  }

  if (dialect === "mysql") {
    if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
      return;
    }

    throw new Error(
      `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="mysql": "${url}". Expected mysql:// or mysql2://.`,
    );
  }

  if (
    url === ":memory:" ||
    url.startsWith("sqlite://") ||
    url.startsWith("sqlite:") ||
    url.startsWith("file://") ||
    url.startsWith("file:")
  ) {
    return;
  }

  throw new Error(
    `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="sqlite": "${url}". Expected :memory:, sqlite://, sqlite:, file://, or file:.`,
  );
}

function ensureSqliteDirectory(url: string): void {
  if (url === ":memory:") {
    return;
  }

  const rawPath = url.startsWith("sqlite://")
    ? url.slice("sqlite://".length)
    : url.startsWith("sqlite:")
      ? url.slice("sqlite:".length)
      : url.startsWith("file://")
        ? url.slice("file://".length)
        : url.startsWith("file:")
          ? url.slice("file:".length)
          : null;

  if (!rawPath || rawPath === ":memory:") {
    return;
  }

  mkdirSync(dirname(resolve(rawPath)), { recursive: true });
}

function createDatabase(dialect: Dialect, connectionUrl: string) {
  if (dialect === "postgres") {
    const db = (drizzle as any).postgres(connectionUrl, {
      relations: pgRelations,
      schema: pgSchema,
    });
    return Object.assign(db, { dbType: "postgres" as const });
  }

  if (dialect === "mysql") {
    const db = (drizzle as any).mysql(connectionUrl, {
      relations: mysqlRelations,
      schema: mysqlSchema,
      mode: "default",
    });
    return Object.assign(db, { dbType: "mysql" as const });
  }

  const db = (drizzle as any).sqlite(connectionUrl, {
    relations: sqliteRelations,
    schema: sqliteSchema,
  });
  return Object.assign(db, { dbType: "sqlite" as const });
}

export function getDb() {
  if (!cachedDb) {
    const dialect = requireDialect();
    const connectionUrl = requireConnectionUrl(dialect);
    validateConnectionUrl(dialect, connectionUrl);
    if (dialect === "sqlite") {
      ensureSqliteDirectory(connectionUrl);
    }
    cachedDb = createDatabase(dialect, connectionUrl);
  }

  return cachedDb;
}

export type DatabaseType = ReturnType<typeof getDb>;

export function __resetDbForTests(): void {
  cachedDb = undefined;
}

export {
  assignIssueRecord,
  readUserRecordByLoginId,
  unassignIssueRecord,
  assignIssueByProjectAndNumber,
  createIssueCommentRecord,
  createIssueRecord,
  listIssuesByProject,
  readIssueByProjectAndNumber,
  readIssueIdByProjectAndNumber,
  unassignIssueByProjectAndNumber,
  unvoteIssueByProjectAndNumber,
  unvoteIssueRecord,
  updateIssueStateByProjectAndNumber,
  unwatchIssueByProjectAndNumber,
  unwatchIssueRecord,
  voteIssueByProjectAndNumber,
  voteIssueRecord,
  watchIssueByProjectAndNumber,
  watchIssueRecord,
} from "./issues";
export {
  createPostingCommentRecord,
  createPostingRecord,
  listPostingsByProject,
  readPostingByProjectAndNumber,
  readPostingIdByProjectAndNumber,
} from "./postings";
export {
  createPullRequestRecord,
  listPullRequestReviewThreadsByProject,
  listPullRequestsByProject,
  readPullRequestByProjectAndNumber,
  readPullRequestReviewCountsByProject,
  updatePullRequestStateByProjectAndNumber,
} from "./pull-requests";
export {
  createIssueLabelRecord,
  createLabelCategoryRecord,
  createMilestoneRecord,
  deleteIssueLabelRecord,
  deleteLabelCategoryRecord,
  deleteMilestoneRecord,
  listIssueLabelsByProject,
  listLabelCategoriesByProject,
  listMilestonesByProject,
  readIssueLabelByProjectAndId,
  readLabelCategoryByProjectAndId,
  readMilestoneByProjectAndId,
  updateIssueLabelRecord,
  updateLabelCategoryRecord,
  updateMilestoneRecord,
} from "./labels-milestones";
export {
  createPasswordAuthUser,
  ensureAuthUserCredentialId,
  findAuthUserByApiToken,
  findAuthUserByCredentialId,
  findAuthUserById,
  findAuthUserByIdentifier,
  readUserApiToken,
  updateAuthUserPassword,
  updateAuthUserProfile,
  updateUserApiToken,
  type DbAuthUserRecord,
} from "./auth-users";
export {
  loadAttachmentAssetRecord,
  loadAttachmentProjectMembershipFacts,
  type AttachmentAssetRecord,
  type AttachmentBindingRecord,
  type AttachmentGlobalBindingRecord,
  type AttachmentProjectBindingRecord,
  type AttachmentProjectMembershipFactsRecord,
  type AttachmentProjectMembershipTarget,
  type AttachmentTemporaryBindingRecord,
} from "./attachment-assets";
export {
  createRepositoryCommitDiscussionComment,
  deleteRepositoryCommitDiscussionComment,
  listRepositoryCommitDiscussionThreads,
  readRepositoryCommitDiscussionComment,
  readRepositoryCommitDiscussionThread,
  updateRepositoryCommitDiscussionThreadState,
  type RepositoryCommitDiscussionCommentRecord,
  type RepositoryCommitDiscussionThreadRecord,
} from "./repository-discussion";
export { loadRepositoryAccessFacts, type RepositoryAccessFactsRecord } from "./repository-access";
export {
  listFavoriteProjectsForUser,
  listNotificationsForUser,
  listRecentProjectsForUser,
  readDefaultLandingPathForUser,
  readUserPublicProfileByLoginId,
  setDefaultLandingPathForUser,
  setProjectNotificationAllowed,
  toggleFavoriteProjectForUser,
  trackRecentProjectVisitForUser,
} from "./personal-workspace";
export {
  canManageProjectUploadTarget,
  createTemporaryUploadRecord,
  finalizeTemporaryUploadRecord,
  readTemporaryUploadRecord,
  resolveUploadBindingProjectId,
  type TemporaryUploadRecord,
} from "./upload-session";
export { searchDocuments, type SearchActorContext } from "./search";
export {
  SEARCH_DOCUMENT_ACCESS_SCOPES,
  SEARCH_DOCUMENT_PERMISSION_COLUMNS,
  SEARCH_DOCUMENT_SCOPE_KINDS,
  SEARCH_DOCUMENT_TABLE,
  SEARCH_DOCUMENT_TYPES,
  SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE,
  SQLITE_SEARCH_DOCUMENT_FTS_TABLE,
  SQLITE_SEARCH_DOCUMENT_SYNC_MODE,
  SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS,
  isSearchDocumentType,
  type SearchDocumentAccessScope,
  type SearchDocumentScopeKind,
  type SearchDocumentType,
} from "./search-projection";
export {
  createEnrollmentRequest,
  createOrganizationEnrollmentRequest,
  createOrganizationRecord,
  createProjectRecord,
  deleteEnrollmentRequest,
  deleteOrganizationEnrollmentRequest,
  grantOrganizationAdmin,
  grantProjectManager,
  organizationNameExists,
  projectIdentifierExists,
  readEnrollmentRequest,
  readOrganizationAuthorization,
  readOrganizationByName,
  readOrganizationEnrollmentRequest,
  readOrganizationMembers,
  readProjectAuthorization,
  readProjectByOwnerAndName,
  readProjectMembers,
  updateOrganizationRecord,
  updateProjectRecord,
  userLoginIdExists,
  type EnrollmentRequestRecord,
  type OrganizationAuthorizationRecord,
  type OrganizationEnrollmentRequestRecord,
  type OrganizationEnrollmentRequestSummaryRecord,
  type OrganizationMemberDirectoryRecord,
  type OrganizationMemberRecord,
  type OrganizationRecord,
  type ProjectAuthorizationRecord,
  type ProjectEnrollmentRequestSummaryRecord,
  type ProjectMemberDirectoryRecord,
  type ProjectMemberRecord,
  type ProjectRecord,
} from "./org-project";
export { getDbSchema, type RuntimeDbSchema } from "./runtime-schema";
