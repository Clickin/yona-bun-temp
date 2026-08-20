import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue edit form keeps sidebar and selector owner boundaries", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    "utf8",
  );
  const styleSource = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/issue/edit.scala.html", "utf8");
  const subtask = readFileSync(
    "../yona-original/app/views/issue/partial_select_subtask.scala.html",
    "utf8",
  );
  expect(template).toContain('id -> "issue-form"');
  expect(template).toContain('class="span3 span-hard-wrap right-menu"');
  expect(subtask).toContain('class="subtask-wrap');
  for (const owner of [
    "issue-editform-sidebar",
    "issue-editform-state",
    "issue-editform-subtask",
    "issue-editform-labels",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  await mockIssueEditForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/issue/1/editform`);

  for (const owner of [
    "issue-editform-sidebar",
    "issue-editform-state",
    "issue-editform-subtask",
    "issue-editform-labels",
  ]) {
    await expect(page.locator(`[data-owner="${owner}"]`)).toHaveCount(1);
  }
  await expect(page.locator('[data-owner="issue-editform-state"]')).toContainText("열림");
  await expect(page.locator('[data-owner="issue-editform-labels"]')).toContainText("bug");
  await expect(page.locator('[data-owner="issue-editform-subtask"]')).toHaveClass(/show/);

  const formBox = await page.locator('[data-owner="issue-editform-form"]').boundingBox();
  expect(formBox).not.toBeNull();
  expect(formBox!.width).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-owner="issue-editform-sidebar"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});

async function mockIssueEditForm(page: Page) {
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
        id: "7",
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
        menuSetting: { issue: true, milestone: true },
        movableIssueProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/labels", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/projects/**/issues/parent-options**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/**/issues/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issueNumber: 1,
        issueId: "1",
        title: "Issue title",
        bodyMarkdown: "Body",
        state: "open",
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        isDraft: false,
        authorId: "1",
        viewerUserId: "1",
      },
    }),
  );
}
