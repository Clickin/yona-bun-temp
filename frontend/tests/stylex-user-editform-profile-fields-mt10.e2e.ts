import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-user-editform-profile-fields-mt10",
  fallbackOff ? "fallback-off" : "normal",
);

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

test.use({ locale: "ko-KR" });

test("user edit profile fields own the three legacy mt10 declarations", async ({ page }) => {
  const route = read("src/routes/user/editform.tsx");
  const styles = read("src/routes/user/-editform.stylex.ts");
  const legacyTemplate = read("../yona-original/app/views/user/edit.scala.html");
  const commonLess = read("../yona-original/app/assets/stylesheets/less/_common.less");

  expect(legacyTemplate.match(/<dd class="mt10">/gu)).toHaveLength(3);
  expect(legacyTemplate).toContain(
    '<dt>@Messages("user.loginId")</dt>\n            <dd class="mt10">',
  );
  expect(legacyTemplate).toContain('<dt>@Messages("user.name")</dt>\n          <dd class="mt10">');
  expect(legacyTemplate).toContain('<dt>@Messages("user.email")</dt>\n          <dd class="mt10">');
  expect(legacyTemplate).toContain('<div class="btn-wrap mt10 center-txt">');
  expect(commonLess).toContain(".mt10 { margin-top:10px; }");

  expect(styles).toContain('profileFieldRow: {\n    marginTop: "10px",\n  }');
  expect(route).toContain("userSettingsProfileStyles.profileFieldRow");
  for (const owner of [
    "user-settings-profile-login-id-row",
    "user-settings-profile-name-row",
    "user-settings-profile-email-row",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route.match(/className="mt10"/gu) ?? []).toHaveLength(0);
  expect(route).toContain('data-stylex-owner="user-settings-avatar-upload-wrap"');
  expect(route).toContain(
    "className={`btn-wrap mt10 ${stylex.props(userSettingsAvatarStyles.uploadWrap, userSettingsAvatarStyles.uploadWrapMargin).className}`}",
  );
  expect(route).not.toContain('style={{ marginTop: "10px" }}');
  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("addEventListener");

  await mockProfile(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/user/editform`, { waitUntil: "commit" });
  await assertProfileRows(page, "desktop");

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${basePath}/user/editform`, { waitUntil: "commit" });
  await assertProfileRows(page, "mobile");
});

async function assertProfileRows(page: Page, viewportName: "desktop" | "mobile") {
  const rows = page.locator(
    '[data-stylex-owner="user-settings-profile-login-id-row"], [data-stylex-owner="user-settings-profile-name-row"], [data-stylex-owner="user-settings-profile-email-row"]',
  );
  await expect(rows).toHaveCount(3);
  for (const index of [0, 1, 2]) {
    await expect(rows.nth(index)).toBeVisible();
    await expect(rows.nth(index)).not.toHaveClass(/\bmt10\b/u);
    await expect(rows.nth(index)).not.toHaveAttribute("style");
  }

  const fields = page.locator("#frmBasic dl > dd").filter({ has: page.locator("input") });
  await expect(fields).toHaveCount(3);
  await expect(fields.nth(0)).toHaveAttribute(
    "data-stylex-owner",
    "user-settings-profile-login-id-row",
  );
  await expect(fields.nth(1)).toHaveAttribute(
    "data-stylex-owner",
    "user-settings-profile-name-row",
  );
  await expect(fields.nth(2)).toHaveAttribute(
    "data-stylex-owner",
    "user-settings-profile-email-row",
  );

  const values = await fields.evaluateAll((elements) =>
    elements.map((element) => {
      const input = element.querySelector<HTMLInputElement>("input");
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        marginTop: style.marginTop,
        text: input?.value ?? "",
        top: box.top,
        inlineStyle: element.getAttribute("style"),
      };
    }),
  );
  expect(values).toEqual([
    { inlineStyle: null, marginTop: "10px", text: "admin", top: expect.any(Number) },
    { inlineStyle: null, marginTop: "10px", text: "Admin User", top: expect.any(Number) },
    { inlineStyle: null, marginTop: "10px", text: "admin@example.com", top: expect.any(Number) },
  ]);
  expect(values[0].top).toBeLessThan(values[1].top);
  expect(values[1].top).toBeLessThan(values[2].top);
  await expect(page.locator("dt").filter({ hasText: "아이디" })).toHaveCount(1);
  await expect(page.locator("dt").filter({ hasText: "이름" })).toHaveCount(1);
  await expect(page.locator("dt").filter({ hasText: "이메일" })).toHaveCount(1);

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(fallbackOff ? 0 : 1);
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, `${viewportName}.png`),
  });
}

async function mockProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
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
    preferredLanguage: "ko-KR",
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
