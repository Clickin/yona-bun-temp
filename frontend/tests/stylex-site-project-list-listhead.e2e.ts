import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  action: "site-project-list-listhead-action-column",
  created: "site-project-list-listhead-created-column",
  description: "site-project-list-listhead-description-column",
  name: "site-project-list-listhead-name-column",
  row: "site-project-list-listhead",
} as const;

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
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
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
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=1`);
  await expect(page.locator(`[data-stylex-owner="${owners.row}"]`)).toBeVisible();
}

test("listhead source owns the exact active fluid grid and retires direct presentation classes", () => {
  const route = readFileSync("src/routes/sites/projectList.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/site/projectList.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const responsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const manifest = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.manifest.json",
    "utf8",
  );

  expect(scala).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-setting-wrap">');
  expect(scala).toContain('<div class="row-fluid listhead">');
  for (const span of ["span5", "span4", "span2", "span1"])
    expect(scala).toContain(`<div class="${span} listhead-title">`);
  expect(pageLess).toContain(".listhead {");
  expect(pageLess).toContain(".listhead-title{");
  expect(bootstrap).toContain(".row-fluid:before,");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(responsive).toContain('[class*="span"]');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(manifest).toContain("bootstrap-responsive.css");
  expect(manifest).toContain(
    "inactive in legacy layout.scala.html and retained as parity evidence",
  );
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  for (const retired of [
    "row-fluid listhead",
    "span5 listhead-title",
    "span4 listhead-title",
    "span2 listhead-title",
    "span1 listhead-title",
  ])
    expect(route).not.toContain(retired);
  for (const declaration of [
    'width: "100%"',
    "content: '\"\"'",
    'display: "table"',
    'lineHeight: "0px"',
    'clear: "both"',
    'boxSizing: "border-box"',
    'display: "block"',
    'float: "left"',
    'minHeight: "30px"',
    'marginLeft: "2.127659574468085%"',
    'marginLeft: "0px"',
    'width: "40.42553191489362%"',
    'width: "31.914893617021278%"',
    'width: "14.893617021276595%"',
    'width: "6.382978723404255%"',
    'padding: "0px 20px"',
  ])
    expect(route).toContain(declaration);
  expect(route).not.toContain("globalColors.");
  expect(route).not.toContain('"@media (max-width: 767px)"');
});

test("listhead preserves exact desktop and mobile live fluid-grid output in one browser", async ({
  page,
}) => {
  await openProjectList(page);
  const outputDirectory = resolve("../output/playwright/visual-sweep");
  mkdirSync(outputDirectory, { recursive: true });
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const row = page.locator(`[data-stylex-owner="${owners.row}"]`);
    const columns = [owners.name, owners.description, owners.created, owners.action].map((owner) =>
      page.locator(`[data-stylex-owner="${owner}"]`),
    );
    await expect(row.locator(":scope > div > strong")).toHaveText([
      "프로젝트 이름",
      "설명",
      "생성일",
      "",
    ]);
    await expect(row).not.toHaveClass(/(?:^|\s)(?:row-fluid|listhead)(?:\s|$)/u);
    for (const column of columns)
      await expect(column).not.toHaveClass(/(?:^|\s)(?:span[1245]|listhead-title)(?:\s|$)/u);

    const evidence = await page.evaluate((names) => {
      const get = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const row = get(names.row);
      const columns = [names.name, names.description, names.created, names.action].map(get);
      const rect = (element: HTMLElement) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          boxSizing: style.boxSizing,
          display: style.display,
          float: style.float,
          height: box.height,
          left: box.left,
          marginLeft: Number.parseFloat(style.marginLeft),
          minHeight: Number.parseFloat(style.minHeight),
          paddingLeft: Number.parseFloat(style.paddingLeft),
          paddingRight: Number.parseFloat(style.paddingRight),
          top: box.top,
          width: box.width,
        };
      };
      const capture = () => {
        const rowRect = row.getBoundingClientRect();
        const rowStyle = getComputedStyle(row);
        const before = getComputedStyle(row, "::before");
        const after = getComputedStyle(row, "::after");
        return {
          columns: columns.map(rect),
          documentWidth: document.documentElement.scrollWidth,
          parent: rect(row.parentElement as HTMLElement),
          pseudos: {
            after: { clear: after.clear, display: after.display, lineHeight: after.lineHeight },
            before: { display: before.display, lineHeight: before.lineHeight },
          },
          row: {
            backgroundColor: rowStyle.backgroundColor,
            borderBottomColor: rowStyle.borderBottomColor,
            borderBottomStyle: rowStyle.borderBottomStyle,
            borderBottomWidth: rowStyle.borderBottomWidth,
            height: rowRect.height,
            left: rowRect.left,
            lineHeight: rowStyle.lineHeight,
            marginBottom: rowStyle.marginBottom,
            paddingBottom: rowStyle.paddingBottom,
            paddingTop: rowStyle.paddingTop,
            top: rowRect.top,
            width: rowRect.width,
          },
        };
      };
      const actual = capture();
      const elements = [row, ...columns];
      const setting = row.closest<HTMLElement>(
        '[data-stylex-owner="site-project-list-setting-wrap"]',
      )!;
      const originalSettingClassName = setting.className;
      const originalClassNames = elements.map((element) => element.className);
      for (const element of elements) {
        for (const token of Array.from(element.classList)) {
          if (token.startsWith("x") || token.includes("__styles.")) element.classList.remove(token);
        }
      }
      setting.classList.add("site-setting-wrap");
      row.classList.add("row-fluid", "listhead");
      const spans = ["span5", "span4", "span2", "span1"];
      columns.forEach((column, index) => column.classList.add(spans[index]!, "listhead-title"));
      const fallback = capture();
      elements.forEach((element, index) => {
        element.className = originalClassNames[index]!;
      });
      setting.className = originalSettingClassName;
      return { ...actual, fallback };
    }, owners);

    const expected =
      viewport.name === "desktop"
        ? {
            columns: [
              [239.078125, 211, 451.5, 30, 0],
              [714.328125, 211, 356.453125, 30, 23.75],
              [1094.53125, 211, 166.34375, 30, 23.75],
              [1284.625, 211, 71.28125, 30, 23.75],
            ],
            documentWidth: 1366,
            parent: [239.078125, 1116.890625],
            row: [239.078125, 206, 1116.890625, 41],
          }
        : {
            columns: [
              [66.375, 221, 130.8125, 30, 0],
              [204.0625, 221, 103.265625, 30, 6.875],
              [314.203125, 221, 48.1875, 90, 6.875],
              [73.25, 311, 40, 30, 6.875],
            ],
            documentWidth: 420,
            parent: [66.375, 323.609375],
            row: [66.375, 216, 323.609375, 131],
          };
    expect(evidence.documentWidth).toBe(expected.documentWidth);
    expect([evidence.parent.left, evidence.parent.width]).toEqual(expected.parent);
    expect([evidence.row.left, evidence.row.top, evidence.row.width, evidence.row.height]).toEqual(
      expected.row,
    );
    expect(evidence.row).toMatchObject({
      borderBottomWidth: "1px",
      lineHeight: "30px",
      marginBottom: "5px",
      paddingBottom: "5px",
      paddingTop: "5px",
    });
    expect(evidence.pseudos).toEqual({
      after: { clear: "both", display: "table", lineHeight: "0px" },
      before: { display: "table", lineHeight: "0px" },
    });
    evidence.columns.forEach((column, index) => {
      const box = expected.columns[index]!;
      expect([column.left, column.top, column.width, column.height, column.marginLeft]).toEqual(
        box,
      );
      expect(column).toMatchObject({
        boxSizing: "border-box",
        display: "block",
        float: "left",
        minHeight: 30,
        paddingLeft: 20,
        paddingRight: 20,
      });
    });
    expect(evidence.fallback).toEqual({
      columns: evidence.columns,
      documentWidth: evidence.documentWidth,
      parent: evidence.parent,
      pseudos: evidence.pseudos,
      row: evidence.row,
    });
    await row.screenshot({
      path: resolve(outputDirectory, `stylex-site-project-list-listhead-${viewport.name}.png`),
    });
  }
});
