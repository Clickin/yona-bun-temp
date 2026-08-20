// ponytail: extracted from wtr-compat.ts (same-source helpers, no behavior
// change) so the dom lane can run without the iframe/realm machinery. The
// chrome lane keeps importing wtr-compat.ts untouched; this module is the
// single source for the environment-independent pieces both lanes share.
// If wtr-compat and this drift, the wtr-compat copy wins (chrome lane stable
// first) — re-sync this file from wtr-compat.

export const DEFAULT_TIMEOUT_MS = 10000;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Playwright's :text() / :has-text() pseudo selectors are whitespace-
// normalized SUBSTRING matches (not equality).
export function translateHasText(
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
  textbox: 'input[type="text"], input[type="search"], textarea, [role="textbox"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',
  radio: 'input[type="radio"], [role="radio"]',
  tab: '[role="tab"], [data-toggle="tab"]',
  option: "option, [role='option']",
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

export function roleSelectorFor(role: string): string {
  return ROLE_SELECTORS[role] ?? `[role="${role}"]`;
}

export function globToRegExp(pattern: string): RegExp {
  // Protect glob wildcards with placeholders, escape literals, then restore.
  const protectedGlobs = pattern.replace(/\*\*/g, "\u0000").replace(/\*/g, "\u0001");
  const escaped = protectedGlobs.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const restored = escaped.replace(/\u0000/g, ".*").replace(/\u0001/g, "[^/]*");
  return new RegExp(`^${restored}$`);
}

export function matchText(actual: string, expected: string | RegExp): boolean {
  return typeof expected === "string" ? actual === normalizeText(expected) : expected.test(actual);
}

export function matchContainText(actual: string, expected: string | RegExp): boolean {
  return typeof expected === "string"
    ? actual.includes(normalizeText(expected))
    : expected.test(actual);
}

export function matchClass(actualClass: string, expected: string | RegExp): boolean {
  if (typeof expected === "string") {
    return expected
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => actualClass.split(/\s+/).includes(token));
  }
  return expected.test(actualClass);
}

export function asymmetricEquals(actual: unknown, expected: unknown): boolean {
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

export function toMatchObjectCheck(actual: unknown, expected: unknown): boolean {
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

export async function expectPoll(
  condition: () => boolean | Promise<boolean>,
  message: string,
  timeout?: number,
): Promise<void> {
  const deadline = Date.now() + (timeout ?? DEFAULT_TIMEOUT_MS);
  let last = false;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      last = await condition();
      lastError = null;
    } catch (error) {
      // Playwright retries through transient errors (strict-mode violations
      // on dual-render states, detached elements, ...).
      lastError = error;
      last = false;
    }
    if (last) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  if (lastError !== null) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
  throw new Error(`expect: ${message}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// React installs a value tracker on controlled inputs; assigning element.value
// directly bypasses onChange. Set through the native prototype setter instead.
// (Same-realm variant — wtr-compat's version crosses the iframe realm.)
export function setNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
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

// React tracks controlled checkbox state; assigning element.checked directly
// bypasses onChange. Set through the native prototype setter + bubbling
// change event (same-realm variant of wtr-compat's checkbox handling).
export function setNativeChecked(element: HTMLInputElement, checked: boolean): void {
  const view = element.ownerDocument.defaultView as Window & typeof globalThis;
  const proto = view.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "checked")?.set;
  if (setter) setter.call(element, checked);
  else element.checked = checked;
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

// Structural visibility: the subset of visual visibility that the DOM lane
// can prove without a browser cascade. `aria-hidden` alone is NOT visual
// visibility (accessibility-tree semantics) and stylesheet classes cannot be
// proven here — callers needing those must stay in the chrome lane.
export function isStructurallyVisible(element: Element): boolean {
  if (!element.isConnected) return false;
  const input = element as HTMLInputElement;
  if (input.tagName === "INPUT" && input.type === "hidden") return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return false;
    const style = (node as HTMLElement).style;
    if (!style) continue;
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  }
  return true;
}
