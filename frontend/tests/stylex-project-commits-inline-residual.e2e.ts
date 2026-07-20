import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url)),
  "utf8",
);
const STYLE_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-commits.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const LEGACY_SOURCE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/code/history.scala.html", import.meta.url)),
  "utf8",
);
const LESS_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);

test("project commits owns inline selectors, tabs, and populated row typography in route StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockHistory(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });

  const picker = page.locator('[data-stylex-owner="project-commits-branch-picker"]');
  await expect(picker).toHaveCount(1);
  await expect(picker).toHaveCSS("width", "220px");
  await expect(picker).not.toHaveAttribute("style", /width/u);

  const trigger = picker.locator("button.select2-choice");
  // The legacy Select2 border box leaves two pixels for the trigger borders.
  await expect(trigger).toHaveCSS("width", "218px");
  await expect(trigger).toHaveCSS("text-align", "left");
  await trigger.click();
  const dropdown = picker.locator(".select2-drop");
  await expect(dropdown).toBeVisible();
  const dropdownWidth = await dropdown.evaluate((element) => element.getBoundingClientRect().width);
  expect(dropdownWidth).toBeGreaterThan(0);
  expect(dropdownWidth).toBeLessThanOrEqual(220);
  expect((await dropdown.getAttribute("style")) ?? "").not.toMatch(/width/u);

  const tabs = page.locator('[data-stylex-owner="project-commits-tabs"]');
  await expect(tabs).toHaveCSS("margin-bottom", "20px");
  expect((await tabs.getAttribute("style")) ?? "").not.toMatch(/margin-bottom/u);

  const row = page.locator('[data-stylex-owner="project-commits-table"] tbody tr').first();
  await expect(row.locator(".commit-id")).toContainText("abcdef1");
  await expect(row.locator(".messages")).toContainText("Initial commit");
  await expect(row.locator(".date")).toContainText("Jul 17, 2026");
  await expect(row.locator(".author .avatar-wrap")).toHaveCount(1);

  const commitId = page.locator('[data-stylex-owner="project-commits-commit-id"]');
  await expect(commitId).toHaveCSS("width", "70px");
  await expect(commitId).toHaveCSS("padding", "12px 3px");
  await expect(commitId).toHaveCSS("font-size", "12px");
  await expect(commitId.locator("a")).toHaveCSS("color", "rgb(81, 170, 204)");
  await expect(page.locator('[data-stylex-owner="project-commits-messages"]')).toHaveCSS(
    "vertical-align",
    "top",
  );
  await expect(page.locator('[data-stylex-owner="project-commits-date"]')).toHaveCSS(
    "width",
    "100px",
  );
  const author = page.locator('[data-stylex-owner="project-commits-author"]');
  await expect(author).toHaveCSS("width", /^(40|41(?:\.\d+)?)px$/u);
  await expect(page.locator('[data-stylex-owner="project-commits-message-summary"]')).toHaveCSS(
    "padding",
    "5px",
  );
  await expect(page.locator('[data-stylex-owner="project-commits-message-summary"]')).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(page.locator('[data-stylex-owner="project-commits-comment-count"]')).toHaveCSS(
    "margin-right",
    "8px",
  );
  const commentCount = page.locator('[data-stylex-owner="project-commits-comment-count"]');
  await expect(commentCount).toHaveCSS("color", "rgb(102, 102, 102)");
  await expect(commentCount).toHaveCSS("float", "right");
  await expect(commentCount).toHaveCSS("position", "relative");
  await expect(commentCount).not.toHaveClass(/number-of-comments/u);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const mobileTabs = page.locator('[data-stylex-owner="project-commits-tabs"]');
  const mobileCommentCount = page.locator('[data-stylex-owner="project-commits-comment-count"]');
  await expect(mobileCommentCount).toBeVisible();
  await expect(mobileCommentCount).toHaveCSS("margin-right", "8px");
  await expect(mobileCommentCount).toHaveCSS("float", "right");
  const metrics = await mobileTabs.evaluate((element) => ({
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);

  expect(SOURCE).not.toContain("style={{ width: 220 }}");
  expect(SOURCE).not.toContain('style={{ marginBottom: "20px" }}');
  expect(SOURCE).not.toContain('style={branchMenuOpen ? { display: "block", width: 220 }');
  for (const owner of [
    "project-commits-commit-id",
    "project-commits-messages",
    "project-commits-date",
    "project-commits-author",
    "project-commits-message-summary",
    "project-commits-comment-count",
  ]) {
    expect(SOURCE).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(STYLE_SOURCE).toContain("commitIdCell");
  expect(STYLE_SOURCE).toContain("messagesCell");
  expect(STYLE_SOURCE).toContain("commitMessage");
  expect(STYLE_SOURCE).toContain("commentCount");
  expect(STYLE_SOURCE).toContain('width: "70px"');
  expect(STYLE_SOURCE).toContain('width: "100px"');
  expect(STYLE_SOURCE).toContain('width: "40px"');
  expect(STYLE_SOURCE).toContain('padding: "5px"');
  expect(STYLE_SOURCE).toContain('marginRight: "8px"');
  expect(STYLE_SOURCE).toContain('float: "right"');
  expect(STYLE_SOURCE).toContain('position: "relative"');
  expect(SOURCE).not.toContain(
    "className={`${stylex.props(styles.commentCount).className} number-of-comments`}",
  );
  expect(LEGACY_SOURCE).toContain('class="commit-wrap"');
  expect(LEGACY_SOURCE).toContain('class="code-table commits');
  expect(LEGACY_SOURCE).toContain('class="number-of-comments"');
  expect(LESS_SOURCE).toContain(".commit-wrap {");
  expect(LESS_SOURCE).toContain(".btn-copy-commitId");
  expect(LESS_SOURCE).toContain(".commitMsg.short");
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
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
