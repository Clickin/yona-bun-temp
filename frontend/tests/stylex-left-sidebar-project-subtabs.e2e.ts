import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });
test.setTimeout(30_000);

for (const viewport of [
  {
    height: 900,
    label: "desktop",
    live: { listHeight: 61, listWidth: 270, wrapHeight: 76, wrapWidth: 270, wrapY: 147 },
    local: { listHeight: 61, listWidth: 270, wrapHeight: 76, wrapWidth: 270, wrapY: 147 },
    width: 1366,
  },
  {
    height: 844,
    label: "mobile",
    live: {
      listHeight: 31,
      listWidth: 317.6875,
      wrapHeight: 46,
      wrapWidth: 317.6875,
      wrapY: 120,
    },
    local: {
      listHeight: 31,
      listWidth: 317.6875,
      wrapHeight: 46,
      wrapWidth: 317.6875,
      wrapY: 120,
    },
    width: 390,
  },
]) {
  test(`left Project subtabs preserve ${viewport.label} owned legacy parity`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page, "en-US");
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const leftSidebar = page.locator("#sidebar");
    await leftSidebar.getByRole("button", { exact: true, name: "Project" }).click();
    const projectPane = page.locator("#left-sidebar-myProjectList");
    const owner = projectPane.locator(":scope > div > div > div > div:nth-child(2)");
    const list = owner.locator(":scope > ul");
    const items = list.locator(":scope > li");
    const buttons = items.locator(":scope > button");
    await expect(owner).toBeVisible();
    await expect(buttons).toHaveText(["Recently visited", "Create", "Watching", "Member"]);

    const initial = await readEvidence(owner);
    console.log(`left-sidebar-project-subtabs-${viewport.label}`, JSON.stringify(initial));
    await saveScreenshot(
      page,
      `stylex-left-sidebar-project-subtabs-local-${viewport.label}-${initial.owner === "left-sidebar-project-subtabs" ? "after" : "before"}.png`,
    );

    expect(initial.owner).toBe("left-sidebar-project-subtabs");
    expect(initial.presentationClasses).toEqual([]);
    expect(initial.pluginAttributes).toEqual([]);
    expect(initial.whitespaceNodes).toEqual([" ", " ", " "]);
    expect(initial.activeIndex).toBe(0);
    expect(initial.geometry.wrap).toMatchObject({
      height: viewport.local.wrapHeight,
      width: viewport.local.wrapWidth,
      x: 0,
      y: viewport.local.wrapY,
    });
    expect(initial.geometry.list).toMatchObject({
      height: viewport.local.listHeight,
      width: viewport.local.listWidth,
      x: 0,
      y: viewport.local.wrapY + 10,
    });
    expect(viewport.live).toEqual(
      viewport.label === "desktop"
        ? { listHeight: 61, listWidth: 270, wrapHeight: 76, wrapWidth: 270, wrapY: 147 }
        : {
            listHeight: 31,
            listWidth: 317.6875,
            wrapHeight: 46,
            wrapWidth: 317.6875,
            wrapY: 120,
          },
    );
    expect(initial.geometry.items).toEqual(
      viewport.label === "desktop"
        ? [
            { height: 31, width: 111.84375, x: 0, y: 157 },
            { height: 30, width: 56.265625, x: 115.4375, y: 157 },
            { height: 30, width: 72.78125, x: 175.296875, y: 157 },
            { height: 30, width: 66.015625, x: 0, y: 188 },
          ]
        : [
            { height: 31, width: 111.84375, x: 0, y: 130 },
            { height: 30, width: 56.265625, x: 115.4375, y: 130 },
            { height: 30, width: 72.78125, x: 175.296875, y: 130 },
            { height: 30, width: 66.015625, x: 251.671875, y: 130 },
          ],
    );
    expect(initial.geometry.gaps).toEqual(
      viewport.label === "desktop" ? [3.59375, 3.59375, -248.078125] : [3.59375, 3.59375, 3.59375],
    );
    expect(initial.styles.wrap).toEqual({ padding: "10px 0px 5px" });
    expect(initial.styles.list).toEqual({
      backgroundColor: "rgb(238, 238, 238)",
      color: "rgb(0, 0, 0)",
      display: "inline-block",
      listStyleType: "none",
      margin: "0px",
      padding: "0px",
    });
    expect(initial.styles.items).toEqual(
      Array.from({ length: 4 }, () => ({
        borderStyle: "none",
        borderWidth: "0px",
        display: "inline-block",
        marginLeft: "0px",
      })),
    );
    expect(initial.styles.buttons[0]).toMatchObject({
      backgroundColor: "rgb(243, 108, 34)",
      borderBottomColor: "rgb(243, 108, 34)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: "rgb(252, 252, 252)",
      fontSize: "13px",
      height: 31,
      lineHeight: "20px",
      padding: "5px 8px",
    });
    expect(initial.styles.buttons[1]).toMatchObject({
      appearance: "none",
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottomStyle: "none",
      borderBottomWidth: "0px",
      borderRadius: "0px",
      boxShadow: "none",
      color: "rgb(0, 0, 0)",
      cursor: "pointer",
      display: "block",
      fontSize: "13px",
      height: 30,
      lineHeight: "20px",
      margin: "0px",
      padding: "5px 8px",
    });

    await buttons.nth(1).hover();
    const hoveredGeometry = (await readEvidence(owner)).geometry.items;
    expect(hoveredGeometry).toEqual(
      viewport.label === "desktop"
        ? [
            { height: 31, width: 111.84375, x: 0, y: 157 },
            { height: 31, width: 56.265625, x: 115.4375, y: 157 },
            { height: 30, width: 72.78125, x: 175.296875, y: 157 },
            { height: 30, width: 66.015625, x: 0, y: 188 },
          ]
        : [
            { height: 31, width: 111.84375, x: 0, y: 130 },
            { height: 31, width: 56.265625, x: 115.4375, y: 130 },
            { height: 30, width: 72.78125, x: 175.296875, y: 130 },
            { height: 30, width: 66.015625, x: 251.671875, y: 130 },
          ],
    );
    await buttons.nth(2).hover();
    await expect(buttons.nth(2)).toHaveCSS("border-bottom", "1px solid rgb(243, 108, 34)");
    await expect(buttons.nth(2)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(buttons.nth(2)).toHaveCSS("color", "rgb(0, 0, 0)");
    await buttons.nth(3).focus();
    await expect(buttons.nth(3)).toHaveCSS("border-bottom", "1px solid rgb(243, 108, 34)");
    await expect(buttons.nth(3)).toHaveCSS("color", "rgb(0, 0, 0)");

    const panes = [
      "left-sidebar-recentlyVisited",
      "left-sidebar-createdByMe",
      "left-sidebar-watching",
      "left-sidebar-joinmember",
    ];
    for (let index = 0; index < panes.length; index += 1) {
      await buttons.nth(index).click();
      await expect(buttons.nth(index)).toHaveAttribute("aria-pressed", "true");
      await expect(items.nth(index)).not.toHaveClass(/active/);
      for (let paneIndex = 0; paneIndex < panes.length; paneIndex += 1) {
        const pane = page.locator(`#${panes[paneIndex]}`);
        if (paneIndex === index) await expect(pane).toBeVisible();
        else await expect(pane).toBeHidden();
      }
      await expect(buttons.nth(index)).toHaveCSS("background-color", "rgb(243, 108, 34)");
      await expect(buttons.nth(index)).toHaveCSS("color", "rgb(252, 252, 252)");
    }

    const search = projectPane.getByPlaceholder("Type name");
    await search.fill("member-project");
    await buttons.nth(3).click();
    await expect(
      page.locator(
        '#left-sidebar-joinmember > li[data-stylex-owner="left-sidebar-direct-project-rows"]',
      ),
    ).toBeVisible();
    await buttons.nth(0).click();
    await buttons.nth(3).click();
    await expect(search).toHaveValue("member-project");

    await expect(
      owner.locator('[data-stylex-owner="left-sidebar-direct-project-rows"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#sidebar [data-stylex-owner="authenticated-sidenav-project-subtabs"]'),
    ).toHaveCount(0);
    await leftSidebar.getByRole("button", { name: "Sidebar" }).click();
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    await page.locator("#mySidenav .myProjectList > button").click();
    const rightOwner = page.locator(
      '#mySidenav [data-stylex-owner="authenticated-sidenav-project-subtabs"]',
    );
    await expect(rightOwner).toBeVisible();
    await expect(rightOwner).toHaveClass(/subtab-wrap/);
    await expect(rightOwner.locator(":scope > ul.nav-subtab.unstyled")).toHaveCount(1);
    await expect(
      page.locator('#mySidenav [data-stylex-owner="left-sidebar-project-subtabs"]'),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}

test("left Project subtabs preserve Korean legacy copy and order", async ({ page }) => {
  await installAuthenticatedHome(page, "ko-KR");
  await page.goto(`${BASE_PATH}/`);
  await page.locator("#sidebar").getByRole("button", { exact: true, name: "프로젝트" }).click();
  await expect(
    page.locator('[data-stylex-owner="left-sidebar-project-subtabs"] > ul > li > button'),
  ).toHaveText(["최근 방문", "내가 만든", "지켜보는", "참여 중인"]);
});

test("left Project subtabs have complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const start = route.indexOf("const leftSidebarProjectSubtabStyles");
  const end = route.indexOf("const authenticatedSidenavProjectSubtabStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const owner = route.slice(start, end);
  for (const token of [
    "leftSidebarProjectSubtabSurface",
    "leftSidebarProjectSubtabText",
    "leftSidebarProjectSubtabAccent",
    "leftSidebarProjectSubtabActiveText",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(owner).toContain(`homeColors.${token}`);
    } else {
      expect(owner).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(owner).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|!important/i);
  expect(route).toContain('"left-sidebar-project-subtabs"');
});

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const list = element.firstElementChild as HTMLElement;
    const items = Array.from(list.children) as HTMLElement[];
    const buttons = items.map((item) => item.firstElementChild as HTMLElement);
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    };
    const itemBoxes = items.map(box);
    const presentationClasses = ["subtab-wrap", "subtab-group", "nav-subtab", "unstyled", "active"];
    return {
      activeIndex: buttons.findIndex((button) => button.getAttribute("aria-pressed") === "true"),
      geometry: {
        gaps: itemBoxes
          .slice(1)
          .map((item, index) => item.x - (itemBoxes[index].x + itemBoxes[index].width)),
        items: itemBoxes,
        list: box(list),
        wrap: box(element),
      },
      owner: element.getAttribute("data-stylex-owner"),
      pluginAttributes: [element, list, ...items, ...buttons].flatMap((target) =>
        Array.from(target.attributes, (attribute) => attribute.name).filter((name) =>
          /^(data-(toggle|target|action|href|url|placement|trigger)|data-request-)/.test(name),
        ),
      ),
      presentationClasses: [element, list, ...items, ...buttons].flatMap((target) =>
        presentationClasses.filter((className) => target.classList.contains(className)),
      ),
      styles: {
        buttons: buttons.map((button) => {
          const style = getComputedStyle(button);
          return {
            appearance: style.appearance,
            backgroundColor: style.backgroundColor,
            borderBottomColor: style.borderBottomColor,
            borderBottomStyle: style.borderBottomStyle,
            borderBottomWidth: style.borderBottomWidth,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            color: style.color,
            cursor: style.cursor,
            display: style.display,
            fontSize: style.fontSize,
            height: box(button).height,
            lineHeight: style.lineHeight,
            margin: style.margin,
            padding: style.padding,
          };
        }),
        items: items.map((item) => {
          const style = getComputedStyle(item);
          return {
            borderStyle: style.borderStyle,
            borderWidth: style.borderWidth,
            display: style.display,
            marginLeft: style.marginLeft,
          };
        }),
        list: {
          backgroundColor: getComputedStyle(list).backgroundColor,
          color: getComputedStyle(list).color,
          display: getComputedStyle(list).display,
          listStyleType: getComputedStyle(list).listStyleType,
          margin: getComputedStyle(list).margin,
          padding: getComputedStyle(list).padding,
        },
        wrap: { padding: getComputedStyle(element).padding },
      },
      whitespaceNodes: Array.from(list.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent),
    };
  });
}

async function installAuthenticatedHome(page: Page, locale: "en-US" | "ko-KR") {
  await page.addInitScript(
    ({ basePath, locale }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "true");
      localStorage.setItem("sidebarActiveMenu", "myProjectList");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "",
        hideProjectListing: false,
        supportedLanguages: [locale],
      };
    },
    { basePath: BASE_PATH, locale },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: locale,
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  const project = (projectName: string) => ({
    ownerName: "outside",
    projectId: projectName,
    projectName,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [project("member-project")],
        organizations: [],
        ownProjects: [project("created-project")],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [project("recent-project")],
        watchedProjects: [project("watched-project")],
      },
    }),
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
