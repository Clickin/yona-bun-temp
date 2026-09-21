import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US", viewport: { width: 1280, height: 720 } });

test("lost-password preserves the legacy visible form and desktop/mobile geometry", async ({
  page,
}) => {
  await mockAnonymousSession(page);
  await page.goto(appPath("/lostPassword"));
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveTitle("Password reset request");
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(appPath("/lostPassword"))}$`, "u"));

  const routeRoot = page.locator(".page.full");
  await expect(routeRoot).toBeVisible();
  expect(
    await routeRoot.locator(":scope > *").evaluateAll((elements) =>
      elements.map((element) => ({
        className: element.className
          .split(/\s+/u)
          .filter(
            (classToken) =>
              classToken && !classToken.startsWith("x") && !classToken.includes("__styles."),
          )
          .join(" "),
        tagName: element.tagName,
      })),
    ),
  ).toEqual([
    { className: "center-wrap tag-line-wrap reset-password", tagName: "DIV" },
    { className: "login-form-wrap frm-wrap", tagName: "DIV" },
  ]);
  await expect(routeRoot.locator(":scope > .reset-password .title")).toHaveText(
    "Reset password for Yoram",
  );
  await expect(routeRoot.locator(":scope > .reset-password .highlight")).toHaveText("Yoram");
  await expect(routeRoot.locator(":scope > .reset-password .tag-line")).toHaveText(
    "Web-based platform for collaborative software development",
  );

  const form = routeRoot.locator(".login-form-wrap form");
  await expect(form.locator("input.text")).toHaveCount(2);
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", appPath("/lostPassword"));
  expect(await form.evaluate((element) => new URL(element.action).pathname)).toBe(
    appPath("/lostPassword"),
  );
  expect(
    await form.locator("dl > dd > input").evaluateAll((inputs) =>
      inputs.map((input) => ({
        className: input.className
          .split(/\s+/u)
          .filter(
            (classToken) =>
              classToken && !classToken.startsWith("x") && !classToken.includes("__styles."),
          )
          .join(" "),
        id: input.id,
        name: input.getAttribute("name"),
        placeholder: input.getAttribute("placeholder"),
        required: (input as HTMLInputElement).required,
        type: input.getAttribute("type"),
        valueAttribute: input.getAttribute("value"),
      })),
    ),
  ).toEqual([
    {
      className: "text",
      id: "loginId",
      name: "loginId",
      placeholder: "Login ID",
      required: true,
      type: "text",
      valueAttribute: null,
    },
    {
      className: "text",
      id: "emailAddress",
      name: "emailAddress",
      placeholder: "Email address",
      required: true,
      type: "text",
      valueAttribute: null,
    },
  ]);
  await expect(form.locator("button[type='submit']")).toHaveText("Confirm");
  await assertNoPluginHooks(routeRoot);

  const desktop = await readLostPasswordMetrics(page);
  expect(desktop.viewport).toEqual({ height: 720, scrollWidth: 1280, width: 1280 });
  expectBox(desktop.page, { height: 340, width: 1280, x: 0, y: 40 });
  expectBox(desktop.tagLineWrap, { height: 152, width: 1280, x: 0, y: 40 });
  expectBox(desktop.title, { height: 42, width: 472.94, x: 403.53, y: 120 });
  expectBox(desktop.tagLine, { height: 20, width: 1280, x: 0, y: 172 });
  expect(desktop.tagLineLineHeight).toBe("20px");
  expectBox(desktop.form, { height: 134, width: 400, x: 440, y: 246 });
  expectBox(desktop.loginId, { height: 36, width: 398, x: 440, y: 246 });
  expectBox(desktop.emailAddress, { height: 36, width: 398, x: 440, y: 292 });
  expectBox(desktop.submit, { height: 42, width: 400, x: 440, y: 338 });
  expect(desktop.loginId.right).toBeLessThanOrEqual(desktop.form.right);
  expect(desktop.submit.right).toBe(desktop.form.right);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await readLostPasswordMetrics(page);
  expect(mobile.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(mobile.page, { height: 402, width: 390, x: 0, y: 40 });
  expectBox(mobile.tagLineWrap, { height: 214, width: 390, x: 0, y: 40 });
  expectBox(mobile.title, { height: 84, width: 390, x: 0, y: 120 });
  expectBox(mobile.tagLine, { height: 40, width: 390, x: 0, y: 214 });
  expect(mobile.tagLineLineHeight).toBe("20px");
  expectBox(mobile.form, { height: 134, width: 370.5, x: 9.75, y: 308 });
  expectBox(mobile.loginId, { height: 36, width: 363.97, x: 9.75, y: 308 });
  expectBox(mobile.emailAddress, { height: 36, width: 363.97, x: 9.75, y: 354 });
  expectBox(mobile.submit, { height: 42, width: 370.5, x: 9.75, y: 400 });
  expect(mobile.loginIdFontSize).toBe("16px");
  expect(mobile.emailAddress.right).toBeLessThanOrEqual(mobile.form.right);
});

test("authenticated lost-password prefills the current legacy user fields", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto(appPath("/lostPassword"));

  await expect(page.locator("#loginId")).toHaveValue("doortts");
  await expect(page.locator("#loginId")).toHaveAttribute("value", "doortts");
  await expect(page.locator("#emailAddress")).toHaveValue("doortts@example.com");
  await expect(page.locator("#emailAddress")).toHaveAttribute("value", "doortts@example.com");
});

test("lost-password query alerts keep legacy order and React-owned dismissal", async ({ page }) => {
  await mockAnonymousSession(page);
  await page.goto(appPath("/lostPassword?requested=1"));

  const formWrap = page.locator(".page.full > .login-form-wrap");
  const successAlert = formWrap.locator(':scope > [data-owner="lost-password-success-alert"]');
  await expect(successAlert).toBeVisible();
  await expect(successAlert.locator("h4")).toHaveText("Mail has been sent.");
  await expect(
    successAlert.locator('[data-part="lost-password-success-alert-dismiss"]'),
  ).toHaveText("×");
  await expect(successAlert.locator("[data-dismiss]")).toHaveCount(0);
  expect(
    await formWrap
      .locator(":scope > *")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
      ),
  ).toEqual(["lost-password-success-alert", "FORM"]);
  await successAlert.locator('[data-part="lost-password-success-alert-dismiss"]').click();
  await expect(successAlert).toHaveCount(0);
  await expect(formWrap.locator(":scope > form")).toBeVisible();

  await page.goto(appPath("/lostPassword?error=invalid"));
  const errorAlert = formWrap.locator(':scope > [data-owner="lost-password-error-alert"]');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert.locator("h4")).toHaveText("Failed to send mail.");
  await expect(errorAlert).toContainText("Invalid password reset request");
  await expect(errorAlert).not.toContainText(/^invalid$/u);
  await expect(errorAlert.locator("[data-dismiss]")).toHaveCount(0);
  expect(
    await formWrap
      .locator(":scope > *")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
      ),
  ).toEqual(["lost-password-error-alert", "FORM"]);
  await errorAlert.locator('[data-part="lost-password-error-alert-dismiss"]').click();
  await expect(errorAlert).toHaveCount(0);
  await expect(formWrap.locator(":scope > form")).toBeVisible();
});

test("lost-password submit uses the mounted API boundary and exact SPA success URL", async ({
  page,
}) => {
  const requests = await mockPasswordResetMutation(page, { succeeds: true });
  await page.goto(appPath("/lostPassword"));
  await page.evaluate(() => {
    (window as Window & { __lostPasswordSpaSentinel?: string }).__lostPasswordSpaSentinel = "alive";
  });

  await page.fill("#loginId", "doortts");
  await page.fill("#emailAddress", "doortts@example.com");
  await page.locator(".page.full .login-form-wrap button[type='submit']").click();

  const origin = new URL(page.url()).origin;
  await expect(page).toHaveURL(`${origin}${appPath("/lostPassword")}?requested=1`);
  await expect(page.locator('[data-owner="lost-password-success-alert"]')).toContainText(
    "Mail has been sent.",
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __lostPasswordSpaSentinel?: string }).__lostPasswordSpaSentinel,
    ),
  ).toBe("alive");
  expect(requests.bootstrapPaths).toEqual([appPath("/api/auth/session")]);
  expect(requests.resetRequests).toEqual([
    {
      body: { emailAddress: "doortts@example.com", loginId: "doortts" },
      csrfToken: "csrf-lost-password",
      method: "POST",
      pathname: appPath("/api/v1/auth/password-reset/request"),
    },
  ]);
  expect(requests.sessionPaths).toEqual([appPath("/api/v1/session")]);
});

test("lost-password API error stays before the form and dismisses without navigation", async ({
  page,
}) => {
  await mockPasswordResetMutation(page, { succeeds: false });
  await page.goto(appPath("/lostPassword"));
  await page.evaluate(() => {
    (window as Window & { __lostPasswordSpaSentinel?: string }).__lostPasswordSpaSentinel = "alive";
  });
  const initialUrl = page.url();

  await page.fill("#loginId", "unknown");
  await page.fill("#emailAddress", "unknown@example.com");
  await page.locator(".page.full .login-form-wrap button[type='submit']").click();

  const formWrap = page.locator(".page.full > .login-form-wrap");
  const alert = formWrap.locator(':scope > [data-owner="lost-password-error-alert"]');
  await expect(alert).toBeVisible();
  await expect(alert.locator("h4")).toHaveText("Failed to send mail.");
  await expect(alert).toContainText("Invalid password reset request");
  expect(
    await formWrap
      .locator(":scope > *")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
      ),
  ).toEqual(["lost-password-error-alert", "FORM"]);
  await expect(page).toHaveURL(initialUrl);
  expect(
    await page.evaluate(
      () => (window as Window & { __lostPasswordSpaSentinel?: string }).__lostPasswordSpaSentinel,
    ),
  ).toBe("alive");
  await alert.locator('[data-part="lost-password-error-alert-dismiss"]').click();
  await expect(alert).toHaveCount(0);
  await expect(formWrap.locator(":scope > form")).toBeVisible();
});

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLandingPath: "/", isAnonymous: true, isGuest: false },
    });
  });
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "42",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "doortts@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "doortts",
        userLabel: "Door TTS",
      },
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        favoriteIssues: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Door TTS",
          isGuest: false,
          isSiteAdmin: false,
          loginId: "doortts",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    });
  });
}

async function mockPasswordResetMutation(page: Page, options: { succeeds: boolean }) {
  const bootstrapPaths: string[] = [];
  const resetRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
    pathname: string;
  }> = [];
  const sessionPaths: string[] = [];

  await page.route("**/api/v1/session", async (route) => {
    sessionPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLandingPath: "/", isAnonymous: true, isGuest: false },
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    bootstrapPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-lost-password" },
      json: {},
    });
  });
  await page.route("**/api/v1/auth/password-reset/request", async (route) => {
    const request = route.request();
    resetRequests.push({
      body: request.postDataJSON(),
      csrfToken: request.headers()["x-csrf-token"] ?? null,
      method: request.method(),
      pathname: new URL(request.url()).pathname,
    });
    if (options.succeeds) {
      await route.fulfill({
        contentType: "application/json",
        json: { redirectPath: "/response-redirect-must-not-be-used" },
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: {
        error: {
          code: "invalid_request",
          message: "site.resetPasswordEmail.invalidRequest",
          status: 400,
        },
      },
      status: 400,
    });
  });

  return { bootstrapPaths, resetRequests, sessionPaths };
}

function normalizedBasePath() {
  return BASE_PATH === "/" ? "" : BASE_PATH.replace(/\/$/u, "");
}

function appPath(path: string) {
  const basePath = normalizedBasePath();
  if (path === "/") return basePath === "" ? "/" : `${basePath}/`;
  if (basePath === "" || path === basePath || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function _directChildOrder(root: Locator) {
  return root.locator(":scope > *").evaluateAll((elements) =>
    elements.map((element) => {
      if (element.className) return element.className;
      return element.tagName;
    }),
  );
}

async function assertNoPluginHooks(root: Locator) {
  for (const attribute of [
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-dismiss",
    "data-target",
    "data-trigger",
    "data-backdrop",
    "data-spy",
    "data-provider",
    "data-loading-text",
    "data-login",
    "data-request-method",
    "data-request-uri",
  ]) {
    await expect(root.locator(`[${attribute}]`)).toHaveCount(0);
  }
}

type Box = {
  bottom: number;
  height: number;
  right: number;
  width: number;
  x: number;
  y: number;
};

async function readLostPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const element = (selector: string) => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Missing lost-password metric target: ${selector}`);
      const rect = target.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      return {
        bottom: round(rect.bottom),
        height: round(rect.height),
        right: round(rect.right),
        width: round(rect.width),
        x: round(rect.x),
        y: round(rect.y),
      };
    };
    const loginId = document.querySelector<HTMLElement>("#loginId");
    if (!loginId) throw new Error("Missing lost-password input style target.");
    const tagLine = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password .tag-line");
    if (!tagLine) throw new Error("Missing lost-password tagline style target.");

    return {
      emailAddress: element("#emailAddress"),
      form: element(".page.full > .login-form-wrap"),
      loginId: element("#loginId"),
      loginIdFontSize: getComputedStyle(loginId).fontSize,
      page: element(".page.full"),
      submit: element(".login-form-wrap button[type='submit']"),
      tagLine: element(".tag-line-wrap.reset-password .tag-line"),
      tagLineLineHeight: getComputedStyle(tagLine).lineHeight,
      tagLineWrap: element(".tag-line-wrap.reset-password"),
      title: element(".tag-line-wrap.reset-password .title"),
      viewport: {
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        width: window.innerWidth,
      },
    };
  });
}

function expectBox(actual: Box, expected: Omit<Box, "bottom" | "right">) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
}
