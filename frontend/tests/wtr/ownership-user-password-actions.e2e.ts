import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  resetAction: "user-password-reset-action",
  resetDescription: "user-password-reset-description",
  resetSection: "user-password-reset-section",
  separator: "user-password-separator",
  submitAction: "user-password-submit-action",
} as const;

test.use({ locale: "ko-KR" });

test("password action owners trace the exact legacy declarations", () => {
  const route = readFileSync("src/routes/user/editform/password.tsx", "utf8");
  const colors = readFileSync("src/app.css", "utf8");
  const scala = readFileSync("../yona-original/app/views/user/edit_password.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const ui = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");

  expect(scala).toContain('<button type="submit" class="ybtn ybtn-success">');
  expect(scala).toContain("<hr/>");
  expect(scala).toContain('<div class="mt10">');
  expect(scala).toContain(
    '<a href="@routes.PasswordResetApp.lostPassword" class="ybtn ybtn-fail">',
  );
  expect(common).toContain(".mt10 { margin-top:10px; }");
  expect(ui).toContain(".ybtn, .flat > li > .ybtn");
  expect(ui).toContain("&.ybtn-success {");
  expect(ui).not.toContain(".ybtn-fail");
  expect(bootstrap).toContain("border-top: 1px solid #eeeeee;");
  expect(bootstrap).toContain("border-bottom: 1px solid #ffffff;");

  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain('className="ybtn ybtn-success"');
  expect(route).not.toContain('className="ybtn ybtn-fail"');
  expect(route).not.toContain('className="mt10"');
  expect(route).toContain('to="/lostPassword"');
  expect(
    colors.match(/passwordSettingsColors = style\.defineVars\(\{[\s\S]*?\n\}\);/u)?.[0],
  ).not.toContain("primarySurface");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`password action owners preserve live ${viewport.name} geometry and paint`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPasswordSettings(page);
    const submit = owner(page, owners.submitAction);
    const resetSection = owner(page, owners.resetSection);
    const resetDescription = owner(page, owners.resetDescription);
    const resetAction = owner(page, owners.resetAction);

    await expect(submit).toHaveText("비밀번호 변경");
    await expect(resetSection.locator(":scope > dl > dt")).toHaveText(
      "만약 현재 비밀번호가 기억나지 않거나 소셜 로그인을 통해 자동 로그인 된 경우라면..",
    );
    await expect(resetDescription.locator(":scope > a")).toHaveAttribute(
      "data-owner",
      owners.resetAction,
    );
    await expect(resetAction).toHaveText("비밀번호 재 설정");
    await expect(resetAction).toHaveAttribute("href", `${basePath}/lostPassword`);
    await expect(submit).not.toHaveAttribute("class", /(?:^|\s)ybtn(?:\s|$)/u);
    await expect(resetAction).not.toHaveAttribute("class", /(?:^|\s)ybtn(?:\s|$)/u);

    const metrics = await page.evaluate((ownerNames) => {
      const get = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const style = (element: HTMLElement) => {
        const css = getComputedStyle(element);
        return {
          backgroundColor: css.backgroundColor,
          border: css.border,
          borderBottom: css.borderBottom,
          borderRadius: css.borderRadius,
          borderTop: css.borderTop,
          boxShadow: css.boxShadow,
          color: css.color,
          cursor: css.cursor,
          display: css.display,
          fontSize: css.fontSize,
          lineHeight: css.lineHeight,
          margin: css.margin,
          padding: css.padding,
          position: css.position,
          textAlign: css.textAlign,
          textDecoration: css.textDecoration,
          textShadow: css.textShadow,
          transitionDuration: css.transitionDuration,
          verticalAlign: css.verticalAlign,
          whiteSpace: css.whiteSpace,
          zIndex: css.zIndex,
        };
      };
      return Object.fromEntries(
        Object.entries(ownerNames).map(([key, name]) => {
          const element = get(name);
          return [key, { box: box(element), style: style(element) }];
        }),
      );
    }, owners);

    const pageX = viewport.name === "desktop" ? 10 : 0;
    const pageWidth = viewport.name === "desktop" ? 1346 : 390;
    expect(metrics.submitAction.box).toEqual({
      height: 30,
      width: 102.453125,
      x: pageX,
      y: viewport.name === "desktop" ? 416 : 439,
    });
    expect(metrics.separator.box).toEqual({
      height: 2,
      width: pageWidth,
      x: pageX,
      y: viewport.name === "desktop" ? 466 : 489,
    });
    expect(metrics.resetSection.box).toEqual({
      height: viewport.name === "desktop" ? 60 : 80,
      width: pageWidth,
      x: pageX,
      y: viewport.name === "desktop" ? 488 : 511,
    });
    expect(metrics.resetDescription.box).toEqual({
      height: 30,
      width: pageWidth,
      x: pageX,
      y: viewport.name === "desktop" ? 518 : 561,
    });
    expect(metrics.resetAction.box).toEqual({
      height: 30,
      width: 118.359375,
      x: pageX,
      y: viewport.name === "desktop" ? 518 : 561,
    });
    expect(metrics.submitAction.style).toMatchObject({
      backgroundColor: "rgb(255, 115, 50)",
      border: "1px solid rgb(233, 94, 1)",
      borderRadius: "3px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(255, 255, 255)",
      cursor: "pointer",
      display: "inline-block",
      fontSize: "14px",
      lineHeight: "20px",
      margin: "0px",
      padding: "4px 12px",
      position: "relative",
      textAlign: "center",
      textDecoration: "none",
      textShadow: "none",
      transitionDuration: "0.3s",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      zIndex: "2",
    });
    expect(metrics.separator.style).toMatchObject({
      borderBottom: "1px solid rgb(255, 255, 255)",
      borderTop: "1px solid rgb(238, 238, 238)",
      display: "block",
      margin: "20px 0px",
      padding: "0px",
    });
    expect(metrics.resetSection.style.margin).toBe("10px 0px 0px");
    expect(metrics.resetDescription.style.margin).toBe("10px 0px 0px");
    expect(metrics.resetAction.style).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      border: "1px solid rgba(0, 0, 0, 0.15)",
      borderRadius: "3px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(51, 51, 51)",
      display: "inline-block",
      fontSize: "14px",
      lineHeight: "20px",
      margin: "0px",
      padding: "4px 12px",
      textDecoration: "none",
    });

    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `/private/tmp/style-user-password-actions-react-${viewport.name}.png`,
    });

    await submit.hover();
    await expect(submit).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await expect(submit).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await submit.focus();
    await expect(submit).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await submit.evaluate((element) => element.blur());

    await resetAction.hover();
    await expect(resetAction).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(resetAction).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
    await expect(resetAction).toHaveCSS("color", "rgb(41, 41, 41)");
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await resetAction.focus();
    await expect(resetAction).toHaveCSS("background-color", "rgb(241, 241, 241)");
  });

test("submit validation and reset TanStack navigation remain React-owned", async ({ page }) => {
  await openPasswordSettings(page);
  let passwordPostCount = 0;
  await page.route("**/api/v1/workspace/password", async (route) => {
    passwordPostCount += 1;
    await route.fulfill({ contentType: "application/json", json: { isAnonymous: true } });
  });

  await owner(page, owners.submitAction).click();
  await expect(page.locator('[data-owner="user-password-validation-content"]')).toHaveText([
    "필수 항목 입니다.",
    "필수 항목 입니다.",
    "필수 항목 입니다.",
  ]);
  expect(passwordPostCount).toBe(0);

  await page.evaluate(() => {
    (window as Window & { __passwordResetMarker?: string }).__passwordResetMarker = "spa";
  });
  await owner(page, owners.resetAction).click();
  await expect(page).toHaveURL(`${basePath}/lostPassword`);
  expect(
    await page.evaluate(
      () => (window as Window & { __passwordResetMarker?: string }).__passwordResetMarker,
    ),
  ).toBe("spa");
});

function owner(page: Page, name: string) {
  return page.locator(`[data-owner="${name}"]`);
}

async function openPasswordSettings(page: Page) {
  await mockPasswordSettings(page);
  await page.goto(`${basePath}/user/editform/password`);
  await expect(owner(page, owners.submitAction)).toBeVisible();
}

async function mockPasswordSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: { csrfToken: "csrf-token" },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}
