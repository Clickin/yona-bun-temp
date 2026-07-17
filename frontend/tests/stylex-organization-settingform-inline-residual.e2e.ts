import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = "src/routes/organizations/$organizationName/settingform.tsx";
const styleSource = "src/routes/organizations/$organizationName/-settingform.stylex.ts";

test("organization setting form owns the static inline residuals in StyleX", () => {
  const route = readFileSync(routeSource, "utf8");
  const styles = readFileSync(styleSource, "utf8");

  expect(route).toContain("setting.scala.html");
  expect(route).toContain('data-stylex-owner="organization-setting-top-box"');
  expect(route).toContain('data-stylex-owner="organization-setting-logo"');
  expect(route).not.toContain("style={{ paddingTop: 20 }}");
  expect(route).toContain("style={{ backgroundImage:");
  expect(styles).not.toContain("logo: (backgroundImage: string) => ({ backgroundImage })");
  expect(styles).toContain('topBox: { paddingTop: "20px" }');
});

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`organization setting form keeps top spacing and logo interaction on ${viewport.name}`, async ({
    page,
  }) => {
    await mockSettings(page);
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/settingform`);

    const topBox = page.locator('[data-stylex-owner="organization-setting-top-box"]');
    const logo = page.locator('[data-stylex-owner="organization-setting-logo"]');
    await expect(topBox).toBeVisible();
    await expect(logo).toBeVisible();
    await expect(topBox).toHaveCSS("padding-top", viewport.name === "mobile" ? "10px" : "20px");
    await expect(logo).toHaveCSS("background-image", /group_default\.png/u);

    const geometry = await page.locator("#saveSetting").evaluate((form) => {
      const formBox = form.getBoundingClientRect();
      const topBox = form.querySelector('[data-stylex-owner="organization-setting-top-box"]')!;
      const logo = form.querySelector('[data-stylex-owner="organization-setting-logo"]')!;
      const topRect = topBox.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      return {
        form: { left: formBox.left, right: formBox.right },
        top: { left: topRect.left, right: topRect.right },
        logo: { left: logoRect.left, right: logoRect.right },
      };
    });
    expect(geometry.top.left).toBeGreaterThanOrEqual(geometry.form.left);
    expect(geometry.top.right).toBeLessThanOrEqual(geometry.form.right);
    expect(geometry.logo.left).toBeGreaterThanOrEqual(geometry.top.left);
    expect(geometry.logo.right).toBeLessThanOrEqual(geometry.top.right);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    const logoInput = page.locator("#logoPath");
    await expect(logoInput).toHaveAttribute("accept", "image/*");
    await expect(logoInput).toHaveAttribute("name", "logoPath");
    let dialogMessage = "";
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await logoInput.setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid"),
    });
    expect(dialogMessage).toBe("This is not an image.");
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
