import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const memberAvatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  avatar: "projects-directory-member-avatar",
  avatarImage: "projects-directory-member-avatar-image",
  icon: "projects-directory-stats-icon",
  members: "projects-directory-members",
  row: "projects-directory-row",
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

test("icon/avatar-image wave owns exactly two repeated targets and retires only stats-wrap", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
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
  expect(scala).toContain(
    'class="avatar-wrap">\n                                    <img src="@member.avatarUrl" alt="@member.name">',
  );
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
  expect(siteLayout).toContain("@common.footer()");
  expect(layout).toContain('href="@routes.Assets.at("stylesheets/yobicon/style.css")"');
  expect(layout).toContain('href="@routes.Assets.at("stylesheets/yobi.css")"');
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
  expect(pageLess).toContain(
    ".stats-wrap {\n    i {\n        font-size: 16px;\n        margin-left: 5px;\n        margin-right: 5px;",
  );
  expect(commonLess).toContain(
    ".yobicon-middle{\n    vertical-align: bottom;\n    margin-bottom: 3px;",
  );
  expect(yobiUiLess).toContain("background:#ddd;\n    .border-radius(3px) !important;");
  expect(yobiUiLess).toContain("img {\n        width:100%;\n        vertical-align:top;");
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(yobicon).toContain("font-family: 'yobicon';");
  expect(yobicon).toContain("display: inline-block;");
  expect(yobicon).toContain('.yobicon-friends:before {\n    content: "\\e27b";');
  expect(yobicon).toContain('.yobicon-eye:before {\n    content: "\\e52e";');
  expect(messages).toContain(
    'project.onmember = <i class="yobicon-friends yobicon-middle"></i><strong>{0}</strong>',
  );
  expect(messages).toContain("project.onwatching = <strong>{0}</strong>");

  expect(route.match(/data-stylex-owner="projects-directory-stats-icon"/gu)?.length).toBe(2);
  expect(route.match(/data-stylex-owner="projects-directory-member-avatar-image"/gu)?.length).toBe(
    1,
  );
  expect(route).not.toContain("stats-wrap");
  expect(route).not.toContain(
    'className={`avatar-wrap ${directoryMemberAvatarStyleProps.className ?? ""}`}',
  );
  expect(route).toContain("className={`yobicon-friends ${");
  expect(route).toContain("className={`yobicon-eye ${");
  expect(route).not.toContain("yobicon-friends yobicon-middle");
  expect(route).not.toContain("yobicon-eye yobicon-middle");
  expect(route).not.toContain("globalColors.");
  const iconStyle = route.slice(
    route.indexOf("directoryStatsIcon: {"),
    route.indexOf("directoryMemberAvatarImage: {"),
  );
  expect(iconStyle).toContain('fontSize: "16px"');
  expect(iconStyle).toContain('marginLeft: "5px"');
  expect(iconStyle).toContain('marginRight: "5px"');
  const imageStyle = route.slice(
    route.indexOf("directoryMemberAvatarImage: {"),
    route.indexOf("directoryMemberCount: {"),
  );
  expect(imageStyle).toContain('verticalAlign: "top"');
  expect(imageStyle).toContain('width: "100%"');
  expect(imageStyle).not.toContain("height:");
  expect(imageStyle).not.toContain("borderRadius");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`icons/avatar image preserve exact ${viewport.name} output and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);

    const rows = page.locator(`[data-stylex-owner="${owners.row}"]`);
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0).locator(`[data-stylex-owner="${owners.icon}"]`)).toHaveCount(0);
    await expect(rows.nth(0).locator(`[data-stylex-owner="${owners.avatarImage}"]`)).toHaveCount(0);
    const secondRow = rows.nth(1);
    const stats = secondRow.locator(`[data-stylex-owner="${owners.stats}"]`);
    const members = stats.locator(`:scope > [data-stylex-owner="${owners.members}"]`);
    const avatar = members.locator(`[data-stylex-owner="${owners.avatar}"]`);
    const avatarImage = avatar.locator(`:scope > [data-stylex-owner="${owners.avatarImage}"]`);
    const icons = members.locator(`p > [data-stylex-owner="${owners.icon}"]`);
    await expect(stats).not.toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    await expect(avatar).not.toHaveClass(/(?:^|\s)avatar-wrap(?:\s|$)/u);
    await expect(avatar).toHaveAttribute("href", `${basePath}/alice`);
    await expect(avatarImage).toHaveAttribute("alt", "Alice Kim");
    await expect(avatarImage).toHaveAttribute("src", memberAvatarDataUrl);
    await expect(icons).toHaveCount(2);
    await expect(icons.nth(0)).toHaveClass(/(?:^|\s)yobicon-friends(?:\s|$)/u);
    await expect(icons.nth(1)).toHaveClass(/(?:^|\s)yobicon-eye(?:\s|$)/u);
    await expect(icons.nth(0)).not.toHaveClass(/(?:^|\s)yobicon-middle(?:\s|$)/u);
    await expect(icons.nth(1)).not.toHaveClass(/(?:^|\s)yobicon-middle(?:\s|$)/u);
    await expect(members.locator("p > *")).toHaveCount(4);
    await expect(members.locator("p > *").nth(0)).toHaveAttribute("data-stylex-owner", owners.icon);
    await expect(members.locator("p > *").nth(2)).toHaveAttribute("data-stylex-owner", owners.icon);

    const actual = await page.evaluate((ownerNames) => {
      const row = document.querySelectorAll<HTMLElement>(
        `[data-stylex-owner="${ownerNames.row}"]`,
      )[1]!;
      const stats = row.querySelector<HTMLElement>(`[data-stylex-owner="${ownerNames.stats}"]`)!;
      const avatar = row.querySelector<HTMLElement>(`[data-stylex-owner="${ownerNames.avatar}"]`)!;
      const avatarImage = row.querySelector<HTMLImageElement>(
        `[data-stylex-owner="${ownerNames.avatarImage}"]`,
      )!;
      const icons = Array.from(
        row.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.icon}"]`),
      );
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
      const avatarStyle = getComputedStyle(avatar);
      const imageStyle = getComputedStyle(avatarImage);
      return {
        avatar: box(avatar),
        avatarBorderRadius: avatarStyle.borderRadius,
        avatarImage: box(avatarImage),
        avatarImageStyle: {
          height: imageStyle.height,
          verticalAlign: imageStyle.verticalAlign,
          width: imageStyle.width,
        },
        icons: icons.map((icon) => {
          const style = getComputedStyle(icon);
          return {
            box: box(icon),
            className: icon.className,
            display: style.display,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            glyph: getComputedStyle(icon, "::before").content,
            lineHeight: style.lineHeight,
            marginBottom: style.marginBottom,
            marginLeft: style.marginLeft,
            marginRight: style.marginRight,
            verticalAlign: style.verticalAlign,
          };
        }),
        imageContained:
          avatarImage.getBoundingClientRect().left >= avatar.getBoundingClientRect().left &&
          avatarImage.getBoundingClientRect().right <= avatar.getBoundingClientRect().right &&
          avatarImage.getBoundingClientRect().top >= avatar.getBoundingClientRect().top &&
          avatarImage.getBoundingClientRect().bottom <= avatar.getBoundingClientRect().bottom,
        row: box(row),
        scrollWidth: document.documentElement.scrollWidth,
        stats: box(stats),
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.avatar).toEqual({
      bottom: desktop ? 339 : 434,
      height: 32,
      right: desktop ? 1353 : 387,
      width: 32,
      x: desktop ? 1321 : 355,
      y: desktop ? 307 : 402,
    });
    expect(actual.avatarImage).toEqual(actual.avatar);
    expect(actual.avatarImageStyle).toEqual({
      height: "32px",
      verticalAlign: "top",
      width: "32px",
    });
    expect(actual.avatarBorderRadius).toBe("3px");
    expect(actual.imageContained).toBe(true);
    expect(actual.icons.map(({ box }) => box)).toEqual([
      {
        bottom: desktop ? 364 : 459,
        height: 16,
        right: desktop ? 1304.65625 : 338.65625,
        width: 16,
        x: desktop ? 1288.65625 : 322.65625,
        y: desktop ? 348 : 443,
      },
      {
        bottom: desktop ? 364 : 459,
        height: 16,
        right: desktop ? 1340.828125 : 374.828125,
        width: 16,
        x: desktop ? 1324.828125 : 358.828125,
        y: desktop ? 348 : 443,
      },
    ]);
    expect(actual.icons.map(({ className }) => className)).toEqual([
      expect.stringContaining("yobicon-friends"),
      expect.stringContaining("yobicon-eye"),
    ]);
    expect(actual.icons.every(({ className }) => !className.includes("yobicon-middle"))).toBe(true);
    expect(actual.icons.map(({ glyph }) => glyph)).toEqual(['""', '""']);
    for (const icon of actual.icons) {
      expect(icon).toMatchObject({
        display: "inline-block",
        fontFamily: "yobicon",
        fontSize: "16px",
        lineHeight: "16px",
        marginBottom: "3px",
        marginLeft: "5px",
        marginRight: "5px",
        verticalAlign: "bottom",
      });
    }
    expect(actual.stats).toEqual({
      bottom: desktop ? 367 : 462,
      height: 60,
      right: desktop ? 1356 : 390,
      width: 85,
      x: desktop ? 1271 : 305,
      y: desktop ? 307 : 402,
    });
    expect(actual.row).toEqual({
      bottom: desktop ? 383 : 473,
      height: desktop ? 91 : 151,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 292 : 322,
    });
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-projects-icons-avatar-image-${viewport.name}.png`),
    });
  });
