import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve builds fixture paths as strings.
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");

test.use({ locale: "en-US" });

test("project home member avatar preserves frozen wrapper geometry and fallback", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const legacy = readFileSync(
    resolve(repoRoot, "yona-original/app/views/project/home.scala.html"),
    "utf8",
  );
  const pageLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const common = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_common.less"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const yobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );

  expect(route).toContain('data-owner="project-home-member-avatar"');

  expect(legacy).toContain(
    '<a href="@routes.UserApp.userInfo(member.loginId)" class="avatar-wrap img-rounded pull-left small">',
  );
  expect(legacy).toContain(
    '<img src="@member.avatarUrl" alt="@member.loginId" width="24" height="24">',
  );
  expect(pageLess).toContain(".project-members");
  expect(pageLess).toContain(".member {");
  expect(pageLess).toContain(".name {");
  expect(common).toContain(".avatar-wrap {");
  expect(common).toContain("&.small { width:24px; height:24px;");
  expect(bootstrap).toContain(".img-rounded {");
  expect(bootstrap).toContain(".pull-left {");
  expect(bootstrap).toContain("  float: left;");
  for (const importedStylesheet of [
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
  ]) {
    expect(yobi).toContain(importedStylesheet);
  }

  await mockProjectHome(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample`);

  const member = page.locator('[data-owner="project-home-member"]');
  const avatar = page.locator('[data-owner="project-home-member-avatar"]');
  const name = page.locator('[data-owner="project-home-member-name"]');
  const image = avatar.locator("img");
  await expect(member).toBeVisible();
  await expect(avatar).toHaveClass(/\bavatar-wrap\b.*\bimg-rounded\b.*\bpull-left\b.*\bsmall\b/u);
  await expect(name).toHaveText("Alice Doe (alice)");
  await expect(avatar).toHaveAttribute("href", /\/alice$/u);
  await expect(name).toHaveAttribute("href", /\/alice$/u);
  await expect(image).toHaveAttribute("alt", "alice");
  await expect(image).toHaveAttribute("width", "24");
  await expect(image).toHaveAttribute("height", "24");
  await expect(image).toHaveAttribute("src", /default-avatar-32/u);
  await expect(avatar).toHaveCSS("width", "24px");
  await expect(avatar).toHaveCSS("height", "24px");
  await expect(avatar).toHaveCSS("overflow", "hidden");
  await expect(avatar).toHaveCSS("display", "block");
  await expect(avatar).toHaveCSS("vertical-align", "top");
  await expect(avatar).toHaveCSS("border-radius", "3px");
  await expect(avatar).toHaveCSS("float", "left");

  for (const viewport of [{ height: 844, width: 390 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const wrapper = document.querySelector<HTMLElement>(
        '[data-owner="project-home-member-avatar"]',
      );
      const memberRow = document.querySelector<HTMLElement>('[data-owner="project-home-member"]');
      const image = wrapper?.querySelector("img");
      if (!wrapper || !memberRow || !image) return null;
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return {
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const wrapperStyle = getComputedStyle(wrapper);
      return {
        image: box(image),
        member: box(memberRow),
        scrollWidth: document.documentElement.scrollWidth,
        wrapper: box(wrapper),
        wrapperStyle: { height: wrapperStyle.height, width: wrapperStyle.width },
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.wrapperStyle.width).toBe("24px");
    expect(geometry!.wrapperStyle.height).toBe("24px");
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(viewport.width + 8);
  }
});

async function mockProjectHome(page: Page) {
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
            avatarUrl: "",
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
}
