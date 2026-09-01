import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const repoRoot = resolve(new URL("..", import.meta.url).pathname);

export const playGeneratedAccessorDescriptor =
  "Lplay/core/enhancers/PropertiesEnhancer$GeneratedAccessor;";
export const defaultCompatOutputDir = resolve(repoRoot, ".agent/tools/legacy-jacoco-play-compat");

function pathDelimiter() {
  return process.platform === "win32" ? ";" : ":";
}

function resolveDependency(name, version, env, envName = name.replaceAll(".", "_").replaceAll("-", "_").toUpperCase()) {
  const configured = env[`YONA_LEGACY_JACOCO_${envName}`];
  if (configured) return resolve(configured);
  const vendored = resolve(repoRoot, "tools/jacoco/0.8.14/lib", `${name}-${version}.jar`);
  return existsSync(vendored) ? vendored : null;
}

function requireJar(path, label) {
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`JaCoCo Play compatibility ${label} not found: ${path ?? "(none)"}`);
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed with status ${result.status}: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
}

export function resolveCompatDependencies(env = process.env) {
  const core = resolveDependency("org.jacoco.core", "0.8.14", env, "CORE");
  const asm = resolveDependency("asm", "9.9", env, "ASM");
  const asmTree = resolveDependency("asm-tree", "9.9", env, "ASM_TREE");
  requireJar(core, "JaCoCo core JAR");
  requireJar(asm, "ASM JAR");
  requireJar(asmTree, "ASM tree JAR");
  return { core, asm, asmTree };
}

export function resolveCompatTools(env = process.env) {
  const java = env.YONA_LEGACY_JACOCO_JAVA ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/java") : "java");
  const javac = env.YONA_LEGACY_JACOCO_JAVAC ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/javac") : "javac");
  const jar = env.YONA_LEGACY_JACOCO_JAR ?? (env.JAVA_HOME ? join(env.JAVA_HOME, "bin/jar") : "jar");
  return { java, javac, jar };
}

export function buildCompatShim(env = process.env) {
  const dependencies = resolveCompatDependencies(env);
  const tools = resolveCompatTools(env);
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_PLAY_COMPAT_OUTPUT_DIR ?? defaultCompatOutputDir);
  const classDirectory = join(outputDir, "classes");
  const shimJar = join(outputDir, "legacy-yona-jacoco-filter-shim.jar");
  const source = resolve(
    env.YONA_LEGACY_JACOCO_PLAY_COMPAT_SOURCE ??
      join(repoRoot, "tools/legacy-jacoco-play-compat/src/org/jacoco/core/internal/analysis/filter/AnnotationGeneratedFilter.java"),
  );
  requireJar(dependencies.core, "JaCoCo core JAR");
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`JaCoCo Play compatibility source not found: ${source}`);
  }
  mkdirSync(outputDir, { recursive: true });
  rmSync(classDirectory, { force: true, recursive: true });
  rmSync(shimJar, { force: true });
  mkdirSync(classDirectory, { recursive: true });
  run(tools.javac, [
    "-source", "8",
    "-target", "8",
    "-cp", [dependencies.core, dependencies.asm, dependencies.asmTree].join(pathDelimiter()),
    "-d", classDirectory,
    source,
  ], repoRoot);
  run(tools.jar, ["cf", shimJar, "-C", classDirectory, "."], repoRoot);
  return { shimJar, classDirectory, source, dependencies, tools };
}

export function inspectShimClassOrigin({ shimJar, dependencies, java = "java", javac = null }) {
  const directory = join(dirname(shimJar), "class-origin");
  const source = join(directory, "ClassOrigin.java");
  const classpath = [shimJar, dependencies.core, dependencies.asm, dependencies.asmTree].join(pathDelimiter());
  mkdirSync(directory, { recursive: true });
  writeFileSync(source, [
    "public final class ClassOrigin {",
    "  public static void main(String[] args) throws Exception {",
    "    Class<?> type = Class.forName(\"org.jacoco.core.internal.analysis.filter.AnnotationGeneratedFilter\", false, ClassLoader.getSystemClassLoader());",
    "    System.out.println(\"AnnotationGeneratedFilter loaded from \" + type.getProtectionDomain().getCodeSource().getLocation());",
    "  }",
    "}",
    "",
  ].join("\n"));
  const compiler = javac ?? (java.endsWith("/java") ? java.replace(/\/java$/u, "/javac") : "javac");
  run(compiler, ["-cp", classpath, "-d", directory, source], repoRoot);
  const result = spawnSync(java, ["-cp", [directory, classpath].join(pathDelimiter()), "ClassOrigin"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`JaCoCo Play compatibility class-origin probe failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return result.stdout.trim();
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = buildCompatShim();
    console.log(result.shimJar);
  } catch (error) {
    console.error(`legacy-jacoco-play-compat: ${error.message}`);
    process.exitCode = 1;
  }
}
