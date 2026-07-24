import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const owner = "project-history-avatar-wrap";

test.use({ locale: "en-US" });

test("project history avatar wrapper preserves legacy geometry and fallback state", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const legacy = readFileSync(
    resolve(repoRoot, "yona-original/app/views/project/partial_history.scala.html"),
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
  const bootstrapResponsive = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap-responsive.css"),
    "utf8",
  );
  const pageStyles = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const responsive = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_responsive.less"),
    "utf8",
  );
  const yobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );

  expect(route).toContain('stylexOwner="project-history-avatar-wrap"');
  expect(route).toContain('float: "left"');
  expect(route).toContain('marginRight: "10px"');
  expect(route).toContain(
    "className={`${stylex.props(projectHistoryStyles.avatarWrap).className} avatar-wrap`}",
  );
  expect(route).not.toContain("avatar-wrap pull-left mr10");
  expect(legacy).toContain(
    '<a href="@userPageUrlOnHistory(history)" class="avatar-wrap pull-left mr10">',
  );
  expect(legacy).toContain('<img src="@userAvatarUrlOnHistory(history)" width="32" height="32">');
  expect(common).toContain(".mr10 { margin-right:10px; }");
  expect(bootstrap).toContain(".pull-left {");
  expect(bootstrap).toContain("  float: left;");
  expect(pageStyles).toContain(".activity-stream {");
  expect(pageStyles).toContain(".activity-desc {");
  expect(pageStyles).toContain(".header-text {");
  expect(responsive).toContain(".content-container .main-stream {");
  expect(responsive).toContain("width: 100%;");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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

  await mockProjectHistory(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample?tabId=history`);

  const item = page.locator('[data-stylex-owner="project-history-activity-item"]');
  const avatarWrap = page.locator(`[data-stylex-owner="${owner}"]`);
  const avatar = avatarWrap.locator("img");
  await expect(item).toContainText("Alice Doe");
  await expect(item).toContainText("Committed");
  await expect(item).toContainText("Sample commit");
  await expect(avatarWrap).toHaveClass(/\bavatar-wrap\b/u);
  await expect(avatarWrap).not.toHaveClass(/\bpull-left\b/u);
  await expect(avatarWrap).not.toHaveClass(/\bmr10\b/u);
  await expect(avatarWrap).toHaveCSS("float", "left");
  await expect(avatarWrap).toHaveCSS("margin-right", "10px");
  await expect(avatarWrap).not.toHaveAttribute("style");
  for (const pluginAttribute of ["data-toggle", "data-placement", "data-action", "data-url"]) {
    await expect(avatarWrap).not.toHaveAttribute(pluginAttribute);
  }
  await expect(avatar).toHaveAttribute("width", "32");
  await expect(avatar).toHaveAttribute("height", "32");
  await expect(avatar).toHaveAttribute("alt", "");
  await expect(avatarWrap).toHaveAttribute("href", /\/admin$/u);
  await expect(item.locator("a.title")).toHaveAttribute("href", /\/admin\/sample\/commit\/abc/u);

  const desktop = await historyGeometry(avatarWrap);
  expect(desktop.wrap.width).toBe(32);
  expect(desktop.image.width).toBe(32);
  expect(desktop.image.height).toBe(32);
  expect(desktop.image.right).toBeLessThanOrEqual(desktop.item.right);
  expect(desktop.scrollWidth).toBeLessThanOrEqual(1366);
  await expect(avatar).toHaveAttribute("src", /default-avatar-64/u);

  await page.setViewportSize({ height: 844, width: 390 });
  const mobile = await historyGeometry(avatarWrap);
  expect(mobile.wrap.left).toBeGreaterThanOrEqual(mobile.item.left);
  expect(mobile.image.right).toBeLessThanOrEqual(mobile.item.right);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
});

async function historyGeometry(avatarWrap: ReturnType<Page["locator"]>) {
  return avatarWrap.evaluate((element) => {
    const item = element.closest<HTMLElement>(".activity-stream");
    const image = element.querySelector("img");
    if (!item || !image) throw new Error("history geometry targets missing");
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    return {
      image: box(image),
      item: box(item),
      scrollWidth: document.documentElement.scrollWidth,
      wrap: box(element),
    };
  });
}

async function mockProjectHistory(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          pullRequests: [],
          noMilestoneOpenIssueCount: 0,
          unassignedOpenIssueCount: 0,
        },
        history: {
          items: [
            {
              actorAvatarUrl: "",
              actorName: "Alice Doe",
              actorUrl: "/admin",
              createdLabel: "Today",
              createdTitle: "Today",
              itemType: "commit",
              shortTitle: "abc",
              title: "Sample commit",
              url: "/admin/sample/commit/abc",
            },
          ],
        },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
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
