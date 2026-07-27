import { expect, test, type Page } from "@playwright/test";

test("svn root commit history matches the ko-KR legacy history shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockSvnHistory(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/commits`);
  await expect(page).toHaveTitle("커밋 히스토리 - admin/svnplayground");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("코드");
  const tabs = page.locator(".code-browse-wrap > .nav.nav-tabs > li");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0).locator("a")).toHaveText("파일");
  await expect(tabs.nth(0).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/code/HEAD`,
  );
  await expect(tabs.nth(1)).toHaveClass("active");
  await expect(tabs.nth(1).locator("a")).toHaveText("커밋");
  await expect(tabs.nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/commits`,
  );
  await expect(page.locator("#branches option")).toHaveText(["HEAD"]);
  await expect(page.locator("#branches option")).toHaveAttribute(
    "value",
    `${basePath}/admin/svnplayground/commits/HEAD/`,
  );
  await expect(page.locator(".code-table.commits .thead strong")).toHaveText([
    "@",
    "커밋 메시지",
    "커밋한 날짜",
    "작성자",
  ]);
  await expect(page.locator('[data-stylex-owner="project-commits-empty-warning"]')).toHaveText(
    "커밋이 존재하지 않습니다",
  );
  expect(await historyGeometry(page)).toEqual({ inside: true, ordered: true, overflow: false });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await historyGeometry(page)).toEqual({ inside: true, ordered: true, overflow: false });
});

async function mockSvnHistory(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ actorId: 1, isAnonymous: false, isSiteAdmin: true, loginId: "admin" }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 8,
        menuSetting: { board: true, code: true, issue: true, milestone: true, review: true },
        ownerName: "admin",
        projectName: "svnplayground",
        vcs: "SVN",
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/svnplayground/commits**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "HEAD" }],
        breadcrumbs: [],
        commits: [],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "admin",
        page: 0,
        path: "",
        projectName: "svnplayground",
        selectedBranch: "",
      }),
    });
  });
}

async function historyGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const pageWrap = rect(".page-wrap-outer");
    const tabs = rect(".code-browse-wrap > .nav.nav-tabs");
    const history = rect("#history");
    return {
      inside: history.left >= pageWrap.left && history.right <= pageWrap.right,
      ordered: tabs.bottom <= history.top,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}
