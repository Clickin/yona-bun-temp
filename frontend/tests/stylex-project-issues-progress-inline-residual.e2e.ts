import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project issues owns server-derived subtask and milestone widths with Dynamic StyleX", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/issues.tsx", "utf8");
  const styleSource = readFileSync("src/routes/$ownerName/$projectName/-issues.stylex.ts", "utf8");
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list_subtask.scala.html",
    "utf8",
  );
  const milestonePartial = readFileSync(
    "../yona-original/app/views/milestone/partial_status.scala.html",
    "utf8",
  );

  expect(issuePartial).toContain('class="subtask-progress upload-progress');
  expect(issuePartial).toContain('style="width: @percentage%;"');
  expect(milestonePartial).toContain('class="milestone-info"');
  expect(milestonePartial).toContain('style="width: @milestone.getCompletionRate%;"');
  expect(source).toContain('data-stylex-owner="project-issues-subtask-progress-bar"');
  expect(source).toContain('data-stylex-owner="project-issues-milestone-progress-bar"');
  expect(source).not.toContain("style={{ width: `${percentage}%` }}");
  expect(source).not.toContain("style={{ width: `${completionPercent}%` }}");
  expect(styleSource).toContain("progressBar: (width: string) => ({ width })");

  await mockIssues(page);
  await page.goto(`${basePath}/admin/sample/issues?milestoneId=5`, { waitUntil: "commit" });

  const subtask = page.locator('[data-stylex-owner="project-issues-subtask-progress-bar"]');
  const milestone = page.locator('[data-stylex-owner="project-issues-milestone-progress-bar"]');
  await expect(subtask).toHaveCount(1);
  await expect(milestone).toHaveCount(1);
  await expect(subtask).toHaveCSS("width", "15px");
  await expect(milestone).toHaveCSS("width", "50px");
  await expect(subtask).toHaveClass(/\bbar\b/);
  await expect(milestone).toHaveClass(/\bbar\b/);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

async function mockIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Admin",
            authorLoginId: "admin",
            childClosedCount: 1,
            childOpenCount: 1,
            commentCount: 0,
            id: 1,
            issueNumber: 1,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Progress issue",
            updatedLabel: "2026-07-18",
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestones: [
          {
            closedIssueCount: 1,
            completionPercent: 50,
            dueDateLabel: "",
            id: 5,
            openIssueCount: 1,
            state: "open",
            title: "v1.0",
            untilLabel: "",
          },
        ],
      },
    }),
  );
  for (const suffix of ["labels", "assignable-users", "issue-search-users"]) {
    await page.route(`**/api/v1/owners/admin/projects/sample/${suffix}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { items: [], labels: [], users: [] },
      }),
    );
  }
}
