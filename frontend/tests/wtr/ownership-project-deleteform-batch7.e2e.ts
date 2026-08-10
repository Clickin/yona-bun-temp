import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";

const project = {
  enrolledUsers: [],
  id: 7,
  isForkedFromOrigin: false,
  isProtected: false,
  menuSetting: {
    board: true,
    code: true,
    issue: true,
    milestone: true,
    pullRequest: true,
    review: true,
  },
  organizationName: "",
  ownerName: "admin",
  projectName: "sample",
  vcs: "GIT",
  showCode: true,
  viewerCanUpdate: true,
  viewerCanWatch: false,
};

test("deleteform batch 7 preserves the legacy bottom action wrapper", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/deleteform.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/project/delete.scala.html", "utf8");
  const settingMenu = readFileSync(
    "../yona-original/app/views/project/partial_settingmenu.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(legacy).toContain('<div class="box-wrap bottom">');
  expect(settingMenu).toContain("subMenuProjectDelete");
  expect(pageLess).toContain(".box-wrap {");
  expect(pageLess).toContain("&.bottom {");
  expect(route).toContain('className="box-wrap bottom"');
  expect(route).not.toContain("data-toggle=");
  expect(route).not.toContain("data-dismiss=");
  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("dangerouslySetInnerHTML");
});

test(`deleteform batch 7 preserves action geometry and React modal state ${fallbackOff ? "fallback-off" : "normal"}`, async ({
  page,
}) => {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-delete" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/settings") || pathname.endsWith("/container")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin/sample/deleteform");
  if (fallbackOff) {
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }

  const action = page.locator('div[data-owner="project-delete-action"]');
  const actionButton = page.locator("#btnDelete");
  const modal = page.locator("#alertDeletion");
  await expect(action).toHaveClass(/box-wrap/u);
  await expect(action).toHaveClass(/bottom/u);
  await expect(actionButton).toBeVisible();
  await expect(modal).toBeHidden();

  const desktop = await action.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      bottom: box.bottom,
      left: box.left,
      paddingBottom: style.paddingBottom,
      paddingTop: style.paddingTop,
      right: box.right,
      width: box.width,
    };
  });
  expect(desktop.width).toBeGreaterThan(0);
  expect(desktop.left).toBeGreaterThanOrEqual(0);
  expect(desktop.right).toBeLessThanOrEqual(1366);
  expect(desktop.paddingTop).toBe("20px");
  expect(desktop.paddingBottom).toBe("12px");

  await page.locator("#accept").check();
  await actionButton.click();
  await expect(modal).toBeVisible();
  await expect(page.locator('[data-owner="project-delete-modal-backdrop"]')).toBeVisible();
  await page.locator('[data-owner="project-delete-modal-footer"] button').last().click();
  await expect(modal).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(action).toBeVisible();
  const mobile = await page.evaluate(() => ({
    actionWidth: document.querySelector<HTMLElement>(".box-wrap.bottom")?.getBoundingClientRect()
      .width,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(mobile.actionWidth).toBe(390);
  expect(mobile.documentWidth).toBeLessThanOrEqual(mobile.viewportWidth);
});
