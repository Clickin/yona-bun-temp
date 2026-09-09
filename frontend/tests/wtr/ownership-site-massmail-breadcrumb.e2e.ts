import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-massmail-breadcrumb-heading",
  inner: "site-massmail-breadcrumb-inner",
  outer: "site-massmail-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openMassMail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
  await page.goto(`${basePath}/sites/massmail`);
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  await expect(page.locator(`[data-owner="${owners.outer}"]`)).toBeVisible();
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`breadcrumb preserves exact ${viewport.name} DOM and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMassMail(page);
    const outer = page.locator(`[data-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-owner="${owners.heading}"]`)).toHaveCount(1);
    await expect(heading).toHaveText("사이트 관리");
    await expect(outer).toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const actual = await page.evaluate((ownerNames) => {
      const find = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
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
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const innerWidth = viewport.name === "desktop" ? 1346 : 370;
    expect(actual.boxes).toEqual({
      heading: { height: 45, width: innerWidth, x: 10, y: 83 },
      inner: { height: 45, width: innerWidth, x: 10, y: 83 },
      outer: { height: 45, width: viewport.width, x: 0, y: 83 },
    });
    expect(actual.heading).toEqual({
      color: "rgb(51, 51, 51)",
      fontSize: "24.5px",
      fontWeight: "700",
      lineHeight: "30px",
      margin: "0px",
      padding: "10px 10px 5px",
    });
    expect(actual.outer).toEqual({
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(actual.scrollWidth).toBe(viewport.width);
    await outer.screenshot({
      path: `../output/playwright/visual-sweep/style-site-massmail-breadcrumb-${viewport.name}.png`,
    });
  });
}
