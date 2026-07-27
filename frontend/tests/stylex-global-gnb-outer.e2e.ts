import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-stylex-owner="global-gnb-outer"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB outer has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbOuterStyles");
  const end = route.indexOf("const globalGnbInnerStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbOuterHeight",
    "globalGnbOuterSurface",
    "globalGnbOuterPaddingInline",
    "globalGnbOuterZero",
    "globalGnbOuterBoxSizing",
    "globalGnbOuterProjectSurface",
    "globalGnbOuterProjectPosition",
    "globalGnbOuterProjectWidth",
    "globalGnbOuterProjectZIndex",
    "globalGnbOuterMobileMinWidth",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles.replace('"@media (max-width: 720px)"', '"@media (mobile)"')).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu,
  );
  expect(styles).not.toContain("color:");

  const marker = route.indexOf('data-stylex-owner="global-gnb-outer"');
  const owner = route.slice(route.lastIndexOf("<header", marker), route.indexOf(">", marker));
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(owner).toContain("...stylex.props(");
  expect(owner).toContain("globalGnbOuterStyles.root");
  expect(owner).toContain("hasScopedSearch && globalGnbOuterStyles.project");
  expect(owner).not.toContain("className");

  expect(appCss).toContain(".gnb-outer {");
  expect(appCss).toContain("@media (max-width: 900px) {");
  expect(appCss).not.toContain(".gnb-outer.project-header {");
  expect(appCss).not.toContain(".gnb-outer.project-header .gnb-inner .logo::before");
  expect(appCss).not.toContain(".gnb-outer.project-header .gnb-inner .logo::after");
  expect(readFileSync("src/routes/restricted.tsx", "utf8")).toContain(
    'data-stylex-owner="restricted-gnb-outer"',
  );
  for (const consumer of ["secret.tsx", "$user.tsx", "__root.tsx", "[_]UIKit.tsx"]) {
    expect(readFileSync(`src/routes/${consumer}`, "utf8")).toContain('className="gnb-outer"');
  }
});

test("frozen GNB outer sources stay byte-identical", () => {
  const hashes = new Map([
    [
      "../yona-original/app/assets/stylesheets/yobi.less",
      "b80c78edc2f66b3e14d7087d6c689c387195c06c2e5352d111fb406796d3ca62",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_page.less",
      "2124a6efd122029ff51d26e5b513fbd3945d1020487101a19a5aaa00448d4aa3",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_responsive.less",
      "3b8038e9e3f9fb2067d506794e342bf0aca81071d94128c6cc1a3214c0812105",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap.css",
      "a1878fdc8822d0e2419d823bfa1b87276233038857416a31737445502a51e8f9",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
      "a0baa7fb81cfe06b3bfe4489cb15c998ad3afc7cf7eb77e36f356278d247f440",
    ],
  ]);
  for (const [path, expected] of hashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expected);
  }
});

for (const state of [
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  { height: 900, label: "desktop project", path: "/admin/sample", scoped: true, width: 1366 },
  { height: 844, label: "mobile project", path: "/admin/sample", scoped: true, width: 390 },
  {
    height: 900,
    label: "desktop organization",
    organization: true,
    path: "/organizations/weblabs",
    scoped: true,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile organization",
    organization: true,
    path: "/organizations/weblabs",
    scoped: true,
    width: 390,
  },
]) {
  test(`global GNB outer preserves ${state.label} legacy layout`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.path === "/admin/sample") await mockProject(page);
    if (state.organization) await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const outer = page.locator(OUTER);
    await expect(outer).toBeVisible();
    await expect(outer).not.toHaveClass(/(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u);
    await expect(outer.locator(":scope > [data-stylex-owner='global-gnb-inner']")).toHaveCount(1);

    const evidence = await outer.evaluate((element) => {
      const inner = element.firstElementChild!;
      const rect = element.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        box: {
          bottom: rect.bottom,
          height: rect.height,
          top: rect.top,
          width: rect.width,
          x: rect.x,
        },
        innerColor: getComputedStyle(inner).color,
        innerContained:
          innerRect.left >= rect.left &&
          innerRect.right <= rect.right &&
          innerRect.top >= rect.top &&
          innerRect.bottom <= rect.bottom,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        style: {
          backgroundColor: style.backgroundColor,
          boxSizing: style.boxSizing,
          color: style.color,
          height: style.height,
          minWidth: style.minWidth,
          padding: style.padding,
          position: style.position,
          width: style.width,
          zIndex: style.zIndex,
        },
      };
    });
    expect(evidence.style).toEqual({
      backgroundColor: state.scoped ? "rgba(0, 0, 0, 0.35)" : "rgb(27, 27, 27)",
      boxSizing: "border-box",
      color: "rgb(51, 51, 51)",
      height: "40px",
      minWidth: state.width <= 720 ? "10px" : "0px",
      padding: state.scoped ? "0px" : "0px 10px",
      position: state.scoped ? "absolute" : "static",
      width: `${state.width}px`,
      zIndex: state.scoped ? "1000" : "auto",
    });
    expect(evidence.box).toEqual({ bottom: 40, height: 40, top: 0, width: state.width, x: 0 });
    expect(evidence.innerColor).toBe("rgb(120, 139, 167)");
    expect(evidence.innerContained).toBe(true);
    expect(evidence.overflow).toBe(false);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await outer.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-global-gnb-outer-${state.label.replaceAll(" ", "-")}.png`,
      ),
    });
  });
}

test("global GNB outer paint is isolated from legacy presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const result = await page.locator(OUTER).evaluate((outer) => {
    const snapshot = () => {
      const style = getComputedStyle(outer);
      return {
        backgroundColor: style.backgroundColor,
        boxSizing: style.boxSizing,
        height: style.height,
        minWidth: style.minWidth,
        padding: style.padding,
        position: style.position,
        width: style.width,
        zIndex: style.zIndex,
      };
    };
    const owned = snapshot();
    outer.classList.add("gnb-outer", "project-header");
    return { owned, withLegacyClasses: snapshot() };
  });
  expect(result.withLegacyClasses).toEqual(result.owned);
});

async function installRuntime(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProject(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      },
    }),
  );
}

async function mockOrganization(page: Page) {
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        enrollmentRequested: false,
        logoUrl: "",
        managers: [],
        memberMembers: [],
        members: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      },
    }),
  );
}
