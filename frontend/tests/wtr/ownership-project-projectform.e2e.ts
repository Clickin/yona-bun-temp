import { expect, test, type Page } from "../wtr-compat.ts";

test("project create form owns the legacy default and dependent states with Style", async ({
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
  await expect(page.locator("#project-name")).toBeFocused();
  const nameColors = await page.locator("#project-name").evaluate((input) => ({
    text: getComputedStyle(input).color,
    placeholder: getComputedStyle(input, "::placeholder").color,
  }));
  expect(nameColors).toEqual({
    text: "rgb(85, 85, 85)",
    placeholder: "rgb(153, 153, 153)",
  });
  await expect(page.locator('[data-owner="project-form"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="project-form-advanced"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="project-form-actions"]')).toBeVisible();
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  // bucket-2: page-wide pin trips on the authenticated sidenav tabs
  // (data-toggle="tab", faithful legacy port of app/views/sidebar.scala.html);
  // scope to the form owner per wave 19/21 convention.
  await expect(
    page.locator(
      '[data-owner="project-form"] [data-toggle], [data-owner="project-form"] [data-type], [data-owner="project-form"] [data-avatar-url]',
    ),
  ).toHaveCount(0);

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
