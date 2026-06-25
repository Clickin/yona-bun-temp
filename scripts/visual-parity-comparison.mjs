function statusLabel(status) {
  return Number.isInteger(status) ? String(status) : "unknown";
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
        ? (localResult.metrics?.bodyTextLength ?? 0) -
          (legacyResult.metrics?.bodyTextLength ?? 0)
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
