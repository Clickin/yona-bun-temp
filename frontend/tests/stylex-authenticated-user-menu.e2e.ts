import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated user menu owns its legacy declarations through global StyleX variables", () => {
  const appSource = readFileSync("src/app.css", "utf8");
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const ownerSource = routeSource.slice(
    routeSource.indexOf("const authenticatedSiteUserMenuStyles"),
    routeSource.indexOf("const anonymousSiteUserMenuStyles"),
  );

  expect(ownerSource).toContain("stylex.create");
  expect(ownerSource).toContain('data-stylex-owner="authenticated-site-user-menu"');
  expect(ownerSource).toContain("homeColors.navigationAccent");
  expect(ownerSource).toContain("homeColors.navigationDivider");
  expect(ownerSource).toContain("homeColors.navigationDropdownText");
  expect(ownerSource).toContain("homeColors.navigationCreateAction");
  expect(ownerSource).toContain('backgroundColor: "transparent"');
  expect(ownerSource).toContain('borderStyle: "none"');
  expect(ownerSource).toContain("borderWidth: 0");
  expect(ownerSource).toContain('color: "inherit"');
  expect(ownerSource).toContain('cursor: "pointer"');
  expect(ownerSource).toContain('font: "inherit"');
  expect(ownerSource).toContain("homeColors.textMuted");
  expect(ownerSource).toContain("homeColors.textOnDarkHover");
  expect(themeSource).toContain("stylex.defineVars");

  for (const color of ["#efefef", "#f36c22", "#ffffff"]) {
    expect(themeSource.toLowerCase()).toContain(color);
  }
  for (const color of [
    "#5dbbe0",
    "#788ba7",
    "#efefef",
    "#f36c22",
    "#a2a2a2",
    "#fcfcfc",
    "#ffffff",
  ]) {
    expect(ownerSource.toLowerCase()).not.toContain(color);
  }

  expect(ownerSource).not.toContain("document.");
  expect(ownerSource).not.toContain("addEventListener");
  expect(ownerSource).not.toContain("classList");
  expect(ownerSource).not.toContain("dangerouslySetInnerHTML");
  expect(ownerSource).not.toContain("counterBadge");

  const menuMarker = ownerSource.indexOf('data-stylex-owner="authenticated-site-user-menu"');
  const menuStart = ownerSource.lastIndexOf("<ul", menuMarker);
  const menu = ownerSource.slice(menuStart);
  expect(menu.match(/\{" "\}/gu)).toHaveLength(2);
  expect(menu).not.toContain("gnb-dropdown-toggle");
  expect(menu).not.toContain("dropdwon-box-btn");
  expect(appSource).not.toContain(".gnb-usermenu-dropdown .gnb-dropdown-toggle");
  expect(appSource).not.toContain(".gnb-usermenu-dropdown > button");
  expect(appSource).not.toContain(".gnb-usermenu-dropdown {\n");
  expect(appSource).not.toContain(".gnb-usermenu-item,\n  .gnb-usermenu-dropdown {");
  expect(appSource).toContain(".gnb-usermenu-item {\n    color: #5dbbe0 !important;");
  expect(appSource).not.toContain(".gnb-nav > li,\n.gnb-usermenu > li {");
  expect(appSource).toContain(".gnb-nav > li {\n  float: left;\n  position: relative;");
  expect(appSource).toContain(".gnb-usermenu > li {\n  position: relative;\n  float: left;");
});

test("authenticated user-menu frozen sources stay byte-identical", () => {
  const expectedHashes = new Map([
    [
      "../yona-original/app/assets/stylesheets/yobi.less",
      "b80c78edc2f66b3e14d7087d6c689c387195c06c2e5352d111fb406796d3ca62",
    ],
    [
      "../yona-original/app/assets/stylesheets/usermenu.less",
      "3b77f96f9f5514d560f67f411c1cce906bf4edf04058cdcfaa2194084371e4fb",
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
      "../yona-original/app/assets/stylesheets/less/_variables.less",
      "d6c1cf8d2ba55984b9da59f61295b11d3fd13db43140936712d93f606cd845c8",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_mixins.less",
      "fe0ae11cb70ab9aab748361e76ffcd69339f7dbf692c11a9590d58174313513d",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_common.less",
      "25dc11ea11ebaa41c687b6ae3ea2c92d25c9d78102331dedd113432f3e86ee65",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
      "8c8fd4427b7a26a9a4ba2d5e7f73c1b779d031015f1da0bc4c506baacefc422d",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_usermenu.less",
      "3ff23f692f508c250f359161380b48503b1f637044333d72e53a675ba02894b2",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap.css",
      "a1878fdc8822d0e2419d823bfa1b87276233038857416a31737445502a51e8f9",
    ],
  ]);

  for (const [path, expectedHash] of expectedHashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex"), path).toBe(expectedHash);
  }
});

test("StyleX owns the authenticated desktop top-right menu and keeps React interactions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(51, 51, 51)");

  const menu = topRightMenu(page);
  const myIssues = menu.getByRole("link", { name: "My Issues", exact: true });
  const siteAdmin = menu.locator('a[title="Site administration"]');
  const buttons = menu.getByRole("button");
  const sidebarToggle = buttons.nth(0);
  const createToggle = buttons.nth(1);

  await expect(menu).toBeVisible();
  await expect(myIssues).toHaveAttribute("href", `${BASE_PATH}/user/issues`);
  await expect(siteAdmin).toHaveAttribute("href", `${BASE_PATH}/sites/userList`);
  await expect(sidebarToggle).toHaveAttribute("title", "User menu, Shortcut (F)");
  await expect(sidebarToggle).toHaveAttribute("aria-controls", "mySidenav");
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
  await expect(createToggle).toHaveAttribute("type", "button");

  const before = await readMenuEvidence(menu);
  console.log("authenticated-user-menu-desktop", JSON.stringify(before));

  expect(before.hasOwner).toBe(true);
  expect(before.styles).toEqual({
    adminFontSize: "16px",
    createBackgroundColor: "rgb(243, 108, 34)",
    createBorderTopWidth: "0px",
    createBorderRadius: "3px",
    createColor: "rgb(255, 255, 255)",
    createCursor: "pointer",
    createDisplay: "inline-block",
    createFontSize: "14px",
    createFontWeight: "400",
    createLineHeight: "30px",
    createPadding: "0px 10px",
    createPosition: "static",
    createZIndex: "auto",
    dividerAfterColor: "rgb(120, 139, 167)",
    dividerAfterContent: '"|"',
    dividerAfterOpacity: "0.35",
    dividerLineHeight: "30px",
    dropdownColor: "rgb(239, 239, 239)",
    dropdownFontSize: "14px",
    itemColor: "rgb(162, 162, 162)",
    itemFloat: "left",
    itemFontSize: "14px",
    itemMargin: "5px 0px",
    itemPosition: "relative",
    linkColor: "rgb(162, 162, 162)",
    linkLineHeight: "30px",
    linkPadding: "5px 10px",
    linkTextDecoration: "none",
    menuFloat: "right",
    menuListStyle: "none",
    menuPadding: "0px",
    toggleDisplay: "inline-block",
    toggleBackgroundColor: "rgba(0, 0, 0, 0)",
    toggleBorderTopWidth: "0px",
    toggleColor: "rgb(239, 239, 239)",
    toggleCursor: "pointer",
    toggleFontSize: "14px",
    toggleFontWeight: "400",
    toggleLineHeight: "30px",
    togglePadding: "0px 10px",
    togglePosition: "static",
    toggleTransitionDuration: "0.15s",
    toggleZIndex: "auto",
  });
  expect(before.buttonPresentationClasses).toEqual([[], []]);
  expect(before.buttonWhitespace).toEqual([true, true]);
  assertContainedAndOrdered(before.geometry, 1366);
  expectBox(before.geometry.menu, { height: 40, width: 243.56, x: 1098.97, y: 43 });
  expectBox(before.geometry.myIssues, { height: 27, width: 84.19, x: 1098.97, y: 49 });
  expectBox(before.geometry.admin, { height: 28, width: 35.19, x: 1186.45, y: 49 });
  expectBox(before.geometry.sidebar, { height: 30, width: 56.8, x: 1224.94, y: 48 });
  expectBox(before.geometry.create, { height: 30, width: 50.8, x: 1291.73, y: 48 });

  await myIssues.hover();
  await expect(myIssues).toHaveCSS("color", "rgb(252, 252, 252)");
  await sidebarToggle.hover();
  await expect(sidebarToggle).toHaveCSS("color", "rgb(93, 187, 224)");
  await sidebarToggle.focus();
  await expect(sidebarToggle).toHaveCSS("color", "rgb(93, 187, 224)");
  await createToggle.hover();
  await expect(createToggle).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(createToggle).toHaveCSS("background-color", "rgb(243, 108, 34)");
  await createToggle.focus();
  await expect(createToggle).toHaveCSS("color", "rgb(255, 255, 255)");

  const initialUrl = page.url();
  await createToggle.click();
  const createLinks = menu.getByRole("link").filter({ visible: true });
  await expect(createLinks).toContainText([
    "My Issues",
    "New issue",
    "New issue - personal inbox",
    "Create new project",
    "New Group",
  ]);
  await expect(page.getByRole("link", { name: "New issue", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "New Group", exact: true })).toBeVisible();
  expect(page.url()).toBe(initialUrl);
  await createToggle.click();
  await expect(page.getByRole("link", { name: "New issue", exact: true })).toBeHidden();

  await removeNonButtonStyleXClasses(menu);
  const fallback = await readMenuEvidence(menu);
  expect(fallback.styles).toEqual(before.styles);
  expect(fallback.geometry).toEqual(before.geometry);
  await restoreClasses(menu);

  await sidebarToggle.click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(
      SCREENSHOT_DIRECTORY,
      "stylex-authenticated-top-menu-button-reset-local-desktop.png",
    ),
  });
  expect(page.url()).toBe(initialUrl);
});

test("StyleX preserves the authenticated 390px menu, responsive color, and containment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(51, 51, 51)");

  const menu = topRightMenu(page);
  const buttons = menu.getByRole("button");
  const sidebarToggle = buttons.nth(0);
  const createToggle = buttons.nth(1);
  const evidence = await readMenuEvidence(menu);
  console.log("authenticated-user-menu-mobile", JSON.stringify(evidence));

  expect(evidence.hasOwner).toBe(true);
  expect(evidence.styles.itemColor).toBe("rgb(93, 187, 224)");
  expect(evidence.styles.linkColor).toBe("rgb(162, 162, 162)");
  expect(evidence.styles.dropdownColor).toBe("rgb(93, 187, 224)");
  expect(evidence.styles.createBackgroundColor).toBe("rgb(243, 108, 34)");
  expect(evidence.styles.togglePosition).toBe("static");
  expect(evidence.styles.toggleZIndex).toBe("auto");
  expect(evidence.styles.createPosition).toBe("static");
  expect(evidence.styles.createZIndex).toBe("auto");
  expect(evidence.buttonPresentationClasses).toEqual([[], []]);
  expect(evidence.buttonWhitespace).toEqual([true, true]);
  assertContainedAndOrdered(evidence.geometry, 390);
  expectRelativeBox(evidence.geometry.menu, evidence.geometry.menu, {
    height: 40,
    width: 243.56,
    x: 0,
    y: 0,
  });
  expectRelativeBox(evidence.geometry.myIssues, evidence.geometry.menu, {
    height: 27,
    width: 84.19,
    x: 0,
    y: 6,
  });
  expectRelativeBox(evidence.geometry.admin, evidence.geometry.menu, {
    height: 28,
    width: 35.19,
    x: 87.48,
    y: 6,
  });
  expectRelativeBox(evidence.geometry.sidebar, evidence.geometry.menu, {
    height: 30,
    width: 56.8,
    x: 125.97,
    y: 5,
  });
  expectRelativeBox(evidence.geometry.create, evidence.geometry.menu, {
    height: 30,
    width: 50.8,
    x: 192.77,
    y: 5,
  });

  const initialUrl = page.url();
  await createToggle.click();
  await expect(menu.getByRole("link", { name: "Create new project", exact: true })).toBeVisible();
  await createToggle.click();
  await expect(menu.getByRole("link", { name: "Create new project", exact: true })).toBeHidden();

  await removeNonButtonStyleXClasses(menu);
  const fallback = await readMenuEvidence(menu);
  expect(fallback.styles.itemColor).toBe("rgb(93, 187, 224)");
  expect(fallback.styles.dropdownColor).toBe("rgb(93, 187, 224)");
  expect(fallback.styles.createBackgroundColor).toBe("rgb(243, 108, 34)");
  expect(fallback.geometry).toEqual(evidence.geometry);
  await restoreClasses(menu);

  await sidebarToggle.click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(
      SCREENSHOT_DIRECTORY,
      "stylex-authenticated-top-menu-button-reset-local-mobile.png",
    ),
  });
  expect(page.url()).toBe(initialUrl);
});

function topRightMenu(page: Page) {
  return page.locator('[data-stylex-owner="authenticated-site-user-menu"]');
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        organizations: [],
        profile: {
          avatarUrl: "/legacy-assets/images/default-avatar-34.png",
          isGuest: false,
        },
        recentIssues: [],
      },
    });
  });
}

async function readMenuEvidence(menu: Locator) {
  return menu.evaluate((element) => {
    const items = Array.from(element.children) as HTMLElement[];
    const links = Array.from(element.querySelectorAll("a")) as HTMLElement[];
    const buttons = Array.from(element.querySelectorAll("button")) as HTMLElement[];
    const myIssuesLink = links.find((link) => link.textContent?.trim() === "My Issues");
    const adminLink = links.find((link) => link.title === "Site administration");
    const sidebarButton = buttons[0];
    const createButton = buttons[1];
    if (!myIssuesLink || !adminLink || !sidebarButton || !createButton) {
      throw new Error("Authenticated top-right menu targets are missing");
    }
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        right: rect.right,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    };
    const menuStyle = getComputedStyle(element);
    const itemStyle = getComputedStyle(items[0]);
    const linkStyle = getComputedStyle(myIssuesLink);
    const dividerStyle = getComputedStyle(items[1]);
    const dividerAfterStyle = getComputedStyle(items[1], "::after");
    const adminStyle = getComputedStyle(adminLink);
    const dropdownStyle = getComputedStyle(items[4]);
    const toggleStyle = getComputedStyle(sidebarButton);
    const createStyle = getComputedStyle(createButton);
    const hasWhitespaceBetweenChildren = (button: HTMLElement) =>
      Array.from(button.childNodes).some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          /^\s+$/u.test(node.textContent ?? "") &&
          node.previousSibling === button.firstElementChild &&
          node.nextSibling === button.lastElementChild,
      );
    return {
      buttonPresentationClasses: buttons.map((button) =>
        ["gnb-dropdown-toggle", "dropdwon-box-btn"].filter((className) =>
          button.classList.contains(className),
        ),
      ),
      buttonWhitespace: buttons.map(hasWhitespaceBetweenChildren),
      geometry: {
        admin: box(adminLink),
        create: box(createButton),
        menu: box(element),
        myIssues: box(myIssuesLink),
        sidebar: box(sidebarButton),
      },
      hasOwner: element.getAttribute("data-stylex-owner") === "authenticated-site-user-menu",
      styles: {
        adminFontSize: adminStyle.fontSize,
        createBackgroundColor: createStyle.backgroundColor,
        createBorderTopWidth: createStyle.borderTopWidth,
        createBorderRadius: createStyle.borderRadius,
        createColor: createStyle.color,
        createCursor: createStyle.cursor,
        createDisplay: createStyle.display,
        createFontSize: createStyle.fontSize,
        createFontWeight: createStyle.fontWeight,
        createLineHeight: createStyle.lineHeight,
        createPadding: createStyle.padding,
        createPosition: createStyle.position,
        createZIndex: createStyle.zIndex,
        dividerAfterColor: dividerAfterStyle.color,
        dividerAfterContent: dividerAfterStyle.content,
        dividerAfterOpacity: dividerAfterStyle.opacity,
        dividerLineHeight: dividerStyle.lineHeight,
        dropdownColor: dropdownStyle.color,
        dropdownFontSize: dropdownStyle.fontSize,
        itemColor: itemStyle.color,
        itemFloat: itemStyle.cssFloat,
        itemFontSize: itemStyle.fontSize,
        itemMargin: itemStyle.margin,
        itemPosition: itemStyle.position,
        linkColor: linkStyle.color,
        linkLineHeight: linkStyle.lineHeight,
        linkPadding: linkStyle.padding,
        linkTextDecoration: linkStyle.textDecorationLine,
        menuFloat: menuStyle.cssFloat,
        menuListStyle: menuStyle.listStyleType,
        menuPadding: menuStyle.padding,
        toggleBackgroundColor: toggleStyle.backgroundColor,
        toggleBorderTopWidth: toggleStyle.borderTopWidth,
        toggleColor: toggleStyle.color,
        toggleCursor: toggleStyle.cursor,
        toggleDisplay: toggleStyle.display,
        toggleFontSize: toggleStyle.fontSize,
        toggleFontWeight: toggleStyle.fontWeight,
        toggleLineHeight: toggleStyle.lineHeight,
        togglePadding: toggleStyle.padding,
        togglePosition: toggleStyle.position,
        toggleTransitionDuration: toggleStyle.transitionDuration,
        toggleZIndex: toggleStyle.zIndex,
      },
    };
  });
}

function assertContainedAndOrdered(
  geometry: Record<"admin" | "create" | "menu" | "myIssues" | "sidebar", Box>,
  viewportWidth: number,
) {
  expect(geometry.menu.right).toBeLessThanOrEqual(viewportWidth);
  expect(geometry.menu.x).toBeGreaterThanOrEqual(0);
  expect(geometry.myIssues.right).toBeLessThanOrEqual(geometry.admin.x);
  expect(geometry.admin.right).toBeLessThanOrEqual(geometry.sidebar.x);
  expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.create.x);
  for (const child of [geometry.myIssues, geometry.admin, geometry.sidebar, geometry.create]) {
    expect(child.x).toBeGreaterThanOrEqual(geometry.menu.x);
    expect(child.right).toBeLessThanOrEqual(geometry.menu.right);
    expect(child.y).toBeGreaterThanOrEqual(geometry.menu.y);
    expect(child.bottom).toBeLessThanOrEqual(geometry.menu.bottom);
  }
}

async function removeNonButtonStyleXClasses(menu: Locator) {
  await menu.evaluate((element) => {
    const legacyClasses = new Set([
      "divider",
      "dropdown-menu",
      "flat",
      "gnb-usermenu",
      "gnb-usermenu-dropdown",
      "gnb-usermenu-item",
      "loggged-in",
      "open",
      "right",
      "show-progress-bar",
      "sidebar-open-btn",
      "user-item-btn",
      "usermenu-icon-button",
      "yobicon-plus",
      "yobicon-wrench",
      "avatar-wrap",
      "smaller",
      "caret",
      "no-margin",
    ]);
    for (const target of [element, ...element.querySelectorAll("*")]) {
      const htmlTarget = target as HTMLElement;
      if (htmlTarget.closest("button")) continue;
      htmlTarget.dataset.preStylexClass = htmlTarget.className;
      htmlTarget.className = Array.from(htmlTarget.classList)
        .filter((className) => legacyClasses.has(className))
        .join(" ");
    }
  });
}

async function restoreClasses(menu: Locator) {
  await menu.evaluate((element) => {
    for (const target of [element, ...element.querySelectorAll("*")]) {
      const htmlTarget = target as HTMLElement;
      if (!htmlTarget.hasAttribute("data-pre-stylex-class")) continue;
      htmlTarget.className = htmlTarget.dataset.preStylexClass ?? "";
      delete htmlTarget.dataset.preStylexClass;
    }
  });
}

type Box = {
  bottom: number;
  height: number;
  right: number;
  width: number;
  x: number;
  y: number;
};

function expectBox(
  actual: Pick<Box, "height" | "width" | "x" | "y">,
  expected: Pick<Box, "height" | "width" | "x" | "y">,
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(0.02);
}

function expectRelativeBox(
  actual: Pick<Box, "height" | "width" | "x" | "y">,
  origin: Pick<Box, "x" | "y">,
  expected: Pick<Box, "height" | "width" | "x" | "y">,
) {
  expectBox({ ...actual, x: actual.x - origin.x, y: actual.y - origin.y }, expected);
}
