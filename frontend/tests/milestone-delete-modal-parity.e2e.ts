import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

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

function milestonePayload(state: "closed" | "open" = "open") {
  return {
    milestone: {
      attachments: [
        {
          id: "701",
          name: "milestone-plan.txt",
          url: "/yona/files/701",
        },
      ],
      closedIssueCount: state === "closed" ? 1 : 0,
      closedIssues:
        state === "closed"
          ? [
              {
                assigneeLabel: "Nori",
                commentCount: 1,
                issueNumber: "1",
                labels: [],
                state: "closed",
                title: "Open milestone issue",
                updatedLabel: "2026-04-15",
              },
            ]
          : [],
      completionPercent: state === "closed" ? 100 : 0,
      contentsHtml: "",
      contentsMarkdown: "Ship milestone delete modal parity",
      dueDateLabel: "2026-05-09",
      id: "7",
      issueReferences: [],
      mentionReferences: [],
      openIssueCount: state === "open" ? 1 : 0,
      openIssues:
        state === "open"
          ? [
              {
                assigneeLabel: "Nori",
                commentCount: 1,
                issueNumber: "1",
                labels: [],
                state: "open",
                title: "Open milestone issue",
                updatedLabel: "2026-04-15",
              },
            ]
          : [],
      state,
      title: "v1.0",
      viewerCanDelete: true,
      viewerCanUpdate: true,
    },
  };
}

function milestoneListPayload() {
  const open = milestonePayload("open").milestone;
  return {
    milestones: [
      {
        ...open,
        completionPercent: 25,
        id: "7",
        openIssueCount: 3,
        title: "v1.0",
        untilLabel: "D-12",
      },
      {
        ...milestonePayload("closed").milestone,
        id: "8",
        title: "v0.9",
      },
    ],
  };
}

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
        session: null,
        user: null,
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
        actorId: "11",
        defaultLandingPath: "/me",
        emailAddress: "nori@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "nori",
        userLabel: "Nori",
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project milestone parity route",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  let milestoneState: "closed" | "open" = "open";

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(milestoneListPayload()),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones\/7(?:\/state)?$/,
    async (route) => {
      if (route.request().method() === "PATCH" && route.request().url().endsWith("/state")) {
        const body = route.request().postDataJSON() as { state?: "closed" | "open" };
        milestoneState = body.state ?? milestoneState;
      }
      await route.fulfill({
        body: JSON.stringify(milestonePayload(milestoneState)),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
});

test("milestone list keeps legacy tabs, filters, progress, and issue alignment", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/milestones?state=all&orderBy=dueDate&orderDir=asc");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".tab-wrap .nav-tabs li.active a")).toHaveText("All");
  await expect(page.locator(".filter-wrap.milestone .filters .filter.active")).toContainText(
    "Due Date",
  );
  await expect(page.locator(".milestones > .milestone")).toHaveCount(2);
  await expect(page.locator(".milestones .milestone-name").first()).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/milestone/7",
  );
  await expect(page.locator(".milestones .completion-rate").first()).toHaveText("25%");
  await expect(page.locator(".milestones .progress .bar").first()).toHaveAttribute(
    "style",
    "width: 25%;",
  );
  await expect(page.locator(".milestones .issue-link").first()).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/1",
  );

  const navbar = await layoutBox(page, ".gnb-outer.project-header");
  const header = await layoutBox(page, ".project-header-outer");
  const projectMenu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const tabWrap = await layoutBox(page, ".tab-wrap");
  const createButton = await layoutBox(page, ".tab-wrap .btns .ybtn-success");
  const tabs = await layoutBox(page, ".tab-wrap .nav-tabs");
  const filterWrap = await layoutBox(page, ".filter-wrap.milestone");
  const filters = await layoutBox(page, ".filter-wrap.milestone .filters");
  const search = await layoutBox(page, ".filter-wrap.milestone .search-bar");
  const list = await layoutBox(page, ".milestones");
  const firstItem = await layoutBox(page, ".milestones > .milestone:first-child");
  const meta = await layoutBox(page, ".milestones > .milestone:first-child .meta-info");
  const progress = await layoutBox(page, ".milestones > .milestone:first-child .progress-wrap");
  const issueLink = await layoutBox(page, ".milestones > .milestone:first-child .issue-link");

  expect(Math.round(header.height)).toBe(120);
  expect(navbar.y).toBeGreaterThanOrEqual(header.y);
  expect(navbar.y + navbar.height).toBeLessThanOrEqual(header.y + header.height + 1);
  expect(projectMenu.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(Math.round(projectMenu.height)).toBe(40);
  expect(pageWrap.y).toBeGreaterThanOrEqual(projectMenu.y + projectMenu.height - 1);
  expect(projectPage.width).toBeGreaterThanOrEqual(1100);

  expect(tabWrap.x).toBeCloseTo(projectPage.x, 0);
  expect(tabWrap.width).toBeCloseTo(projectPage.width, 0);
  expect(createButton.x).toBeGreaterThan(projectPage.x + projectPage.width * 0.8);
  expect(createButton.y).toBeGreaterThanOrEqual(tabWrap.y);
  expect(createButton.y + createButton.height).toBeLessThanOrEqual(tabWrap.y + tabWrap.height + 1);
  expect(filterWrap.y).toBeGreaterThan(tabWrap.y + tabWrap.height - 1);
  expect(filters.x).toBeGreaterThanOrEqual(filterWrap.x);
  expect(search.x).toBeGreaterThanOrEqual(filterWrap.x);
  expect(Math.abs(filters.x - search.x)).toBeGreaterThan(100);
  expect(Math.abs(filters.y - search.y)).toBeLessThanOrEqual(filterWrap.height);

  expect(list.y).toBeGreaterThan(filterWrap.y + filterWrap.height - 1);
  expect(firstItem.x).toBeCloseTo(list.x, 0);
  expect(firstItem.width).toBeCloseTo(list.width, 0);
  expect(meta.y).toBeGreaterThanOrEqual(firstItem.y);
  expect(progress.y).toBeGreaterThan(meta.y);
  expect(issueLink.y).toBeGreaterThan(progress.y + progress.height - 1);
});

test("milestone detail delete opens and closes the legacy confirmation modal", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/milestone/7");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".milestone-desc .attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        fileHref: "/yona/files/701",
        fileId: 701,
        fileName: "milestone-plan.txt",
      },
    ]),
  );
  await expect(page.locator(".milestone-desc .attached-file")).toHaveAttribute("data-id", "701");
  await expect(page.locator(".milestone-desc .attached-file .name")).toHaveText(
    "milestone-plan.txt",
  );

  await page.locator(".actrow .ybtn", { hasText: "Delete" }).click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete milestone");
  await page.locator("#deleteConfirm").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#deleteConfirm")).toBeHidden();
});

test("milestone detail preserves the project issue shell on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/yona/admin/projectYobi/milestone/7");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".span3.hide-in-mobile")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .post-item.title")).toBeVisible();
});

test("milestone create form keeps invalid submit validation in React before REST", async ({
  page,
}) => {
  let createRequestCount = 0;

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones$/,
    async (route) => {
      createRequestCount += 1;
      await route.fulfill({
        body: JSON.stringify(milestonePayload("open")),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/admin/projectYobi/newMilestoneForm");

  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator('.upload-wrap[data-resource-type="MILESTONE"]')).toBeVisible();

  await page.locator('#milestone-form button[type="submit"]').click();
  await expect(page.locator("#title")).toHaveClass(/error/);
  await expect(page.locator("#title + .message")).toHaveText(
    "Milestone title is a required field.",
  );
  expect(createRequestCount).toBe(0);

  await page.locator("#title").fill("v1.1");
  await page.locator('#milestone-form button[type="submit"]').click();
  await expect(
    page
      .locator("#editor-contents-content-body")
      .locator("xpath=ancestor::dd[1]/div[contains(@class, 'message')]"),
  ).toHaveText("Milestone description is a required field");
  expect(createRequestCount).toBe(0);

  await page.locator("#editor-contents-content-body").fill("Milestone validation body");
  await page.locator("#dueDate").fill("05/09/2026");
  await page.locator('#milestone-form button[type="submit"]').click();
  await expect(page.locator("#dueDate")).toHaveClass(/error/);
  await expect(page.locator("#dueDate").locator("xpath=../following-sibling::div[1]")).toHaveText(
    "Invalid format. Enter the due date in YYYY-MM-DD format.",
  );
  expect(createRequestCount).toBe(0);
});

test("milestone detail close and reopen use REST callbacks and render returned state", async ({
  page,
}) => {
  await page.goto("/yona/admin/projectYobi/milestone/7");

  await expect(page.locator(".badge-issue-open")).toHaveText("Open");
  await expect(page.locator(".actrow .ybtn", { hasText: "Close milestone" })).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/milestone/7/close",
  );

  const closeRequest = page.waitForRequest(
    (request) => request.url().endsWith("/milestones/7/state") && request.method() === "PATCH",
  );
  await page.locator(".actrow .ybtn", { hasText: "Close milestone" }).click();
  const closeMutation = await closeRequest;
  expect(closeMutation.headers()["x-csrf-token"]).toBe("csrf-123");
  expect(closeMutation.postDataJSON()).toEqual({ state: "closed" });
  await expect(page.locator(".badge-issue-closed")).toHaveText("Closed");
  await expect(page.locator(".actrow .ybtn", { hasText: "Close milestone" })).toHaveCount(0);
  await expect(page.locator(".actrow .ybtn", { hasText: "Open" })).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/milestone/7/open",
  );

  const openRequest = page.waitForRequest(
    (request) => request.url().endsWith("/milestones/7/state") && request.method() === "PATCH",
  );
  await page.locator(".actrow .ybtn", { hasText: "Open" }).click();
  const openMutation = await openRequest;
  expect(openMutation.headers()["x-csrf-token"]).toBe("csrf-123");
  expect(openMutation.postDataJSON()).toEqual({ state: "open" });
  await expect(page.locator(".badge-issue-open")).toHaveText("Open");
  await expect(page.locator(".actrow .ybtn", { hasText: "Close milestone" })).toBeVisible();
});
