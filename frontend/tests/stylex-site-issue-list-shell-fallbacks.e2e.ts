import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-issueList.stylex.ts", import.meta.url);
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

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

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
            createdTitle: "2026-06-29 14:30",
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

test.describe("StyleX site issue-list shell fallback retirement", () => {
  test("pins the frozen shell cascade and four direct grid owner boundaries", async () => {
    const [route, theme, template, layout, yobi, pageLess, responsive, override, bootstrap] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        readFile(themeSource, "utf8"),
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
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    for (const directLegacyClass of [
      'className="site-setting-wrap"',
      'className="row-fluid"',
      'className="span2"',
      'className="span10"',
    ])
      expect(route).not.toContain(directLegacyClass);
    for (const exactDeclaration of [
      'margin: "0px auto"',
      '"@media (max-width: 767px)": "none"',
      'minHeight: "30px"',
      'boxSizing: "border-box"',
    ])
      expect(route).toContain(exactDeclaration);
    expect(route).toContain(
      'settingSidebarColumn: {\n    marginLeft: "0px",\n    width: {\n      default: "14.893617021276595%",\n      "@media (max-width: 767px)": "100%",\n    },\n  }',
    );
    expect(route).toContain(
      'settingContentColumn: {\n    marginLeft: {\n      default: "2.127659574468085%",\n      "@media (max-width: 767px)": "0px",\n    },\n    width: {\n      default: "82.97872340425532%",\n      "@media (max-width: 767px)": "100%",\n    },\n  }',
    );
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("styles.issueListContainer");
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
      expect(route).not.toContain("globalColors.");
      expect(theme).not.toContain(canonicalToken);
    }
    for (const routeToken of [
      "siteIssueListTitleHeadingFloat",
      "siteIssueListContainerDesktopMarginLeft",
      "siteIssueListContainerMobileMarginLeft",
    ]) {
      expect(route).not.toContain("globalColors.");
      expect(theme).not.toContain(routeToken);
    }
    expect(route).toContain("globalBreakpoints.mobile");
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
        .locator(`[data-stylex-owner="${owners.contentColumn}"] > *`)
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-stylex-owner") ?? node.tagName),
        ),
    ).toEqual([owners.title, owners.tabs, owners.container, "site-issue-list-pagination"]);
    await expect(
      owner(page, owners.container).locator('[data-stylex-owner="site-issue-list-row"]'),
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
    await expect(container.locator('[data-stylex-owner="site-issue-list-row"]')).toHaveClass(
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
      ]);
      return Array.from(
        document.querySelectorAll('[data-stylex-owner="site-issue-list-setting-content-column"] *'),
      )
        .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-stylex-owner]")?.dataset.stylexOwner)
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
      const tabs = owner(page, owners.tabs);
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
      await expect(sidebarColumn).toHaveCSS("float", viewport.name === "mobile" ? "none" : "left");
      await expect(contentColumn).toHaveCSS("float", viewport.name === "mobile" ? "none" : "left");
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
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
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
      if (viewport.name === "desktop") {
        expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.content.left + 0.5);
        expect(geometry.sidebar.width / geometry.grid.width).toBeCloseTo(0.1489361702, 4);
        expect(geometry.content.width / geometry.grid.width).toBeCloseTo(0.829787234, 4);
        expect(geometry.content.left - geometry.sidebar.right).toBeCloseTo(
          geometry.grid.width * 0.0212765957,
          1,
        );
      } else {
        expect(geometry.sidebar.width).toBeCloseTo(geometry.grid.width, 1);
        expect(geometry.content.width).toBeCloseTo(geometry.grid.width, 1);
        expect(geometry.content.top).toBeGreaterThanOrEqual(geometry.sidebar.bottom);
      }

      const fallback = await page.evaluate((ownerNames) => {
        const content = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-issue-list-setting-content-column"]',
        )!;
        const gridFixture = document.createElement("div");
        gridFixture.style.position = "absolute";
        gridFixture.style.left = "-10000px";
        gridFixture.style.width = `${document.querySelector<HTMLElement>(`[data-stylex-owner="${ownerNames.settingWrap}"]`)!.getBoundingClientRect().width}px`;
        gridFixture.innerHTML =
          '<div class="site-setting-wrap"><div class="row-fluid"><div class="span2"></div><div class="span10"><div class="title_area"><h2 class="pull-left">Issues</h2></div></div></div></div>';
        document.body.append(gridFixture);
        const containerFixture = document.createElement("div");
        containerFixture.style.position = "absolute";
        containerFixture.style.left = "-10000px";
        containerFixture.style.width = `${content.getBoundingClientRect().width}px`;
        containerFixture.innerHTML = '<ul class="post-list-wrap"><li></li></ul>';
        document.body.append(containerFixture);
        const actualTitle = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.title}"]`,
        )!;
        const actualHeading = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.heading}"]`,
        )!;
        const actualContainer = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.container}"]`,
        )!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const actualWrap = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.settingWrap}"]`,
        )!;
        const actualGrid = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.grid}"]`,
        )!;
        const actualSidebar = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.sidebarColumn}"]`,
        )!;
        const fallbackWrap = gridFixture.querySelector<HTMLElement>(".site-setting-wrap")!;
        const fallbackGrid = gridFixture.querySelector<HTMLElement>(".row-fluid")!;
        const fallbackSidebar = gridFixture.querySelector<HTMLElement>(".span2")!;
        const fallbackContent = gridFixture.querySelector<HTMLElement>(".span10")!;
        const fallbackTitle = fallbackContent.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = fallbackTitle.querySelector<HTMLElement>(".pull-left")!;
        const fallbackContainer = containerFixture.querySelector<HTMLElement>(".post-list-wrap")!;
        const result = {
          columns: [
            [
              values(actualSidebar, [
                "display",
                "float",
                "width",
                "min-height",
                "margin-left",
                "box-sizing",
              ]),
              values(content, [
                "display",
                "float",
                "width",
                "min-height",
                "margin-left",
                "box-sizing",
              ]),
            ],
            [
              values(fallbackSidebar, [
                "display",
                "float",
                "width",
                "min-height",
                "margin-left",
                "box-sizing",
              ]),
              values(fallbackContent, [
                "display",
                "float",
                "width",
                "min-height",
                "margin-left",
                "box-sizing",
              ]),
            ],
          ],
          container: [
            values(actualContainer, ["list-style-type", "margin-left"]),
            values(fallbackContainer, ["list-style-type", "margin-left"]),
          ],
          heading: [
            values(actualHeading, ["float", "margin", "font-size", "line-height", "color"]),
            values(fallbackHeading, ["float", "margin", "font-size", "line-height", "color"]),
          ],
          title: [
            values(actualTitle, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
            values(fallbackTitle, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
          ],
          wrapAndGrid: [
            [values(actualWrap, ["margin"]), values(actualGrid, ["width"])],
            [values(fallbackWrap, ["margin"]), values(fallbackGrid, ["width"])],
          ],
        };
        gridFixture.remove();
        containerFixture.remove();
        return result;
      }, owners);
      expect(fallback.title[0]).toEqual(fallback.title[1]);
      expect(fallback.heading[0]).toEqual(fallback.heading[1]);
      expect(fallback.container[0]).toEqual(fallback.container[1]);
      expect(fallback.wrapAndGrid[0]).toEqual(fallback.wrapAndGrid[1]);
      if (viewport.name === "desktop") {
        expect(fallback.columns[0]).toEqual(fallback.columns[1]);
      } else {
        expect(fallback.columns[0]).toEqual([
          ["block", "none", "390px", "30px", "0px", "border-box"],
          ["block", "none", "390px", "30px", "0px", "border-box"],
        ]);
        const fallbackGridWidth = Number.parseFloat(fallback.wrapAndGrid[1][1][0]);
        const [fallbackSidebar, fallbackContent] = fallback.columns[1];
        expect(fallbackSidebar[0]).toBe("block");
        expect(fallbackSidebar[1]).toBe("left");
        expect(Number.parseFloat(fallbackSidebar[2]) / fallbackGridWidth).toBeCloseTo(
          0.1489361702,
          4,
        );
        expect(fallbackSidebar.slice(3)).toEqual(["30px", "0px", "border-box"]);
        expect(fallbackContent[0]).toBe("block");
        expect(fallbackContent[1]).toBe("left");
        expect(Number.parseFloat(fallbackContent[2]) / fallbackGridWidth).toBeCloseTo(
          0.829787234,
          4,
        );
        expect(Number.parseFloat(fallbackContent[4]) / fallbackGridWidth).toBeCloseTo(
          0.0212765957,
          4,
        );
        expect(fallbackContent[3]).toBe("30px");
        expect(fallbackContent[5]).toBe("border-box");
      }
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
