import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("organization home moves the legacy header and menu shells into StyleX owners", async ({
  page,
}) => {
  const [legacyHeader, legacyMenu, style, route] = await Promise.all([
    readFile("../yona-original/app/views/organization/header.scala.html", "utf8"),
    readFile("../yona-original/app/views/organization/menu.scala.html", "utf8"),
    readFile("src/routes/organizations/-organization-home.stylex.ts", "utf8"),
    readFile("src/routes/organizations/$organizationName.tsx", "utf8"),
  ]);

  expect(legacyHeader).toContain('class="project-header-outer"');
  expect(legacyHeader).toContain('class="project-header-avatar"');
  expect(legacyMenu).toContain('class="project-menu-outer"');
  const legacyPage = await readFile(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  expect(legacyPage).toContain("float:left;");
  expect(legacyPage).toContain("padding:5px 20px 4px;");
  expect(legacyPage).toContain("background-color: #dadada;");
  expect(route).toContain("organizationMenuMigrationStyles");
  expect(route).toContain('padding: { default: "5px 20px 4px"');
  expect(route).toContain('"@media (max-width: 767px)": "5px 12px 4px"');
  expect(route).toContain('backgroundColor: "#dadada"');
  for (const owner of [
    "organization-profile-header-background",
    "organization-header-inner",
    "organization-header-wrap",
    "organization-header-avatar",
    "organization-header-breadcrumb",
    "organization-menu-shell",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const styleName of [
    "headerShell",
    "headerInner",
    "headerWrap",
    "headerAvatar",
    "headerBreadcrumb",
    "menuShell",
  ]) {
    expect(style).toContain(`${styleName}:`);
  }

  await mockOrganizationHome(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-stylex-owner="organization-profile-header-background"]'),
  ).toBeVisible();

  const desktop = await page.evaluate(() => {
    const required = [
      "organization-profile-header-background",
      "organization-header-inner",
      "organization-header-wrap",
      "organization-header-avatar",
      "organization-header-breadcrumb",
      "organization-menu-shell",
    ];
    const nodes = Object.fromEntries(
      required.map((owner) => [owner, document.querySelector(`[data-stylex-owner=\"${owner}\"]`)]),
    );
    if (Object.values(nodes).some((node) => !(node instanceof HTMLElement)))
      throw new Error("missing owner");
    const box = (node: Element) => (node as HTMLElement).getBoundingClientRect();
    return {
      avatar: box(nodes["organization-header-avatar"] as Element),
      breadcrumb: box(nodes["organization-header-breadcrumb"] as Element),
      header: box(nodes["organization-profile-header-background"] as Element),
      menu: box(nodes["organization-menu-shell"] as Element),
      headerBackground: getComputedStyle(nodes["organization-profile-header-background"] as Element)
        .backgroundColor,
      headerHeight: getComputedStyle(nodes["organization-profile-header-background"] as Element)
        .height,
      menuBackground: getComputedStyle(nodes["organization-menu-shell"] as Element).backgroundColor,
      menuHeight: getComputedStyle(nodes["organization-menu-shell"] as Element).height,
      menuItem: (() => {
        const item = document.querySelector('[data-stylex-owner="organization-menu-group"] > li');
        const link = item?.querySelector("a");
        if (!(item instanceof HTMLElement) || !(link instanceof HTMLElement))
          throw new Error("missing menu item");
        const itemStyle = getComputedStyle(item);
        const linkStyle = getComputedStyle(link);
        return {
          float: itemStyle.cssFloat,
          fontSize: itemStyle.fontSize,
          linkDisplay: linkStyle.display,
          lineHeight: linkStyle.lineHeight,
          padding: linkStyle.padding,
          linkWidth: link.getBoundingClientRect().width,
        };
      })(),
    };
  });
  expect(desktop.headerHeight).toBe("120px");
  expect(desktop.headerBackground).toBe("rgb(86, 86, 86)");
  expect(desktop.menuHeight).toBe("39px");
  expect(desktop.menuBackground).toBe("rgb(236, 236, 236)");
  expect(desktop.menuItem.float).toBe("left");
  expect(desktop.menuItem.fontSize).toBe("14px");
  expect(desktop.menuItem.linkDisplay).toBe("inline-block");
  expect(desktop.menuItem.lineHeight).toBe("30px");
  expect(desktop.menuItem.padding).toBe("5px 20px 4px");
  expect(desktop.menuItem.linkWidth).toBeGreaterThan(0);
  expect(desktop.avatar.bottom).toBeGreaterThan(desktop.header.bottom);
  expect(desktop.breadcrumb.bottom).toBeLessThanOrEqual(desktop.header.bottom);
  expect(desktop.menu.top).toBeCloseTo(desktop.header.bottom, 0);

  const firstMenuLink = page
    .locator('[data-stylex-owner="organization-menu-group"] > li a')
    .first();
  await firstMenuLink.hover();
  await expect
    .poll(async () =>
      firstMenuLink.evaluate((element) => {
        const computed = getComputedStyle(element);
        return `${computed.backgroundColor}|${computed.color}|${computed.textDecorationLine}`;
      }),
    )
    .toBe("rgb(218, 218, 218)|rgb(252, 73, 30)|none");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    headerWidth: document
      .querySelector('[data-stylex-owner="organization-profile-header-background"]')
      ?.getBoundingClientRect().width,
    menuWidth: document
      .querySelector('[data-stylex-owner="organization-menu-shell"]')
      ?.getBoundingClientRect().width,
    scrollWidth: document.documentElement.scrollWidth,
    menuLink: (() => {
      const link = document.querySelector('[data-stylex-owner="organization-menu-group"] > li a');
      if (!(link instanceof HTMLElement)) throw new Error("missing mobile menu link");
      const computed = getComputedStyle(link);
      return { padding: computed.padding, width: link.getBoundingClientRect().width };
    })(),
  }));
  expect(mobile.headerWidth).toBe(390);
  expect(mobile.menuWidth).toBe(390);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(398);
  expect(mobile.menuLink.padding).toBe("5px 12px 4px");
  expect(mobile.menuLink.width).toBeGreaterThan(0);
});

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = { isAnonymous: false, isGuest: false, isSiteAdmin: false, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanCreateProject: false,
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}
