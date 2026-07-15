import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/sites/diagnostic.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-diagnostic.stylex.ts", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSiteAdminSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
      },
    });
  });
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } });
  });
}

async function openDiagnosticErrors(page: Page) {
  await mockSiteAdminSession(page);
  await page.route("**/api/v1/site/diagnostics", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { errorCount: 2, errors: ["database probe failed", "repository path is unavailable"] },
    });
  });
  await page.goto(`${basePath}/sites/diagnostic`);
  const owner = page.locator('[data-stylex-owner="site-diagnostic-error-pre"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site diagnostic error pre", () => {
  test("owns direct legacy error pre declarations through global theme values", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-diagnostic-error-pre"');
    expect(route).toContain("styles.errorPre");
    expect(route).toContain("siteDiagnosticColors.errorBorder");
    expect(route).toContain("siteDiagnosticColors.errorText");
    expect(route).toContain("siteDiagnosticColors.errorSurface");
    expect(route).toContain('borderRadius: "4px"');
    expect(theme).toContain("errorBorder");
    expect(theme).toContain("errorText");
    expect(theme).toContain("errorSurface");
    expect(route).not.toContain("globalColors.");
  });

  test("preserves legacy diagnostic error copy and list order", async ({ page }) => {
    const owner = await openDiagnosticErrors(page);
    await expect(page.locator(".site-setting-wrap .span10 > p")).toHaveText("2 errors were found");
    await expect(owner.locator(":scope > li > pre")).toHaveText([
      "database probe failed",
      "repository path is unavailable",
    ]);
    expect(
      await owner
        .locator(":scope > li > pre")
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["PRE", "PRE"]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`matches ${viewport.name} Bootstrap pre geometry and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openDiagnosticErrors(page);
      const pre = owner.locator(":scope > li > pre").first();

      await expect(pre).toHaveCSS("display", "block");
      await expect(pre).toHaveCSS(
        "font-family",
        'Monaco, Menlo, Consolas, "Courier New", monospace',
      );
      await expect(pre).toHaveCSS("font-size", "13px");
      await expect(pre).toHaveCSS("line-height", "20px");
      await expect(pre).toHaveCSS("color", "rgb(51, 51, 51)");
      await expect(pre).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(pre).toHaveCSS("padding", "9.5px");
      await expect(pre).toHaveCSS("margin", "0px 0px 10px");
      await expect(pre).toHaveCSS("border-radius", "4px");
      await expect(pre).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0.15)");
      await expect(pre).toHaveCSS("border-top-style", "solid");
      await expect(pre).toHaveCSS("border-top-width", "1px");
      await expect(pre).toHaveCSS("white-space", "pre-wrap");
      await expect(pre).toHaveCSS("word-break", "break-all");
      await expect(pre).toHaveCSS("overflow-wrap", "break-word");
      const boxes = await page.evaluate(() => {
        const owner = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-diagnostic-error-pre"]',
        );
        const pre = owner?.querySelector<HTMLElement>(":scope > li > pre");
        if (!owner || !pre) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          pre: pre.getBoundingClientRect().toJSON(),
        };
      });
      expect(boxes).not.toBeNull();
      expect(boxes!.pre.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.pre.right).toBeLessThanOrEqual(boxes!.owner.right + 1);
      expect(boxes!.pre.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      await expect(owner).toHaveScreenshot(`stylex-site-diagnostic-error-pre-${viewport.name}.png`);
    });
  }

  test("does not own the no-error state", async ({ page }) => {
    await mockSiteAdminSession(page);
    await page.route("**/api/v1/site/diagnostics", async (route) => {
      await route.fulfill({ contentType: "application/json", json: { errorCount: 0, errors: [] } });
    });
    await page.goto(`${basePath}/sites/diagnostic`);

    await expect(page.locator('[data-stylex-owner="site-diagnostic-error-pre"]')).toHaveCount(0);
    await expect(page.getByText("No errors were found")).toBeVisible();
  });
});
