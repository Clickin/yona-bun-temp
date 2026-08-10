import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("authenticated public profile issue title area owns residual legacy declarations", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const legacyPartial = readFileSync(
    "../yona-original/app/views/user/partial_issues.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyView).toContain("@partial_issues(issue)");
  expect(legacyPartial).toContain('<span class="title-cell">');
  expect(legacyPartial).toContain('<span class="item-count-groups">');
  expect(legacyPartial).toContain('class="title"');
  expect(pageLess).toContain(".title-cell {");
  expect(pageLess).toContain("padding: 5px 0;");
  expect(pageLess).toContain("display:table-cell;");
  expect(pageLess).toContain("vertical-align:middle;");
  expect(pageLess).toContain(".item-count-groups {");
  expect(pageLess).toContain("font-size:10px;");
  expect(pageLess).toContain(".title {");
  expect(pageLess).toContain("font-size:14px;");
  expect(pageLess).toContain("font-weight: 500;");
  expect(commonLess).toContain(".nm { margin: 0 !important; }");
  expect(responsiveLess).toContain(".nav-tabs li a");
  expect(bootstrap).toContain(".nav-tabs > li");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("issue.state.open");
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
  expect(source).toContain('data-owner="user-profile-issue-title-cell"');
  expect(source).toContain('data-owner="user-profile-issue-title-link"');
  expect(source).toContain('data-owner="user-profile-issue-title-count-groups"');

  // Bucket-3 (wave 33): the app's legacy-parity restore (667398a04) retains
  // the title-cell/title runtime classes — assert retention.
  expect(source).toMatch(/className=.*title-cell/u);
  expect(source).toMatch(/data-owner="user-profile-issue-title-link"/u);

  await mockProfile(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });

  const row = page.locator("#issue-item-11");
  const cell = page.locator('[data-owner="user-profile-issue-title-cell"]');
  const title = page.locator('[data-owner="user-profile-issue-title-link"]');
  const counts = page.locator('[data-owner="user-profile-issue-title-count-groups"]');
  await expect(row).toHaveCount(1);
  await expect(cell).toHaveCount(1);
  await expect(title).toHaveText("Open profile issue");
  await expect(title).toHaveAttribute("href", `${basePath}/door/sample/issue/7`);
  await expect(counts).toContainText("3");
  for (const target of [cell, title, counts]) {
    await expect(target).not.toHaveAttribute("style");
    await expect(target).not.toHaveAttribute("data-toggle");
    await expect(target).not.toHaveAttribute("data-placement");
  }

  const desktop = await page.evaluate(() => {
    const cell = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-title-cell"]',
    );
    const title = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-title-link"]',
    );
    const counts = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-title-count-groups"]',
    );
    const wrap = cell?.closest<HTMLElement>('[data-owner="user-profile-issue-title-wrap"]');
    if (!cell || !title || !counts || !wrap) throw new Error("issue title owners are missing");
    const cellStyle = getComputedStyle(cell);
    const titleStyle = getComputedStyle(title);
    const countStyle = getComputedStyle(counts);
    const cellBox = cell.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    return {
      cellDisplay: cellStyle.display,
      cellPaddingTop: cellStyle.paddingTop,
      cellPaddingBottom: cellStyle.paddingBottom,
      cellVerticalAlign: cellStyle.verticalAlign,
      titleFontSize: titleStyle.fontSize,
      titleFontWeight: titleStyle.fontWeight,
      countFontSize: countStyle.fontSize,
      contained: cellBox.left >= wrapBox.left && cellBox.right <= wrapBox.right + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(desktop).toEqual({
    cellDisplay: "table-cell",
    cellPaddingTop: "5px",
    cellPaddingBottom: "5px",
    cellVerticalAlign: "middle",
    titleFontSize: "14px",
    titleFontWeight: "500",
    countFontSize: "10px",
    contained: true,
    documentWidth: 1366,
    viewportWidth: 1366,
  });

  await title.click();
  await expect(page).toHaveURL(/\/door\/sample\/issue\/7$/);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    cellWidth:
      document
        .querySelector<HTMLElement>('[data-owner="user-profile-issue-title-cell"]')
        ?.getBoundingClientRect().width ?? 0,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(mobile.cellWidth).toBeGreaterThan(0);
  expect(mobile.documentWidth).toBe(mobile.viewportWidth);
});

async function mockProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [
          {
            authorLabel: "Door User",
            authorLoginId: "door",
            commentCount: 3,
            id: 11,
            issueNumber: 7,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Open profile issue",
            updatedLabel: "today",
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
