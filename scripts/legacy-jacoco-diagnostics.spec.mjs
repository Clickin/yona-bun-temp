import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  compareClassIdentity,
  parseClassinfo,
  parseExecinfo,
  resolveProbeRoute,
  selectCanonicalClassfiles,
} from "./legacy-jacoco-diagnostics.mjs";

const fixtureRoot = resolve(new URL("./fixtures", import.meta.url).pathname);
const execinfo = readFileSync(resolve(fixtureRoot, "legacy-jacoco-execinfo.txt"), "utf8");
const classinfo = readFileSync(resolve(fixtureRoot, "legacy-jacoco-classinfo.txt"), "utf8");

test("JaCoCo execinfo parser reads the CLI class identity table", () => {
  assert.deepEqual(parseExecinfo(execinfo), [
    { id: "d8b3fb9de544dbb8", hits: 32, probes: 646, name: "controllers.IssueApp" },
    { id: "5fbfb1efa8fd3c04", hits: 139, probes: 704, name: "controllers.UserApp" },
  ]);
});

test("JaCoCo classinfo parser reads verbose methods from actual CLI output", () => {
  assert.deepEqual(parseClassinfo(classinfo), [
    { id: "d8b3fb9de544dbb8", name: "controllers.IssueApp", methods: 0 },
    { id: "847dda27179d1ad0", name: "notification.INotificationEvent", methods: 0 },
    { id: "d52e315fff4c59b8", name: "Routes$$anonfun$routes$1$$anonfun$applyOrElse$213", methods: 2 },
  ]);
});

test("JaCoCo identity comparison distinguishes exact, transformed, and missing runtime classes", () => {
  const exec = parseExecinfo(execinfo);
  const distribution = parseClassinfo(classinfo);
  assert.equal(compareClassIdentity({
    targetClass: "controllers.IssueApp",
    exec,
    distribution,
    runtimeDump: distribution,
  }).result, "METHOD_METADATA_MISSING");
  assert.equal(compareClassIdentity({
    targetClass: "controllers.IssueApp",
    exec,
    distribution: [{ ...distribution[0], id: "0123456789abcdef", methods: 1 }],
    runtimeDump: [{ ...distribution[0], methods: 1 }],
  }).result, "RUNTIME_TRANSFORMED");
  assert.equal(compareClassIdentity({
    targetClass: "controllers.IssueApp",
    exec,
    distribution,
    runtimeDump: [],
  }).result, "MISSING_RUNTIME_CLASS");
});

test("runtime-transformed identity selects runtime dump as canonical classfiles", () => {
  const runtimeDumpDir = mkdtempSync(join(tmpdir(), "jacoco-runtime-dump-"));
  mkdirSync(join(runtimeDumpDir, "controllers"), { recursive: true });
  try {
    writeFileSync(join(runtimeDumpDir, "controllers", "IssueApp.class"), "");
  } catch (error) {
    rmSync(runtimeDumpDir, { force: true, recursive: true });
    throw error;
  }
  try {
    const selected = selectCanonicalClassfiles({
      comparison: { result: "RUNTIME_TRANSFORMED" },
      distributionClassfiles: ["/tmp/yona.jar"],
      runtimeDumpDir,
    });
    assert.deepEqual(selected, {
      source: "runtime classdump",
      paths: [runtimeDumpDir],
    });
  } finally {
    rmSync(runtimeDumpDir, { force: true, recursive: true });
  }
});

test("deterministic probe route resolves the source-backed Application#index GET", () => {
  const routes = readFileSync(new URL("../yona-original/conf/routes", import.meta.url), "utf8");
  assert.deepEqual(resolveProbeRoute(routes), {
    method: "GET",
    path: "/",
    controllerClass: "Application",
    controllerMethod: "index",
    key: "Application.index",
    line: 9,
    canonicalActionKey: "controllers.Application#index",
  });
});
