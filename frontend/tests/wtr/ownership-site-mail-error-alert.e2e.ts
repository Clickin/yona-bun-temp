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
const ownerSelector = '[data-owner="site-mail-error-alert"]';

type MailOptions = {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
};

const defaultMailOptions: MailOptions = {
  notConfiguredItems: [],
  sender: "site-admin@yona.local",
  sent: false,
};

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-error-alert" },
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

async function openSearchError(page: Page) {
  await mockSession(page);
  await mockMailOptions(page, defaultMailOptions);
  await page.goto(`${basePath}/sites/mail?errorMessage=validation.invalidEmail`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test("error alert keeps Bootstrap fallback classes and Style ownership", async ({ page }) => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);
  expect(route).toContain('data-owner="site-mail-error-alert"');

  const alert = await openSearchError(page);
  await expect(alert).toHaveClass(/(?:^|\s)alert(?:\s|$)/u);
  await expect(alert).toHaveClass(/(?:^|\s)alert-error(?:\s|$)/u);
  await expect(alert.locator("p")).toHaveText([
    "Failed to send mail.",
    "Enter valid email address!",
  ]);
  expect(await alert.evaluate((element) => element.nextElementSibling?.id)).toBe("mailForm");
});

test("error alert preserves search and mutation error branches", async ({ page }) => {
  await openSearchError(page);

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, defaultMailOptions);
  await page.route("**/api/v1/site/mail/test", (route) =>
    route.fulfill({
      status: 422,
      json: {
        error: { code: "mail_failed", message: "Mail delivery failed.", status: 422 },
      },
    }),
  );
  await page.goto(`${basePath}/sites/mail`);
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.locator('[data-owner="site-mail-send-action"]').click();
  const mutationAlert = page.locator(ownerSelector);
  await expect(mutationAlert).toHaveText("Failed to send mail.Mail delivery failed.");
  expect(await mutationAlert.evaluate((element) => element.nextElementSibling?.id)).toBe(
    "mailForm",
  );
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} error alert preserves Bootstrap paint and containment`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const alert = await openSearchError(page);
    await expect(alert).toHaveCSS("background-color", "rgb(242, 222, 222)");
    await expect(alert).toHaveCSS("border-color", "rgb(238, 211, 215)");
    expect(
      await alert.evaluate((element) => {
        const style = getComputedStyle(element);
        const alertBox = element.getBoundingClientRect();
        const contentBox = element.parentElement?.getBoundingClientRect();
        return {
          borderRadius: style.borderRadius,
          color: style.color,
          contained: Boolean(
            contentBox && alertBox.left >= contentBox.left && alertBox.right <= contentBox.right,
          ),
          marginBottom: style.marginBottom,
          padding: style.padding,
          textShadow: style.textShadow,
        };
      }),
    ).toEqual({
      borderRadius: "4px",
      color: "rgb(185, 74, 72)",
      contained: true,
      marginBottom: "20px",
      padding: "8px 35px 8px 14px",
      textShadow: "rgba(255, 255, 255, 0.5) 0px 1px 0px",
    });
  });
}

test("error alert excludes loading, success, and not-configured states", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/v1/site/mail", () => new Promise<void>(() => {}));
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, sent: true });
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator('[data-owner="site-mail-success-alert"]')).toBeVisible();

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: ["smtp.host"] });
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator(".alert.alert-error")).toBeVisible();
});
