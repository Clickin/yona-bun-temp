import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: true, isGuest: true, loginId: "anonymous" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: profileResponse(),
    }),
  );
});

test("guest viewer owns the legacy empty public-profile stream shell", async ({ page }) => {
  await assertSourceEvidence();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

    const shell = page.locator('[data-stylex-owner="user-profile-guest-stream-shell"]');
    await expect(shell).toHaveCount(1);
    await expect(shell).toBeEmpty();
    await expect(shell).not.toHaveClass(/(?:^|\s)user-stream-box(?:\s|$)/u);
    await expect(shell).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
      "data-dismiss",
      "data-target",
    ]) {
      await expect(shell).not.toHaveAttribute(attribute);
    }

    await expect(shell).toHaveCSS("padding-left", "20px");
    await expect(shell).toHaveCSS("overflow", "hidden");
    await expect(shell).toHaveCSS("min-width", "0px");
    await expect(page.locator('[data-stylex-owner="user-profile-info"]')).toBeVisible();
    await expect(page.locator('[data-stylex-owner="user-profile-provider-logo"]')).toBeVisible();
    await expect(page.locator('[data-stylex-owner="user-profile-provider-google"]')).toHaveCount(1);
    await expect(page.locator('[data-stylex-owner="user-profile-guest-badge"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="user-profile-stream"]')).toHaveCount(0);
    await expect(page.locator("#daysAgoBtn")).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="user-profile-tabs"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="user-profile-tab-content"]')).toHaveCount(0);
    await expect(page.locator("#issues, #pullRequests, #projects")).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const profile = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-box"]');
      const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
      const shell = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-guest-stream-shell"]',
      );
      if (!profile || !info || !shell) throw new Error("guest stream geometry owners missing");
      const profileBox = profile.getBoundingClientRect();
      const infoBox = info.getBoundingClientRect();
      const shellBox = shell.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        infoWidth: infoBox.width,
        noOverlap: shellBox.left >= infoBox.right - 1,
        shellFollowsInfo: info.nextElementSibling === shell && shell.parentElement === profile,
        shellInsideProfile:
          shellBox.left >= profileBox.left && shellBox.right <= profileBox.right + 1,
        shellStartsAtOrAfterInfoRail: shellBox.left >= profileBox.left + 200 - 1,
        shellWidth: shellBox.width,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.infoWidth).toBe(200);
    expect(geometry.noOverlap).toBe(true);
    expect(geometry.shellFollowsInfo).toBe(true);
    expect(geometry.shellInsideProfile).toBe(true);
    expect(geometry.shellStartsAtOrAfterInfoRail).toBe(true);
    expect(geometry.shellWidth).toBeGreaterThanOrEqual(0);
    expect(geometry.documentWidth).toBe(geometry.viewportWidth);
  }
});

test("authenticated viewer retains the existing fallback boundary and controls", async ({
  page,
}) => {
  await page.unroute("**/api/v1/session");
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

  const stream = page.locator('[data-stylex-owner="user-profile-stream"]');
  await expect(stream).toHaveCount(1);
  await expect(stream).toHaveClass(/(?:^|\s)user-stream-box(?:\s|$)/u);
  await expect(stream).toHaveCSS("min-width", "0px");
  await expect(page.locator('[data-stylex-owner="user-profile-guest-stream-shell"]')).toHaveCount(
    0,
  );
  await expect(page.locator("#daysAgoBtn")).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="user-profile-tabs"]')).toHaveCount(1);
});

async function assertSourceEvidence() {
  const [routeSource, styleSource, scala, bootstrap, bootstrapResponsive, yobi, ...lessChain] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      ...[
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
      ].map((name) =>
        readFile(
          new URL(`../../yona-original/app/assets/stylesheets/less/${name}`, import.meta.url),
          "utf8",
        ),
      ),
    ]);

  expect(scala).toMatch(
    /<div class="user-stream-box">\s*@if\(!UserApp\.currentUser\(\)\.isGuest\)\{/u,
  );
  expect(scala.indexOf('<div class="user-stream-box">')).toBeLessThan(
    scala.indexOf("@if(!UserApp.currentUser().isGuest){"),
  );
  expect(yobi).toContain('@import "less/_page.less"');
  expect(yobi).toContain('@import "less/_responsive.less"');
  expect(yobi).toContain('@import "less/_override.less"');
  expect(lessChain).toHaveLength(13);
  const pageLess = lessChain[4];
  expect(pageLess).toContain(".user-stream-box {\n    padding-left: 20px;\n    overflow: hidden;");
  expect(bootstrap).not.toContain(".user-stream-box");
  expect(bootstrapResponsive).not.toContain(".user-stream-box");
  for (const laterLess of lessChain.slice(7)) {
    expect(laterLess).not.toContain(".user-stream-box");
  }
  expect(routeSource).toMatch(
    /\) : \(\s*<div[^>]+data-stylex-owner="user-profile-guest-stream-shell"[^>]*><\/div>\s*\)\}/u,
  );
  expect(styleSource).toContain('guestStreamShell: { overflow: "hidden", paddingLeft: "20px" }');
  expect(styleSource).not.toMatch(/guestStreamShell:\s*\{[^}]*minWidth/su);
}

function profileResponse() {
  return {
    daysAgo: 14,
    selected: "issues",
    viewerCanEditProfile: false,
    profile: {
      avatarUrl: "",
      connectedSocialProviders: ["google"],
      displayName: "Door User",
      englishName: "Door",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: false,
      loginId: "door",
      primaryEmailAddress: "door@example.test",
      sinceLabel: "2026-06-30",
    },
    issueItems: [],
    memberProjects: [],
    pullRequestItems: [],
  };
}
