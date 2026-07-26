import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

let populated = true;

test.beforeEach(async ({ page }) => {
  populated = true;
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
      json: profileResponse(populated),
    }),
  );
});

test("public-profile tab count badges own the frozen generic num-badge cascade", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const [routeSource, styleSource, scala, yobiLess, yobiUi, temporary] = await Promise.all([
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
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_temporary.less", import.meta.url),
      "utf8",
    ),
  ]);

  expect(scala).toContain(
    '@showBadgeNumberIfExist(number:Int) = { @if(number>0){ <span class="num-badge">@number</span> } }',
  );
  expect(scala).toContain('@Messages("menu.issue") @showBadgeNumberIfExist(issues.size)');
  expect(scala).toContain(
    '@Messages("menu.pullRequest") @showBadgeNumberIfExist(pullRequests.size)',
  );
  expect(scala).toContain('@Messages("project.projects") @showBadgeNumberIfExist(projects.size)');
  expect(scala).toContain(
    '<span class="num-badge">@issues.count(issue => issue.state == State.OPEN)</span>',
  );
  expect(scala).toContain(
    '<span class="num-badge">@issues.count(issue => issue.state == State.CLOSED)</span>',
  );
  const orderedImports = [
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
  ];
  let previousImport = -1;
  for (const importPath of orderedImports) {
    const index = yobiLess.indexOf(`@import "${importPath}";`);
    expect(index).toBeGreaterThan(previousImport);
    previousImport = index;
  }
  expect(yobiUi).toContain(
    ".num-badge {\n    font-weight: bold;\n    vertical-align: top;\n    font-family: @base-font-family;/*Tahoma;*/\n    text-shadow: none;\n    border-radius: 2px;\n    margin-left: 3px;\n    font-size: 13px;\n    padding: 2px 4px;",
  );
  expect(temporary).toContain(".lst-stacked {");
  expect(temporary).toContain(".num-badge { padding:0 2px; }");
  expect(yobiUi).toContain("&.blue {");
  expect(yobiUi).toContain(".num-badge { background-color:#fff; color:@blue2; }");
  expect(routeSource).toContain('data-stylex-owner="user-profile-top-tab-count-badge"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-nested-issue-count-badge"');
  expect(styleSource).toContain("tabCountBadge:");
  expect(styleSource).not.toContain("topTabCountBadge:");
  expect(styleSource).not.toContain("nestedIssueCountBadge:");
  expect(routeSource.match(/styles\.tabCountBadge/gmu)).toHaveLength(6);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    populated = true;
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    await assertPopulated(page, viewport.width);

    populated = false;
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    await assertZero(page, viewport.width);
  }
});

async function assertPopulated(page: Page, viewportWidth: number) {
  const topTabs = page.locator('[data-stylex-owner="user-profile-tabs"]');
  const topButtons = topTabs.locator('[data-stylex-owner="user-profile-tab-button"]');
  const topBadges = topTabs.locator('[data-stylex-owner="user-profile-top-tab-count-badge"]');
  const issueTabs = page.locator('[data-stylex-owner="user-profile-issue-tabs"]');
  const issueButtons = issueTabs.locator(
    'button[data-stylex-owner^="user-profile-issue-tab-button-"]',
  );
  const nestedBadges = issueTabs.locator(
    '[data-stylex-owner="user-profile-nested-issue-count-badge"]',
  );

  await expect(topButtons).toHaveText(["이슈 2", "코드 주고받기 1", "프로젝트 1"]);
  await expect(topBadges).toHaveCount(3);
  await expect(topBadges).toHaveText(["2", "1", "1"]);
  await expect(issueButtons).toHaveText(["열림1", "닫힘1"]);
  await expect(nestedBadges).toHaveCount(2);
  await expect(nestedBadges).toHaveText(["1", "1"]);
  await expect(topTabs.locator("li").nth(3).locator("input")).toHaveCount(1);
  await expect(issueTabs.locator("#toggle-show-subtasks")).toHaveCount(1);

  await assertBadgeCollection(topBadges);
  await assertBadgeCollection(nestedBadges);
  await assertGeometry(page, viewportWidth);

  const topButtonBox = await topButtons.first().evaluate((node) => node.getBoundingClientRect());
  await topButtons.nth(1).click();
  await expect(topTabs.locator("li").nth(1)).toHaveClass(/active/u);
  const pullRequestsPane = page.locator("#pullRequests");
  await expect(pullRequestsPane).toHaveAttribute(
    "data-stylex-owner",
    "user-profile-pane-pull-requests",
  );
  await expect(pullRequestsPane).toHaveCSS("display", "block");
  await expect(pullRequestsPane).not.toHaveClass(/(?:^|\s)(?:active|tab-pane)(?:\s|$)/u);
  const topButtonBoxAfter = await topButtons
    .first()
    .evaluate((node) => node.getBoundingClientRect());
  expect(topButtonBoxAfter.width).toBeCloseTo(topButtonBox.width, 1);
  await topButtons.first().click();

  const issueButtonBox = await issueButtons
    .first()
    .evaluate((node) => node.getBoundingClientRect());
  await issueButtons.nth(1).click();
  await expect(issueTabs.locator("li").nth(1)).toHaveClass(/active/u);
  const closedIssuesPane = page.locator("#closedIssues");
  await expect(closedIssuesPane).toHaveAttribute(
    "data-stylex-owner",
    "user-profile-pane-closed-issues",
  );
  await expect(closedIssuesPane).toHaveCSS("display", "block");
  await expect(closedIssuesPane).not.toHaveClass(/(?:^|\s)(?:active|tab-pane)(?:\s|$)/u);
  const issueButtonBoxAfter = await issueButtons
    .first()
    .evaluate((node) => node.getBoundingClientRect());
  expect(issueButtonBoxAfter.width).toBeCloseTo(issueButtonBox.width, 1);
}

async function assertZero(page: Page, viewportWidth: number) {
  const topTabs = page.locator('[data-stylex-owner="user-profile-tabs"]');
  const topBadges = topTabs.locator('[data-stylex-owner="user-profile-top-tab-count-badge"]');
  const issueTabs = page.locator('[data-stylex-owner="user-profile-issue-tabs"]');
  const nestedBadges = issueTabs.locator(
    '[data-stylex-owner="user-profile-nested-issue-count-badge"]',
  );

  await expect(topTabs.locator('[data-stylex-owner="user-profile-tab-button"]')).toHaveText([
    "이슈 ",
    "코드 주고받기 ",
    "프로젝트 ",
  ]);
  await expect(topBadges).toHaveCount(0);
  await expect(nestedBadges).toHaveCount(2);
  await expect(nestedBadges).toHaveText(["0", "0"]);
  await assertBadgeCollection(nestedBadges);
  await assertGeometry(page, viewportWidth);
}

async function assertBadgeCollection(badges: Locator) {
  for (const badge of await badges.all()) {
    await expect(badge).toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);
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
    await expect
      .poll(() =>
        badge.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            borderRadius: style.borderRadius,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            marginLeft: style.marginLeft,
            padding: style.padding,
            textShadow: style.textShadow,
            verticalAlign: style.verticalAlign,
          };
        }),
      )
      .toEqual({
        borderRadius: "2px",
        fontFamily:
          '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        fontSize: "13px",
        fontWeight: "700",
        marginLeft: "3px",
        padding: "2px 4px",
        textShadow: "none",
        verticalAlign: "top",
      });
  }
}

async function assertGeometry(page: Page, viewportWidth: number) {
  const geometry = await page.evaluate(() => {
    const groups = [
      {
        badges: [
          ...document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="user-profile-top-tab-count-badge"]',
          ),
        ],
        container: document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-tabs"]'),
      },
      {
        badges: [
          ...document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="user-profile-nested-issue-count-badge"]',
          ),
        ],
        container: document.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-issue-tabs"]',
        ),
      },
    ];
    return {
      contained: groups.every(
        ({ badges, container }) =>
          container &&
          badges.every((badge) => {
            const badgeBox = badge.getBoundingClientRect();
            const containerBox = container.getBoundingClientRect();
            return (
              badgeBox.left >= containerBox.left &&
              badgeBox.right <= containerBox.right + 1 &&
              badgeBox.top >= containerBox.top &&
              badgeBox.bottom <= containerBox.bottom + 1
            );
          }),
      ),
      nonOverlapping: groups.every(({ badges }) =>
        badges.every((badge, index) => {
          if (index === 0) return true;
          const previous = badges[index - 1]!.getBoundingClientRect();
          const current = badge.getBoundingClientRect();
          return previous.right <= current.left || previous.bottom <= current.top;
        }),
      ),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry).toEqual({
    contained: true,
    nonOverlapping: true,
    scrollWidth: viewportWidth,
  });
}

function profileResponse(withCounts: boolean) {
  return {
    daysAgo: 14,
    selected: "issues",
    viewerCanEditProfile: false,
    profile: {
      avatarUrl: "",
      connectedSocialProviders: [],
      displayName: "Admin User",
      englishName: "Admin",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: false,
      loginId: "admin",
      primaryEmailAddress: null,
      sinceLabel: "2026-06-30",
    },
    issueItems: withCounts
      ? [
          {
            id: 1,
            issueNumber: 1,
            title: "Open issue",
            state: "open",
            ownerName: "admin",
            projectName: "sample",
          },
          {
            id: 2,
            issueNumber: 2,
            title: "Closed issue",
            state: "closed",
            ownerName: "admin",
            projectName: "sample",
          },
        ]
      : [],
    memberProjects: withCounts
      ? [
          {
            ownerName: "admin",
            projectName: "sample",
            projectTitle: "Sample",
            description: "",
            avatarUrl: "",
            isPrivate: false,
            isOwner: true,
            isMember: true,
            isStarred: false,
            viewerCanLeave: false,
            memberCount: 1,
            issueCount: 0,
            pullRequestCount: 0,
            codeReviewCount: 0,
            watchCount: 0,
          },
        ]
      : [],
    pullRequestItems: withCounts
      ? [
          {
            id: 3,
            number: 3,
            title: "Profile pull request",
            state: "open",
            authorLoginId: "admin",
            authorDisplayName: "Admin User",
            createdDate: "2026-06-30",
            updatedDate: "2026-06-30",
            projectOwnerName: "admin",
            projectName: "sample",
            receiverLoginId: "viewer",
            receiverDisplayName: "Viewer",
            comments: 0,
          },
        ]
      : [],
  };
}
