import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("current-user issues empty state keeps legacy error-wrap StyleX parity", async ({ page }) => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");
  const style = readFileSync("src/routes/user/-issues.stylex.ts", "utf8");
  const legacyList = readFileSync("../yona-original/app/views/issue/my_list.scala.html", "utf8");
  const legacySearch = readFileSync(
    "../yona-original/app/views/issue/my_partial_search.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyList).toContain(
    "@views.html.issue.my_partial_search(title, currentPage, param, project)",
  );
  expect(legacySearch).toContain('<div class="error-wrap">');
  expect(legacySearch).toContain('<i class="ico ico-err1"></i>');
  expect(legacySearch).toContain('<p>@Messages("issue.is.empty")</p>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -5px -160px;");
  expect(spritesLess).toContain("width: 62px;");
  expect(spritesLess).toContain("height: 82px;");
  expect(messages).toContain("issue.is.empty = No issue found");
  expect(style).toContain('padding: "100px 0px"');
  expect(style).toContain('backgroundPosition: "-5px -160px"');
  expect(style).toContain('backgroundRepeat: "no-repeat"');
  expect(style).toContain('verticalAlign: "middle"');
  expect(style).toContain('margin: "30px 0px"');
  expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png"');
  expect(route).toContain('data-stylex-owner="user-issues-empty-error-wrap"');
  expect(route).toContain('data-stylex-owner="user-issues-empty-error-icon"');
  expect(route).toContain('data-stylex-owner="user-issues-empty-error-message"');

  await mockEmptyUserIssues(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${basePath}/user/issues`, { waitUntil: "networkidle" });

  const wrap = page.locator('[data-stylex-owner="user-issues-empty-error-wrap"]');
  const icon = page.locator('[data-stylex-owner="user-issues-empty-error-icon"]');
  const message = page.locator('[data-stylex-owner="user-issues-empty-error-message"]');
  await expect(wrap).toBeVisible();
  await expect(message).toHaveText("No issue found");
  await expect(wrap.locator(" > i + p")).toHaveCount(1);
  await expect(wrap.locator(" > a, > button")).toHaveCount(0);

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await wrap.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-err1")!;
      const iconStyle = getComputedStyle(iconNode);
      const messageStyle = getComputedStyle(node.querySelector<HTMLElement>("p")!);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        iconHeight: iconStyle.height,
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        iconPosition: iconStyle.backgroundPosition,
        iconRepeat: iconStyle.backgroundRepeat,
        iconWidth: iconStyle.width,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageMargin: messageStyle.margin,
        padding: wrapStyle.padding,
        textAlign: wrapStyle.textAlign,
        verticalAlign: iconStyle.verticalAlign,
      };
    });
    expect(metrics).toEqual({
      iconHeight: "82px",
      iconInside: true,
      iconPosition: "-5px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "62px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
      verticalAlign: "middle",
    });
  }

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(fallback).toHaveCount(0);
  } else {
    await expect(fallback).toHaveCount(1);
  }
  await expect(icon).toHaveAttribute("style", /--x-backgroundImage/u);
});

async function mockEmptyUserIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "alice",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (request: Route) =>
      request.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (request: Route) =>
    request.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [],
        openIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 0,
        totalPages: 0,
        viewerUserId: 1,
      },
    }),
  );
}
