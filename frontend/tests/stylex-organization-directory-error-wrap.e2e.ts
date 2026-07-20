import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackDisabled = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";

test.use({ locale: "ko-KR" });

test("organization directory empty state keeps legacy ico-err1 StyleX parity", async ({ page }) => {
  const route = readFileSync("src/routes/orgs.tsx", "utf8");
  const stylexSource = readFileSync("src/routes/-orgs.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/organization/list.scala.html", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );

  expect(template).toContain('<div class="error-wrap">');
  expect(template).toContain('<i class="ico ico-err1"></i>');
  expect(template).toContain('<p>@Messages("organization.is.empty")</p>');
  expect(messages).toContain("organization.is.empty = 속한 그룹이 없습니다.");
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain(".ico-err1 {");
  expect(spritesLess).toContain("background-position: -5px -160px;");
  expect(route).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png";');
  expect(route).toContain('data-stylex-owner="organization-directory-empty"');
  expect(route).toContain('data-stylex-owner="organization-directory-empty-icon"');
  expect(route).toContain('data-stylex-owner="organization-directory-empty-message"');
  for (const declaration of [
    'backgroundPosition: "-5px -160px"',
    'backgroundRepeat: "no-repeat"',
    'display: "inline-block"',
    'height: "82px"',
    'verticalAlign: "middle"',
    'width: "62px"',
  ]) {
    expect(stylexSource).toContain(declaration);
  }

  await mockEmptyOrganizations(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/orgs`);

    const wrap = page.locator('[data-stylex-owner="organization-directory-empty"]');
    const icon = page.locator('[data-stylex-owner="organization-directory-empty-icon"]');
    const message = page.locator('[data-stylex-owner="organization-directory-empty-message"]');
    await expect(wrap).toBeVisible();
    await expect(icon).toHaveClass(/\bico\b.*\bico-err1\b/u);
    await expect(message).toHaveText("속한 그룹이 없습니다.");

    const state = await wrap.evaluate((element) => {
      const iconElement = element.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-directory-empty-icon"]',
      );
      const messageElement = element.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-directory-empty-message"]',
      );
      if (!iconElement || !messageElement) throw new Error("empty-state owners missing");
      const wrapStyle = getComputedStyle(element);
      const iconStyle = getComputedStyle(iconElement);
      const messageStyle = getComputedStyle(messageElement);
      const wrapBox = element.getBoundingClientRect();
      const iconBox = iconElement.getBoundingClientRect();
      const messageBox = messageElement.getBoundingClientRect();
      return {
        childOrder: [...element.children].map((child) => child.tagName),
        wrap: wrapBox.toJSON(),
        icon: iconBox.toJSON(),
        message: messageBox.toJSON(),
        styles: {
          backgroundImage: iconStyle.backgroundImage,
          backgroundPosition: iconStyle.backgroundPosition,
          backgroundRepeat: iconStyle.backgroundRepeat,
          display: iconStyle.display,
          height: iconStyle.height,
          verticalAlign: iconStyle.verticalAlign,
          width: iconStyle.width,
          padding: wrapStyle.padding,
          textAlign: wrapStyle.textAlign,
          fontSize: messageStyle.fontSize,
          fontWeight: messageStyle.fontWeight,
          margin: messageStyle.margin,
        },
      };
    });

    expect(state.childOrder).toEqual(["I", "P"]);
    expect(state.styles).toEqual({
      backgroundImage: expect.stringContaining("sprite.png"),
      backgroundPosition: "-5px -160px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "82px",
      verticalAlign: "middle",
      width: "62px",
      padding: "100px 0px",
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "700",
      margin: "30px 0px",
    });
    expect(state.icon.left).toBeGreaterThanOrEqual(state.wrap.left);
    expect(state.icon.right).toBeLessThanOrEqual(state.wrap.right);
    expect(state.message.left).toBeGreaterThanOrEqual(state.wrap.left);
    expect(state.message.right).toBeLessThanOrEqual(state.wrap.right);
    expect(state.wrap.width).toBeLessThanOrEqual(viewport.width);
    expect(state.wrap.width).toBeGreaterThan(0);
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    fallbackDisabled ? 0 : 1,
  );
});

async function mockEmptyOrganizations(page: Page) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], totalPages: 1, pageNum: 1 },
    }),
  );
}
