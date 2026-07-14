import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const ownerSelector = '[data-stylex-owner="site-mail-send-action"]';

type MailOptions = {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
};

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-stylex" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
}

async function mockMailOptions(page: Page, response: MailOptions) {
  await page.route("**/api/v1/site/mail", (route) => route.fulfill({ json: response }));
}

async function open(page: Page, response: MailOptions = defaultMailOptions) {
  await mockSession(page);
  await mockMailOptions(page, response);
  await page.goto(`${basePath}/sites/mail`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

const defaultMailOptions: MailOptions = {
  notConfiguredItems: [],
  sender: "site-admin@yona.local",
  sent: false,
};

test("send action retires only its ybtn fallback classes", async ({ page }) => {
  const action = await open(page);

  await expect(action).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(action).toHaveText("Send");
  await expect(action.locator("strong")).toHaveText("Send");
  await expect(page.locator(".mail-btn-wrap > button")).toHaveCount(1);
});

test("send action preserves legacy form order and React mutation payload", async ({ page }) => {
  let requestBody: Record<string, string> | null = null;
  await mockSession(page);
  await mockMailOptions(page, defaultMailOptions);
  await page.route("**/api/v1/site/mail/test", async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, string>;
    await route.fulfill({ json: { ...defaultMailOptions, sent: true } });
  });
  await page.goto(`${basePath}/sites/mail`);

  const action = page.locator(ownerSelector);
  await expect(action).toBeVisible();
  expect(
    await page.locator("#mailForm > *").evaluateAll((nodes) => nodes.map((node) => node.className)),
  ).toEqual([
    "control-group",
    "control-group",
    "control-group mr10",
    "control-group mr10",
    "span12 mail-btn-wrap",
  ]);
  await page.fill('input[name="from"]', "sender@example.com");
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.fill('input[name="subject"]', "StyleX mail");
  await page.fill('textarea[name="body"]', "Preserve the mail payload");
  await action.click();

  await expect(page.locator(".alert-success")).toHaveText("Mail has been sent.");
  expect(requestBody).toEqual({
    body: "Preserve the mail payload",
    from: "sender@example.com",
    subject: "StyleX mail",
    to: "recipient@example.com",
  });
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} send action preserves primary paint and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const action = await open(page);

    await expect(action).toHaveCSS("background-color", "rgb(255, 115, 50)");
    expect(
      await action.evaluate((element) => {
        const style = getComputedStyle(element);
        const actionBox = element.getBoundingClientRect();
        const wrapperBox = element.parentElement?.getBoundingClientRect();
        const formBox = element.closest("form")?.getBoundingClientRect();
        return {
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          color: style.color,
          insideForm: Boolean(
            formBox && actionBox.left >= formBox.left && actionBox.right <= formBox.right,
          ),
          lineHeight: style.lineHeight,
          padding: style.padding,
          withinWrapper: Boolean(
            wrapperBox && actionBox.left >= wrapperBox.left && actionBox.right <= wrapperBox.right,
          ),
        };
      }),
    ).toEqual({
      borderColor: "rgb(233, 94, 1)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      insideForm: true,
      lineHeight: "20px",
      padding: "4px 12px",
      withinWrapper: true,
    });
    await action.hover();
    await page.waitForTimeout(350);
    await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await action.focus();
    await page.waitForTimeout(350);
    await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await expect(action).toHaveScreenshot(`stylex-site-mail-send-action-${viewport.name}.png`);
  });
}

test("send owner remains available with response states and is absent while the form is unavailable", async ({
  page,
}) => {
  const stateResponses = [
    { response: { ...defaultMailOptions, sent: true }, search: "" },
    { response: defaultMailOptions, search: "?errorMessage=validation.invalidEmail" },
    { response: { ...defaultMailOptions, notConfiguredItems: ["smtp.host"] }, search: "" },
  ];

  for (const { response, search } of stateResponses) {
    await mockSession(page);
    await mockMailOptions(page, response);
    await page.goto(`${basePath}/sites/mail${search}`);
    await expect(page.locator(ownerSelector)).toHaveCount(1);
  }

  await mockSession(page);
  await page.route("**/api/v1/site/mail", () => new Promise<void>(() => {}));
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator("#mailForm")).toHaveCount(0);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
});

test("send action has a stable owner without generated selector contracts", async ({ page }) => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);

  expect(route).toContain('data-stylex-owner="site-mail-send-action"');
  expect(route).toContain("styles.sendAction");
  expect(route).not.toContain('className="ybtn ybtn-primary"');
  expect(route).toContain('":active": globalColors.siteMailSendActionInteractiveSurface');
  expect(route).not.toMatch(/#[0-9a-f]/iu);
  expect(theme).toContain("siteMailSendActionInteractiveSurface");

  const action = await open(page);
  expect(
    await action.evaluate((element) => {
      const wrapper = element.parentElement;
      const strong = element.querySelector("strong");
      const hasGeneratedToken = (current: Element | null) =>
        [...(current?.classList ?? [])].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token));
      return {
        actionHasGeneratedToken: hasGeneratedToken(element),
        strongHasGeneratedToken: hasGeneratedToken(strong),
        wrapperHasGeneratedToken: hasGeneratedToken(wrapper),
      };
    }),
  ).toEqual({
    actionHasGeneratedToken: true,
    strongHasGeneratedToken: false,
    wrapperHasGeneratedToken: false,
  });
});
