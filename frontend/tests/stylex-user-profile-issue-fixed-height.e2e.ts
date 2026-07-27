import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
            id: 7,
            issueNumber: 7,
            title: "Profile issue",
            state: "open",
            authorLoginId: "author",
            authorLabel: "Author User",
            assigneeLoginId: "assignee",
            assigneeLabel: "Assignee User",
            ownerName: "admin",
            projectName: "sample",
            labels: [],
            commentCount: 0,
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns fixed-height issue-row line-height", async ({ page }) => {
  const [
    source,
    styleSource,
    scala,
    partial,
    common,
    responsive,
    bootstrap,
    bootstrapResponsive,
    yobiLess,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
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
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(scala).toContain("@partial_issues(issue)");
  expect(partial).toContain("span2 project-name-in-my-issues fixed-height-my-issues-list");
  expect(partial).toContain(
    "span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list",
  );
  expect(common).toContain(".fixed-height-my-issues-list {\n    line-height: 36px;");
  expect(responsive).toContain(".hide-in-mobile");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const importPath of ["less/_common.less", "less/_page.less", "less/_responsive.less"]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  expect(messages).toContain("issue.state.open");
  expect(styleSource).toContain('lineHeight: "36px"');
  expect(styleSource).toMatch(
    /issueProjectNameWrapper:\s*\{[\s\S]*?display: "flex !important"[\s\S]*?lineHeight: "36px"/u,
  );
  expect(styleSource).toMatch(
    /issueAuthor:\s*\{[\s\S]*?display: "table"[\s\S]*?lineHeight: "36px"/u,
  );
  expect(source).toContain('data-stylex-owner="user-profile-issue-project-name-wrapper"');
  expect(source).toContain('data-stylex-owner="user-profile-issue-author"');
  expect(source).toContain("styles.issueDesktopPersonVisibility");
  expect(source).not.toContain("issueProjectNameWrapperLineHeight");
  expect(source).not.toMatch(/className=.*span2/u);
  expect(source.match(/span1 hide-in-mobile author/g)).toBeNull();

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
  const row = page.locator('[data-stylex-owner="user-profile-issue-row"]');
  const project = row.locator('[data-stylex-owner="user-profile-issue-project-name-wrapper"]');
  const authors = row.locator('[data-stylex-owner="user-profile-issue-author"]');
  await expect(project).toHaveCount(1);
  await expect(authors).toHaveCount(2);
  await expect(project).not.toHaveClass(/fixed-height-my-issues-list/);
  for (const author of [authors.nth(0), authors.nth(1)]) {
    await expect(author).not.toHaveClass(/span1/);
    await expect(author).not.toHaveClass(/hide-in-mobile/);
    await expect(author).not.toHaveClass(/fixed-height-my-issues-list/);
  }
  await expect(project).toContainText("sample");
  await expect(project.locator('a[href$="/admin/sample"]')).toHaveCount(1);
  await expect(authors.nth(0)).toContainText("Author User");
  await expect(authors.nth(1)).toContainText("Assignee User");
  await expect(authors.locator('a[href$="/author"]')).toHaveCount(1);
  await expect(authors.locator('a[href$="/assignee"]')).toHaveCount(1);
  await expect(row.locator('[data-stylex-owner="user-profile-issue-author-cell"]')).toHaveCount(2);
  await expect(
    row.locator(
      "[data-toggle], [data-placement], [data-target], [data-action], [data-href], [data-url]",
    ),
  ).toHaveCount(0);

  const measure = async () =>
    row.evaluate((node) => {
      const project = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-issue-project-name-wrapper"]',
      );
      const authors = [
        ...node.querySelectorAll<HTMLElement>('[data-stylex-owner="user-profile-issue-author"]'),
      ];
      if (!project || authors.length !== 2) throw new Error("Batch 962 owners missing");
      const ownerBoxes = [project, ...authors].map((owner) => owner.getBoundingClientRect());
      return {
        projectLineHeight: getComputedStyle(project).lineHeight,
        authorDisplays: authors.map((item) => getComputedStyle(item).display),
        authorLineHeights: authors.map((item) => getComputedStyle(item).lineHeight),
        contained: ownerBoxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
  expect(await measure()).toEqual({
    projectLineHeight: "36px",
    authorDisplays: ["table", "table"],
    authorLineHeights: ["36px", "36px"],
    contained: true,
    scrollWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await measure()).toEqual({
    projectLineHeight: "36px",
    authorDisplays: ["none", "none"],
    authorLineHeights: ["36px", "36px"],
    contained: false,
    scrollWidth: 390,
  });
});
