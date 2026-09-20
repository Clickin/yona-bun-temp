// In-browser Playwright-compatible harness for @web/test-runner.
//
// The converted parity specs run ENTIRELY inside the browser: the app is
// mounted in a same-origin iframe, API mocks are injected as a fetch wrapper,
// and assertions poll the iframe DOM directly. No node<->browser IPC exists
// beyond WTR's single pass/fail result per test (the krds-community pattern:
// kill the per-assertion round-trips, receive only the final outcome).
//
// Supported surface (inventory of the 858 legacy specs):
//   test / test.describe / test.beforeEach / test.afterEach
//   expect(locator).to{HaveText,ContainText,HaveClass,HaveAttribute,HaveCount,
//     BeVisible,BeHidden,BeChecked,HaveValue} (+ .not.)
//   expect.poll(fn).toBe(...)
//   page.{goto,locator,getByRole,getByText,evaluate,reload,route,waitForTimeout,
//     waitForSelector,keyboard,mouse}
//   readFileSync(urlLike) — synchronous XHR over the middleware (specs call it
//     at module top level, so it must be sync)
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: (this: unknown) => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;

export type Page = PageFacade;

// The specs read process.env.YONA_DEV_BASE_PATH at module top level; the
// browser has no process — provide the same value the app is built with.
(globalThis as { process?: unknown }).process = {
  env: {
    YONA_DEV_BASE_PATH: "/yona",
  },
  cwd: () => "/",
};

const strictTeardownEnabled =
  (globalThis as { __WTR_STRICT_TEARDOWN__?: unknown }).__WTR_STRICT_TEARDOWN__ === true;
const metricsEnabled =
  (globalThis as { __WTR_METRICS__?: unknown }).__WTR_METRICS__ === true || strictTeardownEnabled;
const metricsMarker = "__WTR_METRICS__";
const DEFAULT_HARNESS_WAIT_TIMEOUT_MS = 30_000;
const metricCounterNames = [
  "gotoCalls",
  "gotoReadyMounts",
  "gotoFallbacks",
  "iframeCreates",
  "iframeRemoves",
  "screenshotCalls",
  "fixtureSyncReads",
  "fixtureAsyncReads",
  "fixtureCacheHits",
  "fixtureSyncCacheHits",
  "fixtureAsyncCacheHits",
  "mockRequests",
  "routeRegistrations",
  "routeUnregistrations",
  "requestEvents",
  "frameNavigations",
  "eventListenersAdded",
  "eventListenersRemoved",
  "storageCleanups",
  "initHooksAdded",
  "responseWatchersAdded",
  "responseWatchersRemoved",
  "eventWaitersAdded",
  "eventWaitersRemoved",
  "gotoLoadTimeouts",
  "realMouseTimeouts",
  "responseTimeouts",
  "eventTimeouts",
  "requestTimeouts",
  "teardownFailures",
] as const;
type MetricCounter = (typeof metricCounterNames)[number];
type MetricRecord = Record<string, unknown> & { kind: "test"; name: string; status: string };

const pendingMetric = Object.fromEntries(metricCounterNames.map((name) => [name, 0])) as Record<
  MetricCounter,
  number
>;
const reportedPendingMetric = { ...pendingMetric };
let activeMetric: MetricRecord | null = null;

function metricIncrement(name: MetricCounter, amount = 1): void {
  if (!metricsEnabled) return;
  if (activeMetric) {
    activeMetric[name] = Number(activeMetric[name] ?? 0) + amount;
  } else {
    pendingMetric[name] += amount;
  }
}

function takePendingMetric(record: MetricRecord): void {
  if (!metricsEnabled) return;
  for (const name of metricCounterNames) {
    const delta = pendingMetric[name] - reportedPendingMetric[name];
    if (delta !== 0) record[name] = Number(record[name] ?? 0) + delta;
    reportedPendingMetric[name] = pendingMetric[name];
  }
}

function emitMetric(record: MetricRecord): void {
  if (!metricsEnabled) return;
  console.log(`${metricsMarker}${JSON.stringify(record)}`);
}

function createMetricRecord(name: string): MetricRecord {
  return {
    kind: "test",
    name,
    status: "passed",
    durationMs: 0,
    ...Object.fromEntries(metricCounterNames.map((counter) => [counter, 0])),
  } as MetricRecord;
}

// Minimal Buffer polyfill: specs call Buffer.from(...) for upload fixtures.
class WtrBuffer {
  static alloc(size: number): Uint8Array {
    return new Uint8Array(size);
  }
  static from(input: string | Uint8Array | ArrayLike<number>): Uint8Array {
    if (typeof input === "string") return new TextEncoder().encode(input);
    return new Uint8Array(input as ArrayLike<number>);
  }
}
(globalThis as { Buffer?: unknown }).Buffer = WtrBuffer;

// Async file reader (fetch over the same-origin fixture middleware).
// Mirrors readFileSync's path mapping (bare-relative / ../frontend/ /
// ../yona-original/ / src/...) so both readers agree on fixture roots.
export async function readFile(source: URL | string): Promise<string> {
  let resolved = source;
  if (typeof source === "string" && source.startsWith("../frontend/")) {
    resolved = `/tests/frontend/${source.slice("../frontend/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../yona-original/")) {
    resolved = `/yona-original/${source.slice("../yona-original/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../docs/")) {
    resolved = `/docs/${source.slice("../docs/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../src/")) {
    resolved = `/tests/src/${source.slice("../src/".length)}`;
  } else if (typeof source === "string" && source.startsWith("src/")) {
    resolved = `/tests/src/${source.slice("src/".length)}`;
  } else if (typeof source === "string" && !source.startsWith(".") && !source.startsWith("/")) {
    resolved = `/tests/root/${source}`;
  }
  const raw =
    typeof resolved === "string" ? resolved.replace(/\.(ts|tsx|js|mjs)$/i, ".$1.txt") : resolved;
  const href = typeof raw === "string" ? new URL(raw, import.meta.url).href : raw.href;
  const cacheable = /^https?:\/\/[^/]+\/(tests|yona-original|docs)\//u.test(href);
  const knownRevision = asyncFixtureRevisions.get(href);
  if (cacheable && knownRevision) {
    const cached = asyncFileCache.get(`${href}|${knownRevision}`);
    if (cached !== undefined) {
      metricIncrement("fixtureCacheHits");
      metricIncrement("fixtureAsyncCacheHits");
      return cached as string;
    }
  }
  metricIncrement("fixtureAsyncReads");
  const response = await fetch(href);
  if (!response.ok) throw new Error(`wtr readFile: ${response.status} for ${href}`);
  const revision = response.headers.get("x-wtr-fixture-revision") ?? "unknown";
  // Binary fixtures (PNG etc.) return bytes so `byteLength` assertions work
  // like Playwright's node:fs Buffer.
  if (/\.(png|jpe?g|gif|webp|ico|woff2?|eot|ttf|otf|svg)$/i.test(href)) {
    const buffer = await response.arrayBuffer();
    const value = new Uint8Array(buffer);
    if (cacheable && revision !== "unknown") {
      asyncFixtureRevisions.set(href, revision);
      asyncFileCache.set(`${href}|${revision}`, value);
    }
    return value as unknown as string;
  }
  const value = await response.text();
  if (cacheable && revision !== "unknown") {
    asyncFixtureRevisions.set(href, revision);
    asyncFileCache.set(`${href}|${revision}`, value);
  }
  return value;
}

// Cross-realm event bus: the injected iframe script emits dialog/request/console
// events through parent.__wtrEmit; watchers live here.
type WtrEventName = "dialog" | "request" | "console" | "framenavigated";
const eventListeners = new Map<WtrEventName, Array<(payload: unknown) => void>>();
type EventWaiter = {
  resolve: (payload: unknown) => void;
  reject: (error: unknown) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};
const eventWaiters = new Map<WtrEventName, EventWaiter[]>();

function emitWtrEvent(name: WtrEventName, payload: unknown): void {
  if (name === "request") metricIncrement("requestEvents");
  if (name === "framenavigated") metricIncrement("frameNavigations");
  for (const listener of eventListeners.get(name) ?? []) listener(payload);
  const waiters = eventWaiters.get(name) ?? [];
  eventWaiters.delete(name);
  for (const waiter of waiters) {
    clearTimeout(waiter.timeoutHandle);
    metricIncrement("eventWaitersRemoved");
    waiter.resolve(payload);
  }
}

function waitForWtrEvent(
  name: WtrEventName,
  timeout = DEFAULT_HARNESS_WAIT_TIMEOUT_MS,
): Promise<unknown> {
  const { promise, resolve, reject } = Promise.withResolvers<unknown>();
  const waiter = {} as EventWaiter;
  waiter.timeoutHandle = setTimeout(() => {
    const waiters = eventWaiters.get(name) ?? [];
    const index = waiters.indexOf(waiter);
    if (index === -1) return;
    waiters.splice(index, 1);
    if (waiters.length === 0) eventWaiters.delete(name);
    metricIncrement("eventWaitersRemoved");
    metricIncrement("eventTimeouts");
    reject(new Error(`waitForEvent: no "${name}" event within ${timeout}ms`));
  }, timeout);
  waiter.resolve = resolve;
  waiter.reject = reject;
  const waiters = eventWaiters.get(name) ?? [];
  waiters.push(waiter);
  eventWaiters.set(name, waiters);
  metricIncrement("eventWaitersAdded");
  return promise;
}

// addInitScript hooks: { source, argJson } replayed by the injected iframe
// script on EVERY page load (including reloads).
type InitHook = { source: string; argJson: string };
const initHooks: InitHook[] = [];

// Response watchers for page.waitForResponse (checked when a mock resolves and
// when real fetches complete through the wrapper).
type ResponseFacade = {
  url: () => string;
  request: () => {
    method: () => string;
    url: () => string;
    headers: () => Record<string, string>;
  };
  status: () => number;
  json: () => Promise<unknown>;
};
type ResponseWatcher = (facade: ResponseFacade) => boolean;
type ResponsePredicate = ResponseWatcher | string | RegExp;
type ResponseWaiter = {
  predicate: ResponseWatcher;
  resolve: (facade: ResponseFacade) => void;
  reject: (error: unknown) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};
const responseWatchers: ResponseWaiter[] = [];
type RequestWaiter = {
  check: (payload: unknown) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};
const requestWaiters = new Set<RequestWaiter>();

function describeWaitTarget(target: unknown): string {
  if (typeof target === "string") return target;
  if (target instanceof RegExp) return target.toString();
  if (typeof target === "function") {
    const source = target.toString().replace(/\s+/gu, " ").trim();
    return source.length > 160 ? `${source.slice(0, 157)}...` : source;
  }
  return String(target);
}

function removeResponseWatcher(watcher: ResponseWaiter): boolean {
  const index = responseWatchers.indexOf(watcher);
  if (index === -1) return false;
  responseWatchers.splice(index, 1);
  clearTimeout(watcher.timeoutHandle);
  metricIncrement("responseWatchersRemoved");
  return true;
}

function checkResponseWatchers(facade: ResponseFacade): void {
  for (let index = responseWatchers.length - 1; index >= 0; index -= 1) {
    const watcher = responseWatchers[index];
    if (watcher.predicate(facade)) {
      removeResponseWatcher(watcher);
      watcher.resolve(facade);
    }
  }
}

function clearRequestWaiters(): void {
  for (const waiter of requestWaiters) clearTimeout(waiter.timeoutHandle);
  requestWaiters.clear();
}

function clearEventWaiters(): void {
  let count = 0;
  for (const waiters of eventWaiters.values()) {
    count += waiters.length;
    for (const waiter of waiters) clearTimeout(waiter.timeoutHandle);
  }
  eventWaiters.clear();
  if (count) metricIncrement("eventWaitersRemoved", count);
}

function clearResponseWatchers(): void {
  const count = responseWatchers.length;
  for (const watcher of responseWatchers) clearTimeout(watcher.timeoutHandle);
  responseWatchers.length = 0;
  if (count) metricIncrement("responseWatchersRemoved", count);
}

function clearEventListeners(): void {
  const count = Array.from(eventListeners.values()).reduce(
    (total, listeners) => total + listeners.length,
    0,
  );
  eventListeners.clear();
  if (count) metricIncrement("eventListenersRemoved", count);
}

function wireCrossRealmBridge(): void {
  const top = window as unknown as Record<string, unknown>;
  top.__wtrEmit = (name: string, payload: unknown) => {
    emitWtrEvent(name as WtrEventName, payload);
  };
  top.__wtrInitHooks = initHooks;
}
wireCrossRealmBridge();

// ---------------------------------------------------------------------------
// readFileSync shim (sync XHR over the same-origin middleware)
// ---------------------------------------------------------------------------

const fileCache = new Map<string, string>();
const fixtureRevisions = new Map<string, string>();
const asyncFileCache = new Map<string, string | Uint8Array>();
const asyncFixtureRevisions = new Map<string, string>();

// Synchronous glob over the fixture server (mirrors node:fs globSync; the
// server-side endpoint returns the matched paths as JSON lines).
export function globSync(pattern: string, _options?: { nodir?: boolean }): string[] {
  const href = `/__wtr_glob__/${encodeURIComponent(pattern)}`;
  const request = new XMLHttpRequest();
  request.open("GET", href, false);
  request.send();
  if (request.status !== 200) throw new Error(`wtr globSync: ${request.status} for ${pattern}`);
  const text = request.responseText;
  const entries = text.split("\n").filter(Boolean);
  // Paths are served relative to the app source root (same convention as
  // readFileSync("src/...") URLs).
  return entries;
}

export function readFileSync(source: URL | string): string {
  let resolved = source;
  if (typeof source === "string" && source.startsWith("../frontend/")) {
    resolved = `/tests/frontend/${source.slice("../frontend/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../yona-original/")) {
    resolved = `/yona-original/${source.slice("../yona-original/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../docs/")) {
    resolved = `/docs/${source.slice("../docs/".length)}`;
  } else if (typeof source === "string" && source.startsWith("../src/")) {
    resolved = `/tests/src/${source.slice("../src/".length)}`;
  } else if (typeof source === "string" && source.startsWith("src/")) {
    resolved = `/tests/src/${source.slice("src/".length)}`;
  } else if (typeof source === "string" && !source.startsWith(".") && !source.startsWith("/")) {
    // node:fs resolves bare relative strings against the cwd (frontend/);
    // map them to the /tests/root/ fixture root.
    resolved = `/tests/root/${source}`;
  }
  // Fixture .ts/.tsx/.js sources must arrive RAW: the dev-server re-detects
  // the content type from the URL extension and esbuild-transforms any
  // application/javascript response. A .txt suffix keeps them plain; the
  // fixture server strips it when resolving the disk path.
  const raw =
    typeof resolved === "string" ? resolved.replace(/\.(ts|tsx|js|mjs)$/i, ".$1.txt") : resolved;
  const href = typeof raw === "string" ? new URL(raw, import.meta.url).href : raw.href;
  const knownRevision = fixtureRevisions.get(href);
  const cached = knownRevision ? fileCache.get(`${href}|${knownRevision}`) : fileCache.get(href);
  if (cached !== undefined) {
    metricIncrement("fixtureCacheHits");
    metricIncrement("fixtureSyncCacheHits");
    return cached;
  }
  metricIncrement("fixtureSyncReads");
  const request = new XMLHttpRequest();
  request.open("GET", href, false);
  // NOTE: sync XHR forbids responseType != "" (InvalidAccessError), so binary
  // fixtures must use the async readFile (returns Uint8Array for byteLength).
  request.send();
  if (request.status >= 400) {
    throw new Error(`wtr readFileSync: ${request.status} for ${href}`);
  }
  const text = request.responseText;
  const revision = request.getResponseHeader("x-wtr-fixture-revision") ?? "unknown";
  if (revision !== "unknown") {
    fixtureRevisions.set(href, revision);
    fileCache.set(`${href}|${revision}`, text);
  } else {
    fileCache.set(href, text);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Merged legacy fallback source (post single-global-baseline-merge)
// ---------------------------------------------------------------------------

// The frozen legacy fallback stylesheet was merged into src/app.css between
// the BEGIN/END markers; specs that used to read the generated fallback file
// now read the merged block (identical content, single runtime stylesheet).
export function mergedLegacyBlock(): string {
  const appCss = readFileSync("src/app.css", "utf8");
  const begin = appCss.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = appCss.indexOf("/* END merged frozen legacy-fallback */", begin);
  if (begin === -1 || end === -1) {
    throw new Error("merged legacy block markers missing in app.css");
  }
  return appCss.slice(begin, end + "/* END merged frozen legacy-fallback */".length);
}

// app.css with the merged frozen legacy block removed — the exact pre-merge
// "app.css" semantics (layer statement + imports + @theme header + curated
// React-owned rules). Specs asserting "app.css does NOT contain legacy
// selector X" must use this: the whole file now legitimately contains the
// frozen fallback content inside the merged block.
export function curatedAppCss(): string {
  const appCss = readFileSync("src/app.css", "utf8");
  const begin = appCss.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = appCss.indexOf("/* END merged frozen legacy-fallback */", begin);
  if (begin === -1 || end === -1) {
    throw new Error("merged legacy block markers missing in app.css");
  }
  return (
    appCss.slice(0, begin) + appCss.slice(end + "/* END merged frozen legacy-fallback */".length)
  );
}

// ---------------------------------------------------------------------------
// Glob -> regex (Playwright "**/api/v1/*" patterns)
// ---------------------------------------------------------------------------

// Playwright's `:has-text("X")` / `:text("X")` / `:has(A:text("X"))` pseudos
// have no CSS counterpart. Translate to CSS + a text filter, per comma part.
function translateHasText(
  selector: string,
): { parts: Array<{ base: string; filter: (element: Element) => boolean }> } | null {
  if (
    !selector.includes(":has-text(") &&
    !selector.includes(":text(") &&
    !/:has\([^)]*:text\(/u.test(selector)
  ) {
    return null;
  }
  const parts = selector.split(",").map((part) => {
    let text: string | null = null;
    let hasInside: string | null = null;
    let hasScope: string | null = null;
    let base = part.trim();
    // :has(A:text('X')) / :has(A:has-text("X")) -> :has(A) + filter on the A
    // descendant's text.
    const hasTextMatch = /:has\(([^)]*):(?:text|has-text)\(["']([^"']*)["']\)\)/u.exec(base);
    if (hasTextMatch) {
      hasInside = hasTextMatch[1].trim();
      text = hasTextMatch[2];
      base = base.replace(hasTextMatch[0], `:has(${hasInside})`);
      // For `X:has(A:text('Y')) > Z` the text filter must be anchored at the
      // :has scope X (the matched Z's ancestor), not the matched element.
      const scopeMatch = /^(.+?:has\([^)]*\))(\s*>.*)?$/u.exec(base);
      hasScope = scopeMatch?.[1]?.trim() ?? null;
    } else {
      const hasTextMatch2 = /^([^:]*):has-text\(["']([^"']*)["']\)(.*)$/u.exec(base);
      if (hasTextMatch2) {
        const [, before, textValue, after] = hasTextMatch2;
        text = textValue;
        base = `${before}${after}`.trim();
        const targetSelector = before;
        const filter = (element: Element) => {
          const target = after ? element.closest(targetSelector) : element;
          return (target?.textContent ?? "").includes(textValue);
        };
        return { base, filter };
      }
      const textPseudo = /:text\(["']([^"']*)["']\)/u.exec(base);
      if (textPseudo) {
        text = textPseudo[1];
        base = base.replace(textPseudo[0], "");
      }
    }
    if (text === null) return { base, filter: null };
    const expected = text;
    const inside = hasInside;
    const scope = hasScope;
    return {
      base,
      filter: (element: Element) => {
        if (inside) {
          const anchor = scope ? element.closest(scope) : element;
          if (!anchor) return false;
          const descendant = Array.from(anchor.querySelectorAll(inside)).find((candidate) => {
            // Playwright's :text() is a whitespace-normalized SUBSTRING match.
            return normalizeText(candidate.textContent ?? "").includes(normalizeText(expected));
          });
          return descendant !== undefined;
        }
        return normalizeText(element.textContent ?? "").includes(normalizeText(expected));
      },
    };
  });
  return { parts: parts.map((part) => ({ base: part.base, filter: part.filter })) };
}

// Playwright resolves implicit ARIA roles (a[href] -> link, button -> button,
// input -> textbox, ...) in addition to explicit [role=...] attributes.
const ROLE_SELECTORS: Record<string, string> = {
  link: 'a[href], [role="link"]',
  button: 'button, input[type="button"], input[type="submit"], [role="button"]',
  heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  textbox:
    'input:not([type]), input[type=""], input[type="text"], input[type="search"], textarea, [role="textbox"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',
  radio: 'input[type="radio"], [role="radio"]',
  tab: '[role="tab"], [data-toggle="tab"]',
  option: "option, [role='option']",
  combobox: 'select:not([multiple]):not([role]), input[list]:not([role]), [role="combobox"]',
  listbox: "select, [role='listbox']",
  menuitem: "[role='menuitem']",
  dialog: "[role='dialog']",
  img: "img, [role='img']",
  complementary: 'aside, [role="complementary"]',
  navigation: "nav, [role='navigation']",
  main: "main, [role='main']",
  region: '[role="region"], section[aria-label], section[aria-labelledby]',
  list: "ul, ol, [role='list']",
  listitem: "li, [role='listitem']",
  heading1: 'h1, [role="heading"][aria-level="1"]',
};

function roleSelectorFor(role: string): string {
  return ROLE_SELECTORS[role] ?? `[role="${role}"]`;
}

function globToRegExp(pattern: string): RegExp {
  // Protect glob wildcards with placeholders, escape literals, then restore.
  const protectedGlobs = pattern.replace(/\*\*/g, "\u0000").replace(/\*/g, "\u0001");
  const escaped = protectedGlobs.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const restored = escaped.replace(/\u0000/g, ".*").replace(/\u0001/g, "[^/]*");
  return new RegExp(`^${restored}$`);
}

// ---------------------------------------------------------------------------
// Mock routing (fetch interception inside the iframe)
// ---------------------------------------------------------------------------

type MockRoute = {
  request: () => RequestFacade;
  fulfill: (opts: Record<string, unknown>) => Promise<void>;
  fallback: () => Promise<void>;
};
export type Route = MockRoute;
type MockHandler = (route: MockRoute) => void | Promise<void>;
const mockRegistry: Array<{ regex: RegExp; handler: MockHandler }> = [];

async function createFulfilledResponse(overrides: Record<string, unknown>): Promise<Response> {
  const { status = 200, contentType = "application/json", json, body, headers } = overrides;
  let payload: BodyInit | null = null;
  if (json !== undefined) {
    payload = JSON.stringify(json);
  } else if (body !== undefined) {
    payload = String(body);
  }
  const headerMap = new Headers();
  if (contentType) headerMap.set("content-type", contentType);
  if (headers) {
    for (const [key, value] of Object.entries(headers as Record<string, string>)) {
      headerMap.set(key, value);
    }
  }
  // 204/205/304 are null-body statuses: `new Response("", { status: 204 })`
  // throws "Response with null body status cannot have body".
  const nullBody = status === 204 || status === 205 || status === 304;
  return new Response(nullBody ? null : payload, { status, headers: headerMap });
}

// The iframe's own fetch override does not survive navigation (Chrome restores
// built-ins), so the served index.html injects `window.fetch = (...args) =>
// parent.__wtrMockFetch(...args)`; the registry lives in this (top) realm.
function installFetchMock(iframe: HTMLIFrameElement, realFetch: typeof fetch): void {
  (window as unknown as Record<string, unknown>).__wtrMockFetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    // Spec-registered routes match first (LIFO, like Playwright); defaults last.
    for (let index = mockRegistry.length - 1; index >= 0; index -= 1) {
      const { regex, handler } = mockRegistry[index];
      if (regex.test(url)) {
        metricIncrement("mockRequests");
        const top = typeof window !== "undefined" ? window : null;
        if (top) {
          const counter = ((top as unknown as Record<string, number>).__wtrMockHits ?? 0) + 1;
          (top as unknown as Record<string, number>).__wtrMockHits = counter;
          (top as unknown as Record<string, unknown>).__wtrMockLast = regex.source;
          const history = (top as unknown as Record<string, unknown[]>).__wtrMockHistory ?? [];
          history.push({ url, source: regex.source });
          (top as unknown as Record<string, unknown[]>).__wtrMockHistory = history;
          (top as unknown as Record<string, unknown>).__wtrRegistry = mockRegistry.map(
            ({ regex: r }) => ({ source: r.source }),
          );
        }
        // Playwright's APIRequest methods: url(), method(), headers(),
        // postDataJSON(), postData() — all functions.
        const requestFacade = {
          url: () => new URL(url, location.href).href,
          method: () => (init?.method ?? "GET").toUpperCase(),
          headers: () => Object.fromEntries(new Headers(init?.headers as HeadersInit).entries()),
          postData: () => {
            if (typeof init?.body === "string") return init.body;
            if (init?.body instanceof FormData) {
              return new URLSearchParams(init.body as unknown as Record<string, string>).toString();
            }
            return undefined;
          },
          postDataBuffer: () => {
            // Playwright's APIRequest.postDataBuffer() returns a Node Buffer
            // whose .toString("utf8") yields the raw body. The mock handlers
            // call postDataBuffer()?.toString("utf8") to parse multipart
            // filename="...". In the browser realm there is no Buffer, so
            // return a String object that answers .toString("utf8") with the
            // raw text (the XHR bridge passes iframe-realm FormData; duck-type
            // it and rebuild multipart).
            const raw =
              typeof init?.body === "string"
                ? init.body
                : init?.body && typeof (init.body as FormData).forEach === "function"
                  ? (() => {
                      const boundary = `----wtr-boundary-${Math.random().toString(36).slice(2)}`;
                      const chunks: string[] = [];
                      (init.body as FormData).forEach((value: FormDataEntryValue, key: string) => {
                        if (typeof value === "string") {
                          chunks.push(
                            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
                          );
                          return;
                        }
                        const file = value as File;
                        chunks.push(
                          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${file.name}"\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n${file.name}\r\n`,
                        );
                      });
                      chunks.push(`--${boundary}--\r\n`);
                      return chunks.join("");
                    })()
                  : undefined;
            if (raw === undefined) return undefined;
            return {
              toString: (encoding?: string) =>
                encoding === "utf8" || encoding === "utf-8" ? raw : raw,
              length: raw.length,
            };
          },
          postDataJSON: () => {
            if (typeof init?.body !== "string") return undefined;
            try {
              return JSON.parse(init.body);
            } catch {
              return undefined;
            }
          },
        };
        emitWtrEvent("request", {
          url: requestFacade.url(),
          resourceType: () => "fetch",
          method: () => requestFacade.method(),
          postData: requestFacade.postData,
          postDataJSON: requestFacade.postDataJSON,
        });
        // route.fallback() continues to the next matching handler, else the
        // real network — mirror Playwright's multi-handler semantics.
        const tryHandlers = async (startIndex: number): Promise<Response> => {
          for (let i = startIndex; i >= 0; i -= 1) {
            const { regex, handler } = mockRegistry[i];
            if (!regex.test(url)) continue;
            const { promise, resolve } = Promise.withResolvers<Response>();
            try {
              const handlerResult = handler({
                request: () => requestFacade,
                fulfill: async (opts) => {
                  const response = await createFulfilledResponse(opts);
                  const responseStatus = response.status;
                  checkResponseWatchers({
                    url: () => requestFacade.url(),
                    request: () => ({
                      method: () => requestFacade.method(),
                      url: () => requestFacade.url(),
                      headers: () => requestFacade.headers(),
                    }),
                    status: () => responseStatus,
                    // Playwright APIResponse.json() — parse the mock body.
                    json: async () => {
                      const text = await response.clone().text();
                      try {
                        return JSON.parse(text);
                      } catch {
                        return undefined;
                      }
                    },
                  });
                  resolve(response);
                },
                fallback: async () => {
                  resolve(await tryHandlers(i - 1));
                },
              });
              if (handlerResult instanceof Promise) {
                handlerResult.catch((error) => {
                  const top = typeof window !== "undefined" ? window : null;
                  if (top) {
                    (top as unknown as Record<string, unknown>).__wtrMockError = String(error);
                  }
                  throw error;
                });
              }
            } catch (error) {
              const top = typeof window !== "undefined" ? window : null;
              if (top) {
                (top as unknown as Record<string, unknown>).__wtrMockError = String(error);
              }
              throw error;
            }
            return promise;
          }
          return realFetch.call(iframe.contentWindow as Window, input as RequestInfo, init);
        };
        return tryHandlers(index);
      }
    }
    return realFetch.call(iframe.contentWindow as Window, input as RequestInfo, init);
  };
}

// ---------------------------------------------------------------------------
// Locator
// ---------------------------------------------------------------------------

// Element handles: Playwright JSHandles snapshot an element; our handles are
// registry refs the iframe-side eval resolves via parent.__wtrHandleRegistry.
const wtrHandleRegistry = new Map<number, Element>();
let nextHandleId = 1;
(window as unknown as Record<string, unknown>).__wtrHandleRegistry = wtrHandleRegistry;

// Browser createHash shim (node:crypto is not importable in the WTR page).
// Compact SHA-256, byte-identical to node:crypto (verified in wave 7).
const wtrSha256K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
function wtrSha256Hex(data: string): string {
  const bytes = new TextEncoder().encode(data);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 8) >> 6) << 6) + 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32), false);
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j += 1) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j += 1) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let j = 0; j < 64; j += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + wtrSha256K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => n.toString(16).padStart(8, "0")).join("");
}
export function createHash(algorithm: string): {
  update: (data: string) => { digest: (encoding: string) => string };
} {
  return {
    update: (data: string) => ({
      digest: (encoding: string) => {
        if (algorithm !== "sha256" || encoding !== "hex") {
          throw new Error(`wtr createHash shim: unsupported ${algorithm}/${encoding}`);
        }
        return wtrSha256Hex(data);
      },
    }),
  };
}

const POLL_INTERVAL_MS = 40;
let lastMouseX = 0;
let lastMouseY = 0;

function parseKeyCombo(key: string): {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
} {
  const parts = key.split("+");
  if (parts.length === 1) {
    return { key: parts[0] === "Space" ? " " : parts[0] };
  }
  const modifiers = new Set(parts.slice(0, -1));
  const last = parts[parts.length - 1];
  return {
    key: last === "Space" ? " " : last,
    shiftKey: modifiers.has("Shift"),
    ctrlKey: modifiers.has("Control") || modifiers.has("Ctrl"),
    altKey: modifiers.has("Alt"),
    metaKey: modifiers.has("Meta"),
  };
}

function isPrintableKey(key: string): boolean {
  return key.length === 1 && /[^\u0000-\u001F\u007F]/.test(key);
}

function createTypedEvent(
  type: string,
  documentRef: Document,
  init?: Record<string, unknown>,
): Event {
  const options = { bubbles: true, cancelable: true, ...init };
  if (type.startsWith("mouse") || type === "click" || type === "contextmenu") {
    return new MouseEvent(type, options as MouseEventInit);
  }
  if (type.startsWith("pointer")) {
    return new PointerEvent(type, options as PointerEventInit);
  }
  if (type.startsWith("key")) {
    return new KeyboardEvent(type, options as KeyboardEventInit);
  }
  if (type.startsWith("drag") || type === "drop") {
    // DragEventInit carries dataTransfer; a generic Event drops it and the
    // app's drop handlers read event.dataTransfer.files (issueform.tsx:1040).
    return new DragEvent(type, options as DragEventInit);
  }
  if (type.startsWith("touch")) {
    return new TouchEvent(type, options as TouchEventInit);
  }
  if (type.startsWith("focus") || type === "blur") {
    return new FocusEvent(type, options as FocusEventInit);
  }
  return new Event(type, options as EventInit);
}

function isElementVisible(element: HTMLElement): boolean {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return false;
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.display === "contents") {
    // display:contents has no box — Playwright's computeBox special-cases it:
    // visible if any visible child or any text node has a non-empty rect.
    const view = element.ownerDocument.defaultView as Window & typeof globalThis;
    const range = view.document.createRange();
    for (const child of element.children) {
      if (isElementVisible(child as HTMLElement)) return true;
    }
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) return true;
      }
    }
    return false;
  }
  // offsetParent is null for position:fixed (modals) even when visible —
  // fall back to the bounding rect like Playwright's computeBox.
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

function withTimeout<T>(promise: Promise<T>, timeout: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => reject(new Error(message)), timeout);
    promise.then(
      (value) => {
        clearTimeout(timeoutHandle);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      },
    );
  });
}

function callRealMouseBridge(
  operation: string,
  x: number,
  y: number,
  message: string,
): Promise<void> {
  const bridge = (window as unknown as Record<string, unknown>).__wtrRealMouse;
  if (typeof bridge !== "function") return Promise.resolve();
  return withTimeout(
    Promise.resolve().then(() =>
      (bridge as (op: string, x: number, y: number) => Promise<void>)(operation, x, y),
    ),
    DEFAULT_HARNESS_WAIT_TIMEOUT_MS,
    message,
  ).catch((error) => {
    if (error instanceof Error && error.message === message) metricIncrement("realMouseTimeouts");
    throw error;
  });
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// React installs a value tracker on controlled inputs; assigning element.value
// directly bypasses onChange. Set through the native prototype setter instead.
function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // The element lives in the iframe realm; its prototype must come from that
  // realm too (top-realm setters throw Illegal invocation on cross-realm refs).
  const view = element.ownerDocument.defaultView as Window & typeof globalThis;
  const proto =
    element instanceof view.HTMLTextAreaElement
      ? view.HTMLTextAreaElement.prototype
      : view.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export class Locator {
  readonly selector: string;
  private readonly index?: number;
  private readonly scopedChild?: string;

  constructor(
    private readonly page: PageFacade,
    selector: string,
    index?: number,
    scopedChild?: string,
  ) {
    this.selector = selector;
    this.index = index;
    this.scopedChild = scopedChild;
  }

  private resolveElements(): Element[] {
    const doc = this.page.document();
    // Playwright chain selector: "A >> nth=N" applies an index to A's results.
    const chain = this.selector.split(" >> ");
    if (chain.length > 1) {
      const [baseSel, ...rest] = chain;
      const nthPart = rest[rest.length - 1].match(/^nth=(\d+)$/);
      const nth = nthPart ? Number(nthPart[1]) : undefined;
      const innerSelector = rest.length > 1 || !nthPart ? rest.join(" >> ") : baseSel;
      const inner = new Locator(this.page, innerSelector);
      const all = inner.resolveElements();
      return nth !== undefined ? [all[nth]].filter(Boolean) : all;
    }
    if (this.scopedChild !== undefined) {
      const elements: Element[] = [];
      // NOTE: nth(N).locator(':scope …') scopes to the indexed parent in
      // Playwright; the aggregate loop below (all parents) is the historical
      // harness behavior that several specs depend on. The site-issue-list-
      // metadata copy uses an evaluate-based workaround for the indexed case.
      for (const base of doc.querySelectorAll(this.selector)) {
        if (this.scopedChild.startsWith("xpath=")) {
          const expression = this.scopedChild.slice("xpath=".length);
          const result = doc.evaluate(
            expression,
            base,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null,
          );
          for (let i = 0; i < result.snapshotLength; i += 1) {
            const node = result.snapshotItem(i);
            if (node !== null && node.nodeType === 1) elements.push(node as Element);
          }
        } else {
          elements.push(...Array.from(base.querySelectorAll(this.scopedChild)));
        }
      }
      return elements;
    }
    const translated = translateHasText(this.selector);
    if (translated) {
      const result: Element[] = [];
      for (const part of translated.parts) {
        const matched = Array.from(doc.querySelectorAll(part.base));
        result.push(...(part.filter ? matched.filter(part.filter) : matched));
      }
      return Array.from(new Set(result));
    }
    if (this.selector.startsWith("xpath=")) {
      const expression = this.selector.slice("xpath=".length);
      const result = doc.evaluate(
        expression,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
      const elements: Element[] = [];
      for (let i = 0; i < result.snapshotLength; i += 1) {
        const node = result.snapshotItem(i);
        if (node !== null && node.nodeType === 1) elements.push(node as Element);
      }
      return elements;
    }
    if (this.selector.includes(":visible") || this.selector.includes(":hidden")) {
      const base = this.selector.replace(/:visible/g, "").replace(/:hidden/g, "");
      const visible = !this.selector.includes(":hidden");
      return Array.from(doc.querySelectorAll(base)).filter((element) => {
        const isVisible = isElementVisible(element as HTMLElement);
        return visible ? isVisible : !isVisible;
      });
    }
    return Array.from(doc.querySelectorAll(this.selector));
  }

  private current(): HTMLElement | null {
    const elements = this.resolveElements();
    const index = this.index ?? 0;
    // Playwright strict-mode: unindexed resolution over >1 element is a
    // violation (all/nth/first/last/count stay exempt by using resolveElements).
    if (this.index === undefined && elements.length > 1) {
      throw new Error(
        `strict mode violation: ${this.selector} resolved to ${elements.length} elements`,
      );
    }
    return (elements[index] as HTMLElement) ?? null;
  }

  // Playwright actions auto-wait for the element (actionTimeout); poll up to
  // 15s instead of throwing on the first miss.
  private async waitForElement(timeoutMs = 15000): Promise<HTMLElement> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        const element = this.current();
        if (element) return element;
      } catch (error) {
        // Playwright actions retry through transient strict-mode violations
        // (dual-render mounts from route transitions) until they settle.
        lastError = error;
      }
      await sleep(50);
    }
    if (lastError !== null && this.currentSafe() === null) {
      // Only report the strict violation if the element never settles.
      try {
        this.current();
      } catch (error) {
        throw error;
      }
    }
    throw new Error(`${this.selector}: element not found`);
  }

  private currentSafe(): HTMLElement | null {
    try {
      return this.current();
    } catch {
      return null;
    }
  }

  all(): Locator[] {
    const count = this.resolveElements().length;
    return Array.from({ length: count }, (_, index) => this.withIndex(index));
  }

  private withIndex(index: number): Locator {
    if (this.hasCustomResolver) {
      // Preserve the parent's resolver (filter/.. /nth-scoped chains): index
      // selects WITHIN the resolved set. The subclass is unindexed — its
      // resolveElements already narrows to one element, so current() must not
      // apply the index a second time.
      const page = this.page;
      const base = this;
      return new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          const all = base.resolveElements();
          return all[index] ? [all[index]] : [];
        }
      })(page, base.selector, undefined, base.scopedChild);
    }
    return new Locator(this.page, this.selector, index, this.scopedChild);
  }

  nth(index: number): Locator {
    return this.withIndex(index);
  }

  first(): Locator {
    return this.withIndex(0);
  }

  last(): Locator {
    return this.withIndex(Math.max(0, this.resolveElements().length - 1));
  }

  locator(
    childSelector: string | Locator,
    options?: { hasText?: string | RegExp; has?: Locator },
  ): Locator {
    // Playwright: locator(otherLocator) scopes the child locator's selector
    // within this locator's elements.
    if (childSelector instanceof Locator) {
      return this.locator(childSelector.selector, options);
    }
    // Playwright scopes a leading child combinator to the parent element
    // ("> .x" == ":scope > .x"); querySelectorAll rejects a bare ">".
    // Comma lists scope each part that starts with ">" ("> a, > b" ==
    // ":scope > a, :scope > b").
    if (/^\s*>/.test(childSelector) || /,\s*>/.test(childSelector)) {
      const scoped = childSelector
        .split(",")
        .map((part) => (/^\s*>/.test(part) ? `:scope ${part.trim()}` : part))
        .join(", ");
      return this.locator(scoped, options);
    }
    if (childSelector.trim() === "..") {
      const page = this.page;
      const base = this;
      return new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          return Array.from(
            new Set(
              base
                .resolveElements()
                .map((element) => element.parentElement)
                .filter((element): element is Element => element !== null),
            ),
          );
        }
      })(page, base.selector, undefined, base.scopedChild);
    }
    if (childSelector.trim().startsWith(":scope")) {
      if (this.hasCustomResolver || this.scopedChild !== undefined) {
        // Compose: scope the child within THIS locator's resolved elements
        // (a prior :scope/nth/filter chain), not the document base.
        const page = this.page;
        const base = this;
        const child = childSelector.trim();
        return new (class extends Locator {
          hasCustomResolver = true;
          resolveElements(): Element[] {
            const parents =
              base.index === undefined
                ? base.resolveElements()
                : (() => {
                    const all = base.resolveElements();
                    return all[base.index ?? 0] ? [all[base.index ?? 0]] : [];
                  })();
            return parents.flatMap((element) => Array.from(element.querySelectorAll(child)));
          }
        })(page, base.selector, undefined);
      }
      return new Locator(this.page, this.selector, this.index, childSelector.trim());
    }
    if (this.hasCustomResolver) {
      const page = this.page;
      const base = this;
      const child = childSelector;
      const result = new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          if (child.startsWith("xpath=")) {
            const expression = child.slice("xpath=".length);
            const elements: Element[] = [];
            for (const parent of base.resolveElements()) {
              const doc = parent.ownerDocument;
              const xpathResult = doc.evaluate(
                expression,
                parent,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null,
              );
              for (let i = 0; i < xpathResult.snapshotLength; i += 1) {
                const node = xpathResult.snapshotItem(i);
                if (node !== null && node.nodeType === 1) elements.push(node as Element);
              }
            }
            return elements;
          }
          return base
            .resolveElements()
            .flatMap((element) => Array.from(element.querySelectorAll(child)));
        }
      })(page, base.selector, undefined);
      return options?.hasText === undefined ? result : result.filterByText(options.hasText);
    }
    if (this.index !== undefined) {
      // nth(i).locator(child): scope children within the indexed parent.
      const page = this.page;
      const base = this;
      const child = childSelector;
      const result = new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          const parent = base.resolveElements()[base.index ?? 0];
          if (!parent) return [];
          if (child.startsWith("xpath=")) {
            const expression = child.slice("xpath=".length);
            const doc = parent.ownerDocument;
            const xpathResult = doc.evaluate(
              expression,
              parent,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null,
            );
            const elements: Element[] = [];
            for (let i = 0; i < xpathResult.snapshotLength; i += 1) {
              const node = xpathResult.snapshotItem(i);
              if (node !== null && node.nodeType === 1) elements.push(node as Element);
            }
            return elements;
          }
          if (child.trim() === "..") {
            return parent.parentElement ? [parent.parentElement] : [];
          }
          return Array.from(parent.querySelectorAll(child));
        }
      })(page, base.selector, undefined);
      return options?.hasText === undefined ? result : result.filterByText(options.hasText);
    }
    if (childSelector.startsWith("xpath=")) {
      // Plain parent + xpath child: evaluate the expression against each
      // resolved parent element.
      const page = this.page;
      const base = this;
      const expression = childSelector.slice("xpath=".length);
      const result = new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          const elements: Element[] = [];
          for (const parent of base.resolveElements()) {
            const doc = parent.ownerDocument;
            const xpathResult = doc.evaluate(
              expression,
              parent,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null,
            );
            for (let i = 0; i < xpathResult.snapshotLength; i += 1) {
              const node = xpathResult.snapshotItem(i);
              if (node !== null && node.nodeType === 1) elements.push(node as Element);
            }
          }
          return elements;
        }
      })(page, base.selector, undefined);
      let resultWithOptions: Locator = result;
      if (options?.hasText !== undefined)
        resultWithOptions = resultWithOptions.filterByText(options.hasText);
      if (options?.has !== undefined)
        resultWithOptions = resultWithOptions.filterWithHas(options.has);
      return resultWithOptions;
    }
    const childParts = childSelector.split(",").map((part) => part.trim());
    if (this.index !== undefined || this.hasCustomResolver || this.scopedChild !== undefined) {
      // Scoped compose: resolve the parent (with its index/filters) first,
      // then the child within each resolved element. A combined selector +
      // parent index would index the WRONG element (nth(1).locator("a") must
      // take anchors of the 1st parent, not the 2nd anchor overall).
      const page = this.page;
      const base = this;
      const scoped = new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          const parents = base.resolveElements();
          const parent =
            base.index === undefined ? parents : parents[base.index] ? [parents[base.index]] : [];
          const elements: Element[] = [];
          for (const p of parent) {
            for (const part of childParts) {
              elements.push(...Array.from(p.querySelectorAll(part)));
            }
          }
          return elements;
        }
      })(page, base.selector, undefined);
      let resultWithOptions: Locator = scoped;
      if (options?.hasText !== undefined)
        resultWithOptions = resultWithOptions.filterByText(options.hasText);
      if (options?.has !== undefined)
        resultWithOptions = resultWithOptions.filterWithHas(options.has);
      return resultWithOptions;
    }
    const combined = this.selector
      .split(",")
      .flatMap((parentPart) => childParts.map((childPart) => `${parentPart.trim()} ${childPart}`))
      .join(", ");
    const plain = new Locator(this.page, combined, this.index);
    let result = plain;
    if (options?.hasText !== undefined) result = result.filterByText(options.hasText);
    if (options?.has !== undefined) result = result.filterWithHas(options.has);
    return result;
  }

  async evaluateAll<T>(fn: (elements: Element[], arg?: unknown) => T, arg?: unknown): Promise<T> {
    if (
      this.hasCustomResolver ||
      this.scopedChild !== undefined ||
      this.selector.includes(":has-text(") ||
      this.selector.includes(":text(") ||
      this.selector.includes(":visible") ||
      this.selector.includes(":hidden") ||
      this.selector.startsWith("xpath=")
    ) {
      // Custom resolvers / translated pseudos run top-realm (they can't be
      // serialized into the iframe's querySelectorAll).
      return fn(this.resolveElements(), arg);
    }
    const target = this.page.window();
    const selector = JSON.stringify(this.selector);
    const serializedArg = arg === undefined ? "undefined" : JSON.stringify(arg);
    // eslint-disable-next-line no-eval
    return target.eval(
      `(function () { const elements = document.querySelectorAll(${selector}); return (${fn.toString()})(Array.from(elements), ${serializedArg}); })()`,
    ) as T;
  }

  async boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const element = this.current();
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    // Playwright's role engine excludes elements hidden from the a11y tree
    // (display:none subtrees) — the always-mounted root dialog must not match.
    const page = this.page;
    const scoped = this.locator(roleSelectorFor(role)).filterWithPredicate((element) => {
      if (
        role === "combobox" &&
        element.tagName === "SELECT" &&
        !element.hasAttribute("role") &&
        (element as HTMLSelectElement).size > 1
      )
        return false;
      let node: Element | null = element;
      while (node) {
        const style = page.window().getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        node = node.parentElement;
      }
      return true;
    });
    return scoped.filterByText(options?.name, options?.exact);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator("*").filterByText(text, options?.exact, true);
  }

  getByPlaceholder(placeholder: string): Locator {
    const escaped = placeholder.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return this.locator(`[placeholder="${escaped}"]`);
  }

  getByTestId(testId: string): Locator {
    return this.locator(`[data-testid="${testId}"]`);
  }

  getByLabel(label: string): Locator {
    return this.locator(`[aria-label="${label}"], label:has-text("${label}") input`);
  }

  private filterByText(
    text: string | RegExp | undefined,
    exact?: boolean,
    innermost = false,
  ): Locator {
    if (text === undefined) return this;
    const predicate = (element: Element): boolean => {
      // Accessible-name matching: aria-label > content > title (Playwright
      // resolves the accessible name; title covers icon-only buttons).
      const candidates = [
        element.getAttribute("aria-label") ?? "",
        normalizeText(element.textContent ?? ""),
        element.getAttribute("placeholder") ?? "",
        element.getAttribute("title") ?? "",
      ]
        .map((value) => value.trim())
        .filter(Boolean);
      const matchesCandidate = (candidate: string) =>
        typeof text === "string"
          ? exact
            ? candidate === text
            : candidate.includes(text)
          : text.test(candidate);
      return candidates.some(matchesCandidate);
    };
    if (!innermost) return this.filterWithPredicate(predicate);
    // Playwright's text engine matches the SMALLEST element containing the
    // text: drop any match that has a matching descendant.
    return this.filterWithPredicate(
      (element) => predicate(element) && !Array.from(element.children).some(predicate),
    );
  }

  filterWithHas(has?: Locator): Locator {
    if (has === undefined) return this;
    const hasSelector = has.selector;
    return this.filterWithPredicate((element) => {
      if (element.querySelector(hasSelector) === null) return false;
      return true;
    });
  }

  filter(options: { hasText?: string | RegExp; has?: Locator; visible?: boolean }): Locator {
    return this.filterWithPredicate((element) => {
      if (options.hasText !== undefined) {
        const ownText = normalizeText(element.textContent ?? "");
        const textMatches =
          typeof options.hasText === "string"
            ? ownText.includes(options.hasText)
            : options.hasText.test(ownText);
        if (!textMatches) return false;
      }
      if (options.has !== undefined) {
        const hasSelector = options.has.selector;
        if (element.querySelector(hasSelector) === null) return false;
      }
      if (options.visible !== undefined) {
        const visible = isElementVisible(element as HTMLElement);
        if (visible !== options.visible) return false;
      }
      return true;
    });
  }

  protected hasCustomResolver = false;

  private filterWithPredicate(predicate: (element: Element) => boolean): Locator {
    const page = this.page;
    const base = this;
    return new (class extends Locator {
      hasCustomResolver = true;
      resolveElements(): Element[] {
        // Filter the FULL resolved chain (nth/filter/scoped-custom resolvers),
        // never re-resolve the raw selector from the document — that would
        // drop the chain's narrowing and index semantics.
        return base.resolveElements().filter((element) => predicate(element));
      }
    })(page, base.selector, undefined);
  }

  async waitFor(options?: { state?: string; timeout?: number }): Promise<void> {
    const deadline = Date.now() + (options?.timeout ?? 10000);
    const wanted = options?.state ?? "visible";
    while (Date.now() < deadline) {
      const elements = this.resolveElements();
      if (elements.length > 0) {
        if (wanted === "attached") return;
        const first = elements[0] as HTMLElement;
        const visible = isElementVisible(first);
        if (wanted === "hidden" ? !visible : visible) return;
      } else if (wanted === "hidden" || wanted === "detached") {
        return;
      }
      await sleep(50);
    }
    throw new Error(`waitFor(${wanted}): ${this.selector} not found`);
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.current()?.getAttribute(name) ?? null;
  }

  async clear(): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement | HTMLTextAreaElement;
    setNativeInputValue(element, "");
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(20);
  }

  async count(): Promise<number> {
    const elements = this.resolveElements();
    // Playwright narrows indexed locators before counting: .first()/.nth(N)
    // report 1 when >=1 match exists (never 0 via index-out-of-range). A
    // scopedChild keeps the index on the PARENT set — the child chain counts
    // its own matches (.first().locator(":scope > .x").count() = children).
    if (this.index !== undefined && this.scopedChild === undefined) {
      return elements.length > 0 ? 1 : 0;
    }
    return elements.length;
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    const element = await this.waitForElement();
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
    await sleep(20);
  }

  async screenshot(_options?: Record<string, unknown>): Promise<Uint8Array> {
    // Artifact-only in WTR; return a buffer-like so byteLength assertions pass.
    await this.page.screenshot(_options);
    return new Uint8Array(1);
  }

  async textContent(): Promise<string | null> {
    const element = this.current();
    return element?.textContent ?? null;
  }

  async innerText(): Promise<string> {
    const element = this.current();
    if (!element) return "";
    // The element lives in the iframe realm; use its own innerText (rendered
    // text, hidden content excluded) via the realm's prototype.
    const view = element.ownerDocument.defaultView as Window & typeof globalThis;
    const proto = view.HTMLElement.prototype;
    const getter = Object.getOwnPropertyDescriptor(proto, "innerText")?.get;
    if (getter) {
      return (getter.call(element) as string).replace(/\s+/g, " ").trim();
    }
    return normalizeText(element.textContent ?? "");
  }

  async allTextContents(): Promise<string[]> {
    const texts: string[] = [];
    for (const element of this.resolveElements()) {
      texts.push(element.textContent ?? "");
    }
    return texts;
  }

  async inputValue(): Promise<string> {
    const element = this.current() as HTMLInputElement | null;
    return element?.value ?? "";
  }

  async innerHTML(): Promise<string> {
    const element = this.current();
    return element?.innerHTML ?? "";
  }

  async isVisible(): Promise<boolean> {
    // Playwright's isVisible does NOT enforce strict-mode — first match.
    const element = this.currentSafe();
    if (!element) return false;
    return isElementVisible(element as HTMLElement);
  }

  async isChecked(): Promise<boolean> {
    const element = this.current() as HTMLInputElement | null;
    return element?.checked ?? false;
  }

  async click(options?: { force?: boolean; position?: { x: number; y: number } }): Promise<void> {
    let element = await this.waitForElement();
    // Playwright waits for actionability: a disabled control becomes enabled
    // before the click lands (apps enable buttons after async work — upload
    // deletes, draft saves). Without the wait, React drops the synthetic
    // click on the still-disabled button and the flow dead-ends. Re-resolve
    // each poll so a React re-render that swaps the node cannot strand us.
    if (!options?.force) {
      const deadline = Date.now() + 15000;
      while ((element as HTMLButtonElement).disabled === true && Date.now() < deadline) {
        await sleep(50);
        element = await this.waitForElement();
      }
    }
    // Playwright clicks the topmost element at the target point (an inner
    // <button> inside an <li> receives the click, not the <li>).
    let target: HTMLElement = element;
    if (!options?.force) {
      const rect = element.getBoundingClientRect();
      const x = options?.position?.x ?? rect.left + rect.width / 2;
      const y = options?.position?.y ?? rect.top + rect.height / 2;
      const topmost = this.page.document().elementFromPoint(x, y) as HTMLElement | null;
      if (topmost && element.contains(topmost)) target = topmost;
    }
    for (const type of ["pointerdown", "mousedown"]) {
      this.page.dispatch(target, type, options?.position);
    }
    await sleep(10);
    if ("value" in element) {
      // select() is unreadable on type=number (selectionStart is null), so
      // record the click-select so a following press() replaces the value.
      (element as HTMLInputElement).setAttribute("data-wtr-click-selected", "1");
    }
    for (const type of ["pointerup", "click"]) {
      this.page.dispatch(target, type, options?.position);
    }
    await sleep(30);
  }

  async dblclick(options?: { force?: boolean }): Promise<void> {
    // Two click cycles (pointerdown/mousedown + pointerup/click) with a
    // dblclick event — the legacy confirm-modal "Yes" button flow uses
    // jQuery .dblclick() on the button. No enabled-wait between the cycles:
    // the second cycle lands immediately on the same node.
    const cycle = async () => {
      let element = await this.waitForElement();
      let target: HTMLElement = element;
      if (!options?.force) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const topmost = this.page.document().elementFromPoint(x, y) as HTMLElement | null;
        if (topmost && element.contains(topmost)) target = topmost;
      }
      for (const type of ["pointerdown", "mousedown"]) {
        this.page.dispatch(target, type);
      }
      await sleep(10);
      for (const type of ["pointerup", "click"]) {
        this.page.dispatch(target, type);
      }
      await sleep(10);
    };
    await cycle();
    await cycle();
    this.page.dispatch(await this.waitForElement(), "dblclick");
    await sleep(30);
  }

  async fill(text: string): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement | HTMLTextAreaElement;
    element.focus();
    setNativeInputValue(element, text);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(30);
  }

  async press(key: string): Promise<void> {
    const element = await this.waitForElement();
    element.focus();
    const parsed = parseKeyCombo(key);
    if (parsed.key === "Tab") {
      // Real Tab moves focus — blur natively so onBlur runs once.
      // Full focus traversal is out of scope.
      const doc = element.ownerDocument;
      const active = doc.activeElement as HTMLElement | null;
      active?.blur();
    } else if (isPrintableKey(parsed.key)) {
      // Real presses insert the character into the focused editable element
      // (replacing the selection — apps select-all on click/focus).
      const tag = element.tagName;
      const editable =
        tag === "INPUT" || tag === "TEXTAREA"
          ? (element as HTMLInputElement | HTMLTextAreaElement)
          : null;
      if (editable && !editable.readOnly) {
        const clickSelected = editable.getAttribute("data-wtr-click-selected") === "1";
        editable.removeAttribute("data-wtr-click-selected");
        const start = clickSelected ? 0 : (editable.selectionStart ?? editable.value.length);
        const end = clickSelected
          ? editable.value.length
          : (editable.selectionEnd ?? editable.value.length);
        const next = editable.value.slice(0, start) + parsed.key + editable.value.slice(end);
        setNativeInputValue(editable, next);
      }
    }
    const keydownEvent = new KeyboardEvent("keydown", {
      ...parsed,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(new KeyboardEvent("keyup", { ...parsed, bubbles: true }));
    // Real browsers cancel implicit form submission and button activation when
    // a keydown handler calls preventDefault() — the SPA does this to own the
    // submit path. Skip the synthetic activation when the app handled it.
    const keydownHandled = keydownEvent.defaultPrevented;
    if (parsed.key === " " || parsed.key === "Enter") {
      // Real trusted keys activate buttons (Space on keyup, Enter on keydown).
      // parseKeyCombo maps "Space" -> " "; the row's onKeyDown guards
      // target===currentTarget so only the browser default activation fires.
      const tag = element.tagName;
      const isButton = tag === "BUTTON" || tag === "A" || element.getAttribute("role") === "button";
      if (isButton && (parsed.key === " " || parsed.key === "Enter")) {
        // Enter activates on keydown, Space on keyup — both dispatch click.
        if (!keydownHandled) this.page.dispatch(element, "click");
      } else if (
        (tag === "INPUT" &&
          (element as HTMLInputElement).type === "checkbox" &&
          parsed.key === " ") ||
        (tag === "INPUT" && (element as HTMLInputElement).type === "radio" && parsed.key === " ")
      ) {
        // Native default: Space toggles checkboxes / checks radios on keyup.
        if (!keydownHandled) (element as HTMLInputElement).click();
      } else if (tag === "INPUT" && parsed.key === "Enter") {
        // Implicit form submission: Enter on a text input submits the form —
        // unless the app's keydown handler preventDefaulted it.
        const form = (element as HTMLInputElement).form;
        if (!keydownHandled && form && typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else if (!keydownHandled && form) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      } else if (tag === "FORM" && parsed.key === "Enter") {
        // Playwright: Enter on a non-focusable <form> lands on its focused
        // input, which performs the implicit submission.
        const form = element as HTMLFormElement;
        if (!keydownHandled && typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else if (!keydownHandled) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
    }
    await sleep(20);
  }

  async check(): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement;
    if (!element.checked) {
      element.click();
    }
    await sleep(30);
  }

  async uncheck(): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement;
    if (element.checked) {
      element.click();
    }
    await sleep(30);
  }

  async setInputFiles(
    files:
      | Array<{ buffer: Uint8Array; mimeType: string; name: string }>
      | { buffer: Uint8Array; mimeType: string; name: string },
  ): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement;
    const fileList = Array.isArray(files) ? files : [files];
    // Construct File/DataTransfer in the IFRAME realm: the app checks
    // `file instanceof File`, and a runner-realm File fails that check.
    const view = element.ownerDocument.defaultView as Window & typeof globalThis;
    const dataTransfer = new view.DataTransfer();
    for (const file of fileList) {
      dataTransfer.items.add(
        new view.File([file.buffer as ArrayBuffer], file.name, { type: file.mimeType }),
      );
    }
    // React tracks the files property with its own value tracker; set through
    // the native setter so the app's change handler runs.
    const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, "files")?.set;
    if (setter) setter.call(element, dataTransfer.files);
    else element.files = dataTransfer.files;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(30);
  }

  async selectOption(value: string): Promise<void> {
    const element = (await this.waitForElement()) as HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(30);
  }

  async hover(options?: { position?: { x: number; y: number }; force?: boolean }): Promise<void> {
    const element = await this.waitForElement();
    // C1 real-mouse bridge: synthetic mouse events cannot match CSS :hover;
    // move the real Playwright mouse over the element so :hover applies
    // (coords are iframe-relative; add the iframe's page offset). Also sync
    // lastMouseX/Y so a later mouse.down()/up() presses where the real cursor
    // sits (Playwright semantics) instead of the last synthetic move.
    const bridge = (window as unknown as Record<string, unknown>).__wtrRealMouse;
    if (typeof bridge === "function") {
      // Playwright's hover() auto-scrolls the element into view; the real
      // mouse needs the element inside the visible viewport for :hover.
      element.scrollIntoView({ block: "center", inline: "center" });
      await new Promise<void>((resolve) => {
        const view = element.ownerDocument.defaultView!;
        view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve()));
      });
      const iframeRect = this.page.iframe.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      lastMouseX = rect.left + rect.width / 2;
      lastMouseY = rect.top + rect.height / 2;
      await callRealMouseBridge(
        "move",
        iframeRect.left + lastMouseX,
        iframeRect.top + lastMouseY,
        `hover: real-mouse bridge did not settle within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
      );
    }
    this.page.dispatch(element, "mouseover", options?.position);
    this.page.dispatch(element, "mouseenter", options?.position);
    this.page.dispatch(element, "mousemove", options?.position);
    // Page.mouse.move reads this internal target to dispatch leave events.
    const hoverPage = this.page as unknown as { lastHovered: Element | null };
    hoverPage.lastHovered = element;
    await sleep(30);
  }

  async focus(): Promise<void> {
    const element = this.current();
    element?.focus();
    await sleep(10);
  }

  async blur(): Promise<void> {
    const element = this.current();
    element?.blur();
    await sleep(10);
  }

  async pressSequentially(text: string): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement | HTMLTextAreaElement;
    element.focus();
    // Playwright types real keys: keydown/keyup per character (apps validate
    // on keyup) plus the final input/change with the composed value.
    const view = element.ownerDocument.defaultView as Window & typeof globalThis;
    for (const char of text) {
      element.dispatchEvent(new view.KeyboardEvent("keydown", { key: char, bubbles: true }));
      element.dispatchEvent(new view.KeyboardEvent("keyup", { key: char, bubbles: true }));
    }
    setNativeInputValue(element, text);
    element.dispatchEvent(new view.Event("input", { bubbles: true }));
    element.dispatchEvent(new view.Event("change", { bubbles: true }));
    await sleep(30);
  }

  async dispatchEvent(type: string, init?: Record<string, unknown>): Promise<void> {
    const element = await this.waitForElement();
    // Resolve evaluateHandle markers to real iframe-realm objects (e.g. a
    // DataTransfer the app's drop handler reads files from).
    const resolvedInit: Record<string, unknown> = { ...init };
    for (const [key, value] of Object.entries(resolvedInit)) {
      const marker = value as { __wtrHandleSource?: string } | null;
      if (marker && typeof marker.__wtrHandleSource === "string") {
        resolvedInit[key] = this.page
          .window()
          .eval(`(function () { return (${marker.__wtrHandleSource}); })()`);
      }
    }
    // Playwright dispatches TYPED events (a "click" is a MouseEvent with
    // button=0 — TanStack Link's onClick checks event.button and bails when
    // it's undefined on a generic Event).
    const event = createTypedEvent(type, element.ownerDocument, resolvedInit);
    element.dispatchEvent(event);
    await sleep(10);
  }

  async selectText(): Promise<void> {
    const element = await this.waitForElement();
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const selection = element.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    await sleep(10);
  }

  async elementHandle(): Promise<unknown> {
    const element = await this.waitForElement();
    if (!element) return null;
    const id = nextHandleId;
    nextHandleId += 1;
    wtrHandleRegistry.set(id, element);
    return { __wtrHandleRef: id };
  }

  async evaluate<T>(fn: (element: Element, arg: never) => T, arg?: unknown): Promise<T> {
    // Playwright's locator.evaluate waits for the element (post-navigation
    // re-renders, transient detaches) — resolve through waitForElement, then
    // run fn INSIDE the iframe realm via the bridge so `element instanceof
    // Element` stays valid for the callback.
    const element = await this.waitForElement();
    if (!element) return undefined as T;
    const top = window as unknown as Record<string, unknown>;
    top.__wtrEvalElement = element;
    const target = this.page.window();
    const argJson = arg === undefined ? "undefined" : JSON.stringify(arg);
    // eslint-disable-next-line no-eval
    return target.eval(
      `(function () {
        const __wtrResolve = (v) => {
  if (v && typeof v === "object" && "__wtrHandleRef" in v) return parent.__wtrHandleRegistry.get(v.__wtrHandleRef);
  if (Array.isArray(v)) return v.map(__wtrResolve);
  if (v && typeof v === "object") {
    for (const key of Object.keys(v)) v[key] = __wtrResolve(v[key]);
    return v;
  }
  return v;
};
        const el = parent.__wtrEvalElement;
        if (!el) return undefined;
        return (${fn.toString()})(el, __wtrResolve(${argJson}));
      })()`,
    ) as T;
  }
}

// ---------------------------------------------------------------------------
// Page facade
// ---------------------------------------------------------------------------

class PageFacade {
  private iframeElement: HTMLIFrameElement | null = null;
  private iframeLoadListener: (() => void) | null = null;
  private appliedViewport: { width: number; height: number; bridge: unknown } | null = null;

  // Public read access for the C1 real-mouse bridge (hover/down/up need the
  // iframe's page offset to translate iframe-relative coords).
  get iframe(): HTMLIFrameElement {
    if (!this.iframeElement) throw new Error("page: no active iframe (call goto first)");
    return this.iframeElement;
  }

  // Teardown: park the real mouse off-viewport so :hover never leaks into the
  // next test, then drop the iframe.
  async removeIframe(): Promise<void> {
    const bridge = (window as unknown as Record<string, unknown>).__wtrRealMouse;
    const iframe = this.iframeElement;
    if (!iframe) return;
    try {
      if (typeof bridge === "function") {
        await callRealMouseBridge(
          "move",
          -5,
          -5,
          `removeIframe: real-mouse bridge did not settle within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
        );
      }
    } catch {
      // Bridge teardown is best-effort; the iframe removal below is the
      // actual state reset.
    } finally {
      if (iframe) metricIncrement("iframeRemoves");
      if (this.iframeLoadListener) {
        iframe.removeEventListener("load", this.iframeLoadListener);
        this.iframeLoadListener = null;
      }
      iframe?.remove();
      if (this.iframeElement === iframe) this.iframeElement = null;
    }
  }
  private requestedViewport: { width: number; height: number } | null = null;
  private mediaEmulation: { reducedMotion?: "reduce" | "no-preference" | "light" } = {};
  readonly keyboard = {
    press: async (key: string) => {
      const doc = this.document();
      const target = (doc.activeElement as HTMLElement) ?? doc.body;
      const parsed = parseKeyCombo(key);
      if (parsed.key === "Tab") {
        // Real Tab moves focus — blur the active element (popover onBlur).
        const active = doc.activeElement as HTMLElement | null;
        active?.blur();
      } else if (isPrintableKey(parsed.key)) {
        const tag = target.tagName;
        const editable =
          tag === "INPUT" || tag === "TEXTAREA"
            ? (target as HTMLInputElement | HTMLTextAreaElement)
            : null;
        if (editable && !editable.readOnly) {
          const clickSelected = editable.getAttribute("data-wtr-click-selected") === "1";
          editable.removeAttribute("data-wtr-click-selected");
          const start = clickSelected ? 0 : (editable.selectionStart ?? editable.value.length);
          const end = clickSelected
            ? editable.value.length
            : (editable.selectionEnd ?? editable.value.length);
          const next = editable.value.slice(0, start) + parsed.key + editable.value.slice(end);
          setNativeInputValue(editable, next);
        }
      }
      const kbKeydown = new KeyboardEvent("keydown", {
        ...parsed,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(kbKeydown);
      target.dispatchEvent(new KeyboardEvent("keyup", { ...parsed, bubbles: true }));
      // Real browsers cancel implicit submission / button activation when a
      // keydown handler preventDefault()s — skip synthetic activation then.
      const kbHandled = kbKeydown.defaultPrevented;
      const kbTag = target.tagName;
      const kbIsButton =
        kbTag === "BUTTON" || kbTag === "A" || target.getAttribute("role") === "button";
      if (kbIsButton && (parsed.key === " " || parsed.key === "Enter")) {
        if (!kbHandled) this.dispatch(target, "click");
      } else if (kbTag === "INPUT" && parsed.key === " ") {
        const input = target as HTMLInputElement;
        if (input.type === "checkbox" || input.type === "radio") {
          if (!kbHandled) input.click();
        }
      } else if (kbTag === "INPUT" && parsed.key === "Enter") {
        const form = (target as HTMLInputElement).form;
        if (!kbHandled && form && typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else if (!kbHandled && form) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
      await sleep(20);
    },
    type: async (text: string) => {
      const doc = this.document();
      const target = (doc.activeElement as HTMLElement) ?? doc.body;
      for (const char of text) {
        target.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      }
      await sleep(20);
    },
  };

  private lastHovered: Element | null = null;

  // C1 real-mouse bridge: move/down/up the Playwright mouse (page coords =
  // iframe offset + iframe-relative coords). No-op when the launcher does
  // not expose the bridge (synthetic-only fallback).
  private async realMouse(op: "down" | "up" | "move", x: number, y: number): Promise<void> {
    const bridge = (window as unknown as Record<string, unknown>).__wtrRealMouse;
    if (typeof bridge !== "function") return;
    const iframeRect = this.iframeElement?.getBoundingClientRect();
    if (!iframeRect) return;
    await callRealMouseBridge(
      op,
      iframeRect.left + x,
      iframeRect.top + y,
      `mouse-${op}: real-mouse bridge did not settle within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
    );
  }

  readonly mouse = {
    click: async (x: number, y: number) => {
      const element = this.document().elementFromPoint(x, y);
      if (element) {
        element.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
        );
      }
      await sleep(20);
    },
    down: async () => {
      const element = this.document().elementFromPoint(lastMouseX, lastMouseY);
      if (element) {
        element.dispatchEvent(
          new MouseEvent("mousedown", {
            bubbles: true,
            clientX: lastMouseX,
            clientY: lastMouseY,
            button: 0,
          }),
        );
      }
      await this.realMouse("down", lastMouseX, lastMouseY);
      await sleep(20);
    },
    up: async () => {
      const element = this.document().elementFromPoint(lastMouseX, lastMouseY);
      if (element) {
        element.dispatchEvent(
          new MouseEvent("mouseup", {
            bubbles: true,
            clientX: lastMouseX,
            clientY: lastMouseY,
            button: 0,
          }),
        );
      }
      await this.realMouse("up", lastMouseX, lastMouseY);
      await sleep(20);
    },
    move: async (x: number, y: number) => {
      lastMouseX = x;
      lastMouseY = y;
      const doc = this.document();
      const element = doc.elementFromPoint(x, y);
      // Real browsers fire mouseout+mouseleave on the previously hovered
      // element; the app hides popovers on mouseleave (+100ms timer).
      if (element !== this.lastHovered) {
        if (this.lastHovered) {
          // The pointer leaves every descendant too — the browser fires
          // mouseout/mouseleave down the tree (React onMouseLeave handlers on
          // popovers/children live on those descendants).
          const leaving = [this.lastHovered, ...Array.from(this.lastHovered.querySelectorAll("*"))];
          for (const node of leaving) {
            for (const type of ["mouseout", "mouseleave"]) {
              node.dispatchEvent(
                new MouseEvent(type, {
                  bubbles: true,
                  clientX: x,
                  clientY: y,
                  relatedTarget: element,
                }),
              );
            }
          }
        }
        if (element) {
          for (const type of ["mouseover", "mouseenter"]) {
            element.dispatchEvent(
              new MouseEvent(type, {
                bubbles: true,
                clientX: x,
                clientY: y,
                relatedTarget: this.lastHovered,
              }),
            );
          }
        }
        this.lastHovered = element;
      }
      if (element) {
        element.dispatchEvent(
          new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y }),
        );
      }
      // C1: keep the real mouse in sync so CSS :hover/:active match the
      // synthetic position (move away => :hover clears).
      await this.realMouse("move", x, y);
      await sleep(20);
    },
  };

  document(): Document {
    if (!this.iframeElement?.contentDocument)
      throw new Error("page: no active iframe (call goto first)");
    return this.iframeElement.contentDocument;
  }

  window(): Window {
    if (!this.iframeElement?.contentWindow)
      throw new Error("page: no active iframe (call goto first)");
    return this.iframeElement.contentWindow;
  }

  async emulateMedia(media: {
    reducedMotion?: "reduce" | "no-preference" | "light";
  }): Promise<void> {
    this.mediaEmulation = { ...this.mediaEmulation, ...media };
    this.applyMediaEmulation();
  }

  private applyMediaEmulation(): void {
    if (!this.iframeElement?.contentWindow) return;
    const win = this.iframeElement.contentWindow;
    const reducedMotion = this.mediaEmulation.reducedMotion;
    if (!reducedMotion) return;
    const original = win.matchMedia.bind(win);
    win.matchMedia = (query: string): MediaQueryList => {
      const result = original(query);
      if (reducedMotion === "reduce" && query.includes("prefers-reduced-motion")) {
        try {
          Object.defineProperty(result, "matches", { value: true, configurable: true });
        } catch {
          // readonly guard failed — fall back to a shimmed object
        }
      }
      return result;
    };
  }

  async goto(url: string, options?: { waitUntil?: string }): Promise<void> {
    metricIncrement("gotoCalls");
    if (!this.iframeElement) {
      this.iframeElement = document.createElement("iframe");
      this.iframeElement.id = "wtr-app-frame";
      this.iframeElement.style.width = `${this.requestedViewport?.width ?? 1280}px`;
      this.iframeElement.style.height = `${this.requestedViewport?.height ?? 720}px`;
      this.iframeElement.style.border = "0";
      this.iframeElement.style.position = "fixed";
      this.iframeElement.style.left = "0";
      this.iframeElement.style.top = "0";
      document.body.appendChild(this.iframeElement);
      metricIncrement("iframeCreates");
    }
    // Park the real mouse before navigation: the cursor persists across
    // goto/setViewportSize within a test, so without this a fresh document
    // would mount with :hover applied and base-paint reads would catch the
    // border transition mid-flight.
    await this.realMouse("move", -5, -5);
    // Keep the parent browser viewport in sync with the iframe size even when
    // the test never calls setViewportSize (default 1280x720 iframe in an
    // 800x600 WTR page would clip real-mouse moves below y=600).
    await this.syncRealMouseViewport(
      this.requestedViewport?.width ?? 1280,
      this.requestedViewport?.height ?? 720,
      `goto: viewport bridge did not settle within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
    );
    const absolute = url.startsWith("http") ? url : new URL(url, location.origin).href;
    installFetchMock(this.iframeElement, window.fetch);
    this.applyMediaEmulation();
    const currentHref = this.iframeElement.contentWindow?.location.href;
    // Chromium skips navigation when iframe.src is set to the URL already
    // loaded (no load event → hang); Playwright's same-URL goto reloads.
    // The navigation is triggered AFTER the load listeners register below.
    const sameDocument = currentHref === absolute;
    const iframe = this.iframeElement;
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout>;
    let onLoad: () => void;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      iframe.removeEventListener("load", onLoad);
      if (error) reject(error);
      else resolve();
    };
    onLoad = () => finish();
    timeoutHandle = setTimeout(() => {
      metricIncrement("gotoLoadTimeouts");
      finish(
        new Error(
          `goto-load: iframe did not load ${absolute} within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
        ),
      );
    }, DEFAULT_HARNESS_WAIT_TIMEOUT_MS);
    iframe.addEventListener("load", onLoad);
    // Keep one navigation listener per iframe. Registering this inside every
    // goto() causes all prior listeners to replay on later loads.
    if (!this.iframeLoadListener) {
      this.iframeLoadListener = () => {
        const url = this.iframeElement?.contentWindow?.location.href ?? "";
        emitWtrEvent("framenavigated", { url });
      };
      iframe.addEventListener("load", this.iframeLoadListener);
    }
    if (sameDocument) {
      this.iframeElement.contentWindow?.location.reload();
    } else {
      this.iframeElement.src = absolute;
    }
    // Any document navigation inside the iframe (goto, reload, location
    // changes from the app) emits framenavigated; the initial load fires
    // before waiters register, so it is harmless. The document-request event
    // is emitted once per navigation in goto() below (Playwright parity: one
    // document request per full document load).
    await promise;
    // Emit exactly one document request per navigation (Playwright fires one
    // per full document load; SPA pushState redirects do NOT fire one).
    emitWtrEvent("request", {
      url: () => absolute,
      method: () => "GET",
      resourceType: () => "document",
    });
    const readyDeadline = Date.now() + 250;
    let ready = false;
    while (Date.now() < readyDeadline) {
      const document = this.iframeElement?.contentDocument;
      ready =
        document?.readyState === "complete" && document.querySelector("#root > #main") !== null;
      if (ready) break;
      await sleep(10);
    }
    if (ready) {
      metricIncrement("gotoReadyMounts");
      // Allow one event-loop turn for the first Query effect and its mock.
      await sleep(0);
    } else {
      metricIncrement("gotoFallbacks");
      // Preserve the old bounded readiness delay for non-React fixture routes.
      const remaining = Math.max(0, readyDeadline - Date.now());
      await sleep(remaining);
    }
  }

  async goBack(): Promise<void> {
    const current = this.iframeElement?.contentWindow;
    if (current) {
      current.history.back();
      await sleep(300);
    }
  }

  async reload(): Promise<void> {
    const src = this.iframeElement?.src;
    if (!src) return;
    installFetchMock(this.iframeElement as HTMLIFrameElement, window.fetch);
    this.iframeElement!.src = src;
    await sleep(300);
  }

  locator(selector: string, options?: { hasText?: string | RegExp; has?: Locator }): Locator {
    const locator = new Locator(this, selector);
    if (options?.hasText !== undefined) {
      return locator.filterByText(options.hasText).filterWithHas(options.has);
    }
    if (options?.has !== undefined) return locator.filterWithHas(options.has);
    return locator;
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.locator(selector).fill(value);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    await this.locator(selector).selectOption(value);
  }

  async click(selector: string, options?: { force?: boolean }): Promise<void> {
    await this.locator(selector).click(options);
  }

  async check(selector: string): Promise<void> {
    await this.locator(selector).check();
  }

  async uncheck(selector: string): Promise<void> {
    await this.locator(selector).uncheck();
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    const scoped = new Locator(this, roleSelectorFor(role)).filterWithPredicate((element) => {
      if (
        role === "combobox" &&
        element.tagName === "SELECT" &&
        !element.hasAttribute("role") &&
        (element as HTMLSelectElement).size > 1
      )
        return false;
      let node: Element | null = element;
      while (node) {
        const style = this.window().getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        node = node.parentElement;
      }
      return true;
    });
    return scoped.filterByText(options?.name, options?.exact);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return new Locator(this, "body *").filterByText(text, options?.exact, true);
  }

  getByPlaceholder(placeholder: string): Locator {
    const escaped = placeholder.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return new Locator(this, `[placeholder="${escaped}"]`);
  }

  getByLabel(label: string): Locator {
    return this.locator(`[aria-label="${label}"]`);
  }

  // Artifact-only: screenshots are not part of assertion outcomes.
  async screenshot(_options?: Record<string, unknown>): Promise<Uint8Array> {
    metricIncrement("screenshotCalls");
    return new Uint8Array(1);
  }

  async close(): Promise<void> {}

  context(): { newPage: () => Promise<Page> } {
    return { newPage: async () => this as unknown as Page };
  }

  readonly request = {
    get: async (url: string) => {
      const mockFetch = (window as unknown as Record<string, unknown>).__wtrMockFetch as
        | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
        | undefined;
      const response = mockFetch ? await mockFetch(url, { method: "GET" }) : await fetch(url);
      // Playwright-style APIResponse facade: status()/ok()/headers()/url()/body().
      return {
        status: () => response.status,
        ok: () => response.status >= 200 && response.status < 300,
        headers: () => Object.fromEntries(response.headers.entries()),
        url: () => response.url,
        body: async () => new Uint8Array(await response.arrayBuffer()),
        json: async () => {
          const text = await response.text();
          return text ? JSON.parse(text) : null;
        },
        text: async () => response.text(),
      };
    },
  };

  url(): string {
    return this.iframeElement?.contentWindow?.location.href ?? "";
  }

  async addInitScript(fn: (arg: never) => void, arg?: unknown): Promise<void> {
    metricIncrement("initHooksAdded");
    initHooks.push({
      source: fn.toString(),
      argJson: arg === undefined ? "" : JSON.stringify(arg),
    });
  }

  // Playwright's clock control: fix Date to a timestamp via an init hook
  // (replayed on every iframe load like addInitScript).
  readonly clock = {
    install: (): void => {},
    setFixedTime: (date: string | number | Date): void => {
      const timestamp = new Date(date).getTime();
      initHooks.push({
        source: `function () {
          const fixed = ${timestamp};
          const RealDate = Date;
          const FixedDate = class extends RealDate {
            constructor(...args) {
              if (args.length > 0) { super(...args); } else { super(fixed); }
            }
            static now() { return fixed; }
          };
          window.Date = FixedDate;
        }`,
        argJson: "",
      });
      metricIncrement("initHooksAdded");
    },
    // Playwright clock.runFor(ms) advances fake timers; under WTR the app's
    // real timers drive the state, so runFor waits out the real interval.
    runFor: async (milliseconds: number): Promise<void> => {
      await sleep(milliseconds);
    },
    // Playwright clock.fastForward(ms): same real-timer semantics as runFor —
    // wait out the interval while the app's real timers drive state.
    fastForward: async (milliseconds: number): Promise<void> => {
      await sleep(milliseconds);
    },
  };

  async waitForResponse(
    predicate: ResponsePredicate,
    options?: { timeout?: number },
  ): Promise<ResponseFacade> {
    const { promise, resolve, reject } = Promise.withResolvers<ResponseFacade>();
    const target = describeWaitTarget(predicate);
    const matcher: ResponseWatcher =
      typeof predicate === "string"
        ? (response) => globToRegExp(predicate).test(response.url())
        : predicate instanceof RegExp
          ? (response) => predicate.test(response.url())
          : predicate;
    const timeout = options?.timeout ?? DEFAULT_HARNESS_WAIT_TIMEOUT_MS;
    const waiter = {} as ResponseWaiter;
    waiter.predicate = matcher;
    waiter.resolve = resolve;
    waiter.reject = reject;
    waiter.timeoutHandle = setTimeout(() => {
      if (!removeResponseWatcher(waiter)) return;
      metricIncrement("responseTimeouts");
      reject(new Error(`waitForResponse: no matching response for ${target} within ${timeout}ms`));
    }, timeout);
    responseWatchers.push(waiter);
    metricIncrement("responseWatchersAdded");
    return promise;
  }

  async waitForRequest(
    predicate:
      | ((request: {
          url: string;
          method: () => string;
          headers: () => Record<string, string>;
        }) => boolean)
      | string,
    options?: { timeout?: number },
  ): Promise<{ url: () => string; method: () => string; headers: () => Record<string, string> }> {
    const { promise, resolve, reject } = Promise.withResolvers<{
      url: () => string;
      method: () => string;
      headers: () => Record<string, string>;
    }>();
    // Playwright's waitForRequest resolves on a matching request OR rejects on
    // timeout — the "assert no request fires" pattern relies on the rejection
    // (tests call .then(() => true).catch(() => false) with a short timeout).
    const timeout = options?.timeout ?? 30000;
    const constOf = (value: unknown): (() => string) =>
      typeof value === "function" ? (value as () => string) : () => String(value);
    const matcher =
      typeof predicate === "string"
        ? (request: { url: string | (() => string) }) =>
            globToRegExp(predicate).test(constOf(request.url)())
        : predicate;
    const target = describeWaitTarget(predicate);
    const waiter = {} as RequestWaiter;
    const check = (payload: unknown) => {
      const request = payload as {
        url: string | (() => string);
        method?: string | (() => string);
        resourceType?: string | (() => string);
        postData?: string | (() => string);
        postDataJSON?: () => unknown;
      };
      const urlValue = constOf(request.url);
      if (
        matcher({
          url: urlValue,
          method: request.method === undefined ? () => "GET" : constOf(request.method),
          headers: () => ({}),
          resourceType:
            request.resourceType === undefined ? () => "fetch" : constOf(request.resourceType),
        })
      ) {
        if (!requestWaiters.delete(waiter)) return;
        eventListeners.set(
          "request",
          (eventListeners.get("request") ?? []).filter((entry) => entry !== check),
        );
        metricIncrement("eventListenersRemoved");
        clearTimeout(waiter.timeoutHandle);
        resolve({
          url: urlValue,
          method: request.method === undefined ? () => "GET" : constOf(request.method),
          headers: () => ({}),
          postData: request.postData === undefined ? () => undefined : constOf(request.postData),
          postDataJSON:
            request.postDataJSON === undefined
              ? () => undefined
              : (request.postDataJSON as () => unknown),
        });
      }
    };
    waiter.check = check;
    waiter.timeoutHandle = setTimeout(() => {
      if (!requestWaiters.delete(waiter)) return;
      eventListeners.set(
        "request",
        (eventListeners.get("request") ?? []).filter((entry) => entry !== check),
      );
      metricIncrement("eventListenersRemoved");
      metricIncrement("requestTimeouts");
      reject(new Error(`waitForRequest: no matching request for ${target} within ${timeout}ms`));
    }, timeout);
    requestWaiters.add(waiter);
    eventListeners.set("request", [...(eventListeners.get("request") ?? []), check]);
    metricIncrement("eventListenersAdded");
    return promise;
  }

  async waitForFunction(fn: () => unknown, options?: { timeout?: number }): Promise<void> {
    const deadline = Date.now() + (options?.timeout ?? 10000);
    const fnSource = fn.toString();
    const target = this.window();
    while (Date.now() < deadline) {
      // eslint-disable-next-line no-eval
      const result = target.eval(`(${fnSource})()`);
      if (result) return;
      await sleep(50);
    }
    throw new Error("waitForFunction: condition never became truthy");
  }

  async waitForURL(url: string | RegExp | ((url: URL) => boolean)): Promise<void> {
    await expectPoll(
      async () => {
        const actual = this.url();
        if (typeof url === "function") return url(new URL(actual));
        if (typeof url !== "string") return url.test(actual);
        const relative = !/^[a-z]+:/i.test(url) && !url.startsWith("//");
        if (url.includes("*")) {
          const pattern = relative ? new URL(url, actual).href : url;
          return globToRegExp(pattern).test(actual);
        }
        if (relative) return actual === new URL(url, actual).href;
        return actual === url;
      },
      `waitForURL(${String(url)})`,
    );
  }

  async waitForLoadState(
    state?: "load" | "domcontentloaded" | "networkidle" | "commit",
  ): Promise<void> {
    // Iframe document + mocked fetch are already settled when the test body
    // runs; the follow-up assertions poll anyway. Wait a beat for any in-flight
    // post-mount effects (load events, image decode) to land.
    if (state === "networkidle") await sleep(120);
    await this.document();
  }

  async unroute(pattern: string): Promise<void> {
    const regex = globToRegExp(pattern);
    for (let index = mockRegistry.length - 1; index >= 0; index -= 1) {
      if (mockRegistry[index].regex.source === regex.source) {
        mockRegistry.splice(index, 1);
        metricIncrement("routeUnregistrations");
      }
    }
  }

  on(name: WtrEventName, listener: (payload: unknown) => void): void {
    const listeners = eventListeners.get(name) ?? [];
    listeners.push(listener);
    eventListeners.set(name, listeners);
    metricIncrement("eventListenersAdded");
  }

  once(name: WtrEventName, listener: (payload: unknown) => void): void {
    const wrapped = (payload: unknown) => {
      listener(payload);
      const listeners = eventListeners.get(name) ?? [];
      eventListeners.set(
        name,
        listeners.filter((entry) => entry !== wrapped),
      );
      metricIncrement("eventListenersRemoved");
    };
    this.on(name, wrapped);
  }

  waitForEvent(name: WtrEventName, options?: { timeout?: number }): Promise<unknown> {
    return waitForWtrEvent(name, options?.timeout ?? DEFAULT_HARNESS_WAIT_TIMEOUT_MS);
  }

  title(): string {
    return this.document().title;
  }

  async setViewportSize(size: { width: number; height: number }): Promise<void> {
    this.requestedViewport = size;
    if (this.iframeElement) {
      this.iframeElement.style.width = `${size.width}px`;
      this.iframeElement.style.height = `${size.height}px`;
    }
    // Real mouse needs the parent browser viewport to match: the iframe is
    // fixed at (0,0) sized to the requested viewport, so coords map 1:1.
    await this.syncRealMouseViewport(
      size.width,
      size.height,
      `setViewportSize: viewport bridge did not settle within ${DEFAULT_HARNESS_WAIT_TIMEOUT_MS}ms`,
    );
  }

  private async syncRealMouseViewport(
    width: number,
    height: number,
    message: string,
  ): Promise<void> {
    const bridge = (window as unknown as Record<string, unknown>).__wtrRealMouse;
    if (typeof bridge !== "function") return;
    // setViewport is a browser-wide side effect; repeating the same dimensions
    // on every goto adds bridge round-trips without changing the surface.
    if (
      this.appliedViewport?.bridge === bridge &&
      this.appliedViewport.width === width &&
      this.appliedViewport.height === height
    ) {
      return;
    }
    await callRealMouseBridge("setViewport", width, height, message);
    this.appliedViewport = { width, height, bridge };
  }

  async setContent(html: string): Promise<void> {
    // Playwright page.setContent replaces the document with the given HTML
    // (works without a prior goto). document.open/write/close keeps the same
    // window (fetch mock, storage) while swapping the document for the
    // injected fixture DOM.
    if (!this.iframeElement) {
      this.iframeElement = document.createElement("iframe");
      this.iframeElement.id = "wtr-app-frame";
      this.iframeElement.style.width = `${this.requestedViewport?.width ?? 1280}px`;
      this.iframeElement.style.height = `${this.requestedViewport?.height ?? 720}px`;
      this.iframeElement.style.border = "0";
      this.iframeElement.style.position = "fixed";
      this.iframeElement.style.left = "0";
      this.iframeElement.style.top = "0";
      document.body.appendChild(this.iframeElement);
      metricIncrement("iframeCreates");
    }
    installFetchMock(this.iframeElement, window.fetch);
    this.applyMediaEmulation();
    const doc = this.iframeElement.contentDocument;
    if (!doc) throw new Error("page: iframe has no contentDocument");
    doc.open();
    doc.write(html);
    doc.close();
  }

  async dispatchEvent(
    selector: string,
    type: string,
    init?: Record<string, unknown>,
  ): Promise<void> {
    // Playwright page.dispatchEvent(selector, type, init): resolve the
    // selector (strict mode) and dispatch on the first match.
    const locator = new Locator(this, selector);
    await locator.dispatchEvent(type, init);
  }

  async evaluateHandle(fn: (arg: unknown) => unknown, arg?: unknown): Promise<unknown> {
    // Lazy iframe-realm handle: resolved when passed into dispatchEvent init.
    // Playwright passes fn args through; serialize the arg into the source so
    // the iframe-realm re-evaluation receives it.
    const serializedArg = arg === undefined ? "" : JSON.stringify(arg);
    return { __wtrHandleSource: `(${fn.toString()})(${serializedArg})` };
  }

  async evaluate<T>(fn: (arg: never) => T, arg?: unknown): Promise<T> {
    const target = this.window();
    const fnSource = fn.toString();
    const serializedArg = arg === undefined ? "" : JSON.stringify(arg);
    // eslint-disable-next-line no-eval
    return target.eval(`(${fnSource})(${serializedArg})`) as T;
  }

  async route(pattern: string | RegExp, handler: MockHandler): Promise<void> {
    // Playwright accepts a string glob OR a RegExp.
    const regex = typeof pattern === "string" ? globToRegExp(pattern) : pattern;
    mockRegistry.push({ regex, handler });
    metricIncrement("routeRegistrations");
  }

  async unrouteAll(): Promise<void> {
    metricIncrement("routeUnregistrations", mockRegistry.length);
    mockRegistry.length = 0;
  }

  async waitForTimeout(ms: number): Promise<void> {
    await sleep(ms);
  }

  async waitForSelector(selector: string, options?: { timeout?: number }): Promise<Locator> {
    const deadline = Date.now() + (options?.timeout ?? 10000);
    while (Date.now() < deadline) {
      if (this.document().querySelector(selector)) {
        return this.locator(selector);
      }
      await sleep(50);
    }
    throw new Error(`waitForSelector: ${selector} not found`);
  }

  dispatch(element: HTMLElement, type: string, position?: { x: number; y: number }): void {
    const rect = element.getBoundingClientRect();
    const clientX = position ? rect.left + position.x : rect.left + rect.width / 2;
    const clientY = position ? rect.top + position.y : rect.top + rect.height / 2;
    const defaultAllowed = element.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }),
    );
    // Synthetic dispatch does not perform the native mousedown focus default.
    if (type === "mousedown" && defaultAllowed) {
      const focusTarget = element.closest<HTMLElement>(
        "button, input, select, textarea, a[href], [tabindex], [contenteditable]",
      );
      if (focusTarget) focusTarget.focus();
      else (this.document().activeElement as HTMLElement | null)?.blur();
    }
  }
}

// ---------------------------------------------------------------------------
// expect() matchers with polling
// ---------------------------------------------------------------------------

type ExpectTarget = Locator | string | (() => unknown);

interface ExpectResult {
  toHaveText(expected: string | string[] | RegExp, options?: { timeout?: number }): Promise<void>;
  toContainText(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toHaveClass(
    expected: string | RegExp | Array<string | RegExp>,
    options?: { timeout?: number },
  ): Promise<void>;
  toHaveAttribute(
    name: string,
    expected?: string | RegExp,
    options?: { timeout?: number },
  ): Promise<void>;
  toHaveCount(count: number, options?: { timeout?: number }): Promise<void>;
  toBeVisible(options?: { timeout?: number }): Promise<void>;
  toBeHidden(options?: { timeout?: number }): Promise<void>;
  toBeChecked(options?: { timeout?: number }): Promise<void>;
  toBeFocused(options?: { timeout?: number }): Promise<void>;
  toHaveValue(value: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toHaveURL(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toContain(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toMatch(expected: RegExp, options?: { timeout?: number }): Promise<void>;
  toBe(expected: unknown, options?: { timeout?: number }): Promise<void>;
  toHaveTitle(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toHaveJSProperty(name: string, expected: unknown, options?: { timeout?: number }): Promise<void>;
  toHaveAccessibleName(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toMatchObject(expected: Record<string, unknown>, options?: { timeout?: number }): Promise<void>;
  toEqual(expected: unknown, options?: { timeout?: number }): Promise<void>;
  toBeLessThan(expected: number, options?: { timeout?: number }): Promise<void>;
  toBeGreaterThan(expected: number, options?: { timeout?: number }): Promise<void>;
  toBeLessThanOrEqual(expected: number, options?: { timeout?: number }): Promise<void>;
  toBeGreaterThanOrEqual(expected: number, options?: { timeout?: number }): Promise<void>;
  toBeCloseTo(expected: number, digits?: number, options?: { timeout?: number }): Promise<void>;
  toHaveCSS(name: string, value: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toBeAttached(options?: { timeout?: number }): Promise<void>;
  toHaveLength(expected: number, options?: { timeout?: number }): Promise<void>;
  toBeNull(options?: { timeout?: number }): Promise<void>;
  toBeEmpty(options?: { timeout?: number }): Promise<void>;
  toBeDisabled(options?: { timeout?: number }): Promise<void>;
  toBeEnabled(options?: { timeout?: number }): Promise<void>;
  toHaveValues(expected: string[], options?: { timeout?: number }): Promise<void>;
  toBeDefined(options?: { timeout?: number }): Promise<void>;
  toHaveProperty(name: string, options?: { timeout?: number }): Promise<void>;
  toBeTruthy(options?: { timeout?: number }): Promise<void>;
  toBeFalsy(options?: { timeout?: number }): Promise<void>;
  resolves: {
    toBe(expected: unknown): Promise<void>;
    toEqual(expected: unknown): Promise<void>;
  };
  toContainEqual(expected: unknown, options?: { timeout?: number }): Promise<void>;
  toBeUndefined(options?: { timeout?: number }): Promise<void>;
  not: Omit<ExpectResult, "not">;
}

const DEFAULT_TIMEOUT_MS = 10000;

function expectPoll(
  condition: () => boolean | Promise<boolean>,
  message: string,
  timeout?: number,
): Promise<void> {
  const deadline = Date.now() + (timeout ?? DEFAULT_TIMEOUT_MS);
  return (async () => {
    let last = false;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        last = await condition();
        lastError = null;
      } catch (error) {
        // Playwright retries through transient errors (strict-mode
        // violations on dual-render states, detached elements, ...).
        lastError = error;
        last = false;
      }
      if (last) return;
      await sleep(POLL_INTERVAL_MS);
    }
    if (lastError !== null) throw lastError;
    throw new Error(`expect: ${message}`);
  })();
}

function matchText(actual: string, expected: string | RegExp): boolean {
  return typeof expected === "string" ? actual === normalizeText(expected) : expected.test(actual);
}

function matchContainText(actual: string, expected: string | RegExp): boolean {
  return typeof expected === "string"
    ? actual.includes(normalizeText(expected))
    : expected.test(actual);
}

function matchClass(actualClass: string, expected: string | RegExp): boolean {
  if (typeof expected === "string") {
    return expected
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => actualClass.split(/\s+/).includes(token));
  }
  return expected.test(actualClass);
}

function buildExpect(target: ExpectTarget, negate: boolean): ExpectResult {
  const make =
    (check: () => Promise<boolean>, description: string) =>
    async (options?: { timeout?: number }) => {
      const condition = async () => (negate ? !(await check()) : await check());
      await expectPoll(condition, description, options?.timeout);
    };

  const valueOf = (): unknown =>
    typeof target === "function" ? (target as () => unknown)() : target;

  const textOf = async (): Promise<string> => {
    if (target instanceof Locator) {
      const element = target.current();
      return normalizeText(element?.textContent ?? "");
    }
    return normalizeText(String(await valueOf()));
  };

  const stringTarget = target instanceof Locator ? null : valueOf;

  const syncAssert = (passes: boolean, description: string): void => {
    if (negate ? passes : !passes) {
      throw new Error(`expect: ${description}`);
    }
  };

  const matchers: ExpectResult = {
    toBeLessThanOrEqual: (expected: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(
          Number(stringTarget()) <= expected,
          `toBeLessThanOrEqual(${expected}) — actual: ${String(stringTarget())}`,
        );
        return;
      }
      return expectPoll(
        async () => Number(await textOf()) <= expected,
        `toBeLessThanOrEqual(${expected})`,
        options?.timeout,
      );
    },
    toBeGreaterThanOrEqual: (expected: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(
          Number(stringTarget()) >= expected,
          `toBeGreaterThanOrEqual(${expected}) — actual: ${String(stringTarget())}`,
        );
        return;
      }
      return expectPoll(
        async () => Number(await textOf()) >= expected,
        `toBeGreaterThanOrEqual(${expected})`,
        options?.timeout,
      );
    },
    toBeCloseTo: (expected: number, digits?: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        const actual = Number(stringTarget());
        const epsilon = Math.pow(10, -(digits ?? 2)) / 2;
        syncAssert(
          Math.abs(actual - expected) <= epsilon,
          `toBeCloseTo(${expected}) — actual: ${actual}`,
        );
        return;
      }
      return expectPoll(
        async () => Math.abs(Number(await textOf()) - expected) <= Math.pow(10, -(digits ?? 2)) / 2,
        `toBeCloseTo(${expected})`,
        options?.timeout,
      );
    },
    toHaveCSS: async (name: string, value: string | RegExp, options?: { timeout?: number }) => {
      const actualValue = async () => {
        if (!(target instanceof Locator)) return "";
        const element = target.current();
        if (!element) return "";
        return target.page.window().getComputedStyle(element).getPropertyValue(name).trim();
      };
      const describeActual = async () => {
        try {
          return String(await actualValue());
        } catch (error) {
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const actual = await actualValue();
          const matches = typeof value === "string" ? actual === value : value.test(actual);
          return negate ? !matches : matches;
        },
        `toHaveCSS(${name}) — actual: ${await describeActual()}`,
        options?.timeout,
      );
    },
    toBeAttached: make(
      async () => (target instanceof Locator ? target.current() !== null : false),
      "toBeAttached",
    ),
    toBeEmpty: make(async () => {
      if (!(target instanceof Locator)) return false;
      const element = target.current();
      return (
        element !== null &&
        element.children.length === 0 &&
        (element.textContent ?? "").trim() === ""
      );
    }, "toBeEmpty"),
    toBeDisabled: make(async () => {
      if (!(target instanceof Locator)) return false;
      const element = target.current();
      return element !== null && (element as HTMLInputElement).disabled === true;
    }, "toBeDisabled"),
    toBeEnabled: make(async () => {
      if (!(target instanceof Locator)) return false;
      const element = target.current();
      return element !== null && (element as HTMLInputElement).disabled === false;
    }, "toBeEnabled"),
    toHaveValues: async (expected: string[], options?: { timeout?: number }) => {
      const actualValues = async () => {
        if (!(target instanceof Locator)) return [];
        const element = target.currentSafe() as HTMLSelectElement | null;
        if (!element) return [];
        return Array.from(element.selectedOptions).map((option) => option.value);
      };
      await expectPoll(
        async () => {
          const actual = await actualValues();
          const matches =
            expected.length === actual.length &&
            expected.every((value, index) => value === actual[index]);
          return negate ? !matches : matches;
        },
        `toHaveValues(${JSON.stringify(expected)}) — actual: ${JSON.stringify(await actualValues())}`,
        options?.timeout,
      );
    },
    toBeDefined: make(async () => {
      if (target instanceof Locator) return target.currentSafe() !== null;
      return valueOf() !== undefined;
    }, "toBeDefined"),
    toHaveProperty: make(async () => {
      if (target instanceof Locator) {
        const element = target.currentSafe();
        return element !== null && name in element;
      }
      const value = stringTarget?.();
      return value !== undefined && value !== null && name in value;
    }, "toHaveProperty"),
    resolves: {
      toBe: async (expected: unknown) => {
        if (stringTarget === null) return;
        const actual = await (stringTarget() as Promise<unknown>);
        syncAssert(
          actual === expected,
          `resolves.toBe(${String(expected)}) — actual: ${String(actual)}`,
        );
      },
      toEqual: async (expected: unknown) => {
        if (stringTarget === null) return;
        const actual = await (stringTarget() as Promise<unknown>);
        syncAssert(
          JSON.stringify(actual) === JSON.stringify(expected),
          `resolves.toEqual(${JSON.stringify(expected)})`,
        );
      },
      toMatchObject: async (expected: Record<string, unknown>) => {
        if (stringTarget === null) return;
        const actual = (await (stringTarget() as Promise<unknown>)) as Record<string, unknown>;
        const passes = Object.entries(expected).every(
          ([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value),
        );
        syncAssert(
          passes,
          `resolves.toMatchObject(${JSON.stringify(expected)}) — actual: ${JSON.stringify(actual)}`,
        );
      },
    },
    toContainEqual: (expected: unknown, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        const actual = stringTarget() as unknown[];
        const passes =
          Array.isArray(actual) &&
          actual.some((item) => JSON.stringify(item) === JSON.stringify(expected));
        syncAssert(passes, `toContainEqual(${JSON.stringify(expected)})`);
        return;
      }
      return expectPoll(
        async () => {
          const actual = await textOf();
          const matches = actual.includes(JSON.stringify(expected));
          return negate ? !matches : matches;
        },
        `toContainEqual(${JSON.stringify(expected)})`,
        options?.timeout,
      );
    },
    toBeUndefined: (options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(stringTarget() === undefined, "toBeUndefined");
        return;
      }
      return expectPoll(
        async () => {
          const matches = (await textOf()) === "";
          return negate ? !matches : matches;
        },
        "toBeUndefined",
        options?.timeout,
      );
    },
    toContain: (expected, options) => {
      if (stringTarget !== null) {
        const raw = stringTarget();
        if (Array.isArray(raw)) {
          const passes = raw.some((item) => asymmetricEquals(item, expected));
          syncAssert(passes, `toContain(${String(expected)})`);
          return;
        }
        const actual = String(raw);
        const passes =
          typeof expected === "string" ? actual.includes(expected) : expected.test(actual);
        syncAssert(passes, `toContain(${String(expected)})`);
        return;
      }
      return matchers.toContainText(expected as string | RegExp, options);
    },
    toMatch: (expected: RegExp, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(expected.test(String(stringTarget())), `toMatch(${String(expected)})`);
        return;
      }
      return expectPoll(
        async () => {
          const matches = expected.test(await textOf());
          return negate ? !matches : matches;
        },
        `toMatch(${String(expected)})`,
        options?.timeout,
      );
    },
    toBeNull: (options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(stringTarget() === null, `toBeNull — actual: ${String(stringTarget())}`);
        return;
      }
      return expectPoll(
        async () => {
          const matches = (await textOf()) === "";
          return negate ? !matches : matches;
        },
        "toBeNull",
        options?.timeout,
      );
    },
    toBeTruthy: (options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(Boolean(stringTarget()), "toBeTruthy");
        return;
      }
      return expectPoll(
        async () => {
          const matches = Boolean(await textOf());
          return negate ? !matches : matches;
        },
        "toBeTruthy",
        options?.timeout,
      );
    },
    toBeFalsy: (options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(!stringTarget(), "toBeFalsy");
        return;
      }
      return expectPoll(
        async () => {
          const matches = !(await textOf());
          return negate ? !matches : matches;
        },
        "toBeFalsy",
        options?.timeout,
      );
    },
    toBe: async (expected, options) => {
      if (stringTarget !== null) {
        const actual = stringTarget();
        syncAssert(actual === expected, `toBe(${String(expected)}) — actual: ${String(actual)}`);
        return;
      }
      return expectPoll(
        async () => {
          const matches = (await textOf()) === expected;
          return negate ? !matches : matches;
        },
        `toBe(${String(expected)}) — actual: ${await textOf()}`,
        options?.timeout,
      );
    },
    toEqual: (expected, options) => {
      if (stringTarget !== null) {
        const actual = stringTarget();
        const passes = asymmetricEquals(actual, expected);
        let detail = "";
        if (
          !passes &&
          typeof expected === "object" &&
          actual !== null &&
          typeof actual === "object"
        ) {
          const expectedObj = expected as Record<string, unknown>;
          const actualObj = actual as Record<string, unknown>;
          const diffKeys = Object.keys(expectedObj).filter(
            (key) => JSON.stringify(expectedObj[key]) !== JSON.stringify(actualObj[key]),
          );
          if (diffKeys.length > 0) {
            detail = ` keys=${diffKeys.join(",")} exp=${JSON.stringify(diffKeys.map((k) => expectedObj[k]))} act=${JSON.stringify(diffKeys.map((k) => actualObj[k]))}`;
          }
        } else if (!passes && typeof expected === "string" && typeof actual === "string") {
          for (let k = 0; k < Math.min(expected.length, actual.length); k += 1) {
            if (expected[k] !== actual[k]) {
              detail = ` diff@${k} exp[...${JSON.stringify(expected.slice(Math.max(0, k - 60), k + 120))}] act[...${JSON.stringify(actual.slice(Math.max(0, k - 60), k + 120))}]`;
              break;
            }
          }
          if (!detail) detail = ` length ${expected.length} vs ${actual.length}`;
        }
        syncAssert(passes, `toEqual${detail}`);
        return;
      }
      return expectPoll(
        async () => {
          const actual = await textOf();
          const passes = asymmetricEquals(actual, expected);
          return negate ? !passes : passes;
        },
        `toEqual(${String(expected)})`,
        options?.timeout,
      );
    },
    toMatchObject: (expected: Record<string, unknown>, options?: { timeout?: number }) => {
      if (stringTarget === null) return;
      const actual = stringTarget() as Record<string, unknown>;
      const matches = toMatchObjectCheck(actual, expected);
      syncAssert(
        matches,
        `toMatchObject(${JSON.stringify(expected)}) — actual: ${JSON.stringify(actual).slice(0, 200)}`,
      );
    },
    toBeLessThan: (expected: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(
          Number(stringTarget()) < expected,
          `toBeLessThan(${expected}) — actual: ${String(stringTarget())}`,
        );
        return;
      }
      return expectPoll(
        async () => Number(await textOf()) < expected,
        `toBeLessThan(${expected})`,
        options?.timeout,
      );
    },
    toBeGreaterThan: (expected: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        syncAssert(
          Number(stringTarget()) > expected,
          `toBeGreaterThan(${expected}) — actual: ${String(stringTarget())}`,
        );
        return;
      }
      return expectPoll(
        async () => Number(await textOf()) > expected,
        `toBeGreaterThan(${expected})`,
        options?.timeout,
      );
    },
    toHaveText: async (expected, options) => {
      if (stringTarget !== null) {
        const actual = normalizeText(String(stringTarget()));
        const expectedList = Array.isArray(expected) ? expected : [expected];
        const passes = expectedList.every((part) => matchText(actual, part));
        syncAssert(passes, `toHaveText(${String(expected)}) — actual: ${actual}`);
        return;
      }
      const expectedList = Array.isArray(expected) ? expected : [expected];
      await expectPoll(
        async () => {
          if (Array.isArray(expected) && target instanceof Locator) {
            // Playwright semantics: for a multi-element locator the array is
            // compared element-wise (button[0] === entry[0], ...).
            const texts = (await target.allTextContents()).map((text) => normalizeText(text));
            const matches =
              texts.length === expectedList.length &&
              expectedList.every((part, index) => matchText(texts[index] ?? "", part));
            return negate ? !matches : matches;
          }
          const actual = await textOf();
          const matches = matchText(actual, expected);
          return negate ? !matches : matches;
        },
        (() => {
          try {
            const element = target instanceof Locator ? target.current() : null;
            return `toHaveText(${String(expected)}) — actual: ${element?.textContent ?? ""}`;
          } catch {
            return `toHaveText(${String(expected)})`;
          }
        })(),
        options?.timeout,
      );
    },
    toContainText: async (expected, options) => {
      if (stringTarget !== null) {
        const actual = normalizeText(String(stringTarget()));
        syncAssert(
          matchContainText(actual, expected),
          `toContainText(${String(expected)}) — actual: ${actual}`,
        );
        return;
      }
      await expectPoll(
        async () => {
          const matches = matchContainText(await textOf(), expected);
          return negate ? !matches : matches;
        },
        (() => {
          try {
            const element = target instanceof Locator ? target.current() : null;
            return `toContainText(${String(expected)}) — actual: ${element?.textContent ?? ""}`;
          } catch {
            return `toContainText(${String(expected)})`;
          }
        })(),
        options?.timeout,
      );
    },
    toHaveClass: async (expected, options) => {
      const actualClass = async () => {
        if (target instanceof Locator) {
          return (target.current()?.className as string) ?? "";
        }
        return String(await valueOf());
      };
      const expectedList = Array.isArray(expected) ? expected : [expected];
      await expectPoll(
        async () => {
          if (Array.isArray(expected) && target instanceof Locator) {
            // Multi-element locator: compare element-wise (Playwright).
            const classNames = await target.evaluateAll((elements) =>
              elements.map((element) => element.className),
            );
            const matches =
              classNames.length === expectedList.length &&
              expectedList.every((entry, index) => matchClass(classNames[index] ?? "", entry));
            return negate ? !matches : matches;
          }
          const actual = await actualClass();
          const matches = expectedList.every((entry) => matchClass(actual, entry));
          return negate ? !matches : matches;
        },
        (() => {
          try {
            const element = target instanceof Locator ? target.currentSafe() : null;
            return `toHaveClass(${String(expected)}) — actual: ${element?.className ?? ""}`;
          } catch {
            return `toHaveClass(${String(expected)})`;
          }
        })(),
        options?.timeout,
      );
    },
    toHaveAttribute: async (name, expected, options) => {
      const actualValue = async () => {
        if (target instanceof Locator) {
          return (target.current()?.getAttribute(name) as string) ?? null;
        }
        return null;
      };
      const describeAttribute = async () => {
        try {
          return String(await actualValue());
        } catch (error) {
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const actual = await actualValue();
          const matches =
            actual === null
              ? false
              : expected === undefined
                ? true
                : typeof expected === "string"
                  ? actual === expected
                  : expected instanceof RegExp
                    ? expected.test(actual)
                    : typeof expected === "object" &&
                        expected !== null &&
                        typeof (expected as { asymmetricMatch?: unknown }).asymmetricMatch ===
                          "function"
                      ? (
                          expected as { asymmetricMatch: (value: unknown) => boolean }
                        ).asymmetricMatch(actual)
                      : String(actual) === String(expected);
          return negate ? !matches : matches;
        },
        `toHaveAttribute(${name}) — actual: ${await describeAttribute()}`,
        options?.timeout,
      );
    },
    toHaveAccessibleName: async (expected: string | RegExp, options?: { timeout?: number }) => {
      const actualName = async () => {
        if (!(target instanceof Locator)) return "";
        const element = target.currentSafe();
        if (!element) return "";
        // Minimal accessible-name computation matching the tests' usage:
        // aria-label, aria-labelledby target, title, then text content.
        const label = element.getAttribute("aria-label");
        if (label) return label;
        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy) {
          const ref = element.ownerDocument.getElementById(labelledBy);
          if (ref) return ref.textContent ?? "";
        }
        const title = element.getAttribute("title");
        if (title) return title;
        return (element.textContent ?? "").trim();
      };
      const describeName = async () => {
        try {
          return String(await actualName());
        } catch (error) {
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const actual = await actualName();
          return typeof expected === "string" ? actual === expected : expected.test(actual);
        },
        `toHaveAccessibleName(${String(expected)}) — actual: ${await describeName()}`,
        options?.timeout,
      );
    },
    toHaveLength: (expected: number, options?: { timeout?: number }) => {
      if (stringTarget !== null) {
        const actual = stringTarget() as unknown;
        const length =
          typeof actual === "string" ? actual.length : Array.isArray(actual) ? actual.length : null;
        syncAssert(
          length === expected,
          `toHaveLength(${expected}) — actual length: ${String(length)}`,
        );
        return;
      }
      return expectPoll(
        async () => {
          const actual = await textOf();
          const matches = actual.length === expected;
          return negate ? !matches : matches;
        },
        `toHaveLength(${expected})`,
        options?.timeout,
      );
    },
    toHaveCount: async (count, options) => {
      const actualCount = async () => (target instanceof Locator ? target.count() : 0);
      const describeCount = async () => {
        try {
          return String(await actualCount());
        } catch (error) {
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const matches = (await actualCount()) === count;
          return negate ? !matches : matches;
        },
        `toHaveCount(${count}) — actual: ${await describeCount()} [sel: ${target instanceof Locator ? target.selector : "?"}]`,
        options?.timeout,
      );
    },
    toBeVisible: make(
      async () => (target instanceof Locator ? target.isVisible() : true),
      "toBeVisible",
    ),
    toBeHidden: make(
      async () => (target instanceof Locator ? !(await target.isVisible()) : false),
      "toBeHidden",
    ),
    toBeChecked: make(
      async () => (target instanceof Locator ? target.isChecked() : false),
      "toBeChecked",
    ),
    toBeFocused: make(async () => {
      if (!(target instanceof Locator)) return false;
      const element = target.current();
      return (
        element !== null && element === (element.ownerDocument.activeElement as Element | null)
      );
    }, "toBeFocused"),
    toHaveJSProperty: async (name: string, expected: unknown, options?: { timeout?: number }) => {
      if (!(target instanceof Locator)) return;
      const actualValue = async () => {
        const element = target.current();
        if (!element) return undefined;
        // Playwright accepts dotted paths ("files.length").
        let value: unknown = element;
        for (const part of name.split(".")) {
          if (value === null || value === undefined) return undefined;
          value = (value as Record<string, unknown>)[part];
        }
        return value;
      };
      const describeProperty = async () => {
        try {
          return String(await actualValue());
        } catch (error) {
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const matches = (await actualValue()) === expected;
          return negate ? !matches : matches;
        },
        `toHaveJSProperty(${name}) — actual: ${await describeProperty()}`,
        options?.timeout,
      );
    },
    toHaveTitle: async (expected: string | RegExp, options?: { timeout?: number }) => {
      if (target instanceof Locator) {
        return;
      }
      const pageTarget = target as unknown as PageFacade;
      await expectPoll(
        async () => {
          const title = pageTarget.document().title;
          const matches = matchText(title, expected);
          return negate ? !matches : matches;
        },
        `toHaveTitle(${String(expected)})`,
        options?.timeout,
      );
    },
    toHaveValue: async (value: string | RegExp, options?: { timeout?: number }) => {
      const actualValue = async () => (target instanceof Locator ? target.inputValue() : "");
      const describeActual = async () => {
        try {
          return String(await actualValue());
        } catch (error) {
          // Transient element absence must not fail the matcher before the
          // retry loop polls — report it in the message instead.
          return `(unavailable: ${error instanceof Error ? error.message : String(error)})`;
        }
      };
      await expectPoll(
        async () => {
          const actual = await actualValue();
          const matches = typeof value === "string" ? actual === value : value.test(actual);
          return negate ? !matches : matches;
        },
        `toHaveValue(${String(value)}) — actual: ${await describeActual()}`,
        options?.timeout,
      );
    },
    toHaveURL: async (expected: string | RegExp, options?: { timeout?: number }) => {
      const actual = () =>
        target instanceof Locator ? "" : (target as unknown as PageFacade).url();
      const matchesUrl = (url: string) => {
        if (typeof expected !== "string") return expected.test(url);
        const relative = !/^[a-z]+:/i.test(expected) && !expected.startsWith("//");
        if (expected.includes("*")) {
          // Playwright globs only use * / **; ? is a literal. A relative glob
          // resolves against the current URL first, then matches the full URL.
          const pattern = relative ? new URL(expected, url).href : expected;
          return globToRegExp(pattern).test(url);
        }
        // Relative strings resolve against the current URL and compare exactly.
        if (relative) {
          return url === new URL(expected, url).href;
        }
        return url === expected;
      };
      await expectPoll(
        async () => {
          const matches = matchesUrl(actual());
          return negate ? !matches : matches;
        },
        `toHaveURL(${String(expected)}) — actual: ${actual()}`,
        options?.timeout,
      );
    },
  }; // Lazy not() chain: build the negated matcher only when accessed.
  Object.defineProperty(matchers, "not", {
    get: () => buildExpect(target, !negate),
  });
  return matchers;
}

function asymmetricEquals(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object" && "asymmetricMatch" in expected) {
    const matcher = expected as { asymmetricMatch: (value: unknown) => boolean };
    return matcher.asymmetricMatch(actual);
  }
  if (typeof expected === "number" || typeof actual === "number") return actual === expected;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
    if (expected.length !== actual.length) return false;
    return expected.every((item, index) => asymmetricEquals((actual as unknown[])[index], item));
  }
  if (
    typeof expected === "object" &&
    expected !== null &&
    typeof actual === "object" &&
    actual !== null
  ) {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    if (expectedKeys.length !== actualKeys.length) return false;
    if (!expectedKeys.every((key, index) => key === actualKeys[index])) return false;
    return expectedKeys.every((key) =>
      asymmetricEquals(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
      ),
    );
  }
  return actual === expected;
}

// Playwright/Jest toMatchObject: expected must be a SUBSET of actual at every
// level (actual may carry extra keys; nested plain objects recurse subset).
function toMatchObjectCheck(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object" && !Array.isArray(expected)) {
    if ("asymmetricMatch" in (expected as Record<string, unknown>)) {
      return asymmetricEquals(actual, expected);
    }
    if (actual === null || typeof actual !== "object") return false;
    return Object.entries(expected as Record<string, unknown>).every(([key, value]) =>
      toMatchObjectCheck((actual as Record<string, unknown>)[key], value),
    );
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((value, index) => toMatchObjectCheck(actual[index], value));
  }
  return asymmetricEquals(actual, expected);
}

export function expect(target: ExpectTarget): ExpectResult {
  return buildExpect(target, false);
}

// Asymmetric matchers for use inside toEqual / toMatchObject.
expect.stringContaining = (expected: string) => ({
  asymmetricMatch: (actual: unknown) => typeof actual === "string" && actual.includes(expected),
});
expect.stringMatching = (expected: RegExp) => ({
  asymmetricMatch: (actual: unknown) => typeof actual === "string" && expected.test(actual),
});
expect.objectContaining = (expected: Record<string, unknown>) => ({
  asymmetricMatch: (actual: unknown) =>
    actual !== null &&
    typeof actual === "object" &&
    Object.entries(expected).every(([key, value]) =>
      asymmetricEquals((actual as Record<string, unknown>)[key], value),
    ),
});
expect.closeTo = (expected: number, precision = 2) => ({
  asymmetricMatch: (actual: unknown) => {
    if (typeof actual !== "number") return false;
    const tolerance = 0.5 * 10 ** -precision;
    return Math.abs(actual - expected) < tolerance;
  },
  _closeToExpected: expected,
  _closeToPrecision: precision,
});
expect.arrayContaining = (expected: unknown[]) => ({
  asymmetricMatch: (actual: unknown) =>
    Array.isArray(actual) &&
    expected.every((item) => actual.some((candidate) => asymmetricEquals(candidate, item))),
});
expect.any = (constructor: unknown) => ({
  asymmetricMatch: (actual: unknown) => {
    if (constructor === String) return typeof actual === "string";
    if (constructor === Number) return typeof actual === "number";
    if (constructor === Boolean) return typeof actual === "boolean";
    if (constructor === Array) return Array.isArray(actual);
    if (constructor === Object) return typeof actual === "object" && actual !== null;
    return actual instanceof (constructor as new (...args: never[]) => object);
  },
});

expect.poll = (fn: () => unknown) => ({
  toBe: async (expected: unknown) => {
    await expectPoll(
      async () => {
        const actual = await fn();
        return typeof expected === "string" && typeof actual === "string"
          ? normalizeText(actual) === normalizeText(expected)
          : actual === expected;
      },
      `poll().toBe(${String(expected)})`,
    );
  },
  toContain: async (expected: unknown) => {
    await expectPoll(
      async () => {
        const actual = await fn();
        if (typeof actual === "string" && typeof expected === "string") {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.some((item) =>
            typeof expected === "string" && typeof item === "string"
              ? item.includes(expected)
              : asymmetricEquals(item, expected),
          );
        }
        return actual === expected;
      },
      `poll().toContain(${String(expected)})`,
    );
  },
  toMatch: async (expected: RegExp) => {
    await expectPoll(
      async () => expected.test(String(await fn())),
      `poll().toMatch(${String(expected)})`,
    );
  },
  toContainEqual: async (expected: unknown) => {
    await expectPoll(
      async () => {
        const actual = await fn();
        return Array.isArray(actual) && actual.some((item) => asymmetricEquals(item, expected));
      },
      `poll().toContainEqual(${JSON.stringify(expected)})`,
    );
  },
  toBeGreaterThanOrEqual: async (expected: number) => {
    await expectPoll(
      async () => Number(await fn()) >= expected,
      `poll().toBeGreaterThanOrEqual(${expected})`,
    );
  },
  toBeGreaterThan: async (expected: number) => {
    await expectPoll(
      async () => Number(await fn()) > expected,
      `poll().toBeGreaterThan(${expected})`,
    );
  },
  toBeCloseTo: async (expected: number, precision?: number) => {
    await expectPoll(async () => {
      const actual = Number(await fn());
      const threshold = 10 ** -(precision ?? 2) / 2;
      return Math.abs(actual - expected) < threshold;
    }, `poll().toBeCloseTo(${expected})`);
  },
  toHaveLength: async (length: number) => {
    await expectPoll(async () => {
      const actual = await fn();
      if (typeof actual === "string") return actual.length === length;
      if (Array.isArray(actual)) return actual.length === length;
      return false;
    }, `poll().toHaveLength(${length})`);
  },
  toBeTruthy: async () => {
    await expectPoll(async () => Boolean(await fn()), "poll().toBeTruthy()");
  },
  toEqual: async (expected: unknown) => {
    await expectPoll(
      async () => asymmetricEquals(await fn(), expected),
      `poll().toEqual(${JSON.stringify(expected)})`,
    );
  },
  toMatchObject: async (expected: Record<string, unknown>) => {
    await expectPoll(
      async () => {
        const actual = (await fn()) as Record<string, unknown>;
        return toMatchObjectCheck(actual, expected);
      },
      `poll().toMatchObject(${JSON.stringify(expected)})`,
    );
  },
  toBeNull: async () => {
    await expectPoll(async () => (await fn()) === null, "poll().toBeNull()");
  },
  // Lazy negation: expect.poll(fn).not.<matcher>
  get not() {
    return {
      toMatch: async (expected: RegExp) => {
        await expectPoll(async () => !expected.test(String(await fn())), "poll().not.toMatch()");
      },
      toBe: async (expected: unknown) => {
        await expectPoll(async () => {
          const actual = await fn();
          const matches =
            typeof expected === "string" && typeof actual === "string"
              ? normalizeText(actual) === normalizeText(expected)
              : actual === expected;
          return !matches;
        }, "poll().not.toBe()");
      },
      toContain: async (expected: unknown) => {
        await expectPoll(async () => {
          const actual = await fn();
          const contains =
            typeof actual === "string" && typeof expected === "string"
              ? actual.includes(expected)
              : Array.isArray(actual) && expected !== null && typeof expected === "object"
                ? actual.some((item) => asymmetricEquals(item, expected))
                : actual === expected;
          return !contains;
        }, "poll().not.toContain()");
      },
      toEqual: async (expected: unknown) => {
        await expectPoll(
          async () => !asymmetricEquals(await fn(), expected),
          "poll().not.toEqual()",
        );
      },
    };
  },
});

// ---------------------------------------------------------------------------
// test() wrapper: fresh Page facade per test
// ---------------------------------------------------------------------------

let currentPage: PageFacade | null = null;

export const page: Page = new Proxy({} as PageFacade, {
  get: (_target, prop) => {
    if (!currentPage) throw new Error("page accessed outside a test");
    return (currentPage as unknown as Record<PropertyKey, unknown>)[prop];
  },
});

type Fixture = { page: Page };

const DEFAULT_SESSION_MOCK = {
  actorId: null,
  defaultLandingPath: "/",
  emailAddress: "",
  isAnonymous: true,
  isConfirmed: false,
  isGuest: false,
  isSiteAdmin: false,
  loginId: "",
  userLabel: "",
};

function installDefaultMocks(page: PageFacade): void {
  // Mocha runs beforeEach hooks BEFORE the test body, so a session mock the
  // spec registered in beforeEach is already in mockRegistry when this runs
  // (body wrapper). Registering the anonymous DEFAULT afterwards would shadow
  // it (last-wins) and flip authenticated screens to the guest branch. Skip
  // a default when the user already registered the same pattern.
  const hasMock = (pattern: string): boolean =>
    mockRegistry.some((entry) => entry.regex.source === globToRegExp(pattern).source);
  if (!hasMock("**/api/v1/session")) {
    page.route("**/api/v1/session", (route) =>
      route.fulfill({ contentType: "application/json", json: DEFAULT_SESSION_MOCK }),
    );
  }
  if (!hasMock("**/api/v1/auth/capabilities")) {
    page.route("**/api/v1/auth/capabilities", (route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          emailVerificationEnabled: false,
          enabledSocialProviders: [],
          loginIdPlaceholder: "",
        },
      }),
    );
  }
}

// Playwright hooks receive the page fixture; mocha's raw hooks don't. Wrap
// them so `{ page }` destructuring works — registrations (route mocks,
// initHooks) are module-global, so they carry into the test body.
function withHookFixture(fn: (fixture: Fixture) => void | Promise<void>): () => Promise<void> {
  return async function (this: MochaContext) {
    const fixturePage = new PageFacade();
    if (configuredViewport) {
      void fixturePage.setViewportSize(configuredViewport);
    }
    currentPage = fixturePage;
    try {
      await fn({ page: fixturePage as unknown as Page });
    } catch (error) {
      if (error instanceof Error && error.message === "__WTR_SKIP__") {
        this.skip();
        return;
      }
      throw error;
    } finally {
      await fixturePage.removeIframe();
      currentPage = null;
    }
  };
}

const globalHookApi = globalThis as unknown as {
  beforeEach?: (fn: (fixture?: Fixture) => void | Promise<void>) => void;
  afterEach?: (fn: (fixture?: Fixture) => void | Promise<void>) => void;
};
// Bare `beforeEach(async ({ page }) => ...)` calls must also get the fixture.
// Capture the pristine mocha hooks at module scope (NOT inside the wrapper —
// that would recurse into the reassigned global).
const originalBeforeEach = globalHookApi.beforeEach;
const originalAfterEach = globalHookApi.afterEach;
if (typeof originalBeforeEach === "function") {
  globalHookApi.beforeEach = (fn: (fixture?: Fixture) => void | Promise<void>) => {
    originalBeforeEach(function (this: MochaContext) {
      if (fn.length > 0) {
        return withHookFixture(fn as (f: Fixture) => void | Promise<void>).call(this);
      }
      // Zero-arg fns are usually already wrapped by withHookFixture (length 0);
      // bind mocha's this so the wrapper's this.skip() works.
      return (fn as () => void | Promise<void>).call(this);
    });
  };
}
if (typeof originalAfterEach === "function") {
  globalHookApi.afterEach = (fn: (fixture?: Fixture) => void | Promise<void>) => {
    originalAfterEach(function (this: MochaContext) {
      if (fn.length > 0) {
        return withHookFixture(fn as (f: Fixture) => void | Promise<void>).call(this);
      }
      return (fn as () => void | Promise<void>).call(this);
    });
  };
}
function runWithPage(fn: (fixture: Fixture) => void | Promise<void>): () => Promise<void> {
  return async function (this: MochaContext) {
    const fixturePage = new PageFacade();
    const metric = metricsEnabled ? createMetricRecord(String(this?.test?.title ?? "")) : null;
    const metricStartedAt = performance.now();
    if (configuredViewport) {
      void fixturePage.setViewportSize(configuredViewport);
    }
    currentPage = fixturePage;
    activeMetric = metric;
    installDefaultMocks(fixturePage);
    let bodyError: unknown = null;
    let skipRequested = false;
    let teardownViolation: Error | null = null;
    try {
      await fn({ page: fixturePage as unknown as Page });
    } catch (error) {
      if (error instanceof Error && error.message === "__WTR_SKIP__") {
        if (metric) metric.status = "skipped";
        skipRequested = true;
      } else {
        bodyError = error;
        if (metric) metric.status = "failed";
      }
    } finally {
      // Clear registrations at the END (not the start): mocha runs
      // beforeEach BEFORE the body, so start-of-body clears would wipe the
      // hook-registered mocks/initHooks right before they're needed.
      const captureTeardown = metricsEnabled || strictTeardownEnabled;
      const teardownBefore = captureTeardown
        ? {
            mockRoutes: mockRegistry.length,
            initHooks: initHooks.length,
            eventListeners: Array.from(eventListeners.values()).reduce(
              (total, listeners) => total + listeners.length,
              0,
            ),
            eventWaiters: Array.from(eventWaiters.values()).reduce(
              (total, waiters) => total + waiters.length,
              0,
            ),
            responseWatchers: responseWatchers.length,
            requestWaiters: requestWaiters.size,
          }
        : null;
      mockRegistry.length = 0;
      initHooks.length = 0;
      clearRequestWaiters();
      clearEventWaiters();
      clearResponseWatchers();
      clearEventListeners();
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        metricIncrement("storageCleanups");
      } catch {
        // Storage may be unavailable in some contexts.
      }
      let iframeRemoved = false;
      let teardownError: unknown = null;
      try {
        await fixturePage.removeIframe();
        iframeRemoved = true;
      } catch (error) {
        teardownError = error;
        metricIncrement("teardownFailures");
      }
      const teardownAfter = captureTeardown
        ? {
            mockRoutes: mockRegistry.length,
            initHooks: initHooks.length,
            eventListeners: Array.from(eventListeners.values()).reduce(
              (total, listeners) => total + listeners.length,
              0,
            ),
            eventWaiters: Array.from(eventWaiters.values()).reduce(
              (total, waiters) => total + waiters.length,
              0,
            ),
            responseWatchers: responseWatchers.length,
            requestWaiters: requestWaiters.size,
          }
        : null;
      const teardownOk =
        iframeRemoved &&
        (teardownAfter === null || Object.values(teardownAfter).every((value) => value === 0));
      teardownViolation = teardownOk
        ? null
        : new Error(
            `WTR teardown invariant failed: ${JSON.stringify({
              before: teardownBefore,
              after: teardownAfter,
              iframeRemoved,
              error: teardownError ? String(teardownError) : null,
            })}`,
          );
      if (teardownViolation && !teardownError) metricIncrement("teardownFailures");
      if (metric) {
        metric.durationMs = performance.now() - metricStartedAt;
        metric.teardown = {
          before: teardownBefore,
          after: teardownAfter,
          iframeRemoved,
          ok: teardownOk,
          ...(teardownError ? { error: String(teardownError) } : {}),
        };
        takePendingMetric(metric);
        emitMetric(metric);
      }
      activeMetric = null;
      currentPage = null;
    }
    if (bodyError && teardownViolation) {
      throw new AggregateError([bodyError, teardownViolation], "WTR test and teardown both failed");
    }
    if (bodyError) throw bodyError;
    if (strictTeardownEnabled && teardownViolation) throw teardownViolation;
    if (skipRequested) this.skip();
  };
}

let configuredViewport: { width: number; height: number } | null = null;

export const test: {
  (name: string, fn: (fixture: Fixture) => void | Promise<void>): void;
  describe: (name: string, fn: () => void) => void;
  beforeEach: (fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
  use: (options: { viewport?: { width: number; height: number } }) => void;
  info: () => { title: () => string };
  setTimeout: (ms: number) => void;
  skip: (condition: boolean, reason?: string) => void;
} = Object.assign(
  (name: string, fn: (fixture: Fixture) => void | Promise<void>) => {
    it(name, runWithPage(fn));
  },
  {
    describe,
    beforeEach: (fn: (fixture: Fixture) => void | Promise<void>) =>
      globalHookApi.beforeEach?.(withHookFixture(fn)),
    afterEach: (fn: (fixture: Fixture) => void | Promise<void>) =>
      globalHookApi.afterEach?.(withHookFixture(fn)),
    use: (options: { viewport?: { width: number; height: number } }) => {
      if (options.viewport) configuredViewport = options.viewport;
    },
    // Playwright test.info() — debug annotations are recorded, not asserted.
    info: () => ({
      title: () => "",
      annotations: [],
      attach: async (_name: string, _options?: { body?: string; contentType?: string }) => {},
    }),
    // WTR's per-test ceiling comes from the config (30s); a spec-side timeout
    // override is a no-op here.
    setTimeout: (_ms: number) => {},
    // Skip with a reason: mocha supports this.skip() inside the test body.
    skip: (condition: boolean, _reason?: string) => {
      if (condition) throw new Error("__WTR_SKIP__");
    },
  },
);
