import {
  expect,
  test,
  type Page,
  type Route,
  mergedLegacyBlock,
  curatedAppCss,
} from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = curatedAppCss() + mergedLegacyBlock();
const legacyHistorySource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/code/history.scala.html", import.meta.url)),
  "utf8",
);
const legacyCommitMessageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/common/commitMsg.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const bootstrapSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const bootstrapResponsiveSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  ),
  "utf8",
);
const messagesSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);
const appCssSource = readFileSync(
  fileURLToPath(new URL("../src/app.css", import.meta.url)),
  "utf8",
);
const homeRouteSource = readFileSync(
  fileURLToPath(new URL("../src/routes/-home-route-screen.tsx", import.meta.url)),
  "utf8",
);

// RED -> GREEN intent: before the route-local Style owner exists, these source and browser
// assertions must fail; after the bounded migration they pin the legacy empty-cell output.
test("nested file history owns the legacy warning-none empty cell with Style", async ({ page }) => {
  expect(legacyHistorySource).toContain('<div id="history" class="commit-wrap">');
  expect(legacyHistorySource).toContain(
    '<table class="code-table commits@if(path != null){ mt10}">',
  );
  expect(legacyHistorySource).toContain(
    '<tr><td colspan="5" class="warning-none">@Messages("code.nocommits")</td></tr>',
  );
  expect(legacyCommitMessageSource).toContain('class="commitMsg short"');
  expect(legacyCommitMessageSource).toContain('class="commitMsg moreBtn"');
  expect(legacyCommitMessageSource).toContain('class="commitMsg desc');
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageSource).toContain(".commit-wrap {");
  expect(legacyPageSource).toContain(".code-table {");
  expect(legacyPageSource).toContain("width: 100%;");
  expect(legacyPageSource).toContain(
    ".warning-none {\n  font-size:16px;\n  text-align:center;\n  background-color: #d4d4d4;\n}",
  );
  for (const importedFile of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ]) {
    expect(legacyYobiSource).toContain(`@import "less/${importedFile}";`);
  }
  expect(bootstrapSource).toContain("table {");
  expect(bootstrapSource).toContain("border-collapse: collapse;");
  expect(bootstrapSource).toContain("max-width: 100%;");
  expect(bootstrapResponsiveSource).toContain("@media");
  expect(messagesSource).toMatch(/^code\.nocommits = No commit exists$/mu);

  expect(routeSource).toContain('data-owner="commit-file-empty-warning"');

  expect(routeSource).not.toContain('className="warning-none"');

  expect(homeRouteSource).toContain('<div className="warning-none">');
  expect(appCssSource).toContain(
    "  .warning-none {\n    font-size: 16px;\n    text-align: center;\n    background-color: #d4d4d4;\n  }",
  );

  const historyRequests: string[] = [];
  await mockEmptyFileHistory(page, historyRequests);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${basePath}/admin/sample/commits/main/src/app.ts`, {
      waitUntil: "domcontentloaded",
    });

    const table = page.locator('[data-owner="commit-file-history-table"]');
    const emptyCell = page.locator('[data-owner="commit-file-empty-warning"]');
    await expect(table).toBeVisible();
    await expect(table).toHaveClass(/\bcode-table\b/u);
    await expect(table).toHaveClass(/\bcommits\b/u);
    await expect(table).toHaveClass(/\bmt10\b/u);
    await expect(table).toHaveCSS("margin-top", "10px");
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell).toHaveText("No commit exists");
    await expect(emptyCell).toHaveCSS("font-size", "16px");
    await expect(emptyCell).toHaveCSS("text-align", "center");
    await expect(emptyCell).toHaveCSS("background-color", "rgb(212, 212, 212)");
    await expect(emptyCell).not.toHaveClass(/\bwarning-none\b/u);
    await expect(page.locator("#breadcrumbs a")).toHaveText(["sample", "src", "app.ts"]);
    await expect(page.locator("#history .thead tr td")).toHaveCount(5);
    await expect(page.locator("#history .tbody tr")).toHaveCount(1);
    await expect(page.locator("#history .tbody tr td")).toHaveCount(1);
    await expect(emptyCell).toHaveAttribute("colspan", "5");
    await expect(page.locator(".actrow a")).toHaveCount(0);
    await expect(
      page.locator(
        "#history [data-toggle], #history [data-placement], #history [data-url], #history [data-action], #history [pjax-container]",
      ),
    ).toHaveCount(0);

    const structure = await emptyCell.evaluate((element) => {
      const td = element as HTMLTableCellElement;
      const tr = td.parentElement;
      const tbody = tr?.parentElement;
      const tableElement = tbody?.parentElement;
      const history = tableElement?.parentElement;
      const pageWrap = history?.parentElement?.parentElement?.parentElement;
      const cellBox = td.getBoundingClientRect();
      const tableBox = tableElement?.getBoundingClientRect();
      const historyBox = history?.getBoundingClientRect();
      if (!tr || !tbody || !tableElement || !history || !pageWrap || !tableBox || !historyBox) {
        throw new Error("legacy empty history table structure is incomplete");
      }
      return {
        cellBackground: getComputedStyle(td).backgroundColor,
        cellFontSize: getComputedStyle(td).fontSize,
        cellTextAlign: getComputedStyle(td).textAlign,
        cellTag: td.tagName,
        cellWidth: cellBox.width,
        colSpan: td.colSpan,
        documentScrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        historyRight: historyBox.right,
        historyLeft: historyBox.left,
        tableRight: tableBox.right,
        tableLeft: tableBox.left,
        tableTag: tableElement.tagName,
        trTag: tr.tagName,
        tbodyTag: tbody.tagName,
        viewportWidth: window.innerWidth,
      };
    });
    expect(structure).toMatchObject({
      cellBackground: "rgb(212, 212, 212)",
      cellFontSize: "16px",
      cellTextAlign: "center",
      cellTag: "TD",
      colSpan: 5,
      tableTag: "TABLE",
      trTag: "TR",
      tbodyTag: "TBODY",
    });
    expect(structure.cellWidth).toBeGreaterThan(0);
    expect(structure.tableLeft).toBeGreaterThanOrEqual(structure.historyLeft - 1);
    expect(structure.tableRight).toBeLessThanOrEqual(structure.historyRight + 1);
    expect(structure.documentScrollWidth).toBeLessThanOrEqual(structure.viewportWidth + 1);
    expect(historyRequests).toContain("branch=main&path=src%2Fapp.ts");

    const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  }
});

async function mockEmptyFileHistory(page: Page, historyRequests: string[]) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/commits**", (route: Route) => {
    const url = new URL(route.request().url());
    historyRequests.push(url.searchParams.toString());
    return route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [
          { name: "src", path: "src" },
          { name: "app.ts", path: "src/app.ts" },
        ],
        commits: [],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "admin",
        page: 0,
        path: "src/app.ts",
        projectName: "sample",
        selectedBranch: "main",
      },
    });
  });
}
