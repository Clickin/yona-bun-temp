import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("user issues keeps the legacy issue title paint owner across desktop and mobile", async ({
  page,
}) => {
  const routeSource = readFileSync("src/routes/user/issues.tsx", "utf8");
  const template = readFileSync(
    "../yona-original/app/views/user/partial_issues.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(template).toContain(
    '<a href="@routes.IssueApp.issue(project.owner, project.name, issue.getNumber)" class="title">',
  );
  expect(pageLess).toContain(".post-item {");
  expect(routeSource).toContain('data-stylex-owner="user-issues-issue-title"');
  expect(routeSource).not.toContain('className="title"');

  await mockUserIssues(page);
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/issues`);
    const title = page.locator('[data-stylex-owner="user-issues-issue-title"]');
    await expect(title).toHaveText("First issue");
    await expect(title).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(title).toHaveCSS("font-size", "15px");
    await expect(title).toHaveCSS("font-weight", "600");
    await expect(title).toHaveAttribute("href", `${basePath}/alice/sample/issue/1`);
    const box = await title.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  }
});

async function mockUserIssues(page: Page) {
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
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Alice",
            authorLoginId: "alice",
            childClosedCount: 0,
            childOpenCount: 0,
            createdLabel: "2026-07-17",
            id: 1,
            issueNumber: 1,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: "First issue",
            updatedLabel: "2026-07-17",
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      },
    }),
  );
}
