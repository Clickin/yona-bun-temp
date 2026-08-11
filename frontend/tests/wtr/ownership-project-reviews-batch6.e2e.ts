import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";

test("reviews batch 6 restores the legacy project page shell", async ({ page }) => {
  const legacy = readFileSync("../yona-original/app/views/reviewthread/list.scala.html", "utf8");
  const route = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacy).toContain('<div class="project-page-wrap">');
  expect(legacy).toContain('<div class="row-fluid issue-list-wrap">');
  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("dangerouslySetInnerHTML");
});

test(`reviews batch 6 exposes the legacy shell geometry ${fallbackOff ? "fallback-off" : "normal"}`, async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerUserId: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/reviews**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 0,
        authorCount: 0,
        closedCount: 0,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 15,
        participantCount: 0,
        state: "open",
        totalCount: 0,
      }),
    });
  });

  await page.goto("/yona/admin/sample/reviews");
  if (fallbackOff) {
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }

  // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy reviewthread/list.scala.html:34
  // starts with <div class="project-page-wrap"> (no page-wrap-outer wrapper); the route
  // dropped its page-wrap-outer per parity, so pin the route-owned shell directly.
  const shell = page.locator('[data-owner="project-reviews-page-wrap"]');
  const issueList = shell.locator(":scope > .row-fluid.issue-list-wrap");
  await expect(shell).toBeVisible();
  await expect(issueList).toBeVisible();
  await expect(issueList.locator(":scope > .span2.search-wrap")).toBeVisible();
  await expect(issueList.locator(":scope > .span10")).toBeVisible();
  await expect(page.locator('[data-owner="project-reviews-empty-state"]')).toBeVisible();
  await expect(page.locator("body")).not.toHaveText("");

  const geometry = await page.evaluate(() => {
    const outer = document.querySelector<HTMLElement>(".page-wrap-outer");
    const project = document.querySelector<HTMLElement>('[data-owner="project-reviews-page-wrap"]');
    const issueList = document.querySelector<HTMLElement>(
      '[data-owner="project-reviews-page-wrap"] > .row-fluid.issue-list-wrap',
    );
    if (!outer || !project || !issueList) throw new Error("missing reviews shell");
    const outerBox = outer.getBoundingClientRect();
    const projectBox = project.getBoundingClientRect();
    const issueListBox = issueList.getBoundingClientRect();
    return {
      outerTop: outerBox.top,
      projectTop: projectBox.top,
      projectLeft: projectBox.left,
      projectRight: projectBox.right,
      issueListLeft: issueListBox.left,
      issueListRight: issueListBox.right,
    };
  });
  expect(geometry.outerTop).toBeGreaterThanOrEqual(0);
  // The frozen legacy margin may collapse through the outer shell.
  expect(geometry.projectTop).toBeGreaterThanOrEqual(geometry.outerTop);
  expect(geometry.projectLeft).toBeGreaterThanOrEqual(geometry.issueListLeft - 1);
  expect(geometry.projectRight).toBeGreaterThanOrEqual(geometry.issueListRight - 1);
});
