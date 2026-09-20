import { readFile } from "../wtr-compat.ts";
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
  await page.clock.setFixedTime("2026-07-17T12:00:00Z");
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
          createdAt: "2026-07-07T12:00:00Z",
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
  const outer = page.locator(`[data-owner="${owners.outer}"]`);
  await expect(outer).toBeVisible({ timeout: 2_000 });
  return { outer, projectRequests };
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`projects page wrappers preserve ${viewport.name} direct nesting and exact geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const { outer, projectRequests } = await open(page);
    const inner = outer.locator(`:scope > [data-owner="${owners.inner}"]`);
    const list = inner.locator(':scope > [data-owner="projects-directory-list"]');

    await expect(inner).toHaveCount(1);
    await expect(outer).not.toHaveClass(/(?:^|\s)page-wrap-outer(?:\s|$)/u);
    await expect(inner).not.toHaveClass(/(?:^|\s)project-page-wrap(?:\s|$)/u);
    await expect(inner.locator("label, h4, .nav-tabs, .project-breadcrumb")).toHaveCount(0);
    await expect(list.locator(':scope > [data-owner="projects-directory-row"]')).toHaveCount(3);
    await expect(list.locator('[data-owner="projects-directory-header"]')).toHaveText([
      "sample",
      "svnplayground",
      "portal",
    ]);
    expect(projectRequests).toContain(`${basePath}/api/v1/projects`);

    const actual = await page.evaluate((ownerNames) => {
      const outer = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.outer}"]`)!;
      const inner = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.inner}"]`)!;
      const search = inner.querySelector<HTMLElement>(
        ':scope > [data-owner="projects-directory-search-wrap"]',
      )!;
      const list = inner.querySelector<HTMLElement>(
        ':scope > [data-owner="projects-directory-list"]',
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
      bottom: desktop ? 558 : 661,
      height: desktop ? 450 : 553,
      right: desktop ? 1366 : 390,
      width: desktop ? 1366 : 390,
      x: 0,
      y: 108,
    });
    expect(actual.inner).toEqual({
      // F5 dist-truth (2026-08-11): the desktop inner column is 3px taller.
      bottom: desktop ? 481 : 661,
      height: desktop ? 373 : 553,
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
      // F5 dist-truth (2026-08-11): the mobile list sits at the same 158px
      // top as the desktop list (shifted 30px down from the stale pin).
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
            `style-projects-page-wrappers-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
