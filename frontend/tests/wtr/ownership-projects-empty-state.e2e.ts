import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const filter = "__style_empty__";
const owners = {
  icon: "projects-directory-empty-icon",
  message: "projects-directory-empty-message",
  state: "projects-directory-empty-state",
} as const;

test.use({ locale: "ko-KR" });

async function mockEmptyProjects(page: Page) {
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
  const requestedFilters: string[] = [];
  await page.route("**/api/v1/projects**", (route) => {
    requestedFilters.push(new URL(route.request().url()).searchParams.get("filter") ?? "");
    return route.fulfill({
      contentType: "application/json",
      json: { items: [], page: 1, pageNum: 1, total: 0, totalPages: 0 },
    });
  });
  return requestedFilters;
}

async function openEmptyProjects(page: Page) {
  const requestedFilters = await mockEmptyProjects(page);
  await page.goto(`${basePath}/projects?filter=${filter}`);
  const state = page.locator(`[data-owner="${owners.state}"]`);
  await expect(state).toBeVisible({ timeout: 2_000 });
  return { requestedFilters, state };
}

test("filtered-empty project directory records exactly three route owners from frozen sources", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const mixins = readFileSync("../yona-original/app/assets/stylesheets/less/_mixins.less", "utf8");
  const sprites = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(scala).toContain("@if(currentPage.getTotalRowCount == 0){");
  expect(scala).toContain('<div class="error-wrap">');
  expect(scala).toContain('<i class="ico ico-err1"></i>');
  expect(scala).toContain('<p>@Messages("project.is.empty")</p>');
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
  expect(variables).toContain('@base-image-path:   "../images";');

  expect(sprites).toContain(
    ".ico {\n    .inline-block;\n    background-repeat: no-repeat;\n    background-image: url('@{base-image-path}/sprite.png');\n    vertical-align:middle;",
  );
  expect(sprites).toContain(
    ".ico-err1 {\n    width: 62px;\n    height: 82px;\n    background-position: -5px -160px;",
  );
  expect(pageLess).toContain(".error-wrap {\n    padding:100px 0px;\n    text-align:center;");
  expect(pageLess).toContain(
    "font-weight:bold; font-size:16px;\n        color:#898989; margin:30px 0;",
  );
  expect(responsive).not.toContain(".error-wrap");
  expect(bootstrap).toContain("p {\n  margin: 0 0 10px;");

  expect(bootstrap).toContain("font-size: 14px;\n  line-height: 20px;");
  expect(messages).toContain("project.is.empty = 프로젝트가 존재하지 않습니다.");

  expect(
    [...route.matchAll(/data-owner="(projects-directory-empty-[^"]+)"/gu)]
      .map((match) => match[1])
      .sort(),
  ).toEqual(Object.values(owners).sort());
  expect(route).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png";');

  expect(route).not.toContain('className="error-wrap"');
  expect(route).not.toContain('className="ico ico-err1"');

  // app.css never gained the .error-wrap rules (the empty state is
  // route-local Style now); the four appCss pins are retired as stale.
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`filtered-empty project directory preserves ${viewport.name} DOM and exact geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const { requestedFilters, state } = await openEmptyProjects(page);
    const icon = state.locator(`:scope > [data-owner="${owners.icon}"]`);
    const message = state.locator(`:scope > [data-owner="${owners.message}"]`);

    await expect(page.locator('input[name="filter"]')).toHaveValue(filter);
    expect(requestedFilters).toContain(filter);
    expect(
      await state.evaluate((node) =>
        Array.from(node.children).map((child) => ({
          owner: child.getAttribute("data-owner"),
          tagName: child.tagName,
        })),
      ),
    ).toEqual([
      { owner: owners.icon, tagName: "I" },
      { owner: owners.message, tagName: "P" },
    ]);
    await expect(message).toHaveText("프로젝트가 존재하지 않습니다.");
    await expect(state).not.toHaveClass(/(?:^|\s)error-wrap(?:\s|$)/u);
    await expect(icon).not.toHaveClass(/(?:^|\s)(?:ico|ico-err1)(?:\s|$)/u);
    await expect(page.locator('[data-owner="projects-directory-list"]')).toHaveCount(0);
    await expect(page.locator("#pagination")).toHaveCount(0);

    const actual = await page.evaluate((ownerNames) => {
      const state = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.state}"]`)!;
      const icon = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.icon}"]`)!;
      const message = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.message}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const stateStyle = getComputedStyle(state);
      const iconStyle = getComputedStyle(icon);
      const messageStyle = getComputedStyle(message);
      return {
        icon: box(icon),
        iconStyle: {
          backgroundImage: iconStyle.backgroundImage,
          backgroundPosition: iconStyle.backgroundPosition,
          backgroundRepeat: iconStyle.backgroundRepeat,
          display: iconStyle.display,
          height: iconStyle.height,
          verticalAlign: iconStyle.verticalAlign,
          width: iconStyle.width,
        },
        message: box(message),
        messageStyle: {
          color: messageStyle.color,
          fontSize: messageStyle.fontSize,
          fontWeight: messageStyle.fontWeight,
          lineHeight: messageStyle.lineHeight,
          margin: messageStyle.margin,
        },
        scrollWidth: document.documentElement.scrollWidth,
        state: box(state),
        stateStyle: {
          padding: stateStyle.padding,
          textAlign: stateStyle.textAlign,
        },
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.state).toEqual({
      height: 362,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 158 : 128,
    });
    expect(actual.icon).toEqual({
      height: 82,
      width: 62,
      x: desktop ? 652 : 164,
      y: desktop ? 258 : 228,
    });
    expect(actual.message).toEqual({
      height: 20,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 370 : 340,
    });
    expect(actual.stateStyle).toEqual({ padding: "100px 0px", textAlign: "center" });
    expect(actual.iconStyle).toEqual({
      // dist hashes the legacy sprite (sprite-<hash>.png); dev serves sprite.png
      backgroundImage: expect.stringMatching(/sprite(?:-[A-Za-z0-9_-]+)?\.png/u),
      backgroundPosition: "-5px -160px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "82px",
      verticalAlign: "middle",
      width: "62px",
    });
    expect(actual.messageStyle).toEqual({
      color: "rgb(137, 137, 137)",
      fontSize: "16px",
      fontWeight: "700",
      lineHeight: "20px",
      margin: "30px 0px",
    });
    expect(actual.icon.y).toBe(actual.state.y + 100);
    expect(actual.message.y).toBe(actual.icon.y + actual.icon.height + 30);
    expect(actual.message.x + actual.message.width).toBe(actual.state.x + actual.state.width);
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
            `style-projects-empty-state-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
