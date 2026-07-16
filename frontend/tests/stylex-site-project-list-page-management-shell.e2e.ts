import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = [
  "site-project-list-page-wrap-outer",
  "site-project-list-setting-wrap",
  "site-project-list-setting-grid",
  "site-project-list-setting-sidebar-column",
  "site-project-list-setting-content-column",
] as const;

test.use({ locale: "ko-KR" });

async function openProjectList(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-07-07",
            id: 71,
            ownerName: "weblabs",
            overview: "Protected organization project for localhost parity",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "portal",
          },
          {
            createdAt: "2026-07-07",
            id: 72,
            ownerName: "alice",
            overview: "Parity seed project for the alice workspace",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "sample",
          },
          {
            createdAt: "2026-07-07",
            id: 73,
            ownerName: "admin",
            overview: "Parity seed Subversion project for localhost checks",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "svnplayground",
          },
          {
            createdAt: "2026-07-07",
            id: 74,
            ownerName: "admin",
            overview: "Parity seed project for the admin workspace",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "sample",
          },
        ],
        total: 4,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=1`);
  await expect(page.locator(`[data-stylex-owner="${owners[0]}"]`)).toBeVisible();
}

test("management shell directly owns only the five legacy layout boundaries", () => {
  const route = readFileSync("src/routes/sites/projectList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const projectList = readFileSync(
    "../yona-original/app/views/site/projectList.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const manifest = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.manifest.json",
    "utf8",
  );
  expect(projectList).toContain("@siteMngLayout(message)");
  for (const token of ["page-wrap-outer", "site-setting-wrap", "row-fluid", "span2", "span10"])
    expect(layout).toContain(`class="${token}"`);
  expect(pageLess).toContain(".page-wrap-outer {");
  expect(pageLess).toContain(".site-setting-wrap {");
  expect(responsive).toContain(".page-wrap-outer {");
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain(".row-fluid .span2 {\n  width: 14.893617021276595%;");
  expect(bootstrap).toContain(".row-fluid .span10 {\n  width: 82.97872340425532%;");
  expect(manifest).toContain('"id": "bootstrap-responsive"');
  expect(manifest).toContain(
    "inactive in legacy layout.scala.html and retained as parity evidence",
  );
  for (const owner of owners) expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('<div className="page-wrap-outer">');
  expect(route).toContain(
    'className={`site-setting-wrap ${settingWrapStyleProps.className ?? ""}`}',
  );
  for (const retired of ['className="row-fluid"', 'className="span2"', 'className="span10"'])
    expect(route).not.toContain(retired);
  expect(route).not.toContain("listitem-col");
  expect(route).toContain('data-stylex-owner="site-project-list-listhead"');
  expect(route).not.toContain("row-fluid listhead");
  expect(route).not.toContain("globalColors.");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`management shell preserves exact ${viewport.name} geometry and frozen equivalence`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjectList(page);
    const get = (owner: string) => page.locator(`[data-stylex-owner="${owner}"]`);
    const pageWrap = get(owners[0]);
    const setting = get(owners[1]);
    const grid = get(owners[2]);
    const sidebar = get(owners[3]);
    const content = get(owners[4]);
    await expect(pageWrap).not.toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(setting).toHaveClass(/\bsite-setting-wrap\b/u);
    await expect(grid).not.toHaveClass(/\brow-fluid\b/u);
    await expect(sidebar).not.toHaveClass(/\bspan2\b/u);
    await expect(content).not.toHaveClass(/\bspan10\b/u);
    await expect(
      content.locator(':scope > [data-stylex-owner="site-project-list-listhead"]'),
    ).toHaveCount(1);
    await expect(
      content.locator(
        '[data-stylex-owner^="site-project-list-row-"][data-stylex-owner$="-column"]',
      ),
    ).toHaveCount(16);
    expect(
      await setting
        .locator(":scope > *")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stylex-owner"))),
    ).toEqual([owners[2]]);
    expect(
      await grid
        .locator(":scope > *")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stylex-owner"))),
    ).toEqual([owners[3], owners[4]]);

    const evidence = await page.evaluate((ownerNames) => {
      const elements = ownerNames.map(
        (owner) => document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!,
      );
      const [pageWrap, setting, grid, sidebar, content] = elements;
      const capture = () => {
        const rect = (element: HTMLElement) => {
          const box = element.getBoundingClientRect();
          return {
            bottom: box.bottom,
            height: box.height,
            left: box.left,
            right: box.right,
            top: box.top,
            width: box.width,
            x: box.x,
            y: box.y,
          };
        };
        const column = (element: HTMLElement) => {
          const style = getComputedStyle(element);
          return {
            boxSizing: style.boxSizing,
            display: style.display,
            float: style.cssFloat,
            marginLeft: style.marginLeft,
            minHeight: style.minHeight,
            width: style.width,
          };
        };
        const pseudo = (name: "::before" | "::after") => {
          const style = getComputedStyle(grid, name);
          return {
            clear: style.clear,
            content: style.content,
            display: style.display,
            lineHeight: style.lineHeight,
          };
        };
        const pageStyle = getComputedStyle(pageWrap);
        return {
          boxes: elements.map(rect),
          columns: [column(sidebar), column(content)],
          page: {
            boxSizing: pageStyle.boxSizing,
            marginTop: pageStyle.marginTop,
            minHeight: pageStyle.minHeight,
            minWidth: pageStyle.minWidth,
            padding: pageStyle.padding,
            width: pageStyle.width,
          },
          pseudos: [pseudo("::before"), pseudo("::after")],
          setting: { margin: getComputedStyle(setting).margin },
        };
      };
      const actual = capture();
      const legacyClasses = [
        [pageWrap, "page-wrap-outer"],
        [setting, "site-setting-wrap"],
        [grid, "row-fluid"],
        [sidebar, "span2"],
        [content, "span10"],
      ] as const;
      for (const [element, legacyClass] of legacyClasses) {
        for (const token of Array.from(element.classList))
          if (token.startsWith("x")) element.classList.remove(token);
        element.classList.add(legacyClass);
      }
      const fallback = capture();
      return { actual, fallback };
    }, owners);
    const { page: actualPage, ...actualShared } = evidence.actual;
    const { page: fallbackPage, ...fallbackShared } = evidence.fallback;
    expect(actualShared).toEqual(fallbackShared);
    const { minWidth: actualMinWidth, ...actualPageShared } = actualPage;
    const { minWidth: fallbackMinWidth, ...fallbackPageShared } = fallbackPage;
    expect(actualPageShared).toEqual(fallbackPageShared);
    expect({ actualMinWidth, fallbackMinWidth }).toEqual(
      viewport.name === "desktop"
        ? { actualMinWidth: "0px", fallbackMinWidth: "1100px" }
        : { actualMinWidth: "10px", fallbackMinWidth: "10px" },
    );
    const [pageBox, settingBox, gridBox, sidebarBox, contentBox] = evidence.actual.boxes;
    const expectedPageHeight = viewport.name === "desktop" ? 460 : 611;
    const expectedGridWidth = viewport.name === "desktop" ? 1346 : 390;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      viewport.name === "desktop" ? 1366 : 420,
    );
    expect(evidence.actual.page).toEqual({
      boxSizing: "border-box",
      marginTop: "10px",
      minHeight: "450px",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: viewport.name === "desktop" ? "0px 10px" : "0px",
      width: `${viewport.width}px`,
    });
    expect(evidence.actual.setting).toEqual({ margin: "0px" });
    expect(evidence.actual.pseudos).toEqual([
      { clear: "none", content: '""', display: "table", lineHeight: "0px" },
      { clear: "both", content: '""', display: "table", lineHeight: "0px" },
    ]);
    expect(pageBox).toMatchObject({
      height: expectedPageHeight,
      width: viewport.width,
      x: 0,
      y: 138,
    });
    expect(settingBox).toMatchObject({
      height: expectedPageHeight,
      width: expectedGridWidth,
      x: viewport.name === "desktop" ? 10 : 0,
      y: 138,
    });
    expect(gridBox).toEqual(settingBox);
    expect(sidebarBox).toMatchObject({
      height: viewport.name === "desktop" ? 341 : 611,
      width: viewport.name === "desktop" ? 200.453125 : 58.078125,
      x: viewport.name === "desktop" ? 10 : 0,
      y: 138,
    });
    expect(contentBox).toMatchObject({
      height: expectedPageHeight,
      width: viewport.name === "desktop" ? 1116.890625 : 323.609375,
      x: viewport.name === "desktop" ? 239.078125 : 66.375,
      y: 138,
    });
    expect(sidebarBox.right).toBeLessThanOrEqual(contentBox.left);
    expect(contentBox.right).toBeLessThanOrEqual(gridBox.right);
    expect(evidence.actual.columns).toEqual([
      {
        boxSizing: "border-box",
        display: "block",
        float: "left",
        marginLeft: "0px",
        minHeight: "30px",
        width: viewport.name === "desktop" ? "200.453px" : "58.0781px",
      },
      {
        boxSizing: "border-box",
        display: "block",
        float: "left",
        marginLeft: viewport.name === "desktop" ? "28.625px" : "8.29688px",
        minHeight: "30px",
        width: viewport.name === "desktop" ? "1116.89px" : "323.609px",
      },
    ]);

    await page.reload();
    await expect(get(owners[0])).toBeVisible();
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await get(owners[0]).screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-site-project-list-page-management-shell-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
