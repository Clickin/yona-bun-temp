import { expect, test, type Page } from "@playwright/test";

test("svn commits trailing slash replaces to the canonical legacy root before history fetch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests = await mockSvnHistory(page);

  await page.goto(`${basePath}/admin/svnplayground/commits?previous=1`);
  await expect(page.locator('[data-stylex-owner="project-commits-empty-warning"]')).toBeVisible();
  await expect.poll(historyRequests).toBe(1);

  await page.goto(`${basePath}/admin/svnplayground/commits/?probe=1#fragment`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/commits#fragment`);
  await expect(page.locator('[data-stylex-owner="project-commits-empty-warning"]')).toBeVisible();
  await expect(page.locator(".select2-container.pull-right")).toBeVisible();
  await expect(page.locator(".select2-container")).toHaveCSS("width", "220px");
  await expect(page.locator(".select2-chosen")).toHaveText("HEAD");
  await expect(page.locator(".select2-chosen .branch-label")).toHaveCount(0);
  await expect(page.locator("select#branches")).toHaveClass(/select2-offscreen/u);
  await expect(page.locator("select#branches")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator(".select2-choice")).not.toHaveAttribute("data-toggle", /.+/u);
  await page.locator(".select2-choice").click();
  await expect(page.locator(".select2-choice")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".select2-result-label")).toHaveText("HEAD");
  await expect(page.locator(".select2-result-label .branch-label")).toHaveCount(0);
  await page.locator(".select2-choice").click();
  await expect(page.locator(".select2-choice")).toHaveAttribute("aria-expanded", "false");
  expect(await historyGeometry(page)).toEqual({
    contained: true,
    historyTop: 270,
    ordered: true,
  });
  await expect.poll(historyRequests).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await historyGeometry(page)).toMatchObject({ contained: true, ordered: true });

  await page.goBack();
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/commits?previous=1`);
});

async function mockSvnHistory(page: Page) {
  let historyRequestCount = 0;
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
    historyRequestCount += 1;
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
  return () => historyRequestCount;
}

async function historyGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const pageWrap = rect(".page-wrap-outer");
    const tabs = rect(".code-browse-wrap > .nav-tabs");
    const history = rect("#history");
    return {
      contained: history.left >= pageWrap.left && history.right <= pageWrap.right,
      historyTop: Math.round(history.top),
      ordered: tabs.bottom <= history.top,
    };
  });
}
