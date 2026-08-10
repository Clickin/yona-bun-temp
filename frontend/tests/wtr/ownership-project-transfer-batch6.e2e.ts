import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/transfer.tsx", import.meta.url);
const legacyTransfer = new URL(
  "../../yona-original/app/views/project/transfer.scala.html",
  import.meta.url,
);
const legacySettingMenu = new URL(
  "../../yona-original/app/views/project/partial_settingmenu.scala.html",
  import.meta.url,
);
const legacyPageLess = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyResponsiveLess = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);

test("batch 6 transfer restores the legacy box-wrap bottom shell", async () => {
  const [route, transfer, settingMenu, pageLess, responsiveLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyTransfer, "utf8"),
    readFile(legacySettingMenu, "utf8"),
    readFile(legacyPageLess, "utf8"),
    readFile(legacyResponsiveLess, "utf8"),
  ]);

  expect(transfer).toContain("partial_settingmenu(project)");
  expect(settingMenu).toContain('id="subMenuProjectTransfer"');
  expect(pageLess).toContain(".box-wrap");
  expect(pageLess).toContain("padding-bottom:12px");
  expect(pageLess).toContain("text-align: center");
  expect(responsiveLess).toContain(".box-wrap");
  expect(responsiveLess).toContain("padding: 10px 0 !important");
  expect(route).toContain('className="box-wrap bottom"');
  expect(route).toContain('data-owner="project-transfer-action-box"');
  expect(route).toContain("setIsTransferModalOpen(true)");
  expect(route).not.toContain("$yobi.loadModule");
});

test("batch 6 transfer keeps bottom geometry and modal behavior on desktop/mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockTransfer(page);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/transfer`, { waitUntil: "commit" });

    const actionBox = page.locator('[data-owner="project-transfer-action-box"]');
    const action = page.locator('[data-owner="project-transfer-action"]').last();
    await expect(actionBox).toHaveClass(/\bbox-wrap\b/u);
    await expect(actionBox).toHaveClass(/\bbottom\b/u);
    await expect(action).toBeVisible();
    await expect(page.locator("#accept")).not.toBeChecked();

    const geometry = await actionBox.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        bottom: rect.bottom,
        height: rect.height,
        padding: style.padding,
        textAlign: style.textAlign,
        borderBottom: style.borderBottom,
      };
    });
    expect(geometry.textAlign).toBe("center");
    expect(geometry.borderBottom).toMatch(/0px/u);
    expect(geometry.height).toBeGreaterThan(31);
    expect(geometry.bottom).toBeGreaterThan(geometry.height);
    expect(geometry.padding).toBe(viewport.width <= 720 ? "10px 0px" : "20px 0px 12px");

    await action.click();
    await expect(page.locator("#alertTransfer")).toBeHidden();
    await page.locator("#accept").check();
    await action.click();
    await expect(page.locator("#alertTransfer")).toBeVisible();
    await page.locator('[data-owner="project-transfer-modal-footer"] button').last().click();
    await expect(page.locator("#alertTransfer")).toBeHidden();
  }
});

async function mockTransfer(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-transfer" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-transfer" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
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
      ownerName: "admin",
      projectName: "sample",
      vcs: "GIT",
      showCode: true,
      viewerCanUpdate: true,
      viewerCanWatch: false,
    };
    if (pathname.endsWith("/container") || pathname.endsWith("/settings")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
      return;
    }
    if (pathname.endsWith("/transfer") && route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ownerName: "admin",
          projectName: "sample",
          viewerCanTransfer: true,
        }),
      });
      return;
    }
    await route.fallback();
  });
}
