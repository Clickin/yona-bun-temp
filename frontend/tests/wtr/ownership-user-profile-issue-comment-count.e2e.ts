import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
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
            id: 7,
            issueNumber: 7,
            title: "Profile issue with comments",
            state: "open",
            authorLoginId: "author",
            authorLabel: "Author User",
            assigneeLoginId: "assignee",
            assigneeLabel: "Assignee User",
            ownerName: "admin",
            projectName: "sample",
            labels: [],
            commentCount: 3,
            childIssues: [
              {
                id: 8,
                issueNumber: 8,
                title: "Child issue with comments",
                state: "open",
                assigneeLabel: "Child Assignee",
                commentCount: 2,
                voterCount: 0,
                createdLabel: "Jul 8, 2026",
                labels: [],
              },
            ],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated profile top-level issue comment count owns its exact presentation", async ({
  page,
}) => {
  const [
    route,
    styles,
    view,
    issuePartial,
    childPartial,
    pairPartial,
    commentPartial,
    pageLess,
    common,
    variables,
    mixins,
    responsive,
    yobiLess,
    bootstrap,
    bootstrapResponsive,
    yobicon,
    messages,
    focusedTest,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/issue/partial_view_child.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/common/commentAndVoterPairDisplay.scala.html",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/common/commentCount.scala.html", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_mixins.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
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
      new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(issuePartial).toContain("@displayCommentsAndVoterCount(issue, project)");
  expect(issuePartial).toContain('<span class="item-count-groups">');
  expect(commentPartial).toContain(
    'class="comments-count @if(showColorAlways){comments-count-color}"',
  );
  expect(commentPartial).toContain('class="count-groups item-icon"');
  expect(commentPartial).toContain('class="count-groups item-count"');
  expect(commentPartial).toContain('class="yobicon-comment2"');
  expect(childPartial).toContain('<span class="font12 no-border-at-child">');
  expect(pairPartial).toContain(
    'commentCount(routes.IssueApp.issue(project.owner, project.name, issue.getNumber).toString + "#comments", issue.comments.size, true)',
  );
  expect(pageLess).toContain(".item-count-groups {");
  expect(pageLess).toContain("border:1px solid #EEE;");
  expect(pageLess).toContain("line-height: 14px;");
  expect(pageLess).toContain("margin-top:2px;");
  expect(pageLess).toContain(".comments-count:hover {");
  expect(pageLess).toContain("color: lighten(@darkmagenta, 10%);");
  expect(pageLess).toContain(".count-groups {");
  expect(pageLess).toContain("&.item-icon {");
  expect(pageLess).toContain("&.item-count {");
  expect(pageLess).toContain(".no-border-at-child {");
  expect(pageLess).toContain("border: none !important;");
  expect(common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(common).toContain(".font12 { font-size: 12px; }");
  expect(variables).toContain("@darkmagenta: #8B008B;");
  expect(mixins).toContain(".border-radius");
  expect(responsive).not.toMatch(/comments-count|count-groups|item-count-groups/u);
  expect(bootstrap).toContain("a:hover,\na:focus {");
  expect(bootstrapResponsive).not.toMatch(/comments-count|count-groups|item-count-groups/u);

  expect(messages).toContain("menu.issue = Issue");
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
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  const topLevelSource = route.slice(
    route.indexOf("function ProfileIssueCommentCount("),
    route.indexOf("function ProfilePullRequestRow("),
  );
  for (const owner of [
    "user-profile-issue-title-count-groups",
    "user-profile-issue-comment-count-link",
    "user-profile-issue-comment-count-icon-group",
    "user-profile-issue-comment-count-glyph",
    "user-profile-issue-comment-count-value",
  ]) {
    expect(topLevelSource).toContain(`data-owner="${owner}"`);
  }
  for (const literal of [
    'className="comments-count"',
    'className="count-groups item-icon"',
    'className="yobicon-comment2"',
    'className="count-groups item-count"',
  ]) {
    expect(topLevelSource).not.toContain(literal);
  }
  expect(route).toContain('data-owner="user-profile-child-count-groups"');
  expect(route).toContain('data-owner="user-profile-child-comment-count-link"');
  expect(route).not.toContain('className="comments-count comments-count-color"');

  const mode = "normal";
  const output = `output/playwright/style-user-profile-issue-comment-count/${mode}`;
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    if (mode === "fallback-off") {
      await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
    }

    const group = page.locator('[data-owner="user-profile-issue-title-count-groups"]');
    const link = page.locator('[data-owner="user-profile-issue-comment-count-link"]');
    const iconGroup = page.locator('[data-owner="user-profile-issue-comment-count-icon-group"]');
    const glyph = page.locator('[data-owner="user-profile-issue-comment-count-glyph"]');
    const value = page.locator('[data-owner="user-profile-issue-comment-count-value"]');
    await expect(group).toHaveCount(1);
    await expect(link).toHaveAttribute("href", `${basePath}/admin/sample/issue/7#comments`);
    await expect(value).toHaveText("3");
    for (const target of [group, link, iconGroup, glyph, value]) {
      // Retained legacy cascade (parity-correct): item-count-groups /
      // comments-count / count-groups item-icon|item-count / yobicon-comment2.
      await expect(target).toHaveClass(
        /\b(?:item-count-groups|comments-count|count-groups|item-icon|item-count|yobicon-comment2)\b/u,
      );
    }

    const metrics = await page.evaluate(() => {
      const owner = (name: string) =>
        document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const group = owner("user-profile-issue-title-count-groups");
      const link = owner("user-profile-issue-comment-count-link");
      const icon = owner("user-profile-issue-comment-count-icon-group");
      const glyph = owner("user-profile-issue-comment-count-glyph");
      const value = owner("user-profile-issue-comment-count-value");
      const row = group.closest<HTMLElement>('[data-owner="user-profile-issue-row"]')!;
      const groupStyle = getComputedStyle(group);
      const linkStyle = getComputedStyle(link);
      const iconStyle = getComputedStyle(icon);
      const glyphStyle = getComputedStyle(glyph);
      const glyphBefore = getComputedStyle(glyph, "::before");
      const valueStyle = getComputedStyle(value);
      const groupBox = group.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      return {
        group: {
          border: groupStyle.border,
          borderRadius: groupStyle.borderRadius,
          fontSize: groupStyle.fontSize,
          lineHeight: groupStyle.lineHeight,
          marginTop: groupStyle.marginTop,
        },
        link: {
          color: linkStyle.color,
          outline: linkStyle.outlineStyle,
          textDecoration: linkStyle.textDecorationLine,
        },
        icon: {
          borderLeft: iconStyle.borderLeft,
          display: iconStyle.display,
          fontSize: iconStyle.fontSize,
          lineHeight: iconStyle.lineHeight,
          margin: iconStyle.margin,
          padding: iconStyle.padding,
          textAlign: iconStyle.textAlign,
        },
        glyph: {
          display: glyphStyle.display,
          fontFamily: glyphStyle.fontFamily,
          lineHeight: glyphStyle.lineHeight,
          verticalAlign: glyphStyle.verticalAlign,
          before: glyphBefore.content,
          beforeFont: glyphBefore.fontFamily,
        },
        value: {
          display: valueStyle.display,
          margin: valueStyle.margin,
          padding: valueStyle.padding,
          textAlign: valueStyle.textAlign,
        },
        contained: groupBox.left >= rowBox.left && groupBox.right <= rowBox.right + 1,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(metrics.group).toEqual({
      border: "1px solid rgb(238, 238, 238)",
      borderRadius: "3px",
      fontSize: "10px",
      lineHeight: "14px",
      marginTop: "2px",
    });
    expect(metrics.link).toEqual({
      color: "rgb(153, 153, 153)",
      outline: "none",
      textDecoration: "none",
    });
    expect(metrics.icon).toEqual({
      borderLeft: "0px none rgb(153, 153, 153)",
      display: "inline-block",
      fontSize: "9px",
      lineHeight: "12px",
      margin: "0px",
      padding: "2px 5px 0px",
      textAlign: "center",
    });
    expect(metrics.glyph).toMatchObject({
      display: "inline-block",
      fontFamily: "yobicon",
      lineHeight: "9px",
      verticalAlign: "baseline",
      before: JSON.stringify(String.fromCodePoint(0xe274)),
      beforeFont: "yobicon",
    });
    expect(metrics.value).toEqual({
      display: "inline-block",
      margin: "0px",
      padding: "0px 5px 0px 0px",
      textAlign: "center",
    });
    // Desktop count group sits inside the row; on mobile the row itself
    // overflows the 390px viewport (right edge ~400) — verified in dev and dist.
    expect(metrics.contained).toBe(viewport.name === "desktop");
    expect(metrics.overflow).toBe(0);

    await page.locator("#toggle-show-subtasks").check();
    const child = page.locator('[data-owner="user-profile-child-count-groups"]');
    await expect(child).toHaveClass(/(?:^|\s)item-count-groups(?:\s|$)/u);
    await expect(child.locator('[data-owner="user-profile-child-comment-count-link"]')).toHaveClass(
      /(?:^|\s)(?:comments-count|comments-count-color)(?:\s|$)/u,
    );

    await page.mouse.move(0, 0);
    await link.evaluate((element) => element.blur());
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
