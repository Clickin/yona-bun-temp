import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

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
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
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
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
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
});

test("site admin mail send preserves legacy form shell and sends test mail", async ({ page }) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/mail"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}`);
    await route.fulfill({
      body: JSON.stringify({
        notConfiguredItems: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
        sender: "site-admin@yona.local",
        sent: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/site/mail/test"), async (route) => {
    const request = route.request();
    const body = await request.postDataJSON();
    requests.push(`${request.method()} ${new URL(request.url()).pathname} ${body.to}`);
    await route.fulfill({
      body: JSON.stringify({
        notConfiguredItems: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
        sender: body.from,
        sent: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/mail");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Mail Send");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Send Mail");
  await expect(page.locator("#mailForm.form-horizontal")).toBeVisible();
  await expect(page.locator("input[name='from']")).toHaveValue("site-admin@yona.local");
  await expect(page.locator(".alert.alert-error li")).toHaveText([
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
  ]);
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);

  await page.locator("input[name='to']").fill("receiver@example.com");
  await page.locator("input[name='subject']").fill("Legacy test subject");
  await page.locator("textarea[name='body']").fill("Legacy test body");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.locator(".alert.alert-success")).toContainText("Mail was sent");
  await expect
    .poll(() => requests)
    .toEqual([
      "GET /yona/api/v1/site/mail",
      "POST /yona/api/v1/site/mail/test receiver@example.com",
    ]);
});

test("site admin mass mail resolves all and selected project recipients", async ({ page }) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/mail-list"), async (route) => {
    const request = route.request();
    const body = await request.postDataJSON();
    requests.push(`${request.method()} ${new URL(request.url()).pathname} ${JSON.stringify(body)}`);
    await route.fulfill({
      body: JSON.stringify({
        recipients: body.all
          ? ["member@example.com", "observer@example.com", "siteboss@example.com"]
          : ["member@example.com", "observer@example.com"],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/massmail");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Mass Mail");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Mass Mail");
  await expect(page.locator(".mess-mail-wrap")).toBeVisible();
  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#mailtoPrj")).not.toBeChecked();
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);

  await page.locator("#write-email").click();
  await expect(page.locator("#mailto-link")).toHaveAttribute(
    "href",
    "mailto:member@example.com,observer@example.com,siteboss@example.com",
  );

  await page.locator("#mailtoPrj").check();
  await expect(page.locator("#project-list-wrap")).toBeVisible();
  await page.locator("#input-project").fill("member/mailproj");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects .label.label-info")).toContainText(
    "member/mailproj",
  );
  await page.locator("#write-email").click();
  await expect(page.locator("#mailto-link")).toHaveAttribute(
    "href",
    "mailto:member@example.com,observer@example.com",
  );
  await expect
    .poll(() => requests)
    .toEqual([
      'POST /yona/api/v1/site/mail-list {"all":true,"projects":[]}',
      'POST /yona/api/v1/site/mail-list {"all":false,"projects":["member/mailproj"]}',
    ]);
});
