import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("milestone open detail owns issue description and list boundaries", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  expect(template).toContain('class="milestone-desc"');
  expect(template).toContain('class="filter-wrap"');
  expect(issuePartial).toContain('class="post-list-wrap row-fluid"');
  expect(route).toContain('data-owner="milestone-detail-issues"');
  expect(route).toContain('data-owner="milestone-detail-issue-row"');
  await mockMilestone(page);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestone/1?state=open#issues`);
    await expect(page.locator('[data-owner="milestone-detail-description"]')).toBeVisible();
    await expect(page.locator('[data-owner="milestone-detail-issues"]')).toBeVisible();
    await expect(page.locator('[data-owner="milestone-detail-filter"]')).toBeVisible();
    await expect(page.locator('[data-owner="milestone-detail-issue-list"]')).toBeVisible();
    await expect(page.locator('[data-owner="milestone-detail-issue-row"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="milestone-detail-mass-update"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="milestone-detail-issue-meta"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="milestone-detail-description"]')).toHaveCSS(
      "background-color",
      "rgb(247, 247, 247)",
    );
    await expect(page.locator('[data-owner="milestone-detail-issue-row"]')).toHaveCSS(
      "padding",
      viewport.width <= 720 ? "10px 0px" : "10px",
    );
    await expect(page.locator('[data-owner="milestone-detail-mass-update"]')).toHaveCSS(
      "position",
      "relative",
    );

    const geometry = await page
      .locator('[data-owner="milestone-detail-issues"]')
      .evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        scrollWidth: document.documentElement.scrollWidth,
      }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }

  await page.getByRole("button", { name: "[Bug]" }).click();
  await expect(page.locator('input[name="filter"]')).toHaveValue("[Bug]");
  await expect(page.locator('[data-owner="milestone-detail-issue-row"]')).toBeVisible();
});

async function mockMilestone(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    actorId: "1",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        members: [{ loginId: "admin" }],
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          id: "1",
          title: "v1",
          state: "open",
          completionPercent: 50,
          openIssueCount: 1,
          closedIssueCount: 0,
          contentsMarkdown: "Details",
          openIssues: [
            {
              id: "11",
              issueNumber: "11",
              title: "[Bug] Fix issue",
              state: "open",
              authorLoginId: "admin",
              authorLabel: "Admin",
              createdLabel: "today",
              createdTitle: "today",
              labels: [],
              childIssues: [],
            },
          ],
          closedIssues: [],
          viewerCanUpdate: true,
          viewerCanDelete: true,
          assignableUsers: [],
          projectLabels: [],
          openMilestones: [],
        },
      },
    }),
  );
}
