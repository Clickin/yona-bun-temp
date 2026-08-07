import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber.tsx", import.meta.url),
  "utf8",
);

test("project board detail missing post preserves the legacy project error shell on desktop and mobile", async ({
  page,
}) => {
  expect(ROUTE_SOURCE).toContain("function ProjectPostNotFoundTitle");
  expect(ROUTE_SOURCE).toContain("function ProjectPostNotFoundBody");
  expect(ROUTE_SOURCE).toContain('t("error.notfound.board_post")');
  // F6 copy-fix: the post route no longer renders <ProjectMenu> directly — it
  // renders inside ProjectHomeRouteShell, which maps postDetail -> "board"
  // ($projectName.tsx:1196-1197); the DOM still renders the Board menu active.
  expect(ROUTE_SOURCE).toContain("ProjectNestedShellContext");
  expect(ROUTE_SOURCE).not.toContain("ProjectMenu");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(ROUTE_SOURCE).not.toContain("document.");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockMissingProjectPost(page);

  await page.goto(`${basePath}/weblabs/portal/post/1`);

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("Board");
  await expect(page.locator(".project-page-wrap > .error-wrap")).toBeVisible();
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText("Post does not exist");
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveText("List");
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/posts`,
  );
  await expect(page).toHaveTitle("Page not found - weblabs/portal");
  await expect(page.locator(".board-view")).toHaveCount(0);

  const desktop = await shellMetrics(page);
  expect(desktop.errorPaddingBlock).toBe(200);
  expect(desktop.errorMessageFontSize).toBe("16px");
  expect(desktop.errorMessageFontWeight).toBe("700");
  expect(desktop.headerBottom).toBeLessThanOrEqual(desktop.menuTop);
  expect(desktop.menuBottom).toBeLessThanOrEqual(desktop.errorTop);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await shellMetrics(page);
  expect(mobile.documentScrollWidth).toBe(390);
  expect(mobile.headerRight).toBeLessThanOrEqual(390);
  expect(mobile.menuRight).toBeLessThanOrEqual(390);
  expect(mobile.errorRight).toBeLessThanOrEqual(390);
  expect(mobile.headerBottom).toBeLessThanOrEqual(mobile.menuTop);
  expect(mobile.menuBottom).toBeLessThanOrEqual(mobile.errorTop);
});

test("project board edit missing post renders the legacy site error shell on desktop and mobile", async ({
  page,
}) => {
  expect(ROUTE_SOURCE).toContain("function ProjectPostEditNotFoundTitle");
  expect(ROUTE_SOURCE).toContain("function ProjectPostEditNotFoundBody");
  expect(ROUTE_SOURCE).toContain('t("error.internalServerError")');
  expect(ROUTE_SOURCE).toContain('<i className="ico-404"></i>');

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockMissingProjectPost(page);
  await page.goto(`${basePath}/weblabs/portal/post/1/editform`);

  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".project-header-outer")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .error-wrap")).toBeVisible();
  await expect(page.locator(".error-wrap > .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "Server error occurred; service is not available",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveText("Home");
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
  await expect(page).toHaveTitle("Server error occurred; service is not available");
  await expect(page.locator(".board-view")).toHaveCount(0);
  await expect(page.locator("form.nm")).toHaveCount(0);

  const desktop = await siteErrorMetrics(page);
  expect(desktop.errorPaddingBlock).toBe(200);
  expect(desktop.errorMessageFontSize).toBe("16px");
  expect(desktop.errorMessageFontWeight).toBe("700");
  expect(desktop.navBottom).toBeLessThanOrEqual(desktop.errorTop);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await siteErrorMetrics(page);
  expect(mobile.documentScrollWidth).toBe(390);
  expect(mobile.navRight).toBeLessThanOrEqual(390);
  expect(mobile.errorRight).toBeLessThanOrEqual(390);
  expect(mobile.navBottom).toBeLessThanOrEqual(mobile.errorTop);
});

async function mockMissingProjectPost(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultLandingPath: "/",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 2,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        projectScope: "protected",
        vcs: "GIT",
        viewerCanUpdate: false,
      }),
    });
  });
  await page.route("**/api/v1/projects/weblabs/portal/posts/1", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 404,
      body: JSON.stringify({
        error: { code: "not_found", message: "Post does not exist", status: 404 },
      }),
    });
  });
}

async function shellMetrics(page: Page) {
  return page.evaluate(() => {
    const header = required(".project-header-outer").getBoundingClientRect();
    const menu = required(".project-menu-outer").getBoundingClientRect();
    const error = required(".project-page-wrap > .error-wrap").getBoundingClientRect();
    const errorStyle = getComputedStyle(required(".project-page-wrap > .error-wrap"));
    const messageStyle = getComputedStyle(required(".error-wrap p"));
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      errorMessageFontSize: messageStyle.fontSize,
      errorMessageFontWeight: messageStyle.fontWeight,
      errorPaddingBlock:
        Math.round(Number.parseFloat(errorStyle.paddingTop)) +
        Math.round(Number.parseFloat(errorStyle.paddingBottom)),
      errorRight: Math.round(error.right),
      errorTop: Math.round(error.top),
      headerBottom: Math.round(header.bottom),
      headerRight: Math.round(header.right),
      menuBottom: Math.round(menu.bottom),
      menuRight: Math.round(menu.right),
      menuTop: Math.round(menu.top),
    };

    function required(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element;
    }
  });
}

async function siteErrorMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = required("[data-stylex-owner=global-gnb-outer]").getBoundingClientRect();
    const error = required(".project-page-wrap > .error-wrap").getBoundingClientRect();
    const errorStyle = getComputedStyle(required(".project-page-wrap > .error-wrap"));
    const messageStyle = getComputedStyle(required(".error-wrap p"));
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      errorMessageFontSize: messageStyle.fontSize,
      errorMessageFontWeight: messageStyle.fontWeight,
      errorPaddingBlock:
        Math.round(Number.parseFloat(errorStyle.paddingTop)) +
        Math.round(Number.parseFloat(errorStyle.paddingBottom)),
      errorRight: Math.round(error.right),
      errorTop: Math.round(error.top),
      navBottom: Math.round(nav.bottom),
      navRight: Math.round(nav.right),
    };

    function required(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element;
    }
  });
}
