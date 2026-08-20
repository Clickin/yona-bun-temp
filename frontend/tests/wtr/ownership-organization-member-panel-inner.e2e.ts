import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

const yobiImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
];

test("organization member panels preserve frozen inner provenance", async () => {
  const [route, legacy, yobi, pageLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(yobiSource, "utf8"),
    readFile(pageLessSource, "utf8"),
  ]);

  expect(legacy).toContain('<div class="bubble-wrap gray project-home">');
  expect(legacy).toContain('<div class="inner member-info">');
  expect(legacy).toContain('<h3>@Messages("user.role.org_admin")</h3>');
  expect(legacy).toContain('<h3>@Messages("user.role.org_member")</h3>');
  expect(legacy).toContain('<ul class="project-members">');
  expect(yobi.trim().split("\n")).toEqual(yobiImports.map((file) => `@import "less/${file}";`));
  expect(pageLess).toMatch(
    /\.inner\s*\{[\s\S]*?background-color: @white;[\s\S]*?margin-bottom:10px;[\s\S]*?font-size: 12px;[\s\S]*?overflow: hidden;[\s\S]*?vertical-align: top;[\s\S]*?&\.member-info\s*\{\s*margin-right: 0;\s*height:auto !important;/,
  );

  expect(route).toContain('className="inner member-info"');
  expect(route).toContain('data-owner="organization-home-members-panel"');
  expect(route).toContain('data-owner="organization-home-members-panel-inner"');
  expect(route).toContain('data-owner="organization-home-members-panel-title"');
});

async function mockOrganizationHome(page: Page) {
  const session = { isAnonymous: false, isGuest: false, isSiteAdmin: false, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: false,
        visibleProjects: [],
        adminMembers: [
          {
            loginId: "manager-user",
            userLabel: "Manager User",
            avatarUrl: "/legacy-assets/images/default-avatar-45.png",
          },
        ],
        memberMembers: [
          {
            loginId: "member-user",
            userLabel: "Member User",
            avatarUrl: "/legacy-assets/images/default-avatar-45.png",
          },
        ],
      },
    }),
  );
}

async function assertPanel(page: Page, kind: "manager" | "member", fallbackOff: boolean) {
  // Panels share one static owner since the 2026-08-05 refactor; kind is DOM order.
  const panels = page.locator('[data-owner="organization-home-members-panel"]');
  const panel = panels.nth(kind === "manager" ? 0 : 1);
  const inner = panel.locator('[data-owner="organization-home-members-panel-inner"]');
  const title = inner.locator('[data-owner="organization-home-members-panel-title"]');
  const list = inner.locator('[data-owner="organization-home-members-list"]');
  const member = inner.locator('[data-owner="organization-home-member"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveClass(/bubble-wrap gray project-home/);
  await expect(inner).toBeVisible();
  await expect(inner).toHaveClass(/inner/);
  await expect(inner).toHaveClass(/member-info/);
  await expect(title).toHaveText(kind === "manager" ? "Group Manager" : "Group Member");
  await expect(list).toBeVisible();
  await expect(member).toHaveCount(1);
  await expect(member.locator("a")).toHaveCount(2);
  await expect(member.locator("a").nth(1)).toHaveText(
    kind === "manager" ? "Manager User" : "Member User",
  );
  await expect(inner).not.toHaveAttribute("style");
  await expect(title).not.toHaveAttribute("style");

  const metrics = await inner.evaluate((node) => {
    const computed = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    const panelBox = node.parentElement?.getBoundingClientRect();
    return {
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      height: computed.height,
      marginRight: computed.marginRight,
      overflow: computed.overflow,
      verticalAlign: computed.verticalAlign,
      box,
      panelBox,
    };
  });
  expect(metrics.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(metrics.fontSize).toBe("12px");
  expect(metrics.marginRight).toBe("0px");
  expect(metrics.overflow).toBe("hidden");
  expect(metrics.verticalAlign).toBe("top");
  expect(metrics.box.height).toBeGreaterThan(0);
  expect(metrics.panelBox).not.toBeNull();
  expect(metrics.box.left).toBeGreaterThanOrEqual(metrics.panelBox!.left);
  expect(metrics.box.right).toBeLessThanOrEqual(metrics.panelBox!.right + 1);
  if (!fallbackOff) {
    expect(metrics.height).not.toBe("0px");
  }
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization member panels ${"normal"}`, async ({ page }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await expect(
      page.locator('[data-owner="organization-home-members-panel"]').nth(0),
    ).toBeVisible();
    await expect(
      page.locator('[data-owner="organization-home-members-panel"]').nth(1),
    ).toBeVisible();
    await assertPanel(page, "manager", fallbackOff);
    await assertPanel(page, "member", fallbackOff);
    const panelOrder = await page
      .locator('[data-owner="organization-home-members-panel"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node.className.includes("mt10") ? "member" : "manager")),
      );
    expect(panelOrder).toEqual(["manager", "member"]);

    const leave = page.getByRole("button", { name: "Leave the group" });
    await expect(leave).toBeVisible();
    await leave.click();
    await expect(page.locator("#alertLeave")).toHaveClass(/in/);
    await page.getByRole("button", { name: "No" }).click();
    await expect(page.locator("#alertLeave")).not.toHaveClass(/in/);

    await page.setViewportSize({ height: 844, width: 390 });
    await assertPanel(page, "manager", fallbackOff);
    await assertPanel(page, "member", fallbackOff);
  });
}
