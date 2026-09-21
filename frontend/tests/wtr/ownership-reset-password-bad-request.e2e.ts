import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const route = "../src/routes/resetPassword.tsx";
const routeTheme = "../src/app.css";
const theme = "../src/app.css";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockAnonymous(page: Page) {
  await page.route("**/api/v1/session", async (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
  );
}
async function open(page: Page) {
  await page.goto(`${basePath}/resetPassword?error=invalid&s=bad-token`);
  const owner = page.locator('[data-owner="reset-password-bad-request"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style reset-password bad request", () => {
  test("owns only the legacy wrapper and message while retaining shared fallback primitives", async () => {
    const [source, _routeVars, vars, css] = await Promise.all([
      readFile(route, "utf8"),
      readFile(routeTheme, "utf8"),
      readFile(theme, "utf8"),
      Promise.resolve(mergedLegacyBlock()),
    ]);
    expect(source).toContain('data-owner="reset-password-bad-request"');
    expect(source).toContain('className="ico-404"');
    expect(source).toContain('className="ybtn ybtn-info"');

    expect(vars).not.toMatch(/^\s+resetPassword[A-Z]/m);
    expect(css).toContain(".ybtn-info");
  });

  test("keeps legacy copy/order and Home SPA navigation", async ({ page }) => {
    await mockAnonymous(page);
    const owner = await open(page);
    await expect(owner.locator('[data-part="reset-password-bad-request-message"]')).toHaveText(
      "Wrong url to reset password.",
    );
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
    const wrap = owner.locator('[data-part="reset-password-bad-request-error-wrap"]');
    const message = owner.locator('[data-part="reset-password-bad-request-message"]');
    await expect(wrap).toHaveCSS("padding-top", "100px");
    await expect(wrap).toHaveCSS("text-align", "center");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("matches mobile legacy wrapper and message paint without overflow", async ({ page }) => {
    await mockAnonymous(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const owner = await open(page);
    await expect(owner.locator('[data-part="reset-password-bad-request-error-wrap"]')).toHaveCSS(
      "padding-top",
      "100px",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("excludes valid-token form and validation popovers", async ({ page }) => {
    await mockAnonymous(page);
    await page.goto(`${basePath}/resetPassword?s=valid-token`);
    await expect(page.locator('[data-owner="reset-password-bad-request"]')).toHaveCount(0);
    await expect(page.locator('[data-owner="reset-password-form"]')).toBeVisible();
    await expect(page.locator(".popover.in")).toHaveCount(0);
  });
});
