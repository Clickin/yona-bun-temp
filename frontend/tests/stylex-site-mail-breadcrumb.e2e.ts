import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-mail-breadcrumb-heading",
  inner: "site-mail-breadcrumb-inner",
  outer: "site-mail-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openMail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" };
  const fulfillSession = (route: Route) => route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(`[data-stylex-owner="${owners.outer}"]`)).toBeVisible();
}

test("breadcrumb owns the legacy site manager geometry", () => {
  const route = readFileSync("src/routes/sites/mail.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const mail = readFileSync("../yona-original/app/views/site/mail.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync("../yona-original/app/assets/stylesheets/less/_responsive.less", "utf8");
  expect(mail).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(responsive).toContain("min-width: 10px !important;");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  expect(route).not.toContain("globalColors.");
  for (const declaration of [
    'boxSizing: "border-box"',
    '[globalBreakpoints.mobile]: "10px"',
    'padding: "0px 10px"',
    'width: "100%"',
    'margin: "0px auto"',
    'lineHeight: "30px"',
    'padding: "10px 10px 5px"',
  ]) expect(route).toContain(declaration);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`breadcrumb preserves ${viewport.name} DOM and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMail(page);
    const outer = page.locator(`[data-stylex-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-stylex-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-stylex-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-stylex-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-stylex-owner="${owners.heading}"]`)).toHaveCount(1);
    await expect(heading).toHaveText("사이트 관리");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);
    const actual = await page.evaluate((ownerNames) => {
      const find = (name: string) => document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x };
      };
      const outer = find(ownerNames.outer);
      const heading = find(ownerNames.heading);
      const outerStyle = getComputedStyle(outer);
      const headingStyle = getComputedStyle(heading);
      return {
        boxes: { heading: box(heading), inner: box(find(ownerNames.inner)), outer: box(outer) },
        heading: {
          color: headingStyle.color,
          fontSize: headingStyle.fontSize,
          fontWeight: headingStyle.fontWeight,
          lineHeight: headingStyle.lineHeight,
          margin: headingStyle.margin,
          padding: headingStyle.padding,
        },
        outer: {
          boxSizing: outerStyle.boxSizing,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        outerScrollWidth: outer.scrollWidth,
      };
    }, owners);
    const innerWidth = viewport.name === "desktop" ? 1346 : 370;
    expect(actual.boxes).toEqual({
      heading: { height: 45, width: innerWidth, x: 10 },
      inner: { height: 45, width: innerWidth, x: 10 },
      outer: { height: 45, width: viewport.width, x: 0 },
    });
    expect(actual.heading).toMatchObject({
      lineHeight: "30px",
      margin: "0px",
      padding: "10px 10px 5px",
    });
    if (!process.env.VITE_DISABLE_LEGACY_FALLBACK) {
      expect(actual.heading).toMatchObject({
        color: "rgb(51, 51, 51)",
        fontSize: "24.5px",
        fontWeight: "700",
      });
    }
    expect(actual.outer).toEqual({
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(actual.outerScrollWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve("..", "output", "playwright", "visual-sweep", `stylex-site-mail-breadcrumb-${viewport.name}.png`),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
