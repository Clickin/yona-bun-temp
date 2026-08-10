import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const listRoute = "src/routes/$ownerName/$projectName/milestones.tsx";
const detailRoute = "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx";

test("milestone routes keep legacy wrappers during async data resolution", async ({ page }) => {
  const listSource = readFileSync(listRoute, "utf8");
  const detailSource = readFileSync(detailRoute, "utf8");
  const listLegacy = readFileSync("../yona-original/app/views/milestone/list.scala.html", "utf8");
  const detailLegacy = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const issueListLegacy = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );

  expect(listLegacy).toContain('<div class="page-wrap-outer">');
  expect(listLegacy).toContain('<div class="project-page-wrap">');
  expect(detailLegacy).toContain('<ul class="nav nav-tabs">');
  expect(issueListLegacy).toContain('class="post-list-wrap');
  expect(listSource).toContain("function ProjectMilestonesLoading");
  expect(detailSource).toContain("function ProjectMilestoneDetailLoading");
  expect(detailSource).toContain('className="post-list-wrap row-fluid"');
  expect(listSource).toContain('data-content-ready="true"');
  expect(detailSource).toContain('data-content-ready="true"');

  await mockMilestoneList(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/milestones`, { waitUntil: "commit" });

  const shell = page.locator('[data-owner="project-milestones-shell"]');
  await expect(shell).toHaveCount(1);
  const ready = page.locator('[data-content-ready="true"]');
  await expect(ready).toHaveCount(1);
  await expect(ready).toBeVisible();
  await expect(page.locator('[data-owner="project-milestones-list"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-milestones-name"]')).toContainText(
    "Parity launch",
  );
  await expect(ready).toHaveAttribute("data-content-ready", "true");
  await expect(page.locator("body")).toContainText("Parity launch");

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }
});

async function mockMilestoneList(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, isSiteAdmin: true, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        menuSetting: { board: true, code: true, issue: true, milestone: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones?*", async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({
      contentType: "application/json",
      json: {
        milestones: [
          {
            id: "1",
            title: "Parity launch",
            state: "open",
            openIssueCount: 1,
            closedIssueCount: 0,
            completionPercent: 0,
            openIssues: [],
            closedIssues: [],
          },
        ],
      },
    });
  });
}
