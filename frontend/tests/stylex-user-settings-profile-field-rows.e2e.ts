import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-user-settings-profile-field-rows",
  fallbackOff ? "fallback-off" : "normal",
);

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

test.use({ locale: "ko-KR" });

test("records the legacy profile field ownership and retained fallback consumer", () => {
  const route = read("src/routes/user/editform.tsx");
  const styles = read("src/routes/user/-editform.stylex.ts");
  const appCss = read("src/app.css");
  const legacy = read("../yona-original/app/views/user/edit.scala.html");
  const tabMenu = read("../yona-original/app/views/user/partial_edit_tabmenu.scala.html");
  const yobi = read("../yona-original/app/assets/stylesheets/yobi.less");
  const commonLess = read("../yona-original/app/assets/stylesheets/less/_common.less");
  const bootstrap = read("../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsive = read(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const messages = read("../yona-original/conf/messages");
  const messagesKo = read("../yona-original/conf/messages.ko-KR");
  const settingJs = read("../yona-original/public/javascripts/service/yobi.user.Setting.js");

  expect(legacy.match(/<dd class="mt10">/gu)).toHaveLength(3);
  expect(legacy).toContain('<dt>@Messages("user.loginId")</dt>\n            <dd class="mt10">');
  expect(legacy).toContain('<dt>@Messages("user.name")</dt>\n          <dd class="mt10">');
  expect(legacy).toContain('<dt>@Messages("user.email")</dt>\n          <dd class="mt10">');
  expect(legacy).toContain('<form id="frmBasic" method="post"');
  expect(tabMenu).toContain('<ul class="nav nav-tabs mt20">');
  expect(commonLess).toContain(".mt10 { margin-top:10px; }");
  expect(bootstrap).toContain("dl {");
  expect(bootstrap).toContain("margin-bottom: 20px;");
  expect(bootstrapResponsive.length).toBeGreaterThan(0);
  expect(messages).toContain("user.loginId = Login ID");
  expect(messages).toContain("user.name = Name");
  expect(messages).toContain("user.email = Email address");
  expect(messagesKo).toContain("user.loginId = 아이디");
  expect(messagesKo).toContain("user.name = 이름");
  expect(messagesKo).toContain("user.email = 이메일");
  expect(settingJs).toContain('htElement.welFormBasic = $("#frmBasic");');
  expect(settingJs).toContain("_initFormValidator();");

  const imports = [...yobi.matchAll(/@import "([^"]+)";/gu)].map((match) => match[1]);
  expect(imports).toEqual([
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
  ]);
  for (const importedStylesheet of imports) {
    expect(read(`../yona-original/app/assets/stylesheets/${importedStylesheet}`)).not.toBe("");
  }

  expect(styles).toContain('profileFieldRow: {\n    marginTop: "10px",\n  }');
  expect(route).toContain("userSettingsProfileStyles.profileFieldRow");
  for (const owner of [
    "user-settings-profile-login-id-row",
    "user-settings-profile-name-row",
    "user-settings-profile-email-row",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }

  const profileRowBlocks = (route.match(/<dd[\s\S]*?<\/dd>/gu) ?? []).filter((block) =>
    /data-stylex-owner="user-settings-profile-(?:login-id|name|email)-row"/u.test(block),
  );
  expect(profileRowBlocks).toHaveLength(3);
  for (const block of profileRowBlocks) {
    expect(block).toContain("userSettingsProfileStyles.profileFieldRow");
    expect(block).not.toContain('className="mt10"');
  }

  // The avatar upload row now owns its legacy mt10 spacing through the existing StyleX boundary.
  expect(route).not.toContain("btn-wrap mt10");
  expect(route).toContain("userSettingsAvatarStyles.uploadWrapMargin");
  expect(appCss).toContain(".mt10 {\n  margin-top: 10px;\n}");
  expect(route).not.toContain('style={{ marginTop: "10px" }}');
  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("addEventListener");
});

test(`pins profile field row geometry ${fallbackOff ? "fallback-off" : "normal"}`, async ({
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

    await expect(page.locator('[data-stylex-owner="user-settings-profile-form"]')).toBeVisible();
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const rows = page.locator(
      '[data-stylex-owner="user-settings-profile-login-id-row"], [data-stylex-owner="user-settings-profile-name-row"], [data-stylex-owner="user-settings-profile-email-row"]',
    );
    await expect(rows).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(rows.nth(index)).toBeVisible();
      await expect(rows.nth(index)).not.toHaveClass(/\bmt10\b/u);
      await expect(rows.nth(index)).not.toHaveAttribute("style");
      await expect(rows.nth(index)).toHaveCSS("margin-top", "10px");
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

    await expect(fields.nth(0).locator("input")).toHaveValue("admin");
    await expect(fields.nth(0).locator("input")).toHaveAttribute("type", "text");
    await expect(fields.nth(0).locator("input")).toHaveAttribute("readonly", "");
    await expect(fields.nth(1).locator("input")).toHaveValue("Admin User");
    await expect(fields.nth(1).locator("input")).toHaveAttribute("name", "name");
    await expect(fields.nth(2).locator("input")).toHaveValue("admin@example.com");
    await expect(fields.nth(2).locator("input")).toHaveAttribute("name", "email");
    await expect(fields.nth(2).locator("input")).toHaveAttribute("type", "email");

    const directChildren = await page.locator("#frmBasic dl").evaluate((dl) =>
      Array.from(dl.children).map((element) => ({
        tag: element.tagName,
        text:
          element.querySelector<HTMLInputElement>("input")?.value ??
          element.textContent?.replace(/\s+/gu, " ").trim(),
      })),
    );
    expect(directChildren).toEqual([
      { tag: "DT", text: "아이디" },
      { tag: "DD", text: "admin" },
      { tag: "DT", text: "이름" },
      { tag: "DD", text: "Admin User" },
      { tag: "DT", text: "이메일" },
      { tag: "DD", text: "admin@example.com" },
      { tag: "DD", text: "프로필 수정" },
    ]);

    const geometry = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="user-settings-profile-login-id-row"], [data-stylex-owner="user-settings-profile-name-row"], [data-stylex-owner="user-settings-profile-email-row"]',
        ),
      );
      const form = document.querySelector<HTMLElement>("#frmBasic");
      if (!form || rows.length !== 3) return null;
      return {
        documentWidth: document.documentElement.scrollWidth,
        form: form.getBoundingClientRect().toJSON(),
        rows: rows.map((row) => {
          const input = row.querySelector<HTMLInputElement>("input");
          if (!input) return null;
          return {
            input: input.getBoundingClientRect().toJSON(),
            marginTop: getComputedStyle(row).marginTop,
            row: row.getBoundingClientRect().toJSON(),
          };
        }),
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.rows.every((row) => row !== null)).toBe(true);
    expect(geometry!.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry!.rows[0]!.row.top).toBeLessThan(geometry!.rows[1]!.row.top);
    expect(geometry!.rows[1]!.row.top).toBeLessThan(geometry!.rows[2]!.row.top);
    for (const row of geometry!.rows) {
      expect(row!.marginTop).toBe("10px");
      expect(row!.input.left).toBeGreaterThanOrEqual(row!.row.left - 1);
      expect(row!.input.right).toBeLessThanOrEqual(row!.row.right + 1);
      expect(row!.input.top).toBeGreaterThanOrEqual(row!.row.top - 1);
      expect(row!.input.bottom).toBeLessThanOrEqual(row!.row.bottom + 1);
    }

    const avatarUploadWrap = page.locator('[data-stylex-owner="user-settings-avatar-upload-wrap"]');
    await expect(avatarUploadWrap).not.toHaveClass(/\bmt10\b/u);
    await expect(avatarUploadWrap).toHaveCSS("margin-top", "10px");
    await expect(page.locator("#frmBasic")).toHaveAttribute("method", "post");
    await expect(page.locator("#frmBasic")).toHaveAttribute("action", /\/user\/edit/u);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

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
