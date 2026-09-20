import { expect, test, type Page } from "../wtr-compat.ts";

test("project commits preserves branch selection, tabs, dates, and row typography", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockHistory(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });

  const picker = page.locator('[data-owner="project-commits-branch-picker"]');
  await expect(picker).toHaveCount(1);
  expect((await picker.boundingBox())?.width).toBe(220);

  const trigger = picker.locator("button.select2-choice");
  await expect(trigger).toHaveAttribute("data-owner", "project-commits-branch-choice");
  // The legacy Select2 border box leaves two pixels for the trigger borders.
  expect((await trigger.boundingBox())?.width).toBe(218);
  await expect(trigger).toHaveCSS("text-align", "left");
  await trigger.click();
  const dropdown = picker.locator(".select2-drop");
  await expect(dropdown).toBeVisible();
  const dropdownWidth = await dropdown.evaluate((element) => element.getBoundingClientRect().width);
  expect(dropdownWidth).toBeGreaterThan(0);
  expect(dropdownWidth).toBeLessThanOrEqual(220);

  const tabs = page.locator('[data-owner="project-commits-tabs"]');
  await expect(tabs).toHaveCSS("margin-bottom", "20px");

  const row = page.locator('[data-owner="project-commits-table"] tbody tr').first();
  await expect(row.locator(".commit-id")).toContainText("abcdef1");
  await expect(row.locator(".messages")).toContainText("Initial commit");
  await expect(row.locator(".date")).toHaveText(
    new Date().getFullYear() === 2026 ? "07-17" : "2026-07-17",
  );
  await expect(row.locator(".author .avatar-wrap")).toHaveCount(1);

  const commitId = page.locator('[data-owner="project-commits-commit-id"]');
  await expect(commitId).toHaveCSS("width", "70px");
  await expect(commitId).toHaveCSS("padding", "12px 3px");
  await expect(commitId).toHaveCSS("font-size", "12px");
  await expect(commitId.locator("a")).toHaveCSS("color", "rgb(81, 170, 204)");
  await expect(page.locator('[data-owner="project-commits-messages"]')).toHaveCSS(
    "vertical-align",
    "top",
  );
  await expect(page.locator('[data-owner="project-commits-date"]')).toHaveCSS("width", "100px");
  const author = page.locator('[data-owner="project-commits-author"]');
  await expect(author).toHaveCSS("width", /^(40|41(?:\.\d+)?)px$/u);
  await expect(page.locator('[data-owner="project-commits-message-summary"]')).toHaveCSS(
    "padding",
    "5px",
  );
  await expect(page.locator('[data-owner="project-commits-message-summary"]')).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(page.locator('[data-owner="project-commits-comment-count"]')).toHaveCSS(
    "margin-right",
    "8px",
  );
  const commentCount = page.locator('[data-owner="project-commits-comment-count"]');
  await expect(commentCount).toHaveCSS("color", "rgb(102, 102, 102)");
  await expect(commentCount).toHaveCSS("float", "right");
  await expect(commentCount).toHaveCSS("position", "relative");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const mobileTabs = page.locator('[data-owner="project-commits-tabs"]');
  const mobileCommentCount = page.locator('[data-owner="project-commits-comment-count"]');
  await expect(mobileCommentCount).toBeVisible();
  await expect(mobileCommentCount).toHaveCSS("margin-right", "8px");
  await expect(mobileCommentCount).toHaveCSS("float", "right");
  const metrics = await mobileTabs.evaluate((element) => ({
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);
});

async function mockHistory(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        defaultBranch: "main",
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/commits**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/ui" }],
        breadcrumbs: [],
        commits: [
          {
            authorAvatarUrl: "",
            authorDate: "Jul 17, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Admin",
            commentCount: 2,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit\nDetails",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
}
