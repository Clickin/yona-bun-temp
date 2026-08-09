import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

const child = (id: number, title: string, commentCount: number, voterCount: number) => ({
  id,
  issueNumber: id,
  title,
  state: "open",
  assigneeLabel: id === 8 ? "Child Assignee" : "",
  commentCount,
  voterCount,
  createdLabel: `Jul ${id}, 2026`,
  labels: id === 8 ? [{ id: 21, name: "child", color: "#abc", categoryName: "default" }] : [],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("showSubtasksAlways", "false"));
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
            childIssues: [
              child(8, "Both counts", 2, 1),
              child(9, "Comment only", 3, 0),
              child(10, "Vote only", 0, 4),
              child(11, "No counts", 0, 0),
            ],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("visible child issue comment and voter pair owns its exact legacy cascade", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.VITE_DISABLE_LEGACY_FALLBACK).toBe("1");
  // YONA_E2E_FALLBACK_MODE is runner-env-specific (PW baseline command does not set it either) — dropped.

  const [
    route,
    styles,
    view,
    issuePartial,
    childList,
    childPartial,
    pairPartial,
    commentPartial,
    votePartial,
    variables,
    mixins,
    common,
    pageLess,
    responsive,
    yobiLess,
    bootstrap,
    bootstrapResponsive,
    yobicon,
    messages,
    showSubtasksJs,
    appCss,
    focusedTest,
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
      new URL(
        "../../yona-original/app/views/issue/partial_view_childIssueListOnly.scala.html",
        import.meta.url,
      ),
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
      new URL("../../yona-original/app/views/common/voteCount.scala.html", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
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
    readFile(
      new URL(
        "../../yona-original/public/javascripts/service/yona.showSubtask.js",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(issuePartial).toContain("@partial_view_childIssueListOnly(issue, project)");
  expect(childList).toContain('@partial_view_child("open", childIssue, issue)');
  expect(childPartial).toContain('<span class="font12 no-border-at-child">');
  expect(childPartial).toContain(
    "@common.commentAndVoterPairDisplay(childIssue, parentIssue.project)",
  );
  expect(pairPartial).toContain("issue.comments.size > 0 || issue.voters.size > 0");
  expect(pairPartial).toContain("issue.comments.size, true");
  expect(pairPartial).toContain("issue.voters.size, true");
  expect(commentPartial).toContain("comments-count-color");
  expect(votePartial).toContain("vote-count");
  expect(votePartial).toContain("vote-color");
  expect(votePartial).toContain("count-groups item-count strong");
  expect(common).toContain(".font12 { font-size: 12px; }");
  expect(pageLess).toContain(".item-count-groups {");
  expect(pageLess).toContain("a:nth-child(2) {");
  expect(pageLess).toContain("margin-left: -5px;");
  expect(pageLess).toContain(".comments-count-color {");
  expect(pageLess).toContain(".vote-color {");
  expect(pageLess).toContain(".count-groups {");
  expect(pageLess).toContain(".no-border-at-child {");
  expect(variables).toContain("@darkmagenta: #8B008B;");
  expect(variables).toContain("@orange : #F36C22;");
  expect(mixins).toContain(".border-radius");
  expect(responsive).not.toMatch(/comments-count|vote-count|count-groups|item-count-groups/u);
  expect(bootstrap).toContain("a:hover,\na:focus {");
  expect(bootstrapResponsive).not.toMatch(
    /comments-count|vote-count|count-groups|item-count-groups/u,
  );
  expect(yobicon).toContain('.yobicon-comment2:before {\n    content: "\\e274";\n}');
  expect(yobicon).toContain('.yobicon-hearts:before {\n    content: "\\e4b0";\n}');
  expect(messages).toContain("issue.state.open");
  expect(showSubtasksJs).toContain('$("#toggle-show-subtasks")');
  expect(showSubtasksJs).toContain('$(".child-issue-list").show()');
  expect(appCss).toContain(".issue-list-page .item-count-groups > button.sharer-color");
  expect(appCss).not.toMatch(/user-profile[\s\S]{0,100}item-count-groups/u);
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

  const childSource = route.slice(
    route.indexOf("function ProfileIssueChildCounts("),
    route.indexOf("function truncateParentIssueTitle("),
  );
  for (const owner of [
    "user-profile-child-count-groups",
    "user-profile-child-comment-count-link",
    "user-profile-child-vote-count-link",
    "user-profile-child-comment-count-icon",
    "user-profile-child-vote-count-icon",
    "user-profile-child-comment-count-glyph",
    "user-profile-child-vote-count-glyph",
    "user-profile-child-comment-count-value",
    "user-profile-child-vote-count-value",
  ]) {
    expect(childSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route).toContain('data-stylex-owner="user-profile-child-count-pair"');
  expect(childSource).not.toMatch(
    /className="(?:comments-count|vote-count|count-groups|yobicon-comment2|yobicon-hearts)/u,
  );
  // item-count-groups is retained (66739804a parity-correct) on the count pair.
  expect(childSource).toContain("item-count-groups`}");
  expect(childSource).not.toContain("item-count strong");
  for (const owner of [
    "issueChildCountPair:",
    "issueChildCountGroups:",
    "issueChildCommentLink:",
    "issueChildVoteLink:",
    "issueChildCountLinkOffset:",
    "issueChildCountIcon:",
    "issueChildCommentGlyph:",
    "issueChildVoteGlyph:",
    "issueChildCountValue:",
    "issueChildVoteCountValue:",
  ]) {
    expect(styles).toContain(owner);
  }

  const output = "output/playwright/stylex-user-profile-issue-child-count-pair";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const toggle = page.locator("#toggle-show-subtasks");
    const childList = page.locator(".child-issue-list");
    await expect(childList).toBeHidden();
    await toggle.check();
    const children = page.locator(".child-issue");
    const pairs = page.locator('[data-stylex-owner="user-profile-child-count-groups"]');
    await expect(childList).toBeVisible();
    await expect(children).toHaveCount(4);
    await expect(pairs).toHaveCount(3);
    await expect(children.nth(0)).toContainText("#8Both counts - Child Assignee");
    await expect(children.nth(1)).toContainText("#9Comment only");
    await expect(children.nth(2)).toContainText("#10Vote only");
    await expect(children.nth(3)).toContainText("#11No counts");
    await expect(children.nth(0).locator('[data-label-id="21"]')).toHaveText("child");
    await expect(children.nth(0).locator(".state-label")).toHaveClass(/open/u);
    await expect(
      children.nth(3).locator('[data-stylex-owner="user-profile-child-count-groups"]'),
    ).toHaveCount(0);

    const commentLinks = page.locator(
      '[data-stylex-owner="user-profile-child-comment-count-link"]',
    );
    const voteLinks = page.locator('[data-stylex-owner="user-profile-child-vote-count-link"]');
    await expect(commentLinks).toHaveCount(2);
    await expect(voteLinks).toHaveCount(2);
    await expect(commentLinks.nth(0)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/issue/8#comments`,
    );
    await expect(voteLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/issue/8#vote`);
    await expect(commentLinks.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/issue/9#comments`,
    );
    await expect(voteLinks.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/issue/10#vote`,
    );
    await expect(
      page.locator('[data-stylex-owner="user-profile-child-comment-count-value"]'),
    ).toHaveText(["2", "3"]);
    await expect(
      page.locator('[data-stylex-owner="user-profile-child-vote-count-value"]'),
    ).toHaveText(["1", "4"]);

    const metrics = await page.evaluate(() => {
      const all = (owner: string) => [
        ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${owner}"]`),
      ];
      const pairs = all("user-profile-child-count-groups");
      const comments = all("user-profile-child-comment-count-link");
      const votes = all("user-profile-child-vote-count-link");
      const icons = [
        ...all("user-profile-child-comment-count-icon"),
        ...all("user-profile-child-vote-count-icon"),
      ];
      const commentGlyph = all("user-profile-child-comment-count-glyph")[0];
      const voteGlyph = all("user-profile-child-vote-count-glyph")[0];
      const commentValue = all("user-profile-child-comment-count-value")[0];
      const voteValue = all("user-profile-child-vote-count-value")[0];
      const style = (element: HTMLElement) => getComputedStyle(element);
      const glyph = (element: HTMLElement) => ({
        display: style(element).display,
        fontFamily: style(element).fontFamily,
        lineHeight: style(element).lineHeight,
        verticalAlign: style(element).verticalAlign,
        before: getComputedStyle(element, "::before").content,
        beforeFont: getComputedStyle(element, "::before").fontFamily,
      });
      return {
        pair: pairs.map((element) => ({
          border: style(element).borderTopStyle,
          borderRadius: style(element).borderRadius,
          fontSize: style(element.parentElement!).fontSize,
          lineHeight: style(element).lineHeight,
          marginTop: style(element).marginTop,
        })),
        comment: comments.map((element) => ({
          color: style(element).color,
          marginLeft: style(element).marginLeft,
          textDecoration: style(element).textDecorationLine,
        })),
        vote: votes.map((element) => ({
          color: style(element).color,
          marginLeft: style(element).marginLeft,
          textDecoration: style(element).textDecorationLine,
        })),
        icon: icons.map((element) => ({
          borderLeft: style(element).borderLeftStyle,
          display: style(element).display,
          fontSize: style(element).fontSize,
          lineHeight: style(element).lineHeight,
          padding: style(element).padding,
        })),
        commentGlyph: glyph(commentGlyph),
        voteGlyph: glyph(voteGlyph),
        commentValue: {
          display: style(commentValue).display,
          fontWeight: style(commentValue).fontWeight,
          padding: style(commentValue).padding,
        },
        voteValue: {
          display: style(voteValue).display,
          fontWeight: style(voteValue).fontWeight,
          padding: style(voteValue).padding,
        },
        contained: pairs.every((pair) => {
          const box = pair.getBoundingClientRect();
          const row = pair.closest<HTMLElement>(".child-issue")!.getBoundingClientRect();
          return box.left >= row.left && box.right <= row.right + 1;
        }),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    for (const pair of metrics.pair) {
      expect(pair).toEqual({
        border: "none",
        borderRadius: "3px",
        fontSize: "12px",
        lineHeight: "14px",
        marginTop: "2px",
      });
    }
    expect(metrics.comment).toEqual([
      { color: "rgb(139, 0, 139)", marginLeft: "0px", textDecoration: "none" },
      { color: "rgb(139, 0, 139)", marginLeft: "0px", textDecoration: "none" },
    ]);
    expect(metrics.vote).toEqual([
      { color: "rgb(243, 108, 34)", marginLeft: "-5px", textDecoration: "none" },
      { color: "rgb(243, 108, 34)", marginLeft: "0px", textDecoration: "none" },
    ]);
    for (const icon of metrics.icon) {
      expect(icon).toEqual({
        borderLeft: "none",
        display: "inline-block",
        fontSize: "9px",
        lineHeight: "12px",
        padding: "2px 5px 0px",
      });
    }
    expect(metrics.commentGlyph).toEqual({
      display: "inline-block",
      fontFamily: "yobicon",
      lineHeight: "9px",
      verticalAlign: "baseline",
      before: JSON.stringify(String.fromCodePoint(0xe274)),
      beforeFont: "yobicon",
    });
    expect(metrics.voteGlyph).toEqual({
      display: "inline-block",
      fontFamily: "yobicon",
      lineHeight: "9px",
      verticalAlign: "baseline",
      before: JSON.stringify(String.fromCodePoint(0xe4b0)),
      beforeFont: "yobicon",
    });
    expect(metrics.commentValue).toEqual({
      display: "inline-block",
      fontWeight: "400",
      padding: "0px 5px 0px 0px",
    });
    expect(metrics.voteValue).toEqual({
      display: "inline-block",
      fontWeight: "700",
      padding: "0px 5px 0px 0px",
    });
    expect(metrics.contained).toBe(true);
    expect(metrics.overflow).toBe(0);

    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
