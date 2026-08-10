import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/sites/data.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
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
  const owner = page.locator('[data-owner="site-data-title-strip"]');
  await expect(owner).toBeVisible();
  await expect(page.locator('[data-owner="site-data-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-data-content"]')).toBeVisible();
  return owner;
}

test.describe("Style site data title strip", () => {
  test("reuses global frozen title-strip values", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-owner="site-data-title-strip"');
    expect(route).toContain('data-owner="site-data-title-heading"');

    expect([...route.matchAll(/data-owner="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "site-data-breadcrumb-outer",
      "site-data-breadcrumb-inner",
      "site-data-breadcrumb-heading",
      "site-data-page",
      "site-data-content",
      "site-data-setting-grid",
      "site-data-sidebar-column",
      "site-data-setting-content-column",
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
    expect(classes.title).not.toContain("pull-left");
  });
  test("keeps heading before warning surface", async ({ page }) => {
    const owner = await openData(page);
    await expect(owner.locator(':scope > h2[data-owner="site-data-title-heading"]')).toHaveText(
      "Data",
    );
    expect(
      await page
        .locator('[data-owner="site-data-setting-content-column"] > *')
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
        const owner = document.querySelector<HTMLElement>('[data-owner="site-data-title-strip"]');
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
    });
  }
  test("keeps warning and export/import controls outside the title owner", async ({ page }) => {
    const owner = await openData(page);
    await expect(owner.locator(".notice, a, form, input")).toHaveCount(0);
    await expect(page.locator('[data-owner="site-data-warning-surface"]')).toHaveCount(1);
    await expect(
      page.locator('[data-owner="site-data-setting-content-column"] > form'),
    ).toHaveCount(1);
  });
});
