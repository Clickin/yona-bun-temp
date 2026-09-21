import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user edit avatar visibility uses conditional Style", async () => {
  const [legacy, route, _style, commonLess, yobiUiLess] = await Promise.all([
    readFile("../yona-original/app/views/user/edit.scala.html", "utf8"),
    readFile("src/routes/user/editform.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile("../yona-original/app/assets/stylesheets/less/_common.less", "utf8"),
    readFile("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8"),
  ]);
  expect(legacy).toContain('<div class="upload-progress avatar" style="display:none;">');
  expect(legacy).toContain('id="avatarCropWrap" class="modal hide"');
  expect(commonLess).toContain(".avatar-wrap {");
  expect(yobiUiLess).toContain("&.xlarge  { width:128px; height:128px; }");
  expect(yobiUiLess).toContain("background:#ddd;");
  expect(route).toContain('data-owner="user-settings-avatar-progress"');
  expect(route).toContain('data-owner="user-settings-avatar-progress-bar"');
  expect(route).toContain('data-owner="user-settings-avatar-wrap"');
  expect(route).toContain('data-owner="user-settings-avatar-crop-wrap"');
  expect(route).toContain('data-owner="user-settings-avatar-crop"');

  expect(route).not.toMatch(/style=\{[^}]*display|style=\{[^}]*width/gu);
});

test("user edit avatar wrappers own the frozen xlarge avatar geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
      },
    }),
  );
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
          displayName: "Admin",
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform`);
    const wrap = page.locator('[data-owner="user-settings-avatar-wrap"]');
    const cropWrap = page.locator('[data-owner="user-settings-avatar-crop-wrap"]');
    await expect(wrap).toHaveCSS("display", "inline-block");
    await expect(wrap).toHaveCSS("width", "128px");
    await expect(wrap).toHaveCSS("height", "128px");
    await expect(wrap).toHaveCSS("overflow", "hidden");
    await expect(wrap).toHaveCSS("background-color", "rgb(221, 221, 221)");
    await expect(cropWrap).toHaveCSS("width", "128px");
    await expect(cropWrap).toHaveCSS("height", "128px");
    const box = await wrap.boundingBox();
    expect(box?.width).toBe(128);
    expect(box?.height).toBe(128);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
  }
});
