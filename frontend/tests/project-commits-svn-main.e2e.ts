import { expect, test, type Page } from "@playwright/test";

test("svn main branch history reuses the legacy root history skeleton", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  const historyRequests = await mockSvnMainHistory(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/commits/main/`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/commits/main/`);
  await expect(page).toHaveTitle("커밋 히스토리 - admin/svnplayground");
  await expect.poll(historyRequests).toEqual(["branch=main"]);
  await expect(page.locator("#breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".code-table.commits .browse")).toHaveCount(0);
  const tabs = page.locator(".code-browse-wrap > .nav-tabs > li");
  expect(await tabs.allTextContents()).toEqual(["파일", "커밋"]);
  await expect(tabs.nth(0).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/code/main`,
  );
  await expect(tabs.nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/commits/main/`,
  );
  await expect(page.locator("select#branches option")).toHaveText(["HEAD"]);
  await expect(page.locator("select#branches option")).toHaveAttribute(
    "value",
    `${basePath}/admin/svnplayground/commits/HEAD/`,
  );
  await expect(page.locator(".select2-chosen")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen .branch-label")).toHaveCount(0);
  await expect(page.locator("select#branches")).toHaveClass(/select2-offscreen/u);
  await expect(page.locator("select#branches")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator(".select2-choice")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator(".code-table.commits .thead strong")).toHaveText([
    "@",
    "커밋 메시지",
    "커밋한 날짜",
    "작성자",
  ]);
  expect(await historyGeometry(page)).toEqual({
    historyTop: 270,
    noOverflow: true,
    pageHeight: 142,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await historyGeometry(page)).toMatchObject({ noOverflow: true });
});

async function mockSvnMainHistory(page: Page) {
  const requests: string[] = [];
  await page.route("**/api/v1/session", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: '{"actorId":1,"isAnonymous":false,"isSiteAdmin":true,"loginId":"admin"}',
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 8,
        menuSetting: { board: true, code: true, issue: true, milestone: true, review: true },
        ownerName: "admin",
        projectName: "svnplayground",
        vcs: "SVN",
      }),
    }),
  );
  await page.route("**/api/v1/projects/admin/svnplayground/commits**", async (route) => {
    requests.push(new URL(route.request().url()).searchParams.toString());
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
        selectedBranch: "main",
      }),
    });
  });
  return () => requests;
}

async function historyGeometry(page: Page) {
  return page.evaluate(() => {
    const history = document.querySelector<HTMLElement>("#history")!.getBoundingClientRect();
    const projectPage = document.querySelector<HTMLElement>(".project-page-wrap")!;
    return {
      historyTop: Math.round(history.top),
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      pageHeight: Math.round(projectPage.getBoundingClientRect().height),
    };
  });
}
