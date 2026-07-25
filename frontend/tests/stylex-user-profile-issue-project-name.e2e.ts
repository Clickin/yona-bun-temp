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
            updatedLabel: "Jul 7, 2026",
            ownerName: "admin",
            projectName: "sample",
            commentCount: 3,
            labels: [],
            childIssues: [],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns the populated issue project-name residual", async ({
  page,
}) => {
  const [
    source,
    styleSource,
    scala,
    partial,
    pageLess,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
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
  expect(scala).toContain('<ul class="post-list-wrap my-issues row-fluid">');
  expect(partial).toContain(
    '<div class="span2 project-name-in-my-issues fixed-height-my-issues-list">',
  );
  expect(partial).toContain('<span class="infos-item project-name">');
  expect(partial).toContain("routes.ProjectApp.project(project.owner,project.name)");
  expect(pageLess).toContain(
    ".project-name-in-my-issues {\n    display: flex !important;\n    flex-direction: row;\n    flex-wrap: nowrap;\n    flex-grow: 1;\n    justify-content: space-between;\n    align-items: center;",
  );
  expect(pageLess).toContain(
    ".project-name {\n        text-overflow: ellipsis;\n        overflow: hidden;\n        white-space: nowrap;",
  );
  expect(common).toContain(".fixed-height-my-issues-list {");
  expect(common).toContain("line-height: 36px;");
  expect(responsive).toContain(".project-name");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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
  expect(messages).toContain("project.name");
  expect(source).toContain('data-stylex-owner="user-profile-issue-project-name-wrapper"');
  expect(source).toContain('data-stylex-owner="user-profile-issue-project-name"');
  expect(source).toContain("fixed-height-my-issues-list");
  expect(styleSource).toContain('display: "flex"');
  expect(styleSource).toContain('flexDirection: "row"');
  expect(styleSource).toContain('flexWrap: "nowrap"');
  expect(styleSource).toContain("flexGrow: 1");
  expect(styleSource).toContain('justifyContent: "space-between"');
  expect(styleSource).toContain('alignItems: "center"');
  expect(styleSource).toContain('textOverflow: "ellipsis"');
  expect(styleSource).toContain('overflow: "hidden"');
  expect(styleSource).toContain('whiteSpace: "nowrap"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const row = page.locator('[data-stylex-owner="user-profile-issue-row"]');
  const wrapper = row.locator('[data-stylex-owner="user-profile-issue-project-name-wrapper"]');
  const projectName = wrapper.locator('[data-stylex-owner="user-profile-issue-project-name"]');
  await expect(row).toHaveCount(1);
  await expect(wrapper).toHaveCount(1);
  await expect(projectName).toHaveCount(1);
  await expect(wrapper).not.toHaveClass(/project-name-in-my-issues/);
  await expect(projectName).toHaveText("sample");
  await expect(wrapper.locator('a[href$="/admin/sample"]')).toHaveText("sample");
  await expect(row.locator('[data-stylex-owner="user-profile-issue-post-id"]')).toHaveText("#7");
  await expect(row).toContainText("sample#7Profile issue");

  const desktop = await row.evaluate((node) => {
    const root = node.getBoundingClientRect();
    const wrapper = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-project-name-wrapper"]',
    );
    const projectName = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-project-name"]',
    );
    if (!wrapper || !projectName) throw new Error("Batch 960 owners are missing");
    const wrapperStyle = getComputedStyle(wrapper);
    const projectNameStyle = getComputedStyle(projectName);
    const wrapperBox = wrapper.getBoundingClientRect();
    return {
      display: wrapperStyle.display,
      flexDirection: wrapperStyle.flexDirection,
      flexWrap: wrapperStyle.flexWrap,
      flexGrow: wrapperStyle.flexGrow,
      justifyContent: wrapperStyle.justifyContent,
      alignItems: wrapperStyle.alignItems,
      textOverflow: projectNameStyle.textOverflow,
      overflow: projectNameStyle.overflow,
      whiteSpace: projectNameStyle.whiteSpace,
      contained: wrapperBox.left >= root.left - 1 && wrapperBox.right <= root.right + 1,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    flexGrow: "1",
    justifyContent: "space-between",
    alignItems: "center",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
    contained: true,
    scrollWidth: 1366,
  });

  for (const element of await wrapper.locator("*").all()) {
    await expect(element).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
    ]) {
      await expect(element).not.toHaveAttribute(attribute);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await wrapper.evaluate((element) => {
    const root = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const projectName = element.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-project-name"]',
    );
    if (!projectName) throw new Error("Batch 960 project-name owner is missing on mobile");
    const projectNameStyle = getComputedStyle(projectName);
    return {
      display: style.display,
      flexDirection: style.flexDirection,
      flexWrap: style.flexWrap,
      textOverflow: projectNameStyle.textOverflow,
      overflow: projectNameStyle.overflow,
      whiteSpace: projectNameStyle.whiteSpace,
      contained: root.left >= 0 && root.right <= window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
    contained: true,
    scrollWidth: 390,
    viewportWidth: 390,
  });
});
