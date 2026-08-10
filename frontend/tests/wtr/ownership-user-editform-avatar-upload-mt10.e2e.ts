import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-user-editform-avatar-upload-mt10",
  fallbackOff ? "fallback-off" : "normal",
);

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

test.use({ locale: "en-US" });

test("user edit avatar upload preserves legacy source and Style ownership", () => {
  const legacy = read("../yona-original/app/views/user/edit.scala.html");
  const commonLess = read("../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = read("../yona-original/app/assets/stylesheets/less/_page.less");
  const yobiUiLess = read("../yona-original/app/assets/stylesheets/less/_yobiUI.less");
  const messages = read("../yona-original/conf/messages");
  const route = read("src/routes/user/editform.tsx");
  const styles = read("src/app.css");
  const legacyAvatar = legacy.split(/\r?\n/u).slice(42, 59).join("\n");

  expect(legacyAvatar).toContain('<form id="frmAvatar"');
  expect(legacyAvatar).toContain('<div class="avatar-frm">');
  expect(legacyAvatar).toContain('<div class="avatar-wrap xlarge">');
  expect(legacyAvatar).toContain('<div class="upload-progress avatar" style="display:none;">');
  expect(legacyAvatar).toContain('<div class="btn-wrap mt10 center-txt">');
  expect(legacyAvatar).toContain('<div class="ybtn ybtn-small fake-file-wrap btnUploadAvatar">');
  expect(legacyAvatar).toContain('@Messages("userinfo.changeAvatar")');
  expect(legacyAvatar).toContain(
    '<input id="avatarFile" type="file" class="file" name="filePath" accept="image/*">',
  );
  expect(legacyAvatar.indexOf("avatar-wrap xlarge")).toBeLessThan(
    legacyAvatar.indexOf("upload-progress avatar"),
  );
  expect(legacyAvatar.indexOf("upload-progress avatar")).toBeLessThan(
    legacyAvatar.indexOf("btn-wrap mt10 center-txt"),
  );

  expect(commonLess).toContain(".mt10 { margin-top:10px; }");
  expect(commonLess).toContain(".center-txt    { text-align:center; }");
  expect(pageLess).toContain(".profile-frmwrap {");
  expect(pageLess).toContain(".avatar-frm {");
  expect(pageLess).toContain("display:inline-block;");
  expect(pageLess).toContain("vertical-align:top;");
  expect(yobiUiLess).toContain(".fake-file-wrap {");
  expect(yobiUiLess).toContain("position: relative; display:block; clear:both;");
  expect(yobiUiLess).toContain(".file {");
  expect(messages).toContain("userinfo.changeAvatar = Change avatar");

  expect(route).not.toContain("btn-wrap mt10");

  expect(route).toContain('data-owner="user-settings-avatar-upload-wrap"');

  expect(route).toContain('data-owner="user-settings-avatar-upload"');
  expect(route).toContain('data-owner="user-settings-avatar-upload-input"');
  expect(route).toContain('name="filePath"');
  expect(route).toContain('accept="image/*"');
  expect(route).toContain('t("userinfo.changeAvatar")');
  expect(route).not.toMatch(/\bstyle\s*=/u);
  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("addEventListener");
});

test(`user edit avatar upload geometry ${fallbackOff ? "fallback-off" : "normal"}`, async ({
  page,
}) => {
  await mockProfile(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform`, { waitUntil: "commit" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const avatarForm = page.locator("#frmAvatar");
    const uploadWrap = page.locator('[data-owner="user-settings-avatar-upload-wrap"]');
    const upload = page.locator('[data-owner="user-settings-avatar-upload"]');
    const input = page.locator("#avatarFile");

    await expect(avatarForm).toBeVisible();
    await expect(uploadWrap).toBeVisible();
    await expect(uploadWrap).not.toHaveClass(/\bmt10\b/u);
    await expect(uploadWrap).toHaveCSS("margin-top", "10px");
    await expect(uploadWrap).toHaveCSS("text-align", "center");
    await expect(uploadWrap).not.toHaveAttribute("style");
    await expect(upload).toContainText("Change avatar");
    await expect(input).toHaveAttribute("type", "file");
    await expect(input).toHaveAttribute("name", "filePath");
    await expect(input).toHaveAttribute("accept", "image/*");

    const ownerOrder = await avatarForm
      .locator(".avatar-frm > [data-owner]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-owner")));
    expect(ownerOrder).toEqual([
      "user-settings-avatar-wrap",
      "user-settings-avatar-progress",
      "user-settings-avatar-upload-wrap",
    ]);
    await expect(page.locator('[data-owner="user-settings-avatar-wrap"]')).toBeVisible();
    await expect(page.locator('[data-owner="user-settings-avatar-progress"]')).toBeAttached();
    await expect(upload).toBeVisible();

    const box = await uploadWrap.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    if (viewport.name === "desktop") {
      await input.setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      const crop = page.locator('[data-owner="user-settings-avatar-crop"]');
      await expect(crop).toBeVisible();
      await expect(crop).toHaveAttribute("aria-hidden", "false");
      await expect(crop).toHaveClass(/\bin\b/u);
    }
  }
});

async function mockProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      siteName: "Yoram",
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 2,
    avatarUrl: "/assets/images/default-avatar-32.png",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin User",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/workspace", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: workspaceBody() }),
  );
}

function workspaceBody() {
  return {
    apiToken: "token-before",
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      connectedSocialProviders: [],
      displayName: "Admin User",
      englishName: "",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: true,
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [],
  };
}
