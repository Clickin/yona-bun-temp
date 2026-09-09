import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
const stylesSource = curatedAppCss();
const notFoundDefault = readFileSync(
  new URL("../../yona-original/app/views/error/notfound_default.scala.html", import.meta.url),
  "utf8",
);
const notFoundLayout = readFileSync(
  new URL("../../yona-original/app/views/error/notfound.scala.html", import.meta.url),
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

test("root alias not-found error-wrap owns frozen legacy Style parity", async ({ page }) => {
  expect(notFoundDefault).toContain('<div class="page-wrap-outer">');
  expect(notFoundDefault).toContain('<div class="project-page-wrap">');
  expect(notFoundDefault).toContain('<div class="error-wrap">');
  expect(notFoundDefault).toContain('<i class="ico ico-err2"></i>');
  expect(notFoundDefault).toContain("@Messages(messageKey)");
  expect(notFoundDefault).toContain('@Messages("menu.home")');
  expect(notFoundLayout).toContain('<div class="error-wrap">');
  expect(layout).toContain("@common.scripts()");
  expect(navbar).toContain('<header class="gnb-outer');
  expect(usermenu).toContain('<div id="mySidenav" class="sidenav">');
  expect(footer).toContain('<footer class="page-footer-outer">');
  expect(yobiLess).toContain('@import "less/_sprites.less"');
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(pageLess).toContain("color:#898989; margin:30px 0;");
  expect(spritesLess).toContain("background-image: url('@{base-image-path}/sprite.png');");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(responsiveLess).toContain("@media all and (max-width: 720px)");
  expect(bootstrapCss).toContain(".btn");
  expect(messages).toContain("error.notfound = Page not found");
  expect(messages).toContain("menu.home = Home");
  for (const owner of [
    "root-alias-notfound-error-wrap",
    "root-alias-notfound-error-icon",
    "root-alias-notfound-error-message",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  // Live legacy replay is not part of this harness; source mapping is the recorded parity evidence.
  await page.goto(`${basePath}/missing-legacy-route/unknown/root-style-notfound`, {
    waitUntil: "networkidle",
  });

  const wrap = page.locator('[data-owner="root-alias-notfound-error-wrap"]');
  const icon = page.locator('[data-owner="root-alias-notfound-error-icon"]');
  const message = page.locator('[data-owner="root-alias-notfound-error-message"]');
  await expect(wrap).toBeVisible();
  await expect(icon).toHaveClass(/ico-err2/u);
  await expect(message).toHaveText("Page not found");
  await expect(wrap.locator("a.ybtn.ybtn-info")).toHaveText("Home");
  expect(
    await wrap.evaluate((node) => [...node.children].map((child) => child.tagName.toLowerCase())),
  ).toEqual(["i", "p", "a"]);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await wrap.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(
        '[data-owner="root-alias-notfound-error-icon"]',
      )!;
      const iconStyle = getComputedStyle(iconNode);
      const messageStyle = getComputedStyle(
        node.querySelector<HTMLElement>('[data-owner="root-alias-notfound-error-message"]')!,
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

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});
