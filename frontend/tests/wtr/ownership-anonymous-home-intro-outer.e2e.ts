import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-owner="anonymous-home-intro-outer"]';
const HERO = '[data-owner="anonymous-home-intro"]';
const FEATURE = '[data-owner="anonymous-home-feature"]';
const SCREENSHOTS = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("anonymous Home intro outer has complete global-theme Style ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/app.css"), "utf8");
  const legacy = readFileSync(
    resolve("../yona-original/app/views/index/partial_intro.scala.html"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve("../yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const fallbackManifest = readFileSync(
    resolve("../docs/provenance/legacy-css-merged.manifest.json"),
    "utf8",
  );

  expect(legacy).toContain('<div class="siteintro-bg row">');
  expect(bootstrap).toContain(".row {\n  margin-left: -20px;\n  *zoom: 1;\n}");
  expect(fallbackManifest).toContain('"id": "bootstrap-responsive"');
  expect(fallbackManifest).toContain('"reason": "inactive in legacy layout.scala.html');

  expect(route).not.toContain('className="siteintro-bg row"');

  expect(theme).not.toContain("anonymousHomeIntroOuterMargin:");
  // d1ba4466f restored the legacy `row` class for shell parity; Style still owns
  // the margin (-20px), so the class list carries both tokens.

  expect(theme).not.toMatch(/anonymousHomeIntroOuterPseudo(?:Content|Display|LineHeight|Clear):/u);
});

test("anonymous Home intro outer preserves desktop geometry, pseudos, and child order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)siteintro-bg(?:\s|$)/u);
  // d1ba4466f restored the legacy `row` token for shell parity; the dist carries
  // no `.row` CSS rule, so the class is inert (margin stays Style-owned -20px).
  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)row(?:\s|$)/u);
  const evidence = await readEvidence(page);
  expect(evidence.outer.box).toEqual({ x: -20, y: 40, width: 1386, height: 590 });
  expect(evidence.outer.style).toEqual({
    boxSizing: "content-box",
    display: "block",
    margin: "0px 0px 0px -20px",
  });
  expect(evidence.before).toEqual({
    clear: "none",
    content: '""',
    display: "table",
    lineHeight: "0px",
  });
  expect(evidence.after).toEqual({
    clear: "both",
    content: '""',
    display: "table",
    lineHeight: "0px",
  });
  expect(evidence.childOwners).toEqual(["anonymous-home-intro", "anonymous-home-feature"]);
  expect(evidence.hero).toEqual({ x: -20, y: 40, width: 1386, height: 269 });
  expect(evidence.feature).toEqual({ x: 53, y: 339, width: 1240, height: 291 });
  expect(evidence.hero.y + evidence.hero.height).toBeLessThanOrEqual(evidence.feature.y);
  expect(evidence.document).toEqual({ clientWidth: 1366, scrollWidth: 1366 });

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "style-anonymous-home-intro-outer-desktop.png"),
  });
});

test("anonymous Home intro outer preserves mobile geometry without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)siteintro-bg(?:\s|$)/u);
  // d1ba4466f restored the legacy `row` token for shell parity; the dist carries
  // no `.row` CSS rule, so the class is inert (margin stays Style-owned -20px).
  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)row(?:\s|$)/u);
  const evidence = await readEvidence(page);
  expect(evidence.outer.box).toEqual({ x: -20, y: 40, width: 410, height: 1090 });
  expect(evidence.outer.style).toEqual({
    boxSizing: "content-box",
    display: "block",
    margin: "0px 0px 0px -20px",
  });
  expect(evidence.before).toEqual({
    clear: "none",
    content: '""',
    display: "table",
    lineHeight: "0px",
  });
  expect(evidence.after).toEqual({
    clear: "both",
    content: '""',
    display: "table",
    lineHeight: "0px",
  });
  expect(evidence.childOwners).toEqual(["anonymous-home-intro", "anonymous-home-feature"]);
  expect(evidence.hero).toEqual({ x: -20, y: 40, width: 410, height: 309 });
  expect(evidence.feature).toEqual({ x: -20, y: 379, width: 410, height: 751 });
  expect(evidence.hero.y + evidence.hero.height).toBeLessThanOrEqual(evidence.feature.y);
  expect(evidence.document).toEqual({ clientWidth: 390, scrollWidth: 390 });

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "style-anonymous-home-intro-outer-mobile.png"),
  });
});

async function installRuntimeConfig(page: Page) {
  await page.addInitScript(
    ({ basePath }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        hideProjectListing: false,
        siteName: "Yona",
        supportedLanguages: ["ko-KR"],
      };
    },
    { basePath: BASE_PATH },
  );
}

async function readEvidence(page: Page) {
  const outer = page.locator(OUTER);
  return {
    document: await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
    outer: {
      box: await box(outer),
      style: await outer.evaluate((element) => {
        const style = getComputedStyle(element);
        return { boxSizing: style.boxSizing, display: style.display, margin: style.margin };
      }),
    },
    before: await pseudo(outer, "::before"),
    after: await pseudo(outer, "::after"),
    childOwners: await outer
      .locator(":scope > [data-owner]")
      .evaluateAll((children) => children.map((child) => child.getAttribute("data-owner"))),
    hero: await box(page.locator(HERO)),
    feature: await box(page.locator(FEATURE)),
  };
}

async function box(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function pseudo(locator: Locator, selector: "::before" | "::after") {
  return locator.evaluate((element, pseudoSelector) => {
    const style = getComputedStyle(element, pseudoSelector);
    return {
      clear: style.clear,
      content: style.content,
      display: style.display,
      lineHeight: style.lineHeight,
    };
  }, selector);
}
