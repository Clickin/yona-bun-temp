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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
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
        daysAgo: 14,
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
        overview: "Project issue parity route",
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
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            authorLabel: "Nori",
            authorLoginId: "nori",
            childClosedCount: 0,
            childIssues: [],
            childOpenCount: 0,
            commentCount: 3,
            dueDateLabel: "",
            dueDateOverdue: false,
            id: "101",
            issueNumber: "1",
            labels: [],
            milestoneTitle: "",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
            voterCount: 1,
            watcherCount: 0,
            weight: 0,
          },
        ],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ labels: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ milestones: [] }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
});

test("issue list vote count preserves the legacy common voteCount partial metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");

  await expect(page.locator("#issue-item-101")).toContainText("Pilot issue");
  await expect(page.locator("#issue-item-101 .vote-count.vote-color")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/1#vote",
  );
  await expect(page.locator("#issue-item-101 .vote-count .count-groups.item-icon")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .vote-count .yobicon-hearts")).toHaveCount(1);
  await expect(
    page.locator("#issue-item-101 .vote-count .count-groups.item-count.strong"),
  ).toHaveText("1");

  const group = await layoutBox(page, "#issue-item-101 .item-count-groups");
  const voteLink = await layoutBox(page, "#issue-item-101 .vote-count.vote-color");
  const voteIcon = await layoutBox(page, "#issue-item-101 .vote-count .count-groups.item-icon");
  const voteCount = await layoutBox(page, "#issue-item-101 .vote-count .count-groups.item-count");
  const voteStyles = await page.locator("#issue-item-101 .vote-count").evaluate((element) => {
    const groupElement = element.closest(".item-count-groups") as HTMLElement;
    const groupStyle = window.getComputedStyle(groupElement);
    const link = window.getComputedStyle(element);
    const icon = window.getComputedStyle(element.querySelector(".item-icon") as HTMLElement);
    const count = window.getComputedStyle(element.querySelector(".item-count") as HTMLElement);
    return {
      color: link.color,
      countPaddingRight: count.paddingRight,
      groupBorderTopWidth: groupStyle.borderTopWidth,
      groupLineHeight: groupStyle.lineHeight,
      iconFontSize: icon.fontSize,
      iconLineHeight: icon.lineHeight,
      iconPaddingTop: icon.paddingTop,
    };
  });

  expect(voteLink.x).toBeGreaterThanOrEqual(group.x);
  expect(voteLink.y).toBeGreaterThanOrEqual(group.y);
  expect(voteIcon.x).toBeGreaterThanOrEqual(voteLink.x);
  expect(voteCount.x).toBeGreaterThan(voteIcon.x);
  expect(Math.max(voteIcon.y, voteCount.y)).toBeLessThanOrEqual(
    Math.min(voteIcon.y + voteIcon.height, voteCount.y + voteCount.height),
  );
  expect(voteCount.x + voteCount.width).toBeLessThanOrEqual(voteLink.x + voteLink.width + 1);
  expect(voteStyles).toEqual({
    color: "rgb(243, 108, 34)",
    countPaddingRight: "5px",
    groupBorderTopWidth: "1px",
    groupLineHeight: "14px",
    iconFontSize: "9px",
    iconLineHeight: "12px",
    iconPaddingTop: "2px",
  });
});
