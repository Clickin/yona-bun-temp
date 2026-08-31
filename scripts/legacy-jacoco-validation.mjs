import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LegacySession } from "./differential/adapters.mjs";
import { buildRouteActionIndex } from "./build-behavior-inventory.mjs";
import { parseClassinfo, parseExecinfo } from "./legacy-jacoco-diagnostics.mjs";
import {
  parseJacocoXml,
  repoRoot,
  resolveDiagnosticPaths,
  resolveDistributionClassfiles,
  resolvePaths,
} from "./legacy-jacoco-report.mjs";

export const FIVE_CONTROLLER_TARGETS = [
  { controller: "Application", className: "controllers.Application", method: "index", routePath: "/", requestPath: "/", auth: "anonymous" },
  { controller: "UserApp", className: "controllers.UserApp", method: "loginForm", routePath: "/users/loginform", requestPath: "/users/loginform", auth: "anonymous" },
  { controller: "ProjectApp", className: "controllers.ProjectApp", method: "project", routePath: "/:user/:project", requestPath: "/admin/sample", auth: "admin" },
  { controller: "IssueApp", className: "controllers.IssueApp", method: "issues", routePath: "/:user/:project/issues", requestPath: "/admin/sample/issues", auth: "admin" },
  { controller: "PullRequestApp", className: "controllers.PullRequestApp", method: "pullRequests", routePath: "/:ownerName/:project/pullRequests", requestPath: "/admin/sample/pullRequests", auth: "admin" },
];

export const defaultValidationOutputDir = resolve(repoRoot, ".agent/legacy-jacoco/five-controller-validation");

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function targetRoutes(routes) {
  return FIVE_CONTROLLER_TARGETS.map((target) => {
    const route = routes.find((candidate) =>
      candidate.method === "GET" &&
      candidate.controllerClass === target.controller &&
      candidate.controllerMethod === target.method &&
      candidate.path === target.routePath,
    );
    return route ? { ...target, route: { method: route.method, path: route.path, line: route.line } } : { ...target, route: null };
  });
}

function classRecord(records, className) {
  return records.find((record) => record.name === className) ?? null;
}

export function evaluateFiveControllerGate({
  targets = FIVE_CONTROLLER_TARGETS,
  requests = new Map(),
  methods = [],
  classes = [],
  exec = [],
  distribution = [],
  runtimeDump = [],
  coverageEvidenceStatus = "VALID",
  identityWarnings = [],
} = {}) {
  const rows = targets.map((target) => {
    const request = requests instanceof Map ? requests.get(target.controller) : requests[target.controller];
    const matchingMethods = methods.filter((method) => method.class === target.className && method.method === target.method);
    const methodMetadata = matchingMethods.find((method) => method.instructionCovered > 0) ?? matchingMethods[0] ?? null;
    const reportClass = classes.find((entry) => entry.name === target.className) ?? null;
    const identity = {
      exec: classRecord(exec, target.className),
      distribution: classRecord(distribution, target.className),
      runtimeDump: classRecord(runtimeDump, target.className),
    };
    const identityResult = identity.exec && identity.runtimeDump && identity.distribution &&
      identity.exec.id === identity.runtimeDump.id && identity.distribution.id === identity.runtimeDump.id
      ? "EXACT_MATCH"
      : "IDENTITY_MISMATCH";
    const targetWarnings = identityWarnings.filter((warning) => warning.includes(target.className));
    const blockedReasons = [];
    if (target.route === null) blockedReasons.push("ROUTE_MISSING");
    if (!request || request.error) blockedReasons.push(request?.error ?? "REQUEST_MISSING");
    if (identityResult !== "EXACT_MATCH") blockedReasons.push(identityResult);
    if (!identity.exec) blockedReasons.push("EXEC_CLASS_MISSING");
    if (!identity.runtimeDump) blockedReasons.push("RUNTIME_CLASS_MISSING");
    if (!identity.distribution) blockedReasons.push("DISTRIBUTION_CLASS_MISSING");
    const methodCount = reportClass ? reportClass.methods.covered + reportClass.methods.missed : 0;
    if (!methodMetadata) blockedReasons.push("METHOD_METADATA_MISSING");
    if (methodMetadata && methodMetadata.instructionCovered <= 0) blockedReasons.push("METHOD_NOT_COVERED");
    if (methodCount <= 0) blockedReasons.push("CLASS_METHOD_METADATA_MISSING");
    if (coverageEvidenceStatus !== "VALID") blockedReasons.push("INVALID_COVERAGE_EVIDENCE");
    if (identityWarnings.length > 0) blockedReasons.push("IDENTITY_WARNING");
    return {
      controller: target.controller,
      className: target.className,
      method: target.method,
      route: target.route ?? { method: "GET", path: target.routePath, line: null },
      request: request ?? { url: null, status: null, ok: false },
      auth: target.auth,
      classMetadata: { methodCount },
      methodMetadata,
      identityResult,
      identityWarnings: targetWarnings,
      coverageEvidenceStatus,
      blockedReason: blockedReasons.length > 0 ? blockedReasons.join(",") : null,
      passed: blockedReasons.length === 0,
    };
  });
  const allPassed = rows.every((row) => row.passed);
  return { version: 1, allPassed, fullSweepAllowed: allPassed, controllers: rows };
}

async function requestTargets(env, targets) {
  const baseUrl = env.YONA_LEGACY_BASE_URL ?? `http://${env.YONA_LEGACY_HOST ?? "127.0.0.1"}:${env.YONA_LEGACY_PORT ?? "9000"}`;
  const admin = new LegacySession(baseUrl);
  const requests = new Map();
  for (const target of targets) {
    const url = new URL(target.requestPath, baseUrl).toString();
    try {
      let response;
      if (target.auth === "admin") {
        if (!admin.cookies) {
          await admin.login({
            loginId: env.YONA_LEGACY_ADMIN_LOGIN_ID ?? "admin",
            password: env.YONA_LEGACY_ADMIN_PASSWORD ?? "admin",
          });
        }
        response = await admin.request({ method: "GET", path: target.requestPath });
        requests.set(target.controller, { url, status: response.status, ok: response.status >= 200 && response.status < 400 });
      } else {
        const result = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
        requests.set(target.controller, { url, status: result.status, ok: result.ok });
      }
    } catch (error) {
      requests.set(target.controller, { url, status: null, ok: false, error: error.message });
    }
  }
  return requests;
}

function command(nodeArgs, env) {
  execFileSync(process.execPath, nodeArgs, { cwd: repoRoot, env, stdio: "inherit" });
}

export async function runFiveControllerValidation(env = process.env) {
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? defaultValidationOutputDir);
  rmSync(outputDir, { recursive: true, force: true });
  const diagnosticDir = join(outputDir, "diagnostic");
  const runtimeDumpDir = join(diagnosticDir, "runtime-classes");
  mkdirSync(outputDir, { recursive: true });
  const runEnv = {
    ...env,
    YONA_LEGACY_JACOCO: "1",
    YONA_LEGACY_JACOCO_PLAY_COMPAT: "1",
    YONA_LEGACY_JACOCO_OUTPUT_DIR: outputDir,
    YONA_LEGACY_JACOCO_DESTFILE: join(outputDir, "yona.exec"),
    YONA_LEGACY_JACOCO_CLASSDUMP_DIR: runtimeDumpDir,
    YONA_LEGACY_PORT: env.YONA_LEGACY_PORT ?? "9000",
  };
  const distributionClassfiles = resolveDistributionClassfiles(runEnv);
  if (distributionClassfiles.length > 0) {
    runEnv.YONA_LEGACY_JACOCO_CANONICAL_CLASSFILES = distributionClassfiles.join(",");
    runEnv.YONA_LEGACY_JACOCO_CLASSFILES = distributionClassfiles.join(",");
  }
  const port = String(runEnv.YONA_LEGACY_PORT);
  let started = false;
  let requests = new Map();
  try {
    command(["scripts/legacy-localhost.mjs", "start", "--instance", "parity", "--port", port], runEnv);
    started = true;
    const routes = buildRouteActionIndex(readFileSync(join(repoRoot, "yona-original/conf/routes"), "utf8"));
    const targets = targetRoutes(routes);
    requests = await requestTargets(runEnv, targets);
  } finally {
    if (started) command(["scripts/legacy-localhost.mjs", "stop", "--instance", "parity", "--port", port], runEnv);
  }
  command(["scripts/legacy-jacoco-diagnostics.mjs", "identity"], runEnv);
  command(["scripts/legacy-jacoco-report.mjs"], runEnv);
  const paths = resolvePaths(runEnv);
  const diagnostic = resolveDiagnosticPaths(runEnv);
  const parsed = parseJacocoXml(readFileSync(paths.xml, "utf8"));
  const identities = {
    exec: parseExecinfo(readFileSync(diagnostic.execinfo, "utf8")),
    distribution: parseClassinfo(readFileSync(diagnostic.classinfoDistribution, "utf8")),
    runtimeDump: existsSync(diagnostic.classinfoRuntimeDump) ? parseClassinfo(readFileSync(diagnostic.classinfoRuntimeDump, "utf8")) : [],
  };
  const identity = json(diagnostic.classIdentity);
  const reportIdentity = json(join(outputDir, "coverage-identity.json"));
  const result = evaluateFiveControllerGate({
    targets: targetRoutes(buildRouteActionIndex(readFileSync(join(repoRoot, "yona-original/conf/routes"), "utf8"))),
    requests,
    methods: parsed.methods,
    classes: parsed.classes,
    ...identities,
    coverageEvidenceStatus: reportIdentity.coverageIdentityValid && parsed.methods.length > 0 ? "VALID" : "INVALID",
    identityWarnings: reportIdentity.warnings ?? reportIdentity.coverageIdentityWarnings ?? [],
  });
  writeFileSync(join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export async function main(env = process.env) {
  const result = await runFiveControllerValidation(env);
  console.log(`five-controller gate: ${result.allPassed ? "PASS" : "FAIL"}`);
  if (!result.allPassed) process.exitCode = 1;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { await main(); } catch (error) { console.error(`legacy-jacoco-validation: ${error.message}`); process.exitCode = 1; }
}
