import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

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
  expect(ROUTE_SOURCE).toContain('<ProjectMenu active="board"');
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/container", async (route) => {
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
