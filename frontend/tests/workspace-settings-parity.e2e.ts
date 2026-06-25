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
  emails: [
    { emailAddress: "alt@example.com", id: "2", valid: true },
    { emailAddress: "pending@example.com", id: "3", valid: false },
  ],
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

test("workspace profile avatar save, profile submit, and visited reset mutate through REST", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  let currentOverview = { ...workspaceOverview };
  await page.route("**/files", async (route) => {
    const request = route.request();
    requests.push({
      body: null,
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona", ""),
    });
    await route.fulfill({
      body: JSON.stringify({ attachmentId: "avatar-attachment-9" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/profile"), async (route) => {
    const request = route.request();
    requests.push({
      body: request.postDataJSON(),
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    currentOverview = {
      ...currentOverview,
      profile: {
        ...currentOverview.profile,
        avatarUrl: "/files/avatar-attachment-9",
        displayName: "Door Changed",
        primaryEmailAddress: "door.changed@example.com",
      },
    };
    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/recent-projects"), async (route) => {
    const request = route.request();
    requests.push({
      body: null,
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    currentOverview = { ...currentOverview, recentProjects: [] };
    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/user/editform");

  await page.locator("#avatarFile").setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSFMAJH0DCeULl7wAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "avatar.png",
  });
  await expect(page.locator("#avatarCropWrap")).toBeVisible();
  await page.locator("#avatarCropWrap .modal-footer button").first().click();
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
  await page.locator("#avatarCropWrap .btnSubmitCrop").click();
  await expect
    .poll(() => requests.some((request) => request.path === "/files" && request.method === "POST"))
    .toBe(true);
  await expect(page.locator("#avatarCropWrap")).toBeHidden();
  await expect(page.locator('input[name="avatarAttachmentId"]')).toHaveValue("avatar-attachment-9");

  await page.locator('#frmBasic input[name="name"]').fill("Door Changed");
  await page.locator('#frmBasic input[name="email"]').fill("door.changed@example.com");
  await page.locator("#frmBasic button[type='submit']").click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/profile"))
    .toBe(true);
  expect(requests.find((request) => request.path === "/workspace/profile")).toEqual({
    body: {
      avatarAttachmentId: "avatar-attachment-9",
      email: "door.changed@example.com",
      name: "Door Changed",
    },
    method: "PATCH",
    path: "/workspace/profile",
  });
  await expect(page).toHaveURL(/\/yona\/me$/);

  await page.goto("/yona/user/editform");
  await page.locator(".reset-user-visited-list button[type='submit']").click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/recent-projects"))
    .toBe(true);
  expect(requests.find((request) => request.path === "/workspace/recent-projects")).toEqual({
    body: null,
    method: "DELETE",
    path: "/workspace/recent-projects",
  });
});

test("workspace notification toggle mutates the selected legacy notification row", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  let currentOverview = structuredClone(workspaceOverview);
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/notifications"), async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    requests.push({
      body,
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    currentOverview = {
      ...currentOverview,
      watchedProjects: currentOverview.watchedProjects.map((project) =>
        project.projectId === body.projectId
          ? {
              ...project,
              notifications: project.notifications.map((notification) =>
                notification.eventType === body.eventType
                  ? { ...notification, enabled: !notification.enabled }
                  : notification,
              ),
            }
          : project,
      ),
    };
    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/user/editform/notifications#2");

  const toggle = page.locator('.tab-content [id="2"] input.notiUpdate');
  await expect(toggle).toHaveAttribute("data-href", "/yona/noti/toggle/2/NEW_COMMENT");
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/notifications"))
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: { eventType: "NEW_COMMENT", projectId: "2" },
    method: "POST",
    path: "/workspace/notifications",
  });
  await expect(toggle).toBeChecked();
});

test("workspace email settings keep legacy controls while mutating through REST", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  let currentOverview = { ...workspaceOverview };
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/workspace\/emails(?:\/.*)?$/, async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    requests.push({
      body: request.method() === "POST" ? request.postDataJSON() : null,
      method: request.method(),
      path: requestUrl.pathname.replace("/yona/api/v1", ""),
    });

    if (request.method() === "POST" && requestUrl.pathname.endsWith("/workspace/emails")) {
      currentOverview = {
        ...currentOverview,
        emails: [
          ...currentOverview.emails,
          { emailAddress: "new@example.com", id: "4", valid: false },
        ],
      };
    }
    if (request.method() === "DELETE") {
      currentOverview = {
        ...currentOverview,
        emails: currentOverview.emails.filter((email) => email.id !== "2"),
      };
    }

    await route.fulfill({
      body: JSON.stringify(currentOverview),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/user/editform/emails");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Account");
  await expect(page.locator(".page-wrap > .nav-tabs li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform/emails",
  );
  await expect(page.locator('input[name="email"]')).toHaveAttribute(
    "placeholder",
    "New E-mail address",
  );
  await expect(page.locator("table.mt20")).toContainText("door@example.com");
  await expect(page.locator("table.mt20")).toContainText("Primary email address");
  await expect(page.locator("table.mt20")).toContainText("alt@example.com");
  await expect(page.locator("table.mt20")).toContainText("pending@example.com");

  await page.locator('input[name="email"]').fill("new@example.com");
  await page.locator(".form-inline.inner-bubble button[type='submit']").click();
  await expect.poll(() => requests.map((request) => request.path)).toContain("/workspace/emails");
  expect(requests.at(-1)).toEqual({
    body: { email: "new@example.com" },
    method: "POST",
    path: "/workspace/emails",
  });
  await expect(page.locator("table.mt20")).toContainText("new@example.com");

  const setMainButton = page.locator('button[data-request-uri="/yona/user/email/setAsMain/2"]');
  await expect(setMainButton).toHaveText("Set as primary email address.");
  await setMainButton.click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/emails/2/main"))
    .toBe(true);

  const validationButton = page.locator(
    'button[data-request-uri="/yona/user/email/sendValidationEmail/3"]',
  );
  await expect(validationButton).toContainText("Send a validation email.");
  await validationButton.click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/emails/3/validation"))
    .toBe(true);

  const deleteButton = page.locator('button[data-request-uri="/yona/user/email/delete/2"]');
  await expect(deleteButton).toHaveAttribute("data-request-method", "delete");
  await deleteButton.click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/emails/2"))
    .toBe(true);
  await expect(page.locator("table.mt20")).not.toContainText("alt@example.com");
});

test("workspace token and password settings keep legacy forms while mutating through REST", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  await page.route(apiV1Route("/workspace/api-token/reset"), async (route) => {
    requests.push({
      body: null,
      method: route.request().method(),
      path: new URL(route.request().url()).pathname.replace("/yona/api/v1", ""),
    });
    await route.fulfill({
      body: JSON.stringify({ ...workspaceOverview, apiToken: "door-token-2" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/password"), async (route) => {
    requests.push({
      body: route.request().postDataJSON(),
      method: route.request().method(),
      path: new URL(route.request().url()).pathname.replace("/yona/api/v1", ""),
    });
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

  await page.goto("/yona/user/editform/token");
  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("User Token");
  await expect(page.locator(".token-generate #frmBasic input[name='name']")).toHaveValue(
    "door-token",
  );
  await page.locator(".token-generate #frmBasic button[type='submit']").click();
  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/api-token/reset"))
    .toBe(true);
  await expect(page.locator(".token-generate #frmBasic input[name='name']")).toHaveValue(
    "door-token-2",
  );

  await page.goto("/yona/user/editform/password");
  await expect(page.locator(".page-wrap > .nav-tabs li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform/password",
  );
  await expect(page.locator("#frmPassword")).toBeVisible();
  await page.locator("#oldPassword").fill("old-secret");
  await page.locator("#password").fill("new-secret");
  await page.locator("#retypedPassword").fill("new-secret");
  await page.locator("#frmPassword button[type='submit']").click();

  await expect
    .poll(() => requests.some((request) => request.path === "/workspace/password"))
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: {
      loginId: "door",
      oldPassword: "old-secret",
      password: "new-secret",
      retypedPassword: "new-secret",
    },
    method: "POST",
    path: "/workspace/password",
  });
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
});
