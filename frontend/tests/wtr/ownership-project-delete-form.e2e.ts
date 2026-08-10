import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFileSync maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test } from "../wtr-compat.ts";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/deleteform.tsx", import.meta.url)),
  "utf8",
);
const styleSource =
  readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8") +
  readFileSync(
    fileURLToPath(
      new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
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

test("project delete default and confirmation states have six direct Style owners", () => {
  expect(new Set(owners).size).toBe(6);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
});

test("project delete migrated owners retire legacy presentation and plugin hooks", () => {
  expect(routeSource).not.toMatch(/document\.(querySelector|getElementById|addEventListener)/);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain('setDeletionModalState("open")');
  expect(routeSource).toContain("deleteMutation.mutate()");
});

test("project delete browser state preserves modal geometry and React dismissal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
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
  const action = page.locator('[data-owner="project-delete-action"]').last();
  const modal = page.locator('[data-owner="project-delete-modal"]');
  await expect(action).toBeVisible();
  await expect(modal).toHaveCSS("display", "none");
  await page.locator("#accept").check();
  await page.locator("#btnDelete").click();
  await expect(modal).toBeVisible();
  await expect(page.locator('[data-owner="project-delete-modal-backdrop"]')).toBeVisible();
  const geometry = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
  });
  expect(geometry.width).toBe(562);
  // Fixed modal centers in the 1366px viewport: 50% - 280px margin = 403; top 10% of 900 = 90.
  expect(geometry.left).toBeCloseTo(403, 0);
  expect(geometry.top).toBeCloseTo(90, 0);
  await page.locator('[data-owner="project-delete-modal-footer"] button').last().click();
  await expect(modal).toBeHidden();
});
