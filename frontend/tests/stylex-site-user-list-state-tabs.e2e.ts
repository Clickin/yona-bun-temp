import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const owners = {
  item: "site-user-list-state-tab-item",
  link: "site-user-list-state-tab-link",
  tabs: "site-user-list-state-tabs",
} as const;

test("state tabs own exactly the legacy root, repeated item, and repeated link surface", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const projectSettingRoute = readFileSync(
    "src/routes/$ownerName/$projectName/setting.tsx",
    "utf8",
  );

  expect(legacy).toContain('<ul class="nav nav-tabs">');
  for (const state of ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"])
    expect(legacy).toContain(`UserState.${state}`);
  expect(bootstrap).toContain(".nav {\n  margin-bottom: 20px;");
  expect(bootstrap).toContain(".nav-tabs {\n  border-bottom: 1px solid #ddd;");
  expect(bootstrap).toContain(".nav-tabs > li {\n  margin-bottom: -1px;");
  expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUi).toContain("color: #3592b5;");
  expect(responsive).toContain(".nav-tabs li a {\n    padding-left: 5px !important;");
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="nav nav-tabs"');
  expect(route).not.toContain('className={item.state === currentState ? "active" : ""}');
  expect(route).toContain('data-selected={isActive ? "true" : undefined}');
  expect(route).toContain("styles.stateTabLinkActive");
  expect(route).not.toContain('className="num-badge"');
  expect(route).toContain('data-stylex-owner="site-user-list-state-tab-numeric-badge"');
  expect(route).toContain("styles.stateTabNumericBadge");
  for (const color of [
    "stateTabActiveBackground",
    "stateTabActiveText",
    "stateTabBorder",
    "stateTabHoverBackground",
    "stateTabHoverBorder",
    "stateTabText",
  ]) {
    expect(route).toContain(`siteUserListColors.${color}`);
    expect(theme).toContain(color);
  }
  expect(route).not.toContain("globalColors.");
  expect(projectSettingRoute).toContain('className="nav nav-tabs"');
});

test("populated ACTIVE tabs preserve order, interaction, and responsive geometry", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const tabs = page.locator(`[data-stylex-owner="${owners.tabs}"]`);
    const items = tabs.locator(`:scope > [data-stylex-owner="${owners.item}"]`);
    const links = items.locator(`[data-stylex-owner="${owners.link}"]`);
    await expect(items).toHaveCount(5);
    await expect(tabs).not.toHaveClass(/\bnav(?:-tabs)?\b/u);
    await expect(tabs.locator(':scope > [data-selected="true"]')).toHaveCount(1);
    await expect(items.nth(0)).toHaveAttribute("data-selected", "true");
    for (let index = 0; index < 5; index += 1)
      await expect(items.nth(index)).not.toHaveClass(/\bactive\b/u);
    await expect(links).toHaveText([
      "Unlocked user",
      "Locked user",
      "Deleted user",
      "Guest User",
      "Site admin2",
    ]);
    const badge = tabs.locator('[data-stylex-owner="site-user-list-state-tab-numeric-badge"]');
    await expect(badge).toHaveText("2");
    await expect(badge).not.toHaveClass(/\bnum-badge\b/u);
    expect(
      await badge.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          borderRadius: style.borderRadius,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          marginLeft: style.marginLeft,
          padding: style.padding,
          textShadow: style.textShadow,
          verticalAlign: style.verticalAlign,
        };
      }),
    ).toEqual({
      borderRadius: "2px",
      // Edge/macOS normalizes BlinkMacSystemFont from the legacy stack to system-ui.
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "13px",
      fontWeight: "700",
      marginLeft: "3px",
      padding: "2px 4px",
      textShadow: "none",
      verticalAlign: "top",
    });
    expect(
      await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ).toEqual(
      ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"].map(
        (state) => `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList?state=${state}`,
      ),
    );
    await expect(
      links.last().locator(':scope > [data-stylex-owner="site-user-list-state-tab-numeric-badge"]'),
    ).toHaveText("2");
    await expect(links.first()).toHaveCSS("color", "rgb(85, 85, 85)");
    await expect(links.first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(links.nth(1)).toHaveCSS("color", "rgb(53, 146, 181)");
    await links.nth(1).hover();
    await expect(links.nth(1)).toHaveCSS("background-color", "rgb(242, 242, 242)");
    await links.nth(1).focus();
    await expect(links.nth(1)).toHaveCSS("border-top-color", "rgb(238, 238, 238)");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.move(0, 0);
    const fallbackComparison = await tabs.evaluate((root) => {
      const fixture = document.createElement("ul");
      fixture.className = "nav nav-tabs";
      fixture.style.cssText = "position:absolute;left:-10000px";
      fixture.innerHTML = '<li class="active"><a>Active</a></li><li><a>Inactive</a></li>';
      root.parentElement!.append(fixture);
      const properties = [
        "backgroundColor",
        "borderBottomColor",
        "borderTopColor",
        "color",
        "display",
        "float",
        "fontWeight",
        "listStyleType",
        "lineHeight",
        "marginBottom",
        "marginLeft",
        "marginRight",
        "padding",
      ] as const;
      const values = (element: Element) => {
        const computed = getComputedStyle(element);
        return properties.map((property) => computed[property]);
      };
      const actual = root.querySelectorAll("a");
      const fallback = fixture.querySelectorAll("a");
      const result = {
        active: [values(actual[0]!), values(fallback[0]!)],
        inactive: [values(actual[1]!), values(fallback[1]!)],
        item: [values(root.querySelector("li")!), values(fixture.querySelector("li")!)],
        root: [values(root), values(fixture)],
      };
      fixture.remove();
      return result;
    });
    expect(fallbackComparison.active[0]).toEqual(fallbackComparison.active[1]);
    expect(fallbackComparison.inactive[0]).toEqual(fallbackComparison.inactive[1]);
    expect(fallbackComparison.item[0]).toEqual(fallbackComparison.item[1]);
    expect(fallbackComparison.root[0]).toEqual(fallbackComparison.root[1]);
    const boxes = await page.evaluate((names) => {
      const tabs = document.querySelector<HTMLElement>(`[data-stylex-owner="${names.tabs}"]`)!;
      const links = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${names.link}"]`),
      );
      return {
        links: links.map((link) => ({
          box: link.getBoundingClientRect().toJSON(),
          padding: getComputedStyle(link).padding,
        })),
        listHeadTop: document
          .querySelector<HTMLElement>('[data-stylex-owner="site-user-list-listhead"]')!
          .getBoundingClientRect().top,
        tabs: tabs.getBoundingClientRect().toJSON(),
      };
    }, owners);
    expect(boxes.tabs.width).toBeCloseTo(viewport.name === "desktop" ? 1116.891 : 323.609, 2);
    expect(boxes.tabs.height).toBe(viewport.name === "desktop" ? 38 : 75);
    expect(boxes.links[0].padding).toBe(viewport.name === "desktop" ? "8px 30px" : "8px 5px");
    expect(boxes.listHeadTop).toBe(boxes.tabs.bottom + 20);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-user-list-state-tabs-${viewport.name}.png`,
      ),
    });
    await page.evaluate(() => ((window as Window & { __tabsSpa?: boolean }).__tabsSpa = true));
    await links.nth(1).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("LOCKED");
    expect(await page.evaluate(() => (window as Window & { __tabsSpa?: boolean }).__tabsSpa)).toBe(
      true,
    );
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 3,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
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
    }),
  );
}
