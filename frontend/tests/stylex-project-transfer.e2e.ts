import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/transfer.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-transfer.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-transfer-bubble",
  "project-transfer-owner-row",
  "project-transfer-owner-label",
  "project-transfer-owner-description",
  "project-transfer-owner-input",
  "project-transfer-agreement-row",
  "project-transfer-agreement-label",
  "project-transfer-agreement-description",
  "project-transfer-notices",
  "project-transfer-notice",
  "project-transfer-checkbox",
  "project-transfer-agreement",
  "project-transfer-action",
  "project-transfer-modal",
  "project-transfer-modal-header",
  "project-transfer-modal-body",
  "project-transfer-modal-footer",
  "project-transfer-modal-backdrop",
] as const;

test("project transfer default and confirmation states have eighteen direct StyleX owners", () => {
  expect(new Set(owners).size).toBe(18);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-transfer.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("project transfer keeps geometry inline and uses a paint-only route theme", () => {
  for (const geometryProperty of [
    "height:",
    "margin:",
    "padding:",
    "width:",
    "top:",
    "left:",
    "right:",
    "bottom:",
  ]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('default: "560px"');
  expect(routeSource).toContain('default: "20px 0 12px"');
  expect(routeSource).toContain('"@media (max-width: 720px)": "10px 0"');
  expect(routeSource).toContain('top: "10%"');
});

test("project transfer retires modal/button presentation hooks at owned nodes", () => {
  for (const retiredSource of [
    'className="box-wrap bottom"',
    'className="ybtn ybtn-danger"',
    'className="ybtn"',
    'className="modal hide"',
    'className="modal-header"',
    'className="modal-body"',
    'className="modal-footer"',
    'className="close"',
    'className="modal-backdrop fade in"',
    "data-toggle=",
    "data-dismiss=",
  ]) {
    expect(routeSource).not.toContain(retiredSource);
  }
  expect(routeSource).not.toMatch(/document\.(querySelector|getElementById|addEventListener)/);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain("setIsTransferModalOpen(true)");
  expect(routeSource).toContain("transferMutation.mutate()");
});

test("project transfer browser state preserves modal geometry and React dismissal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-transfer" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  const project = {
    enrolledUsers: [],
    id: 7,
    isForkedFromOrigin: false,
    isProtected: false,
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
    showCode: true,
    viewerCanUpdate: true,
    viewerCanWatch: false,
  };
  await page.route("**/api/v1/owners/admin/projects/sample/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/settings") || pathname.endsWith("/container")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
      return;
    }
    if (pathname.endsWith("/transfer") && route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ownerName: "admin",
          projectName: "sample",
          viewerCanTransfer: true,
        }),
      });
      return;
    }
    await route.fallback();
  });
  await page.goto(`${basePath}/admin/sample/transfer`);
  const action = page.locator('[data-stylex-owner="project-transfer-action"]').last();
  const modal = page.locator('[data-stylex-owner="project-transfer-modal"]');
  await expect(action).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-transfer-bubble"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-transfer-owner-input"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-transfer-notice"]')).toHaveCount(5);
  await expect(page.locator('[data-stylex-owner="project-transfer-checkbox"]')).not.toBeChecked();
  await expect(modal).toHaveCSS("display", "none");
  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(modal).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-transfer-modal-backdrop"]')).toBeVisible();
  const geometry = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width };
  });
  expect(geometry.width).toBe(562);
  expect(geometry.left).toBeCloseTo(403, 0);
  expect(geometry.top).toBeCloseTo(90, 0);
  await page.locator('[data-stylex-owner="project-transfer-modal-footer"] button').last().click();
  await expect(modal).toBeHidden();
});
