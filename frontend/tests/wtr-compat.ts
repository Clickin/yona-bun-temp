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

function globToRegExp(pattern: string): RegExp {
  // Protect glob wildcards with placeholders, escape literals, then restore.
  const protectedGlobs = pattern.replace(/\*\*/g, "\u0000").replace(/\*/g, "\u0001");
  const escaped = protectedGlobs.replace(/[.+^${}()|[\]\\]/g, "\\$&");
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
        }
        const { promise, resolve } = Promise.withResolvers<Response>();
        handler({
          fulfill: async (opts) => {
            resolve(await createFulfilledResponse(opts));
          },
        });
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

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export class Locator {
  constructor(
    private readonly page: PageFacade,
    private readonly selector: string,
    private readonly index?: number,
  ) {}

  private current(): HTMLElement | null {
    const doc = this.page.document();
    const elements = Array.from(doc.querySelectorAll(this.selector));
    const index = this.index ?? 0;
    return (elements[index] as HTMLElement) ?? null;
  }

  all(): Locator[] {
    const doc = this.page.document();
    const count = doc.querySelectorAll(this.selector).length;
    return Array.from(
      { length: count },
      (_, index) => new Locator(this.page, this.selector, index),
    );
  }

  nth(index: number): Locator {
    return new Locator(this.page, this.selector, index);
  }

  first(): Locator {
    return new Locator(this.page, this.selector, 0);
  }

  locator(childSelector: string): Locator {
    const combined = this.selector
      .split(",")
      .map((part) => `${part.trim()} ${childSelector}`)
      .join(", ");
    return new Locator(this.page, combined, this.index);
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    return this.locator(`[role="${role}"]`).filterByText(options?.name, options?.exact);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator("*").filterByText(text, options?.exact);
  }

  getByLabel(label: string): Locator {
    return this.locator(`[aria-label="${label}"], label:has-text("${label}") input`);
  }

  private filterByText(text: string | RegExp | undefined, exact?: boolean): Locator {
    if (text === undefined) return this;
    const page = this.page;
    const base = this;
    return new (class extends Locator {
      current(): HTMLElement | null {
        const doc = page.document();
        const elements = Array.from(doc.querySelectorAll(base.selector));
        const index = base.index ?? 0;
        let found: HTMLElement | null = null;
        let seen = 0;
        for (const element of elements) {
          const ownText = normalizeText((element as HTMLElement).textContent ?? "");
          const matches =
            typeof text === "string"
              ? exact
                ? ownText === text
                : ownText.includes(text)
              : text.test(ownText);
          if (matches) {
            if (seen === index) {
              found = element as HTMLElement;
              break;
            }
            seen += 1;
          }
        }
        return found;
      }
    })(page, base.selector, base.index);
  }

  async count(): Promise<number> {
    return this.page.document().querySelectorAll(this.selector).length;
  }

  async textContent(): Promise<string | null> {
    const element = this.current();
    return element?.textContent ?? null;
  }

  async inputValue(): Promise<string> {
    const element = this.current() as HTMLInputElement | null;
    return element?.value ?? "";
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
    const element = this.current();
    if (!element) throw new Error(`click: no element for ${this.selector}`);
    this.page.dispatch(element, "pointerdown", options?.position);
    this.page.dispatch(element, "pointerup", options?.position);
    this.page.dispatch(element, "click", options?.position);
    await sleep(30);
  }

  async fill(text: string): Promise<void> {
    const element = this.current() as HTMLInputElement | HTMLTextAreaElement | null;
    if (!element) throw new Error(`fill: no element for ${this.selector}`);
    element.focus();
    element.value = text;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(30);
  }

  async press(key: string): Promise<void> {
    const element = this.current();
    if (!element) throw new Error(`press: no element for ${this.selector}`);
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
    const element = this.current() as HTMLInputElement | null;
    if (!element) throw new Error(`check: no element for ${this.selector}`);
    if (!element.checked) {
      element.click();
    }
    await sleep(30);
  }

  async uncheck(): Promise<void> {
    const element = this.current() as HTMLInputElement | null;
    if (!element) throw new Error(`uncheck: no element for ${this.selector}`);
    if (element.checked) {
      element.click();
    }
    await sleep(30);
  }

  async selectOption(value: string): Promise<void> {
    const element = this.current() as HTMLSelectElement | null;
    if (!element) throw new Error(`selectOption: no element for ${this.selector}`);
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(30);
  }

  async hover(options?: { position?: { x: number; y: number }; force?: boolean }): Promise<void> {
    const element = this.current();
    if (!element) throw new Error(`hover: no element for ${this.selector}`);
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

  async dispatchEvent(type: string, init?: Record<string, unknown>): Promise<void> {
    const element = this.current();
    if (!element) throw new Error(`dispatchEvent: no element for ${this.selector}`);
    element.dispatchEvent(new Event(type, { bubbles: true, ...init }));
    await sleep(10);
  }

  async evaluate<T>(fn: (element: Element) => T): Promise<T> {
    const element = this.current();
    if (!element) return undefined as T;
    return fn(element);
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

  readonly mouse = {
    click: async (x: number, y: number) => {
      const element = document.elementFromPoint(x, y);
      if (element) {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
      }
      await sleep(20);
    },
    move: async (x: number, y: number) => {
      const element = document.elementFromPoint(x, y);
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

  async reload(): Promise<void> {
    const src = this.iframe?.src;
    if (!src) return;
    installFetchMock(this.iframe as HTMLIFrameElement, window.fetch);
    this.iframe!.src = src;
    await sleep(300);
  }

  locator(selector: string): Locator {
    return new Locator(this, selector);
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
  return typeof expected === "string" ? actual === expected : expected.test(actual);
}

function matchContainText(actual: string, expected: string | RegExp): boolean {
  return typeof expected === "string" ? actual.includes(expected) : expected.test(actual);
}

function matchClass(actualClass: string, expected: string | RegExp): boolean {
  if (typeof expected === "string") {
    return expected.split(/\s+/).every((token) => actualClass.split(/\s+/).includes(token));
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
        const passes =
          typeof expected === "number" || typeof actual === "number"
            ? actual === expected
            : JSON.stringify(actual) === JSON.stringify(expected);
        let detail = "";
        if (!passes && typeof expected === "string" && typeof actual === "string") {
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
          const passes =
            typeof expected === "number" || typeof actual === "number"
              ? actual === expected
              : JSON.stringify(actual) === JSON.stringify(expected);
          return negate ? !passes : passes;
        },
        `toEqual(${String(expected)})`,
        options?.timeout,
      );
    },
    toMatchObject: (expected: Record<string, unknown>, options?: { timeout?: number }) => {
      if (stringTarget === null) return;
      const actual = stringTarget() as Record<string, unknown>;
      const matches = Object.entries(expected).every(
        ([key, value]) =>
          JSON.stringify((actual as Record<string, unknown>)[key]) === JSON.stringify(value),
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
        `toHaveText(${String(expected)}) — actual: ${await textOf()}`,
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
        `toContainText(${String(expected)}) — actual: ${await textOf()}`,
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
            expected === undefined
              ? actual !== null
              : typeof expected === "string"
                ? actual === expected
                : expected.test(actual ?? "");
          return negate ? !matches : matches;
        },
        `toHaveAttribute(${name}) — actual: ${await actualValue()}`,
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

export function expect(target: ExpectTarget): ExpectResult {
  return buildExpect(target, false);
}

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
  toBeTruthy: async () => {
    await expectPoll(async () => Boolean(await fn()), "poll().toBeTruthy()");
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
    currentPage = fixturePage;
    mockRegistry.length = 0;
    installDefaultMocks(fixturePage);
    try {
      await fn({ page: fixturePage as unknown as Page });
    } finally {
      fixturePage.iframe?.remove();
      currentPage = null;
    }
  };
}

export const test: {
  (name: string, fn: (fixture: Fixture) => void | Promise<void>): void;
  describe: (name: string, fn: () => void) => void;
  beforeEach: (fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
} = Object.assign(
  (name: string, fn: (fixture: Fixture) => void | Promise<void>) => {
    it(name, runWithPage(fn));
  },
  {
    describe,
    beforeEach,
    afterEach,
  },
);
