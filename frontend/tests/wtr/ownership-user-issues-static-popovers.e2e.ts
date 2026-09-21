import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("user issues keeps legacy control order while Style owns conditional mode controls", async ({
  page,
}) => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");

  const legacySearch = readFileSync(
    "../yona-original/app/views/issue/my_partial_search.scala.html",
    "utf8",
  );
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(legacySearch).toContain('class="nav nav-tabs nm"');
  expect(legacyTwoColumn).toContain('id="two-column-mode-checkbox"');
  expect(legacySubtasks).toContain('id="toggle-show-subtasks"');
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain(".show-subtasks-li");

  expect(route).toContain('data-owner="user-issues-two-column-border"');
  expect(route).toContain('data-owner="user-issues-subtasks-border"');
  expect(route).toContain('data-owner="user-issues-subtasks-list-item"');

  await mockUserIssues(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/user/issues`);

  const stateTabs = page.locator('[data-owner="user-issues-tabs"] > li');
  await expect(stateTabs).toHaveCount(4);
  await expect(page.locator('[data-owner="user-issues-two-column-border"]')).toHaveCSS(
    "border-top-color",
    "rgb(3, 175, 255)",
  );
  await expect(page.locator('[data-owner="user-issues-subtasks-list-item"]')).toHaveCSS(
    "margin-left",
    "-18px",
  );

  await page.locator("#two-column-mode").check();
  await expect(page.locator('[data-owner="user-issues-two-column-border"]')).toHaveCSS(
    "background-color",
    "rgb(174, 229, 255)",
  );
  await page.locator("#toggle-show-subtasks").check();
  await expect(page.locator('[data-owner="user-issues-child-list-visible"]')).toHaveCSS(
    "display",
    "block",
  );
  await expect(page.locator('[data-owner="user-issues-subtasks-border"]')).toHaveCSS(
    "background-color",
    "rgb(174, 229, 255)",
  );

  await page.locator('[data-owner="user-issues-tabs"] > li:nth-child(2) button').click();
  await expect(page).toHaveURL(/state=closed/);
  await page.locator("button:has(.authored-by-me)").click();
  await expect(page).toHaveURL(/filter=authored/);
  await page.locator('input[name="filter"]').fill("closed issue");
  await page.locator("form#search").press("Enter");
  await expect(page).toHaveURL(/query=closed\+issue|query=closed%20issue/);
  await page.locator("#pagination input[name=pageNum]").fill("2");
  await page.locator("#pagination input[name=pageNum]").press("Enter");
  await expect(page).toHaveURL(/pageNum=2/);

  const boxes = await page.evaluate(() => {
    const tabs = document.querySelector('[data-owner="user-issues-tabs"]');
    const controls = document.querySelector("#two-column-mode-checkbox");
    const subtasks = document.querySelector('[data-owner="user-issues-subtasks-list-item"]');
    if (!tabs || !controls || !subtasks) return null;
    return {
      controls: controls.getBoundingClientRect(),
      subtasks: subtasks.getBoundingClientRect(),
      tabs: tabs.getBoundingClientRect(),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.controls.top).toBeGreaterThanOrEqual(boxes!.tabs.top);
  expect(boxes!.controls.bottom).toBeLessThanOrEqual(boxes!.tabs.bottom + 1);
  expect(boxes!.subtasks.top).toBeGreaterThanOrEqual(boxes!.tabs.top);
  expect(boxes!.subtasks.bottom).toBeLessThanOrEqual(boxes!.tabs.bottom + 1);
});

async function mockUserIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "alice",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const isClosed = requestUrl.searchParams.get("state") === "closed";
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 1,
        filter: requestUrl.searchParams.get("filter") ?? "assigned",
        items: [
          {
            assigneeLabel: "Alice",
            assigneeLoginId: "alice",
            authorLabel: "Alice",
            authorLoginId: "alice",
            childClosedCount: 1,
            childIssues: [
              {
                id: 2,
                issueNumber: 2,
                state: "closed",
                title: "Child issue",
              },
            ],
            childOpenCount: 0,
            createdLabel: "2026-07-17",
            id: isClosed ? 3 : 1,
            issueNumber: isClosed ? 3 : 1,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: isClosed ? "closed" : "open",
            title: isClosed ? "Closed issue" : "First issue",
            updatedLabel: "2026-07-17",
          },
        ],
        openIssueCount: 1,
        pageNum: Number(requestUrl.searchParams.get("pageNum") ?? "1"),
        pageSize: 1,
        sideFilterCounts: {},
        state: isClosed ? "closed" : "open",
        totalCount: 2,
        totalPages: 2,
        viewerUserId: 1,
      },
    });
  });
}
