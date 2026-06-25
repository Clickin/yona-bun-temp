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
    };
  }

  if ((audit.failed ?? 0) > 0) {
    return {
      error: `legacy HTML audit has ${audit.failed} failed page(s)`,
      pages: [],
      path: auditPath,
      status: "failed",
    };
  }

  if (!Array.isArray(audit.discoveredPageLinks)) {
    return {
      error: "legacy HTML audit is missing discoveredPageLinks",
      pages: [],
      path: auditPath,
      status: "invalid",
    };
  }

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
    pages,
    path: auditPath,
    status: "ok",
  };
}
