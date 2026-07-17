import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/milestone/edit.scala.html", import.meta.url),
  "utf8",
);

test("milestone edit form keeps StyleX owners across editor, options, upload, and datepicker", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockMilestoneEdit(page);
  await page.goto(`${basePath}/admin/sample/milestone/5/editform`, { waitUntil: "commit" });

  await expect(page.locator('[data-stylex-owner="milestone-edit-form-editor-tabs"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-stylex-owner="milestone-edit-form-editor-content"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-stylex-owner="milestone-edit-form-upload-controls"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-state-options"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-stylex-owner="milestone-edit-form-due-date-options"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="milestone-edit-form-datepicker"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).not.toHaveClass(/active/);

  const geometry = await page
    .locator('[data-stylex-owner="milestone-edit-form-editor-pane"]')
    .evaluate((left) => {
      const right = left.parentElement?.querySelector<HTMLElement>(
        '[data-stylex-owner="milestone-edit-form-options"]',
      );
      if (!right) throw new Error("Missing milestone options pane");
      return {
        left: Math.round(left.getBoundingClientRect().width),
        right: Math.round(right.getBoundingClientRect().width),
      };
    });
  expect(geometry.left).toBeGreaterThan(geometry.right);

  expect(LEGACY_SOURCE).toContain('id -> "milestone-form"');
  expect(LEGACY_SOURCE).toContain('@common.editor("contents"');
  expect(LEGACY_SOURCE).toContain("@common.fileUploader(ResourceType.MILESTONE");
  expect(ROUTE_SOURCE).toContain('data-stylex-owner="milestone-edit-form-datepicker"');
  expect(ROUTE_SOURCE).not.toContain("$yobi.loadModule");
  expect(ROUTE_SOURCE).not.toMatch(/href="javascript:/u);
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
