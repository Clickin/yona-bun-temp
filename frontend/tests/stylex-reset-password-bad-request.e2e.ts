import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const route = new URL("../src/routes/resetPassword.tsx", import.meta.url);
const theme = new URL("../src/theme.stylex.ts", import.meta.url);
const fallback = new URL(
  "../public/legacy-assets/stylesheets/legacy-fallback.css",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockAnonymous(page: Page) {
  await page.route("**/api/v1/session", async (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
  );
}
async function open(page: Page) {
  await page.goto(`${basePath}/resetPassword?error=invalid&s=bad-token`);
  const owner = page.locator('[data-stylex-owner="reset-password-bad-request"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX reset-password bad request", () => {
  test("owns only the legacy wrapper and message while retaining shared fallback primitives", async () => {
    const [source, vars, css] = await Promise.all([
      readFile(route, "utf8"),
      readFile(theme, "utf8"),
      readFile(fallback, "utf8"),
    ]);
    expect(source).toContain('data-stylex-owner="reset-password-bad-request"');
    expect(source).toContain('className="ico-404"');
    expect(source).toContain('className="ybtn ybtn-info"');
    expect(vars).toContain("resetPasswordBadRequestErrorWrapPadding");
    expect(css).toContain(".ybtn-info");
  });

  test("keeps legacy copy/order and Home SPA navigation", async ({ page }) => {
    await mockAnonymous(page);
    const owner = await open(page);
    await expect(
      owner.locator('[data-stylex-part="reset-password-bad-request-message"]'),
    ).toHaveText("Wrong url to reset password.");
    expect(
      await owner
        .locator(".error-wrap > *")
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["I", "P", "A"]);
    const home = owner.getByRole("link", { name: "Home" });
    await expect(home).toHaveAttribute("href", `${basePath}/`);
    await home.click();
    await expect(page).toHaveURL(`${basePath}/`);
  });

  test("matches desktop legacy wrapper and message geometry and paint", async ({ page }) => {
    await mockAnonymous(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    const owner = await open(page);
    const wrap = owner.locator('[data-stylex-part="reset-password-bad-request-error-wrap"]');
    const message = owner.locator('[data-stylex-part="reset-password-bad-request-message"]');
    await expect(wrap).toHaveCSS("padding-top", "100px");
    await expect(wrap).toHaveCSS("text-align", "center");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-reset-password-bad-request-desktop.png");
  });

  test("matches mobile legacy wrapper and message paint without overflow", async ({ page }) => {
    await mockAnonymous(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const owner = await open(page);
    await expect(
      owner.locator('[data-stylex-part="reset-password-bad-request-error-wrap"]'),
    ).toHaveCSS("padding-top", "100px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-reset-password-bad-request-mobile.png");
  });

  test("excludes valid-token form and validation popovers", async ({ page }) => {
    await mockAnonymous(page);
    await page.goto(`${basePath}/resetPassword?s=valid-token`);
    await expect(page.locator('[data-stylex-owner="reset-password-bad-request"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="reset-password-form"]')).toBeVisible();
    await expect(page.locator(".popover.in")).toHaveCount(0);
  });
});
