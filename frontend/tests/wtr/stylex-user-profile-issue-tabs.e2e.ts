import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
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
        issueItems: [
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
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns nested issue tabs", async ({ page }) => {
  const [
    source,
    styleSource,
    scala,
    common,
    yobiUi,
    responsive,
    variables,
    bootstrap,
    bootstrapResponsive,
    yobiLess,
    appCss,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
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
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
  ]);

  expect(scala).toContain('<div id="issues" class="tab-pane @isActiveTab("issues")">');
  expect(scala).toContain('<ul class="nav nav-tabs nm">');
  expect(scala).toContain('@Messages("issue.state.open")');
  expect(scala).toContain('@Messages("issue.state.closed")');
  expect(scala).toContain("@common.showSubtasksCheckbox()");
  expect(common).toContain(".nm { margin: 0 !important; }");
  expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUi).toContain("color: #3592b5;");
  expect(yobiUi).toContain("font-weight: bold;");
  expect(yobiUi).toContain("text-decoration: none;");
  expect(yobiUi).toContain("background-color: @yobi-white-dark;");
  expect(responsive).toContain(".nav-tabs li a");
  expect(responsive).toContain("padding-left: 5px !important;");
  expect(responsive).toContain("padding-right: 5px !important;");
  expect(variables).toContain("@yobi-white-dark :#F2F2F2;");
  expect(bootstrap).toContain(".nav-tabs > li");
  expect(bootstrap).toContain("float: left;");
  expect(bootstrap).toContain("margin-right: 2px;");
  expect(bootstrap).not.toMatch(/\.nm(?:[\s,{:.]|$)/u);
  expect(bootstrapResponsive).not.toMatch(/\.nm(?:[\s,{:.]|$)/u);
  expect(appCss).toContain(".nm {");
  expect(appCss).toContain(".user-stream-box .nav-tabs > li > button,");
  expect(appCss).toContain("#mySidenav .right-menu > .nav-tabs.nm > li > button,");
  expect(appCss).toContain(".issue-list-wrap .nav-tabs.nm > li > button,");
  expect(messages).toContain("issue.state.open = 열림");
  expect(messages).toContain("issue.state.closed = 닫힘");
  expect(messages).toContain("common.show.subtasks = 자식이슈 펼쳐보기");
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
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  expect(source).toContain('data-stylex-owner="user-profile-issue-tabs"');
  expect(source).not.toContain(
    "className={`${stylex.props(styles.issueTabs).className} nav nav-tabs nm`}",
  );
  expect(source).toContain('data-stylex-owner="user-profile-issue-tab-button-open"');
  expect(source).toContain('data-stylex-owner="user-profile-issue-tab-button-closed"');
  expect(styleSource).toContain('issueTabs: { margin: "0 !important" }');
  expect(styleSource).toContain('marginRight: "2px"');
  expect(styleSource).toContain('paddingLeft: "30px"');
  expect(styleSource).toContain('paddingRight: "30px"');
  expect(styleSource).toContain('color: "#3592b5"');
  expect(styleSource).toContain('fontWeight: "bold"');
  expect(styleSource).toContain('textDecoration: "none"');
  expect(styleSource).toContain('backgroundColor: "#F2F2F2"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const tabs = page.locator('[data-stylex-owner="user-profile-issue-tabs"]');
  const buttons = tabs.locator('button[data-stylex-owner^="user-profile-issue-tab-button-"]');
  await expect(tabs).toHaveCount(1);
  await expect(tabs).toHaveClass(/(?:^|\s)nav(?:\s|$)/u);
  await expect(tabs).toHaveClass(/(?:^|\s)nav-tabs(?:\s|$)/u);
  await expect(tabs).not.toHaveClass(/(?:^|\s)nm(?:\s|$)/u);
  await expect(buttons).toHaveCount(2);
  await expect(buttons).toHaveText(["Open1", "Closed1"]);
  await expect(tabs.locator("#toggle-show-subtasks")).toHaveCount(1);
  await expect(tabs.locator("li")).toHaveCount(3);
  for (const button of await buttons.all()) {
    await expect(button).not.toHaveAttribute("style");
    await expect(button).not.toHaveAttribute("data-toggle");
    await expect(button).not.toHaveAttribute("data-target");
    await expect(button).not.toHaveAttribute("data-action");
  }

  const desktop = await page.evaluate(() => {
    const tabs = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-tabs"]',
    );
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-stylex-owner^="user-profile-issue-tab-button-"]',
      ),
    ];
    if (!tabs || buttons.length !== 2) throw new Error("nested issue-tab owners are missing");
    const style = getComputedStyle(buttons[0]!);
    const tabsStyle = getComputedStyle(tabs);
    const box = tabs.getBoundingClientRect();
    return {
      marginTop: style.marginTop,
      marginRight: style.marginRight,
      marginBottom: style.marginBottom,
      marginLeft: style.marginLeft,
      tabsMargin: tabsStyle.margin,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      color: style.color,
      fontWeight: style.fontWeight,
      contained: buttons.every((button) => {
        const buttonBox = button.getBoundingClientRect();
        return buttonBox.left >= box.left && buttonBox.right <= box.right + 1;
      }),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    marginTop: "0px",
    marginRight: "2px",
    marginBottom: "0px",
    marginLeft: "0px",
    tabsMargin: "0px",
    paddingLeft: "30px",
    paddingRight: "30px",
    color: "rgb(53, 146, 181)",
    fontWeight: "700",
    contained: true,
    scrollWidth: 1366,
  });
  const screenshotDirectory = new URL(
    "../output/playwright/stylex-user-profile-issue-tabs/",
    import.meta.url,
  );
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: new URL("desktop-1366x900.png", screenshotDirectory).pathname,
  });

  await buttons.first().hover();
  await expect
    .poll(() =>
      page.locator('[data-stylex-owner="user-profile-issue-tab-button-open"]').evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.backgroundColor, style.textDecorationLine];
      }),
    )
    .toEqual(["rgb(242, 242, 242)", "none"]);

  await buttons.nth(1).click();
  await expect(tabs.locator("li").nth(1)).toHaveClass(/active/);
  const closedIssuesPane = page.locator("#closedIssues");
  await expect(closedIssuesPane).toHaveAttribute(
    "data-stylex-owner",
    "user-profile-pane-closed-issues",
  );
  await expect(closedIssuesPane).toHaveCSS("display", "block");
  // Bucket-3 (wave 33): the app's legacy-parity restore (667398a04) retains
  // the tab-pane/active runtime classes on the pane — assert retention.
  await expect(closedIssuesPane).toHaveClass(/(?:^|\s)tab-pane(?:\s|$)/u);
  await expect(closedIssuesPane).toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  await expect(tabs.locator("li").nth(0)).not.toHaveClass(/active/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
  await expect(tabs).toHaveCount(1);
  await expect(buttons).toHaveCount(2);
  const mobile = await page.evaluate(() => {
    const tabs = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-tabs"]',
    );
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-stylex-owner^="user-profile-issue-tab-button-"]',
      ),
    ];
    if (!tabs || buttons.length !== 2)
      throw new Error("nested issue-tab owners are missing on mobile");
    const style = getComputedStyle(buttons[0]!);
    const box = tabs.getBoundingClientRect();
    return {
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      contained: buttons.every((button) => {
        const buttonBox = button.getBoundingClientRect();
        return buttonBox.left >= box.left && buttonBox.right <= box.right + 1;
      }),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    paddingLeft: "5px",
    paddingRight: "5px",
    contained: true,
    scrollWidth: 390,
    viewportWidth: 390,
  });

  await page.screenshot({
    fullPage: true,
    path: new URL("mobile-390x844.png", screenshotDirectory).pathname,
  });
});
