import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const ownerSelector = '[data-owner="site-massmail-write-action"]';

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-style" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
}

async function open(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  const action = page.locator(ownerSelector);
  await expect(action).toBeVisible();
  return action;
}

test("write action retires only its ybtn fallback classes and preserves legacy order", async ({
  page,
}) => {
  const action = await open(page);

  await expect(action).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(action).toHaveText("Write");
  await expect(action.locator("strong")).toHaveText("Write");
  expect(
    await page
      .locator(".mess-mail-wrap > *")
      .evaluateAll((nodes) => nodes.map((node) => node.id || node.tagName.toLowerCase())),
  ).toEqual(["label", "label", "project-list-wrap", "write-email"]);
  await expect(page.locator('[data-owner="site-massmail-select-project-action"]')).not.toHaveClass(
    /(?:^|\s)ybtn(?:\s|$)/u,
  );
});

test("write action preserves React mutation and pending behavior", async ({ page }) => {
  await mockSession(page);
  let requestBody: { all?: boolean; projects?: string[] } | null = null;
  await page.route("**/api/v1/site/mail-list", async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? "{}") as {
      all?: boolean;
      projects?: string[];
    };
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ json: { recipients: ["maintainer@example.com"] } });
  });
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.goto(`${basePath}/sites/massmail`);

  const action = page.locator(ownerSelector);
  await action.click();
  await expect(action).toBeDisabled();
  await expect(action.locator("strong")).toHaveText("loading...");
  await expect.poll(() => requestBody).toEqual({ all: true, projects: [] });
  await expect(action).toBeEnabled();
  await expect(action.locator("strong")).toHaveText("Write");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} write action preserves primary paint and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const action = await open(page);

    await expect(action).toHaveCSS("background-color", "rgb(255, 115, 50)");
    expect(
      await action.evaluate((element) => {
        const style = getComputedStyle(element);
        const actionBox = element.getBoundingClientRect();
        const wrapperBox = element.parentElement?.getBoundingClientRect();
        return {
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          color: style.color,
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

test("write action has a stable owner without generated selector contracts", async ({ page }) => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);

  expect(route).toContain('data-owner="site-massmail-write-action"');

  expect(route).not.toContain('className="ybtn ybtn-primary"');

  expect(route).not.toMatch(/#[0-9a-f]/iu);

  const action = await open(page);
  await expect(action).toBeVisible();
});
