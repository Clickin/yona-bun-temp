import { readFile } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ apiBaseUrl, mountedBasePath }) => {
      Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["ko-KR"],
      });
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: {
            apiBaseUrl: string;
            basePath: string;
            showUserEmail: boolean;
            supportedLanguages: string[];
          };
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        apiBaseUrl,
        basePath: mountedBasePath,
        showUserEmail: true,
        supportedLanguages: ["ko-KR"],
      };
    },
    { apiBaseUrl: `${basePath}/api`, mountedBasePath: basePath },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "owner" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId =
      route
        .request()
        .url()
        .match(/\/users\/([^/]+)\/profile/u)?.[1] ?? "owner";
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: loginId === "owner",
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Owner User",
          englishName: "Owner",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId,
          primaryEmailAddress: "owner@example.com",
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    });
  });
});

test("profile owner edit control follows the final frozen ybtn mini cascade", async ({ page }) => {
  const [routeSource, styleSource, scala, yobiLess, yobiUiLess, messages] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
  ]);

  expect(scala).toContain('<div class="edit">');
  expect(scala).toContain(
    'class="ybtn ybtn-default ybtn-mini"><i class="yobicon-edit"></i> @Messages("userinfo.editProfile")',
  );
  expect(messages).toContain("userinfo.editProfile = 프로필 수정");
  expect(yobiLess.indexOf('@import "less/_yobiUI.less"')).toBeLessThan(
    yobiLess.indexOf('@import "less/_override.less"'),
  );
  expect(yobiUiLess).toContain(".ybtn, .flat > li > .ybtn");
  expect(yobiUiLess).toContain("&.ybtn-mini {");
  expect(yobiUiLess).toContain("padding: 0 6px !important;");
  expect(yobiUiLess).toContain("font-size: 10.5px !important;");
  expect(yobiUiLess).toContain("i { line-height:20px;}");
  expect(routeSource).toContain('data-stylex-owner="user-profile-edit-control"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-edit-control-icon"');
  expect(styleSource).toContain("profileEditButton:");
  expect(styleSource).toContain("profileEditIcon:");

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/owner`, { waitUntil: "domcontentloaded" });

    const whoami = page.locator('[data-stylex-owner="user-profile-whoami"]');
    const edit = page.locator('[data-stylex-owner="user-profile-identity-edit"]');
    const control = page.locator('[data-stylex-owner="user-profile-edit-control"]');
    const icon = page.locator('[data-stylex-owner="user-profile-edit-control-icon"]');

    await expect(edit).toHaveCount(1);
    await expect(control).toHaveText("프로필 수정");
    // Bucket-3 (wave 33): ybtn runtime classes are back on the edit Link
    // (legacy parity restored in 667398a04).
    await expect(control).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(control).toHaveClass(/(?:^|\s)ybtn-default(?:\s|$)/u);
    await expect(control).toHaveClass(/(?:^|\s)ybtn-mini(?:\s|$)/u);
    await expect(control).toHaveAttribute("href", `${basePath}/user/editform`);
    await expect(icon).toHaveClass(/yobicon-edit/u);
    await expect(edit.locator(":scope > a")).toHaveCount(1);
    await expect(
      whoami.locator(':scope > [data-stylex-owner="user-profile-identity-edit"]'),
    ).toHaveCount(1);
    const previousClassName = await whoami
      .locator(':scope > [data-stylex-owner="user-profile-identity-edit"]')
      .evaluate((node) => node.previousElementSibling?.getAttribute("data-stylex-owner"));
    expect(previousClassName).toBe("user-profile-identity-email");

    for (const attr of [
      "data-toggle",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
    ]) {
      await expect(control).not.toHaveAttribute(attr);
    }

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.move(0, viewport.height - 1);
    await expect
      .poll(() => control.evaluate((node) => getComputedStyle(node).backgroundColor))
      .toBe("rgb(255, 255, 255)");
    await assertBasePaintAndGeometry(page, viewport.width);
    await control.hover();
    await assertInteractivePaint(control, "rgb(241, 241, 241)");
    await control.focus();
    await page.mouse.move(0, viewport.height - 1);
    await assertInteractivePaint(control, "rgb(241, 241, 241)");
    const controlBox = await control.boundingBox();
    if (!controlBox) throw new Error("profile edit control has no box");
    await page.mouse.move(
      controlBox.x + controlBox.width / 2,
      controlBox.y + controlBox.height / 2,
    );
    await page.mouse.down();
    await assertInteractivePaint(control, "rgb(241, 241, 241)");
    await page.mouse.up();

    await page.goto(`${basePath}/other`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-stylex-owner="user-profile-edit-control"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="user-profile-identity-edit"]')).toHaveCount(0);
  }
});

async function assertBasePaintAndGeometry(page: Page, viewportWidth: number) {
  const result = await page.evaluate(() => {
    const whoami = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-whoami"]');
    const edit = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-identity-edit"]',
    );
    const control = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-edit-control"]',
    );
    const icon = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-edit-control-icon"]',
    );
    if (!whoami || !edit || !control || !icon) throw new Error("profile edit control is missing");
    const whoamiBox = whoami.getBoundingClientRect();
    const editBox = edit.getBoundingClientRect();
    const controlBox = control.getBoundingClientRect();
    const style = getComputedStyle(control);
    return {
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        color: style.color,
        cursor: style.cursor,
        display: style.display,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        marginBottom: style.marginBottom,
        marginLeft: style.marginLeft,
        padding: style.padding,
        position: style.position,
        textAlign: style.textAlign,
        textDecoration: style.textDecorationLine,
        textShadow: style.textShadow,
        verticalAlign: style.verticalAlign,
        whiteSpace: style.whiteSpace,
        zIndex: style.zIndex,
      },
      iconLineHeight: getComputedStyle(icon).lineHeight,
      contained:
        editBox.left >= whoamiBox.left &&
        editBox.right <= whoamiBox.right + 1 &&
        controlBox.left >= editBox.left &&
        controlBox.right <= editBox.right + 1,
      ordered: controlBox.top >= editBox.top && controlBox.bottom <= editBox.bottom + 1,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(result.style).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    color: "rgb(51, 51, 51)",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "10.5px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0px",
    padding: "0px 6px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    textShadow: "none",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  });
  expect(result.iconLineHeight).toBe("20px");
  expect(result.contained).toBe(true);
  expect(result.ordered).toBe(true);
  expect(result.overflow).toBeLessThanOrEqual(0);
  expect(viewportWidth).toBeGreaterThan(0);
}

async function assertInteractivePaint(control: Locator, backgroundColor: string) {
  await expect(control).toHaveCSS("background-color", backgroundColor);
  await expect(control).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
  await expect(control).toHaveCSS("color", "rgb(41, 41, 41)");
  await expect(control).toHaveCSS("text-decoration-line", "none");
}
