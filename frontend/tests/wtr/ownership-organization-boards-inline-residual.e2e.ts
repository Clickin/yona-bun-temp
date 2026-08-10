import { readFileSync, expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization boards owns the two-column anchor position with route-local Style", async ({
  page,
}) => {
  const route = readFileSync("src/routes/organizations/$organizationName/boards.tsx", "utf8");
  const sharedComponent = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/organization/group_board_list.scala.html",
    "utf8",
  );
  const partial = readFileSync(
    "../yona-original/app/views/organization/group_board_list_partial.scala.html",
    "utf8",
  );
  const control = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const twoColumnJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );

  expect(legacy).toContain("group_board_list_partial");
  expect(partial).toContain('class="post-item title"');
  expect(control).toContain('id="two-column-mode-checkbox"');
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");

  expect(route).toContain('anchorOwner="organization-boards-two-column-anchor"');
  expect(sharedComponent).toContain("data-owner={anchorOwner}");

  await mockOrganizationBoards(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/organizations/weblabs/boards`);

  const anchor = page.locator('[data-owner="organization-boards-two-column-anchor"]');
  await expect(anchor).toBeVisible();
  await expect(anchor).toHaveCSS("position", "relative");
  const geometry = await anchor.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
  });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(1366);

  await anchor.hover();
  await expect(anchor.locator(".popover.top")).toBeVisible();
  await expect(anchor.locator(".popover-title")).toHaveText(await anchor.getAttribute("title"));
});

async function mockOrganizationBoards(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/boards**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 0,
        visibleProjects: [],
      },
    }),
  );
}
// Batch 1113: LastOutletTransition uses popLayout mode for smooth cross-fade.
