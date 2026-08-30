import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  executeJacocoCli,
  main as generateJacocoReport,
  parseJacocoXml,
  repoRoot,
  resolveCliJar,
  resolveDiagnosticPaths,
  resolveDistributionClassfiles,
  resolvePaths,
} from "./legacy-jacoco-report.mjs";
import { buildRouteActionIndex } from "./build-behavior-inventory.mjs";

export const defaultProbeTarget = {
  className: "controllers.Application",
  method: "index",
};

function normalizedClassName(name) {
  return String(name ?? "").trim().replaceAll("/", ".").replace(/^0x/u, "");
}

function ensureFile(path, label) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
  if (!statSync(path).isFile()) throw new Error(`${label} is not a regular file: ${path}`);
}

function sortedClassFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".class")) files.push(path);
    }
  };
  visit(root);
  return files;
}

export function parseExecinfo(text) {
  return String(text ?? "")
    .split(/\r?\n/u)
    .map((line) => {
      const match = line.match(/^\s*([0-9a-f]+)\s+(\d+)\s+of\s+(\d+)\s+(\S+)\s*$/iu);
      if (!match) return null;
      return {
        id: match[1].toLowerCase(),
        hits: Number.parseInt(match[2], 10),
        probes: Number.parseInt(match[3], 10),
        name: normalizedClassName(match[4]),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

export function parseClassinfo(text) {
  const records = [];
  let current = null;
  for (const line of String(text ?? "").split(/\r?\n/u)) {
    const classMatch = line.match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+class\s+0x([0-9a-f]+)\s+(\S+)\s*$/iu,
    );
    if (classMatch) {
      current = {
        id: classMatch[6].toLowerCase(),
        name: normalizedClassName(classMatch[7]),
        methods: Number.parseInt(classMatch[4], 10),
        methodDetails: 0,
      };
      records.push(current);
      continue;
    }
    if (current && /\bmethod\s+\S+/u.test(line)) {
      current.methodDetails += 1;
      current.methods = Math.max(current.methods, current.methodDetails);
    }
  }
  for (const record of records) delete record.methodDetails;
  return records.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function findClass(records, className) {
  const target = normalizedClassName(className);
  return records.find((record) => record.name === target) ?? null;
}

export function compareClassIdentity({ targetClass, exec = [], distribution = [], runtimeDump = [] }) {
  const execRecord = findClass(exec, targetClass);
  const distributionRecord = findClass(distribution, targetClass);
  const runtimeRecord = findClass(runtimeDump, targetClass);
  let result = "OTHER";
  if (!execRecord) result = "EXEC_MISSING";
  else if (!runtimeRecord) result = "MISSING_RUNTIME_CLASS";
  else if (distributionRecord?.methods === 0 || runtimeRecord.methods === 0) result = "METHOD_METADATA_MISSING";
  else if (execRecord.id === runtimeRecord.id && distributionRecord?.id === runtimeRecord.id) result = "EXACT_MATCH";
  else if (execRecord.id === runtimeRecord.id && distributionRecord?.id !== runtimeRecord.id) result = "RUNTIME_TRANSFORMED";
  else if (distributionRecord && distributionRecord.id === execRecord.id) result = "DISTRIBUTION_MATCH_RUNTIME_MISSING";

  return {
    result,
    exec: execRecord,
    distribution: distributionRecord,
    runtimeDump: runtimeRecord,
  };
}

export function selectCanonicalClassfiles({ comparison, distributionClassfiles, runtimeDumpDir }) {
  if (comparison?.result === "EXACT_MATCH") {
    return { source: "distribution JAR", paths: distributionClassfiles };
  }
  if (comparison?.result === "RUNTIME_TRANSFORMED" && runtimeDumpDir && sortedClassFiles(runtimeDumpDir).length > 0) {
    return { source: "runtime classdump", paths: [resolve(runtimeDumpDir)] };
  }
  return { source: null, paths: [], blocked: true };
}

function resolveRuntimeDumpDir(env = process.env) {
  const paths = resolveDiagnosticPaths(env);
  return resolve(env.YONA_LEGACY_JACOCO_CLASSDUMP_DIR ?? join(paths.diagnosticDir, "runtime-classes"));
}

function displayAndPersist(result, artifactPath) {
  mkdirSync(resolve(artifactPath, ".."), { recursive: true });
  writeFileSync(artifactPath, result.output);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`JaCoCo ${artifactPath} command failed with status ${result.status}.`);
  return result;
}

function runCliArtifact({ cli, commandArgs, java, artifactPath }) {
  return displayAndPersist(executeJacocoCli({ cli, args: commandArgs, java }), artifactPath);
}

export function resolveProbeRoute(routesText, target = defaultProbeTarget) {
  const routes = buildRouteActionIndex(routesText);
  const route = routes.find((candidate) =>
    candidate.method === "GET" &&
    candidate.controllerClass === target.className.replace(/^controllers\./u, "") &&
    candidate.controllerMethod === target.method &&
    !candidate.path.includes(":") &&
    !candidate.path.includes("*"),
  );
  if (!route) throw new Error(`Deterministic probe route not found for ${target.className}#${target.method}.`);
  return route;
}

export async function runDeterministicProbe(env = process.env) {
  const routesPath = resolve(env.YONA_LEGACY_ROUTES ?? join(repoRoot, "yona-original/conf/routes"));
  ensureFile(routesPath, "Legacy routes");
  const target = {
    className: env.YONA_LEGACY_JACOCO_TARGET_CLASS ?? defaultProbeTarget.className,
    method: env.YONA_LEGACY_JACOCO_TARGET_METHOD ?? defaultProbeTarget.method,
  };
  const route = resolveProbeRoute(readFileSync(routesPath, "utf8"), target);
  const host = env.YONA_LEGACY_HOST ?? "127.0.0.1";
  const port = env.YONA_LEGACY_PORT ?? "9000";
  const baseUrl = env.YONA_LEGACY_BASE_URL ?? `http://${host}:${port}`;
  const url = new URL(route.path, baseUrl).toString();
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  const probe = {
    target,
    route: { method: route.method, path: route.path, line: route.line },
    request: { url, status: response.status, ok: response.ok },
  };
  const paths = resolvePaths(env);
  const diagnosticDir = resolveDiagnosticPaths(env).diagnosticDir;
  const probePath = join(diagnosticDir, "probe.json");
  mkdirSync(diagnosticDir, { recursive: true });
  writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`);
  const runtimeDumpDir = resolveRuntimeDumpDir(env);
  return {
    ...probe,
    exec: paths.exec,
    runtimeDumpDir,
    postShutdownRequired: true,
  };
}

export function runDiagnostics(env = process.env) {
  const paths = resolvePaths(env);
  const diagnosticPaths = resolveDiagnosticPaths(env);
  const cli = resolveCliJar(env);
  if (!cli) throw new Error("JaCoCo CLI jar not found. Set YONA_LEGACY_JACOCO_CLI to an existing jacococli.jar.");
  ensureFile(cli, "JaCoCo CLI jar");
  ensureFile(paths.exec, "JaCoCo exec file");
  const distributionClassfiles = resolveDistributionClassfiles(env);
  if (distributionClassfiles.length === 0) throw new Error("Legacy Yona distribution classfiles not found.");
  for (const classfile of distributionClassfiles) {
    if (!existsSync(classfile)) throw new Error(`Legacy Yona classfile not found: ${classfile}`);
  }
  mkdirSync(diagnosticPaths.diagnosticDir, { recursive: true });
  const java = env.YONA_LEGACY_JACOCO_JAVA ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/java") : "java");
  const execResult = runCliArtifact({
    cli,
    commandArgs: ["execinfo", paths.exec],
    java,
    artifactPath: diagnosticPaths.execinfo,
  });
  const distributionResult = runCliArtifact({
    cli,
    commandArgs: ["classinfo", "--verbose", ...distributionClassfiles],
    java,
    artifactPath: diagnosticPaths.classinfoDistribution,
  });
  const runtimeDumpDir = resolveRuntimeDumpDir(env);
  let runtimeResult = { output: "", stdout: "", stderr: "", status: 0 };
  if (sortedClassFiles(runtimeDumpDir).length > 0) {
    runtimeResult = runCliArtifact({
      cli,
      commandArgs: ["classinfo", "--verbose", runtimeDumpDir],
      java,
      artifactPath: diagnosticPaths.classinfoRuntimeDump,
    });
  }
  const targetClass = env.YONA_LEGACY_JACOCO_TARGET_CLASS ?? defaultProbeTarget.className;
  const comparison = compareClassIdentity({
    targetClass,
    exec: parseExecinfo(execResult.output),
    distribution: parseClassinfo(distributionResult.output),
    runtimeDump: parseClassinfo(runtimeResult.output),
  });
  const canonicalClassfiles = selectCanonicalClassfiles({
    comparison,
    distributionClassfiles,
    runtimeDumpDir,
  });
  const identity = {
    version: 1,
    targetClass,
    targetRoute: env.YONA_LEGACY_JACOCO_TARGET_ROUTE ?? null,
    comparison,
    canonicalClassfiles,
    artifacts: {
      execinfo: diagnosticPaths.execinfo,
      classinfoDistribution: diagnosticPaths.classinfoDistribution,
      classinfoRuntimeDump: existsSync(diagnosticPaths.classinfoRuntimeDump) ? diagnosticPaths.classinfoRuntimeDump : null,
    },
  };
  writeFileSync(diagnosticPaths.classIdentity, `${JSON.stringify(identity, null, 2)}\n`);
  const probePath = join(diagnosticPaths.diagnosticDir, "probe.json");
  if (existsSync(probePath)) {
    try {
      const probe = JSON.parse(readFileSync(probePath, "utf8"));
      const { error: _error, ...probeWithoutError } = probe;
      writeFileSync(
        probePath,
        `${JSON.stringify({
          ...probeWithoutError,
          exec: paths.exec,
          runtimeDumpDir,
          postShutdown: {
            execBytes: statSync(paths.exec).size,
            runtimeClassfiles: sortedClassFiles(runtimeDumpDir).length,
            identityResult: comparison.result,
          },
          identity,
        }, null, 2)}\n`,
      );
    } catch {
      // Keep identity diagnostics authoritative if an earlier probe artifact is malformed.
    }
  }
  return identity;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const command = argv[0] ?? "all";
  if (command === "probe") {
    const probe = await runDeterministicProbe(env);
    writeFileSync(join(resolveDiagnosticPaths(env).diagnosticDir, "probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
    console.log(
      `JaCoCo deterministic probe request: ${probe.route.method} ${probe.route.path} -> ${probe.request.status}; ` +
      "run identity after shutdown to finalize evidence",
    );
    return probe;
  }
  if (command === "identity" || command === "all") return runDiagnostics(env);
  if (command === "execinfo" || command === "classinfo") {
    const cli = resolveCliJar(env);
    if (!cli) throw new Error("JaCoCo CLI jar not found.");
    const paths = resolvePaths(env);
    const diagnosticPaths = resolveDiagnosticPaths(env);
    const java = env.YONA_LEGACY_JACOCO_JAVA ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/java") : "java");
    const commandArgs = command === "execinfo"
      ? ["execinfo", argv[1] ?? paths.exec]
      : ["classinfo", "--verbose", ...(argv.slice(1).length > 0 ? argv.slice(1) : resolveDistributionClassfiles(env))];
    const artifactPath = command === "execinfo" ? diagnosticPaths.execinfo : diagnosticPaths.classinfoDistribution;
    return runCliArtifact({ cli, commandArgs, java, artifactPath });
  }
  throw new Error(`Unknown JaCoCo diagnostics command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    await main();
  } catch (error) {
    console.error(`legacy-jacoco-diagnostics: ${error.message}`);
    process.exitCode = 1;
  }
}
