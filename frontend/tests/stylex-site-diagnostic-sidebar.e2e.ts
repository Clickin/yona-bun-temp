import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/diagnostic.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-diagnostic.stylex.ts", import.meta.url);
const appCssSource = new URL("../src/app.css", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/diagnostic.scala.html",
  import.meta.url,
);
const layoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const messagesSource = new URL("../../yona-original/conf/messages", import.meta.url);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const commonSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const pageSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const variablesSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_variables.less",
  import.meta.url,
);
const mixinsSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_mixins.less",
  import.meta.url,
);

const owners = {
  badge: "site-diagnostic-sidebar-badge",
  item: "site-diagnostic-sidebar-item",
  link: "site-diagnostic-sidebar-link",
  sidebar: "site-diagnostic-sidebar",
} as const;
const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);
async function openNoErrorWithBadge(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/diagnostics", (route) =>
    route.fulfill({ contentType: "application/json", json: { errors: [] } }),
  );
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
  await page.goto(`${basePath}/sites/diagnostic`);
  await expect(owner(page, owners.badge)).toBeVisible();
}

test.describe("StyleX site diagnostic sidebar", () => {
  test("pins legacy sources, global theme ownership, old bridge absence, and static retirement", async () => {
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
    ] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(appCssSource, "utf8"),
      readFile(templateSource, "utf8"),
      readFile(layoutSource, "utf8"),
      readFile(messagesSource, "utf8"),
      readFile(yobiSource, "utf8"),
      readFile(commonSource, "utf8"),
      readFile(pageSource, "utf8"),
      readFile(variablesSource, "utf8"),
      readFile(mixinsSource, "utf8"),
    ]);
    expect(template).toContain("@siteMngLayout(message)");
    expect(template).toContain("@if(errors.isEmpty())");
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
    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    for (const paint of [
      "sidebarBorder",
      "sidebarActiveBorder",
      "sidebarHoverSurface",
      "badgeSurface",
      "badgeBorder",
      "badgeShadow",
      "badgeText",
    ]) {
      expect(route).toContain(`siteDiagnosticColors.${paint}`);
      expect(theme).toContain(paint);
    }
    expect(route).toContain('backgroundColor: { ":hover": "transparent" }');
    expect(route).not.toContain("globalColors.");
    for (const retired of [
      'className="site-setting-nav"',
      'className="active"',
      'className="notification-badge"',
      'className=""',
    ])
      expect(route).not.toContain(retired);
  });

  test("keeps exact eight-item order, hrefs, active diagnostics, and update badge", async ({
    page,
  }) => {
    await openNoErrorWithBadge(page);
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
    await expect(items.nth(7)).toHaveCSS("font-weight", "700");
    await expect(items.nth(7)).toHaveCSS("border-left-color", "rgb(243, 108, 34)");
    await expect(owner(items.nth(6), owners.badge)).toHaveText("1");
  });

  test("preserves SPA navigation to Software Update and the live shell", async ({ page }) => {
    await openNoErrorWithBadge(page);
    await page.evaluate(
      () =>
        ((window as Window & { __diagnosticSidebarMarker?: string }).__diagnosticSidebarMarker =
          "preserved"),
    );
    await owner(page, owners.link).filter({ hasText: "Software Update" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/update`);
    expect(
      await page.evaluate(
        () => (window as Window & { __diagnosticSidebarMarker?: string }).__diagnosticSidebarMarker,
      ),
    ).toBe("preserved");
  });

  test("isolates generated ownership to four explicit repeated boundaries", async ({ page }) => {
    await openNoErrorWithBadge(page);
    const sidebar = owner(page, owners.sidebar);
    await expect(sidebar).toHaveCount(1);
    await expect(owner(sidebar, owners.item)).toHaveCount(8);
    await expect(owner(sidebar, owners.link)).toHaveCount(8);
    await expect(owner(sidebar, owners.badge)).toHaveCount(1);
    expect(
      await sidebar.evaluate(
        (root, ownerNames) =>
          Array.from(root.querySelectorAll("*")).filter(
            (element) =>
              Array.from(element.classList).some((token) => token.startsWith("x")) &&
              !Object.values(ownerNames).includes(
                element.getAttribute("data-stylex-owner") as never,
              ),
          ).length,
        owners,
      ),
    ).toBe(0);
  });

  test("pins desktop/mobile paint, geometry, screenshots, and frozen fallback equivalence", async ({
    page,
  }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await openNoErrorWithBadge(page);
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
        const itemBoxes = Array.from(
          root.querySelectorAll(`[data-stylex-owner="${names.item}"]`),
        ).map(rect);
        const linkBoxes = Array.from(
          root.querySelectorAll(`[data-stylex-owner="${names.link}"]`),
        ).map(rect);
        return {
          badge: rect(root.querySelector(`[data-stylex-owner="${names.badge}"]`)!),
          items: itemBoxes,
          links: linkBoxes,
        };
      }, owners);
      for (let index = 1; index < 8; index += 1)
        expect(boxes.items[index].top).toBeGreaterThanOrEqual(boxes.items[index - 1].bottom);
      expect(boxes.badge.left).toBeGreaterThanOrEqual(boxes.links[6].left);
      expect(boxes.badge.top).toBeLessThan(boxes.links[6].bottom);
      expect(boxes.badge.bottom).toBeGreaterThan(boxes.links[6].top);
      const fallback = await sidebar.evaluate((actual, names) => {
        const actualItem = actual.querySelector<HTMLElement>(
          `[data-stylex-owner="${names.item}"]`,
        )!;
        const actualLink = actualItem.querySelector<HTMLElement>(
          `[data-stylex-owner="${names.link}"]`,
        )!;
        const actualBadge = actual.querySelector<HTMLElement>(
          `[data-stylex-owner="${names.badge}"]`,
        )!;
        const ul = document.createElement("ul");
        const li = document.createElement("li");
        const a = document.createElement("a");
        const span = document.createElement("span");
        ul.className = "site-setting-nav";
        span.className = "notification-badge";
        ul.style.position = "absolute";
        ul.style.left = "-10000px";
        span.textContent = "1";
        a.append(span);
        li.append(a);
        ul.append(li);
        actual.parentElement!.append(ul);
        const pick = (element: Element, properties: string[]) => {
          const style = getComputedStyle(element);
          return properties.map((property) => style.getPropertyValue(property));
        };
        const result = {
          sidebar: [
            pick(actual, ["margin", "padding", "list-style-type"]),
            pick(ul, ["margin", "padding", "list-style-type"]),
          ],
          item: [
            pick(actualItem, ["margin-top", "font-size", "line-height", "border-left"]),
            pick(li, ["margin-top", "font-size", "line-height", "border-left"]),
          ],
          link: [
            pick(actualLink, [
              "display",
              "padding",
              "color",
              "text-decoration-line",
              "outline-style",
            ]),
            pick(a, ["display", "padding", "color", "text-decoration-line", "outline-style"]),
          ],
          badge: [
            pick(actualBadge, [
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
        ul.remove();
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
