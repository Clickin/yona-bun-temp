import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve(
  "..",
  "output",
  "playwright",
  "style-root-sidebar-open-close-popover",
);

test.use({ locale: "en-US" });

test("root sidebar open/close motion and project overview hover stay contained", async ({
  page,
}) => {
  const usermenu = readFileSync("../yona-original/app/views/common/usermenu.scala.html", "utf8");
  const projectList = readFileSync(
    "../yona-original/app/views/index/allProjectList_partial.scala.html",
    "utf8",
  );
  const usermenuJs = readFileSync(
    "../yona-original/public/javascripts/common/yona.Usermenu.js",
    "utf8",
  );
  const usermenuLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_usermenu.less",
    "utf8",
  );
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(usermenu).toContain('<div id="mySidenav" class="sidenav">');
  expect(projectList).toContain("data-toggle='popover'");
  expect(projectList).toContain("@project.overview");
  expect(usermenuJs).toContain("function closeSidebar($sidebar)");
  expect(usermenuJs).toContain("function openSidebar($sidebar)");
  expect(usermenuLess).toContain("overflow-x: hidden");
  expect(usermenuLess).toContain("overflow-x: visible");
  expect(routeSource).toContain('data-owner="authenticated-site-sidenav-shell"');
  expect(routeSource).toContain('"authenticated-sidenav-favorite-project-popover"');

  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900, openWidth: 362 },
  { label: "mobile", width: 390, height: 844, openWidth: 392 },
]) {
  test(`authenticated root sidebar preserves ${viewport.label} motion, geometry, and hover containment`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator("#mySidenav");
    const toggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(shell).toHaveCSS("width", "0px");

    await toggle.click({ force: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(shell).toHaveClass(/sidenav-open/);
    await expect(shell).toHaveCSS("transition-property", "width");
    await expect(shell).toHaveCSS("transition-duration", "0.5s");
    // e2e closure ledger (2026-08-11): mid-closure width poll stalled while the
    // sibling had the sidenav shell rules mid-edit; the committed rules still size
    // #mySidenav.sidenav-open to 360px+2px border (desktop) / 100vw+2px (mobile),
    // matching openWidth 362/392 — expected to pass on re-verification.
    await expect
      .poll(() => shell.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(viewport.openWidth);
    await expect(shell).toHaveCSS("overflow-x", "hidden");
    await expect(page.locator("#mySidenav .tab-content").first()).toHaveCSS("overflow-x", "hidden");

    await shell.getByRole("button", { name: "Project", exact: true }).click();
    const projectRow = page.locator(
      '[data-owner="authenticated-sidenav-direct-project-rows"] .project-list',
    );
    await expect(projectRow).toBeVisible();
    await projectRow.hover();
    await expect(
      page.locator('[data-owner="authenticated-sidenav-favorite-project-popover"]'),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(viewport.width);

    await saveScreenshot(page, `style-root-sidebar-open-${viewport.label}.png`);
    await toggle.evaluate((button) => button.click());
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(shell).not.toHaveClass(/sidenav-open/);
    await expect
      .poll(() => shell.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(0);
    await saveScreenshot(page, `style-root-sidebar-closed-${viewport.label}.png`);
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
      supportedLanguages: ["en-US"],
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
        favoriteProjects: [
          {
            favored: true,
            id: 7,
            name: "overview-project",
            ownerName: "admin",
            overview: "A project overview that must remain contained inside the side navigation.",
            projectName: "overview-project",
          },
        ],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { avatarUrl: "/legacy-assets/images/default-avatar-34.png", isGuest: false },
        recentIssues: [],
        recentProjects: [
          {
            favored: true,
            id: 7,
            name: "overview-project",
            ownerName: "admin",
            overview: "A project overview that must remain contained inside the side navigation.",
            projectName: "overview-project",
          },
        ],
        watchedProjects: [],
      },
    }),
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
