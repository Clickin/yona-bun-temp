// Builds docs/provenance/behavior-inventory.json from the legacy Yona sources
// (yona-original/). Machine-extracts behavior units: routes from conf/routes,
// triggers from *.scala.html templates, dynamic effects (alerts, confirms,
// JS navigation) from public/javascripts/service/*.js.
//
// Re-run: node scripts/build-behavior-inventory.mjs
// Output is deterministic (sorted, stable ids) — diff-safe on re-runs.

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "yona-original";
const ROUTES_FILE = join(ROOT, "conf/routes");
const VIEWS_DIR = join(ROOT, "app/views");
const JS_DIR = join(ROOT, "public/javascripts/service");
const OUT_FILE = "docs/provenance/behavior-inventory.json";

// ---------------------------------------------------------------------------
// Route parsing
// ---------------------------------------------------------------------------

// ponytail: skips only Assets/static; API routes are kept as behaviors with a
// direct-http trigger. If inventory noise from /-_-api becomes a problem,
// filter them here — Phase C's dual adapter consumes them either way.
export function parseRoutes(text) {
  const routes = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+controllers\.([A-Za-z0-9_.]+?)(?:\(|$)/);
    if (!m) continue;
    const [, method, path, full] = m;
    if (full === "Assets.at" || full === "Application.jsMessages") continue;
    const parts = full.split(".");
    const controllerMethod = parts[parts.length - 1];
    const controllerClass = parts[parts.length - 2];
    routes.push({
      method,
      path,
      controllerClass,
      controllerMethod,
      // Match key used to link templates/JS: "Controller.method"
      key: `${controllerClass}.${controllerMethod}`,
      line: i + 1,
    });
  }
  return routes;
}

// ---------------------------------------------------------------------------
// Actor inference (heuristic, ordered rules)
// ---------------------------------------------------------------------------

const ANONYMOUS_METHODS = new Set([
  "loginForm", "logout", "oAuth", "oAuthLogout", "oAuthDenied", "oAuthFailure",
  "signupForm", "newUserForm", "saveUser", "lostPassword", "resetPassword",
  "fake", "index", "restricted", "migration", "help",
]);
const MANAGER_METHOD_PATTERN =
  /(^|\.)(delete|setting|settings|transfer|webhook|member|members|massUpdate|massMail|changeVCS|newLabel|editLabel)/i;

// ponytail: keyword-based actor guess; wrong guesses only mislabel a
// scenario's precondition, never hide a parity violation. Refine per-behavior
// in Phase C if a sweep shows wrong logins.
export function inferActor(route) {
  if (route.controllerClass === "SiteApp") return "siteAdmin";
  if (ANONYMOUS_METHODS.has(route.controllerMethod)) return "anonymous";
  if (MANAGER_METHOD_PATTERN.test(route.controllerMethod)) return "manager";
  if (/\/(settings|members|delete)/.test(route.path)) return "manager";
  return "member";
}

// ---------------------------------------------------------------------------
// Template trigger extraction
// ---------------------------------------------------------------------------

const ASSETS_REF = /routes\.Assets\.at/;

// Extracts trigger candidates from one scala.html template.
// kinds: "form" (action=/helper.form), "link" (@routes reference),
// "dataRequest" (data-request-method), "modal" (data-toggle="modal").
export function templateTriggers(text) {
  const triggers = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (/\baction\s*=\s*"[^"]*@routes\./.test(line) || /@helper\.form\s*\(\s*routes\./.test(line)) {
      const m = line.match(/@routes\.([A-Za-z0-9_.]+)\(/);
      if (m) triggers.push({ kind: "form", key: m[1], line: lineNo });
    }

    // data-request-method pairs with an optional data-request-uri that may sit
    // on the next attribute line — scan a 2-line window.
    // ponytail: window is 2 lines; attributes split across >2 lines fall back
    // to a plain link trigger instead of being lost.
    const window = `${line}\n${lines[i + 1] ?? ""}`;
    // Anchor on the attribute line itself; the window only extends the search
    // for the paired data-request-uri on the following line.
    if (/data-request-method="/.test(line)) {
      const drm = window.match(/data-request-method="(get|post|put|patch|delete)"/);
      const uri = window.match(/data-request-uri="([^"]*)"/);
      const key = uri ? (uri[1].match(/@routes\.([A-Za-z0-9_.]+)\(/) || [])[1] : undefined;
      triggers.push({ kind: "dataRequest", key, line: lineNo, method: drm[1] });
    }

    if (/data-toggle="modal"/.test(line)) {
      const key = (line.match(/@routes\.([A-Za-z0-9_.]+)\(/) || [])[1];
      triggers.push({ kind: "modal", key, line: lineNo });
    }

    // Bare @routes references = links/buttons. Skip ones already captured as
    // form/dataRequest targets and asset includes.
    if (ASSETS_REF.test(line)) continue;
    for (const m of line.matchAll(/@routes\.([A-Za-z0-9_.]+)\(/g)) {
      triggers.push({ kind: "link", key: m[1], line: lineNo });
    }
  }
  // A plain @routes reference to a route already captured as a
  // form/dataRequest/modal target is the same control — drop the duplicate.
  const coveredKeys = new Set(
    triggers.filter((t) => t.kind !== "link" && t.key).map((t) => t.key),
  );
  return triggers.filter((t) => t.kind !== "link" || !coveredKeys.has(t.key));
}

// ---------------------------------------------------------------------------
// JS effect extraction (service/*.js only — common/*.js is infrastructure)
// ---------------------------------------------------------------------------
export function jsEffects(text) {
  const effects = { alert: new Set(), navigation: false };
  const callRe =
    /\$yobi\.(?:alert|showAlert|confirm|ajaxConfirm|notify)\((?:Messages\()?"([^"]+)"/g;
  for (const m of text.matchAll(callRe)) {
    // ponytail: dynamically concatenated keys ("x." + field) are recorded with
    // a "*" suffix — unresolvable at build time, still proves the alert effect.
    effects.alert.add(m[1].endsWith(".") ? `${m[1]}*` : m[1]);
  }
  if (/location\.href\s*=/.test(text) || /htmsNavigate/.test(text)) effects.navigation = true;
  return effects;
}

// ponytail: whole-file domain match attaches every JS alert/confirm in the
// domain to every behavior of the same controller — over-approximates effects.
// Deliberate: a missed effect hides a parity violation; an extra one only
// widens the differential sweep.
const CONTROLLER_JS_DOMAINS = {
  BoardApp: ["board"],
  IssueApp: ["issue", "showSubtask", "temporarySaveHandler", "detectChange", "twoColumnMode"],
  MilestoneApp: ["milestone"],
  PullRequestApp: ["git"],
  ProjectApp: ["project"],
  UserApp: ["user", "resetPassword"],
  OrganizationApp: ["organization"],
  SiteApp: ["site"],
  ReviewApp: ["review"],
  MigrationApp: ["migration"],
  CodeApp: ["code"],
  GitApp: ["git", "code"],
  SearchApp: [],
  WatchApp: [],
  Application: [],
};

// ---------------------------------------------------------------------------
// Inventory assembly
// ---------------------------------------------------------------------------

function listScalaTemplates(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listScalaTemplates(p));
    else if (name.endsWith(".scala.html")) out.push(p);
  }
  return out;
}

// Controller class → view directory names under app/views.
// ponytail: name-based mapping; controllers whose dir does not exist simply
// get no template evidence (route-only behaviors). Extend this map if a
// controller renders from an unexpectedly named directory.
const CONTROLLER_VIEW_DIRS = {
  Application: ["index", "common", "site", "user", "help", "error"],
  BoardApp: ["board"],
  IssueApp: ["issue"],
  MilestoneApp: ["milestone"],
  PullRequestApp: ["git", "reviewthread"],
  ProjectApp: ["project"],
  UserApp: ["user"],
  OrganizationApp: ["organization"],
  SiteApp: ["site"],
  ReviewApp: ["reviewthread"],
  MigrationApp: ["migration"],
  CodeApp: ["code"],
  GitApp: ["git"],
  SearchApp: ["search"],
  WatchApp: [],
  Restricted: [],
  HelpApp: ["help"],
};

export function buildInventory(routes, templates, jsFiles) {
  // Pre-index: trigger key → [{kind, file, line}]
  const triggersByKey = new Map();
  for (const [file, text] of templates) {
    for (const t of templateTriggers(text)) {
      if (!t.key) continue;
      if (!triggersByKey.has(t.key)) triggersByKey.set(t.key, []);
      triggersByKey.get(t.key).push({ kind: t.kind, file, line: t.line });
    }
  }

  // Pre-index: controller class → merged JS effects
  const jsByController = new Map();
  for (const [file, text] of jsFiles) {
    const base = file.split("/").pop();
    for (const [cls, domains] of Object.entries(CONTROLLER_JS_DOMAINS)) {
      if (!domains.some((d) => base.toLowerCase().startsWith(d.toLowerCase()) || base.toLowerCase().includes(d.toLowerCase()))) continue;
      const effects = jsEffects(text);
      if (!effects.alert.size && !effects.navigation) continue;
      if (!jsByController.has(cls)) jsByController.set(cls, { alert: new Set(), navigation: false });
      const acc = jsByController.get(cls);
      for (const k of effects.alert) acc.alert.add(k);
      acc.navigation ||= effects.navigation;
    }
  }

  const behaviors = [];
  for (const route of routes) {
    const routeLabel = `${route.method} ${route.path}`;
    const evidence = [`yona-original/conf/routes:${route.line}`];
    const matched = triggersByKey.get(route.key) ?? [];

    // Dedupe triggers by kind; keep all evidence lines.
    const byKind = new Map();
    for (const t of matched) {
      if (!byKind.has(t.kind)) byKind.set(t.kind, []);
      byKind.get(t.kind).push(t);
    }

    const triggerEntries = byKind.size
      ? [...byKind.entries()].map(([kind, list]) => ({
          kind,
          evidence: list.map((t) => `${t.file}:${t.line}`),
        }))
      : [{ kind: "direct-http", evidence: [] }];

    for (const t of triggerEntries) {
      const js = jsByController.get(route.controllerClass);
      const expectedEffects = {};
      if (route.method !== "GET") expectedEffects.state = true;
      const alerts = new Set(js ? js.alert : []);
      if (alerts.size) expectedEffects.alert = [...alerts].sort();
      if (t.kind === "link" || (js && js.navigation) || route.controllerMethod.match(/form|edit/i)) {
        expectedEffects.navigation = true;
      }

      const triggerText =
        t.kind === "direct-http"
          ? `direct HTTP ${route.method} ${route.path}`
          : `${t.kind} targeting ${route.key}`;
      behaviors.push({
        id: "B-0000", // assigned after sort
        route: routeLabel,
        legacyEvidence: [...evidence, ...t.evidence].sort(),
        actor: inferActor(route),
        action: `${route.controllerClass}.${route.controllerMethod}`,
        trigger: triggerText,
        expectedEffects,
      });
    }
  }

  behaviors.sort((a, b) =>
    a.route === b.route ? (a.action === b.action ? a.trigger.localeCompare(b.trigger) : a.action.localeCompare(b.action)) : a.route.localeCompare(b.route),
  );
  behaviors.forEach((b, i) => {
    b.id = `B-${String(i + 1).padStart(4, "0")}`;
  });

  return { version: 1, behaviors };
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

export function main() {
  const routes = parseRoutes(readFileSync(ROUTES_FILE, "utf8"));

  const templates = new Map();
  for (const file of listScalaTemplates(VIEWS_DIR)) {
    templates.set(file, readFileSync(file, "utf8"));
  }

  const jsFiles = new Map();
  if (existsSync(JS_DIR)) {
    for (const name of readdirSync(JS_DIR)) {
      if (name.endsWith(".js")) jsFiles.set(join(JS_DIR, name), readFileSync(join(JS_DIR, name), "utf8"));
    }
  }

  const inventory = buildInventory(routes, templates, jsFiles);
  writeFileSync(OUT_FILE, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`wrote ${OUT_FILE}: ${inventory.behaviors.length} behaviors from ${routes.length} routes`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-behavior-inventory.mjs")) {
  main();
}
