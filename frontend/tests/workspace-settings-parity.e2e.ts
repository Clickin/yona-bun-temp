import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const workspaceOverview = {
  apiToken: "door-token",
  daysAgo: 14,
  defaultLandingPath: "/me",
  emails: [],
  favoriteProjects: [],
  issueItems: [],
  memberProjects: [],
  profile: {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: "Door",
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "door",
    primaryEmailAddress: "door@example.com",
    sinceLabel: "Jun 26, 2026",
  },
  pullRequestItems: [],
  recentProjects: [],
  watchedProjects: [
    {
      notifications: [{ enabled: true, eventType: "NEW_ISSUE", label: "New issue" }],
      ownerName: "admin",
      projectId: "1",
      projectName: "projectYobi",
    },
    {
      notifications: [{ enabled: false, eventType: "NEW_COMMENT", label: "New comment" }],
      ownerName: "weblabs",
      projectId: "2",
      projectName: "projectTwo",
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(workspaceOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("workspace notification settings honors legacy hash tab activation", async ({ page }) => {
  await page.goto("/yona/user/editform/notifications#2");

  await expect(page.locator('#notification-projects li.active a[href="#2"]')).toHaveText(
    "weblabs / projectTwo",
  );
  await expect(page.locator('#notification-projects li.active a[href="#1"]')).toHaveCount(0);
  await expect(page.locator('.tab-content [id="2"]')).toHaveClass(/active/);
  await expect(page.locator('.tab-content [id="1"]')).not.toHaveClass(/active/);
});

test("workspace settings shell stays usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/yona/user/editform/notifications#2");

  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator("#notification-projects")).toBeVisible();
  await expect(page.locator('#notification-projects li.active a[href="#2"]')).toHaveText(
    "weblabs / projectTwo",
  );
  await expect(page.locator('.tab-content [id="2"]')).toHaveClass(/active/);
});

test("workspace avatar invalid file and crop modal keep legacy settings selectors visible", async ({
  page,
}) => {
  await page.goto("/yona/user/editform");

  await page.locator("#avatarFile").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "avatar.txt",
  });
  await expect(page.getByRole("alert")).toHaveText("Only image files are allowed to be uploaded.");
  await expect(page.locator("#avatarCropWrap")).toBeHidden();

  await page.locator("#avatarFile").setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSFMAJH0DCeULl7wAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "avatar.png",
  });

  await expect(page.locator("#avatarCropWrap")).toBeVisible();
  await expect(page.locator("#avatarCropWrap .avatar-wrap img")).toBeVisible();
  await expect(page.locator("#avatarCropWrap .btnSubmitCrop")).toHaveText("Save");
  await expect(page.locator("#avatarCropWrap .modal-footer button").first()).toHaveText("Cancel");
});
