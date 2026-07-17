import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-labels-form-page",
  "project-labels-copy-form",
  "project-labels-copy-legend",
  "project-labels-copy-submit",
  "project-labels-new-form",
  "project-labels-new-submit",
  "project-labels-list",
  "project-labels-list-head",
] as const;

test("labels form exposes direct StyleX owners for legacy forms and list", () => {
  expect(new Set(owners).size).toBe(8);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-labelsform.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("labels form keeps geometry in route declarations and paint in route-local vars", () => {
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('margin: "30px auto"');
  expect(routeSource).toContain('width: "214px"');
  expect(routeSource).toContain("setIsCategoryTypeaheadOpen");
  expect(routeSource).toContain("createMutation.mutate");
});

test("labels form translates legacy label-editor behavior to React state and Query mutations", () => {
  expect(routeSource).toContain("setEditingCategory");
  expect(routeSource).toContain("setEditingLabel");
  expect(routeSource).toContain("setPendingLabelDeletion");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("labels form renders default forms/list and opens category suggestions through React", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectName: "sample",
        showCode: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [{ categoryId: 1, categoryName: "Type", color: "#f44336", id: 1, name: "Bug" }],
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await expect(page.locator('[data-stylex-owner="project-labels-copy-form"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-labels-new-form"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-labels-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-labels-list-head"]')).toBeVisible();
  const category = page.locator('#frmNewLabel input[name="category"]');
  await category.fill("Ty");
  await expect(page.locator(".typeahead.dropdown-menu")).toBeVisible();
  await page.locator(".typeahead.dropdown-menu button").first().click();
  await expect(category).toHaveValue("Type");
  const geometry = await page
    .locator('[data-stylex-owner="project-labels-list"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
});
