import { expect, test } from "@playwright/test";

const connectJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      rpcBaseUrl: "/yona/rpc",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...connectJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadCurrentSession", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ListProjects", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
          },
        ],
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    "**/rpc/yona.pilot.v1.PilotService/ListOrganizations",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            {
              description: "web labs",
              organizationName: "weblabs",
            },
          ],
        }),
        headers: connectJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route("**/rpc/yona.pilot.v1.PilotService/SignOut", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });
});

test("shell routing smoke covers home, auth, public directories, and deep placeholders", async ({
  page,
}) => {
  await page.goto("/yona/");
  await expect(page).toHaveTitle("Yona");
  await expect(page.getByRole("heading", { name: "Legacy Route Foundation" })).toBeVisible();

  await page.goto("/yona/users/loginform");
  await expect(page).toHaveTitle("Login");
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();

  await page.goto("/yona/projects?filter=yobi&pageNum=1");
  await expect(page).toHaveTitle("Project List");
  await expect(page.getByText("projectYobi")).toBeVisible();

  await page.goto("/yona/orgs?filter=lab&pageNum=1");
  await expect(page).toHaveTitle("Organization List");
  await expect(page.getByText("weblabs")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issues?pageNum=2");
  await expect(page).toHaveTitle("Issues");
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
});

test("programmatic internal navigation keeps browser URL in sync under the mounted base path", async ({
  page,
}) => {
  await page.goto("/yona/me");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("canonical user settings path stays mounted under the base path", async ({ page }) => {
  await page.goto("/yona/user/editform/password");
  await expect(page).toHaveTitle("Account Settings");
  await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Change Password" })).toHaveAttribute(
    "href",
    "/yona/user/editform/password",
  );
  await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
});
