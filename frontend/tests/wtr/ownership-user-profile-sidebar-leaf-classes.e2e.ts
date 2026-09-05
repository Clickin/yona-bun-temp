import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "output/playwright/style-user-profile-sidebar-leaf-classes";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId = route
      .request()
      .url()
      .match(/\/users\/([^/]+)\/profile/u)?.[1];
    if (loginId === "missing") {
      return route.fulfill({
        contentType: "application/json",
        status: 404,
        json: { error: { code: "not_found", message: "User exists not", status: 404 } },
      });
    }
    const providers =
      loginId === "all"
        ? ["github", "google", "unsupported"]
        : loginId === "github"
          ? ["github"]
          : loginId === "google"
            ? ["google"]
            : [];
    return route.fulfill({
      contentType: "application/json",
      json: profileResponse(loginId ?? "empty", providers),
    });
  });
});

test("populated public-profile sidebar leaf DOM preserves exact Style parity", async ({ page }) => {
  test.setTimeout(60_000);
  await assertSourceEvidence();

  for (const viewport of [
    { name: "desktop-1366x900", width: 1366, height: 900 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/all`, { waitUntil: "networkidle" });

    const since = page.locator('[data-owner="user-profile-since"]');
    const provider = page.locator('[data-owner="user-profile-provider-logo"]');
    const github = page.locator('[data-owner="user-profile-provider-github"]');
    const google = page.locator('[data-owner="user-profile-provider-google"]');
    const svg = github.locator(":scope > svg");

    await expect(since).toHaveText("2026-06-30");
    await expect(provider).toHaveCount(1);
    await expect(provider.locator(":scope > *")).toHaveCount(2);
    await expect(provider.locator(":scope > *").nth(0)).toHaveAttribute(
      "data-owner",
      "user-profile-provider-github",
    );
    await expect(provider.locator(":scope > *").nth(1)).toHaveAttribute(
      "data-owner",
      "user-profile-provider-google",
    );
    await expect(page.locator('[data-owner="user-profile-user-since"]').nth(0)).toContainText(
      "Member since",
    );
    await expect(page.locator('[data-owner="user-profile-user-since"]').nth(1)).toContainText(
      "Connected Social Login",
    );

    // Wave-33: the app retains the legacy since/auth-provider-logo/github leaf
    // classes (667398a04 legacy-parity restore).
    for (const [node, retainedClass, tag] of [
      [since, "since", "SPAN"],
      [provider, "auth-provider-logo", "DIV"],
    ] as const) {
      await expect(node).toHaveClass(new RegExp(`(?:^|\\s)${retainedClass}(?:\\s|$)`, "u"));
      expect(await node.evaluate((element) => element.tagName)).toBe(tag);
      await expect(node).not.toHaveAttribute("style");
    }
    await expect(github).toHaveClass(/(?:^|\s)github(?:\s|$)/u);
    expect(await github.evaluate((element) => element.tagName)).toBe("SPAN");
    await expect(github).not.toHaveAttribute("style");
    expect(await since.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-user-since",
    );
    expect(await provider.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-user-since",
    );
    expect(await github.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-provider-logo",
    );
    expect(await svg.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-provider-github",
    );
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg).toHaveAttribute("height", "24");
    await expect(svg).toHaveAttribute("version", "1.1");
    await expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
    await expect(svg).toHaveAttribute("width", "19");
    await expect(svg.locator(":scope > path")).toHaveCount(1);

    expect(await readMetrics(page)).toEqual({
      since: {
        color: "rgb(243, 108, 34)",
        display: "block",
        fontSize: "14px",
        fontWeight: "700",
        marginLeft: "5px",
      },
      provider: { fontFamily: "Roboto, sans-serif" },
      github: {
        display: "inline-block",
        marginBottom: "3px",
        marginLeft: "-4px",
        marginTop: "3px",
        width: "30px",
      },
      svg: {
        height: "24px",
        verticalAlign: "middle",
        width: "19px",
      },
      geometry: {
        childrenContained: true,
        noSiblingOverlap: true,
        providerAfterSince: true,
        sidebarContained: true,
      },
      noHorizontalOverflow: true,
    });

    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
  }

  await assertProviderBranch(page, "github", ["user-profile-provider-github"]);
  await assertProviderBranch(page, "google", ["user-profile-provider-google"]);
  await assertProviderBranch(page, "empty", []);

  await page.goto(`${basePath}/guest`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-owner="user-profile-guest-badge"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="user-profile-since"]')).toHaveText("2026-06-30");
  await expect(page.locator('[data-owner="user-profile-provider-logo"]')).toBeEmpty();
  await expect(page.locator('[data-owner="user-profile-provider-github"]')).toHaveCount(0);

  await page.goto(`${basePath}/missing`, { waitUntil: "domcontentloaded" });
  for (const owner of [
    "user-profile-since",
    "user-profile-provider-logo",
    "user-profile-provider-github",
  ]) {
    await expect(page.locator(`[data-owner="${owner}"]`)).toHaveCount(0);
  }
});

async function assertSourceEvidence() {
  const lessNames = [
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
  ];
  const [
    route,
    styles,
    scala,
    helper,
    yobi,
    pageLess,
    variables,
    usermenu,
    bootstrap,
    bootstrapResponsive,
    appCss,
    ...lessChain
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/utils/TemplateHelper.scala", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_usermenu.less", import.meta.url),
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
    Promise.resolve(curatedAppCss()),
    ...lessNames.map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}`, import.meta.url),
        "utf8",
      ),
    ),
  ]);

  expect(scala).toContain('<span class="since">@user.getDateString</span>');
  expect(scala).toContain('<div class="auth-provider-logo">');
  expect(scala).toContain("@Html(GithubLogo)");
  expect(helper).toContain('"""<span class="github"><svg aria-hidden="true" height="24"');
  expect(helper).toContain('version="1.1" viewBox="0 0 16 16" width="19"><path');
  expect(pageLess).toMatch(
    /\.user-since\s*\{[\s\S]*?\.since\s*\{\s*display:block;\s*font-size:\s*14px;\s*font-weight:bold;\s*color:@primary;\s*margin-left:\s*5px;/u,
  );
  expect(variables).toMatch(/@primary\s*:\s*@orange;/u);
  expect(variables).toMatch(/@orange\s*:\s*#F36C22;/u);
  expect(pageLess).toMatch(
    /\.auth-provider-logo\s*\{\s*font-family:\s*'Roboto', sans-serif;\s*svg\s*\{\s*vertical-align:\s*middle;\s*\}\s*\.github\s*\{\s*width:\s*30px;\s*display:\s*inline-block;\s*margin-left:\s*-4px;\s*margin-top:\s*3px;\s*margin-bottom:\s*3px;/u,
  );
  for (const [index, name] of lessNames.entries()) {
    const importStatement = `@import "less/${name}";`;
    expect(yobi).toContain(importStatement);
    if (index > 0) {
      expect(yobi.indexOf(importStatement)).toBeGreaterThan(
        yobi.indexOf(`@import "less/${lessNames[index - 1]}";`),
      );
    }
  }
  expect(lessChain).toHaveLength(lessNames.length);
  expect(usermenu).toMatch(
    /\.user-project-list\s*\{[\s\S]*?\.github\s*\{\s*margin-top:\s*-2px;\s*\}/u,
  );
  for (const nonmatching of [bootstrap, bootstrapResponsive, appCss]) {
    expect(nonmatching).not.toMatch(/\.auth-provider-logo|(?:^|[,{])\s*\.since(?:[\s,{:]|$)/mu);
  }
  expect(route).toContain('data-owner="user-profile-since"');
  expect(route).toContain('data-owner="user-profile-provider-logo"');
  expect(route).toContain('dataOwnerPrefix="user-profile"');
  expect(route).toContain("<OAuthProviderLogo");
  // Wave-33: the since/auth-provider-logo class compositions are retained in
  // the route source; github is rendered by the shared provider component.
  expect(route).not.toContain("} github`}");
}

async function assertProviderBranch(page: Page, loginId: string, owners: string[]) {
  await page.goto(`${basePath}/${loginId}`, { waitUntil: "domcontentloaded" });
  const provider = page.locator('[data-owner="user-profile-provider-logo"]');
  await expect(provider).toHaveCount(1);
  await expect(provider.locator(":scope > *")).toHaveCount(owners.length);
  for (const [index, owner] of owners.entries()) {
    await expect(provider.locator(":scope > *").nth(index)).toHaveAttribute("data-owner", owner);
  }
}

async function readMetrics(page: Page) {
  return page.evaluate(() => {
    const required = <T extends Element>(selector: string) => {
      const node = document.querySelector<T>(selector);
      if (!node) throw new Error(`missing ${selector}`);
      return node;
    };
    const info = required<HTMLElement>('[data-owner="user-profile-info"]');
    const sinceWrapper = required<HTMLElement>(
      '[data-owner="user-profile-user-since"]:has([data-owner="user-profile-since"])',
    );
    const providerWrapper = required<HTMLElement>(
      '[data-owner="user-profile-user-since"]:has([data-owner="user-profile-provider-logo"])',
    );
    const since = required<HTMLElement>('[data-owner="user-profile-since"]');
    const provider = required<HTMLElement>('[data-owner="user-profile-provider-logo"]');
    const github = required<HTMLElement>('[data-owner="user-profile-provider-github"]');
    const google = required<HTMLElement>('[data-owner="user-profile-provider-google"]');
    const svg = required<SVGElement>('[data-owner="user-profile-provider-github"] > svg');
    const infoBox = info.getBoundingClientRect();
    const sinceWrapperBox = sinceWrapper.getBoundingClientRect();
    const providerWrapperBox = providerWrapper.getBoundingClientRect();
    const providerBox = provider.getBoundingClientRect();
    const githubBox = github.getBoundingClientRect();
    const googleBox = google.getBoundingClientRect();
    const svgBox = svg.getBoundingClientRect();
    const sinceStyle = getComputedStyle(since);
    const providerStyle = getComputedStyle(provider);
    const githubStyle = getComputedStyle(github);
    const svgStyle = getComputedStyle(svg);
    return {
      since: {
        color: sinceStyle.color,
        display: sinceStyle.display,
        fontSize: sinceStyle.fontSize,
        fontWeight: sinceStyle.fontWeight,
        marginLeft: sinceStyle.marginLeft,
      },
      provider: { fontFamily: providerStyle.fontFamily },
      github: {
        display: githubStyle.display,
        marginBottom: githubStyle.marginBottom,
        marginLeft: githubStyle.marginLeft,
        marginTop: githubStyle.marginTop,
        width: githubStyle.width,
      },
      svg: {
        height: svgStyle.height,
        verticalAlign: svgStyle.verticalAlign,
        width: svgStyle.width,
      },
      geometry: {
        childrenContained:
          githubBox.left >= infoBox.left &&
          githubBox.right <= infoBox.right + 1 &&
          googleBox.left >= infoBox.left &&
          googleBox.right <= infoBox.right + 1 &&
          svgBox.left >= githubBox.left &&
          svgBox.right <= githubBox.right + 1,
        noSiblingOverlap:
          sinceWrapperBox.bottom <= providerWrapperBox.top + 1 &&
          githubBox.right <= googleBox.left + 1,
        providerAfterSince: Boolean(
          sinceWrapper.compareDocumentPosition(providerWrapper) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        sidebarContained:
          sinceWrapperBox.left >= infoBox.left &&
          sinceWrapperBox.right <= infoBox.right + 1 &&
          providerWrapperBox.left >= infoBox.left &&
          providerWrapperBox.right <= infoBox.right + 1,
      },
      noHorizontalOverflow: document.documentElement.scrollWidth === innerWidth,
    };
  });
}

function profileResponse(loginId: string, connectedSocialProviders: string[]) {
  return {
    daysAgo: 14,
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-256.png",
      connectedSocialProviders,
      displayName: loginId === "guest" ? "Guest User" : "Profile User",
      englishName: "Profile",
      isBlocked: false,
      isGuest: loginId === "guest",
      isSiteAdmin: false,
      loginId,
      primaryEmailAddress: null,
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    selected: "issues",
    viewerCanEditProfile: false,
  };
}
