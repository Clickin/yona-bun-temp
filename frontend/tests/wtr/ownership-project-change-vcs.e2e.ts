import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const SOURCE = readFileSync("../src/routes/$ownerName/$projectName/changeVCS.tsx", "utf8");

test("project change-VCS default and confirmation states retain legacy output with Style owners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  page.on("dialog", (dialog) => dialog.dismiss());
  await mockChangeVcs(page);
  await page.goto(`${basePath}/admin/sample/changeVCS`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle("Repository Change - admin/sample");
  await expect(page.locator('[data-owner="project-change-vcs-bubble"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="project-change-vcs-notice"]')).toHaveCount(2);
  await expect(page.locator("#acceptChangeVCS")).not.toBeChecked();
  await expect(page.locator('[data-owner="project-change-vcs-open-button"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-change-vcs-modal"]')).not.toBeVisible();

  await page.locator('[data-owner="project-change-vcs-open-button"]').click();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="project-change-vcs-modal"]')).not.toBeVisible();

  await page.locator("#acceptChangeVCS").check();
  await page.locator('[data-owner="project-change-vcs-open-button"]').click();
  const modal = page.locator('[data-owner="project-change-vcs-modal"]');
  await expect(modal).toBeVisible();
  await expect(page.locator('[data-owner="project-change-vcs-modal-header"] h3')).toContainText(
    "Subversion",
  );
  await expect(page.locator('[data-owner="project-change-vcs-modal-footer"] button')).toHaveCount(
    2,
  );
  await expect(page.locator('[data-owner="project-change-vcs-backdrop"]')).toBeVisible();
  await expect(
    page.locator('[data-toggle="modal"], [data-dismiss="modal"], [data-request-method]'),
  ).toHaveCount(0);

  const metrics = await page
    .locator('[data-owner="project-change-vcs-bubble"]')
    .evaluate((bubble) => ({
      background: getComputedStyle(bubble).backgroundColor,
      width: Math.round(bubble.getBoundingClientRect().width),
      noticeColor: getComputedStyle(
        bubble.querySelector("[data-owner='project-change-vcs-notice']")!,
      ).color,
    }));
  expect(metrics.background).toBe("rgb(247, 247, 247)");
  expect(metrics.width).toBeGreaterThan(0);
  expect(metrics.noticeColor).toBe("rgb(219, 58, 103)");

  expect(SOURCE).not.toContain('data-toggle="modal"');
  expect(SOURCE).not.toContain('data-dismiss="modal"');
  expect(SOURCE).not.toContain("$yobi.loadModule");
});

async function mockChangeVcs(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-change-vcs" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectPayload()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/change-vcs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectPayload()),
    });
  });
}

function projectPayload() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    currentVcs: "GIT",
    enrolledUsers: [{ id: 1 }, { id: 2 }],
    enrollmentRequestCount: 5,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    boardCount: 1,
    nextVcs: "Subversion",
    openIssueCount: 1,
    ownerName: "admin",
    projectScope: "public",
    projectName: "sample",
    vcs: "GIT",
    viewerCanChange: true,
    viewerIsProjectMember: true,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}
