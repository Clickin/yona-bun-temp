import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const OWNER = "admin";
const PROJECT = "svnplayground";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockSvnIssues(page);
});

test("SVN issues keeps the canonical desktop shell and React-owned list interactions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues`);

  await expect(page).toHaveTitle(`${PROJECT} - 이슈 - ${OWNER}/${PROJECT}`);
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".project-menu-gruop > li.active .menu-name")).toHaveText("이슈");
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".left-menu")).toBeVisible();
  await expect(page.locator("#span10")).toBeVisible();
  await expect(page.locator(".error-wrap")).toContainText("등록된 이슈가 없습니다.");
  await expect(
    page.locator(`link[href="${basePath}/${OWNER}/${PROJECT}/issue/labels.css"]`),
  ).toHaveCount(1);

  const geometry = await readGeometry(page);
  expect(geometry.projectUtil.width).toBe(139);
  expect(geometry.projectMenu.width).toBe(467);
  expect(geometry.projectUtil.right).toBeLessThanOrEqual(geometry.projectHeader.right);
  expect(geometry.leftMenu.right).toBeLessThanOrEqual(geometry.rightPane.left);
  expect(geometry.tabs.bottom).toBeLessThanOrEqual(geometry.emptyState.top);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

  await page.locator("#two-column-mode").check();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("useTwoColumnMode"))).toBe("true");
  await page.locator("#toggle-show-subtasks").check();
  await expect(page.locator("#toggle-show-subtasks")).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("showSubtasksAlways"))).toBe("true");

  await page.locator('input[name="filter"]').fill("svn");
  await page.locator('button[data-submit="submit"]').click();
  await expect(page).toHaveURL(/filter=svn/u);
  await page.getByRole("link", { name: /닫힘/u }).click();
  await expect(page).toHaveURL(/state=closed/u);
});

test("SVN issues preserves the canonical mobile flow without overflow", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues`);

  await expect(page.locator(".project-util-wrap")).toBeHidden();
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".left-menu")).toBeVisible();
  await expect(page.locator("#span10")).toBeVisible();
  await expect(page.locator("#two-column-mode")).toBeHidden();
  await expect(page.locator("#toggle-show-subtasks")).toBeVisible();

  const geometry = await readGeometry(page);
  expect(geometry.projectMenu.width).toBe(201);
  expect(geometry.projectMenu.right).toBeLessThanOrEqual(geometry.projectMenuOuter.right);
  expect(geometry.issueList.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.rightPane.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test("SVN issues renders only dynamic label CSS and no legacy static calendar scripts", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues`);

  await expect(
    page.locator(`link[href="${basePath}/${OWNER}/${PROJECT}/issue/labels.css"]`),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'script[src*="moment-with-langs"], script[src*="pikaday"], script[src*="yobi.ui.Calendar"]',
    ),
  ).toHaveCount(0);

  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url),
    "utf8",
  );
  expect(source).not.toContain("IssueListAssets");
  expect(source).not.toMatch(/\/assets\/javascripts\//u);
  expect(source).not.toMatch(/<script\b/u);
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
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    };
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      emptyState: box(".error-wrap"),
      issueList: box(".issue-list-wrap"),
      leftMenu: box(".left-menu"),
      projectHeader: box(".project-header-wrap"),
      projectMenu: box(".project-menu-gruop"),
      projectMenuOuter: box(".project-menu-inner"),
      projectUtil: box(".project-util-wrap"),
      rightPane: box("#span10"),
      tabs: box("#span10 > .nav.nav-tabs"),
      viewportWidth: window.innerWidth,
    };
  });
}

async function mockSvnIssues(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-svn-issues" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
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
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/container**`, async (route) => {
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
        viewerIsProjectMember: true,
        watchCount: 1,
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/milestones**`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/issue-search-users**`,
    async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) });
    },
  );
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/assignable-users**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, truncated: false }),
      });
    },
  );
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/labels`, async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ labels: [] }) });
  });
  await page.route(`**/api/v1/projects/${OWNER}/${PROJECT}/issues**`, async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get("state");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignedToMeCount: 0,
        authoredByMeCount: 0,
        closedIssueCount: state === "closed" ? 1 : 0,
        commentedByMeCount: 0,
        draftItems: [],
        items: [],
        openIssueCount: state === "closed" ? 0 : 1,
        ownerName: OWNER,
        pageNum: 1,
        pageSize: 15,
        projectName: PROJECT,
        totalCount: 0,
        totalPages: 0,
      }),
    });
  });
}
