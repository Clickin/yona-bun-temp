import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type AuthCapabilities = {
  emailVerificationEnabled?: boolean;
  enabledSocialProviders?: string[];
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

async function installRuntimeConfig(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });
}

async function installAuthEntryMocks(
  page: Page,
  capabilities: AuthCapabilities = {},
): Promise<void> {
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
        actorId: "",
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: capabilities.emailVerificationEnabled ?? false,
        enabledSocialProviders: capabilities.enabledSocialProviders ?? [],
        signupRequireConfirm: capabilities.signupRequireConfirm ?? false,
        socialLoginOnly: capabilities.socialLoginOnly ?? false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 14,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Administrator",
          englishName: "",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "2026-06-26",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

function signedInSession() {
  return {
    actorId: "1",
    defaultLandingPath: "/me",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Administrator",
  };
}

test("login form preserves redirectUrl and rememberMe through the REST JSON boundary", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);
  let submittedBody: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/auth/sign-in"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify(signedInSession()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/users/loginform?redirectUrl=/admin/sample");

  const loginForm = page.locator("main .login-form-wrap.frm-wrap form").first();
  await expect(loginForm).toBeVisible();
  await expect(loginForm.locator("input[name='redirectUrl']")).toHaveValue("/admin/sample");
  await expect(loginForm.locator("#remember-me")).toBeChecked();

  await loginForm.locator("input[name='loginIdOrEmail']").fill("admin");
  await loginForm.locator("input[name='password']").fill("secret");
  await loginForm.locator("#remember-me").uncheck();
  await loginForm.locator("button[type='submit']").click();

  await expect(page).toHaveURL(/\/yona\/admin\/sample$/);
  expect(submittedBody).toMatchObject({
    identifier: "admin",
    password: "secret",
    rememberMe: false,
  });
});

test("auth aliases redirect to the legacy public entry routes", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.goto("/yona/login");
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expect(page.locator("main .login-form-wrap.frm-wrap form").first()).toBeVisible();

  await page.goto("/yona/register");
  await expect(page).toHaveURL(/\/yona\/users\/signupform$/);
  await expect(page.locator("form[name='signup']")).toBeVisible();

  await page.goto("/yona/forgot-password");
  await expect(page).toHaveURL(/\/yona\/lostPassword$/);
  await expect(page.locator("#emailAddress")).toBeVisible();

  await page.goto("/yona/reset-password?s=hash-123");
  await expect(page).toHaveURL(/\/yona\/resetPassword\?s=hash-123$/);
  await expect(page.locator("form[name='passwordReset']")).toBeVisible();
});

test("signup confirmation redirects to the legacy home flash target", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page, { signupRequireConfirm: true });
  let submittedBody: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/auth/register"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({
        actorId: "",
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/users/signupform");
  await expect(page.locator(".center-txt")).toContainText(
    "Administrator admission is required for activation.",
  );

  await page.locator("#loginId").fill("newuser");
  await page.locator("#uname").fill("New User");
  await page.locator("#email").fill("newuser@example.com");
  await page.locator("#password").fill("secret1234");
  await page.locator("#retypedPassword").fill("secret1234");
  await page.locator("form[name='signup'] button[type='submit']").click();

  await expect(page).toHaveURL(/\/yona\/\?signup=requested$/);
  await expect(page.locator('[data-toggle="yobi-notify"]')).toContainText(
    "Sign-up request has been sent.",
  );
  expect(submittedBody).toMatchObject({
    emailAddress: "newuser@example.com",
    loginId: "newuser",
    name: "New User",
    password: "secret1234",
    retypedPassword: "secret1234",
  });
});

test("social-login-only and OAuth error states render legacy public auth copy", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: true,
  });

  await page.goto("/yona/users/loginform");
  await expect(page.locator("main .login-form-wrap.frm-wrap")).toContainText(
    "Only allow sign-in via social login",
  );
  await expect(page.locator("main input[name='loginIdOrEmail']")).toHaveCount(0);
  await expect(
    page.locator("main a.oauth-login-btn[href='/yona/authenticate/github']"),
  ).toBeVisible();
  await expect(
    page.locator("main a.oauth-login-btn[href='/yona/authenticate/google']"),
  ).toBeVisible();

  await page.goto("/yona/users/loginform?error=unsupported&provider=github");
  await expect(page.locator(".alert.alert-error")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );

  await page.goto("/yona/users/loginform?error=oauthDenied&provider=github");
  await expect(page.locator(".alert.alert-error")).toContainText(
    "Request forbidden or not allowed",
  );
});

test("lost and reset password browser states preserve legacy copy and redirects", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);
  let requestResetBody: Record<string, unknown> | null = null;
  let completeResetBody: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/auth/password-reset/request"), async (route) => {
    requestResetBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ redirectPath: "/lostPassword?requested=1" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/auth/password-reset/complete"), async (route) => {
    completeResetBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ redirectPath: "/users/loginform?password=reset" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/lostPassword");
  await expect(page).toHaveTitle("Password reset request");
  await page.locator("#loginId").fill("door");
  await page.locator("#emailAddress").fill("door@example.com");
  await page.locator("main .login-form-wrap.frm-wrap form button[type='submit']").click();
  await expect(page).toHaveURL(/\/yona\/lostPassword\?requested=1$/);
  await expect(page.locator(".alert.alert-success")).toContainText("Mail has been sent.");
  expect(requestResetBody).toMatchObject({
    emailAddress: "door@example.com",
    loginId: "door",
  });

  await page.goto("/yona/lostPassword?error=invalid");
  await expect(page.locator(".alert.alert-error")).toContainText("Invalid password reset request");

  await page.goto("/yona/resetPassword?s=hash-123");
  await expect(page).toHaveTitle("Reset password");
  await page.locator("#password").fill("new-secret");
  await page.locator("#retypedPassword").fill("new-secret");
  await page.locator("form[name='passwordReset'] button[type='submit']").click();
  await expect(page).toHaveURL(/\/yona\/users\/loginform\?password=reset$/);
  await expect(page.locator(".alert.alert-success")).toContainText(
    "Please log in with the new password!",
  );
  expect(completeResetBody).toMatchObject({
    hashString: "hash-123",
    password: "new-secret",
    retypedPassword: "new-secret",
  });

  await page.goto("/yona/resetPassword?error=invalid&s=bad-hash");
  await expect(page.locator(".error-wrap")).toContainText("Wrong url to reset password.");
  await expect(page.locator("form[name='passwordReset']")).toHaveCount(0);
});

test("verify route renders success and invalid legacy public states", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.route(apiV1Route("/auth/verify"), async (route) => {
    const body = route.request().postDataJSON() as { verificationCode?: string };
    if (body.verificationCode === "ok-code") {
      await route.fulfill({
        body: JSON.stringify({ loginId: "door" }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ message: "Invalid verification" }),
      headers: restJsonHeaders,
      status: 404,
    });
  });

  await page.goto("/yona/verify/door/ok-code");
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText("Verified User");
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText("door");
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText(
    "User is verified. Try logging in.",
  );

  await page.goto("/yona/verify/door/bad-code");
  await expect(page.locator("body")).toContainText("Invalid verification");
  await expect(page.locator(".error-wrap")).toHaveCount(0);
});
