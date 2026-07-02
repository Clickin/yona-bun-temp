import { existsSync } from "node:fs";
import path from "node:path";

const FRONTEND_E2E_PATTERN = /^frontend\/tests\/.+\.e2e\.ts$/u;
const FRONTEND_IMPLEMENTATION_PATTERN = /^frontend\/src\/.+\.(ts|tsx)$/u;
const FRONTEND_ROUTE_PATTERN = /^frontend\/src\/routes\/.+\.tsx$/u;
const FRONTEND_SUPPORT_PATTERN =
  /^frontend\/src\/(api|auth-workspace-client|i18n|query-client|runtime-config|routeTree\.gen)\b/u;
const UI_PARITY_REPORT_PATTERN = /^docs\/provenance\/ui-parity-reports\/.+\.md$/u;
const SCALA_HTML_AUDIT_FILE = "docs/provenance/frontend-scala-html-goal-violation-audit.md";
const ADDED_SCALA_HTML_SOURCE_PATTERN = /^\+(?!\+\+).*\.scala\.html\b/mu;
const ADDED_AUDIT_ROW_PATTERN = /^\+\|(?! --- )(.*)$/gmu;
const E2E_VERIFICATION_PATTERN = /frontend\/tests\/.+\.e2e\.ts\b/u;
const SCALA_HTML_SOURCE_PATTERN =
  /\b(?:yona-original\/app\/views\/)?([A-Za-z0-9_.$/-]+\.scala\.html)\b/gu;
const LEGACY_VIEW_ROOT = "yona-original/app/views";

function isFrontendImplementation(file) {
  if (!FRONTEND_IMPLEMENTATION_PATTERN.test(file)) {
    return false;
  }
  if (FRONTEND_SUPPORT_PATTERN.test(file)) {
    return false;
  }
  return !file.endsWith(".css") && !file.endsWith(".spec.ts") && !file.endsWith(".test.ts");
}

function isFrontendEvidence(file) {
  return (
    FRONTEND_E2E_PATTERN.test(file) ||
    file === "frontend/src/app.css" ||
    UI_PARITY_REPORT_PATTERN.test(file)
  );
}

function isFrontendRouteImplementation(file) {
  return FRONTEND_ROUTE_PATTERN.test(file);
}

function auditPatchAddsScalaHtmlSource(auditPatch) {
  return ADDED_SCALA_HTML_SOURCE_PATTERN.test(auditPatch);
}

function addedAuditRows(auditPatch) {
  if (auditPatch === null) {
    return [];
  }

  return [...auditPatch.matchAll(ADDED_AUDIT_ROW_PATTERN)].map((match) => match[1]);
}

function routeFileHasCompleteAuditRow(routeFile, auditPatch) {
  return addedAuditRows(auditPatch).some(
    (row) =>
      row.includes(routeFile) && /\.scala\.html\b/u.test(row) && E2E_VERIFICATION_PATTERN.test(row),
  );
}

function addedScalaHtmlSources(auditPatch) {
  return addedAuditRows(auditPatch).flatMap((row) =>
    [...row.matchAll(SCALA_HTML_SOURCE_PATTERN)].map((match) => match[1]),
  );
}

function missingLegacyScalaHtmlSources(auditPatch, repoRoot) {
  return [...new Set(addedScalaHtmlSources(auditPatch))].filter((source) => {
    const normalizedSource = path.normalize(source);
    const legacyRoot = path.resolve(repoRoot, LEGACY_VIEW_ROOT);
    const sourcePath = path.resolve(legacyRoot, normalizedSource);

    return !sourcePath.startsWith(`${legacyRoot}${path.sep}`) || !existsSync(sourcePath);
  });
}

export function evaluateScalaHtmlGoalGuard({
  changedFiles,
  env = process.env,
  auditPatch = null,
  repoRoot = process.cwd(),
}) {
  const frontendEvidenceFiles = changedFiles.filter(isFrontendEvidence);
  const frontendImplementationFiles = changedFiles.filter(isFrontendImplementation);
  const frontendRouteImplementationFiles = frontendImplementationFiles.filter(
    isFrontendRouteImplementation,
  );

  const evidenceTouchesRuntime =
    frontendEvidenceFiles.some((file) => FRONTEND_E2E_PATTERN.test(file)) ||
    frontendEvidenceFiles.includes("frontend/src/app.css");
  const implementationTouchesRuntime = frontendRouteImplementationFiles.length > 0;
  const allowEvidenceOnly = env.YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY === "1";
  const auditUpdated = changedFiles.includes(SCALA_HTML_AUDIT_FILE);
  const allowUndocumentedRoute = env.YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE === "1";

  if (
    implementationTouchesRuntime &&
    frontendEvidenceFiles.filter((file) => FRONTEND_E2E_PATTERN.test(file)).length === 0 &&
    !allowUndocumentedRoute
  ) {
    return {
      blocked: true,
      frontendEvidenceFiles,
      frontendImplementationFiles,
      message:
        "Scala HTML goal guard blocked unverified frontend route work. Route TSX changed without changing a focused frontend E2E file in the same commit. Add or update the screen's frontend/tests/*.e2e.ts verification, or set YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE=1 for an explicitly intentional non-goal route change.",
    };
  }

  if (
    frontendEvidenceFiles.length > 0 &&
    evidenceTouchesRuntime &&
    !implementationTouchesRuntime &&
    !allowEvidenceOnly
  ) {
    return {
      blocked: true,
      frontendEvidenceFiles,
      frontendImplementationFiles,
      message:
        "Scala HTML goal guard blocked evidence-only frontend work. Frontend E2E/CSS/UI parity evidence changed without a TSX route implementation change. Rebuild the target screen from yona-original Scala HTML in the same change, or set YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY=1 for an explicitly intentional audit-only commit.",
    };
  }

  if (implementationTouchesRuntime && !auditUpdated && !allowUndocumentedRoute) {
    return {
      blocked: true,
      frontendEvidenceFiles,
      frontendImplementationFiles,
      message:
        "Scala HTML goal guard blocked undocumented frontend route work. Route TSX changed without updating docs/provenance/frontend-scala-html-goal-violation-audit.md. Record the target route/screen state, legacy Scala HTML root, included partials, and focused verification, or set YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE=1 for an explicitly intentional non-goal route change.",
    };
  }

  if (
    implementationTouchesRuntime &&
    auditUpdated &&
    auditPatch !== null &&
    !auditPatchAddsScalaHtmlSource(auditPatch) &&
    !allowUndocumentedRoute
  ) {
    return {
      blocked: true,
      frontendEvidenceFiles,
      frontendImplementationFiles,
      message:
        "Scala HTML goal guard blocked weak audit memo work. Route TSX changed, but the staged audit memo diff does not add a legacy .scala.html source. Add the target legacy Scala HTML root and included partials to docs/provenance/frontend-scala-html-goal-violation-audit.md, or set YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE=1 for an explicitly intentional non-goal route change.",
    };
  }

  if (
    implementationTouchesRuntime &&
    auditUpdated &&
    auditPatch !== null &&
    !allowUndocumentedRoute
  ) {
    const missingScalaHtmlSources = missingLegacyScalaHtmlSources(auditPatch, repoRoot);

    if (missingScalaHtmlSources.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message: `Scala HTML goal guard blocked nonexistent legacy source work. Audit rows must name real legacy templates under ${LEGACY_VIEW_ROOT}; missing: ${missingScalaHtmlSources.join(", ")}.`,
      };
    }
  }

  if (
    implementationTouchesRuntime &&
    auditUpdated &&
    auditPatch !== null &&
    !allowUndocumentedRoute
  ) {
    const routeFilesMissingCompleteAudit = frontendRouteImplementationFiles.filter(
      (file) => !routeFileHasCompleteAuditRow(file, auditPatch),
    );

    if (routeFilesMissingCompleteAudit.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message:
          "Scala HTML goal guard blocked incomplete audit row work. Each changed route TSX file must be named in a newly added audit table row that also names a legacy .scala.html source and a focused frontend E2E verification file.",
      };
    }
  }

  return {
    blocked: false,
    frontendEvidenceFiles,
    frontendImplementationFiles,
    message:
      frontendEvidenceFiles.length === 0
        ? "Scala HTML goal guard skipped: no frontend screen evidence files changed."
        : "Scala HTML goal guard passed.",
  };
}

export function formatScalaHtmlGoalGuardSummary(result) {
  if (result.blocked) {
    return [
      `[scala-html-goal] BLOCK ${result.message}`,
      `  evidence files: ${result.frontendEvidenceFiles.join(", ")}`,
      `  implementation files: ${result.frontendImplementationFiles.join(", ") || "(none)"}`,
    ].join("\n");
  }

  return `[scala-html-goal] PASS ${result.message}`;
}
