import { expect, test, type Page } from "../wtr-compat.ts";

test("empty project commit history preserves the legacy empty-cell output", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "en-US" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["en-US"] });
  });
  await mockEmptyHistory(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });

  const table = page.locator('[data-owner="project-commits-table"]');
  const emptyCell = page.locator('[data-owner="project-commits-empty-warning"]');
  await expect(table).toBeVisible();
  await expect(emptyCell).toHaveCount(1);
  await expect(emptyCell).toBeVisible();
  await expect(emptyCell).toHaveText("No commit exists");
  await expect(emptyCell).toHaveCSS("font-size", "16px");
  await expect(emptyCell).toHaveCSS("text-align", "center");
  await expect(emptyCell).toHaveCSS("background-color", "rgb(212, 212, 212)");

  const structure = await emptyCell.evaluate((element) => {
    const row = element.parentElement;
    const tableBody = row?.parentElement;
    return {
      cellTag: element.tagName,
      colSpan: (element as HTMLTableCellElement).colSpan,
      rowTag: row?.tagName,
      bodyTag: tableBody?.tagName,
      rowCount: tableBody?.children.length,
      directCellCount: row?.children.length,
      text: element.textContent,
      pluginAttributes: Array.from(element.attributes)
        .map(({ name }) => name)
        .filter((name) =>
          /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u.test(
            name,
          ),
        ),
    };
  });
  expect(structure).toEqual({
    cellTag: "TD",
    colSpan: 5,
    rowTag: "TR",
    bodyTag: "TBODY",
    rowCount: 1,
    directCellCount: 1,
    text: "No commit exists",
    pluginAttributes: [],
  });

  await assertEmptyHistoryGeometry(page);
  await page.screenshot({ animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(emptyCell).toBeVisible();
  await assertEmptyHistoryGeometry(page);
  await page.screenshot({ animations: "disabled" });
});

async function assertEmptyHistoryGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const readRect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return {
      pageWrap: readRect(".page-wrap-outer"),
      tabs: readRect('[data-owner="project-commits-tabs"]'),
      history: readRect("#history"),
      table: readRect('[data-owner="project-commits-table"]'),
      cell: readRect('[data-owner="project-commits-empty-warning"]'),
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });

  expect(geometry.history.left).toBeGreaterThanOrEqual(geometry.pageWrap.left - 0.5);
  expect(geometry.history.right).toBeLessThanOrEqual(geometry.pageWrap.right + 0.5);
  expect(geometry.table.left).toBeGreaterThanOrEqual(geometry.history.left - 0.5);
  expect(geometry.table.right).toBeLessThanOrEqual(geometry.history.right + 0.5);
  expect(geometry.cell.left).toBeGreaterThanOrEqual(geometry.history.left - 0.5);
  expect(geometry.cell.right).toBeLessThanOrEqual(geometry.history.right + 0.5);
  expect(geometry.tabs.bottom).toBeLessThanOrEqual(geometry.history.top + 0.5);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
}

async function mockEmptyHistory(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        defaultBranch: "main",
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/commits**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        commits: [],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "admin",
        page: 0,
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
}
