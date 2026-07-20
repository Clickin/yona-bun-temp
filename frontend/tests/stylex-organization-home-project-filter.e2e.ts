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
      const style = getComputedStyle(node);
      const cardBox = node.getBoundingClientRect();
      const listBox = node.parentElement?.getBoundingClientRect();
      return {
        borderBottom: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
        cardBottom: cardBox.bottom,
        cardTop: cardBox.top,
        listBottom: listBox?.bottom ?? 0,
        overflow: style.overflow,
        padding: style.padding,
      };
    });
    expect(metrics.padding).toBe("15px 0px 10px");
    expect(metrics.overflow).toBe("hidden");
    expect(metrics.borderBottom).toBe("1px solid rgb(220, 220, 220)");
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
