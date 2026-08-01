import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SQL_START = /\b(?:select|insert|update|delete)\b/iu;
const SQL_OPERATION = /^(select|insert|update|delete)\b/iu;
const BACKGROUND_PATTERN = /(?:scheduler|health|heartbeat|notification[_ -]?mail|mailbox|polling)/iu;
const SENSITIVE_PATTERN = /\b(?:password|passwd|token|secret|authorization|cookie|session|salt|email|body|content|markdown|attachment|image)(?:[_-][a-z0-9_]+)*\b/iu;
const SENSITIVE_IDENTIFIER_PATTERN = /\b(?:password|passwd|token|secret|authorization|cookie|session|salt|email|body|content|markdown|attachment|image)(?:[_-][a-z0-9_]+)*\b/giu;
const FTS_PATTERN = /(?:\bmatch\s*\(|\bfulltext\b|\bfts\b|to_tsvector|plainto_tsquery)/iu;
const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/gu;

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function parameterType(value) {
  if (value === null || /^null$/iu.test(value)) return "null";
  if (/^(?:true|false)$/iu.test(value)) return "boolean";
  if (/^-?(?:\d+\.?\d*|\.\d+)$/u.test(value)) return "number";
  return "string";
}

export function createRouteMarker({ label, path, startedAt = Date.now() }) {
  void label;
  void startedAt;
  return `route-${hash(path)}`;
}

export function normalizeSql(sql) {
  const parameterTypes = [];
  const source = String(sql ?? "")
    .replace(ANSI_PATTERN, "")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/--[^\n]*/gu, " ");
  const normalized = source
    .replace(/'(?:''|[^'])*'/gu, (value) => {
      parameterTypes.push(parameterType(value.slice(1, -1)));
      return " ? ";
    })
    .replace(/\b0x[0-9a-f]+\b/giu, () => {
      parameterTypes.push("binary");
      return " ? ";
    })
    .replace(/\b\d+(?:\.\d+)?\b/gu, (value) => {
      parameterTypes.push(parameterType(value));
      return " ? ";
    })
    .replace(/\$(?:\d+|[A-Za-z_]\w*)\b/gu, () => {
      parameterTypes.push("bound");
      return " ? ";
    })
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
  const redacted = normalized.replace(SENSITIVE_IDENTIFIER_PATTERN, "__sensitive__");
  const operation = redacted.match(SQL_OPERATION)?.[1]?.toLowerCase() ?? "unknown";
  const tables = [
    ...redacted.matchAll(/\b(?:from|join|update|into|delete\s+from)\s+[`"']?([\w.-]+)/giu),
  ].map((match) => match[1]).filter(Boolean);
  const where = (redacted.match(/\bwhere\b([\s\S]*?)(?=\border\s+by\b|\blimit\b|\boffset\b|$)/iu)?.[1] ?? "")
    .replace(/[`"]+/gu, "");
  const filters = [
    ...where.matchAll(/\b([a-z_][\w.]*)\s*(?:=|<>|!=|<=|>=|<|>|\blike\b|\bis\b|\bin\b)/giu),
  ].map((match) => match[1]).filter((value, index, values) => values.indexOf(value) === index);
  const orderByClause = redacted.match(/\border\s+by\s+([\s\S]*?)(?=\blimit\b|\boffset\b|$)/iu)?.[1]
    ?.replace(/[`"]+/gu, "") ?? "";
  const orderBy = [...orderByClause.matchAll(/\b([\w.]+)(?:\s+(asc|desc))?/giu)].map((match) => ({
    column: match[1],
    direction: (match[2] ?? "asc").toLowerCase(),
  }));
  return {
    shape: redacted,
    shapeHash: hash(redacted),
    operation,
    tables: [...new Set(tables)].sort(),
    parameterCount: parameterTypes.length,
    parameterTypes,
    hasLimit: /\blimit\s+\?/iu.test(redacted),
    hasOffset: /\boffset\s+\?/iu.test(redacted),
    filters: [...new Set(filters)].sort(),
    orderBy,
    usesFts: FTS_PATTERN.test(redacted),
  };
}

function lineTimestamp(line) {
  const match = line.match(/\b(20\d{2}-\d{2}-\d{2}[T ][0-9:.+\-]+(?:Z)?)\b/u);
  if (!match) return null;
  const timestamp = Date.parse(match[1].replace(" ", "T"));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function sourceThread(line) {
  return line.match(/\[([^\]]+)\]/u)?.[1] ?? "unknown";
}

function timestampMs(value) {
  if (Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (/^\d+(?:\.\d+)?$/u.test(value)) return Number(value);
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractPlainSql(line) {
  const plain = String(line ?? "")
    .replace(ANSI_PATTERN, "")
    .replace(/\\n/gu, "\n");
  const statementMatch = plain.match(/\bdb\.statement\s*=\s*"/iu);
  if (statementMatch?.index !== undefined) {
    let sql = plain.slice(statementMatch.index + statementMatch[0].length);
    const metadataStart = sql.search(/\s+rows_(?:affected|returned)\s*=/iu);
    if (metadataStart >= 0) sql = sql.slice(0, metadataStart);
    return sql.replace(/[\s"]+$/gu, "").trim();
  }
  const matches = [...plain.matchAll(/\b(?:select|insert|update|delete)\b/giu)];
  if (matches.length === 0) return null;
  const sqlStart = matches[0].index;
  let sql = plain.slice(sqlStart);
  const metadataStart = sql.search(/\s+rows_(?:affected|returned)\s*=/iu);
  if (metadataStart >= 0) sql = sql.slice(0, metadataStart);
  return sql
    .replace(/[\s"]+$/gu, "")
    .trim();
}

export function parseSqlLog({ text, source, routeMarker = null, requestWindow = null }) {
  return String(text ?? "")
    .split(/\r?\n/u)
    .flatMap((line) => {
      try {
        const structured = JSON.parse(line);
        if (structured && typeof structured.sql === "string") {
          return [{
            sql: structured.sql,
            source,
            routeMarker: structured.routeMarker ?? routeMarker,
            timestamp: structured.timestamp ?? lineTimestamp(line),
            sourceThread: structured.sourceThread ?? "unknown",
            category: structured.category ?? "request",
            requestWindow,
            durationMs: structured.durationMs,
            rows: structured.rows,
            plan: structured.plan,
          }];
        }
      } catch {
        // Plain runtime log lines are parsed below.
      }
      const sql = extractPlainSql(line);
      if (!sql) return [];
      return [{
        sql,
        source,
        routeMarker,
        timestamp: lineTimestamp(line),
        sourceThread: sourceThread(line),
        category: "request",
        requestWindow,
      }];
    });
}

function isBackground(record) {
  return BACKGROUND_PATTERN.test(`${record.category ?? ""} ${record.sourceThread ?? ""}`);
}

function inRequestWindow(timestamp, window) {
  const normalizedTimestamp = timestampMs(timestamp);
  if (!window || !Number.isFinite(normalizedTimestamp)) return false;
  return normalizedTimestamp >= window.startMs && normalizedTimestamp <= window.endMs;
}

function classifyCorrelation(record, { routeMarker, requestWindow }) {
  if (isBackground(record)) {
    return { correlation: "excluded", exclusionReason: "background scheduler/health/mail source" };
  }
  if (record.routeMarker && record.routeMarker === routeMarker) {
    return { correlation: "matched" };
  }
  if (inRequestWindow(record.timestamp, requestWindow)) {
    if (requestWindow?.isolated === true) {
      return { correlation: "matched", correlationEvidence: "isolated request window" };
    }
    return { correlation: "ambiguous", exclusionReason: "timestamp window has no route marker" };
  }
  if (requestWindow?.isolated === true) {
    return { correlation: "excluded", exclusionReason: "outside isolated request window" };
  }
  return { correlation: "ambiguous", exclusionReason: "outside route marker and request window" };
}

export function sanitizeQueryRecord(record, context) {
  const normalized = normalizeSql(record.sql);
  const correlation = classifyCorrelation(record, context);
  return {
    ...normalized,
    timestamp: timestampMs(record.timestamp),
    source: record.source,
    correlation: correlation.correlation,
    correlationEvidence: correlation.correlationEvidence ?? null,
    exclusionReason: correlation.exclusionReason ?? null,
    durationMs: Number.isFinite(record.durationMs) ? record.durationMs : null,
    rows: Number.isFinite(record.rows) ? record.rows : null,
    plan: record.plan ?? { access: "unknown", estimatedRows: null },
    rawSqlStored: false,
    literalsRemoved: true,
    sensitiveFieldsRemoved: !SENSITIVE_PATTERN.test(normalized.shape),
  };
}

function routeQueries(records, context) {
  const seen = new Set();
  return records
    .map((record) => sanitizeQueryRecord(record, context))
    .filter((record) => {
      const key = `${record.source}|${record.shapeHash}|${record.timestamp ?? "unknown"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function filterColumn(filter) {
  return filter.split(".").at(-1) ?? filter;
}

function queryPairScore(legacyQuery, yoramQuery) {
  const legacyFilters = new Set(legacyQuery.filters.map(filterColumn));
  const yoramFilters = new Set(yoramQuery.filters.map(filterColumn));
  const sharedFilters = [...legacyFilters].filter((filter) => yoramFilters.has(filter)).length;
  const sameLimit = legacyQuery.hasLimit === yoramQuery.hasLimit;
  const sameOffset = legacyQuery.hasOffset === yoramQuery.hasOffset;
  const sameOrder = JSON.stringify(legacyQuery.orderBy) === JSON.stringify(yoramQuery.orderBy);

  return (
    sharedFilters * 100
    + (sameLimit ? 20 : 0)
    + (sameOffset ? 10 : 0)
    + (sameOrder ? 10 : 0)
    - Math.abs(legacyFilters.size - yoramFilters.size)
  );
}

function plausibleFilterTranslation(legacyFilter, candidateFilters, tables) {
  const legacyColumn = filterColumn(legacyFilter);
  const candidateColumns = new Set(candidateFilters.map(filterColumn));
  const tableNames = new Set(tables.map((table) => table.split(".").at(-1)));

  // Legacy Ebean commonly resolves a natural key or join before the Rust
  // repository performs the equivalent lookup by primary/foreign key. These
  // translations are semantic evidence, not permission to ignore arbitrary
  // missing predicates.
  if (legacyColumn === "login_id" && tableNames.has("n4user")) {
    return candidateColumns.has("id");
  }
  if (
    ["project_id", "owner", "name"].includes(legacyColumn)
    && tableNames.has("project")
  ) {
    return candidateColumns.has("id");
  }
  if (
    legacyColumn === "user_id"
    && (tableNames.has("issue") || tableNames.has("pull_request"))
  ) {
    return ["id", "author_id", "assignee_id", "contributor_id", "receiver_id"]
      .some((column) => candidateColumns.has(column));
  }
  return false;
}

function resultComparison({ route, legacyQueries, yoramQueries }) {
  const warnings = [];
  const intentionalDifferences = [];
  const errors = [];
  const legacy = legacyQueries.filter((query) => query.correlation === "matched");
  const yoram = yoramQueries.filter((query) => query.correlation === "matched");
  const ambiguousQueries = [...legacyQueries, ...yoramQueries].filter(
    (query) => query.correlation === "ambiguous",
  );
  if (ambiguousQueries.length > 0) {
    errors.push({
      classification: "error",
      route,
      evidence: `${ambiguousQueries.length} SQL record(s) could not be correlated to the route marker`,
      risk: "unattributed SQL cannot prove route parity",
      smallestOwner: "route SQL correlation harness",
    });
  }
  const legacyList = legacy.filter((query) => query.operation === "select");
  const yoramList = yoram.filter((query) => query.operation === "select");
  for (const legacyQuery of legacyList) {
    const candidates = yoramList.filter(
      (query) => query.tables.join(",") === legacyQuery.tables.join(","),
    );
    const candidate = candidates
      .map((query) => ({ query, score: queryPairScore(legacyQuery, query) }))
      .sort((left, right) => right.score - left.score)[0]?.query;
    if (!candidate) continue;
    const ftsOnlyDifference = !legacyQuery.usesFts && candidate.usesFts;
    const candidateFilterNames = new Set(
      candidate.filters.map((filter) => filter.split(".").at(-1)),
    );
    const missingFilters = legacyQuery.filters.filter(
      (filter) => !candidateFilterNames.has(filter.split(".").at(-1)),
    );
    const searchOnlyMissingFilters = missingFilters.every((filter) => /(?:title|body|content|text)/iu.test(filter));
    const translatedFilters = missingFilters.filter((filter) =>
      plausibleFilterTranslation(filter, candidate.filters, legacyQuery.tables),
    );
    const unresolvedFilters = missingFilters.filter((filter) => !translatedFilters.includes(filter));
    if (unresolvedFilters.length > 0 && !(ftsOnlyDifference && searchOnlyMissingFilters)) {
      errors.push({
        classification: "error",
        route,
        shapeHash: candidate.shapeHash,
        evidence: `Legacy filter columns missing from Yoram: ${unresolvedFilters.join(", ")}`,
        risk: "result cardinality or authorization scope can change",
        smallestOwner: "owning Rust repository/domain query",
      });
    }
    if (translatedFilters.length > 0) {
      warnings.push({
        classification: "warning",
        route,
        shapeHash: candidate.shapeHash,
        evidence: `Legacy lookup filters translated to equivalent Yoram identity predicates: ${translatedFilters.join(", ")}`,
        risk: "query-shape comparison cannot prove the application-level identity mapping by itself",
        smallestOwner: "route SQL evidence review",
      });
    }
    if (legacyQuery.hasLimit && !candidate.hasLimit) {
      errors.push({
        classification: "error",
        route,
        shapeHash: candidate.shapeHash,
        evidence: "Legacy list query is bounded but Yoram query has no LIMIT",
        risk: "unbounded result load and pagination mismatch",
        smallestOwner: "owning Rust repository query",
      });
    }
    if (ftsOnlyDifference) {
      intentionalDifferences.push({
        classification: "intentional-difference",
        route,
        shapeHash: candidate.shapeHash,
        evidence: "Yoram uses database-native FTS for the equivalent search predicate",
      });
    }
  }
  return {
    resultEquivalent: errors.length === 0 ? null : false,
    errors,
    warnings,
    intentionalDifferences,
  };
}

export function buildRouteSqlArtifacts({
  route,
  auth = "unknown",
  locale = "ko-KR",
  requestMarker,
  requestWindow = null,
  legacyRequestWindow = requestWindow,
  yoramRequestWindow = requestWindow,
  networkSummary = [],
  legacyRecords = [],
  yoramRecords = [],
}) {
  const legacyQueries = routeQueries(legacyRecords, {
    routeMarker: requestMarker,
    requestWindow: legacyRequestWindow,
  });
  const yoramQueries = routeQueries(yoramRecords, {
    routeMarker: requestMarker,
    requestWindow: yoramRequestWindow,
  });
  return {
    generatedAt: new Date().toISOString(),
    route,
    state: { target: "comparison", auth, locale },
    requestMarker,
    requestWindow: { legacy: legacyRequestWindow, yoram: yoramRequestWindow },
    serializedRequest: { method: "GET", path: route },
    networkSummary: networkSummary.map(({ method, path, status }) => ({ method, path, status })),
    legacyOrm: "ebean",
    queries: { legacy: legacyQueries, yoram: yoramQueries },
    excludedQueries: {
      legacy: legacyQueries.filter((query) => query.correlation !== "matched"),
      yoram: yoramQueries.filter((query) => query.correlation !== "matched"),
    },
    comparison: resultComparison({
      route,
      legacyQueries,
      yoramQueries,
    }),
    redaction: {
      rawSqlStored: false,
      literalsRemoved: true,
      sensitiveFieldsRemoved: true,
    },
  };
}

export function unavailableSqlCapture({ route, target, reason, requestMarker, networkSummary = [] }) {
  return {
    generatedAt: new Date().toISOString(),
    route,
    status: "capture-unavailable",
    requestMarker,
    networkSummary,
    state: { target, auth: "unknown", locale: "ko-KR" },
    legacyOrm: target === "legacy" ? "ebean" : "seaorm",
    queries: [],
    excludedQueries: [],
    comparison: {
      resultEquivalent: null,
      errors: [{
        classification: "error",
        route,
        evidence: reason,
        risk: "SQL parity is unverified; route goal cannot close",
        smallestOwner: "SQL capture harness/runtime trace process",
      }],
      warnings: [],
      intentionalDifferences: [],
    },
    redaction: {
      rawSqlStored: false,
      literalsRemoved: true,
      sensitiveFieldsRemoved: true,
    },
  };
}

export function writeRouteSqlArtifacts({ outputDir, legacy, yoram, comparison }) {
  const sqlDir = resolve(outputDir, "sql");
  mkdirSync(sqlDir, { recursive: true });
  writeFileSync(resolve(sqlDir, "legacy.json"), `${JSON.stringify(legacy, null, 2)}\n`);
  writeFileSync(resolve(sqlDir, "yoram.json"), `${JSON.stringify(yoram, null, 2)}\n`);
  writeFileSync(resolve(sqlDir, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
}

function targetArtifact(fullArtifact, target) {
  return {
    generatedAt: fullArtifact.generatedAt,
    route: fullArtifact.route,
    state: { ...fullArtifact.state, target },
    requestMarker: fullArtifact.requestMarker,
    networkSummary: fullArtifact.networkSummary,
    legacyOrm: target === "legacy" ? fullArtifact.legacyOrm : "seaorm",
    queries: fullArtifact.queries[target],
    excludedQueries: fullArtifact.excludedQueries[target],
    comparison: fullArtifact.comparison,
    redaction: fullArtifact.redaction,
  };
}

export function captureRouteSqlFromLogs({
  route,
  auth = "unknown",
  requestMarker,
  requestWindow,
  legacyRequestWindow = requestWindow,
  yoramRequestWindow = requestWindow,
  networkSummary = [],
  env = process.env,
}) {
  const missingOutputDir = !env.YORAM_SWEEP_OUTPUT_DIR;
  const legacyWindow = readLogWindow({
    path: env.YONA_LEGACY_SQL_LOG,
    startOffset: Number(env.YONA_LEGACY_SQL_LOG_START_OFFSET ?? 0),
    endOffset: env.YONA_LEGACY_SQL_LOG_END_OFFSET ? Number(env.YONA_LEGACY_SQL_LOG_END_OFFSET) : null,
  });
  const yoramWindow = readLogWindow({
    path: env.YORAM_SQL_TRACE_LOG,
    startOffset: Number(env.YORAM_SQL_TRACE_LOG_START_OFFSET ?? 0),
    endOffset: env.YORAM_SQL_TRACE_LOG_END_OFFSET ? Number(env.YORAM_SQL_TRACE_LOG_END_OFFSET) : null,
  });
  if (missingOutputDir || !legacyWindow.available || !yoramWindow.available) {
    const reason = missingOutputDir
      ? "YORAM_SWEEP_OUTPUT_DIR is required for SQL capture artifacts"
      : [legacyWindow.reason, yoramWindow.reason].filter(Boolean).join("; ");
    return {
      status: "capture-unavailable",
      legacy: unavailableSqlCapture({ route, target: "legacy", requestMarker, networkSummary, reason }),
      yoram: unavailableSqlCapture({ route, target: "yoram", requestMarker, networkSummary, reason }),
      comparison: { status: "capture-unavailable", route, requestMarker, errors: [reason], warnings: [], intentionalDifferences: [] },
    };
  }
  const full = buildRouteSqlArtifacts({
    route,
    auth,
    requestMarker,
    requestWindow,
    legacyRequestWindow,
    yoramRequestWindow,
    networkSummary,
    legacyRecords: parseSqlLog({ text: legacyWindow.text, source: "legacy", requestWindow }),
    yoramRecords: parseSqlLog({ text: yoramWindow.text, source: "yoram", requestWindow }),
  });
  const totalRecords = full.queries.legacy.length + full.queries.yoram.length;
  if (totalRecords === 0) {
    full.comparison.errors.push({
      classification: "error",
      route,
      evidence: "SQL trace windows contained no parseable query records",
      risk: "SQL parity is unverified; route goal cannot close",
      smallestOwner: "SQL trace process/log window",
    });
  }
  const status = full.comparison.errors.length > 0 ? "captured-with-errors" : "captured";
  return {
    status,
    legacy: targetArtifact(full, "legacy"),
    yoram: targetArtifact(full, "yoram"),
    comparison: {
      status,
      route,
      requestMarker,
      ...full.comparison,
      logWindows: {
        legacy: { startOffset: legacyWindow.startOffset, endOffset: legacyWindow.endOffset },
        yoram: { startOffset: yoramWindow.startOffset, endOffset: yoramWindow.endOffset },
      },
      requestWindow: { legacy: legacyRequestWindow, yoram: yoramRequestWindow },
      rawSqlStored: false,
    },
  };
}

export function readLogWindow({ path, startOffset = 0, endOffset = null }) {
  if (!path || !existsSync(path)) return { text: "", available: false, reason: `missing log: ${path ?? "unset"}` };
  const bytes = readFileSync(path);
  const end = endOffset === null ? bytes.length : Math.min(endOffset, bytes.length);
  return {
    text: bytes.subarray(Math.max(0, startOffset), end).toString("utf8"),
    available: true,
    startOffset,
    endOffset: end,
  };
}
