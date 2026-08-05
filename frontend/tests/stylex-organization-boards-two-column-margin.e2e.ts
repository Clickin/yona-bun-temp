import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/stylex-organization-boards-two-column-margin",
);

test.use({ locale: "en-US" });

test("organization boards owns legacy mr10 on the two-column mode control", async ({ page }) => {
  const routeSource = readFileSync("src/routes/organizations/$organizationName/boards.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");
  const legacyRoot = readFileSync(
    "../yona-original/app/views/organization/group_board_list.scala.html",
    "utf8",
  );
  const legacyPartial = readFileSync(
    "../yona-original/app/views/organization/group_board_list_partial.scala.html",
    "utf8",
  );
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const twoColumnJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );
  const boardJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.board.List.js",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyRoot).toContain("@common.twoColumnModeCheckboxArea(false)");
  expect(legacyRoot).toContain('<ul class="post-list-wrap">');
  expect(legacyRoot).toContain("@group_board_list_partial(post, post.project)");
  expect(legacyPartial).toContain('<li class="post-item title"');
  expect(legacyPartial).toContain("group-project-name");
  expect(legacyTwoColumn).toContain(
    '<div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox"',
  );
  expect(legacyTwoColumn).toContain("title='@Messages(\"common.two.column.mode\")'");
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacyTwoColumn).toContain('class="two-column-icon-border"');
  expect(legacyTwoColumn).toContain('class="two-column-mode-text"');
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain("line-height: 37px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(bootstrap).toContain('.checkbox input[type="checkbox"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");

  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/${importPath}`, "utf8"),
    ).not.toHaveLength(0);
  }

  for (const messageKey of [
    "common.two.column.mode",
    "common.two.column.mode.desc",
    "common.two.column.view",
    "organization.choose.projects",
    "title.searchByKeyword",
    "post.is.empty",
    "common.order.updatedDate",
    "common.order.date",
    "common.order.comments",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");
  expect(twoColumnJs).toContain('trigger: "hover"');
  expect(twoColumnJs).toContain("delay: { show: 100, hide: 100 }");
  expect(twoColumnJs).toContain("$twoColumnMode.on('click'");
  expect(boardJs).toContain("_initTwoColumnMode();");

  expect(routeSource).toContain('anchorOwner="organization-boards-two-column-anchor"');
  expect(routeSource).toContain('twoColumnAnchor: { marginRight: "10px", position: "relative" }');
  expect(sharedComponentSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(sharedComponentSource).toContain('id="two-column-mode-checkbox"');
  expect(sharedComponentSource).toContain('id="two-column-mode"');
  expect(sharedComponentSource).toContain("common.two.column.mode.desc");
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');

  await mockOrganizationBoards(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/organizations/weblabs/boards`, { waitUntil: "commit" });
    await expect(
      page.locator('[data-stylex-owner="organization-boards-two-column-anchor"]'),
    ).toHaveCount(1);
    await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
    await page.reload({ waitUntil: "commit" });

    const form = page.locator("#option_form");
    const searchBar = form.locator(":scope > .search-bar");
    const mode = page.locator('[data-stylex-owner="organization-boards-two-column-anchor"]');
    const label = mode.locator("label");
    const border = mode.locator(".two-column-icon-border");
    const text = mode.locator(".two-column-mode-text");
    const toggle = mode.locator("#two-column-mode");
    const popover = mode.locator('[role="tooltip"]');

    await expect(form).toBeVisible();
    await expect(searchBar).toBeVisible();
    await expect(mode).toHaveCount(1);
    await expect(mode).toHaveClass(/two-column-icon/u);
    await expect(mode).toHaveClass(/mr10/u);
    await expect(mode).toHaveClass(/hide-in-mobile/u);
    await expect(mode).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(toggle).toHaveAttribute("id", "two-column-mode");
    await expect(mode).toHaveAttribute("title", "Two Column Mode");
    await expect(text).toHaveText("Column View");
    await expect(mode).toContainText("Column View");
    await expect(mode).toHaveCSS("margin-right", "10px");
    await expect(mode).toHaveCSS("position", "relative");
    await expect(label).not.toHaveCSS("margin-right", "10px");
    await expect(border).not.toHaveCSS("margin-right", "10px");
    await expect(text).not.toHaveCSS("margin-right", "10px");
    await expect(searchBar).not.toHaveCSS("margin-right", "10px");

    const pluginAttributes = await mode.evaluate((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) =>
          /^(?:data-(?:toggle|placement|action|href|url|dismiss|target|trigger|backdrop|spy|provider|loading-text|content)|data-request-[\w-]+)$/u.test(
            name,
          ),
        ),
    );
    expect(pluginAttributes).toEqual([]);

    const order = await form.evaluate((element) =>
      Array.from(element.children).map((child) => child.className),
    );
    expect(order.findIndex((value) => value.includes("search-bar"))).toBeLessThan(
      order.findIndex((value) => value.includes("two-column-icon")),
    );

    const layout = await page.evaluate(() => {
      const formElement = document.querySelector<HTMLElement>("#option_form");
      const searchElement = document.querySelector<HTMLElement>("#option_form > .search-bar");
      const modeElement = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-boards-two-column-anchor"]',
      );
      if (!formElement || !searchElement || !modeElement) return null;
      const formBox = formElement.getBoundingClientRect();
      const searchBox = searchElement.getBoundingClientRect();
      const modeBox = modeElement.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        form: {
          left: formBox.left,
          right: formBox.right,
          top: formBox.top,
          bottom: formBox.bottom,
        },
        search: {
          left: searchBox.left,
          right: searchBox.right,
          top: searchBox.top,
          bottom: searchBox.bottom,
        },
        mode: {
          bottom: modeBox.bottom,
          display: getComputedStyle(modeElement).display,
          height: modeBox.height,
          left: modeBox.left,
          right: modeBox.right,
          top: modeBox.top,
          width: modeBox.width,
        },
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.innerWidth + 1);
    expect(layout!.search.left).toBeGreaterThanOrEqual(layout!.form.left - 1);
    expect(layout!.search.right).toBeLessThanOrEqual(layout!.form.right + 1);

    if (viewport.width > 767) {
      expect(layout!.mode.left).toBeGreaterThanOrEqual(layout!.form.left - 1);
      expect(layout!.mode.right).toBeLessThanOrEqual(layout!.form.right + 1);
      expect(layout!.mode.display).not.toBe("none");
      expect(layout!.mode.top).toBeGreaterThanOrEqual(layout!.form.top - 1);
      expect(layout!.mode.bottom).toBeLessThanOrEqual(layout!.form.bottom + 1);
      await expect(mode).toBeVisible();
      await mode.hover();
      await expect(popover).toBeVisible({ timeout: 1000 });
      await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
      await expect(popover.locator(".popover-content")).toContainText(
        "Splits list and body into columns respectively",
      );
      await toggle.focus();
      await expect(popover).toBeVisible({ timeout: 1000 });
      await page.keyboard.press("Space");
      await expect(toggle).toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("true");
      await page.reload({ waitUntil: "commit" });
      await expect(page.locator("#two-column-mode")).toBeChecked();
      await page.locator("#two-column-mode").uncheck();
      await expect(page.locator("#two-column-mode")).not.toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("false");
      await page.mouse.move(1, 1);
      await expect(popover).toBeHidden({ timeout: 1000 });
    } else {
      expect(layout!.mode.display).toBe("none");
      expect(layout!.mode.width).toBe(0);
      expect(layout!.mode.height).toBe(0);
      await expect(mode).toBeHidden();
      await expect(toggle).not.toBeChecked();
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockOrganizationBoards(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      siteName: "Yoram",
      supportedLanguages: ["en"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: true,
        visibleProjects: [{ ownerName: "weblabs", projectName: "sample" }],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/boards**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 2,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "weblabs",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
          },
        ],
        notices: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            labels: [],
            notice: true,
            ownerName: "weblabs",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        visibleProjects: [{ ownerName: "weblabs", projectName: "sample" }],
      },
    }),
  );
}
