import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  analyzerMetadata,
  buildReportArgs,
  classifyMethodCoverage,
  detectCoverageIdentityWarnings,
  main,
  parseJacocoXml,
  resolveClassfiles,
  resolveCanonicalClassfiles,
  resolveCliJavaArgs,
  resolveCliJar,
  resolveDiagnosticPaths,
  resolvePaths,
  resolvePlayCompatMode,
} from "./legacy-jacoco-report.mjs";
import { buildCompatShim } from "./legacy-jacoco-play-compat.mjs";

const xml = `<report><package name="controllers"><class name="controllers/UserApp"><method name="index"><counter type="INSTRUCTION" missed="0" covered="4"/><counter type="BRANCH" missed="0" covered="2"/></method><method name="admin"><counter type="INSTRUCTION" missed="3" covered="0"/><counter type="BRANCH" missed="1" covered="0"/></method></class></package></report>`;

test("JaCoCo CLI resolution prefers the vendored artifact and explicit override", () => {
  assert.equal(resolveCliJar({}), join(process.cwd(), "tools/jacoco/0.8.14/jacococli.jar"));
  assert.equal(resolveCliJar({ YONA_LEGACY_JACOCO_CLI: "/tmp/custom-cli.jar" }), "/tmp/custom-cli.jar");
});

test("JaCoCo XML parsing emits class counters and uncovered methods", () => {
  const parsed = parseJacocoXml(xml);
  assert.deepEqual(parsed.classes, [{
    name: "controllers.UserApp",
    methods: { covered: 1, missed: 1 },
    branches: { covered: 2, missed: 1 },
  }]);
  assert.deepEqual(parsed.uncoveredMethods, [{
    class: "controllers.UserApp",
    method: "admin",
    instructionMissed: 3,
    branchMissed: 1,
  }]);
});

test("JaCoCo XML parsing retains self-closing class records", () => {
  assert.deepEqual(parseJacocoXml('<report><class name="controllers/IssueApp"/></report>').classes, [{
    name: "controllers.IssueApp",
    methods: { covered: 0, missed: 0 },
    branches: { covered: 0, missed: 0 },
  }]);
});

test("JaCoCo XML parsing does not attach following methods to self-closing classes", () => {
  const parsed = parseJacocoXml(
    '<report><class name="controllers/IssueApp"/><class name="controllers/BoardApp"><method name="index"><counter type="INSTRUCTION" missed="0" covered="4"/></method></class></report>',
  );
  assert.deepEqual(parsed.classes, [
    {
      name: "controllers.IssueApp",
      methods: { covered: 0, missed: 0 },
      branches: { covered: 0, missed: 0 },
    },
    {
      name: "controllers.BoardApp",
      methods: { covered: 1, missed: 0 },
      branches: { covered: 0, missed: 0 },
    },
  ]);
  assert.deepEqual(parsed.methods.map(({ class: className, method }) => ({ class: className, method })), [
    { class: "controllers.BoardApp", method: "index" },
  ]);
});

test("JaCoCo report parser preserves the observed source-backed IssueApp fixture", () => {
  const fixture = readFileSync(new URL("./fixtures/legacy-jacoco-report-issueapp.xml", import.meta.url), "utf8");
  assert.deepEqual(parseJacocoXml(`<report>${fixture}</report>`).classes, [{
    name: "controllers.IssueApp",
    methods: { covered: 0, missed: 0 },
    branches: { covered: 0, missed: 0 },
  }]);
});

test("JaCoCo method coverage classification is deterministic", () => {
  assert.equal(classifyMethodCoverage({ instructionMissed: 4, instructionCovered: 0, branchMissed: 2, branchCovered: 0 }), "FULLY_MISSED");
  assert.equal(classifyMethodCoverage({ instructionMissed: 0, instructionCovered: 0, branchMissed: 0, branchCovered: 2 }), "FULLY_MISSED");
  assert.equal(classifyMethodCoverage({ instructionMissed: 1, instructionCovered: 3, branchMissed: 0, branchCovered: 1 }), "PARTIALLY_COVERED");
  assert.equal(classifyMethodCoverage({ instructionMissed: 0, instructionCovered: 3, branchMissed: 0, branchCovered: 2 }), "FULLY_COVERED");
});

test("JaCoCo method records retain descriptor and first source line", () => {
  const parsed = parseJacocoXml(
    '<report><class name="controllers/UserApp"><method name="index" desc="(Ljava/lang/String;)V"><line nr="27" mi="0" ci="4" mb="0" cb="0"/><line nr="31" mi="1" ci="0" mb="0" cb="0"/><counter type="INSTRUCTION" missed="0" covered="4"/></method></class></report>',
  );
  assert.deepEqual(parsed.methods, [{
    class: "controllers.UserApp",
    method: "index",
    desc: "(Ljava/lang/String;)V",
    instructionMissed: 0,
    instructionCovered: 4,
    branchMissed: 0,
    branchCovered: 0,
    status: "FULLY_COVERED",
    sourceLine: 27,
  }]);
});

test("JaCoCo methods without branch counters classify from instructions", () => {
  const parsed = parseJacocoXml(
    '<report><class name="controllers/UserApp"><method name="missed"><counter type="INSTRUCTION" missed="2" covered="0"/></method><method name="partial"><counter type="INSTRUCTION" missed="1" covered="2"/></method><method name="covered"><counter type="INSTRUCTION" missed="0" covered="2"/></method></class></report>',
  );
  assert.deepEqual(parsed.methods.map(({ method, status }) => ({ method, status })), [
    { method: "missed", status: "FULLY_MISSED" },
    { method: "partial", status: "PARTIALLY_COVERED" },
    { method: "covered", status: "FULLY_COVERED" },
  ]);
});

test("JaCoCo paths default to repository-local transient artifacts", () => {
  const paths = resolvePaths({});
  assert.match(paths.exec, /\.agent\/legacy-jacoco\/yona\.exec$/u);
  assert.match(paths.xml, /\.agent\/legacy-jacoco\/report\.xml$/u);
  assert.match(paths.html, /\.agent\/legacy-jacoco\/html$/u);
});

test("JaCoCo diagnostics use a stable artifact directory", () => {
  const paths = resolveDiagnosticPaths({ YONA_LEGACY_JACOCO_OUTPUT_DIR: "/tmp/jacoco-output" });
  assert.deepEqual(paths, {
    diagnosticDir: "/tmp/jacoco-output/diagnostic",
    execinfo: "/tmp/jacoco-output/diagnostic/execinfo.txt",
    classinfoDistribution: "/tmp/jacoco-output/diagnostic/classinfo-distribution.txt",
    classinfoRuntimeDump: "/tmp/jacoco-output/diagnostic/classinfo-runtime-dump.txt",
    reportCommandLog: "/tmp/jacoco-output/diagnostic/report-command.log",
    classIdentity: "/tmp/jacoco-output/diagnostic/class-identity.json",
  });
});

test("runtime-transformed identity makes runtime dump the report classfile source", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-canonical-"));
  try {
    const identityDir = join(directory, "diagnostic");
    mkdirSync(identityDir, { recursive: true });
    writeFileSync(join(identityDir, "class-identity.json"), JSON.stringify({
      comparison: { result: "RUNTIME_TRANSFORMED" },
      canonicalClassfiles: { source: "runtime classdump", paths: [join(directory, "runtime-classes")] },
    }));
    assert.deepEqual(resolveCanonicalClassfiles({ YONA_LEGACY_JACOCO_OUTPUT_DIR: directory }), [
      join(directory, "runtime-classes"),
    ]);
    assert.deepEqual(resolveClassfiles({ YONA_LEGACY_JACOCO_OUTPUT_DIR: directory }), [
      join(directory, "runtime-classes"),
    ]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("JaCoCo identity warnings are evidence failures", () => {
  assert.deepEqual(detectCoverageIdentityWarnings([
    "normal output",
    "[WARN] Some classes do not match with execution data: controllers/IssueApp",
    "Execution data for class controllers/IssueApp does not match.",
    "same class files must be used as at runtime for report generation",
  ].join("\n")), [
    "[WARN] Some classes do not match with execution data: controllers/IssueApp",
    "Execution data for class controllers/IssueApp does not match.",
    "same class files must be used as at runtime for report generation",
  ]);
});

test("JaCoCo paths and classfiles accept explicit overrides", () => {
  const paths = resolvePaths({
    YONA_LEGACY_JACOCO_OUTPUT_DIR: "/tmp/jacoco-output",
    YONA_LEGACY_JACOCO_EXEC: "/tmp/input.exec",
    YONA_LEGACY_JACOCO_XML: "/tmp/report.xml",
    YONA_LEGACY_JACOCO_HTML: "/tmp/report-html",
    YONA_LEGACY_JACOCO_SOURCE: "/tmp/sources",
    YONA_LEGACY_JACOCO_CSV: "/tmp/report.csv",
  });
  assert.deepEqual(paths, {
    outputDir: "/tmp/jacoco-output",
    exec: "/tmp/input.exec",
    xml: "/tmp/report.xml",
    html: "/tmp/report-html",
    csv: "/tmp/report.csv",
    sourcefiles: "/tmp/sources",
  });
  assert.deepEqual(resolveClassfiles({ YONA_LEGACY_JACOCO_CLASSFILES: "/tmp/a.jar,/tmp/classes" }), ["/tmp/a.jar", "/tmp/classes"]);
});

test("JaCoCo CLI arguments keep report outputs and all classfiles explicit", () => {
  const args = buildReportArgs({ exec: "/tmp/in.exec", xml: "/tmp/out.xml", html: "/tmp/html", csv: null, sourcefiles: "/does/not/exist" }, ["/tmp/yona.jar"], "/tmp/jacococli.jar");
  assert.equal(args[0], "-cp");
  assert.match(args[1], /^\/tmp\/jacococli\.jar(?:$|:)/u);
  assert.equal(args[2], "org.jacoco.cli.internal.Main");
  assert.deepEqual(args.slice(3), ["report", "/tmp/in.exec", "--xml", "/tmp/out.xml", "--html", "/tmp/html", "--classfiles", "/tmp/yona.jar"]);
});

test("cached JaCoCo CLI uses its internal Main when the jar has no Main-Class", () => {
  const cli = `${process.env.HOME}/.gradle/caches/modules-2/files-2.1/org.jacoco/org.jacoco.cli/0.8.14/67219de732252f3c289e267e24733147934132da/org.jacoco.cli-0.8.14.jar`;
  const args = resolveCliJavaArgs(cli);
  assert.equal(args[0], "-cp");
  assert.equal(args[2], "org.jacoco.cli.internal.Main");
});

test("Play compatibility mode is explicit and records its exception", () => {
  assert.equal(resolvePlayCompatMode({}), false);
  assert.equal(resolvePlayCompatMode({ YONA_LEGACY_JACOCO_PLAY_COMPAT: "0" }), false);
  assert.equal(resolvePlayCompatMode({ YONA_LEGACY_JACOCO_PLAY_COMPAT: "1" }), true);
  assert.throws(
    () => resolvePlayCompatMode({ YONA_LEGACY_JACOCO_PLAY_COMPAT: "yes" }),
    /must be 1 \(enabled\) or 0 \(disabled\)/u,
  );
  assert.deepEqual(analyzerMetadata(true), {
    analyzer: "jacoco-0.8.14-play23-compat",
    upstreamVersion: "0.8.14",
    compatibilityException: "Lplay/core/enhancers/PropertiesEnhancer$GeneratedAccessor;",
  });
});

test("Play compatibility shim bypasses only GeneratedAccessor", () => {
  const shim = buildCompatShim();
  const harnessDirectory = mkdtempSync(join(tmpdir(), "legacy-jacoco-filter-probe-"));
  const source = join(harnessDirectory, "FilterProbe.java");
  writeFileSync(source, `
package org.jacoco.core.internal.analysis.filter;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.AnnotationNode;
import org.objectweb.asm.tree.InsnNode;
import org.objectweb.asm.tree.MethodNode;

public final class FilterProbe {
  private static final class Context implements IFilterContext {
    private final Set<String> annotations;
    Context(String annotation) {
      annotations = annotation == null ? Collections.<String>emptySet() : Collections.singleton(annotation);
    }
    public String getClassName() { return "fixture"; }
    public String getSuperClassName() { return "java/lang/Object"; }
    public Set<String> getClassAnnotations() { return annotations; }
    public Set<String> getClassAttributes() { return Collections.emptySet(); }
    public String getSourceFileName() { return null; }
    public String getSourceDebugExtension() { return null; }
  }
  private static final class Output implements IFilterOutput {
    boolean ignored;
    public void ignore(org.objectweb.asm.tree.AbstractInsnNode first, org.objectweb.asm.tree.AbstractInsnNode last) { ignored = true; }
    public void merge(org.objectweb.asm.tree.AbstractInsnNode first, org.objectweb.asm.tree.AbstractInsnNode last) {}
    public void replaceBranches(org.objectweb.asm.tree.AbstractInsnNode source, Replacements replacements) {}
  }
  private static boolean filtered(String classAnnotation, String methodAnnotation) {
    MethodNode method = new MethodNode();
    method.instructions.add(new InsnNode(Opcodes.RETURN));
    if (methodAnnotation != null) {
      method.invisibleAnnotations = Collections.singletonList(new AnnotationNode(methodAnnotation));
    }
    Output output = new Output();
    new AnnotationGeneratedFilter().filter(method, new Context(classAnnotation), output);
    return output.ignored;
  }
  public static void main(String[] args) {
    String play = "Lplay/core/enhancers/PropertiesEnhancer$GeneratedAccessor;";
    if (filtered(play, null) || !filtered("Lfixture/SomeGenerated;", null)
        || !filtered(null, "Lfixture/SomeGenerated;")) {
      throw new AssertionError("Generated filter scope changed");
    }
    System.out.println("synthetic filter scope: PASS");
  }
}
`);
  try {
    const separator = process.platform === "win32" ? ";" : ":";
    const classpath = [shim.dependencies.core, shim.dependencies.asm, shim.dependencies.asmTree].join(separator);
  const compile = spawnSync(shim.tools.javac, [
      "-source", "8", "-target", "8", "-cp", classpath, "-d", harnessDirectory, source,
  ], { encoding: "utf8" });
  assert.equal(compile.status, 0, compile.stderr);
    const runStandard = spawnSync(shim.tools.java, [
      "-cp", [harnessDirectory, classpath].join(separator), "org.jacoco.core.internal.analysis.filter.FilterProbe",
  ], { encoding: "utf8" });
    assert.notEqual(runStandard.status, 0, "standard JaCoCo unexpectedly bypassed Play GeneratedAccessor");
    assert.match(runStandard.stderr, /Generated filter scope changed/u);
  const run = spawnSync(shim.tools.java, [
      "-cp", [harnessDirectory, shim.shimJar, classpath].join(separator), "org.jacoco.core.internal.analysis.filter.FilterProbe",
    ], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /synthetic filter scope: PASS/u);
  } finally {
    rmSync(harnessDirectory, { force: true, recursive: true });
  }
});

test("JaCoCo report fails clearly for missing exec and non-file CLI", () => {
  const directory = mkdtempSync(join(tmpdir(), "legacy-jacoco-report-errors-"));
  try {
    const cli = join(directory, "jacococli.jar");
    writeFileSync(cli, "test cli");
    assert.throws(
      () => main({
        YONA_LEGACY_JACOCO_CLI: cli,
        YONA_LEGACY_JACOCO_CLASSFILES: join(directory, "classes"),
        YONA_LEGACY_JACOCO_OUTPUT_DIR: join(directory, "output"),
      }),
      /JaCoCo exec file not found/u,
    );
    const nonFileCli = join(directory, "cli-directory");
    mkdirSync(nonFileCli);
    assert.throws(
      () => main({
        YONA_LEGACY_JACOCO_CLI: nonFileCli,
        YONA_LEGACY_JACOCO_EXEC: join(directory, "input.exec"),
        YONA_LEGACY_JACOCO_CLASSFILES: join(directory, "classes"),
      }),
      /JaCoCo CLI jar is not a regular file/u,
    );
    writeFileSync(join(directory, "input.exec"), "exec");
    assert.throws(
      () => main({
        YONA_LEGACY_JACOCO_CLI: cli,
        YONA_LEGACY_JACOCO_EXEC: join(directory, "input.exec"),
        YONA_LEGACY_JACOCO_CLASSFILES: join(directory, "missing-classes"),
      }),
      /JaCoCo classfile not found/u,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
