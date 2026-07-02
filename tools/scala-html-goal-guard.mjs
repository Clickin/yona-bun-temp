const FRONTEND_E2E_PATTERN = /^frontend\/tests\/.+\.e2e\.ts$/u;
const FRONTEND_IMPLEMENTATION_PATTERN = /^frontend\/src\/.+\.(ts|tsx)$/u;
const FRONTEND_ROUTE_PATTERN = /^frontend\/src\/routes\/.+\.tsx$/u;
const FRONTEND_SUPPORT_PATTERN =
  /^frontend\/src\/(api|auth-workspace-client|i18n|query-client|runtime-config|routeTree\.gen)\b/u;
const UI_PARITY_REPORT_PATTERN = /^docs\/provenance\/ui-parity-reports\/.+\.md$/u;

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

export function evaluateScalaHtmlGoalGuard({ changedFiles, env = process.env }) {
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
