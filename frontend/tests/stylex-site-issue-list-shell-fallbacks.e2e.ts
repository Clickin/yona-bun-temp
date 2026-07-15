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
  heading: "site-issue-list-title-heading",
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
  test("pins the frozen shell cascade and three owner/theme boundaries", async () => {
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
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".post-list-wrap {\n        list-style: none;");
    expect(responsive).toContain(".post-list-wrap {\n    margin-left: 10px;");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of [owners.title, owners.heading, owners.container])
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
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
        .locator(".site-setting-wrap > .row-fluid > .span10 > *")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-stylex-owner") ?? node.tagName),
        ),
    ).toEqual([owners.title, owners.tabs, owners.container, "site-issue-list-pagination"]);
    await expect(
      owner(page, owners.container).locator('[data-stylex-owner="site-issue-list-row"]'),
    ).toHaveCount(1);
  });

  test("retires only the three shell fallbacks and retains the legacy grid and row boundary", async ({
    page,
  }) => {
    const title = await openIssueList(page);
    const heading = owner(title, owners.heading);
    const container = owner(page, owners.container);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(container).not.toHaveClass(/\bpost-list-wrap\b/u);
    await expect(page.locator(".site-setting-wrap > .row-fluid > .span10")).toHaveCount(1);
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
      return Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
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
    test(`keeps ${viewport.name} frozen paint, exact geometry, containment, screenshot, and fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openIssueList(page);
      const heading = owner(title, owners.heading);
      const tabs = owner(page, owners.tabs);
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
          ".site-setting-wrap > .row-fluid > .span10",
        )!;
        const get = (name: string) =>
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
        const contentBox = content.getBoundingClientRect();
        const titleBox = get(ownerNames.title);
        const headingBox = get(ownerNames.heading);
        const tabsBox = get(ownerNames.tabs);
        const containerBox = get(ownerNames.container);
        return {
          container: containerBox.toJSON(),
          content: contentBox.toJSON(),
          heading: headingBox.toJSON(),
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

      const fallback = await page.evaluate((ownerNames) => {
        const content = document.querySelector<HTMLElement>(
          ".site-setting-wrap > .row-fluid > .span10",
        )!;
        const fixture = document.createElement("div");
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.style.width = `${content.getBoundingClientRect().width}px`;
        fixture.innerHTML = '<div class="title_area"><h2 class="pull-left">Issues</h2></div>';
        content.append(fixture);
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
        const fallbackTitle = fixture.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = fixture.querySelector<HTMLElement>(".pull-left")!;
        const fallbackContainer = containerFixture.querySelector<HTMLElement>(".post-list-wrap")!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
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
        };
        fixture.remove();
        containerFixture.remove();
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
