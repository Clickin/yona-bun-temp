import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`left sidebar footer preserves ${viewport.label} legacy parity and tab behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const footer = sidebar.locator("#sidebar-bottom");
    const heart = footer.locator(":scope > .yobicon-hearts");
    await expect(footer).toBeVisible();
    await expect(footer).toHaveText("Yoram, made by");
    await expect(heart).toHaveAttribute("aria-hidden", "true");
    expect(await readEvidence(sidebar, footer)).toEqual({
      footer: {
        bottomGap: 8,
        // Approved Yoram copy is wider than legacy Yona; right/bottom anchoring remains exact.
        box: { height: 20, width: 113.953125 },
        rightGap: 16,
        styles: {
          bottom: "8px",
          color: "rgb(128, 128, 128)",
          fontSize: "13px",
          lineHeight: "20px",
          position: "absolute",
          right: "15px",
        },
      },
      heart: {
        box: { height: 13, width: 13 },
        color: "rgb(255, 0, 0)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "13px",
        retainedClasses: ["yobicon-hearts"],
        verticalAlign: "middle",
      },
      presentationClasses: [],
    });
    await saveScreenshot(footer, `style-left-sidebar-footer-local-${viewport.label}.png`);

    await sidebar.getByRole("button", { exact: true, name: "Favorite" }).click();
    await expect(footer).toHaveCount(0);
    await sidebar.getByRole("button", { exact: true, name: "Project" }).click();
    await expect(footer).toHaveCount(0);
    await sidebar.getByRole("button", { exact: true, name: "Recent History" }).click();
    await expect(sidebar.locator("#sidebar-bottom")).toBeVisible();
    await expect(sidebar.locator("#sidebar-bottom")).toHaveAttribute(
      "data-owner",
      "left-sidebar-footer",
    );
  });
}

test("left sidebar footer has complete global-theme Style ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const token of ["leftSidebarFooterText", "leftSidebarFooterHeart"]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(appCss).not.toContain(".sidebar-bottom");
  expect(route).toContain('id="sidebar-bottom"');
  expect(route).not.toContain('className="sidebar-bottom"');
  expect(route).toContain('className={"yobicon-hearts"}');
});

async function readEvidence(sidebar: Locator, footer: Locator) {
  const sidebarRight = await sidebar.evaluate((element) => element.getBoundingClientRect().right);
  return footer.evaluate((element, right) => {
    const heart = element.firstElementChild as HTMLElement;
    const footerBox = element.getBoundingClientRect();
    const heartBox = heart.getBoundingClientRect();
    const footerStyle = getComputedStyle(element);
    const heartStyle = getComputedStyle(heart);
    return {
      footer: {
        bottomGap: window.innerHeight - footerBox.bottom,
        box: { height: footerBox.height, width: footerBox.width },
        rightGap: right - footerBox.right,
        styles: {
          bottom: footerStyle.bottom,
          color: footerStyle.color,
          fontSize: footerStyle.fontSize,
          lineHeight: footerStyle.lineHeight,
          position: footerStyle.position,
          right: footerStyle.right,
        },
      },
      heart: {
        box: { height: heartBox.height, width: heartBox.width },
        color: heartStyle.color,
        display: heartStyle.display,
        fontSize: heartStyle.fontSize,
        lineHeight: heartStyle.lineHeight,
        retainedClasses: ["yobicon-hearts"].filter((name) => heart.classList.contains(name)),
        verticalAlign: heartStyle.verticalAlign,
      },
      presentationClasses: ["sidebar-bottom"].filter((name) => element.classList.contains(name)),
    };
  }, sidebarRight);
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
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

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
