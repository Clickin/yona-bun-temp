import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const FORM = '[data-stylex-owner="global-gnb-search-form"]';
const SCOPE = '[data-stylex-owner="global-gnb-search-scope"]';
const TOGGLE = '[data-stylex-owner="global-gnb-search-scope-toggle"]';
const MENU = '[data-stylex-owner="global-gnb-search-scope-menu"]';
const ITEM = '[data-stylex-owner="global-gnb-search-scope-item"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search scope menu has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbSearchScopeStyles");
  const end = route.indexOf("const globalGnbSearchFormStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  const toggleStart = styles.indexOf("toggle: {");
  const toggleEnd = styles.indexOf("openToggle: {", toggleStart);
  const menuStart = styles.indexOf("menu: {");
  const menuEnd = styles.indexOf("openMenu: {", menuStart);
  const itemStart = styles.indexOf("item: {", menuEnd);
  const itemEnd = styles.indexOf("button: {", itemStart);
  const buttonStart = styles.indexOf("button: {");
  const buttonEnd = styles.indexOf("middleButton: {", buttonStart);
  expect(toggleStart).toBeGreaterThanOrEqual(0);
  expect(toggleEnd).toBeGreaterThan(toggleStart);
  expect(menuStart).toBeGreaterThanOrEqual(0);
  expect(menuEnd).toBeGreaterThan(menuStart);
  expect(itemStart).toBeGreaterThan(menuEnd);
  expect(itemEnd).toBeGreaterThan(itemStart);
  expect(buttonStart).toBeGreaterThanOrEqual(0);
  expect(buttonEnd).toBeGreaterThan(buttonStart);
  expect(styles.slice(toggleStart, toggleEnd)).not.toContain('boxSizing: "border-box"');
  expect(styles.slice(menuStart, menuEnd)).toContain('float: "left"');
  expect(styles.slice(menuStart, menuEnd)).not.toContain('boxSizing: "content-box"');
  expect(styles.slice(itemStart, itemEnd)).not.toContain("float:");
  expect(styles.slice(buttonStart, buttonEnd)).not.toContain('boxSizing: "border-box"');
  for (const token of [
    "globalGnbSearchScopeZero",
    "globalGnbSearchScopeToggleSurface",
    "globalGnbSearchScopeToggleInteractionSurface",
    "globalGnbSearchScopeToggleText",
    "globalGnbSearchScopeToggleInteractionText",
    "globalGnbSearchScopeToggleBorder",
    "globalGnbSearchScopeToggleInteractionBorder",
    "globalGnbSearchScopeToggleShadow",
    "globalGnbSearchScopeToggleOpenShadow",
    "globalGnbSearchScopeMenuSurface",
    "globalGnbSearchScopeMenuBorder",
    "globalGnbSearchScopeMenuShadow",
    "globalGnbSearchScopeMenuInteractionSurface",
    "globalGnbSearchScopeMenuInteractionText",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);
  for (const owner of [
    "global-gnb-search-scope",
    "global-gnb-search-scope-toggle",
    "global-gnb-search-scope-menu",
    "global-gnb-search-scope-item",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route).toContain("aria-expanded={isSearchScopeMenuOpen}");
  expect(route).toContain('aria-haspopup="menu"');
  const markupStart = route.indexOf("{hasScopedSearch ? (");
  const markupEnd = route.indexOf('data-stylex-owner="global-gnb-search-box"', markupStart);
  expect(markupStart).toBeGreaterThanOrEqual(0);
  expect(markupEnd).toBeGreaterThan(markupStart);
  expect(route.slice(markupStart, markupEnd)).not.toMatch(
    /className=.*(?:btn-group|\bopen\b|ybtn|dropdown-toggle|dropdown-menu|flat|right)/u,
  );
  expect(appCss).not.toContain(".gnb-search-form .dropdown-toggle {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li > button");
  expect(appCss).toContain(".dropdown-menu {");
  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box button {");
});

test("frozen search-scope sources stay byte-identical", () => {
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
      "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
      "8c8fd4427b7a26a9a4ba2d5e7f73c1b779d031015f1da0bc4c506baacefc422d",
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

test("project search scope owns exact closed, hover, focus, and open paint", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const scope = page.locator(SCOPE);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);

  await expect(toggle).toHaveText("This Project");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-haspopup", "menu");
  const closed = await scopeEvidence(scope, toggle, menu);
  expect(closed.toggle.width).toBeCloseTo(119.625, 1);
  expect(closed).toMatchObject({
    caret: {
      borderWidth: "4px 4px 0px",
      content: '""',
      display: "inline-block",
      height: "0px",
      marginLeft: "5px",
      verticalAlign: "middle",
      width: "0px",
    },
    menu: { marginTop: "-10px", opacity: "0", visibility: "hidden" },
    scope: { display: "inline-block", fontSize: "0px", position: "relative", whiteSpace: "nowrap" },
    toggle: {
      backgroundColor: "rgb(247, 247, 247)",
      borderRadius: "3px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(51, 51, 51)",
      appearance: "button",
      boxSizing: "border-box",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "14px",
      fontWeight: "400",
      height: 30,
      lineHeight: "20px",
    },
  });

  await toggle.hover();
  await page.waitForTimeout(350);
  expect(
    await toggle.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      };
    }),
  ).toEqual({
    backgroundColor: "rgb(241, 241, 241)",
    borderColor: "rgba(0, 0, 0, 0.25)",
    color: "rgb(41, 41, 41)",
  });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toBeVisible();
  await page.waitForTimeout(300);
  const open = await scopeEvidence(scope, toggle, menu);
  expect(open.menu).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: "6px",
    float: "none",
    height: 80,
    marginTop: "12px",
    opacity: "1",
    padding: "4px 0px 6px",
    visibility: "visible",
    width: 162,
  });
  expect(open.before).toMatchObject({
    borderBottomColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: "0px 8px 8px",
    right: "7px",
    top: "-8px",
  });
  expect(open.after).toMatchObject({
    borderBottomColor: "rgb(255, 255, 255)",
    borderWidth: "0px 8px 8px",
    right: "7px",
    top: "-7px",
  });
  expect(open.toggle.boxShadow).toBe(
    "rgba(0, 0, 0, 0.15) 0px 2px 4px 0px inset, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
  );
  await saveScopeScreenshot(
    page,
    scope,
    menu,
    "stylex-global-gnb-search-scope-menu-project-open.png",
  );
});

test("project scope menu preserves copy, order, edge geometry, and React behavior", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page, { organizationName: "weblabs" });
  await page.goto(`${BASE_PATH}/admin/sample`);
  const form = page.locator(FORM);
  const toggle = page.locator(TOGGLE);
  await toggle.click();
  const items = page.locator(ITEM);
  const buttons = items.locator(":scope > button");
  await expect(buttons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(items).toHaveCount(3);
  expect(
    await items.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const buttonRect = node.querySelector("button")!.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          buttonHeight: buttonRect.height,
          buttonPadding: getComputedStyle(node.querySelector("button")!).padding,
          buttonWidth: buttonRect.width,
          clear: style.clear,
          display: style.display,
          float: style.cssFloat,
          height: rect.height,
          width: rect.width,
        };
      }),
    ),
  ).toEqual([
    {
      buttonHeight: 32,
      buttonPadding: "5px 5px 7px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 32,
      width: 150,
    },
    {
      buttonHeight: 28,
      buttonPadding: "3px 5px 5px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 28,
      width: 150,
    },
    {
      buttonHeight: 32,
      buttonPadding: "5px 5px 7px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 32,
      width: 150,
    },
  ]);
  await buttons.nth(1).hover();
  await page.waitForTimeout(250);
  expect(
    await buttons.nth(1).evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        color: style.color,
        transitionDuration: style.transitionDuration,
      };
    }),
  ).toEqual({
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "3px",
    color: "rgb(41, 41, 41)",
    transitionDuration: "0.2s",
  });
  await buttons.nth(1).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/organizations/weblabs/search`);
  await expect(toggle).toHaveText("This Group");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await buttons.nth(2).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/search`);
  await expect(toggle).toHaveText("All Projects");
});

test("organization scope opens the exact single-item legacy menu", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockOrganization(page);
  await page.goto(`${BASE_PATH}/organizations/weblabs`);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);
  await expect(toggle).toHaveText("This Group");
  await toggle.click();
  await expect(menu.locator(ITEM)).toHaveCount(1);
  await expect(menu.locator("button")).toHaveText("All Projects");
  await page.waitForTimeout(300);
  const rect = await menu.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { height: box.height, width: box.width };
  });
  expect(rect).toEqual({ height: 46, width: 162 });
  await saveScopeScreenshot(
    page,
    page.locator(SCOPE),
    menu,
    "stylex-global-gnb-search-scope-menu-organization-open.png",
  );
});

test("outer mobile rule hides the fully-owned scope menu", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  await expect(page.locator(FORM)).toBeHidden();
  await expect(page.locator(SCOPE)).toBeHidden();
  await expect(page.locator(TOGGLE)).toHaveAttribute("aria-expanded", "false");
});

test("scope paint remains isolated without runtime presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const scope = page.locator(SCOPE);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);
  for (const locator of [scope, toggle, menu, page.locator(ITEM).first()]) {
    await expect(locator).not.toHaveClass(
      /(?:^|\s)(?:btn-group|open|ybtn|dropdown-toggle|dropdown-menu|flat|right)(?:\s|$)/u,
    );
  }
  await toggle.click();
  await page.waitForTimeout(300);
  const owned = await scopeEvidence(scope, toggle, menu);
  await scope.evaluate((node) => {
    node.closest("form")?.classList.remove("gnb-search-form");
    node.closest("ul")?.classList.remove("gnb-nav");
  });
  const isolated = await scopeEvidence(scope, toggle, menu);
  expect(owned.item).toEqual({
    clear: "both",
    display: "block",
    float: "none",
    position: "relative",
  });
  expect(isolated.item).toEqual(owned.item);
  expect(isolated).toEqual(owned);
});

async function scopeEvidence(scope: Locator, toggle: Locator, menu: Locator) {
  return scope.evaluate(
    (node, elements) => {
      const toggleNode = (elements as { menu: HTMLElement; toggle: HTMLElement }).toggle;
      const menuNode = (elements as { menu: HTMLElement; toggle: HTMLElement }).menu;
      const scopeStyle = getComputedStyle(node);
      const toggleStyle = getComputedStyle(toggleNode);
      const menuStyle = getComputedStyle(menuNode);
      const itemStyle = getComputedStyle(
        menuNode.querySelector('[data-stylex-owner="global-gnb-search-scope-item"]')!,
      );
      const before = getComputedStyle(menuNode, "::before");
      const after = getComputedStyle(menuNode, "::after");
      const caret = getComputedStyle(toggleNode, "::after");
      const toggleBox = toggleNode.getBoundingClientRect();
      const menuBox = menuNode.getBoundingClientRect();
      const arrow = (style: CSSStyleDeclaration) => ({
        borderBottomColor: style.borderBottomColor,
        borderWidth: style.borderWidth,
        right: style.right,
        top: style.top,
      });
      return {
        after: arrow(after),
        before: arrow(before),
        caret: {
          borderWidth: caret.borderWidth,
          content: caret.content,
          display: caret.display,
          height: caret.height,
          marginLeft: caret.marginLeft,
          verticalAlign: caret.verticalAlign,
          width: caret.width,
        },
        item: {
          clear: itemStyle.clear,
          display: itemStyle.display,
          float: itemStyle.cssFloat,
          position: itemStyle.position,
        },
        menu: {
          backgroundColor: menuStyle.backgroundColor,
          borderRadius: menuStyle.borderRadius,
          float: menuStyle.cssFloat,
          height: menuBox.height,
          marginTop: menuStyle.marginTop,
          opacity: menuStyle.opacity,
          padding: menuStyle.padding,
          visibility: menuStyle.visibility,
          width: menuBox.width,
        },
        scope: {
          display: scopeStyle.display,
          fontSize: scopeStyle.fontSize,
          position: scopeStyle.position,
          whiteSpace: scopeStyle.whiteSpace,
        },
        toggle: {
          appearance: toggleStyle.appearance,
          backgroundColor: toggleStyle.backgroundColor,
          borderColor: toggleStyle.borderColor,
          borderRadius: toggleStyle.borderRadius,
          boxSizing: toggleStyle.boxSizing,
          boxShadow: toggleStyle.boxShadow,
          color: toggleStyle.color,
          fontFamily: toggleStyle.fontFamily,
          fontSize: toggleStyle.fontSize,
          fontWeight: toggleStyle.fontWeight,
          height: toggleBox.height,
          lineHeight: toggleStyle.lineHeight,
          width: toggleBox.width,
        },
      };
    },
    { menu: await menu.elementHandle(), toggle: await toggle.elementHandle() },
  );
}

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
  await page.route("**/api/v1/workspace/overview**", (route) =>
    route.fulfill({ contentType: "application/json", json: { profile: { loginId: "admin" } } }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function mockProject(page: Page, options: { organizationName?: string } = {}) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/legacy-assets/images/bg-default-project.png",
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/legacy-assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: options.organizationName,
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
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

async function saveScopeScreenshot(page: Page, scope: Locator, menu: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  const [scopeBox, menuBox] = await Promise.all([scope.boundingBox(), menu.boundingBox()]);
  if (!scopeBox || !menuBox) throw new Error("search scope screenshot target is not visible");
  const left = Math.min(scopeBox.x, menuBox.x);
  const top = Math.min(scopeBox.y, menuBox.y);
  const right = Math.max(scopeBox.x + scopeBox.width, menuBox.x + menuBox.width);
  const bottom = Math.max(scopeBox.y + scopeBox.height, menuBox.y + menuBox.height);
  return page.screenshot({
    clip: { height: bottom - top, width: right - left, x: left, y: top },
    path: resolve(SCREENSHOT_DIRECTORY, filename),
  });
}
