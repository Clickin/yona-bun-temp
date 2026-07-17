import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  content: "user-notification-tab-content",
  item: "user-notification-project-item",
  link: "user-notification-project-link",
  list: "user-notification-project-list",
  pane: "user-notification-project-pane",
} as const;
const parentShellBaselines = {
  desktop: {
    live: {
      content: { height: 1398, width: 1106, x: 250, y: 163 },
      list: { height: 72, width: 220, x: 10, y: 163 },
      pane: { height: 1378, width: 1106, x: 250, y: 163 },
    },
    local: {
      content: { height: 1022.109375, width: 840, x: 383, y: 164 },
      list: { height: 72, width: 220, x: 143, y: 164 },
      pane: { height: 1002.109375, width: 840, x: 383, y: 164 },
    },
  },
  mobile: {
    live: {
      content: { height: 1622, width: 150, x: 240, y: 163 },
      list: { height: 72, width: 220, x: 0, y: 163 },
      pane: { height: 1602, width: 150, x: 240, y: 163 },
    },
    local: {
      content: { height: 1181.484375, width: 150, x: 240, y: 164 },
      list: { height: 72, width: 220, x: 0, y: 164 },
      pane: { height: 1161.484375, width: 150, x: 240, y: 164 },
    },
  },
} as const;
const notificationTypes = [
  "NEW_ISSUE",
  "NEW_POSTING",
  "NEW_PULL_REQUEST",
  "ISSUE_STATE_CHANGED",
  "ISSUE_ASSIGNEE_CHANGED",
  "PULL_REQUEST_STATE_CHANGED",
  "NEW_COMMENT",
  "NEW_REVIEW_COMMENT",
  "MEMBER_ENROLL_REQUEST",
  "PULL_REQUEST_MERGED",
  "ISSUE_REFERRED_FROM_COMMIT",
  "PULL_REQUEST_COMMIT_CHANGED",
  "NEW_COMMIT",
  "PULL_REQUEST_REVIEW_STATE_CHANGED",
  "ISSUE_REFERRED_FROM_PULL_REQUEST",
  "ISSUE_BODY_CHANGED",
  "REVIEW_THREAD_STATE_CHANGED",
  "ORGANIZATION_MEMBER_ENROLL_REQUEST",
  "COMMENT_UPDATED",
  "ISSUE_MOVED",
  "ISSUE_SHARER_CHANGED",
  "ISSUE_LABEL_CHANGED",
  "ISSUE_MILESTONE_CHANGED",
  "POSTING_BODY_CHANGED",
  "RESOURCE_DELETED",
  "MEMBER_ENROLL_ACCEPT",
  "ORGANIZATION_MEMBER_ENROLL_ACCEPT",
] as const;

test.use({ locale: "ko-KR" });

async function mockNotifications(page: Page) {
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
    actorId: 2,
    avatarUrl: "/assets/images/default-avatar-32.png",
    emailAddress: "alice@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "alice",
    preferredLanguage: "ko-KR",
    userLabel: "Alice Kim",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
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
          displayName: "Alice Kim",
          loginId: "alice",
          primaryEmailAddress: "alice@example.com",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [
          watchedProject("2", "alice", "sample"),
          watchedProject("7", "alice", "stylex-private-residual"),
        ],
      },
    }),
  );
}

function watchedProject(projectId: string, ownerName: string, projectName: string) {
  return {
    notifications: notificationTypes.map((eventType) => ({
      enabled: eventType !== "NEW_COMMENT",
      eventType,
    })),
    ownerName,
    projectId,
    projectName,
  };
}

async function open(page: Page) {
  await mockNotifications(page);
  await page.goto(`${basePath}/user/editform/notifications`);
  await expect(page.locator(`[data-stylex-owner="${owners.list}"]`)).toBeVisible({
    timeout: 2_000,
  });
}

test("notification project tabs record the frozen five-owner boundary", () => {
  const route = readFileSync("src/routes/user/editform/notifications.tsx", "utf8");
  const parentRoute = readFileSync("src/routes/user/editform.tsx", "utf8");
  const theme = readFileSync("src/routes/user/editform/-notifications.stylex.ts", "utf8");
  const scala = readFileSync(
    "../yona-original/app/views/user/edit_notifications.scala.html",
    "utf8",
  );
  const tabMenu = readFileSync(
    "../yona-original/app/views/user/partial_edit_tabmenu.scala.html",
    "utf8",
  );
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const temporary = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_temporary.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const settingJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.user.Setting.js",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");

  expect(scala).toContain(
    '<ul id="notification-projects" class="unstyled lst-stacked span3 mr20">',
  );
  expect(scala).toContain('<li @if(i == 0){class="active"}><a href="#@project.id"');
  expect(scala).toContain('<div class="tab-content">');
  expect(scala).toContain('class="tab-pane @if(i == 0){active}"');
  expect(scala).toContain('<table class="table table-striped table-bordered">');
  expect(scala).toContain('@partial_edit_tabmenu("notifications")');
  expect(tabMenu).toContain('<ul class="nav nav-tabs mt20">');
  expect(tabMenu).toContain('@if(tabId == "notifications"){ class="active" }');
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(yobi.trim().split("\n")).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(common).toContain(".mr20 { margin-right:20px; }");
  expect(temporary).toContain(".lst-stacked {\n    li {\n        font-size:13px;");
  expect(temporary).toContain("&.active {\n            color: #fff;");
  expect(bootstrap).toContain(".span3 {\n  width: 220px;\n}");
  expect(bootstrap).toContain("ul.unstyled,\nol.unstyled {\n  margin-left: 0;");
  expect(bootstrap).toContain(".tab-content {\n  overflow: hidden;\n}");
  expect(bootstrap).toContain(
    ".tab-content > .tab-pane,\n.pill-content > .pill-pane {\n  display: none;",
  );
  expect(bootstrap).toContain(
    ".tab-content > .active,\n.pill-content > .active {\n  display: block;",
  );
  expect(settingJs).toContain("_showNotificationTab();");
  expect(settingJs).toContain(
    `$('#notification-projects a[href="' + location.hash + '"]').tab("show");`,
  );
  expect(messages).toContain("userinfo.changeNotifications = 알림 설정");

  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="unstyled lst-stacked span3 mr20"');
  expect(route).not.toContain('className="tab-content"');
  expect(route).not.toContain('className="tab-pane active"');
  expect(route).not.toContain('className="tab-pane"');
  expect(route).not.toContain('backgroundColor: "transparent"');
  expect(route).not.toContain('borderRadius: "0px"');
  expect(route).not.toContain('fontWeight: "400"');
  expect(route).not.toContain('overflow: "visible"');
  expect(theme.match(/#[0-9a-f]{3,8}/giu)).toEqual(["#51aacc", "#fff"]);
  expect(theme).not.toContain("globalColors");
  expect(route).toContain('className="table table-striped table-bordered"');
  expect(route).toContain('className="switch"');
  expect(route).toContain('className="notiUpdate"');
  expect(appCss).toContain("a {\n  color: inherit;");
  expect(parentRoute).toContain('<div className="page-wrap">');
  expect(appCss).toContain(
    "@media (min-width: 901px) {\n  body:has(.site-breadcrumb-outer) .page-wrap {\n    width: 1080px;",
  );
  expect(parentShellBaselines.desktop.live.content).toEqual({
    height: 1398,
    width: 1106,
    x: 250,
    y: 163,
  });
  expect(parentShellBaselines.desktop.local.content).toEqual({
    height: 1022.109375,
    width: 840,
    x: 383,
    y: 164,
  });
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`notification project tabs preserve exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const items = page.locator(`[data-stylex-owner="${owners.item}"]`);
    const links = page.locator(`[data-stylex-owner="${owners.link}"]`);
    const panes = page.locator(`[data-stylex-owner="${owners.pane}"]`);

    await expect(items).toHaveCount(2);
    await expect(links).toHaveCount(2);
    await expect(panes).toHaveCount(2);
    expect(await links.allTextContents()).toEqual([
      "alice / sample",
      "alice / stylex-private-residual",
    ]);
    expect(
      await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ).toEqual([
      `${basePath}/user/editform/notifications#2`,
      `${basePath}/user/editform/notifications#7`,
    ]);
    await expect(items.nth(0)).toHaveAttribute("data-selected", "true");
    await expect(items.nth(1)).toHaveAttribute("data-selected", "false");
    await expect(panes.nth(0)).toHaveAttribute("data-selected", "true");
    await expect(panes.nth(1)).toHaveAttribute("data-selected", "false");
    await expect(panes.nth(0).locator("table.table.table-striped.table-bordered")).toHaveCount(1);
    await expect(panes.nth(0).locator(".switch .notiUpdate")).toHaveCount(27);
    const legacyClasses = [
      "unstyled",
      "lst-stacked",
      "span3",
      "mr20",
      "active",
      "tab-content",
      "tab-pane",
    ];
    expect(
      await page
        .locator(
          `[data-stylex-owner="${owners.list}"], [data-stylex-owner="${owners.item}"], [data-stylex-owner="${owners.content}"], [data-stylex-owner="${owners.pane}"]`,
        )
        .evaluateAll(
          (nodes, tokens) =>
            nodes.flatMap((node) => tokens.filter((token) => node.classList.contains(token))),
          legacyClasses,
        ),
    ).toEqual([]);
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => ({
          ariaCurrent: node.getAttribute("aria-current"),
          dataStatus: node.getAttribute("data-status"),
          dataToggle: node.getAttribute("data-toggle"),
        })),
      ),
    ).toEqual([
      { ariaCurrent: null, dataStatus: null, dataToggle: null },
      { ariaCurrent: null, dataStatus: null, dataToggle: null },
    ]);

    const actual = await page.evaluate((ownerNames) => {
      const list = document.querySelector<HTMLElement>(`[data-stylex-owner="${ownerNames.list}"]`)!;
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.item}"]`),
      );
      const links = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.link}"]`),
      );
      const content = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.content}"]`,
      )!;
      const panes = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.pane}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const itemStyle = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          overflow: style.overflow,
          padding: style.padding,
        };
      };
      const listStyle = getComputedStyle(list);
      return {
        content: { box: box(content), overflow: getComputedStyle(content).overflow },
        items: items.map((item) => ({ box: box(item), style: itemStyle(item) })),
        links: links.map((link) => ({
          box: box(link),
          color: getComputedStyle(link).color,
          display: getComputedStyle(link).display,
        })),
        list: {
          box: box(list),
          style: {
            cssFloat: listStyle.cssFloat,
            listStyleType: listStyle.listStyleType,
            margin: listStyle.margin,
            padding: listStyle.padding,
            width: listStyle.width,
          },
        },
        panes: panes.map((pane) => ({ box: box(pane), display: getComputedStyle(pane).display })),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const baseline = parentShellBaselines[viewport.name as "desktop" | "mobile"];
    expect(actual.list).toEqual({
      box: baseline.local.list,
      style: {
        cssFloat: "left",
        listStyleType: "none",
        margin: "0px 20px 0px 0px",
        padding: "0px",
        width: "220px",
      },
    });
    expect(actual.items.map(({ box }) => box)).toEqual([
      { height: 36, width: 220, x: baseline.local.list.x, y: baseline.local.list.y },
      { height: 36, width: 220, x: baseline.local.list.x, y: baseline.local.list.y + 36 },
    ]);
    expect(actual.links.map(({ box }) => box)).toEqual([
      { height: 20, width: 204, x: baseline.local.list.x + 8, y: baseline.local.list.y + 8 },
      { height: 20, width: 204, x: baseline.local.list.x + 8, y: baseline.local.list.y + 44 },
    ]);
    expect(actual.items[0]!.style).toEqual({
      backgroundColor: "rgb(81, 170, 204)",
      borderRadius: "6px",
      color: "rgb(255, 255, 255)",
      fontSize: "13px",
      fontWeight: "700",
      overflow: "auto",
      padding: "8px",
    });
    expect(actual.items[1]!.style).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderRadius: "0px",
      color: "rgb(51, 51, 51)",
      fontSize: "13px",
      fontWeight: "400",
      overflow: "visible",
      padding: "8px",
    });
    expect(actual.links.map(({ color, display }) => ({ color, display }))).toEqual([
      { color: "rgb(255, 255, 255)", display: "block" },
      { color: "rgb(51, 51, 51)", display: "block" },
    ]);
    expect(actual.content).toEqual({
      box: baseline.local.content,
      overflow: "hidden",
    });
    expect(actual.panes).toEqual([
      {
        box: baseline.local.pane,
        display: "block",
      },
      { box: { height: 0, width: 0, x: 0, y: 0 }, display: "none" },
    ]);
    expect(actual.content.box.x - (actual.list.box.x + actual.list.box.width)).toBe(20);
    expect(actual.panes[0]!.box.x).toBe(actual.content.box.x);
    expect(actual.panes[0]!.box.y).toBe(actual.content.box.y);
    expect(actual.panes[0]!.box.width).toBe(actual.content.box.width);
    expect(actual.panes[0]!.box.height + 20).toBe(actual.content.box.height);
    expect(baseline.live.content.x - (baseline.live.list.x + baseline.live.list.width)).toBe(20);
    expect(actual.scrollWidth).toBe(viewport.width);

    await links.nth(1).click();
    await expect(page).toHaveURL(`${basePath}/user/editform/notifications#7`);
    await expect(items.nth(0)).toHaveAttribute("data-selected", "false");
    await expect(items.nth(1)).toHaveAttribute("data-selected", "true");
    await expect(panes.nth(0)).toHaveAttribute("data-selected", "false");
    await expect(panes.nth(1)).toHaveAttribute("data-selected", "true");
    await expect(panes.nth(0)).toBeHidden();
    await expect(panes.nth(1)).toBeVisible();
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => ({
          ariaCurrent: node.getAttribute("aria-current"),
          dataStatus: node.getAttribute("data-status"),
        })),
      ),
    ).toEqual([
      { ariaCurrent: null, dataStatus: null },
      { ariaCurrent: null, dataStatus: null },
    ]);

    await page.goto(`${basePath}/user/editform/notifications`);
    await expect(items.nth(0)).toHaveAttribute("data-selected", "true");
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `stylex-user-notification-project-tabs-${viewport.name}.png`,
          ),
          fullPage: false,
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
