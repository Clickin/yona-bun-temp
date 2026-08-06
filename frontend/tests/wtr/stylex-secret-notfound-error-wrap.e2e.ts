import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(new URL("../src/routes/secret.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(
  new URL("../src/routes/-secret.stylex.ts", import.meta.url),
  "utf8",
);
const notFoundDefault = readFileSync(
  new URL("../../yona-original/app/views/error/notfound_default.scala.html", import.meta.url),
  "utf8",
);
const notFoundMessages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);
const yobiLess = readFileSync(
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

test("secret not-found error wrap owns the frozen legacy declarations", async ({ page }) => {
  expect(notFoundDefault).toContain('<div class="page-wrap-outer">');
  expect(notFoundDefault).toContain('<div class="project-page-wrap">');
  expect(notFoundDefault).toContain('<div class="error-wrap">');
  expect(notFoundDefault).toContain('<i class="ico ico-err2"></i>');
  expect(notFoundDefault).toContain("@Messages(messageKey)");
  expect(notFoundDefault).toContain('@Messages("menu.home")');
  expect(notFoundMessages).toContain("error.notfound = Page not found");
  expect(notFoundMessages).toContain("menu.home = Home");
  expect(yobiLess).toContain('@import "less/_sprites.less"');
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(pageLess).toContain("color:#898989; margin:30px 0;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(routeSource).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png"');
  expect(routeSource).toContain("secretNotFoundStyles");
  expect(routeSource).toContain('t("error.notfound")');
  expect(routeSource).toContain('t("menu.home")');
  for (const owner of [
    "secret-notfound-page",
    "secret-notfound-error-wrap",
    "secret-notfound-error-icon",
    "secret-notfound-error-message",
    "secret-notfound-home",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const declaration of [
    'errorWrap: { padding: "100px 0px", textAlign: "center" }',
    'backgroundPosition: "-80px -160px"',
    'backgroundRepeat: "no-repeat"',
    'display: "inline-block"',
    'height: "80px"',
    'verticalAlign: "middle"',
    'width: "50px"',
    'color: "#898989"',
    'fontSize: "16px"',
    'fontWeight: "bold"',
    'margin: "30px 0px"',
  ]) {
    expect(stylesSource).toContain(declaration);
  }

  await mockSecretNotFound(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/secret`, { waitUntil: "networkidle" });

    const pageNode = page.locator('[data-stylex-owner="secret-notfound-page"]');
    const wrap = page.locator('[data-stylex-owner="secret-notfound-error-wrap"]');
    const icon = page.locator('[data-stylex-owner="secret-notfound-error-icon"]');
    const message = page.locator('[data-stylex-owner="secret-notfound-error-message"]');
    const home = page.locator('[data-stylex-owner="secret-notfound-home"]');
    await expect(pageNode).toBeVisible();
    await expect(wrap).toHaveClass(/error-wrap/u);
    await expect(icon).toHaveClass(/ico-err2/u);
    await expect(message).toHaveText("Page not found");
    await expect(home).toHaveText("Home");
    await expect(home).toHaveAttribute("href", `${basePath}/`);

    const order = await wrap.evaluate((node) =>
      [...node.children].map((child) => child.tagName.toLowerCase()),
    );
    expect(order).toEqual(["i", "p", "a"]);

    const metrics = await wrap.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(
        '[data-stylex-owner="secret-notfound-error-icon"]',
      )!;
      const iconStyle = getComputedStyle(iconNode);
      const messageNode = node.querySelector<HTMLElement>(
        '[data-stylex-owner="secret-notfound-error-message"]',
      )!;
      const messageStyle = getComputedStyle(messageNode);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        contained: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
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
        wrapWithinViewport: wrapBox.left >= 0 && wrapBox.right <= window.innerWidth,
      };
    });
    expect(metrics).toEqual({
      contained: true,
      iconCentered: true,
      iconHeight: "80px",
      iconPosition: "-80px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "50px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageFontWeight: "700",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
      wrapWithinViewport: true,
    });

    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );
  }
});

async function mockSecretNotFound(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
      siteName: "Yoram",
    };
  }, basePath);
  await page.route("**/api/v1/auth/capabilities", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { secretSetupRequired: false },
    }),
  );
}
