import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  buildRouteActionIndex,
  canonicalActionKey,
  mapInventoryActions,
} from "./build-behavior-inventory.mjs";
import { scenarios as scenarioRegistry } from "./differential/scenarios/index.mjs";
import { summarizeExecution } from "./differential/report.mjs";
import { parseJacocoXml } from "./legacy-jacoco-report.mjs";

export const repoRoot = resolve(new URL("..", import.meta.url).pathname);
export const defaultOutputDir = resolve(repoRoot, ".agent/legacy-jacoco/full-sweep");
const SOURCE_ROOTS = new Set(["controllers", "models", "utils", "service"]);
const MAJOR_CONTROLLERS = [
  "IssueApp",
  "BoardApp",
  "ProjectApp",
  "UserApp",
  "OrganizationApp",
  "PullRequestApp",
  "ReviewApp",
  "SiteApp",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sortedJavaFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".java")) files.push(path);
    }
  };
  visit(root);
  return files;
}

function sourceClassKind(relativePath) {
  const segment = relativePath.split("/")[0];
  return SOURCE_ROOTS.has(segment) ? segment : null;
}

function stripJavaNoise(source) {
  // Remove lexical noise before tracking braces so comments and strings cannot
  // masquerade as declarations or alter the nesting depth.
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu,
    (match) => match.replace(/[^\n]/gu, " "),
  );
}

function topLevelDeclarations(source) {
  const code = stripJavaNoise(source);
  const declarations = [];
  let cursor = 0;
  for (const declaration of code.matchAll(/\b(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)/gu)) {
    const before = code.slice(cursor, declaration.index);
    const depth = [...before].reduce(
      (level, character) => level + (character === "{" ? 1 : character === "}" ? -1 : 0),
      0,
    );
    if (depth === 0) declarations.push(declaration[1]);
    cursor = declaration.index + declaration[0].length;
  }
  return declarations;
}

export function buildSourceClassIndex(sourceRoot, root = repoRoot) {
  return sortedJavaFiles(sourceRoot).flatMap((path) => {
    const relativePath = relative(root, path).replaceAll("\\", "/");
    const kind = sourceClassKind(relativePath.replace(/^yona-original\/app\//u, ""));
    if (!kind) return [];
    const source = readFileSync(path, "utf8");
    const code = stripJavaNoise(source);
    const packageName = code.match(/^\s*package\s+([\w.]+)\s*;/mu)?.[1] ?? "";
    return topLevelDeclarations(code).map((className) => ({
      class: packageName ? `${packageName}.${className}` : className,
      source: relativePath,
      kind,
    }));
  }).sort((left, right) => left.class.localeCompare(right.class) || left.source.localeCompare(right.source));
}

function methodKey(method) {
  const className = String(method?.class ?? "").trim().replaceAll("/", ".");
  const methodName = String(method?.method ?? "").trim();
  if (!className || !methodName) return null;
  const normalizedClass = className.startsWith("controllers.")
    ? `controllers.${className.split(".").at(-1)}`
    : className;
  return `${normalizedClass}#${methodName}`;
}

function sourceBackedClass(className, sourceClasses) {
  return sourceClasses.some((entry) => className === entry.class || className.startsWith(`${entry.class}$`));
}

function reportClassExists(className, classes) {
  return classes.some((entry) => entry.name === className || entry.name.startsWith(`${className}$`));
}

function methodStatus(methods) {
  if (methods.some((method) => method.instructionCovered > 0)) return "RUNTIME_EXECUTED";
  return "RUNTIME_MISSED";
}

function classifyRouteMiss({
  staticCovered,
  reportHasInfraError,
  methods,
  sourceBackedClass = false,
  reportClassExists = false,
  unreachableEvidence = false,
}) {
  if (reportHasInfraError) return "HARNESS_GAP";
  if (methods.length === 0 && unreachableEvidence) return "UNREACHABLE_OR_INTERNAL";
  if (methods.length === 0 && sourceBackedClass && reportClassExists) return "COVERAGE_MAPPING_UNRESOLVED";
  if (methods.length === 0) return "UNKNOWN";
  return staticCovered ? "SCENARIO_GAP" : "INVENTORY_GAP";
}

function routeEvidence(routes, behaviors, methods, classification) {
  return [
    ...routes.map((route) => `yona-original/conf/routes:${route.line}`),
    ...behaviors.map((behavior) => `${behavior.id}:${behavior.action}`),
    ...methods.map((method) => `${method.class}#${method.method}${method.desc ? method.desc : ""}`),
    `classification:${classification}`,
  ];
}

export function buildReconciliation({
  methods,
  routes,
  behaviors,
  infraErrors = [],
  classes = [],
  sourceClasses = [],
  unreachableEvidence = new Set(),
}) {
  const inventoryByAction = mapInventoryActions(behaviors);
  const routesByAction = new Map();
  for (const route of routes) {
    const key = route.canonicalActionKey ?? canonicalActionKey(route);
    if (!key) continue;
    if (!routesByAction.has(key)) routesByAction.set(key, []);
    routesByAction.get(key).push(route);
  }
  for (const rows of routesByAction.values()) {
    rows.sort((left, right) =>
      (left.line ?? 0) - (right.line ?? 0) ||
      String(left.method ?? "").localeCompare(String(right.method ?? "")) ||
      String(left.path ?? "").localeCompare(String(right.path ?? "")),
    );
  }
  const methodsByAction = new Map();
  for (const method of methods) {
    const key = methodKey(method);
    if (!key) continue;
    if (!methodsByAction.has(key)) methodsByAction.set(key, []);
    methodsByAction.get(key).push(method);
  }
  for (const rows of methodsByAction.values()) {
    rows.sort((left, right) =>
      String(left.class ?? "").localeCompare(String(right.class ?? "")) ||
      String(left.method ?? "").localeCompare(String(right.method ?? "")) ||
      String(left.desc ?? "").localeCompare(String(right.desc ?? "")) ||
      (left.sourceLine ?? 0) - (right.sourceLine ?? 0),
    );
  }

  const keys = [...new Set([...routesByAction.keys(), ...methodsByAction.keys()])].sort();
  const entries = keys.map((key) => {
    const routeRows = routesByAction.get(key) ?? [];
    const methodRows = methodsByAction.get(key) ?? [];
    const behaviorRows = inventoryByAction.get(key) ?? [];
    const staticCovered = behaviorRows.length > 0;
    const runtime = methodStatus(methodRows);
    const className = key.split("#")[0];
    const actionHasSourceClass = sourceBackedClass(className, sourceClasses);
    const actionHasReportClass = reportClassExists(className, classes);
    const actionHasUnreachableEvidence = unreachableEvidence instanceof Set
      ? unreachableEvidence.has(key)
      : Boolean(unreachableEvidence?.[key]);
    const classification = routeRows.length > 0 && runtime === "RUNTIME_MISSED"
      ? classifyRouteMiss({
        staticCovered,
        reportHasInfraError: infraErrors.length > 0,
        methods: methodRows,
        sourceBackedClass: actionHasSourceClass,
        reportClassExists: actionHasReportClass,
        unreachableEvidence: actionHasUnreachableEvidence,
      })
      : null;
    return {
      action: key,
      routes: routeRows.map(({ method, path, line }) => ({ method, path, line })),
      behaviorIds: behaviorRows.map((behavior) => behavior.id),
      methodStatuses: [...new Set(methodRows.map((method) => method.status))].sort(),
      staticRuntimeState: `${staticCovered ? "STATIC_COVERED" : "STATIC_UNCOVERED"} + ${runtime}`,
      routeFacing: routeRows.length > 0,
      methods: methodRows,
      sourceBackedClass: actionHasSourceClass,
      reportClassExists: actionHasReportClass,
      classification,
      evidence: classification
        ? routeEvidence(routeRows, behaviorRows, methodRows, classification)
        : [],
    };
  });

  const count = (state) => entries.filter((entry) => entry.staticRuntimeState === state).length;
  const routeMissed = entries.filter((entry) => entry.routeFacing && entry.staticRuntimeState.endsWith("RUNTIME_MISSED"));
  return {
    version: 1,
    summary: {
      staticCoveredRuntimeExecuted: count("STATIC_COVERED + RUNTIME_EXECUTED"),
      staticCoveredRuntimeMissed: count("STATIC_COVERED + RUNTIME_MISSED"),
      staticUncoveredRuntimeExecuted: count("STATIC_UNCOVERED + RUNTIME_EXECUTED"),
      staticUncoveredRuntimeMissed: count("STATIC_UNCOVERED + RUNTIME_MISSED"),
      routeFacingFullyMissed: routeMissed.length,
      routeFacingUnknown: routeMissed.filter((entry) => entry.classification === "UNKNOWN").length,
      coverageMappingUnresolved: routeMissed.filter((entry) => entry.classification === "COVERAGE_MAPPING_UNRESOLVED").length,
    },
    entries,
  };
}

export function buildControllerPartials(methods, routes, behaviors) {
  const routeByAction = new Map();
  for (const route of routes) {
    const key = route.canonicalActionKey ?? canonicalActionKey(route);
    if (!routeByAction.has(key)) routeByAction.set(key, []);
    routeByAction.get(key).push(route);
  }
  for (const rows of routeByAction.values()) {
    rows.sort((left, right) =>
      (left.line ?? 0) - (right.line ?? 0) ||
      String(left.method ?? "").localeCompare(String(right.method ?? "")) ||
      String(left.path ?? "").localeCompare(String(right.path ?? "")),
    );
  }
  const behaviorByAction = mapInventoryActions(behaviors);
  return methods
    .filter((method) => method.status === "PARTIALLY_COVERED" && method.class.startsWith("controllers."))
    .map((method) => {
      const key = methodKey(method);
      return {
        class: method.class,
        method: method.method,
        desc: method.desc ?? null,
        instructionCovered: method.instructionCovered,
        instructionMissed: method.instructionMissed,
        branchCovered: method.branchCovered,
        branchMissed: method.branchMissed,
        routes: (routeByAction.get(key) ?? []).map(({ method: httpMethod, path, line }) => ({ method: httpMethod, path, line })),
        behaviorIds: (behaviorByAction.get(key) ?? []).map((behavior) => behavior.id),
        sourceLine: method.sourceLine ?? null,
      };
    })
    .sort((left, right) => `${left.class}#${left.method}${left.desc ?? ""}`.localeCompare(`${right.class}#${right.method}${right.desc ?? ""}`));
}

export function buildControllerSummary(methods, reconciliation) {
  const source = new Map();
  for (const method of methods.filter((entry) => entry.class.startsWith("controllers."))) {
    const controller = method.class.replace(/^controllers\./u, "").split("$")[0];
    if (!source.has(controller)) source.set(controller, { totalMethods: 0, fullyCovered: 0, partial: 0, fullyMissed: 0, routeFacingFullyMissed: 0, behaviorIds: new Set() });
    const row = source.get(controller);
    row.totalMethods += 1;
    if (method.status === "FULLY_COVERED") row.fullyCovered += 1;
    else if (method.status === "PARTIALLY_COVERED") row.partial += 1;
    else row.fullyMissed += 1;
    const entry = reconciliation.entries.find((candidate) => candidate.action === methodKey(method));
    for (const id of entry?.behaviorIds ?? []) row.behaviorIds.add(id);
  }
  return MAJOR_CONTROLLERS.map((name) => {
    const row = source.get(name) ?? { totalMethods: 0, fullyCovered: 0, partial: 0, fullyMissed: 0, routeFacingFullyMissed: 0, behaviorIds: new Set() };
    row.routeFacingFullyMissed = reconciliation.entries.filter(
      (entry) =>
        entry.routeFacing &&
        entry.action.startsWith(`controllers.${name}#`) &&
        entry.staticRuntimeState.endsWith("RUNTIME_MISSED"),
    ).length;
    return { controller: name, ...row, behaviorIds: [...row.behaviorIds].sort() };
  });
}

export function evaluateCoverageEvidence({
  sourceBackedClasses = [],
  sourceBackedMethods = [],
  sourceClasses = [],
  routes = [],
  coverageIdentityValid = true,
  coverageIdentityWarnings = [],
} = {}) {
  if (!coverageIdentityValid || coverageIdentityWarnings.length > 0) {
    return {
      status: "INVALID",
      code: "INVALID_EVIDENCE",
      reason: "CLASS_IDENTITY_MISMATCH",
      warnings: coverageIdentityWarnings,
    };
  }
  if (sourceBackedClasses.length > 0 && sourceBackedMethods.length === 0) {
    return {
      status: "INVALID",
      code: "INVALID_EVIDENCE",
      reason: "SOURCE_BACKED_METHODS_MISSING",
      warnings: coverageIdentityWarnings,
    };
  }
  const routeFacingMajorControllers = new Set(
    routes
      .filter((route) => route.method && route.controllerClass && MAJOR_CONTROLLERS.includes(route.controllerClass))
      .map((route) => `controllers.${route.controllerClass}`),
  );
  const sourceMajorControllers = sourceClasses.filter(
    (entry) => routeFacingMajorControllers.has(entry.class) && entry.kind === "controllers",
  );
  const methodMajorControllers = sourceBackedMethods.filter((method) =>
    sourceMajorControllers.some((source) => method.class === source.class || method.class.startsWith(`${source.class}$`)),
  );
  if (sourceMajorControllers.length > 0 && methodMajorControllers.length === 0) {
    return {
      status: "INVALID",
      code: "INVALID_EVIDENCE",
      reason: "SOURCE_BACKED_CONTROLLER_METHODS_MISSING",
      warnings: coverageIdentityWarnings,
    };
  }
  return {
    status: "VALID",
    code: "VALID_EVIDENCE",
    reason: null,
    warnings: coverageIdentityWarnings,
  };
}

export function buildDiscoveryQueue(methods, reconciliation, partials, coverageEvidence = { status: "VALID" }) {
  if (coverageEvidence.status !== "VALID") {
    return {
      version: 1,
      status: "BLOCKED",
      coverageEvidenceStatus: coverageEvidence.status,
      coverageEvidenceCode: coverageEvidence.code ?? "INVALID_EVIDENCE",
      coverageEvidenceReason: coverageEvidence.reason ?? "INVALID_EVIDENCE",
      priorities: { P0: [], P1: [], P2: [], P3: [] },
    };
  }
  const p0 = reconciliation.entries.filter((entry) => entry.routeFacing && entry.staticRuntimeState === "STATIC_COVERED + RUNTIME_MISSED");
  const p1 = reconciliation.entries.filter((entry) => entry.routeFacing && entry.staticRuntimeState === "STATIC_UNCOVERED + RUNTIME_EXECUTED");
  const p2 = partials.filter((entry) => entry.class.startsWith("controllers."));
  const p3 = methods
    .filter((entry) => entry.status === "PARTIALLY_COVERED" && !entry.class.startsWith("controllers."))
    .slice()
    .sort((left, right) =>
      String(left.class ?? "").localeCompare(String(right.class ?? "")) ||
      String(left.method ?? "").localeCompare(String(right.method ?? "")) ||
      String(left.desc ?? "").localeCompare(String(right.desc ?? "")) ||
      (left.sourceLine ?? 0) - (right.sourceLine ?? 0),
    );
  const item = (priority, entry) => ({ priority, class: entry.class ?? entry.action, method: entry.method ?? entry.action.split("#").at(-1), routes: entry.routes ?? [], behaviorIds: entry.behaviorIds ?? [], coverageStatus: entry.status ?? entry.staticRuntimeState, classification: entry.classification ?? null, evidence: entry.evidence ?? [] });
  return {
    version: 1,
    status: "READY",
    coverageEvidenceStatus: coverageEvidence.status,
    priorities: {
      P0: p0.map((entry) => item("P0", entry)),
      P1: p1.map((entry) => item("P1", entry)),
      P2: p2.map((entry) => item("P2", entry)),
      P3: p3.map((entry) => item("P3", entry)),
    },
  };
}

function baselineSummary(report, execPath, reportXmlPath) {
  const scenarioRows = Array.isArray(report.scenarios) ? report.scenarios : [];
  const hasStepAccounting = scenarioRows.some((scenario) => Array.isArray(scenario.stepResults));
  const execution = hasStepAccounting
    ? summarizeExecution(report, scenarioRegistry.length)
    : {
      registeredScenarios: scenarioRegistry.length,
      attemptedScenarios: scenarioRows.length,
      globalInfraErrors: report.infraErrors ?? [],
      scenariosWithStepErrors: scenarioRows.filter((scenario) => (scenario.errors ?? []).length > 0).length,
      scenariosWithoutStepErrors: scenarioRows.filter((scenario) => (scenario.errors ?? []).length === 0).length,
      totalStepErrors: scenarioRows.reduce((total, scenario) => total + (scenario.errors ?? []).length, 0),
      stepAccountingSource: "legacy scenario.errors",
    };
  const findings = scenarioRows.flatMap((scenario) => scenario.violations ?? []);
  return {
    runId: report.runId ?? null,
    ...execution,
    behaviorIdsCovered: report.behaviorsCovered ?? [],
    differentialFindings: findings.length,
    execBytes: existsSync(execPath) ? statSync(execPath).size : 0,
    reportGenerated: existsSync(reportXmlPath),
  };
}

export function run(env = process.env) {
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_OUTPUT_DIR ?? defaultOutputDir);
  const reportXmlPath = resolve(env.YONA_LEGACY_JACOCO_XML ?? join(outputDir, "report.xml"));
  const report = readJson(resolve(repoRoot, ".agent/differential/report.json"));
  const reportSummaryPath = join(outputDir, "summary.json");
  const reportIdentityPath = join(outputDir, "coverage-identity.json");
  const reportSummary = existsSync(reportSummaryPath) ? readJson(reportSummaryPath) : {};
  const reportIdentity = existsSync(reportIdentityPath) ? readJson(reportIdentityPath) : {};
  const sourceRoot = resolve(env.YONA_LEGACY_JACOCO_SOURCE ?? join(repoRoot, "yona-original/app"));
  const sourceClasses = buildSourceClassIndex(sourceRoot);
  const parsed = existsSync(reportXmlPath) ? parseJacocoXml(readFileSync(reportXmlPath, "utf8")) : { methods: [], classes: [] };
  const sourceBackedReportClasses = parsed.classes.filter((entry) => sourceBackedClass(entry.name, sourceClasses));
  const sourceBackedMethods = parsed.methods.filter((method) => sourceBackedClass(method.class, sourceClasses));
  const generatedMethods = parsed.methods.filter((method) => !sourceBackedClass(method.class, sourceClasses));
  const inventory = readJson(resolve(repoRoot, "docs/provenance/behavior-inventory.json"));
  const routeText = readFileSync(resolve(repoRoot, "yona-original/conf/routes"), "utf8");
  const routes = buildRouteActionIndex(routeText);
  const coverageIdentityValid = reportIdentity.coverageIdentityValid ?? reportSummary.coverageIdentityValid ?? true;
  const coverageIdentityWarnings = reportIdentity.warnings ?? reportSummary.coverageIdentityWarnings ?? [];
  const coverageEvidence = evaluateCoverageEvidence({
    sourceBackedClasses: sourceBackedReportClasses,
    sourceBackedMethods,
    sourceClasses,
    routes,
    coverageIdentityValid,
    coverageIdentityWarnings,
  });
  const reconciliation = buildReconciliation({
    methods: sourceBackedMethods,
    classes: sourceBackedReportClasses,
    sourceClasses,
    routes,
    behaviors: inventory.behaviors,
    infraErrors: report.infraErrors ?? [],
  });
  const partials = buildControllerPartials(sourceBackedMethods, routes, inventory.behaviors);
  const controllerSummary = buildControllerSummary(sourceBackedMethods, reconciliation);
  const queue = buildDiscoveryQueue(sourceBackedMethods, reconciliation, partials, coverageEvidence);
  const summaryPath = join(outputDir, "summary.json");
  const priorSummary = existsSync(summaryPath) ? readJson(summaryPath) : { classes: parsed.classes };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "source-class-index.json"), `${JSON.stringify(sourceClasses, null, 2)}\n`);
  writeFileSync(join(outputDir, "route-action-index.json"), `${JSON.stringify(routes, null, 2)}\n`);
  writeFileSync(join(outputDir, "reconciliation.json"), `${JSON.stringify(reconciliation, null, 2)}\n`);
  writeFileSync(join(outputDir, "controller-partials.json"), `${JSON.stringify(partials, null, 2)}\n`);
  writeFileSync(join(outputDir, "controller-review.json"), `${JSON.stringify({ version: 1, controllers: controllerSummary, routeFacingFullyMissed: reconciliation.entries.filter((entry) => entry.routeFacing && entry.staticRuntimeState.endsWith("RUNTIME_MISSED")) }, null, 2)}\n`);
  writeFileSync(join(outputDir, "discovery-queue.json"), `${JSON.stringify(queue, null, 2)}\n`);
  writeFileSync(summaryPath, `${JSON.stringify({
    ...priorSummary,
    baseline: baselineSummary(report, join(outputDir, "yona.exec"), reportXmlPath),
    coverageIdentityValid,
    coverageIdentityWarnings,
    coverageEvidenceStatus: coverageEvidence.status,
    coverageEvidenceCode: coverageEvidence.code,
    coverageEvidenceReason: coverageEvidence.reason,
    sourceBacked: { classes: sourceBackedReportClasses.length, methods: sourceBackedMethods.length },
    generatedOrNonSource: { classes: parsed.classes.length - sourceBackedReportClasses.length, methods: generatedMethods.length },
    reconciliation: reconciliation.summary,
  }, null, 2)}\n`);
  return {
    outputDir,
    sourceClasses,
    sourceBackedMethods,
    generatedMethods,
    routes,
    reconciliation,
    partials,
    controllerSummary,
    queue,
    coverageEvidence,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = run();
    console.log(`JaCoCo reconciliation: ${result.outputDir}`);
    console.log(
      `source-backed methods: ${result.sourceBackedMethods.length}; ` +
      `route-facing misses: ${result.reconciliation.summary.routeFacingFullyMissed}; ` +
      `coverage evidence: ${result.coverageEvidence.status} (${result.coverageEvidence.reason ?? "none"})`,
    );
  } catch (error) {
    console.error(`legacy-jacoco-reconciliation: ${error.message}`);
    process.exitCode = 1;
  }
}
