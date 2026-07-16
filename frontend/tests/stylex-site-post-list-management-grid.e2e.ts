import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const owners = [
  "site-post-list-setting-wrap",
  "site-post-list-setting-grid",
  "site-post-list-setting-sidebar-column",
  "site-post-list-setting-content-column",
];

test("direct management grid owns only the active frozen base declarations", () => {
  const route = readFileSync("src/routes/sites/postList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const postList = readFileSync("../yona-original/app/views/site/postList.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const responsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const ledger = readFileSync("../docs/provenance/frontend-stylex-migration-ledger.md", "utf8");

  expect(postList).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-setting-wrap">');
  expect(layout).toContain('<div class="row-fluid">');
  expect(layout).toContain('<div class="span2">');
  expect(layout).toContain('<div class="span10">');
  expect(pageLess).toContain(".site-setting-wrap {\n    margin:0 auto;");
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(bootstrap).toContain(".row-fluid .span10 {\n  width: 82.97872340425532%;");
  expect(bootstrap).toContain(".row-fluid .span2 {\n  width: 14.893617021276595%;");
  expect(responsive).toContain('[class*="span"]');
  expect(ledger).toContain("| Bootstrap responsive | `bootstrap-responsive.css`");
  expect(ledger).toContain("reference-only/inactive");
  for (const owner of owners) expect(route).toContain(`data-stylex-owner="${owner}"`);
  for (const retired of [
    'className="site-setting-wrap"',
    'className="row-fluid"',
    'className="span2"',
    'className="span10"',
  ])
    expect(route).not.toContain(retired);
  for (const declaration of [
    'margin: "0px auto"',
    'width: "100%"',
    "content: '\"\"'",
    'display: "table"',
    'lineHeight: "0px"',
    'clear: "both"',
    'boxSizing: "border-box"',
    'display: "block"',
    'float: "left"',
    'minHeight: "30px"',
    'marginLeft: "0px"',
    'width: "14.893617021276595%"',
    'marginLeft: "2.127659574468085%"',
    'width: "82.97872340425532%"',
  ])
    expect(route).toContain(declaration);
  expect(route).not.toContain('"@media (max-width: 767px)"');
});

test("direct management grid preserves the active desktop and mobile proportions in one browser", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/postList`);
    const get = (name: string) => page.locator(`[data-stylex-owner="${name}"]`);
    const wrap = get(owners[0]);
    const grid = get(owners[1]);
    const sidebar = get(owners[2]);
    const content = get(owners[3]);
    const expectedGridWidth = viewport.name === "desktop" ? 1346 : 390;
    await expect(wrap).not.toHaveClass(/site-setting-wrap/u);
    await expect(grid).not.toHaveClass(/row-fluid/u);
    await expect(sidebar).not.toHaveClass(/span2/u);
    await expect(content).not.toHaveClass(/span10/u);
    await expect(wrap).toHaveCSS("margin", "0px");
    await expect(grid).toHaveCSS("width", `${expectedGridWidth}px`);
    for (const column of [sidebar, content]) {
      await expect(column).toHaveCSS("box-sizing", "border-box");
      await expect(column).toHaveCSS("display", "block");
      await expect(column).toHaveCSS("float", "left");
      await expect(column).toHaveCSS("min-height", "30px");
    }
    const evidence = await page.evaluate((names) => {
      const find = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const wrap = find(names[0]);
      const grid = find(names[1]);
      const sidebar = find(names[2]);
      const content = find(names[3]);
      const host = document.createElement("div");
      host.style.cssText = `position:absolute;left:-10000px;width:${grid.getBoundingClientRect().width}px`;
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>.w{margin:0 auto}.g{width:100%}.g:before,.g:after{content:"";display:table;line-height:0}.g:after{clear:both}.c{box-sizing:border-box;display:block;float:left;min-height:30px}.s{margin-left:0;width:14.893617021276595%}.m{margin-left:2.127659574468085%;width:82.97872340425532%}</style><div class="w"><div class="g"><div class="c s"></div><div class="c m"></div></div></div>`;
      document.body.append(host);
      const frozen = [
        shadow.querySelector<HTMLElement>(".w")!,
        shadow.querySelector<HTMLElement>(".g")!,
        shadow.querySelector<HTMLElement>(".s")!,
        shadow.querySelector<HTMLElement>(".m")!,
      ];
      const props = [
        "margin",
        "width",
        "box-sizing",
        "display",
        "float",
        "min-height",
        "margin-left",
      ];
      const values = (el: HTMLElement) =>
        props.map((p) => getComputedStyle(el).getPropertyValue(p));
      const rect = (el: HTMLElement) => el.getBoundingClientRect().toJSON();
      const result = {
        actual: [values(wrap), values(grid), values(sidebar), values(content)],
        frozen: frozen.map(values),
        boxes: [rect(wrap), rect(grid), rect(sidebar), rect(content)],
        children: Array.from(content.children).map(
          (el) => el.getAttribute("data-stylex-owner") ?? el.id,
        ),
        nestedClass:
          document.querySelector('[data-stylex-owner="site-post-list-row"]')?.className ?? "",
        scrollWidth: document.documentElement.scrollWidth,
      };
      host.remove();
      return result;
    }, owners);
    expect(evidence.actual).toEqual(evidence.frozen);
    const [wrapBox, gridBox, sideBox, contentBox] = evidence.boxes;
    expect(gridBox.left).toBe(wrapBox.left);
    expect(gridBox.right).toBe(wrapBox.right);
    expect(gridBox.width).toBe(wrapBox.width);
    expect(gridBox.width).toBe(expectedGridWidth);
    expect(sideBox.left).toBe(gridBox.left);
    expect(sideBox.right).toBeLessThanOrEqual(contentBox.left);
    expect(contentBox.right).toBeLessThanOrEqual(gridBox.right + 0.01);
    expect(sideBox.width / gridBox.width).toBeCloseTo(0.14893617021276595, 4);
    expect((contentBox.left - sideBox.right) / gridBox.width).toBeCloseTo(0.02127659574468085, 4);
    expect(contentBox.width / gridBox.width).toBeCloseTo(0.8297872340425532, 4);
    expect(evidence.children).toEqual([
      "site-post-list-title-strip",
      "site-post-list-container",
      "site-post-list-pagination",
    ]);
    expect(evidence.nestedClass.split(/\s+/u)).not.toContain("row-fluid");
    expect(evidence.scrollWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-post-list-management-grid-${viewport.name}.png`,
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
