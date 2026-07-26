import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "user-profile-breadcrumb-heading",
  inner: "user-profile-breadcrumb-inner",
  outer: "user-profile-breadcrumb-outer",
} as const;

async function mockSession(page: Page) {
  const session = { isAnonymous: false, isGuest: false, loginId: "viewer" };
  const fulfill = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfill);
  }
}

async function openProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await mockSession(page);
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
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
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
  await page.goto(`${basePath}/door`);
  await expect(page.locator(`[data-stylex-owner="${owners.outer}"]`)).toBeVisible();
}

test("public-profile breadcrumb records the frozen legacy ownership boundary", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const styles = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const view = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );

  expect(view).toContain('<div class="site-breadcrumb-outer">');
  expect(view).toContain('<div class="site-breadcrumb-inner">');
  expect(view).toContain("<h3>@user.name</h3>");
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(pageLess).toContain("margin:0 auto;");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(pageLess).toContain("line-height: 30px;");
  expect(responsive).toContain("min-width: 10px !important;");
  expect(responsive).toContain("padding: 0 10px;");
  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route).toContain("site-breadcrumb-outer");
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  const breadcrumbStyles = styles.slice(
    styles.indexOf("breadcrumbOuter:"),
    styles.indexOf("avatarBackground:"),
  );
  expect(breadcrumbStyles).not.toContain("borderBottom");
  expect(breadcrumbStyles).not.toContain("fontWeight");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`public-profile breadcrumb preserves ${viewport.name} DOM and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProfile(page);

    const outer = page.locator(`[data-stylex-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-stylex-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-stylex-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-stylex-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-stylex-owner="${owners.heading}"]`)).toHaveCount(
      1,
    );
    await expect(heading).toHaveText("Door User");
    await expect(outer).toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);
    await expect(inner).toHaveCSS("margin", "0px");
    await expect(heading).toHaveCSS("padding", "10px 10px 5px");
    await expect(heading).toHaveCSS("line-height", "30px");

    const actual = await page.evaluate((ownerNames) => {
      const find = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const outer = find(ownerNames.outer);
      const inner = find(ownerNames.inner);
      const heading = find(ownerNames.heading);
      const outerBox = outer.getBoundingClientRect();
      const innerBox = inner.getBoundingClientRect();
      const headingBox = heading.getBoundingClientRect();
      const outerStyle = getComputedStyle(outer);
      return {
        aligned:
          Math.abs(innerBox.left - headingBox.left) < 0.01 &&
          Math.abs(innerBox.right - headingBox.right) < 0.01,
        contained:
          outerBox.left <= innerBox.left &&
          innerBox.right <= outerBox.right &&
          innerBox.top <= headingBox.top &&
          headingBox.bottom <= innerBox.bottom,
        minWidth: outerStyle.minWidth,
        padding: outerStyle.padding,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        width: outerBox.width,
      };
    }, owners);
    expect(actual.aligned).toBe(true);
    expect(actual.contained).toBe(true);
    expect(actual.width).toBe(viewport.width);
    expect(actual.minWidth).toBe(viewport.name === "desktop" ? "0px" : "10px");
    expect(actual.padding).toBe(viewport.name === "desktop" ? "0px" : "0px 10px");
    expect(actual.scrollWidth).toBe(actual.viewportWidth);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-user-profile-breadcrumb-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}

test("missing public profile does not render breadcrumb owners", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/v1/users/missing/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { code: "not_found", message: "not found" },
      status: 404,
    }),
  );
  await page.goto(`${basePath}/missing`);
  await expect(
    page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]'),
  ).toBeVisible();
  for (const owner of Object.values(owners)) {
    await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toHaveCount(0);
  }
});
