import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/organizations/-organization-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("organization home project filter uses conditional StyleX visibility", async () => {
  const [route, style, legacy, pageLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(pageLessSource, "utf8"),
  ]);
  expect(legacy).toContain("project");
  expect(route).toContain('data-stylex-owner="organization-home-project-filter-item"');
  expect(route).toContain("projectHidden");
  expect(route).not.toContain('style={hidden ? { display: "none" } : undefined}');
  expect(style).toContain('projectHidden: { display: "none" }');
  expect(route).toContain('borderBottomColor: "#DCDCDC"');
  expect(route).toContain('borderBottomStyle: "solid"');
  expect(route).toContain('borderBottomWidth: "1px"');
  expect(route).toContain('overflow: "hidden"');
  expect(route).toContain('padding: "15px 0 10px 0"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-owner-avatar"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-header"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-description"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-name-tag"');
  expect(route).toContain('data-stylex-owner="organization-home-project-card-stats"');
  expect(style).toContain("projectCardOwnerAvatar:");
  expect(style).toContain('overflow: "hidden"');
  expect(style).toContain('display: "inline"');
  expect(style).toContain('float: "left"');
  expect(style).toContain('width: "50px"');
  expect(style).toContain('height: "50px"');
  expect(style).toContain('marginRight: "10px"');
  expect(style).toContain('borderRadius: "3px"');
  expect(style).toContain('position: "relative"');
  expect(style).toContain("projectCardHeader:");
  expect(style).toContain('fontSize: "20px"');
  expect(style).toContain('fontWeight: "bold"');
  expect(style).toContain('marginBottom: "5px"');
  expect(style).toContain('marginLeft: "10px"');
  expect(style).toContain("projectCardDescription:");
  expect(style).toContain('overflowY: "auto"');
  expect(style).toContain('maxHeight: "100px"');
  expect(style).toContain('maxWidth: "647px"');
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(style).toContain('color: "#bababa"');
  expect(style).toContain("projectCardNameTag:");
  expect(style).toContain('fontSize: "11px"');
  expect(style).toContain('color: "#999"');
  expect(style).toContain('projectCardStats: { marginTop: "0", textAlign: "right" }');
  expect(pageLess).toContain("padding: 15px 0 10px 0;");
  expect(pageLess).toContain("overflow: hidden;");
  expect(pageLess).toContain("border-bottom: 1px solid #DCDCDC;");
});

async function mockOrganizationHome(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "weblabs",
            projectName: "sample",
            overview: "Sample project",
            projectScope: "PUBLIC",
            createdLabel: "today",
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "other",
            overview: "Other project",
            projectScope: "PUBLIC",
            createdLabel: "yesterday",
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`organization project card owns frozen geometry and filtering on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockOrganizationHome(page);
    await page.goto("/yona/organizations/weblabs");

    const card = page
      .locator('[data-stylex-owner="organization-home-project-filter-item"]')
      .first();
    const list = page.locator('[data-stylex-owner="organization-home-projects"]');
    await expect(card).toBeVisible();
    await expect(card.locator(".header a.black")).toHaveText("sample");
    await expect(card.locator(".desc")).toHaveText("Sample project");

    const metrics = await card.evaluate((node) => {
      const ownerAvatar = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-owner-avatar"]',
      );
      const header = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-header"]',
      );
      const description = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-description"]',
      );
      const nameTag = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-name-tag"]',
      );
      const stats = node.querySelector(
        '[data-stylex-owner="organization-home-project-card-stats"]',
      );
      const style = getComputedStyle(node);
      const cardBox = node.getBoundingClientRect();
      const listBox = node.parentElement?.getBoundingClientRect();
      const ownerStyle = ownerAvatar ? getComputedStyle(ownerAvatar) : null;
      const headerStyle = header ? getComputedStyle(header) : null;
      const descriptionStyle = description ? getComputedStyle(description) : null;
      const nameTagStyle = nameTag ? getComputedStyle(nameTag) : null;
      const statsStyle = stats ? getComputedStyle(stats) : null;
      return {
        borderBottom: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
        cardBottom: cardBox.bottom,
        cardTop: cardBox.top,
        listBottom: listBox?.bottom ?? 0,
        overflow: style.overflow,
        padding: style.padding,
        ownerAvatar: ownerStyle
          ? {
              borderRadius: ownerStyle.borderRadius,
              display: ownerStyle.display,
              float: ownerStyle.float,
              height: ownerStyle.height,
              marginRight: ownerStyle.marginRight,
              overflow: ownerStyle.overflow,
              position: ownerStyle.position,
              width: ownerStyle.width,
            }
          : null,
        header: headerStyle
          ? {
              fontSize: headerStyle.fontSize,
              fontWeight: headerStyle.fontWeight,
              marginBottom: headerStyle.marginBottom,
              marginLeft: headerStyle.marginLeft,
            }
          : null,
        description: descriptionStyle
          ? {
              color: descriptionStyle.color,
              marginLeft: descriptionStyle.marginLeft,
              maxHeight: descriptionStyle.maxHeight,
              maxWidth: descriptionStyle.maxWidth,
              overflowY: descriptionStyle.overflowY,
              textOverflow: descriptionStyle.textOverflow,
            }
          : null,
        nameTag: nameTagStyle
          ? {
              color: nameTagStyle.color,
              fontSize: nameTagStyle.fontSize,
              margin: nameTagStyle.margin,
              marginLeft: nameTagStyle.marginLeft,
            }
          : null,
        stats: statsStyle
          ? { marginTop: statsStyle.marginTop, textAlign: statsStyle.textAlign }
          : null,
      };
    });
    expect(metrics.padding).toBe("15px 0px 10px");
    expect(metrics.overflow).toBe("hidden");
    expect(metrics.borderBottom).toBe("1px solid rgb(220, 220, 220)");
    expect(metrics.ownerAvatar).toEqual({
      borderRadius: "3px",
      display: viewport.name === "desktop" ? "block" : "none",
      float: "left",
      height: "50px",
      marginRight: "10px",
      overflow: "hidden",
      position: "relative",
      width: "50px",
    });
    expect(metrics.header).toEqual({
      fontSize: "20px",
      fontWeight: "700",
      marginBottom: "5px",
      marginLeft: "10px",
    });
    expect(metrics.description).toEqual({
      color: "rgb(186, 186, 186)",
      marginLeft: "10px",
      maxHeight: "100px",
      maxWidth: "647px",
      overflowY: "auto",
      textOverflow: "ellipsis",
    });
    expect(metrics.nameTag).toEqual({
      color: "rgb(153, 153, 153)",
      fontSize: "11px",
      margin: "0px 0px 0px 10px",
      marginLeft: "10px",
    });
    expect(metrics.stats).toEqual({ marginTop: "0px", textAlign: "right" });
    expect(metrics.cardTop).toBeGreaterThanOrEqual(0);
    expect(metrics.cardBottom).toBeLessThanOrEqual(metrics.listBottom);

    const filter = page.locator("#mylist-filter");
    await filter.fill("missing");
    await expect(card).toBeHidden();
    await expect(
      list.locator('[data-stylex-owner="organization-home-project-filter-item"]'),
    ).toHaveCount(2);
    await filter.fill("sample");
    await expect(card).toBeVisible();
    await expect(card.locator(".header a.black")).toHaveText("sample");
  });
}
