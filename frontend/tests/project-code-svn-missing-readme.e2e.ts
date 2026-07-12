import { expect, test, type Page } from "@playwright/test";

test("missing svn README renders the legacy project code not-found state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockMissingSvnReadme(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/code/main/README.md`);
  await expect(page).toHaveTitle("main - admin/svnplayground");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("코드");
  await expect(page.locator(".code-browse-wrap")).toHaveCount(0);
  const error = page.locator(".page-wrap-outer .error-wrap");
  await expect(error.locator("i")).toHaveClass("ico ico-err2");
  await expect(error.locator("p")).toHaveText(
    "main 브랜치가 없습니다. 기본 브랜치 설정을 확인해 주세요.",
  );
  await expect(error.locator("a.ybtn.ybtn-primary")).toHaveText("목록");
  await expect(error.locator("a.ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/settingform`,
  );
  await expect(error.locator("a.ybtn.ybtn-primary")).not.toHaveAttribute("aria-current", /.+/u);
  await expect(error.locator("a.ybtn.ybtn-primary")).not.toHaveAttribute("data-status", /.+/u);
  await expect(error.locator("a.ybtn.ybtn-primary")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(error.locator("a.ybtn.ybtn-primary")).not.toHaveAttribute("data-href", /.+/u);
  expect(await errorGeometry(page)).toEqual({
    errorWidth: 1346,
    iconHeight: 80,
    iconWidth: 50,
    pageHeight: 450,
    pageWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await errorGeometry(page)).toEqual({
    errorWidth: 390,
    iconHeight: 80,
    iconWidth: 50,
    pageHeight: 450,
    pageWidth: 390,
  });
});

async function mockMissingSvnReadme(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 8,
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
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "not_found", message: "main branch does not exist" }),
    });
  });
}

async function errorGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return { height: Math.round(box.height), width: Math.round(box.width) };
    };
    const error = rect(".error-wrap");
    const icon = rect(".error-wrap .ico-err2");
    const pageWrap = rect(".page-wrap-outer");
    return {
      errorWidth: error.width,
      iconHeight: icon.height,
      iconWidth: icon.width,
      pageHeight: pageWrap.height,
      pageWidth: pageWrap.width,
    };
  });
}
