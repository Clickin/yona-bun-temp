import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-postList.stylex.ts", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/postList.scala.html",
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
const appCssSource = new URL("../src/app.css", import.meta.url);
const overrideLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  container: "site-post-list-container",
  heading: "site-post-list-title-heading",
  pagination: "site-post-list-pagination",
  title: "site-post-list-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

async function openPostList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-shell-fallbacks" },
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
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );

  await page.goto(`${basePath}/sites/postList`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  await expect(owner(page, owners.container)).toBeVisible();
  return title;
}

test.describe("StyleX site post-list shell fallback retirement", () => {
  test("pins the frozen shell cascade and three post-list owner/theme boundaries", async () => {
    const [
      route,
      theme,
      template,
      layout,
      yobi,
      pageLess,
      responsive,
      appCss,
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
      readFile(appCssSource, "utf8"),
      readFile(overrideLessSource, "utf8"),
      readFile(bootstrapSource, "utf8"),
    ]);

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('<ul class="post-list-wrap">');
    expect(layout).toContain('<div class="span10">');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".post-list-wrap {\n        list-style: none;");
    expect(responsive).toContain(".post-list-wrap {\n    margin-left: 10px;");
    for (const retiredSelector of [
      ".site-setting-wrap .post-list-wrap",
      ".site-setting-wrap .post-list-wrap .listitem",
      ".site-setting-wrap .post-list-wrap .post-info-wrap",
      ".site-setting-wrap .post-list-wrap .post-project",
      ".site-setting-wrap .post-list-wrap .post-info-separator",
      ".site-setting-wrap .post-list-wrap .post-title",
      ".site-setting-wrap .post-list-wrap .post-meta-wrap",
      ".site-setting-wrap .post-list-wrap .post-meta-item",
      ".site-setting-wrap .post-list-wrap .post-comments i",
    ]) {
      expect(appCss).not.toContain(`${retiredSelector} {`);
    }
    for (const deadBridgeSelector of [
      ".site-admin-page .post-list-wrap",
      ".site-admin-page .post-list-wrap .listitem",
      ".site-admin-page .post-list-wrap .listitem:last-child",
    ]) {
      expect(appCss).not.toContain(deadBridgeSelector);
    }
    expect(appCss).toContain(".post-list-wrap {");
    expect(appCss).not.toContain(".site-admin-page");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");

    for (const explicitOwner of [owners.title, owners.heading, owners.container])
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    expect(route).toContain('data-stylex-owner-page="site-post-list-page"');
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
      "sitePostListTitleHeadingFloat",
      "sitePostListContainerDesktopMarginLeft",
      "sitePostListContainerMobileMarginLeft",
    ]) {
      expect(route).not.toContain("globalColors.");
      expect(theme).not.toContain(routeToken);
    }
    expect(route).toContain("globalBreakpoints.mobile");
  });

  test("keeps DIV > H2 and exact title, populated-list, pagination order", async ({ page }) => {
    const title = await openPostList(page);
    await expect(owner(title, owners.heading)).toHaveText("Posts");
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2"]);
    expect(
      await page
        .locator('[data-stylex-owner="site-post-list-setting-content-column"] > *')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-stylex-owner") ?? node.tagName),
        ),
    ).toEqual([owners.title, owners.container, owners.pagination]);
    await expect(
      owner(page, owners.container).locator('[data-stylex-owner="site-post-list-row"]'),
    ).toHaveCount(1);
  });

  test("retires only title_area, pull-left, post-list-wrap and isolates generated owners", async ({
    page,
  }) => {
    const title = await openPostList(page);
    const heading = owner(title, owners.heading);
    const container = owner(page, owners.container);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(container).not.toHaveClass(/\bpost-list-wrap\b/u);
    const settingWrap = page.locator('[data-stylex-owner="site-post-list-setting-wrap"]');
    await expect(settingWrap).toHaveAttribute("data-stylex-owner-page", "site-post-list-page");
    const settingGrid = page.locator('[data-stylex-owner="site-post-list-setting-grid"]');
    const sidebarColumn = page.locator(
      '[data-stylex-owner="site-post-list-setting-sidebar-column"]',
    );
    const contentColumn = page.locator(
      '[data-stylex-owner="site-post-list-setting-content-column"]',
    );
    await expect(settingWrap).not.toHaveClass(/site-setting-wrap/u);
    await expect(settingGrid).not.toHaveClass(/row-fluid/u);
    await expect(sidebarColumn).not.toHaveClass(/span2/u);
    await expect(contentColumn).not.toHaveClass(/span10/u);
    await expect(container.locator('[data-stylex-owner="site-post-list-row"]')).not.toHaveClass(
      /\brow-fluid\b/u,
    );

    const unauthorized = await page.evaluate(() => {
      const allowed = new Set([
        "site-post-list-title-strip",
        "site-post-list-title-heading",
        "site-post-list-container",
        "site-post-list-row",
        "site-post-list-project-avatar",
        "site-post-list-project-avatar-image",
        "site-post-list-info",
        "site-post-list-project-link",
        "site-post-list-separator",
        "site-post-list-title-link",
        "site-post-list-metadata",
        "site-post-list-author-avatar",
        "site-post-list-author-avatar-image",
        "site-post-list-metadata-item",
        "site-post-list-comments-icon",
        "site-post-list-pagination",
        "site-post-list-pagination-list",
        "site-post-list-pagination-item",
        "site-post-list-pagination-input",
        "site-post-list-pagination-label",
        "site-post-list-pagination-icon",
        "site-post-list-pagination-dynamic-sprite",
      ]);
      return Array.from(
        document.querySelectorAll('[data-stylex-owner="site-post-list-setting-content-column"] *'),
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
    test(`keeps ${viewport.name} paint, geometry, screenshot, and frozen fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openPostList(page);
      const heading = owner(title, owners.heading);
      const container = owner(page, owners.container);
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
        const content = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-post-list-setting-content-column"]',
        )!;
        const get = (name: string) =>
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
        const contentBox = content.getBoundingClientRect();
        const titleBox = get(ownerNames.title);
        const headingBox = get(ownerNames.heading);
        const containerBox = get(ownerNames.container);
        const paginationBox = get(ownerNames.pagination);
        return {
          container: containerBox.toJSON(),
          content: contentBox.toJSON(),
          heading: headingBox.toJSON(),
          pagination: paginationBox.toJSON(),
          title: titleBox.toJSON(),
        };
      }, owners);
      expect(geometry.title.height).toBe(39);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.title.left).toBeCloseTo(geometry.content.left, 1);
      expect(geometry.title.right).toBeCloseTo(geometry.content.right, 1);
      expect(geometry.heading.left).toBeCloseTo(geometry.title.left, 1);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.container.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);
      expect(geometry.container.left).toBeCloseTo(
        geometry.content.left + (viewport.name === "mobile" ? 10 : 0),
        1,
      );
      expect(geometry.container.right).toBeLessThanOrEqual(geometry.content.right + 0.5);
      expect(geometry.pagination.top).toBeGreaterThanOrEqual(geometry.container.bottom);

      const fallback = await page.evaluate((ownerNames) => {
        const content = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-post-list-setting-content-column"]',
        )!;
        const titleFixture = document.createElement("div");
        titleFixture.className = "site-setting-wrap";
        titleFixture.style.position = "absolute";
        titleFixture.style.left = "-10000px";
        titleFixture.innerHTML = '<div class="title_area"><h2 class="pull-left">Posts</h2></div>';
        content.append(titleFixture);
        const listFixture = document.createElement("div");
        listFixture.className = "site-setting-wrap";
        listFixture.dataset.frozenPostListFixture = "true";
        listFixture.style.position = "absolute";
        listFixture.style.left = "-10000px";
        listFixture.innerHTML = `<style>
          @media (max-width: 720px) {
            [data-frozen-post-list-fixture="true"] .post-list-wrap { margin-left: 10px; }
          }
        </style><ul class="post-list-wrap"><li></li></ul>`;
        document.body.append(listFixture);
        const actual = (name: string) =>
          document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
        const fallbackTitle = titleFixture.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = titleFixture.querySelector<HTMLElement>(".pull-left")!;
        const fallbackContainer = listFixture.querySelector<HTMLElement>(".post-list-wrap")!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
          container: [
            values(actual(ownerNames.container), ["list-style-type", "margin-left"]),
            values(fallbackContainer, ["list-style-type", "margin-left"]),
          ],
          heading: [
            values(actual(ownerNames.heading), [
              "float",
              "margin",
              "font-size",
              "line-height",
              "color",
            ]),
            values(fallbackHeading, ["float", "margin", "font-size", "line-height", "color"]),
          ],
          title: [
            values(actual(ownerNames.title), [
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
        titleFixture.remove();
        listFixture.remove();
        return result;
      }, owners);
      expect(fallback.title[0]).toEqual(fallback.title[1]);
      expect(fallback.heading[0]).toEqual(fallback.heading[1]);
      expect(fallback.container[0]).toEqual(fallback.container[1]);
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
