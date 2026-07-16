import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const avatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  input: "projects-directory-pagination-input",
  next: "projects-directory-pagination-next-icon",
  previous: "projects-directory-pagination-prev-icon",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page, totalPages = 1) {
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
  await page.route("**/api/v1/projects**", (route) => {
    const requestPage = Number(new URL(route.request().url()).searchParams.get("pageNum") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdLabel: "07-07",
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
          },
          {
            createdLabel: "07-07",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            lastPushedLabel: "5일 전",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: requestPage,
        pageNum: requestPage,
        total: 4 * totalPages,
        totalPages,
      },
    });
  });
}

async function open(page: Page, totalPages = 1, currentPage = 1) {
  await mockProjects(page, totalPages);
  const query = currentPage === 1 ? "" : `?pageNum=${currentPage}`;
  await page.goto(`${basePath}/projects${query}`);
  await expect(page.locator('[data-stylex-owner="projects-directory-list"]')).toBeVisible();
}

test("pagination input/icon wave owns exactly three targets and preserves excluded fallback", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme = readFileSync("src/routes/-projects.stylex.ts", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const mixins = readFileSync("../yona-original/app/assets/stylesheets/less/_mixins.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const sprites = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const paginationJs = readFileSync("../yona-original/public/javascripts/yona-lib.js", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(scala).toContain('<div id="pagination"></div>');
  expect(scala).toContain(
    'yobi.Pagination.update($("#pagination"), @currentPage.getTotalPageCount);',
  );
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
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
  expect(variables).toContain("@orange : #F36C22;");
  expect(variables).toContain("@primary         : @orange;");
  expect(mixins).toContain(".box-shadow(@shadow: 0 1px 2px rgba(0, 0, 0, .25))");
  expect(mixins).toContain('.inline-block(@important: "")');
  expect(common).toContain(".page-navigation-wrap {");
  expect(common).toContain(".input-mini {\n                margin:0; width:30px;");
  expect(common).toContain(
    "text-align:center; font-weight:bold;\n                border:1px solid #eee;",
  );
  expect(common).toContain(".box-shadow(inset -1px -1px 2px rgba(0,0,0,0.1));");
  expect(common).toContain("color:@primary; border-color:@primary;");
  expect(common).toContain(".nospinner { -moz-appearance:textfield; }");
  expect(sprites).toContain("background-image: url('@{base-image-path}/sprite.png');");
  expect(sprites).toContain(".btn-pg-next {\n    width: 6px;\n    height: 9px;");
  expect(sprites).toContain("background-position: -146px -139px;");
  expect(sprites).toContain("background-position: -23px -13px;");
  expect(sprites).toContain(".btn-pg-prev {\n    width: 6px;\n    height: 9px;");
  expect(sprites).toContain("background-position: -136px -139px;");
  expect(sprites).toContain("background-position: -164px -2px;");
  expect(pageLess).toContain(".page-nums {\n    margin-left: -120px !important;");
  expect(responsive).toContain(".page-nums {\n    margin-left: 0;");
  expect(responsive).toContain('input[type="number"],\n  input[type="password"],');
  expect(yobiUi).toContain('input[type="week"], input[type="number"], input[type="email"]');
  expect(yobiUi).toContain(".box-shadow(none);\n    .border-radius(2px);");
  expect(bootstrap).toContain(".input-mini {\n  width: 60px;");
  expect(bootstrap).toContain('input[type="number"],');
  expect(bootstrap).toContain("height: 20px;\n  padding: 4px 6px;");
  expect(bootstrapResponsive).toContain("input,\n  textarea,\n  .uneditable-input {");
  expect(paginationJs).toContain('class="input-mini nospinner"');
  expect(paginationJs).toContain("ico btn-pg-prev off");
  expect(paginationJs).toContain("ico btn-pg-next off");
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");

  expect(route.match(/data-stylex-owner="projects-directory-pagination-input"/gu)).toHaveLength(1);
  expect(route.match(/data-stylex-owner="projects-directory-pagination-prev-icon"/gu)).toHaveLength(
    2,
  );
  expect(route.match(/data-stylex-owner="projects-directory-pagination-next-icon"/gu)).toHaveLength(
    2,
  );
  expect(route).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png";');
  expect(route).toContain('"--projects-directory-pagination-sprite": `url(${legacySpriteUrl})`');
  expect(route).toContain("projectsDirectoryColors.paginationInputBorder");
  expect(route).toContain("projectsDirectoryColors.paginationAccent");
  expect(route).toContain("projectsDirectoryColors.paginationInputInteractiveShadow");
  expect(route).not.toContain('className="input-mini nospinner"');
  expect(route).not.toContain('className="ico btn-pg-prev');
  expect(route).not.toContain('className="ico btn-pg-next');
  expect(route).toContain('<span className="off">{t("button.prevPage")}</span>');
  expect(route).toContain('<span className="off">{t("button.nextPage")}</span>');
  expect(route).not.toContain("globalColors.");
  expect(theme).toContain('paginationInputBorder: "#eeeeee"');
  expect(theme).toContain('paginationAccent: "#f36c22"');
  expect(theme).toContain(
    'paginationInputInteractiveShadow: "inset -1px -1px 2px rgba(0, 0, 0, 0.1)"',
  );
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`default one-page pagination preserves ${viewport.name} disabled DOM and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const pagination = page.locator("#pagination");
    const input = pagination.locator(`[data-stylex-owner="${owners.input}"]`);
    const previous = pagination.locator(`[data-stylex-owner="${owners.previous}"]`);
    const next = pagination.locator(`[data-stylex-owner="${owners.next}"]`);

    await expect(pagination).toHaveClass("page-navigation-wrap");
    await expect(pagination.locator(":scope > ul.page-nums > li.page-num")).toHaveCount(5);
    await expect(input).toHaveAttribute("name", "pageNum");
    await expect(input).toHaveAttribute("type", "number");
    await expect(input).toHaveAttribute("pattern", "[0-9]*");
    await expect(input).toHaveAttribute("min", "1");
    await expect(input).toHaveAttribute("max", "1");
    await expect(input).toHaveValue("1");
    await expect(input).not.toHaveClass(/(?:^|\s)(?:input-mini|nospinner)(?:\s|$)/u);
    await expect(previous).toHaveAttribute("data-disabled", "true");
    await expect(next).toHaveAttribute("data-disabled", "true");
    await expect(previous).not.toHaveClass(/(?:^|\s)(?:ico|btn-pg-prev|off)(?:\s|$)/u);
    await expect(next).not.toHaveClass(/(?:^|\s)(?:ico|btn-pg-next|off)(?:\s|$)/u);
    await expect(previous.locator("xpath=following-sibling::span[1]")).toHaveClass("off");
    await expect(previous.locator("xpath=following-sibling::span[1]")).toHaveText("이전 페이지");
    await expect(next.locator("xpath=preceding-sibling::span[1]")).toHaveClass("off");
    await expect(next.locator("xpath=preceding-sibling::span[1]")).toHaveText("다음 페이지");
    await expect(pagination.locator("a")).toHaveCount(0);

    const actual = await page.evaluate((ownerNames) => {
      const pagination = document.querySelector<HTMLElement>("#pagination")!;
      const input = document.querySelector<HTMLInputElement>(
        `[data-stylex-owner="${ownerNames.input}"]`,
      )!;
      const previous = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.previous}"]`,
      )!;
      const next = document.querySelector<HTMLElement>(`[data-stylex-owner="${ownerNames.next}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const inputStyle = getComputedStyle(input);
      const iconStyle = (icon: HTMLElement) => {
        const style = getComputedStyle(icon);
        return {
          backgroundImage: style.backgroundImage,
          backgroundPosition: style.backgroundPosition,
          backgroundRepeat: style.backgroundRepeat,
          display: style.display,
          height: style.height,
          verticalAlign: style.verticalAlign,
          width: style.width,
        };
      };
      return {
        input: box(input),
        inputStyle: {
          backgroundColor: inputStyle.backgroundColor,
          borderColor: inputStyle.borderColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          color: inputStyle.color,
          fontSize: inputStyle.fontSize,
          fontWeight: inputStyle.fontWeight,
          height: inputStyle.height,
          lineHeight: inputStyle.lineHeight,
          margin: inputStyle.margin,
          padding: inputStyle.padding,
          textAlign: inputStyle.textAlign,
          verticalAlign: inputStyle.verticalAlign,
          width: inputStyle.width,
        },
        next: box(next),
        nextMarginLeft: getComputedStyle(next).marginLeft,
        nextStyle: iconStyle(next),
        pagination: box(pagination),
        previous: box(previous),
        previousMarginRight: getComputedStyle(previous).marginRight,
        previousStyle: iconStyle(previous),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.pagination).toEqual({
      height: 30,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 585 : 795,
    });
    expect(actual.input).toEqual({
      height: 30,
      width: 44,
      x: desktop ? 581.375 : 93.375,
      y: desktop ? 585 : 795,
    });
    expect(actual.previous).toEqual({
      height: 9,
      width: 6,
      x: desktop ? 499.640625 : 11.640625,
      y: desktop ? 595.5 : 805.5,
    });
    expect(actual.next).toEqual({
      height: 9,
      width: 6,
      x: desktop ? 740.34375 : 252.34375,
      y: desktop ? 595.5 : 805.5,
    });
    expect(actual.inputStyle).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderColor: "rgb(238, 238, 238)",
      borderRadius: "2px",
      borderStyle: "solid",
      borderWidth: "1px",
      color: "rgb(85, 85, 85)",
      fontSize: desktop ? "12px" : "16px",
      fontWeight: "700",
      height: "20px",
      lineHeight: "20px",
      margin: "0px",
      padding: "4px 6px",
      textAlign: "center",
      verticalAlign: "middle",
      width: "30px",
    });
    expect(actual.previousStyle).toEqual({
      backgroundImage: expect.stringContaining("sprite.png"),
      backgroundPosition: "-164px -2px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "9px",
      verticalAlign: "middle",
      width: "6px",
    });
    expect(actual.nextStyle).toEqual({
      backgroundImage: expect.stringContaining("sprite.png"),
      backgroundPosition: "-23px -13px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "9px",
      verticalAlign: "middle",
      width: "6px",
    });
    expect(actual.previousMarginRight).toBe("10px");
    expect(actual.nextMarginLeft).toBe("10px");
    expect(actual.previous.y).toBeGreaterThan(actual.pagination.y);
    expect(actual.next.y + actual.next.height).toBeLessThan(
      actual.pagination.y + actual.pagination.height,
    );
    expect(actual.input.y + actual.input.height).toBeLessThanOrEqual(
      actual.pagination.y + actual.pagination.height,
    );
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
            `stylex-projects-pagination-input-icons-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);

    await input.hover();
    await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
    await input.focus();
    await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
    await input.evaluate((element) => {
      const nativeSelect = element.select.bind(element);
      element.select = () => {
        element.dataset.selectCalled = "true";
        nativeSelect();
      };
    });
    await input.click();
    await expect(input).toHaveAttribute("data-select-called", "true");
  });

test("active pagination icons keep sprite positions and existing SPA navigation", async ({
  page,
}) => {
  await open(page, 3, 2);
  const pagination = page.locator("#pagination");
  const previous = pagination.locator(`[data-stylex-owner="${owners.previous}"]`);
  const next = pagination.locator(`[data-stylex-owner="${owners.next}"]`);
  const input = pagination.locator(`[data-stylex-owner="${owners.input}"]`);
  await expect(previous).toHaveAttribute("data-disabled", "false");
  await expect(next).toHaveAttribute("data-disabled", "false");
  await expect(previous).toHaveCSS("background-position", "-136px -139px");
  await expect(next).toHaveCSS("background-position", "-146px -139px");
  await expect(previous.locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=1`,
  );
  await expect(next.locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=3`,
  );
  for (const link of [
    previous.locator("xpath=ancestor::a[1]"),
    next.locator("xpath=ancestor::a[1]"),
  ]) {
    await expect(link).not.toHaveAttribute("aria-current");
    await expect(link).not.toHaveAttribute("data-status");
  }
  await next.locator("xpath=ancestor::a[1]").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(input).toHaveValue("3");
  await expect(next).toHaveAttribute("data-disabled", "true");
  await input.fill("0");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect(input).toHaveValue("1");
});
