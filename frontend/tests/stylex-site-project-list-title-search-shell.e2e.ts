import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/projectList.scala.html",
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
const yobiUiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
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
  heading: "site-project-list-title-heading",
  search: "site-project-list-search",
  title: "site-project-list-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

async function openProjectList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-title-search-shell" },
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
  await page.route("**/api/v1/site/projects?*", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      json: {
        filter: url.searchParams.get("filter") ?? "",
        page: Number(url.searchParams.get("page") ?? "1"),
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 2,
      },
    });
  });

  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=2`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  return title;
}

test.describe("StyleX site project-list title/search shell", () => {
  test("pins the Scala shell, full cascade, and exactly three title boundaries", async () => {
    const [
      route,
      theme,
      template,
      layout,
      yobi,
      pageLess,
      responsive,
      yobiUi,
      override,
      bootstrap,
    ] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(templateSource, "utf8"),
      readFile(layoutSource, "utf8"),
      readFile(yobiSource, "utf8"),
      readFile(pageLessSource, "utf8"),
      readFile(responsiveLessSource, "utf8"),
      readFile(yobiUiLessSource, "utf8"),
      readFile(overrideLessSource, "utf8"),
      readFile(bootstrapSource, "utf8"),
    ]);

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('<form class="form-search pull-right"');
    expect(layout).toContain('<div class="span10">');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_yobiUI.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_yobiUI.less"));
    expect(yobi.indexOf("_yobiUI.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".form-search{\n            margin:0;");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(bootstrap).toContain(".pull-right {\n  float: right;");
    expect(responsive).toContain(".search-bar {\n    margin: 5px 0;");
    expect(yobiUi).toContain(".search-bar {\n    border:1px solid #ccc;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    for (const token of [
      "siteDiagnosticNoErrorTitleOverflow",
      "siteDiagnosticNoErrorTitleMarginBottom",
      "siteDiagnosticNoErrorTitlePaddingBottom",
      "siteDiagnosticNoErrorTitleBorder",
      "siteDiagnosticNoErrorHeadingMargin",
      "siteDiagnosticNoErrorHeadingFontSize",
      "siteDiagnosticNoErrorHeadingText",
      "siteDiagnosticNoErrorHeadingLineHeight",
      "siteProjectListTitleHeadingFloat",
      "siteProjectListSearchFormMargin",
    ]) {
      expect(route).toContain(`globalColors.${token}`);
      expect(theme).toContain(token);
    }
    for (const searchOwner of [
      "site-project-list-search-bar",
      "site-project-list-search-textbox",
      "site-project-list-search-button",
    ])
      expect(route).toContain(`data-stylex-owner="${searchOwner}"`);
  });

  test("keeps DIV > H2 + FORM and title, listhead, list, pagination, modal order", async ({
    page,
  }) => {
    const title = await openProjectList(page);
    await expect(owner(title, owners.heading)).toHaveText("Projects");
    const search = owner(title, owners.search);
    await expect(search).toHaveAttribute("action", `${basePath}/sites/projectList`);
    await expect(search.locator('input[name="filter"]')).toHaveValue("road");
    await expect(search.locator('input[name="filter"]')).toHaveAttribute(
      "placeholder",
      "Search by keyword",
    );
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2", "FORM"]);
    expect(
      await page
        .locator(".site-setting-wrap > .row-fluid > .span10 > *")
        .evaluateAll((nodes) =>
          nodes.slice(0, 5).map((node) => node.getAttribute("data-stylex-owner") ?? node.id),
        ),
    ).toEqual([
      "site-project-list-title-strip",
      "site-project-list-listhead",
      "site-project-list-container",
      "site-project-list-pagination",
      "site-project-list-delete-modal",
    ]);
    await expect(
      page.locator(
        '[data-stylex-owner="site-project-list-container"] > [data-stylex-owner="site-project-list-row"]',
      ),
    ).toHaveCount(1);
  });

  test("retires only title_area/pull-left and preserves migrated search SPA behavior", async ({
    page,
  }) => {
    const title = await openProjectList(page);
    const heading = owner(title, owners.heading);
    const search = owner(title, owners.search);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(search).not.toHaveClass(/\bform-search\b/u);
    await expect(search).toHaveClass(/\bpull-right\b/u);
    for (const childOwner of [
      "site-project-list-search-bar",
      "site-project-list-search-textbox",
      "site-project-list-search-button",
    ])
      await expect(owner(search, childOwner)).toHaveCount(1);
    expect(
      await title.evaluate((root) =>
        Array.from(root.querySelectorAll<HTMLElement>("*"))
          .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
          .map(
            (element) =>
              element.closest<HTMLElement>("[data-stylex-owner]")?.dataset.stylexOwner ??
              "missing-owner",
          ),
      ),
    ).toEqual([
      "site-project-list-title-heading",
      "site-project-list-search",
      "site-project-list-search-bar",
      "site-project-list-search-textbox",
      "site-project-list-search-button",
    ]);

    await page.evaluate(() => {
      (window as Window & { __projectSearchShell?: boolean }).__projectSearchShell = true;
    });
    await owner(search, "site-project-list-search-textbox").fill("rail");
    await owner(search, "site-project-list-search-button").click();
    await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("rail");
    expect(new URL(page.url()).searchParams.get("pageNum")).toBeNull();
    expect(
      await page.evaluate(
        () => (window as Window & { __projectSearchShell?: boolean }).__projectSearchShell,
      ),
    ).toBe(true);
    await expect(page.locator('[data-stylex-owner="site-project-list-container"]')).toContainText(
      "acme/roadmap",
    );
  });

  for (const viewport of [
    { barMargin: "0px", height: 900, name: "desktop", width: 1366 },
    { barMargin: "5px 0px", height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, geometry, screenshot, and fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openProjectList(page);
      const heading = owner(title, owners.heading);
      const search = owner(title, owners.search);
      const bar = owner(search, "site-project-list-search-bar");
      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(search).toHaveCSS("float", "right");
      await expect(search).toHaveCSS("margin", "0px");
      await expect(bar).toHaveCSS("height", "20px");
      await expect(bar).toHaveCSS("margin", viewport.barMargin);

      const geometry = await page.evaluate((ownerNames) => {
        const get = (name: string) =>
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
        return {
          heading: get(ownerNames.heading).toJSON(),
          search: get(ownerNames.search).toJSON(),
          title: get(ownerNames.title).toJSON(),
        };
      }, owners);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.search.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.search.right).toBeLessThanOrEqual(geometry.title.right + 1);
      expect(geometry.search.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(
        geometry.heading.right <= geometry.search.left + 1 ||
          geometry.heading.bottom <= geometry.search.top + 1,
      ).toBe(true);

      const fallback = await title.evaluate((actualTitle, ownerNames) => {
        const fixture = document.createElement("div");
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.style.width = `${actualTitle.getBoundingClientRect().width}px`;
        fixture.innerHTML =
          '<div class="title_area"><h2 class="pull-left">Projects</h2><form class="form-search pull-right"></form></div>';
        actualTitle.parentElement!.append(fixture);
        const actualHeading = actualTitle.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.heading}"]`,
        )!;
        const actualSearch = actualTitle.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.search}"]`,
        )!;
        const fallbackTitle = fixture.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = fixture.querySelector<HTMLElement>(".pull-left")!;
        const fallbackSearch = fixture.querySelector<HTMLElement>(".form-search")!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
          heading: [
            values(actualHeading, ["float", "margin", "font-size", "line-height", "color"]),
            values(fallbackHeading, ["float", "margin", "font-size", "line-height", "color"]),
          ],
          search: [
            values(actualSearch, ["float", "margin"]),
            values(fallbackSearch, ["float", "margin"]),
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
        };
        fixture.remove();
        return result;
      }, owners);
      expect(fallback.title[0]).toEqual(fallback.title[1]);
      expect(fallback.heading[0]).toEqual(fallback.heading[1]);
      expect(fallback.search[0]).toEqual(fallback.search[1]);
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
