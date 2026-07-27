import { expect, test, type Page } from "@playwright/test";

test("svn HEAD folder keeps the legacy HEAD history link and ko-KR folder skeleton", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockSvnHeadFolder(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/code/HEAD`);
  await expect(page).toHaveTitle("코드 - admin/svnplayground");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("코드");
  const tabs = page.locator(".code-browse-wrap > .nav-tabs > li");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveClass("active");
  await expect(tabs.nth(0).locator("a")).toHaveText("파일");
  await expect(tabs.nth(0).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/code/HEAD`,
  );
  await expect(tabs.nth(1).locator("a")).toHaveText("커밋");
  await expect(tabs.nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/commits/HEAD/`,
  );
  await expect(page.locator("#branches option:checked")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen .branch-label")).toHaveCount(0);
  await expect(page.locator("#breadcrumbs a")).toHaveCount(2);
  await expect(page.locator("#breadcrumbs")).toHaveText("svnplayground");
  await expect(page.locator(".code-browse-header > .pull-right")).toHaveCount(0);
  await expect(page.locator(".list-wrap > .listhead strong")).toHaveText([
    "파일명",
    "커밋 메시지",
    "커밋한 날짜",
  ]);
  await expect(page.locator(".list-wrap > .alert.alert-warning")).toHaveText(
    "파일이 존재하지 않습니다",
  );
  await expect(page.locator(".list-wrap > .listitem")).toHaveCount(0);
  expect(await svnHeadGeometry(page)).toMatchObject({
    headerInsidePage: true,
    listInsidePage: true,
    ordered: true,
    overflow: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await svnHeadGeometry(page)).toMatchObject({
    headerInsidePage: true,
    listInsidePage: true,
    ordered: true,
    overflow: false,
  });
});

async function mockSvnHeadFolder(page: Page) {
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
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
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
        selectedBranch: "HEAD",
      }),
    });
  });
}

async function svnHeadGeometry(page: Page) {
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
      headerInsidePage: header.left >= pageWrap.left && header.right <= pageWrap.right,
      listInsidePage: list.left >= pageWrap.left && list.right <= pageWrap.right,
      ordered: tabs.bottom <= header.top && header.bottom <= list.top,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}
