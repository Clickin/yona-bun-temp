import { expect, test, type Locator, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallback = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDir = resolve(`output/playwright/style-project-posts-action-floats/${fallback}`);
const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
const boardSource = readFileSync("../yona-original/app/views/board/list.scala.html", "utf8");
const keymapSource = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const bootstrapResponsive = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const responsiveLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const messages = readFileSync("../yona-original/conf/messages", "utf8");

const legacyImportChain = [
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
] as const;

test("project posts action floats preserve legacy source and Style ownership", () => {
  expect(boardSource).toContain(
    '<form id="option_form" action="@routes.BoardApp.posts(project.owner, project.name)" method="get" class="pull-left">',
  );
  expect(boardSource).toContain('<div class="pull-right">');
  expect(boardSource).toContain("@common.twoColumnModeCheckboxArea(false)");
  expect(boardSource).toContain('@help.keymap("boardList", project)');
  expect(keymapSource).toContain(
    '<div class="pull-left" style="padding:10px 0; margin-left: 55px;">',
  );
  expect(keymapSource).toContain('<a href="#helpKeys" data-toggle="modal"');
  expect(keymapSource).toContain('<div id="helpKeys" class="modal hide fade keymap-help"');
  expect(keymapSource).toContain('data-dismiss="modal"');

  expect(bootstrap).toMatch(/\.pull-left\s*\{\s*float:\s*left;\s*\}/u);
  expect(bootstrap).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(bootstrapResponsive).toContain(".media .pull-left");
  expect(pageLess).toContain(".search-wrap {");
  expect(pageLess).toContain(".keymap-help {");
  expect(responsiveLess).toContain(".search-wrap.underline {");
  expect(responsiveLess).toContain(".search-wrap form {");
  expect(responsiveLess).toContain("width: 120px !important;");
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const message of [
    "post.write = New post",
    "project.searchPlaceholder = Search current project",
    "common.two.column.mode = Two Column Mode",
    "common.two.column.view = Column View",
    "title.boardList = Posting List",
    "title.keymap = Keyboard shortcuts",
    "button.confirm = Confirm",
  ]) {
    expect(messages).toContain(message);
  }

  for (const owner of [
    "project-posts-search",
    "project-posts-new-post-wrap",
    "project-posts-keymap",
    "project-posts-keymap-modal",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  expect(routeSource).toContain('anchorOwner="project-posts-two-column-mode"');
});

test(`project posts action floats preserve desktop/mobile runtime parity (${fallback})`, async ({
  page,
}) => {
  mkdirSync(screenshotDir, { recursive: true });
  await mockProjectPosts(page);
  await page.addInitScript(() => localStorage.removeItem("useTwoColumnMode"));

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

    const search = page.locator('[data-owner="project-posts-search"]');
    const newPost = page.locator('[data-owner="project-posts-new-post-wrap"]');
    const keymap = page.locator('[data-owner="project-posts-keymap"]');
    const twoColumn = page.locator('[data-owner="project-posts-two-column-mode"]');
    const modal = page.locator('[data-owner="project-posts-keymap-modal"]');

    await expect(search).toBeVisible();
    await expect(newPost).toBeVisible();
    await expect(keymap).toBeVisible();
    await expect(search).toHaveCSS("float", "left");
    await expect(newPost).toHaveCSS("float", "right");
    await expect(keymap).toHaveCSS("float", "left");
    for (const owner of [search, newPost, keymap, modal]) {
      await expect(owner).not.toHaveAttribute("style");
      expect(await hasNoPluginAttrsOrInlineStyles(owner)).toBe(true);
    }

    const searchInput = search.locator('input[name="filter"]');
    await expect(searchInput).toHaveAttribute("placeholder", "Search current project");
    await expect(search.locator('input[name="orderBy"]')).toHaveValue("updatedDate");
    await expect(search.locator('input[name="orderDir"]')).toHaveValue("desc");
    await expect(search.locator('button[type="submit"]')).toHaveCount(1);
    await expect(newPost.locator("a")).toHaveText("New post");
    await expect(newPost.locator("a")).toHaveAttribute("href", `${basePath}/admin/sample/postform`);

    if (viewport.name === "desktop") {
      await expect(twoColumn).toBeVisible();
      await expect(twoColumn.locator("#two-column-mode")).toBeVisible();
      await expect(twoColumn.locator(".two-column-mode-text")).toHaveText("Column View");
      // Frozen .search-wrap height:30px lets .filter-wrap cover the control's lower part (legacy parity); hover its clear top area.
      await twoColumn.hover({ position: { x: 5, y: 5 } });
      await expect(
        twoColumn.locator('[data-owner="project-posts-two-column-popover"]'),
      ).toBeVisible();
      await searchInput.focus();

      await expect(modal).toBeHidden();
      await keymap.getByRole("button", { name: "Keyboard shortcuts" }).click();
      await expect(modal).toBeVisible();
      await expect(modal).toHaveClass(/\bin\b/u);
      await expect(modal.getByRole("button", { name: "Confirm" })).toBeVisible();
      await modal.getByRole("button", { name: "Confirm" }).click();
      await expect(modal).toBeHidden();
    }

    const geometry = await page.evaluate(() => {
      const selectors = [
        '[data-owner="project-posts-search"]',
        '[data-owner="project-posts-new-post-wrap"]',
        '[data-owner="project-posts-keymap"]',
      ];
      const boxes = selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
      });
      return {
        boxes,
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    for (const box of geometry.boxes) {
      expect(box).not.toBeNull();
      if (!box) throw new Error("Expected project-posts action owner geometry");
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(box.bottom).toBeGreaterThan(box.top);
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDir, `${viewport.name}.png`),
    });
  }
});

async function hasNoPluginAttrsOrInlineStyles(owner: Locator) {
  return owner.evaluate((element) => {
    const pluginAttribute =
      /^data-(?:toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)$/u;
    return [element, ...Array.from(element.querySelectorAll("*"))].every((node) =>
      Array.from(node.attributes).every(
        ({ name }) => name !== "style" && !pluginAttribute.test(name),
      ),
    );
  });
}

async function mockProjectPosts(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
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
        totalCount: 3,
        pageNum: 1,
        totalPages: 1,
        pageSize: 20,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
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
    }),
  );
}
