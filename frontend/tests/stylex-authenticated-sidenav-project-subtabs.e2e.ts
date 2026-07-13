import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated side-nav project subtabs use global StyleX color variables", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/theme.stylex.ts", "utf8");
  const start = routeSource.indexOf("const authenticatedSidenavProjectSubtabStyles");
  const end = routeSource.indexOf("function SidebarProjectList", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const ownerSource = routeSource.slice(start, end);
  expect(ownerSource).toContain("stylex.create");
  expect(ownerSource).toContain("globalColors.sidenavSubtabSurface");
  expect(ownerSource).toContain("globalColors.sidenavSubtabText");
  expect(ownerSource).toContain("globalColors.sidenavSubtabAccent");
  expect(ownerSource).toContain("globalColors.sidenavSubtabActiveText");
  expect(ownerSource).not.toMatch(/#[\da-f]{3,8}\b|\brgb\(|\bhsl\(/i);
  expect(themeSource).toContain("stylex.defineVars");
  expect(routeSource).toContain('"authenticated-sidenav-project-subtabs"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900, wrapWidth: 350, wrapX: 1015 },
  { label: "mobile", width: 390, height: 844, wrapWidth: 390, wrapX: 9 },
]) {
  test(`authenticated side-nav project subtabs preserve ${viewport.label} parity and React state`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    await page.locator("#sidebar-open-btn > button").click();
    await page.locator("#mySidenav .myProjectList > button").click();

    const owner = page.locator("#mySidenav #myProjectList .subtab-wrap.subtab-group");
    const list = owner.locator(":scope > ul.nav-subtab");
    const buttons = list.locator(":scope > li > button");
    await expect(owner).toBeVisible();
    await expect(buttons).toHaveText(["최근 방문", "내가 만든", "지켜보는", "참여 중인"]);

    const initial = await readEvidence(owner);
    console.log(`authenticated-sidenav-project-subtabs-${viewport.label}`, JSON.stringify(initial));
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-project-subtabs-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
    );

    expect(initial.hasOwner).toBe(true);
    expect(initial.activeIndex).toBe(0);
    expect(initial.geometry.wrap).toMatchObject({
      height: 46,
      width: viewport.wrapWidth,
      x: viewport.wrapX,
    });
    expect(initial.geometry.list).toMatchObject({ height: 31, width: 265.45, x: viewport.wrapX });
    expect(initial.styles.wrapPadding).toBe("10px 0px 5px");
    expect(initial.styles.list).toEqual({
      backgroundColor: "rgb(238, 238, 238)",
      color: "rgb(0, 0, 0)",
      display: "inline-block",
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
      height: 31,
    });
    expect(initial.styles.buttons[1]).toMatchObject({
      appearance: "none",
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottomStyle: "none",
      borderBottomWidth: "0px",
      boxShadow: "none",
      color: "rgb(0, 0, 0)",
      cursor: "pointer",
      display: "block",
      height: 30,
      margin: "0px",
      padding: "5px 8px",
    });
    expect(initial.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await buttons.nth(2).hover();
    await expect(buttons.nth(2)).toHaveCSS("border-bottom", "1px solid rgb(243, 108, 34)");
    await expect(buttons.nth(2)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(buttons.nth(2)).toHaveCSS("color", "rgb(0, 0, 0)");
    await buttons.nth(3).focus();
    await expect(buttons.nth(3)).toHaveCSS("border-bottom", "1px solid rgb(243, 108, 34)");
    await expect(buttons.nth(3)).toHaveCSS("color", "rgb(0, 0, 0)");

    const paneIds = ["recentlyVisited", "createdByMe", "watching", "joinmember"];
    for (let index = 0; index < paneIds.length; index += 1) {
      await buttons.nth(index).click();
      await expect(list.locator(":scope > li.active")).toHaveCount(1);
      await expect(list.locator(":scope > li").nth(index)).toHaveClass(/active/);
      for (let paneIndex = 0; paneIndex < paneIds.length; paneIndex += 1) {
        const pane = page.locator(`#${paneIds[paneIndex]}`);
        if (paneIndex === index) await expect(pane).toBeVisible();
        else await expect(pane).toBeHidden();
      }
      await expect(buttons.nth(index)).toHaveCSS("background-color", "rgb(243, 108, 34)");
      await expect(buttons.nth(index)).toHaveCSS("color", "rgb(252, 252, 252)");
    }

    await page.locator("#mySidenav #query").focus();
    await removeStyleXClasses(owner);
    const fallback = await readEvidence(owner);
    expect(fallback.hasOwner).toBe(true);
    expect(fallback.activeIndex).toBe(3);
    expect(fallback.styles.buttons[3]).toMatchObject({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      color: "rgb(0, 0, 0)",
      height: 31,
    });
    expect(fallback.geometry.list.height).toBe(31);
    expect(fallback.geometry.wrap.height).toBe(46);
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["ko-KR"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
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
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { avatarUrl: "/legacy-assets/images/default-avatar-34.png", isGuest: false },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const list = element.querySelector(":scope > ul.nav-subtab");
    if (!list) throw new Error("Project subtab list is missing");
    const items = Array.from(list.children) as HTMLElement[];
    const buttons = items.map((item) => item.querySelector("button"));
    if (buttons.some((button) => !button)) throw new Error("Project subtab button is missing");
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        height: Number(rect.height.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
      };
    };
    return {
      activeIndex: items.findIndex((item) => item.classList.contains("active")),
      geometry: { list: box(list), wrap: box(element) },
      hasOwner:
        element.getAttribute("data-stylex-owner") === "authenticated-sidenav-project-subtabs",
      styles: {
        buttons: buttons.map((button) => {
          const style = getComputedStyle(button!);
          return {
            appearance: style.appearance,
            backgroundColor: style.backgroundColor,
            borderBottomColor: style.borderBottomColor,
            borderBottomStyle: style.borderBottomStyle,
            borderBottomWidth: style.borderBottomWidth,
            boxShadow: style.boxShadow,
            color: style.color,
            cursor: style.cursor,
            display: style.display,
            height: box(button!).height,
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
        },
        wrapPadding: getComputedStyle(element).padding,
      },
      viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
    };
  });
}

async function removeStyleXClasses(owner: Locator) {
  await owner.evaluate((element) => {
    element.className = "subtab-wrap subtab-group";
    const list = element.querySelector(":scope > ul");
    if (!list) throw new Error("Project subtab list is missing");
    list.className = "nav-subtab unstyled";
    for (const item of Array.from(list.children)) {
      item.className = item.classList.contains("active") ? "active" : "";
      const button = item.querySelector("button");
      if (button) button.className = "";
    }
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
