import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/newMilestoneForm.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-newMilestoneForm.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-milestone-create-form",
  "project-milestone-title",
  "project-milestone-actions",
  "project-milestone-save",
  "project-milestone-cancel",
  "project-milestone-options",
  "project-milestone-due-date",
] as const;

test("new milestone form exposes direct StyleX owners for its legacy skeleton", () => {
  expect(new Set(owners).size).toBe(7);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-newMilestoneForm.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("new milestone theme contains paint only while route keeps geometry declarations", () => {
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('padding: "4px 12px"');
  expect(routeSource).toContain('fontSize: "14px"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/milestones"');
});

test("new milestone actions own right alignment through direct StyleX", () => {
  expect(styleSource).toContain('actions: { textAlign: "right" }');
  expect(routeSource).toContain("newMilestoneFormStyles.actions");
  expect(routeSource).toContain("className={`actrow ${actionStyleProps.className}`}");
});

test("new milestone route translates legacy editor and date behavior to React state", () => {
  expect(routeSource).toContain("setActiveTab");
  expect(routeSource).toContain("setDueDate");
  expect(routeSource).toContain('setActiveTab("preview")');
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("new milestone form renders title/options/actions and keeps editor tab React-owned", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/newMilestoneForm`);
  await expect(page.locator('[data-stylex-owner="project-milestone-create-form"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-milestone-title"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-milestone-options"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-milestone-save"]')).toHaveText("Save");
  await expect(page.locator('[data-stylex-owner="project-milestone-cancel"]')).toHaveText("Cancel");
  await expect(page.locator('[data-stylex-owner="project-milestone-due-date"]')).toBeVisible();
  await page.locator('[data-stylex-owner="project-milestone-title"]').fill("Release 1");
  await page.locator('button:has-text("Preview")').click();
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  await page.locator('button:has-text("Edit")').click();
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  const geometry = await page
    .locator('[data-stylex-owner="project-milestone-title"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
});
