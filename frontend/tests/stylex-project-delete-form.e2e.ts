import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/deleteform.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-deleteform.stylex.ts", import.meta.url),
  ),
  "utf8",
);

const owners = [
  "project-delete-action",
  "project-delete-modal",
  "project-delete-modal-header",
  "project-delete-modal-body",
  "project-delete-modal-footer",
  "project-delete-modal-backdrop",
] as const;

test("project delete default and confirmation states have six direct StyleX owners", () => {
  expect(new Set(owners).size).toBe(6);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-deleteform.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("project delete route keeps geometry inline and moves only paint to the route theme", () => {
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

test("project delete migrated owners retire legacy presentation and plugin hooks", () => {
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
  expect(routeSource).toContain('setDeletionModalState("open")');
  expect(routeSource).toContain("deleteMutation.mutate()");
});

test("project delete browser state preserves modal geometry and React dismissal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-delete" },
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
    organizationName: "",
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    showCode: true,
    viewerCanUpdate: true,
    viewerCanWatch: false,
  };
  // Both route queries are served by the owner/project REST container boundary;
  // keep the parent project response available before the screen renders.
  await page.route("**/api/v1/owners/admin/projects/sample/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/settings") || pathname.endsWith("/container")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
      return;
    }
    await route.fallback();
  });
  await page.goto(`${basePath}/admin/sample/deleteform`);
  const action = page.locator('[data-stylex-owner="project-delete-action"]').last();
  const modal = page.locator('[data-stylex-owner="project-delete-modal"]');
  await expect(action).toBeVisible();
  await expect(modal).toHaveCSS("display", "none");
  await page.locator("#accept").check();
  await page.locator("#btnDelete").click();
  await expect(modal).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-delete-modal-backdrop"]')).toBeVisible();
  const geometry = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
  });
  expect(geometry.width).toBe(562);
  // The legacy project shell centers the modal in its 1280px content frame.
  expect(geometry.left).toBeCloseTo(360, 0);
  expect(geometry.top).toBeCloseTo(72, 0);
  await page.locator('[data-stylex-owner="project-delete-modal-footer"] button').last().click();
  await expect(modal).toBeHidden();
});
