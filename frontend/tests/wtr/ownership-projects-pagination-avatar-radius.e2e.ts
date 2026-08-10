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
  avatar: "projects-directory-member-avatar",
  avatarImage: "projects-directory-member-avatar-image",
  list: "projects-directory-pagination-list",
  pagination: "projects-directory-pagination",
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
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
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
    }),
  );
}

async function open(page: Page) {
  await mockProjects(page);
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${owners.pagination}"]`)).toBeVisible({
    timeout: 2_000,
  });
}

test("projects pagination/avatar residual wave records frozen cascade and retires last classes", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const paginationJs = readFileSync(
    "../yona-original/public/javascripts/common/yobi.Pagination.js",
    "utf8",
  );
  const appCss = readFileSync("src/app.css", "utf8");

  expect(scala).toContain(
    'class="avatar-wrap">\n                                    <img src="@member.avatarUrl" alt="@member.name">',
  );
  expect(scala).toContain('<div id="pagination"></div>');
  expect(scala).toContain(
    'yobi.Pagination.update($("#pagination"), @currentPage.getTotalPageCount);',
  );
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
  expect(common).toContain(".page-nums {\n        margin: 0;");
  expect(common).toContain(".avatar-wrap {\n    width:32px; height:32px;");
  expect(pageLess).toContain(".page-nums {\n    margin-left: -120px !important;");
  expect(pageLess).toContain(".avatar-wrap { margin-right:3px; margin-bottom:3px; }");
  expect(responsive).toContain(".page-nums {\n    margin-left: 0;");
  expect(yobiUi).toContain("background:#ddd;\n    .border-radius(3px) !important;");
  expect(paginationJs).toContain("var welPageList = $('<ul class=\"page-nums\">');");

  const paginationListStyle = route.slice(
    route.indexOf("directoryPaginationList: {"),
    route.indexOf("directoryPaginationItem: {"),
  );
  const memberAvatarStyle = route.slice(
    route.indexOf("directoryMemberAvatar: {"),
    route.indexOf("directoryStatsIcon: {"),
  );

  expect(route.match(/data-owner="projects-directory-pagination-list"/gu)).toHaveLength(1);
  expect(route.match(/data-owner="projects-directory-member-avatar"/gu)).toHaveLength(1);
  expect(route).not.toContain(
    "className={`page-nums ${directoryPaginationListStyleProps.className",
  );
  expect(route).not.toContain(
    "className={`avatar-wrap ${directoryMemberAvatarStyleProps.className",
  );
  expect(route).not.toContain(
    "className: `avatar-wrap ${directoryMemberAvatarStyleProps.className",
  );
  // app.css never kept a standalone `.page-nums` rule after the pagination
  // fallback bridge was retired (route-local Style now owns the list); the
  // appCss pin is retired as stale, mirroring the empty-state precedent.
  expect(appCss).toContain(".avatar-wrap {");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`projects pagination/avatar residual wave preserves ${viewport.name} output`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const pagination = page.locator(`[data-owner="${owners.pagination}"]`);
    const list = pagination.locator(`:scope > [data-owner="${owners.list}"]`);
    const avatars = page.locator(`[data-owner="${owners.avatar}"]`);
    const images = avatars.locator(`:scope > [data-owner="${owners.avatarImage}"]`);

    await expect(list).not.toHaveClass(/(?:^|\s)page-nums(?:\s|$)/u);
    await expect(avatars).toHaveCount(3);
    expect(
      await avatars.evaluateAll((nodes) =>
        nodes.every((node) => !node.classList.contains("avatar-wrap")),
      ),
    ).toBe(true);
    expect(
      await avatars.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ).toEqual([`${basePath}/alice`, `${basePath}/admin`, `${basePath}/admin`]);
    expect(
      await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt"))),
    ).toEqual(["Alice Kim", "Site Admin", "Site Admin"]);
    expect(
      await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src"))),
    ).toEqual([avatarDataUrl, avatarDataUrl, avatarDataUrl]);
    await expect(
      list.locator(':scope > [data-owner="projects-directory-pagination-item"]'),
    ).toHaveCount(5);
    await expect(list.locator('input[name="pageNum"]')).toHaveValue("1");
    await expect(list).toContainText("이전 페이지");
    await expect(list).toContainText("다음 페이지");

    const actual = await page.evaluate((ownerNames) => {
      const list = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.list}"]`)!;
      const avatars = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.avatar}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const listStyle = getComputedStyle(list);
      return {
        avatars: avatars.map((avatar) => {
          const style = getComputedStyle(avatar);
          return {
            box: box(avatar),
            style: {
              backgroundColor: style.backgroundColor,
              borderRadius: style.borderRadius,
              display: style.display,
              margin: style.margin,
              overflow: style.overflow,
              verticalAlign: style.verticalAlign,
            },
          };
        }),
        list: box(list),
        listMargin: listStyle.margin,
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.list).toEqual({
      height: 30,
      width: 236.703125,
      x: desktop ? 504.640625 : 16.640625,
      y: desktop ? 451 : 631,
    });
    expect(actual.listMargin).toBe("0px 0px 0px -120px");
    expect(actual.avatars.map(({ box }) => box)).toEqual(
      (desktop ? [173, 264, 355] : [238, 329, 480]).map((y) => ({
        height: 32,
        width: 32,
        x: desktop ? 1321 : 355,
        y,
      })),
    );
    for (const avatar of actual.avatars) {
      expect(avatar.style).toEqual({
        backgroundColor: "rgb(221, 221, 221)",
        borderRadius: "3px",
        display: "inline-block",
        margin: "0px 3px 3px 0px",
        overflow: "hidden",
        verticalAlign: "middle",
      });
    }
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
            `style-projects-pagination-avatar-radius-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
