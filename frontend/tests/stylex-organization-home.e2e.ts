import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("organization home owns legacy small-font typography in route-local StyleX", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const stylex = readFileSync("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );

  expect(legacy).toContain(".small-font{");
  expect(legacy).toContain("font-size: 10px;");
  expect(legacy).toContain("font-weight: normal;");
  expect(appCss).not.toContain(".small-font");
  expect(route).not.toContain("small-font");
  expect(route).toContain('data-stylex-owner="organization-home-project-origin"');
  expect(route).toContain('data-stylex-owner="organization-home-project-code-update"');
  expect(stylex).toContain('smallFont: { fontSize: "10px", fontWeight: "normal" }');
  expect(legacy).toContain(".blue-txt      { color:@blue;}");
  expect(variables).toContain("@blue   : #5DBBE0;");
  expect(route).not.toContain("blue-txt");
  expect(route).toContain('data-stylex-owner="organization-home-project-origin"');
  expect(stylex).toContain('originProjectText: "#5DBBE0"');
  expect(stylex).toContain("projectOrigin: { color: organizationHomeColors.originProjectText }");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`organization home preserves fork origin blue text on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { isAnonymous: false, isGuest: false, loginId: "admin" },
      }),
    );
    await page.route("**/api/v1/organizations/acme/container", (route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          organizationName: "acme",
          description: "Acme projects",
          logoUrl: "",
          viewerCanUpdate: true,
          viewerCanLeave: true,
          viewerCanLeaveAfterValidation: true,
          viewerCanCreateProject: true,
          visibleProjects: [
            {
              ownerName: "acme",
              projectName: "forked",
              originOwnerName: "admin",
              originProjectName: "sample",
              overview: "Forked project",
              projectScope: "PUBLIC",
              createdLabel: "today",
              labels: [],
            },
          ],
          adminMembers: [],
          memberMembers: [],
        },
      }),
    );
    await page.goto("/yona/organizations/acme");
    const origin = page.locator('[data-stylex-owner="organization-home-project-origin"]');
    await expect(origin).toHaveText(/admin\s*\/\s*sample/u);
    await expect(origin).not.toHaveClass(/(?:^|\s)blue-txt(?:\s|$)/u);
    await expect
      .poll(() => origin.evaluate((element) => getComputedStyle(element).color))
      .toBe("rgb(93, 187, 224)");
  });
}

test("organization home renders legacy project and member panels", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/organizations/acme/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "acme",
        description: "Acme projects",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "acme",
            projectName: "sample",
            overview: "Sample project",
            projectScope: "PUBLIC",
            createdLabel: "today",
            labels: [],
          },
        ],
        adminMembers: [{ loginId: "admin", userLabel: "Admin", avatarUrl: "" }],
        memberMembers: [{ loginId: "member", userLabel: "Member", avatarUrl: "" }],
      },
    }),
  );
  await page.goto("/yona/organizations/acme");
  await expect(page.locator('[data-stylex-owner="organization-home-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-home-overview"]')).toContainText(
    "Acme projects",
  );
  const header = page.locator('[data-stylex-owner="organization-home-header"]');
  const overview = page.locator('[data-stylex-owner="organization-home-overview"]');
  const title = overview.locator("h3");
  await expect(title).toContainText("Acme projects");
  const desktopHeaderGeometry = await header.evaluate((element) => {
    const overviewElement = element.querySelector(
      '[data-stylex-owner="organization-home-overview"]',
    );
    const titleElement = overviewElement?.querySelector("h3");
    const headerStyle = getComputedStyle(element);
    const overviewStyle = overviewElement ? getComputedStyle(overviewElement) : null;
    const titleStyle = titleElement ? getComputedStyle(titleElement) : null;
    const headerBox = element.getBoundingClientRect();
    const overviewBox = overviewElement?.getBoundingClientRect();
    return {
      headerBottom: headerBox.bottom,
      headerMarginBottom: headerStyle.marginBottom,
      headerPadding: headerStyle.padding,
      headerPosition: headerStyle.position,
      headerTop: headerBox.top,
      overviewBorderLeft: overviewStyle?.borderLeft,
      overviewPadding: overviewStyle?.padding,
      overviewBottom: overviewBox?.bottom ?? 0,
      overviewTop: overviewBox?.top ?? 0,
      titleFontSize: titleStyle?.fontSize,
      titleFontWeight: titleStyle?.fontWeight,
      titleLineHeight: titleStyle?.lineHeight,
    };
  });
  expect(desktopHeaderGeometry.headerMarginBottom).toBe("20px");
  expect(desktopHeaderGeometry.headerPadding).toBe("5px 0px");
  expect(desktopHeaderGeometry.headerPosition).toBe("relative");
  expect(desktopHeaderGeometry.overviewBorderLeft).toBe("3px solid rgb(252, 73, 30)");
  expect(desktopHeaderGeometry.overviewPadding).toBe("0px 10px");
  expect(desktopHeaderGeometry.overviewTop).toBeGreaterThanOrEqual(desktopHeaderGeometry.headerTop);
  expect(desktopHeaderGeometry.overviewBottom).toBeLessThanOrEqual(
    desktopHeaderGeometry.headerBottom,
  );
  expect(desktopHeaderGeometry.titleFontSize).toBe("14px");
  expect(desktopHeaderGeometry.titleFontWeight).toBe("400");
  expect(desktopHeaderGeometry.titleLineHeight).toBe("30px");
  await expect(page.locator('[data-stylex-owner="organization-home-projects"]')).toContainText(
    "sample",
  );
  await expect(page.locator('[data-stylex-owner="organization-home-members"]')).toBeVisible();
  const panels = page.locator('[data-stylex-owner="organization-home-members-panel"]');
  await expect(panels).toHaveCount(2);
  await expect(panels.first().locator('a[title="admin"]')).toHaveCount(2);
  await expect(panels.nth(1).locator('a[title="member"]')).toHaveCount(2);
  const desktopGeometry = await panels.first().evaluate((panel) => {
    const inner = panel.querySelector(
      '[data-stylex-owner="organization-home-members-panel-inner"]',
    );
    const list = panel.querySelector('[data-stylex-owner="organization-home-members-list"]');
    const member = panel.querySelector('[data-stylex-owner="organization-home-member"]');
    const panelStyle = getComputedStyle(panel);
    const innerStyle = inner ? getComputedStyle(inner) : null;
    const listStyle = list ? getComputedStyle(list) : null;
    const memberStyle = member ? getComputedStyle(member) : null;
    return {
      panelWidth: panel.getBoundingClientRect().width,
      panelPadding: panelStyle.padding,
      innerWidth: inner?.getBoundingClientRect().width ?? 0,
      innerBackground: innerStyle?.backgroundColor,
      innerRadius: innerStyle?.borderRadius,
      listPadding: listStyle?.padding,
      memberBorder: memberStyle?.borderBottomStyle,
    };
  });
  expect(desktopGeometry.panelWidth).toBeGreaterThan(0);
  expect(desktopGeometry.innerWidth).toBeGreaterThan(0);
  expect(desktopGeometry.panelPadding).toBe("10px");
  expect(desktopGeometry.innerBackground).toBe("rgb(255, 255, 255)");
  expect(desktopGeometry.innerRadius).toBe("10px");
  expect(desktopGeometry.listPadding).toBe("10px");
  expect(desktopGeometry.memberBorder).toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  const containment = await page
    .locator('[data-stylex-owner="organization-home-page"]')
    .evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
  expect(containment.width).toBeGreaterThan(0);
  expect(containment.scrollWidth).toBe(390);
  await expect(overview).toContainText("Acme projects");
  const mobileHeaderGeometry = await header.evaluate((element) => {
    const overviewElement = element.querySelector(
      '[data-stylex-owner="organization-home-overview"]',
    );
    const headerBox = element.getBoundingClientRect();
    const overviewBox = overviewElement?.getBoundingClientRect();
    return {
      headerLeft: headerBox.left,
      headerRight: headerBox.right,
      overviewLeft: overviewBox?.left ?? 0,
      overviewRight: overviewBox?.right ?? 0,
      viewport: window.innerWidth,
    };
  });
  expect(mobileHeaderGeometry.headerLeft).toBeGreaterThanOrEqual(0);
  expect(mobileHeaderGeometry.headerRight).toBeLessThanOrEqual(mobileHeaderGeometry.viewport);
  expect(mobileHeaderGeometry.overviewLeft).toBeGreaterThanOrEqual(0);
  expect(mobileHeaderGeometry.overviewRight).toBeLessThanOrEqual(mobileHeaderGeometry.viewport);
  const mobileGeometry = await panels.first().evaluate((panel) => ({
    width: panel.getBoundingClientRect().width,
    right: panel.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(mobileGeometry.width).toBeGreaterThan(0);
  expect(mobileGeometry.right).toBeLessThanOrEqual(mobileGeometry.viewport);
  await expect(panels.first().locator('a[title="admin"]').last()).toBeVisible();
});

test("organization home membership panels map frozen legacy declarations to route-local StyleX", () => {
  const route = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const stylex = readFileSync("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(legacy).toContain(".project-home {");
  expect(legacy).toContain("padding: 10px;");
  expect(legacy).toContain("font-size: 12px;");
  expect(legacy).toContain(".project-members {");
  expect(legacy).toContain("border-bottom: 1px solid #ededed;");
  expect(stylex).toContain('memberPanel: { padding: "10px" }');
  expect(stylex).toContain('fontSize: "12px"');
  expect(stylex).toContain('memberList: { listStyle: "none", margin: "0", padding: "10px" }');
  expect(stylex).toContain('borderBottomColor: "#ededed"');
  expect(route).toContain('data-stylex-owner="organization-home-members-panel"');
  expect(route).toContain('data-stylex-owner="organization-home-members-list"');
  expect(route).toContain('data-stylex-owner="organization-home-member"');
});

test("organization home header and overview map frozen declarations to route-local StyleX", () => {
  const route = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const stylex = readFileSync("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(legacy).toContain(".project-home-header {");
  expect(legacy).toContain("padding:5px 0 ;");
  expect(legacy).toContain("margin-bottom:20px;");
  expect(legacy).toContain("position: relative;");
  expect(legacy).toContain("border-left:3px solid #fc491e;");
  expect(legacy).toContain("padding:0 10px;");
  expect(legacy).toContain("line-height: 30px;");
  expect(legacy).toContain("font-size:14px;");
  expect(legacy).toContain("font-weight: normal;");
  expect(stylex).toContain(
    'projectHomeHeader: { marginBottom: "20px", padding: "5px 0", position: "relative" }',
  );
  expect(stylex).toContain('borderLeftColor: "#fc491e"');
  expect(stylex).toContain('padding: "0 10px"');
  expect(stylex).toContain(
    'overviewTitle: { fontSize: "14px", fontWeight: "normal", lineHeight: "30px" }',
  );
  expect(route).toContain('data-stylex-owner="organization-home-header"');
  expect(route).toContain('data-stylex-owner="organization-home-overview"');
});
