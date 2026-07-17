import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("milestone edit form preserves legacy editor/options geometry with StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  page.on("dialog", (dialog) => dialog.dismiss());
  await mockMilestoneEdit(page);
  await page.goto(`${basePath}/admin/sample/milestone/5/editform`, { waitUntil: "commit" });

  await expect(page).toHaveTitle("Edit milestone - admin/sample");
  await expect(page.locator('[data-stylex-owner="milestone-edit-form"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-editor-pane"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-options"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-actions"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-uploader"]')).toBeVisible();
  await expect(page.locator("#title")).toHaveValue("Sprint 1");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator("#dueDate")).toHaveValue("2026-08-02");
  await expect(page.locator("[data-toggle], [data-dismiss], [data-request-method]")).toHaveCount(0);

  const geometry = await page
    .locator('[data-stylex-owner="milestone-edit-form-editor-pane"]')
    .evaluate((left) => {
      const right = left.parentElement?.querySelector<HTMLElement>(
        "[data-stylex-owner='milestone-edit-form-options']",
      );
      if (!right) throw new Error("Missing milestone options pane");
      return {
        left: Math.round(left.getBoundingClientRect().width),
        right: Math.round(right.getBoundingClientRect().width),
      };
    });
  expect(geometry.left).toBeGreaterThan(geometry.right);

  expect(SOURCE).toContain('id="milestone-form"');
  expect(SOURCE).toContain('id="button-clear-temporary"');
  expect(SOURCE).toContain("MilestoneFileUploader");
  expect(SOURCE).not.toContain("$yobi.loadModule");
  expect(SOURCE).not.toMatch(/href="javascript:/u);
});

async function mockMilestoneEdit(page: Page) {
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
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        logoUrl: "/assets/images/project_default_logo.png",
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
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: {
          id: 5,
          title: "Sprint 1",
          contentsMarkdown: "Milestone body",
          state: "OPEN",
          dueDateLabel: "2026-08-02",
        },
      }),
    });
  });
}
