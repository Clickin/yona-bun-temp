import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
});

test("SVN project delete form matches the legacy shell on desktop and mobile", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSvnDelete(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/deleteform`);

  await expect(page).toHaveTitle("프로젝트 삭제 - admin/svnplayground");
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-util-wrap .watch-btn")).toBeVisible();
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".project-menu-gruop .menu-name")).toHaveText([
    "홈",
    "코드",
    "이슈",
    "리뷰",
    "마일스톤",
    "게시판",
  ]);
  await expect(
    page.locator(".project-menu-gruop .menu-name", { hasText: "코드 주고받기" }),
  ).toHaveCount(0);
  await expect(page.locator(".project-setting > .project-menu-nav > li")).toHaveClass("active");
  await expect(page.locator("#subMenuProjectDelete")).toHaveClass("active");
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeVisible();
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  await expect(page.locator(".bubble-wrap.gray.wp > .cu-label")).toHaveText("프로젝트 삭제");
  await expect(page.locator(".bubble-wrap .notice")).toHaveText(
    "프로젝트를 삭제하게되면 코드, 게시판, 이슈 등 모든 데이터가 삭제되며 한번 삭제된 데이터는 복구가 불가능합니다.",
  );
  await expect(page.locator("#accept + label")).toHaveText("프로젝트를 삭제하는데 동의합니다.");
  expect(await page.locator("#accept").evaluate((input) => input.nextSibling?.nodeType)).toBe(1);
  expect(await menuGeometry(page)).toMatchObject({
    menuWidth: 410,
    noOverflow: true,
    projectPageHeight: 216,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await menuGeometry(page)).toMatchObject({
    changeVcsOnSecondRow: true,
    menuWidth: 201,
    noOverflow: true,
    projectPageHeight: 280,
  });
});

test("SVN project delete form owns confirmation and DELETE redirect behavior", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: Array<{ csrf: boolean; method: string }> = [];
  await mockSvnDelete(page, deleteRequests);
  await page.goto(`${basePath}/admin/svnplayground/deleteform`);

  const modal = page.locator("#alertDeletion");
  const alertPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#btnDelete").click();
  await expect(alertPromise).resolves.toBe("프로젝트 삭제에 동의하여야 합니다.");
  await expect(modal).toHaveCSS("display", "none");

  await page.locator("#accept").check();
  await expect(page.locator("#accept")).toBeChecked();
  await page.locator("#btnDelete").click();
  await expect(modal).toHaveClass("modal hide in");
  await expect(modal).toHaveCSS("display", "block");
  await expect(modal.locator(".modal-header h3")).toHaveText("프로젝트를 삭제하시겠습니까?");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await modal.locator(".modal-footer .ybtn").last().click();
  await expect(modal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#btnDelete").click();
  await page.locator(".modal-backdrop").click();
  await expect(modal).toHaveCSS("display", "none");
  await page.locator("#btnDelete").click();
  await modal.locator(".close").click();
  await expect(modal).toHaveCSS("display", "none");

  await page.locator("#btnDelete").click();
  const response = page.waitForResponse(
    (item) => item.request().method() === "DELETE" && item.url().includes("/svnplayground"),
  );
  await page.locator("#btnDeleteExec").click();
  await response;
  expect(deleteRequests).toEqual([{ csrf: true, method: "DELETE" }]);
  await expect(page).toHaveURL(basePath);
});

test("SVN delete route uses only canonical shared project assets and shell", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/deleteform.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('import { ProjectHeader, ProjectMenu } from "../$projectName"');
  expect(source).toContain("<ProjectHeader basePath={runtimeConfig.basePath} project={project} />");
  expect(source).toContain('<ProjectMenu active="setting"');
  expect(source).not.toContain("projectWithLegacyHeaderAssets");
  expect(source).not.toContain('"/legacy-assets/');
  expect(source).not.toContain("function ProjectMenu(");
});

async function mockSvnDelete(
  page: Page,
  deleteRequests: Array<{ csrf: boolean; method: string }> = [],
) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "관리자",
      }),
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-svn-delete" },
      body: JSON.stringify({
        session: { csrfToken: "csrf-svn-delete", projection: {}, userId: 1 },
        user: { id: 1, isSiteAdmin: true, loginId: "admin", name: "관리자" },
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/settings", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(svnProject()) }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground", async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    deleteRequests.push({
      csrf: route.request().headers()["x-csrf-token"] === "csrf-svn-delete",
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, redirectPath: "/" }),
    });
  });
}

function svnProject() {
  return {
    backgroundImageUrl: "",
    backgroundUrl: "",
    boardCount: 0,
    enrolledUsers: [],
    id: 17,
    isPrivate: false,
    isProtected: false,
    isWatching: true,
    logoUrl: "",
    openIssueCount: 0,
    ownerName: "admin",
    postCount: 0,
    projectName: "svnplayground",
    reviewCount: 0,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "SVN",
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

async function menuGeometry(page: Page) {
  return page.evaluate(() => {
    const menu = document.querySelector(".project-menu-gruop")!.getBoundingClientRect();
    const projectPage = document.querySelector(".project-page-wrap")!.getBoundingClientRect();
    const firstTab = document.querySelector("#subMenuProjectSetting")!.getBoundingClientRect();
    const changeVcs = document.querySelector("#subMenuProjectChangeVCS")!.getBoundingClientRect();
    return {
      changeVcsOnSecondRow: changeVcs.top > firstTab.top,
      menuWidth: Math.round(menu.width),
      noOverflow: document.body.scrollWidth <= window.innerWidth,
      projectPageHeight: Math.round(projectPage.height),
    };
  });
}
