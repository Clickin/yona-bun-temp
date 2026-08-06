import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFileSync maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test, type Page } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url)),
  "utf8",
);
const STYLE_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-commits.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const LEGACY_HISTORY_SOURCE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/code/history.scala.html", import.meta.url)),
  "utf8",
);
const LEGACY_PAGE_LESS = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const LEGACY_MESSAGES = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);
const LEGACY_YOBI_LESS = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const LEGACY_BOOTSTRAP_CSS = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const APP_CSS = readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8");
const HOME_ROUTE_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/-home-route-screen.tsx", import.meta.url)),
  "utf8",
);

/*
 * RED -> GREEN intent:
 * before the route-local owner was added, this contract failed because the
 * empty cell had no owner marker and still emitted the shared warning-none
 * fallback class. The GREEN state keeps that fallback for HOME while this
 * route owns all three frozen declarations in StyleX.
 */
test("empty project commit history owns the legacy warning-none cell in StyleX", async ({
  page,
}) => {
  expect(LEGACY_HISTORY_SOURCE).toContain(
    '<tr><td colspan="5" class="warning-none">@Messages("code.nocommits")</td></tr>',
  );
  expect(LEGACY_PAGE_LESS).toContain(
    ".warning-none {\n  font-size:16px;\n  text-align:center;\n  background-color: #d4d4d4;\n}",
  );
  expect(LEGACY_MESSAGES).toContain("code.nocommits = No commit exists");
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(LEGACY_YOBI_LESS).toContain(`@import "${importPath}";`);
  }
  expect(LEGACY_BOOTSTRAP_CSS).toContain("table {");
  expect(LEGACY_BOOTSTRAP_CSS).toContain("border-collapse: collapse;");

  expect(ROUTE_SOURCE).toContain('data-stylex-owner="project-commits-empty-warning"');
  expect(ROUTE_SOURCE).toContain("styles.emptyWarning");
  expect(ROUTE_SOURCE).not.toContain('className="warning-none"');
  expect(STYLE_SOURCE).toContain("emptyWarning:");
  expect(STYLE_SOURCE).toContain('fontSize: "16px"');
  expect(STYLE_SOURCE).toContain('textAlign: "center"');
  expect(STYLE_SOURCE).toContain('backgroundColor: "#d4d4d4"');
  expect(APP_CSS).toContain(
    ".warning-none {\n    font-size: 16px;\n    text-align: center;\n    background-color: #d4d4d4;\n  }",
  );
  expect(HOME_ROUTE_SOURCE).toContain('className="warning-none"');

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "en-US" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["en-US"] });
  });
  await mockEmptyHistory(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });

  const table = page.locator('[data-stylex-owner="project-commits-table"]');
  const emptyCell = page.locator('[data-stylex-owner="project-commits-empty-warning"]');
  await expect(table).toBeVisible();
  await expect(emptyCell).toHaveCount(1);
  await expect(emptyCell).toBeVisible();
  await expect(emptyCell).not.toHaveClass(/\bwarning-none\b/u);
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
  const desktopScreenshot = await page.screenshot({ animations: "disabled" });
  expect(desktopScreenshot.byteLength).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(emptyCell).toBeVisible();
  await assertEmptyHistoryGeometry(page);
  const mobileScreenshot = await page.screenshot({ animations: "disabled" });
  expect(mobileScreenshot.byteLength).toBeGreaterThan(0);
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
      tabs: readRect('[data-stylex-owner="project-commits-tabs"]'),
      history: readRect("#history"),
      table: readRect('[data-stylex-owner="project-commits-table"]'),
      cell: readRect('[data-stylex-owner="project-commits-empty-warning"]'),
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
