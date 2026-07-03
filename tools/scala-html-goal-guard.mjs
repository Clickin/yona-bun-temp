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
const E2E_VERIFICATION_GLOBAL_PATTERN = /frontend\/tests\/.+?\.e2e\.ts\b/gu;
const SCALA_HTML_SOURCE_PATTERN =
  /\b(?:yona-original\/app\/views\/)?([A-Za-z0-9_.$/-]+\.scala\.html)\b/gu;
const LEGACY_VIEW_ROOT = "yona-original/app/views";
const ADDED_REACT_DOM_ESCAPE_PATTERN =
  /^\+(?!\+\+).*(?:\$\s*\(|jQuery\s*\(|window\.\$|window\.location|<script\b|dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.(?:querySelector|getElementById|getElementsByClassName|getElementsByTagName)|\.(?:addEventListener|removeEventListener|classList|style)\b|\.(?:setAttribute|removeAttribute|toggleAttribute|html|append|prepend|before|after)\s*\()/imu;
const ADDED_CREATE_ELEMENT_PATTERN =
  /^\+(?!\+\+).*(?:(?:React\.)?createElement|document\.createElement)\s*\(/imu;
const ADDED_ANCHOR_TAG_PATTERN =
  /^\+(?!\+\+).*(?:<a\b|(?:React\.)?createElement\s*\(\s*["']a["'])/imu;
const ADDED_LINK_CUSTOM_ATTRIBUTE_PATTERN =
  /^\+(?!\+\+).*<Link\b(?=[^>]*(?:data-(?:url|type|action|href)|pjax-[\w-]*|data-request-(?:method|uri)|data-toggle=))/imu;

function fileStatus(file, changedFileStatuses) {
  return changedFileStatuses?.get(file) ?? "M";
}

function nonDeletedFiles(files, changedFileStatuses) {
  return files.filter((file) => fileStatus(file, changedFileStatuses) !== "D");
}

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

function rowNamesChangedFocusedE2E(row, frontendE2EFiles) {
  const rowE2EFiles = [...row.matchAll(E2E_VERIFICATION_GLOBAL_PATTERN)].map((match) => match[0]);
  return rowE2EFiles.some((file) => frontendE2EFiles.includes(file));
}

function routeFileHasCompleteAuditRow(routeFile, auditPatch, frontendE2EFiles) {
  return addedAuditRows(auditPatch).some(
    (row) =>
      row.includes(routeFile) &&
      /\.scala\.html\b/u.test(legacySourceCell(row)) &&
      rowNamesChangedFocusedE2E(row, frontendE2EFiles),
  );
}

function addedScalaHtmlSources(auditPatch) {
  return addedAuditRows(auditPatch).flatMap((row) => {
    const sourceCell = legacySourceCell(row);
    return [...sourceCell.matchAll(SCALA_HTML_SOURCE_PATTERN)].map((match) => match[1]);
  });
}

function legacySourceCell(row) {
  const cells = row.split("|").map((cell) => cell.trim());
  if (/^P\d\b/u.test(cells[0] ?? "")) {
    return cells[3] ?? "";
  }
  return cells[2] ?? "";
}

function missingLegacyScalaHtmlSources(auditPatch, repoRoot) {
  return [...new Set(addedScalaHtmlSources(auditPatch))].filter((source) => {
    const normalizedSource = path.normalize(source);
    const legacyRoot = path.resolve(repoRoot, LEGACY_VIEW_ROOT);
    const sourcePath = path.resolve(legacyRoot, normalizedSource);

    return !sourcePath.startsWith(`${legacyRoot}${path.sep}`) || !existsSync(sourcePath);
  });
}

function routeFilesWithReactDomEscapes(routePatches) {
  return [...routePatches.entries()]
    .filter(([, patch]) => ADDED_REACT_DOM_ESCAPE_PATTERN.test(patch))
    .map(([file]) => file);
}

function routeFilesWithCreateElement(routePatches) {
  return [...routePatches.entries()]
    .filter(([, patch]) => ADDED_CREATE_ELEMENT_PATTERN.test(patch))
    .map(([file]) => file);
}

function routeFilesWithAddedAnchorTags(routePatches) {
  return [...routePatches.entries()]
    .filter(([, patch]) => ADDED_ANCHOR_TAG_PATTERN.test(patch))
    .map(([file]) => file);
}

function routeFilesWithLinkCustomAttributes(routePatches) {
  return [...routePatches.entries()]
    .filter(([, patch]) => ADDED_LINK_CUSTOM_ATTRIBUTE_PATTERN.test(patch))
    .map(([file]) => file);
}

export function evaluateScalaHtmlGoalGuard({
  changedFiles,
  changedFileStatuses = new Map(),
  env = process.env,
  auditPatch = null,
  routePatches = new Map(),
  repoRoot = process.cwd(),
}) {
  const nonDeletedChangedFiles = nonDeletedFiles(changedFiles, changedFileStatuses);
  const frontendEvidenceFiles = nonDeletedChangedFiles.filter(isFrontendEvidence);
  const frontendImplementationFiles = changedFiles.filter(isFrontendImplementation);
  const frontendRouteImplementationFiles = frontendImplementationFiles.filter(
    isFrontendRouteImplementation,
  );
  const frontendE2EFiles = frontendEvidenceFiles.filter((file) => FRONTEND_E2E_PATTERN.test(file));

  const evidenceTouchesRuntime =
    frontendEvidenceFiles.some((file) => FRONTEND_E2E_PATTERN.test(file)) ||
    frontendEvidenceFiles.includes("frontend/src/app.css");
  const implementationTouchesRuntime = frontendRouteImplementationFiles.length > 0;
  const allowEvidenceOnly = env.YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY === "1";
  const auditUpdated = changedFiles.includes(SCALA_HTML_AUDIT_FILE);
  const allowUndocumentedRoute = env.YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE === "1";
  const allowMultiScreen = env.YONA_ALLOW_SCALA_HTML_MULTI_SCREEN === "1";
  const allowReactDomEscape = env.YONA_ALLOW_REACT_DOM_ESCAPE === "1";
  const enforceSingleAuditRow = env.YONA_ENFORCE_SCALA_HTML_SINGLE_ROW === "1";
  const auditRows = auditPatch === null ? [] : addedAuditRows(auditPatch);

  if (implementationTouchesRuntime && !allowReactDomEscape) {
    const routeFilesWithCreateElementCalls = routeFilesWithCreateElement(routePatches);

    if (routeFilesWithCreateElementCalls.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message: `Scala HTML goal guard blocked createElement work. Route TSX must not add createElement, React.createElement, or document.createElement calls; express UI as TSX and keep imperative DOM creation out of screen conversions. The initial React root mount is the only allowed source exception and it lives outside route TSX. Offending route files: ${routeFilesWithCreateElementCalls.join(", ")}.`,
      };
    }
  }

  if (implementationTouchesRuntime && !allowReactDomEscape) {
    const routeFilesWithDomEscapes = routeFilesWithReactDomEscapes(routePatches);

    if (routeFilesWithDomEscapes.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message: `Scala HTML goal guard blocked legacy jQuery/DOM escape work. Route TSX must not port legacy jQuery, inline scripts, or direct DOM mutation; implement behavior with React state/events and TanStack Query useMutation/cache updates instead. Offending route files: ${routeFilesWithDomEscapes.join(", ")}.`,
      };
    }
  }

  if (implementationTouchesRuntime && !allowReactDomEscape) {
    const addedAnchorTagFiles = routeFilesWithAddedAnchorTags(routePatches);

    if (addedAnchorTagFiles.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message: `Scala HTML goal guard blocked anchor tag work. Route TSX must not add raw <a> tags; use TanStack Router Link for internal and external navigation so href rendering stays declarative. Form submits must use React form state plus TanStack Query useMutation/cache updates and perform redirects from mutation success side effects. Offending route files: ${addedAnchorTagFiles.join(", ")}.`,
      };
    }
  }

  if (implementationTouchesRuntime && !allowReactDomEscape) {
    const linkCustomAttributeFiles = routeFilesWithLinkCustomAttributes(routePatches);

    if (linkCustomAttributeFiles.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message: `Scala HTML goal guard blocked noisy Link custom attribute work. Modernized TanStack Router Link usage must not carry legacy JS-only custom attributes such as data-url, data-type, data-action, pjax-*, data-request-*, or data-toggle. Keep Link props declarative and let TanStack Router render its default href/active attributes. Offending route files: ${linkCustomAttributeFiles.join(", ")}.`,
      };
    }
  }

  if (implementationTouchesRuntime && frontendE2EFiles.length === 0 && !allowUndocumentedRoute) {
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
    !allowUndocumentedRoute &&
    enforceSingleAuditRow &&
    !allowMultiScreen &&
    auditRows.length > 1
  ) {
    return {
      blocked: true,
      frontendEvidenceFiles,
      frontendImplementationFiles,
      message:
        "Scala HTML goal guard blocked multi-screen frontend goal work. A route TSX goal commit must add exactly one audit row so unattended runs keep one legacy screen state per commit, or set YONA_ALLOW_SCALA_HTML_MULTI_SCREEN=1 for an explicit coordinated exception.",
    };
  }

  if (
    implementationTouchesRuntime &&
    auditUpdated &&
    auditPatch !== null &&
    !allowUndocumentedRoute
  ) {
    const routeFilesMissingCompleteAudit = frontendRouteImplementationFiles.filter(
      (file) => !routeFileHasCompleteAuditRow(file, auditPatch, frontendE2EFiles),
    );

    if (routeFilesMissingCompleteAudit.length > 0) {
      return {
        blocked: true,
        frontendEvidenceFiles,
        frontendImplementationFiles,
        message:
          "Scala HTML goal guard blocked incomplete audit row work. Each changed route TSX file must be named in a newly added audit table row that also names a legacy .scala.html source and a focused frontend E2E verification file changed in the same commit.",
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
