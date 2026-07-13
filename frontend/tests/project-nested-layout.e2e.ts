import { expect, test, type Page } from "@playwright/test";

test("project home to issues keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-home-header")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectShellGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/issues']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/issues(?:\?|$)/);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".project-home-header")).toHaveCount(0);
  await expectProjectShellNodesToPersist(page);
  await expectProjectShellGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectShellGeometry(page);
});

test("project issues to branches keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/issues`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectShellGeometry(page);

  await page.evaluate(() => {
    history.pushState({}, "", `${location.pathname.replace(/\/issues$/, "/branches")}`);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/admin\/sample\/branches(?:\?|$)/);
  await expect(page.locator(".branch-list-wrap")).toBeVisible();
  await expect(page.locator(".project-menu-gruop .code-menu")).toHaveClass(/active/);
  await expectProjectShellNodesToPersist(page);
  await expectProjectBranchesGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".branch-list-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectBranchesGeometry(page);
});

test("project branches to milestones keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/branches`);
  await expect(page.locator(".branch-list-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectBranchesGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/milestones']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/milestones(?:\?|$)/);
  await expect(page.locator(".project-menu-gruop li").filter({ hasText: "Milestone" })).toHaveClass(
    /active/,
  );
  await expect(page.locator(".page-wrap-outer .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectMilestonesGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".page-wrap-outer .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectMilestonesGeometry(page);
});

test("project milestones to posts keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/milestones`);
  await expect(page.locator(".page-wrap-outer .error-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectMilestonesGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/posts']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/posts(?:\?|$)/);
  await expect(page.locator(".project-menu-gruop li").filter({ hasText: "Board" })).toHaveClass(
    /active/,
  );
  await expect(page.locator(".post-list.project-page-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPostsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".post-list.project-page-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPostsGeometry(page);
});

test("project posts to new post form keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/posts`);
  await expect(page.locator(".post-list.project-page-wrap .error-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectPostsGeometry(page);

  await page.evaluate(() => {
    history.pushState({}, "", `${location.pathname.replace(/\/posts$/, "/postform")}`);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/admin\/sample\/postform(?:\?|$)/);
  await expect(page.locator("#title")).toBeVisible();
  await expect(page.locator("#editor-body-body")).toBeVisible();
  await expect(
    page.locator(".project-menu-gruop li", {
      has: page.locator("a[href$='/admin/sample/posts']"),
    }),
  ).toHaveClass(/active/);
  await expectProjectShellNodesToPersist(page);
  await expectProjectPostFormGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#title")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPostFormGeometry(page);
});

test("project milestones to new milestone form keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/milestones`);
  await expect(page.locator(".page-wrap-outer .error-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectMilestonesGeometry(page);

  await page.locator(".tab-wrap a[href$='/admin/sample/newMilestoneForm']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/newMilestoneForm(?:\?|$)/);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li").filter({ hasText: "Milestone" })).toHaveClass(
    /active/,
  );
  await expectProjectShellNodesToPersist(page);
  await expectProjectMilestoneCreateGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectMilestoneCreateGeometry(page);
});

test("project posts to pull requests keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/posts`);
  await expect(page.locator(".post-list.project-page-wrap .error-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectPostsGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/pullRequests']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/pullRequests(?:\?|$)/);
  await expect(
    page.locator(".project-menu-gruop li", {
      has: page.locator("a[href$='/admin/sample/pullRequests']"),
    }),
  ).toHaveClass(/active/);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expect(page.locator(".post-list-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);
});

test("project open pull requests to closed pull requests keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/pullRequests`);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectPullRequestsGeometry(page);

  await page.locator(".pullrequeset-tab-menu a[href*='/admin/sample/closedPullRequests']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/closedPullRequests(?:\?|$)/);
  await expect(
    page.locator(".pullrequeset-tab-menu li", {
      has: page.locator("a[href*='/admin/sample/closedPullRequests']"),
    }),
  ).toHaveClass(/active/);
  await expect(page.locator(".post-list-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);
});

test("project open pull requests to sent pull requests keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page, { isForkedFromOrigin: true });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/pullRequests`);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectPullRequestsGeometry(page);

  await page.locator(".pullrequeset-tab-menu a[href*='/admin/sample/sentPullRequests']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/sentPullRequests(?:\?|$)/);
  await expect(
    page.locator(".pullrequeset-tab-menu li", {
      has: page.locator("a[href*='/admin/sample/sentPullRequests']"),
    }),
  ).toHaveClass(/active/);
  await expect(page.locator(".post-list-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectPullRequestsGeometry(page);
});

test("project pull requests to reviews keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/pullRequests`);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectPullRequestsGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/reviews']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/reviews(?:\?|$)/);
  await expect(
    page.locator(".project-menu-gruop li", {
      has: page.locator("a[href$='/admin/sample/reviews']"),
    }),
  ).toHaveClass(/active/);
  await expect(page.locator(".review-list-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectReviewsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".review-list-wrap .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectReviewsGeometry(page);
});

test("project reviews to settings keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/reviews`);
  await expect(page.locator(".review-list-wrap .error-wrap")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectReviewsGeometry(page);

  await page.locator(".project-setting a[href$='/admin/sample/setting']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/setting(?:\?|$)/);
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator(".project-setting li")).toHaveClass(/active/);
  await expectProjectShellNodesToPersist(page);
  await expectProjectSettingsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectSettingsGeometry(page);
});

test("project settings to members keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator("#saveSetting")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectSettingsGeometry(page);

  await page.locator("#subMenuProjectMember a[href$='/admin/sample/members']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/members(?:\?|$)/);
  await expect(page.locator("#subMenuProjectMember")).toHaveClass(/active/);
  await expect(page.locator(".members.project")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectMembersGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".members.project")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectMembersGeometry(page);
});

test("project members to webhooks keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator(".members.project")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectMembersGeometry(page);

  await page.locator("#subMenuWebhook a[href$='/admin/sample/webhooks']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/webhooks(?:\?|$)/);
  await expect(page.locator("#subMenuWebhook")).toHaveClass(/active/);
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expect(page.locator("#webhooksList .error-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectWebhooksGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectWebhooksGeometry(page);
});

test("project webhooks to transfer keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectWebhooksGeometry(page);

  await page.locator("#subMenuProjectTransfer a[href$='/admin/sample/transfer']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/transfer(?:\?|$)/);
  await expect(page.locator("#subMenuProjectTransfer")).toHaveClass(/active/);
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectTransferGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectTransferGeometry(page);
});

test("project transfer to delete keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectTransferGeometry(page);

  await page.locator("#subMenuProjectDelete a[href$='/admin/sample/deleteform']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/deleteform(?:\?|$)/);
  await expect(page.locator("#subMenuProjectDelete")).toHaveClass(/active/);
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectDeleteGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectDeleteGeometry(page);
});

test("project delete to change VCS keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/deleteform`);
  await expect(page.locator("#btnDelete")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectDeleteGeometry(page);

  await page.locator("#subMenuProjectChangeVCS a[href$='/admin/sample/changeVCS']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/changeVCS(?:\?|$)/);
  await expect(page.locator("#subMenuProjectChangeVCS")).toHaveClass(/active/);
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectChangeVcsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectChangeVcsGeometry(page);
});

test("project change VCS to issue labels keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectChangeVcsGeometry(page);

  await page.evaluate(() => {
    history.pushState({}, "", `${location.pathname.replace(/\/changeVCS$/, "/issue/labelsform")}`);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/admin\/sample\/issue\/labelsform(?:#|\?|$)/);
  await expect(page.locator("#subMenuIssueLabel")).toHaveClass(/active/);
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#labelsList")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectLabelsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectLabelsGeometry(page);
});

async function captureProjectShellNodes(page: Page) {
  await page.evaluate(() => {
    const shell = {
      gnb: document.querySelector(".gnb-outer"),
      header: document.querySelector(".project-header-outer"),
      menu: document.querySelector(".project-menu-outer"),
    };
    if (!shell.gnb || !shell.header || !shell.menu) throw new Error("Missing project layout shell");
    (window as Window & { __projectLayoutShell?: typeof shell }).__projectLayoutShell = shell;
  });
}

async function expectProjectShellNodesToPersist(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const previous = (
          window as Window & { __projectLayoutShell?: Record<string, Element | null> }
        ).__projectLayoutShell;
        return Boolean(
          previous &&
          previous.gnb === document.querySelector(".gnb-outer") &&
          previous.header === document.querySelector(".project-header-outer") &&
          previous.menu === document.querySelector(".project-menu-outer"),
        );
      }),
    )
    .toBe(true);
}

async function expectProjectShellGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      gnbBottom: gnb.bottom,
      gnbLeft: gnb.left,
      gnbRight: gnb.right,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerLeft: header.left,
      headerRight: header.right,
      headerTop: header.top,
      menuLeft: menu.left,
      menuRight: menu.right,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbTop).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuTop).toBeGreaterThanOrEqual(metrics.headerTop);
  expect(metrics.gnbLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.headerLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.menuLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.menuRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectBranchesGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const table = rect(".branch-list-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      gnbBottom: gnb.bottom,
      gnbLeft: gnb.left,
      gnbRight: gnb.right,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerLeft: header.left,
      headerRight: header.right,
      headerTop: header.top,
      menuLeft: menu.left,
      menuRight: menu.right,
      menuTop: menu.top,
      tableLeft: table.left,
      tableRight: table.right,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbTop).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuTop).toBeGreaterThanOrEqual(metrics.headerTop);
  expect(metrics.gnbLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.headerLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.menuLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.menuRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.tableLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.tableRight).toBeGreaterThan(metrics.tableLeft);
}

async function expectProjectMilestonesGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const empty = rect(".error-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      emptyBottom: empty.bottom,
      emptyLeft: empty.left,
      emptyRight: empty.right,
      emptyTop: empty.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.emptyTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.emptyBottom).toBeGreaterThan(metrics.emptyTop);
  expect(metrics.emptyLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.emptyRight).toBeLessThanOrEqual(metrics.bodyRight + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectMilestoneCreateGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const body = rect(".project-page-wrap");
    const form = rect("#milestone-form");
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const title = rect("#title");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      titleBottom: title.bottom,
      titleLeft: title.left,
      titleRight: title.right,
      titleTop: title.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.titleTop).toBeGreaterThanOrEqual(metrics.formTop);
  expect(metrics.titleBottom).toBeGreaterThan(metrics.titleTop);
  expect(metrics.titleLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.titleRight).toBeLessThanOrEqual(metrics.bodyRight + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectPostFormGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const body = rect(".project-page-wrap");
    const form = rect(".project-page-wrap form.nm");
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const title = rect("#title");
    const editor = rect("#editor-body-body");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      editorBottom: editor.bottom,
      editorTop: editor.top,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      titleBottom: title.bottom,
      titleLeft: title.left,
      titleRight: title.right,
      titleTop: title.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.titleTop).toBeGreaterThanOrEqual(metrics.formTop);
  expect(metrics.titleBottom).toBeGreaterThan(metrics.titleTop);
  expect(metrics.titleLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.titleRight).toBeLessThanOrEqual(metrics.bodyRight + 1);
  expect(metrics.editorTop).toBeGreaterThanOrEqual(metrics.titleBottom);
  expect(metrics.editorBottom).toBeGreaterThan(metrics.editorTop);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectPostsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".post-list.project-page-wrap");
    const search = rect(".search-wrap.underline");
    const empty = rect(".post-list.project-page-wrap .error-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      emptyBottom: empty.bottom,
      emptyTop: empty.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      searchBottom: search.bottom,
      searchTop: search.top,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.searchTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.searchBottom).toBeGreaterThan(metrics.searchTop);
  expect(metrics.emptyTop).toBeGreaterThanOrEqual(metrics.searchBottom);
  expect(metrics.emptyBottom).toBeGreaterThan(metrics.emptyTop);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectPullRequestsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".pullrequeset-tab-menu");
    const empty = rect(".post-list-wrap .error-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      emptyBottom: empty.bottom,
      emptyLeft: empty.left,
      emptyRight: empty.right,
      emptyTop: empty.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.emptyTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.emptyBottom).toBeGreaterThan(metrics.emptyTop);
  expect(metrics.emptyLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.emptyRight).toBeLessThanOrEqual(metrics.bodyRight + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectReviewsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const filters = rect(".issue-list-wrap .filters");
    const empty = rect(".review-list-wrap .error-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      emptyBottom: empty.bottom,
      emptyLeft: empty.left,
      emptyRight: empty.right,
      emptyTop: empty.top,
      filtersBottom: filters.bottom,
      filtersTop: filters.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.filtersTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.filtersBottom).toBeGreaterThan(metrics.filtersTop);
  expect(metrics.emptyTop).toBeGreaterThanOrEqual(metrics.filtersBottom);
  expect(metrics.emptyBottom).toBeGreaterThan(metrics.emptyTop);
  expect(metrics.emptyLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
  expect(metrics.emptyRight).toBeLessThanOrEqual(metrics.bodyRight + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectSettingsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const form = rect("#saveSetting");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
}

async function expectProjectMembersGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const members = rect(".members.project");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      membersBottom: members.bottom,
      membersTop: members.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.membersTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.membersBottom).toBeGreaterThan(metrics.membersTop);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function expectProjectWebhooksGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap.webhook-editor-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const form = rect("#formNewWebhook");
    const list = rect("#webhooksList");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      listBottom: list.bottom,
      listTop: list.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.listTop).toBeGreaterThanOrEqual(metrics.formBottom);
  expect(metrics.listBottom).toBeGreaterThan(metrics.listTop);
}

async function expectProjectTransferGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const form = rect(".bubble-wrap.gray.wp");
    const action = rect("#btnTransfer");
    return {
      actionBottom: action.bottom,
      actionTop: action.top,
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.actionTop).toBeGreaterThanOrEqual(metrics.formBottom);
  expect(metrics.actionBottom).toBeGreaterThan(metrics.actionTop);
}

async function expectProjectDeleteGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const form = rect(".bubble-wrap.gray.wp");
    const action = rect("#btnDelete");
    return {
      actionBottom: action.bottom,
      actionTop: action.top,
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.actionTop).toBeGreaterThanOrEqual(metrics.formBottom);
  expect(metrics.actionBottom).toBeGreaterThan(metrics.actionTop);
}

async function expectProjectChangeVcsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const form = rect(".bubble-wrap.gray.wp");
    const action = rect("#btnChangeVCS");
    return {
      actionBottom: action.bottom,
      actionTop: action.top,
      bodyLeft: body.left,
      bodyRight: body.right,
      formBottom: form.bottom,
      formTop: form.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.formTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.formBottom).toBeGreaterThan(metrics.formTop);
  expect(metrics.actionTop).toBeGreaterThanOrEqual(metrics.formBottom);
  expect(metrics.actionBottom).toBeGreaterThan(metrics.actionTop);
}

async function expectProjectLabelsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap.label-editor-wrap");
    const tabs = rect(".project-page-wrap .nav-tabs");
    const copy = rect("#copyLabel");
    const create = rect("#frmNewLabel");
    const list = rect("#labelsList");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      copyBottom: copy.bottom,
      copyTop: copy.top,
      createBottom: create.bottom,
      createTop: create.top,
      gnbBottom: gnb.bottom,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerTop: header.top,
      listBottom: list.bottom,
      listTop: list.top,
      menuBottom: menu.bottom,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      tabsBottom: tabs.bottom,
      tabsTop: tabs.top,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuBottom).toBeGreaterThan(metrics.menuTop);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsTop).toBeGreaterThanOrEqual(metrics.menuBottom);
  expect(metrics.tabsBottom).toBeGreaterThan(metrics.tabsTop);
  expect(metrics.copyTop).toBeGreaterThanOrEqual(metrics.tabsBottom);
  expect(metrics.copyBottom).toBeGreaterThan(metrics.copyTop);
  expect(metrics.createTop).toBeGreaterThanOrEqual(metrics.copyBottom);
  expect(metrics.createBottom).toBeGreaterThan(metrics.createTop);
  expect(metrics.listTop).toBeGreaterThanOrEqual(metrics.createBottom);
  expect(metrics.listBottom).toBeGreaterThan(metrics.listTop);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function mockProjectHomeAndIssues(
  page: Page,
  { isForkedFromOrigin = false }: { isForkedFromOrigin?: boolean } = {},
) {
  await page.route("**/api/auth/session", async (route) =>
    route.fulfill({
      body: JSON.stringify({ session: { csrfToken: "csrf" }, user: { id: 1, loginId: "admin" } }),
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf" },
    }),
  );
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ body: JSON.stringify(body), contentType: "application/json" });
    if (path.endsWith("/session"))
      return json({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      });
    if (path.endsWith("/workspace")) return json({ profile: {} });
    if (path.endsWith("/container"))
      return json({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin,
        isPrivate: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 0,
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      });
    if (path.endsWith("/milestones")) return json({ milestones: [] });
    if (path.endsWith("/projects/admin/sample/posts/form-options")) return json({ labels: [] });
    if (path.endsWith("/projects/admin/sample/posts"))
      return json({
        items: [],
        notices: [],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        readme: null,
        totalCount: 0,
      });
    if (path.endsWith("/labels")) return json({ labels: [] });
    if (path.endsWith("/assignable-users") || path.endsWith("/issue-search-users"))
      return json({ items: [], total: 0, truncated: false });
    if (path.endsWith("/projects/admin/sample/issues"))
      return json({
        closedIssueCount: 0,
        draftItems: [],
        items: [],
        openIssueCount: 0,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 0,
        totalPages: 0,
      });
    if (path.endsWith("/projects/admin/sample/branches"))
      return json({
        branches: [
          {
            commitDate: "2026-07-13",
            commitId: "1234567890abcdef",
            commitShortId: "1234567",
            isDefault: true,
            name: "main",
            pullRequest: null,
            shortName: "main",
          },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      });
    if (path.endsWith("/projects/admin/sample/pull-requests"))
      return json({
        acceptedCount: 0,
        category: "open",
        closedCount: 0,
        contributors: [],
        currentUserId: 1,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 15,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 0,
      });
    if (path.endsWith("/projects/admin/sample/reviews"))
      return json({
        allCount: 0,
        authorCount: 0,
        closedCount: 0,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 15,
        participantCount: 0,
        state: "open",
        totalCount: 0,
      });
    if (path.endsWith("/owners/admin/projects/sample/settings"))
      return json({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        defaultReviewerCount: 2,
        id: 7,
        isCodeAccessibleMemberOnly: false,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isUsingReviewerCount: true,
        logoUrl: "/assets/images/project_default_logo.png",
        maxReviewerCount: 3,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Sample overview",
        ownerName: "admin",
        postCount: 0,
        projectName: "sample",
        projectScope: "PUBLIC",
        reviewCount: 0,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerCanWatch: false,
        watchCount: 0,
      });
    if (path.endsWith("/owners/admin/projects/sample/members"))
      return json({
        enrollmentRequests: [],
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            isOwner: true,
            loginId: "admin",
            role: "manager",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        ownerName: "admin",
        projectName: "sample",
        roleOptions: [
          { label: "Manager", role: "manager" },
          { label: "Member", role: "member" },
        ],
        viewerCanUpdate: true,
      });
    if (path.endsWith("/owners/admin/projects/sample/webhooks"))
      return json({ viewerCanUpdate: true, webhooks: [] });
    if (path.endsWith("/projects/admin/sample/change-vcs"))
      return json({
        currentVcs: "GIT",
        nextVcs: "Subversion",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      });
    return json({});
  });
}
