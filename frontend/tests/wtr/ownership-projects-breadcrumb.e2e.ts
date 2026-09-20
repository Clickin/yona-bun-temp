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
  await page.clock.setFixedTime("2026-07-17T12:00:00Z");
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
            createdAt: "2026-07-17T12:00:00Z",
            labels: [],
            lastPushedAt: "2026-07-17T12:00:00Z",
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
      y: 93,
    });
    expect(metrics.boxes.inner).toEqual({ height, width: innerWidth, x: 10, y: 93 });
    expect(metrics.boxes.title).toEqual(metrics.boxes.inner);
    expect(metrics.boxes.page.y).toBe(viewport.name === "desktop" ? 151 : 181);
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
