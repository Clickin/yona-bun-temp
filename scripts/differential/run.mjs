// Differential parity sweep orchestrator.
//
// Boots the legacy yona-h2 parity instance (scripts/legacy-localhost.mjs) and a
// Yoram instance side by side, runs the smoke scenario DSL through dual
// adapters, compares API responses / rendered DOM skeletons / SQL semantic
// projections, and writes .agent/differential/report.json plus a stdout summary.
//
// Usage: node scripts/differential/run.mjs [--legacy-url URL] [--yoram-port N] [--scenario ID ...]

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";


import { LegacySession, YoramSession } from "./adapters.mjs";
import {
  diffProjections,
  diffSkeletons,
  filterRowsByTag,
  normalizeApiValue,
  projectCommentRows,
  projectIssueRows,
  ISSUE_STATE_ENCODINGS,
  projectLabelRows,
} from "./diff.mjs";
import { dedupeH2RecoverSequences, dedupeRebuiltTableRows, h2JarPath, queryLegacyH2, queryYoramSqlite, replayH2Script } from "./db-projection.mjs";
import {
  HarnessError,
  formatSummary,
  reclassifyScenarioViolations,
  summarizeExecution,
  violation,
  writeReport,
} from "./report.mjs";
import { launchWtrBrowser } from "../wtr-browser.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultOutputDir = path.join(repoRoot, ".agent/differential");
let outputDir = path.resolve(process.env.YONA_DIFFERENTIAL_OUTPUT_DIR ?? defaultOutputDir);
import { buildBehaviorVerification, matchBehaviors, validateScenarios } from "./dsl.mjs";
import { ACTION_DEFINITIONS, scenarios } from "./scenarios/index.mjs";
let yoramRuntimeDir = path.join(outputDir, "yoram");

const PARITY_USERS = [
  { loginId: "admin", name: "Site Admin", email: "admin@example.com" },
  { loginId: "alice", name: "Alice Kim", email: "alice@example.com" },
  { loginId: "bob", name: "Bob Park", email: "bob@example.com" },
  { loginId: "carol", name: "Carol Lee", email: "carol@example.com" },
];

// Keep the default-dev pull-request contract intact, but make the comparison
// fixture deterministic on both database engines. R13 creates PR #2 after
// this seed, so stale rows must not affect number allocation.
export const PARITY_PULL_REQUEST = Object.freeze({
  body: "",
  fromBranch: "main",
  number: 1,
  state: 1,
  title: "Add feature branch change",
  toBranch: "feature/ui",
});
export const PARITY_REVIEW = Object.freeze({
  contents: "Review the feature branch parity fixture.",
  path: "parity-feature.txt",
});

export function registrationStatusIsUsable(status) {
  return status === 200 || status === 409;
}

// Keep the public expression-list catalog stable even though old sweeps leave
// behind projects with auto-generated names. These are the rows present in the
// legacy parity fixture and therefore the only project rows Yoram needs.
const PARITY_SHARABLE_PROJECTS = [
  { id: 1, owner: "admin", name: "sample", vcs: "GIT" },
  { id: 2, owner: "admin", name: "svnplayground", vcs: "Subversion" },
  { id: 3, owner: "alice", name: "sample", vcs: "GIT" },
  { id: 262, owner: "admin", name: "parity-git-wvamt5efl73", vcs: "GIT" },
  { id: 267, owner: "admin", name: "parity-svn-wvbmt5esi2l", vcs: "Subversion" },
  { id: 268, owner: "admin", name: "parity-svn-wvbmt5etjsa", vcs: "Subversion" },
];


export const SKELETON_EXTRACT = (selector) => {
  const root = selector ? document.querySelector(selector) : document.body;
  if (!root) throw new Error(`selector not found: ${selector}`);
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "HEAD", "META", "LINK", "BR", "PATH", "TEMPLATE"]);
  const entries = [];
  const visit = (element) => {
    if (!skip.has(element.tagName)) {
      const className = typeof element.className === "string" ? element.className.trim() : "";
      let text = "";
      for (const node of element.childNodes) {
        if (node.nodeType === 3) text += node.textContent;
      }
      text = text.replace(/\s+/gu, " ").trim();
      if (className || text) {
        let tag = element.tagName.toLowerCase();
        // Sanctioned side-effect anchor marker — must decide exactly like
        // sideEffectAnchorTag in diff.mjs (this function is serialized into
        // the browser, so the logic is inlined here; run.spec.mjs sync-guards
        // the pair). Marked anchors normalize to the button tag for
        // comparison only; navigational anchors stay plain `a` and keep
        // anchor-vs-button role drift visible.
        if (tag === "a") {
          const href = (element.getAttribute("href") ?? "").trim().toLowerCase();
          const navigational = href !== "" && !href.startsWith("#") && !href.startsWith("javascript:");
          const dataToggle = element.getAttribute("data-toggle");
          const behavioralToggle = dataToggle !== null && !/^(tooltip|popover)$/iu.test(dataToggle);
          if (!navigational || element.hasAttribute("data-request-method") || element.hasAttribute("data-request-uri") || behavioralToggle) {
            tag = "a#";
          }
        }
        entries.push(`${tag}${className ? `.${className.split(/\s+/u).join(".")}` : ""}:${text}`);
      }
    }
    for (const child of element.children) visit(child);
  };
  visit(root);
  return entries;
};

// Visible popovers only: legacy bootstrap appends .popover to body on hover,
// Yoram renders it inside the anchor; both use the title/content shell.
const POPOVER_EXTRACT = () => {
  const entries = [];
  for (const el of document.querySelectorAll(".popover")) {
    if (el.getClientRects().length === 0) continue;
    const text = (selector) => (el.querySelector(selector)?.textContent ?? "").replace(/\s+/gu, " ").trim();
    entries.push(`div.popover:${text(".popover-title")}|${text(".popover-content")}`);
  }
  return entries;
};

const BROWSER_STEP_TIMEOUT_MS = 15_000;

function raceTimeout(promise, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${BROWSER_STEP_TIMEOUT_MS}ms`)), BROWSER_STEP_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function visiblePopoverCount(page) {
  return page.evaluate(() => [...document.querySelectorAll(".popover")].filter((el) => el.getClientRects().length > 0).length);
}

async function pollPopover(page) {
  for (let waited = 0; (await visiblePopoverCount(page)) === 0 && waited < 1_500; waited += 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return (await visiblePopoverCount(page)) > 0;
}

// ponytail: page.hover()'s element-handle scroll path stalls CDP under sweep
// load (Runtime.callFunctionOn timeouts), so hover = raw mouse.move to the
// anchor center, then a synthetic mouseover/mouseenter fallback.
async function hoverAnchor(page, selector) {
  const point = await raceTimeout(
    (async () => {
      // The Yoram SPA can commit the anchor into the DOM after the load
      // event, so poll instead of one-shot querySelector (legacy SSR pages
      // have it in the initial HTML and resolve on the first probe).
      for (let waited = 0; waited < 5_000; waited += 100) {
        const point = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }, selector);
        if (point) return point;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`selector not found: ${selector}`);
    })(),
    `locate ${selector}`,
  );
  await page.mouse.move(point.x - 24, point.y - 12);
  await page.mouse.move(point.x, point.y);
  if (await pollPopover(page)) return "mouse-move";
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
  }, selector);
  const shown = await pollPopover(page);
  if (!shown && process.env.DIFF_HOVER_DEBUG) console.error(`[hover-debug] ${selector}: no popover after both triggers`);
  return shown ? "synthetic" : "none";
}

export function parseArgs(argv) {
  const options = {
    legacyUrl: process.env.YONA_LEGACY_URL ?? "http://127.0.0.1:9000",
    yoramPort: null,
    scenarioIds: (process.env.YONA_DIFFERENTIAL_SCENARIO_IDS ?? "").split(",").filter(Boolean),
    partialReportPath: process.env.YONA_DIFFERENTIAL_PARTIAL_REPORT ?? null,
    outputDir: process.env.YONA_DIFFERENTIAL_OUTPUT_DIR ?? null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--legacy-url") options.legacyUrl = argv[++i];
    else if (argv[i] === "--yoram-port") options.yoramPort = Number(argv[++i]);
    else if (argv[i] === "--scenario") options.scenarioIds.push(argv[++i]);
    else if (argv[i] === "--scenarios") options.scenarioIds.push(...(argv[++i] ?? "").split(",").filter(Boolean));
    else if (argv[i] === "--partial-report") options.partialReportPath = argv[++i];
    else if (argv[i] === "--output-dir") options.outputDir = argv[++i];
  }
  return options;
}

export function selectScenarios(scenarioIds = []) {
  if (scenarioIds.length === 0) return scenarios;
  const selected = scenarios.filter((scenario) => scenarioIds.includes(scenario.id));
  const unknown = scenarioIds.filter((id) => !scenarios.some((scenario) => scenario.id === id));
  if (unknown.length > 0) throw new Error(`unknown scenario id(s): ${unknown.join(", ")}`);
  return selected;
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status > 0 && response.status < 500) return response.status;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = String(error.cause ?? error.message ?? error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  throw new Error(`timed out waiting for ${url}: ${lastError}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

// --- instance boot ----------------------------------------------------------

async function bootLegacy() {
  const result = await new Promise((resolve) => {
    const child = spawn("node", [path.join(repoRoot, "scripts/legacy-localhost.mjs"), "start"], {
      cwd: repoRoot,
      env: { ...process.env, YONA_LEGACY_EMAIL_VERIFICATION: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("exit", (code) => resolve({ code, output }));
  });
  if (result.code !== 0) throw new Error(`legacy boot failed:\n${result.output.slice(-2_000)}`);
  await waitForHttp(`${process.env.YONA_LEGACY_URL ?? "http://127.0.0.1:9000"}/users/loginform`);
}

async function stopLegacy() {
  await new Promise((resolve) => {
    const child = spawn("node", [path.join(repoRoot, "scripts/legacy-localhost.mjs"), "stop"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    child.on("exit", resolve);
    setTimeout(resolve, 30_000).unref?.();
  });
}
async function writeYoramConfig(databaseUrl, dataRoot, seedPilot, port, emailVerification = true) {
  const authEmailVerification = emailVerification ? "email_verification = true" : "email_verification = false";
  const config = [
    `bind_addr = ${JSON.stringify(`127.0.0.1:${port}`)}`,
    `database_url = ${JSON.stringify(databaseUrl)}`,
    `data_root = ${JSON.stringify(dataRoot)}`,
    `public_origin = ${JSON.stringify(`http://127.0.0.1:${port}`)}`,
    "asset_root = \"frontend/dist\"",
    `seed_pilot = ${seedPilot ? "true" : "false"}`,
    "use_embedded_assets = false",
    "",
    "[auth]",
    authEmailVerification,
    "",
    "[smtp]",
    "host = \"127.0.0.1\"",
    "port = 2525",
    "ssl = false",
  ].join("\n");
  writeFileSync(path.join(yoramRuntimeDir, "dev.toml"), `${config}\n`);
}

const yoramServerLog = path.join(yoramRuntimeDir, "server.log");

function startYoramProcess(port) {
  const binaryName = process.platform === "win32" ? "yoram.exe" : "yoram";
  const binaryPath = existsSync(path.join(repoRoot, "target/debug", binaryName))
    ? path.join(repoRoot, "target/debug", binaryName)
    : path.join(repoRoot, "target/release", binaryName);
  if (!existsSync(binaryPath)) throw new Error(`yoram binary not found (${binaryPath}); run cargo build -p yoram-server`);
  return spawn(binaryPath, {
    cwd: repoRoot,
    env: {
      ...process.env,
      YONA_BASE_PATH: "/",
      YONA_BIND_ADDR: `127.0.0.1:${port}`,
      YORAM_CONFIG_TOML: path.join(yoramRuntimeDir, "dev.toml"),
      // Sweep SMTP catch-box (scripts/differential/mail-sink.mjs) so email
      // token flows can be verified end to end.
      SMTP_ENABLED: process.env.SMTP_ENABLED ?? "true",
      SMTP_HOST: process.env.SMTP_HOST ?? "127.0.0.1",
      SMTP_PORT: process.env.SMTP_PORT ?? "2525",
      SMTP_SSL: "false",
      // Mock GitHub OAuth provider (functional-contract boundary): the sweep
      // asserts the authorize redirect and its params but never follows it;
      // nothing listens on :2526 by design.
      YONA_AUTH_SOCIAL_LOGIN_SUPPORT: "github",
      YONA_OAUTH_GITHUB_CLIENT_ID: "parity-client-id",
      YONA_OAUTH_GITHUB_CLIENT_SECRET: "parity-client-secret",
      YONA_OAUTH_GITHUB_AUTHORIZATION_URL: "http://127.0.0.1:2526/mock/oauth/authorize",
      YONA_OAUTH_GITHUB_ACCESS_TOKEN_URL: "http://127.0.0.1:2526/mock/oauth/token",
    },
    stdio: ["ignore", openSync(yoramServerLog, "a"), openSync(yoramServerLog, "a")],
  });
}

// Provision the same account/project names and passwords as the legacy
// parity instance (scripts/legacy-localhost.mjs) through Yoram's own REST
// surface, so both sides authenticate with identical credentials.

// Point the legacy parity instance's play2-mailplugin at the sweep SMTP
// catch-box; the conf lives under .agent and is never committed.
function patchLegacySmtpConf() {
  const confPath = path.join(repoRoot, ".agent/legacy-localhost/instances/parity/data/conf/application.conf");
  if (!existsSync(confPath)) return;
  const original = readFileSync(confPath, "utf8");
  const settings = [
    ["smtp.host", "127.0.0.1"],
    ["smtp.port", "2525"],
    ["smtp.ssl", "false"],
    ["smtp.mock", "false"],
    ["application.use.email.verification", "true"],
  ];
  let updated = original;
  for (const [key, value] of settings) {
    const pattern = new RegExp(`^${key.replaceAll(".", "\\.")}\\s*=.*$`, "mu");
    updated = pattern.test(updated) ? updated.replace(pattern, `${key} = ${value}`) : `${updated.trimEnd()}\n${key} = ${value}\n`;
  }
  if (updated !== original) writeFileSync(confPath, updated);
}

async function bootMailSink() {
  const child = spawn(process.execPath, [path.join(repoRoot, "scripts/differential/mail-sink.mjs")], {
    cwd: repoRoot,
    env: { ...process.env, MAIL_SINK_DIR: path.join(outputDir, "mail-out") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    let ready = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("mail sink did not start"));
    }, 5_000);
    const onOutput = (chunk) => {
      if (chunk.toString().includes("mail-sink listening")) {
        ready = true;
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.once("exit", (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`mail sink exited during startup (${code})`));
      }
    });
  });
  return child;
}

// Newest-first list of mails the sink has stored.
function readMails() {
  const mailDir = path.join(outputDir, "mail-out");
  if (!existsSync(mailDir)) return [];
  return readdirSync(mailDir)
    .filter((file) => file.endsWith(".eml"))
    .sort()
    .reverse()
    .map((file) => readFileSync(path.join(mailDir, file), "utf8"));
}

function clearMailOut() {
  const mailDir = path.join(outputDir, "mail-out");
  if (!existsSync(mailDir)) return;
  for (const file of readdirSync(mailDir)) {
    if (file.endsWith(".eml")) unlinkSync(path.join(mailDir, file));
  }
}

function decodeQuotedPrintable(text) {
  // Only unescape =XX when a MIME part declares quoted-printable; 7bit mails
  // carry literal "=65" sequences inside hex tokens (legacy reset URLs) that
  // must survive verbatim or the replayed link becomes invalid.
  if (!/content-transfer-encoding:[^\r\n]*quoted-printable/iu.test(text)) {
    return text.replaceAll("&amp;", "&");
  }
  return text
    .replace(/=\r?\n/gu, "")
    .replace(/=([0-9A-F]{2})/giu, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replaceAll("&amp;", "&");
}

// Absolute links inside one raw .eml whose path starts with `pathPrefix`.
function extractMailLinks(rawMail, pathPrefix) {
  const decoded = decodeQuotedPrintable(rawMail);
  return [...decoded.matchAll(/https?:\/\/[^\s"'<>)]+/gu)]
    .map((match) => match[0].replace(/[.,;:!?]+$/u, ""))
    .filter((url) => {
      try {
        return new URL(url).pathname.startsWith(pathPrefix);
      } catch {
        return false;
      }
    });
}

async function provisionYoramParityAccounts(baseUrl) {
  const session = new YoramSession(baseUrl);
  // Registration requires an anonymous pilot session + CSRF token; prime both.
  const primed = await fetch(`${baseUrl}/api/auth/session`);
  session.csrfToken = primed.headers.get("x-csrf-token") ?? "";
  session.cookies = (primed.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const users = [
    { loginId: "admin", password: "admin", name: "Site Admin", email: "admin@example.com" },
    { loginId: "carol", password: "carolcarol", name: "Carol Lee", email: "carol@example.com" },
    { loginId: "alice", password: "alice", name: "Alice Kim", email: "alice@example.com" },
    // ponytail: Yoram REST enforces LEGACY_MIN_PASSWORD_LENGTH=4 while the
    // legacy parity seed uses 3-char "bob"; bump until a bob actor scenario exists.
    { loginId: "bob", password: "bobbob", name: "Bob Park", email: "bob@example.com" },
  ];
  for (const user of users) {
    const result = await session.request({
      method: "POST",
      path: "/api/v1/auth/register",
      json: {
        emailAddress: user.email,
        loginId: user.loginId,
        name: user.name,
        password: user.password,
        retypedPassword: user.password,
      },
    });
    // Bootstrap may already have created the default admin before this
    // idempotent parity registration runs. The subsequent admin login below
    // verifies that the existing account is the expected one.
    if (!registrationStatusIsUsable(result.status)) {
      throw new Error(`yoram parity register ${user.loginId} failed: ${result.status} ${String(result.body).slice(0, 200)}`);
    }
  }
  const login = await session.login({ loginId: "admin", password: "admin" });
  if (login.status !== 200) throw new Error(`yoram parity admin sign-in failed: ${login.status}`);
  const project = await session.request({
    method: "POST",
    path: "/api/v1/owners/admin/projects",
    json: { projectName: "sample", overview: "Parity seed project for the admin workspace", projectScope: "PUBLIC" },
  });
  if (project.status !== 200 && project.status !== 409) {
    throw new Error(`yoram parity sample project create failed: ${project.status} ${String(project.body).slice(0, 200)}`);
  }
}

function reconcileYoramFixturesPreboot(databasePath) {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("pragma busy_timeout = 5000");
    const updateUser = database.prepare(
      "update n4user set name = ?, email = ?, state = 'active', english_name = ? where login_id = ?",
    );
    for (const user of PARITY_USERS) {
      updateUser.run(user.name, user.email, user.name, user.loginId);
    }
    database
      .prepare("update n4user set state = 'deleted' where login_id not in (?, ?, ?, ?) and state <> 'deleted'")
      .run(...PARITY_USERS.map((user) => user.loginId));
    database
      .prepare("delete from attachment where container_type = 'USER_AVATAR' and owner_login_id in (?, ?, ?, ?)")
      .run(...PARITY_USERS.map((user) => user.loginId));
  // Legacy parity foundation seeds the weblabs organization (id 1) with admin
  // as org_admin and carol as org_member; U12's org-favorite toggle and the
  // org screens need the org to exist on the Yoram side too. Role ids are not
  // stable across Yoram DBs (the app authorizes by role NAME, see
  // project_membership.rs), so resolve org_admin/org_member by name.
  const userIdByLogin = (loginId) =>
    Number(database.prepare("select id from n4user where login_id = ? limit 1").get(loginId)?.id ?? 0);
  const hasWeblabs =
    database.prepare("select count(*) as n from organization where id = 1 and name = 'weblabs'").get().n > 0;
  if (!hasWeblabs) {
    database
      .prepare("insert into organization (id, name, created, descr) values (1, 'weblabs', ?, 'Parity seed organization for localhost legacy verification')")
      .run(new Date().toISOString());
  }
  const ensureRole = (roleName) => {
    const existing = database.prepare("select id from role where name = ? limit 1").get(roleName);
    if (existing?.id) return Number(existing.id);
    const nextRoleId = Number(database.prepare("select coalesce(max(id), 0) + 1 as id from role").get().id ?? 1);
    database.prepare("insert into role (id, name, active) values (?, ?, 1)").run(nextRoleId, roleName);
    return nextRoleId;
  };
  const orgAdminRoleId = ensureRole("org_admin");
  const orgMemberRoleId = ensureRole("org_member");
  for (const [loginId, orgRoleId] of [["admin", orgAdminRoleId], ["carol", orgMemberRoleId]]) {
    const userId = userIdByLogin(loginId);
    if (!userId) continue;
    const hasMember =
      database
        .prepare("select count(*) as n from organization_user where organization_id = 1 and user_id = ?")
        .get(userId).n > 0;
    if (!hasMember) {
      database
        .prepare("insert into organization_user (user_id, organization_id, role_id) values (?, 1, ?)")
        .run(userId, orgRoleId);
    }
  }

    database.exec("pragma foreign_keys = off; begin");
    try {
      let movedSampleId = null;
      // The old persisted Yoram fixture used id=2 for admin/sample. Move that
      // history aside so the public expression-list IDs can match legacy's
      // svnplayground/sample rows without deleting its issue or repository.
      const oldSample = database
        .prepare("select id from project where id = 2 and owner = 'admin' and name = 'sample' limit 1")
        .get();
      if (oldSample) {
        const maxProjectId = Number(database.prepare("select coalesce(max(id), 0) as id from project").get().id ?? 0);
        const replacementId = Math.max(maxProjectId + 1, 1000);
        const tables = database
          .prepare("select name from sqlite_master where type = 'table' order by name")
          .all()
          .map((row) => row.name)
          .filter((tableName) => tableName !== "project");
        for (const tableName of tables) {
          const columns = database.prepare(`pragma table_info("${tableName.replaceAll('"', '""')}")`).all();
          if (columns.some((column) => column.name === "project_id")) {
            database
              .prepare(`update "${tableName.replaceAll('"', '""')}" set project_id = ? where project_id = ?`)
              .run(replacementId, 2);
          }
        }
        database.prepare("update project set id = ?, project_scope = 'private' where id = 2").run(replacementId);
        movedSampleId = replacementId;
      }

      // Keep old rows for archaeology, but make the public catalog deterministic.
      const projectPlaceholders = PARITY_SHARABLE_PROJECTS.map(() => "?").join(", ");
      database
        .prepare(`update project set project_scope = 'private' where id not in (${projectPlaceholders})`)
        .run(...PARITY_SHARABLE_PROJECTS.map((project) => project.id));
      const insertProject = database.prepare(
        `insert into project
          (id, name, overview, vcs, owner, created_date, last_issue_number,
           last_posting_number, default_reviewer_count, is_using_reviewer_count,
           project_scope, is_code_accessible_member_only)
         values (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'public', 0)`,
      );
      const updateProject = database.prepare(
        "update project set name = ?, overview = ?, vcs = ?, owner = ?, project_scope = 'public' where id = ?",
      );
      for (const project of PARITY_SHARABLE_PROJECTS) {
        const overview = `Differential parity fixture ${project.owner}/${project.name}`;
        const result = updateProject.run(project.name, overview, project.vcs, project.owner, project.id);
        if (Number(result.changes ?? 0) === 0) {
          insertProject.run(project.id, project.name, overview, project.vcs, project.owner, new Date().toISOString());
        }
      }

      const userId = (loginId) =>
        Number(database.prepare("select id from n4user where login_id = ? limit 1").get(loginId)?.id ?? 0);
      const replaceMembers = (projectId, members) => {
        database.prepare("delete from project_user where project_id = ?").run(projectId);
        const insertMember = database.prepare(
          "insert into project_user (user_id, project_id, role_id) values (?, ?, ?)",
        );
        for (const [loginId, roleId] of members) {
          insertMember.run(userId(loginId), projectId, roleId);
        }
      };
      for (const project of PARITY_SHARABLE_PROJECTS) {
        replaceMembers(
          project.id,
          project.id === 1
            ? [
                ["admin", 3],
                ["admin", 1],
              ]
            : project.id === 3
            ? [
                ["admin", 3],
                ["alice", 1],
              ]
            : [
                ["admin", 3],
                ["admin", 1],
              ],
        );
      }
      if (!movedSampleId) {
        const oldSample = database
          .prepare("select id from project where owner = 'admin' and name = 'sample' and id <> 1 limit 1")
        .get();
        movedSampleId = oldSample?.id ? Number(oldSample.id) : null;
      }
      if (movedSampleId) {
        database
          .prepare("update project set owner = 'admin', name = ?, project_scope = 'private' where id = ?")
          .run(`sample-history-${movedSampleId}`, movedSampleId);
        replaceMembers(movedSampleId, [["admin", 3], ["admin", 1]]);
      }
      database.exec("commit; pragma foreign_keys = on");
    } catch (error) {
      database.exec("rollback; pragma foreign_keys = on");
      throw new Error(`Yoram parity fixture reconciliation failed: ${error.message}`, { cause: error });
    }
  } finally {
    database.close();
  }
}

async function bootYoram(port) {
  mkdirSync(yoramRuntimeDir, { recursive: true });
  mkdirSync(path.join(yoramRuntimeDir, "data"), { recursive: true });
  const databasePath = path.join(yoramRuntimeDir, "yoram.db");
  const databaseUrl = `sqlite://${path.relative(repoRoot, databasePath).replaceAll("\\", "/")}?mode=rwc`;
  const dataRoot = `${path.relative(repoRoot, yoramRuntimeDir).replaceAll("\\", "/")}/data`;
  const children = [];

  const isFreshDb = !existsSync(databasePath) || statSync(databasePath).size === 0;
  if (isFreshDb) {
    // Phase 1: schema/pilot bootstrap, then REST-provision the parity accounts
    // and the admin/sample project that reconcileDefaultDevParitySeed expects.
    await writeYoramConfig(databaseUrl, dataRoot, true, port, false);
    const child = startYoramProcess(port);
    children.push(child);
    try {
      await waitForHttp(`http://127.0.0.1:${port}/api/auth/session`);
      await provisionYoramParityAccounts(`http://127.0.0.1:${port}`);
    } finally {
      await stopChild(child);
    }
  }

  reconcileYoramFixturesPreboot(databasePath);
  const seedModule = await import(pathToFileURL(path.join(repoRoot, "scripts/run-dev-backend-once.mjs")).href);
  seedModule.reconcileDefaultDevSiteAdmin(databasePath);
  seedModule.reconcileDefaultDevParitySeed(databasePath, yoramRuntimeDir);
  reconcileYoramPullRequestFixtures(databasePath);

  await writeYoramConfig(databaseUrl, dataRoot, false, port, true);
  const child = startYoramProcess(port);
  children.push(child);
  await waitForHttp(`http://127.0.0.1:${port}/api/auth/session`);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    databasePath,
    stop: () => Promise.all(children.map(stopChild)),
  };
}

// --- browser rendering ------------------------------------------------------

async function launchBrowserHandle() {
  const browser = await launchWtrBrowser();
  return { browser, close: () => browser.close() };
}

// React route shells expose these markers while their registered query group
// is still fetching. Waiting on the marker (after network idle) is stronger
// than accepting two equal samples: a wireframe is allowed to stay unchanged
// for an arbitrary number of renders and must never be a settled observation.
export const ROUTE_CONTENT_READY = (selector) => {
  const root = selector ? document.querySelector(selector) : document.body;
  if (!root) return false;
  const boundary = selector
    ? root.closest("[data-content-ready], [aria-busy], [data-wireframe]") ?? root
    : root;
  const pending = [
    boundary,
    ...boundary.querySelectorAll("[data-content-ready], [aria-busy], [data-wireframe]"),
  ];
  return !pending.some(
    (element) =>
      element.getAttribute("data-content-ready") === "false" ||
      element.getAttribute("aria-busy") === "true" ||
      element.hasAttribute("data-wireframe"),
  );
};

export async function renderSkeleton(page, url, { spa = false, selector } = {}) {
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  if (spa) {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {});
    await page.waitForFunction(ROUTE_CONTENT_READY, selector, { timeout: 15_000 });
  }
  return page.evaluate(SKELETON_EXTRACT, selector);
}

async function setCookiesFromHeader(page, baseUrl, header) {
  if (!header) return;
  for (const pair of header.split("; ").filter(Boolean)) {
    const eq = pair.indexOf("=");
    await page.setCookie({ name: pair.slice(0, eq), value: pair.slice(eq + 1), url: baseUrl });
  }
}

// --- sweep fixture alignment -------------------------------------------------

export const PARITY_LABEL_SEEDS = Object.freeze([
  { labelName: "bug", categoryName: "type", color: "#f44336" },
  { labelName: "parity", categoryName: "area", color: "#2196f3" },
]);

export async function alignParityLabelSeeds(session, base, labels) {
  for (const seed of PARITY_LABEL_SEEDS) {
    const row = labels.find((label) => label.name === seed.labelName);
    const matches =
      row &&
      (row.category ?? "").toLowerCase() === seed.categoryName.toLowerCase() &&
      (row.color ?? "").toLowerCase() === seed.color.toLowerCase();
    if (matches) continue;
    if (row) {
      await session.request({
        method: "POST",
        path: `${base}/admin/sample/issue/label/${row.id}/delete`,
        form: { _method: "delete" },
      });
    }
    await session.request({
      method: "POST",
      path: `${base}/admin/sample/issue/labels`,
      form: { labelName: seed.labelName, categoryName: seed.categoryName, labelColor: seed.color },
    });
  }
}

function gitRepoHasBranches(repoPath) {
  const result = spawnSync("git", ["--git-dir", repoPath, "for-each-ref", "refs/heads"], { encoding: "utf8" });
  return (result.stdout ?? "").trim().length > 0;
}

// Seed an orphan main + feature/ui pair so pull-request flows have a diffable
// repository on each side; idempotent — only fires while refs/heads is empty.
function seedRepoBranches(repoPath) {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "parity",
    GIT_AUTHOR_EMAIL: "parity@example.com",
    GIT_COMMITTER_NAME: "parity",
    GIT_COMMITTER_EMAIL: "parity@example.com",
    GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
  };
  const git = (args, input) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8", env, input });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
    return (result.stdout ?? "").trim();
  };
  const blob = git(["hash-object", "-w", "--stdin"], "parity seed\n");
  const tree = git(["mktree"], `100644 blob ${blob}\tREADME.md\n`);
  const commit = git(["commit-tree", tree, "-m", "parity seed commit"]);
  git(["update-ref", "refs/heads/main", commit]);
  git(["update-ref", "refs/heads/feature/ui", commit]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);
}

// Existing parity repositories may have been created by the old fallback
// seed, where main and feature/ui point at one commit. Keep the fixture's
// branch names but add one deterministic file to feature/ui so PR changes and
// merge flows exercise a real diff instead of legacy's null merge path.
function ensureDiffableRepoBranches(repoPath) {
  if (!gitRepoHasBranches(repoPath)) {
    seedRepoBranches(repoPath);
    return;
  }
  const git = (args, input) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8", input });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
    return (result.stdout ?? "").trim();
  };
  // Rebuild the feature commit with fixed identity/time even when an older
  // sweep left a same-content commit with a different author. This gives both
  // sides the same commit id, not merely the same branch name.
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "parity",
    GIT_AUTHOR_EMAIL: "parity@example.com",
    GIT_COMMITTER_NAME: "parity",
    GIT_COMMITTER_EMAIL: "parity@example.com",
    GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
  };
  const stableGit = (args, input) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8", env, input });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
    return (result.stdout ?? "").trim();
  };
  const main = stableGit(["rev-parse", "refs/heads/main"]);
  const entries = stableGit(["ls-tree", "refs/heads/main"]);
  const blob = stableGit(["hash-object", "-w", "--stdin"], "parity feature branch\n");
  const tree = stableGit(["mktree"], `${entries}\n100644 blob ${blob}\tparity-feature.txt\n`);
  const commit = stableGit(["commit-tree", tree, "-p", main, "-m", "parity feature branch"]);
  stableGit(["update-ref", "refs/heads/feature/ui", commit]);
}

async function alignParityFixtures(options) {
  const repos = [
    path.join(repoRoot, ".agent/legacy-localhost/instances/parity/data/repo/git/admin/sample.git"),
    path.join(outputDir, "yoram/data/repo/git/admin/sample.git"),
    path.join(outputDir, "yoram/repo/3.git"),
  ];
  for (const repo of repos) {
    if (existsSync(repo)) ensureDiffableRepoBranches(repo);
  }
  // Align only fixture-owned labels/categories on both sides, and clear
  // residue left behind by earlier sweeps' failed cleanups. Runtime-created
  // label CRUD rows remain untouched.
  const legacySession = new LegacySession(options.legacyUrl ?? process.env.YONA_LEGACY_URL ?? "http://127.0.0.1:9000");
  await legacySession.login({ loginId: "admin", password: "admin" });
  const yoramSession = new YoramSession(options.yoramUrl ?? "http://127.0.0.1:3101");
  try {
    await yoramSession.login({ loginId: "admin", password: "admin" });
  } catch {
    // already-authenticated instance is fine; keep going with cookies we have
  }
  for (const [side, session, base] of [
    ["legacy", legacySession, ""],
    ["yoram", yoramSession, ""],
  ]) {
    let labels = [];
    let categories = [];
    try {
      labels = JSON.parse((await session.request({ method: "GET", path: `${base}/admin/sample/issue/labels` })).body || "[]");
      categories = JSON.parse((await session.request({ method: "GET", path: `${base}/admin/sample/issue/label/categories` })).body || "[]");
    } catch {
      continue;
    }
    for (const label of labels) {
      if (/^parity-(label|cat)-sweep-/u.test(label.name ?? "")) {
        await session.request({
          method: "POST",
          path: `${base}/admin/sample/issue/label/${label.id}/delete`,
          form: { _method: "delete" },
        });
      }
    }
    for (const category of categories) {
      if (/^parity-cat-sweep-/u.test(category.name ?? "")) {
        await session.request({
          method: "DELETE",
          path: `${base}/admin/sample/issue/label/category/${category.id}`,
        });
      }
    }
  }
  // The legacy parity fixture is the canonical source for these two stable
  // rows. Apply the same tuple to Yoram too; the old one-way mirror left a
  // legacy-only row when Yoram started empty.
  const labels = JSON.parse(
    (await legacySession.request({ method: "GET", path: "/admin/sample/issue/labels" })).body || "[]",
  );
  await alignParityLabelSeeds(legacySession, "", labels);
  const yoramLabels = JSON.parse(
    (await yoramSession.request({ method: "GET", path: "/admin/sample/issue/labels" })).body || "[]",
  );
  await alignParityLabelSeeds(yoramSession, "", yoramLabels);

  // Provision the legacy parity comparison users (alice/bob/carol) on yoram
  // via REST signup so both sides' active-user sets match for the sweep
  // project context. Registration is idempotent-tolerated (already-exists
  // failures are ignored); legacy history rows are never deleted.
  try {
    const yoramUsers = new YoramSession(options.yoramUrl ?? "http://127.0.0.1:3101");
    const primed = await fetch(`${options.yoramUrl ?? "http://127.0.0.1:3101"}/api/auth/session`);
    yoramUsers.csrfToken = primed.headers.get("x-csrf-token") ?? "";
    yoramUsers.cookies = (primed.headers.getSetCookie?.() ?? [])
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    for (const user of [
      { loginId: "alice", name: "Alice Kim", email: "alice@example.com", password: "alicealice" },
      { loginId: "bob", name: "Bob Park", email: "bob@example.com", password: "bobbobbob" },
      { loginId: "carol", name: "Carol Lee", email: "carol@example.com", password: "carolcarol" },
    ]) {
      try {
        await yoramUsers.request({
          method: "POST",
          path: "/api/v1/auth/register",
          json: {
            emailAddress: user.email,
            loginId: user.loginId,
            name: user.name,
            password: user.password,
            retypedPassword: user.password,
          },
        });
      } catch {
        // already-exists / transient registration failure tolerated
      }
    }
  } catch {
    // best-effort alignment; candidate-set diffs surface as INFRA_ERROR with
    // the fixture-asymmetry rationale instead of crashing the sweep.
  }

  // SQL-level reconciliation: compare the exact projected label tuples of both
  // instances and create anything present on yoram but missing/divergent on
  // legacy (restricted to parity-seed names so sweep rows are never imported).
  try {
    const legacyDb = path.join(repoRoot, ".agent/legacy-localhost/instances/parity/data/db/yona.h2.db");
    const yoramDb = path.join(outputDir, "yoram", "yoram.db");
    const lrows = projectLabelRows(await queryLegacyH2(repoRoot, legacyDb, "labels", "sample"), "legacy");
    const yrows = projectLabelRows(await queryYoramSqlite(yoramDb, "labels", "sample"), "yoram");
    const tupleOf = (row) => `${row.name}|${row.category}|${row.color}`.toLowerCase();
    const legacyTuples = new Set(lrows.map(tupleOf));
    const seedNames = new Set(PARITY_LABEL_SEEDS.map((seed) => seed.labelName));
    const missing = yrows.filter((row) => seedNames.has(row.name) && !legacyTuples.has(tupleOf(row)));
    for (const row of missing) {
      const stale = lrows.find((l) => l.name === row.name);
      if (stale?.id) {
        await legacySession.request({
          method: "POST",
          path: `/admin/sample/issue/label/${stale.id}/delete`,
          form: { _method: "delete" },
        });
      }
      await legacySession.request({
        method: "POST",
        path: "/admin/sample/issue/labels",
        form: { labelName: row.name, categoryName: row.category, labelColor: row.color },
      });
    }
  } catch (error) {
    console.error(`[alignParityFixtures] SQL label reconciliation skipped: ${error.message}`);
  }
}

// --- pre-boot H2 fixture reconciliation --------------------------------------

const LEGACY_H2_URL_BASE = ".agent/legacy-localhost/instances/parity/data/db/yona";

// These are the sequence-backed Ebean entities in the legacy model. The list
// is taken from the legacy parity export (application.2026-08-30.log), rather
// than inferred from the few rows exercised by the current sweep. Recovering
// an H2 file can omit sequence objects while retaining their entity tables.
export const LEGACY_MODEL_SEQUENCE_TABLES = Object.freeze([
  ["ASSIGNEE_SEQ", "ASSIGNEE"],
  ["ATTACHMENT_SEQ", "ATTACHMENT"],
  ["COMMENT_THREAD_SEQ", "COMMENT_THREAD"],
  ["COMMIT_COMMENT_SEQ", "COMMIT_COMMENT"],
  ["EMAIL_SEQ", "EMAIL"],
  ["ISSUE_SEQ", "ISSUE"],
  ["ISSUE_COMMENT_SEQ", "ISSUE_COMMENT"],
  ["ISSUE_EVENT_SEQ", "ISSUE_EVENT"],
  ["ISSUE_LABEL_SEQ", "ISSUE_LABEL"],
  ["ISSUE_LABEL_CATEGORY_SEQ", "ISSUE_LABEL_CATEGORY"],
  ["LABEL_SEQ", "LABEL"],
  ["MENTION_SEQ", "MENTION"],
  ["MILESTONE_SEQ", "MILESTONE"],
  ["N4USER_SEQ", "N4USER"],
  ["NOTIFICATION_EVENT_SEQ", "NOTIFICATION_EVENT"],
  ["NOTIFICATION_MAIL_SEQ", "NOTIFICATION_MAIL"],
  ["ORGANIZATION_SEQ", "ORGANIZATION"],
  ["ORGANIZATION_USER_SEQ", "ORGANIZATION_USER"],
  ["ORIGINAL_EMAIL_SEQ", "ORIGINAL_EMAIL"],
  ["POSTING_SEQ", "POSTING"],
  ["POSTING_COMMENT_SEQ", "POSTING_COMMENT"],
  ["PROJECT_SEQ", "PROJECT"],
  ["PROJECT_MENU_SETTING_SEQ", "PROJECT_MENU_SETTING"],
  ["PROJECT_PUSHED_BRANCH_SEQ", "PROJECT_PUSHED_BRANCH"],
  ["PROJECT_TRANSFER_SEQ", "PROJECT_TRANSFER"],
  ["PROJECT_USER_SEQ", "PROJECT_USER"],
  ["PROJECT_VISITATION_SEQ", "PROJECT_VISITATION"],
  ["PROPERTY_SEQ", "PROPERTY"],
  ["PULL_REQUEST_SEQ", "PULL_REQUEST"],
  ["PULL_REQUEST_COMMIT_SEQ", "PULL_REQUEST_COMMIT"],
  ["PULL_REQUEST_EVENT_SEQ", "PULL_REQUEST_EVENT"],
  ["RECENTLY_VISITED_PROJECTS_SEQ", "RECENTLY_VISITED_PROJECTS"],
  ["REVIEW_COMMENT_SEQ", "REVIEW_COMMENT"],
  ["ROLE_SEQ", "ROLE"],
  ["SITE_ADMIN_SEQ", "SITE_ADMIN"],
  ["UNWATCH_SEQ", "UNWATCH"],
  ["USER_PROJECT_NOTIFICATION_SEQ", "USER_PROJECT_NOTIFICATION"],
  ["WATCH_SEQ", "WATCH"],
]);

export function buildLegacySequenceReconciliationSql(sequenceName, maxId) {
  const nextId = Number(maxId) + 1;
  return [
    `CREATE SEQUENCE IF NOT EXISTS PUBLIC.${sequenceName} START WITH ${nextId}`,
    `ALTER SEQUENCE PUBLIC.${sequenceName} RESTART WITH ${nextId}`,
  ];
}
// Old destructive sweeps can leave project_user rows after their PROJECT row
// was deleted. Legacy MigrationApp.projects() lazy-loads every membership's
// project while sorting, so those orphan rows turn the otherwise valid
// /migration/projects request into EntityNotFoundException/HTTP 500.
export const LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL =
  "DELETE FROM PROJECT_USER WHERE NOT EXISTS (SELECT 1 FROM PROJECT WHERE PROJECT.ID = PROJECT_USER.PROJECT_ID)";

export function legacyH2Url() {
  return (
    "jdbc:h2:" +
    path.join(repoRoot, LEGACY_H2_URL_BASE) +
    ";MODE=PostgreSQL;MV_STORE=FALSE;MVCC=FALSE;FILE_LOCK=NO;IFEXISTS=TRUE"
  );
}

function legacyH2Shell(sql) {
  const result = spawnSync(
    "java",
    ["-cp", h2JarPath(repoRoot), "org.h2.tools.Shell", "-url", legacyH2Url(), "-user", "sa", "-password", "", "-sql", sql],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`h2 shell failed: ${(result.stderr || result.stdout || "").slice(0, 300)}`);
  }
  return result.stdout ?? "";
}

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function featureCommitFor(repoPath) {
  ensureDiffableRepoBranches(repoPath);
  const result = spawnSync("git", ["--git-dir", repoPath, "rev-parse", "refs/heads/feature/ui"], {
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`feature branch missing in parity repository ${repoPath}`);
  }
  return result.stdout.trim();
}

function reconcileYoramPullRequestFixtures(databasePath) {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("pragma foreign_keys = off; begin");
    const sample = database
      .prepare("select id from project where owner = 'admin' and name = 'sample' limit 1")
      .get();
    const admin = database.prepare("select id from n4user where login_id = 'admin' limit 1").get();
    if (!sample?.id || !admin?.id) throw new Error("Yoram parity PR fixture requires admin/sample and admin");
    const featureCommit = featureCommitFor(path.join(yoramRuntimeDir, "data/repo/git/admin/sample.git"));
    const seed = database
      .prepare("select id from pull_request where to_project_id = ? and number = 1 order by id limit 1")
      .get(sample.id);
    const seedId = Number(seed?.id ?? database.prepare("select coalesce(max(id), 0) + 1 as id from pull_request").get().id);
    const stale = database
      .prepare("select id from pull_request where to_project_id = ? and id <> ? and title like 'Differential sweep PR %'")
      .all(sample.id, seedId)
      .map((row) => Number(row.id));
    const ids = stale.length > 0 ? stale.join(",") : "0";
    for (const table of ["pull_request_commit", "pull_request_event", "pull_request_reviewers"]) {
      database.exec(`delete from ${table} where pull_request_id in (${ids})`);
    }
    database.exec(
      `delete from review_comment where thread_id in
        (select id from comment_thread where pull_request_id in (${ids}))`,
    );
    database.exec(`delete from comment_thread where pull_request_id in (${ids})`);
    database.exec(
      `delete from watch where resource_type = 'PULL_REQUEST' and resource_id in (${stale.map((id) => sqlQuote(id)).join(",") || sqlQuote(0)})`,
    );
    database.exec(
      `delete from notification_event_n4user where notification_event_id in
        (select id from notification_event where resource_type = 'PULL_REQUEST' and resource_id in
          (${stale.map((id) => sqlQuote(id)).join(",") || sqlQuote(0)}))`,
    );
    database.exec(
      `delete from notification_mail where notification_event_id in
        (select id from notification_event where resource_type = 'PULL_REQUEST' and resource_id in
          (${stale.map((id) => sqlQuote(id)).join(",") || sqlQuote(0)}))`,
    );
    database.exec(
      `delete from notification_event where resource_type = 'PULL_REQUEST' and resource_id in (${stale.map((id) => sqlQuote(id)).join(",") || sqlQuote(0)})`,
    );
    database.exec(`delete from pull_request where id in (${ids})`);
    const remainingSweepPullRequests = database
      .prepare("select count(*) as count from pull_request where to_project_id = ? and id <> ? and title like 'Differential sweep PR %'")
      .get(sample.id, seedId).count;
    if (Number(remainingSweepPullRequests) !== 0) {
      throw new Error(`Yoram stale differential PR cleanup left ${remainingSweepPullRequests} rows`);
    }
    if (seed?.id) {
      database
        .prepare(
          `update pull_request set title = ?, body = ?, to_project_id = ?, from_project_id = ?,
             to_branch = ?, from_branch = ?, contributor_id = ?, receiver_id = ?,
             created = ?, updated = ?, received = null, state = ?, is_conflict = 0,
             is_merging = 0, last_commit_id = ?, merged_commit_id_from = null,
             merged_commit_id_to = null, number = 1 where id = ?`,
        )
        .run(
          PARITY_PULL_REQUEST.title,
          PARITY_PULL_REQUEST.body,
          sample.id,
          sample.id,
          PARITY_PULL_REQUEST.toBranch,
          PARITY_PULL_REQUEST.fromBranch,
          admin.id,
          admin.id,
          "2026-07-07 11:24:00.000",
          "2026-07-07 11:24:00.000",
          PARITY_PULL_REQUEST.state,
          featureCommit,
          seedId,
        );
    } else {
      database
        .prepare(
          `insert into pull_request
            (id, title, body, to_project_id, from_project_id, to_branch, from_branch,
             contributor_id, receiver_id, created, updated, received, state, is_conflict,
             is_merging, last_commit_id, merged_commit_id_from, merged_commit_id_to, number)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, 0, 0, ?, null, null, 1)`,
        )
        .run(
          seedId,
          PARITY_PULL_REQUEST.title,
          PARITY_PULL_REQUEST.body,
          sample.id,
          sample.id,
          PARITY_PULL_REQUEST.toBranch,
          PARITY_PULL_REQUEST.fromBranch,
          admin.id,
          admin.id,
          "2026-07-07 11:24:00.000",
          "2026-07-07 11:24:00.000",
          PARITY_PULL_REQUEST.state,
          featureCommit,
        );
    }
    database.prepare("delete from pull_request_commit where pull_request_id = ?").run(seedId);
    database
      .prepare(
        `insert into pull_request_commit
          (pull_request_id, commit_id, author_date, created, commit_message,
           commit_short_id, author_email, state)
         values (?, ?, ?, ?, ?, ?, ?, 'CURRENT')`,
      )
      .run(
        seedId,
        featureCommit,
        "2026-01-01 00:00:00.000",
        "2026-01-01 00:00:00.000",
        "parity feature branch",
        featureCommit.slice(0, 7),
        "parity@example.com",
      );
    database.prepare("delete from pull_request_event where pull_request_id = ?").run(seedId);
    database
      .prepare(
        `insert into pull_request_event
          (sender_login_id, pull_request_id, event_type, created, old_value, new_value)
         values ('admin', ?, 'NEW_PULL_REQUEST', ?, '', ?)`,
      )
      .run(seedId, "2026-07-07 11:24:00.000", PARITY_PULL_REQUEST.title);
    database
      .prepare("delete from watch where resource_type = 'PULL_REQUEST' and resource_id = ?")
      .run(String(seedId));
    database
      .prepare("insert into watch (user_id, resource_type, resource_id) values (?, 'PULL_REQUEST', ?)")
      .run(admin.id, String(seedId));
    database.exec(
      `delete from review_comment where thread_id in
        (select id from comment_thread where project_id = ${sample.id})`,
    );
    database.prepare("delete from comment_thread where project_id = ?").run(sample.id);
    database
      .prepare(
        `insert into comment_thread
          (dtype, author_id, author_login_id, author_name, state, created_date, pull_request_id,
           project_id, prev_commit_id, commit_id, path, start_side, start_line, start_column,
           end_side, end_line, end_column)
         values ('ranged', ?, 'admin', 'Site Admin', 'OPEN', ?, null, ?, null, ?, ?, 'B', 1, 1, 'B', 1, 1)`,
      )
      .run(
        admin.id,
        "2026-07-07 11:24:00.000",
        sample.id,
        featureCommit,
        PARITY_REVIEW.path,
      );
    const reviewThreadId = Number(
      database.prepare("select id from comment_thread where project_id = ? order by id desc limit 1").get(sample.id).id,
    );
    database
      .prepare(
        `insert into review_comment
          (contents, created_date, author_id, author_login_id, author_name, thread_id)
         values (?, ?, ?, 'admin', 'Site Admin', ?)`,
      )
      .run(PARITY_REVIEW.contents, "2026-07-07 11:24:00.000", admin.id, reviewThreadId);
    database.exec("commit; pragma foreign_keys = on");
  } catch (error) {
    database.exec("rollback; pragma foreign_keys = on");
    throw new Error(`Yoram pull-request fixture reconciliation failed: ${error.message}`, { cause: error });
  } finally {
    database.close();
  }
}

// Runs while NO instance holds the H2 file (before bootLegacy): deactivate
// stale parity throwaway users (legacy treats state DELETED as inactive,
// models/enumeration/UserState.java) and reconcile sample-project label rows
// so both sides' fixtures measure filter logic instead of history.
async function reconcileLegacyFixturesPreboot() {
  const h2Jar = h2JarPath(repoRoot);
  // The original file's credentials are unknown and AUTO_SERVER records go
  // stale, so operate on a Recover+RunScript rebuilt copy (same mechanism the
  // db projection uses) and persist it back BEFORE any JVM opens the file.
  const dbFile = path.join(repoRoot, LEGACY_H2_URL_BASE + ".h2.db");
  const workDir = mkdtempSync(path.join(tmpdir(), "legacy-h2-reconcile-"));
  copyFileSync(dbFile, path.join(workDir, "yona.h2.db"));
  const javaBin = process.execPath === "java" ? "java" : "java";
  const runJava = (args) => {
    const result = spawnSync(javaBin, ["-cp", h2Jar, ...args], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${args[0]} failed: ${(result.stderr || result.stdout || "").slice(0, 300)}`);
  };
  runJava(["org.h2.tools.Recover", "-dir", workDir, "-db", "yona"]);
  const recoveredScriptPath = path.join(workDir, "yona.h2.sql");
  writeFileSync(recoveredScriptPath, dedupeH2RecoverSequences(readFileSync(recoveredScriptPath, "utf8")));
  // Multi-head recover dumps repeat rows; replay tolerantly then strip the
  // duplicated rows (see db-projection.replayH2Script/dedupeRebuiltTableRows).
  const rebuiltUrl = `jdbc:h2:${path.join(workDir, "rebuilt")};MODE=PostgreSQL;MV_STORE=FALSE;MVCC=FALSE`;
  await replayH2Script(javaBin, h2Jar, rebuiltUrl, readFileSync(recoveredScriptPath, "utf8"));
  await dedupeRebuiltTableRows(javaBin, h2Jar, rebuiltUrl);
  const shellOnRebuilt = (sql) => {
    const result = spawnSync(
      "java",
      ["-cp", h2Jar, "org.h2.tools.Shell", "-url", `jdbc:h2:${path.join(workDir, "rebuilt")};MODE=PostgreSQL;MV_STORE=FALSE;MVCC=FALSE;IFEXISTS=TRUE`, "-user", "sa", "-password", "", "-sql", sql],
      { encoding: "utf8" },
    );
    if (result.status !== 0 || /Error:|Exception/.test(result.stderr ?? "") || /^Error:/m.test(result.stdout ?? "")) {
      throw new Error(`h2 shell failed: ${((result.stderr || "") + (result.stdout || "")).slice(0, 300)}`);
    }
    return result.stdout ?? "";
  };
  // H2 Shell prints a header line before the data row; header text itself can
  // contain digits (e.g. COALESCE(MAX(id), 0)), so parse line 1, not line 0.
  const scalar = (sql) => {
    const dataLine = (shellOnRebuilt(sql).split("\n")[1] ?? "").trim();
    return Number(/(\d+)/.exec(dataLine)?.[0] ?? "0");
  };
  const reconcileLegacyModelSequences = () => {
    const maxIds = new Map();
    for (const [sequenceName, tableName] of LEGACY_MODEL_SEQUENCE_TABLES) {
      const maxId = scalar(`SELECT COALESCE(MAX(ID), 0) FROM ${tableName}`);
      maxIds.set(sequenceName, maxId);
      for (const statement of buildLegacySequenceReconciliationSql(sequenceName, maxId)) {
        shellOnRebuilt(statement);
      }
    }

    const sequenceNames = LEGACY_MODEL_SEQUENCE_TABLES.map(([sequenceName]) => sqlQuote(sequenceName)).join(", ");
    const present = scalar(
      `SELECT COUNT(*) FROM INFORMATION_SCHEMA.SEQUENCES ` +
        `WHERE SEQUENCE_SCHEMA = 'PUBLIC' AND SEQUENCE_NAME IN (${sequenceNames})`,
    );
    if (present !== LEGACY_MODEL_SEQUENCE_TABLES.length) {
      throw new Error(
        `self-check failed: legacy sequence set has ${present}/${LEGACY_MODEL_SEQUENCE_TABLES.length} declarations`,
      );
    }
    for (const [sequenceName] of LEGACY_MODEL_SEQUENCE_TABLES) {
      const current = scalar(
        `SELECT CURRENT_VALUE FROM INFORMATION_SCHEMA.SEQUENCES ` +
          `WHERE SEQUENCE_SCHEMA = 'PUBLIC' AND SEQUENCE_NAME = '${sequenceName}'`,
      );
      const expected = maxIds.get(sequenceName);
      if (current !== expected) {
        throw new Error(`self-check failed: ${sequenceName} current value ${current} != table max ${expected}`);
      }
    }
  };
  const parityUserValues = {
    admin: ["Site Admin", "admin@example.com"],
    alice: ["Alice Kim", "alice@example.com"],
    bob: ["Bob Park", "bob@example.com"],
    carol: ["Carol Lee", "carol@example.com"],
  };
  for (const [loginId, [name, email]] of Object.entries(parityUserValues)) {
    shellOnRebuilt(
      `UPDATE n4user SET name = '${name}', email = '${email}', english_name = NULL, ` +
        "state = 'ACTIVE', avatar_url = NULL WHERE login_id = '" +
        loginId +
        "'",
    );
  }
  if (scalar("SELECT COUNT(*) FROM n4user WHERE login_id = 'bob'") === 0) {
    const nextUserId = scalar("SELECT COALESCE(MAX(id), 0) FROM n4user") + 1;
    shellOnRebuilt(
      `INSERT INTO n4user (id, name, login_id, password, password_salt, email, avatar_url, state, lang, is_guest, english_name) ` +
        `VALUES (${nextUserId}, 'Bob Park', 'bob', '9fkLYYr+OyyyFsT+mv04SJH5kUw+BGdG5VsLJdpxBF4=', 'parity-bob-salt', 'bob@example.com', NULL, 'ACTIVE', 'ko-KR', 0, 'Bob Park')`,
    );
  } else {
    shellOnRebuilt(
      "UPDATE n4user SET password = '9fkLYYr+OyyyFsT+mv04SJH5kUw+BGdG5VsLJdpxBF4=', " +
        "password_salt = 'parity-bob-salt', state = 'ACTIVE' WHERE login_id = 'bob'",
    );
  }
  shellOnRebuilt(
    "UPDATE n4user SET state = 'DELETED' WHERE login_id NOT IN ('admin', 'alice', 'bob', 'carol') AND state <> 'DELETED'",
  );
  const publicProjectIds = PARITY_SHARABLE_PROJECTS.map((project) => project.id).join(", ");
  shellOnRebuilt(
    `UPDATE project SET project_scope = 'PRIVATE' WHERE project_scope = 'PUBLIC' AND id NOT IN (${publicProjectIds})`,
  );
  for (const project of PARITY_SHARABLE_PROJECTS) {
    shellOnRebuilt(
      `UPDATE project SET owner = '${project.owner}', name = '${project.name}', vcs = '${project.vcs}', ` +
        "project_scope = 'PUBLIC' WHERE id = " +
        project.id,
    );
  }
  // Ensure category + label rows exist for each parity seed tuple. Legacy H2
  // has no identity columns here, so ids are allocated explicitly from the
  // global max across both tables.
  // Deactivate stale throwaway accounts and sweep residue. Legacy treats
  // state DELETED as inactive (models/enumeration/UserState.java), so both
  // sides' active user sets consist of the aligned fixtures only.
  shellOnRebuilt(
    "UPDATE n4user SET state = 'DELETED' WHERE login_id LIKE 'paritysweep%' AND state <> 'DELETED'",
  );
  shellOnRebuilt("DELETE FROM email WHERE email LIKE '%@parity.example.com'");
  // Keep the persisted legacy fixture relationally sound. This is a
  // harness-state repair, not a product behavior change: MigrationApp's
  // source route cannot represent a membership whose project was deleted.
  shellOnRebuilt(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL);
  // Legacy initial-data.yml roles 1-7: project_user.role_id references them.
  // Without these rows legacy member creation inserts a null role_id and the
  // member page omits the row, so P13/P18 member IDs cannot be discovered.
  const LEGACY_ROLE_SEEDS = [
    [1, "manager"],
    [2, "member"],
    [3, "sitemanager"],
    [4, "anonymous"],
    [5, "guest"],
    [6, "org_admin"],
    [7, "org_member"],
  ];
  for (const [roleId, roleName] of LEGACY_ROLE_SEEDS) {
    const hasRole = scalar(`SELECT COUNT(*) FROM role WHERE id = ${roleId}`) > 0;
    if (hasRole) {
      shellOnRebuilt(`UPDATE role SET name = '${roleName}', active = 1 WHERE id = ${roleId}`);
    } else {
      shellOnRebuilt(`INSERT INTO role (id, name, active) VALUES (${roleId}, '${roleName}', 1)`);
    }
  }
  // Labels referencing residue categories may carry arbitrary names, so
  // delete by category before dropping the categories themselves.
  shellOnRebuilt(
    "DELETE FROM issue_label WHERE category_id IN (SELECT id FROM issue_label_category WHERE name LIKE 'parity-cat-sweep-%')",
  );
  shellOnRebuilt("DELETE FROM issue_label WHERE name = 'undefined' OR name LIKE 'parity-label-sweep-%'");
  shellOnRebuilt("DELETE FROM issue_label_category WHERE name = 'undefined' OR name LIKE 'parity-cat-sweep-%'");

  // Ensure category + label rows exist for each parity seed tuple. Legacy H2
  // has no identity columns here, so ids are allocated explicitly from the
  // global max across both tables.
  const nextId = () =>
    Math.max(
      scalar("SELECT COALESCE(MAX(id), 0) FROM issue_label_category"),
      scalar("SELECT COALESCE(MAX(id), 0) FROM issue_label"),
    ) + 1;
  // Several 'sample' projects can exist across owners; the parity fixture is
  // the lowest-id one, matching what the sweep scenarios address.
  const sampleProjectId = scalar("SELECT id FROM project WHERE name = 'sample' ORDER BY id LIMIT 1");
  // Replayed legacy H2 keeps rows created by earlier sweeps. Keep the two
  // deterministic seed records and remove only their dependent rows; the
  // migration export must not compare old throwaway history against Yoram's
  // fresh parity fixture.
  const staleIssueIds =
    `(SELECT id FROM issue WHERE project_id = ${sampleProjectId} AND title <> 'Review rail parity check')`;
  const staleIssueCommentIds =
    `(SELECT id FROM issue_comment WHERE issue_id IN ${staleIssueIds})`;
  const stalePostingIds =
    `(SELECT id FROM posting WHERE project_id = ${sampleProjectId} AND title <> 'Seed notes' AND readme = 0)`;
  shellOnRebuilt("SET REFERENTIAL_INTEGRITY FALSE");
  for (const table of ["issue_comment_voter", "issue_comment", "issue_event", "issue_issue_label", "issue_voter", "issue_sharer"]) {
    shellOnRebuilt(
      `DELETE FROM ${table} WHERE ${
        table === "issue_comment_voter" ? `issue_comment_id IN ${staleIssueCommentIds}` : `issue_id IN ${staleIssueIds}`
      }`,
    );
  }
  shellOnRebuilt(`DELETE FROM issue WHERE id IN ${staleIssueIds}`);
  shellOnRebuilt(`DELETE FROM posting_comment WHERE posting_id IN ${stalePostingIds}`);
  shellOnRebuilt(`DELETE FROM posting_issue_label WHERE posting_id IN ${stalePostingIds}`);
  shellOnRebuilt(`DELETE FROM posting WHERE id IN ${stalePostingIds}`);
  shellOnRebuilt("SET REFERENTIAL_INTEGRITY TRUE");
  const seedIssueId = scalar(
    `SELECT id FROM issue WHERE project_id = ${sampleProjectId} AND title = 'Review rail parity check' LIMIT 1`,
  );
  if (seedIssueId) {
    const adminId = scalar("SELECT id FROM n4user WHERE login_id = 'admin' LIMIT 1");
    const aliceId = scalar("SELECT id FROM n4user WHERE login_id = 'alice' LIMIT 1");
    const aliceAssigneeId = scalar(`SELECT id FROM assignee WHERE user_id = ${aliceId} LIMIT 1`);
    const milestoneId = scalar(
      `SELECT id FROM milestone WHERE project_id = ${sampleProjectId} AND title = 'Parity launch' LIMIT 1`,
    );
    shellOnRebuilt(
      `UPDATE issue SET state = 1, num_of_comments = 1, author_id = ${adminId}, author_login_id = 'admin', ` +
        `author_name = 'Site Admin', assignee_id = ${aliceAssigneeId}, milestone_id = ${milestoneId}, ` +
        "body = 'Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.' " +
        `WHERE id = ${seedIssueId}`,
    );
  }
  const legacyRepositoryPath = path.join(
    repoRoot,
    ".agent/legacy-localhost/instances/parity/data/repo/git/admin/sample.git",
  );
  const featureCommit = featureCommitFor(legacyRepositoryPath);
  const seededPullRequestId = scalar(
    `SELECT id FROM pull_request WHERE to_project_id = ${sampleProjectId} AND number = 1 ORDER BY id LIMIT 1`,
  );
  if (!featureCommit || !seededPullRequestId) throw new Error("legacy parity PR seed is missing");
  const stalePullRequestIds = shellOnRebuilt(
    `SELECT id FROM pull_request WHERE to_project_id = ${sampleProjectId} AND id <> ${seededPullRequestId} ` +
      `AND title LIKE 'Differential sweep PR %'`,
  )
    .split("\n")
    .slice(1)
    .map((line) => Number(line.trim()))
    .filter(Boolean);
  shellOnRebuilt("SET REFERENTIAL_INTEGRITY FALSE");
  const staleIdsSql = stalePullRequestIds.join(",") || "0";
  for (const table of ["pull_request_commit", "pull_request_event", "pull_request_reviewers"]) {
    shellOnRebuilt(`DELETE FROM ${table} WHERE pull_request_id IN (${staleIdsSql})`);
  }
  shellOnRebuilt(
    `DELETE FROM review_comment WHERE thread_id IN
      (SELECT id FROM comment_thread WHERE pull_request_id IN (${staleIdsSql}))`,
  );
  shellOnRebuilt(`DELETE FROM comment_thread WHERE pull_request_id IN (${staleIdsSql})`);
  shellOnRebuilt(
    `DELETE FROM watch WHERE resource_type = 'PULL_REQUEST' AND resource_id IN (${stalePullRequestIds.map(sqlQuote).join(",") || sqlQuote(0)})`,
  );
  shellOnRebuilt(
    `DELETE FROM notification_event_n4user WHERE notification_event_id IN
      (SELECT id FROM notification_event WHERE resource_type = 'PULL_REQUEST' AND resource_id IN
        (${stalePullRequestIds.map(sqlQuote).join(",") || sqlQuote(0)}))`,
  );
  shellOnRebuilt(
    `DELETE FROM notification_mail WHERE notification_event_id IN
      (SELECT id FROM notification_event WHERE resource_type = 'PULL_REQUEST' AND resource_id IN
        (${stalePullRequestIds.map(sqlQuote).join(",") || sqlQuote(0)}))`,
  );
  shellOnRebuilt(
    `DELETE FROM notification_event WHERE resource_type = 'PULL_REQUEST' AND resource_id IN (${stalePullRequestIds.map(sqlQuote).join(",") || sqlQuote(0)})`,
  );
  shellOnRebuilt(`DELETE FROM pull_request WHERE id IN (${staleIdsSql})`);
  const remainingSweepPullRequests = scalar(
    `SELECT COUNT(*) FROM pull_request WHERE to_project_id = ${sampleProjectId} AND id <> ${seededPullRequestId} ` +
      `AND title LIKE 'Differential sweep PR %'`,
  );
  if (remainingSweepPullRequests !== 0) {
    throw new Error(`legacy stale differential PR cleanup left ${remainingSweepPullRequests} rows`);
  }
  shellOnRebuilt("SET REFERENTIAL_INTEGRITY TRUE");
  const adminId = scalar("SELECT id FROM n4user WHERE login_id = 'admin' LIMIT 1");
  shellOnRebuilt(
    `UPDATE pull_request SET title = ${sqlQuote(PARITY_PULL_REQUEST.title)}, body = ${sqlQuote(PARITY_PULL_REQUEST.body)}, ` +
      `to_project_id = ${sampleProjectId}, from_project_id = ${sampleProjectId}, ` +
      `to_branch = ${sqlQuote(PARITY_PULL_REQUEST.toBranch)}, from_branch = ${sqlQuote(PARITY_PULL_REQUEST.fromBranch)}, ` +
      `contributor_id = ${adminId}, receiver_id = ${adminId}, created = '2026-07-07 11:24:00', ` +
      `updated = '2026-07-07 11:24:00', received = NULL, state = ${PARITY_PULL_REQUEST.state}, ` +
      `is_conflict = FALSE, is_merging = FALSE, last_commit_id = ${sqlQuote(featureCommit)}, ` +
      `merged_commit_id_from = NULL, merged_commit_id_to = NULL, number = 1 WHERE id = ${seededPullRequestId}`,
  );
  shellOnRebuilt(`DELETE FROM pull_request_commit WHERE pull_request_id = ${seededPullRequestId}`);
  shellOnRebuilt(
    `INSERT INTO pull_request_commit (id, pull_request_id, commit_id, author_date, created, commit_message, ` +
      `commit_short_id, author_email, state) VALUES (` +
      `${scalar("SELECT COALESCE(MAX(id), 0) FROM pull_request_commit") + 1}, ${seededPullRequestId}, ` +
      `${sqlQuote(featureCommit)}, '2026-01-01 00:00:00', '2026-01-01 00:00:00', ` +
      `'parity feature branch', ${sqlQuote(featureCommit.slice(0, 7))}, 'parity@example.com', 'CURRENT')`,
  );
  shellOnRebuilt(`DELETE FROM pull_request_event WHERE pull_request_id = ${seededPullRequestId}`);
  shellOnRebuilt(
    `INSERT INTO pull_request_event (id, sender_login_id, pull_request_id, event_type, created, old_value, new_value) ` +
      `VALUES (${scalar("SELECT COALESCE(MAX(id), 0) FROM pull_request_event") + 1}, 'admin', ${seededPullRequestId}, ` +
      `'NEW_PULL_REQUEST', '2026-07-07 11:24:00', '', ${sqlQuote(PARITY_PULL_REQUEST.title)})`,
  );
  shellOnRebuilt(
    `DELETE FROM watch WHERE resource_type = 'PULL_REQUEST' AND resource_id = ${sqlQuote(seededPullRequestId)}`,
  );
  shellOnRebuilt(
    `INSERT INTO watch (id, user_id, resource_type, resource_id) VALUES (` +
      `${scalar("SELECT COALESCE(MAX(id), 0) FROM watch") + 1}, ${adminId}, 'PULL_REQUEST', ${sqlQuote(seededPullRequestId)})`,
  );
  // The seeded project is watched by admin in the default Yoram parity
  // bootstrap. Keep the legacy project header's watcher state identical.
  shellOnRebuilt(
    `DELETE FROM watch WHERE resource_type = 'PROJECT' AND resource_id = ${sqlQuote(sampleProjectId)}`,
  );
  shellOnRebuilt(
    `INSERT INTO watch (id, user_id, resource_type, resource_id) VALUES (` +
      `${scalar("SELECT COALESCE(MAX(id), 0) FROM watch") + 1}, ${adminId}, 'PROJECT', ${sqlQuote(sampleProjectId)})`,
  );
  // Project reviews are a separate screen but share this project fixture. Reset
  // stale rows, then seed one commit discussion identically on both engines.
  shellOnRebuilt(
    `DELETE FROM review_comment WHERE thread_id IN (SELECT id FROM comment_thread WHERE project_id = ${sampleProjectId})`,
  );
  shellOnRebuilt(`DELETE FROM comment_thread WHERE project_id = ${sampleProjectId}`);
  const reviewThreadId = scalar("SELECT COALESCE(MAX(id), 0) FROM comment_thread") + 1;
  const reviewCommentId = scalar("SELECT COALESCE(MAX(id), 0) FROM review_comment") + 1;
  shellOnRebuilt(
    `INSERT INTO comment_thread (dtype, id, author_id, author_login_id, author_name, state, created_date, ` +
      `pull_request_id, project_id, prev_commit_id, commit_id, path, start_side, start_line, start_column, ` +
      `end_side, end_line, end_column) VALUES ('ranged', ${reviewThreadId}, ${adminId}, 'admin', 'Site Admin', ` +
      `'OPEN', '2026-07-07 11:24:00', NULL, ${sampleProjectId}, NULL, ${sqlQuote(featureCommit)}, ` +
      `${sqlQuote(PARITY_REVIEW.path)}, 'B', 1, 1, 'B', 1, 1)`,
  );
  shellOnRebuilt(
    `INSERT INTO review_comment (id, contents, created_date, author_id, author_login_id, author_name, thread_id) ` +
      `VALUES (${reviewCommentId}, ${sqlQuote(PARITY_REVIEW.contents)}, '2026-07-07 11:24:00', ${adminId}, ` +
      `'admin', 'Site Admin', ${reviewThreadId})`,
  );
  for (const seed of PARITY_LABEL_SEEDS) {
    const hasCategory =
      scalar(
        `SELECT COUNT(*) FROM issue_label_category WHERE project_id = ${sampleProjectId} AND name = '${seed.categoryName}'`,
      ) > 0;
    if (!hasCategory) {
      shellOnRebuilt(
        `INSERT INTO issue_label_category (id, project_id, name, is_exclusive) ` +
          `VALUES (${nextId()}, ${sampleProjectId}, '${seed.categoryName}', 0)`,
      );
    }
    const categoryId = scalar(
      `SELECT id FROM issue_label_category WHERE project_id = ${sampleProjectId} AND name = '${seed.categoryName}' LIMIT 1`,
    );
    const hasLabel =
      scalar(
        `SELECT COUNT(*) FROM issue_label WHERE category_id = ${categoryId} AND name = '${seed.labelName}'`,
      ) > 0;
    if (!hasLabel) {
      shellOnRebuilt(
        `INSERT INTO issue_label (id, name, color, category_id) ` +
          `VALUES (${nextId()}, '${seed.labelName}', '${seed.color}', ${categoryId})`,
      );
    }
  }
  // The app and the sweep's label projection both reach labels through the
  // PROJECT_LABEL association (db-projection.mjs LEGACY_PROJECTION_SQL.labels),
  // so a bare ISSUE_LABEL row is invisible to both — link each seed label to
  // the sample project or the whole reconcile measures nothing.
  const labelIdOf = (labelName) =>
    scalar(
      `SELECT id FROM issue_label WHERE name = '${labelName}' AND category_id IN ` +
        `(SELECT id FROM issue_label_category WHERE project_id = ${sampleProjectId}) LIMIT 1`,
    );
  for (const seed of PARITY_LABEL_SEEDS) {
    const labelId = labelIdOf(seed.labelName);
    if (!labelId) throw new Error(`self-check failed: seed label ${seed.labelName} row missing`);
    const hasLink =
      scalar(`SELECT COUNT(*) FROM project_label WHERE project_id = ${sampleProjectId} AND label_id = ${labelId}`) > 0;
    if (!hasLink) {
      shellOnRebuilt(`INSERT INTO project_label (project_id, label_id) VALUES (${sampleProjectId}, ${labelId})`);
    }
  }
  // Keep the seeded issue's label associations aligned with the content
  // contract used by both migration export and issue-detail probes. The
  // original H2 fixture can retain only the first association after repeated
  // recover/replay cycles even though the page seed selected both labels.
  const sampleIssueId = scalar(
    `SELECT id FROM issue WHERE project_id = ${sampleProjectId} AND number = 1 LIMIT 1`,
  );
  if (sampleIssueId) {
    for (const seed of PARITY_LABEL_SEEDS) {
      const labelId = labelIdOf(seed.labelName);
      const hasAssociation = scalar(
        `SELECT COUNT(*) FROM issue_issue_label WHERE issue_id = ${sampleIssueId} AND issue_label_id = ${labelId}`,
      ) > 0;
      if (!hasAssociation) {
        shellOnRebuilt(
          `INSERT INTO issue_issue_label (issue_id, issue_label_id) VALUES (${sampleIssueId}, ${labelId})`,
        );
      }
    }
  }

  // Recover can omit any Ebean sequence object. Reconcile after every fixture
  // mutation so each sequence is deterministic and strictly above its table's
  // current maximum before the legacy JVM opens the rebuilt file.
  reconcileLegacyModelSequences();

  // Self-check gates the boot: fixture must be clean afterwards.
  const activeStaleUsers = Number(
    /\d+/.exec(
      shellOnRebuilt("SELECT COUNT(*) FROM n4user WHERE login_id LIKE 'paritysweep%' AND state <> 'DELETED'"),
    )?.[0] ?? "0",
  );
  if (activeStaleUsers !== 0) {
    throw new Error(`self-check failed: ${activeStaleUsers} active paritysweep% users remain`);
  }
  const orphanProjectMemberships = scalar(
    "SELECT COUNT(*) FROM PROJECT_USER pu LEFT JOIN PROJECT p ON p.ID = pu.PROJECT_ID WHERE p.ID IS NULL",
  );
  if (orphanProjectMemberships !== 0) {
    throw new Error(`self-check failed: ${orphanProjectMemberships} orphan project memberships remain`);
  }
  const missingRoles = LEGACY_ROLE_SEEDS.filter(
    ([roleId]) => scalar(`SELECT COUNT(*) FROM role WHERE id = ${roleId}`) === 0,
  );
  if (missingRoles.length > 0) {
    throw new Error(`self-check failed: legacy role rows missing: ${missingRoles.map(([id]) => id).join(", ")}`);
  }
  const residueCategories = Number(
    /\d+/.exec(
      shellOnRebuilt("SELECT COUNT(*) FROM issue_label_category WHERE name LIKE 'parity-cat-sweep-%'"),
    )?.[0] ?? "0",
  );
  if (residueCategories !== 0) {
    throw new Error(`self-check failed: ${residueCategories} parity-cat-sweep% categories remain`);
  }
  // Assert the projected tuple set (same join path as the sweep projection)
  // equals the seed set exactly: no missing seed, no extra row on either
  // dimension (labels and their categories).
  const tuples = shellOnRebuilt(
    "SELECT DISTINCT l.NAME || '|' || c.NAME || '|' || l.COLOR FROM ISSUE_LABEL l " +
      "JOIN PROJECT_LABEL pl ON pl.LABEL_ID = l.ID " +
      "JOIN PROJECT p ON p.ID = pl.PROJECT_ID " +
      "LEFT JOIN ISSUE_LABEL_CATEGORY c ON c.ID = l.CATEGORY_ID " +
      "WHERE p.NAME = 'sample'",
  )
    .split("\n")
    // Line 0 is the H2 Shell column header (the SQL expression itself); data
    // starts at line 1 (see scalar()).
    .slice(1)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.includes("|"));
  const wantedTuples = PARITY_LABEL_SEEDS.map((seed) =>
    `${seed.labelName}|${seed.categoryName}|${seed.color}`.toLowerCase(),
  ).sort();
  const actualTuples = [...new Set(tuples)].sort();
  if (wantedTuples.join("\n") !== actualTuples.join("\n")) {
    throw new Error(`self-check failed: sample-project label tuples diverge from seeds (want: ${wantedTuples.join(", ")}, have: ${actualTuples.join(", ")})`);
  }

  // Persist the reconciled pagestore back over the original fixture file,
  // but only after a sanity reopen proves the rebuild is readable — a torn
  // or structurally broken rebuild would brick the legacy boot.
  const verifyRebuilt = () =>
    new Promise((resolve, reject) => {
      const child = spawn(
        javaBin,
        ["-cp", h2Jar, "org.h2.tools.Shell", "-url", `jdbc:h2:${path.join(workDir, "rebuilt")};MODE=PostgreSQL;MV_STORE=FALSE;MVCC=FALSE;IFEXISTS=TRUE`, "-user", "sa", "-password", "", "-sql", "SELECT COUNT(*) FROM N4USER"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let out = "";
      child.stdout.on("data", (c) => {
        out += c;
      });
      child.on("exit", () => resolve(out));
      child.on("error", reject);
    });
  const opened = await verifyRebuilt();
  if (!/N4USER|COUNT|rows/u.test(opened) || /Exception|Error/u.test(opened)) {
    throw new Error(`rebuilt fixture failed sanity open: ${opened.slice(0, 200)}`);
  }
  copyFileSync(path.join(workDir, "rebuilt.h2.db"), dbFile);
  try {
    unlinkSync(dbFile + ".trace.db");
  } catch {}
}

// --- scenario execution -----------------------------------------------------

function issueNumberFromLocation(location) {
  return Number((/\/issue\/(\d+)/u.exec(location) ?? [])[1]) || null;
}

function pushHelperViolation(ctx, route, expected, actual) {
  ctx.entry.violations.push(
    violation({ route, behaviorId: ctx.entry.behaviorIds[0] ?? null, kind: "api", expected, actual }),
  );
}

function mergeCookieHeader(oldHeader, setCookies) {
  const jar = new Map();
  for (const pair of (oldHeader ?? "").split("; ").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  for (const cookie of setCookies) {
    const first = cookie.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) jar.set(first.slice(0, eq), first.slice(eq + 1));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

// Shared step utilities handed to domain handlers via ctx.helpers.
export const stepHelpers = {
  async resolveLegacyPullRequest(ctx, number, title) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const output = legacyH2Shell(
        `SELECT pr.ID || '|' || pr.NUMBER || '|' || COALESCE(pr.LAST_COMMIT_ID, '')
           FROM PULL_REQUEST pr
          WHERE pr.NUMBER = ${Number(number)}
            AND pr.TO_PROJECT_ID = ${Number(ctx.state.projectIdLegacy)}
            AND pr.TITLE = ${sqlQuote(title)}
          ORDER BY pr.ID DESC LIMIT 1`,
      );
      const [id, resolvedNumber, lastCommitId] = (output.split("\n")[1] ?? "").trim().split("|");
      if (id) {
        return {
          id: Number(id) || null,
          number: Number(resolvedNumber) || null,
          lastCommitId,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`legacy PR DB id readiness timed out for display number ${number}`);
  },

  // Translate + request both sides. A >=400 observation only fails the step
  // when the sides DIVERGE (one failed, or both failed differently): an agreed
  // boundary rejection (same status both sides) is a successful probe of the
  // shared contract, not a step error. Divergences land in entry.errors (and
  // become FAILED step results) so the strict gate sees them.
  async requestBoth(ctx, legacyTranslation, yoramTranslation) {
    const { step, entry, legacySession, yoramSession } = ctx;
    const legacyResult = await legacySession.request(legacyTranslation);
    const yoramResult = await yoramSession.request(yoramTranslation);
    const legacyFailed = legacyResult.status >= 400;
    const yoramFailed = yoramResult.status >= 400;
    const agreedFailure = legacyFailed && yoramFailed && legacyResult.status === yoramResult.status;
    if (legacyFailed && !agreedFailure) {
      entry.errors.push(`legacy ${step.action} failed: HTTP ${legacyResult.status} @ ${legacyTranslation.path}`);
    }
    if (yoramFailed && !agreedFailure) {
      entry.errors.push(`yoram ${step.action} failed: HTTP ${yoramResult.status} @ ${yoramTranslation.path}`);
    }
    return { legacyResult, yoramResult };
  },

  // JSON route pair: compare parsed payloads after the shared API
  // normalization, never their raw <pre> text or a DOM shell.
  async requestJsonBoth(
    ctx,
    legacyTranslation,
    yoramTranslation,
    route = legacyTranslation.path,
    normalize = normalizeApiValue,
  ) {
    const pair = await this.requestBoth(ctx, legacyTranslation, yoramTranslation);
    if (pair.legacyResult.status >= 400 || pair.yoramResult.status >= 400) return pair;
    const parse = (result) => {
      if (result.json !== null && result.json !== undefined) return result.json;
      try {
        return JSON.parse(result.body ?? "");
      } catch {
        return null;
      }
    };
    const legacyJson = parse(pair.legacyResult);
    const yoramJson = parse(pair.yoramResult);
    if (legacyJson === null || yoramJson === null) {
      pushHelperViolation(ctx, route, { json: "<parseable>" }, { json: "<unparseable>" });
      return pair;
    }
    const expected = normalize(legacyJson);
    const actual = normalize(yoramJson);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      pushHelperViolation(ctx, route, expected, actual);
    }
    return pair;
  },

  // Canonical raw request used by mutation pairing. side: "legacy" | "yoram".
  // CSRF token attaches to EVERY yoram request (bodyless POST/DELETE included)
  // — session-routed mutations reject without it while legacy ignores it.
  async sendRaw(ctx, side, translation) {
    const session = side === "legacy" ? ctx.legacySession : ctx.yoramSession;
    const baseUrl = side === "legacy" ? ctx.options.legacyUrl : ctx.yoramBaseUrl;
    const headers = {};
    if (session.cookies) headers.cookie = session.cookies;
    let body;
    if (translation.multipart !== undefined) {
      headers["content-type"] = translation.multipart.contentType;
      body = translation.multipart.body;
    } else if (translation.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(translation.json);
    } else if (translation.form) {
      // Some legacy handlers (LabelApp, BoardApp.newComment) bind only
      // urlencoded bodies; posting/issue handlers bind only multipart. A
      // translation forces urlencoded by declaring that content-type header.
      const forceUrlEncoded =
        translation.headers?.["content-type"] === "application/x-www-form-urlencoded";
      if (side === "legacy" && !forceUrlEncoded) {
        // ponytail: legacy Play handlers read posting/issue bodies via
        // asMultipartFormData(); urlencoded bodies NPE those handlers
        // (IssueApp.newIssue), so legacy form POSTs default to multipart and
        // fetch owns the boundary content-type.
        const formData = new FormData();
        for (const [key, value] of Object.entries(translation.form)) formData.append(key, String(value));
        body = formData;
      } else {
        headers["content-type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(translation.form).toString();
      }
    }
    const csrfToken = session.csrfToken ?? "";
    if (side === "yoram" && csrfToken) headers["x-csrf-token"] = csrfToken;
    Object.assign(headers, translation.headers ?? {});
    const response = await fetch(`${baseUrl}${translation.path}`, {
      method: translation.method,
      headers,
      body,
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "";
    const nextCookies = response.headers.getSetCookie?.() ?? [];
    if (nextCookies.length > 0) session.cookies = mergeCookieHeader(session.cookies, nextCookies);
    const text = location ? "" : await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON bodies stay as text
    }
    return { status: response.status, location, json, body: text };
  },

  // Mixed-form pair: legacy redirects (303) vs yoram REST JSON (200/204). Only
  // requires both sides to succeed (<400) — status-class equality flags every
  // redirect-vs-JSON pair as a violation.
  async pairLenient(ctx, legacyTranslation, yoramTranslation, route) {
    const legacyResult = await this.sendRaw(ctx, "legacy", legacyTranslation);
    const yoramResult = await this.sendRaw(ctx, "yoram", yoramTranslation);
    const legacyFail = legacyResult.status >= 400;
    const yoramFail = yoramResult.status >= 400;
    // Agreed outcomes are parity (even agreed errors); only disagreement in
    // success/failure — or in the failing status itself — is a violation.
    if ((legacyFail !== yoramFail) || (legacyFail && yoramFail && legacyResult.status !== yoramResult.status)) {
      pushHelperViolation(ctx, route, { status: legacyResult.status }, { status: yoramResult.status });
    }
    return { legacyResult, yoramResult };
  },
  // Sweep SMTP catch-box access: newest-first raw .eml contents.
  readMails,
  extractMailLinks,
  // Waits until the sink holds more than `previousCount` mails, then returns
  // the new (newest-first) raw .eml contents.
  async waitForMail(previousCount, timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const mails = readMails();
      if (mails.length > previousCount) return mails.slice(0, mails.length - previousCount);
      if (Date.now() > deadline) return [];
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  },
   issueNumberFromLocation,
  // Render both dom targets as skeletons and diff; any violation is a dom kind.
  async renderDomTarget(ctx, domTarget) {
    const { step, suffix, entry, legacySession, yoramSession, options } = ctx;
    const observe = async () => {
      await setCookiesFromHeader(ctx.legacyPage, options.legacyUrl, legacySession.cookies);
      await setCookiesFromHeader(ctx.yoramPage, ctx.yoramBaseUrl, yoramSession.cookies);
      const legacySkeleton = await renderSkeleton(ctx.legacyPage, domTarget.legacy, {
        selector: domTarget.legacySelector ?? domTarget.selector,
      });
      const yoramSkeleton = await renderSkeleton(ctx.yoramPage, domTarget.yoram, {
        spa: domTarget.spa,
        selector: domTarget.yoramSelector ?? domTarget.selector,
      });
      if (domTarget.currentToken) {
        for (const [page, side] of [[ctx.legacyPage, "legacy"], [ctx.yoramPage, "yoram"]]) {
          const hasToken = await page.evaluate(
            (token) => document.body?.innerText?.includes(token) ?? false,
            domTarget.currentToken,
          );
          if (!hasToken) throw new Error(`${side} DOM missing current differential token "${domTarget.currentToken}"`);
        }
      }
      return { diffs: diffSkeletons(legacySkeleton, yoramSkeleton), legacyCount: legacySkeleton.length, yoramCount: yoramSkeleton.length };
    };
    const recordInfraError = (error) => {
      entry.errors.push(`dom render (${step.action}) [${suffix}]: ${error.message}`);
      entry.violations.push(
        violation({
          route: domTarget.legacy.replace(options.legacyUrl, ""),
          behaviorId: entry.behaviorIds[0] ?? null,
          kind: "infra",
          expected: "browser render observable on both sides",
          actual: error.message,
        }),
      );
    };
    try {
      let observation;
      try {
        observation = await observe();
      } catch (error) {
        // CDP protocol timeouts ("Runtime.callFunctionOn timed out",
        // protocolTimeout) wedge the tab permanently and the error does not
        // say which side, so recreate both sweep pages once and retry.
        if (!/Runtime\.callFunctionOn timed out|protocolTimeout|timed? ?out/i.test(error.message ?? "")) throw error;
        for (const key of ["legacyPage", "yoramPage"]) {
          await raceTimeout(ctx[key].close(), `close wedged page (${key})`).catch(() => {});
          // Write through the shared holder: later steps rebuild their ctx
          // from it, so a stale closed page would poison the rest of sweep.
          ctx.browserPages[key] = ctx[key] = await ctx.browser.defaultBrowserContext().newPage();
        }
        observation = await observe();
      }
      if (observation.diffs.length > 0) {
        entry.violations.push(
          violation({
            route: domTarget.legacy.replace(options.legacyUrl, ""),
            kind: "dom",
            expected: { skeletonEntries: observation.legacyCount },
            actual: { skeletonEntries: observation.yoramCount, firstDiffs: observation.diffs },
          }),
        );
      }
    } catch (error) {
      recordInfraError(error);
    }
  },

  issueNumberFromLocation,
  setCookiesFromHeader,
  hoverAnchor,
  raceTimeout,
  popoverExtract: POPOVER_EXTRACT,
};

export async function executeStep(context) {
  const { step, entry } = context;
  const result = { action: step.action, status: "EXECUTED", error: null };
  if (step.disposition) result.disposition = step.disposition;
  entry.stepResults ??= [];
  entry.stepResults.push(result);
  const definition = ACTION_DEFINITIONS[step.action];
  if (!definition?.handler) {
    result.status = "FAILED";
    result.error = `unknown action: ${step.action}`;
    entry.errors.push(result.error);
    return;
  }
  try {
    const errorCountBefore = entry.errors.length;
    await definition.handler({ ...context, helpers: stepHelpers });
    if (entry.errors.length > errorCountBefore) {
      result.status = "FAILED";
      result.error = entry.errors.slice(errorCountBefore).join("; ");
    }
  } catch (error) {
    if (error instanceof HarnessError) {
      // Scenario marked HARNESS_ERROR once; dependent actions skip quietly.
      if (!entry.harnessNoted) {
        result.status = "FAILED";
        result.error = error.message;
        entry.harnessNoted = true;
        entry.violations.push(
          violation({ route: step.action, behaviorId: entry.behaviorIds[0] ?? null, kind: "harness", expected: "resolvable entity id", actual: error.message }),
        );
      } else {
        result.status = "SKIPPED";
        result.error = error.message;
        entry.errors.push(`${step.action} skipped: ${error.message}`);
      }
    } else {
      result.status = "FAILED";
      result.error = error.message;
      console.error(`[${step.action}]`, error.stack ?? error.message);
      entry.errors.push(`${step.action}: ${error.message}`);
    }
  }
}

export function runtimeVerifiedBehaviorIds(scenarioEntries) {
  return Object.entries(buildBehaviorVerification(scenarioEntries))
    .filter(
      ([, verification]) =>
        verification.verified &&
        verification.failedSteps === 0 &&
        verification.skippedSteps === 0 &&
        verification.requiredSteps === verification.executedSteps + verification.dispositionedSteps,
    )
    .map(([behaviorId]) => behaviorId);
}

// --- sweep ------------------------------------------------------------------

export async function runSweep(options = {}) {
  outputDir = path.resolve(options.outputDir ?? process.env.YONA_DIFFERENTIAL_OUTPUT_DIR ?? defaultOutputDir);
  yoramRuntimeDir = path.join(outputDir, "yoram");
  const runId = `sweep-${Date.now().toString(36)}`;
  const infraErrors = [];
  let yoramHandle = null;
  let browserHandle = null;
  const selectedScenarios = selectScenarios(options.scenarioIds);

  const inventory = JSON.parse(readFileSync(path.join(repoRoot, "docs/provenance/behavior-inventory.json"), "utf8"));
  const problems = validateScenarios(scenarios, Object.keys(ACTION_DEFINITIONS));
  if (problems.length > 0) throw new Error(`invalid scenarios: ${problems.join("; ")}`);

  const report = {
    runId,
    version: 1,
    startedAt: new Date().toISOString(),
    scenarios: [],
    behaviorsCovered: [],
    dbProjection: null,
    infraErrors,
  };

  let mailSink = null;
  try {
    mkdirSync(path.join(outputDir, "mail-out"), { recursive: true });
    clearMailOut();
    // Pre-boot window: no JVM holds the H2 file yet. Reconciliation MUST
    // apply — measuring against polluted fixtures is worse than not running,
    // so any failure aborts the sweep loudly.
    await stopLegacy();
    await reconcileLegacyFixturesPreboot();
    patchLegacySmtpConf();
    // The legacy instance must be restarted to pick up the patched smtp conf.
    mailSink = await bootMailSink();
    let legacyBooted = true;
    try {
      await bootLegacy();
    } catch (error) {
      legacyBooted = false;
      infraErrors.push(`legacy boot: ${error.message}`);
    }
    try {
      yoramHandle = await bootYoram(options.yoramPort ?? 3101);
    } catch (error) {
      infraErrors.push(`yoram boot: ${error.message}`);
    }

    if (!legacyBooted || !yoramHandle) {
      // Record the infra failure against every scenario so the report carries
      // a failure reason even when an instance never came up.
      for (const scenario of selectedScenarios) {
        report.scenarios.push({ id: scenario.id, title: scenario.title, behaviorIds: [], violations: [], errors: [...infraErrors], stepResults: [] });
      }
      report.executionAccounting = summarizeExecution(report, selectedScenarios.length);
      report.dbProjection = { skipped: true, reason: [...infraErrors] };
      return report;
    }

    // Align fixtures before scenarios: empty seeded repos starve PR flows and
    // asymmetric label seeds poison the unfiltered label projection.
    try {
      await alignParityFixtures({ legacyUrl: options.legacyUrl ?? process.env.YONA_LEGACY_URL ?? "http://127.0.0.1:9000" });
    } catch (error) {
      infraErrors.push(`fixture alignment: ${error.message}`);
    }

    browserHandle = await launchBrowserHandle();
    // Single mutable holder for the sweep's two pages: page-recreation
    // recovery writes back into it so later steps never see closed tabs.
    const browserPages = {
      legacyPage: await browserHandle.browser.defaultBrowserContext().newPage(),
      yoramPage: await browserHandle.browser.defaultBrowserContext().newPage(),
    };

    const legacySession = new LegacySession(options.legacyUrl);
    const yoramSession = new YoramSession(yoramHandle.baseUrl);

    for (let index = 0; index < selectedScenarios.length; index += 1) {
      const scenario = selectedScenarios[index];
      const entry = {
        id: scenario.id,
        title: scenario.title,
        behaviorIds: matchBehaviors(scenario, inventory.behaviors),
        violations: [],
        errors: [],
        stepResults: [],
      };
      const state = { issueNumberLegacy: null, issueNumberYoram: null };
      const suffix = `${runId}-${index + 1}`;
      for (const step of scenario.actions) {
        const resolved = {
          title: `Differential sweep issue ${suffix}`,
          body: `Differential sweep issue body ${suffix}`,
          issueNumber: null,
        };
        try {
          await executeStep({
            step,
            resolved,
            suffix,
            legacyPage: browserPages.legacyPage,
            yoramPage: browserPages.yoramPage,
            browserPages,
            state,
            entry,
            legacySession,
            yoramSession,
            browser: browserHandle.browser,
            options,
            yoramBaseUrl: yoramHandle.baseUrl,
          });
        } catch (error) {
          const result = entry.stepResults.at(-1);
          if (result?.action === step.action && result.status === "EXECUTED") {
            result.status = "FAILED";
            result.error = error.message;
          }
          entry.errors.push(`${step.action}: ${error.message}`);
        }
      }
      reclassifyScenarioViolations(entry);
      report.scenarios.push(entry);
      const partialPath = options.partialReportPath ?? process.env.YONA_DIFFERENTIAL_PARTIAL_REPORT;
      if (partialPath) {
        mkdirSync(path.dirname(path.resolve(partialPath)), { recursive: true });
        const temporary = `${path.resolve(partialPath)}.tmp`;
        writeFileSync(temporary, `${JSON.stringify({ ...report, status: "RUNNING" }, null, 2)}\n`);
        renameSync(temporary, path.resolve(partialPath));
        const progressPath = process.env.YONA_DIFFERENTIAL_PROGRESS;
        if (progressPath) {
          const progressTemporary = `${path.resolve(progressPath)}.tmp`;
          writeFileSync(progressTemporary, `${JSON.stringify({ status: "RUNNING", scenarioId: scenario.id, attempted: report.scenarios.length }, null, 2)}\n`);
          renameSync(progressTemporary, path.resolve(progressPath));
        }
      }
    }

    report.behaviorsCovered = runtimeVerifiedBehaviorIds(report.scenarios);
    report.executionAccounting = summarizeExecution(report, selectedScenarios.length);

    // Teardown before DB projections: the H2 file lock releases on stop.
    await yoramHandle.stop();
    yoramHandle = null;
    await stopLegacy();

    report.dbProjection = await projectDatabases(options, runId);
    return report;
  } catch (error) {
    infraErrors.push(`sweep: ${error.message}`);
    report.behaviorsCovered = runtimeVerifiedBehaviorIds(report.scenarios);
    report.executionAccounting = summarizeExecution(report, selectedScenarios.length);
    return report;
  } finally {
    if (browserHandle) await browserHandle.close().catch(() => {});
    if (yoramHandle) await yoramHandle.stop().catch(() => {});
    if (mailSink) await stopChild(mailSink).catch(() => {});
  }
}

async function projectDatabases(options, runId) {
  const legacyDb = path.join(repoRoot, ".agent/legacy-localhost/instances/parity/data/db/yona.h2.db");
  const yoramDb = path.join(yoramRuntimeDir, "yoram.db");
  const projectName = "sample";
  const kinds = [
    ["issues", (rows, side) => projectIssueRows(rows, ISSUE_STATE_ENCODINGS[side])],
    ["comments", projectCommentRows],
    ["labels", projectLabelRows],
  ];
  const projection = {};
  for (const [kind, project] of kinds) {
    // Sweep-created rows carry the runId in title/body; filtering both sides
    // to this run keeps accumulated legacy H2 rows from poisoning the diff.
    // Labels are seed data and stay unfiltered.
    const tag = kind === "labels" ? null : runId;
    const legacyRows = filterRowsByTag(project(await queryLegacyH2(repoRoot, legacyDb, kind, projectName), "legacy"), tag);
    const yoramRows = filterRowsByTag(project(await queryYoramSqlite(yoramDb, kind, projectName), "yoram"), tag);
    projection[kind] = { legacyRows: legacyRows.length, yoramRows: yoramRows.length };
    const diffs = diffProjections(legacyRows, yoramRows);
    if (diffs.length > 0) {
      projection[kind].violations = diffs;
    }
  }
  void options;
  return projection;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedScenarios = selectScenarios(options.scenarioIds);
  const report = await runSweep(options);

  // DB-level violations surface as dedicated scenarios so they flow through
  // the same violation channel as api/dom findings.
  if (report.dbProjection) {
    for (const [kind, projection] of Object.entries(report.dbProjection)) {
      if (projection.violations?.length > 0) {
        report.scenarios.push({
          id: `db-${kind}`,
          title: `db projection ${kind} (admin/sample)`,
          behaviorIds: [],
          violations: [
            violation({
              route: `db:admin/sample/${kind}`,
              kind: "db",
              expected: projection.violations.filter((entry) => entry.side === "legacy-only").map((entry) => entry.row),
              actual: projection.violations.filter((entry) => entry.side === "yoram-only").map((entry) => entry.row),
            }),
          ],
          errors: [],
        });
      }
    }
  }
  report.finishedAt = new Date().toISOString();

  // Runtime handlers may remove a matcher when its mail/fixture was not
  // reachable; persist the IDs actually exercised, not the static registry.
  const runtimeScenarios = new Map(report.scenarios.map((scenario) => [scenario.id, scenario]));
  const coverage = {
    runId: report.runId,
    version: 1,
    behaviorVerification: buildBehaviorVerification(report.scenarios),
    scenarios: selectedScenarios.map((scenario) => {
      const runtime = runtimeScenarios.get(scenario.id);
      return {
        scenarioId: scenario.id,
        title: scenario.title,
        behaviorIds: runtime?.behaviorIds ?? [],
      };
    }),
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "behavior-coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
  const reportPath = writeReport(report, outputDir);
  console.log(formatSummary(report));
  console.log(`report: ${reportPath}`);
}

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMainModule) {
  await main();
}
