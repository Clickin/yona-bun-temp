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

test("site admin mail form keeps legacy label and control alignment", async ({ page }) => {
  await page.route(apiV1Route("/site/mail"), async (route) => {
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

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/mail");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send email");
  await expect(page.locator("#mailForm.form-horizontal")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const alert = await layoutBox(page, ".site-setting-wrap .alert.alert-error");
  const form = await layoutBox(page, "#mailForm.form-horizontal");
  const fromGroup = await layoutBox(page, "#mailForm .control-group:has(input[name='from'])");
  const fromLabel = await layoutBox(page, "#mailForm label[name='from']");
  const fromControl = await layoutBox(page, "#mailForm input[name='from']");
  const bodyGroup = await layoutBox(page, "#mailForm .control-group:has(textarea[name='body'])");
  const bodyLabel = await layoutBox(page, "#mailForm label[name='body']");
  const bodyControl = await layoutBox(page, "#mailForm textarea[name='body']");
  const submitWrap = await layoutBox(page, "#mailForm .mail-btn-wrap");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height + 8);
  expect(footer.y).toBeGreaterThan(pageOuter.y + pageOuter.height - 1);

  expect(sidebar.x).toBeLessThan(content.x);
  expect(sidebar.width).toBeGreaterThanOrEqual(170);
  expect(sidebar.width).toBeLessThanOrEqual(190);
  expect(content.width).toBeGreaterThanOrEqual(840);
  expect(Math.abs(sidebar.y - content.y)).toBeLessThanOrEqual(1);

  expect(titleArea.x).toBeCloseTo(content.x, 0);
  expect(alert.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(form.y).toBeGreaterThan(alert.y + alert.height - 1);
  expect(form.x).toBeCloseTo(content.x, 0);
  expect(form.width).toBeGreaterThanOrEqual(700);
  expect(form.width).toBeLessThanOrEqual(780);

  expect(fromLabel.x).toBeCloseTo(fromGroup.x, 0);
  expect(fromControl.x).toBeGreaterThan(fromLabel.x + fromLabel.width);
  expect(fromControl.y).toBeGreaterThanOrEqual(fromGroup.y);
  expect(fromControl.width).toBeGreaterThanOrEqual(550);
  expect(bodyLabel.x).toBeCloseTo(bodyGroup.x, 0);
  expect(bodyControl.x).toBeCloseTo(fromControl.x, 0);
  expect(Math.abs(bodyControl.width - fromControl.width)).toBeLessThanOrEqual(12);
  expect(bodyControl.height).toBeGreaterThanOrEqual(180);
  expect(submitWrap.y).toBeGreaterThan(bodyGroup.y + bodyGroup.height - 1);
});

test("site admin mass mail keeps legacy radio and project selector alignment", async ({ page }) => {
  await page.route(apiV1Route("/site/mail-list"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        recipients: ["member@example.com", "observer@example.com"],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/massmail");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send mass emails");
  await expect(page.locator(".mess-mail-wrap")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const wrap = await layoutBox(page, ".mess-mail-wrap");
  const allRadio = await layoutBox(page, ".mess-mail-wrap label[for='mailtoAll']");
  const projectRadio = await layoutBox(page, ".mess-mail-wrap label[for='mailtoPrj']");
  const writeButton = await layoutBox(page, "#write-email");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height + 8);

  expect(sidebar.x).toBeLessThan(content.x);
  expect(sidebar.width).toBeGreaterThanOrEqual(170);
  expect(sidebar.width).toBeLessThanOrEqual(190);
  expect(content.width).toBeGreaterThanOrEqual(840);
  expect(Math.abs(sidebar.y - content.y)).toBeLessThanOrEqual(1);

  expect(titleArea.x).toBeCloseTo(content.x, 0);
  expect(wrap.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(wrap.x).toBeCloseTo(content.x, 0);
  expect(wrap.width).toBeGreaterThanOrEqual(680);
  expect(wrap.width).toBeLessThanOrEqual(740);
  expect(projectRadio.y).toBeGreaterThan(allRadio.y + allRadio.height - 1);
  expect(writeButton.y).toBeGreaterThan(projectRadio.y + projectRadio.height - 1);

  await page.locator("#mailtoPrj").check();
  const projectWrap = await layoutBox(page, "#project-list-wrap");
  const projectControls = await layoutBox(page, "#project-list-wrap .controls");
  const projectInput = await layoutBox(page, "#input-project");
  const addButton = await layoutBox(page, "#select-project");

  expect(projectWrap.y).toBeGreaterThan(projectRadio.y + projectRadio.height - 1);
  expect(projectWrap.x).toBeCloseTo(wrap.x, 0);
  expect(Math.abs(projectWrap.width - wrap.width)).toBeLessThanOrEqual(4);
  expect(projectControls.x).toBeGreaterThanOrEqual(projectWrap.x + 10);
  expect(projectInput.x).toBeCloseTo(projectControls.x, 0);
  expect(addButton.x).toBeGreaterThan(projectInput.x + projectInput.width);
  expect(addButton.y).toBeCloseTo(projectInput.y, 0);
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
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send email");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Send email");
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

  await expect(page.locator(".alert.alert-success")).toContainText("Mail has been sent.");
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
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send mass emails");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Send mass mails");
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
