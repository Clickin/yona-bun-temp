import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue editform owns dynamic selected label color and picker geometry", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    "utf8",
  );
  const styleSource = readFileSync("src/app.css", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/issue/partial_select_label.scala.html",
    "utf8",
  );
  const override = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_override.less",
    "utf8",
  );

  expect(partial).toContain('data-container-css-class="issue-labels bordered fullsize"');
  expect(override).toContain(".select2-search-field input");

  expect(route).toContain('data-owner="issue-editform-label-picker"');
  expect(route).toContain('data-owner="issue-editform-label-search-input"');

  await mockIssueEditForm(page);
  await page.goto(`${basePath}/weblabs/demo/issue/1/editform`, { waitUntil: "commit" });

  const picker = page.locator('[data-owner="issue-editform-label-picker"]');
  const input = page.locator('[data-owner="issue-editform-label-search-input"]');
  await expect(picker).toBeVisible();
  await expect(input).toBeVisible();
  await expect(picker).toHaveCSS("display", "inline-block");
  await expect(input).toHaveCSS("width", "10px");
  await expect(picker).not.toHaveAttribute("style", /.+/u);
  await expect(input).not.toHaveAttribute("style", /.+/u);
});

async function mockIssueEditForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: "1",
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
        id: "7",
        ownerName: "weblabs",
        projectName: "demo",
        projectScope: "PUBLIC",
        vcs: "GIT",
        menuSetting: { issue: true, milestone: true },
      },
    }),
  );
  await page.route("**/api/v1/owners/weblabs/projects/demo/labels*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        labels: [
          {
            id: "1",
            name: "bug",
            color: "#f00",
            categoryId: "1",
            categoryName: "General",
            categoryIsExclusive: false,
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/projects/**/issues/parent-options**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/weblabs/demo/issues/1*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        authorId: "1",
        bodyMarkdown: "Body",
        issueId: "1",
        issueNumber: 1,
        isDraft: false,
        labels: [
          {
            id: "1",
            name: "bug",
            color: "#f00",
            categoryId: "1",
            categoryName: "General",
            categoryIsExclusive: false,
          },
        ],
        state: "open",
        title: "Issue title",
        viewerUserId: "1",
      },
    }),
  );
}
