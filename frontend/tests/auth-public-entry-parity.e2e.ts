import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test, type Page } from "@playwright/test";

const execFileAsync = promisify(execFile);

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

async function expectLegacyLiveHtmlParity(
  page: Page,
  options: {
    currentSelector?: string;
    legacyPath: string;
    legacySelector?: string;
  },
) {
  const legacyOrigin = process.env.LEGACY_YONA_ORIGIN;
  expect(
    legacyOrigin,
    "set LEGACY_YONA_ORIGIN to compare against live legacy Yona HTML",
  ).toBeTruthy();

  const legacyUrl = new URL(options.legacyPath, legacyOrigin).toString();
  const { stdout: legacyHtml } = await execFileAsync("curl", ["-sS", legacyUrl], {
    maxBuffer: 8 * 1024 * 1024,
  });
  const selector = options.currentSelector ?? options.legacySelector ?? "body";
  const legacySelector = options.legacySelector ?? selector;
  const currentSelector = options.currentSelector ?? selector;

  const signatures = await page.evaluate(
    ({ currentSelector, legacyHtml, legacySelector }) => {
      type Signature = {
        attrs: Record<string, string>;
        children: Signature[];
        tag: string;
        text?: string;
      };

      const ignoredAttributeNames = new Set([
        "action",
        "checked",
        "data-reactroot",
        "selected",
        "value",
      ]);

      function normalizeAttributeValue(name: string, value: string) {
        if (name !== "href" && name !== "src") {
          return value.trim().replace(/\s+/g, " ");
        }
        try {
          const url = new URL(value, window.location.origin);
          return `${url.pathname.replace(/^\/yona(?=\/|$)/, "")}${url.search}${url.hash}`;
        } catch {
          return value.replace(/^\/yona(?=\/|$)/, "");
        }
      }

      function directText(element: Element) {
        return Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .trim()
          .replace(/\s+/g, " ");
      }

      function signature(element: Element): Signature | null {
        const tag = element.tagName.toLowerCase();
        if (tag === "script" || tag === "style") {
          return null;
        }
        if (tag === "input" && element.getAttribute("name") === "csrfToken") {
          return null;
        }

        const attrs: Record<string, string> = {};
        for (const attribute of Array.from(element.attributes).sort((left, right) =>
          left.name.localeCompare(right.name),
        )) {
          if (ignoredAttributeNames.has(attribute.name)) {
            continue;
          }
          attrs[attribute.name] = normalizeAttributeValue(attribute.name, attribute.value);
        }

        const text = directText(element);
        const children = Array.from(element.children)
          .map((child) => signature(child))
          .filter((child): child is Signature => child !== null);

        return {
          attrs,
          children,
          tag,
          ...(text ? { text } : {}),
        };
      }

      const parser = new DOMParser();
      const legacyDocument = parser.parseFromString(legacyHtml, "text/html");
      const legacyRoot = legacyDocument.querySelector(legacySelector);
      const currentRoot = document.querySelector(currentSelector);

      if (!legacyRoot || !currentRoot) {
        return {
          current: currentRoot ? signature(currentRoot) : null,
          legacy: legacyRoot ? signature(legacyRoot) : null,
        };
      }

      return {
        current: signature(currentRoot),
        legacy: signature(legacyRoot),
      };
    },
    { currentSelector, legacyHtml, legacySelector },
  );

  expect(signatures.current).toEqual(signatures.legacy);
}

type AuthCapabilities = {
  defaultAdminContact?: string;
  emailVerificationEnabled?: boolean;
  enabledSocialProviders?: string[];
  secretSetupRequired?: boolean;
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

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

async function expectNoVisibleRawLegacyKeys(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  const rawKeys =
    bodyText.match(
      /\b(?:app|button|error|notification|site|title|user|validation)\.[A-Za-z0-9_.-]+/g,
    ) ?? [];
  expect(rawKeys, `visible raw legacy message keys in:\n${bodyText}`).toEqual([]);
}

async function assertDefaultErrorShellMetrics(page: Page) {
  const navbar = await layoutBox(page, ".gnb-outer");
  const pageOuter = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".project-page-wrap");
  const errorWrap = await layoutBox(page, ".error-wrap");
  const icon = await layoutBox(page, ".error-wrap .ico.ico-err2");
  const message = await layoutBox(page, ".error-wrap > p");
  const button = await layoutBox(page, ".error-wrap .ybtn.ybtn-info");
  const footer = await layoutBox(page, ".page-footer-outer");
  const styles = await page.locator(".error-wrap").evaluate((element) => {
    const wrap = window.getComputedStyle(element);
    const paragraph = window.getComputedStyle(element.querySelector("p") as HTMLElement);
    return {
      color: paragraph.color,
      fontSize: paragraph.fontSize,
      fontWeight: paragraph.fontWeight,
      marginBottom: paragraph.marginBottom,
      marginTop: paragraph.marginTop,
      paddingBottom: wrap.paddingBottom,
      paddingTop: wrap.paddingTop,
      textAlign: wrap.textAlign,
    };
  });

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(pageOuter.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(projectPage.x).toBeCloseTo(pageOuter.x, 0);
  expect(projectPage.width).toBeCloseTo(pageOuter.width, 0);
  expect(errorWrap.x).toBeCloseTo(projectPage.x, 0);
  expect(errorWrap.width).toBeCloseTo(projectPage.width, 0);
  expect(icon.x + icon.width / 2).toBeCloseTo(errorWrap.x + errorWrap.width / 2, 0);
  expect(message.x + message.width / 2).toBeCloseTo(errorWrap.x + errorWrap.width / 2, 0);
  expect(button.x + button.width / 2).toBeCloseTo(errorWrap.x + errorWrap.width / 2, 0);
  expect(message.y).toBeGreaterThan(icon.y + icon.height);
  expect(button.y).toBeGreaterThan(message.y + message.height);
  expect(footer.y).toBeGreaterThan(pageOuter.y + pageOuter.height - 1);
  expect(styles).toEqual({
    color: "rgb(137, 137, 137)",
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "30px",
    marginTop: "30px",
    paddingBottom: "100px",
    paddingTop: "100px",
    textAlign: "center",
  });
}

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
        defaultAdminContact: capabilities.defaultAdminContact ?? "moc.elpmaxe@nimda",
        emailVerificationEnabled: capabilities.emailVerificationEnabled ?? false,
        enabledSocialProviders: capabilities.enabledSocialProviders ?? [],
        secretSetupRequired: capabilities.secretSetupRequired ?? false,
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

test("secret setup disabled renders the legacy default not-found shell", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page, { secretSetupRequired: false });

  await page.goto("/yona/secret");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Page not found");
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".secret-page")).toHaveCount(0);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p")).toHaveText("Page not found");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", "/");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toContainText("Home");
  await assertDefaultErrorShellMetrics(page);
});

test("first-run secret admin setup keeps the legacy form shell and REST submit boundary", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page, { secretSetupRequired: true });
  let submittedBody: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/auth/secret"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ restartPath: "/restart" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/secret");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Tada! Welcome to Yona!");
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".secret-page .secret-wrap .logo")).toContainText("Yona");
  await expect(page.locator(".secret-page .secret-wrap .logo")).toHaveAttribute(
    "href",
    /\/yona\/?$/,
  );
  await expect(page.locator(".secret-page .secret-wrap h3")).toContainText(
    "Tada! Welcome to Yona!",
  );
  await expect(page.locator(".secret-page .alert.alert-block.secret-box")).toContainText(
    "Create website-admin account",
  );
  await expect(page.locator(".secret-page .alert.alert-block.secret-box")).toContainText(
    "Caution: Password MUST be kept secret.",
  );
  await expect(page.locator(".secret-page .signup-form-wrap.frm-wrap form")).toHaveAttribute(
    "class",
    "input-append",
  );
  await expect(page.locator("#loginId")).toHaveValue("admin");
  await expect(page.locator("#loginId")).toHaveAttribute("readonly", "");
  await expect(page.locator("label[for='uname']")).toContainText("Name");
  await expect(page.locator("label[for='email']")).toContainText("Email");
  await expect(page.locator("label[for='password']")).toContainText("Password");
  await expect(page.locator("label[for='retypedPassword']")).toContainText("Password confirmation");
  await expect(page.locator(".secret-page form")).not.toHaveAttribute("method", /post/i);
  await expect(page.locator(".secret-page form")).not.toHaveAttribute("action", /\/secret/);

  const pageWrap = await layoutBox(page, ".secret-page .container.page-wrap");
  const pageBody = await layoutBox(page, ".secret-page .page");
  const secretWrap = await layoutBox(page, ".secret-page .secret-wrap");
  const logo = await layoutBox(page, ".secret-page .secret-wrap .logo");
  const heading = await layoutBox(page, ".secret-page .secret-wrap h3");
  const secretBox = await layoutBox(page, ".secret-page .alert.alert-block.secret-box");
  const formWrap = await layoutBox(page, ".secret-page .signup-form-wrap.frm-wrap");
  const loginId = await layoutBox(page, "#loginId");
  const userName = await layoutBox(page, "#uname");
  const email = await layoutBox(page, "#email");
  const password = await layoutBox(page, "#password");
  const retypedPassword = await layoutBox(page, "#retypedPassword");
  const submitButton = await layoutBox(page, ".secret-page button[type='submit']");
  const footer = await layoutBox(page, ".secret-page .page-footer-outer");

  expect(pageWrap.width).toBeGreaterThanOrEqual(900);
  expect(pageBody.x).toBeCloseTo(pageWrap.x, 0);
  expect(pageBody.width).toBeCloseTo(pageWrap.width, 0);
  expect(secretWrap.y).toBeGreaterThanOrEqual(pageBody.y);
  expect(Math.round(logo.width)).toBe(123);
  expect(Math.round(logo.height)).toBe(55);
  expect(Math.abs(logo.x + logo.width / 2 - (pageBody.x + pageBody.width / 2))).toBeLessThanOrEqual(
    2,
  );
  expect(heading.y).toBeGreaterThan(logo.y + logo.height - 1);
  expect(secretBox.y).toBeGreaterThan(heading.y + heading.height - 1);
  expect(secretBox.width).toBeCloseTo(pageBody.width * 0.5, 0);
  expect(
    Math.abs(secretBox.x + secretBox.width / 2 - (pageBody.x + pageBody.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(formWrap.y).toBeGreaterThan(secretBox.y + secretBox.height - 1);
  for (const input of [userName, email, password, retypedPassword]) {
    expect(input.x).toBeCloseTo(loginId.x, 0);
    expect(input.width).toBeCloseTo(loginId.width, 0);
  }
  expect(userName.y).toBeGreaterThan(loginId.y);
  expect(email.y).toBeGreaterThan(userName.y);
  expect(password.y).toBeGreaterThan(email.y);
  expect(retypedPassword.y).toBeGreaterThan(password.y);
  expect(submitButton.y).toBeGreaterThan(retypedPassword.y + retypedPassword.height - 1);
  expect(footer.y).toBeGreaterThan(pageBody.y + pageBody.height - 1);

  await page.locator("#uname").fill("Administrator");
  await page.locator("#email").fill("admin@example.com");
  await page.locator("#password").fill("admin-secret");
  await page.locator("#retypedPassword").fill("admin-secret");
  await page.locator(".secret-page button[type='submit']").click();

  await expect(page).toHaveURL(/\/yona\/restart$/);
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  const restartPageBody = await layoutBox(page, ".secret-page .page");
  const restartWrap = await layoutBox(page, ".secret-page .secret-wrap.restart");
  const restartLogo = await layoutBox(page, ".secret-page .secret-wrap.restart .logo");
  const restartHeading = await layoutBox(page, ".secret-page .secret-wrap.restart h3");
  const restartNotice = await layoutBox(page, ".secret-page .secret-wrap.restart .secret-box");
  const restartFooter = await layoutBox(page, ".secret-page .page-footer-outer");

  expect(restartWrap.y).toBeGreaterThanOrEqual(restartPageBody.y);
  expect(restartLogo.y).toBeGreaterThanOrEqual(restartWrap.y + 50);
  expect(Math.round(restartLogo.width)).toBe(123);
  expect(Math.round(restartLogo.height)).toBe(55);
  expect(
    Math.abs(
      restartLogo.x + restartLogo.width / 2 - (restartPageBody.x + restartPageBody.width / 2),
    ),
  ).toBeLessThanOrEqual(2);
  expect(restartHeading.y).toBeGreaterThan(restartLogo.y + restartLogo.height - 1);
  expect(restartNotice.y).toBeGreaterThan(restartHeading.y + restartHeading.height - 1);
  expect(restartNotice.width).toBeCloseTo(restartPageBody.width * 0.5, 0);
  expect(restartFooter.y).toBeGreaterThan(restartWrap.y + restartWrap.height - 1);
  expect(submittedBody).toMatchObject({
    emailAddress: "admin@example.com",
    name: "Administrator",
    password: "admin-secret",
    retypedPassword: "admin-secret",
  });
});

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
  await expectNoVisibleRawLegacyKeys(page);

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

test("login form failed submit renders the legacy error copy through REST", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);
  let submittedBody: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/auth/sign-in"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ message: "user.login.failed.client" }),
      headers: restJsonHeaders,
      status: 401,
    });
  });

  await page.goto("/yona/users/loginform?redirectUrl=/admin/sample");
  await expectNoVisibleRawLegacyKeys(page);

  const loginForm = page.locator("main .login-form-wrap.frm-wrap form").first();
  await loginForm.locator("input[name='loginIdOrEmail']").fill("admin");
  await loginForm.locator("input[name='password']").fill("wrong-password");
  await loginForm.locator("button[type='submit']").click();

  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=(?:\/admin\/sample|%2Fadmin%2Fsample)$/,
  );
  await expect(page.locator(".runtime-error-banner")).toContainText(
    "Failed to log in. The request is invalid.",
  );
  await expectNoVisibleRawLegacyKeys(page);
  expect(submittedBody).toMatchObject({
    identifier: "admin",
    password: "wrong-password",
    rememberMe: true,
  });
});

test("auth aliases redirect to the legacy public entry routes", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.goto("/yona/login");
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("main .login-form-wrap.frm-wrap form").first()).toBeVisible();

  await page.goto("/yona/register");
  await expect(page).toHaveURL(/\/yona\/users\/signupform$/);
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("form[name='signup']")).toBeVisible();

  await page.goto("/yona/forgot-password");
  await expect(page).toHaveURL(/\/yona\/lostPassword$/);
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("#emailAddress")).toBeVisible();

  await page.goto("/yona/reset-password?s=hash-123");
  await expect(page).toHaveURL(/\/yona\/resetPassword\?s=hash-123$/);
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("form[name='passwordReset']")).toBeVisible();
});

test("restricted page preserves the legacy authenticated sample layout", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(signedInSession()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/restricted");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Yona");
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator("#main > main")).toBeVisible();
  await expect(page.locator("#main > main > h1")).toHaveText("Sshhh...don't tell anyone!");
  await expect(page.locator("#main > main iframe")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/9bZkp7q19f0",
  );
  await expect(page.locator("#main > main iframe")).toHaveAttribute("width", "560");
  await expect(page.locator("#main > main iframe")).toHaveAttribute("height", "315");
  await expect(page.locator("#main > main p").nth(1)).toContainText(
    "Your name is Administrator and your email address is admin@example.com (verified)!",
  );
  await expect(page.locator("#main > main p").nth(1)).toContainText(
    "Logged in with provider 'local' and the user ID 'admin'",
  );
  await expect(page.locator("#main > main p").nth(1)).toContainText("Your session expires never");

  const nav = await layoutBox(page, ".gnb-outer");
  const main = await layoutBox(page, "#main > main");
  const heading = await layoutBox(page, "#main > main > h1");
  const videoParagraph = await layoutBox(page, "#main > main p:nth-of-type(1)");
  const iframe = await layoutBox(page, "#main > main iframe");
  const identityParagraph = await layoutBox(page, "#main > main p:nth-of-type(2)");
  const verificationMarker = await layoutBox(page, "#main > main p:nth-of-type(2) i");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(main.y).toBeGreaterThanOrEqual(nav.y + nav.height);
  expect(heading.x).toBeCloseTo(main.x, 0);
  expect(heading.y).toBeGreaterThanOrEqual(main.y);
  expect(videoParagraph.y).toBeGreaterThan(heading.y + heading.height - 1);
  expect(iframe.x).toBeCloseTo(videoParagraph.x, 0);
  expect(Math.round(iframe.width)).toBe(560);
  expect(Math.round(iframe.height)).toBe(315);
  expect(identityParagraph.y).toBeGreaterThan(videoParagraph.y + videoParagraph.height - 1);
  expect(identityParagraph.x).toBeCloseTo(main.x, 0);
  expect(verificationMarker.x).toBeGreaterThan(identityParagraph.x);
  expect(footer.y).toBeGreaterThan(identityParagraph.y + identityParagraph.height - 1);
});

test("anonymous help page keeps the legacy FAQ shell and item-wide toggle", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.goto("/yona/_help");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Help");
  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Help");
  await expect(page.locator(".qas > .qa")).toHaveCount(6);
  await expect(page.locator(".qas > .qa").first()).toContainText("Yona를 설치하고 싶어요.");
  await expect(page.locator(".qas > .qa").first()).toContainText(
    "https://github.com/doortts/yona#korean",
  );
  await expect(page.locator("body")).not.toContainText("title.help");
  await expect(page.locator("body")).not.toContainText("app.name");

  const nav = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const breadcrumbInner = await layoutBox(page, ".site-breadcrumb-inner");
  const pageWrapOuter = await layoutBox(page, ".page-wrap-outer");
  const pageWrap = await layoutBox(page, ".page-wrap");
  const qas = await layoutBox(page, ".qas");
  const firstRow = await layoutBox(page, ".qas > .qa:first-child");
  const firstQuestionWrap = await layoutBox(page, ".qas > .qa:first-child .question-wrap");
  const firstQuestionIcon = await layoutBox(page, ".qas > .qa:first-child .yobicon-q.q");
  const firstQuestionLink = await layoutBox(page, ".qas > .qa:first-child .question");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(nav.height)).toBe(40);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1);
  expect(breadcrumbInner.width).toBeCloseTo(pageWrap.width, 0);
  expect(pageWrapOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height - 1);
  expect(pageWrap.x).toBeCloseTo(breadcrumbInner.x, 0);
  expect(qas.x).toBeCloseTo(pageWrap.x, 0);
  expect(qas.width).toBeCloseTo(pageWrap.width, 0);
  expect(firstRow.y).toBeGreaterThanOrEqual(qas.y);
  expect(firstQuestionWrap.y).toBeGreaterThanOrEqual(firstRow.y);
  expect(firstQuestionIcon.x).toBeGreaterThanOrEqual(firstQuestionWrap.x);
  expect(firstQuestionLink.x).toBeGreaterThan(firstQuestionIcon.x + firstQuestionIcon.width - 1);
  expect(footer.y).toBeGreaterThan(qas.y + qas.height - 1);

  await expect(page.locator("#experimentalHelp.modal.hide.fade")).toHaveCount(1);
  await page.locator("#experimentalHelp").evaluate((element) => {
    element.className = "modal fade in";
  });
  await expect(page.locator("#experimentalHelp.modal.fade.in")).toBeVisible();
  await expect(page.locator("#experimentalHelp")).toContainText(
    "Experimental function: A new feature is on the way..",
  );
  await expect(page.locator("#experimentalHelp")).toContainText(
    "Work on this function is underway; it can be modified or interrupted at any moment.",
  );

  const experimentalModal = await layoutBox(page, "#experimentalHelp");
  const experimentalBody = await layoutBox(page, "#experimentalHelp > .modal-body");
  const experimentalTitle = await layoutBox(page, "#experimentalHelp h4.center-txt");
  const experimentalDescription = await layoutBox(
    page,
    "#experimentalHelp p.modal-body.center-txt",
  );
  const experimentalAction = await layoutBox(page, "#experimentalHelp .actrow.center-txt");
  const experimentalConfirm = await layoutBox(page, "#experimentalHelp .actrow .ybtn-info");
  const viewportCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);

  expect(Math.round(experimentalModal.width)).toBe(562);
  expect(
    Math.abs(experimentalModal.x + experimentalModal.width / 2 - viewportCenter),
  ).toBeLessThanOrEqual(1);
  expect(experimentalModal.y).toBeCloseTo(90, 0);
  expect(experimentalBody.x).toBeCloseTo(experimentalModal.x + 1, 0);
  expect(experimentalBody.y).toBeCloseTo(experimentalModal.y + 1, 0);
  expect(experimentalTitle.x).toBeCloseTo(experimentalBody.x + 15, 0);
  expect(experimentalTitle.width).toBeCloseTo(experimentalBody.width - 30, 0);
  expect(experimentalDescription.y).toBeGreaterThan(
    experimentalTitle.y + experimentalTitle.height - 1,
  );
  expect(experimentalDescription.x).toBeCloseTo(experimentalBody.x + 15, 0);
  expect(experimentalAction.y).toBeGreaterThan(
    experimentalDescription.y + experimentalDescription.height - 1,
  );
  expect(
    Math.abs(
      experimentalConfirm.x +
        experimentalConfirm.width / 2 -
        (experimentalModal.x + experimentalModal.width / 2),
    ),
  ).toBeLessThanOrEqual(1);
  await page.locator("#experimentalHelp").evaluate((element) => {
    element.className = "modal hide fade";
  });
  await expect(page.locator("#experimentalHelp.modal.hide.fade")).toHaveCount(1);

  const firstQuestion = page.locator(".qas > .qa").first();
  await expect(firstQuestion).not.toHaveClass(/open/);
  await firstQuestion.locator(".question-wrap").click();
  await expect(firstQuestion).toHaveClass(/open/);
  await firstQuestion.locator(".question-wrap").click();
  await expect(firstQuestion).not.toHaveClass(/open/);
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
  await expectNoVisibleRawLegacyKeys(page);
  const signupNotice = page.locator(".center-txt").first();
  await expect(signupNotice).toContainText("Administrator admission is required for activation.");
  await expect(page.locator(".center-txt .obfuscate")).toHaveText("moc.elpmaxe@nimda");
  await expect(signupNotice).toContainText("If needed, please contact moc.elpmaxe@nimda");

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
  await expectNoVisibleRawLegacyKeys(page);
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
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".alert.alert-error")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );

  await page.goto("/yona/users/loginform?error=oauthDenied&provider=github");
  await expectNoVisibleRawLegacyKeys(page);
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
  await expectNoVisibleRawLegacyKeys(page);
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
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".alert.alert-error")).toContainText("Invalid password reset request");

  await page.goto("/yona/resetPassword?s=hash-123");
  await expectNoVisibleRawLegacyKeys(page);
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
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".error-wrap")).toContainText("Wrong url to reset password.");
  await expect(page.locator("form[name='passwordReset']")).toHaveCount(0);
});

test("auth internal links use SPA routing instead of direct page injection", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.goto("/yona/users/loginform");
  await page.locator(".links-wrap a[href$='/lostPassword']").click();
  await expect(page).toHaveURL(/\/yona\/lostPassword$/);
  await expect(page.locator(".center-wrap.tag-line-wrap.reset-password")).toBeVisible();

  await page.goto("/yona/users/signupform");
  await page.locator("a.go-login").click();
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expect(page.locator(".login-form-wrap.frm-wrap form").first()).toBeVisible();
});

test("reset password page matches live legacy rendered HTML structure", async ({ page }) => {
  test.skip(
    !process.env.LEGACY_YONA_ORIGIN,
    "Set LEGACY_YONA_ORIGIN=http://192.168.45.10:9000 to compare live legacy HTML.",
  );
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.goto("/yona/resetPassword?s=hash-123");
  await expectLegacyLiveHtmlParity(page, {
    currentSelector: ".page.full",
    legacyPath: "/resetPassword?s=hash-123",
    legacySelector: ".page.full",
  });
});

test("lost password shell keeps legacy full-page size and alignment metrics", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/lostPassword");

  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".page.full")).toBeVisible();
  await expect(page.locator(".center-wrap.tag-line-wrap.reset-password")).toBeVisible();
  await expect(page.locator(".login-form-wrap.frm-wrap form")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer");
  const main = await layoutBox(page, "main.app-shell");
  const pageFull = await layoutBox(page, ".page.full");
  const centerWrap = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password");
  const title = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .title");
  const tagline = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .tag-line");
  const formWrap = await layoutBox(page, ".login-form-wrap.frm-wrap");
  const form = await layoutBox(page, ".login-form-wrap.frm-wrap form");
  const loginInput = await layoutBox(page, "#loginId");
  const emailInput = await layoutBox(page, "#emailAddress");
  const buttonRow = await layoutBox(page, ".login-form-wrap.frm-wrap .btns-row");
  const submit = await layoutBox(page, ".login-form-wrap.frm-wrap button[type='submit']");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.y).toBeGreaterThanOrEqual(0);
  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(main.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageFull.y).toBeGreaterThanOrEqual(main.y);
  expect(footer.y).toBeGreaterThan(pageFull.y + pageFull.height - 1);

  expect(pageFull.width).toBeGreaterThanOrEqual(1100);
  expect(centerWrap.width).toBeCloseTo(pageFull.width, 0);
  expect(Math.abs(centerWrap.x + centerWrap.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(title.y).toBeGreaterThanOrEqual(centerWrap.y);
  expect(tagline.y).toBeGreaterThan(title.y + title.height - 1);

  expect(formWrap.y).toBeGreaterThan(centerWrap.y + centerWrap.height - 1);
  expect(formWrap.width).toBeGreaterThanOrEqual(386);
  expect(formWrap.width).toBeLessThanOrEqual(404);
  expect(Math.abs(formWrap.x + formWrap.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(form.x).toBeCloseTo(formWrap.x, 0);
  expect(form.width).toBeCloseTo(formWrap.width, 0);

  expect(loginInput.y).toBeGreaterThanOrEqual(form.y);
  expect(emailInput.y).toBeGreaterThan(loginInput.y + loginInput.height - 1);
  expect(loginInput.x).toBeCloseTo(emailInput.x, 0);
  expect(loginInput.width).toBeCloseTo(emailInput.width, 0);
  expect(loginInput.width).toBeGreaterThanOrEqual(386);
  expect(loginInput.width).toBeLessThanOrEqual(390);
  expect(loginInput.x).toBeGreaterThanOrEqual(formWrap.x);
  expect(loginInput.x + loginInput.width).toBeLessThanOrEqual(formWrap.x + formWrap.width);

  expect(buttonRow.y).toBeGreaterThan(emailInput.y + emailInput.height - 1);
  expect(submit.y).toBeGreaterThanOrEqual(buttonRow.y);
  expect(submit.x).toBeCloseTo(formWrap.x, 0);
  expect(submit.width).toBeCloseTo(formWrap.width, 0);
});

test("login shell keeps legacy full-page size and alignment metrics", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/users/loginform?redirectUrl=/admin/sample");

  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".page.full")).toBeVisible();
  await expect(page.locator(".center-wrap.tag-line-wrap.login")).toBeVisible();
  await expect(page.locator("main .login-form-wrap.frm-wrap form")).toBeVisible();
  await expect(page.locator("#remember-me")).toBeChecked();

  const navbar = await layoutBox(page, ".gnb-outer");
  const main = await layoutBox(page, "main.app-shell");
  const pageFull = await layoutBox(page, ".page.full");
  const centerWrap = await layoutBox(page, ".center-wrap.tag-line-wrap.login");
  const title = await layoutBox(page, ".center-wrap.tag-line-wrap.login .title");
  const tagline = await layoutBox(page, ".center-wrap.tag-line-wrap.login .tag-line");
  const formWrap = await layoutBox(page, "main .login-form-wrap.frm-wrap");
  const form = await layoutBox(page, "main .login-form-wrap.frm-wrap form");
  const loginInput = await layoutBox(page, "#loginIdOrEmailD");
  const passwordInput = await layoutBox(page, "main .login-form-wrap.frm-wrap #password");
  const buttonRow = await layoutBox(page, "main .login-form-wrap.frm-wrap .btns-row");
  const submit = await layoutBox(page, "main .login-form-wrap.frm-wrap button[type='submit']");
  const actionRow = await layoutBox(page, "main .login-form-wrap.frm-wrap .act-row");
  const remember = await layoutBox(page, "main .login-form-wrap.frm-wrap .remember-me-wrap");
  const links = await layoutBox(page, "main .login-form-wrap.frm-wrap .links-wrap");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(navbar.height)).toBe(40);
  expect(main.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageFull.y).toBeGreaterThanOrEqual(main.y);
  expect(pageFull.width).toBeGreaterThanOrEqual(1100);
  expect(centerWrap.width).toBeCloseTo(pageFull.width, 0);
  expect(
    Math.abs(centerWrap.x + centerWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(title.y).toBeGreaterThanOrEqual(centerWrap.y);
  expect(tagline.y).toBeGreaterThan(title.y + title.height - 1);

  expect(formWrap.y).toBeGreaterThan(centerWrap.y + centerWrap.height - 1);
  expect(Math.round(formWrap.width)).toBe(400);
  expect(
    Math.abs(formWrap.x + formWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(form.x).toBeCloseTo(formWrap.x, 0);
  expect(form.width).toBeCloseTo(formWrap.width, 0);
  expect(loginInput.x).toBeCloseTo(passwordInput.x, 0);
  expect(loginInput.width).toBeCloseTo(passwordInput.width, 0);
  expect(loginInput.width).toBeGreaterThanOrEqual(386);
  expect(loginInput.width).toBeLessThanOrEqual(390);
  expect(passwordInput.y).toBeGreaterThan(loginInput.y + loginInput.height - 1);
  expect(buttonRow.y).toBeGreaterThan(passwordInput.y + passwordInput.height - 1);
  expect(submit.x).toBeCloseTo(formWrap.x, 0);
  expect(submit.width).toBeCloseTo(formWrap.width, 0);
  expect(actionRow.y).toBeGreaterThan(submit.y + submit.height - 1);
  expect(remember.x).toBeCloseTo(formWrap.x, 0);
  expect(links.x + links.width).toBeLessThanOrEqual(formWrap.x + formWrap.width + 1);
  expect(footer.y).toBeGreaterThan(pageFull.y + pageFull.height - 1);
});

test("signup shell keeps legacy full-page size and alignment metrics", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/users/signupform");

  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".page.full")).toBeVisible();
  await expect(page.locator(".center-wrap.tag-line-wrap.signup")).toBeVisible();
  await expect(page.locator("form[name='signup']")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer");
  const main = await layoutBox(page, "main.app-shell");
  const pageFull = await layoutBox(page, ".page.full");
  const centerWrap = await layoutBox(page, ".center-wrap.tag-line-wrap.signup");
  const title = await layoutBox(page, ".center-wrap.tag-line-wrap.signup .title");
  const tagline = await layoutBox(page, ".center-wrap.tag-line-wrap.signup .tag-line");
  const formWrap = await layoutBox(page, ".signup-form-wrap.frm-wrap");
  const form = await layoutBox(page, "form[name='signup']");
  const loginLabel = await layoutBox(page, "label[for='loginId']");
  const loginInput = await layoutBox(page, "#loginId");
  const nameInput = await layoutBox(page, "#uname");
  const emailInput = await layoutBox(page, "#email");
  const passwordInput = await layoutBox(page, ".signup-form-wrap #password");
  const retypedPassword = await layoutBox(page, "#retypedPassword");
  const buttonRow = await layoutBox(page, ".signup-form-wrap .btns-row");
  const submit = await layoutBox(page, ".signup-form-wrap button[type='submit']");
  const actionRow = await layoutBox(page, ".signup-form-wrap .act-row");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(navbar.height)).toBe(40);
  expect(main.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageFull.width).toBeGreaterThanOrEqual(1100);
  expect(centerWrap.width).toBeCloseTo(pageFull.width, 0);
  expect(
    Math.abs(centerWrap.x + centerWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(title.y).toBeGreaterThanOrEqual(centerWrap.y);
  expect(tagline.y).toBeGreaterThan(title.y + title.height - 1);

  expect(formWrap.y).toBeGreaterThan(centerWrap.y + centerWrap.height - 1);
  expect(Math.round(formWrap.width)).toBe(400);
  expect(
    Math.abs(formWrap.x + formWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(form.x).toBeCloseTo(formWrap.x, 0);
  expect(form.width).toBeCloseTo(formWrap.width, 0);
  expect(loginLabel.y).toBeLessThan(loginInput.y);
  for (const input of [nameInput, emailInput, passwordInput, retypedPassword]) {
    expect(input.x).toBeCloseTo(loginInput.x, 0);
    expect(input.width).toBeCloseTo(loginInput.width, 0);
  }
  expect(loginInput.width).toBeGreaterThanOrEqual(386);
  expect(loginInput.width).toBeLessThanOrEqual(390);
  expect(nameInput.y).toBeGreaterThan(loginInput.y + loginInput.height - 1);
  expect(emailInput.y).toBeGreaterThan(nameInput.y + nameInput.height - 1);
  expect(passwordInput.y).toBeGreaterThan(emailInput.y + emailInput.height - 1);
  expect(retypedPassword.y).toBeGreaterThan(passwordInput.y + passwordInput.height - 1);
  expect(buttonRow.y).toBeGreaterThan(retypedPassword.y + retypedPassword.height - 1);
  expect(submit.x).toBeCloseTo(formWrap.x, 0);
  expect(submit.width).toBeCloseTo(formWrap.width, 0);
  expect(actionRow.y).toBeGreaterThan(submit.y + submit.height - 1);
  expect(actionRow.x + actionRow.width).toBeLessThanOrEqual(formWrap.x + formWrap.width + 1);
  expect(footer.y).toBeGreaterThan(pageFull.y + pageFull.height - 1);
});

test("reset password shell keeps legacy full-page size and alignment metrics", async ({ page }) => {
  await installRuntimeConfig(page);
  await installAuthEntryMocks(page);

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/resetPassword?s=hash-123");

  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".page.full")).toBeVisible();
  await expect(page.locator(".center-wrap.tag-line-wrap.reset-password")).toBeVisible();
  await expect(page.locator("form[name='passwordReset']")).toBeVisible();
  await expect(page.locator("input[name='hashString']")).toHaveValue("hash-123");

  const navbar = await layoutBox(page, ".gnb-outer");
  const main = await layoutBox(page, "main.app-shell");
  const pageFull = await layoutBox(page, ".page.full");
  const centerWrap = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password");
  const title = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .title");
  const tagline = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .tag-line");
  const formWrap = await layoutBox(page, ".login-form-wrap.frm-wrap");
  const form = await layoutBox(page, "form[name='passwordReset']");
  const passwordInput = await layoutBox(page, "form[name='passwordReset'] #password");
  const retypedPassword = await layoutBox(page, "#retypedPassword");
  const buttonRow = await layoutBox(page, ".login-form-wrap.frm-wrap .btns-row");
  const submit = await layoutBox(page, ".login-form-wrap.frm-wrap button[type='submit']");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(navbar.height)).toBe(40);
  expect(main.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageFull.width).toBeGreaterThanOrEqual(1100);
  expect(centerWrap.width).toBeCloseTo(pageFull.width, 0);
  expect(
    Math.abs(centerWrap.x + centerWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(title.y).toBeGreaterThanOrEqual(centerWrap.y);
  expect(tagline.y).toBeGreaterThan(title.y + title.height - 1);

  expect(formWrap.y).toBeGreaterThan(centerWrap.y + centerWrap.height - 1);
  expect(Math.round(formWrap.width)).toBe(400);
  expect(
    Math.abs(formWrap.x + formWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(form.x).toBeCloseTo(formWrap.x, 0);
  expect(form.width).toBeCloseTo(formWrap.width, 0);
  expect(passwordInput.x).toBeCloseTo(retypedPassword.x, 0);
  expect(passwordInput.width).toBeCloseTo(retypedPassword.width, 0);
  expect(passwordInput.width).toBeGreaterThanOrEqual(386);
  expect(passwordInput.width).toBeLessThanOrEqual(390);
  expect(retypedPassword.y).toBeGreaterThan(passwordInput.y + passwordInput.height - 1);
  expect(buttonRow.y).toBeGreaterThan(retypedPassword.y + retypedPassword.height - 1);
  expect(submit.x).toBeCloseTo(formWrap.x, 0);
  expect(submit.width).toBeCloseTo(formWrap.width, 0);
  expect(footer.y).toBeGreaterThan(pageFull.y + pageFull.height - 1);
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
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText("Verified User");
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText("door");
  await expect(page.locator(".tag-line-wrap.reset-password")).toContainText(
    "User is verified. Try logging in.",
  );

  const navbar = await layoutBox(page, ".gnb-outer");
  const pageFull = await layoutBox(page, "main.app-shell.page.full");
  const centerWrap = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password");
  const title = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .title");
  const loginId = await layoutBox(
    page,
    ".center-wrap.tag-line-wrap.reset-password p:first-of-type",
  );
  const divider = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password hr");
  const tagline = await layoutBox(page, ".center-wrap.tag-line-wrap.reset-password .tag-line");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(navbar.height)).toBe(40);
  expect(pageFull.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageFull.width).toBeGreaterThanOrEqual(1100);
  expect(centerWrap.width).toBeCloseTo(pageFull.width, 0);
  expect(
    Math.abs(centerWrap.x + centerWrap.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(title.y).toBeGreaterThanOrEqual(centerWrap.y);
  expect(loginId.y).toBeGreaterThan(title.y + title.height - 1);
  expect(divider.y).toBeGreaterThan(loginId.y + loginId.height - 1);
  expect(tagline.y).toBeGreaterThan(divider.y + divider.height - 1);
  expect(
    Math.abs(title.x + title.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(loginId.x + loginId.width / 2 - (pageFull.x + pageFull.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(footer.y).toBeGreaterThan(pageFull.y + pageFull.height - 1);

  await page.goto("/yona/verify/door/bad-code");
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("body")).toContainText("Invalid verification");
  await expect(page.locator(".error-wrap")).toHaveCount(0);
});
