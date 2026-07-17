import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/migration.tsx", import.meta.url);
const routeThemeSource = new URL("../src/routes/-migration.stylex.ts", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function openMigration(page: Page) {
  await page.goto(`${basePath}/migration`);
  const owner = page.locator('[data-stylex-owner="migration-disabled-shell"]');
  await expect(owner).toBeVisible();
  await expect(page.locator('[data-stylex-page-owner="migration-page"]')).toBeVisible();
  await expect(owner.locator('[data-stylex-owner="migration-layout"]')).toBeVisible();
  await expect(owner.locator('[data-stylex-owner="migration-notice"]')).toBeVisible();
  return owner;
}

test.describe("StyleX migration disabled shell", () => {
  test("uses route paint theme ownership while retaining shared migration fallbacks", async () => {
    const [route, routeTheme, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="migration-disabled-shell"');
    expect(route).toContain("styles.projectList");
    expect(route).toContain('style={{ width: "0%" }}');
    expect(route).toContain('fontSize: "30px"');
    expect(route).toContain("backgroundColor: migrationTheme.boardSurface");
    expect(routeTheme).toContain('boardSurface: "#333333"');
    expect(routeTheme).toContain('paneHeaderSurface: "#e36b23"');
    expect(theme).not.toMatch(/^\s+migrationDisabled[A-Z]/m);
  });

  test("keeps disabled copy, order, controls, and shared primitives", async ({ page }) => {
    const owner = await openMigration(page);
    await expect(owner.locator(".comeback-text")).toHaveText("Yona to Github");
    await expect(owner.locator("#system-msg .messages")).toHaveText(
      "Request forbidden or not allowed",
    );
    await expect(owner.locator(".project-name.warn")).toHaveText([
      "Source 프로젝트를 선택해 주세요",
      "Destination 프로젝트를 선택해 주세요",
    ]);
    const searchInputs = owner.locator("input.search-query");
    await expect(searchInputs).toHaveCount(2);
    expect(
      await searchInputs.evaluateAll((inputs) =>
        inputs.every((input) => (input as HTMLInputElement).disabled),
      ),
    ).toBe(true);
    await expect(owner.locator("button.btn-danger")).toHaveCount(3);
    await expect(owner.locator(".progress .bar")).toHaveAttribute("style", "width: 0%;");
    expect(
      await owner
        .locator(":scope > .header-pannel > *")
        .evaluateAll((nodes) => nodes.map((node) => node.className)),
    ).toEqual([
      expect.stringContaining("comeback-text pull-right"),
      expect.stringContaining("row title-text-bg"),
      "status",
      expect.stringContaining("row source-destination"),
    ]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`matches ${viewport.name} disabled shell geometry and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openMigration(page);
      const board = owner.locator("#system-msg");
      const sourceHeader = owner.locator(".source-project > .header");
      const sourceList = owner.locator(".left-project-list");
      const destinationList = owner.locator(".destination-project-list");

      await expect(board).toHaveCSS("background-color", "rgb(51, 51, 51)");
      await expect(board).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(sourceHeader).toHaveCSS("background-color", "rgb(227, 107, 35)");
      await expect(sourceHeader).toHaveCSS("font-size", "16px");
      const sourceContentHeight = await sourceList.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).height),
      );
      expect(sourceContentHeight).toBeCloseTo(viewport.height * 0.6, 1);
      await expect(destinationList).toHaveCSS("border-left-width", "0px");
      const [ownerBox, sourceBox, destinationBox] = await Promise.all([
        owner.boundingBox(),
        sourceList.boundingBox(),
        destinationList.boundingBox(),
      ]);
      expect(ownerBox).not.toBeNull();
      expect(sourceBox).not.toBeNull();
      expect(destinationBox).not.toBeNull();
      expect(sourceBox!.height).toBeGreaterThanOrEqual(sourceContentHeight);
      expect(sourceBox!.height).toBeLessThanOrEqual(sourceContentHeight + 2);
      expect(sourceBox!.width).toBeGreaterThan(0);
      expect(destinationBox!.width).toBeGreaterThan(0);
      expect(sourceBox!.x).toBeGreaterThanOrEqual(ownerBox!.x);
      expect(destinationBox!.x + destinationBox!.width).toBeLessThanOrEqual(
        ownerBox!.x + ownerBox!.width,
      );
      // Legacy Bootstrap span columns intentionally exceed a 390px viewport; the owner
      // containment checks above preserve the migration shell's original geometry.
      await expect(owner).toHaveScreenshot(`stylex-migration-disabled-shell-${viewport.name}.png`);
    });
  }

  test("keeps global shell and bootstrap status primitives outside this owner", async ({
    page,
  }) => {
    await openMigration(page);
    await expect(page.locator('[data-stylex-owner="global-gnb-outer"]')).toHaveCount(1);
    await expect(page.locator('[data-stylex-owner="site-footer"]')).toHaveCount(1);
    await expect(page.locator('[data-stylex-owner="migration-disabled-shell"] .table')).toHaveCount(
      1,
    );
    await expect(
      page.locator('[data-stylex-owner="migration-disabled-shell"] .btn-danger'),
    ).toHaveCount(3);
  });
});
