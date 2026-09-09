import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { run } from "./release-gate-process.mjs";

test("non-capture waits for successful child completion", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "gate-wait-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const marker = join(root, "completed");
  await run(process.execPath, ["-e", `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(marker)}, "done"), 100)`]);
  assert.equal(existsSync(marker), true);
});

test("non-capture propagates unsuccessful exit", async () => {
  await assert.rejects(run(process.execPath, ["-e", "process.exit(7)"]), /exited 7/);
});

test("capture propagates unsuccessful exit with stderr", async () => {
  await assert.rejects(run(process.execPath, ["-e", 'console.error("backend failed"); process.exit(7)'], { capture: true }), /exited 7: backend failed/);
});

test("capture returns both output streams", async () => {
  assert.deepEqual(await run(process.execPath, ["-e", 'console.log("out"); console.error("err")'], { capture: true }), { stdout: "out\n", stderr: "err\n" });
});

test("spawn failure rejects in either output mode", async () => {
  for (const capture of [false, true]) {
    await assert.rejects(run(join(tmpdir(), "missing-release-gate-command", "executable"), [], { capture }), { code: "ENOENT" });
  }
});

test("failed build stops the gate even with an existing server binary", (t) => {
  const root = mkdtempSync(join(tmpdir(), "gate-build-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ["scripts", "target/debug", "data"]) mkdirSync(join(root, dir), { recursive: true });
  for (const file of ["release-gate.mjs", "release-gate-process.mjs"]) copyFileSync(new URL(file, import.meta.url), join(root, "scripts", file));
  for (const bin of ["yona-migrate", "yoram"]) writeFileSync(join(root, "target/debug", bin + (process.platform === "win32" ? ".exe" : "")), "");
  writeFileSync(join(root, "dump.sql"), "");
  const marker = join(root, "started-after-build");
  // Real children, with only command selection replaced: no Cargo/Docker dependency.
  writeFileSync(join(root, "preload.mjs"), `
    import cp from "node:child_process";
    import { syncBuiltinESMExports } from "node:module";
    const spawn = cp.spawn;
    cp.spawn = (command, args, options) => spawn(process.execPath, ["-e", command === "cargo"
      ? "setTimeout(() => process.exit(7), 100)"
      : ${JSON.stringify(`require("node:fs").writeFileSync(${JSON.stringify(marker)}, "started"); process.exit(1)`) }], options);
    syncBuiltinESMExports();
  `);
  const env = { ...process.env, YONA_GATE_DUMP: join(root, "dump.sql"), YONA_GATE_DATA_ROOT: join(root, "data") };
  delete env.YONA_GATE_SKIP_BUILD;
  const result = spawnSync(process.execPath, ["--import", join(root, "preload.mjs"), join(root, "scripts/release-gate.mjs")], { env, encoding: "utf8", timeout: 10_000 });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cargo exited 7/);
  assert.equal(existsSync(marker), false);
});
