import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(new URL("../src/routes/projectform.tsx", import.meta.url), "utf8");

test("project create form owns the legacy default and dependent states with StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);
  const createRequests: { method: string; csrf: string | undefined; body: unknown }[] = [];
  await page.route("**/api/v1/owners/admin/projects", async (route) => {
    createRequests.push({
      method: route.request().method(),
      csrf: route.request().headers()["x-csrf-token"],
      body: route.request().postDataJSON(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ownerName: "admin", projectName: "new-project" }),
    });
  });

  await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Create new project");
  await expect(page.locator('[data-stylex-owner="project-form"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="project-form-advanced"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="project-form-actions"]')).toBeVisible();
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator("[data-toggle], [data-type], [data-avatar-url]")).toHaveCount(0);

  await page.locator("#project-owner").selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await page.locator("#protected").check();
  await page.locator("#vcs").selectOption("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
  await page.locator("#vcs").selectOption("GIT");
  await expect(page.locator("#svn")).toBeHidden();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeVisible();

  await page.locator("#project-owner").selectOption("admin");
  await expect(page.locator("#opt-protected")).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();
  await page.locator("#project-name").fill("new-project");
  await page.locator("#newProjectForm button.ybtn-success").click();
  await expect.poll(() => createRequests.length).toBe(1);
  expect(createRequests[0]).toMatchObject({ method: "POST", csrf: "csrf-project-create" });
  expect(createRequests[0].body).toMatchObject({ projectName: "new-project" });

  expect(SOURCE).toContain('id="newProjectForm"');
  expect(SOURCE).toContain('id="project-owner"');
  expect(SOURCE).toContain('id="project-name"');
  expect(SOURCE).toContain('id="public"');
  expect(SOURCE).not.toContain('data-toggle="select2"');
  expect(SOURCE).not.toContain("$yobi.loadModule");
  expect(SOURCE).not.toMatch(/<a\s+href=/u);
});

async function mockProjectCreate(page: Page) {
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
      headers: { "x-csrf-token": "csrf-project-create" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/projects/form-options*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
      }),
    });
  });
}
