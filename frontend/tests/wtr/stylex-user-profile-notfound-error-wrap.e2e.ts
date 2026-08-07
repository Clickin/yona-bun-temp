import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(
  new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
  "utf8",
);
const legacyView = readFileSync(
  new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
  "utf8",
);
const notFound = readFileSync(
  new URL("../../yona-original/app/views/error/notfound_default.scala.html", import.meta.url),
  "utf8",
);
const layout = readFileSync(
  new URL("../../yona-original/app/views/layout.scala.html", import.meta.url),
  "utf8",
);
const navbar = readFileSync(
  new URL("../../yona-original/app/views/common/navbar.scala.html", import.meta.url),
  "utf8",
);
const usermenu = readFileSync(
  new URL("../../yona-original/app/views/common/usermenu.scala.html", import.meta.url),
  "utf8",
);
const footer = readFileSync(
  new URL("../../yona-original/app/views/common/footer.scala.html", import.meta.url),
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
const responsiveLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const bootstrapCss = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const messages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test("public missing-user error-wrap owns frozen legacy StyleX parity", async ({ page }) => {
  expect(legacyView).toContain("@siteLayout(user.loginId, utils.MenuType.USER)");
  expect(notFound).toContain('<div class="error-wrap">');
  expect(notFound).toContain('<i class="ico ico-err2"></i>');
  expect(notFound).toContain('@Messages("menu.home")');
  expect(layout).toContain("bootstrap/css/bootstrap.css");
  expect(navbar).toContain('<header class="gnb-outer');
  expect(usermenu).toContain('<div id="mySidenav" class="sidenav">');
  expect(footer).toContain('<footer class="page-footer-outer">');
  for (const imported of [
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
  ]) {
    expect(yobiLess).toContain(`@import "${imported}"`);
  }
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(pageLess).toContain("color:#898989; margin:30px 0;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(responsiveLess).toContain("@media all and (max-width: 720px)");
  expect(bootstrapCss).toContain(".btn");
  expect(messages).toContain("user.notExists.name = User exists not");
  expect(messages).toContain("menu.home = Home");
  expect(routeSource).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png"');
  expect(routeSource).toContain("userProfileNotFoundStyles");
  expect(routeSource).toContain('t("user.notExists.name")');
  expect(routeSource).toContain('t("menu.home")');
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

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: true, loginId: "anonymous" },
    }),
  );
  await page.route("**/api/v1/users/ghost/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 404,
      json: { error: { code: "not_found", message: "User exists not", status: 404 } },
    }),
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/ghost`, { waitUntil: "networkidle" });
    const wrap = page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]');
    const icon = page.locator('[data-stylex-owner="user-profile-notfound-error-icon"]');
    const message = page.locator('[data-stylex-owner="user-profile-notfound-error-message"]');
    const home = page.locator('[data-stylex-owner="user-profile-notfound-home"]');
    await expect(wrap).toBeVisible();
    await expect(icon).toHaveClass(/ico-err2/u);
    await expect(message).toHaveText("User exists not");
    await expect(home).toHaveText("Home");
    await expect(home).toHaveAttribute("href", `${basePath}/`);
    expect(
      await wrap.evaluate((node) => [...node.children].map((child) => child.tagName.toLowerCase())),
    ).toEqual(["i", "p", "a"]);
    const metrics = await wrap.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-notfound-error-icon"]',
      )!;
      const iconStyle = getComputedStyle(iconNode);
      const messageStyle = getComputedStyle(
        node.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-notfound-error-message"]',
        )!,
      );
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
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
