import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = "src/routes/organizations/$organizationName/settingform.tsx";
const themeSource = "src/routes/organizations/$organizationName/-settingform.stylex.ts";
const owners = [
  "organization-setting-bubble",
  "organization-setting-logo-point",
  "organization-setting-name-field",
  "organization-setting-warning",
  "organization-setting-save",
] as const;

test("organization setting form records the route-local StyleX paint boundary", () => {
  const route = readFileSync(routeSource, "utf8");
  const theme = readFileSync(themeSource, "utf8");
  expect(route).toContain("setting.scala.html");
  for (const owner of owners) expect(route).toContain(`data-stylex-owner=\"${owner}\"`);
  expect(theme).toContain("organizationSettingColors");
  expect(theme).not.toMatch(/(?:margin|padding|width|height|font|lineHeight)/u);
});

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`organization setting form preserves legacy form structure on ${viewport.name}`, async ({
    page,
  }) => {
    await mockSettings(page);
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/settingform`);
    await expect(page.locator("#saveSetting")).toBeVisible();
    await expect(page.locator("#project-name")).toHaveValue("weblabs");
    await expect(page.locator("#project-desc")).toHaveValue("Web labs group");
    await expect(page.locator("#save")).toHaveText("Save");
    await expect(page.locator("[data-stylex-owner=organization-setting-logo-point]")).toHaveText(
      "bmp, jpg, gif, png",
    );
    await expect(page.locator("[data-stylex-owner=organization-setting-bubble]")).toHaveCSS(
      "background-color",
      "rgb(247, 247, 247)",
    );
    await expect(page.locator("[data-stylex-owner=organization-setting-save]")).toHaveCSS(
      "background-color",
      "rgb(255, 115, 50)",
    );
    const geometry = await page.locator("#saveSetting").evaluate((form) => {
      const rect = form.getBoundingClientRect();
      const bubble = form
        .querySelector("[data-stylex-owner=organization-setting-bubble]")!
        .getBoundingClientRect();
      return {
        form: { left: rect.left, right: rect.right },
        bubble: { left: bubble.left, right: bubble.right },
      };
    });
    expect(geometry.bubble.left).toBeGreaterThanOrEqual(geometry.form.left);
    expect(geometry.bubble.right).toBeLessThanOrEqual(geometry.form.right);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}

async function mockSettings(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { description: "Web labs group", id: 42, logoUrl: "", organizationName: "weblabs" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        enrollmentRequested: false,
        id: 42,
        logoUrl: "",
        members: [],
        organizationName: "weblabs",
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      },
    }),
  );
}
