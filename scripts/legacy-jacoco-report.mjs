import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  buildCompatShim,
  inspectShimClassOrigin,
  playGeneratedAccessorDescriptor,
} from "./legacy-jacoco-play-compat.mjs";

export const repoRoot = resolve(new URL("..", import.meta.url).pathname);
export const defaultOutputDir = resolve(repoRoot, ".agent/legacy-jacoco");
export const coverageIdentityWarningPatterns = [
  /Some classes do not match with execution data/iu,
  /Execution data for class .* does not match/iu,
  /same class files must be used as at runtime/iu,
];

function firstExisting(candidates) {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function sortedJarCandidates(root) {
  if (!existsSync(root)) return [];
  const found = [];
  const visit = (dir, depth) => {
    if (depth > 5) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path, depth + 1);
      else if (entry.name.endsWith(".jar")) found.push(path);
    }
  };
  visit(root, 0);
  return found.sort();
}

function readManifestMainClass(jar) {
  try {
    return execFileSync("unzip", ["-p", jar, "META-INF/MANIFEST.MF"], { encoding: "utf8" })
      .match(/^Main-Class:\s*(.+)$/mu)?.[1]
      ?.trim() ?? null;
  } catch {
    return null;
  }
}

export function resolveCliJavaArgs(cli, { classpathPrefix = [] } = {}) {
  if (readManifestMainClass(cli)) {
    if (classpathPrefix.length > 0) {
      throw new Error("JaCoCo Play compatibility requires a CLI without a Main-Class manifest.");
    }
    return ["-jar", cli];
  }
  const dependencyRoots = [
    resolve(homedir(), ".gradle/caches/modules-2/files-2.1/org.jacoco"),
    resolve(homedir(), ".gradle/caches/modules-2/files-2.1/args4j"),
    resolve(homedir(), ".gradle/caches/modules-2/files-2.1/org.ow2.asm"),
    resolve(homedir(), ".m2/repository/org/jacoco"),
    resolve(homedir(), ".m2/repository/args4j"),
    resolve(homedir(), ".m2/repository/org/ow2/asm"),
  ];
  const dependencies = selectCliDependencies(dependencyRoots, cli);
  return [
    "-cp",
    [...classpathPrefix, cli, ...dependencies]
      .filter((jar, index, jars) => jars.indexOf(jar) === index)
      .join(pathDelimiter()),
    "org.jacoco.cli.internal.Main",
  ];
}

function selectCliDependencies(roots, cli) {
  const candidates = roots.flatMap((root) => sortedJarCandidates(root));
  const cliVersion = /^org\.jacoco\.cli-(.+)\.jar$/u.exec(basename(cli))?.[1] ?? null;
  const dependencyNames = ["org.jacoco.core", "org.jacoco.report", "args4j", "asm", "asm-tree", "asm-commons"];
  return dependencyNames.flatMap((name) => {
    const matching = candidates.filter((candidate) => basename(candidate).startsWith(`${name}-`));
    if (matching.length === 0) return [];
    const sameVersion = cliVersion && name.startsWith("org.jacoco.")
      ? matching.find((candidate) => basename(candidate) === `${name}-${cliVersion}.jar`)
      : null;
    return [sameVersion ?? matching.at(-1)];
  });
}

function pathDelimiter() {
  return process.platform === "win32" ? ";" : ":";
}

export function resolveCliJar(env = process.env) {
  const explicit = env.YONA_LEGACY_JACOCO_CLI;
  if (explicit) return resolve(explicit);
  return firstExisting([
    resolve(repoRoot, ".agent/tools/jacococli.jar"),
    resolve(repoRoot, ".agent/legacy-jacoco/jacococli.jar"),
    ...sortedJarCandidates(resolve(homedir(), ".m2/repository/org/jacoco")),
    ...sortedJarCandidates(resolve(homedir(), ".gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli")),
  ]);
}

export function resolveDistributionClassfiles(env = process.env) {
  if (env.YONA_LEGACY_JACOCO_CLASSFILES) {
    const separator = process.platform === "win32" ? /[,;]/u : /[,:]/u;
    return env.YONA_LEGACY_JACOCO_CLASSFILES.split(separator)
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => resolve(path));
  }
  const version = env.YONA_LEGACY_VERSION ?? "1.16.0";
  const workspace = resolve(env.YONA_LEGACY_WORKSPACE_DIR ?? resolve(repoRoot, ".agent/legacy-localhost"));
  const jar = resolve(workspace, "dist", `yona-h2-v${version}`, `yona-${version}`, "lib", `yona.yona-${version}.jar`);
  return existsSync(jar) ? [jar] : [];
}

export function resolveClassfiles(env = process.env) {
  return resolveCanonicalClassfiles(env) ?? resolveDistributionClassfiles(env);
}

export function resolveCanonicalClassfiles(env = process.env) {
  const configured = env.YONA_LEGACY_JACOCO_CANONICAL_CLASSFILES;
  if (configured) {
    const separator = process.platform === "win32" ? /[,;]/u : /[,:]/u;
    return configured.split(separator).map((path) => path.trim()).filter(Boolean).map((path) => resolve(path));
  }
  const diagnosticDir = resolve(
    env.YONA_LEGACY_JACOCO_DIAGNOSTIC_DIR ??
      join(resolve(env.YONA_LEGACY_JACOCO_OUTPUT_DIR ?? defaultOutputDir), "diagnostic"),
  );
  const identityPath = join(diagnosticDir, "class-identity.json");
  if (!existsSync(identityPath)) return null;
  try {
    const identity = JSON.parse(readFileSync(identityPath, "utf8"));
    const paths = identity.canonicalClassfiles?.paths;
    return Array.isArray(paths) ? paths.map((path) => resolve(path)) : [];
  } catch {
    return [];
  }
}

export function resolvePaths(env = process.env) {
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_OUTPUT_DIR ?? defaultOutputDir);
  return {
    outputDir,
    exec: resolve(env.YONA_LEGACY_JACOCO_EXEC ?? join(outputDir, "yona.exec")),
    xml: resolve(env.YONA_LEGACY_JACOCO_XML ?? join(outputDir, "report.xml")),
    html: resolve(env.YONA_LEGACY_JACOCO_HTML ?? join(outputDir, "html")),
    csv: env.YONA_LEGACY_JACOCO_CSV ? resolve(env.YONA_LEGACY_JACOCO_CSV) : null,
    sourcefiles: resolve(env.YONA_LEGACY_JACOCO_SOURCE ?? resolve(repoRoot, "yona-original/app")),
  };
}

export function resolveDiagnosticPaths(env = process.env) {
  const paths = resolvePaths(env);
  const diagnosticDir = resolve(
    env.YONA_LEGACY_JACOCO_DIAGNOSTIC_DIR ?? join(paths.outputDir, "diagnostic"),
  );
  return {
    diagnosticDir,
    execinfo: join(diagnosticDir, "execinfo.txt"),
    classinfoDistribution: join(diagnosticDir, "classinfo-distribution.txt"),
    classinfoRuntimeDump: join(diagnosticDir, "classinfo-runtime-dump.txt"),
    reportCommandLog: join(diagnosticDir, "report-command.log"),
    classIdentity: join(diagnosticDir, "class-identity.json"),
  };
}

export function detectCoverageIdentityWarnings(output) {
  return String(output ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && coverageIdentityWarningPatterns.some((pattern) => pattern.test(line)));
}

export function executeJacocoCli({ cli, args, java = "java", cwd = repoRoot, classpathPrefix = [] }) {
  const result = spawnSync(java, [...resolveCliJavaArgs(cli, { classpathPrefix }), ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    status: result.status ?? 1,
    signal: result.signal ?? null,
    stdout,
    stderr,
    output: `${stdout}${stderr ? `${stdout.endsWith("\n") ? "" : "\n"}${stderr}` : ""}`,
    warnings: detectCoverageIdentityWarnings(`${stdout}\n${stderr}`),
  };
}

function attr(tag, name) {
  return new RegExp(`${name}="([^\"]*)"`, "u").exec(tag)?.[1] ?? "";
}

function numberAttr(tag, name) {
  return Number.parseInt(attr(tag, name) || "0", 10);
}

export function classifyMethodCoverage({
  instructionMissed = 0,
  instructionCovered = 0,
  branchMissed,
  branchCovered,
} = {}) {
  if (instructionCovered === 0) return "FULLY_MISSED";
  if (instructionMissed > 0 || (branchMissed ?? 0) > 0) return "PARTIALLY_COVERED";
  void branchCovered;
  return "FULLY_COVERED";
}

export function parseJacocoXml(xml) {
  const classes = [];
  const methods = [];
  const classRecords = [...xml.matchAll(/<class\b([^>]*?)(?:\/>|>([\s\S]*?)<\/class>)/gu)]
    .map((match) => ({ attributes: match[1], body: match[2] ?? "" }));
  for (const classRecord of classRecords) {
    const body = classRecord.body;
    const className = attr(classRecord.attributes, "name").replaceAll("/", ".");
    const classEntry = { name: className, methods: { covered: 0, missed: 0 }, branches: { covered: 0, missed: 0 } };
    for (const methodMatch of body.matchAll(/<method\b([^>]*)>([\s\S]*?)<\/method>/gu)) {
      const methodBody = methodMatch[2];
      const counters = [...methodBody.matchAll(/<counter\b([^>]*)\/>/gu)];
      const instruction = counters.find((m) => attr(m[1], "type") === "INSTRUCTION");
      const branch = counters.find((m) => attr(m[1], "type") === "BRANCH");
      const instructionMissed = numberAttr(instruction?.[1] ?? "", "missed");
      const instructionCovered = numberAttr(instruction?.[1] ?? "", "covered");
      const branchMissed = numberAttr(branch?.[1] ?? "", "missed");
      const branchCovered = numberAttr(branch?.[1] ?? "", "covered");
      classEntry.methods.covered += instructionCovered > 0 ? 1 : 0;
      classEntry.methods.missed += instructionCovered === 0 ? 1 : 0;
      classEntry.branches.covered += branchCovered;
      classEntry.branches.missed += branchMissed;
      const method = {
        class: className,
        method: attr(methodMatch[1], "name"),
      };
      const descriptor = attr(methodMatch[1], "desc");
      if (descriptor) method.desc = descriptor;
      const sourceLine = /<line\b([^>]*)\/>/u.exec(methodBody);
      if (sourceLine) {
        const line = Number.parseInt(attr(sourceLine[1], "nr") || "", 10);
        if (Number.isInteger(line)) method.sourceLine = line;
      }
      Object.assign(method, {
        instructionMissed,
        instructionCovered,
        branchMissed,
        branchCovered,
        status: classifyMethodCoverage({
          instructionMissed,
          instructionCovered,
          branchMissed: branch === undefined ? undefined : branchMissed,
          branchCovered: branch === undefined ? undefined : branchCovered,
        }),
      });
      methods.push(method);
      if (instructionMissed > 0 || branchMissed > 0) {
        classEntry._uncovered = classEntry._uncovered ?? [];
        classEntry._uncovered.push({ class: className, method: attr(methodMatch[1], "name"), instructionMissed, branchMissed });
      }
    }
    delete classEntry._uncovered;
    classes.push(classEntry);
  }
  const uncoveredMethods = [];
  for (const classRecord of classRecords) {
    const className = attr(classRecord.attributes, "name").replaceAll("/", ".");
    for (const methodMatch of classRecord.body.matchAll(/<method\b([^>]*)>([\s\S]*?)<\/method>/gu)) {
      const counters = [...methodMatch[2].matchAll(/<counter\b([^>]*)\/>/gu)];
      const instruction = counters.find((m) => attr(m[1], "type") === "INSTRUCTION");
      const branch = counters.find((m) => attr(m[1], "type") === "BRANCH");
      const instructionMissed = numberAttr(instruction?.[1] ?? "", "missed");
      const branchMissed = numberAttr(branch?.[1] ?? "", "missed");
      if (instructionMissed || branchMissed) uncoveredMethods.push({ class: className, method: attr(methodMatch[1], "name"), instructionMissed, branchMissed });
    }
  }
  return { classes, uncoveredMethods, methods };
}

function requirePath(path, label) {
  if (!existsSync(path)) throw new Error(`JaCoCo ${label} not found: ${path}`);
}

function requireFile(path, label) {
  requirePath(path, label);
  if (!statSync(path).isFile()) throw new Error(`JaCoCo ${label} is not a regular file: ${path}`);
}

export function buildReportArgs(
  paths,
  classfiles,
  cli = resolveCliJar(process.env),
  { classpathPrefix = [] } = {},
) {
  const args = [
    ...resolveCliJavaArgs(cli, { classpathPrefix }),
    "report",
    paths.exec,
    "--xml",
    paths.xml,
    "--html",
    paths.html,
  ];
  if (paths.csv) args.push("--csv", paths.csv);
  for (const classfile of classfiles) args.push("--classfiles", classfile);
  if (paths.sourcefiles && existsSync(paths.sourcefiles)) args.push("--sourcefiles", paths.sourcefiles);
  return args;
}

export function resolvePlayCompatMode(env = process.env) {
  const value = env.YONA_LEGACY_JACOCO_PLAY_COMPAT;
  if (value === undefined || value === "0") return false;
  if (value !== "1") {
    throw new Error("YONA_LEGACY_JACOCO_PLAY_COMPAT must be 1 (enabled) or 0 (disabled).");
  }
  return true;
}

export function analyzerMetadata(playCompat) {
  return playCompat
    ? {
        analyzer: "jacoco-0.8.14-play23-compat",
        upstreamVersion: "0.8.14",
        compatibilityException: playGeneratedAccessorDescriptor,
      }
    : {
        analyzer: "jacoco-0.8.14",
        upstreamVersion: "0.8.14",
        compatibilityException: null,
      };
}

export function main(env = process.env) {
  const paths = resolvePaths(env);
  const diagnosticPaths = resolveDiagnosticPaths(env);
  const cli = resolveCliJar(env);
  const playCompat = resolvePlayCompatMode(env);
  const classfiles = resolveClassfiles(env);
  if (!cli) throw new Error("JaCoCo CLI jar not found. Set YONA_LEGACY_JACOCO_CLI to an existing jacococli.jar.");
  requireFile(cli, "CLI jar");
  requirePath(paths.exec, "exec file");
  if (classfiles.length === 0) throw new Error("Legacy Yona classfiles not found. Set YONA_LEGACY_JACOCO_CLASSFILES or prepare the legacy distribution.");
  for (const classfile of classfiles) requirePath(classfile, "classfile");
  mkdirSync(paths.outputDir, { recursive: true });
  mkdirSync(dirname(paths.xml), { recursive: true });
  mkdirSync(dirname(paths.html), { recursive: true });
  if (paths.csv) mkdirSync(dirname(paths.csv), { recursive: true });
  mkdirSync(diagnosticPaths.diagnosticDir, { recursive: true });
  const java = env.YONA_LEGACY_JACOCO_JAVA ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/java") : "java");
  const compatShim = playCompat ? buildCompatShim(env) : null;
  const classpathPrefix = compatShim ? [compatShim.shimJar] : [];
  const classOrigin = compatShim
    ? inspectShimClassOrigin({
        shimJar: compatShim.shimJar,
        dependencies: compatShim.dependencies,
        java,
        javac: compatShim.tools.javac,
      })
    : null;
  if (classOrigin) {
    writeFileSync(join(diagnosticPaths.diagnosticDir, "filter-class-origin.txt"), `${classOrigin}\n`);
  }
  const reportArgs = buildReportArgs(paths, classfiles, cli, { classpathPrefix });
  const cliPrefixLength = resolveCliJavaArgs(cli).length;
  const commandResult = executeJacocoCli({
    cli,
    args: reportArgs.slice(cliPrefixLength),
    java,
    classpathPrefix,
  });
  if (commandResult.stdout) process.stdout.write(commandResult.stdout);
  if (commandResult.stderr) process.stderr.write(commandResult.stderr);
  writeFileSync(
    diagnosticPaths.reportCommandLog,
    [
      `command: ${java} ${reportArgs.join(" ")}`,
      `analyzer: ${JSON.stringify(analyzerMetadata(playCompat))}`,
      ...(classOrigin ? [`filter-class-origin: ${classOrigin}`] : []),
      "",
      "stdout:",
      commandResult.stdout,
      "",
      "stderr:",
      commandResult.stderr,
    ].join("\n"),
  );
  if (commandResult.status !== 0) {
    throw new Error(`JaCoCo report command failed with status ${commandResult.status}. See ${diagnosticPaths.reportCommandLog}.`);
  }
  const parsed = parseJacocoXml(readFileSync(paths.xml, "utf8"));
  const coverageIdentityValid = commandResult.warnings.length === 0;
  const metadata = analyzerMetadata(playCompat);
  writeFileSync(
    resolve(paths.outputDir, "summary.json"),
    `${JSON.stringify({
      ...metadata,
      classes: parsed.classes,
      coverageIdentityValid,
      coverageIdentityWarnings: commandResult.warnings,
      canonicalClassfiles: classfiles,
    }, null, 2)}\n`,
  );
  writeFileSync(
    resolve(paths.outputDir, "coverage-identity.json"),
    `${JSON.stringify({
      ...metadata,
      coverageIdentityValid,
      warnings: commandResult.warnings,
      reportCommandLog: diagnosticPaths.reportCommandLog,
      canonicalClassfiles: classfiles,
    }, null, 2)}\n`,
  );
  writeFileSync(resolve(paths.outputDir, "uncovered-methods.json"), `${JSON.stringify(parsed.uncoveredMethods, null, 2)}\n`);
  writeFileSync(resolve(paths.outputDir, "methods.json"), `${JSON.stringify(parsed.methods, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { main(); } catch (error) { console.error(`legacy-jacoco-report: ${error.message}`); process.exitCode = 1; }
}
