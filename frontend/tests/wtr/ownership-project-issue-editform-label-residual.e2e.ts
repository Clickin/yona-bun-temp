import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue editform owns dynamic selected label color and picker geometry", async ({ page }) => {
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
  await expect(picker.locator(".select2-search-choice .label")).toHaveCSS(
    "background-color",
    "rgb(255, 0, 0)",
  );
  const assignee = page.locator('[data-owner="issue-editform-assignee-picker"]');
  await expect(assignee.locator(".select2-chosen")).toHaveText("담당자 없음");
  await expect(assignee.locator(".select2-choice")).toHaveCSS("color", "rgb(153, 153, 153)");
  await picker.getByRole("button", { name: "bug 삭제" }).click();
  await expect(input).toHaveAttribute("placeholder", "라벨 선택");
  expect(await input.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
    80,
  );
  await input.fill("bug");
  await expect(input).not.toHaveAttribute("placeholder", /.+/u);
  await picker.getByRole("option", { name: "bug", exact: true }).click();
  await expect(picker.locator(".select2-search-choice")).toContainText("bug");
  await page.locator("#title").click();
  await expect(picker.getByRole("listbox")).not.toBeVisible();
  await expect(input).not.toHaveAttribute("placeholder", /.+/u);
  await expect(input).toHaveValue("");
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
