import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  buildPlaywrightE2eRuntime,
  createPlaywrightE2eRunToken,
  reserveOpenPort,
} from "./playwright-e2e-runtime.mjs";
import { normalizePlaywrightArgs } from "./playwright-e2e-args.mjs";

const READY_TIMEOUT_MS = 60_000;
const READY_POLL_INTERVAL_MS = 250;
const KILL_GRACE_MS = 2_000;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const frontendDirectory = path.join(repoRoot, "frontend");

function resolveSpawn(command, args) {
  if (process.platform === "win32" && command === "pnpm") {
    return {
      args: ["/d", "/s", "/c", "pnpm", ...args],
      command: "cmd.exe",
    };
  }

  return {
    args,
    command,
  };
}

async function createRuntime() {
  const runToken = createPlaywrightE2eRunToken();
  const frontendPort = await reserveOpenPort();
  let backendPort = await reserveOpenPort();
  while (backendPort === frontendPort) {
    backendPort = await reserveOpenPort();
  }

  return buildPlaywrightE2eRuntime({
    backendPort,
    frontendPort,
    repoRoot,
    runToken,
  });
}

function createRuntimeEnv(runtime) {
  return {
    ...process.env,
    ...runtime.backendEnv,
    ...runtime.frontendEnv,
    YONA_E2E_MANAGED_SERVERS: "1",
  };
}

function spawnTracked(name, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== "win32",
  });
  const state = {
    child,
    code: null,
    name,
    signal: null,
    settled: false,
  };

  child.once("exit", (code, signal) => {
    state.code = code;
    state.signal = signal;
    state.settled = true;
  });

  child.once("error", (error) => {
    state.error = error;
    state.settled = true;
  });

  return state;
}

function spawnManagedServer(name, args, env) {
  return spawnTracked(name, "node", args, {
    cwd: frontendDirectory,
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function isStillRunning(state) {
  if (state.settled || !state.child.pid) {
    return false;
  }

  try {
    process.kill(state.child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

function waitForExit(state, timeoutMs = null) {
  if (state.settled) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = timeoutMs === null ? null : setTimeout(resolve, timeoutMs);
    state.child.once("exit", () => {
      if (timer) {
        clearTimeout(timer);
      }
      resolve();
    });
  });
}

async function runTaskkill(pid) {
  await new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    killer.once("exit", resolve);
    killer.once("error", resolve);
  });
}

function releaseChildHandle(state) {
  if (typeof state.child.unref === "function") {
    state.child.unref();
  }
}

async function killProcessTree(state) {
  if (!state.child.pid || state.settled) {
    releaseChildHandle(state);
    return;
  }

  if (process.platform === "win32") {
    await runTaskkill(state.child.pid);
    await waitForExit(state, KILL_GRACE_MS);
    releaseChildHandle(state);
    return;
  }

  try {
    process.kill(-state.child.pid, "SIGTERM");
  } catch {
    releaseChildHandle(state);
    return;
  }

  await waitForExit(state, KILL_GRACE_MS);
  if (!isStillRunning(state)) {
    releaseChildHandle(state);
    return;
  }

  try {
    process.kill(-state.child.pid, "SIGKILL");
  } catch {
    releaseChildHandle(state);
    return;
  }

  await waitForExit(state, KILL_GRACE_MS);
  releaseChildHandle(state);
}

async function shutdown(states) {
  await Promise.all(states.map((state) => killProcessTree(state)));
}

async function fetchReady(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2_000),
    });
    const ready = response.status < 500;
    await response.arrayBuffer().catch(() => {});
    return ready;
  } catch {
    return false;
  }
}

function formatEarlyExit(state) {
  if (state.error) {
    return `${state.name} failed to start: ${state.error.message}`;
  }

  if (!state.settled) {
    return null;
  }

  const suffix = state.signal ? `signal ${state.signal}` : `exit code ${state.code ?? 1}`;
  return `${state.name} exited before readiness (${suffix}).`;
}

async function waitForReady(name, url, serverStates) {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const earlyExit = serverStates.map(formatEarlyExit).find(Boolean);
    if (earlyExit) {
      throw new Error(earlyExit);
    }

    if (await fetchReady(url)) {
      return;
    }

    await sleep(READY_POLL_INTERVAL_MS);
  }

  throw new Error(`${name} did not become ready at ${url} within ${READY_TIMEOUT_MS}ms.`);
}

async function runPlaywright(forwardedArgs, env) {
  const next = resolveSpawn("pnpm", ["exec", "playwright", "test", ...forwardedArgs]);
  const state = spawnTracked("playwright", next.command, next.args, {
    cwd: frontendDirectory,
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });

  await waitForExit(state);

  if (state.error) {
    throw state.error;
  }

  if (state.signal) {
    return 1;
  }

  return state.code ?? 1;
}

async function main() {
  const runtime = await createRuntime();
  const env = createRuntimeEnv(runtime);
  const forwardedArgs = normalizePlaywrightArgs(process.argv.slice(2));
  const serverStates = [
    spawnManagedServer("backend", ["../scripts/run-dev-backend-once.mjs"], env),
    spawnManagedServer("frontend", ["../scripts/run-e2e-frontend.mjs"], env),
  ];
  let shuttingDown = false;

  const stopFromSignal = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    void shutdown(serverStates).finally(() => {
      process.kill(process.pid, signal);
    });
  };

  process.once("SIGINT", stopFromSignal);
  process.once("SIGTERM", stopFromSignal);

  try {
    console.log(`[playwright-e2e] backend: ${runtime.backendSessionUrl}`);
    console.log(`[playwright-e2e] frontend: ${runtime.frontendUrl}`);
    console.log(`[playwright-e2e] frontend session: ${runtime.frontendSessionUrl}`);
    await waitForReady("backend", runtime.backendSessionUrl, serverStates);
    await waitForReady("frontend", runtime.frontendUrl, serverStates);
    await waitForReady("frontend session", runtime.frontendSessionUrl, serverStates);
    const exitCode = await runPlaywright(forwardedArgs, env);
    console.log(`[playwright-e2e] playwright exited with code ${exitCode}`);
    return exitCode;
  } finally {
    process.off("SIGINT", stopFromSignal);
    process.off("SIGTERM", stopFromSignal);
    console.log("[playwright-e2e] stopping managed servers");
    await shutdown(serverStates);
    console.log("[playwright-e2e] managed servers stopped");
  }
}

try {
  process.exit(await main());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
