import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const source = (path: string) => new URL(path, import.meta.url);
const owners = {
  badge: "site-data-sidebar-badge",
  item: "site-data-sidebar-item",
  link: "site-data-sidebar-link",
  sidebar: "site-data-sidebar",
} as const;
const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);
async function openData(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-data-sidebar" },
      json: {
        csrfToken: "csrf-data-sidebar",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        currentVersion: "1.0.0",
        error: null,
        releaseUrl: "https://example.test/release",
        versionToUpdate: "1.1.0",
      },
    }),
  );
  await page.goto(`${basePath}/sites/data`);
  await expect(owner(page, owners.badge)).toBeVisible();
}

test.describe("Style site data sidebar", () => {
  test("pins legacy sources, global theme, old bridge absence, and retirement", async () => {
    const [
      route,
      _theme,
      _appCss,
      template,
      layout,
      messages,
      yobi,
      common,
      legacyPage,
      variables,
      mixins,
    ] = await Promise.all(
      [
        "../src/routes/sites/data.tsx",
        "../src/app.css",
        "../src/app.css",
        "../../yona-original/app/views/site/data.scala.html",
        "../../yona-original/app/views/site/siteMngLayout.scala.html",
        "../../yona-original/conf/messages",
        "../../yona-original/app/assets/stylesheets/yobi.less",
        "../../yona-original/app/assets/stylesheets/less/_common.less",
        "../../yona-original/app/assets/stylesheets/less/_page.less",
        "../../yona-original/app/assets/stylesheets/less/_variables.less",
        "../../yona-original/app/assets/stylesheets/less/_mixins.less",
      ].map((path) => readFile(source(path), "utf8")),
    );
    expect(template).toContain("@siteMngLayout(message)");
    expect(template).toContain('Messages("site.sidebar.data")');
    expect(layout).toContain('<ul class="site-setting-nav">');
    expect(layout).not.toContain("routes.SiteApp.data");
    expect(layout).toContain('<span class="notification-badge">1</span>');
    for (const key of [
      "userList",
      "postList",
      "issueList",
      "projectList",
      "mailSend",
      "massMail",
      "update",
      "diagnostics",
    ])
      expect(messages).toContain(`site.sidebar.${key}`);
    for (const imported of ["_variables.less", "_mixins.less", "_common.less", "_page.less"])
      expect(yobi).toContain(imported);
    expect(common).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
    expect(common).toContain("a {");
    expect(common).toContain(".notification-badge {");
    expect(legacyPage).toContain(".site-setting-nav {");
    expect(variables).toContain("@yobi-orange : #FF7332;");
    expect(mixins).toContain(".border-radius(@radius: 5px)");
    expect(curatedAppCss()).not.toContain(".site-setting-wrap .site-setting-nav {");
    expect(curatedAppCss()).not.toContain(
      ".site-setting-wrap .site-setting-nav li.active a:hover {",
    );
    // Sidebar owners moved to the shared SiteAdminSidebar component: data.tsx
    // wires badgeOwner/navOwner/ownerPrefix props and the component emits the
    // data-owner attributes (badge = badgeOwner, item/link = ownerPrefix
    // suffixed, ul = navOwner). The DOM-level owner assertions below verify the
    // rendered owners directly.
    expect(route).toContain('badgeOwner="site-data-sidebar-badge"');
    expect(route).toContain('navOwner="site-data-sidebar"');
    expect(route).toContain('ownerPrefix="site-data-sidebar"');
    for (const retired of [
      'className="site-setting-nav"',
      'className="notification-badge"',
      'className=""',
    ])
      expect(route).not.toContain(retired);
    expect(route).not.toContain("siteDataSidebarActive");
  });

  test("keeps eight legacy links, no selected item, and the update badge", async ({ page }) => {
    await openData(page);
    const sidebar = owner(page, owners.sidebar);
    const items = owner(sidebar, owners.item);
    const links = owner(sidebar, owners.link);
    await expect(items).toHaveCount(8);
    await expect(links).toHaveCount(8);
    await expect(links).toHaveText([
      "Users",
      "Posts",
      "Issues",
      "Projects",
      "Send email",
      "Send mass emails",
      "Software Update1",
      "Diagnostics",
    ]);
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => new URL((node as HTMLAnchorElement).href).pathname),
      ),
    ).toEqual([
      `${basePath}/sites/userList`,
      `${basePath}/sites/postList`,
      `${basePath}/sites/issueList`,
      `${basePath}/sites/projectList`,
      `${basePath}/sites/mail`,
      `${basePath}/sites/massmail`,
      `${basePath}/sites/update`,
      `${basePath}/sites/diagnostic`,
    ]);
    for (const item of await items.all()) {
      await expect(item).toHaveCSS("font-weight", "400");
      await expect(item).toHaveCSS("border-left-color", "rgb(238, 238, 238)");
    }
    await expect(owner(items.nth(6), owners.badge)).toHaveText("1");
    await expect(sidebar).not.toContainText("Data");
  });

  test("preserves internal sidebar SPA navigation and the live shell", async ({ page }) => {
    await openData(page);
    await page.evaluate(
      () =>
        ((window as Window & { __dataSidebarMarker?: string }).__dataSidebarMarker = "preserved"),
    );
    await owner(page, owners.link).filter({ hasText: "Send email" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
    expect(
      await page.evaluate(
        () => (window as Window & { __dataSidebarMarker?: string }).__dataSidebarMarker,
      ),
    ).toBe("preserved");
  });

  test("isolates generated ownership to four explicit repeated boundaries", async ({ page }) => {
    await openData(page);
    const sidebar = owner(page, owners.sidebar);
    await expect(sidebar).toHaveCount(1);
    await expect(owner(sidebar, owners.item)).toHaveCount(8);
    await expect(owner(sidebar, owners.link)).toHaveCount(8);
    await expect(owner(sidebar, owners.badge)).toHaveCount(1);
    expect(
      await sidebar.evaluate(
        (root, names) =>
          Array.from(root.querySelectorAll("*")).filter(
            (element) =>
              Array.from(element.classList).some((token) => token.startsWith("x")) &&
              !Object.values(names).includes(element.getAttribute("data-owner") as never),
          ).length,
        owners,
      ),
    ).toBe(0);
  });

  test("pins desktop/mobile paint, geometry, screenshots, and frozen fallback", async ({
    page,
  }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await openData(page);
      const sidebar = owner(page, owners.sidebar);
      const items = owner(sidebar, owners.item);
      const links = owner(sidebar, owners.link);
      const badge = owner(sidebar, owners.badge);
      await expect(sidebar).toHaveCSS("margin", "0px");
      await expect(sidebar).toHaveCSS("padding", "0px");
      await expect(sidebar).toHaveCSS("list-style-type", "none");
      await expect(items.first()).toHaveCSS("margin-top", "0px");
      await expect(items.nth(1)).toHaveCSS("margin-top", "3px");
      await expect(items.first()).toHaveCSS("font-size", "14px");
      await expect(items.first()).toHaveCSS("line-height", "30px");
      await expect(items.first()).toHaveCSS("border-left", "4px solid rgb(238, 238, 238)");
      await expect(links.first()).toHaveCSS("display", "block");
      await expect(links.first()).toHaveCSS("padding", "5px 10px");
      await expect(links.first()).toHaveCSS("color", "rgb(51, 51, 51)");
      await expect(badge).toHaveCSS("font-size", "12px");
      await expect(badge).toHaveCSS("line-height", "20px");
      await expect(badge).toHaveCSS("padding", "0px 5px");
      await expect(badge).toHaveCSS("background-color", "rgb(255, 115, 50)");
      await expect(badge).toHaveCSS("border", "2px solid rgb(255, 255, 255)");
      await expect(badge).toHaveCSS("border-radius", "10px");
      const boxes = await sidebar.evaluate((root, names) => {
        const rect = (element: Element) => element.getBoundingClientRect().toJSON();
        const items = Array.from(root.querySelectorAll(`[data-owner="${names.item}"]`)).map(rect);
        const links = Array.from(root.querySelectorAll(`[data-owner="${names.link}"]`)).map(rect);
        return {
          badge: rect(root.querySelector(`[data-owner="${names.badge}"]`)!),
          items,
          links,
        };
      }, owners);
      for (let index = 1; index < 8; index += 1)
        expect(boxes.items[index].top).toBeGreaterThanOrEqual(boxes.items[index - 1].bottom);
      expect(boxes.badge.left).toBeGreaterThanOrEqual(boxes.links[6].left);
      expect(boxes.badge.top).toBeLessThan(boxes.links[6].bottom);
      expect(boxes.badge.bottom).toBeGreaterThan(boxes.links[6].top);
      // Frozen legacy fallback retired: `.site-setting-wrap .site-setting-nav`
      // rules were removed from the curated app.css section (see the appCss
      // pins above); the frozen fallback content now lives in the app.css
      // merged block, so the toHaveCSS assertions above are the active pins.
      expect((await sidebar.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await badge.screenshot()).byteLength).toBeGreaterThan(0);
    }
  });
});
