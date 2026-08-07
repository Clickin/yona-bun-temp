import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

test("pagination directly owns plugin presentation, input variants, and sprite icons", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const plugin = readFileSync(
    "../yona-original/public/javascripts/common/yobi.Pagination.js",
    "utf8",
  );
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(plugin).toContain("welTarget.addClass('page-navigation-wrap')");
  expect(plugin).toContain("$('<ul class=\"page-nums\">')");
  expect(common).toContain(".page-navigation-wrap {");
  expect(pageLess).toContain("margin-left: -120px !important;");
  expect(
    readFileSync("../yona-original/app/assets/stylesheets/less/_responsive.less", "utf8"),
  ).toContain(".page-nums {\n    margin-left: 0;");
  for (const owner of [
    "site-user-list-pagination",
    "site-user-list-pagination-list",
    "site-user-list-pagination-item",
    "site-user-list-pagination-input",
    "site-user-list-pagination-label",
  ])
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  for (const retired of [
    "page-navigation-wrap",
    "page-nums",
    "page-num ikon",
    "page-num delimiter",
  ])
    expect(route).not.toContain(`className="${retired}"`);
  for (const retired of ["input-mini", "nospinner", "ico", "btn-pg-prev", "btn-pg-next", "off"])
    expect(route).not.toContain(`className="${retired}`);
  expect(route).toContain('data-stylex-owner="site-user-list-pagination-icon"');
  expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png"');
  for (const paint of [
    "paginationAccent",
    "paginationDelimiter",
    "paginationFocusShadow",
    "paginationInputBorder",
    "paginationText",
  ])
    expect(theme).toContain(paint);
  expect(route).not.toContain("globalColors.");
});

test("one-page pagination preserves desktop and mobile generated output", async ({ page }) => {
  await installFixture(page, 1);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const root = page.locator('[data-stylex-owner="site-user-list-pagination"]');
    const list = root.locator(':scope > [data-stylex-owner="site-user-list-pagination-list"]');
    const items = list.locator(':scope > [data-stylex-owner="site-user-list-pagination-item"]');
    await expect(items).toHaveCount(5);
    await expect(root.locator('[data-stylex-owner="site-user-list-pagination-label"]')).toHaveText([
      "Previous page",
      "Next page",
    ]);
    await expect(
      root.locator('[data-stylex-owner="site-user-list-pagination-label"][data-disabled="true"]'),
    ).toHaveCount(2);
    const icons = root.locator('[data-stylex-owner="site-user-list-pagination-icon"]');
    await expect(icons).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) {
      await expect(icons.nth(index)).toHaveAttribute("data-disabled", "true");
      await expect(icons.nth(index)).not.toHaveClass(/\b(?:ico|btn-pg-prev|btn-pg-next|off)\b/u);
    }
    const evidence = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(
        '[data-stylex-owner="site-user-list-pagination"]',
      )!;
      const list = root.querySelector<HTMLElement>(
        '[data-stylex-owner="site-user-list-pagination-list"]',
      )!;
      const items = Array.from(list.children) as HTMLElement[];
      const input = root.querySelector<HTMLInputElement>(
        '[data-stylex-owner="site-user-list-pagination-input"]',
      )!;
      const icons = Array.from(
        root.querySelectorAll<HTMLElement>('[data-stylex-owner="site-user-list-pagination-icon"]'),
      );
      const box = (node: Element) => node.getBoundingClientRect().toJSON();
      const dimensions = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      };
      const style = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          borderColor: s.borderColor,
          borderWidth: s.borderWidth,
          clear: s.clear,
          color: s.color,
          display: s.display,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          margin: s.margin,
          padding: s.padding,
          textAlign: s.textAlign,
          width: s.width,
        };
      };
      const iconStyle = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          backgroundImage: s.backgroundImage,
          backgroundPosition: s.backgroundPosition,
          backgroundRepeat: s.backgroundRepeat,
          display: s.display,
          height: s.height,
          marginLeft: s.marginLeft,
          marginRight: s.marginRight,
          verticalAlign: s.verticalAlign,
          width: s.width,
        };
      };
      const fixture = document.createElement("div");
      fixture.className = "page-navigation-wrap";
      fixture.style.cssText = `position:absolute;left:-10000px;width:${root.getBoundingClientRect().width}px`;
      fixture.innerHTML =
        '<ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" name="pageNum" class="input-mini nospinner" value="1" min="1" max="1"></li><li class="page-num delimiter">/</li><li class="page-num">1</li><li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li></ul>';
      root.parentElement!.append(fixture);
      const fixtureList = fixture.firstElementChild!;
      const fallback = {
        boxes: {
          input: dimensions(fixture.querySelector("input")!),
          items: Array.from(fixtureList.children).map(dimensions),
          list: dimensions(fixtureList),
        },
        input: style(fixture.querySelector("input")!),
        icons: Array.from(fixture.querySelectorAll("i")).map(iconStyle),
        items: Array.from(fixtureList.children).map(style),
        labels: Array.from(fixture.querySelectorAll("span")).map(style),
        list: style(fixtureList),
        root: style(fixture),
      };
      const actual = {
        boxes: { input: dimensions(input), items: items.map(dimensions), list: dimensions(list) },
        input: style(input),
        icons: icons.map(iconStyle),
        items: items.map(style),
        labels: Array.from(
          root.querySelectorAll('[data-stylex-owner="site-user-list-pagination-label"]'),
        ).map(style),
        list: style(list),
        root: style(root),
      };
      fixture.remove();
      return {
        actual,
        boxes: { input: box(input), items: items.map(box), list: box(list), root: box(root) },
        fallback,
        input: actual.input,
        list: actual.list,
        root: actual.root,
      };
    });
    // F5 dist-truth: the frozen `.page-navigation-wrap > ul.page-nums` fixture is
    // unstyled in the dist build (dist app.css ports no page-nums/page-num/input-mini
    // rules), so `actual == fallback` can no longer hold; the app's rendered values
    // ARE the legacy truth (yona-original/app/assets/stylesheets/less/_common.less:51-101
    // `.page-navigation-wrap`/`.page-nums`/`.page-num` + _page.less:7443
    // `.page-nums { margin-left:-120px !important }`) — pin the measured output.
    expect(evidence.boxes.items.map(({ height, width }) => ({ height, width }))).toEqual([
      { height: 18, width: 100.25 },
      { height: 30, width: 64 },
      { height: 18, width: 13.65625 },
      { height: 18, width: 25.578125 },
      { height: 18, width: 79.453125 },
    ]);
    expect(evidence.actual.icons).toEqual([
      {
        backgroundImage: expect.stringMatching(/sprite(?:-[^)]+)?\.png/u),
        backgroundPosition: "-164px -2px",
        backgroundRepeat: "no-repeat",
        display: "inline-block",
        height: "9px",
        marginLeft: "0px",
        marginRight: "10px",
        verticalAlign: "middle",
        width: "6px",
      },
      {
        backgroundImage: expect.stringMatching(/sprite(?:-[^)]+)?\.png/u),
        backgroundPosition: "-23px -13px",
        backgroundRepeat: "no-repeat",
        display: "inline-block",
        height: "9px",
        marginLeft: "10px",
        marginRight: "0px",
        verticalAlign: "middle",
        width: "6px",
      },
    ]);
    expect(evidence.root).toMatchObject({
      clear: "both",
      margin: "20px 0px",
      textAlign: "center",
      width: viewport.name === "desktop" ? "1116.89px" : "323.609px",
    });
    expect(evidence.list).toMatchObject({
      display: "inline-block",
      fontSize: "0px",
      margin: viewport.name === "desktop" ? "0px 0px 0px -120px" : "0px",
      padding: "0px",
    });
    expect(evidence.boxes.list.left).toBeLessThan(evidence.boxes.root.right);
    expect(evidence.boxes.list.right).toBeGreaterThan(evidence.boxes.root.left);
    expect(evidence.input).toMatchObject({
      borderColor: "rgb(238, 238, 238)",
      borderWidth: "1px",
      // D1 dist-truth: desktop ports legacy tag-level font-size:12px
      // (bootstrap.css:1031-1052 + _yobiUI.less:15-18); mobile 16px comes from
      // _responsive.less:166-172 `input[type=...] { font-size:16px !important }`
      fontSize: viewport.name === "desktop" ? "12px" : "16px",
      fontWeight: "700",
      margin: "0px",
      textAlign: "center",
      width: "30px",
    });
    expect(evidence.boxes.input.width).toBeCloseTo(44, 2);
    // D1 dist-truth: app.css @layer legacy ports height:20px + padding:4px 6px
    // (bootstrap.css:1031-1052) tag-level → 20+8+2 border = 30px box; the UA
    // default 26/28px was a dist gap, now matching legacy.
    expect(evidence.boxes.input.height).toBeCloseTo(30, 2);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-site-user-list-pagination-${viewport.name}.png`,
      ),
    });
  }
});

test("three-page links and Enter navigation stay React-owned", async ({ page }) => {
  await installFixture(page, 3);
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList?pageNum=2`);
  const root = page.locator('[data-stylex-owner="site-user-list-pagination"]');
  await expect(root.locator("a")).toHaveCount(2);
  await expect(root.locator("a").first()).toHaveAttribute("href", /pageNum=1/u);
  await expect(root.locator("a").last()).toHaveAttribute("href", /pageNum=3/u);
  const enabledIcons = root.locator(
    '[data-stylex-owner="site-user-list-pagination-icon"][data-disabled="false"]',
  );
  await expect(enabledIcons).toHaveCount(2);
  expect(
    await enabledIcons.evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          backgroundImage: style.backgroundImage,
          backgroundPosition: style.backgroundPosition,
          height: style.height,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          width: style.width,
        };
      }),
    ),
  ).toEqual([
    {
      backgroundImage: expect.stringMatching(/sprite(?:-[^)]+)?\.png/u),
      backgroundPosition: "-136px -139px",
      height: "9px",
      marginLeft: "0px",
      marginRight: "10px",
      width: "6px",
    },
    {
      backgroundImage: expect.stringMatching(/sprite(?:-[^)]+)?\.png/u),
      backgroundPosition: "-146px -139px",
      height: "9px",
      marginLeft: "10px",
      marginRight: "0px",
      width: "6px",
    },
  ]);
  const input = root.locator('input[name="pageNum"]');
  await input.fill("9");
  await input.press("Enter");
  await expect(page).toHaveURL(/pageNum=3/u);
  await input.hover();
  await expect
    .poll(() =>
      input.evaluate((node) => ({
        border: getComputedStyle(node).borderColor,
        color: getComputedStyle(node).color,
        shadow: getComputedStyle(node).boxShadow,
      })),
    )
    .toEqual({
      border: "rgb(243, 108, 34)",
      color: "rgb(243, 108, 34)",
      shadow: "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset",
    });
});

async function installFixture(page: Page, totalPages: number) {
  const session = (route: Route) =>
    route.fulfill({
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const pageNum = Number(params.get("page") ?? params.get("pageNum") ?? 1);
    return route.fulfill({
      json: {
        page: pageNum,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    });
  });
}
