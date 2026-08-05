import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const owners = {
  item: "site-user-list-sidebar-item",
  link: "site-user-list-sidebar-link",
  root: "site-user-list-sidebar-nav",
} as const;

test("sidebar nav owns only UL, repeated LI variants, and direct Links", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('<ul class="site-setting-nav">');
  expect(pageLess).toContain(".site-setting-nav {");
  const sidebarSource = readFileSync("src/components/site-admin-sidebar.tsx", "utf8");
  expect(route).toContain('navOwner="site-user-list-sidebar-nav"');
  expect(route).toContain('ownerPrefix="site-user-list-sidebar"');
  expect(sidebarSource).toContain("data-stylex-owner={navOwner}");
  expect(sidebarSource).toContain("`${ownerPrefix}-item`");
  expect(sidebarSource).toContain("`${ownerPrefix}-link`");
  for (const retired of ["site-setting-nav", "active"])
    expect(route).not.toContain(`className="${retired}"`);
  expect(route).not.toContain('className="notification-badge"');
  expect(route).toContain('badgeOwner="site-user-list-sidebar-notification-badge"');
  expect(route).toContain("styles.sidebarNotificationBadge");
  for (const paint of ["sidebarAccent", "sidebarBorder", "sidebarHoverSurface"])
    expect(theme).toContain(paint);
  expect(route).not.toContain("globalColors.");
});

test("sidebar copy, navigation, variants, and frozen output survive desktop/mobile", async ({
  page,
}) => {
  await installFixture(page);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const root = page.locator(`[data-stylex-owner="${owners.root}"]`);
    const items = root.locator(`:scope > [data-stylex-owner="${owners.item}"]`);
    const links = items.locator(`:scope > [data-stylex-owner="${owners.link}"]`);
    await expect(items).toHaveCount(8);
    await expect(
      root.locator(
        ':scope > [data-stylex-owner="site-user-list-sidebar-item"][data-selected="true"]',
      ),
    ).toHaveCount(1);
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
    ).toEqual(
      [
        "/sites/userList",
        "/sites/postList",
        "/sites/issueList",
        "/sites/projectList",
        "/sites/mail",
        "/sites/massmail",
        "/sites/update",
        "/sites/diagnostic",
      ].map((path) => `${basePath}${path}`),
    );
    const badge = root.locator('[data-stylex-owner="site-user-list-sidebar-notification-badge"]');
    await expect(badge).toHaveText("1");
    await expect(badge).not.toHaveClass(/\bnotification-badge\b/u);
    await expect
      .poll(() =>
        badge.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            backgroundColor: style.backgroundColor,
            border: style.border,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            color: style.color,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            padding: style.padding,
          };
        }),
      )
      .toEqual({
        backgroundColor: "rgb(255, 115, 50)",
        border: "2px solid rgb(255, 255, 255)",
        borderRadius: "10px",
        boxShadow: "rgba(0, 0, 0, 0.2) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 1px 1px 0px inset",
        color: "rgb(236, 240, 241)",
        fontSize: "12px",
        lineHeight: "20px",
        padding: "0px 5px",
      });
    expect(
      await items.evaluateAll((nodes) =>
        nodes.map((node) => ({
          active: node.classList.contains("active"),
          generated: Array.from(node.classList).some((token) => token.startsWith("x")),
        })),
      ),
    ).toEqual(Array.from({ length: 8 }, () => ({ active: false, generated: true })));
    const evidence = await page.evaluate((owners) => {
      const root = document.querySelector<HTMLElement>(`[data-stylex-owner="${owners.root}"]`)!;
      const items = Array.from(root.children) as HTMLElement[];
      const links = items.map((item) => item.firstElementChild as HTMLElement);
      const style = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          backgroundColor: s.backgroundColor,
          borderLeftColor: s.borderLeftColor,
          borderLeftStyle: s.borderLeftStyle,
          borderLeftWidth: s.borderLeftWidth,
          color: s.color,
          display: s.display,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          listStyleType: s.listStyleType,
          marginTop: s.marginTop,
          padding: s.padding,
          textDecoration: s.textDecorationLine,
        };
      };
      const fixture = document.createElement("ul");
      fixture.className = "site-setting-nav";
      fixture.style.cssText = `position:absolute;left:-10000px;width:${root.getBoundingClientRect().width}px`;
      fixture.innerHTML = '<li class="active"><a>Users</a></li><li><a>Posts</a></li>';
      root.parentElement!.append(fixture);
      const fallbackItems = Array.from(fixture.children);
      const fallbackLinks = fallbackItems.map((item) => item.firstElementChild!);
      const result = {
        actual: {
          activeItem: style(items[0]),
          activeLink: style(links[0]),
          defaultItem: style(items[1]),
          defaultLink: style(links[1]),
          root: style(root),
        },
        boxes: {
          items: items.map((item) => item.getBoundingClientRect().toJSON()),
          links: links.map((link) => link.getBoundingClientRect().toJSON()),
          root: root.getBoundingClientRect().toJSON(),
        },
        fallback: {
          activeItem: style(fallbackItems[0]),
          activeLink: style(fallbackLinks[0]),
          defaultItem: style(fallbackItems[1]),
          defaultLink: style(fallbackLinks[1]),
          root: style(fixture),
        },
      };
      fixture.remove();
      return result;
    }, owners);
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.actual.root.listStyleType).toBe("none");
    expect(evidence.actual.activeItem).toMatchObject({
      borderLeftColor: "rgb(243, 108, 34)",
      borderLeftStyle: "solid",
      borderLeftWidth: "4px",
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "30px",
      marginTop: "0px",
    });
    expect(evidence.actual.defaultItem).toMatchObject({
      borderLeftColor: "rgb(238, 238, 238)",
      borderLeftStyle: "solid",
      borderLeftWidth: "4px",
      fontSize: "14px",
      fontWeight: "400",
      lineHeight: "30px",
      marginTop: "3px",
    });
    expect(evidence.actual.defaultLink).toMatchObject({ display: "block", padding: "5px 10px" });
    for (const [index, box] of evidence.boxes.items.entries()) {
      expect(box.left).toBe(evidence.boxes.root.left);
      expect(box.right).toBeLessThanOrEqual(evidence.boxes.root.right);
      if (index) expect(box.top).toBe(evidence.boxes.items[index - 1].bottom + 3);
    }
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-site-user-list-sidebar-nav-${viewport.name}.png`,
      ),
    });
    await links.nth(1).hover();
    await expect
      .poll(() =>
        links.nth(1).evaluate((node) => ({
          background: getComputedStyle(node).backgroundColor,
          color: getComputedStyle(node).color,
          decoration: getComputedStyle(node).textDecorationLine,
        })),
      )
      .toEqual({
        background: "rgb(238, 238, 238)",
        color: "rgb(243, 108, 34)",
        decoration: "none",
      });
    await links.nth(0).hover();
    await expect
      .poll(() =>
        links.nth(0).evaluate((node) => ({
          background: getComputedStyle(node).backgroundColor,
          color: getComputedStyle(node).color,
          decoration: getComputedStyle(node).textDecorationLine,
        })),
      )
      .toEqual({
        background: "rgba(0, 0, 0, 0)",
        color: "rgb(243, 108, 34)",
        decoration: "none",
      });
    await page.locator('[data-stylex-owner="site-user-list-title-strip"]').hover();
    await links.nth(1).focus();
    expect(
      await links.nth(1).evaluate((node) => ({
        background: getComputedStyle(node).backgroundColor,
        color: getComputedStyle(node).color,
        decoration: getComputedStyle(node).textDecorationLine,
      })),
    ).toEqual({
      background: "rgba(0, 0, 0, 0)",
      color: "rgb(243, 108, 34)",
      decoration: "underline",
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: "2.0.0" } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 0,
        totalPages: 0,
        users: [],
      },
    }),
  );
}
