import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

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

  expect(bootstrap).toContain(".row-fluid:after {\n  clear: both;");
  expect(route).toContain(`data-owner="${owners.page}"`);
  expect(route).toContain(`data-owner="${owners.row}"`);
  // F5 route renders page-wrap-outer — siteMngLayout.scala.html:39.
  expect(route).toContain('className="page-wrap-outer"');
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
    const outer = page.locator(`[data-owner="${owners.page}"]`);
    const row = page.locator(`[data-owner="${owners.row}"]`);
    // F5 shell classes present — page-wrap-outer siteMngLayout.scala.html:39,
    // row row-fluid postList.scala.html:33.
    await expect(outer).toHaveClass(/page-wrap-outer/u);
    await expect(row).toHaveClass(/row-fluid/u);
    await expect(row).toHaveCSS("display", "list-item");
    const evidence = await page.evaluate((names) => {
      const outer = document.querySelector<HTMLElement>(`[data-owner="${names.page}"]`)!;
      const row = document.querySelector<HTMLElement>(`[data-owner="${names.row}"]`)!;
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
          document.querySelector<HTMLElement>('[data-owner="site-post-list-breadcrumb-outer"]')!,
        ),
        outer: css(outer),
        outerBox: rect(outer),
        row: css(row),
        before: css(row, "::before"),
        after: css(row, "::after"),
        rowBox: rect(row),
        settingGridBox: rect(
          document.querySelector<HTMLElement>('[data-owner="site-post-list-setting-grid"]')!,
        ),
        contentBox: rect(
          document.querySelector<HTMLElement>(
            '[data-owner="site-post-list-setting-content-column"]',
          )!,
        ),
        containerBox: rect(
          document.querySelector<HTMLElement>('[data-owner="site-post-list-container"]')!,
        ),
        order: Array.from(row.children).map((el) => el.getAttribute("data-owner")),
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
    // F5 dist-truth: the app's `.page-wrap-outer { min-width: 1100px }`
    // (app.css:2076, @layer legacy) applies on desktop — the same value the
    // project-shell specs pin (pageWrapMinWidth 1100px, project-delete-form
    // e2e.ts:221). Mobile: the data-owner rule sets min-width 10px
    // (app.css:18894, @media max-width 720px).
    expect(evidence.outer.minWidth).toBe(viewport.name === "desktop" ? "1100px" : "10px");
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
        `style-site-post-list-page-row-shell-${viewport.name}.png`,
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
