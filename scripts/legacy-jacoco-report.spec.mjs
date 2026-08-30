import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildReportArgs, main, parseJacocoXml, resolveClassfiles, resolveCliJavaArgs, resolvePaths } from "./legacy-jacoco-report.mjs";

const xml = `<report><package name="controllers"><class name="controllers/UserApp"><method name="index"><counter type="INSTRUCTION" missed="0" covered="4"/><counter type="BRANCH" missed="0" covered="2"/></method><method name="admin"><counter type="INSTRUCTION" missed="3" covered="0"/><counter type="BRANCH" missed="1" covered="0"/></method></class></package></report>`;

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

test("JaCoCo paths default to repository-local transient artifacts", () => {
  const paths = resolvePaths({});
  assert.match(paths.exec, /\.agent\/legacy-jacoco\/yona\.exec$/u);
  assert.match(paths.xml, /\.agent\/legacy-jacoco\/report\.xml$/u);
  assert.match(paths.html, /\.agent\/legacy-jacoco\/html$/u);
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
