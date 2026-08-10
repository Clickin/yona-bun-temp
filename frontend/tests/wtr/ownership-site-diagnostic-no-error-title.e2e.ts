import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/sites/diagnostic.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSiteAdminSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  });
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { versionToUpdate: null },
    });
  });
}

async function openNoErrorDiagnostic(page: Page) {
  await mockSiteAdminSession(page);
  await page.route("**/api/v1/site/diagnostics", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { errorCount: 0, errors: [] } });
  });
  await page.goto(`${basePath}/sites/diagnostic`);
  const owner = page.locator('[data-owner="site-diagnostic-no-error-title"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style site diagnostic no-error title", () => {
  test("owns only the legacy no-error title strip through global theme values", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('"site-diagnostic-no-error-title"');
    expect(route).not.toContain('className="pull-left"');
    expect(route).not.toContain('className="title_area"');
  });

  test("preserves the legacy diagnostics heading and no-error paragraph order", async ({
    page,
  }) => {
    const owner = await openNoErrorDiagnostic(page);
    await expect(owner.locator(":scope > h2")).toHaveText("Diagnostics");
    await expect(owner.locator("+ p")).toHaveText("No errors were found");
    expect(
      await page
        .locator('[data-owner="site-diagnostic-setting-content-column"] > *')
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "P"]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`matches ${viewport.name} title-strip geometry and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openNoErrorDiagnostic(page);
      const heading = owner.locator("h2");

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("float", "left");
      const boxes = await page.evaluate(() => {
        const owner = document.querySelector<HTMLElement>(
          '[data-owner="site-diagnostic-no-error-title"]',
        );
        const heading = owner?.querySelector<HTMLElement>("h2");
        const content = owner?.parentElement;
        if (!owner || !heading || !content) return null;
        return {
          content: content.getBoundingClientRect().toJSON(),
          heading: heading.getBoundingClientRect().toJSON(),
          owner: owner.getBoundingClientRect().toJSON(),
        };
      });
      expect(boxes).not.toBeNull();
      expect(boxes!.owner.left).toBeGreaterThanOrEqual(boxes!.content.left);
      expect(boxes!.owner.right).toBeLessThanOrEqual(boxes!.content.right + 1);
      expect(boxes!.heading.top).toBeGreaterThanOrEqual(boxes!.owner.top);
      expect(boxes!.heading.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
    });
  }

  test("excludes the title strip when diagnostics have errors", async ({ page }) => {
    await mockSiteAdminSession(page);
    await page.route("**/api/v1/site/diagnostics", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { errorCount: 1, errors: ["database probe failed"] },
      });
    });
    await page.goto(`${basePath}/sites/diagnostic`);

    await expect(page.locator('[data-owner="site-diagnostic-no-error-title"]')).toHaveCount(0);
    await expect(page.locator('[data-owner="site-diagnostic-error-title"] > h2')).toHaveText(
      "Diagnostics",
    );
    await expect(page.locator("pre")).toHaveText("database probe failed");
  });
});
