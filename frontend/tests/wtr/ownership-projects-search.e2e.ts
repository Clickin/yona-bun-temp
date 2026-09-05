import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  bar: "projects-directory-search-bar",
  button: "projects-directory-search-button",
  container: "projects-directory-search-container",
  form: "projects-directory-search-form",
  input: "projects-directory-search-input",
  wrap: "projects-directory-search-wrap",
} as const;
test.use({ locale: "ko-KR" });

async function open(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: basePath,
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
  await expect(page.locator(`[data-owner="${owners.wrap}"]`)).toBeVisible();
}

test("search strip records frozen sources and six ownership boundaries", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const homeRoute = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const ui = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  expect(scala).toContain('<div class="search-wrap">');
  expect(scala).toContain('<div id="search" class="pull-left">');
  expect(scala).toContain('<div class="search-bar">');
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  for (const imported of ["_page.less", "_responsive.less", "_yobiUI.less"])
    expect(yobi).toContain(imported);
  expect(pageLess).toContain(".search-wrap {");
  expect(pageLess).toContain(".nav-tabs > li {");
  expect(pageLess).toContain("margin-bottom: -2px;");
  expect(pageLess).toContain(".admin-logged-in-affix {");
  expect(pageLess).toContain("font-size:20px;");
  expect(ui).toContain("label, input, button, select, textarea {");
  expect(ui).toContain("font-size:12px;");
  expect(ui).toContain("padding:4px 25px 4px 5px;");
  expect(ui).toContain("width:350px;");
  expect(ui).toContain("position:absolute;");
  expect(responsive).toContain("height: inherit !important;");
  expect(responsive).toContain("width: inherit !important;");
  expect(responsive).toContain('input[type="text"],');
  expect(responsive).toContain("font-size: 16px !important;");
  expect(bootstrap).toContain(".nav-tabs > li {\n  margin-bottom: -1px;\n}");
  expect(bootstrap).toContain("body {");
  expect(bootstrap).toContain("line-height: 20px;");
  expect(bootstrap).toContain("vertical-align: middle;");
  expect(bootstrap).toContain("button,\ninput {\n  *overflow: visible;\n  line-height: normal;\n}");
  expect(bootstrap).toContain(
    'button,\nhtml input[type="button"],\ninput[type="reset"],\ninput[type="submit"] {\n  cursor: pointer;',
  );
  expect(bootstrap).toContain(".pull-left {");

  expect(messages).toContain("site.project.filter = 키워드로 프로젝트 찾기");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).toContain('import "../yobicon-font.css";');
  expect(homeRoute).toContain('data-owner="site-admin-affix"');
  expect(route).not.toMatch(/border(?:Top|Right|Bottom|Left)?Color:\s*"currentColor"/u);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`search strip preserves exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const wrap = page.locator(`[data-owner="${owners.wrap}"]`);
    const container = wrap.locator(`:scope > [data-owner="${owners.container}"]`);
    const form = container.locator(`:scope > form[data-owner="${owners.form}"]`);
    const bar = form.locator(`:scope > [data-owner="${owners.bar}"]`);
    const input = bar.locator(`:scope > [data-owner="${owners.input}"]`);
    const button = bar.locator(`:scope > [data-owner="${owners.button}"]`);
    await expect(container).toHaveAttribute("id", "search");
    await expect(form).toHaveAttribute("action", `${basePath}/projects`);
    await expect(form).toHaveAttribute("method", "get");
    await expect(input).toHaveAttribute("name", "filter");
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveAttribute("placeholder", "키워드로 프로젝트 찾기");
    await expect(input).toBeFocused();
    await expect(button).toHaveAttribute("type", "submit");
    const icon = button.locator(':scope > i[data-owner="projects-directory-search-icon"]');
    await expect(icon).toHaveCount(1);
    await expect(icon).not.toHaveClass(/(?:^|\s)yobicon-search(?:\s|$)/u);
    const metrics = await page.evaluate((o) => {
      const get = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const wrap = get(o.wrap),
        container = get(o.container),
        bar = get(o.bar),
        input = get(o.input),
        button = get(o.button);
      const form = bar.parentElement!,
        icon = button.querySelector<HTMLElement>("i")!;
      const box = (e: HTMLElement) => {
        const r = e.getBoundingClientRect();
        return { height: r.height, width: r.width, x: r.x, y: r.y };
      };
      const style = (e: HTMLElement) => getComputedStyle(e);
      return {
        boxes: {
          wrap: box(wrap),
          container: box(container),
          form: box(form),
          bar: box(bar),
          input: box(input),
          button: box(button),
          icon: box(icon),
        },
        wrap: {
          clear: style(wrap).clear,
          height: style(wrap).height,
          padding: style(wrap).padding,
        },
        container: { float: style(container).cssFloat },
        form: { display: style(form).display, marginBottom: style(form).marginBottom },
        bar: {
          background: style(bar).backgroundColor,
          border: style(bar).border,
          borderRadius: style(bar).borderRadius,
          height: style(bar).height,
          lineHeight: style(bar).lineHeight,
          padding: style(bar).padding,
          position: style(bar).position,
          margin: style(bar).margin,
        },
        input: {
          background: style(input).backgroundColor,
          borderStyle: style(input).borderStyle,
          borderWidth: style(input).borderWidth,
          boxShadow: style(input).boxShadow,
          color: style(input).color,
          fontFamily: style(input).fontFamily,
          fontSize: style(input).fontSize,
          height: style(input).height,
          lineHeight: style(input).lineHeight,
          verticalAlign: style(input).verticalAlign,
          margin: style(input).margin,
          padding: style(input).padding,
          outline: style(input).outline,
          width: style(input).width,
        },
        button: {
          background: style(button).backgroundColor,
          border: style(button).border,
          boxShadow: style(button).boxShadow,
          color: style(button).color,
          cursor: style(button).cursor,
          height: style(button).height,
          outline: style(button).outline,
          position: style(button).position,
          right: style(button).right,
          top: style(button).top,
        },
        affix: (() => {
          const element = document.querySelector<HTMLElement>('[data-owner="site-admin-affix"]');
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { height: rect.height, lineHeight: getComputedStyle(element).lineHeight };
        })(),
        listY: document
          .querySelector<HTMLElement>('[data-owner="projects-directory-list"]')!
          .getBoundingClientRect().y,
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    expect(metrics.affix?.lineHeight).toBe("23px");
    expect(metrics.affix?.height).toBeGreaterThan(0);
    const mobile = viewport.name === "mobile";
    expect(metrics.boxes).toEqual(
      mobile
        ? {
            wrap: { height: 20, width: 390, x: 0, y: 204 },
            container: { height: 40, width: 205, x: 0, y: 214 },
            form: { height: 30, width: 205, x: 0, y: 219 },
            bar: { height: 30, width: 205, x: 0, y: 219 },
            input: { height: 20, width: 183, x: 1, y: 225.578125 },
            button: { height: 20, width: 12, x: 187, y: 225 },
            icon: { height: 12, width: 12, x: 187, y: 228 },
          }
        : {
            wrap: { height: 50, width: 1346, x: 10, y: 151 },
            container: { height: 32, width: 382, x: 10, y: 161 },
            form: { height: 30, width: 382, x: 10, y: 161 },
            bar: { height: 30, width: 382, x: 10, y: 161 },
            input: { height: 20, width: 360, x: 11, y: 167.578125 },
            button: { height: 20, width: 12, x: 374, y: 167 },
            icon: { height: 12, width: 12, x: 374, y: 170 },
          },
    );
    expect(metrics.wrap).toEqual({
      clear: "both",
      height: mobile ? "0px" : "30px",
      padding: "10px 0px",
    });
    expect(metrics.container).toEqual({ float: "left" });
    expect(metrics.form).toEqual({ display: "block", marginBottom: "2px" });
    expect(metrics.bar).toEqual({
      background: "rgb(255, 255, 255)",
      border: "1px solid rgb(204, 204, 204)",
      borderRadius: "3px",
      height: "20px",
      lineHeight: "20px",
      padding: "4px 25px 4px 5px",
      position: "relative",
      margin: mobile ? "5px 0px" : "0px",
    });
    expect(metrics.input).toEqual({
      background: "rgb(255, 255, 255)",
      borderStyle: "none",
      borderWidth: "0px",
      boxShadow: "none",
      color: "rgb(85, 85, 85)",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: mobile ? "16px" : "12px",
      height: "20px",
      lineHeight: "normal",
      margin: "0px -5px",
      padding: "0px 5px",
      outline: "rgb(85, 85, 85) none 0px",
      verticalAlign: "middle",
      width: mobile ? "173px" : "350px",
    });
    expect(metrics.button).toEqual({
      background: "rgba(0, 0, 0, 0)",
      border: "0px none rgb(0, 0, 0)",
      boxShadow: "none",
      color: "rgb(0, 0, 0)",
      cursor: "pointer",
      height: "20px",
      outline: "rgb(0, 0, 0) none 0px",
      position: "absolute",
      right: "5px",
      top: "5px",
    });
    expect(metrics.listY).toBe(mobile ? 254 : 201);
    expect(metrics.scrollWidth).toBe(viewport.width);
    await input.focus();
    await expect(input).toHaveCSS("box-shadow", "none");
    await button.hover();
    await button.focus();
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const clip = {
      height:
        Math.max(
          metrics.boxes.wrap.y + metrics.boxes.wrap.height,
          metrics.boxes.container.y + metrics.boxes.container.height,
        ) - metrics.boxes.wrap.y,
      width: viewport.width,
      x: 0,
      y: metrics.boxes.wrap.y,
    };
    expect(
      (
        await page.screenshot({
          clip,
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `style-projects-search-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
}

test("filter submit preserves the query contract", async ({ page }) => {
  await open(page);
  const input = page.locator(`[data-owner="${owners.input}"]`);
  await input.fill("road map");
  await page.locator(`[data-owner="${owners.button}"]`).click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        filter: url.searchParams.get("filter"),
        labelIds: url.searchParams.getAll("labelIds"),
        pathname: url.pathname,
      };
    })
    .toEqual({
      filter: "road map",
      labelIds: [],
      pathname: `${basePath}/projects`,
    });
});
