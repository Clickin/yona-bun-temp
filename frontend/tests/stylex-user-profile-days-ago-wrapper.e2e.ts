import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("authenticated public profile owns the daysAgo wrapper float", async ({ page }) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyView).toContain('<div class="user-stream-box">');
  expect(legacyView).toContain('<div class="pull-right">');
  expect(legacyView).toContain('id="daysAgoBtn"');
  expect(legacyView).toContain('name="daysAgo"');
  expect(pageLess).toContain(".user-stream-box");
  expect(commonLess).toContain(".mr10");
  expect(responsiveLess).toContain("@media");
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("userinfo.daysAgo.prefix");
  expect(messages).toContain("userinfo.daysAgo.suffix");
  expect(source).toContain('data-stylex-owner="user-profile-days-ago-controls"');
  expect(source).not.toContain('className="pull-right"');
  expect(styleSource).toContain('daysAgoControls: { float: "right" }');
  expect(styleSource).toContain("daysAgoInput:");

  let profileRequestUrl = "";
  await mockProfile(page, (url) => {
    profileRequestUrl = url;
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/door?daysAgo=14&selected=issues`, { waitUntil: "domcontentloaded" });

  const controls = page.locator('[data-stylex-owner="user-profile-days-ago-controls"]');
  const input = page.locator("#daysAgoBtn");
  await expect(controls).toHaveCount(1);
  await expect(controls).toHaveCSS("float", "right");
  await expect(controls).not.toHaveClass(/pull-right/);
  await expect(controls).not.toHaveAttribute("data-toggle");
  await expect(controls).toContainText("recently");
  await expect(controls).toContainText("days ago");
  await expect(input).toHaveAttribute("name", "daysAgo");
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "99");
  await expect(input).toHaveValue("14");
  await expect(input).toHaveClass(/input-mini-min/);

  expect(profileRequestUrl).toContain("daysAgo=14");
  expect(profileRequestUrl).toContain("selected=issues");

  const desktop = await page.evaluate(() => {
    const profile = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-box"]');
    const controls = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-days-ago-controls"]',
    );
    const input = document.querySelector<HTMLElement>("#daysAgoBtn");
    if (!profile || !controls || !input) throw new Error("daysAgo controls are missing");
    const profileBox = profile.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    return {
      controlsInsideProfile:
        profileBox.left <= controlsBox.left && controlsBox.right <= profileBox.right + 1,
      inputInsideControls: controls.contains(input),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(desktop).toEqual({
    controlsInsideProfile: true,
    inputInsideControls: true,
    documentWidth: 1366,
    viewportWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const profile = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-box"]');
    const controls = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-days-ago-controls"]',
    );
    if (!profile || !controls) throw new Error("daysAgo mobile controls are missing");
    const profileBox = profile.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    return {
      controlsInsideProfile:
        profileBox.left <= controlsBox.left && controlsBox.right <= profileBox.right + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      width: controlsBox.width,
    };
  });
  expect(mobile.controlsInsideProfile).toBe(true);
  expect(mobile.width).toBeGreaterThan(0);
  expect(mobile.documentWidth).toBe(mobile.viewportWidth);
});

async function mockProfile(page: Page, onProfileRequest: (url: string) => void) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) => {
    onProfileRequest(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    });
  });
}
