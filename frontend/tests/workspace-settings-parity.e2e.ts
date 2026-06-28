import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

const rawSettingsKeyPattern =
  /userinfo\.[A-Za-z]|emails\.(?:click|main|send|set|sub|validation)|validation\.[A-Za-z]|user\.(?:confirmPassword|wrongPassword)/u;

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

test("workspace settings legacy aliases redirect to canonical account tabs without raw keys", async ({
  page,
}) => {
  const aliases = [
    ["/yona/me/settings/profile", /\/yona\/user\/editform$/u, "Edit profile"],
    ["/yona/me/settings/password", /\/yona\/user\/editform\/password$/u, "Change password"],
    [
      "/yona/me/settings/notifications#2",
      /\/yona\/user\/editform\/notifications#2$/u,
      "Notification settings",
    ],
    ["/yona/me/settings/emails", /\/yona\/user\/editform\/emails$/u, "Email settings"],
    ["/yona/me/settings/token", /\/yona\/user\/editform\/token$/u, "User Token"],
  ] as const;

  for (const [alias, canonicalUrl, selectedTabText] of aliases) {
    await page.goto(alias);
    await expect(page).toHaveURL(canonicalUrl);
    await expect(page.locator(".page-wrap > .nav-tabs li.active a")).toContainText(selectedTabText);
    await expect(page.locator("body")).not.toContainText(rawSettingsKeyPattern);
  }
});

test("workspace account setting pages preserve legacy tab and form layout metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });

  await page.goto("/yona/user/editform");
  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Account");
  await expect(page.locator(".page-wrap > .nav.nav-tabs.mt20 > li")).toHaveCount(5);
  await expect(page.locator(".page-wrap > .nav.nav-tabs.mt20 > li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform",
  );
  await expect(page.locator("#frmBasic input[name='loginId']")).toBeEditable({ editable: false });
  await expect(page.locator("#frmBasic input[name='name'].text")).toBeVisible();
  await expect(page.locator("#frmBasic input[name='email'][type='email'].text")).toBeVisible();
  await expect(page.locator("#frmAvatar input[name='filePath']#avatarFile")).toHaveAttribute(
    "accept",
    "image/*",
  );
  await expect(page.locator("#avatarCropWrap.modal.hide")).toBeAttached();

  const profilePageWrapOuter = await layoutBox(page, ".page-wrap-outer");
  const profilePageWrap = await layoutBox(page, ".page-wrap");
  const profileTabs = await layoutBox(page, ".page-wrap > .nav.nav-tabs.mt20");
  const basicForm = await layoutBox(page, "#frmBasic.pull-left");
  const avatarForm = await layoutBox(page, "#frmAvatar.pull-left");
  const resetVisited = await layoutBox(page, ".reset-user-visited-list");
  const profileStyles = await page.locator(".page-wrap").evaluate((element) => {
    const basic = element.querySelector("#frmBasic") as HTMLElement;
    const avatar = element.querySelector("#frmAvatar") as HTMLElement;
    const reset = element.querySelector(".reset-user-visited-list") as HTMLElement;
    return {
      avatarBorderLeft: window.getComputedStyle(avatar).borderLeftWidth,
      avatarFloat: window.getComputedStyle(avatar).float,
      basicFloat: window.getComputedStyle(basic).float,
      resetDisplay: window.getComputedStyle(reset).display,
    };
  });

  expect(profilePageWrap.x).toBeGreaterThanOrEqual(profilePageWrapOuter.x);
  expect(profilePageWrap.width).toBeLessThanOrEqual(profilePageWrapOuter.width + 1);
  expect(profileTabs.y).toBeGreaterThanOrEqual(profilePageWrap.y);
  expect(basicForm.y).toBeGreaterThan(profileTabs.y + profileTabs.height - 1);
  expect(avatarForm.x).toBeGreaterThan(basicForm.x + basicForm.width - 1);
  expect(Math.abs(avatarForm.y - basicForm.y)).toBeLessThanOrEqual(2);
  expect(resetVisited.x).toBeGreaterThanOrEqual(basicForm.x);
  expect(resetVisited.y).toBeGreaterThanOrEqual(basicForm.y);
  expect(profileStyles).toEqual({
    avatarBorderLeft: "1px",
    avatarFloat: "left",
    basicFloat: "left",
    resetDisplay: "block",
  });

  await page.goto("/yona/user/editform/notifications#2");
  await expect(page.locator(".page-wrap > .nav.nav-tabs.mt20 > li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform/notifications",
  );
  await expect(
    page.locator("#notification-projects.unstyled.lst-stacked.span3.mr20"),
  ).toBeVisible();
  await expect(page.locator('#notification-projects li.active a[href="#2"]')).toHaveText(
    "weblabs / projectTwo",
  );
  await expect(
    page.locator('.tab-content [id="2"] table.table-striped.table-bordered'),
  ).toBeVisible();
  await expect(page.locator('.tab-content [id="2"] .switch')).toHaveAttribute(
    "data-on-label",
    "On",
  );
  const notificationTabs = await layoutBox(page, ".page-wrap > .nav.nav-tabs.mt20");
  const projectList = await layoutBox(page, "#notification-projects");
  const notificationContent = await layoutBox(page, ".page-wrap > div > .tab-content");
  expect(projectList.y).toBeGreaterThan(notificationTabs.y + notificationTabs.height - 1);
  expect(notificationContent.x).toBeGreaterThanOrEqual(projectList.x);
  expect(notificationContent.y).toBeGreaterThanOrEqual(projectList.y);

  await page.goto("/yona/user/editform/emails");
  await expect(page.locator(".form-inline.inner-bubble input[name='email']")).toHaveAttribute(
    "placeholder",
    "New E-mail address",
  );
  await expect(page.locator("table.table.mt20 tr")).toHaveCount(3);
  const emailTabs = await layoutBox(page, ".page-wrap > .nav.nav-tabs.mt20");
  const emailForm = await layoutBox(page, ".form-inline.inner-bubble");
  const emailDescription = await layoutBox(page, ".page-wrap > p");
  const emailTable = await layoutBox(page, "table.table.mt20");
  expect(emailForm.y).toBeGreaterThan(emailTabs.y + emailTabs.height - 1);
  expect(emailDescription.y).toBeGreaterThan(emailForm.y + emailForm.height - 1);
  expect(emailTable.y).toBeGreaterThan(emailDescription.y + emailDescription.height - 1);
  expect(emailTable.width).toBeLessThanOrEqual(profilePageWrap.width + 1);

  await page.goto("/yona/user/editform/token");
  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("User Token");
  await expect(page.locator(".page-wrap > .nav.nav-tabs.mt20 > li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform/token",
  );
  const tokenTabs = await layoutBox(page, ".page-wrap > .nav.nav-tabs.mt20");
  const tokenBox = await layoutBox(page, ".token-generate");
  const tokenForm = await layoutBox(page, ".token-generate #frmBasic.pull-left");
  const tokenInput = await layoutBox(page, ".token-generate #frmBasic input[name='name']");
  const tokenButton = await layoutBox(page, ".token-generate #frmBasic button[type='submit']");
  expect(tokenBox.y).toBeGreaterThan(tokenTabs.y + tokenTabs.height - 1);
  expect(tokenForm.width).toBeGreaterThan(profilePageWrap.width * 0.85);
  expect(tokenInput.width).toBeGreaterThan(tokenForm.width * 0.85);
  expect(tokenButton.y).toBeGreaterThan(tokenInput.y + tokenInput.height - 1);

  await page.goto("/yona/user/editform/password");
  await expect(page.locator(".page-wrap > .nav.nav-tabs.mt20 > li.active a")).toHaveAttribute(
    "href",
    "/yona/user/editform/password",
  );
  await expect(page.locator("#frmPassword input[name='loginId']")).toHaveValue("door");
  await expect(page.locator("a.ybtn.ybtn-fail")).toHaveAttribute("href", "/yona/lostPassword");
  const passwordTabs = await layoutBox(page, ".page-wrap > .nav.nav-tabs.mt20");
  const passwordForm = await layoutBox(page, "#frmPassword");
  const passwordFirstInput = await layoutBox(page, "#oldPassword");
  const passwordResetBlock = await layoutBox(page, ".page-wrap > .mt10");
  expect(passwordForm.y).toBeGreaterThan(passwordTabs.y + passwordTabs.height - 1);
  expect(passwordFirstInput.y).toBeGreaterThan(passwordForm.y);
  expect(passwordResetBlock.y).toBeGreaterThan(passwordForm.y + passwordForm.height - 1);
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

test("workspace password validation failures stay visible without leaving REST boundary", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  await page.route(apiV1Route("/workspace/password"), async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    requests.push({
      body,
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    const errorMessage =
      body.oldPassword === "wrong-current" ? "Wrong password!" : "Retyped password doesn't match";
    await route.fulfill({
      body: JSON.stringify({
        error: {
          code: "bad_request",
          message: errorMessage,
          status: 400,
        },
      }),
      headers: restJsonHeaders,
      status: 400,
    });
  });

  await page.goto("/yona/user/editform/password");
  await expect(page.locator("#frmPassword")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(rawSettingsKeyPattern);

  await page.locator("#oldPassword").fill("wrong-current");
  await page.locator("#password").fill("new-secret");
  await page.locator("#retypedPassword").fill("new-secret");
  await page.locator("#frmPassword button[type='submit']").click();
  await expect(page.locator(".runtime-error-banner")).toContainText("Wrong password!");
  expect(requests.at(-1)).toEqual({
    body: {
      loginId: "door",
      oldPassword: "wrong-current",
      password: "new-secret",
      retypedPassword: "new-secret",
    },
    method: "POST",
    path: "/workspace/password",
  });
  await expect(page).toHaveURL(/\/yona\/user\/editform\/password$/);
  await expect(page.locator("body")).not.toContainText(rawSettingsKeyPattern);

  await page.locator("#oldPassword").fill("old-secret");
  await page.locator("#password").fill("new-secret");
  await page.locator("#retypedPassword").fill("different-secret");
  await page.locator("#frmPassword button[type='submit']").click();
  await expect(page.locator(".runtime-error-banner")).toContainText(
    "Retyped password doesn't match",
  );
  expect(requests.at(-1)).toEqual({
    body: {
      loginId: "door",
      oldPassword: "old-secret",
      password: "new-secret",
      retypedPassword: "different-secret",
    },
    method: "POST",
    path: "/workspace/password",
  });
  await expect(page).toHaveURL(/\/yona\/user\/editform\/password$/);
});
