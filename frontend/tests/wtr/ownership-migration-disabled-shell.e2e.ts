import { expect, test, type Page, readFile } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/migration.tsx", import.meta.url);
const routeThemeSource = new URL("../src/app.css", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/migration/home.scala.html",
  import.meta.url,
);
const legacyMigrationLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_migration.less",
  import.meta.url,
);
const legacyYobiUiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const legacyBootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);
const legacyYobiconSource = new URL(
  "../../yona-original/public/stylesheets/yobicon/style.css",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function openMigration(page: Page) {
  await page.goto(`${basePath}/migration`);
  const owner = page.locator('[data-owner="migration-disabled-shell"]');
  await expect(owner).toBeVisible();
  await expect(page.locator('[data-page-owner="migration-page"]')).toBeVisible();
  await expect(owner.locator('[data-owner="migration-layout"]')).toBeVisible();
  await expect(owner.locator('[data-owner="migration-notice"]')).toBeVisible();
  return owner;
}

test.describe("Style migration disabled shell", () => {
  test("owns the frozen migration consumer cascade without fallback CSS", async () => {
    const [route, _routeTheme, theme, _legacy, migrationLess, yobiUiLess, bootstrap, _yobicon] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        readFile(routeThemeSource, "utf8"),
        readFile(themeSource, "utf8"),
        readFile(legacySource, "utf8"),
        readFile(legacyMigrationLessSource, "utf8"),
        readFile(legacyYobiUiLessSource, "utf8"),
        readFile(legacyBootstrapSource, "utf8"),
        readFile(legacyYobiconSource, "utf8"),
      ]);
    expect(route).toContain('data-owner="migration-disabled-shell"');

    expect(route).toContain('data-owner="migration-progress-bar"');

    expect(theme).not.toMatch(/^\s+migrationDisabled[A-Z]/m);

    expect(migrationLess).toMatch(/\.destination-project\s*\{\s*margin-left:\s*0\s*!important;/u);
    expect(migrationLess).toMatch(
      /\.btn-group\s*\{\s*width:\s*300px;\s*\}[\s\S]*?\.btn\s*\{[\s\S]*?width:\s*100%;/u,
    );
    expect(migrationLess).toMatch(
      /\.caution\s*\{[\s\S]*?border-radius:\s*3px;[\s\S]*?padding:\s*5px;/u,
    );
    expect(yobiUiLess).toMatch(/\.btn\.disabled,\s*\.btn\[disabled\]\s*\{\s*opacity:\s*0\.35;/u);
    expect(bootstrap).toMatch(
      /\.table th,\s*\.table td\s*\{\s*padding:\s*8px;\s*line-height:\s*20px;/u,
    );
    expect(bootstrap).toMatch(/\.progress\s*\{\s*height:\s*20px;[\s\S]*?overflow:\s*hidden;/u);
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
    const progressBar = owner.locator('[data-owner="migration-progress-bar"]');
    await expect(progressBar).toHaveCount(1);
    await expect(progressBar).not.toHaveAttribute("style", /width/);
    await expect(progressBar).toHaveCSS("width", "0px");
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
      const searchInput = owner.locator(".source-project input.search-query");
      const sourceList = owner.locator(".left-project-list");
      const destinationColumn = owner.locator(".destination-project");
      const destinationList = owner.locator(".destination-project-list");
      const progressShell = owner.locator(".status > .progress");
      const progressBar = owner.locator('[data-owner="migration-progress-bar"]');
      const statusTable = owner.locator(".status > table.table");
      const firstHeaderCell = statusTable.locator("thead th").first();
      const firstDataCell = statusTable.locator("tbody td").first();
      const buttonGroup = statusTable.locator(".btn-group").first();
      const disabledButton = buttonGroup.locator("button.btn-danger");
      const caution = statusTable.locator(".caution");
      const arrowIcon = owner.locator(".arrow .yobicon-arrow-right-alt");

      await expect(board).toHaveCSS("background-color", "rgb(51, 51, 51)");
      await expect(board).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(board).toHaveCSS("padding-left", "40px");
      await expect(board).toHaveCSS("padding-top", "19px");
      await expect(owner).toHaveCSS("line-height", "20px");
      await expect(sourceHeader).toHaveCSS("background-color", "rgb(227, 107, 35)");
      await expect(sourceHeader).toHaveCSS("font-size", "16px");
      await expect(searchInput).toHaveCSS("background-color", "rgb(238, 238, 238)");
      await expect(searchInput).toHaveCSS("border-radius", "2px");
      await expect(searchInput).toHaveCSS("width", "206px");
      await expect(destinationColumn).toHaveCSS("margin-left", "0px");
      const sourceContentHeight = await sourceList.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).height),
      );
      expect(sourceContentHeight).toBeCloseTo(viewport.height * 0.6, 1);
      await expect(destinationList).toHaveCSS("border-left-width", "0px");
      await expect(progressShell).toHaveCSS("height", "20px");
      await expect(progressShell).toHaveCSS("margin-bottom", "0px");
      await expect(progressShell).toHaveCSS("border-radius", "0px");
      await expect(statusTable).toHaveCSS("margin-bottom", "20px");
      await expect(firstHeaderCell).toHaveCSS("border-top-width", "0px");
      await expect(firstDataCell).toHaveCSS("border-top-width", "1px");
      await expect(firstDataCell).toHaveCSS("padding", "8px");
      await expect(firstDataCell).toHaveCSS("line-height", "20px");
      await expect(buttonGroup).toHaveCSS("width", "300px");
      await expect(disabledButton).toHaveCSS("background-color", "rgb(189, 54, 47)");
      await expect(disabledButton).toHaveCSS("border-radius", "4px");
      await expect(disabledButton).toHaveCSS("font-size", "12px");
      await expect(disabledButton).toHaveCSS("opacity", "0.35");
      await expect(caution).toHaveCSS("background-color", "rgb(238, 238, 238)");
      await expect(caution).toHaveCSS("border-radius", "3px");
      await expect(caution).toHaveCSS("padding", "5px");
      await expect(arrowIcon).toHaveCSS("font-family", "yobicon");
      const [ownerBox, sourceBox, destinationBox, progressBox] = await Promise.all([
        owner.boundingBox(),
        sourceList.boundingBox(),
        destinationList.boundingBox(),
        progressBar.boundingBox(),
      ]);
      const buttonBox = await disabledButton.boundingBox();
      expect(ownerBox).not.toBeNull();
      expect(sourceBox).not.toBeNull();
      expect(destinationBox).not.toBeNull();
      expect(progressBox).not.toBeNull();
      expect(buttonBox).not.toBeNull();
      expect(buttonBox).toMatchObject({ height: 30, width: 300 });
      expect(sourceBox!.height).toBeGreaterThanOrEqual(sourceContentHeight);
      expect(sourceBox!.height).toBeLessThanOrEqual(sourceContentHeight + 2);
      expect(sourceBox!.width).toBeGreaterThan(0);
      expect(destinationBox!.width).toBeGreaterThan(0);
      expect(sourceBox!.x).toBeGreaterThanOrEqual(ownerBox!.x);
      expect(destinationBox!.x + destinationBox!.width).toBeLessThanOrEqual(
        ownerBox!.x + ownerBox!.width,
      );
      expect(progressBox!.x).toBeGreaterThanOrEqual(ownerBox!.x);
      expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(
        ownerBox!.x + ownerBox!.width,
      );
      // Legacy Bootstrap span columns intentionally exceed a 390px viewport; the owner
      // containment checks above preserve the migration shell's original geometry.
    });
  }

  test("keeps the global shell outside the route-owned migration primitives", async ({ page }) => {
    await openMigration(page);
    await expect(page.locator('[data-owner="global-gnb-outer"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="site-footer"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="migration-disabled-shell"] .table')).toHaveCount(1);
    await expect(page.locator('[data-owner="migration-disabled-shell"] .btn-danger')).toHaveCount(
      3,
    );
  });
});
