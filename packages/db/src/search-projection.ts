export const SEARCH_DOCUMENT_TYPES = [
  "user",
  "project",
  "issue",
  "posting",
  "review_comment",
] as const;

export type SearchDocumentType = (typeof SEARCH_DOCUMENT_TYPES)[number];

export const SEARCH_DOCUMENT_SCOPE_KINDS = ["global", "organization", "project"] as const;

export type SearchDocumentScopeKind = (typeof SEARCH_DOCUMENT_SCOPE_KINDS)[number];

export const SEARCH_DOCUMENT_ACCESS_SCOPES = [
  "public",
  "organization_member",
  "project_member",
  "private_actor",
] as const;

export type SearchDocumentAccessScope = (typeof SEARCH_DOCUMENT_ACCESS_SCOPES)[number];

export const SEARCH_DOCUMENT_TABLE = "search_document";
export const SQLITE_SEARCH_DOCUMENT_FTS_TABLE = "search_document_fts";
export const SQLITE_SEARCH_DOCUMENT_SYNC_MODE = "external-content";
export const SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE = "backfill-rebuild";
export const SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS = [
  "search_document_ad",
  "search_document_ai",
  "search_document_au",
] as const;

export const SEARCH_DOCUMENT_PERMISSION_COLUMNS = [
  "scope_kind",
  "access_scope",
  "organization_id",
  "project_id",
  "principal_user_id",
] as const;

export function isSearchDocumentType(value: string): value is SearchDocumentType {
  return (SEARCH_DOCUMENT_TYPES as readonly string[]).includes(value);
}
