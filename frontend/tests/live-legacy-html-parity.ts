import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, type Page } from "@playwright/test";

const execFileAsync = promisify(execFile);

export async function expectLegacyLiveHtmlParity(
  page: Page,
  options: {
    currentSelector?: string;
    legacyPath: string;
    legacySelector?: string;
  },
) {
  const legacyOrigin = process.env.LEGACY_YONA_ORIGIN;
  expect(
    legacyOrigin,
    "set LEGACY_YONA_ORIGIN to compare against live legacy Yona HTML",
  ).toBeTruthy();

  const legacyUrl = new URL(options.legacyPath, legacyOrigin).toString();
  const { stdout: legacyHtml } = await execFileAsync("curl", ["-sS", legacyUrl], {
    maxBuffer: 8 * 1024 * 1024,
  });
  const selector = options.currentSelector ?? options.legacySelector ?? "body";
  const legacySelector = options.legacySelector ?? selector;
  const currentSelector = options.currentSelector ?? selector;

  const signatures = await page.evaluate(
    ({ currentSelector, legacyHtml, legacySelector }) => {
      type Signature = {
        attrs: Record<string, string>;
        children: Signature[];
        tag: string;
        text?: string;
      };

      // These are deliberate SPA/REST modernization boundaries, not UI parity drift.
      // Form actions are replaced by React submit handlers and REST mutations, CSRF
      // is transported through runtime/bootstrap headers, autofocus is browser
      // behavior rather than layout, inline style text is compared after browser
      // serialization whitespace is normalized, and relative date text in directory
      // name tags is volatile. Stable form state attributes like value, checked,
      // and selected remain compared unless a route adds an explicit local boundary.
      const spaRestBoundaryAttributeNames = new Set(["autofocus", "data-reactroot"]);
      const booleanAttributeNames = new Set(["disabled", "readonly", "required"]);

      function normalizeAttributeValue(name: string, value: string) {
        if (booleanAttributeNames.has(name)) {
          return "";
        }
        if (name === "style") {
          return value
            .trim()
            .replace(/url\((["'])(.*?)\1\)/g, "url($2)")
            .replace(/\s*([:;])\s*/g, "$1")
            .replace(/;$/, "");
        }
        if (name !== "href" && name !== "src") {
          return value.trim().replace(/\s+/g, " ");
        }
        try {
          const url = new URL(value, window.location.origin);
          return `${url.pathname.replace(/^\/yona(?=\/|$)/, "")}${url.search}${url.hash}`;
        } catch {
          return value.replace(/^\/yona(?=\/|$)/, "");
        }
      }

      function directText(element: Element) {
        return Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .trim()
          .replace(/\s+/g, " ");
      }

      function signature(element: Element): Signature | null {
        const tag = element.tagName.toLowerCase();
        if (tag === "script" || tag === "style") {
          return null;
        }
        if (tag === "input" && element.getAttribute("name") === "csrfToken") {
          return null;
        }

        const attrs: Record<string, string> = {};
        for (const attribute of Array.from(element.attributes).sort((left, right) =>
          left.name.localeCompare(right.name),
        )) {
          const isVolatileRelativeDateTitle =
            tag === "strong" && attribute.name === "title" && element.closest(".name-tag");
          const isSpaRestFormActionBoundary = tag === "form" && attribute.name === "action";
          if (
            spaRestBoundaryAttributeNames.has(attribute.name) ||
            isSpaRestFormActionBoundary ||
            isVolatileRelativeDateTitle
          ) {
            continue;
          }
          attrs[attribute.name] = normalizeAttributeValue(attribute.name, attribute.value);
        }

        const text = tag === "strong" && element.closest(".name-tag") ? "" : directText(element);
        const children = Array.from(element.children)
          .map((child) => signature(child))
          .filter((child): child is Signature => child !== null);

        return {
          attrs,
          children,
          tag,
          ...(text ? { text } : {}),
        };
      }

      const parser = new DOMParser();
      const legacyDocument = parser.parseFromString(legacyHtml, "text/html");
      const legacyRoot = legacyDocument.querySelector(legacySelector);
      const currentRoot = document.querySelector(currentSelector);

      if (!legacyRoot || !currentRoot) {
        return {
          current: currentRoot ? signature(currentRoot) : null,
          legacy: legacyRoot ? signature(legacyRoot) : null,
        };
      }

      return {
        current: signature(currentRoot),
        legacy: signature(legacyRoot),
      };
    },
    { currentSelector, legacyHtml, legacySelector },
  );

  expect(signatures.current).toEqual(signatures.legacy);
}
