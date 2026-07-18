import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright");
const owners = {
  outer: "user-settings-page-wrap-outer",
  wrap: "user-settings-page-wrap",
} as const;
const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

const notificationTypes = [
  "NEW_ISSUE",
  "NEW_POSTING",
  "NEW_PULL_REQUEST",
  "ISSUE_STATE_CHANGED",
  "ISSUE_ASSIGNEE_CHANGED",
  "PULL_REQUEST_STATE_CHANGED",
  "NEW_COMMENT",
  "NEW_REVIEW_COMMENT",
  "MEMBER_ENROLL_REQUEST",
  "PULL_REQUEST_MERGED",
  "ISSUE_REFERRED_FROM_COMMIT",
  "PULL_REQUEST_COMMIT_CHANGED",
  "NEW_COMMIT",
  "PULL_REQUEST_REVIEW_STATE_CHANGED",
  "ISSUE_REFERRED_FROM_PULL_REQUEST",
  "ISSUE_BODY_CHANGED",
  "REVIEW_THREAD_STATE_CHANGED",
  "ORGANIZATION_MEMBER_ENROLL_REQUEST",
  "COMMENT_UPDATED",
  "ISSUE_MOVED",
  "ISSUE_SHARER_CHANGED",
  "ISSUE_LABEL_CHANGED",
  "ISSUE_MILESTONE_CHANGED",
  "POSTING_BODY_CHANGED",
  "RESOURCE_DELETED",
  "MEMBER_ENROLL_ACCEPT",
  "ORGANIZATION_MEMBER_ENROLL_ACCEPT",
] as const;

test.use({ locale: "ko-KR" });

async function mockSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 2,
    avatarUrl: "/assets/images/default-avatar-32.png",
    emailAddress: "alice@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "alice",
    preferredLanguage: "ko-KR",
    userLabel: "Alice Kim",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Alice Kim",
          loginId: "alice",
          primaryEmailAddress: "alice@example.com",
          token: "alice-token",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [
          watchedProject("2", "alice", "sample"),
          watchedProject("7", "alice", "stylex-private-residual"),
        ],
      },
    }),
  );
}

function watchedProject(projectId: string, ownerName: string, projectName: string) {
  return {
    notifications: notificationTypes.map((eventType) => ({ enabled: true, eventType })),
    ownerName,
    projectId,
    projectName,
  };
}

async function openNotifications(page: Page) {
  await mockSettings(page);
  await page.goto(`${basePath}/user/editform/notifications`);
  await expect(owner(page, owners.outer)).toBeVisible({ timeout: 2_000 });
}

test("records the two-owner legacy source, theme, class-retirement, and fallback contract", () => {
  const route = readFileSync("src/routes/user/editform.tsx", "utf8");
  const theme = readFileSync("src/routes/user/-editform.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const templates = [
    "edit.scala.html",
    "edit_password.scala.html",
    "edit_notifications.scala.html",
    "edit_emails.scala.html",
    "edit_token.scala.html",
  ].map((file) => readFileSync(`../yona-original/app/views/user/${file}`, "utf8"));
  const tabMenu = readFileSync(
    "../yona-original/app/views/user/partial_edit_tabmenu.scala.html",
    "utf8",
  );
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const settingJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.user.Setting.js",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const avatarTemplate = readFileSync("../yona-original/app/views/user/edit.scala.html", "utf8");

  for (const template of templates) {
    expect(template).toContain('<div class="page-wrap-outer">');
    expect(template).toContain('<div class="page-wrap">');
    expect(template).toContain("@partial_edit_tabmenu(");
  }
  expect(tabMenu).toContain('<ul class="nav nav-tabs mt20">');
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
  expect(siteLayout).toContain("@common.footer()");
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
  expect(pageLess).toContain(
    ".page-wrap-outer {\n    min-height: 450px;\n    margin-top: 10px;\n}",
  );
  expect(pageLess).toContain(".page-wrap {\n    background-color: @white;\n    margin: 0 auto;\n}");
  expect(responsive).toContain(
    ".page-wrap-outer {\n    min-width: 10px !important;\n    padding: 0 !important;\n  }",
  );
  expect(responsive).toContain(
    ".page-wrap-outer {\n    padding: 0 10px;\n    width: 100%;\n    box-sizing: border-box;\n  }",
  );
  expect(settingJs).toContain("_showNotificationTab();");
  for (const key of [
    "userinfo.accountSetting = 사용자 설정",
    "userinfo.changeNotifications = 알림 설정",
    "userinfo.token = 사용자토큰",
  ])
    expect(messages).toContain(key);

  expect(route.match(/data-stylex-owner="user-settings-page-wrap(?:-outer)?"/gu)).toHaveLength(2);
  for (const explicitOwner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
  expect(route).not.toContain('className="page-wrap-outer"');
  expect(route).not.toContain('className="page-wrap"');
  expect(route).toContain("userSettingsPageColors.pageSurface");
  expect(route).toContain('marginTop: "10px"');
  expect(route).toContain('minHeight: "450px"');
  expect(route).toContain('padding: { default: "0px 10px", [globalBreakpoints.mobile]: "0px" }');
  expect(route).not.toContain("globalColors.");
  expect(avatarTemplate).toContain(
    '<img src="@user.avatarUrl(256)" style="width:128px; max-width:none;" />',
  );
  expect(avatarTemplate).toContain('<img style="width:128px; max-width:none;"/>');
  expect(avatarTemplate).toContain('<img style="max-width:500px;">');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-image"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-crop-image"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-crop-preview"');
  expect(route).not.toContain('style={{ maxWidth: "none", width: "128px" }}');
  expect(route).not.toContain('style={{ maxWidth: "500px" }}');
  expect(theme).toContain('width: "128px"');
  expect(theme).toContain('maxWidth: "500px"');
  expect(route).not.toContain("!important");
  const pageTheme = theme.match(
    /export const userSettingsPageColors = stylex\.defineVars\(\{[\s\S]*?\n\}\);/u,
  )?.[0];
  expect(pageTheme?.match(/#[0-9a-f]{3,8}/giu)).toEqual(["#ffffff"]);
  expect(appCss).toContain("body:has(.site-breadcrumb-outer) .page-wrap {\n    width: 1080px;");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const)
  test(`keeps avatar image dimensions and crop containment on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockSettings(page);
    await page.goto(`${basePath}/user/editform`);
    await expect(owner(page, owners.outer)).toBeVisible({ timeout: 2_000 });

    const avatar = owner(page, "user-settings-avatar-image");
    const cropImage = owner(page, "user-settings-avatar-crop-image");
    const cropPreview = owner(page, "user-settings-avatar-crop-preview");
    await expect(avatar).toHaveCSS("width", "128px");
    await expect(avatar).toHaveCSS("max-width", "none");
    await expect(cropImage).toHaveCSS("width", "128px");
    await expect(cropImage).toHaveCSS("max-width", "none");
    await expect(cropPreview).toHaveCSS("max-width", "500px");

    const initial = await page.evaluate(() => {
      const image = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-settings-avatar-image"]',
      )!;
      const rect = image.getBoundingClientRect();
      return { right: rect.right, viewport: window.innerWidth };
    });
    expect(initial.right).toBeLessThanOrEqual(initial.viewport + 1);

    await page.locator("#avatarFile").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png"),
    });
    await expect(owner(page, "user-settings-avatar-crop")).toHaveCSS("display", "block");
    const cropGeometry = await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-settings-avatar-crop"]',
      )!;
      const preview = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-settings-avatar-crop-preview"]',
      )!;
      const modalRect = modal.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      return {
        modalRight: modalRect.right,
        previewRight: previewRect.right,
        viewport: window.innerWidth,
      };
    });
    expect(cropGeometry.modalRight).toBeLessThanOrEqual(cropGeometry.viewport + 1);
    expect(cropGeometry.previewRight).toBeLessThanOrEqual(cropGeometry.viewport + 1);
  });

test("keeps the two wrappers mounted while all five settings routes transition", async ({
  page,
}) => {
  await openNotifications(page);
  const outer = owner(page, owners.outer);
  const wrap = owner(outer, owners.wrap);
  await expect(outer).toHaveCount(1);
  await expect(wrap).toHaveCount(1);
  await expect(outer.locator(`:scope > [data-stylex-owner="${owners.wrap}"]`)).toHaveCount(1);
  await page.evaluate((ownerNames) => {
    (window as Window & { __settingsShell?: Element[] }).__settingsShell = [
      document.querySelector(`[data-stylex-owner="${ownerNames.outer}"]`)!,
      document.querySelector(`[data-stylex-owner="${ownerNames.wrap}"]`)!,
    ];
  }, owners);

  for (const path of [
    "/user/editform",
    "/user/editform/password",
    "/user/editform/notifications",
    "/user/editform/emails",
    "/user/editform/token",
  ]) {
    await wrap
      .locator(`[data-stylex-owner="user-settings-edit-tab-link"][href$="${path}"]`)
      .click();
    await expect(page).toHaveURL(`${basePath}${path}`);
    expect(
      await page.evaluate((ownerNames) => {
        const previous = (window as Window & { __settingsShell?: Element[] }).__settingsShell;
        return Boolean(
          previous &&
          previous[0] === document.querySelector(`[data-stylex-owner="${ownerNames.outer}"]`) &&
          previous[1] === document.querySelector(`[data-stylex-owner="${ownerNames.wrap}"]`),
        );
      }, owners),
    ).toBe(true);
  }
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const)
  test(`pins exact ${viewport.name} shell styles, relative geometry, containment, fallback, and screenshot`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openNotifications(page);
    const outer = owner(page, owners.outer);
    const wrap = owner(outer, owners.wrap);
    const tabs = wrap.locator(':scope > [data-stylex-owner="user-settings-edit-tabs"]');
    const body = wrap.locator(":scope > div").first();

    await expect(outer).toHaveCSS("box-sizing", "border-box");
    await expect(outer).toHaveCSS("margin", "10px 0px 0px");
    await expect(outer).toHaveCSS("min-height", "450px");
    await expect(outer).toHaveCSS("width", `${viewport.width}px`);
    await expect(outer).toHaveCSS("padding", viewport.name === "desktop" ? "0px 10px" : "0px");
    await expect(outer).toHaveCSS("min-width", viewport.name === "desktop" ? "0px" : "10px");
    await expect(outer).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(wrap).toHaveCSS("box-sizing", "content-box");
    await expect(wrap).toHaveCSS("margin", "0px");
    await expect(wrap).toHaveCSS("padding", "0px");
    await expect(wrap).toHaveCSS("min-width", "0px");
    await expect(wrap).toHaveCSS("background-color", "rgb(255, 255, 255)");

    const geometry = await page.evaluate((ownerNames) => {
      const get = (selector: string, root: ParentNode = document) =>
        root.querySelector<HTMLElement>(selector)!;
      const outer = get(`[data-stylex-owner="${ownerNames.outer}"]`);
      const wrap = get(`[data-stylex-owner="${ownerNames.wrap}"]`, outer);
      const tabs = get(':scope > [data-stylex-owner="user-settings-edit-tabs"]', wrap);
      const body = get(":scope > div", wrap);
      const box = (element: HTMLElement) => {
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
        body: box(body),
        outer: box(outer),
        scrollWidth: document.documentElement.scrollWidth,
        tabs: box(tabs),
        wrap: box(wrap),
      };
    }, owners);
    expect(geometry.outer.left).toBe(0);
    expect(geometry.outer.width).toBe(viewport.width);
    expect(geometry.wrap.left).toBe(viewport.name === "desktop" ? 10 : 0);
    expect(geometry.wrap.width).toBe(viewport.name === "desktop" ? 1346 : 390);
    expect(geometry.wrap.top).toBe(geometry.outer.top);
    expect(geometry.tabs.left).toBe(geometry.wrap.left);
    expect(geometry.tabs.right).toBe(geometry.wrap.right);
    expect(geometry.tabs.top).toBe(geometry.wrap.top);
    expect(geometry.tabs.height).toBe(38);
    expect(geometry.body.left).toBe(geometry.wrap.left);
    expect(geometry.body.right).toBe(geometry.wrap.right);
    expect(geometry.body.top).toBe(geometry.tabs.bottom + 20);
    expect(geometry.body.bottom).toBeLessThanOrEqual(geometry.wrap.bottom + 1);
    expect(geometry.scrollWidth).toBe(viewport.width);

    const fallback = await outer.evaluate((actualOuter, ownerNames) => {
      const actualWrap = actualOuter.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.wrap}"]`,
      )!;
      const fixtureOuter = document.createElement("div");
      const fixtureWrap = document.createElement("div");
      fixtureOuter.className = "page-wrap-outer";
      fixtureWrap.className = "page-wrap";
      fixtureOuter.style.position = "absolute";
      fixtureOuter.style.left = "-10000px";
      fixtureOuter.append(fixtureWrap);
      document.body.append(fixtureOuter);
      const values = (element: HTMLElement, properties: string[]) => {
        const style = getComputedStyle(element);
        return properties.map((property) => style.getPropertyValue(property));
      };
      const result = {
        outer: [
          values(actualOuter, ["box-sizing", "margin", "min-height", "padding", "width"]),
          values(fixtureOuter, ["box-sizing", "margin", "min-height", "padding", "width"]),
        ],
        outerMinWidth: [
          getComputedStyle(actualOuter).minWidth,
          getComputedStyle(fixtureOuter).minWidth,
        ],
        wrap: [
          values(actualWrap, ["background-color", "box-sizing", "min-width", "padding"]),
          values(fixtureWrap, ["background-color", "box-sizing", "min-width", "padding"]),
        ],
        wrapMargin: [getComputedStyle(actualWrap).margin, getComputedStyle(fixtureWrap).margin],
      };
      fixtureOuter.remove();
      return result;
    }, owners);
    expect(fallback.outer[0]).toEqual(fallback.outer[1]);
    expect(fallback.outerMinWidth).toEqual(
      viewport.name === "desktop" ? ["0px", "1100px"] : ["10px", "10px"],
    );
    expect(fallback.wrap[0]).toEqual(fallback.wrap[1]);
    expect(fallback.wrapMargin).toEqual(["0px", "0px"]);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-user-settings-page-shell-${viewport.name}.png`),
    });
    expect(await tabs.isVisible()).toBe(true);
    expect(await body.isVisible()).toBe(true);
  });
