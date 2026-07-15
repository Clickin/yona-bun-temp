import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SHELL = '[data-stylex-owner="framed-site-shell"]';
const MAIN = '[data-stylex-owner="framed-site-main"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("framed SiteLayout shell has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const framedSiteShellStyles");
  const end = route.indexOf("const siteFooterStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

  for (const token of [
    "framedSiteWidth",
    "framedSiteMinWidth",
    "framedSiteMainSurface",
    "framedSiteOpenDisplay",
    "framedSiteOpenHeight",
    "framedSiteOpenOverflow",
    "framedSiteMainFlex",
    "framedSiteMainAutoWidth",
    "framedSiteMainOverflowY",
    "framedSiteMobilePosition",
    "framedSiteMobileDisplay",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles.replaceAll('"@media (max-width: 720px)"', '"@media (mobile)"')).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu,
  );

  expect(route).toContain('data-stylex-owner="framed-site-shell"');
  expect(route).toContain('data-stylex-owner="framed-site-main"');
  expect(route).toContain('data-sidebar-open={showLeftSidebar ? "true" : "false"}');
  expect(route).not.toContain("legacy-framed-shell");
  expect(route).not.toContain("legacy-framed-main");
  expect(appCss).not.toContain(".legacy-framed-shell");
  expect(appCss).not.toContain(".legacy-framed-main");
  expect(appCss).toContain(
    'body:has([data-stylex-owner="framed-site-shell"][data-sidebar-open="true"])',
  );
  expect(appCss).toContain("open frame must lock its global body scroll container");
  expect(appCss.match(/body:has\(\[data-stylex-owner="framed-site-shell"\]/gu)).toHaveLength(1);
});

test("frozen framed SiteLayout sources and generated fallback stay byte-identical", () => {
  for (const [path, hash] of [
    [
      "../yona-original/app/views/layout_framed.scala.html",
      "2ce473f736ddc366996962fcd3e3bb51810369f85a6d7447ea2b38459d827872",
    ],
    [
      "../yona-original/app/views/siteLayout_framed.scala.html",
      "a109e051762a425c8a491ba42d080487f19b3aadbf02f554ff9ee695d052db13",
    ],
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
      "public/legacy-assets/stylesheets/legacy-fallback.css",
      "6417f445da50d93038d5d8b970e75aabc69f0bba2928655ab419ce7da337a16f",
    ],
  ]) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(hash);
  }

  const manifest = JSON.parse(
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.manifest.json", "utf8"),
  ) as {
    layeredViteInputs: Array<{
      input: string;
      sourceFiles: Array<{ path: string; sha256: string }>;
    }>;
  };
  const appCssSource = manifest.layeredViteInputs
    .find(({ input }) => input === "frontend/src/app.css")
    ?.sourceFiles.find(({ path }) => path === "frontend/src/app.css");
  expect(appCssSource?.sha256).toBe(
    createHash("sha256").update(readFileSync("src/app.css")).digest("hex"),
  );
});

for (const viewport of [
  { height: 900, label: "desktop", openMainWidth: 1095, sidebarWidth: 271, width: 1366 },
  { height: 844, label: "mobile", openMainWidth: 390, sidebarWidth: 318.6875, width: 390 },
]) {
  test(`framed SiteLayout shell preserves ${viewport.label} closed and open states`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page, false);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator(SHELL);
    const main = shell.locator(`:scope > ${MAIN}`);
    await expect(shell).toHaveAttribute("data-sidebar-open", "false");
    await expect(main).toBeVisible();
    expect(await readShell(page)).toEqual({
      bodyOverflow: "auto scroll",
      horizontalOverflow: false,
      main: {
        backgroundColor: "rgb(255, 255, 255)",
        height: await main.evaluate((element) => element.getBoundingClientRect().height),
        overflowY: "visible",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      shell: {
        display: "block",
        height: await shell.evaluate((element) => element.getBoundingClientRect().height),
        minWidth: "0px",
        overflow: "visible",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      sidebar: null,
    });

    await shell.getByRole("button", { name: "Sidebar" }).click();
    await expect(shell).toHaveAttribute("data-sidebar-open", "true");
    const open = await readShell(page);
    expect(open).toEqual({
      bodyOverflow: "hidden",
      horizontalOverflow: false,
      main: {
        backgroundColor: "rgb(255, 255, 255)",
        height: viewport.height,
        overflowY: "auto",
        width: viewport.openMainWidth,
        x: viewport.label === "desktop" ? viewport.sidebarWidth : 0,
        y: 0,
      },
      shell: {
        display: viewport.label === "desktop" ? "flex" : "block",
        height: viewport.height,
        minWidth: "0px",
        overflow: "hidden",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      sidebar: {
        contained: true,
        height: viewport.height,
        width: viewport.sidebarWidth,
        x: 0,
        y: 0,
      },
    });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: false,
      path: resolve(SCREENSHOT_DIRECTORY, `stylex-framed-site-shell-${viewport.label}-open.png`),
    });

    await page
      .getByRole("complementary", { name: "Sidebar" })
      .getByRole("button", { name: "Sidebar" })
      .click();
    await expect(shell).toHaveAttribute("data-sidebar-open", "false");
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0);
  });
}

test("framed SiteLayout paint is isolated from removed presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page, true);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(SHELL).evaluate((shell) => {
    const main = shell.firstElementChild?.matches("#sidebar")
      ? (shell.children[1] as HTMLElement)
      : (shell.firstElementChild as HTMLElement);
    const snapshot = () => {
      const shellStyle = getComputedStyle(shell);
      const mainStyle = getComputedStyle(main);
      return {
        main: [
          mainStyle.backgroundColor,
          mainStyle.flex,
          mainStyle.height,
          mainStyle.overflowY,
          mainStyle.width,
        ],
        shell: [
          shellStyle.display,
          shellStyle.height,
          shellStyle.minWidth,
          shellStyle.overflow,
          shellStyle.width,
        ],
      };
    };
    const before = snapshot();
    const shellGeneratedClasses = [...shell.classList];
    const mainGeneratedClasses = [...main.classList];
    shell.classList.add("legacy-framed-shell", "is-open");
    main.classList.add("legacy-framed-main");
    const withRemovedPresentationClasses = snapshot();
    shell.className = "legacy-framed-shell is-open";
    main.className = "legacy-framed-main";
    const stripped = snapshot();
    return {
      before,
      mainGeneratedClasses,
      shellGeneratedClasses,
      stripped,
      withRemovedPresentationClasses,
    };
  });
  expect(result.shellGeneratedClasses.length).toBeGreaterThan(0);
  expect(result.mainGeneratedClasses.length).toBeGreaterThan(0);
  expect(result.withRemovedPresentationClasses).toEqual(result.before);
  expect(result.stripped).not.toEqual(result.before);
});

async function readShell(page: Page) {
  return page.evaluate(
    ({ mainSelector, shellSelector }) => {
      const shell = document.querySelector<HTMLElement>(shellSelector);
      const main = document.querySelector<HTMLElement>(mainSelector);
      const sidebar = document.querySelector<HTMLElement>("#sidebar");
      if (!shell || !main) throw new Error("Expected framed SiteLayout owners are missing.");
      const shellBox = shell.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      const shellStyle = getComputedStyle(shell);
      const mainStyle = getComputedStyle(main);
      const sidebarBox = sidebar?.getBoundingClientRect();
      return {
        bodyOverflow: getComputedStyle(document.body).overflow,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        main: {
          backgroundColor: mainStyle.backgroundColor,
          height: mainBox.height,
          overflowY: mainStyle.overflowY,
          width: mainBox.width,
          x: mainBox.x,
          y: mainBox.y,
        },
        shell: {
          display: shellStyle.display,
          height: shellBox.height,
          minWidth: shellStyle.minWidth,
          overflow: shellStyle.overflow,
          width: shellBox.width,
          x: shellBox.x,
          y: shellBox.y,
        },
        sidebar: sidebarBox
          ? {
              contained:
                sidebarBox.left >= shellBox.left &&
                sidebarBox.right <= shellBox.right &&
                sidebarBox.top >= shellBox.top &&
                sidebarBox.bottom <= shellBox.bottom,
              height: sidebarBox.height,
              width: sidebarBox.width,
              x: sidebarBox.x,
              y: sidebarBox.y,
            }
          : null,
      };
    },
    { mainSelector: MAIN, shellSelector: SHELL },
  );
}

async function installAuthenticatedHome(page: Page, sidebarOpen: boolean) {
  await page.addInitScript(
    ({ basePath, open }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", String(open));
      localStorage.setItem("sidebarActiveMenu", "myProjectList");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "",
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, open: sidebarOpen },
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
        preferredLanguage: "en-US",
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
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}
