import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

test("pagination owns only plugin presentation while retaining generic input and sprites", () => {
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
  expect(route).toContain(
    'className={`input-mini nospinner ${paginationInputStyleProps.className ?? ""}`}',
  );
  expect(route).toContain('className="ico btn-pg-prev off"');
  expect(route).toContain('className="ico btn-pg-next off"');
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
    await expect(root.locator("i.ico.btn-pg-prev.off, i.ico.btn-pg-next.off")).toHaveCount(2);
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
        items: Array.from(fixtureList.children).map(style),
        labels: Array.from(fixture.querySelectorAll("span")).map(style),
        list: style(fixtureList),
        root: style(fixture),
      };
      const actual = {
        boxes: { input: dimensions(input), items: items.map(dimensions), list: dimensions(list) },
        input: style(input),
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
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.root).toMatchObject({
      clear: "both",
      margin: "20px 0px",
      textAlign: "center",
      width: viewport.name === "desktop" ? "1116.89px" : "323.609px",
    });
    expect(evidence.list).toMatchObject({
      display: "inline-block",
      fontSize: "0px",
      margin: "0px 0px 0px -120px",
      padding: "0px",
    });
    expect(evidence.boxes.list.left).toBeLessThan(evidence.boxes.root.right);
    expect(evidence.boxes.list.right).toBeGreaterThan(evidence.boxes.root.left);
    expect(evidence.input).toMatchObject({
      borderColor: "rgb(238, 238, 238)",
      borderWidth: "1px",
      fontSize: viewport.name === "desktop" ? "12px" : "16px",
      fontWeight: "700",
      margin: "0px",
      textAlign: "center",
      width: "30px",
    });
    expect(evidence.boxes.input.width).toBeCloseTo(44, 2);
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
