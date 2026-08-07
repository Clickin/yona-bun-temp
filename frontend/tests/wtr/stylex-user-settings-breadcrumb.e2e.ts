import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright");
const owners = {
  heading: "user-settings-breadcrumb-heading",
  inner: "user-settings-breadcrumb-inner",
  outer: "user-settings-breadcrumb-outer",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the five-template source, exact three-owner contract, and retired bridge", () => {
  const route = readFileSync("src/routes/user/editform.tsx", "utf8");
  const theme = readFileSync("src/routes/user/-editform.stylex.ts", "utf8");
  const templates = [
    "edit.scala.html",
    "edit_password.scala.html",
    "edit_notifications.scala.html",
    "edit_emails.scala.html",
    "edit_token.scala.html",
  ].map((file) => readFileSync(`../yona-original/app/views/user/${file}`, "utf8"));
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");

  for (const template of templates) {
    expect(template).toContain('<div class="site-breadcrumb-outer">');
    expect(template).toContain('<div class="site-breadcrumb-inner">');
    expect(template).toContain("<h3>");
  }
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
  expect(yobi.indexOf("_common.less")).toBeLessThan(yobi.indexOf("_page.less"));
  expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
  expect(bootstrap).toContain("h3 {\n  font-size: 24.5px;");
  expect(common).toContain("text-rendering: auto !important;");
  expect(pageLess).toContain(".site-breadcrumb-inner {\n        margin:0 auto;");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(pageLess).toContain("line-height: 30px;");
  expect(responsive).toContain(".site-breadcrumb-outer {\n    min-width: 10px !important;");
  expect(responsive).toContain(
    ".site-breadcrumb-outer {\n    width: 100%;\n    padding: 0 10px;\n    box-sizing: border-box;",
  );

  for (const name of Object.values(owners)) expect(route).toContain(`data-stylex-owner="${name}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  for (const declaration of [
    'boxSizing: "border-box"',
    'padding: "0px 10px"',
    'width: "100%"',
    'margin: "0px auto"',
    'fontSize: "24.5px"',
    'fontWeight: "700"',
    'lineHeight: "30px"',
    'margin: "0px"',
    'padding: "10px 10px 5px"',
    'textRendering: "auto"',
  ])
    expect(route).toContain(declaration);
  expect(route).toContain('[globalBreakpoints.mobile]: "10px"');
  expect(route).not.toContain("globalColors.");
  const pageTheme = theme.match(
    /export const userSettingsPageColors = stylex\.defineVars\(\{[\s\S]*?\n\}\);/u,
  )?.[0];
  expect(pageTheme?.match(/#[0-9a-f]{3,8}/giu)).toEqual(["#ffffff"]);
  // The theme file also carries the profile/avatar StyleX style blocks (positively
  // pinned by the page-shell/profile-field-rows specs); scope the no-layout pin to
  // the defineVars color themes.
  for (const block of theme.match(
    /export const userSettings\w+Colors = stylex\.defineVars\(\{[\s\S]*?\n\}\);/gu,
  ) ?? []) {
    expect(block).not.toMatch(/(?:margin|padding|width|height|size)/u);
  }
  expect(appCss).toContain(".site-breadcrumb-outer {\n    border-bottom: 1px solid #ddd;");
  expect(appCss).toContain("font-weight: 400;");
});

test("keeps the three breadcrumb nodes mounted across all five settings routes", async ({
  page,
}) => {
  await openSettings(page);
  await page.evaluate((names) => {
    (window as Window & { __settingsBreadcrumb?: Element[] }).__settingsBreadcrumb = [
      document.querySelector(`[data-stylex-owner="${names.outer}"]`)!,
      document.querySelector(`[data-stylex-owner="${names.inner}"]`)!,
      document.querySelector(`[data-stylex-owner="${names.heading}"]`)!,
    ];
  }, owners);

  for (const path of [
    "/user/editform",
    "/user/editform/password",
    "/user/editform/notifications",
    "/user/editform/emails",
    "/user/editform/token",
  ]) {
    await page.locator(`[data-stylex-owner="user-settings-page-wrap"] a[href$="${path}"]`).click();
    await expect(page).toHaveURL(`${basePath}${path}`);
    expect(
      await page.evaluate((names) => {
        const previous = (window as Window & { __settingsBreadcrumb?: Element[] })
          .__settingsBreadcrumb;
        return Boolean(
          previous &&
          previous[0] === document.querySelector(`[data-stylex-owner="${names.outer}"]`) &&
          previous[1] === document.querySelector(`[data-stylex-owner="${names.inner}"]`) &&
          previous[2] === document.querySelector(`[data-stylex-owner="${names.heading}"]`),
        );
      }, owners),
    ).toBe(true);
    await expect(owner(page, owners.heading)).toHaveText(
      path.endsWith("/token") ? "사용자토큰" : "사용자 설정",
    );
  }
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const)
  test(`pins exact authenticated legacy ${viewport.name} styles, geometry, fallback, and screenshot`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openSettings(page);
    await page.evaluate(() => document.fonts.ready);
    const outer = owner(page, owners.outer);
    const inner = owner(page, owners.inner);
    const heading = owner(page, owners.heading);

    await expect(outer).toBeVisible();
    await expect(heading).toHaveText("사용자 설정");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);
    await expect(outer).toHaveCSS("box-sizing", "border-box");
    await expect(outer).toHaveCSS("width", `${viewport.width}px`);
    await expect(outer).toHaveCSS("height", "45px");
    await expect(outer).toHaveCSS("padding", "0px 10px");
    await expect(outer).toHaveCSS("min-width", viewport.name === "mobile" ? "10px" : "0px");
    await expect(outer).toHaveCSS("border-bottom-width", "0px");
    await expect(inner).toHaveCSS("margin", "0px");
    await expect(heading).toHaveCSS("margin", "0px");
    await expect(heading).toHaveCSS("padding", "10px 10px 5px");
    await expect(heading).toHaveCSS("font-size", "24.5px");
    await expect(heading).toHaveCSS("font-weight", "700");
    await expect(heading).toHaveCSS("line-height", "30px");
    await expect(heading).toHaveCSS("text-rendering", "auto");

    const evidence = await page.evaluate((names) => {
      const find = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const actualOuter = find(names.outer);
      const actualInner = find(names.inner);
      const actualHeading = find(names.heading);
      const host = document.createElement("div");
      host.style.cssText = `position:absolute;left:-10000px;width:${actualOuter.getBoundingClientRect().width}px`;
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>
        :host { display:block; color:${getComputedStyle(actualHeading).color}; font-family:${getComputedStyle(actualHeading).fontFamily}; }
        .site-breadcrumb-outer { box-sizing:border-box; width:100%; padding:0 10px; }
        .site-breadcrumb-inner { margin:0 auto; }
        h3 { color:inherit; font-family:inherit; font-size:24.5px; font-weight:700; line-height:30px; margin:0; padding:10px 10px 5px; text-rendering:auto; }
        @media (max-width:720px) { .site-breadcrumb-outer { min-width:10px; } }
      </style><div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>사용자 설정</h3></div></div>`;
      document.body.append(host);
      const fallbackOuter = shadow.querySelector<HTMLElement>(".site-breadcrumb-outer")!;
      const fallbackInner = shadow.querySelector<HTMLElement>(".site-breadcrumb-inner")!;
      const fallbackHeading = shadow.querySelector<HTMLElement>("h3")!;
      const values = (element: HTMLElement, properties: string[]) => {
        const computed = getComputedStyle(element);
        return properties.map((property) => computed.getPropertyValue(property));
      };
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const result = {
        actual: {
          heading: values(actualHeading, [
            "margin",
            "padding",
            "font-size",
            "font-weight",
            "line-height",
            "text-rendering",
          ]),
          inner: values(actualInner, ["margin"]),
          outer: values(actualOuter, [
            "box-sizing",
            "width",
            "padding",
            "min-width",
            "border-bottom-width",
          ]),
        },
        boxes: { heading: box(actualHeading), inner: box(actualInner), outer: box(actualOuter) },
        documentWidth: document.documentElement.scrollWidth,
        fallback: {
          heading: values(fallbackHeading, [
            "margin",
            "padding",
            "font-size",
            "font-weight",
            "line-height",
            "text-rendering",
          ]),
          inner: values(fallbackInner, ["margin"]),
          outer: values(fallbackOuter, [
            "box-sizing",
            "width",
            "padding",
            "min-width",
            "border-bottom-width",
          ]),
        },
      };
      host.remove();
      return result;
    }, owners);
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.boxes.outer).toEqual({
      bottom: 85,
      height: 45,
      left: 0,
      right: viewport.width,
      top: 40,
      width: viewport.width,
    });
    expect(evidence.boxes.inner).toEqual({
      bottom: 85,
      height: 45,
      left: 10,
      right: viewport.width - 10,
      top: 40,
      width: viewport.width - 20,
    });
    expect(evidence.boxes.heading).toEqual(evidence.boxes.inner);
    expect(evidence.documentWidth).toBe(viewport.width);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-user-settings-breadcrumb-${viewport.name}.png`),
    });
  });

async function openSettings(page: Page) {
  await mockSettings(page);
  await page.goto(`${basePath}/user/editform/notifications`);
  await expect(page.locator('[data-stylex-owner="user-settings-page-wrap"]')).toBeVisible();
}

async function mockSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Alice",
          loginId: "alice",
          primaryEmailAddress: "alice@example.com",
          token: "alice-token",
        },
      },
    }),
  );
}
