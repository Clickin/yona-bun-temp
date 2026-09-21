import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
  "utf8",
);

const legacySource = readFileSync("../yona-original/app/views/milestone/edit.scala.html", "utf8");

test("moves milestone editor layout declarations to route-local Style", async ({ page }) => {
  await mockMilestoneEdit(page);
  await page.goto(`${basePath}/admin/sample/milestone/5/editform`, { waitUntil: "commit" });

  const wrapper = page.locator('[data-owner="milestone-edit-form-editor-wrapper"]');
  const content = page.locator('[data-owner="milestone-edit-form-editor-content"]');
  await expect(wrapper).toBeVisible();
  await expect(content).toBeVisible();
  await expect(wrapper).not.toHaveAttribute("style", /.+/);
  await expect(content).not.toHaveAttribute("style", /.+/);
  await expect(wrapper).toHaveCSS("position", "relative");
  await expect(content).toHaveCSS("position", "relative");
  await expect(content).toHaveCSS("overflow", "visible");

  expect(legacySource).toContain('<dd style="position: relative;">');
  expect(legacySource).toContain('@common.editor("contents"');
  expect(routeSource).toContain('data-owner="milestone-edit-form-editor-wrapper"');

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
});

async function mockMilestoneEdit(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ actorId: 1, isAnonymous: false, isSiteAdmin: true, loginId: "admin" }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: { id: 5, title: "Sprint 1", contentsMarkdown: "Milestone body", state: "OPEN" },
      }),
    });
  });
}
