import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-user-profile-notfound-home-button",
  fallbackOff ? "fallback-off" : "fallback-on",
);
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
const yobiLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const variablesLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
  "utf8",
);
const yobiUiLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
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
const bootstrapResponsiveCss = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const messages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test("public missing-user Home CTA owns the exact legacy ybtn-info cascade", async ({ page }) => {
  expect(legacyView).toContain("@siteLayout(user.loginId, utils.MenuType.USER)");
  expect(notFound).toContain('<div class="error-wrap">');
  expect(notFound).toContain(
    '<a href="@routes.Application.index()" class="ybtn ybtn-info">@Messages("menu.home")</a>',
  );
  expect(layout).toContain("bootstrap/css/bootstrap.css");
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
  expect(variablesLess).toContain("@yobi-blue : #3A7EE5;");
  expect(variablesLess).toContain("@yobi-blue-dark :#206EE5;");
  expect(variablesLess).toContain("@yobi-btn-info : @yobi-blue;");
  expect(variablesLess).toContain("@yobi-btn-info-hover : @yobi-blue-dark;");
  expect(yobiUiLess).toContain(".ybtn, .flat > li > .ybtn");
  expect(yobiUiLess).toContain("color: #333;");
  expect(yobiUiLess).toContain("background-color: @yobi-btn-default;");
  expect(yobiUiLess).toContain("text-shadow:none;");
  expect(yobiUiLess).toContain("display:inline-block;");
  expect(yobiUiLess).toContain("padding: 4px 12px !important;");
  expect(yobiUiLess).toContain("vertical-align: middle;");
  expect(yobiUiLess).toContain("cursor: pointer;");
  expect(yobiUiLess).toContain("line-height: 20px;");
  expect(yobiUiLess).toContain("font-size: 14px;");
  expect(yobiUiLess).toContain(".transition(all 0.3s ease);");
  expect(yobiUiLess).toContain("outline:0 none;");
  expect(yobiUiLess).toContain("position:relative;");
  expect(yobiUiLess).toContain("margin-bottom: 0;");
  expect(yobiUiLess).toContain("margin-left: .3em;");
  expect(yobiUiLess).toContain("border: 1px solid rgba(0,0,0,.15);");
  expect(yobiUiLess).toContain(".box-shadow(0 1px 0 rgba(0,0,0,.05));");
  expect(yobiUiLess).toContain("z-index: 2;");
  expect(yobiUiLess).toContain("&:hover, &:focus, &:active, &:focus, &.disabled, &[disabled]");
  expect(yobiUiLess).toContain("border:1px solid rgba(0,0,0,.25);");
  expect(yobiUiLess).toContain("background-color:#f1f1f1;");
  expect(yobiUiLess).toContain("color: #292929;");
  expect(yobiUiLess).toContain("text-decoration:none;");
  expect(yobiUiLess).toContain("&.ybtn-info");
  expect(yobiUiLess).toContain("color:@yobi-white;");
  expect(yobiUiLess).toContain("background-color : @yobi-btn-info !important;");
  expect(yobiUiLess).toContain("border:1px solid @yobi-btn-info-hover;");
  expect(yobiUiLess).toContain("background-color: @yobi-btn-info-hover !important;");
  expect(responsiveLess).toContain("@media all and (max-width: 720px)");
  expect(bootstrapCss).toContain(".btn");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px)");
  expect(messages).toContain("user.notExists.name = User exists not");
  expect(messages).toContain("menu.home = Home");

  expect(routeSource).toContain("userProfileNotFoundStyles.homeButton");
  expect(routeSource).toContain('data-stylex-owner="user-profile-notfound-home"');
  expect(routeSource).not.toContain('className="ybtn ybtn-info"');
  for (const declaration of [
    'backgroundColor: "#3A7EE5 !important"',
    'borderColor: "#206EE5"',
    'borderRadius: "3px !important"',
    'boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"',
    'fontSize: "14px"',
    'lineHeight: "20px"',
    'marginLeft: "0.3em"',
    'padding: "4px 12px !important"',
    'transition: "all 0.3s ease"',
    'backgroundColor: "#206EE5 !important"',
    'borderColor: "#206EE5"',
    'backgroundColor: "#3A7EE5 !important"',
  ]) {
    expect(stylesSource).toContain(declaration);
  }

  let sessionFixture = { isAnonymous: true, loginId: "anonymous" };
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: sessionFixture }),
  );
  await page.route("**/api/v1/users/ghost/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 404,
      json: { error: { code: "not_found", message: "User exists not", status: 404 } },
    }),
  );

  for (const session of [
    { isAnonymous: true, loginId: "anonymous" },
    { isAnonymous: false, loginId: "admin" },
  ]) {
    sessionFixture = session;
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/ghost`, { waitUntil: "networkidle" });

      const wrap = page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]');
      const home = page.locator('[data-stylex-owner="user-profile-notfound-home"]');
      await expect(wrap).toBeVisible();
      await expect(home).toBeVisible();
      await expect(home).toHaveText("Home");
      await expect(home).toHaveAttribute("href", `${basePath}/`);
      expect(await home.evaluate((node) => node.tagName.toLowerCase())).toBe("a");
      expect(await home.getAttribute("class")).not.toMatch(/\bybtn(?:-info)?\b/u);
      expect(await home.getAttribute("data-stylex-owner")).toBe("user-profile-notfound-home");

      const attributes = await home.evaluate((node) =>
        [...node.attributes].map((attribute) => attribute.name),
      );
      expect(attributes).not.toContain("style");
      for (const pluginAttribute of [
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-dismiss",
        "data-target",
        "data-trigger",
      ]) {
        expect(attributes).not.toContain(pluginAttribute);
      }

      expect(
        await wrap.evaluate((node) =>
          [...node.children].map((child) => child.tagName.toLowerCase()),
        ),
      ).toEqual(["i", "p", "a"]);

      const metrics = await home.evaluate((node) => {
        const style = getComputedStyle(node);
        const homeBox = node.getBoundingClientRect();
        const wrapBox = node.parentElement!.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderTopColor,
          borderRadius: style.borderRadius,
          borderStyle: style.borderTopStyle,
          borderWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          color: style.color,
          contained: homeBox.left >= wrapBox.left && homeBox.right <= wrapBox.right,
          cursor: style.cursor,
          display: style.display,
          fontSize: style.fontSize,
          height: homeBox.height,
          lineHeight: style.lineHeight,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          padding: style.padding,
          position: style.position,
          textAlign: style.textAlign,
          textShadow: style.textShadow,
          transition: style.transition,
          verticalAlign: style.verticalAlign,
          width: homeBox.width,
          withinViewport: homeBox.left >= 0 && homeBox.right <= window.innerWidth,
          whiteSpace: style.whiteSpace,
          zIndex: style.zIndex,
          centerDelta: Math.abs(
            homeBox.left + homeBox.width / 2 - (wrapBox.left + wrapBox.width / 2),
          ),
        };
      });
      expect(metrics).toMatchObject({
        backgroundColor: "rgb(58, 126, 229)",
        borderColor: "rgb(32, 110, 229)",
        borderRadius: "3px",
        borderStyle: "solid",
        borderWidth: "1px",
        color: "rgb(255, 255, 255)",
        contained: true,
        cursor: "pointer",
        display: "inline-block",
        fontSize: "14px",
        height: 30,
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "4.2px",
        outlineStyle: "none",
        outlineWidth: "0px",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        withinViewport: true,
        zIndex: "2",
      });
      expect(metrics.width).toBeGreaterThan(50);
      expect(metrics.width).toBeLessThan(100);
      expect(metrics.centerDelta).toBeLessThan(6);
      expect(metrics.boxShadow).toContain("0px 1px 0px");
      expect(metrics.boxShadow).toContain("0.05");
      expect(metrics.transition).toContain("0.3s");

      mkdirSync(screenshotDirectory, { recursive: true });
      const screenshot = await page.screenshot({
        fullPage: true,
        path: resolve(
          screenshotDirectory,
          `${session.loginId}-${viewport.width}x${viewport.height}.png`,
        ),
      });
      expect(screenshot.byteLength).toBeGreaterThan(0);

      await home.hover();
      await expect
        .poll(() =>
          home.evaluate((node) => {
            const style = getComputedStyle(node);
            return {
              backgroundColor: style.backgroundColor,
              borderColor: style.borderTopColor,
              color: style.color,
              textDecoration: style.textDecorationLine,
            };
          }),
        )
        .toEqual({
          backgroundColor: "rgb(32, 110, 229)",
          borderColor: "rgb(32, 110, 229)",
          color: "rgb(255, 255, 255)",
          textDecoration: "none",
        });

      await page.mouse.down();
      await expect
        .poll(() =>
          home.evaluate((node) => {
            const style = getComputedStyle(node);
            return {
              backgroundColor: style.backgroundColor,
              borderColor: style.borderTopColor,
              color: style.color,
              textDecoration: style.textDecorationLine,
            };
          }),
        )
        .toEqual({
          backgroundColor: "rgb(58, 126, 229)",
          borderColor: "rgb(32, 110, 229)",
          color: "rgb(255, 255, 255)",
          textDecoration: "none",
        });
      // Release outside the link so the active-state probe cannot navigate away.
      await page.mouse.move(1, 1);
      await page.mouse.up();

      await page.mouse.move(1, 1);
      await home.focus();
      await expect
        .poll(() => home.evaluate((node) => getComputedStyle(node).backgroundColor))
        .toBe("rgb(32, 110, 229)");
    }
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(fallbackOff ? 0 : 1);
  await page.goto(`${basePath}/ghost`, { waitUntil: "networkidle" });
  await page.locator('[data-stylex-owner="user-profile-notfound-home"]').click();
  await expect
    .poll(() => page.url())
    .toBe(`${new URL(basePath + "/", page.url()).origin}${basePath}/`);
});
