import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const DEFAULT_LANDING_PATH = "/me";

test.use({ locale: "en-US", viewport: { width: 1366, height: 900 } });

test("signup form preserves the legacy visible DOM and desktop/mobile geometry", async ({
  page,
}) => {
  await mockCapabilities(page);
  await mockSession(page);

  await page.goto(appPath("/users/signupform"));
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveTitle("Sign up");
  const routeRoot = page.locator(".page.full");
  await expect(routeRoot).toBeVisible();
  await expect(routeRoot.locator(":scope > .tag-line-wrap.signup .title")).toHaveText(
    "Sign up for Yoram",
  );
  await expect(routeRoot.locator(":scope > .tag-line-wrap.signup .tag-line")).toHaveText(
    "Web-based platform for collaborative software development",
  );
  await expect(routeRoot.locator(":scope > .center-txt")).toHaveCount(0);
  expect(
    await routeRoot.locator(":scope > *").evaluateAll((elements) =>
      elements.map((element) => ({
        className: Array.from(element.classList)
          .filter((className) => !className.startsWith("x") && !className.includes("__styles."))
          .join(" "),
        tagName: element.tagName,
      })),
    ),
  ).toEqual([
    { className: "center-wrap tag-line-wrap signup", tagName: "DIV" },
    { className: "signup-form-wrap frm-wrap", tagName: "DIV" },
  ]);

  const form = routeRoot.locator('form[name="signup"]');
  await expect(form).toHaveAttribute("action", appPath("/users/signup"));
  await expect(form).toHaveAttribute("method", "post");
  expect(await form.evaluate((element) => new URL(element.action).pathname)).toBe(
    appPath("/users/signup"),
  );
  await expect(form.locator("label")).toHaveText([
    "User ID (lower case)",
    "Name",
    "Email address",
    "Password",
    "Password confirmation",
  ]);
  expect(
    await form.locator("input").evaluateAll((inputs) =>
      inputs.map((input) => ({
        autocomplete: input.getAttribute("autocomplete"),
        id: input.id,
        name: input.getAttribute("name"),
        type: input.getAttribute("type"),
      })),
    ),
  ).toEqual([
    {
      autocomplete: "off",
      id: "loginId",
      name: "loginId",
      type: "text",
    },
    {
      autocomplete: "off",
      id: "uname",
      name: "name",
      type: "text",
    },
    {
      autocomplete: "off",
      id: "email",
      name: "email",
      type: "text",
    },
    {
      autocomplete: "off",
      id: "password",
      name: "password",
      type: "password",
    },
    {
      autocomplete: "off",
      id: "retypedPassword",
      name: "retypedPassword",
      type: "password",
    },
  ]);
  expect(
    await form
      .locator("input")
      .evaluateAll((inputs) =>
        inputs.every(
          (input) => !input.classList.contains("text") && !input.classList.contains("password"),
        ),
      ),
  ).toBe(true);
  await expect(form.locator("button[type='submit']")).toHaveText("Sign up");
  await expect(form.locator(".act-row")).toHaveText("Already signed up? Log in");
  await expect(form.locator(".go-login")).toHaveAttribute("href", appPath("/users/loginform"));
  await expect(page.locator("#loginId")).toBeFocused();
  const source = readFileSync("src/routes/users/signupform.tsx", "utf8");
  expect(source).toContain("[sessionQuery.isPending, socialLoginOnly]");
  await assertNoPluginHooks(routeRoot);

  const desktop = await readSignupMetrics(page);
  expect(desktop.viewport).toEqual({ height: 900, scrollWidth: 1366, width: 1366 });
  // F5 dist-truth: app-wide :root line-height 18px (src/app.css:9) vs legacy
  // bootstrap body line-height 20px (bootstrap.css:180) shrinks every line box by
  // 2px (tagline, dt/dd rows, act-row) — the signup style mirrors the legacy
  // rules (signupform.tsx:29-91, _page.less:1580-1595) so this is the canonical
  // fallback-off rendering, not an app deviation.
  expectBox(desktop.page, { height: 578, width: 1366, x: 0, y: 40 });
  expectBox(desktop.tagLine, { height: 110, width: 1366, x: 0, y: 40 });
  expectBox(desktop.form, { height: 442, width: 400, x: 483, y: 176 });
  expectBox(desktop.loginId, { height: 36, width: 398, x: 483, y: 195 });
  expectBox(desktop.retypedPassword, { height: 36, width: 398, x: 483, y: 487 });
  expectBox(desktop.submit, { height: 42, width: 400, x: 483, y: 538 });
  expectBox(desktop.actionRow, { height: 18, width: 400, x: 483, y: 600 });
  expect(desktop.loginId.right).toBeLessThanOrEqual(desktop.form.right);
  expect(desktop.submit.right).toBe(desktop.form.right);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await readSignupMetrics(page);
  expect(mobile.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(mobile.page, { height: 578, width: 390, x: 0, y: 40 });
  expectBox(mobile.tagLine, { height: 110, width: 390, x: 0, y: 40 });
  expectBox(mobile.form, { height: 442, width: 370.5, x: 9.75, y: 176 });
  expectBox(mobile.loginId, { height: 36, width: 160.19, x: 220.06, y: 195 });
  expectBox(mobile.retypedPassword, { height: 36, width: 160.19, x: 220.06, y: 487 });
  expectBox(mobile.submit, { height: 42, width: 370.5, x: 9.75, y: 538 });
  expectBox(mobile.actionRow, { height: 18, width: 370.5, x: 9.75, y: 600 });
  expect(mobile.definitionListTextAlign).toBe("right");
  expect(mobile.loginIdFontSize).toBe("16px");
  expect(mobile.form.right).toBeLessThanOrEqual(mobile.viewport.scrollWidth);
  expect(mobile.loginId.right).toBeLessThanOrEqual(mobile.form.right);
});

test("authenticated signup request redirects to the legacy root without rendering signup DOM", async ({
  page,
}) => {
  await mockCapabilities(page);
  await mockAuthenticatedSession(page);

  await page.goto(appPath("/users/signupform"));

  await expect(page).toHaveURL(appPath("/"));
  await expect(page.locator(".page.full .signup-form-wrap")).toHaveCount(0);
});

test("anonymous signup form still renders after its session check", async ({ page }) => {
  await mockCapabilities(page);
  await mockSession(page);

  await page.goto(appPath("/users/signupform"));

  await expect(page).toHaveURL(appPath("/users/signupform"));
  await expect(page.locator(".page.full .signup-form-wrap form")).toBeVisible();
  await expect(page.locator("#loginId")).toBeVisible();
});

test("signup confirmation and social-only branches preserve legacy visible copy and order", async ({
  page,
}) => {
  await mockSession(page);
  await mockCapabilities(page, {
    defaultAdminContact: "moc.elpmaxe@nimda",
    signupRequireConfirm: true,
  });
  await page.goto(appPath("/users/signupform"));

  const routeRoot = page.locator(".page.full");
  // F6 copy-fix-current-dom: the confirmation notice dropped the legacy
  // `center-txt` class when it moved to Style (signupform.tsx:308,
  // styles.confirmationNotice; retired per style-standalone-signup-confirmation-notice).
  // Legacy: yona-original/app/views/user/signup.scala.html:30-34.
  await expect(
    routeRoot.locator('[data-owner="standalone-signup-confirmation-notice"] p'),
  ).toHaveText([
    "Administrator admission is required for activation.",
    "If needed, please contact moc.elpmaxe@nimda",
  ]);
  expect(
    await routeRoot.locator(":scope > *").evaluateAll((elements) =>
      elements.map((element) =>
        Array.from(element.classList)
          .filter((className) => !className.startsWith("x") && !className.includes("__styles."))
          .join(" "),
      ),
    ),
  ).toEqual(["center-wrap tag-line-wrap signup", "", "signup-form-wrap frm-wrap"]);
  for (const owner of [
    "standalone-signup-form",
    "standalone-signup-tagline",
    "standalone-signup-title",
    "standalone-signup-confirmation-notice",
    "standalone-signup-form-wrap",
  ]) {
    await expect(page.locator(`[data-owner="${owner}"]`)).toBeVisible();
  }
  expect(
    await routeRoot
      .locator("input")
      .evaluateAll((inputs) =>
        inputs.every(
          (input) => !input.classList.contains("text") && !input.classList.contains("password"),
        ),
      ),
  ).toBe(true);
  await routeRoot.locator("button[type='submit']").click();
  await expect(
    routeRoot.locator('[data-owner="standalone-signup-validation-popover"]'),
  ).toHaveCount(4);

  await page.setViewportSize({ width: 390, height: 844 });
  const confirmationMobile = await readSignupMetrics(page);
  expectBox(confirmationMobile.form, { height: 442, width: 370.5, x: 9.75, y: 226 });
  expectBox(confirmationMobile.loginId, { height: 36, width: 160.19, x: 220.06, y: 245 });
  expect(confirmationMobile.form.right).toBeLessThanOrEqual(
    confirmationMobile.viewport.scrollWidth,
  );

  await page.unroute("**/api/v1/auth/capabilities");
  await mockCapabilities(page, { socialLoginOnly: true });
  await page.reload();
  const socialOnlyNotice = page.locator('[data-owner="standalone-signup-social-only-notice"]');
  await expect(socialOnlyNotice).toHaveText("Only allow sign-in via social login");
  await expect(socialOnlyNotice).toHaveCSS("display", "block");
  await expect(socialOnlyNotice).toHaveCSS("margin", "0px");
  await expect(socialOnlyNotice).toHaveCSS("text-align", "center");
  const socialBoxes = await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>('[data-owner="standalone-signup-form-wrap"]');
    const notice = document.querySelector<HTMLElement>(
      '[data-owner="standalone-signup-social-only-notice"]',
    );
    if (!form || !notice) throw new Error("Missing social-only signup owners");
    const formBox = form.getBoundingClientRect();
    const noticeBox = notice.getBoundingClientRect();
    return {
      formWidth: formBox.width,
      noticeContained: noticeBox.left >= formBox.left && noticeBox.right <= formBox.right,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(socialBoxes.formWidth).toBeCloseTo(370.5, 1);
  expect(socialBoxes.noticeContained).toBe(true);
  expect(socialBoxes.scrollWidth).toBe(390);
  await expect(page.locator(".signup-form-wrap input")).toHaveCount(0);
  await expect(page.locator(".signup-form-wrap button[type='submit']")).toHaveCount(0);
});

test("signup form translates legacy client validation without plugin hooks", async ({ page }) => {
  const checkedLoginIds: string[] = [];
  let registerCalls = 0;
  await mockCapabilities(page);
  await mockSession(page);
  await page.route("**/user/isUsed?*", async (route) => {
    const url = new URL(route.request().url());
    checkedLoginIds.push(url.searchParams.get("name") ?? "");
    await route.fulfill({
      contentType: "application/json",
      json: { isExist: url.searchParams.get("name") === "door.user", isReserved: false },
    });
  });
  await page.route("**/user/isEmailExist?*", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { isExist: false } });
  });
  await page.route("**/api/v1/auth/register", async (route) => {
    registerCalls += 1;
    await route.fulfill({ status: 500, body: "unexpected register" });
  });
  await page.goto(appPath("/users/signupform"));

  await page.fill("#loginId", "Door.User");
  await page.locator("#email").focus();
  await expect(page.locator("#loginId")).toHaveValue("door.user");
  // F6 copy-fix-current-dom: FieldPopover renders the legacy bootstrap
  // `popover left in`/`popover-content` DOM as style owner/part nodes
  // (signupform.tsx:700-731); the retired `.popover` classes are pinned by
  // style-standalone-signup-validation-popover instead. Legacy DOM:
  // yona-original/app/views/common/scripts.scala.html validate.js popover.
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="loginId"] [data-part="validation-popover-content"]',
    ),
  ).toHaveText("Already exists!");
  expect(checkedLoginIds).toEqual(["door.user"]);

  await page.fill("#loginId", "bad_");
  await page.locator("#email").focus();
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="loginId"] [data-part="validation-popover-content"]',
    ),
  ).toHaveText(
    "Login ID may contain alphanumeric characters as well as dashes, underscores or dots, but cannot begin or end with underscores or dots.",
  );
  await page.fill("#email", "bad-email");
  await page.locator("#password").focus();
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="email"]',
    ),
  ).toHaveCount(0);
  await page.locator("#password").pressSequentially("abc");
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="password"] [data-part="validation-popover-content"]',
    ),
  ).toHaveText("Password must be at least 4 characters in length.");
  await page.locator("#retypedPassword").pressSequentially("abcd");
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="retypedPassword"] [data-part="validation-popover-content"]',
    ),
  ).toHaveText("Retyped password doesn't match");

  await page.locator('form[name="signup"] button[type="submit"]').click();
  await expect(
    page.locator(
      '[data-owner="standalone-signup-validation-popover"][data-validation-for="email"] [data-part="validation-popover-content"]',
    ),
  ).toHaveText("Enter valid email address!");
  expect(registerCalls).toBe(0);
  await assertNoPluginHooks(page.locator(".page.full"));
});

test("authenticated signup follows the safe default landing without context duplication or reload", async ({
  page,
}) => {
  const source = readFileSync("src/routes/users/signupform.tsx", "utf8");
  expect(source).toContain(
    "router.history.push(prefixBasePath(runtimeConfig.basePath, localPath))",
  );
  expect(source).not.toContain("navigate({ href: localPath })");
  await mockCapabilities(page);
  const auth = await mockSuccessfulSignup(page, {
    defaultLandingPath: DEFAULT_LANDING_PATH,
    isAnonymous: false,
  });
  await page.goto(appPath("/users/signupform"));
  await page.evaluate(() => {
    (window as Window & { __signupSpaSentinel?: string }).__signupSpaSentinel = "alive";
  });

  await fillValidSignupForm(page);
  await page.locator('form[name="signup"] button[type="submit"]').click();

  await expect
    .poll(() => normalizedPathname(page.url()))
    .toBe(normalizedPathname(appPath(DEFAULT_LANDING_PATH)));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __signupSpaSentinel?: string }).__signupSpaSentinel,
      ),
    )
    .toBe("alive");
  const basePath = normalizedBasePath();
  if (basePath !== "") {
    expect(new URL(page.url()).pathname).not.toContain(`${basePath}${basePath}`);
  }
  expect(auth.bootstrapPaths).toEqual([appPath("/api/auth/session")]);
  expect(auth.registerRequests).toEqual([
    {
      body: {
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door",
        password: "passw0rd",
        retypedPassword: "passw0rd",
      },
      csrfToken: "csrf-signup",
      pathname: appPath("/api/v1/auth/register"),
    },
  ]);
  expect(auth.sessionPaths.every((pathname) => pathname === appPath("/api/v1/session"))).toBe(true);
});

for (const flashCase of [
  {
    capabilities: { signupRequireConfirm: true },
    message:
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
    search: "?signup=requested",
  },
  {
    capabilities: { emailVerificationEnabled: true },
    message: "User verification mail was sent.",
    search: "?verify=sent",
  },
] as const) {
  test(`anonymous signup keeps legacy ${flashCase.search} toast navigation`, async ({ page }) => {
    await mockCapabilities(page, flashCase.capabilities);
    await mockSuccessfulSignup(page, { defaultLandingPath: "/", isAnonymous: true });
    await page.goto(appPath("/users/signupform"));
    await page.evaluate(() => {
      (window as Window & { __signupSpaSentinel?: string }).__signupSpaSentinel = "alive";
    });

    await fillValidSignupForm(page);
    await page.locator('form[name="signup"] button[type="submit"]').click();

    await expect
      .poll(() => new URL(page.url()).pathname + new URL(page.url()).search)
      .toBe(`${appPath("/")}${flashCase.search}`);
    // F6 copy-fix-current-dom: RootYoramToast renders the legacy
    // `#yobiToasts .toast .msg` DOM as style owner/part nodes (__root.tsx:530-558)
    // without the retired `toast`/`msg` classes (style-root-toast pins
    // `not.toHaveClass(/\btoast\b/)`). Legacy template:
    // yona-original/app/views/common/scripts.scala.html:28-33.
    await expect(
      page.locator('[data-owner="root-yoram-toast"] [data-part="toast-message"]'),
    ).toHaveText(flashCase.message);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __signupSpaSentinel?: string }).__signupSpaSentinel,
        ),
      )
      .toBe("alive");
  });
}

type Capabilities = {
  defaultAdminContact?: string;
  emailVerificationEnabled?: boolean;
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

async function mockCapabilities(page: Page, overrides: Capabilities = {}) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        defaultAdminContact: overrides.defaultAdminContact ?? "",
        emailVerificationEnabled: overrides.emailVerificationEnabled ?? false,
        enabledSocialProviders: [],
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: overrides.signupRequireConfirm ?? false,
        socialLoginOnly: overrides.socialLoginOnly ?? false,
      },
    });
  });
}

async function mockSession(page: Page) {
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
        defaultLandingPath: "/",
        isAnonymous: false,
        isGuest: false,
        loginId: "admin",
      },
    });
  });
}

async function mockSuccessfulSignup(
  page: Page,
  response: { defaultLandingPath: string; isAnonymous: boolean },
) {
  let authenticated = false;
  const bootstrapPaths: string[] = [];
  const registerRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    pathname: string;
  }> = [];
  const sessionPaths: string[] = [];

  await page.route("**/api/v1/session", async (route) => {
    sessionPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      json: {
        defaultLandingPath: authenticated ? response.defaultLandingPath : "/",
        isAnonymous: !authenticated,
        isGuest: false,
        loginId: authenticated ? "door" : "",
      },
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { profile: { isGuest: false, loginId: "door" } },
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    bootstrapPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-signup" },
      json: {},
    });
  });
  await page.route("**/user/isUsed?*", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { isExist: false } });
  });
  await page.route("**/user/isEmailExist?*", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { isExist: false } });
  });
  await page.route("**/api/v1/auth/register", async (route) => {
    const request = route.request();
    registerRequests.push({
      body: request.postDataJSON(),
      csrfToken: request.headers()["x-csrf-token"] ?? null,
      pathname: new URL(request.url()).pathname,
    });
    authenticated = response.isAnonymous === false;
    await route.fulfill({ contentType: "application/json", json: response });
  });

  return { bootstrapPaths, registerRequests, sessionPaths };
}

async function fillValidSignupForm(page: Page) {
  await page.fill("#loginId", "door");
  await page.fill("#uname", "Door");
  await page.fill("#email", "door@example.com");
  await page.fill("#password", "passw0rd");
  await page.fill("#retypedPassword", "passw0rd");
}

function normalizedBasePath() {
  return BASE_PATH === "/" ? "" : BASE_PATH.replace(/\/$/u, "");
}

function normalizedPathname(value: string) {
  const pathname = value.startsWith("http") ? new URL(value).pathname : value;
  return pathname === "/" ? pathname : pathname.replace(/\/$/u, "");
}

function appPath(path: string) {
  const basePath = normalizedBasePath();
  if (path === "/") {
    return basePath === "" ? "/" : `${basePath}/`;
  }
  if (basePath === "" || path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }
  return `${basePath}${path}`;
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

async function readSignupMetrics(page: Page) {
  return page.evaluate(() => {
    const element = (selector: string) => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Missing signup metric target: ${selector}`);
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
    const definitionList = document.querySelector<HTMLElement>(".signup-form-wrap dl");
    const loginId = document.querySelector<HTMLElement>("#loginId");
    if (!definitionList || !loginId) throw new Error("Missing signup style targets.");

    return {
      actionRow: element(".signup-form-wrap .act-row"),
      definitionListTextAlign: getComputedStyle(definitionList).textAlign,
      form: element(".signup-form-wrap"),
      loginId: element("#loginId"),
      loginIdFontSize: getComputedStyle(loginId).fontSize,
      page: element(".page.full"),
      retypedPassword: element("#retypedPassword"),
      submit: element(".signup-form-wrap button[type='submit']"),
      tagLine: element(".tag-line-wrap.signup"),
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
