import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US", viewport: { width: 1280, height: 720 } });

test("reset-password preserves the legacy visible form and desktop/mobile geometry", async ({
  page,
}) => {
  await mockAnonymousSession(page);
  await page.goto(appPath("/resetPassword?s=reset-token"));
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveTitle("Reset password");
  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(appPath("/resetPassword?s=reset-token"))}$`, "u"),
  );

  const routeRoot = page.locator(".page.full");
  await expect(routeRoot).toBeVisible();
  expect(await directChildOrder(routeRoot)).toEqual([
    "center-wrap tag-line-wrap reset-password",
    "login-form-wrap frm-wrap",
  ]);
  await expect(routeRoot.locator(":scope > .reset-password .title")).toHaveText(
    "Reset password for Yona",
  );
  await expect(routeRoot.locator(":scope > .reset-password .highlight")).toHaveText("Yona");
  await expect(routeRoot.locator(":scope > .reset-password .tag-line")).toHaveText(
    "Web-based platform for collaborative software development",
  );

  const form = routeRoot.locator('form[name="passwordReset"]');
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", appPath("/resetPassword"));
  expect(await form.evaluate((element) => new URL(element.action).pathname)).toBe(
    appPath("/resetPassword"),
  );
  expect(await directChildOrder(form)).toEqual(["INPUT", "DL", "btns-row"]);
  await expect(form.locator(':scope > input[name="hashString"]')).toHaveAttribute(
    "value",
    "reset-token",
  );
  expect(
    await form.locator("dl > dd > input").evaluateAll((inputs) =>
      inputs.map((input) => ({
        autocomplete: input.getAttribute("autocomplete"),
        className: input.className,
        id: input.id,
        name: input.getAttribute("name"),
        placeholder: input.getAttribute("placeholder"),
        type: input.getAttribute("type"),
      })),
    ),
  ).toEqual([
    {
      autocomplete: "off",
      className: "text password",
      id: "password",
      name: "password",
      placeholder: "Password",
      type: "password",
    },
    {
      autocomplete: "off",
      className: "text password",
      id: "retypedPassword",
      name: "retypedPassword",
      placeholder: "Password confirmation",
      type: "password",
    },
  ]);
  await expect(form.locator("button[type='submit']")).toHaveText("Confirm");
  await assertNoPluginHooks(routeRoot);

  const desktop = await readResetPasswordMetrics(page);
  expect(desktop.viewport).toEqual({ height: 720, scrollWidth: 1280, width: 1280 });
  expectBox(desktop.page, { height: 338, width: 1280, x: 0, y: 40 });
  expectBox(desktop.tagLineWrap, { height: 152, width: 1280, x: 0, y: 40 });
  expectBox(desktop.title, { height: 42, width: 447.92, x: 416.03, y: 120 });
  expectBox(desktop.tagLine, { height: 20, width: 1280, x: 0, y: 172 });
  expectBox(desktop.form, { height: 132, width: 400, x: 440, y: 246 });
  expectBox(desktop.password, { height: 36, width: 398, x: 440, y: 246 });
  expectBox(desktop.retypedPassword, { height: 36, width: 398, x: 440, y: 297 });
  expectBox(desktop.submit, { height: 30, width: 400, x: 440, y: 348 });
  expect(desktop.password.right).toBeLessThanOrEqual(desktop.form.right);
  expect(desktop.submit.right).toBe(desktop.form.right);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await readResetPasswordMetrics(page);
  expect(mobile.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(mobile.page, { height: 400, width: 390, x: 0, y: 40 });
  expectBox(mobile.tagLineWrap, { height: 214, width: 390, x: 0, y: 40 });
  expectBox(mobile.title, { height: 84, width: 390, x: 0, y: 120 });
  expectBox(mobile.tagLine, { height: 40, width: 390, x: 0, y: 214 });
  expectBox(mobile.form, { height: 132, width: 370.5, x: 9.75, y: 308 });
  expectBox(mobile.password, { height: 36, width: 363.97, x: 9.75, y: 308 });
  expectBox(mobile.retypedPassword, { height: 36, width: 363.97, x: 9.75, y: 359 });
  expectBox(mobile.submit, { height: 30, width: 370.5, x: 9.75, y: 410 });
  expect(mobile.passwordFontSize).toBe("16px");
  expect(mobile.retypedPassword.right).toBeLessThanOrEqual(mobile.form.right);
});

test("reset-password validation uses the legacy copy and left popover geometry", async ({
  page,
}) => {
  await mockAnonymousSession(page);
  let resetCompleteCalls = 0;
  await page.route("**/api/v1/auth/password-reset/complete", async (route) => {
    resetCompleteCalls += 1;
    await route.fulfill({ status: 500, body: "unexpected reset complete" });
  });

  await page.goto(appPath("/resetPassword?s=reset-token"));
  await page.locator("#password").focus();
  await page.locator("#password").blur();
  await expectValidationPopovers(page, ["Required field!", "Required field!"]);
  expectPopoverBoxes(await readPopoverBoxes(page), [
    { height: 37.59, width: 111.8, x: 318, y: 245 },
    { height: 37.59, width: 111.8, x: 318, y: 296 },
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/resetPassword?s=reset-token"));
  await page.locator("#password").focus();
  await page.locator("#password").blur();
  await expectValidationPopovers(page, ["Required field!", "Required field!"]);
  expectPopoverBoxes(await readPopoverBoxes(page), [
    { height: 37.59, width: 111.8, x: -112.25, y: 307 },
    { height: 37.59, width: 111.8, x: -112.25, y: 358 },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.locator("#password").fill("abc");
  await page.locator("#password").blur();
  await expectValidationPopovers(page, [
    "Password must be at least 4 characters in length.",
    "Required field!",
  ]);

  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("different");
  await page.locator("#retypedPassword").blur();
  await expectValidationPopovers(page, ["Retyped password doesn't match"]);
  await page.locator('form[name="passwordReset"] button[type="submit"]').click();
  expect(resetCompleteCalls).toBe(0);
});

test("invalid reset hash preserves the legacy bad-request state and SPA Home link", async ({
  page,
}) => {
  await mockAnonymousSession(page);
  await page.goto(appPath("/resetPassword?error=invalid&s=reset-token"));
  await page.evaluate(() => document.fonts.ready);

  const routeRoot = page.locator(".page-wrap-outer.reset-password-bad-request");
  await expect(routeRoot).toBeVisible();
  expect(await directChildOrder(routeRoot)).toEqual(["project-page-wrap"]);
  expect(await directChildOrder(routeRoot.locator(":scope > .project-page-wrap"))).toEqual([
    "error-wrap",
  ]);
  expect(await directChildOrder(routeRoot.locator(".error-wrap"))).toEqual([
    "ico-404",
    "P",
    "ybtn ybtn-info",
  ]);
  await expect(routeRoot.locator(".error-wrap p")).toHaveText("Wrong url to reset password.");
  const homeLink = routeRoot.getByRole("link", { name: "Home", exact: true });
  await expect(homeLink).toHaveAttribute("href", appPath("/"));
  await expect(homeLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(homeLink).not.toHaveAttribute("data-status", /.+/u);
  await assertNoPluginHooks(routeRoot);

  const desktop = await readBadRequestMetrics(page);
  expect(desktop.viewport).toEqual({ height: 720, scrollWidth: 1280, width: 1280 });
  expectBox(desktop.pageWrapOuter, { height: 450, width: 1280, x: 0, y: 50 });
  expectBox(desktop.projectPageWrap, { height: 310, width: 1260, x: 10, y: 50 });
  expectBox(desktop.errorWrap, { height: 310, width: 1260, x: 10, y: 50 });
  expectBox(desktop.icon, { height: 0, width: 0, x: 640, y: 150 });
  expectBox(desktop.message, { height: 20, width: 1260, x: 10, y: 180 });
  expectBox(desktop.home, { height: 30, width: 64.25, x: 609.97, y: 230 });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await readBadRequestMetrics(page);
  expect(mobile.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(mobile.pageWrapOuter, { height: 450, width: 390, x: 0, y: 50 });
  expectBox(mobile.projectPageWrap, { height: 310, width: 390, x: 0, y: 50 });
  expectBox(mobile.errorWrap, { height: 310, width: 390, x: 0, y: 50 });
  expectBox(mobile.icon, { height: 0, width: 0, x: 195, y: 150 });
  expectBox(mobile.message, { height: 20, width: 390, x: 0, y: 180 });
  expectBox(mobile.home, { height: 30, width: 64.25, x: 164.97, y: 230 });

  await page.evaluate(() => {
    (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel =
      "alive";
  });
  await homeLink.click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(appPath("/"))}$`, "u"));
  expect(
    await page.evaluate(
      () => (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel,
    ),
  ).toBe("alive");
});

test("reset-password submit uses the mounted API and exact SPA success URL", async ({ page }) => {
  const requests = await mockResetMutation(page, { succeeds: true });
  await page.goto(appPath("/resetPassword?s=reset-token"));
  await page.evaluate(() => {
    (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel =
      "alive";
  });

  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("new-pass");
  await page.locator('form[name="passwordReset"] button[type="submit"]').click();

  const origin = new URL(page.url()).origin;
  await expect(page).toHaveURL(`${origin}${appPath("/users/loginform?password=reset")}`);
  await expect(page.locator(".page.full #loginIdOrEmailD")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel,
    ),
  ).toBe("alive");
  expect(requests.bootstrapPaths).toEqual([appPath("/api/auth/session")]);
  expect(requests.resetRequests).toEqual([
    {
      body: {
        hashString: "reset-token",
        password: "new-pass",
        retypedPassword: "new-pass",
      },
      csrfToken: "csrf-reset-password",
      method: "POST",
      pathname: appPath("/api/v1/auth/password-reset/complete"),
    },
  ]);
});

test("reset-password API error keeps the hash in the exact SPA bad-request URL", async ({
  page,
}) => {
  const requests = await mockResetMutation(page, { succeeds: false });
  const token = "reset/+?&token";
  const encodedToken = encodeURIComponent(token);
  await page.goto(appPath(`/resetPassword?s=${encodedToken}`));
  await page.evaluate(() => {
    (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel =
      "alive";
  });

  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("new-pass");
  await page.locator('form[name="passwordReset"] button[type="submit"]').click();

  const origin = new URL(page.url()).origin;
  await expect(page).toHaveURL(
    `${origin}${appPath(`/resetPassword?error=invalid&s=${encodedToken}`)}`,
  );
  await expect(page.locator(".reset-password-bad-request .error-wrap p")).toHaveText(
    "Wrong url to reset password.",
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __resetPasswordSpaSentinel?: string }).__resetPasswordSpaSentinel,
    ),
  ).toBe("alive");
  expect(requests.bootstrapPaths).toEqual([appPath("/api/auth/session")]);
  expect(requests.resetRequests).toEqual([
    {
      body: { hashString: token, password: "new-pass", retypedPassword: "new-pass" },
      csrfToken: "csrf-reset-password",
      method: "POST",
      pathname: appPath("/api/v1/auth/password-reset/complete"),
    },
  ]);
});

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLandingPath: "/", isAnonymous: true, isGuest: false },
    });
  });
}

async function mockResetMutation(page: Page, options: { succeeds: boolean }) {
  const bootstrapPaths: string[] = [];
  const resetRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
    pathname: string;
  }> = [];

  await mockAnonymousSession(page);
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({ contentType: "application/json", json: {} });
  });
  await page.route("**/api/auth/session", async (route) => {
    bootstrapPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-reset-password" },
      json: {},
    });
  });
  await page.route("**/api/v1/auth/password-reset/complete", async (route) => {
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
      json: { error: { code: "invalid_request", message: "wrong hash", status: 400 } },
      status: 400,
    });
  });

  return { bootstrapPaths, resetRequests };
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

async function directChildOrder(root: Locator) {
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

async function readResetPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const readBox = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing reset-password metric target: ${selector}`);
      const box = element.getBoundingClientRect();
      return {
        height: box.height,
        right: box.right,
        width: box.width,
        x: box.x,
        y: box.y,
      };
    };
    return {
      form: readBox('.login-form-wrap form[name="passwordReset"]'),
      page: readBox(".page.full"),
      password: readBox("#password"),
      passwordFontSize: getComputedStyle(document.querySelector("#password")!).fontSize,
      retypedPassword: readBox("#retypedPassword"),
      submit: readBox('.login-form-wrap button[type="submit"]'),
      tagLine: readBox(".tag-line-wrap.reset-password .tag-line"),
      tagLineWrap: readBox(".tag-line-wrap.reset-password"),
      title: readBox(".tag-line-wrap.reset-password .title"),
      viewport: {
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        width: window.innerWidth,
      },
    };
  });
}

async function expectValidationPopovers(page: Page, messages: string[]) {
  const popovers = page.locator('form[name="passwordReset"] .popover.left.in .popover-content');
  await expect(popovers).toHaveText(messages);
}

async function readPopoverBoxes(page: Page) {
  return page.locator('form[name="passwordReset"] .popover.left.in').evaluateAll((popovers) =>
    popovers.map((popover) => {
      const box = popover.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    }),
  );
}

async function readBadRequestMetrics(page: Page) {
  return page.evaluate(() => {
    const readBox = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing bad-request metric target: ${selector}`);
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    };
    return {
      errorWrap: readBox(".reset-password-bad-request .error-wrap"),
      home: readBox(".reset-password-bad-request .ybtn-info"),
      icon: readBox(".reset-password-bad-request .ico-404"),
      message: readBox(".reset-password-bad-request .error-wrap p"),
      pageWrapOuter: readBox(".page-wrap-outer.reset-password-bad-request"),
      projectPageWrap: readBox(".reset-password-bad-request > .project-page-wrap"),
      viewport: {
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        width: window.innerWidth,
      },
    };
  });
}

function expectBox(
  actual: { height: number; width: number; x: number; y: number },
  expected: { height: number; width: number; x: number; y: number },
) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
}

function expectPopoverBoxes(
  actual: Array<{ height: number; width: number; x: number; y: number }>,
  expected: Array<{ height: number; width: number; x: number; y: number }>,
) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((box, index) => expectBox(box, expected[index]!));
}
