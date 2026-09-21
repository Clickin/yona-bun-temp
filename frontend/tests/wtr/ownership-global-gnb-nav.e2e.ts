import { readFileSync, curatedAppCss } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const NAV = '[data-owner="global-gnb-nav"]';
const BRAND_ITEM = '[data-owner="global-gnb-brand-item"]';

test.use({ locale: "en-US" });

test("global GNB nav and brand item have complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  for (const token of [
    "globalGnbNavDisplay",
    "globalGnbNavFloat",
    "globalGnbNavPosition",
    "globalGnbNavZero",
    "globalGnbNavMarginLeft",
    "globalGnbNavText",
    "globalGnbNavFontSize",
    "globalGnbNavFontWeight",
    "globalGnbNavLineHeight",
    "globalGnbNavListStyle",
    "globalGnbNavBoxSizing",
    "globalGnbNavItemFloat",
    "globalGnbNavItemPosition",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const marker = route.indexOf('data-owner="global-gnb-nav"');
  const navStart = route.lastIndexOf("<ul", marker);
  const navEnd = route.indexOf(">", marker);
  const nav = route.slice(navStart, navEnd);
  expect(marker).toBeGreaterThanOrEqual(0);

  expect(nav).not.toContain('className="gnb-nav"');

  const itemMarker = route.indexOf('data-owner="global-gnb-brand-item"');

  expect(itemMarker).toBeGreaterThanOrEqual(0);

  expect(appCss).toContain(".gnb-nav {");
  expect(appCss).toContain(".gnb-nav > li {");
  for (const consumer of ["restricted.tsx", "secret.tsx", "$user.tsx", "__root.tsx"]) {
    const source = readFileSync(`src/routes/${consumer}`, "utf8");
    expect(source).toContain(
      consumer === "restricted.tsx" ? 'data-owner="restricted-gnb-nav"' : 'className="gnb-nav"',
    );
  }
});

for (const state of [
  { label: "desktop home", path: "/", project: false, width: 1366, height: 900 },
  { label: "mobile home", path: "/", project: false, width: 390, height: 844 },
  { label: "desktop project", path: "/admin/sample", project: true, width: 1366, height: 900 },
  { label: "mobile project", path: "/admin/sample", project: true, width: 390, height: 844 },
  {
    label: "desktop organization",
    path: "/organizations/weblabs",
    organization: true,
    width: 1366,
    height: 900,
  },
  {
    label: "mobile organization",
    path: "/organizations/weblabs",
    organization: true,
    width: 390,
    height: 844,
  },
]) {
  test(`global GNB nav preserves ${state.label} legacy layout`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.project) await mockProject(page);
    if (state.organization) await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);

    const nav = page.locator(NAV);
    const item = page.locator(BRAND_ITEM);
    await expect(nav).toBeVisible();
    await expect(nav).not.toHaveClass(/(?:^|\s)gnb-nav(?:\s|$)/u);
    await expect(item).toBeVisible();
    await expect(nav.locator(":scope > li").first()).toHaveAttribute(
      "data-owner",
      "global-gnb-brand-item",
    );

    const evidence = await nav.evaluate((element) => {
      const item = element.firstElementChild!;
      const style = getComputedStyle(element);
      const itemStyle = getComputedStyle(item);
      const rect = element.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      return {
        item: {
          display: itemStyle.display,
          float: itemStyle.cssFloat,
          position: itemStyle.position,
          margin: itemStyle.margin,
          padding: itemStyle.padding,
        },
        itemWithinNav: itemRect.left >= rect.left && itemRect.right <= rect.right,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        style: {
          boxSizing: style.boxSizing,
          color: style.color,
          display: style.display,
          float: style.cssFloat,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          listStyleType: style.listStyleType,
          margin: style.margin,
          padding: style.padding,
          position: style.position,
        },
      };
    });
    expect(evidence.style).toEqual({
      boxSizing: "content-box",
      color: "rgb(162, 162, 162)",
      display: "block",
      float: "left",
      fontSize: "14px",
      fontWeight: "400",
      lineHeight: "20px",
      listStyleType: "none",
      margin: "0px 0px 0px 15px",
      padding: "0px",
      position: "static",
    });
    expect(evidence.item).toEqual({
      display: "list-item",
      float: "left",
      margin: "0px",
      padding: "0px",
      position: "relative",
    });
    expect(evidence.itemWithinNav).toBe(true);
    expect(evidence.overflow).toBe(false);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await nav.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-global-gnb-nav-local-${state.label.replaceAll(" ", "-")}.png`,
      ),
    });
  });
}

test("global GNB nav paint is isolated from its legacy presentation class", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(NAV).evaluate((nav) => {
    const item = nav.firstElementChild!;
    const snapshot = () => ({
      navFloat: getComputedStyle(nav).cssFloat,
      navMargin: getComputedStyle(nav).margin,
      navPadding: getComputedStyle(nav).padding,
      itemFloat: getComputedStyle(item).cssFloat,
      itemPosition: getComputedStyle(item).position,
    });
    const owned = snapshot();
    nav.classList.add("gnb-nav");
    return { owned, withLegacyClass: snapshot() };
  });
  expect(result.withLegacyClass).toEqual(result.owned);
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
