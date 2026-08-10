import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

let statusState = { isBlocked: true, isSiteAdmin: true };

test.beforeEach(async ({ page }) => {
  statusState = { isBlocked: true, isSiteAdmin: true };
  await page.addInitScript(
    ({ apiBaseUrl, mountedBasePath }) => {
      Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
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
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: ["github"],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: statusState.isBlocked,
          isGuest: false,
          isSiteAdmin: statusState.isSiteAdmin,
          loginId: "admin",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("public profile status badges follow the final frozen Bootstrap and page cascade", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const [routeSource, styleSource, scala, bootstrap, yobiLess, pageLess, overrideLess] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
        readFileSync(
          new URL(
            "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
            import.meta.url,
          ),
          "utf8",
        ),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
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
    ]);

  expect(scala).toContain(
    '<div class="user-status">@if(user.isSiteManager){<span class="badge label-success">SITE ADMIN</span>}</div>',
  );
  expect(scala).toContain(
    '<div class="user-status">@if(user.isLocked){<span class="badge label-important">BLOCKED</span>}</div>',
  );
  expect(bootstrap).toContain(".label,\n.badge {");
  expect(bootstrap).toContain(".label-important,\n.badge-important {");
  expect(bootstrap).toContain(".label-success,\n.badge-success {");
  expect(yobiLess.indexOf('@import "less/_page.less"')).toBeLessThan(
    yobiLess.indexOf('@import "less/_override.less"'),
  );
  expect(pageLess).toContain(
    ".badge {\n    margin-right:25px;\n    font-weight:bold;\n    color:#FFF;\n    padding:5px 15px;\n    line-height:20px;",
  );
  expect(overrideLess).toContain(".label {\n  border-radius: 1px;");
  expect(overrideLess).not.toMatch(/\.badge\s*\{[^}]*border-radius:\s*1px/su);
  expect(routeSource).toContain('data-owner="user-profile-site-admin-badge"');
  expect(routeSource).toContain('data-owner="user-profile-blocked-badge"');

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const state of [
      { isBlocked: true, isSiteAdmin: true },
      { isBlocked: false, isSiteAdmin: true },
      { isBlocked: true, isSiteAdmin: false },
      { isBlocked: false, isSiteAdmin: false },
    ]) {
      statusState = state;
      await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });
      await assertBranch(page, state);
    }
  }
});

async function assertBranch(page: Page, state: { isBlocked: boolean; isSiteAdmin: boolean }) {
  const statuses = page.locator('[data-owner="user-profile-user-status"]');
  const adminBadge = page.locator('[data-owner="user-profile-site-admin-badge"]');
  const blockedBadge = page.locator('[data-owner="user-profile-blocked-badge"]');
  const since = page.locator('[data-owner="user-profile-since"]');
  const provider = page.locator('[data-owner="user-profile-provider-github"]');

  await expect(statuses).toHaveCount(2);
  await expect(adminBadge).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(blockedBadge).toHaveCount(state.isBlocked ? 1 : 0);
  // wtr-compat scopedChild resolution ignores the parent index (bucket-1
  // gap): nth(N).locator(":scope > span") returns children of ALL matches.
  // evaluate on the indexed element is the equivalent supported API.
  await expect(
    await statuses.nth(0).evaluate((node) => node.querySelectorAll(":scope > span").length),
  ).toBe(state.isSiteAdmin ? 1 : 0);
  await expect(
    await statuses.nth(1).evaluate((node) => node.querySelectorAll(":scope > span").length),
  ).toBe(state.isBlocked ? 1 : 0);
  await expect(since).toHaveText("2026-06-30");
  await expect(provider).toBeVisible();

  if (state.isSiteAdmin) {
    await expect(adminBadge).toHaveText("SITE ADMIN");
    // 667398a04 legacy-parity restore: the app retains the Bootstrap classes.
    await expect(adminBadge).toHaveClass(/(?:^|\s)badge(?:\s|$)/u);
    await expect(adminBadge).toHaveClass(/(?:^|\s)label-success(?:\s|$)/u);
    await assertBadgeStyle(adminBadge, "rgb(70, 136, 71)");
  }
  if (state.isBlocked) {
    await expect(blockedBadge).toHaveText("BLOCKED");
    // 667398a04 legacy-parity restore: the app retains the Bootstrap classes.
    await expect(blockedBadge).toHaveClass(/(?:^|\s)badge(?:\s|$)/u);
    await expect(blockedBadge).toHaveClass(/(?:^|\s)label-important(?:\s|$)/u);
    await assertBadgeStyle(blockedBadge, "rgb(185, 74, 72)");
  }

  for (const badge of [adminBadge, blockedBadge]) {
    if ((await badge.count()) === 0) continue;
    for (const attr of [
      "style",
      "data-toggle",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
    ]) {
      await expect(badge).not.toHaveAttribute(attr);
    }
  }

  const geometry = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
    const statuses = [
      ...document.querySelectorAll<HTMLElement>('[data-owner="user-profile-user-status"]'),
    ];
    const badges = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-owner="user-profile-site-admin-badge"], [data-owner="user-profile-blocked-badge"]',
      ),
    ];
    const since = document.querySelector<HTMLElement>('[data-owner="user-profile-since"]');
    const provider = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-provider-github"]',
    );
    if (!info || statuses.length !== 2 || !since || !provider)
      throw new Error("profile sidebar contract is missing");
    const infoBox = info.getBoundingClientRect();
    const boxes = badges.map((badge) => badge.getBoundingClientRect());
    return {
      badgesContained: boxes.every(
        (box) => box.left >= infoBox.left && box.right <= infoBox.right + 1,
      ),
      badgesInOwnParent: badges.every((badge) => {
        const box = badge.getBoundingClientRect();
        const parentBox = badge.parentElement!.getBoundingClientRect();
        return box.top >= parentBox.top && box.bottom <= parentBox.bottom + 1;
      }),
      nonOverlapping: boxes.every((box, index) =>
        boxes.every(
          (other, otherIndex) =>
            index === otherIndex ||
            box.bottom <= other.top ||
            other.bottom <= box.top ||
            box.right <= other.left ||
            other.right <= box.left,
        ),
      ),
      order: statuses[0]!.compareDocumentPosition(statuses[1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      parentMargins: statuses.map((status) => getComputedStyle(status).marginTop),
      sinceStyle: {
        color: getComputedStyle(since).color,
        display: getComputedStyle(since).display,
        marginLeft: getComputedStyle(since).marginLeft,
      },
      providerVisible: provider.getBoundingClientRect().width > 0,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(geometry.badgesContained).toBe(true);
  expect(geometry.badgesInOwnParent).toBe(true);
  expect(geometry.nonOverlapping).toBe(true);
  expect(geometry.order).toBe(4);
  expect(geometry.parentMargins).toEqual(["20px", "20px"]);
  expect(geometry.sinceStyle).toEqual({
    color: "rgb(243, 108, 34)",
    display: "block",
    marginLeft: "5px",
  });
  expect(geometry.providerVisible).toBe(true);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
}

async function assertBadgeStyle(badge: ReturnType<Page["locator"]>, backgroundColor: string) {
  await expect(badge).toHaveCSS("display", "inline-block");
  await expect(badge).toHaveCSS("padding", "5px 15px");
  await expect(badge).toHaveCSS("font-size", "11.844px");
  await expect(badge).toHaveCSS("font-weight", "700");
  await expect(badge).toHaveCSS("line-height", "20px");
  await expect(badge).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(badge).toHaveCSS("text-shadow", "rgba(0, 0, 0, 0.25) 0px -1px 0px");
  await expect(badge).toHaveCSS("white-space", "nowrap");
  await expect(badge).toHaveCSS("vertical-align", "baseline");
  await expect(badge).toHaveCSS("background-color", backgroundColor);
  await expect(badge).toHaveCSS("border-radius", "15px");
  await expect(badge).toHaveCSS("margin-right", "25px");
}
