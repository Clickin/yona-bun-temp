---
name: playwright-css-parity
description: Deterministic browser-rendered UI parity using Playwright and optional Chrome DevTools Protocol (CDP). Compare two routes, states, or implementations by DOM identity, bounding boxes, visibility, layout, and computed CSS—not by screenshot or image judgment alone. Use this skill whenever a user mentions visual parity, screenshot drift, low-resolution omissions, CSS comparison, geometry checks, legacy-versus-React screens, Playwright metrics, or CDP browser inspection, even if they do not explicitly ask for a CSS audit.
compatibility: Requires Node.js and Playwright; Chrome/Chromium is recommended. CDP is optional and should be used only when it adds deterministic DOM/CSS access.
---

# Playwright CSS Parity

Use the browser as the measurement instrument. Screenshots are useful context, but the parity decision must come from structured DOM, geometry, and computed-style evidence.

## Core contract

Compare the same route and state in both targets:

- same viewport width/height, device scale factor, browser channel, locale, color scheme, and reduced-motion preference;
- same authentication and seeded data, or explicitly record when the states differ;
- wait for the route's data-ready marker, fonts, images, and layout to settle;
- disable transitions and animations during capture, then optionally run a separate interaction check;
- capture both visible and intentionally hidden elements so `display`, `visibility`, clipping, and overflow regressions are not mistaken for missing content.

Do not treat a screenshot or image-model judgment as proof of parity. A screenshot may be attached as a visual aid, never as the sole source of a finding.

## Intentional diff errata

Treat the following known differences as intentional current-state errata, not parity failures:

### Yoram product identity

- product-facing `Yoram` name replacing legacy `Yona`;
- footer attribution shown as `Yoram authors`;
- omission of legacy `NAVER`, `NAVER LABS`, and `NAVER CLOUD PLATFORM` provider items;
- omission of the upstream Yona repository URL until a real public Yoram repository exists;
- omission of the legacy developer-contact item/link until a real Yoram contact destination exists;
- Yoram-owned release assets instead of upstream Yona/NAVER artwork.

These omissions and their natural downstream geometry effects, including an earlier
global search form or a different responsive user-menu wrap point, are part of the
same approved identity deviation. Do not restore upstream copy, destinations, or
artwork, and do not add compensating spacing.

### Retired legacy shells and placeholders

- retirement of the legacy framed iframe shell: `body.framed-body`, `#sidebar`,
  `#sidebar-bottom`, `#mainFrame`, `iframe#mainFrameId`, `name="mainFrame"`, and
  framed-only `target="mainFrame"` navigation;
- the React SPA root `#mySidenav` sidebar is the intentional replacement for
  `layout_framed.scala.html`, `siteLayout_framed.scala.html`, and the thin
  `index/sidebar.scala.html` wrapper;
- omission of the unlinked `/sites/setting` TODO page. The concrete site-admin
  pages remain; do not restore a visible TODO placeholder or navigation link.

For any item above, classify the exact absence/replacement as `intentional-errata`,
exclude it from parity failure counts, and retain the evidence in the report.
This exception does not cover unrelated footer, shell, route, copy, geometry,
visibility, or styling differences.

Primary provenance: `docs/provenance/frontend-yoram-rebrand-2026-07-13.md`,
`docs/provenance/ui-parity-reports/2026-06-28-p0-rendered-audit-pass.md`, and
`docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md`.

## Target selection and identity

Prefer stable identity in this order:

1. explicit parity/test ownership markers (`data-stylex-owner`, `data-testid`, stable IDs);
2. semantic role plus accessible name;
3. stable class/attribute combinations;
4. a generated DOM path only as a last resort, and mark it fragile.

Compare equivalent elements by identity, not by document index. Record missing, extra, duplicated, and ambiguous matches separately. For repeated rows, include a stable key or normalized text key before comparing geometry.

## Deterministic capture

For each target, collect a JSON snapshot with:

- URL, viewport, device scale, browser, locale, timestamp, and readiness marker;
- selector/identity, tag, role, accessible name, normalized visible text, parent identity, and DOM order;
- `getBoundingClientRect()` x/y/right/bottom/width/height;
- client and scroll dimensions, visibility, opacity, and `display`;
- computed layout: position, box-sizing, overflow, flex/grid properties, alignment, gap, and z-index;
- computed box paint: margins, paddings, border widths/styles/colors/radii, background color/image, outline, and box-shadow;
- computed typography: font family/size/weight, line-height, letter spacing, white-space, and text alignment;
- transform and opacity when they affect placement or visibility;
- `::before` and `::after` computed content and paint when pseudo-elements are part of the visible contract.

Use `window.getComputedStyle`, not authored CSS text, because cascade, inheritance, media queries, and runtime StyleX/custom properties determine what the user sees. Resolve custom properties to their computed values where possible.

A minimal capture expression is:

```js
const readElement = (element) => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    tag: element.tagName.toLowerCase(),
    rect: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
    visibility: { display: style.display, visibility: style.visibility, opacity: style.opacity },
    layout: { position: style.position, boxSizing: style.boxSizing, overflow: style.overflow, zIndex: style.zIndex },
    paint: { color: style.color, backgroundColor: style.backgroundColor, border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth] },
    typography: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, whiteSpace: style.whiteSpace },
    text: element.innerText.replace(/\s+/gu, " ").trim(),
  };
};
```

Expand the allowlist for the target screen; do not dump every browser property by default. Keep the raw snapshot so a disputed finding can be reproduced.

## Comparison rules

Use explicit tolerances, declared before comparison:

- exact equality for identity, tag, role, accessible name, text, display, visibility, and class/attribute ownership;
- default geometry tolerance: 1 CSS px for x/y/width/height, unless the target's existing parity contract specifies another value;
- exact equality for colors, border widths/styles, opacity, font size/weight, line-height, and z-index;
- normalize harmless serialization differences (`rgb()` versus hex, whitespace, `normal` versus equivalent browser serialization) without hiding real differences;
- classify each mismatch as `missing`, `extra`, `identity`, `geometry`, `visibility`, `layout`, `paint`, `typography`, `overflow`, `pseudo`, or `state`;
- report parent/ancestor mismatches before child coordinates because a wrong wrapper often explains many downstream offsets;
- never “fix” a mismatch by adding unexplained route-specific offsets. Trace element type, nesting, order, frozen legacy CSS, cascade, fonts, assets, and box model first.

For responsive checks, compare desktop and mobile independently, then compare the target pair at each viewport. Do not compare absolute coordinates across different viewport sizes.

## Output contract

Always write a machine-readable JSON artifact and a short Markdown summary. Use this shape:

```json
{
  "targets": { "reference": "...", "candidate": "..." },
  "environment": { "viewport": { "width": 1366, "height": 900 }, "deviceScaleFactor": 1, "browser": "chrome" },
  "tolerances": { "geometryPx": 1 },
  "counts": { "reference": 0, "candidate": 0, "missing": 0, "extra": 0, "mismatches": 0 },
  "mismatches": [
    {
      "identity": "project-menu-issue-count",
      "category": "geometry",
      "property": "rect.width",
      "reference": 42,
      "candidate": 38,
      "delta": -4,
      "evidence": { "referenceSelector": "...", "candidateSelector": "..." }
    }
  ],
  "unknowns": [],
  "status": "pass"
}
```

The Markdown summary must state the environment, tolerance, number of compared elements, mismatch counts by category, top ancestor/root causes, and every unknown caused by authentication, missing data, loading, fonts, or an unavailable CDP surface. Never call an unmeasured screen “pixel perfect.”

## Interaction and CDP

Use Playwright locators and assertions for user-visible behavior. Use `page.evaluate` for computed-style collection. If a persistent Chrome tab or remote browser is already available, reuse it rather than launching a second browser. Use CDP (`page.context().newCDPSession(page)`) for deterministic protocol-level inspection only when Playwright APIs cannot expose the needed node/style state; keep the Playwright selector/identity in the artifact so CDP node IDs do not become the report's identity.

Check at least one representative interaction when the mismatch concerns hover, focus, open/closed menus, responsive controls, or transitions. Capture precondition and postcondition DOM/CSS states, not just a screenshot.

## Failure handling

Stop and classify the run when the reference and candidate are not comparable. Typical classifications are `AUTH_BLOCKED`, `DATA_MISMATCH`, `NOT_READY`, `FONT_NOT_READY`, `TARGET_UNAVAILABLE`, and `CDP_UNAVAILABLE`. Preserve partial snapshots and do not convert unavailable measurements into passes.

Prefer a small focused target set first, then expand to the full route after the collector is stable. Keep screenshot comparison as an optional secondary signal for human review; deterministic DOM/CSS evidence is the acceptance gate.
