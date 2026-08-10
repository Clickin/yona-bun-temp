import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-posts-two-column-margin");

test.use({ locale: "en-US" });

test("project posts owns legacy mr10 on the two-column mode control", async ({ page }) => {
  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyRoot = readFileSync("../yona-original/app/views/board/list.scala.html", "utf8");
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
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

  expect(legacyRoot).toContain('<form id="option_form"');
  expect(legacyRoot).toContain("@common.twoColumnModeCheckboxArea(false)");
  expect(legacyRoot).toContain('<div class="search-wrap underline">');
  expect(legacyRoot).toContain('<div class="pull-right">');
  expect(legacyTwoColumn).toContain(
    '<div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox"',
  );
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacyTwoColumn).toContain('class="two-column-icon-border"');
  expect(legacyTwoColumn).toContain('class="two-column-mode-text"');
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain("line-height: 37px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(bootstrap).toContain('.checkbox input[type="checkbox"]');
  expect(bootstrap).toContain(".nav-tabs");
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
    "project.searchPlaceholder",
    "post.write",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");

  expect(twoColumnJs).toContain("$twoColumnMode.on('click'");
  expect(boardJs).toContain("_initTwoColumnMode();");

  expect(sharedComponentSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(routeSource).toContain('anchorOwner="project-posts-two-column-mode"');
  expect(sharedComponentSource).toContain('id="two-column-mode-checkbox"');
  expect(sharedComponentSource).toContain('id="two-column-mode"');
  expect(sharedComponentSource).toContain("common.two.column.mode.desc");
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');

  expect(styleSource).not.toMatch(/twoColumnModeLabel:\s*\{[^}]*marginRight/u);

  await mockProjectPosts(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });
    await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
    await page.reload({ waitUntil: "commit" });

    const form = page.locator("#option_form");
    const searchBar = form.locator(":scope > .search-bar");
    const mode = page.locator('[data-owner="project-posts-two-column-mode"]');
    const label = page.locator('[data-owner="project-posts-two-column-mode-label"]');
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
    await expect(mode.locator(".two-column-mode-text")).toHaveText("Column View");
    await expect(mode).toContainText("Column View");
    await expect(mode).toHaveCSS("margin-right", "10px");
    await expect(label).not.toHaveCSS("margin-right", "10px");
    await expect(mode).not.toHaveAttribute("data-toggle");
    await expect(mode).not.toHaveAttribute("data-trigger");
    await expect(popover).toHaveCount(0);

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
        '[data-owner="project-posts-two-column-mode"]',
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
          left: modeBox.left,
          right: modeBox.right,
          top: modeBox.top,
        },
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.innerWidth + 1);
    expect(layout!.mode.left).toBeGreaterThanOrEqual(layout!.form.left - 1);
    expect(layout!.mode.right).toBeLessThanOrEqual(layout!.form.right + 1);

    if (viewport.width > 767) {
      expect(layout!.mode.display).not.toBe("none");
      expect(layout!.mode.top).toBeGreaterThanOrEqual(layout!.form.top - 1);
      expect(layout!.mode.bottom).toBeLessThanOrEqual(layout!.form.bottom + 1);
      await expect(mode).toBeVisible();
      // Frozen .search-wrap height:30px lets the following .filter-wrap cover
      // the control's lower part (same geometry as legacy); act on its clear
      // top area.
      await mode.hover({ position: { x: 5, y: 5 } });
      await expect(popover).toBeVisible({ timeout: 1000 });
      await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
      await expect(popover.locator(".popover-content")).toContainText(
        "Splits list and body into columns respectively",
      );
      await toggle.focus();
      await expect(popover).toBeVisible({ timeout: 1000 });
      // The frozen .search-wrap height:30px lets the following .filter-wrap
      // cover the control (legacy geometry); the checkbox is a React-controlled
      // input, so use the harness check() (element.click) to exercise the wiring.
      await toggle.check();
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
      await expect(mode).toBeHidden();
      await expect(toggle).not.toBeChecked();
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectPosts(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 1,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route: Route) => {
    if (route.request().url().includes("/form-options")) {
      return route.fulfill({
        contentType: "application/json",
        json: {
          canAttachFiles: false,
          canMarkNotice: true,
          canMarkReadme: false,
          labels: [],
          defaultPermissions: {
            canAttachFiles: false,
            canCreate: true,
            canMarkNotice: true,
            canMarkReadme: false,
          },
        },
      });
    }
    return route.fulfill({
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
            ownerName: "admin",
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
            ownerName: "admin",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        totalCount: 2,
        pageNum: 1,
        totalPages: 1,
        pageSize: 20,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    });
  });
}
