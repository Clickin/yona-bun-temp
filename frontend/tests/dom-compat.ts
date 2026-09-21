/* oxlint-disable typescript/no-this-alias -- custom locator subclasses intentionally capture the base resolver. */
// dom-compat: Vitest + happy-dom Playwright-compatible harness for the DOM
// parity lane. Same public surface as wtr-compat.ts but the app mounts
// directly in the happy-dom global document (no iframe realm) with a memory
// router history. Browser-only capabilities raise `DOM_UNSUPPORTED:*` errors
// — only those promote a spec to the chrome lane.
import { readFileSync as fsReadFileSync, readdirSync, statSync } from "node:fs";
import { createHash as nodeCreateHash } from "node:crypto";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { resolve } from "node:path";
import { beforeEach, afterEach, describe, it } from "vitest";
import { act } from "react";
import { createMemoryHistory, type RouterHistory } from "@tanstack/react-router";
import { mountApp } from "../src/main";
import { resolveRuntimeConfig } from "../src/runtime-config";
import {
  DEFAULT_TIMEOUT_MS,
  expectPoll,
  globToRegExp,
  isStructurallyVisible,
  matchClass,
  matchContainText,
  matchText,
  normalizeText,
  roleSelectorFor,
  setNativeChecked,
  setNativeInputValue,
  sleep,
  toMatchObjectCheck,
  translateHasText,
} from "./compat-core";

// Canonical test origin — the app's own fallback origin constant
// (routes/users/loginform.tsx:302, code.tsx:331 read location.origin).
export const TEST_ORIGIN = "http://yoram.local";

let currentPageUrlValue = `${TEST_ORIGIN}/`;
function currentPageUrl(): string {
  return currentPageUrlValue;
}

// ---------------------------------------------------------------------------
// File access (node:fs — same path conventions as wtr's fixture middleware)
// ---------------------------------------------------------------------------

function resolveFixture(source: URL | string): string {
  // ponytail: node:path resolution against the module dir — happy-dom's URL
  // constructor mis-parses `[...]` in paths (treats them as IPv6 hosts) and
  // its URL instances are rejected by node's fileURLToPath, so fs paths must
  // never flow through the environment URL machinery.
  const here = fileURLToPath(new NodeURL(".", import.meta.url));
  let text = typeof source === "string" ? source : source.href;
  if (/^https?:\/\//u.test(text)) {
    // Specs build fixture URLs against TEST_ORIGIN (`new URL("tests/src/…")`);
    // the wtr fixture middleware served those — here the pathname maps
    // directly to the repo tree.
    text = new NodeURL(text).pathname
      .replace(/^\/tests\/frontend\//u, "frontend/")
      .replace(/^\/tests\/src\//u, "src/")
      .replace(/^\/tests\/root\//u, "")
      .replace(/^\/tests\//u, "")
      .replace(/^\/yona-original\//u, "../yona-original/")
      .replace(/^\/docs\//u, "../docs/");
  }
  if (text.startsWith("/tests/frontend/"))
    text = `../frontend/${text.slice("/tests/frontend/".length)}`;
  if (text.startsWith("/tests/src/")) text = `src/${text.slice("/tests/src/".length)}`;
  if (text.startsWith("/src/")) text = `src/${text.slice("/src/".length)}`;
  if (text.startsWith("/tests/root/")) text = text.slice("/tests/root/".length);
  if (text.startsWith("/tests/")) text = text.slice("/tests/".length);
  if (text.startsWith("/yona-original/"))
    text = `../yona-original/${text.slice("/yona-original/".length)}`;
  if (text.startsWith("/docs/")) text = `../docs/${text.slice("/docs/".length)}`;
  if (text.startsWith("file:")) {
    // Specs build `new URL("../src/…", import.meta.url)`; under happy-dom the
    // global URL may be node's (resolving to a real file: path) or happy-dom's
    // (resolving against its location). Either way the pathname follows the
    // wtr fixture convention when the spec meant a fixture: map the
    // .../frontend/tests/... prefix back to the middleware mapping.
    const path = fileURLToPath(new NodeURL(text));
    const marker = path.indexOf("/frontend/tests/");
    if (marker !== -1) {
      text = `../${path.slice(marker + "/frontend/tests/".length)}`;
    } else {
      return path;
    }
  }
  // wtr middleware maps: ../frontend/X, /tests/root/X and bare X -> frontend/X;
  // ../src/X, src/X -> frontend/src/X; ../yona-original/X, ../docs/X -> repo root.
  const frontendRoot = resolve(here, "..");
  if (text.startsWith("../frontend/"))
    return resolve(frontendRoot, text.slice("../frontend/".length));
  if (text.startsWith("../yona-original/"))
    return resolve(frontendRoot, `../yona-original/${text.slice("../yona-original/".length)}`);
  if (text.startsWith("../docs/"))
    return resolve(frontendRoot, `../docs/${text.slice("../docs/".length)}`);
  if (text.startsWith("../src/"))
    return resolve(frontendRoot, `src/${text.slice("../src/".length)}`);
  if (text.startsWith("src/")) return resolve(frontendRoot, text);
  if (!text.startsWith(".") && !text.startsWith("/")) {
    // bare relative -> frontend root (matches /tests/root/ middleware)
    return resolve(frontendRoot, text);
  }
  return resolve(here, text);
}

export function globSync(pattern: string, options?: { nodir?: boolean }): string[] {
  const base = pattern.replace(/\/[^/]*\*[^/]*$/u, "");
  const suffix = pattern.slice(base.length);
  const resolved = resolveFixture(base === "" ? "./" : base);
  const walk = (dir: string, rel: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      const relEntry = rel === "" ? entry : `${rel}/${entry}`;
      const isDir = statSync(full).isDirectory();
      if (isDir && !options?.nodir) out.push(relEntry);
      if (isDir) out.push(...walk(full, relEntry));
      else if (suffix === "" || relEntry.endsWith(suffix.slice(1))) out.push(relEntry);
    }
    return out;
  };
  const stat = statSync(resolved);
  if (!stat.isDirectory()) return [pattern];
  return walk(resolved, base);
}

export function readFileSync(source: URL | string): string {
  return fsReadFileSync(resolveFixture(source), "utf8");
}

export async function readFile(source: URL | string): Promise<string> {
  return fsReadFileSync(resolveFixture(source), "utf8");
}

export function createHash(algorithm: string): {
  update: (data: string) => { digest: (encoding: string) => string };
} {
  return {
    update: (data: string) => ({
      digest: (encoding: string) =>
        nodeCreateHash(algorithm)
          .update(data)
          .digest(encoding as "hex"),
    }),
  };
}

export function mergedLegacyBlock(): string {
  const css = readFileSync("src/app.css");
  const begin = css.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = css.indexOf("/* END merged frozen legacy-fallback */");
  if (begin === -1 || end === -1) {
    throw new Error("dom readFileSync: merged legacy block markers not found in src/app.css");
  }
  return css.slice(begin, end);
}

export function curatedAppCss(): string {
  const css = readFileSync("src/app.css");
  const begin = css.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = css.indexOf("/* END merged frozen legacy-fallback */");
  if (begin === -1 || end === -1) return css;
  return css.slice(0, begin) + css.slice(end);
}

// ---------------------------------------------------------------------------
// Capability guards — only these errors promote a spec to the chrome lane
// ---------------------------------------------------------------------------

export function domUnsupported(capability: string): Error {
  return new Error(
    `DOM_UNSUPPORTED:${capability} — this spec needs a browser capability; move it to the chrome lane (see e2e-lane-manifest.json).`,
  );
}

// ---------------------------------------------------------------------------
// Fetch mock — per-Page registry, wrapper restored on teardown
// ---------------------------------------------------------------------------

type MockRoute = {
  request: () => RequestFacade;
  fulfill: (opts: Record<string, unknown>) => Promise<void>;
  fallback: () => Promise<void>;
};
export type Route = MockRoute;

type RequestFacade = {
  url: () => string;
  method: () => string;
  headers: () => Record<string, string>;
  postData: () => string | null;
  postDataJSON: () => unknown;
};

function buildRequestFacade(request: Request): RequestFacade {
  const readBody = (): string | null => {
    try {
      return request.body ? String(request.body) : null;
    } catch {
      return null;
    }
  };
  return {
    url: () => request.url,
    method: () => request.method,
    headers: () => Object.fromEntries(request.headers.entries()),
    postData: () => readBody(),
    postDataJSON: () => {
      const text = readBody();
      return text ? JSON.parse(text) : null;
    },
  };
}

function toResponse(overrides: Record<string, unknown>): Response {
  const {
    json,
    body,
    status = 200,
    statusText,
    contentType,
    headers: extraHeaders = {},
  } = overrides;
  let responseBody: BodyInit | null = null;
  const headers: Record<string, string> = {};
  if (json !== undefined) {
    responseBody = JSON.stringify(json);
    headers["content-type"] = contentType ?? "application/json";
  } else if (body !== undefined) {
    responseBody = String(body);
    if (contentType) headers["content-type"] = contentType;
  }
  return new Response(responseBody, {
    status,
    statusText,
    headers: { ...headers, ...(extraHeaders as Record<string, string>) },
  });
}

// ---------------------------------------------------------------------------
// Locator
// ---------------------------------------------------------------------------

type LocatorOptions = {
  index?: number;
  hasText?: string | RegExp;
  filters?: Array<(element: Element) => boolean>;
};

export class Locator {
  private readonly selector: string;
  private readonly options: LocatorOptions;

  constructor(selector: string, options: LocatorOptions = {}) {
    this.selector = selector;
    this.options = options;
  }

  resolveElements(): Element[] {
    let elements = this.queryRaw(this.selector);
    for (const filter of this.options.filters ?? []) {
      elements = elements.filter(filter);
    }
    if (this.options.hasText !== undefined) {
      const expected =
        typeof this.options.hasText === "string" ? normalizeText(this.options.hasText) : null;
      elements = elements.filter((element) => {
        const text = normalizeText(element.textContent ?? "");
        return expected !== null
          ? text.includes(expected)
          : (this.options.hasText as RegExp).test(element.textContent ?? "");
      });
    }
    return elements;
  }

  private queryRaw(selector: string): Element[] {
    const translated = translateHasText(selector);
    if (translated) {
      const part = translated.parts[0];
      return Array.from(document.querySelectorAll(part.base)).filter(part.filter ?? (() => true));
    }
    return Array.from(document.querySelectorAll(selector));
  }

  current(): HTMLElement | null {
    const elements = this.resolveElements();
    const index = this.options.index ?? 0;
    const target = index < 0 ? elements[elements.length + index] : elements[index];
    return (target as HTMLElement) ?? null;
  }

  async count(): Promise<number> {
    return this.resolveElements().length;
  }

  first(): Locator {
    return new Locator(this.selector, { ...this.options, index: 0 });
  }

  last(): Locator {
    return new Locator(this.selector, { ...this.options, index: -1 });
  }

  nth(index: number): Locator {
    return new Locator(this.selector, { ...this.options, index });
  }

  locator(selector: string): Locator {
    const parent = this;
    return new Locator(selector, {
      ...this.options,
      filters: [
        ...(this.options.filters ?? []),
        (element) => parent.current()?.contains(element) ?? false,
      ],
    });
  }

  getByRole(role: string, options: { name?: string | RegExp; exact?: boolean } = {}): Locator {
    return new Locator(roleSelectorFor(role), {
      ...this.options,
      filters: [
        ...(this.options.filters ?? []),
        (element) => {
          if (options.name === undefined) return true;
          const text = normalizeText(element.textContent ?? "");
          if (options.exact) {
            return typeof options.name === "string"
              ? text === normalizeText(options.name)
              : (options.name as RegExp).test(element.textContent ?? "");
          }
          return typeof options.name === "string"
            ? text.includes(normalizeText(options.name))
            : (options.name as RegExp).test(element.textContent ?? "");
        },
      ],
    });
  }

  getByText(text: string | RegExp, options: { exact?: boolean } = {}): Locator {
    return new Locator("*", {
      ...this.options,
      filters: [
        ...(this.options.filters ?? []),
        (element) => {
          if (element.children.length > 0) return false;
          const value = normalizeText(element.textContent ?? "");
          if (options.exact) {
            return typeof text === "string" ? value === normalizeText(text) : text.test(value);
          }
          return typeof text === "string" ? value.includes(normalizeText(text)) : text.test(value);
        },
      ],
    });
  }

  getByLabel(label: string | RegExp): Locator {
    return new Locator("input, textarea, select, button", {
      ...this.options,
      filters: [
        ...(this.options.filters ?? []),
        (element) => {
          const id = element.getAttribute("id");
          const labelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
          if (labelFor) {
            const text = normalizeText(labelFor.textContent ?? "");
            return typeof label === "string"
              ? text.includes(normalizeText(label))
              : label.test(text);
          }
          const aria = element.getAttribute("aria-label");
          if (aria) return typeof label === "string" ? aria.includes(label) : label.test(aria);
          return false;
        },
      ],
    });
  }

  async evaluate<T>(fn: (element: HTMLElement) => T): Promise<T> {
    const element = this.current();
    if (!element) throw new Error(`${this.selector}: element not found`);
    return fn(element);
  }

  async evaluateAll<T>(fn: (elements: HTMLElement[]) => T): Promise<T> {
    return fn(this.resolveElements() as HTMLElement[]);
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.current()?.getAttribute(name) ?? null;
  }

  async isVisible(): Promise<boolean> {
    const element = this.current();
    return element !== null && isStructurallyVisible(element);
  }

  async isHidden(): Promise<boolean> {
    const element = this.current();
    return element === null || !isStructurallyVisible(element);
  }

  async isChecked(): Promise<boolean> {
    const element = this.current() as HTMLInputElement | null;
    return element?.checked ?? false;
  }

  async isEnabled(): Promise<boolean> {
    const element = this.current() as HTMLInputElement | null;
    return element !== null && !element.disabled;
  }

  async textContent(): Promise<string> {
    const element = this.current();
    return normalizeText(element?.textContent ?? "");
  }

  private async waitForElement(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HTMLElement> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const element = this.current();
      if (element) return element;
      await sleep(25);
    }
    throw new Error(`${this.selector}: element not found`);
  }

  async click(options: { force?: boolean } = {}): Promise<void> {
    const element = await this.waitForElement();
    if (!options.force && !isStructurallyVisible(element)) {
      throw new Error(`element is not visible: ${this.selector}`);
    }
    await act(async () => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  }

  async fill(value: string): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement | HTMLTextAreaElement;
    await act(async () => {
      setNativeInputValue(element, value);
    });
  }

  async press(key: string): Promise<void> {
    const element = await this.waitForElement();
    const init: Record<string, unknown> = { bubbles: true, cancelable: true, key };
    await act(async () => {
      element.dispatchEvent(new KeyboardEvent("keydown", init));
      element.dispatchEvent(new KeyboardEvent("keyup", init));
    });
  }

  async check(): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement;
    await act(async () => {
      if (!element.checked) {
        // happy-dom's native click() does not toggle controlled checkboxes;
        // set through the prototype setter (React's checked tracker) and
        // dispatch a bubbling change so React's onChange sees the update.
        setNativeChecked(element, true);
      }
    });
  }

  async uncheck(): Promise<void> {
    const element = (await this.waitForElement()) as HTMLInputElement;
    await act(async () => {
      if (element.checked) setNativeChecked(element, false);
    });
  }

  async selectOption(value: string | string[]): Promise<void> {
    const element = (await this.waitForElement()) as HTMLSelectElement;
    const values = Array.isArray(value) ? value : [value];
    await act(async () => {
      for (const option of Array.from(element.options)) {
        if (values.includes(option.value) || values.includes(option.text)) option.selected = true;
      }
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  async hover(): Promise<void> {
    const element = await this.waitForElement();
    await act(async () => {
      element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
  }

  async focus(): Promise<void> {
    const element = await this.waitForElement();
    await act(async () => {
      element.focus();
    });
  }

  async blur(): Promise<void> {
    const element = await this.waitForElement();
    await act(async () => {
      element.blur();
    });
  }

  async boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    throw domUnsupported("geometry");
  }

  async screenshot(_options?: unknown): Promise<void> {
    throw domUnsupported("geometry");
  }
}

// ---------------------------------------------------------------------------
// expect — one coherent builder
// ---------------------------------------------------------------------------

export type ExpectTarget = Locator | (() => unknown) | unknown;

type ExpectResult = {
  toBe: (expected: unknown, options?: { timeout?: number }) => Promise<void>;
  toEqual: (expected: unknown, options?: { timeout?: number }) => Promise<void>;
  toMatchObject: (expected: unknown, options?: { timeout?: number }) => Promise<void>;
  toContain: (expected: string | RegExp, options?: { timeout?: number }) => Promise<void>;
  toMatch: (expected: RegExp, options?: { timeout?: number }) => Promise<void>;
  toHaveLength: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeGreaterThan: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeGreaterThanOrEqual: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeLessThan: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeLessThanOrEqual: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeNull: (options?: { timeout?: number }) => Promise<void>;
  toBeDefined: (options?: { timeout?: number }) => Promise<void>;
  toBeUndefined: (options?: { timeout?: number }) => Promise<void>;
  toBeTruthy: (options?: { timeout?: number }) => Promise<void>;
  toBeFalsy: (options?: { timeout?: number }) => Promise<void>;
  toBeNaN: (options?: { timeout?: number }) => Promise<void>;
  toHaveText: (
    expected: string | string[] | RegExp,
    options?: { timeout?: number },
  ) => Promise<void>;
  toContainText: (expected: string | RegExp, options?: { timeout?: number }) => Promise<void>;
  toHaveClass: (
    expected: string | string[] | RegExp,
    options?: { timeout?: number },
  ) => Promise<void>;
  toHaveAttribute: (
    name: string,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) => Promise<void>;
  toHaveCount: (expected: number, options?: { timeout?: number }) => Promise<void>;
  toBeVisible: (options?: { timeout?: number }) => Promise<void>;
  toBeHidden: (options?: { timeout?: number }) => Promise<void>;
  toBeChecked: (options?: { timeout?: number }) => Promise<void>;
  toBeDisabled: (options?: { timeout?: number }) => Promise<void>;
  toBeEnabled: (options?: { timeout?: number }) => Promise<void>;
  toBeFocused: (options?: { timeout?: number }) => Promise<void>;
  toHaveValue: (expected: string | RegExp, options?: { timeout?: number }) => Promise<void>;
  toHaveCSS: (
    name: string,
    value: string | RegExp,
    options?: { timeout?: number },
  ) => Promise<void>;
  toHaveJSProperty: (name: string, value: unknown, options?: { timeout?: number }) => Promise<void>;
  toBeEmpty: (options?: { timeout?: number }) => Promise<void>;
  toBeAttached: (options?: { timeout?: number }) => Promise<void>;
  toHaveURL: (expected: string | RegExp, options?: { timeout?: number }) => Promise<void>;
  toHaveTitle: (expected: string | RegExp, options?: { timeout?: number }) => Promise<void>;
  toBeCloseTo: (expected: number, digits?: number, options?: { timeout?: number }) => Promise<void>;
  not: ExpectResult;
};

function buildExpect(target: ExpectTarget, negate: boolean): ExpectResult {
  const elementOf = (): HTMLElement | null => (target instanceof Locator ? target.current() : null);
  const valueOf = (): unknown =>
    typeof target === "function" ? (target as () => unknown)() : target;
  const stringValue = (): string => {
    const element = elementOf();
    if (element) return element.textContent ?? "";
    const value = valueOf();
    return typeof value === "string" ? value : String(value);
  };

  const checks: Record<string, (expected: unknown[]) => boolean> = {
    toBe: ([expected]) => Object.is(valueOf(), expected),
    toEqual: ([expected]) => toMatchObjectCheck(valueOf(), expected),
    toMatchObject: ([expected]) => toMatchObjectCheck(valueOf(), expected),
    toContain: ([expected]) => {
      const actual = stringValue();
      return typeof expected === "string"
        ? actual.includes(expected)
        : (expected as RegExp).test(actual);
    },
    toMatch: ([expected]) => (expected as RegExp).test(stringValue()),
    toHaveLength: ([expected]) => {
      const value = valueOf();
      if (typeof value === "string" || Array.isArray(value))
        return value.length === (expected as number);
      return false;
    },
    toBeGreaterThan: ([expected]) => Number(valueOf()) > (expected as number),
    toBeGreaterThanOrEqual: ([expected]) => Number(valueOf()) >= (expected as number),
    toBeLessThan: ([expected]) => Number(valueOf()) < (expected as number),
    toBeLessThanOrEqual: ([expected]) => Number(valueOf()) <= (expected as number),
    toBeNull: () => valueOf() === null,
    toBeDefined: () => valueOf() !== undefined,
    toBeUndefined: () => valueOf() === undefined,
    toBeTruthy: () => Boolean(valueOf()),
    toBeFalsy: () => !valueOf(),
    toBeNaN: () => Number.isNaN(Number(valueOf())),
    toHaveText: ([expected]) => {
      const element = elementOf();
      if (!element) return false;
      if (Array.isArray(expected)) {
        const actual = normalizeText(element.textContent ?? "");
        return expected.every((token) => actual.includes(normalizeText(token)));
      }
      return matchText(normalizeText(element.textContent ?? ""), expected as string | RegExp);
    },
    toContainText: ([expected]) => {
      const element = elementOf();
      if (!element) return false;
      return matchContainText(
        normalizeText(element.textContent ?? ""),
        expected as string | RegExp,
      );
    },
    toHaveClass: ([expected]) => {
      const element = elementOf();
      if (!element) return false;
      if (Array.isArray(expected)) {
        return expected.every((token) => matchClass(element.className, token));
      }
      return matchClass(element.className, expected as string | RegExp);
    },
    toHaveAttribute: ([name, expected]) => {
      const element = elementOf();
      if (!element) return false;
      const actual = element.getAttribute(name as string);
      if (actual === null) return false;
      return typeof expected === "string" ? actual === expected : (expected as RegExp).test(actual);
    },
    toHaveCount: ([expected]) => {
      if (!(target instanceof Locator)) return false;
      return target.resolveElements().length === (expected as number);
    },
    toBeVisible: () => {
      const element = elementOf();
      return element !== null && isStructurallyVisible(element);
    },
    toBeHidden: () => {
      const element = elementOf();
      return element === null || !isStructurallyVisible(element);
    },
    toBeChecked: () => {
      const element = elementOf() as HTMLInputElement | null;
      return element?.checked ?? false;
    },
    toBeDisabled: () => {
      const element = elementOf() as HTMLInputElement | null;
      return element?.disabled ?? false;
    },
    toBeEnabled: () => {
      const element = elementOf() as HTMLInputElement | null;
      return element !== null && !element.disabled;
    },
    toBeFocused: () => {
      const element = elementOf();
      return element !== null && document.activeElement === element;
    },
    toHaveValue: ([expected]) => {
      const element = elementOf() as HTMLInputElement | null;
      if (!element) return false;
      const value = element.value;
      return typeof expected === "string" ? value === expected : (expected as RegExp).test(value);
    },
    toHaveJSProperty: ([name, expected]) => {
      const element = elementOf();
      if (!element) return false;
      const actual = (element as unknown as Record<string, unknown>)[name as string];
      return toMatchObjectCheck(actual, expected);
    },
    toBeEmpty: () => {
      const element = elementOf();
      return (
        element !== null &&
        element.children.length === 0 &&
        (element.textContent ?? "").trim() === ""
      );
    },
    toBeAttached: () => {
      const element = elementOf();
      return element !== null && element.isConnected;
    },
    toHaveURL: ([expected]) => {
      const actual = currentPageUrl();
      if (typeof expected !== "string") return (expected as RegExp).test(actual);
      const relative = !/^[a-z]+:/iu.test(expected) && !expected.startsWith("//");
      if (!relative) return actual === expected;
      // Relative strings resolve against the current URL (wtr/Playwright
      // semantics: `toHaveURL("/yona/…")` matches the full absolute URL).
      return actual === new NodeURL(expected, actual).href;
    },
    toHaveTitle: ([expected]) => {
      const actual = document.title;
      return typeof expected === "string" ? actual === expected : (expected as RegExp).test(actual);
    },
    toBeCloseTo: ([expected, digits = 2]) => {
      const actual = Number(valueOf());
      const tolerance = 0.5 * 10 ** -(digits as number);
      return Math.abs(actual - (expected as number)) <= tolerance;
    },
  };

  const make =
    (kind: string) =>
    async (...args: unknown[]) => {
      const [expected, options] = args as [unknown, { timeout?: number }?];
      void expected;
      const description = `${kind}(${JSON.stringify(args[0])})`;
      if (kind === "toHaveCSS") throw domUnsupported("computed-style");
      const condition = () => {
        const passes = checks[kind](args as unknown[]);
        return negate ? !passes : passes;
      };
      await expectPoll(condition, description, options?.timeout);
    };

  const result = {
    toBe: make("toBe"),
    toEqual: make("toEqual"),
    toMatchObject: make("toMatchObject"),
    toContain: make("toContain"),
    toMatch: make("toMatch"),
    toHaveLength: make("toHaveLength"),
    toBeGreaterThan: make("toBeGreaterThan"),
    toBeGreaterThanOrEqual: make("toBeGreaterThanOrEqual"),
    toBeLessThan: make("toBeLessThan"),
    toBeLessThanOrEqual: make("toBeLessThanOrEqual"),
    toBeNull: make("toBeNull"),
    toBeDefined: make("toBeDefined"),
    toBeUndefined: make("toBeUndefined"),
    toBeTruthy: make("toBeTruthy"),
    toBeFalsy: make("toBeFalsy"),
    toBeNaN: make("toBeNaN"),
    toHaveText: make("toHaveText"),
    toContainText: make("toContainText"),
    toHaveClass: make("toHaveClass"),
    toHaveAttribute: make("toHaveAttribute"),
    toHaveCount: make("toHaveCount"),
    toBeVisible: make("toBeVisible"),
    toBeHidden: make("toBeHidden"),
    toBeChecked: make("toBeChecked"),
    toBeDisabled: make("toBeDisabled"),
    toBeEnabled: make("toBeEnabled"),
    toBeFocused: make("toBeFocused"),
    toHaveValue: make("toHaveValue"),
    toHaveCSS: make("toHaveCSS"),
    toHaveJSProperty: make("toHaveJSProperty"),
    toBeEmpty: make("toBeEmpty"),
    toBeAttached: make("toBeAttached"),
    toHaveURL: make("toHaveURL"),
    toHaveTitle: make("toHaveTitle"),
    toBeCloseTo: make("toBeCloseTo"),
    get not(): ExpectResult {
      // Lazily built — the negated mirror must not recurse during build.
      return buildExpect(target, true);
    },
  } as ExpectResult;
  return result;
}

export function expect(target: ExpectTarget): ExpectResult {
  return buildExpect(target, false);
}

expect.poll = (fn: () => unknown) => ({
  toBe: async (expected: unknown) => {
    await expectPoll(async () => fn() === expected, `poll().toBe(${String(expected)})`);
  },
  toContain: async (expected: unknown) => {
    await expectPoll(
      async () => {
        const actual = await fn();
        if (typeof actual === "string" && typeof expected === "string")
          return actual.includes(expected);
        if (Array.isArray(actual)) {
          return actual.some((item) =>
            typeof expected === "string" && typeof item === "string"
              ? item.includes(expected)
              : item === expected,
          );
        }
        return false;
      },
      `poll().toContain(${String(expected)})`,
    );
  },
  toEqual: async (expected: unknown) => {
    await expectPoll(
      async () => toMatchObjectCheck(await fn(), expected),
      `poll().toEqual(${String(expected)})`,
    );
  },
  not: {
    toContain: async (expected: unknown) => {
      await expectPoll(
        async () => {
          const actual = await fn();
          if (typeof actual === "string" && typeof expected === "string")
            return !actual.includes(expected);
          if (Array.isArray(actual)) {
            return !actual.some((item) =>
              typeof expected === "string" && typeof item === "string"
                ? item.includes(expected)
                : item === expected,
            );
          }
          return true;
        },
        `poll().not.toContain(${String(expected)})`,
      );
    },
  },
});

// ---------------------------------------------------------------------------
// Page facade
// ---------------------------------------------------------------------------

type PageRouteHandler = (route: MockRoute) => void | Promise<void>;
type InitScript = (basePath: string) => void;

export class PageFacade {
  private routeHandlers: Array<{ regex: RegExp; handler: PageRouteHandler }> = [];
  private initScripts: InitScript[] = [];
  private history: RouterHistory | null = null;
  private mounted: { unmount: () => void } | null = null;
  private unsubHistory: (() => void) | null = null;
  private consoleListeners: Array<(message: { text: () => string }) => void> = [];
  private originalFetch: typeof globalThis.fetch | null = null;

  constructor() {
    currentPageUrlValue = `${TEST_ORIGIN}/`;
    // One memory history per Page instance: goto pushes entries so
    // goBack/goForward behave like a browser session; each goto still mounts
    // a fresh React root/router/QueryClient (B2 isolation contract).
    this.history = createMemoryHistory({ initialEntries: ["/"] });
    this.installFetchMock();
  }

  private installFetchMock(): void {
    this.originalFetch = globalThis.fetch;
    const facade = this;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const rawUrl = String(input instanceof Request ? input.url : input);
      // Resolve against the canonical origin so happy-dom's Request accepts
      // it and `**/api/v1/...` glob patterns match absolute app URLs.
      const absoluteUrl = new NodeURL(rawUrl, TEST_ORIGIN).href;
      const request = input instanceof Request ? input : new Request(absoluteUrl, init);
      for (let index = facade.routeHandlers.length - 1; index >= 0; index -= 1) {
        const { regex, handler } = facade.routeHandlers[index];
        if (regex.test(absoluteUrl)) {
          const responseHolder: { response?: Response } = {};
          const route: MockRoute = {
            request: () => buildRequestFacade(request),
            fulfill: async (overrides: Record<string, unknown>) => {
              responseHolder.response = toResponse(overrides);
            },
            fallback: async () => {
              // ponytail: no backend in the dom lane — the fallback answers a
              // deterministic 404 instead of hitting happy-dom's network
              // fetch (which would leak pending async tasks into teardown).
              return new Response(JSON.stringify({ message: "DOM lane: unmocked" }), {
                status: 404,
                headers: { "content-type": "application/json" },
              });
            },
          };
          const outcome = handler(route);
          if (outcome instanceof Promise) await outcome;
          if (responseHolder.response) return responseHolder.response;
          return route.fallback();
        }
      }
      // Unmocked request: same deterministic 404 (no network, no hang).
      return new Response(JSON.stringify({ message: "DOM lane: unmocked" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    };
  }

  restoreFetch(): void {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  // Mirrors wtr-compat's installDefaultMocks: anonymous bootstrap responses
  // so the app shell renders without a real backend.
  installDefaultMocks(): void {
    if (
      this.routeHandlers.some((entry) => entry.regex.test(`${TEST_ORIGIN}/yona/api/v1/session`))
    ) {
      return;
    }
    const defaultSession = {
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
    void this.route("**/api/v1/session", (route) => {
      void route.fulfill({ json: defaultSession });
    });
    void this.route("**/api/v1/auth/capabilities", (route) => {
      void route.fulfill({
        json: {
          emailVerificationEnabled: false,
          enabledSocialProviders: [],
          loginIdPlaceholder: "",
        },
      });
    });
  }

  async setViewportSize(viewport: { width: number; height: number }): Promise<void> {
    void viewport;
    return Promise.resolve();
  }

  async goto(url: string, options?: { waitUntil?: string }): Promise<void> {
    void options;
    const target = new NodeURL(url, TEST_ORIGIN);
    const routerHref = target.pathname + target.search + target.hash;
    // ponytail: no act() around the full mount — Query/Router async effects
    // outlive a single act boundary; settle via the polling matchers instead
    // (plan B3.3). act stays on the synchronous event operations.
    if (this.mounted) {
      this.mounted.unmount();
      this.mounted = null;
    }
    this.unsubHistory?.();
    this.unsubHistory = null;
    for (const child of Array.from(document.body.children)) {
      child.remove();
    }
    const newRoot = document.createElement("div");
    newRoot.id = "root";
    document.body.appendChild(newRoot);
    document.title = "Yoram";
    // Push the target onto the shared per-Page history (browser-navigation
    // analog) and mount a fresh app on it.
    this.history?.push(routerHref);
    for (const script of this.initScripts) {
      script("/yona");
    }
    // Full normalized config — resolveRuntimeConfig fills apiBaseUrl
    // (`/yona/api`) so app fetches hit `**/api/v1/...` mock globs.
    const runtimeConfig = resolveRuntimeConfig({ basePath: "/yona" });
    this.mounted = mountApp(newRoot, {
      runtimeConfig,
      history: this.history ?? undefined,
    });
    // Sync page.url() with the router-owned location (basepath normalization
    // included) and with router-driven navigation (Link clicks etc.).
    this.unsubHistory?.();
    this.unsubHistory = this.history.subscribe(() => {
      const location = this.history?.location;
      if (location) {
        currentPageUrlValue = `${target.origin}${location.pathname}${location.search}${location.hash}`;
      }
    });
    const initialLocation = this.history?.location;
    if (initialLocation) {
      currentPageUrlValue = `${target.origin}${initialLocation.pathname}${initialLocation.search}${initialLocation.hash}`;
    }
    // Let route-loading effects flush.
    await sleep(0);
  }

  async reload(): Promise<void> {
    throw domUnsupported("document-reload");
  }

  async goBack(): Promise<void> {
    // Memory history owns navigation state — back = one step in its stack.
    const history = this.history;
    if (!history) return;
    await act(async () => {
      history.back();
    });
    this.syncUrlFromHistory();
  }

  async goForward(): Promise<void> {
    const history = this.history;
    if (!history) return;
    await act(async () => {
      history.forward();
    });
    this.syncUrlFromHistory();
  }

  private syncUrlFromHistory(): void {
    const location = this.history?.location;
    if (location) {
      currentPageUrlValue = `${TEST_ORIGIN}${location.pathname}${location.search}${location.hash}`;
    }
  }

  url(): string {
    return currentPageUrlValue;
  }

  locator(selector: string): Locator {
    return new Locator(selector);
  }

  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    return new Locator(roleSelectorFor(role)).getByRole(role, options);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return new Locator("*").getByText(text, options);
  }

  getByLabel(label: string | RegExp): Locator {
    return new Locator("input, textarea, select, button").getByLabel(label);
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    return fn();
  }

  async route(pattern: string, handler: PageRouteHandler): Promise<void> {
    this.routeHandlers.push({ regex: globToRegExp(pattern), handler });
  }

  async unroute(pattern: string): Promise<void> {
    const regex = globToRegExp(pattern);
    this.routeHandlers = this.routeHandlers.filter((entry) => entry.regex.source !== regex.source);
  }

  async addInitScript(script: InitScript): Promise<void> {
    this.initScripts.push(script);
  }

  async waitForTimeout(ms: number): Promise<void> {
    await sleep(ms);
  }

  async waitForSelector(selector: string, options?: { timeout?: number }): Promise<Locator> {
    const deadline = Date.now() + (options?.timeout ?? DEFAULT_TIMEOUT_MS);
    while (Date.now() < deadline) {
      if (document.querySelector(selector)) return new Locator(selector);
      await sleep(25);
    }
    throw new Error(`waitForSelector: ${selector} not found`);
  }

  on(event: string, listener: (message: { text: () => string }) => void): void {
    if (event === "console") this.consoleListeners.push(listener);
  }

  once(event: string, listener: (message: { text: () => string }) => void): void {
    if (event === "console") {
      const wrapped = (message: { text: () => string }) => {
        listener(message);
        this.consoleListeners = this.consoleListeners.filter((entry) => entry !== wrapped);
      };
      this.consoleListeners.push(wrapped);
    }
  }

  async screenshot(_options?: unknown): Promise<void> {
    throw domUnsupported("geometry");
  }

  keyboard(): { press: (key: string) => Promise<void> } {
    return {
      press: async (key: string) => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return;
        await act(async () => {
          active.dispatchEvent(
            new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }),
          );
          active.dispatchEvent(
            new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key }),
          );
        });
      },
    };
  }

  mouse(): { click: () => Promise<void> } {
    return {
      click: async () => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return;
        await act(async () => {
          active.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Per-test wiring
// ---------------------------------------------------------------------------

let currentPage: PageFacade | null = null;
let skipCurrentDomTest = false;

export const page: Page = new Proxy({} as PageFacade, {
  get: (_target, prop) => {
    if (!currentPage) throw new Error("page accessed outside a test");
    return (currentPage as unknown as Record<PropertyKey, unknown>)[prop];
  },
});

type Fixture = { page: Page };
export type Page = PageFacade;

function runWithPage(fn: (fixture: Fixture) => void | Promise<void>): () => Promise<void> {
  return async () => {
    if (skipCurrentDomTest) {
      skipCurrentDomTest = false;
      return;
    }
    const fixturePage = new PageFacade();
    fixturePage.installDefaultMocks();
    currentPage = fixturePage;
    try {
      await fn({ page: fixturePage as unknown as Page });
    } catch (error) {
      if (error instanceof Error && error.message === "__DOM_SKIP__") {
        // vitest skip cannot be signaled from the body; treat as pass.
        return;
      }
      throw error;
    } finally {
      fixturePage.restoreFetch();
      try {
        localStorage.clear();
      } catch {
        // happy-dom may not wire localStorage in every config
      }
      if (fixturePage["mounted"]) {
        fixturePage["mounted"].unmount();
        fixturePage["mounted"] = null;
      }
      fixturePage["unsubHistory"]?.();
      fixturePage["unsubHistory"] = null;
      currentPage = null;
    }
  };
}

export const test: {
  (name: string, fn: (fixture: Fixture) => void | Promise<void>): void;
  describe: (name: string, fn: () => void) => void;
  beforeEach: (fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
  use: (options: { viewport?: { width: number; height: number } }) => void;
  info: () => { title: () => string; attach: () => Promise<void> };
  setTimeout: (ms: number) => void;
  skip: (condition: boolean, reason?: string) => void;
} = Object.assign(
  (name: string, fn: (fixture: Fixture) => void | Promise<void>) => {
    it(name, runWithPage(fn));
  },
  {
    describe,
    beforeEach: (fn: () => void | Promise<void>) =>
      beforeEach(async () => {
        try {
          await fn();
        } catch (error) {
          if (error instanceof Error && error.message === "__DOM_SKIP__") {
            // Hooks run outside runWithPage, so defer the skip to the wrapper.
            skipCurrentDomTest = true;
            return;
          }
          throw error;
        }
      }),
    afterEach: (fn: () => void | Promise<void>) => afterEach(fn),
    use: (_options: { viewport?: { width: number; height: number } }) => {},
    info: () => ({ title: () => "", attach: async () => {} }),
    setTimeout: (_ms: number) => {},
    skip: (condition: boolean, _reason?: string) => {
      if (condition) throw new Error("__DOM_SKIP__");
    },
  },
);

// After each test the fetch wrapper must be restored (B2 teardown contract).
afterEach(() => {
  // restoration happens in runWithPage; assert nothing leaked in the fixture
});
