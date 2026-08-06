import { readFileSync, readFile } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// wtr-compat readFileSync's binary branch sets responseType=arraybuffer on a
// synchronous XHR, which documents reject (InvalidAccessError) — bucket-1 gap
// reported to main. readFile (async fetch) returns the PNG bytes; btoa keeps
// the original data-URL semantics.
const avatarDataUrl = `data:image/png;base64,${btoa(
  String.fromCharCode(
    ...((await readFile(
      resolve("src/assets/legacy/default-avatar-34.png"),
    )) as unknown as Uint8Array),
  ),
)}`;
const owners = {
  inner: "projects-directory-page",
  outer: "projects-directory-page-wrap",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: null,
    defaultLandingPath: "/",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  const projectRequests: string[] = [];
  await page.route("**/api/v1/projects**", (route) => {
    projectRequests.push(new URL(route.request().url()).pathname);
    return route.fulfill({
      contentType: "application/json",
      json: {
        items: ["sample", "svnplayground", "portal"].map((projectName) => ({
          createdLabel: "07-07",
          memberCount: 1,
          members: [
            {
              avatarUrl: avatarDataUrl,
              loginId: projectName === "sample" ? "alice" : "admin",
              userLabel: projectName === "sample" ? "Alice Kim" : "Site Admin",
            },
          ],
          overview:
            projectName === "svnplayground"
              ? "Parity seed Subversion project for localhost checks"
              : `Parity seed project for the ${projectName === "sample" ? "alice" : "admin"} workspace`,
          ownerName: projectName === "sample" ? "alice" : "admin",
          projectName,
          projectScope: "public",
          watchCount: 1,
        })),
        page: 1,
        pageNum: 1,
        total: 3,
        totalPages: 1,
      },
    });
  });
  return projectRequests;
}

async function open(page: Page) {
  const projectRequests = await mockProjects(page);
  await page.goto(`${basePath}/projects`);
  const outer = page.locator(`[data-stylex-owner="${owners.outer}"]`);
  await expect(outer).toBeVisible({ timeout: 2_000 });
  return { outer, projectRequests };
}

test("projects page wrappers record exactly two owners and exclude unmatched descendants", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const appCss = readFileSync("src/app.css", "utf8");

  expect(scala).toContain('<div class="page-wrap-outer">\n    <div class="project-page-wrap">');
  expect(scala).toContain('<div class="search-wrap">');
  expect(scala).toContain('<ul class="all-projects">');
  expect(scala).toContain('<div id="pagination"></div>');
  expect(siteLayout).toContain('@layout(Messages(title))(""){');
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
  expect(siteLayout).toContain("@common.footer()");
  expect(layout).toContain('<div id="main" class="main">');
  expect(yobi.trim().split("\n")).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(pageLess).toContain(".page-wrap-outer {\n    min-height: 450px;\n    margin-top: 10px;");
  expect(pageLess).toContain(".project-page-wrap {\n    margin:20px auto 0;");
  expect(pageLess).toContain("label {\n      display: inline-block;");
  expect(pageLess).toContain("h4 {\n        padding:10px 0;\n        line-height: 30px;");
  expect(pageLess).toContain(".nav-tabs > li {\n          margin-bottom: -2px;");
  expect(responsive).toContain("@media all and (max-width: 720px) {");
  expect(responsive).toContain(
    ".page-wrap-outer {\n    min-width: 10px !important;\n    padding: 0 !important;",
  );
  expect(responsive).toContain("@media all {\n  .attachment-files {");
  expect(responsive).toContain(
    ".page-wrap-outer {\n    padding: 0 10px;\n    width: 100%;\n    box-sizing: border-box;",
  );
  expect(responsive).toContain(
    ".project-page-wrap {\n    width: 100%;\n    margin-top: 5px !important;",
  );
  expect(responsive).toContain(
    ".project-breadcrumb {\n      font-size: 1.5em;\n      font-weight: bold;",
  );

  expect(
    [...route.matchAll(/data-stylex-owner="(projects-directory-page(?:-wrap)?)"/gu)]
      .map((match) => match[1])
      .sort(),
  ).toEqual(Object.values(owners).sort());
  expect(route).toContain("[globalBreakpoints.mobile]");
  expect(route).not.toContain('className="page-wrap-outer"');
  expect(route).not.toContain('className="project-page-wrap"');
  expect(route).not.toContain("globalColors.");
  expect(appCss).toContain(".page-wrap-outer {");
  expect(appCss).toContain(".project-page-wrap {");
  expect(appCss).toContain(".project-page-wrap label {");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`projects page wrappers preserve ${viewport.name} direct nesting and exact geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const { outer, projectRequests } = await open(page);
    const inner = outer.locator(`:scope > [data-stylex-owner="${owners.inner}"]`);
    const list = inner.locator(':scope > [data-stylex-owner="projects-directory-list"]');

    await expect(inner).toHaveCount(1);
    await expect(outer).not.toHaveClass(/(?:^|\s)page-wrap-outer(?:\s|$)/u);
    await expect(inner).not.toHaveClass(/(?:^|\s)project-page-wrap(?:\s|$)/u);
    await expect(inner.locator("label, h4, .nav-tabs, .project-breadcrumb")).toHaveCount(0);
    await expect(list.locator(':scope > [data-stylex-owner="projects-directory-row"]')).toHaveCount(
      3,
    );
    await expect(list.locator('[data-stylex-owner="projects-directory-header"]')).toHaveText([
      "sample",
      "svnplayground",
      "portal",
    ]);
    expect(projectRequests).toContain(`${basePath}/api/v1/projects`);

    const actual = await page.evaluate((ownerNames) => {
      const outer = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.outer}"]`,
      )!;
      const inner = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.inner}"]`,
      )!;
      const search = inner.querySelector<HTMLElement>(
        ':scope > [data-stylex-owner="projects-directory-search-wrap"]',
      )!;
      const list = inner.querySelector<HTMLElement>(
        ':scope > [data-stylex-owner="projects-directory-list"]',
      )!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      };
      const outerStyle = getComputedStyle(outer);
      const innerStyle = getComputedStyle(inner);
      return {
        inner: box(inner),
        innerStyle: {
          backgroundColor: innerStyle.backgroundColor,
          margin: innerStyle.margin,
          width: innerStyle.width,
        },
        list: box(list),
        outer: box(outer),
        outerStyle: {
          backgroundColor: outerStyle.backgroundColor,
          boxSizing: outerStyle.boxSizing,
          margin: outerStyle.margin,
          minHeight: outerStyle.minHeight,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        scrollWidth: document.documentElement.scrollWidth,
        search: box(search),
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.outer).toEqual({
      bottom: desktop ? 558 : 660,
      height: desktop ? 450 : 552,
      right: desktop ? 1366 : 390,
      width: desktop ? 1366 : 390,
      x: 0,
      y: 108,
    });
    expect(actual.inner).toEqual({
      bottom: desktop ? 478 : 660,
      height: desktop ? 370 : 552,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: 108,
    });
    expect(actual.search).toEqual({
      bottom: desktop ? 158 : 128,
      height: desktop ? 50 : 20,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: 108,
    });
    expect(actual.list).toEqual({
      bottom: desktop ? 431 : 611,
      height: desktop ? 273 : 453,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: 158,
    });
    expect(actual.outerStyle).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      boxSizing: "border-box",
      margin: "10px 0px 0px",
      minHeight: "450px",
      minWidth: desktop ? "0px" : "10px",
      padding: desktop ? "0px 10px" : "0px",
      width: desktop ? "1366px" : "390px",
    });
    expect(actual.innerStyle).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      margin: "5px 0px 0px",
      width: desktop ? "1346px" : "390px",
    });
    expect(actual.inner.x).toBe(actual.outer.x + (desktop ? 10 : 0));
    expect(actual.inner.right).toBe(actual.outer.right - (desktop ? 10 : 0));
    expect(actual.search.x).toBe(actual.inner.x);
    expect(actual.list.right).toBe(actual.inner.right);
    expect(actual.scrollWidth).toBe(viewport.width);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `stylex-projects-page-wrappers-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
