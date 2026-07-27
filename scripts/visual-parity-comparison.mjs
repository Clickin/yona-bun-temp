function statusLabel(status) {
  return Number.isInteger(status) ? String(status) : "unknown";
}

const fullGeometryFields = Object.freeze(["x", "y", "right", "bottom", "width", "height"]);
const horizontalGeometryFields = Object.freeze(["x", "right", "width"]);

// Content height and vertical position legitimately move with seeded text and
// list length. Their stable parity contract is horizontal placement and
// containment; fixed shell, hero, and direct controls retain all six axes.
const selectorComparisonFields = Object.freeze({
  gnb: fullGeometryFields,
  gnbInner: fullGeometryFields,
  gnbPin: fullGeometryFields,
  gnbLogoLetter: fullGeometryFields,
  gnbSearchForm: fullGeometryFields,
  gnbUsermenu: fullGeometryFields,
  sidenav: fullGeometryFields,
  projectHeader: fullGeometryFields,
  projectHeaderAvatar: fullGeometryFields,
  projectBreadcrumbWrap: fullGeometryFields,
  projectUtilWrap: fullGeometryFields,
  projectWatcherCount: fullGeometryFields,
  projectWatchAction: fullGeometryFields,
  projectMenu: fullGeometryFields,
  projectMenuNav: fullGeometryFields,
  pageWrap: horizontalGeometryFields,
  projectPageWrap: horizontalGeometryFields,
  bubbleWrapGray: horizontalGeometryFields,
  boxWrap: horizontalGeometryFields,
  cuLabel: horizontalGeometryFields,
  cuDesc: horizontalGeometryFields,
  projectSettingRight: fullGeometryFields,
  projectDescription: fullGeometryFields,
  issueListWrap: horizontalGeometryFields,
  leftMenu: horizontalGeometryFields,
  postListWrap: horizontalGeometryFields,
  postItemTitle: horizontalGeometryFields,
  contentFormWrap: horizontalGeometryFields,
  markdownEditor: fullGeometryFields,
  markdownPreview: horizontalGeometryFields,
  uploadWrap: fullGeometryFields,
  issueUpdateForm: fullGeometryFields,
  comments: horizontalGeometryFields,
  comment: horizontalGeometryFields,
  commentBody: horizontalGeometryFields,
  commentDeleteModal: fullGeometryFields,
  loginDialog: fullGeometryFields,
  siteintroCover: fullGeometryFields,
  siteHeading: fullGeometryFields,
  signupButton: fullGeometryFields,
  footer: horizontalGeometryFields,
  userProfile: horizontalGeometryFields,
});

// Allow sub-pixel rounding and minor font-engine variance, but reject movement
// large enough to be visible without an overlay comparison.
export const visualParityTolerances = Object.freeze({
  geometryMinimumPixels: 6,
  geometryMaximumPixels: 24,
  geometryBoxRatio: 0.08,
  majorTextLossCharacters: 200,
  majorTextRetainedRatio: 0.5,
  viewportOverflowPixels: 16,
});

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isVisibleSelectorState(state) {
  if (!state || typeof state !== "object") {
    return false;
  }
  if (typeof state.visible === "boolean") {
    return state.visible;
  }
  const opacity = Number.parseFloat(state.opacity ?? "1");
  return (
    state.display !== "none" &&
    state.visibility !== "hidden" &&
    state.visibility !== "collapse" &&
    opacity > 0 &&
    (state.width ?? 0) > 0 &&
    (state.height ?? 0) > 0
  );
}

function hasHorizontalOverflow(state) {
  return (
    state?.hasHorizontalOverflow === true ||
    state?.escapesViewportHorizontally === true ||
    (isFiniteNumber(state?.scrollWidth) &&
      isFiniteNumber(state?.clientWidth) &&
      state.scrollWidth > state.clientWidth + 1)
  );
}

function documentHasHorizontalOverflow(metrics) {
  return (
    isFiniteNumber(metrics?.scrollWidth) &&
    isFiniteNumber(metrics?.viewportWidth) &&
    metrics.scrollWidth > metrics.viewportWidth + visualParityTolerances.viewportOverflowPixels
  );
}

function geometryTolerance(field, legacyState) {
  const span =
    field === "x" || field === "right" || field === "width"
      ? legacyState.width
      : legacyState.height;
  const proportional = isFiniteNumber(span) ? span * visualParityTolerances.geometryBoxRatio : 0;
  return Math.min(
    visualParityTolerances.geometryMaximumPixels,
    Math.max(visualParityTolerances.geometryMinimumPixels, proportional),
  );
}

function isApprovedMissingNavbarContact(legacyMetrics, localMetrics) {
  return (
    isVisibleSelectorState(legacyMetrics?.gnbFeedback) &&
    !isVisibleSelectorState(localMetrics?.gnbFeedback)
  );
}

function selectorDiffErrors(legacyMetrics, localMetrics) {
  const errors = [];
  for (const [name, comparisonFields] of Object.entries(selectorComparisonFields)) {
    const legacyState = legacyMetrics?.[name];
    const localState = localMetrics?.[name];
    if (!isVisibleSelectorState(legacyState)) {
      continue;
    }
    if (!isVisibleSelectorState(localState)) {
      errors.push(`visible selector missing or hidden locally: ${name}`);
      continue;
    }
    if (hasHorizontalOverflow(localState) && !hasHorizontalOverflow(legacyState)) {
      errors.push(`visible selector has new horizontal overflow: ${name}`);
    }

    const deltas = [];
    const approvedMissingNavbarContact = isApprovedMissingNavbarContact(
      legacyMetrics,
      localMetrics,
    );
    const ignoredFields =
      name === "gnbSearchForm" && approvedMissingNavbarContact
        ? new Set(horizontalGeometryFields)
        : name === "gnbUsermenu" && approvedMissingNavbarContact
          ? new Set(["y", "bottom"])
          : new Set();
    for (const field of comparisonFields) {
      if (ignoredFields.has(field)) {
        continue;
      }
      if (!isFiniteNumber(legacyState[field]) || !isFiniteNumber(localState[field])) {
        continue;
      }
      const tolerance = geometryTolerance(field, legacyState);
      if (Math.abs(localState[field] - legacyState[field]) >= tolerance) {
        deltas.push(
          `${field} ${legacyState[field]}->${localState[field]} (>=${Math.round(tolerance)}px)`,
        );
      }
    }
    if (deltas.length > 0) {
      errors.push(`visible selector geometry drift: ${name} (${deltas.join(", ")})`);
    }
  }
  return errors;
}

function structuralDiffErrors(legacyMetrics, localMetrics) {
  const errors = [];
  const legacyTextLength = legacyMetrics?.bodyTextLength;
  const localTextLength = localMetrics?.bodyTextLength;
  if (
    isFiniteNumber(legacyTextLength) &&
    isFiniteNumber(localTextLength) &&
    legacyTextLength - localTextLength >= visualParityTolerances.majorTextLossCharacters &&
    localTextLength <= legacyTextLength * visualParityTolerances.majorTextRetainedRatio
  ) {
    const lossPercent = Math.round(((legacyTextLength - localTextLength) / legacyTextLength) * 100);
    errors.push(
      `major visible text loss: ${legacyTextLength}->${localTextLength} (${lossPercent}% loss)`,
    );
  }
  if (
    documentHasHorizontalOverflow(localMetrics) &&
    !documentHasHorizontalOverflow(legacyMetrics)
  ) {
    errors.push(
      `new document horizontal overflow: ${localMetrics.scrollWidth}/${localMetrics.viewportWidth}`,
    );
  }
  errors.push(...selectorDiffErrors(legacyMetrics, localMetrics));
  return errors;
}

export function buildVisualComparison({ legacyResults = [], localResults = [] }) {
  const byPath = new Map(legacyResults.map((result) => [result.path, result]));
  return localResults.map((localResult) => {
    const legacyResult = byPath.get(localResult.path);
    const legacyIsErrorPage = legacyResult?.metrics?.isErrorPage ?? null;
    const localIsErrorPage = localResult.metrics?.isErrorPage ?? null;
    const diffErrors = [];
    if (legacyResult && legacyIsErrorPage === false && localIsErrorPage === true) {
      diffErrors.push("legacy renders a normal page but local renders an error page");
    }
    if (legacyResult && legacyIsErrorPage !== true && localIsErrorPage !== true) {
      diffErrors.push(...structuralDiffErrors(legacyResult.metrics, localResult.metrics));
    }
    const legacyStatus = legacyResult?.status;
    const localStatus = localResult.status;
    return {
      path: localResult.path,
      legacyOk: legacyResult?.ok ?? null,
      localOk: localResult.ok,
      localErrors: localResult.errors,
      diffErrors,
      statusDelta: legacyResult
        ? `${statusLabel(legacyStatus)}->${statusLabel(localStatus)}`
        : "legacy-missing",
      textLengthDelta: legacyResult
        ? (localResult.metrics?.bodyTextLength ?? 0) - (legacyResult.metrics?.bodyTextLength ?? 0)
        : null,
      localStylesheetRules: localResult.metrics?.stylesheetRules ?? null,
    };
  });
}

export function summarizeVisualComparison(comparison) {
  const statusDeltas = comparison.filter(
    (result) =>
      result.statusDelta !== "legacy-missing" &&
      !/^([0-9]+|unknown)->\1$/u.test(result.statusDelta),
  );
  const localFailures = comparison.filter((result) => !result.localOk);
  const diffFailures = comparison.filter((result) => result.diffErrors.length > 0);
  return {
    total: comparison.length,
    compared: comparison.filter((result) => result.statusDelta !== "legacy-missing").length,
    legacyMissing: comparison.filter((result) => result.statusDelta === "legacy-missing").length,
    diffFailures: diffFailures.length,
    localFailures: localFailures.length,
    statusDeltas: statusDeltas.map((result) => ({
      path: result.path,
      statusDelta: result.statusDelta,
      legacyOk: result.legacyOk,
      localOk: result.localOk,
    })),
  };
}
