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
            milestoneId: 3,
            milestoneTitle: "v1.0",
            dueDateLabel: "Jul 31, 2026",
            dueDateText: "24 days left",
            dueDateOverdue: false,
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

test("authenticated public profile owns populated issue author and metadata residuals", async ({
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
    '<div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">',
  );
  expect(partial).toContain('<div class="infos span3 meta">');
  expect(partial).toContain('<span class="meta-cell">');
  expect(partial).toContain('<span class="infos-item post-id">#@issue.getNumber</span>');
  expect(pageLess).toContain(".author {\n            display:table;");
  expect(pageLess).toContain(
    ".author-cell {\n                display:table-cell;\n                vertical-align:middle;\n                text-overflow: ellipsis;\n                overflow: hidden;\n                white-space: nowrap;",
  );
  expect(pageLess).toContain(".meta {\n            display:table;");
  expect(pageLess).toContain(
    ".meta-cell {\n                display:table-cell;\n                vertical-align:middle;",
  );
  expect(pageLess).toContain(
    ".post-id {\n            color:#999;\n            margin-right:5px;\n            font-size: 12px;\n            font-weight: normal;",
  );
  expect(pageLess).toContain(".infos {\n            margin-top: 4px;");
  expect(common).toContain(".nm { margin: 0 !important; }");
  expect(responsive).toContain(".hide-in-mobile");
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
  expect(messages).toContain("issue.noAuthor");
  expect(messages).toContain("issue.dueDate.overdue");

  for (const owner of [
    "user-profile-issue-author",
    "user-profile-issue-meta",
    "user-profile-issue-meta-cell",
    "user-profile-issue-post-id",
  ]) {
    expect(source).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(source).toContain('"user-profile-issue-author-cell"');
  expect(source).toContain("applyAuthorCellStyle");
  for (const declaration of [
    'issueAuthor: { display: "table" }',
    'display: "table-cell"',
    'textOverflow: "ellipsis"',
    'issueMeta: { display: "table" }',
    'issueMetaCell: { display: "table-cell", verticalAlign: "middle" }',
    'color: "#999"',
    'fontSize: "12px"',
    'marginRight: "5px"',
    'marginTop: "4px"',
  ]) {
    expect(styleSource).toContain(declaration);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const row = page.locator('[data-stylex-owner="user-profile-issue-row"]');
  const authorWrappers = row.locator('[data-stylex-owner="user-profile-issue-author"]');
  const authorCells = row.locator('[data-stylex-owner="user-profile-issue-author-cell"]');
  const meta = row.locator('[data-stylex-owner="user-profile-issue-meta"]');
  const metaCell = row.locator('[data-stylex-owner="user-profile-issue-meta-cell"]');
  const postId = row.locator('[data-stylex-owner="user-profile-issue-post-id"]');
  await expect(row).toHaveCount(1);
  await expect(authorWrappers).toHaveCount(2);
  for (const authorWrapper of await authorWrappers.all()) {
    await expect(authorWrapper).not.toHaveClass(/project-name-in-my-issues/);
  }
  await expect(authorCells).toHaveCount(2);
  await expect(meta.locator(".author-cell")).toHaveCount(1);
  await expect(meta.locator('[data-stylex-owner="user-profile-issue-author-cell"]')).toHaveCount(0);
  await expect(meta).toHaveCount(1);
  await expect(metaCell).toHaveCount(1);
  await expect(postId).toHaveText("#7");
  await expect(row).toContainText("Author User");
  await expect(row).toContainText("Assignee User");
  await expect(row).toContainText("Jul 7, 2026");
  await expect(row).toContainText("v1.0");
  await expect(row.locator('[data-stylex-owner="user-profile-issue-due-date"]')).toHaveAttribute(
    "title",
    "Due date: Jul 31, 2026",
  );
  await expect(row.locator('a[href$="/admin/sample/issue/7"]')).toHaveCount(1);
  await expect(authorCells.nth(0)).toHaveAttribute("href", `${basePath}/author`);
  await expect(authorCells.nth(1)).toHaveAttribute("href", `${basePath}/assignee`);

  const desktop = await row.evaluate((node) => {
    const root = node.getBoundingClientRect();
    const author = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-author"]',
    );
    const authorCell = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-author-cell"]',
    );
    const meta = node.querySelector<HTMLElement>('[data-stylex-owner="user-profile-issue-meta"]');
    const metaCell = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-meta-cell"]',
    );
    const postId = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-issue-post-id"]',
    );
    if (!author || !authorCell || !meta || !metaCell || !postId)
      throw new Error("Batch 959 owners missing");
    const authorStyle = getComputedStyle(author);
    const authorCellStyle = getComputedStyle(authorCell);
    const metaStyle = getComputedStyle(meta);
    const metaCellStyle = getComputedStyle(metaCell);
    const postIdStyle = getComputedStyle(postId);
    const within = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return box.left >= root.left - 1 && box.right <= root.right + 1;
    };
    return {
      authorDisplay: authorStyle.display,
      authorCellDisplay: authorCellStyle.display,
      authorCellVerticalAlign: authorCellStyle.verticalAlign,
      authorCellOverflow: authorCellStyle.overflow,
      authorCellWhiteSpace: authorCellStyle.whiteSpace,
      metaDisplay: metaStyle.display,
      metaCellDisplay: metaCellStyle.display,
      metaCellVerticalAlign: metaCellStyle.verticalAlign,
      infosMarginTop: metaStyle.marginTop,
      postIdColor: postIdStyle.color,
      postIdMarginRight: postIdStyle.marginRight,
      postIdFontSize: postIdStyle.fontSize,
      postIdFontWeight: postIdStyle.fontWeight,
      contained: [author, authorCell, meta, metaCell, postId].every(within),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    authorDisplay: "table",
    authorCellDisplay: "table-cell",
    authorCellVerticalAlign: "middle",
    authorCellOverflow: "hidden",
    authorCellWhiteSpace: "nowrap",
    metaDisplay: "table",
    metaCellDisplay: "table-cell",
    metaCellVerticalAlign: "middle",
    infosMarginTop: "4px",
    postIdColor: "rgb(153, 153, 153)",
    postIdMarginRight: "5px",
    postIdFontSize: "12px",
    postIdFontWeight: "400",
    contained: true,
    scrollWidth: 1366,
  });

  for (const element of await row.locator("*").all()) {
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
  const mobile = await row.evaluate((node) => {
    const root = node.getBoundingClientRect();
    const hiddenAuthors = [
      ...node.querySelectorAll<HTMLElement>('[data-stylex-owner="user-profile-issue-author"]'),
    ].every((element) => getComputedStyle(element).display === "none");
    const meta = node.querySelector<HTMLElement>('[data-stylex-owner="user-profile-issue-meta"]');
    if (!meta) throw new Error("Batch 959 meta owner missing on mobile");
    const metaBox = meta.getBoundingClientRect();
    return {
      hiddenAuthors,
      metaContained: metaBox.left >= root.left - 1 && metaBox.right <= root.right + 1,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    hiddenAuthors: true,
    metaContained: true,
    scrollWidth: 390,
    viewportWidth: 390,
  });
});
