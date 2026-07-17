import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url)),
  "utf8",
);

test("project commits owns legacy inline selector and tabs geometry in route StyleX", async ({
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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const mobileTabs = page.locator('[data-stylex-owner="project-commits-tabs"]');
  const metrics = await mobileTabs.evaluate((element) => ({
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);

  expect(SOURCE).not.toContain("style={{ width: 220 }}");
  expect(SOURCE).not.toContain('style={{ marginBottom: "20px" }}');
  expect(SOURCE).not.toContain('style={branchMenuOpen ? { display: "block", width: 220 }');
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
            commentCount: 0,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit",
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
