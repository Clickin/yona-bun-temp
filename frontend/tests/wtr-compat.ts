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

export type Page = any;

// The specs read process.env.YONA_DEV_BASE_PATH at module top level; the
// browser has no process — provide the same value the app is built with.
(globalThis as { process?: unknown }).process = {
  env: { YONA_DEV_BASE_PATH: "/yona" },
};

// Minimal Buffer polyfill: specs call Buffer.from(...) for upload fixtures.
class WtrBuffer {
  static from(input: string | Uint8Array | ArrayLike<number>): Uint8Array {
    if (typeof input === "string") return new TextEncoder().encode(input);
    return new Uint8Array(input as ArrayLike<number>);
  }
}
(globalThis as { Buffer?: unknown }).Buffer = WtrBuffer;

// Async file reader (fetch over the same-origin fixture middleware).
export async function readFile(source: URL | string): Promise<string> {
  const href = typeof source === "string" ? new URL(source, import.meta.url).href : source.href;
  const response = await fetch(href);
  if (!response.ok) throw new Error(`wtr readFile: ${response.status} for ${href}`);
  return response.text();
}

// Cross-realm event bus: the injected iframe script emits dialog/request/console
// events through parent.__wtrEmit; watchers live here.
type WtrEventName = "dialog" | "request" | "console";
const eventListeners = new Map<WtrEventName, Array<(payload: unknown) => void>>();
const eventWaiters = new Map<WtrEventName, Array<(payload: unknown) => void>>();

function emitWtrEvent(name: WtrEventName, payload: unknown): void {
  for (const listener of eventListeners.get(name) ?? []) listener(payload);
  const waiters = eventWaiters.get(name) ?? [];
  eventWaiters.delete(name);
  for (const resolve of waiters) resolve(payload);
}

function waitForWtrEvent(name: WtrEventName): Promise<unknown> {
  const { promise, resolve } = Promise.withResolvers<unknown>();
  const waiters = eventWaiters.get(name) ?? [];
  waiters.push(resolve);
  eventWaiters.set(name, waiters);
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
};
type ResponseWatcher = (facade: ResponseFacade) => boolean;
const responseWatchers: Array<{ predicate: ResponseWatcher; resolve: (facade: unknown) => void }> =
  [];

function checkResponseWatchers(facade: ResponseFacade): void {
  for (let index = responseWatchers.length - 1; index >= 0; index -= 1) {
    const watcher = responseWatchers[index];
    if (watcher.predicate(facade)) {
      responseWatchers.splice(index, 1);
      watcher.resolve(facade);
    }
  }
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

export function readFileSync(source: URL | string): string {
  const href = typeof source === "string" ? new URL(source, import.meta.url).href : source.href;
  const cached = fileCache.get(href);
  if (cached !== undefined) return cached;
  const request = new XMLHttpRequest();
  request.open("GET", href, false);
  request.send();
  if (request.status >= 400) {
    throw new Error(`wtr readFileSync: ${request.status} for ${href}`);
  }
  const text = request.responseText;
  fileCache.set(href, text);
  return text;
}

// ---------------------------------------------------------------------------
// Glob -> regex (Playwright "**/api/v1/*" patterns)
// ---------------------------------------------------------------------------

// Playwright's `:has-text("X")` pseudo has no CSS counterpart. Translate
// `A:has-text("X") B` to `A B` + a filter on the ancestor's text, per comma part.
function translateHasText(
  selector: string,
): { parts: Array<{ base: string; filter: (element: Element) => boolean }> } | null {
  if (!selector.includes(":has-text(")) return null;
  const parts = selector.split(",").map((part) => {
    const match = /^([^:]*):has-text\("([^"]*)"\)(.*)$/.exec(part.trim());
    if (!match) return { base: part.trim(), filter: null };
    const [, before, text, after] = match;
    const base = `${before}${after}`.trim();
    const filter = (element: Element) => {
      const target = after ? element.closest(before) : element;
      return (target?.textContent ?? "").includes(text);
    };
    return { base, filter };
  });
  return { parts: parts.map((part) => ({ base: part.base, filter: part.filter })) };
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

type MockHandler = (route: { fulfill: (opts: Record<string, unknown>) => Promise<void> }) => void;
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
  return new Response(payload, { status, headers: headerMap });
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
        const top = typeof window !== "undefined" ? window : null;
        if (top) {
          const counter = ((top as unknown as Record<string, number>).__wtrMockHits ?? 0) + 1;
          (top as unknown as Record<string, number>).__wtrMockHits = counter;
          (top as unknown as Record<string, unknown>).__wtrMockLast = regex.source;
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
        });
        const { promise, resolve } = Promise.withResolvers<Response>();
        try {
          const handlerResult = handler({
            request: () => requestFacade,
            fulfill: async (opts) => {
              const response = await createFulfilledResponse(opts);
              checkResponseWatchers({
                url: () => requestFacade.url(),
                request: () => ({
                  method: () => requestFacade.method(),
                  url: () => requestFacade.url(),
                  headers: () => requestFacade.headers(),
                }),
              });
              resolve(response);
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
    }
    return realFetch.call(iframe.contentWindow as Window, input as RequestInfo, init);
  };
}

// ---------------------------------------------------------------------------
// Locator
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 40;
let lastMouseX = 0;
let lastMouseY = 0;

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
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
    if (this.scopedChild !== undefined) {
      const elements: Element[] = [];
      for (const base of doc.querySelectorAll(this.selector)) {
        elements.push(...Array.from(base.querySelectorAll(this.scopedChild)));
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
    let element = this.current();
    while (!element && Date.now() < deadline) {
      await sleep(50);
      element = this.current();
    }
    if (!element) throw new Error(`${this.selector}: element not found`);
    return element;
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

  locator(childSelector: string): Locator {
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
      return new Locator(this.page, this.selector, this.index, childSelector.trim());
    }
    if (this.hasCustomResolver) {
      const page = this.page;
      const base = this;
      const child = childSelector;
      return new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          return base
            .resolveElements()
            .flatMap((element) => Array.from(element.querySelectorAll(child)));
        }
      })(page, base.selector, undefined);
    }
    if (this.index !== undefined) {
      // nth(i).locator(child): scope children within the indexed parent.
      const page = this.page;
      const base = this;
      const child = childSelector;
      return new (class extends Locator {
        hasCustomResolver = true;
        resolveElements(): Element[] {
          const parent = base.resolveElements()[base.index ?? 0];
          if (!parent) return [];
          return Array.from(parent.querySelectorAll(child));
        }
      })(page, base.selector, undefined);
    }
    const combined = this.selector
      .split(",")
      .map((part) => `${part.trim()} ${childSelector}`)
      .join(", ");
    return new Locator(this.page, combined, this.index);
  }

  async evaluateAll<T>(fn: (elements: Element[]) => T): Promise<T> {
    return fn(this.resolveElements());
  }

  async boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const element = this.current();
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    return this.locator(`[role="${role}"]`).filterByText(options?.name, options?.exact);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator("*").filterByText(text, options?.exact);
  }

  getByTestId(testId: string): Locator {
    return this.locator(`[data-testid="${testId}"]`);
  }

  // Artifact-only: screenshots are not part of assertion outcomes.
  async screenshot(_options?: Record<string, unknown>): Promise<void> {}

  getByLabel(label: string): Locator {
    return this.locator(`[aria-label="${label}"], label:has-text("${label}") input`);
  }

  private filterByText(text: string | RegExp | undefined, exact?: boolean): Locator {
    if (text === undefined) return this;
    return this.filterWithPredicate((element) => {
      const ownText = normalizeText(element.textContent ?? "");
      return typeof text === "string"
        ? exact
          ? ownText === text
          : ownText.includes(text)
        : text.test(ownText);
    });
  }

  filter(options: { hasText?: string | RegExp; has?: Locator }): Locator {
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
        const doc = page.document();
        return Array.from(doc.querySelectorAll(base.selector)).filter((element) =>
          predicate(element),
        );
      }
    })(page, base.selector, base.index);
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
    return this.resolveElements().length;
  }

  async textContent(): Promise<string | null> {
    const element = this.current();
    return element?.textContent ?? null;
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
    const element = this.current();
    if (!element) return false;
    const style = this.page.window().getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  }

  async isChecked(): Promise<boolean> {
    const element = this.current() as HTMLInputElement | null;
    return element?.checked ?? false;
  }

  async click(options?: { force?: boolean; position?: { x: number; y: number } }): Promise<void> {
    const element = await this.waitForElement();
    for (const type of ["pointerdown", "mousedown"]) {
      this.page.dispatch(element, type, options?.position);
    }
    await sleep(10);
    this.page.dispatch(element, "pointerup", options?.position);
    this.page.dispatch(element, "click", options?.position);
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
    const keyMap: Record<string, string> = {
      Enter: "Enter",
      Escape: "Escape",
      Tab: "Tab",
      " ": " ",
      Backspace: "Backspace",
    };
    const keyValue = keyMap[key] ?? key;
    element.dispatchEvent(new KeyboardEvent("keydown", { key: keyValue, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { key: keyValue, bubbles: true }));
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
    this.page.dispatch(element, "mouseover", options?.position);
    this.page.dispatch(element, "mouseenter", options?.position);
    this.page.dispatch(element, "mousemove", options?.position);
    await sleep(30);
  }

  async focus(): Promise<void> {
    const element = this.current();
    element?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    element?.focus();
    await sleep(10);
  }

  async blur(): Promise<void> {
    const element = this.current();
    element?.blur();
    element?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await sleep(10);
  }

  async pressSequentially(text: string): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement | HTMLTextAreaElement;
    element.focus();
    setNativeInputValue(element, text);
    await sleep(30);
  }

  async dispatchEvent(type: string, init?: Record<string, unknown>): Promise<void> {
    const element = await this.waitForElement();
    element.dispatchEvent(new Event(type, { bubbles: true, ...init }));
    await sleep(10);
  }

  async evaluate<T>(fn: (element: Element) => T): Promise<T> {
    // Custom resolvers (filter/.. /nth-scoped chains) can't be rebuilt inside
    // the iframe from the selector alone — resolve top-realm and run there.
    if (this.hasCustomResolver) {
      const element = this.current();
      if (!element) return undefined as T;
      return fn(element);
    }
    // Plain selectors: run inside the iframe realm so `element instanceof
    // Element` resolves against the app's own globals.
    const target = this.page.window();
    const selector = JSON.stringify(this.selector);
    const index = this.index ?? 0;
    // eslint-disable-next-line no-eval
    return target.eval(
      `(function () { const elements = document.querySelectorAll(${selector}); const el = elements[${index}]; if (!el) return undefined; return (${fn.toString()})(el); })()`,
    ) as T;
  }
}

// ---------------------------------------------------------------------------
// Page facade
// ---------------------------------------------------------------------------

class PageFacade {
  private iframe: HTMLIFrameElement | null = null;
  private requestedViewport: { width: number; height: number } | null = null;
  readonly keyboard = {
    press: async (key: string) => {
      const doc = this.document();
      const target = (doc.activeElement as HTMLElement) ?? doc.body;
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
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

  readonly mouse = {
    click: async (x: number, y: number) => {
      const element = this.document().elementFromPoint(x, y);
      if (element) {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
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
          for (const type of ["mouseout", "mouseleave"]) {
            this.lastHovered.dispatchEvent(
              new MouseEvent(type, {
                bubbles: true,
                clientX: x,
                clientY: y,
                relatedTarget: element,
              }),
            );
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
      await sleep(20);
    },
  };

  document(): Document {
    if (!this.iframe?.contentDocument) throw new Error("page: no active iframe (call goto first)");
    return this.iframe.contentDocument;
  }

  window(): Window {
    if (!this.iframe?.contentWindow) throw new Error("page: no active iframe (call goto first)");
    return this.iframe.contentWindow;
  }

  async goto(url: string, options?: { waitUntil?: string }): Promise<void> {
    if (!this.iframe) {
      this.iframe = document.createElement("iframe");
      this.iframe.id = "wtr-app-frame";
      this.iframe.style.width = `${this.requestedViewport?.width ?? 1280}px`;
      this.iframe.style.height = `${this.requestedViewport?.height ?? 720}px`;
      this.iframe.style.border = "0";
      this.iframe.style.position = "fixed";
      this.iframe.style.left = "0";
      this.iframe.style.top = "0";
      document.body.appendChild(this.iframe);
    }
    const absolute = url.startsWith("http") ? url : new URL(url, location.origin).href;
    installFetchMock(this.iframe, window.fetch);
    this.iframe.src = absolute;
    const { promise, resolve } = Promise.withResolvers<void>();
    const onLoad = () => {
      this.iframe?.removeEventListener("load", onLoad);
      resolve();
    };
    this.iframe.addEventListener("load", onLoad);
    await promise;
    // Let the SPA boot past its first fetch round-trips before assertions poll.
    await sleep(250);
  }

  async goBack(): Promise<void> {
    const current = this.iframe?.contentWindow;
    if (current) {
      current.history.back();
      await sleep(300);
    }
  }

  async reload(): Promise<void> {
    const src = this.iframe?.src;
    if (!src) return;
    installFetchMock(this.iframe as HTMLIFrameElement, window.fetch);
    this.iframe!.src = src;
    await sleep(300);
  }

  locator(selector: string, options?: { hasText?: string | RegExp }): Locator {
    const locator = new Locator(this, selector);
    if (options?.hasText === undefined) return locator;
    return locator.filterByText(options.hasText);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.locator(selector).fill(value);
  }

  async click(selector: string, options?: { force?: boolean }): Promise<void> {
    await this.locator(selector).click(options);
  }

  async check(selector: string): Promise<void> {
    await this.locator(selector).check();
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    return new Locator(this, `[role="${role}"]`).filterByText(options?.name, options?.exact);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return new Locator(this, "body *").filterByText(text, options?.exact);
  }

  getByLabel(label: string): Locator {
    return this.locator(`[aria-label="${label}"]`);
  }

  url(): string {
    return this.iframe?.contentWindow?.location.href ?? "";
  }

  async addInitScript(fn: (arg: never) => void, arg?: unknown): Promise<void> {
    initHooks.push({
      source: fn.toString(),
      argJson: arg === undefined ? "" : JSON.stringify(arg),
    });
  }

  async waitForResponse(predicate: ResponseWatcher): Promise<ResponseFacade> {
    const { promise, resolve } = Promise.withResolvers<ResponseFacade>();
    responseWatchers.push({ predicate, resolve: resolve as (facade: unknown) => void });
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
  ): Promise<{ url: () => string; method: () => string; headers: () => Record<string, string> }> {
    const { promise, resolve } = Promise.withResolvers<{
      url: () => string;
      method: () => string;
      headers: () => Record<string, string>;
    }>();
    const matcher =
      typeof predicate === "string"
        ? (request: { url: string | (() => string) }) =>
            globToRegExp(predicate).test(constOf(request.url)())
        : predicate;
    const constOf = (value: unknown): (() => string) =>
      typeof value === "function" ? (value as () => string) : () => String(value);
    const check = (payload: unknown) => {
      const request = payload as {
        url: string | (() => string);
        method?: string | (() => string);
        resourceType?: string | (() => string);
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
        eventListeners.set(
          "request",
          (eventListeners.get("request") ?? []).filter((entry) => entry !== check),
        );
        resolve({
          url: urlValue,
          method: request.method === undefined ? () => "GET" : constOf(request.method),
          headers: () => ({}),
        });
      }
    };
    eventListeners.set("request", [...(eventListeners.get("request") ?? []), check]);
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

  async waitForURL(url: string | RegExp): Promise<void> {
    await expectPoll(
      async () => {
        const actual = this.url();
        return typeof url === "string" ? actual.includes(url) : url.test(actual);
      },
      `waitForURL(${String(url)})`,
    );
  }

  async unroute(pattern: string): Promise<void> {
    const regex = globToRegExp(pattern);
    for (let index = mockRegistry.length - 1; index >= 0; index -= 1) {
      if (mockRegistry[index].regex.source === regex.source) {
        mockRegistry.splice(index, 1);
      }
    }
  }

  on(name: WtrEventName, listener: (payload: unknown) => void): void {
    const listeners = eventListeners.get(name) ?? [];
    listeners.push(listener);
    eventListeners.set(name, listeners);
  }

  once(name: WtrEventName, listener: (payload: unknown) => void): void {
    const wrapped = (payload: unknown) => {
      listener(payload);
      const listeners = eventListeners.get(name) ?? [];
      eventListeners.set(
        name,
        listeners.filter((entry) => entry !== wrapped),
      );
    };
    this.on(name, wrapped);
  }

  waitForEvent(name: WtrEventName): Promise<unknown> {
    return waitForWtrEvent(name);
  }

  title(): string {
    return this.document().title;
  }

  async setViewportSize(size: { width: number; height: number }): Promise<void> {
    this.requestedViewport = size;
    if (this.iframe) {
      this.iframe.style.width = `${size.width}px`;
      this.iframe.style.height = `${size.height}px`;
    }
  }

  async evaluate<T>(fn: (arg: never) => T, arg?: unknown): Promise<T> {
    const target = this.window();
    const fnSource = fn.toString();
    const serializedArg = arg === undefined ? "" : JSON.stringify(arg);
    // eslint-disable-next-line no-eval
    return target.eval(`(${fnSource})(${serializedArg})`) as T;
  }

  async route(pattern: string, handler: MockHandler): Promise<void> {
    mockRegistry.push({ regex: globToRegExp(pattern), handler });
  }

  async unrouteAll(): Promise<void> {
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
    element.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }),
    );
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
  toHaveValue(value: string, options?: { timeout?: number }): Promise<void>;
  toHaveURL(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toContain(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toMatch(expected: RegExp, options?: { timeout?: number }): Promise<void>;
  toBe(expected: unknown, options?: { timeout?: number }): Promise<void>;
  toHaveTitle(expected: string | RegExp, options?: { timeout?: number }): Promise<void>;
  toHaveJSProperty(name: string, expected: unknown, options?: { timeout?: number }): Promise<void>;
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
    while (Date.now() < deadline) {
      last = await condition();
      if (last) return;
      await sleep(POLL_INTERVAL_MS);
    }
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
      await expectPoll(
        async () => {
          const actual = await actualValue();
          const matches = typeof value === "string" ? actual === value : value.test(actual);
          return negate ? !matches : matches;
        },
        `toHaveCSS(${name}) — actual: ${await actualValue()}`,
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
        const actual = String(stringTarget());
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
    toBe: (expected, options) => {
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
        `toBe(${String(expected)})`,
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
      const matches = Object.entries(expected).every(([key, value]) =>
        asymmetricEquals((actual as Record<string, unknown>)[key], value),
      );
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
            const elements = target.all();
            const texts = [];
            for (const element of elements) {
              texts.push(normalizeText((await element.textContent()) ?? ""));
            }
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
          const actual = await actualClass();
          const matches = expectedList.every((entry) => matchClass(actual, entry));
          return negate ? !matches : matches;
        },
        `toHaveClass(${String(expected)}) — actual: ${await actualClass()}`,
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
                    : String(actual) === String(expected);
          return negate ? !matches : matches;
        },
        `toHaveAttribute(${name}) — actual: ${await actualValue()}`,
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
      await expectPoll(
        async () => {
          const matches = (await actualCount()) === count;
          return negate ? !matches : matches;
        },
        `toHaveCount(${count}) — actual: ${await actualCount()}`,
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
        return element ? (element as unknown as Record<string, unknown>)[name] : undefined;
      };
      await expectPoll(
        async () => {
          const matches = (await actualValue()) === expected;
          return negate ? !matches : matches;
        },
        `toHaveJSProperty(${name}) — actual: ${String(await actualValue())}`,
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
    toHaveValue: async (value, options) => {
      const actualValue = async () => (target instanceof Locator ? target.inputValue() : "");
      await expectPoll(
        async () => {
          const matches = (await actualValue()) === value;
          return negate ? !matches : matches;
        },
        `toHaveValue(${value}) — actual: ${await actualValue()}`,
        options?.timeout,
      );
    },
    toHaveURL: async (expected: string | RegExp, options?: { timeout?: number }) => {
      const actual = () =>
        target instanceof Locator ? "" : (target as unknown as PageFacade).url();
      const matchesUrl = (url: string) =>
        typeof expected === "string"
          ? url === expected || url.endsWith(expected) || url.includes(expected)
          : expected.test(url);
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
  return JSON.stringify(actual) === JSON.stringify(expected);
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
        return typeof actual === "string" && typeof expected === "string"
          ? actual.includes(expected)
          : actual === expected;
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
      async () => JSON.stringify(await fn()) === JSON.stringify(expected),
      `poll().toEqual(${JSON.stringify(expected)})`,
    );
  },
  toBeNull: async () => {
    await expectPoll(async () => (await fn()) === null, "poll().toBeNull()");
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
  page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: DEFAULT_SESSION_MOCK }),
  );
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

function runWithPage(fn: (fixture: Fixture) => void | Promise<void>): () => Promise<void> {
  return async () => {
    const fixturePage = new PageFacade();
    if (configuredViewport) {
      void fixturePage.setViewportSize(configuredViewport);
    }
    currentPage = fixturePage;
    mockRegistry.length = 0;
    initHooks.length = 0;
    eventListeners.clear();
    eventWaiters.clear();
    responseWatchers.length = 0;
    // Same-origin iframe shares the WTR page's storage; isolate per test.
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Storage may be unavailable in some contexts.
    }
    installDefaultMocks(fixturePage);
    try {
      await fn({ page: fixturePage as unknown as Page });
    } finally {
      fixturePage.iframe?.remove();
      currentPage = null;
    }
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
} = Object.assign(
  (name: string, fn: (fixture: Fixture) => void | Promise<void>) => {
    it(name, runWithPage(fn));
  },
  {
    describe,
    beforeEach,
    afterEach,
    use: (options: { viewport?: { width: number; height: number } }) => {
      if (options.viewport) configuredViewport = options.viewport;
    },
    // Playwright test.info() — debug annotations are recorded, not asserted.
    info: () => ({
      title: () => "",
      annotations: [],
      attach: async (_name: string, _options?: { body?: string; contentType?: string }) => {},
    }),
  },
);
