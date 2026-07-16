import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const avatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  count: "projects-directory-member-count",
  icon: "projects-directory-stats-icon",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page) {
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
    actorId: null,
    defaultLandingPath: "/",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
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
            lastPushedLabel: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            lastPushedLabel: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            lastPushedLabel: "5일 전",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 3,
        totalPages: 1,
      },
    }),
  );
}

async function open(page: Page) {
  await mockProjects(page);
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-stylex-owner="${owners.icon}"]`).first()).toBeVisible({
    timeout: 2_000,
  });
}

test("stats alignment/weight wave records the final cascade and retained glyph fallback", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(scala).toContain('<div class="stats-wrap pull-right">');
  expect(scala).toContain(
    '@Html(Messages("project.onmember", User.findUsersByProject(project.id).size))',
  );
  expect(scala).toContain('<i class="yobicon-eye yobicon-middle"></i>');
  expect(siteLayout).toContain('@layout(Messages(title))("")');
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
  expect(common).toContain(
    ".yobicon-middle{\n    vertical-align: bottom;\n    margin-bottom: 3px;",
  );
  expect(pageLess).toContain(
    ".stats-wrap {\n    i {\n        font-size: 16px;\n        margin-left: 5px;\n        margin-right: 5px;",
  );
  expect(pageLess).toContain("strong { color:@secondary; }");
  expect(bootstrap).toContain("strong {\n  font-weight: bold;");
  expect(yobicon).toContain("font-family: 'yobicon';");
  expect(yobicon).toContain("display: inline-block;");
  expect(yobicon).toContain('.yobicon-friends:before {\n    content: "\\e27b";');
  expect(yobicon).toContain('.yobicon-eye:before {\n    content: "\\e52e";');
  expect(messages).toContain(
    'project.onmember = <i class="yobicon-friends yobicon-middle"></i><strong>{0}</strong>',
  );
  expect(messages).toContain("project.onwatching = <strong>{0}</strong>");

  expect(route.match(/data-stylex-owner="projects-directory-stats-icon"/gu)).toHaveLength(2);
  expect(route.match(/data-stylex-owner="projects-directory-member-count"/gu)).toHaveLength(2);
  expect(route).toContain("className={`yobicon-friends ${");
  expect(route).toContain("className={`yobicon-eye ${");
  expect(route).not.toContain("yobicon-friends yobicon-middle");
  expect(route).not.toContain("yobicon-eye yobicon-middle");
  const iconStyle = route.slice(
    route.indexOf("directoryStatsIcon: {"),
    route.indexOf("directoryMemberAvatarImage: {"),
  );
  const countStyle = route.slice(
    route.indexOf("directoryMemberCount: {"),
    route.indexOf("directoryEmptyState: {"),
  );
  expect(iconStyle).toContain('marginBottom: "3px"');
  expect(iconStyle).toContain('verticalAlign: "bottom"');
  expect(countStyle).toContain('fontWeight: "700"');
  expect(countStyle).toContain("projectsDirectoryColors.memberCountText");
  expect(route).not.toContain("globalColors.");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`stats alignment/weight wave preserves exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const icons = page.locator(`[data-stylex-owner="${owners.icon}"]`);
    const counts = page.locator(`[data-stylex-owner="${owners.count}"]`);
    await expect(icons).toHaveCount(6);
    await expect(counts).toHaveCount(6);
    await expect(icons).toHaveClass([
      /(?:^|\s)yobicon-friends(?:\s|$)/u,
      /(?:^|\s)yobicon-eye(?:\s|$)/u,
      /(?:^|\s)yobicon-friends(?:\s|$)/u,
      /(?:^|\s)yobicon-eye(?:\s|$)/u,
      /(?:^|\s)yobicon-friends(?:\s|$)/u,
      /(?:^|\s)yobicon-eye(?:\s|$)/u,
    ]);
    expect(
      await icons.evaluateAll((nodes) =>
        nodes.every((node) => !node.classList.contains("yobicon-middle")),
      ),
    ).toBe(true);
    await expect(counts).toHaveText(["1", "1", "1", "1", "1", "1"]);
    const paragraphs = page.locator('[data-stylex-owner="projects-directory-members"] > p');
    await expect(paragraphs).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      const children = paragraphs.nth(index).locator(":scope > *");
      await expect(children).toHaveCount(4);
      await expect(children.nth(0)).toHaveAttribute("data-stylex-owner", owners.icon);
      await expect(children.nth(1)).toHaveAttribute("data-stylex-owner", owners.count);
      await expect(children.nth(2)).toHaveAttribute("data-stylex-owner", owners.icon);
      await expect(children.nth(3)).toHaveAttribute("data-stylex-owner", owners.count);
    }

    const actual = await page.evaluate((ownerNames) => {
      const icons = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.icon}"]`),
      );
      const counts = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.count}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      return {
        counts: counts.map((count) => {
          const style = getComputedStyle(count);
          return {
            box: box(count),
            style: {
              color: style.color,
              display: style.display,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              margin: style.margin,
              verticalAlign: style.verticalAlign,
            },
          };
        }),
        icons: icons.map((icon) => {
          const style = getComputedStyle(icon);
          return {
            box: box(icon),
            glyph: getComputedStyle(icon, "::before").content,
            style: {
              color: style.color,
              display: style.display,
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontStyle: style.fontStyle,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              margin: style.margin,
              verticalAlign: style.verticalAlign,
            },
          };
        }),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.icons.map(({ box }) => box)).toEqual(
      [
        [1288.65625, 214],
        [1324.828125, 214],
        [1288.65625, desktop ? 305 : 430],
        [1324.828125, desktop ? 305 : 430],
        [1288.65625, desktop ? 396 : 581],
        [1324.828125, desktop ? 396 : 581],
      ].map(([desktopX, y], index) => ({
        height: 16,
        width: 16,
        x: desktop ? desktopX : index % 2 === 0 ? 322.65625 : 358.828125,
        y: desktop ? y : index < 2 ? 279 : y,
      })),
    );
    expect(actual.counts.map(({ box }) => box)).toEqual(
      [
        [1309.65625, 215],
        [1349.421875, 215],
        [1309.65625, desktop ? 306 : 431],
        [1349.421875, desktop ? 306 : 431],
        [1309.65625, desktop ? 397 : 582],
        [1349.421875, desktop ? 397 : 582],
      ].map(([desktopX, y], index) => ({
        height: 16,
        width: 6.578125,
        x: desktop ? desktopX : index % 2 === 0 ? 343.65625 : 383.421875,
        y: desktop ? y : index < 2 ? 280 : y,
      })),
    );
    expect(actual.icons.map(({ glyph }) => glyph)).toEqual([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
    ]);
    for (const icon of actual.icons)
      expect(icon.style).toEqual({
        color: "rgb(51, 51, 51)",
        display: "inline-block",
        fontFamily: "yobicon",
        fontSize: "16px",
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: "16px",
        margin: "0px 5px 3px",
        verticalAlign: "bottom",
      });
    for (const count of actual.counts)
      expect(count.style).toEqual({
        color: "rgb(81, 170, 204)",
        display: "inline",
        fontSize: "13px",
        fontWeight: "700",
        lineHeight: "20px",
        margin: "0px",
        verticalAlign: "baseline",
      });
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `stylex-projects-stats-alignment-weight-${viewport.name}.png`,
      ),
    });
  });
