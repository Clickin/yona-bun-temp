import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routePath = "src/routes/$ownerName/$projectName/newMilestoneForm.tsx";
const stylePath = "src/routes/$ownerName/$projectName/-newMilestoneForm.stylex.ts";

test("new milestone form owns static editor layout declarations", async ({ page }) => {
  const route = readFileSync(routePath, "utf8");
  const styles = readFileSync(stylePath, "utf8");
  const template = readFileSync("../yona-original/app/views/milestone/create.scala.html", "utf8");
  const editor = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");

  expect(template).toContain('<dd style="position: relative;">');
  expect(editor).toContain(
    '<div class="tab-content" style="position:relative;overflow: visible;">',
  );
  expect(route).not.toContain('<dd style={{ position: "relative" }}>');
  expect(route).not.toContain('className="tab-content" style={{ position: "relative"');
  expect(route).toContain('data-stylex-owner="project-milestone-editor-wrapper"');
  expect(route).toContain('data-stylex-owner="project-milestone-editor-tab-content"');
  expect(styles).toContain('editorPositioned: { position: "relative" }');
  expect(styles).toContain('editorTabContent: { overflow: "visible", position: "relative" }');

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: { user: { loginId: "admin" } },
    }),
  );
  await page.route("**/api/v1/owners/weblabs/projects/portal/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        isProtected: true,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/portal/newMilestoneForm`);
  const wrapper = page.locator('[data-stylex-owner="project-milestone-editor-wrapper"]');
  const tabContent = page.locator('[data-stylex-owner="project-milestone-editor-tab-content"]');
  await expect(wrapper).toBeVisible();
  await expect(tabContent).toBeVisible();
  await expect(wrapper).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("overflow", "visible");
  expect(await wrapper.getAttribute("style")).toBeNull();
  expect(await tabContent.getAttribute("style")).toBeNull();

  const geometry = await tabContent.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});
