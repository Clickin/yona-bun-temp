import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/branches.tsx", import.meta.url),
  "utf8",
);
const APP_CSS = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const LEGACY_BRANCHES = readFileSync(
  new URL("../../yona-original/app/views/code/branches.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_BRANCH_ROW = readFileSync(
  new URL("../../yona-original/app/views/code/partial_branchrow.scala.html", import.meta.url),
  "utf8",
);

test("project branches owns the legacy branch table with route StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockBranches(page);
  await page.goto(`${basePath}/admin/sample/branches`);

  await expect(page.locator('[data-stylex-owner="project-branches-table"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="project-branches-row"]')).toHaveCount(2);
  await expect(page.locator('[data-stylex-owner="project-branches-branch-link"]')).toHaveText([
    "main",
    "feature/release",
  ]);
  await expect(page.locator('[data-stylex-owner="project-branches-default-badge"]')).toHaveText(
    "Default branch",
  );
  await expect(page.locator('[data-stylex-owner="project-branches-pull-request-link"]')).toHaveText(
    "pullRequest-3",
  );
  await expect(page.locator('[data-stylex-owner="project-branches-pull-request-dot"]')).toHaveCount(
    1,
  );
  await expect(page.locator("[data-toggle], [data-placement], [data-request-method]")).toHaveCount(
    0,
  );
  await expect(page.locator(".branch-list-wrap")).toHaveCSS("width", /\d+px/u);

  const metrics = await page
    .locator('[data-stylex-owner="project-branches-table"]')
    .evaluate((table) => {
      const head = table.querySelector<HTMLElement>(".thead")!;
      const row = table.querySelector<HTMLElement>("tbody tr")!;
      const branch = table.querySelector<HTMLElement>(
        "[data-stylex-owner='project-branches-branch-cell']",
      )!;
      const commit = table.querySelector<HTMLElement>(
        "[data-stylex-owner='project-branches-commit-cell']",
      )!;
      const actions = table.querySelector<HTMLElement>(
        "[data-stylex-owner='project-branches-actions']",
      )!;
      const cell = table.querySelector<HTMLElement>("th")!;
      const dot = table.querySelector<HTMLElement>(
        "[data-stylex-owner='project-branches-pull-request-dot']",
      )!;
      return {
        headBackground: getComputedStyle(head).backgroundColor,
        headLineHeight: getComputedStyle(head).lineHeight,
        rowBorder: getComputedStyle(row).borderBottomWidth,
        branchMinWidth: getComputedStyle(branch).minWidth,
        commitWidth: getComputedStyle(commit).width,
        cellVerticalAlign: getComputedStyle(cell).verticalAlign,
        cellBorder: getComputedStyle(cell).border,
        actionsWidth: getComputedStyle(actions).width,
        actionsMinWidth: getComputedStyle(actions).minWidth,
        actionsTextAlign: getComputedStyle(actions).textAlign,
        dotWidth: getComputedStyle(dot).width,
        dotHeight: getComputedStyle(dot).height,
      };
    });
  expect(metrics).toEqual({
    headBackground: "rgb(245, 245, 245)",
    headLineHeight: "34px",
    rowBorder: "1px",
    branchMinWidth: "180px",
    commitWidth: "155px",
    cellVerticalAlign: "top",
    cellBorder: "0px none rgb(51, 51, 51)",
    actionsWidth: "220px",
    actionsMinWidth: "220px",
    actionsTextAlign: "right",
    dotWidth: "10px",
    dotHeight: "10px",
  });

  expect(SOURCE).not.toContain('data-toggle="tooltip"');
  expect(SOURCE).not.toContain("data-placement");
  expect(SOURCE).not.toContain("data-request-method");
  expect(APP_CSS).not.toContain(".branch-list-wrap .pullRequest .pullrequest-state.open::before");
  expect(APP_CSS).not.toContain(".branch-list-wrap .pullRequest .pullrequest-state.closed::before");
  expect(APP_CSS).not.toContain(".branch-list-wrap .pullRequest .pullrequest-state.merged::before");
  expect(APP_CSS).not.toContain(".branch-list-wrap .actions");
  expect(APP_CSS).not.toContain(".branch-list-wrap .thead");
  expect(APP_CSS).not.toContain(".branch-list-wrap tr");
  expect(APP_CSS).not.toContain(".branch-list-wrap th");
  expect(APP_CSS).not.toContain(".branch-list-wrap td");
  expect(APP_CSS).not.toContain(".branch-list-wrap .branchName");
  expect(APP_CSS).not.toContain(".branch-list-wrap .commit");
  expect(APP_CSS).not.toContain(".branch-list-wrap .pullRequest");
  expect(LEGACY_BRANCHES).toContain('class="table branch-list-wrap"');
  expect(LEGACY_BRANCH_ROW).toContain('<td class="branchName">');
  expect(LEGACY_BRANCH_ROW).toContain('<td class="actions">');
  expect(LEGACY_BRANCH_ROW).toContain("pullrequest-state");
});

async function mockBranches(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 1,
        organizationName: "",
        ownerName: "admin",
        postCount: 1,
        projectName: "sample",
        projectScope: "public",
        reviewCount: 1,
        vcs: "GIT",
        viewerCanUpdate: true,
        watchingCount: 2,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload()),
    });
  });
}

function branchesPayload() {
  return {
    branches: [
      {
        commitDate: "Jul 1, 2026",
        commitId: "abcdef1234567890",
        commitShortId: "abcdef1",
        isDefault: false,
        name: "main",
        shortName: "main",
        pullRequest: null,
      },
      {
        commitDate: "Jul 2, 2026",
        commitId: "1234567890abcdef",
        commitShortId: "1234567",
        isDefault: false,
        name: "feature/release",
        shortName: "feature/release",
        pullRequest: {
          ownerName: "admin",
          projectName: "sample",
          pullRequestNumber: 3,
          state: "open",
        },
      },
    ],
    defaultBranch: "refs/heads/main",
    noHead: false,
    ownerName: "admin",
    permissions: { canDelete: true, canUpdate: true },
    projectName: "sample",
  };
}
