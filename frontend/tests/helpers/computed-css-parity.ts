import type { Page } from "../wtr-compat.ts";

/**
 * Computed-CSS parity harness.
 *
 * Style and React generate non-deterministic class tokens (x1n12ak4,
 * file__styles.name) and metadata attributes (data-style-src,
 * data-project-header-owner). Comparing authored class names against the
 * legacy template therefore flags every migrated element as a diff. The
 * user-visible parity contract is what the cascade actually computes, so both
 * trees are measured with getComputedStyle + getBoundingClientRect in the same
 * document (legacy HTML rendered into an offscreen container) and compared
 * field-by-field. Class names are ignored entirely.
 */

export const computedParityStyleFields = [
  // layout
  "display",
  "position",
  "boxSizing",
  "float",
  "verticalAlign",
  "overflow",
  "zIndex",
  // box
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  // paint
  "backgroundColor",
  "backgroundImage",
  "color",
  "opacity",
  // typography
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textAlign",
  "whiteSpace",
] as const;

export type ComputedParityMismatch = {
  identity: string;
  category: "geometry" | "layout" | "box" | "paint" | "typography" | "missing" | "extra";
  field: string;
  reference: string | number;
  candidate: string | number;
};

export type ComputedParityResult = {
  compared: number;
  mismatches: ComputedParityMismatch[];
};

type BrowserCompareInput = {
  selector: string;
  legacyHtml: string;
  compareGeometry: boolean;
  tolerancePx: number;
};

/**
 * Browser-side comparator. Self-contained so Playwright can serialize it into
 * page.evaluate. Renders the legacy template into an offscreen, laid-out
 * container, finds the matching element by the same selector in both trees,
 * and compares the computed style allowlist plus geometry.
 */
async function compareInBrowser(input: BrowserCompareInput): Promise<ComputedParityResult> {
  const { selector, legacyHtml, compareGeometry, tolerancePx } = input;
  // The canned legacy templates collapse inter-element whitespace, while the
  // live DOM keeps it; compare text after removing all whitespace.
  const compactText = (text: string) => text.replace(/\s+/gu, "");
  // Inlined (not imported) so Playwright can serialize this function into the
  // browser without losing its module-scope closure.
  const styleFields = [
    "display",
    "position",
    "boxSizing",
    "float",
    "verticalAlign",
    "overflow",
    "zIndex",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "backgroundColor",
    "backgroundImage",
    "color",
    "opacity",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "textAlign",
    "whiteSpace",
  ] as const;
  // Settle late-injected stylesheets (legacy fallback) before measuring.
  const { promise: settle, resolve: settleResolve } = Promise.withResolvers<void>();
  setTimeout(settleResolve, 500);
  await settle;
  const liveElement = document.querySelector(selector);
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${document.documentElement.clientWidth}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);
  const fragmentHost = document.createElement("div");
  fragmentHost.innerHTML = legacyHtml;
  // Append every root of the fragment (full-page comparisons carry the whole
  // legacy page; element-only fragments carry a single element).
  while (fragmentHost.firstElementChild) {
    container.appendChild(fragmentHost.firstElementChild);
  }
  const legacyElement = container.querySelector(selector);

  if (!liveElement || !legacyElement) {
    container.remove();
    return {
      compared: 0,
      mismatches: [
        {
          identity: selector,
          category: !liveElement ? "missing" : "extra",
          field: "element",
          reference: legacyElement ? "present" : "absent",
          candidate: liveElement ? "present" : "absent",
        },
      ],
    };
  }

  const mismatches: ComputedParityMismatch[] = [];
  const liveStyle = getComputedStyle(liveElement);
  const legacyStyle = getComputedStyle(legacyElement);
  const liveRect = liveElement.getBoundingClientRect();
  const legacyRect = legacyElement.getBoundingClientRect();

  if (liveElement.tagName !== legacyElement.tagName) {
    mismatches.push({
      identity: selector,
      category: "layout",
      field: "tagName",
      reference: legacyElement.tagName.toLowerCase(),
      candidate: liveElement.tagName.toLowerCase(),
    });
  }

  const liveText = compactText(liveElement.textContent ?? "");
  const legacyText = compactText(legacyElement.textContent ?? "");
  if (liveText !== legacyText) {
    mismatches.push({
      identity: selector,
      category: "layout",
      field: "text",
      reference: legacyText,
      candidate: liveText,
    });
  }

  for (const field of styleFields) {
    // float is ancestor-scoped in the legacy cascade (e.g. project-menu-inner
    // .project-setting); element-only fragments cannot replicate it reliably.
    if (field === "float" && !compareGeometry) {
      continue;
    }
    const reference = legacyStyle.getPropertyValue(field);
    const candidate = liveStyle.getPropertyValue(field);
    if (reference !== candidate) {
      const category =
        field === "display" || field === "position" || field === "float" || field === "overflow"
          ? "layout"
          : field.startsWith("margin") || field.startsWith("padding") || field.startsWith("border")
            ? "box"
            : field.startsWith("background") || field === "color" || field === "opacity"
              ? "paint"
              : "typography";
      mismatches.push({ identity: selector, category, field, reference, candidate });
    }
  }

  if (compareGeometry) {
    for (const field of ["width", "height"] as const) {
      const reference = legacyRect[field];
      const candidate = liveRect[field];
      if (Math.abs(reference - candidate) > tolerancePx) {
        mismatches.push({
          identity: selector,
          category: "geometry",
          field: `rect.${field}`,
          reference,
          candidate,
        });
      }
    }
  }

  container.remove();
  // Debug aid: include the replicated ancestor chain for mismatch triage.
  return { compared: 1, mismatches };
}

/** Compare one selector's live element against the legacy template element. */
export async function compareComputedParity(
  page: Page,
  selector: string,
  legacyHtml: string,
  compareGeometry = true,
  tolerancePx?: number,
): Promise<ComputedParityResult> {
  return page.evaluate(compareInBrowser, {
    compareGeometry,
    legacyHtml,
    selector,
    tolerancePx: tolerancePx ?? 1,
  });
}
