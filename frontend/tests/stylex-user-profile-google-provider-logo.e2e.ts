import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
let providers = ["github", "google", "unsupported"];
let viewerIsGuest = false;

test.beforeEach(async ({ page }) => {
  providers = ["github", "google", "unsupported"];
  viewerIsGuest = false;
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: viewerIsGuest, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({ contentType: "application/json", json: profileResponse() }),
  );
});

test("public-profile Google provider logo owns its imported legacy asset and final cascade", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await assertSourceEvidence();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin`, { waitUntil: "networkidle" });

    const providerList = page.locator('[data-stylex-owner="user-profile-provider-logo"]');
    const github = page.locator('[data-stylex-owner="user-profile-provider-github"]');
    const google = page.locator('[data-stylex-owner="user-profile-provider-google"]');
    const image = page.locator('[data-stylex-owner="user-profile-provider-google-image"]');

    await expect(providerList.locator(":scope > *")).toHaveCount(2);
    await expect(providerList.locator(":scope > *").nth(0)).toHaveAttribute(
      "data-stylex-owner",
      "user-profile-provider-github",
    );
    await expect(providerList.locator(":scope > *").nth(1)).toHaveAttribute(
      "data-stylex-owner",
      "user-profile-provider-google",
    );
    await expect(github).toHaveClass(/(?:^|\s)github(?:\s|$)/u);
    await expect(google).not.toHaveClass(/(?:^|\s)google(?:\s|$)/u);
    await expect(google.locator(":scope > img")).toHaveCount(1);
    await expect(image).not.toHaveAttribute("alt");
    await expect(image).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
      "data-provider",
    ]) {
      await expect(google).not.toHaveAttribute(attribute);
      await expect(image).not.toHaveAttribute(attribute);
    }

    const src = await image.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).not.toContain("/assets/images/provider-logo/");
    expect(src).toContain("btn_google_light_normal_ios");
    await expect
      .poll(() =>
        image.evaluate((node) => ({
          complete: node.complete,
          naturalHeight: node.naturalHeight,
          naturalWidth: node.naturalWidth,
        })),
      )
      .toEqual({ complete: true, naturalHeight: 30, naturalWidth: 30 });
    const assetResponse = await page.request.get(new URL(src!, page.url()).href);
    expect(assetResponse.status()).toBe(200);
    expect(assetResponse.headers()["content-type"]).toContain("image/svg+xml");

    await expect
      .poll(() =>
        image.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            borderBottomStyle: style.borderBottomStyle,
            borderBottomWidth: style.borderBottomWidth,
            boxShadow: style.boxShadow,
            height: style.height,
            marginLeft: style.marginLeft,
            marginRight: style.marginRight,
            maxWidth: style.maxWidth,
            padding: style.padding,
            verticalAlign: style.verticalAlign,
            width: style.width,
          };
        }),
      )
      .toEqual({
        borderBottomStyle: "none",
        borderBottomWidth: "0px",
        boxShadow: "none",
        height: "30px",
        marginLeft: "0px",
        marginRight: "0px",
        maxWidth: "100%",
        padding: "0px",
        verticalAlign: "middle",
        width: "30px",
      });

    const geometry = await readGeometry(page);
    expect(geometry).toEqual({
      containedByParent: true,
      containedBySidebar: true,
      imageHeight: 30,
      imageNaturalHeight: 30,
      imageNaturalWidth: 30,
      imageWidth: 30,
      noHorizontalOverflow: true,
      siblingsDoNotOverlap: true,
    });
  }
});

test("empty providers and guest viewer preserve the bounded provider behavior", async ({
  page,
}) => {
  providers = [];
  await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-stylex-owner="user-profile-provider-logo"]')).toBeEmpty();
  await expect(page.locator('[data-stylex-owner="user-profile-provider-google"]')).toHaveCount(0);

  providers = ["google"];
  viewerIsGuest = true;
  await page.goto(`${basePath}/admin?guest=1`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-stylex-owner="user-profile-provider-google"]')).toHaveCount(1);
  await expect(
    page.locator('[data-stylex-owner="user-profile-provider-google-image"]'),
  ).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-stream"]')).toHaveCount(0);
});

async function assertSourceEvidence() {
  const [
    routeSource,
    styleSource,
    scala,
    helper,
    bootstrap,
    bootstrapResponsive,
    yobi,
    sourceAsset,
    ...lessChain
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/utils/TemplateHelper.scala", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../public/assets/images/provider-logo/btn_google_light_normal_ios.svg",
        import.meta.url,
      ),
      "utf8",
    ),
    ...[
      "_variables.less",
      "_mixins.less",
      "_common.less",
      "_sprites.less",
      "_page.less",
      "_tippy.less",
      "_scrollbar.less",
      "_responsive.less",
      "_yobiUI.less",
      "_temporary.less",
      "_markdown.less",
      "_migration.less",
      "_override.less",
    ].map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}`, import.meta.url),
        "utf8",
      ),
    ),
  ]);
  const copiedAsset = await readFile(
    new URL("../src/assets/legacy/provider-logo/btn_google_light_normal_ios.svg", import.meta.url),
    "utf8",
  );

  expect(scala).toContain('@if(provider.equalsIgnoreCase("google"))');
  expect(scala).toContain("@Html(GoogleLogo)");
  expect(helper).toContain('s"""<span class="google"><img src="$url"></span>"""');
  expect(helper).not.toContain(
    's"""<span class="google"><img src="$url" alt="login with Google"></span>"""',
  );
  expect(bootstrap).toContain(
    "img {\n  width: auto\\9;\n  height: auto;\n  max-width: 100%;\n  vertical-align: middle;\n  border: 0;\n  -ms-interpolation-mode: bicubic;\n}",
  );
  expect(bootstrapResponsive).not.toMatch(/(?:^|\})\s*img\s*\{/u);
  for (const importPath of [
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
    expect(yobi).toContain(`@import "${importPath}";`);
  }
  const pageLess = lessChain[4]!;
  const responsiveLess = lessChain[7]!;
  const yobiUiLess = lessChain[8]!;
  expect(pageLess).toContain(".auth-provider-logo {");
  expect(pageLess).not.toMatch(/\.auth-provider-logo[\s\S]*?\bimg\s*\{/u);
  expect(responsiveLess).toContain(
    ".markdown-wrap {\n    ul,\n    ol {\n      padding: 0 0 0 1.5em !important;",
  );
  expect(responsiveLess).toContain("img {\n      padding: 0 !important;");
  expect(responsiveLess).toContain("margin-left: auto !important;");
  expect(responsiveLess).toContain("margin-right: auto !important;");
  expect(yobiUiLess).toContain(".avatar-wrap {");
  expect(yobiUiLess).toContain("img {\n        width:100%;\n        vertical-align:top;");
  for (const less of lessChain.slice(9)) {
    expect(less).not.toMatch(/\.auth-provider-logo[\s\S]*?\bimg\s*\{/u);
  }
  expect(copiedAsset).toBe(sourceAsset);
  expect(routeSource).toContain(
    'import googleProviderLogoUrl from "../assets/legacy/provider-logo/btn_google_light_normal_ios.svg?no-inline";',
  );
  expect(routeSource).toContain("src={googleProviderLogoUrl}");
  expect(routeSource).not.toContain(
    '"/assets/images/provider-logo/btn_google_light_normal_ios.svg"',
  );
  expect(routeSource).toContain('data-stylex-owner="user-profile-provider-google"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-provider-google-image"');
  expect(routeSource).not.toContain('<span className="google">');
  expect(styleSource).toContain("providerGoogleImage:");
  expect(styleSource).toContain('borderStyle: "none"');
  expect(styleSource).toContain("borderWidth: 0");
  expect(styleSource).toContain('height: "auto"');
  expect(styleSource).toContain('maxWidth: "100%"');
  expect(styleSource).toContain('verticalAlign: "middle"');
}

async function readGeometry(page: Page) {
  return page.evaluate(() => {
    const parent = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-provider-logo"]',
    );
    const github = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-provider-github"]',
    );
    const google = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-provider-google"]',
    );
    const image = document.querySelector<HTMLImageElement>(
      '[data-stylex-owner="user-profile-provider-google-image"]',
    );
    const sidebar = document.querySelector<HTMLElement>(".user-info-box");
    if (!parent || !github || !google || !image || !sidebar)
      throw new Error("provider logo missing");
    const parentBox = parent.getBoundingClientRect();
    const githubBox = github.getBoundingClientRect();
    const googleBox = google.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    const sidebarBox = sidebar.getBoundingClientRect();
    return {
      containedByParent:
        imageBox.left >= parentBox.left &&
        imageBox.right <= parentBox.right &&
        imageBox.top >= parentBox.top &&
        imageBox.bottom <= parentBox.bottom,
      containedBySidebar:
        imageBox.left >= sidebarBox.left &&
        imageBox.right <= sidebarBox.right &&
        imageBox.top >= sidebarBox.top &&
        imageBox.bottom <= sidebarBox.bottom,
      imageHeight: imageBox.height,
      imageNaturalHeight: image.naturalHeight,
      imageNaturalWidth: image.naturalWidth,
      imageWidth: imageBox.width,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      siblingsDoNotOverlap:
        githubBox.right <= googleBox.left ||
        googleBox.right <= githubBox.left ||
        githubBox.bottom <= googleBox.top ||
        googleBox.bottom <= githubBox.top,
    };
  });
}

function profileResponse() {
  return {
    daysAgo: 14,
    selected: "issues",
    viewerCanEditProfile: false,
    profile: {
      avatarUrl: "",
      connectedSocialProviders: providers,
      displayName: "Admin User",
      englishName: "Admin",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: false,
      loginId: "admin",
      primaryEmailAddress: null,
      sinceLabel: "2026-06-30",
    },
    issueItems: [],
    memberProjects: [],
    pullRequestItems: [],
  };
}
