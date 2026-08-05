import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const yobiUiSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
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

test("organization member panel avatars preserve frozen provenance", async () => {
  const [route, legacy, yobi, yobiUi] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(yobiSource, "utf8"),
    readFile(yobiUiSource, "utf8"),
  ]);

  expect(legacy).toContain("@makeUser(organizationUser: OrganizationUser, isShow: Boolean)");
  expect(legacy).toContain('<li class="member">');
  expect(legacy).toContain('class="avatar-wrap"');
  expect(legacy).toContain('title="@organizationUser.user.loginId"');
  expect(legacy).toContain('<img src="@organizationUser.user.avatarUrl" height="45" width="45" />');
  expect(legacy).toContain("@organizationUser.user.getDisplayName");
  expect(yobi.trim().split("\n")).toEqual(yobiImports.map((file) => `@import "less/${file}";`));
  expect(yobiUi).toMatch(
    /\.avatar-wrap\s*\{\s*width:32px;\s*height:32px;[\s\S]*?display:inline-block;\s*vertical-align:middle;\s*overflow:hidden;\s*background:#ddd;[\s\S]*?\.border-radius\(3px\) !important;[\s\S]*?img\s*\{\s*width:100%;\s*vertical-align:top;/,
  );
  expect(route).toContain("wrapper: {");
  expect(route).toContain('backgroundColor: "#ddd"');
  expect(route).toContain('width: "32px"');
  expect(route).toContain('height: "32px"');
  expect(route).toContain('image: { verticalAlign: "top", width: "100%" }');
  expect(route).toContain('data-stylex-owner="organization-home-member-avatar"');
  expect(route).toContain('data-stylex-owner="organization-home-member-avatar-image"');
  expect(route).not.toContain("style={{");
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

async function assertPanelAvatar(page: Page, kind: "manager" | "member") {
  const panel = page
    .locator('[data-stylex-owner="organization-home-members-panel"]')
    .nth(kind === "manager" ? 0 : 1);
  const member = panel.locator('[data-stylex-owner="organization-home-member"]');
  const avatar = member.locator('[data-stylex-owner="organization-home-member-avatar"]');
  const image = avatar.locator('[data-stylex-owner="organization-home-member-avatar-image"]');
  const loginId = kind === "manager" ? "manager-user" : "member-user";
  const label = kind === "manager" ? "Manager User" : "Member User";
  await expect(panel).toBeVisible();
  await expect(member).toBeVisible();
  await expect(avatar).toHaveClass(/avatar-wrap/);
  await expect(avatar).not.toHaveAttribute("style");
  await expect(avatar).toHaveAttribute("href", /\/yona\/[^/]+$/);
  await expect(avatar).toHaveAttribute("title", loginId);
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /default-avatar-45\.png$/);
  await expect(image).toHaveAttribute("height", "45");
  await expect(image).toHaveAttribute("width", "45");
  await expect(image).toHaveAttribute("alt", "");
  await expect(image).not.toHaveAttribute("style");
  await expect(member.locator("a").nth(1)).toHaveText(label);
  await expect(member.locator("a").nth(1)).toHaveAttribute("href", /\/yona\/[^/]+$/);
  await expect(member.locator("a").nth(1)).toHaveAttribute("title", loginId);

  const metrics = await avatar.evaluate((node) => {
    const image = node.querySelector("img");
    const wrapperStyle = getComputedStyle(node);
    const imageStyle = image ? getComputedStyle(image) : null;
    const wrapperBox = node.getBoundingClientRect();
    const imageBox = image?.getBoundingClientRect();
    const memberBox = node.parentElement?.getBoundingClientRect();
    return {
      wrapperWidth: wrapperStyle.width,
      wrapperHeight: wrapperStyle.height,
      display: wrapperStyle.display,
      verticalAlign: wrapperStyle.verticalAlign,
      overflow: wrapperStyle.overflow,
      backgroundColor: wrapperStyle.backgroundColor,
      borderRadius: wrapperStyle.borderRadius,
      imageWidth: imageStyle?.width,
      imageVerticalAlign: imageStyle?.verticalAlign,
      wrapperBox,
      imageBox,
      memberBox,
    };
  });
  expect(metrics.wrapperWidth).toBe("32px");
  expect(metrics.wrapperHeight).toBe("32px");
  expect(metrics.display).toBe("inline-block");
  expect(metrics.verticalAlign).toBe("middle");
  expect(metrics.overflow).toBe("hidden");
  expect(metrics.backgroundColor).toBe("rgb(221, 221, 221)");
  expect(metrics.borderRadius).toBe("3px");
  expect(metrics.imageWidth).toBe("32px");
  expect(metrics.imageVerticalAlign).toBe("top");
  expect(metrics.memberBox).not.toBeNull();
  expect(metrics.imageBox).not.toBeNull();
  expect(metrics.wrapperBox.left).toBeGreaterThanOrEqual(metrics.memberBox!.left);
  expect(metrics.wrapperBox.right).toBeLessThanOrEqual(metrics.memberBox!.right + 1);
  expect(metrics.imageBox!.left).toBe(metrics.wrapperBox.left);
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization member panel avatars ${fallbackOff ? "fallback-off" : "normal"}`, async ({
    page,
  }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await assertPanelAvatar(page, "manager");
    await assertPanelAvatar(page, "member");
    await page.setViewportSize({ height: 844, width: 390 });
    await assertPanelAvatar(page, "manager");
    await assertPanelAvatar(page, "member");
  });
}
