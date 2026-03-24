import {
  authLoginIdSchema,
  boundedSearchScopeValues,
  boundedSearchTypeValues,
  issueNumberSchema,
  organizationNameSchema,
  postingNumberSchema,
  projectNameSchema,
  projectOwnerNameSchema,
  pullRequestNumberSchema,
} from "@yona/contracts";

export const DEFAULT_LANDING_FALLBACK_PATH = "/me";
const MAX_DEFAULT_LANDING_PATH_LENGTH = 255;
const DEFAULT_SEARCH_PAGE_SIZE = 20;
const RESERVED_ROOT_SEGMENTS = new Set([
  "api",
  "forgot-password",
  "login",
  "me",
  "organizations",
  "projects",
  "protected",
  "register",
  "reset-password",
  "search",
]);
const SEARCH_PARAM_KEYS = [
  "pageSize",
  "scope",
  "query",
  "cursor",
  "organizationName",
  "ownerName",
  "projectName",
  "types",
] as const;

function safeDecodeSegment(value: string): null | string {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isValidPositiveIntString(
  value: string,
  schema: { safeParse: (value: number) => { success: boolean } },
): boolean {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  const parsed = Number.parseInt(value, 10);
  return schema.safeParse(parsed).success;
}

function normalizeSearchPath(url: URL): null | string {
  const params = new URLSearchParams();
  const scopeRaw = url.searchParams.get("scope");
  const scope =
    scopeRaw &&
    boundedSearchScopeValues.includes(scopeRaw as (typeof boundedSearchScopeValues)[number])
      ? scopeRaw
      : "global";

  const pageSizeRaw = url.searchParams.get("pageSize");
  const parsedPageSize = pageSizeRaw === null ? NaN : Number.parseInt(pageSizeRaw, 10);
  const pageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
      ? parsedPageSize
      : DEFAULT_SEARCH_PAGE_SIZE;

  params.set("pageSize", String(pageSize));
  params.set("scope", scope);

  const query = url.searchParams.get("query")?.trim();
  if (query) {
    params.set("query", query.slice(0, 255));
  }

  const cursor = url.searchParams.get("cursor")?.trim();
  if (cursor) {
    params.set("cursor", cursor);
  }

  if (scope === "organization") {
    const organizationName = url.searchParams.get("organizationName")?.trim();
    if (organizationNameSchema.safeParse(organizationName).success) {
      params.set("organizationName", organizationName!);
    }
  }

  if (scope === "project") {
    const ownerName = url.searchParams.get("ownerName")?.trim();
    const projectName = url.searchParams.get("projectName")?.trim();

    if (projectOwnerNameSchema.safeParse(ownerName).success) {
      params.set("ownerName", ownerName!);
    }

    if (projectNameSchema.safeParse(projectName).success) {
      params.set("projectName", projectName!);
    }
  }

  const allowedTypes = new Set<(typeof boundedSearchTypeValues)[number]>();
  for (const rawType of url.searchParams.getAll("types")) {
    if (boundedSearchTypeValues.includes(rawType as (typeof boundedSearchTypeValues)[number])) {
      allowedTypes.add(rawType as (typeof boundedSearchTypeValues)[number]);
    }
  }

  for (const type of allowedTypes) {
    params.append("types", type);
  }

  const canonicalPath = `/search?${params.toString()}`;
  return canonicalPath.length <= MAX_DEFAULT_LANDING_PATH_LENGTH ? canonicalPath : null;
}

function normalizeProjectOrProfilePath(pathname: string): null | string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  if (parts[0] === "users") {
    if (parts.length !== 2) {
      return null;
    }

    const loginId = safeDecodeSegment(parts[1]);
    if (!loginId || !authLoginIdSchema.safeParse(loginId).success) {
      return null;
    }

    return `/users/${loginId}`;
  }

  if (parts[0] === "organizations") {
    if (parts.length !== 2 || parts[1] === "new") {
      return null;
    }

    const organizationName = safeDecodeSegment(parts[1]);
    if (!organizationName || !organizationNameSchema.safeParse(organizationName).success) {
      return null;
    }

    return `/organizations/${organizationName}`;
  }

  if (RESERVED_ROOT_SEGMENTS.has(parts[0])) {
    return null;
  }

  if (parts.length < 2) {
    return null;
  }

  const ownerName = safeDecodeSegment(parts[0]);
  const projectName = safeDecodeSegment(parts[1]);
  if (
    !ownerName ||
    !projectName ||
    !projectOwnerNameSchema.safeParse(ownerName).success ||
    !projectNameSchema.safeParse(projectName).success
  ) {
    return null;
  }

  if (parts.length === 2) {
    return `/${ownerName}/${projectName}`;
  }

  if (parts.length === 3) {
    const leaf = parts[2];
    if (
      leaf === "code" ||
      leaf === "branches" ||
      leaf === "issues" ||
      leaf === "pulls" ||
      leaf === "discussions"
    ) {
      return `/${ownerName}/${projectName}/${leaf}`;
    }

    return null;
  }

  if (parts.length === 4 && parts[2] === "commit") {
    const oid = safeDecodeSegment(parts[3]);
    if (!oid || oid.trim().length === 0 || oid.length > 255) {
      return null;
    }

    return `/${ownerName}/${projectName}/commit/${oid}`;
  }

  if (parts.length === 4 && parts[2] === "issues") {
    if (!isValidPositiveIntString(parts[3], issueNumberSchema)) {
      return null;
    }

    return `/${ownerName}/${projectName}/issues/${parts[3]}`;
  }

  if (parts.length === 4 && parts[2] === "pulls") {
    if (!isValidPositiveIntString(parts[3], pullRequestNumberSchema)) {
      return null;
    }

    return `/${ownerName}/${projectName}/pulls/${parts[3]}`;
  }

  if (parts.length === 4 && parts[2] === "discussions") {
    if (!isValidPositiveIntString(parts[3], postingNumberSchema)) {
      return null;
    }

    return `/${ownerName}/${projectName}/discussions/${parts[3]}`;
  }

  return null;
}

export function normalizeDefaultLandingPath(path: null | string | undefined): null | string {
  if (path === null || path === undefined) {
    return null;
  }

  const trimmed = path.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DEFAULT_LANDING_PATH_LENGTH) {
    return null;
  }

  if (!trimmed.startsWith("/")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, "http://yona.local");
  } catch {
    return null;
  }

  if (url.origin !== "http://yona.local") {
    return null;
  }

  const pathname = normalizePathname(url.pathname);
  if (pathname === "/" || pathname === "/protected") {
    return null;
  }

  if (
    pathname === "/me" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return pathname === "/me" ? "/me" : null;
  }

  if (pathname === "/search") {
    return normalizeSearchPath(url);
  }

  const normalized = normalizeProjectOrProfilePath(pathname);
  if (!normalized) {
    return null;
  }

  return normalized.length <= MAX_DEFAULT_LANDING_PATH_LENGTH ? normalized : null;
}

export function isDefaultLandingPathEligible(path: null | string | undefined): boolean {
  return normalizeDefaultLandingPath(path) !== null;
}

export function resolveDefaultLandingPath(path: null | string | undefined): string {
  return normalizeDefaultLandingPath(path) ?? DEFAULT_LANDING_FALLBACK_PATH;
}

export function resolvePostAuthLandingPath(
  redirectPath: null | string | undefined,
  savedDefaultLandingPath: null | string | undefined,
): string {
  return (
    normalizeDefaultLandingPath(redirectPath) ??
    normalizeDefaultLandingPath(savedDefaultLandingPath) ??
    DEFAULT_LANDING_FALLBACK_PATH
  );
}

export function extractDefaultLandingSearchParams(path: string): URLSearchParams {
  const normalized = normalizeDefaultLandingPath(path);
  if (!normalized) {
    return new URLSearchParams();
  }

  const url = new URL(normalized, "http://yona.local");
  const params = new URLSearchParams();
  for (const key of SEARCH_PARAM_KEYS) {
    for (const value of url.searchParams.getAll(key)) {
      params.append(key, value);
    }
  }

  return params;
}
