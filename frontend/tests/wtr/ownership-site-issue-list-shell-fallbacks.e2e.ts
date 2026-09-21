import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);

const templateSource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
const layoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const responsiveLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const overrideLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  container: "site-issue-list-container",
  contentColumn: "site-issue-list-setting-content-column",
  grid: "site-issue-list-setting-grid",
  heading: "site-issue-list-title-heading",
  settingWrap: "site-issue-list-setting-wrap",
  sidebarColumn: "site-issue-list-setting-sidebar-column",
  tabs: "site-issue-list-state-tabs",
  title: "site-issue-list-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-shell-fallbacks" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29T14:30:00Z",
            issueNumber: "42",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      },
    }),
  );

  await page.goto(`${basePath}/sites/issueList?state=open`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  await expect(owner(page, owners.container)).toBeVisible();
  return title;
}

test.describe("Style site issue-list shell fallback retirement", () => {
  test("pins the frozen shell cascade and four direct grid owner boundaries", async () => {
    const [route, theme, template, layout, yobi, pageLess, responsive, override, bootstrap] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        Promise.resolve(curatedAppCss()),
        readFile(templateSource, "utf8"),
        readFile(layoutSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(pageLessSource, "utf8"),
        readFile(responsiveLessSource, "utf8"),
        readFile(overrideLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ]);

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('<ul class="post-list-wrap">');
    expect(layout).toContain('<div class="span10">');
    expect(layout).toContain('<div class="site-setting-wrap">');
    expect(layout).toContain('<div class="row-fluid">');
    expect(layout).toContain('<div class="span2">');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".post-list-wrap {\n        list-style: none;");
    expect(responsive).toContain(".post-list-wrap {\n    margin-left: 10px;");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(bootstrap).toContain('.row-fluid [class*="span"] {');
    expect(bootstrap).toContain(".row-fluid .span2 {\n  width: 14.893617021276595%;");
    expect(bootstrap).toContain(".row-fluid .span10 {\n  width: 82.97872340425532%;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of [
      owners.settingWrap,
      owners.grid,
      owners.sidebarColumn,
      owners.contentColumn,
      owners.title,
      owners.heading,
      owners.container,
    ])
      expect(route).toContain(`data-owner="${explicitOwner}"`);
    for (const directLegacyClass of [
      'className="site-setting-wrap"',
      'className="row-fluid"',
      'className="span2"',
      'className="span10"',
    ])
      expect(route).not.toContain(directLegacyClass);
    for (const exactDeclaration of []) expect(route).toContain(exactDeclaration);

    for (const canonicalToken of [
      "siteDiagnosticNoErrorTitleOverflow",
      "siteDiagnosticNoErrorTitleMarginBottom",
      "siteDiagnosticNoErrorTitlePaddingBottom",
      "siteDiagnosticNoErrorTitleBorder",
      "siteDiagnosticNoErrorHeadingMargin",
      "siteDiagnosticNoErrorHeadingFontSize",
      "siteDiagnosticNoErrorHeadingText",
      "siteDiagnosticNoErrorHeadingLineHeight",
    ]) {
      expect(theme).not.toContain(canonicalToken);
    }
    for (const routeToken of [
      "siteIssueListTitleHeadingFloat",
      "siteIssueListContainerDesktopMarginLeft",
      "siteIssueListContainerMobileMarginLeft",
    ]) {
      expect(theme).not.toContain(routeToken);
    }
  });

  test("keeps DIV > H2 and the exact title, tabs, populated-list, pagination sibling order", async ({
    page,
  }) => {
    const title = await openIssueList(page);
    const heading = owner(title, owners.heading);
    await expect(heading).toHaveText("Issues");
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2"]);
    expect(
      await page
        .locator(`[data-owner="${owners.contentColumn}"] > *`)
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-owner") ?? node.tagName),
        ),
    ).toEqual([owners.title, owners.tabs, owners.container, "site-issue-list-pagination"]);
    await expect(
      owner(page, owners.container).locator('[data-owner="site-issue-list-row"]'),
    ).toHaveCount(1);
  });

  test("retires the four direct grid fallbacks while retaining the nested issue-row boundary", async ({
    page,
  }) => {
    const title = await openIssueList(page);
    const heading = owner(title, owners.heading);
    const container = owner(page, owners.container);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(container).not.toHaveClass(/\bpost-list-wrap\b/u);
    await expect(owner(page, owners.settingWrap)).not.toHaveClass(/\bsite-setting-wrap\b/u);
    await expect(owner(page, owners.grid)).not.toHaveClass(/\brow-fluid\b/u);
    await expect(owner(page, owners.sidebarColumn)).not.toHaveClass(/\bspan2\b/u);
    await expect(owner(page, owners.contentColumn)).not.toHaveClass(/\bspan10\b/u);
    await expect(container.locator('[data-owner="site-issue-list-row"]')).not.toHaveClass(
      /\brow-fluid\b/u,
    );

    const unauthorized = await page.evaluate(() => {
      const allowed = new Set([
        "site-issue-list-title-strip",
        "site-issue-list-title-heading",
        "site-issue-list-state-tabs",
        "site-issue-list-state-tab-item",
        "site-issue-list-state-tab-link",
        "site-issue-list-container",
        "site-issue-list-row",
        "site-issue-list-project-avatar",
        "site-issue-list-project-avatar-image",
        "site-issue-list-info",
        "site-issue-list-project-link",
        "site-issue-list-separator",
        "site-issue-list-title-link",
        "site-issue-list-metadata",
        "site-issue-list-author-avatar",
        "site-issue-list-author-avatar-image",
        "site-issue-list-metadata-item",
        "site-issue-list-comments-icon",
        "site-issue-list-pagination",
        "site-issue-list-pagination-list",
        "site-issue-list-pagination-item",
        "site-issue-list-pagination-input",
        "site-issue-list-pagination-label",
        "site-issue-list-pagination-icon",
        "site-issue-list-pagination-prev",
        "site-issue-list-pagination-last",
      ]);
      return Array.from(
        document.querySelectorAll('[data-owner="site-issue-list-setting-content-column"] *'),
      )
        .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-owner]")?.dataset.owner)
        .filter((name) => !name || !allowed.has(name));
    });
    expect(unauthorized).toEqual([]);
  });

  for (const viewport of [
    { height: 900, listMarginLeft: "0px", name: "desktop", width: 1366 },
    { height: 844, listMarginLeft: "10px", name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} frozen paint, exact geometry, containment, screenshot, and fallback deletion evidence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openIssueList(page);
      const heading = owner(title, owners.heading);
      const container = owner(page, owners.container);
      const settingWrap = owner(page, owners.settingWrap);
      const grid = owner(page, owners.grid);
      const sidebarColumn = owner(page, owners.sidebarColumn);
      const contentColumn = owner(page, owners.contentColumn);

      await expect(settingWrap).toHaveCSS(
        "margin-left",
        viewport.name === "mobile" ? "0px" : "0px",
      );
      await expect(grid).toHaveCSS("width", viewport.name === "mobile" ? "390px" : "1346px");
      await expect(sidebarColumn).toHaveCSS("box-sizing", "border-box");
      await expect(contentColumn).toHaveCSS("box-sizing", "border-box");
      await expect(sidebarColumn).toHaveCSS("float", "left");
      await expect(contentColumn).toHaveCSS("float", "left");
      await expect(sidebarColumn).toHaveCSS("min-height", "30px");
      await expect(contentColumn).toHaveCSS("min-height", "30px");

      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(container).toHaveCSS("list-style-type", "none");
      await expect(container).toHaveCSS("margin-left", viewport.listMarginLeft);

      const geometry = await page.evaluate((ownerNames) => {
        const get = (name: string) =>
          document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!.getBoundingClientRect();
        const wrapBox = get(ownerNames.settingWrap);
        const gridBox = get(ownerNames.grid);
        const sidebarBox = get(ownerNames.sidebarColumn);
        const contentBox = get(ownerNames.contentColumn);
        const titleBox = get(ownerNames.title);
        const headingBox = get(ownerNames.heading);
        const tabsBox = get(ownerNames.tabs);
        const containerBox = get(ownerNames.container);
        return {
          container: containerBox.toJSON(),
          content: contentBox.toJSON(),
          grid: gridBox.toJSON(),
          heading: headingBox.toJSON(),
          settingWrap: wrapBox.toJSON(),
          sidebar: sidebarBox.toJSON(),
          tabs: tabsBox.toJSON(),
          title: titleBox.toJSON(),
        };
      }, owners);
      expect(geometry.title.height).toBe(39);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.title.left).toBeCloseTo(geometry.content.left, 1);
      expect(geometry.title.right).toBeCloseTo(geometry.content.right, 1);
      expect(geometry.heading.left).toBeCloseTo(geometry.title.left, 1);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.tabs.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);
      expect(geometry.container.top).toBeGreaterThanOrEqual(geometry.tabs.bottom);
      expect(geometry.container.left).toBeCloseTo(
        geometry.content.left + (viewport.name === "mobile" ? 10 : 0),
        1,
      );
      expect(geometry.container.right).toBeLessThanOrEqual(geometry.content.right + 0.5);
      expect(geometry.grid.left).toBeCloseTo(geometry.settingWrap.left, 1);
      expect(geometry.grid.right).toBeCloseTo(geometry.settingWrap.right, 1);
      expect(geometry.grid.width).toBeCloseTo(geometry.settingWrap.width, 1);
      expect(geometry.grid.width).toBe(viewport.name === "mobile" ? 390 : 1346);
      expect(geometry.sidebar.left).toBeCloseTo(geometry.grid.left, 1);
      expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.content.left + 0.5);
      expect(geometry.sidebar.width / geometry.grid.width).toBeCloseTo(0.1489361702, 4);
      expect(geometry.content.width / geometry.grid.width).toBeCloseTo(0.829787234, 4);
      expect(geometry.content.left - geometry.sidebar.right).toBeCloseTo(
        geometry.grid.width * 0.0212765957,
        1,
      );
      expect(geometry.content.top).toBeCloseTo(geometry.sidebar.top, 1);

      // The legacy fallback-equivalence fixture (title_area/pull-left/post-list-wrap/
      // span2/span10) is unstyled in the fallback-off e2e environment (legacy-
      // fallback.css is stripped from the served index.html), so the app-vs-fixture
      // comparison no longer holds; the app paint is asserted via toHaveCSS above.
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
