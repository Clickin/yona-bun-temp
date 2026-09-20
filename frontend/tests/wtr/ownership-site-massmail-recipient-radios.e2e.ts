import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-massmail-recipient-radios"]';

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-recipient-radios" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) => route.fulfill({ json: { projects: [] } }));
}

async function openMassMail(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  const radios = page.locator(ownerSelector);
  await expect(radios).toHaveCount(2);
  return radios;
}

test.describe("Style site massmail recipient radios", () => {
  test("labels both recipient choices", async ({ page }) => {
    const radios = await openMassMail(page);
    await expect(radios).toHaveText(["To all", "To members of a specific project"]);
    await expect(radios.nth(0).locator(":scope > input")).toHaveAttribute("id", "mailtoAll");
    await expect(radios.nth(1).locator(":scope > input")).toHaveAttribute("id", "mailtoPrj");
  });

  test("keeps all default and projects/reset recipient behavior", async ({ page }) => {
    const radios = await openMassMail(page);
    const all = radios.nth(0).locator(":scope > input");
    const projects = radios.nth(1).locator(":scope > input");
    await expect(all).toBeChecked();
    await expect(projects).not.toBeChecked();
    await expect(page.locator("#project-list-wrap")).not.toBeVisible();
    await projects.check();
    await expect(projects).toBeChecked();
    await expect(page.locator("#project-list-wrap")).toBeVisible();
    await page.locator("#input-project").fill("admin/projectYobi");
    await page.locator("#select-project").click();
    await expect(page.locator('[data-owner="site-massmail-selected-project-tag"]')).toHaveText(
      "admin/projectYobi x",
    );
    await all.check();
    await expect(all).toBeChecked();
    await expect(page.locator("#project-list-wrap")).not.toBeVisible();
    await expect(page.locator('[data-owner="site-massmail-selected-project-tag"]')).toHaveCount(0);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} preserves radio geometry, retained generic-label margin, and excludes controls/inline rules`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const radios = await openMassMail(page);
      expect(
        await radios.evaluateAll((labels) =>
          labels.map((label) => {
            const input = label.querySelector<HTMLInputElement>(":scope > input[type=radio]");
            const labelStyle = getComputedStyle(label);
            const inputStyle = input ? getComputedStyle(input) : null;
            const labelBox = label.getBoundingClientRect();
            const inputBox = input?.getBoundingClientRect();
            return {
              display: labelStyle.display,
              inputFloat: inputStyle?.float,
              inputMarginLeft: inputStyle?.marginLeft,
              inputWithinLabel: Boolean(
                inputBox && inputBox.top >= labelBox.top && inputBox.bottom <= labelBox.bottom,
              ),
              marginBottom: labelStyle.marginBottom,
              minHeight: labelStyle.minHeight,
              paddingLeft: labelStyle.paddingLeft,
              paddingTop: labelStyle.paddingTop,
            };
          }),
        ),
      ).toEqual([
        {
          display: "block",
          inputFloat: "left",
          inputMarginLeft: "-20px",
          // Bootstrap radios use native sizing, not the text-input 20px height.
          inputWithinLabel: true,
          // Bootstrap's generic `label` fallback remains; this is not a `.radio.inline` rule.
          marginBottom: "5px",
          minHeight: "20px",
          paddingLeft: "20px",
          paddingTop: "0px",
        },
        {
          display: "block",
          inputFloat: "left",
          inputMarginLeft: "-20px",
          inputWithinLabel: true,
          // Bootstrap's generic `label` fallback remains; this is not a `.radio.inline` rule.
          marginBottom: "5px",
          minHeight: "20px",
          paddingLeft: "20px",
          paddingTop: "0px",
        },
      ]);
    });
  }
});
