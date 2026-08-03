import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/sites/data.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-data.stylex.ts", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function openData(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isSiteAdmin: true },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.goto(`${basePath}/sites/data`);
  const owner = page.locator('[data-stylex-owner="site-data-warning-surface"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site data warning surface", () => {
  test("uses global theme ownership for the legacy warning surface", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-data-warning-surface"');
    expect(route.match(/data-stylex-owner="site-data-warning-item"/gu)).toHaveLength(3);
    expect(route).toContain("styles.warningSurface");
    expect(route).toContain("siteDataColors.warningText");
    expect(route).toContain('warningSurface: { display: "inline-block" }');
    expect(theme).toContain("warningText");
    expect(route).not.toContain("globalColors.");
  });

  test("keeps the three legacy warnings in order before export", async ({ page }) => {
    const owner = await openData(page);
    await expect(
      owner.locator(':scope > ul > li[data-stylex-owner="site-data-warning-item"]'),
    ).toHaveText([
      "Before importing or exporting data, you should block other user's access and only allow the site admin.",
      "After clicking the export button please wait until the file download finishes.",
      "Please backup database before import data, in some cases you can lose existing data.",
    ]);
    expect(
      await page
        .locator('[data-stylex-owner="site-data-setting-content-column"] > *')
        .evaluateAll((nodes) => nodes.slice(1, 3).map((node) => node.tagName)),
    ).toEqual(["DIV", "H3"]);
  });

  test("composes generated classes with legacy warning fallbacks", async ({ page }) => {
    const owner = await openData(page);
    const classes = await owner.evaluate((warningSurface) => ({
      warningSurface: warningSurface.className.split(/\s+/).filter(Boolean),
      notices: [...warningSurface.querySelectorAll("li")].map((notice) =>
        notice.className.split(/\s+/).filter(Boolean),
      ),
    }));
    expect(classes.warningSurface).toContain("cu-desc");
    expect(classes.warningSurface.length).toBeGreaterThan(1);
    expect(classes.notices).toHaveLength(3);
    for (const notice of classes.notices) {
      expect(notice).not.toContain("notice");
      expect(notice.length).toBeGreaterThan(1);
    }
  });

  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`matches ${viewport.name} warning display, color, geometry, and paint`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const owner = await openData(page);
      const notices = owner.locator('[data-stylex-owner="site-data-warning-item"]');
      await expect(owner).toHaveCSS("display", "inline-block");
      await expect(notices.first()).toHaveCSS("color", "rgb(219, 58, 103)");
      await expect(notices).toHaveCount(3);
      const boxes = await page.evaluate(() => {
        const owner = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-data-warning-surface"]',
        );
        const first = owner?.querySelector<HTMLElement>(
          '[data-stylex-owner="site-data-warning-item"]',
        );
        if (!owner || !first) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          first: first.getBoundingClientRect().toJSON(),
        };
      });
      expect(boxes).not.toBeNull();
      expect(boxes!.first.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.first.right).toBeLessThanOrEqual(boxes!.owner.right);
    });
  }

  test("keeps export and import controls outside the owner", async ({ page }) => {
    const owner = await openData(page);
    await expect(owner.locator("a, form, input, h3")).toHaveCount(0);
    await expect(
      page.locator('[data-stylex-owner="site-data-setting-content-column"] > h3'),
    ).toHaveCount(2);
    await expect(
      page.locator('[data-stylex-owner="site-data-setting-content-column"] > form'),
    ).toHaveCount(1);
  });
});
