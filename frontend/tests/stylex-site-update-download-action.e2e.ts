import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = '[data-stylex-owner="site-update-download-action"]';

async function open(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      json: {
        currentVersion: "1.0.0",
        error: null,
        releaseUrl: "https://example.test/yona-1.1.0",
        versionToUpdate: "1.1.0",
      },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  const link = page.locator(owner);
  await expect(link).toBeVisible();
  return link;
}

test("download link preserves external href and copy without ybtn classes", async ({ page }) => {
  const link = await open(page);
  await expect(link).toHaveAttribute("href", "https://example.test/yona-1.1.0");
  await expect(link).toHaveText("Download");
  await expect(link).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
});

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} download action preserves success paint`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const link = await open(page);
    await expect(link).toHaveCSS("background-color", "rgb(255, 115, 50)");
    await link.hover();
    await page.waitForTimeout(350);
    expect(await link.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(233, 94, 1)",
    );
    await expect(link).toHaveScreenshot(`stylex-site-update-download-action-${viewport.name}.png`);
  });
}

test("download action excludes missing release URLs", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      json: { currentVersion: "1.0.0", error: null, releaseUrl: null, versionToUpdate: "1.1.0" },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator(owner)).toHaveCount(0);
});

test("download owner excludes non-available branches", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      json: { currentVersion: "1.0.0", error: null, releaseUrl: null, versionToUpdate: null },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator(owner)).toHaveCount(0);
  await expect(page.getByText("You are using the latest version")).toBeVisible();
});
