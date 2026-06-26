import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

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
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(milestonePayload("open")),
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
