// Differential parity sweep orchestrator.
//
// Boots the legacy yona-h2 parity instance (scripts/legacy-localhost.mjs) and a
// Yoram instance side by side, runs the smoke scenario DSL through dual
// adapters, compares API responses / rendered DOM skeletons / SQL semantic
// projections, and writes .agent/differential/report.json plus a stdout summary.
//
// Usage: node scripts/differential/run.mjs [--legacy-url URL] [--yoram-port N]

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";


import { LegacySession, YoramSession, translateLegacy, translateYoram } from "./adapters.mjs";
import {
  diffProjections,
  diffSkeletons,
  filterRowsByTag,
  normalizeApiValue,
  projectCommentRows,
  projectIssueRows,
  projectLabelRows,
} from "./diff.mjs";
import { queryLegacyH2, queryYoramSqlite } from "./db-projection.mjs";
import { formatSummary, violation, writeReport } from "./report.mjs";
import { launchWtrBrowser } from "../wtr-browser.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.join(repoRoot, ".agent/differential");
import { buildCoverage, matchBehaviors, smokeScenarios, validateScenarios } from "./dsl.mjs";
const yoramRuntimeDir = path.join(outputDir, "yoram");


const SKELETON_EXTRACT = () => {
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
        entries.push(`${element.tagName.toLowerCase()}${className ? `.${className.split(/\s+/u).join(".")}` : ""}:${text}`);
      }
    }
    for (const child of element.children) visit(child);
  };
  visit(document.body);
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
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`selector not found: ${sel}`);
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, selector),
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

function parseArgs(argv) {
  const options = { legacyUrl: process.env.YONA_LEGACY_URL ?? "http://127.0.0.1:9000", yoramPort: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--legacy-url") options.legacyUrl = argv[++i];
    else if (argv[i] === "--yoram-port") options.yoramPort = Number(argv[++i]);
  }
  return options;
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
async function writeYoramConfig(databaseUrl, dataRoot, seedPilot, port) {
  const config = [
    `bind_addr = ${JSON.stringify(`127.0.0.1:${port}`)}`,
    `database_url = ${JSON.stringify(databaseUrl)}`,
    `data_root = ${JSON.stringify(dataRoot)}`,
    `public_origin = ${JSON.stringify(`http://127.0.0.1:${port}`)}`,
    "asset_root = \"frontend/dist\"",
    `seed_pilot = ${seedPilot ? "true" : "false"}`,
    "use_embedded_assets = false",
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
    },
    stdio: ["ignore", openSync(yoramServerLog, "a"), openSync(yoramServerLog, "a")],
  });
}

// Provision the same account/project names and passwords as the legacy
// parity instance (scripts/legacy-localhost.mjs) through Yoram's own REST
// surface, so both sides authenticate with identical credentials.
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
    { loginId: "alice", password: "alice", name: "Alice Kim", email: "alice@example.com" },
    // ponytail: Yoram REST enforces LEGACY_MIN_PASSWORD_LENGTH=4 while the
    // legacy parity seed uses 3-char "bob"; bump until a bob actor scenario exists.
    { loginId: "bob", password: "bobbob", name: "Bob Park", email: "bob@example.com" },
    { loginId: "carol", password: "carolcarol", name: "Carol Lee", email: "carol@example.com" },
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
    if (result.status !== 200) {
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
    await writeYoramConfig(databaseUrl, dataRoot, true, port);
    const child = startYoramProcess(port);
    children.push(child);
    try {
      await waitForHttp(`http://127.0.0.1:${port}/api/auth/session`);
      await provisionYoramParityAccounts(`http://127.0.0.1:${port}`);
    } finally {
      await stopChild(child);
    }
  }

  const seedModule = await import(pathToFileURL(path.join(repoRoot, "scripts/run-dev-backend-once.mjs")).href);
  seedModule.reconcileDefaultDevSiteAdmin(databasePath);
  seedModule.reconcileDefaultDevParitySeed(databasePath, yoramRuntimeDir);

  await writeYoramConfig(databaseUrl, dataRoot, false, port);
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

async function renderSkeleton(page, url, { spa = false } = {}) {
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  if (spa) {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }
  return page.evaluate(SKELETON_EXTRACT);
}

async function setCookiesFromHeader(page, baseUrl, header) {
  if (!header) return;
  for (const pair of header.split("; ").filter(Boolean)) {
    const eq = pair.indexOf("=");
    await page.setCookie({ name: pair.slice(0, eq), value: pair.slice(eq + 1), url: baseUrl });
  }
}

// --- scenario execution -----------------------------------------------------

function issueNumberFromLocation(location) {
  return Number((/\/issue\/(\d+)/u.exec(location) ?? [])[1]) || null;
}

async function executeStep(context) {
  const { step, resolved, state, entry, legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl, suffix } = context;
  const route =
    step.params.owner && step.params.project
      ? `/${step.params.owner}/${step.params.project}`
      : "/";

  if (step.action === "hover-popover") return executeBrowserInteraction(context);

  if (step.action === "create-issue-comment") resolved.issueNumber = state.issueNumberLegacy;
  const legacyTranslation = translateLegacy(step, resolved);
  const yoramResolved = {
    ...resolved,
    issueNumber: step.action === "create-issue-comment" ? state.issueNumberYoram : null,
  };
  const yoramTranslation = translateYoram(step, yoramResolved);

  // --- legacy side ---
  let legacyResult = null;
  if (step.action === "login") {
    legacyResult = await legacySession.login(step.params);
    if (legacyResult.status >= 400) {
      entry.violations.push(
        violation({ route: "/users/login", kind: "api", expected: "<3xx redirect>", actual: `status ${legacyResult.status}` }),
      );
    }
  } else {
    legacyResult = await legacySession.request(legacyTranslation);
    if (legacyResult.status >= 400) {
      entry.errors.push(`legacy ${step.action} failed: HTTP ${legacyResult.status} @ ${legacyTranslation.path}`);
    }
  }

  // --- yoram side ---
  let yoramResult = null;
  if (step.action === "login") {
    yoramResult = await yoramSession.login(step.params);
    if (yoramResult.status >= 400) {
      entry.violations.push(violation({ route: "/api/v1/auth/sign-in", kind: "api", expected: 200, actual: yoramResult.status }));
    }
  } else {
    yoramResult = await yoramSession.request(yoramTranslation);
    if (yoramResult.status >= 400) {
      entry.errors.push(`yoram ${step.action} failed: HTTP ${yoramResult.status} @ ${yoramTranslation.path}`);
    }
  }

  // --- API semantic diff on mutation steps ---
  if (step.action === "create-issue") {
    state.issueNumberLegacy = issueNumberFromLocation(legacyResult?.location ?? "");
    const yoramJson = yoramResult?.json ?? {};
    state.issueNumberYoram = Number(yoramJson.number ?? yoramJson.issue?.number ?? 0) || null;
    const semantic = {
      legacy: { title: legacyTranslation.form.title, body: legacyTranslation.form.body },
      yoram: {
        title: yoramJson.title ?? yoramJson.issue?.title ?? null,
        body: yoramJson.bodyMarkdown ?? yoramJson.issue?.bodyMarkdown ?? null,
      },
    };
    if (
      semantic.yoram.title === null ||
      normalizeApiValue(semantic.legacy.title) !== normalizeApiValue(semantic.yoram.title)
    ) {
      entry.violations.push(violation({ route, behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: semantic.legacy, actual: semantic.yoram }));
    }
  }

  // --- DOM skeleton diff ---
  const domTarget = { legacy: null, yoram: null, spa: false };
  if (step.action === "view-project" || step.action === "list-labels") {
    const leaf = step.action === "view-project" ? "" : "/labels";
    domTarget.legacy = `${options.legacyUrl}/${step.params.owner}/${step.params.project}${leaf}`;
    domTarget.yoram = `${yoramBaseUrl}/${step.params.owner}/${step.params.project}${leaf}`;
  } else if (
    (step.action === "create-issue" || step.action === "create-issue-comment") &&
    state.issueNumberLegacy &&
    state.issueNumberYoram
  ) {
    domTarget.legacy = `${options.legacyUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberLegacy}`;
    domTarget.yoram = `${yoramBaseUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberYoram}`;
    domTarget.spa = true;
  }

  if (domTarget.legacy && domTarget.yoram) {
    try {
      await setCookiesFromHeader(legacyPage, options.legacyUrl, legacySession.cookies);
      await setCookiesFromHeader(yoramPage, yoramBaseUrl, yoramSession.cookies);
      const legacySkeleton = await renderSkeleton(legacyPage, domTarget.legacy);
      const yoramSkeleton = await renderSkeleton(yoramPage, domTarget.yoram, { spa: domTarget.spa });
      const diffs = diffSkeletons(legacySkeleton, yoramSkeleton);
      if (diffs.length > 0) {
        entry.violations.push(
          violation({
            route: domTarget.legacy.replace(options.legacyUrl, ""),
            kind: "dom",
            expected: { skeletonEntries: legacySkeleton.length },
            actual: { skeletonEntries: yoramSkeleton.length, firstDiffs: diffs },
          }),
        );
      }
    } catch (error) {
      entry.errors.push(`dom render (${step.action}) [${suffix}]: ${error.message}`);
    }
  }
}

// Browser-driven interaction: hover popovers never render over plain HTTP, so
// both sides get the identical in-page trigger and the revealed popover is
// compared as a skeleton. Any side failure lands in entry.errors with a
// reason; a one-sided popover is a violation, not a crash.
async function executeBrowserInteraction(context) {
  const { step, suffix, entry, legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl } = context;
  const { owner, project, path: pagePath = "/issues", selector } = step.params;
  const pages = { legacy: legacyPage, yoram: yoramPage };
  const sessions = { legacy: legacySession, yoram: yoramSession };
  const skeletons = {};
  for (const side of ["legacy", "yoram"]) {
    const url = `${side === "legacy" ? options.legacyUrl : yoramBaseUrl}/${owner}/${project}${pagePath}`;
    try {
      await setCookiesFromHeader(pages[side], url, sessions[side].cookies);
      await pages[side].goto(url, { waitUntil: "load", timeout: 30_000 });
      const method = await hoverAnchor(pages[side], selector);
      if (process.env.DIFF_HOVER_DEBUG) console.error(`[hover-debug] ${side}: trigger=${method}`);
      skeletons[side] = await raceTimeout(pages[side].evaluate(POPOVER_EXTRACT), `${side} popover extract`);
    } catch (error) {
      entry.errors.push(`browser ${side} (${step.action}) [${suffix}]: ${error.message}`);
      skeletons[side] = null;
    }
  }
  if (skeletons.legacy === null || skeletons.yoram === null) return;
  const route = `/${owner}${pagePath} hover ${selector}`;
  if (skeletons.legacy.length === 0 || skeletons.yoram.length === 0) {
    entry.violations.push(
      violation({
        route,
        behaviorId: entry.behaviorIds[0] ?? null,
        kind: "browser",
        expected: { visiblePopovers: skeletons.legacy.length },
        actual: { visiblePopovers: skeletons.yoram.length },
      }),
    );
    return;
  }
  const diffs = diffSkeletons(skeletons.legacy, skeletons.yoram);
  if (diffs.length > 0) {
    entry.violations.push(
      violation({ route, behaviorId: entry.behaviorIds[0] ?? null, kind: "browser", expected: skeletons.legacy, actual: skeletons.yoram }),
    );
  }
}

// --- sweep ------------------------------------------------------------------

export async function runSweep(options = {}) {
  const runId = `sweep-${Date.now().toString(36)}`;
  const infraErrors = [];
  let yoramHandle = null;
  let browserHandle = null;

  const inventory = JSON.parse(readFileSync(path.join(repoRoot, "docs/provenance/behavior-inventory.json"), "utf8"));
  const problems = validateScenarios(smokeScenarios);
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

  try {
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
      for (const scenario of smokeScenarios) {
        report.scenarios.push({ id: scenario.id, title: scenario.title, behaviorIds: [], violations: [], errors: [...infraErrors] });
      }
      report.dbProjection = { skipped: true, reason: [...infraErrors] };
      return report;
    }

    browserHandle = await launchBrowserHandle();
    const legacyPage = await browserHandle.browser.defaultBrowserContext().newPage();
    const yoramPage = await browserHandle.browser.defaultBrowserContext().newPage();

    const legacySession = new LegacySession(options.legacyUrl);
    const yoramSession = new YoramSession(yoramHandle.baseUrl);

    for (let index = 0; index < smokeScenarios.length; index += 1) {
      const scenario = smokeScenarios[index];
      const entry = {
        id: scenario.id,
        title: scenario.title,
        behaviorIds: matchBehaviors(scenario, inventory.behaviors),
        violations: [],
        errors: [],
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
            state,
            entry,
            legacySession,
            yoramSession,
            legacyPage,
            yoramPage,
            options,
            yoramBaseUrl: yoramHandle.baseUrl,
          });
        } catch (error) {
          entry.errors.push(`${step.action}: ${error.message}`);
        }
      }
      report.scenarios.push(entry);
    }

    report.behaviorsCovered = [...new Set(report.scenarios.flatMap((scenario) => scenario.behaviorIds))];

    // Teardown before DB projections: the H2 file lock releases on stop.
    await yoramHandle.stop();
    yoramHandle = null;
    await stopLegacy();

    report.dbProjection = await projectDatabases(options, runId);
    return report;
  } catch (error) {
    infraErrors.push(`sweep: ${error.message}`);
    return report;
  } finally {
    if (browserHandle) await browserHandle.close().catch(() => {});
    if (yoramHandle) await yoramHandle.stop().catch(() => {});
  }
}

async function projectDatabases(options, runId) {
  const legacyDb = path.join(repoRoot, ".agent/legacy-localhost/instances/parity/data/db/yona.h2.db");
  const yoramDb = path.join(yoramRuntimeDir, "yoram.db");
  const projectName = "sample";
  const kinds = [
    ["issues", projectIssueRows],
    ["comments", projectCommentRows],
    ["labels", projectLabelRows],
  ];
  const projection = {};
  for (const [kind, project] of kinds) {
    // Sweep-created rows carry the runId in title/body; filtering both sides
    // to this run keeps accumulated legacy H2 rows from poisoning the diff.
    // Labels are seed data and stay unfiltered.
    const tag = kind === "labels" ? null : runId;
    const legacyRows = filterRowsByTag(project(await queryLegacyH2(repoRoot, legacyDb, kind, projectName)), tag);
    const yoramRows = filterRowsByTag(project(await queryYoramSqlite(yoramDb, kind, projectName)), tag);
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
              expected: projection.violations.filter((entry) => entry.side === "yoram-only").map((entry) => entry.row),
              actual: projection.violations.filter((entry) => entry.side === "legacy-only").map((entry) => entry.row),
            }),
          ],
          errors: [],
        });
      }
    }
  }
  report.finishedAt = new Date().toISOString();

  // Coverage artifact; docs/provenance/behavior-inventory.json stays immutable.
  const inventory = JSON.parse(readFileSync(path.join(repoRoot, "docs/provenance/behavior-inventory.json"), "utf8"));
  const coverage = buildCoverage(smokeScenarios, inventory.behaviors, report.runId);
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
