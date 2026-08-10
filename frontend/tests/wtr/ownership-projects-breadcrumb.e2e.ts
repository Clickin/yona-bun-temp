import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  inner: "projects-breadcrumb-inner",
  outer: "projects-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openProjects(page: Page) {
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
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdLabel: "방금 전",
            createdTitle: "2026-07-17",
            labels: [],
            lastPushedLabel: "방금 전",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 1,
            overview: "샘플 프로젝트",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 2,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${owners.outer}"]`)).toBeVisible();
}

test("projects breadcrumb records the two future wrapper owners from frozen legacy sources", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const list = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  const koMessages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(list).toContain("@siteLayout(message, utils.MenuType.PROJECTS)");
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(list).toContain('<div class="site-breadcrumb-outer">');
  expect(list).toContain('<div class="site-breadcrumb-inner">');
  expect(list).toContain('<div class="title_area">');
  for (const key of ["project.public", "title.projectList", "title.organization.list"]) {
    expect(messages).toMatch(new RegExp(`^${key.replaceAll(".", "\\.")}\\s*=`, "mu"));
    expect(koMessages).toMatch(new RegExp(`^${key.replaceAll(".", "\\.")}\\s*=`, "mu"));
  }
  for (const imported of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_page.less",
    "_responsive.less",
    "_yobiUI.less",
    "_override.less",
  ])
    expect(yobi).toContain(imported);
  expect(pageLess).toContain(".site-breadcrumb-outer {");
  expect(pageLess).toContain("margin:0 auto;");
  expect(responsive).toContain("min-width: 10px !important;");
  expect(responsive).toContain("padding: 0 10px;");
  expect(bootstrap).toContain(".nav-tabs");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`projects breadcrumb preserves exact ${viewport.name} geometry and tabs`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjects(page);
    const outer = page.locator(`[data-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-owner="${owners.inner}"]`);
    await expect(outer.locator(`:scope > [data-owner="${owners.inner}"]`)).toHaveCount(1);
    const titleArea = inner.locator(":scope > [data-projects-directory-tabs-scope]");
    await expect(titleArea).toHaveCount(1);
    const tabs = titleArea.locator(':scope > [data-owner="projects-directory-tabs-list"]');
    await expect(tabs).toHaveCount(1);
    const items = tabs.locator(':scope > [data-owner="projects-directory-tabs-item"]');
    await expect(items).toHaveCount(2);
    const links = items.locator(':scope > [data-owner="projects-directory-tabs-link"]');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText("공개 프로젝트 목록");
    await expect(links.nth(1)).toHaveText("그룹 목록");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const metrics = await page.evaluate((ownerNames) => {
      const outer = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.outer}"]`)!;
      const inner = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.inner}"]`)!;
      const title = inner.querySelector<HTMLElement>(
        ":scope > [data-projects-directory-tabs-scope]",
      )!;
      const pageOuter = outer.nextElementSibling as HTMLElement;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const style = getComputedStyle(outer);
      return {
        boxes: { inner: box(inner), outer: box(outer), page: box(pageOuter), title: box(title) },
        outer: {
          borderBottom: style.borderBottom,
          borderLeft: style.borderLeft,
          borderRight: style.borderRight,
          borderTop: style.borderTop,
          boxSizing: style.boxSizing,
          minWidth: style.minWidth,
          padding: style.padding,
          width: style.width,
        },
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const height = viewport.name === "desktop" ? 38 : 68;
    const innerWidth = viewport.width - 20;
    expect(metrics.boxes.outer).toEqual({
      height,
      width: viewport.width,
      x: 0,
      y: viewport.name === "desktop" ? 93 : 116,
    });
    expect(metrics.boxes.inner).toEqual({ height, width: innerWidth, x: 10, y: 116 });
    expect(metrics.boxes.title).toEqual(metrics.boxes.inner);
    expect(metrics.boxes.page.y).toBe(viewport.name === "desktop" ? 151 : 204);
    expect(metrics.outer).toEqual({
      borderBottom: "0px none rgb(51, 51, 51)",
      borderLeft: "0px none rgb(51, 51, 51)",
      borderRight: "0px none rgb(51, 51, 51)",
      borderTop: "0px none rgb(51, 51, 51)",
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(metrics.scrollWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-projects-breadcrumb-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
