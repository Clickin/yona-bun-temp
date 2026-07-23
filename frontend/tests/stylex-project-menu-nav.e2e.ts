import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");

test.use({ locale: "en-US" });

test("project route menu nav owns legacy items, active surface, and responsive geometry", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const legacy = readFileSync(
    resolve(repoRoot, "yona-original/app/views/projectMenu.scala.html"),
    "utf8",
  );
  const yobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );
  const pageLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const responsive = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_responsive.less"),
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
  const messages = readFileSync(resolve(repoRoot, "yona-original/conf/messages"), "utf8");

  expect(legacy).toContain('<ul class="project-menu-nav project-menu-gruop">');
  for (const conditional of [
    "menuSetting.code",
    "menuSetting.issue",
    "menuSetting.review",
    "menuSetting.milestone",
    "menuSetting.board",
  ]) {
    expect(legacy).toContain(`@if(${conditional})`);
  }
  expect(legacy).toContain('@if(menuSetting.pullRequest && project.vcs.equals("GIT"))');
  expect(legacy).toContain("project.isCodeAccessibleMemberOnly");
  expect(legacy).toContain('class="project-menu-count"');
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
  expect(pageLess).toContain(".project-menu-outer {");
  expect(pageLess).toContain("float:left;");
  expect(pageLess).toContain("font-size: 14px;");
  expect(pageLess).toContain("font-weight: bold;");
  expect(pageLess).toContain("position: relative;");
  expect(pageLess).toContain("display: inline-block;");
  expect(pageLess).toContain("line-height: 30px;");
  expect(pageLess).toContain("padding:5px 20px 4px;");
  expect(pageLess).toContain("background-color: #dadada;");
  expect(pageLess).toContain("border-bottom-color: #ddd;");
  expect(pageLess).toContain("border-bottom-color: #FFF;");
  expect(pageLess).toContain(".project-menu-count {");
  expect(responsive).toContain(".short-menu {\n    display: block;");
  expect(responsive).toContain(".menu-name {\n    display: none;");
  expect(responsive).toContain(
    ".project-menu-nav li a {\n    padding: 5px 12px 4px 12px !important;",
  );
  expect(responsive).toContain(
    ".project-menu-count {\n    position: absolute !important;\n    margin-top: -36px !important;",
  );
  expect(common).toContain("body,div,dl,dt,dd,ul,ol,li");
  expect(bootstrap).toContain(".pull-left {");
  for (const message of [
    "title.projectHome =",
    "menu.code = Code",
    "menu.issue = Issue",
    "menu.pullRequest = Pull request",
    "menu.review = Review",
    "milestone = Milestone",
    "menu.board = Board",
    "menu.admin = Project configuration",
  ]) {
    expect(messages).toContain(message);
  }

  for (const declaration of [
    "item: {",
    'float: "left"',
    'fontSize: "14px"',
    'fontWeight: "bold"',
    'position: "relative"',
    "link: {",
    'display: "inline-block"',
    'lineHeight: "30px"',
    'padding: "5px 20px 4px"',
    "activeItem: {",
    "content: '\" \"'",
    'borderBottomColor: "#ddd"',
    'borderBottomColor: "#fff"',
    "mobileLink: {",
    'padding: "5px 12px 4px 12px !important"',
    "mobileName: {",
    'display: "none"',
    "mobileShort: {",
    'display: "block"',
    "mobileCount: {",
    "mobileCount: {",
    'marginTop: "-36px !important"',
    'position: "absolute !important"',
  ]) {
    expect(route).toContain(declaration);
  }
  for (const owner of [
    "project-menu-outer",
    "project-menu-inner",
    "project-menu-group",
    "project-menu-count",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route).toContain("data-stylex-owner={`project-menu-item-${menuKey}`}");
  expect(route).toContain("data-stylex-owner={`project-menu-link-${menuKey}`}");
  expect(route).toContain("data-stylex-owner={`project-menu-name-${menuKey}`}");
  expect(route).toContain("data-stylex-owner={`project-menu-short-${menuKey}`}");

  await mockProjectHome(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample`);

  const group = page.locator('[data-stylex-owner="project-menu-group"]');
  const items = group.locator(":scope > li");
  const links = group.locator(":scope > li > a");
  await expect(group).toBeVisible();
  await expect(items).toHaveCount(7);
  await expect(links).toHaveCount(7);
  await expect(links.locator(".menu-name")).toHaveText([
    "Project home",
    "Code",
    "Issue",
    "Pull request",
    "Review",
    "Milestone",
    "Board",
  ]);
  expect(
    await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))),
  ).toEqual([
    `${basePath}/admin/sample`,
    `${basePath}/admin/sample/code`,
    `${basePath}/admin/sample/issues`,
    `${basePath}/admin/sample/pullRequests`,
    `${basePath}/admin/sample/reviews`,
    `${basePath}/admin/sample/milestones`,
    `${basePath}/admin/sample/posts`,
  ]);
  await expect(items.nth(0)).toHaveClass(/\bactive\b/u);
  await expect(items.nth(0).locator(".short-menu")).toHaveText("H");
  await expect(items.nth(2).locator('[data-stylex-owner="project-menu-count"]')).toHaveText("3");
  await expect(items.nth(3).locator('[data-stylex-owner="project-menu-count"]')).toHaveText("5");
  await expect(items.nth(4).locator('[data-stylex-owner="project-menu-count"]')).toHaveText("2");
  await expect(items.nth(6).locator('[data-stylex-owner="project-menu-count"]')).toHaveText("6");
  await expect(page.locator('[data-stylex-owner="project-menu-setting"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-menu-link-setting"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );

  await expect(items.nth(0)).toHaveCSS("float", "left");
  await expect(items.nth(0)).toHaveCSS("font-size", "14px");
  await expect(items.nth(0)).toHaveCSS("position", "relative");
  await expect(links.nth(0)).toHaveCSS("display", "inline-block");
  await expect(links.nth(0)).toHaveCSS("line-height", "30px");
  await expect(links.nth(0)).toHaveCSS("padding", "5px 20px 4px");
  await expect(items.nth(0)).toHaveCSS("color", "rgb(252, 73, 30)");
  const activePseudoStyles = await items.nth(0).evaluate((element) => ({
    after: getComputedStyle(element, "::after").borderBottomColor,
    before: getComputedStyle(element, "::before").borderBottomColor,
    content: getComputedStyle(element, "::before").content,
  }));
  expect(activePseudoStyles).toEqual({
    after: "rgb(255, 255, 255)",
    before: "rgb(221, 221, 221)",
    content: '" "',
  });
  await links.nth(1).hover();
  await expect(links.nth(1)).toHaveCSS("background-color", "rgb(218, 218, 218)");

  for (const fallbackOff of [false, true]) {
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((elements) => elements.forEach((element) => element.remove()));
    }
    for (const viewport of [
      { height: 900, width: 1366 },
      { height: 844, width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const geometry = await page.evaluate(() => {
        const outer = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-menu-outer"]',
        );
        const group = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-menu-group"]',
        );
        const active = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-menu-item-h"]',
        );
        const ownedItems = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner^="project-menu-item-"], [data-stylex-owner^="project-menu-link-"]',
          ),
        );
        if (!outer || !group || !active || ownedItems.length === 0) {
          throw new Error("project menu geometry missing");
        }
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
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
          active: box(active),
          group: box(group),
          outer: box(outer),
          menuOwnedOverflow: ownedItems
            .map((element) => ({
              owner: element.dataset.stylexOwner,
              right: element.getBoundingClientRect().right,
            }))
            .filter(({ right }) => right > outer.getBoundingClientRect().right + 0.5),
          owned: ownedItems.map((element) => ({
            box: box(element),
            owner: element.dataset.stylexOwner,
          })),
          viewport: {
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
          },
        };
      });
      expect(geometry.group.left).toBeGreaterThanOrEqual(geometry.outer.left);
      expect(geometry.group.right).toBeLessThanOrEqual(geometry.outer.right);
      expect(geometry.active.top).toBeGreaterThanOrEqual(geometry.outer.top);
      expect(geometry.active.bottom).toBeLessThanOrEqual(geometry.outer.bottom);
      expect(geometry.menuOwnedOverflow).toEqual([]);
      for (const owned of geometry.owned) {
        expect(owned.box.left, owned.owner).toBeGreaterThanOrEqual(geometry.outer.left);
        expect(owned.box.right, owned.owner).toBeLessThanOrEqual(geometry.outer.right);
        expect(owned.box.top, owned.owner).toBeGreaterThanOrEqual(geometry.outer.top);
        expect(owned.box.bottom, owned.owner).toBeLessThanOrEqual(geometry.outer.bottom);
      }
      if (viewport.width === 390) {
        await expect(links.nth(0)).toHaveCSS("padding", "5px 12px 4px");
        await expect(links.nth(0).locator(".menu-name")).toHaveCSS("display", "none");
        await expect(links.nth(0).locator(".short-menu")).toHaveCSS("display", "block");
        await expect(items.nth(2).locator('[data-stylex-owner="project-menu-count"]')).toHaveCSS(
          "position",
          "absolute",
        );
        await expect(items.nth(2).locator('[data-stylex-owner="project-menu-count"]')).toHaveCSS(
          "margin-top",
          "-36px",
        );
      }
      expect(
        geometry.viewport.scrollWidth === geometry.viewport.clientWidth ||
          geometry.menuOwnedOverflow.length === 0,
      ).toBe(true);
    }
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        boardCount: 6,
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrolledUsers: [{ id: 1 }, { id: 2 }],
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 3,
        openPullRequestCount: 5,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        reviewCount: 2,
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
}
