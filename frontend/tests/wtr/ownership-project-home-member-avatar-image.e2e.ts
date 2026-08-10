import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const memberAvatarUrl = `${basePath}/legacy-assets/images/default-avatar-34.png`;

test.use({ locale: "en-US" });

test("project-home member avatar image preserves legacy Style surface and containment", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/project/home.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");

  expect(legacy).toContain('class="avatar-wrap img-rounded pull-left small"');
  expect(legacy).toContain(
    '<img src="@member.avatarUrl" alt="@member.loginId" width="24" height="24">',
  );
  expect(yobi.trim().split("\n")).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(common).toContain(".avatar-wrap {\n    width:32px; height:32px;");
  expect(common).toContain("&.small { width:24px; height:24px;   }");
  expect(pageLess).toContain(".project-members {");
  expect(pageLess).toContain("padding: 5px 10px;");
  expect(yobiUi).toContain("background:#ddd;");
  expect(yobiUi).toContain("width:100%;\n        vertical-align:top;");

  expect(route).toContain('data-owner="project-home-member-avatar-image"');

  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [
          {
            avatarUrl: memberAvatarUrl,
            loginId: "alice",
            role: "member",
            userId: 2,
            userLabel: "Alice Doe",
          },
        ],
        menuSetting: { issue: true, pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator('[data-owner="project-home-member"]').first()).toBeVisible();
  await expect(page.locator('[data-owner="project-home-member-avatar"]').first()).toBeVisible();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample`);
    const member = page.locator('[data-owner="project-home-member"]').first();
    const surface = member.locator('[data-owner="project-home-member-avatar"]');
    const image = member.locator('[data-owner="project-home-member-avatar-image"]');
    await expect(image).toHaveAttribute("src", memberAvatarUrl);
    await expect(surface).toHaveCSS("background-color", "rgb(221, 221, 221)");
    await expect(surface).toHaveCSS("overflow", "hidden");
    await expect(image).toHaveCSS("vertical-align", "top");
    const boxes = await surface.evaluate((element) => {
      const image = element.querySelector("img");
      if (!image) throw new Error("member avatar image missing");
      const surfaceBox = element.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        surface: surfaceBox.toJSON(),
        image: imageBox.toJSON(),
      };
    });
    expect(boxes.clientWidth).toBe(viewport.width);
    expect(boxes.scrollWidth).toBe(viewport.width);
    expect(boxes.image.left).toBeGreaterThanOrEqual(boxes.surface.left);
    expect(boxes.image.top).toBeGreaterThanOrEqual(boxes.surface.top);
  }
});
