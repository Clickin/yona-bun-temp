import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const memberAvatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  avatar: "projects-directory-member-avatar",
  count: "projects-directory-member-count",
  item: "projects-directory-member-item",
  list: "projects-directory-members-list",
  members: "projects-directory-members",
  stats: "projects-directory-stats",
} as const;

test.use({ locale: "ko-KR" });

async function open(page: Page) {
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
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: memberAvatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "5일 전",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 4,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator('[data-stylex-owner="projects-directory-list"]')).toBeVisible();
}

test("stats/member wave owns exactly six targets and preserves the intentional avatar fallback", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme = readFileSync("src/routes/-projects.stylex.ts", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const yobiUiLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(scala).toContain('<div class="stats-wrap pull-right">');
  expect(scala).toContain('<div class="members">\n                        <ul class="unstyled">');
  expect(scala).toContain(
    'class="avatar-wrap">\n                                    <img src="@member.avatarUrl"',
  );
  expect(scala).toContain(
    '@Html(Messages("project.onmember", User.findUsersByProject(project.id).size))\n                            <i class="yobicon-eye yobicon-middle"></i> @Html(Messages("project.onwatching", project.getWatchingCount))',
  );
  expect(siteLayout).toContain(
    '@layout(Messages(title))(""){\n    @common.navbar(menuType, null, null)\n\n    @content\n\n    @common.footer()\n}',
  );
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
  expect(variables).toContain("@blue2  : #51AACC;");
  expect(variables).toContain("@secondary       : @blue2;");
  expect(pageLess).toContain(
    ".stats-wrap {\n            margin-top: 0px;\n            text-align: right;",
  );
  expect(pageLess).toContain(
    ".stats-wrap {\n    i {\n        font-size: 16px;\n        margin-left: 5px;\n        margin-right: 5px;",
  );
  expect(pageLess).toContain(
    "ul {\n                    display:inline-block;\n                    padding-left: 50px;",
  );
  expect(pageLess).toContain(".avatar-wrap { margin-right:3px; margin-bottom:3px; }");
  expect(commonLess).toContain(
    "body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{\n    margin:0;\n    padding:0",
  );
  expect(commonLess).toContain(".avatar-wrap {\n    width:32px; height:32px;");
  expect(yobiUiLess).toContain("background:#ddd;\n    .border-radius(3px) !important;");
  expect(yobiUiLess).toContain("img {\n        width:100%;\n        vertical-align:top;");
  expect(bootstrap).toContain(
    "ul.unstyled,\nol.unstyled {\n  margin-left: 0;\n  list-style: none;",
  );
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(yobicon).toContain("font-family: 'yobicon';");
  expect(yobicon).toContain("display: inline-block;");
  expect(yobicon).toContain('.yobicon-friends:before {\n    content: "\\e27b";');
  expect(yobicon).toContain('.yobicon-eye:before {\n    content: "\\e52e";');
  expect(messages).toContain(
    'project.onmember = <i class="yobicon-friends yobicon-middle"></i><strong>{0}</strong>',
  );
  expect(messages).toContain("project.onwatching = <strong>{0}</strong>");

  for (const owner of Object.values(owners)) {
    expect(route.match(new RegExp(`data-stylex-owner=["']${owner}["']`, "gu"))?.length).toBe(
      owner === owners.count ? 2 : 1,
    );
  }
  expect(route).not.toContain("stats-wrap");
  expect(route.match(/data-stylex-owner="projects-directory-stats-icon"/gu)?.length).toBe(2);
  expect(route).toContain("className={`yobicon-friends ${");
  expect(route).toContain("className={`yobicon-eye ${");
  expect(route).not.toContain("yobicon-friends yobicon-middle");
  expect(route).not.toContain("yobicon-eye yobicon-middle");
  expect(route).not.toContain(
    'className={`members ${directoryMembersStyleProps.className ?? ""}`}',
  );
  expect(route).toContain(
    '<div {...directoryMembersStyleProps} data-stylex-owner="projects-directory-members">',
  );
  expect(route).not.toContain(
    'className={`avatar-wrap ${directoryMemberAvatarStyleProps.className ?? ""}`}',
  );
  expect(route).not.toContain('className="stats-wrap pull-right"');
  expect(route).not.toContain('className="unstyled"');
  expect(route).toContain("projectsDirectoryColors.memberAvatarSurface");
  expect(route).toContain("projectsDirectoryColors.memberCountText");
  expect(route).not.toContain("globalColors.");
  expect(theme).toContain('memberAvatarSurface: "#dddddd"');
  expect(theme).toContain('memberCountText: "#51aacc"');
  const avatarStyle = route.slice(
    route.indexOf("directoryMemberAvatar: {"),
    route.indexOf("directoryMemberCount: {"),
  );
  expect(avatarStyle).toContain('borderRadius: "3px"');
  const countStyle = route.slice(
    route.indexOf("directoryMemberCount: {"),
    route.indexOf("directoryEmptyState: {"),
  );
  expect(countStyle).toContain('fontWeight: "700"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`stats/member block preserves exact ${viewport.name} DOM and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const rows = page.locator('[data-stylex-owner="projects-directory-row"]');
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0).locator(`[data-stylex-owner="${owners.stats}"]`)).toHaveCount(0);
    await expect(rows.nth(0).locator(`[data-stylex-owner="${owners.avatar}"]`)).toHaveCount(0);

    const publicRows = rows.locator(`:scope:has(> [data-stylex-owner="${owners.stats}"])`);
    await expect(publicRows).toHaveCount(3);
    const secondRow = rows.nth(1);
    const stats = secondRow.locator(`[data-stylex-owner="${owners.stats}"]`);
    const members = stats.locator(`:scope > [data-stylex-owner="${owners.members}"]`);
    const list = members.locator(`:scope > [data-stylex-owner="${owners.list}"]`);
    const item = list.locator(`:scope > [data-stylex-owner="${owners.item}"]`);
    const avatar = item.locator(`:scope > [data-stylex-owner="${owners.avatar}"]`);
    const counts = members.locator(`p > [data-stylex-owner="${owners.count}"]`);
    await expect(stats).not.toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    expect((await members.getAttribute("class"))?.split(/\s+/u)).not.toContain("members");
    await expect(item).toHaveCount(1);
    await expect(avatar).toHaveAttribute("href", `${basePath}/alice`);
    await expect(avatar.locator(":scope > img")).toHaveAttribute("alt", "Alice Kim");
    await expect(avatar.locator(":scope > img")).toHaveAttribute("src", memberAvatarDataUrl);
    await expect(counts).toHaveCount(2);
    await expect(counts).toHaveText(["1", "1"]);
    await expect(members.locator("p > *")).toHaveCount(4);
    await expect(members.locator("p > *").nth(0)).toHaveClass(/yobicon-friends/u);
    await expect(members.locator("p > *").nth(1)).toHaveAttribute(
      "data-stylex-owner",
      owners.count,
    );
    await expect(members.locator("p > *").nth(2)).toHaveClass(/yobicon-eye/u);
    await expect(members.locator("p > *").nth(3)).toHaveAttribute(
      "data-stylex-owner",
      owners.count,
    );

    const actual = await page.evaluate((ownerNames) => {
      const byOwner = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const stats = byOwner(ownerNames.stats);
      const members = byOwner(ownerNames.members);
      const list = byOwner(ownerNames.list);
      const item = byOwner(ownerNames.item);
      const avatar = byOwner(ownerNames.avatar);
      const count = byOwner(ownerNames.count);
      const row = stats.closest<HTMLElement>('[data-stylex-owner="projects-directory-row"]')!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      };
      const statsStyle = getComputedStyle(stats);
      const membersStyle = getComputedStyle(members);
      const listStyle = getComputedStyle(list);
      const itemStyle = getComputedStyle(item);
      const avatarStyle = getComputedStyle(avatar);
      const countStyle = getComputedStyle(count);
      const iconStyles = Array.from(members.querySelectorAll<HTMLElement>("p > i")).map((icon) => {
        const style = getComputedStyle(icon);
        return {
          fontSize: style.fontSize,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
        };
      });
      return {
        avatar: box(avatar),
        avatarStyle: {
          backgroundColor: avatarStyle.backgroundColor,
          borderRadius: avatarStyle.borderRadius,
          display: avatarStyle.display,
          margin: avatarStyle.margin,
          overflow: avatarStyle.overflow,
          verticalAlign: avatarStyle.verticalAlign,
        },
        count: box(count),
        countColor: countStyle.color,
        iconStyles,
        item: box(item),
        itemStyle: { float: itemStyle.cssFloat, lineHeight: itemStyle.lineHeight },
        list: box(list),
        listStyle: {
          display: listStyle.display,
          listStyle: listStyle.listStyleType,
          margin: listStyle.margin,
          overflow: listStyle.overflow,
          paddingLeft: listStyle.paddingLeft,
        },
        members: box(members),
        membersWidth: membersStyle.width,
        row: box(row),
        scrollWidth: document.documentElement.scrollWidth,
        stats: box(stats),
        statsStyle: {
          float: statsStyle.cssFloat,
          marginTop: statsStyle.marginTop,
          textAlign: statsStyle.textAlign,
        },
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.stats).toEqual({
      bottom: desktop ? 367 : 462,
      height: 60,
      right: desktop ? 1356 : 390,
      width: 85,
      x: desktop ? 1271 : 305,
      y: desktop ? 307 : 402,
    });
    expect(actual.members).toEqual(actual.stats);
    expect(actual.list).toEqual({
      bottom: desktop ? 342 : 437,
      height: 35,
      right: desktop ? 1356 : 390,
      width: 85,
      x: desktop ? 1271 : 305,
      y: desktop ? 307 : 402,
    });
    expect(actual.item).toEqual({
      bottom: desktop ? 342 : 437,
      height: 35,
      right: desktop ? 1356 : 390,
      width: 35,
      x: desktop ? 1321 : 355,
      y: desktop ? 307 : 402,
    });
    expect(actual.avatar).toEqual({
      bottom: desktop ? 339 : 434,
      height: 32,
      right: desktop ? 1353 : 387,
      width: 32,
      x: desktop ? 1321 : 355,
      y: desktop ? 307 : 402,
    });
    expect(actual.count).toEqual({
      bottom: desktop ? 365 : 460,
      height: 16,
      right: desktop ? 1316.234375 : 350.234375,
      width: 6.578125,
      x: desktop ? 1309.65625 : 343.65625,
      y: desktop ? 349 : 444,
    });
    expect(actual.row).toEqual({
      bottom: desktop ? 383 : 473,
      height: desktop ? 91 : 151,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 292 : 322,
    });
    expect(actual.statsStyle).toEqual({ float: "right", marginTop: "0px", textAlign: "right" });
    expect(actual.membersWidth).toBe("85px");
    expect(actual.listStyle).toEqual({
      display: "inline-block",
      listStyle: "none",
      margin: "0px",
      overflow: "hidden",
      paddingLeft: "50px",
    });
    expect(actual.itemStyle).toEqual({ float: "right", lineHeight: "20px" });
    expect(actual.iconStyles).toEqual([
      { fontSize: "16px", marginLeft: "5px", marginRight: "5px" },
      { fontSize: "16px", marginLeft: "5px", marginRight: "5px" },
    ]);
    expect(actual.avatarStyle).toEqual({
      backgroundColor: "rgb(221, 221, 221)",
      borderRadius: "3px",
      display: "inline-block",
      margin: "0px 3px 3px 0px",
      overflow: "hidden",
      verticalAlign: "middle",
    });
    expect(actual.countColor).toBe("rgb(81, 170, 204)");
    expect(actual.avatar.right).toBeLessThanOrEqual(actual.list.right);
    expect(actual.avatar.bottom).toBeLessThanOrEqual(actual.list.bottom);
    expect(actual.list.bottom).toBeLessThanOrEqual(actual.count.y);
    expect(actual.stats.right).toBeLessThanOrEqual(actual.row.right);
    expect(actual.stats.bottom).toBeLessThanOrEqual(actual.row.bottom);
    expect(actual.scrollWidth).toBe(viewport.width);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `stylex-projects-stats-members-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
