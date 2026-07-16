import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = { page: "site-post-list-page-wrap-outer", row: "site-post-list-row" } as const;

test.use({ locale: "en-US" });

test("page wrapper and repeated row own exactly the selected frozen declarations", () => {
  const route = readFileSync("src/routes/sites/postList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const postList = readFileSync("../yona-original/app/views/site/postList.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  expect(postList).toContain('<li class="row-fluid listitem">');
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(pageLess).toContain(".page-wrap-outer {\n    min-height: 450px;\n    margin-top: 10px;");
  expect(responsive).toContain(
    ".page-wrap-outer {\n    min-width: 10px !important;\n    padding: 0 !important;",
  );
  expect(responsive).toContain(
    ".page-wrap-outer {\n    padding: 0 10px;\n    width: 100%;\n    box-sizing: border-box;",
  );
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain(
    '.row-fluid:before,\n.row-fluid:after {\n  display: table;\n  line-height: 0;\n  content: "";',
  );
  expect(bootstrap).toContain(".row-fluid:after {\n  clear: both;");
  expect(route).toContain(`data-stylex-owner="${owners.page}"`);
  expect(route).toContain(`data-stylex-owner="${owners.row}"`);
  expect(route).not.toContain('className="page-wrap-outer"');
  expect(route).not.toContain('className={`row-fluid ${postListRowStyleProps.className ?? ""}`}');
  for (const declaration of [
    'minHeight: "450px"',
    'marginTop: "10px"',
    'boxSizing: "border-box"',
    "padding: {",
    'width: "100%"',
    "content: '\"\"'",
    'display: "table"',
    'lineHeight: "0px"',
    'clear: "both"',
  ])
    expect(route).toContain(declaration);
});

test("page wrapper and repeated row preserve desktop and mobile output in one browser", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/sites/postList`);
    const outer = page.locator(`[data-stylex-owner="${owners.page}"]`);
    const row = page.locator(`[data-stylex-owner="${owners.row}"]`);
    await expect(outer).not.toHaveClass(/page-wrap-outer/u);
    await expect(row).not.toHaveClass(/row-fluid/u);
    await expect(row).toHaveCSS("display", "list-item");
    const evidence = await page.evaluate((names) => {
      const outer = document.querySelector<HTMLElement>(`[data-stylex-owner="${names.page}"]`)!;
      const row = document.querySelector<HTMLElement>(`[data-stylex-owner="${names.row}"]`)!;
      const css = (el: HTMLElement, pseudo?: string) => {
        const s = getComputedStyle(el, pseudo);
        return {
          boxSizing: s.boxSizing,
          clear: s.clear,
          content: s.content,
          display: s.display,
          lineHeight: s.lineHeight,
          marginTop: s.marginTop,
          minHeight: s.minHeight,
          minWidth: s.minWidth,
          padding: s.padding,
          width: s.width,
        };
      };
      const rect = (el: HTMLElement) => el.getBoundingClientRect().toJSON();
      return {
        breadcrumbBox: rect(
          document.querySelector<HTMLElement>(
            '[data-stylex-owner="site-post-list-breadcrumb-outer"]',
          )!,
        ),
        outer: css(outer),
        outerBox: rect(outer),
        row: css(row),
        before: css(row, "::before"),
        after: css(row, "::after"),
        rowBox: rect(row),
        settingGridBox: rect(
          document.querySelector<HTMLElement>('[data-stylex-owner="site-post-list-setting-grid"]')!,
        ),
        contentBox: rect(
          document.querySelector<HTMLElement>(
            '[data-stylex-owner="site-post-list-setting-content-column"]',
          )!,
        ),
        containerBox: rect(
          document.querySelector<HTMLElement>('[data-stylex-owner="site-post-list-container"]')!,
        ),
        order: Array.from(row.children).map((el) => el.getAttribute("data-stylex-owner")),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    expect(evidence.outer.boxSizing).toBe("border-box");
    expect(evidence.outer.marginTop).toBe("10px");
    expect(evidence.outer.minHeight).toBe("450px");
    expect(evidence.outerBox.x).toBe(0);
    expect(evidence.outerBox.top).toBe(evidence.breadcrumbBox.bottom + 10);
    expect(evidence.outerBox.width).toBe(viewport.width);
    if (viewport.name === "desktop") {
      expect(evidence.outerBox.height).toBe(450);
    } else {
      expect(evidence.outerBox.height).toBeGreaterThanOrEqual(450);
      expect(evidence.settingGridBox.bottom).toBeLessThanOrEqual(evidence.outerBox.bottom);
    }
    expect(evidence.outer.padding).toBe(viewport.name === "desktop" ? "0px 10px" : "0px");
    expect(evidence.outer.minWidth).toBe(viewport.name === "desktop" ? "0px" : "10px");
    expect(evidence.rowBox.left).toBeCloseTo(evidence.containerBox.left, 2);
    expect(evidence.rowBox.right).toBeCloseTo(evidence.containerBox.right, 2);
    expect(evidence.rowBox.width).toBeCloseTo(evidence.containerBox.width, 2);
    expect(evidence.row.lineHeight).toBe("70px");
    expect(evidence.row.padding).toBe("10px 0px");
    expect(evidence.before).toMatchObject({ display: "table", lineHeight: "0px", content: '""' });
    expect(evidence.after).toMatchObject({
      display: "table",
      lineHeight: "0px",
      content: '""',
      clear: "both",
    });
    expect(evidence.rowBox.x).toBeCloseTo(viewport.name === "desktop" ? 239.078 : 76.375, 2);
    expect(evidence.rowBox.width).toBeCloseTo(viewport.name === "desktop" ? 1116.891 : 313.609, 2);
    expect(evidence.rowBox.height).toBe(69);
    expect(evidence.order).toEqual([
      "site-post-list-project-avatar",
      "site-post-list-info",
      "site-post-list-metadata",
    ]);
    expect(evidence.containerBox.left).toBeGreaterThanOrEqual(evidence.contentBox.left);
    expect(evidence.containerBox.right).toBeLessThanOrEqual(evidence.contentBox.right + 0.1);
    expect(evidence.scrollWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-post-list-page-row-shell-${viewport.name}.png`,
      ),
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/project_default_logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
      },
    }),
  );
}
