// Phase 6 release gate: golden legacy Yona 1.16 fixture -> in-place Yoram adoption.
//
// Flow (plan Phase 6 items 1-4):
//   1. start a MariaDB container with the golden dump loaded
//   2. snapshot BEFORE (domain counts, row values, git refs, svn youngest, upload digests)
//   3. `yona-migrate preflight --db-url ... --data-root ...` must pass
//   4. boot yoram validate_only (asserts seaql_migrations stays absent)
//   5. boot yoram adopt (asserts seaql_migrations appears)
//   6. snapshot AFTER and compare — only schema metadata may change
//   7. HTTP assertions: legacy-hash login, pages render, mutation works,
//      attachment bytes identical to the uploads/{hash} file
//   YONA_GATE_DUMP        default fixtures/legacy-yona-1.16/legacy-yona-mariadb-dump.sql
//   YONA_GATE_DATA_ROOT   default fixtures/legacy-yona-1.16/YONA_DATA
//   YONA_LEGACY_MARIADB_IMAGE default mariadb:10.11 (fixture was built on 10.11)
//   YONA_GATE_SKIP_BUILD  set to skip cargo build when the binary already exists
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const dumpPath = resolve(repoRoot, process.env.YONA_GATE_DUMP ?? "fixtures/legacy-yona-1.16/legacy-yona-mariadb-dump.sql");
const dataRoot = resolve(repoRoot, process.env.YONA_GATE_DATA_ROOT ?? "fixtures/legacy-yona-1.16/YONA_DATA");
const image = process.env.YONA_LEGACY_MARIADB_IMAGE ?? "mariadb:10.11";
const migrateBin = join(repoRoot, "target", "debug", process.platform === "win32" ? "yona-migrate.exe" : "yona-migrate");
const serverBin = join(repoRoot, "target", "debug", process.platform === "win32" ? "yoram.exe" : "yoram");
const LEGACY_PASSWORD = "legacy-gate-pass";

function fail(message) {
  throw new Error(`release-gate: ${message}`);
}

if (!existsSync(dumpPath)) fail(`golden dump not found: ${dumpPath} (see fixtures/legacy-yona-1.16/META.md)`);
if (!existsSync(dataRoot)) fail(`YONA_DATA root not found: ${dataRoot}`);
if (!existsSync(migrateBin)) fail(`yona-migrate binary missing at ${migrateBin}; build it first (cargo build -p yona-migrate)`);
if (!process.env.YONA_GATE_SKIP_BUILD) {
  console.error("building yoram server binary...");
  await run("cargo", ["build", "-p", "yoram-server", "--bin", "yoram", "--features", "db-matrix"]);
}
if (!existsSync(serverBin)) fail(`yoram binary missing at ${serverBin}`);

function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit" });
  if (!options.capture) return Promise.resolve();
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  return new Promise((resolvePromise, rejectPromise) => {
    child.on("error", rejectPromise);
    child.on("close", (code) => (code === 0 ? resolvePromise({ stdout, stderr }) : rejectPromise(new Error(`${command} exited ${code}: ${stderr.slice(0, 4000)}`))));
  });
}

function execSql(containerId, sql) {
  return run("docker", ["exec", containerId, "mariadb", "-uroot", "-N", "-e", `USE yona;\n${sql}`], { capture: true }).then((r) => r.stdout.trim());
}

async function waitForSql(containerId, sql, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await execSql(containerId, sql);
    } catch {
      if (Date.now() > deadline) throw new Error(`SQL never succeeded: ${sql}`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
    }
  }
}

function getFreePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolvePromise(port));
    });
  });
}

async function startServer(policy, databaseUrl) {
  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(serverBin, [], {
    cwd: repoRoot,
    env: {
      ...process.env,
      YONA_BIND_ADDR: `127.0.0.1:${port}`,
      YONA_DATABASE_URL: databaseUrl,
      YONA_SCHEMA_POLICY: policy,
      YONA_DATA: dataRoot,
      YONA_USE_EMBEDDED_ASSETS: "0",
      YONA_ASSET_ROOT: "frontend/dist",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  try {
    await waitForHttp(`${origin}/api/auth/session`);
    return { child, origin, port, output: () => output };
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${policy} server did not start: ${error.message}\n${output.slice(-4000)}`);
  }
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 401 || response.status === 403) return response;
    } catch {
    }
    if (Date.now() > deadline) throw new Error(`HTTP endpoint never became ready: ${url}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
}

async function stopServer(server) {
  if (server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  if (server.child.exitCode === null) server.child.kill("SIGKILL");
}

// ---------- snapshots -------------------------------------------------------

const DOMAIN_COUNTS = ["n4user", "project", "issue", "issue_comment", "posting", "posting_comment", "milestone", "attachment", "issue_label", "pull_request", "organization"];

async function snapshot(containerId) {
  const db = {};
  for (const table of DOMAIN_COUNTS) {
    db[table] = await execSql(containerId, `SELECT COUNT(*) FROM ${table};`);
  }
  db.selectedRows =
    (await execSql(
      containerId,
      "SELECT id, login_id, password, password_salt FROM n4user ORDER BY id;",
    )) +
    "\n---\n" +
    (await execSql(
      containerId,
      "SELECT id, title, number, state, project_id FROM issue ORDER BY id;",
    )) +
    "\n---\n" +
    (await execSql(containerId, "SELECT id, hash, size, container_type FROM attachment ORDER BY id;"));
  const vcs = {};
  walkRepos(join(dataRoot, "repo", "git"), ".git").forEach(({ owner, project, path }) => {
    vcs[`git:${owner}/${project}`] = runCaptureSync("git", ["for-each-ref"], path);
  });
  walkRepos(join(dataRoot, "repo", "svn"), null).forEach(({ owner, project, path }) => {
    // Youngest revision is the first field of db/current; UUID identifies the store.
    vcs[`svn:${owner}/${project}:youngest`] = readFileSync(join(path, "db", "current"), "utf8").split(/\s+/u)[0];
    vcs[`svn:${owner}/${project}:uuid`] = readFileSync(join(path, "db", "uuid"), "utf8").trim();
  });
  const uploads = {};
  collectFiles(join(dataRoot, "uploads")).forEach((file) => {
    uploads[file] = createHash("sha256").update(readFileSync(file)).digest("hex");
  });
  return { db, vcs, uploads };
}

function runCaptureSync(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed in ${cwd}: ${result.stderr}`);
  return result.stdout;
}

function walkRepos(root, suffix, prefix = []) {
  if (!existsSync(root)) return [];
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (!entry.isDirectory() || entry.name === ".staging") continue;
    if (suffix ? entry.name.endsWith(suffix) : existsSync(join(path, "format"))) {
      const name = suffix ? entry.name.slice(0, -suffix.length) : entry.name;
      const parts = [...prefix, name];
      found.push({ owner: parts.slice(0, -1).join("/"), project: parts.at(-1), path });
    } else {
      found.push(...walkRepos(path, suffix, [...prefix, entry.name]));
    }
  }
  return found;
}

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...collectFiles(path));
    else found.push(path);
  }
  return found.sort();
}

function assertSnapshotsIdentical(before, after) {
  const problems = [];
  for (const key of Object.keys(before.db)) {
    if (String(before.db[key]) !== String(after.db[key])) {
      problems.push(`domain count changed: ${key} ${before.db[key]} -> ${after.db[key]}`);
    }
  }
  if (before.db.selectedRows !== after.db.selectedRows) problems.push("selected row values changed");
  for (const key of Object.keys(before.vcs)) {
    if (before.vcs[key] !== after.vcs[key]) problems.push(`VCS invariant changed: ${key}`);
  }
  for (const key of Object.keys(before.uploads)) {
    if (after.uploads[key] !== before.uploads[key]) problems.push(`upload digest changed: ${key}`);
  }
  const newUploads = Object.keys(after.uploads).filter((key) => !(key in before.uploads));
  if (newUploads.length > 0) problems.push(`unexpected new upload files: ${newUploads.join(", ")}`);
  return problems;
}

// ---------- HTTP assertions -------------------------------------------------

async function signInLegacyUser(server) {
  // sign-in requires an anonymous pilot session + CSRF token; prime both.
  const primed = await fetch(`${server.origin}/api/auth/session`);
  let csrfToken = primed.headers.get("x-csrf-token") ?? "";
  let cookies = (primed.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]);
  const signIn = await fetch(`${server.origin}/api/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken, cookie: cookies.join("; ") },
    body: JSON.stringify({ identifier: "kris", password: LEGACY_PASSWORD, rememberMe: false }),
  });
  if (!signIn.ok) {
    fail(`legacy-hash sign-in failed (${signIn.status}): ${(await signIn.text()).slice(0, 500)}\n${server.output().slice(-2000)}`);
  }
  cookies = cookies.concat((signIn.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]));
  const session = await fetch(`${server.origin}/api/auth/session`, { headers: { cookie: cookies.join("; ") } });
  csrfToken = session.headers.get("x-csrf-token") ?? csrfToken;
  return { authCookie: [...new Set(cookies)].join("; "), csrfToken };
}

// ---------- main ------------------------------------------------------------

let containerId;
try {
  const mariadbPort = await getFreePort();
  const runResult = await run(
    "docker",
    [
      "run", "--rm", "-d",
      "-p", `127.0.0.1:${mariadbPort}:3306`,
      "-e", "MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1",
      "-e", "MARIADB_DATABASE=yona",
      "-v", `${realpathSync(dumpPath)}:/docker-entrypoint-initdb.d/001-yona-dump.sql:ro`,
      image,
    ],
    { capture: true },
  );
  containerId = runResult.stdout.trim();
  if (!containerId) fail("docker run did not return a container id");

  await waitForSql(containerId, "SELECT COUNT(*) FROM yona.n4user;");
  const databaseUrl = `mysql://root@127.0.0.1:${mariadbPort}/yona`;

  console.error("[gate] BEFORE snapshot...");
  const before = await snapshot(containerId);

  console.error("[gate] preflight...");
  const preflight = await run(
    migrateBin,
    ["preflight", "--db-url", databaseUrl, "--data-root", dataRoot],
    { capture: true },
  ).catch((error) => fail(`preflight failed:\n${error.message}`));
  console.error(preflight.stdout + preflight.stderr);

  console.error("[gate] validate_only boot...");
  const validateOnly = await startServer("validate_only", databaseUrl);
  await stopServer(validateOnly);
  const migrationsAfterValidate = await execSql(
    containerId,
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='seaql_migrations';",
  );

  console.error("[gate] adopt boot...");
  const adopt = await startServer("adopt", databaseUrl);
  const adoptedVersion = await waitForSql(containerId, "SELECT version FROM seaql_migrations LIMIT 1;", 180_000);

  console.error("[gate] AFTER snapshot + comparison...");
  const after = await snapshot(containerId);
  const drift = assertSnapshotsIdentical(before, after);
  if (drift.length > 0) fail(`in-place adoption was lossy:\n  - ${drift.join("\n  - ")}`);

  console.error("[gate] HTTP assertions...");
  if (adopt.child.exitCode !== null) fail("adopt server exited before HTTP assertions");
  const { authCookie, csrfToken } = await signInLegacyUser(adopt);
  const pageChecks = ["/kris/sample-app", "/kris/sample-app/issue/1", "/kris/sample-app/board/1"];
  for (const path of pageChecks) {
    const response = await fetch(`${adopt.origin}${path}`, { headers: { cookie: authCookie }, redirect: "manual" });
    if (![200, 302].includes(response.status)) fail(`page ${path} rendered ${response.status}`);
  }

  const commentResponse = await fetch(`${adopt.origin}/api/v1/projects/kris/sample-app/issues/1/comments`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken, cookie: authCookie },
    body: JSON.stringify({ contentsMarkdown: "release-gate mutation probe" }),
  });
  if (!commentResponse.ok) fail(`mutation flow failed on comment POST (${commentResponse.status}): ${(await commentResponse.text()).slice(0, 500)}`);

  const attachmentRow = await execSql(
    containerId,
    "SELECT hash FROM attachment WHERE id=6002;",
  );
  const expectedBytes = readFileSync(join(dataRoot, "uploads", attachmentRow));
  const downloadResponse = await fetch(`${adopt.origin}/files/6002`, { headers: { cookie: authCookie } });
  if (!downloadResponse.ok) fail(`attachment download failed (${downloadResponse.status})`);
  const downloaded = Buffer.from(await downloadResponse.arrayBuffer());
  if (!downloaded.equals(expectedBytes)) fail("attachment bytes differ from uploads/{hash} file");

  await stopServer(adopt);

  const result = {
    dump: dumpPath.replace(`${repoRoot}/`, ""),
    data_root: dataRoot.replace(`${repoRoot}/`, ""),
    image,
    validate_only_left_migration_table_absent: migrationsAfterValidate === "0",
    adopted_version: adoptedVersion,
    domain_counts_identical_after_adopt: true,
    git_refs_svn_revisions_upload_digests_identical: true,
    legacy_hash_login: "ok",
    pages_rendered: pageChecks,
    mutation_flow: "issue comment created",
    attachment_bytes_identical: true,
  };
  if (!result.validate_only_left_migration_table_absent || !result.adopted_version) {
    fail(`gate contract violated: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (containerId) {
    await run("docker", ["rm", "-f", containerId], { capture: true }).catch((error) => console.error(error.message));
  }
}

