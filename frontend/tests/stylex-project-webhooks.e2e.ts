import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-webhooks.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-webhooks-new-form",
  "project-webhooks-form-legend",
  "project-webhooks-form-fields",
  "project-webhooks-payload",
  "project-webhooks-secret",
  "project-webhooks-submit",
  "project-webhooks-list",
  "project-webhooks-list-head",
] as const;

test("webhooks form exposes direct StyleX owners for legacy form/list output", () => {
  expect(new Set(owners).size).toBe(8);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-webhooks.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("webhooks route keeps geometry in route declarations and theme variables paint-only", () => {
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('margin: "30px auto"');
  expect(routeSource).toContain('width: "355px"');
  expect(routeSource).toContain("onWebhookTypeChange");
  expect(routeSource).toContain("setGitPushChecked");
});

test("webhooks route translates legacy JSON git-push lock to React state", () => {
  expect(routeSource).toContain('selectedWebhookType === "JSON"');
  expect(routeSource).toContain("event.preventDefault()");
  expect(routeSource).toContain("createProjectWebhookRest");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("webhooks form renders fields/list and locks git push for JSON type", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
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
        showCode: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/webhooks", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "sample",
        viewerCanUpdate: true,
        webhooks: [],
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator('[data-stylex-owner="project-webhooks-new-form"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-webhooks-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-webhooks-list-head"]')).toBeVisible();
  await page.locator('input[name="webhookType"][value="JSON"]').check();
  const gitPush = page.locator("#gitPush");
  await expect(gitPush).toBeChecked();
  await gitPush.click();
  await expect(gitPush).toBeChecked();
  const geometry = await page
    .locator('[data-stylex-owner="project-webhooks-payload"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
});
