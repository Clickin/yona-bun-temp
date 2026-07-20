import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", import.meta.url),
  "utf8",
);
const legacyPartial = readFileSync(
  new URL(
    "../../yona-original/app/views/project/partial_issuelabels_list.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const legacyShell = readFileSync(
  new URL("../../yona-original/app/views/project/issuelabels.scala.html", import.meta.url),
  "utf8",
);
const yobi = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const pageLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const spritesLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
  "utf8",
);
const messages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test("project labels empty state keeps legacy error-wrap StyleX parity", async ({ page }) => {
  expect(legacyPartial).toContain('<div class="error-wrap">');
  expect(legacyPartial).toContain('<i class="ico ico-err1"></i>');
  expect(legacyPartial).toContain('@Messages("label.list.empty")');
  expect(legacyShell).toContain('<div id="labelsList" class="issue-label-list-wrap">');
  expect(yobi).toContain('@import "less/_sprites.less"');
  expect(yobi).toContain('@import "less/_page.less"');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain(".ico-err1 {");
  expect(spritesLess).toContain("background-position: -5px -160px;");
  expect(spritesLess).toContain("width: 62px;");
  expect(spritesLess).toContain("height: 82px;");
  for (const declaration of [
    'errorWrap: { padding: "100px 0px", textAlign: "center" }',
    'backgroundPosition: "-5px -160px"',
    'backgroundRepeat: "no-repeat"',
    'display: "inline-block"',
    'height: "82px"',
    'verticalAlign: "middle"',
    'width: "62px"',
    'color: "#898989"',
    'fontSize: "16px"',
    'fontWeight: "bold"',
    'margin: "30px 0px"',
  ]) {
    expect(styleSource).toContain(declaration);
  }
  expect(routeSource).toContain('t("label.list.empty")');
  for (const owner of [
    "project-labels-empty-error-wrap",
    "project-labels-empty-error-icon",
    "project-labels-empty-error-message",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain("legacySpriteUrl");

  await mockEmptyProjectLabels(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/labelsform`, { waitUntil: "commit" });

  const empty = page.locator('[data-stylex-owner="project-labels-empty-error-wrap"]');
  const icon = page.locator('[data-stylex-owner="project-labels-empty-error-icon"]');
  const message = page.locator('[data-stylex-owner="project-labels-empty-error-message"]');
  await expect(empty).toBeVisible();
  await expect(empty).toHaveClass(/error-wrap/u);
  await expect(icon).toHaveClass(/ico-err1/u);
  await expect(message).toHaveText("No label exists");
  await expect(empty.locator("p")).toHaveCount(1);
  expect(await empty.locator("i").evaluate((node) => node.nextElementSibling?.tagName)).toBe("P");

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await empty.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(
        '[data-stylex-owner="project-labels-empty-error-icon"]',
      )!;
      const iconStyle = getComputedStyle(iconNode);
      const messageNode = node.querySelector<HTMLElement>(
        '[data-stylex-owner="project-labels-empty-error-message"]',
      )!;
      const messageStyle = getComputedStyle(messageNode);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        contained: wrapBox.left >= 0 && wrapBox.right <= window.innerWidth,
        iconCentered:
          Math.abs(iconBox.left + iconBox.width / 2 - (wrapBox.left + wrapBox.width / 2)) < 1,
        iconHeight: iconStyle.height,
        iconPosition: iconStyle.backgroundPosition,
        iconRepeat: iconStyle.backgroundRepeat,
        iconWidth: iconStyle.width,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageFontWeight: messageStyle.fontWeight,
        messageMargin: messageStyle.margin,
        padding: wrapStyle.padding,
        textAlign: wrapStyle.textAlign,
        verticalAlign: iconStyle.verticalAlign,
      };
    });
    expect(metrics).toEqual({
      contained: true,
      iconCentered: true,
      iconHeight: "82px",
      iconPosition: "-5px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "62px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageFontWeight: "700",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
      verticalAlign: "middle",
    });
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});

async function mockEmptyProjectLabels(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        backgroundUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isFavorited: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectId: 7,
        projectName: "sample",
        showCode: true,
        showBoard: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isWatching: true,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: "admin",
        postCount: 1,
        projectId: 7,
        projectName: "sample",
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        vcs: "GIT",
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels: [] }),
    });
  });
}
