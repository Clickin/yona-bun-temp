import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const appCssSource = new URL("../src/app.css", import.meta.url);
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

  // F5 dist-truth (2026-08-11): the write action has no class; only the
  // select-project action retains the legacy ybtn (massmail.tsx:240).
  await expect(action).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(action).toHaveText("Write");
  await expect(action.locator("strong")).toHaveText("Write");
  expect(
    await page
      .locator(".mess-mail-wrap > *")
      .evaluateAll((nodes) => nodes.map((node) => node.id || node.tagName.toLowerCase())),
  ).toEqual(["label", "label", "project-list-wrap", "write-email"]);
  await expect(page.locator('[data-owner="site-massmail-select-project-action"]')).toHaveClass(
    /(?:^|\s)ybtn(?:\s|$)/u,
  );
});

test("write action preserves React mutation and pending behavior", async ({ page }) => {
  await mockSession(page);
  let requestBody: { all?: boolean; projects?: string[] } | null = null;
  let releaseResponse = () => {};
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/v1/site/mail-list", async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? "{}") as {
      all?: boolean;
      projects?: string[];
    };
    await responseGate;
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
  releaseResponse();
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
    // F5 dist-truth (2026-08-13): legacy massMail.scala.html:47 renders the
    // write action as `ybtn ybtn-primary` — base #FF7332 rgb(255,115,50),
    // :hover/:focus/:active #E95E01 rgb(233,94,1), border #E95E01
    // (_yobiUI.less:806-813, _variables.less:63-64,84-85); the app's data-owner
    // rules (app.css --site-massmail-primary-surface/-interactive) match legacy
    // exactly. WTR iframe :hover/:focus/:active synthesis is unreliable (the
    // real-mouse bridge presses the button but Chromium does not repaint the
    // :active state inside the harness iframe — same ceiling as the
    // pagination/delete-action families), so the interactive paint is pinned
    // at source level below (app.css owns the :active rule with the legacy
    // #e95e01 value) and the base paint is asserted at runtime above.
  });
}

test("write action has a stable owner without generated selector contracts", async ({ page }) => {
  const [route, theme, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    Promise.resolve(curatedAppCss()),
  ]);

  expect(route).toContain('data-owner="site-massmail-write-action"');

  expect(route).not.toContain('className="ybtn ybtn-primary"');

  expect(route).not.toMatch(/#[0-9a-f]/iu);

  // The interactive (:hover/:focus/:active) paint is owned by the app.css
  // data-owner rule with the legacy _yobiUI.less:806-813 value #e95e01 —
  // pinned at source level (WTR iframe cannot synthesize the :active state).
  expect(appCss).toMatch(
    /\[data-owner="site-massmail-write-action"\]:(hover|focus|active)\b[\s\S]{0,120}?var\(--site-massmail-primary-interactive\)/u,
  );
  expect(theme).toContain("--site-massmail-primary-interactive: var(--color-yona-primary-dark);");

  const action = await open(page);
  await expect(action).toBeVisible();
});
