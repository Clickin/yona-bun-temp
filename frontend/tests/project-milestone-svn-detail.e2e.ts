import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const OWNER = "admin";
const PROJECT = "svnplayground";
const MILESTONE_ID = 1;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
});

test("SVN milestone detail preserves the canonical desktop hierarchy and interactions", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-13T00:00:00+09:00"));
  const stateRequests: unknown[] = [];
  await mockSvnMilestoneDetail(page, stateRequests);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/milestone/${MILESTONE_ID}`);

  await expect(page).toHaveTitle(`Parity launch - ${OWNER}/${PROJECT}`);
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop > li.active .menu-name")).toHaveText("마일스톤");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("Parity launch");
  await expect(page.locator(".due-date strong")).toHaveText("2026-07-31");
  await expect(page.locator(".milesion-wrap h4 .date")).toHaveText("(19일 남음)");
  await expect(page.locator(".milestone-desc .markdown-wrap")).toContainText(
    "Milestone for local legacy parity verification screens.",
  );
  await expect(page.locator(".actrow .ybtn")).toHaveText(["목록", "삭제", "수정", "마일스톤 종료"]);
  await expect(page.locator("#issues > .nav.nav-tabs > li")).toHaveText([
    "열림0",
    "닫힘0",
    "전체0",
  ]);
  await expect(page.locator("#mass-update-form > .btn-group")).toHaveCount(3);
  await expect(page.locator("#mass-update-form #state")).toHaveCount(1);
  await expect(page.locator("#mass-update-form #assignee")).toHaveCount(1);
  await expect(page.locator("#mass-update-form #milestone")).toHaveCount(0);
  await expect(page.locator("#mass-update-form #attaching-label")).toHaveCount(0);
  await expect(page.locator("#mass-update-form #detaching-label")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".post-item .infos-link-item")).toHaveText("Site Admin");
  await expect(page.locator(".post-item .infos > .infos-item").nth(1)).toHaveText("5일 전");
  await expect(page.locator(".post-item .infos > .infos-item").nth(1)).toHaveAttribute(
    "title",
    "2026-07-07 00:00:00",
  );
  await expect(page.locator(".post-item .yobicon-clock2 + .vmiddle")).toHaveText("12일");
  await expect(page.locator(".post-item .title-wrap > a.title").last()).toHaveText(
    "Review rail parity check",
  );

  const geometry = await readGeometry(page);
  expect(geometry.projectUtil.width).toBe(147);
  expect(geometry.projectMenu.width).toBe(410);
  expect(geometry.projectUtil.right).toBeLessThanOrEqual(geometry.projectHeader.right);
  expect(geometry.pageWrap.top).toBeGreaterThanOrEqual(geometry.projectMenuOuter.bottom);
  expect(geometry.title.bottom).toBeLessThanOrEqual(geometry.progress.top);
  expect(geometry.progress.bottom).toBeLessThanOrEqual(geometry.description.top);
  expect(geometry.description.bottom).toBeLessThanOrEqual(geometry.actions.top);
  expect(geometry.actions.bottom).toBeLessThanOrEqual(geometry.tabs.top);
  expect(geometry.tabs.bottom).toBeLessThanOrEqual(geometry.filter.top);
  expect(geometry.filter.bottom).toBeLessThanOrEqual(geometry.issueList.top);
  expect(geometry.issueRow.right).toBeLessThanOrEqual(geometry.issueList.right);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

  await page.locator(".title-prefix").click();
  await expect(page.locator('.search-bar input[name="filter"]')).toHaveValue("[Parity]");
  await expect(page.locator(".post-list-wrap .post-item")).toBeVisible();
  await page.locator('.search-bar input[name="filter"]').fill("no-match");
  await expect(page.locator(".post-list-wrap .post-item")).toBeHidden();
  await page.locator('.search-bar input[name="filter"]').fill("");

  await page.getByRole("link", { name: /닫힘0/u }).click();
  await expect(page).toHaveURL(/state=closed/u);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await page.getByRole("link", { name: /열림0/u }).click();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);

  await page.getByRole("button", { name: "마일스톤 종료" }).click();
  await expect.poll(() => stateRequests).toEqual([{ state: "closed" }]);
});

test("SVN milestone detail keeps the canonical mobile flow without visible overflow", async ({
  page,
}) => {
  await mockSvnMilestoneDetail(page, []);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/milestone/${MILESTONE_ID}`);

  await expect(page.locator(".project-util-wrap")).toBeHidden();
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".milesion-wrap h4 .title")).toBeVisible();
  await expect(page.locator(".milestone-desc")).toBeVisible();
  await expect(page.locator(".actrow")).toBeVisible();
  await expect(page.locator("#issues > .nav.nav-tabs")).toBeVisible();
  await expect(page.locator(".filter-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toBeVisible();

  const geometry = await readGeometry(page);
  expect(geometry.projectMenu.width).toBe(201);
  expect(geometry.title.height).toBe(82);
  expect(geometry.badge.top).toBeGreaterThan(geometry.titleLink.bottom);
  expect(geometry.issueList.top).toBeGreaterThanOrEqual(599);
  expect(geometry.issueList.top).toBeLessThanOrEqual(601);
  expect(geometry.projectMenu.right).toBeLessThanOrEqual(geometry.projectMenuOuter.right);
  expect(geometry.pageWrap.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.description.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.actions.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.tabs.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.filter.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.issueTitle.right).toBeLessThanOrEqual(geometry.viewportWidth);
});

test("SVN milestone detail keeps dynamic label CSS and Vite-owned avatar assets only", async ({
  page,
}) => {
  await mockSvnMilestoneDetail(page, []);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/milestone/${MILESTONE_ID}`);

  await expect(
    page.locator(`link[href="${basePath}/${OWNER}/${PROJECT}/issue/labels.css"]`),
  ).toHaveCount(1);
  await expect(page.locator('link[href*="highlight/styles/default.css"]')).toHaveCount(0);
  await expect(page.locator(".post-item .avatar-wrap.assinee img")).toHaveAttribute(
    "src",
    /\/src\/assets\/legacy\/default-avatar-64\.png$/u,
  );

  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain(
    'import defaultAvatarUrl from "../../../../assets/legacy/default-avatar-64.png";',
  );
  expect(source).not.toContain("/assets/javascripts/");
  expect(source).not.toContain("/assets/images/default-avatar");
  expect(source).toContain("issue/labels.css");
});

async function readGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    };
    return {
      actions: box(".milesion-wrap > .actrow"),
      badge: box(".milesion-wrap > h4 .badge"),
      description: box(".milestone-desc"),
      documentScrollWidth: document.documentElement.scrollWidth,
      filter: box("#issues .filter-wrap"),
      issueList: box(".post-list-wrap"),
      issueRow: box(".post-list-wrap .post-item"),
      issueTitle: box(".post-item .title-wrap"),
      pageWrap: box(".page-wrap-outer"),
      progress: box(".milesion-wrap > .progress"),
      projectHeader: box(".project-header-wrap"),
      projectMenu: box(".project-menu-gruop"),
      projectMenuOuter: box(".project-menu-outer"),
      projectUtil: box(".project-util-wrap"),
      tabs: box("#issues > .nav.nav-tabs"),
      title: box(".milesion-wrap > h4"),
      titleLink: box(".milesion-wrap > h4 > .title"),
      viewportWidth: window.innerWidth,
    };
  });
}

async function mockSvnMilestoneDetail(page: Page, stateRequests: unknown[]) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-svn-milestone" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: OWNER,
        userLabel: "관리자",
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/container`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        boardCount: 0,
        enrolledUsers: [],
        id: 9,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isWatching: true,
        logoUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        members: [{ loginId: OWNER, role: "manager", userId: 1, userLabel: "관리자" }],
        openIssueCount: 0,
        openPullRequestCount: 0,
        ownerName: OWNER,
        postCount: 0,
        projectId: 9,
        projectName: PROJECT,
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "Subversion",
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/milestones/${MILESTONE_ID}`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ milestone: milestoneFixture() }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/milestones/${MILESTONE_ID}/state`,
    async (route) => {
      stateRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ milestone: { ...milestoneFixture(), state: "closed" } }),
      });
    },
  );
}

function milestoneFixture() {
  return {
    assignableUsers: [{ displayName: "관리자", loginId: OWNER, userId: 1 }],
    attachments: [],
    closedIssueCount: 0,
    closedIssues: [],
    completionPercent: 0,
    contentsMarkdown: "Milestone for local legacy parity verification screens.",
    dueDateLabel: "2026-07-31",
    id: MILESTONE_ID,
    openIssueCount: 0,
    openIssues: [
      {
        assigneeAvatarUrl: "",
        assigneeLabel: "Site Admin",
        assigneeLoginId: OWNER,
        assigneeUserId: 1,
        authorLabel: "Site Admin",
        authorLoginId: OWNER,
        authorUserId: 1,
        commentCount: 0,
        createdLabel: "2026-07-07",
        createdTitle: "2026-07-07 00:00:00",
        dueDateLabel: "2026-07-24",
        dueDateOverdue: false,
        dueDateText: "12 days",
        id: 1,
        issueNumber: 1,
        labels: [
          {
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: 8,
            name: "legacy-source-label",
          },
        ],
        milestoneId: MILESTONE_ID,
        milestoneTitle: "Parity launch",
        state: "open",
        title: "[Parity] Review rail parity check",
        updatedLabel: "2026-07-12",
        voterCount: 0,
      },
    ],
    openMilestones: [],
    projectLabels: [],
    state: "open",
    title: "Parity launch",
    untilLabel: "19 days left",
    viewerCanDelete: true,
    viewerCanUpdate: true,
  };
}
