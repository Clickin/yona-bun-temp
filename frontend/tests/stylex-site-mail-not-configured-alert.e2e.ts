import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const ownerSelector = '[data-stylex-owner="site-mail-not-configured-alert"]';

type MailOptions = {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
};

const defaultMailOptions: MailOptions = {
  notConfiguredItems: ["smtp.host", "smtp.user", "smtp.password"],
  sender: "site-admin@yona.local",
  sent: false,
};

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-not-configured-alert" },
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

test("not-configured alert keeps Bootstrap fallback classes and StyleX ownership", async ({
  page,
}) => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="site-mail-not-configured-alert"');
  expect(route).toContain("styles.notConfiguredAlert");
  expect(route).toContain('className="alert alert-error"');
  expect(route).not.toMatch(/notConfiguredAlert:[^{]*\{[^}]*#[0-9a-f]/iu);
  expect(theme).toContain("siteMailErrorAlertSurface");

  const alert = await open(page);
  await expect(alert).toHaveClass(/(?:^|\s)alert(?:\s|$)/u);
  await expect(alert).toHaveClass(/(?:^|\s)alert-error(?:\s|$)/u);
  await expect(alert.locator("p")).toHaveText(
    "Mailer has not been configured yet. Please configure it at Site Settings.",
  );
  await expect(alert.locator("ul > li")).toHaveText(["smtp.host", "smtp.user", "smtp.password"]);
  expect(await alert.evaluate((element) => element.nextElementSibling?.id)).toBe("mailForm");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} not-configured alert preserves Bootstrap paint, list order, and containment`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const alert = await open(page);
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
    await expect(alert).toHaveScreenshot(
      `stylex-site-mail-not-configured-alert-${viewport.name}.png`,
    );
  });
}

test("not-configured alert excludes loading, search/mutation errors, success, and the empty list", async ({
  page,
}) => {
  await mockSession(page);
  await page.route("**/api/v1/site/mail", () => new Promise<void>(() => {}));
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: [] });
  await page.goto(`${basePath}/sites/mail?errorMessage=validation.invalidEmail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="site-mail-error-alert"]')).toBeVisible();

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: [] });
  await page.route("**/api/v1/site/mail/test", (route) =>
    route.fulfill({
      status: 422,
      json: { error: { code: "mail_failed", message: "Mail delivery failed.", status: 422 } },
    }),
  );
  await page.goto(`${basePath}/sites/mail`);
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.locator('[data-stylex-owner="site-mail-send-action"]').click();
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="site-mail-error-alert"]')).toBeVisible();

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: [], sent: true });
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="site-mail-success-alert"]')).toBeVisible();

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: [] });
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
});

test("not-configured alert isolates generated StyleX classes to its stable owner", async ({
  page,
}) => {
  const alert = await open(page);
  expect(
    await alert.evaluate((element) =>
      [...element.classList].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token)),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .every(
            (element) =>
              element.closest(selector) !== null || element.closest("[data-stylex-owner]") !== null,
          ),
      ownerSelector,
    ),
  ).toBe(true);
});
