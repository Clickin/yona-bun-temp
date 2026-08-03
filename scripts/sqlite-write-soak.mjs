#!/usr/bin/env node
// SQLite write-path soak gate (plan WS7.5.3).
//
// Boots the dev backend against a fresh temp file-backed SQLite DB (WAL +
// FULL durability + single-writer coordinator), signs up a user, then fires
// concurrent issue-create REST requests (8 workers, ~1 req/s each) for
// YONA_SOAK_MINUTES (default 30). Asserts zero SQLITE_BUSY /
// SQLITE_BUSY_SNAPSHOT / "database is locked" / HTTP 5xx in the server log.
//
// Usage: node scripts/sqlite-write-soak.mjs
// Env:   YONA_SOAK_MINUTES (default 30), YONA_SOAK_PORT (default 3189),
//        YONA_SOAK_LOG (default .yona-data/sqlite-write-soak.log)
//
// Exit 0 = clean soak; exit 1 = busy/5xx/error evidence found.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");

const DURATION_MINUTES = Number(process.env.YONA_SOAK_MINUTES ?? 30);
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const WORKERS = 8;
const PORT = Number(process.env.YONA_SOAK_PORT ?? 3189);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE_PATH = "/yona";
const RUNTIME_DIR =
  process.env.YONA_SOAK_RUNTIME_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), "yona-sqlite-soak-"));
const LOG_PATH =
  process.env.YONA_SOAK_LOG ?? path.join(RUNTIME_DIR, "sqlite-write-soak.log");
const READY_TIMEOUT_MS = 120_000;
const SCAN_INTERVAL_MS = 5_000;

const FAILURE_PATTERNS = [
  /SQLITE_BUSY|BUSY_SNAPSHOT/i,
  /database is locked/i,
  /sqlite busy/i,
  /status\s*=\s*500\b/i,
  /500 Internal Server Error/i,
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCookies(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  const joined = values.length > 0 ? values.join("; ") : response.headers.get("set-cookie") ?? "";
  // Keep only name=value pairs (drop path/expires/etc. attributes).
  return joined
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.includes("="))
    .join("; ");
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, `${line}\n`);
}

async function waitForReady(child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`dev backend exited early (code=${child.exitCode} signal=${child.signalCode})`);
    }
    try {
      const response = await fetch(`${ORIGIN}${BASE_PATH}/api/auth/session`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) {
        return;
      }
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`dev backend did not become ready at ${ORIGIN} within ${READY_TIMEOUT_MS}ms`);
}

async function establishSession() {
  // 1. Anonymous session bootstrap -> CSRF token + cookie.
  const bootstrap = await fetch(`${ORIGIN}${BASE_PATH}/api/auth/session`);
  if (!bootstrap.ok) {
    throw new Error(`session bootstrap failed with HTTP ${bootstrap.status}`);
  }
  const anonymousCsrf = bootstrap.headers.get("x-csrf-token");
  const anonymousCookie = extractCookies(bootstrap);
  if (!anonymousCsrf) {
    throw new Error("session bootstrap did not return a CSRF token");
  }

  // 2. Sign up a user (auto-authenticates when signup confirm is disabled).
  const form = new URLSearchParams({
    loginId: "soakuser",
    name: "Soak User",
    email: "soak@example.com",
    password: "soakpass1234",
    retypedPassword: "soakpass1234",
  });
  const signup = await fetch(`${ORIGIN}${BASE_PATH}/users/signup`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-csrf-token": anonymousCsrf,
      cookie: anonymousCookie,
    },
    body: form.toString(),
  });
  const sessionCookie = extractCookies(signup);
  const sessionCsrf = signup.headers.get("x-csrf-token");
  if (!sessionCookie || !sessionCsrf) {
    const body = await signup.text().catch(() => "");
    throw new Error(
      `signup did not authenticate (HTTP ${signup.status}, csrf=${Boolean(sessionCsrf)}, cookie=${Boolean(sessionCookie)}): ${body.slice(0, 300)}`,
    );
  }
  log(`signup ok: session cookie + csrf token (HTTP ${signup.status})`);
  return { cookie: sessionCookie, csrfToken: sessionCsrf };
}

async function runWorker(workerId, { cookie, csrfToken, durationMs, counters, failures }) {
  const deadline = Date.now() + durationMs;
  let requestId = 0;
  while (Date.now() < deadline) {
    const startedAt = Date.now();
    try {
      const response = await fetch(
        `${ORIGIN}${BASE_PATH}/api/v1/projects/pilot/yona/issues`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
            cookie,
          },
          body: JSON.stringify({
            assigneeLoginId: "",
            attachmentIds: [],
            bodyMarkdown: `soak body ${workerId}-${requestId}`,
            dueDate: "",
            isDraft: false,
            isPublish: false,
            labelIds: [],
            title: `soak ${workerId}-${requestId}`,
          }),
        },
      );
      await response.arrayBuffer().catch(() => {});
      counters.total += 1;
      if (response.status >= 500) {
        failures.push(`worker ${workerId} request ${requestId}: HTTP ${response.status}`);
      } else if (response.status >= 400) {
        failures.push(`worker ${workerId} request ${requestId}: HTTP ${response.status}`);
      } else {
        counters.created += 1;
      }
    } catch (error) {
      failures.push(`worker ${workerId} request ${requestId}: fetch error: ${error.message}`);
    }
    requestId += 1;
    // Pace ~1 request/second per worker.
    await sleep(Math.max(0, 1000 - (Date.now() - startedAt)));
  }
  return requestId;
}

async function main() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(LOG_PATH, `sqlite write soak started at ${new Date().toISOString()}\n`);

  log(`runtime dir: ${RUNTIME_DIR}`);
  log(`log file: ${LOG_PATH}`);
  log(`duration: ${DURATION_MINUTES} min, workers: ${WORKERS}, port: ${PORT}`);

  const child = spawn("node", ["scripts/run-dev-backend-once.mjs"], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      YONA_DEV_RUNTIME_DIR: RUNTIME_DIR,
      YONA_DEV_PUBLIC_ORIGIN: ORIGIN,
      YONA_PUBLIC_ORIGIN: ORIGIN,
      YONA_BIND_ADDR: `127.0.0.1:${PORT}`,
      YONA_DEV_BASE_PATH: BASE_PATH,
      YONA_AUTH_SIGNUP_REQUIRE_CONFIRM: "false",
      RUST_LOG: "info",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logBuffer = [];
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      const text = chunk.toString();
      fs.appendFileSync(LOG_PATH, text);
      logBuffer.push(text);
      if (logBuffer.length > 200) {
        logBuffer.shift();
      }
    });
  }

  const failures = [];
  const counters = { created: 0, total: 0 };
  let scanCount = 0;

  const scanner = setInterval(() => {
    scanCount += 1;
    const haystack = logBuffer.join("");
    for (const pattern of FAILURE_PATTERNS) {
      if (pattern.test(haystack)) {
        failures.push(`server log matched ${pattern}`);
      }
    }
  }, SCAN_INTERVAL_MS);

  try {
    log("waiting for dev backend readiness...");
    await waitForReady(child);
    log("dev backend ready");

    const { cookie, csrfToken } = await establishSession();
    log("starting workers");

    const startedAt = Date.now();
    const workers = Array.from({ length: WORKERS }, (_, index) =>
      runWorker(index + 1, {
        cookie,
        csrfToken,
        durationMs: DURATION_MS,
        counters,
        failures,
      }),
    );
    await Promise.all(workers);
    log(`workers finished after ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);

    // One final scan pass after the last writes flush.
    await sleep(SCAN_INTERVAL_MS);
  } finally {
    clearInterval(scanner);
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }

  const uniqueFailures = [...new Set(failures)];
  log(
    `summary: created=${counters.created} total=${counters.total} ` +
      `failures=${uniqueFailures.length} scans=${scanCount}`,
  );
  if (uniqueFailures.length > 0) {
    for (const failure of uniqueFailures.slice(0, 20)) {
      log(`FAILURE: ${failure}`);
    }
    log(`soak FAILED — full log at ${LOG_PATH}`);
    process.exit(1);
  }
  log(`soak PASSED (${counters.created} issues created, zero busy/5xx evidence) — log at ${LOG_PATH}`);
  process.exit(0);
}

main().catch((error) => {
  log(`soak aborted: ${error.stack ?? error.message}`);
  process.exit(1);
});
