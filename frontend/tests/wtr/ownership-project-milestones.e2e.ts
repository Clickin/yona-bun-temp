import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records milestone list ownership and populated issue filtering", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/milestones.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/milestone/list.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(template).toContain('<ul class="milestones">');
  expect(template).toContain('class="issue-link"');
  expect(pageLess).toContain(".milestones {");
  expect(route).toContain('data-owner="project-milestones-list"');
  expect(route).toMatch(
    /data-owner=\{\s*hidden\s*\?\s*"project-milestones-hidden-issue-link"\s*:\s*"project-milestones-issue-link"\s*\}/u,
  );
  expect(route).toContain('data-owner="project-milestones-issue-count"');
  expect(route).toContain('data-owner="project-milestones-issue-number"');

  await mockMilestones(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestones`);
    await expect(owner(page, "project-milestones-list")).toBeVisible();
    await expect(owner(page, "project-milestones-item")).toHaveCount(2);
    await expect(owner(page, "project-milestones-issue-link")).toHaveCount(1);
    await expect(owner(page, "project-milestones-issue-number")).toHaveCSS(
      "font-family",
      /menlo|Consolas/i,
    );
    await expect(owner(page, "project-milestones-issue-name")).toHaveCSS(
      "vertical-align",
      "middle",
    );
    const geometry = await owner(page, "project-milestones-list").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
  await owner(page, "project-milestones-search-input").fill("missing");
  await expect(owner(page, "project-milestones-hidden-issue-link")).toHaveCSS("display", "none");
});

async function mockMilestones(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        viewerCanUpdate: true,
        name: "demo",
        projectName: "demo",
        ownerName: "weblabs",
        vcs: "GIT",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/milestones**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestones: [
          {
            id: "1",
            title: "v1",
            state: "open",
            openIssueCount: 1,
            closedIssueCount: 1,
            completionPercent: 50,
            dueDateLabel: "2026-08-01",
            untilLabel: "14 days",
            openIssues: [{ issueNumber: "1", title: "Fix", labels: [] }],
            closedIssues: [],
          },
          {
            id: "2",
            title: "v2",
            state: "open",
            openIssueCount: 0,
            closedIssueCount: 0,
            completionPercent: 0,
            dueDateLabel: "2026-09-01",
            untilLabel: "45 days",
            openIssues: [],
            closedIssues: [],
          },
        ],
      },
    }),
  );
}
