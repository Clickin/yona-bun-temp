import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-stylex-owner="anonymous-home-intro-outer"]';
const HERO = '[data-stylex-owner="anonymous-home-intro"]';
const FEATURE = '[data-stylex-owner="anonymous-home-feature"]';
const SCREENSHOTS = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("anonymous Home intro outer has complete global-theme StyleX ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/theme.stylex.ts"), "utf8");
  const legacy = readFileSync(
    resolve("../yona-original/app/views/index/partial_intro.scala.html"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve("../yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const fallbackManifest = readFileSync(
    resolve("public/legacy-assets/stylesheets/legacy-fallback.manifest.json"),
    "utf8",
  );

  expect(legacy).toContain('<div class="siteintro-bg row">');
  expect(bootstrap).toContain(".row {\n  margin-left: -20px;\n  *zoom: 1;\n}");
  expect(fallbackManifest).toContain('"id": "bootstrap-responsive"');
  expect(fallbackManifest).toContain('"reason": "inactive in legacy layout.scala.html');
  expect(route).toContain(
    "className={`siteintro-bg ${stylex.props(anonymousHomeIntroOuterStyles.outer).className}`}",
  );
  expect(route).not.toContain('className="siteintro-bg row"');
  expect(route).toContain("stylex.props(anonymousHomeIntroOuterStyles.outer)");
  expect(theme).toContain('anonymousHomeIntroOuterMargin: "0px 0px 0px -20px"');
  expect(theme).toContain("anonymousHomeIntroOuterPseudoContent: '\"\"'");
  expect(theme).toContain('anonymousHomeIntroOuterPseudoDisplay: "table"');
  expect(theme).toContain('anonymousHomeIntroOuterPseudoLineHeight: "0px"');
  expect(theme).toContain('anonymousHomeIntroOuterPseudoClear: "both"');
});

test("anonymous Home intro outer preserves desktop geometry, pseudos, and child order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)siteintro-bg(?:\s|$)/u);
  await expect(page.locator(OUTER)).not.toHaveClass(/(?:^|\s)row(?:\s|$)/u);
  const evidence = await readEvidence(page);
  expect(evidence.outer.box).toEqual({ x: -20, y: 40, width: 1386, height: 591 });
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
  expect(evidence.hero).toEqual({ x: -20, y: 40, width: 1386, height: 270 });
  expect(evidence.feature).toEqual({ x: 53, y: 340, width: 1240, height: 291 });
  expect(evidence.hero.y + evidence.hero.height).toBeLessThanOrEqual(evidence.feature.y);
  expect(evidence.document).toEqual({ clientWidth: 1366, scrollWidth: 1366 });

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "stylex-anonymous-home-intro-outer-desktop.png"),
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
  await expect(page.locator(OUTER)).not.toHaveClass(/(?:^|\s)row(?:\s|$)/u);
  const evidence = await readEvidence(page);
  expect(evidence.outer.box).toEqual({ x: -20, y: 40, width: 410, height: 1091 });
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
  expect(evidence.hero).toEqual({ x: -20, y: 40, width: 410, height: 310 });
  expect(evidence.feature).toEqual({ x: -20, y: 380, width: 410, height: 751 });
  expect(evidence.hero.y + evidence.hero.height).toBeLessThanOrEqual(evidence.feature.y);
  expect(evidence.document).toEqual({ clientWidth: 390, scrollWidth: 390 });

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "stylex-anonymous-home-intro-outer-mobile.png"),
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
      .locator(":scope > [data-stylex-owner]")
      .evaluateAll((children) => children.map((child) => child.getAttribute("data-stylex-owner"))),
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
