import { expect, test, type Page, type Route, mergedLegacyBlock } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project posts owns the board controls' former inline declarations", async ({ page }) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const twoColumnLegacy = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const legacy = readFileSync("../yona-original/app/views/board/list.scala.html", "utf8");
  const labelLegacy = readFileSync(
    "../yona-original/app/views/common/issueLabelColor.scala.html",
    "utf8",
  );
  const keymapLegacy = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(legacy).toContain('<div class="page-wrap-outer">');
  expect(legacy).toContain("@common.twoColumnModeCheckboxArea(false)");
  expect(twoColumnLegacy).toContain('<label class="checkbox">');
  expect(twoColumnLegacy).toContain('id="two-column-mode"');
  expect(pageLess).toContain(".checkbox {");
  expect(pageLess).toContain(".inline-block;");
  expect(pageLess).toContain("vertical-align:top;");
  expect(pageLess).toContain("margin:2px !important;");
  expect(keymapLegacy).toContain('style="padding:10px 0; margin-left: 55px;"');
  expect(labelLegacy).toContain("background-color: @label.color");
  expect(source).toContain('anchorOwner="project-posts-two-column-mode"');
  expect(source).toContain('labelOwner="project-posts-two-column-mode-label"');

  expect(sharedComponentSource).toContain("data-owner={anchorOwner}");
  expect(sharedComponentSource).toContain("data-owner={labelOwner}");
  expect(sharedComponentSource).toMatch(/className=.*checkbox/u);
  expect(source).toContain('data-owner="project-posts-keymap"');
  expect(source).toContain('data-owner="project-posts-label-button"');
  expect(source).not.toContain("style={issueLabelStyle(label.color)}");

  // The label paint stays on the shared issueLabelStyle inline contract (pinned by
  // project-posts.e2e.ts parity metrics); the route no longer carries label style keys.
  expect(styleSource).not.toContain("labelPaint");

  await mockPosts(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

  const twoColumn = page.locator('[data-owner="project-posts-two-column-mode"]');
  const twoColumnLabel = page.locator('[data-owner="project-posts-two-column-mode-label"]');
  const keymapOwner = page.locator('[data-owner="project-posts-keymap"]');
  await expect(twoColumn).toBeVisible();
  await expect(twoColumnLabel).toBeVisible();
  await expect(twoColumnLabel).toHaveClass(/checkbox/u);
  await expect(twoColumnLabel).toHaveCSS("display", "inline-block");
  await expect(twoColumnLabel).toHaveCSS("vertical-align", "top");
  await expect(twoColumnLabel).toHaveCSS("margin-top", "2px");
  await expect(twoColumnLabel).toHaveCSS("margin-right", "2px");
  await expect(twoColumnLabel).toHaveCSS("margin-bottom", "2px");
  await expect(twoColumnLabel).toHaveCSS("margin-left", "2px");
  expect(await twoColumnLabel.getAttribute("style")).toBeNull();
  await expect(keymapOwner).toBeVisible();
  await expect(twoColumn).toHaveCSS("position", "relative");
  await expect(keymapOwner).toHaveCSS("padding-top", "10px");
  await expect(keymapOwner).toHaveCSS("padding-bottom", "10px");
  await expect(keymapOwner).toHaveCSS("margin-left", "55px");

  const desktop = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
    };
    return {
      twoColumn: read('[data-owner="project-posts-two-column-mode"]'),
      twoColumnLabel: read('[data-owner="project-posts-two-column-mode-label"]'),
      keymap: read('[data-owner="project-posts-keymap"]'),
    };
  });
  expect(desktop.twoColumn).not.toBeNull();
  expect(desktop.twoColumnLabel).not.toBeNull();
  expect(desktop.twoColumnLabel!.width).toBeGreaterThan(0);
  expect(desktop.twoColumnLabel!.left).toBeGreaterThanOrEqual(desktop.twoColumn!.left);
  expect(desktop.twoColumnLabel!.right).toBeLessThanOrEqual(desktop.twoColumn!.right);
  expect(desktop.keymap).not.toBeNull();
  expect(desktop.keymap!.left).toBeGreaterThan(0);
  expect(desktop.keymap!.right).toBeLessThanOrEqual(1366);

  await page.locator("#two-column-mode").check();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await page.locator("#two-column-mode").uncheck();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();

  await twoColumn.hover();
  await expect(page.locator('[data-owner="project-posts-two-column-popover"]')).toBeVisible();
  await twoColumnLabel.focus();
  await expect(page.locator('[data-owner="project-posts-two-column-popover"]')).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-owner="project-posts-two-column-popover"]')).toBeHidden();

  const label = page.locator('[data-owner="project-posts-label-button"]').first();
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS("background-color", "rgb(225, 29, 72)");
  await expect(label).toHaveCSS("color", "rgb(255, 255, 255)");
  const inlineDeclarations = (await label.getAttribute("style"))
    ?.split(";")
    .map((declaration) => declaration.split(":", 1)[0].trim().toLowerCase())
    .filter(Boolean);
  // Label paint rides the shared issueLabelStyle inline contract (legacy labelStyles.css
  // equivalent); only the reset stays inline on top of it.
  expect(inlineDeclarations).toContain("background-color");
  expect(inlineDeclarations).toContain("border");

  const keymapButton = keymapOwner.locator("button.ybtn-inverse");
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await page.locator("#helpKeys").press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(twoColumn).toBeHidden();
  const mobile = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>(
      '[data-owner="project-posts-two-column-mode-label"]',
    );
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(mobile).toEqual({ width: 0, height: 0 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function mockPosts(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: true,
        canMarkNotice: true,
        canMarkReadme: true,
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#e11d48",
            id: "8",
            name: "bug",
          },
        ],
        readme: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts?**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 1,
            createdLabel: "Jul 2, 2026",
            labels: [
              {
                categoryId: "3",
                categoryIsExclusive: false,
                categoryName: "type",
                color: "#e11d48",
                id: "8",
                name: "bug",
              },
            ],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
          },
        ],
        notices: [],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        readme: null,
        totalCount: 1,
      },
    }),
  );
}
