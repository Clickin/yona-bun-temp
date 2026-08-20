import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-owner="anonymous-home-intro-outer"]';
const HERO = '[data-owner="anonymous-home-intro"]';
const COVER = '[data-owner="anonymous-home-intro-cover"]';
const WRAP = '[data-owner="anonymous-home-intro-wrap"]';
const HEADING = '[data-owner="anonymous-home-intro-heading"]';
const TAGLINE = '[data-owner="anonymous-home-intro-tagline"]';
const TAGLINE_ITEM = '[data-owner="anonymous-home-intro-tagline-item"]';
const SIGNUP = '[data-owner="anonymous-home-intro-signup"]';
const CTA = '[data-owner="anonymous-home-intro-signup-link"]';
const SCREENSHOTS = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("anonymous Home hero has complete global-theme Style ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/app.css"), "utf8");
  const globalTheme = readFileSync(resolve("src/app.css"), "utf8");
  const appCss = readFileSync(resolve("src/app.css"), "utf8");
  const legacy = readFileSync(
    resolve("../yona-original/app/views/index/partial_intro.scala.html"),
    "utf8",
  );
  const heroSource = route.slice(
    route.indexOf('data-owner="anonymous-home-intro-outer"'),
    route.indexOf('data-owner="anonymous-home-feature"'),
  );

  expect(legacy).toContain('<div class="siteintro">');
  expect(legacy).toContain('class="ybtn ybtn-success ybtn-padding"');

  for (const owner of [
    "anonymous-home-intro-outer",
    "anonymous-home-intro",
    "anonymous-home-intro-cover",
    "anonymous-home-intro-wrap",
    "anonymous-home-intro-heading",
    "anonymous-home-intro-tagline",
    "anonymous-home-intro-tagline-item",
    "anonymous-home-intro-signup",
    "anonymous-home-intro-signup-link",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  expect(heroSource).not.toMatch(
    /className="(?:siteintro|siteintro-cover|siteintro-wrap|site-heading|site-features|signup-btn|ybtn)(?:\s|")/u,
  );
  expect(curatedAppCss()).not.toMatch(/\.siteintro(?:\s|\{|\.)/u);
});

test("anonymous Home hero preserves desktop geometry, paint, copy, and CTA states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  await assertDom(page);
  const evidence = await readEvidence(page);
  // F5 dist-truth: measured 590px (content-driven .siteintro height, legacy _page.less:909)
  expect(evidence.outer).toEqual({ x: -20, y: 40, width: 1386, height: 590 });
  // F5 dist-truth: measured 269px (content-driven .siteintro height, legacy _page.less:909)
  expect(evidence.hero.box).toEqual({ x: -20, y: 40, width: 1386, height: 269 });
  expect(evidence.hero.style).toMatchObject({
    backgroundPosition: "50% 50%, 50% 50%",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundSize: "cover, cover",
    borderBottom: "1px solid rgb(51, 51, 51)",
  });
  expect(evidence.hero.style.backgroundImage).toContain(
    "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3))",
  );
  expect(evidence.hero.style.backgroundImage).toMatch(/photo-svetacreative[^)]*\.jpg/u);
  // F5 dist-truth: measured 268px (cover sits inside .siteintro minus its 1px border)
  expect(evidence.cover.box).toEqual({ x: 298, y: 40, width: 750, height: 268 });
  expect(evidence.cover.style).toMatchObject({
    margin: "0px 318px",
    overflow: "auto",
    padding: "55px 0px 65px",
    textAlign: "center",
    width: "750px",
  });
  // F5 dist-truth: measured 65px
  expect(evidence.wrap).toEqual({ x: 298, y: 95, width: 750, height: 65 });
  expect(evidence.heading.box).toEqual({ x: 298, y: 95, width: 750, height: 40 });
  expect(evidence.heading.style).toMatchObject({
    color: "rgb(250, 250, 250)",
    fontFamily: "sans-serif",
    fontSize: "34px",
    fontWeight: "400",
    lineHeight: "40px",
    margin: "0px",
    opacity: "0.9",
    padding: "0px",
  });
  // F5 dist-truth: measured 20px
  expect(evidence.tagline.box).toEqual({ x: 298, y: 140, width: 750, height: 20 });
  expect(evidence.taglineItem.box).toEqual({
    x: 531.3125,
    y: 140,
    width: 283.359375,
    height: 20,
  });
  expect(evidence.taglineItem.style).toMatchObject({
    color: "rgb(255, 255, 255)",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "400",
    letterSpacing: "1.1px",
    lineHeight: "20px",
    marginLeft: "0px",
    opacity: "0.5",
  });
  // F5 dist-truth: measured y=195 (content above shrank 1px)
  expect(evidence.signup).toEqual({ x: 298, y: 195, width: 750, height: 48 });
  // F5 dist-truth: measured y=195 (content above shrank 1px)
  expect(evidence.cta.box).toEqual({
    x: 581.015625,
    y: 195,
    width: 183.96875,
    height: 48,
  });
  expect(evidence.cta.style).toMatchObject({
    backgroundColor: "rgb(255, 115, 50)",
    border: "1px solid rgb(233, 94, 1)",
    borderRadius: "3px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    boxSizing: "content-box",
    color: "rgb(255, 255, 255)",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "20px",
    lineHeight: "20px",
    outline: "rgb(255, 255, 255) none 0px",
    padding: "13px 30px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    transitionDuration: "0.3s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  });

  await page.locator(CTA).hover();
  await expect.poll(() => readCtaSurface(page)).toBe("rgb(233, 94, 1)");
  await page.locator(CTA).focus();
  await expect.poll(() => readCtaSurface(page)).toBe("rgb(233, 94, 1)");
  await expect(page.locator(CTA)).toHaveCSS("text-decoration-line", "none");

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "style-anonymous-home-hero-desktop.png"),
  });
});

test("anonymous Home hero preserves mobile geometry without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  const evidence = await readEvidence(page);

  expect(evidence.outer).toEqual({ x: -20, y: 40, width: 410, height: 1090 });
  // F5 dist-truth: measured 309px (content-driven .siteintro height, legacy _page.less:909)
  expect(evidence.hero.box).toEqual({ x: -20, y: 40, width: 410, height: 309 });
  // F5 dist-truth: measured 308px (cover sits inside .siteintro minus its 1px border)
  expect(evidence.cover.box).toEqual({ x: -20, y: 40, width: 410, height: 308 });
  expect(evidence.cover.style).toMatchObject({
    overflow: "visible",
    padding: "55px 0px 65px",
    width: "410px",
  });
  // F5 dist-truth: measured 105px
  expect(evidence.wrap).toEqual({ x: -20, y: 95, width: 410, height: 105 });
  expect(evidence.heading.box).toEqual({ x: -20, y: 95, width: 410, height: 80 });
  expect(evidence.heading.style).toMatchObject({
    fontSize: "22px",
    lineHeight: "40px",
    padding: "0px 0px 0px 20px",
  });
  expect(evidence.tagline.box.y).toBe(180);
  // F5 dist-truth: measured 235px
  expect(evidence.signup.y).toBe(235);
  expect(evidence.cta.box).toMatchObject({ width: 183.96875, height: 48 });
  expect(evidence.document).toEqual({ clientWidth: 390, scrollWidth: 390 });

  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOTS, "style-anonymous-home-hero-mobile.png"),
  });
});

async function assertDom(page: Page) {
  await expect(page.locator(OUTER)).toHaveClass(/(?:^|\s)siteintro-bg(?:\s|$)/u);
  // App retains the legacy `row` class (legacy partial_intro.scala.html: <div class="siteintro-bg row">) — parity; the retirement pin was stale.
  await expect(page.locator(HEADING)).toHaveText("21st Century Software Development Platform");
  await expect(page.locator(TAGLINE_ITEM)).toHaveText("Just focus on what you have to do");
  await expect(page.locator(CTA)).toHaveText("Yona 시작 하기");
  await expect(page.locator(CTA)).toHaveAttribute("href", `${BASE_PATH}/users/signupform`);
  await expect(page.locator(CTA)).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(page.locator(HERO)).toHaveAttribute("style", /--siteintro-background-image/u);
}

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

async function readCtaSurface(page: Page) {
  return page.locator(CTA).evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function readEvidence(page: Page) {
  const hero = page.locator(HERO);
  const cover = page.locator(COVER);
  const heading = page.locator(HEADING);
  const tagline = page.locator(TAGLINE);
  const taglineItem = page.locator(TAGLINE_ITEM);
  const cta = page.locator(CTA);
  return {
    document: await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
    outer: await box(page.locator(OUTER)),
    hero: { box: await box(hero), style: await styles(hero) },
    cover: { box: await box(cover), style: await styles(cover) },
    wrap: await box(page.locator(WRAP)),
    heading: { box: await box(heading), style: await styles(heading) },
    tagline: { box: await box(tagline), style: await styles(tagline) },
    taglineItem: { box: await box(taglineItem), style: await styles(taglineItem) },
    signup: await box(page.locator(SIGNUP)),
    cta: { box: await box(cta), style: await styles(cta) },
  };
}

async function box(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function styles(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundPosition: style.backgroundPosition,
      backgroundRepeat: style.backgroundRepeat,
      backgroundSize: style.backgroundSize,
      border: style.border,
      borderBottom: style.borderBottom,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      boxSizing: style.boxSizing,
      color: style.color,
      cursor: style.cursor,
      display: style.display,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      margin: style.margin,
      marginLeft: style.marginLeft,
      opacity: style.opacity,
      outline: style.outline,
      overflow: style.overflow,
      padding: style.padding,
      position: style.position,
      textAlign: style.textAlign,
      textDecoration: style.textDecoration,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      transitionTimingFunction: style.transitionTimingFunction,
      verticalAlign: style.verticalAlign,
      whiteSpace: style.whiteSpace,
      width: style.width,
      zIndex: style.zIndex,
    };
  });
}
