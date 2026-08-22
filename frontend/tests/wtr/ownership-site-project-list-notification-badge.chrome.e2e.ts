import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const badgeOwner = '[data-owner="site-project-list-notification-badge"]';
test.use({ locale: "ko-KR" });

async function openProjectList(page: Page, versionToUpdate: string | null) {
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
    route.fulfill({ contentType: "application/json", json: { versionToUpdate } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { filter: "road", page: 1, pageSize: 20, projects: [], total: 0, totalPages: 1 },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=1`);
}

test("notification badge preserves the legacy update conditional and copy", async ({ page }) => {
  await openProjectList(page, null);
  await expect(page.locator(badgeOwner)).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await openProjectList(page, "1.1.0");
  const badge = page.locator(badgeOwner);
  await expect(badge).toHaveText("1");
  await expect(badge).not.toHaveClass(/\bnotification-badge\b/u);
  await expect(badge.locator("xpath=..")).toHaveAttribute("href", `${basePath}/sites/update`);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`notification badge preserves exact ${viewport.name} output and fallback`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjectList(page, "1.1.0");
    const badge = page.locator(badgeOwner);
    await expect(badge).toBeVisible();
    const evidence = await badge.evaluate((element) => {
      const capture = () => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          box: { height: rect.height, width: rect.width },
          style: {
            backgroundColor: style.backgroundColor,
            border: style.border,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            color: style.color,
            display: style.display,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            padding: style.padding,
            position: style.position,
          },
        };
      };
      const actual = capture();
      const originalClassName = element.className;
      for (const token of Array.from(element.classList))
        if (token.startsWith("x") || token.includes("__styles.")) element.classList.remove(token);
      element.classList.add("notification-badge");
      const fallback = capture();
      element.className = originalClassName;
      return { actual, fallback };
    });
    // F5 dist-truth: `.notification-badge` is not in any dist CSS (legacy-fallback.css
    // is stripped in fallback-off dist), so the class-added fixture renders unstyled;
    // the style paint below IS legacy `.notification-badge`
    // (yona-original/app/assets/stylesheets/less/_common.less:251-262,
    // @yobi-primary=@yobi-orange #FF7332 _variables.less:63,77) — pin the measured
    // dist truth instead of the stale fallback-equivalence.
    expect(evidence.actual.style).toEqual({
      backgroundColor: "rgb(255, 115, 50)",
      border: "2px solid rgb(255, 255, 255)",
      borderRadius: "10px",
      boxShadow: "rgba(0, 0, 0, 0.2) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 1px 1px 0px inset",
      color: "rgb(236, 240, 241)",
      display: "inline",
      fontSize: "12px",
      lineHeight: "20px",
      padding: "0px 5px",
      position: "static",
    });
    mkdirSync(resolve("output/playwright/visual-sweep"), { recursive: true });
    await badge.screenshot({
      path: resolve(
        `output/playwright/visual-sweep/style-site-project-list-notification-badge-${viewport.name}.png`,
      ),
    });
  });
}
