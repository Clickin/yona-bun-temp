import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-user-editform-avatar-upload-mt10",
  "normal",
);

test.use({ locale: "en-US" });

test(`user edit avatar upload geometry ${"normal"}`, async ({ page }) => {
  await mockProfile(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform`, { waitUntil: "commit" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const avatarForm = page.locator("#frmAvatar");
    const uploadWrap = page.locator('[data-owner="user-settings-avatar-upload-wrap"]');
    const upload = page.locator('[data-owner="user-settings-avatar-upload"]');
    const input = page.locator("#avatarFile");

    await expect(avatarForm).toBeVisible();
    await expect(uploadWrap).toBeVisible();
    await expect(uploadWrap).toHaveCSS("margin-top", "10px");
    await expect(uploadWrap).toHaveCSS("text-align", "center");
    await expect(upload).toContainText("Change avatar");
    // The visible control is the ybtn; its native file input is only a transparent overlay.
    await expect(upload).toHaveCSS("display", "inline-block");
    await expect(upload).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(upload).toHaveCSS("overflow", "hidden");
    await expect(input).toHaveCSS("opacity", "0");
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
    const buttonBox = await upload.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.width).toBeLessThan(box!.width);
    expect(buttonBox!.x + buttonBox!.width / 2).toBeCloseTo(box!.x + box!.width / 2, 1);

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
