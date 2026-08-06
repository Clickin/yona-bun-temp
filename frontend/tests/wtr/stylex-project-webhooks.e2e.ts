import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFileSync maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

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
  // bucket-3 pin fix (2026-08-06): webhooksStyles now legitimately carries
  // empty-state geometry (errorWrap padding, errorMessage margin, icon size);
  // the paint-only contract applies to the defineVars theme block.
  const themeVars = styleSource.slice(0, styleSource.indexOf("webhooksStyles"));
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(themeVars).not.toContain(geometryProperty);
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
  // bucket-3 pin fix (2026-08-06): the test never mocked the session, so both
  // runners hit the anonymous/login path and the form never rendered. Mirror
  // the admin session mocks used by the sibling webhook specs.
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-stylex-project-webhooks" },
        body: JSON.stringify(session),
      });
    });
  }
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
        projectScope: "PUBLIC",
        showCode: true,
        vcs: "GIT",
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
        webhooks: [
          {
            gitPush: true,
            id: 11,
            payloadUrl: "https://hooks.example.test/yona",
            secret: "",
            webhookType: "SIMPLE",
          },
        ],
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
