import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;
const PROJECT_ADMIN_RAW_KEY_PATTERN = /\b(?:project|button)\.[a-z][A-Za-z0-9_.-]*/;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function assertNoProjectAdminRawKeys(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(PROJECT_ADMIN_RAW_KEY_PATTERN);
}

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

const projectContainerPayload = (viewerCanUpdate = true) => ({
  backgroundUrl: "",
  boardCount: 0,
  cloneUrl: "",
  codeMemberOnly: false,
  currentMilestone: null,
  defaultTab: "readme",
  enrollmentRequested: false,
  isFavorited: false,
  isForked: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [
    {
      avatarUrl: "",
      loginId: "owner",
      role: "manager",
      userLabel: "Owner",
    },
  ],
  openIssueCount: 0,
  openPullRequestCount: 0,
  organizationName: "",
  originOwnerName: "",
  originProjectName: "",
  overview: "delete parity",
  overviewEditable: viewerCanUpdate,
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: viewerCanUpdate,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate,
  viewerCanWatch: true,
  watchCount: 0,
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "owner" },
        user: { loginId: "owner" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "owner@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "owner",
        userLabel: "Owner",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("project deleteform preserves the legacy confirmation shell and deletes by REST", async ({
  page,
}) => {
  let deleted = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi"), async (route) => {
    if (route.request().method() === "DELETE") {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
      deleted = true;
      await route.fulfill({
        body: JSON.stringify({ ok: true, redirectPath: "/" }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/owner/projectYobi/deleteform");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await assertNoProjectAdminRawKeys(page);
  await expect(page.locator("#subMenuProjectDelete")).toHaveClass(/active/);
  await expect(page.locator(".bubble-wrap.gray.wp .cu-label")).toHaveText("Delete project");
  await expect(page.locator(".bubble-wrap.gray.wp .cu-desc .notice")).toContainText(
    "Once you delete the project",
  );
  await expect(page.locator("#accept")).toBeVisible();

  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const settingMenu = await layoutBox(
    page,
    ".page-wrap-outer > .project-page-wrap > .nav.nav-tabs",
  );
  const deleteBubble = await layoutBox(page, ".bubble-wrap.gray.wp");
  const deleteLabel = await layoutBox(page, ".bubble-wrap.gray.wp .cu-label");
  const deleteDescription = await layoutBox(page, ".bubble-wrap.gray.wp .cu-desc");
  const acceptCheckbox = await layoutBox(page, "#accept");
  const acceptLabel = await layoutBox(page, "label[for='accept']");
  const bottomActions = await layoutBox(page, ".box-wrap.bottom");
  const deleteButton = await layoutBox(page, "#btnDelete");

  expect(deleteBubble.y).toBeGreaterThan(settingMenu.y + settingMenu.height - 1);
  expect(deleteBubble.x).toBeGreaterThanOrEqual(projectPage.x);
  expect(deleteBubble.width).toBeLessThanOrEqual(projectPage.width + 1);
  expect(deleteLabel.x).toBeGreaterThanOrEqual(deleteBubble.x);
  expect(deleteDescription.x).toBeGreaterThan(deleteLabel.x + deleteLabel.width - 1);
  expect(deleteDescription.width).toBeGreaterThan(deleteLabel.width);
  expect(acceptLabel.x).toBeGreaterThan(acceptCheckbox.x + acceptCheckbox.width - 1);
  expect(Math.abs(acceptLabel.y - acceptCheckbox.y)).toBeLessThanOrEqual(6);
  expect(bottomActions.y).toBeGreaterThan(deleteBubble.y + deleteBubble.height - 1);
  expect(deleteButton.x).toBeGreaterThanOrEqual(bottomActions.x);
  expect(deleteButton.y).toBeGreaterThanOrEqual(bottomActions.y);

  await page.locator("#btnDelete").click();
  await expect(page.getByRole("alert")).toContainText("You should agree to delete this project.");
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  await page.locator("#accept").check();
  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).not.toHaveClass(/hide/);
  const modal = await layoutBox(page, "#alertDeletion");
  const modalHeader = await layoutBox(page, "#alertDeletion .modal-header");
  const modalBody = await layoutBox(page, "#alertDeletion .modal-body");
  const modalFooter = await layoutBox(page, "#alertDeletion .modal-footer");
  const confirmButton = await layoutBox(page, "#btnDeleteExec");
  const cancelButton = await layoutBox(
    page,
    "#alertDeletion .modal-footer .ybtn:not(#btnDeleteExec)",
  );

  expect(modal.width).toBeGreaterThan(300);
  expect(Math.abs(modalHeader.y - modal.y)).toBeLessThanOrEqual(1);
  expect(modalBody.y).toBeGreaterThan(modalHeader.y + modalHeader.height - 1);
  expect(modalFooter.y).toBeGreaterThan(modalBody.y + modalBody.height - 1);
  expect(confirmButton.x).toBeLessThan(cancelButton.x);
  expect(Math.abs(confirmButton.y - cancelButton.y)).toBeLessThanOrEqual(2);
  await page.locator("#btnDeleteExec").click();

  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/yona\/me$/);
});

test("project deleteform shows the forbidden shell for non-updaters", async ({ page }) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload(false)),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/deleteform");
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await assertNoProjectAdminRawKeys(page);
  await expect(page.locator("#btnDelete")).toHaveCount(0);
});
