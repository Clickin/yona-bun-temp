import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const outerOwner = "user-profile-page-outer";
const innerOwner = "user-profile-page";

async function mockProfile(page: Page, missing = false) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route(`**/api/v1/users/${missing ? "missing" : "door"}/profile**`, (route) =>
    route.fulfill(
      missing
        ? { contentType: "application/json", json: { message: "not found" }, status: 404 }
        : {
            contentType: "application/json",
            json: {
              daysAgo: 14,
              issueItems: [],
              memberProjects: [],
              profile: {
                avatarUrl: "",
                connectedSocialProviders: [],
                displayName: "Door User",
                englishName: "Door English",
                isBlocked: false,
                isGuest: false,
                isSiteAdmin: false,
                loginId: "door",
                primaryEmailAddress: "",
                sinceLabel: "2026-06-30",
              },
              pullRequestItems: [],
              selected: "issues",
              viewerCanEditProfile: false,
            },
          },
    ),
  );
}

test("profile page wrappers record the frozen source and ownership boundary", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const styles = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const view = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageOuterStart = styles.indexOf("  pageOuter: {");
  const pageOuterEnd = styles.indexOf("\n  // Frozen less/_page.less .page-wrap.", pageOuterStart);
  const pageOuterStyles = styles.slice(pageOuterStart, pageOuterEnd);

  expect(view).toContain(
    '<div class="page-wrap-outer">\n    <div class="page-wrap">\n        <section class="user-box">',
  );
  expect(pageLess).toContain(
    ".page-wrap-outer {\n    min-height: 450px;\n    margin-top: 10px;\n}",
  );
  expect(pageLess).toContain(".page-wrap {\n    background-color: @white;\n    margin: 0 auto;\n}");
  expect(yobi.indexOf('@import "less/_page.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_responsive.less";'),
  );
  const mobileImportant = responsive.indexOf(
    ".page-wrap-outer {\n    min-width: 10px !important;\n    padding: 0 !important;",
  );
  const mobileLater = responsive.indexOf(
    ".page-wrap-outer {\n    padding: 0 10px;\n    width: 100%;\n    box-sizing: border-box;",
  );
  expect(mobileImportant).toBeGreaterThan(-1);
  expect(mobileLater).toBeGreaterThan(mobileImportant);
  expect(pageOuterStart).toBeGreaterThan(-1);
  expect(pageOuterEnd).toBeGreaterThan(pageOuterStart);
  expect(pageOuterStyles).not.toContain("1100px");
  expect(styles).toContain("backgroundColor: userProfileColors.pageBackground");
  expect(styles).toContain('"@media (max-width: 720px)"');
  expect(route).toContain(`data-stylex-owner="${outerOwner}"`);
  expect(route).toContain(`data-stylex-owner="${innerOwner}"`);
  expect(route).toContain("page-wrap-outer");
  expect(route).toContain("page-wrap");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`profile page wrappers preserve ${viewport.name} cascade and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockProfile(page);
    await page.goto(`${basePath}/door`);

    const outer = page.locator(`[data-stylex-owner="${outerOwner}"]`);
    const inner = page.locator(`[data-stylex-owner="${innerOwner}"]`);
    const box = page.locator('[data-stylex-owner="user-profile-box"]');
    const breadcrumb = page.locator('[data-stylex-owner="user-profile-breadcrumb-outer"]');
    await expect(outer).toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(inner).toHaveClass(/\bpage-wrap\b/u);
    await expect(outer.locator(`:scope > [data-stylex-owner="${innerOwner}"]`)).toHaveCount(1);
    await expect(
      inner.locator(':scope > section.user-box[data-stylex-owner="user-profile-box"]'),
    ).toHaveCount(1);

    const actual = await page.evaluate(
      ({ innerOwner, outerOwner }) => {
        const outer = document.querySelector<HTMLElement>(`[data-stylex-owner="${outerOwner}"]`)!;
        const inner = document.querySelector<HTMLElement>(`[data-stylex-owner="${innerOwner}"]`)!;
        const box = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-box"]')!;
        const breadcrumb = document.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-breadcrumb-outer"]',
        )!;
        const outerBox = outer.getBoundingClientRect();
        const innerBox = inner.getBoundingClientRect();
        const userBox = box.getBoundingClientRect();
        const outerStyle = getComputedStyle(outer);
        const innerStyle = getComputedStyle(inner);
        return {
          background: innerStyle.backgroundColor,
          breadcrumbBeforePage: Boolean(
            breadcrumb.compareDocumentPosition(outer) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          contained:
            outerBox.left <= innerBox.left &&
            innerBox.right <= outerBox.right &&
            innerBox.top <= userBox.top &&
            userBox.right <= innerBox.right &&
            userBox.bottom <= innerBox.bottom,
          margin: innerStyle.margin,
          minHeight: outerStyle.minHeight,
          minWidth: outerStyle.minWidth,
          outerHeight: outerBox.height,
          padding: outerStyle.padding,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      },
      { innerOwner, outerOwner },
    );
    expect(actual.breadcrumbBeforePage).toBe(true);
    expect(actual.contained).toBe(true);
    expect(actual.background).toBe("rgb(255, 255, 255)");
    expect(actual.margin).toBe("0px");
    expect(actual.minHeight).toBe("450px");
    expect(actual.outerHeight).toBeGreaterThanOrEqual(450);
    expect(actual.minWidth).toBe(viewport.name === "desktop" ? "1100px" : "10px");
    expect(actual.padding).toBe(viewport.name === "desktop" ? "0px 10px" : "0px");
    expect(actual.scrollWidth).toBe(actual.viewportWidth);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-user-profile-page-wrappers-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
    await expect(breadcrumb).toBeVisible();
    await expect(box).toBeVisible();
  });
}

test("missing profile omits populated wrapper owners", async ({ page }) => {
  await mockProfile(page, true);
  await page.goto(`${basePath}/missing`);
  await expect(
    page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]'),
  ).toBeVisible();
  await expect(page.locator(`[data-stylex-owner="${outerOwner}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-stylex-owner="${innerOwner}"]`)).toHaveCount(0);
});
