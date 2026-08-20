import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync("src/routes/organizations/$organizationName/members.tsx", "utf8");
const styleSource = readFileSync("src/app.css", "utf8");
const legacySource = readFileSync(
  "../yona-original/app/views/error/forbidden_organization.scala.html",
  "utf8",
);
const legacyPageStyles = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_page.less",
  "utf8",
);
const legacySprites = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_sprites.less",
  "utf8",
);

test.use({ locale: "en-US" });

test("organization members forbidden error-wrap owns legacy declarations and fallback-off geometry", async ({
  page,
}) => {
  expect(legacySource).toContain('<div class="error-wrap">');
  expect(legacySource).toContain('<i class="ico ico-err2"></i>');
  expect(legacySource).toContain("<p>@Messages(messageKey)</p>");
  expect(legacyPageStyles).toContain("padding:100px 0px;");
  expect(legacyPageStyles).toContain("text-align:center;");
  expect(legacyPageStyles).toContain("font-weight:bold; font-size:16px;");
  expect(legacyPageStyles).toContain("color:#898989; margin:30px 0;");
  expect(legacySprites).toContain(".ico-err2 {");
  expect(legacySprites).toContain("background-position: -80px -160px;");
  expect(routeSource).toContain('data-owner="organization-members-error-wrap"');
  expect(routeSource).toContain('data-owner="organization-members-error-icon"');
  expect(routeSource).toContain('data-owner="organization-members-error-message"');

  await mockForbidden(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/members`);

    const wrap = page.locator('[data-owner="organization-members-error-wrap"]');
    const icon = page.locator('[data-owner="organization-members-error-icon"]');
    const message = page.locator('[data-owner="organization-members-error-message"]');
    await expect(wrap).toBeVisible();
    await expect(icon).toHaveClass(/\bico\b.*\bico-err2\b/u);
    await expect(message).toHaveText("You are not authorized");

    const before = await readErrorState(wrap, icon, message);
    expect(before.styles).toEqual({
      // dist hashes the sprite asset (sprite-9zPvCkbK.png); dev serves src/assets/legacy/sprite.png.
      backgroundImage: expect.stringMatching(/sprite(?:-[A-Za-z0-9]+)?\.png/),
      backgroundPosition: "-80px -160px",
      backgroundRepeat: "no-repeat",
      color: "rgb(137, 137, 137)",
      display: "inline-block",
      fontSize: "16px",
      fontWeight: "700",
      iconHeight: 80,
      iconVerticalAlign: "middle",
      iconWidth: 50,
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
    });
    expect(before.geometry.iconLeft).toBeCloseTo(
      before.geometry.wrapLeft + (before.geometry.wrapWidth - before.geometry.iconWidth) / 2,
      0,
    );
    expect(before.geometry.wrapWidth).toBeGreaterThan(0);
    expect(before.geometry.wrapWidth).toBeLessThanOrEqual(viewport.width);

    const fallback = page.locator('link[href*="legacy-fallback.css"]');
    if (await fallback.count()) await fallback.evaluate((element) => element.remove());
    const after = await readErrorState(wrap, icon, message);
    expect(after.styles).toEqual(before.styles);
    expect(after.geometry.wrapWidth).toBeGreaterThan(0);
    expect(after.geometry.iconLeft).toBeCloseTo(
      after.geometry.wrapLeft + (after.geometry.wrapWidth - after.geometry.iconWidth) / 2,
      0,
    );
  }
});

async function readErrorState(
  wrap: ReturnType<Page["locator"]>,
  icon: ReturnType<Page["locator"]>,
  message: ReturnType<Page["locator"]>,
) {
  return pageEvaluate(wrap, icon, message);
}

async function pageEvaluate(
  wrap: ReturnType<Page["locator"]>,
  icon: ReturnType<Page["locator"]>,
  message: ReturnType<Page["locator"]>,
) {
  return wrap.evaluate(
    (element, targets) => {
      const iconElement = element.querySelector<HTMLElement>(`[data-owner="${targets.icon}"]`);
      const messageElement = element.querySelector<HTMLElement>(
        `[data-owner="${targets.message}"]`,
      );
      if (!iconElement || !messageElement) throw new Error("error-wrap owners missing");
      const wrapStyle = getComputedStyle(element);
      const iconStyle = getComputedStyle(iconElement);
      const messageStyle = getComputedStyle(messageElement);
      const wrapBox = element.getBoundingClientRect();
      const iconBox = iconElement.getBoundingClientRect();
      return {
        geometry: {
          iconLeft: iconBox.left,
          iconWidth: iconBox.width,
          wrapLeft: wrapBox.left,
          wrapWidth: wrapBox.width,
        },
        styles: {
          backgroundImage: iconStyle.backgroundImage,
          backgroundPosition: iconStyle.backgroundPosition,
          backgroundRepeat: iconStyle.backgroundRepeat,
          color: messageStyle.color,
          display: iconStyle.display,
          fontSize: messageStyle.fontSize,
          fontWeight: messageStyle.fontWeight,
          iconHeight: iconBox.height,
          iconVerticalAlign: iconStyle.verticalAlign,
          iconWidth: iconBox.width,
          messageMargin: messageStyle.margin,
          padding: wrapStyle.padding,
          textAlign: wrapStyle.textAlign,
        },
      };
    },
    {
      icon: await icon.getAttribute("data-owner"),
      message: await message.getAttribute("data-owner"),
    },
  );
}

async function mockForbidden(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "viewer",
        preferredLanguage: "en-US",
        userLabel: "Viewer",
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/admin", (route: Route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({}) }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: false,
      },
    }),
  );
}
