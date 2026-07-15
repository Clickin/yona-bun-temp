import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-mail.stylex.ts", import.meta.url);
const ownerSelector = '[data-stylex-owner="site-mail-success-alert"]';

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
      headers: { "x-csrf-token": "csrf-site-mail-success-alert" },
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

async function open(page: Page, response: MailOptions = { ...defaultMailOptions, sent: true }) {
  await mockSession(page);
  await mockMailOptions(page, response);
  await page.goto(`${basePath}/sites/mail`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test("successful alert keeps Bootstrap fallback classes and StyleX ownership", async ({ page }) => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="site-mail-success-alert"');
  expect(route).toContain("styles.successAlert");
  expect(route).toContain(
    'className={`alert alert-success ${successAlertStyleProps.className ?? ""}`}',
  );
  expect(route).not.toMatch(/successAlert:[^{]*\{[^}]*#[0-9a-f]/iu);
  expect(theme).toContain("successSurface");
  expect(route).not.toContain("globalColors.");

  const alert = await open(page);
  await expect(alert).toHaveClass(/(?:^|\s)alert(?:\s|$)/u);
  await expect(alert).toHaveClass(/(?:^|\s)alert-success(?:\s|$)/u);
  await expect(alert).toHaveText("Mail has been sent.");
  expect(
    await alert.evaluate((element) =>
      [...element.classList].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token)),
    ),
  ).toBe(true);
});

test("successful alert preserves sent order for search and mutation success", async ({ page }) => {
  await mockSession(page);
  await mockMailOptions(page, defaultMailOptions);
  await page.goto(`${basePath}/sites/mail?sended=true`);
  const searchAlert = page.locator(ownerSelector);
  await expect(searchAlert).toBeVisible();
  expect(await searchAlert.evaluate((element) => element.nextElementSibling?.id)).toBe("mailForm");

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, defaultMailOptions);
  await page.route("**/api/v1/site/mail/test", (route) =>
    route.fulfill({ json: { ...defaultMailOptions, sent: true } }),
  );
  await page.goto(`${basePath}/sites/mail`);
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.locator('[data-stylex-owner="site-mail-send-action"]').click();
  await expect(page.locator(ownerSelector)).toHaveText("Mail has been sent.");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} successful alert preserves Bootstrap paint and containment`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const alert = await open(page);
    await expect(alert).toHaveCSS("background-color", "rgb(223, 240, 216)");
    await expect(alert).toHaveCSS("border-color", "rgb(214, 233, 198)");
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
      color: "rgb(70, 136, 71)",
      contained: true,
      marginBottom: "20px",
      padding: "8px 35px 8px 14px",
      textShadow: "rgba(255, 255, 255, 0.5) 0px 1px 0px",
    });
    await expect(alert).toHaveScreenshot(`stylex-site-mail-success-alert-${viewport.name}.png`);
  });
}

test("successful alert excludes loading, error, and not-configured states", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/v1/site/mail", () => new Promise<void>(() => {}));
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, defaultMailOptions);
  await page.goto(`${basePath}/sites/mail?errorMessage=validation.invalidEmail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator(".alert.alert-error")).toBeVisible();

  await page.unroute("**/api/v1/site/mail");
  await mockMailOptions(page, { ...defaultMailOptions, notConfiguredItems: ["smtp.host"] });
  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator(".alert.alert-error")).toBeVisible();
});
