import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const OWNER = "admin";
const PROJECT = "svnplayground";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockSvnLabelsForm(page);
});

test("SVN labels form uses the canonical legacy project shell on desktop", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issue/labelsform`);

  await expect(page).toHaveTitle(`라벨 - ${OWNER}/${PROJECT}`);
  await expect(page.locator(".project-util-wrap .watch-btn")).toBeVisible();
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-util-wrap .down-arrow")).toHaveText("그만 지켜보기 ");
  await expect(page.locator(".project-setting > .project-menu-nav > li")).toHaveClass("active");

  const projectMenuLinks = page.locator(".project-menu-gruop > li > a");
  await expect(projectMenuLinks).toHaveCount(6);
  await expect(projectMenuLinks).toHaveText([
    "홈H",
    "코드C",
    "이슈I 1",
    "리뷰R",
    "마일스톤M",
    "게시판B 1",
  ]);
  await expect(page.locator('.project-menu-gruop a[href$="/pullRequests"]')).toHaveCount(0);

  const settingTabs = page.locator(".project-page-wrap > .nav.nav-tabs > li");
  await expect(settingTabs).toHaveCount(7);
  await expect(page.locator("#subMenuIssueLabel")).toHaveClass("active");
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeVisible();
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#labelsList")).toContainText("등록된 라벨이 없습니다.");

  const geometry = await readGeometry(page);
  expect(geometry.projectUtil.right).toBeLessThanOrEqual(geometry.projectHeader.right);
  expect(geometry.projectMenu.bottom).toBeLessThanOrEqual(geometry.tabs.top);
  expect(geometry.tabs.bottom).toBeLessThanOrEqual(geometry.copyForm.top);
  expect(geometry.copyForm.bottom).toBeLessThanOrEqual(geometry.newForm.top);
  expect(geometry.newForm.bottom).toBeLessThanOrEqual(geometry.labelsList.top);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test("SVN labels form preserves the legacy mobile flow without horizontal overflow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issue/labelsform`);

  await expect(page.locator(".project-util-wrap")).toBeHidden();
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator("#subMenuIssueLabel")).toHaveClass("active");
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#labelsList")).toBeVisible();

  const geometry = await readGeometry(page);
  expect(geometry.projectMenu.right).toBeLessThanOrEqual(geometry.projectMenuOuter.right);
  expect(geometry.tabs.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.copyForm.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.newForm.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.labelsList.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test("SVN labels route imports the canonical project menu without legacy asset literals", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('import { ProjectHeader, ProjectMenu } from "../../$projectName";');
  expect(source).toContain('active="setting"');
  expect(source).toContain("basePath={runtimeConfig.basePath}");
  expect(source).not.toMatch(/function ProjectMenu\b/u);
  expect(source).not.toContain("/legacy-assets");
  expect(source).not.toMatch(/<a\b/u);
});

async function readGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`missing ${selector}`);
      return element.getBoundingClientRect().toJSON();
    };
    return {
      copyForm: box("#copyLabel"),
      documentScrollWidth: document.documentElement.scrollWidth,
      labelsList: box("#labelsList"),
      newForm: box("#frmNewLabel"),
      projectHeader: box(".project-header-wrap"),
      projectMenu: box(".project-menu-gruop"),
      projectMenuOuter: box(".project-menu-inner"),
      projectUtil: box(".project-util-wrap"),
      tabs: box(".project-page-wrap > .nav.nav-tabs"),
      viewportWidth: window.innerWidth,
    };
  });
}

async function mockSvnLabelsForm(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-svn-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: OWNER,
          name: "관리자",
        },
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/settings`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        boardCount: 1,
        enrolledUsers: [],
        id: 9,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isWatching: true,
        logoUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        openIssueCount: 1,
        openPullRequestCount: 1,
        ownerName: OWNER,
        postCount: 1,
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
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/labels**`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels: [], ownerName: OWNER, projectName: PROJECT }),
    });
  });
}
