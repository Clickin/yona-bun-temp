import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "output/playwright/stylex-user-profile-status-badge-classes";
let statusState = { isBlocked: true, isSiteAdmin: true };

test.beforeEach(async ({ page }) => {
  statusState = { isBlocked: true, isSiteAdmin: true };
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
    return route.fulfill({
      contentType: "application/json",
      json: profileResponse(loginId ?? "admin"),
    });
  });
});

test("populated public-profile status badges retire their Bootstrap runtime classes", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await assertSourceEvidence();

  for (const viewport of [
    { name: "desktop-1366x900", width: 1366, height: 900 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const state of [
      { isBlocked: true, isSiteAdmin: true },
      { isBlocked: false, isSiteAdmin: true },
      { isBlocked: true, isSiteAdmin: false },
      { isBlocked: false, isSiteAdmin: false },
    ]) {
      statusState = state;
      await page.goto(
        `${basePath}/admin?badges=${Number(state.isSiteAdmin)}${Number(state.isBlocked)}`,
        { waitUntil: "domcontentloaded" },
      );
      await assertBranch(page, state);
    }

    statusState = { isBlocked: true, isSiteAdmin: true };
    await page.goto(`${basePath}/admin?screenshot=${viewport.name}`, {
      waitUntil: "domcontentloaded",
    });
    await assertBranch(page, statusState);
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
  }

  await page.goto(`${basePath}/missing`, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]'),
  ).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-user-status"]')).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="user-profile-site-admin-badge"]')).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="user-profile-blocked-badge"]')).toHaveCount(0);
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
    yobi,
    pageLess,
    overrideLess,
    responsiveLess,
    bootstrap,
    bootstrapResponsive,
    appCss,
    ...lessChain
  ] = await Promise.all([
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
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
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    ...lessNames.map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}`, import.meta.url),
        "utf8",
      ),
    ),
  ]);

  expect(scala).toContain(
    '<div class="user-status">@if(user.isSiteManager){<span class="badge label-success">SITE ADMIN</span>}</div>',
  );
  expect(scala).toContain(
    '<div class="user-status">@if(user.isLocked){<span class="badge label-important">BLOCKED</span>}</div>',
  );
  expect(bootstrap).toContain(
    ".label,\n.badge {\n  display: inline-block;\n  padding: 2px 4px;\n  font-size: 11.844px;\n  font-weight: bold;\n  line-height: 14px;\n  color: #ffffff;\n  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);\n  white-space: nowrap;\n  vertical-align: baseline;\n  background-color: #999999;\n}",
  );
  expect(bootstrap).toContain(
    ".badge {\n  padding-right: 9px;\n  padding-left: 9px;\n  -webkit-border-radius: 9px;\n     -moz-border-radius: 9px;\n          border-radius: 9px;\n}",
  );
  expect(bootstrap).toContain(".label-success,\n.badge-success {\n  background-color: #468847;\n}");
  expect(bootstrap).toContain(
    ".label-important,\n.badge-important {\n  background-color: #b94a48;\n}",
  );
  expect(pageLess).toContain(
    ".badge {\n    margin-right:25px;\n    font-weight:bold;\n    color:#FFF;\n    padding:5px 15px;\n    line-height:20px;\n    .border-radius(15px);",
  );
  expect(pageLess).toContain(
    ".user-status {\n        margin-top:20px;\n\n        p {\n            display:inline-block;",
  );
  expect(overrideLess).toContain(".label {\n  border-radius: 1px;");
  expect(overrideLess).not.toMatch(/\.badge\s*\{[^}]*border-radius:\s*1px/su);
  expect(responsiveLess).toContain(".badge-small {");
  expect(responsiveLess).not.toMatch(/\.user-info-box[\s\S]*?\.user-status[\s\S]*?\.badge\s*\{/u);
  expect(bootstrapResponsive).not.toMatch(
    /\.label-success|\.label-important|(?:^|[,{])\s*\.badge(?:[\s,{:]|$)/mu,
  );
  expect(appCss).toContain(".label,\n.badge {");
  expect(appCss).not.toContain('[data-stylex-owner="user-profile-site-admin-badge"]');
  expect(appCss).not.toContain('[data-stylex-owner="user-profile-blocked-badge"]');
  for (const [index, name] of lessNames.entries()) {
    const statement = `@import "less/${name}";`;
    expect(yobi).toContain(statement);
    if (index > 0) {
      expect(yobi.indexOf(statement)).toBeGreaterThan(
        yobi.indexOf(`@import "less/${lessNames[index - 1]}";`),
      );
    }
  }
  expect(lessChain).toHaveLength(lessNames.length);
  expect(yobi.indexOf('@import "less/_page.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_responsive.less";'),
  );
  expect(yobi.indexOf('@import "less/_responsive.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_override.less";'),
  );

  expect(route).toContain('data-stylex-owner="user-profile-site-admin-badge"');
  expect(route).toContain('data-stylex-owner="user-profile-blocked-badge"');
  expect(route).not.toContain("} badge label-success`}");
  expect(route).not.toContain("} badge label-important`}");
  expect(styles).toContain("statusBadge: {");
  expect(styles).toContain('borderRadius: "15px"');
  expect(styles).toContain('fontSize: "11.844px"');
  expect(styles).toContain('lineHeight: "20px"');
  expect(styles).toContain('marginRight: "25px"');
  expect(styles).toContain('padding: "5px 15px"');
  expect(styles).toContain('siteAdminBadge: { backgroundColor: "#468847" }');
  expect(styles).toContain('blockedBadge: { backgroundColor: "#b94a48" }');
}

async function assertBranch(page: Page, state: { isBlocked: boolean; isSiteAdmin: boolean }) {
  const wrappers = page.locator('[data-stylex-owner="user-profile-user-status"]');
  const admin = page.locator('[data-stylex-owner="user-profile-site-admin-badge"]');
  const blocked = page.locator('[data-stylex-owner="user-profile-blocked-badge"]');
  await expect(wrappers).toHaveCount(2);
  await expect(admin).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(blocked).toHaveCount(state.isBlocked ? 1 : 0);
  await expect(wrappers.nth(0).locator(":scope > span")).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(wrappers.nth(1).locator(":scope > span")).toHaveCount(state.isBlocked ? 1 : 0);

  if (state.isSiteAdmin) await assertBadge(admin, "SITE ADMIN", "rgb(70, 136, 71)");
  if (state.isBlocked) await assertBadge(blocked, "BLOCKED", "rgb(185, 74, 72)");

  const geometry = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
    const wrappers = [
      ...document.querySelectorAll<HTMLElement>('[data-stylex-owner="user-profile-user-status"]'),
    ];
    const badges = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-stylex-owner="user-profile-site-admin-badge"], [data-stylex-owner="user-profile-blocked-badge"]',
      ),
    ];
    if (!info || wrappers.length !== 2) throw new Error("status badge owners are missing");
    const infoBox = info.getBoundingClientRect();
    const wrapperBoxes = wrappers.map((node) => node.getBoundingClientRect());
    return {
      badgesContained: badges.every((badge) => {
        const box = badge.getBoundingClientRect();
        const parentBox = badge.parentElement!.getBoundingClientRect();
        return (
          box.left >= infoBox.left &&
          box.right <= infoBox.right + 1 &&
          box.top >= parentBox.top &&
          box.bottom <= parentBox.bottom + 1
        );
      }),
      noOverlap: wrapperBoxes.every(
        (box, index) => index === 0 || wrapperBoxes[index - 1]!.bottom <= box.top + 1,
      ),
      ordered:
        Boolean(
          wrappers[0]!.compareDocumentPosition(wrappers[1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        badges.every(
          (badge, index) =>
            index === badges.length - 1 ||
            Boolean(
              badge.compareDocumentPosition(badges[index + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        ),
      sidebarContained: wrapperBoxes.every(
        (box) => box.left >= infoBox.left && box.right <= infoBox.right + 1,
      ),
      noHorizontalOverflow: document.documentElement.scrollWidth === innerWidth,
    };
  });
  expect(geometry).toEqual({
    badgesContained: true,
    noOverlap: true,
    ordered: true,
    sidebarContained: true,
    noHorizontalOverflow: true,
  });
}

async function assertBadge(badge: Locator, copy: string, backgroundColor: string) {
  await expect(badge).toHaveText(copy);
  expect(await badge.evaluate((node) => node.tagName)).toBe("SPAN");
  await expect(badge).not.toHaveClass(/(?:^|\s)badge(?:\s|$)/u);
  await expect(badge).not.toHaveClass(/(?:^|\s)label-(?:success|important)(?:\s|$)/u);
  for (const attribute of [
    "style",
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-request-url",
    "data-target",
  ]) {
    await expect(badge).not.toHaveAttribute(attribute);
  }
  expect(
    await badge.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        marginRight: style.marginRight,
        padding: style.padding,
        textShadow: style.textShadow,
        verticalAlign: style.verticalAlign,
        whiteSpace: style.whiteSpace,
      };
    }),
  ).toEqual({
    backgroundColor,
    borderRadius: "15px",
    color: "rgb(255, 255, 255)",
    display: "inline-block",
    fontSize: "11.844px",
    fontWeight: "700",
    lineHeight: "20px",
    marginRight: "25px",
    padding: "5px 15px",
    textShadow: "rgba(0, 0, 0, 0.25) 0px -1px 0px",
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  });
}

function profileResponse(loginId: string) {
  return {
    daysAgo: 14,
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-256.png",
      connectedSocialProviders: [],
      displayName: "Admin User",
      englishName: "Admin",
      isBlocked: statusState.isBlocked,
      isGuest: false,
      isSiteAdmin: statusState.isSiteAdmin,
      loginId,
      primaryEmailAddress: null,
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    selected: "issues",
    viewerCanEditProfile: false,
  };
}
