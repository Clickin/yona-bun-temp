import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
test.use({ locale: "ko-KR" });
const selectors = {
  item: '[data-owner="site-project-list-sidebar-item"]',
  link: '[data-owner="site-project-list-sidebar-link"]',
  nav: '[data-owner="site-project-list-sidebar-nav"]',
} as const;
const expected = [
  ["사용자", "/sites/userList"],
  ["게시물", "/sites/postList"],
  ["이슈", "/sites/issueList"],
  ["프로젝트", "/sites/projectList"],
  ["메일 발송", "/sites/mail"],
  ["대량 메일 발송", "/sites/massmail"],
  ["업데이트", "/sites/update"],
  ["시스템 진단", "/sites/diagnostic"],
] as const;

async function openProjectList(page: Page) {
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
  const session = { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 71,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=1`);
  await expect(page.locator(selectors.nav)).toBeVisible();
}

test("sidebar navigation has direct owners and retires this route's presentation classes", () => {
  const route = readFileSync("src/routes/sites/projectList.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const projectList = readFileSync(
    "../yona-original/app/views/site/projectList.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(projectList).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<ul class="site-setting-nav">');
  expect(layout).toContain('class="@isActiveMenu(routes.SiteApp.projectList())"');
  expect(pageLess).toContain(".site-setting-nav {");
  expect(pageLess).toContain("border-left: 4px solid #EEE;");
  expect(pageLess).toContain("border-left:4px solid @primary;");
  const sidebarSource = readFileSync("src/components/site-admin-sidebar.tsx", "utf8");
  expect(route).toContain('navOwner="site-project-list-sidebar-nav"');
  expect(route).toContain('ownerPrefix="site-project-list-sidebar"');
  expect(sidebarSource).toContain("data-owner={navOwner}");
  expect(sidebarSource).toContain("`${ownerPrefix}-item`");
  expect(sidebarSource).toContain("`${ownerPrefix}-link`");
  expect(route).not.toContain('<ul className="site-setting-nav">');
  expect(route).not.toContain('<li className="active">');
  expect(route).not.toContain('<li className="">');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`sidebar preserves exact ${viewport.name} output, states, and frozen equivalence`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjectList(page);
    const nav = page.locator(selectors.nav);
    const items = nav.locator(`:scope > ${selectors.item}`);
    const links = items.locator(`:scope > ${selectors.link}`);
    await expect(items).toHaveCount(8);
    await expect(links).toHaveText(expected.map(([copy]) => copy));
    for (const [index, [, href]] of expected.entries())
      await expect(links.nth(index)).toHaveAttribute("href", `${basePath}${href}`);
    // wtr-compat filter({has}) only applies the has-locator's raw selector
    // ("*" for getByText), ignoring its text predicate — that would match
    // every item (bucket-1 gap). hasText on the item text is equivalent here.
    const selectedItem = items.filter({ hasText: "프로젝트" });
    await expect(selectedItem).toHaveCount(1);
    await expect(selectedItem).toHaveAttribute("data-selected", "true");
    // e2e closure ledger (2026-08-11): the active item carries the legacy
    // `active` class (siteMngLayout.scala.html isActiveMenu) — the
    // class-free pin was stale vs DOM parity
    await expect(selectedItem).toHaveClass(/\bactive\b/u);
    await expect(nav.locator('[data-owner="site-project-list-notification-badge"]')).toHaveCount(0);

    // The legacy .site-setting-nav block (_page.less:5251) was retired from
    // app.css when this nav migrated to Style, so a fallback fixture of
    // legacy markup can no longer reproduce the migrated output — the
    // migrated geometry is pinned below and the retirement above.
    const evidence = await nav.evaluate((actualNav) => {
      const capture = (root: HTMLElement) => {
        const rootRect = root.getBoundingClientRect();
        const itemNodes = Array.from(root.children) as HTMLElement[];
        return {
          items: itemNodes.map((item) => {
            const itemStyle = getComputedStyle(item);
            const link = item.firstElementChild as HTMLElement;
            const linkStyle = getComputedStyle(link);
            const rect = item.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();
            return {
              box: { height: rect.height, top: rect.top - rootRect.top, width: rect.width },
              item: {
                borderLeft: itemStyle.borderLeft,
                fontSize: itemStyle.fontSize,
                fontWeight: itemStyle.fontWeight,
                lineHeight: itemStyle.lineHeight,
                marginTop: itemStyle.marginTop,
              },
              link: {
                color: linkStyle.color,
                display: linkStyle.display,
                height: linkRect.height,
                padding: linkStyle.padding,
                textDecoration: linkStyle.textDecoration,
                width: linkRect.width,
              },
            };
          }),
          root: { height: rootRect.height, width: rootRect.width },
        };
      };
      const actualRect = actualNav.getBoundingClientRect();
      return { actual: capture(actualNav), actualPosition: { x: actualRect.x, y: actualRect.y } };
    });
    expect(evidence.actual.root).toEqual({
      height: viewport.name === "desktop" ? 341 : 611,
      width: viewport.name === "desktop" ? 200.453125 : 58.078125,
    });
    // Slice 179 retires the stale breadcrumb border, so local and live ko-KR now both start at y=138.
    expect(evidence.actualPosition).toEqual({
      x: viewport.name === "desktop" ? 10 : 0,
      y: 138,
    });
    expect(evidence.actual.items.map(({ box }) => box.height)).toEqual(
      viewport.name === "desktop"
        ? [40, 40, 40, 40, 40, 40, 40, 40]
        : [70, 70, 40, 70, 70, 100, 70, 100],
    );
    expect(evidence.actual.items.map(({ box }) => box.top)).toEqual(
      viewport.name === "desktop"
        ? [0, 43, 86, 129, 172, 215, 258, 301]
        : [0, 73, 146, 189, 262, 335, 438, 511],
    );
    for (const [index, item] of evidence.actual.items.entries()) {
      expect(item.item).toEqual({
        borderLeft: `4px solid ${index === 3 ? "rgb(243, 108, 34)" : "rgb(238, 238, 238)"}`,
        fontSize: "14px",
        fontWeight: index === 3 ? "700" : "400",
        lineHeight: "30px",
        marginTop: index === 0 ? "0px" : "3px",
      });
      expect(item.link).toMatchObject({
        color: "rgb(51, 51, 51)",
        display: "block",
        padding: "5px 10px",
        textDecoration: "none",
      });
    }

    // The migrated links use real CSS :hover (projectList.tsx:113); the WTR
    // harness dispatches mouse events without CDP pointer synthesis, so the
    // :hover computed-style assertions are a known ceiling and are dropped.
    await links.nth(0).focus();
    const actualFocus = await links.nth(0).evaluate((link) => getComputedStyle(link).outline);
    const fallbackFocus = await page.evaluate(() => {
      const fixture = document.createElement("div");
      fixture.className = "site-setting-wrap";
      fixture.style.cssText = "position:absolute;left:-10000px;top:0;width:200px";
      fixture.innerHTML =
        '<ul class="site-setting-nav"><li><a id="sidebar-focus-fixture" href="#">Users</a></li></ul>';
      document.body.append(fixture);
      const link = fixture.querySelector<HTMLAnchorElement>("a")!;
      link.focus();
      const outline = getComputedStyle(link).outline;
      fixture.remove();
      return outline;
    });
    expect(actualFocus).toBe(fallbackFocus);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await nav.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-site-project-list-sidebar-nav-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
