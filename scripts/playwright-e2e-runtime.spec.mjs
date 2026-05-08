import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlaywrightE2eRuntime } from "./playwright-e2e-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");

test("buildPlaywrightE2eRuntime derives isolated origins and runtime paths for one run", () => {
  const runtime = buildPlaywrightE2eRuntime({
    backendPort: 43102,
    frontendPort: 43101,
    repoRoot,
    runToken: "run-a",
  });

  assert.deepEqual(
    {
      backendOrigin: runtime.backendOrigin,
      backendSessionUrl: runtime.backendSessionUrl,
      frontendSessionUrl: runtime.frontendSessionUrl,
      frontendOrigin: runtime.frontendOrigin,
      frontendUrl: runtime.frontendUrl,
      runtimeDirectory: path.relative(repoRoot, runtime.runtimeDirectory),
    },
    {
      backendOrigin: "http://127.0.0.1:43102",
      backendSessionUrl: "http://127.0.0.1:43102/yona/api/auth/session",
      frontendSessionUrl: "http://127.0.0.1:43101/yona/api/auth/session",
      frontendOrigin: "http://127.0.0.1:43101",
      frontendUrl: "http://127.0.0.1:43101/yona/",
      runtimeDirectory: path.join(".yona-data", "e2e", "run-a"),
    },
  );
  assert.equal(runtime.backendEnv.YONA_DEV_RUNTIME_DIR, runtime.runtimeDirectory);
  assert.equal(
    runtime.frontendEnv.YONA_E2E_FRONTEND_SESSION_URL,
    "http://127.0.0.1:43101/yona/api/auth/session",
  );
});

test("buildPlaywrightE2eRuntime gives each run its own isolated runtime directory", () => {
  const first = buildPlaywrightE2eRuntime({
    backendPort: 43112,
    frontendPort: 43111,
    repoRoot,
    runToken: "run-a",
  });
  const second = buildPlaywrightE2eRuntime({
    backendPort: 43122,
    frontendPort: 43121,
    repoRoot,
    runToken: "run-b",
  });

  assert.notEqual(first.runtimeDirectory, second.runtimeDirectory);
  assert.notEqual(first.backendEnv.YONA_DEV_RUNTIME_DIR, second.backendEnv.YONA_DEV_RUNTIME_DIR);
});
