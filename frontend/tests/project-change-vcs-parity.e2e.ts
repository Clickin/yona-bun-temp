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

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function assertNoProjectAdminRawKeys(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(PROJECT_ADMIN_RAW_KEY_PATTERN);
}

const projectContainerPayload = () => ({
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
  overview: "change VCS parity",
  overviewEditable: true,
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
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

test("project change VCS route preserves the legacy confirmation shell", async ({ page }) => {
  let changed = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/change-vcs"), async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
      changed = true;
      await route.fulfill({
        body: JSON.stringify({
          currentVcs: "Subversion",
          nextVcs: "GIT",
          ownerName: "owner",
          projectName: "projectYobi",
          redirectPath: "/owner/projectYobi",
          viewerCanChange: true,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        currentVcs: "GIT",
        nextVcs: "Subversion",
        ownerName: "owner",
        projectName: "projectYobi",
        viewerCanChange: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/changeVCS");
  await expect(page.locator("#subMenuProjectChangeVCS")).toHaveClass(/active/);
  await assertNoProjectAdminRawKeys(page);
  await expect(page.locator(".bubble-wrap h3")).toContainText("GIT");
  await expect(page.locator(".bubble-wrap h3")).toContainText("Subversion");
  await expect(page.locator("#acceptChangeVCS")).toBeVisible();

  const projectHeader = await layoutBox(page, ".project-header-outer");
  const projectMenu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const settingTabs = await layoutBox(page, ".project-page-wrap > .nav-tabs");
  const activeTab = await layoutBox(page, "#subMenuProjectChangeVCS");
  const bubble = await layoutBox(page, ".bubble-wrap.gray.wp");
  const heading = await layoutBox(page, ".bubble-wrap.gray.wp h3");
  const description = await layoutBox(page, ".bubble-wrap.gray.wp .cu-desc");
  const agreement = await layoutBox(page, "#acceptChangeVCS");
  const agreementLabel = await layoutBox(page, "label[for='acceptChangeVCS']");
  const actionRow = await layoutBox(page, ".box-wrap.bottom");
  const changeButton = await layoutBox(page, "#btnChangeVCS");

  expect(projectMenu.y).toBeGreaterThanOrEqual(projectHeader.y + projectHeader.height - 1);
  expect(pageWrap.y).toBeGreaterThanOrEqual(projectMenu.y + projectMenu.height - 1);
  expect(projectPage.width).toBeGreaterThanOrEqual(900);
  expect(settingTabs.x).toBeCloseTo(projectPage.x, 0);
  expect(settingTabs.width).toBeCloseTo(projectPage.width, 0);
  expect(activeTab.y).toBeGreaterThanOrEqual(settingTabs.y);
  expect(bubble.y).toBeGreaterThan(settingTabs.y + settingTabs.height - 1);
  expect(bubble.x).toBeCloseTo(projectPage.x, 0);
  expect(bubble.width).toBeCloseTo(projectPage.width, 0);
  expect(heading.x).toBeGreaterThanOrEqual(bubble.x);
  expect(description.y).toBeGreaterThan(heading.y + heading.height - 1);
  expect(agreementLabel.x).toBeGreaterThan(agreement.x + agreement.width - 1);
  expect(actionRow.y).toBeGreaterThan(bubble.y + bubble.height - 1);
  expect(changeButton.x).toBeGreaterThanOrEqual(actionRow.x);
  expect(changeButton.y).toBeGreaterThanOrEqual(actionRow.y);

  await page.locator("#btnChangeVCS").click();
  await expect(page.getByRole("alert")).toContainText(
    "You should agree with changing the repository type.",
  );
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/hide/);

  await page.locator("#acceptChangeVCS").check();
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).not.toHaveClass(/hide/);
  const modal = await layoutBox(page, "#alertChangeVCS");
  const modalHeader = await layoutBox(page, "#alertChangeVCS .modal-header");
  const modalBody = await layoutBox(page, "#alertChangeVCS .modal-body");
  const modalFooter = await layoutBox(page, "#alertChangeVCS .modal-footer");
  const confirmButton = await layoutBox(page, "#btnChangeVCSExec");

  expect(modal.width).toBeGreaterThanOrEqual(500);
  expect(modalHeader.y).toBeGreaterThanOrEqual(modal.y);
  expect(modalBody.y).toBeGreaterThan(modalHeader.y + modalHeader.height - 1);
  expect(modalFooter.y).toBeGreaterThan(modalBody.y + modalBody.height - 1);
  expect(confirmButton.y).toBeGreaterThanOrEqual(modalFooter.y);

  await page.locator("#btnChangeVCSExec").click();
  await expect.poll(() => changed).toBe(true);
});
