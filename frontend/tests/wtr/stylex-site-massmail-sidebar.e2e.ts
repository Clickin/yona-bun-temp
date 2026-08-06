import { readFile } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const src = (path: string) => new URL(path, import.meta.url);
const owners = {
  badge: "site-massmail-sidebar-badge",
  item: "site-massmail-sidebar-item",
  link: "site-massmail-sidebar-link",
  sidebar: "site-massmail-sidebar",
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

async function openMassMail(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
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
  await page.goto(`${basePath}/sites/massmail`);
  await expect(owner(page, owners.badge)).toBeVisible();
}

test.describe("StyleX site mass mail sidebar", () => {
  test("pins legacy sources, frozen cascade, global theme, bridge absence, and retirement", async () => {
    const paths = [
      "../src/routes/sites/massmail.tsx",
      "../src/routes/sites/-massmail.stylex.ts",
      "../src/app.css",
      "../../yona-original/app/views/site/massMail.scala.html",
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
    expect(layout).toContain("routes.SiteApp.massMail()");
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
    // The four explicit sidebar owners are supplied to the shared
    // SiteAdminSidebar component via props; the route declares them here.
    expect(route).toContain('data-stylex-owner="site-massmail-sidebar-column"');
    expect(route).toContain('badgeOwner="site-massmail-sidebar-badge"');
    expect(route).toContain('navOwner="site-massmail-sidebar"');
    expect(route).toContain('ownerPrefix="site-massmail-sidebar"');
    expect(suffixes).toHaveLength(31);
    for (const paint of [
      "neutralBorder",
      "activeBorder",
      "primarySurface",
      "badgeShadow",
      "badgeText",
    ]) {
      expect(route).toContain(`siteMassMailColors.${paint}`);
      expect(theme).toContain(paint);
    }
    expect(route).not.toContain("globalColors.");
    for (const retired of [
      'className="site-setting-nav"',
      'className="active"',
      'className="notification-badge"',
      'className=""',
    ])
      expect(route).not.toContain(retired);
  });

  test("keeps eight links, sixth active Send mass emails, and update badge", async ({ page }) => {
    await openMassMail(page);
    await expect(owner(page, "site-massmail-page")).toBeVisible();
    await expect(owner(page, "site-massmail-content")).toBeVisible();
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
    await expect(items.nth(5)).toHaveCSS("font-weight", "700");
    await expect(items.nth(5)).toHaveCSS("border-left-color", "rgb(243, 108, 34)");
    await expect(owner(items.nth(6), owners.badge)).toHaveText("1");
  });

  test("preserves Send email SPA navigation and the live shell", async ({ page }) => {
    await openMassMail(page);
    await page.evaluate(
      () =>
        ((window as Window & { __massMailSidebarMarker?: string }).__massMailSidebarMarker =
          "preserved"),
    );
    await owner(page, owners.link).filter({ hasText: "Send email" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
    expect(
      await page.evaluate(
        () => (window as Window & { __massMailSidebarMarker?: string }).__massMailSidebarMarker,
      ),
    ).toBe("preserved");
  });

  test("isolates generated ownership to four explicit repeated boundaries", async ({ page }) => {
    await openMassMail(page);
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
      await openMassMail(page);
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
      const fallback = await sidebar.evaluate((actual, names) => {
        const item = actual.querySelector<HTMLElement>(`[data-stylex-owner="${names.item}"]`)!;
        const link = item.querySelector<HTMLElement>(`[data-stylex-owner="${names.link}"]`)!;
        const badge = actual.querySelector<HTMLElement>(`[data-stylex-owner="${names.badge}"]`)!;
        // Frozen legacy fallback: the retired .site-setting-nav/.notification-badge
        // classes no longer ship in the app stylesheet, so re-inject the frozen
        // LESS cascade in a shadow root (breadcrumb precedent) to compare paint.
        const host = document.createElement("div");
        host.style.cssText = "position:absolute;left:-10000px;width:10px";
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = `<style>
          .site-setting-nav { margin:0; padding:0; list-style:none; }
          .site-setting-nav li { border-left:4px solid #eee; line-height:30px; margin-top:3px; font-size:14px; }
          .site-setting-nav li:first-child { margin-top:0; }
          .site-setting-nav li a { display:block; padding:5px 10px; color:inherit; text-decoration:none; outline:none; }
          .notification-badge { font-size:12px; line-height:20px; padding:0 5px; background-color:#ff7332; color:#ecf0f1; border:2px solid #fff; border-radius:10px; box-shadow:0px 1px 1px rgba(0,0,0,0.2), inset 0px 1px 1px rgba(0,0,0,0.1); }
        </style><ul class="site-setting-nav"><li><a><span class="notification-badge">1</span></a></li></ul>`;
        actual.parentElement!.append(host);
        const ul = shadow.querySelector<HTMLElement>(".site-setting-nav")!;
        const li = shadow.querySelector<HTMLElement>("li")!;
        const a = shadow.querySelector<HTMLElement>("a")!;
        const span = shadow.querySelector<HTMLElement>(".notification-badge")!;
        const pick = (element: Element, props: string[]) =>
          props.map((prop) => getComputedStyle(element).getPropertyValue(prop));
        const result = {
          sidebar: [
            pick(actual, ["margin", "padding", "list-style-type"]),
            pick(ul, ["margin", "padding", "list-style-type"]),
          ],
          item: [
            pick(item, ["margin-top", "font-size", "line-height", "border-left"]),
            pick(li, ["margin-top", "font-size", "line-height", "border-left"]),
          ],
          link: [
            pick(link, ["display", "padding", "color", "text-decoration-line", "outline-style"]),
            pick(a, ["display", "padding", "color", "text-decoration-line", "outline-style"]),
          ],
          badge: [
            pick(badge, [
              "font-size",
              "line-height",
              "padding",
              "background-color",
              "color",
              "border",
              "border-radius",
              "box-shadow",
            ]),
            pick(span, [
              "font-size",
              "line-height",
              "padding",
              "background-color",
              "color",
              "border",
              "border-radius",
              "box-shadow",
            ]),
          ],
        };
        host.remove();
        return result;
      }, owners);
      expect(fallback.sidebar[0]).toEqual(fallback.sidebar[1]);
      expect(fallback.item[0]).toEqual(fallback.item[1]);
      expect(fallback.link[0]).toEqual(fallback.link[1]);
      expect(fallback.badge[0]).toEqual(fallback.badge[1]);
      expect((await sidebar.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await badge.screenshot()).byteLength).toBeGreaterThan(0);
    }
  });
});
