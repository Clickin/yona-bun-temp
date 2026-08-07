import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the legacy profile separator and avatar image fallback", () => {
  const route = readFileSync("src/routes/user/editform.tsx", "utf8");
  const theme = readFileSync("src/routes/user/-editform.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/user/edit.scala.html", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(template).toContain(
    'style="margin-left:50px; padding-left:50px; border-left:1px solid #ddd;"',
  );
  expect(template).toContain(
    '<img src="@user.avatarUrl(256)" style="width:128px; max-width:none;" />',
  );
  expect(template).toContain('<img style="max-width:500px;">');
  expect(template).toContain('<div class="btn-wrap mt10 center-txt">');
  expect(template).toContain('<div class="modal-header center-txt">');
  expect(commonLess).toContain(".center-txt    { text-align:center; }");
  expect(pageLess).toContain(".reset-user-visited-list {");
  expect(route).toContain('data-stylex-owner="user-settings-avatar-form"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-upload-wrap"');
  expect(route).toContain('data-stylex-owner="user-settings-avatar-crop-header"');
  expect(route).toContain("userSettingsAvatarStyles.uploadWrap");
  expect(route).toContain("userSettingsAvatarStyles.cropHeader");
  expect(route).not.toContain("center-txt");
  expect(theme).toContain('margin: "0px 0px 2px 50px"');
  expect(theme).toContain('paddingLeft: "50px"');
  expect(route).not.toContain('style={{ borderLeft: "1px solid #ddd"');
  expect(theme).toContain('maxWidth: "none"');
  expect(theme).toContain('maxWidth: "500px"');
  expect(pageLess).toContain(".avatar-wrap");

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
});

test("pins profile form interaction and avatar containment on desktop/mobile", async ({ page }) => {
  const profileUpdates: Array<Record<string, unknown>> = [];
  await mockProfile(page, profileUpdates);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform`);
    await expect(owner(page, "user-settings-profile-form")).toBeVisible();
    const avatarForm = page.locator("#frmAvatar");
    await expect(avatarForm).toHaveCSS("border-left-width", "1px");
    await expect(avatarForm).toHaveCSS("margin-left", "50px");
    await expect(avatarForm).toHaveCSS("padding-left", "50px");
    await expect(owner(page, "user-settings-avatar-upload-wrap")).toHaveCSS("text-align", "center");
    await expect(owner(page, "user-settings-avatar-crop-header")).toHaveCSS("text-align", "center");

    const geometry = await avatarForm.evaluate((element) => {
      const formBox = element.getBoundingClientRect();
      const image = element.querySelector<HTMLElement>(".avatar-wrap.xlarge");
      const imageBox = image?.getBoundingClientRect();
      return imageBox
        ? {
            documentWidth: document.documentElement.scrollWidth,
            formLeft: formBox.left,
            imageRight: imageBox.right,
            imageWidth: imageBox.width,
          }
        : null;
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.imageWidth).toBe(128);
    expect(geometry!.imageRight).toBeLessThanOrEqual(viewport.width);
    expect(geometry!.documentWidth).toBeLessThanOrEqual(viewport.width);
  }

  await page.locator('#frmBasic input[name="name"]').fill("Changed User");
  await page.locator('#frmBasic input[name="email"]').fill("changed@example.com");
  await page.locator("#frmBasic button[type=submit]").click();
  await expect.poll(() => profileUpdates.length).toBe(1);
  expect(profileUpdates[0]).toEqual({
    avatarAttachmentId: "",
    email: "changed@example.com",
    name: "Changed User",
  });
});

async function mockProfile(page: Page, profileUpdates: Array<Record<string, unknown>>) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({ contentType: "application/json", json: workspaceBody() }),
  );
  await page.route("**/api/v1/workspace/profile", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    profileUpdates.push(JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>);
    await route.fulfill({ contentType: "application/json", json: workspaceBody() });
  });
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
