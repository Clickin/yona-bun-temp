import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function buildLegacyAuditCorpus({ normalizePath, repoRoot }) {
  const auditPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
  if (!existsSync(auditPath)) {
    return {
      error: `missing legacy HTML audit output: ${auditPath}`,
      pages: [],
      path: auditPath,
      status: "missing",
    };
  }

  let audit;
  try {
    audit = JSON.parse(readFileSync(auditPath, "utf8"));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      pages: [],
      path: auditPath,
      status: "invalid",
    };
  }

  if (audit.status === "unreachable") {
    return {
      error: audit.error ?? "legacy HTML audit is unreachable",
      pages: [],
      path: auditPath,
      status: "unreachable",
      warning: null,
    };
  }

  if (!Array.isArray(audit.discoveredPageLinks)) {
    return {
      error: "legacy HTML audit is missing discoveredPageLinks",
      pages: [],
      path: auditPath,
      status: "invalid",
      warning: null,
    };
  }

  const failed = Number(audit.failed ?? 0);
  const pages = [
    ...new Set(
      audit.discoveredPageLinks
        .filter((path) => typeof path === "string" && path.startsWith("/"))
        .map((path) => normalizePath("http://legacy-audit.local", path))
        .filter(Boolean),
    ),
  ].sort();

  return {
    checkedAt: audit.checkedAt,
    error: null,
    failed,
    pages,
    path: auditPath,
    status: failed > 0 ? "degraded" : "ok",
    warning:
      failed > 0
        ? `legacy HTML audit has ${failed} failed page(s); using discoveredPageLinks for sweep coverage`
        : null,
  };
}
