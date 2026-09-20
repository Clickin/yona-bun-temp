import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOTS = resolve("..", "output", "playwright");
const OWNERS = {
  breadcrumb: "site-issue-list-breadcrumb-outer",
  container: "site-issue-list-container",
  content: "site-issue-list-setting-content-column",
  grid: "site-issue-list-setting-grid",
  page: "site-issue-list-page-wrap-outer",
  row: "site-issue-list-row",
  setting: "site-issue-list-setting-wrap",
  sidebar: "site-issue-list-setting-sidebar-column",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "en-US" });

test("five-owner page, management columns, and row source owns the active frozen declarations", () => {
  const route = readFileSync("src/routes/sites/issueList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const issueList = readFileSync("../yona-original/app/views/site/issueList.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(issueList).toContain('<li class="row-fluid listitem">');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
  expect(pageLess).toContain(`.page-wrap-outer {
    min-height: 450px;
    margin-top: 10px;
}`);
  expect(responsive).toContain(`.page-wrap-outer {
    min-width: 10px !important;
    padding: 0 !important;
  }`);
  expect(responsive).toContain(`.page-wrap-outer {
    padding: 0 10px;
    width: 100%;
    box-sizing: border-box;
  }`);
  expect(bootstrap).toContain(`.row-fluid {
  width: 100%;
  *zoom: 1;
}`);

  expect(bootstrap).toContain(`.row-fluid:after {
  clear: both;
}`);
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");

  expect(messages).toContain("site.sidebar = Site management");
  expect(messages).toContain("site.sidebar.issueList = Issues");
  expect(messages).toContain("issue.state.open = Open");
  expect(messages).toContain("issue.state.closed = Closed");

  expect(route).toContain(`data-owner="${OWNERS.page}"`);
  expect(route).toContain(`data-owner="${OWNERS.row}"`);
  expect(route).not.toContain('<div className="page-wrap-outer">');
  expect(route).not.toContain('className={`row-fluid ${rowStyleProps.className ?? ""}`}');

  const columnStyles = route.slice(route.indexOf("settingColumn:"), route.indexOf("sidebar:"));
  expect(columnStyles).not.toContain("@media (max-width: 767px)");
  expect(columnStyles).not.toContain('"none"');
  expect(columnStyles).not.toContain('"100%"');
  const pageStyle = route.slice(route.indexOf("pageWrapOuter:"), route.indexOf("breadcrumbOuter:"));

  expect(pageStyle).not.toContain("siteIssueListColors");
});

test("five-owner page, management columns, and row preserve legacy geometry in one browser", async ({
  page,
}) => {
  for (const viewport of [
    {
      height: 900,
      name: "desktop",
      outerPadding: "0px 10px",
      rowHeight: 69,
      rowWidth: 1116.890625,
      rowX: 239.078125,
      width: 1366,
    },
    {
      height: 844,
      name: "mobile",
      outerPadding: "0px",
      rowHeight: 88,
      rowWidth: 313.609375,
      rowX: 76.375,
      width: 390,
    },
  ]) {
    await page.setViewportSize(viewport);
    await installPopulatedOpenIssueList(page);
    await page.goto(`${BASE_PATH}/sites/issueList?state=open`);
    await page.evaluate(() => document.fonts.ready);

    const pageWrap = owner(page, OWNERS.page);
    const row = owner(page, OWNERS.row);
    const sidebar = owner(page, OWNERS.sidebar);
    const content = owner(page, OWNERS.content);
    await expect(pageWrap).toBeVisible();
    await expect(row).toHaveCount(1);
    await expect(pageWrap).not.toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(row).not.toHaveClass(/\brow-fluid\b/u);
    await expect(pageWrap).toHaveCSS("box-sizing", "border-box");
    await expect(pageWrap).toHaveCSS("margin-top", "10px");
    await expect(pageWrap).toHaveCSS("min-height", "450px");
    await expect(pageWrap).toHaveCSS("min-width", viewport.name === "mobile" ? "10px" : "0px");
    await expect(pageWrap).toHaveCSS("padding", viewport.outerPadding);
    await expect(pageWrap).toHaveCSS("width", `${viewport.width}px`);
    await expect(row).toHaveCSS("display", "list-item");
    await expect(row).toHaveCSS("line-height", "70px");
    await expect(row).toHaveCSS("padding", "10px 0px");
    await expect(sidebar).toHaveCSS("display", "block");
    await expect(sidebar).toHaveCSS("float", "left");
    await expect(sidebar).toHaveCSS("box-sizing", "border-box");
    await expect(sidebar).toHaveCSS("min-height", "30px");
    await expect(content).toHaveCSS("display", "block");
    await expect(content).toHaveCSS("float", "left");
    await expect(content).toHaveCSS("box-sizing", "border-box");
    await expect(content).toHaveCSS("min-height", "30px");

    const evidence = await page.evaluate((names) => {
      const find = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const box = (element: HTMLElement) => element.getBoundingClientRect().toJSON();
      const actualPage = find(names.page);
      const breadcrumb = find(names.breadcrumb);
      const container = find(names.container);
      const content = find(names.content);
      const grid = find(names.grid);
      const row = find(names.row);
      const setting = find(names.setting);
      const sidebar = find(names.sidebar);
      const pseudo = (part: "::before" | "::after") => {
        const style = getComputedStyle(row, part);
        return {
          clear: style.clear,
          content: style.content,
          display: style.display,
          lineHeight: style.lineHeight,
        };
      };
      return {
        after: pseudo("::after"),
        before: pseudo("::before"),
        boxes: {
          breadcrumb: box(breadcrumb),
          container: box(container),
          content: box(content),
          grid: box(grid),
          page: box(actualPage),
          row: box(row),
          setting: box(setting),
          sidebar: box(sidebar),
        },
        childOrder: Array.from(row.children).map(
          (child) => child.getAttribute("data-owner") ?? child.tagName,
        ),
        documentWidth: document.documentElement.scrollWidth,
      };
    }, OWNERS);

    expect(evidence.boxes.page.top).toBeCloseTo(evidence.boxes.breadcrumb.bottom + 10, 4);
    expect(evidence.boxes.page.left).toBe(0);
    expect(evidence.boxes.page.width).toBe(viewport.width);
    expect(evidence.boxes.page.height).toBeGreaterThanOrEqual(450);
    if (viewport.name === "desktop") {
      expect(evidence.boxes.page.height).toBeCloseTo(450, 0);
    }
    expect(evidence.boxes.setting.left).toBeGreaterThanOrEqual(evidence.boxes.page.left);
    expect(evidence.boxes.setting.right).toBeLessThanOrEqual(evidence.boxes.page.right);
    expect(evidence.boxes.setting.bottom).toBeLessThanOrEqual(evidence.boxes.page.bottom);
    expect(evidence.boxes.grid.left).toBeCloseTo(viewport.name === "desktop" ? 10 : 0, 4);
    expect(evidence.boxes.grid.width).toBeCloseTo(viewport.name === "desktop" ? 1346 : 390, 4);
    expect(evidence.boxes.sidebar.left).toBeCloseTo(evidence.boxes.grid.left, 4);
    expect(evidence.boxes.sidebar.width / evidence.boxes.grid.width).toBeCloseTo(0.1489361702, 4);
    expect(evidence.boxes.content.width / evidence.boxes.grid.width).toBeCloseTo(0.829787234, 4);
    expect(
      (evidence.boxes.content.left - evidence.boxes.sidebar.right) / evidence.boxes.grid.width,
    ).toBeCloseTo(0.0212765957, 4);
    expect(evidence.boxes.sidebar.right).toBeLessThanOrEqual(evidence.boxes.content.left);
    expect(evidence.boxes.sidebar.top).toBeCloseTo(evidence.boxes.content.top, 4);
    expect(evidence.boxes.content.left).toBeCloseTo(
      viewport.name === "desktop" ? 239.078125 : 66.375,
      3,
    );
    expect(evidence.boxes.content.width).toBeCloseTo(
      viewport.name === "desktop" ? 1116.890625 : 323.609375,
      3,
    );
    expect(evidence.boxes.row.left).toBeCloseTo(evidence.boxes.container.left, 4);
    expect(evidence.boxes.row.right).toBeCloseTo(evidence.boxes.container.right, 4);
    expect(evidence.boxes.row.width).toBeCloseTo(evidence.boxes.container.width, 4);
    expect(evidence.boxes.row.x).toBeCloseTo(viewport.rowX, 4);
    expect(evidence.boxes.row.width).toBeCloseTo(viewport.rowWidth, 4);
    expect(evidence.boxes.row.height).toBeCloseTo(viewport.rowHeight, 0);
    expect(evidence.before).toEqual({
      clear: "none",
      content: '""',
      display: "table",
      lineHeight: "0px",
    });
    expect(evidence.after).toEqual({
      clear: "both",
      content: '""',
      display: "table",
      lineHeight: "0px",
    });
    expect(evidence.childOrder).toEqual([
      "site-issue-list-project-avatar",
      "site-issue-list-info",
      "site-issue-list-metadata",
    ]);
    expect(evidence.documentWidth).toBe(viewport.width);

    mkdirSync(SCREENSHOTS, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(SCREENSHOTS, `style-site-issue-list-page-row-shell-${viewport.name}.png`),
    });
  }
});

async function installPopulatedOpenIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
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
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 1,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29T14:30:00Z",
            issueNumber: "1",
            ownerName: "admin",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "sample",
            state: "open",
            title: "Review rail parity check",
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
}
