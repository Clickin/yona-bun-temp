import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
  ),
  "utf8",
);

test("issue detail timeline, comment form, and metadata owners are present", () => {
  for (const owner of [
    "project-issue-detail-timeline",
    "project-issue-detail-comment-form",
    "project-issue-detail-sidebar-meta",
    "project-issue-detail-index-timeline",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
});

test("issue detail open state keeps timeline and comment form contained", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const session = {
    isAnonymous: false,
    isSiteAdmin: true,
    isConfirmed: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 42,
        number: 11,
        title: "Fix flaky issue",
        state: "OPEN",
        bodyMarkdown: "Body **markdown**",
        authorLoginId: "admin",
        authorLabel: "Site Admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
        createdDate: "Jul 1, 2026",
        canUpdate: true,
        canWatch: true,
        isWatching: false,
        isFavorited: false,
        isDraft: false,
        weight: 2,
        voters: [],
        sharers: [],
        comments: [],
        timeline: [],
        childIssues: [],
        attachments: [],
        labels: [],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 0,
        viewerCanComment: true,
      },
    }),
  );
  await page.goto("/yona/admin/sample/issue/11");
  await expect(page.locator('[data-stylex-owner="project-issue-detail-timeline"]')).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-comment-form"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-sidebar-meta"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-index-timeline"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-timeline"] strong').first(),
  ).toContainText("Comment");
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-comment-form"] button[type="submit"]'),
  ).toContainText("Add a comment");
  const metrics = await page.evaluate(() => {
    const names = ["timeline", "comment-form", "sidebar-meta", "index-timeline"];
    return Object.fromEntries(
      names.map((name) => {
        const node = document.querySelector<HTMLElement>(
          `[data-stylex-owner="project-issue-detail-${name}"]`,
        );
        if (!node) return [name, null];
        const rect = node.getBoundingClientRect();
        const computed = getComputedStyle(node);
        return [
          name,
          {
            left: rect.left,
            right: rect.right,
            width: rect.width,
            fontFamily: computed.fontFamily,
          },
        ];
      }),
    );
  });
  for (const value of Object.values(metrics)) {
    expect(value).not.toBeNull();
    expect(value!.left).toBeGreaterThanOrEqual(0);
    expect(value!.right).toBeLessThanOrEqual(1366);
    expect(value!.fontFamily).not.toBe("");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});
