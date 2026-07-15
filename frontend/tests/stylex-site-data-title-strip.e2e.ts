import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/sites/data.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
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
  const owner = page.locator('[data-stylex-owner="site-data-title-strip"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site data title strip", () => {
  test("reuses global frozen title-strip values", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-data-title-strip"');
    expect(route).toContain('data-stylex-owner="site-data-title-heading"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("globalColors.siteDiagnosticNoErrorTitleBorder");
    expect(theme).toContain("siteDiagnosticNoErrorHeadingText");
    expect([...route.matchAll(/data-stylex-owner="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "site-data-title-strip",
      "site-data-title-heading",
      "site-data-warning-surface",
      "site-data-warning-item",
      "site-data-warning-item",
      "site-data-warning-item",
      "site-data-export-action",
    ]);
  });

  test("owns generated title classes without legacy title fallbacks", async ({ page }) => {
    const owner = await openData(page);
    const classes = await owner.evaluate((titleArea) => {
      const title = titleArea.querySelector("h2");
      return {
        titleArea: titleArea.className.split(/\s+/).filter(Boolean),
        title: title?.className.split(/\s+/).filter(Boolean) ?? [],
      };
    });
    expect(classes.titleArea).not.toContain("title_area");
    expect(classes.titleArea.length).toBeGreaterThan(1);
    expect(classes.title).not.toContain("pull-left");
    expect(classes.title.length).toBeGreaterThan(1);
  });
  test("keeps heading before warning surface", async ({ page }) => {
    const owner = await openData(page);
    await expect(
      owner.locator(':scope > h2[data-stylex-owner="site-data-title-heading"]'),
    ).toHaveText("Data");
    expect(
      await page
        .locator(".site-setting-wrap .span10 > *")
        .evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.tagName)),
    ).toEqual(["DIV", "DIV", "H3"]);
  });
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`matches ${viewport.name} title geometry and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openData(page);
      const title = owner.locator("h2");
      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(title).toHaveCSS("font-size", "19.5px");
      await expect(title).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(title).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate(() => {
        const owner = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-data-title-strip"]',
        );
        const title = owner?.querySelector<HTMLElement>("h2");
        if (!owner || !title) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          title: title.getBoundingClientRect().toJSON(),
        };
      });
      expect(boxes).not.toBeNull();
      expect(boxes!.title.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.title.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      await expect(owner).toHaveScreenshot(`stylex-site-data-title-strip-${viewport.name}.png`);
    });
  }
  test("keeps warning and export/import controls outside the title owner", async ({ page }) => {
    const owner = await openData(page);
    await expect(owner.locator(".notice, a, form, input")).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="site-data-warning-surface"]')).toHaveCount(1);
    await expect(page.locator(".span10 > form")).toHaveCount(1);
  });
});
