import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  description: "user-password-reset-description",
  list: "user-password-reset-list",
  term: "user-password-reset-term",
} as const;

test.use({ locale: "ko-KR" });

test("reset list reuses the existing exact StyleX skeleton", () => {
  const route = readFileSync("src/routes/user/editform/password.tsx", "utf8");
  const testSource = readFileSync("tests/stylex-user-password-reset-list.e2e.ts", "utf8");
  const scala = readFileSync("../yona-original/app/views/user/edit_password.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");

  expect(scala).toContain('<div class="mt10">\n        <dl>');
  expect(scala).toContain('<dt>@Messages("site.resetPasswordEmail.desc")</dt>');
  expect(scala).toContain('<dd class="mt10">');
  expect(bootstrap).toContain("dl {\n  margin-bottom: 20px;");
  expect(bootstrap).toContain("dt,\ndd {\n  line-height: 20px;");
  expect(bootstrap).toContain("dt {\n  font-weight: bold;");
  expect(bootstrap).toContain("dd {\n  margin-left: 10px;");
  expect(common).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
  expect(route).toContain('<dl {...listStyleProps} data-stylex-owner="user-password-reset-list">');
  expect(route).toContain('<dt {...termStyleProps} data-stylex-owner="user-password-reset-term">');
  expect(route).toContain("{...spacedDescriptionStyleProps}");
  expect(route).not.toContain("resetDescriptionStyleProps");
  expect(route).not.toContain("resetDescription:");
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(testSource).not.toMatch(/locator\(["'][.#][^"']*x[a-z0-9]/u);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`reset list preserves live ${viewport.name} cascade and wrapping`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const list = owner(page, owners.list);
    const term = owner(page, owners.term);
    const description = owner(page, owners.description);
    await expect(list.locator(":scope > dt")).toHaveAttribute("data-stylex-owner", owners.term);
    await expect(list.locator(":scope > dt + dd")).toHaveAttribute(
      "data-stylex-owner",
      owners.description,
    );
    await expect(term).toHaveText(
      "만약 현재 비밀번호가 기억나지 않거나 소셜 로그인을 통해 자동 로그인 된 경우라면..",
    );
    await expect(description.locator(":scope > a")).toHaveText("비밀번호 재 설정");

    const actual = await page.evaluate((ownerNames) => {
      const get = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const read = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return {
          box: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
          style: {
            display: css.display,
            fontWeight: css.fontWeight,
            lineHeight: css.lineHeight,
            margin: css.margin,
            padding: css.padding,
          },
        };
      };
      return {
        description: read(get(ownerNames.description)),
        list: read(get(ownerNames.list)),
        term: read(get(ownerNames.term)),
      };
    }, owners);
    const desktop = viewport.name === "desktop";
    const pageX = desktop ? 10 : 0;
    const pageWidth = desktop ? 1346 : 390;
    expect(actual.list).toEqual({
      box: { height: desktop ? 60 : 80, width: pageWidth, x: pageX, y: 488 },
      style: {
        display: "block",
        fontWeight: "400",
        lineHeight: "20px",
        margin: "0px",
        padding: "0px",
      },
    });
    expect(actual.term).toEqual({
      box: { height: desktop ? 20 : 40, width: pageWidth, x: pageX, y: 488 },
      style: {
        display: "block",
        fontWeight: "700",
        lineHeight: "20px",
        margin: "0px",
        padding: "0px",
      },
    });
    expect(actual.description).toEqual({
      box: { height: 30, width: pageWidth, x: pageX, y: desktop ? 518 : 538 },
      style: {
        display: "block",
        fontWeight: "400",
        lineHeight: "20px",
        margin: "10px 0px 0px",
        padding: "0px",
      },
    });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `/private/tmp/stylex-user-password-reset-list-react-${viewport.name}.png`,
    });
  });

test("reset link remains a TanStack SPA navigation", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    (window as Window & { __resetListMarker?: string }).__resetListMarker = "spa";
  });
  await owner(page, owners.description).locator(":scope > a").click();
  await expect(page).toHaveURL(`${basePath}/lostPassword`);
  expect(
    await page.evaluate(
      () => (window as Window & { __resetListMarker?: string }).__resetListMarker,
    ),
  ).toBe("spa");
});

function owner(page: Page, name: string) {
  return page.locator(`[data-stylex-owner="${name}"]`);
}

async function open(page: Page) {
  await mock(page);
  await page.goto(`${basePath}/user/editform/password`);
  await expect(owner(page, owners.list)).toBeVisible();
}

async function mock(page: Page) {
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
