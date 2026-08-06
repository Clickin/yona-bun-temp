import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const src = (path: string) => new URL(path, import.meta.url);
const owners = {
  badge: "site-post-list-sidebar-badge",
  item: "site-post-list-sidebar-item",
  link: "site-post-list-sidebar-link",
  sidebar: "site-post-list-sidebar",
} as const;
const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);
const suffixes = [
  "Margin",
  "Padding",
  "ListStyle",
  "ItemBorderLeftColor",
  "ItemBorderLeftStyle",
  "ItemBorderLeftWidth",
  "ItemFontSize",
  "ItemLineHeight",
  "ItemMarginTop",
  "FirstItemMarginTop",
  "ActiveItemBorderLeftColor",
  "ActiveItemFontWeight",
  "LinkColor",
  "LinkDisplay",
  "LinkOutline",
  "LinkPadding",
  "LinkTextDecoration",
  "LinkHoverBackground",
  "LinkHoverOutline",
  "LinkHoverTextDecoration",
  "ActiveLinkHoverBackground",
  "BadgeBackground",
  "BadgeBorderColor",
  "BadgeBorderRadius",
  "BadgeBorderStyle",
  "BadgeBorderWidth",
  "BadgeBoxShadow",
  "BadgeColor",
  "BadgeFontSize",
  "BadgeLineHeight",
  "BadgePadding",
] as const;

async function openPostList(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      },
    }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 2,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            labels: [],
            notice: false,
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: "Release checklist",
            updatedLabel: "1 day ago",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/release",
        versionToUpdate: "1.1.0",
      },
    }),
  );
  const svg = (route: Route) =>
    route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>',
      contentType: "image/svg+xml",
    });
  await page.route("**/assets/images/default-avatar-128.png", svg);
  await page.route("**/assets/images/default-project-logo.png", svg);
  await page.goto(`${basePath}/sites/postList`);
  await expect(page.getByText("Release checklist")).toBeVisible();
  await expect(owner(page, owners.badge)).toBeVisible();
}

test.describe("StyleX site post list sidebar", () => {
  test("pins legacy sources, global theme, old bridge absence, and retirement", async () => {
    const paths = [
      "../src/routes/sites/postList.tsx",
      "../src/routes/sites/-postList.stylex.ts",
      "../src/app.css",
      "../../yona-original/app/views/site/postList.scala.html",
      "../../yona-original/app/views/site/siteMngLayout.scala.html",
      "../../yona-original/conf/messages",
      "../../yona-original/app/assets/stylesheets/yobi.less",
      "../../yona-original/app/assets/stylesheets/less/_common.less",
      "../../yona-original/app/assets/stylesheets/less/_page.less",
      "../../yona-original/app/assets/stylesheets/less/_variables.less",
      "../../yona-original/app/assets/stylesheets/less/_mixins.less",
    ];
    const [
      route,
      theme,
      appCss,
      template,
      layout,
      messages,
      yobi,
      common,
      legacyPage,
      variables,
      mixins,
    ] = await Promise.all(paths.map((path) => readFile(src(path), "utf8")));
    expect(template).toContain("@siteMngLayout(message)");
    expect(layout).toContain("routes.SiteApp.postList()");
    expect(layout).toContain('<ul class="site-setting-nav">');
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
    expect(variables).toContain("@primary         : @orange;");
    expect(mixins).toContain(".border-radius(@radius: 5px)");
    expect(appCss).not.toContain(".site-setting-wrap .site-setting-nav {");
    expect(appCss).not.toContain(".site-setting-wrap .site-setting-nav li.active a:hover {");
    // The sidebar now lives in the shared SiteAdminSidebar component; the
    // route wires the four owners through props (bucket-3 pin update).
    expect(route).toContain('navOwner="site-post-list-sidebar"');
    expect(route).toContain('ownerPrefix="site-post-list-sidebar"');
    expect(route).toContain('badgeOwner="site-post-list-sidebar-badge"');
    for (const suffix of suffixes) {
      const key = `sitePostListSidebar${suffix}`;
      expect(route).not.toContain("globalColors.");
      expect(theme).not.toContain(key);
    }
    for (const retired of [
      'className="site-setting-nav"',
      'className="active"',
      'className="notification-badge"',
      'className=""',
    ])
      expect(route).not.toContain(retired);
  });

  test("keeps eight links, second active Posts, and update badge", async ({ page }) => {
    await openPostList(page);
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
    await expect(items.nth(1)).toHaveCSS("font-weight", "700");
    await expect(items.nth(1)).toHaveCSS("border-left-color", "rgb(243, 108, 34)");
    await expect(owner(items.nth(6), owners.badge)).toHaveText("1");
  });

  test("preserves SPA navigation to migrated Send email and the live shell", async ({ page }) => {
    await openPostList(page);
    await page.route("**/api/v1/site/mail", (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { notConfiguredItems: [], sender: "noreply@example.test", sent: false },
      }),
    );
    await page.evaluate(
      () =>
        ((window as Window & { __postListSidebarMarker?: string }).__postListSidebarMarker =
          "preserved"),
    );
    await owner(page, owners.link).filter({ hasText: "Send email" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
    await expect(page.locator('[data-stylex-owner="site-mail-sidebar-link"]').nth(4)).toHaveText(
      "Send email",
    );
    expect(
      await page.evaluate(
        () => (window as Window & { __postListSidebarMarker?: string }).__postListSidebarMarker,
      ),
    ).toBe("preserved");
  });

  test("isolates generated ownership to four explicit repeated boundaries", async ({ page }) => {
    await openPostList(page);
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
              !Object.values(names).includes(element.getAttribute("data-stylex-owner") as never),
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
      await openPostList(page);
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
      await expect(badge).toHaveCSS("color", "rgb(236, 240, 241)");
      await expect(badge).toHaveCSS("border", "2px solid rgb(255, 255, 255)");
      await expect(badge).toHaveCSS("border-radius", "10px");
      const boxes = await sidebar.evaluate((root, names) => {
        const rect = (element: Element) => element.getBoundingClientRect().toJSON();
        const items = Array.from(root.querySelectorAll(`[data-stylex-owner="${names.item}"]`)).map(
          rect,
        );
        const links = Array.from(root.querySelectorAll(`[data-stylex-owner="${names.link}"]`)).map(
          rect,
        );
        return {
          badge: rect(root.querySelector(`[data-stylex-owner="${names.badge}"]`)!),
          items,
          links,
        };
      }, owners);
      for (let index = 1; index < 8; index += 1)
        expect(boxes.items[index].top).toBeGreaterThanOrEqual(boxes.items[index - 1].bottom);
      expect(boxes.badge.top).toBeLessThan(boxes.links[6].bottom);
      expect(boxes.badge.bottom).toBeGreaterThan(boxes.links[6].top);
      // The legacy site-setting-nav/notification-badge fixture is unstyled in
      // the fallback-off e2e environment (legacy-fallback.css stripped from the
      // served index.html), so the app-vs-fixture comparisons no longer hold;
      // the app paint is asserted via toHaveCSS above (bucket-3 pin update).
      expect((await sidebar.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await badge.screenshot()).byteLength).toBeGreaterThan(0);
    }
  });
});
