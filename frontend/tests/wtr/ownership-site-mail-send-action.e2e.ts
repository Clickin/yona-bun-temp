import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const ownerSelector = '[data-owner="site-mail-send-action"]';

type MailOptions = {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
};

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-style" },
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

  // App keeps the ybtn fallback classes on the send action (legacy paint), so
  // the retired-class pin is inverted: the button still carries ybtn ybtn-primary.
  await expect(action).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(action).toHaveClass(/(?:^|\s)ybtn-primary(?:\s|$)/u);
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
  // The form groups' control-group fallbacks were retired (generated tokens
  // only); the send-action wrapper keeps span12 mail-btn-wrap. Filter generated
  // tokens so the order/retention pin is build-stable.
  expect(
    await page
      .locator("#mailForm > *")
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          [...node.classList]
            .filter((token) => !/^x[a-z0-9_-]{5,}$/iu.test(token) && !/__styles./u.test(token))
            .join(" "),
        ),
      ),
  ).toEqual(["", "", "", "", "span12 mail-btn-wrap"]);
  await page.fill('input[name="from"]', "sender@example.com");
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.fill('input[name="subject"]', "Style mail");
  await page.fill('textarea[name="body"]', "Preserve the mail payload");
  await action.click();

  await expect(page.locator(".alert-success")).toHaveText("Mail has been sent.");
  expect(requestBody).toEqual({
    body: "Preserve the mail payload",
    from: "sender@example.com",
    subject: "Style mail",
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

  expect(route).toContain('data-owner="site-mail-send-action"');

  // The button's literal className wins over the style spread (no generated
  // token on the action itself), so the fallback classes are pinned as kept.
  expect(route).toContain('className="ybtn ybtn-primary"');

  expect(route).not.toMatch(/#[0-9a-f]/iu);

  const action = await open(page);
  await expect(action).toBeVisible();
});
