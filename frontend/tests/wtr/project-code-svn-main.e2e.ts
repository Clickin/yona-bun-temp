import { expect, test, type Page } from "../wtr-compat.ts";

test("svn main folder preserves legacy branch history and native select fallback semantics", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockSvnMainFolder(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/code/main`);
  await expect(page).toHaveTitle("코드 - admin/svnplayground");
  const tabs = page.locator(".code-browse-wrap > .nav-tabs > li");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveClass("active");
  await expect(tabs.nth(0).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/code/main`,
  );
  await expect(tabs.nth(1).locator("a")).toHaveText("커밋");
  await expect(tabs.nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/commits/main/`,
  );
  await expect(page.locator("#branches option:checked")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen .branch-label")).toHaveCount(0);
  await expect(page.locator("#breadcrumbs a")).toHaveCount(2);
  await expect(page.locator("#breadcrumbs a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/code/main`,
  );
  await expect(page.locator(".code-browse-header > .pull-right")).toHaveCount(0);
  await expect(page.locator(".list-wrap > .alert.alert-warning")).toHaveText(
    "파일이 존재하지 않습니다",
  );
  expect(await folderGeometry(page)).toEqual({ inside: true, ordered: true, overflow: false });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await folderGeometry(page)).toEqual({ inside: true, ordered: true, overflow: false });
});

async function mockSvnMainFolder(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 8,
        isFavorite: false,
        isPrivate: false,
        isProtected: false,
        menuSetting: { board: true, code: true, issue: true, milestone: true, review: true },
        ownerName: "admin",
        projectName: "svnplayground",
        vcs: "SVN",
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/svnplayground/code**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "HEAD" }],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "svnplayground",
        selectedBranch: "main",
      }),
    });
  });
}

async function folderGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const pageWrap = rect(".page-wrap-outer");
    const tabs = rect(".code-browse-wrap > .nav-tabs");
    const header = rect(".code-browse-header");
    const list = rect(".list-wrap");
    return {
      inside: header.left >= pageWrap.left && list.right <= pageWrap.right,
      ordered: tabs.bottom <= header.top && header.bottom <= list.top,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}
