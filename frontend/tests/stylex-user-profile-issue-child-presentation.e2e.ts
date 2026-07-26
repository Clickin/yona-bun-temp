import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
              {
                id: 8,
                issueNumber: 8,
                title: "Open child",
                state: "open",
                assigneeLabel: "Child Assignee",
                commentCount: 2,
                voterCount: 1,
                createdLabel: "Jul 8, 2026",
                labels: [],
              },
              {
                id: 9,
                issueNumber: 9,
                title: "Closed child",
                state: "closed",
                assigneeLabel: "",
                commentCount: 0,
                voterCount: 0,
                createdLabel: "Jul 9, 2026",
                labels: [],
              },
              {
                id: 10,
                issueNumber: 10,
                title: "Draft child",
                state: "open",
                isDraft: true,
                assigneeLabel: "",
                commentCount: 0,
                voterCount: 0,
                createdLabel: "Jul 10, 2026",
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

test("public profile visible child list owns only its matching legacy presentation", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.VITE_DISABLE_LEGACY_FALLBACK).toBe("1");
  expect(process.env.YONA_E2E_FALLBACK_MODE).toBe("fallback-off");
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [
    route,
    styles,
    view,
    issuePartial,
    childListPartial,
    childPartial,
    pageLess,
    yobiLess,
    yobicon,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
      "utf8",
    ),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(issuePartial).toContain("@partial_view_childIssueListOnly(issue, project)");
  expect(childListPartial).toContain('@partial_view_child("open", childIssue, issue)');
  expect(childListPartial).toContain('@partial_view_child("closed", childIssue, issue)');
  expect(childPartial).toContain('class="issue-item @if(childIssue.id == parentIssue.id)');
  expect(childPartial).toContain('class="state-label @state"');
  expect(childPartial).toContain('class="child-issue-date"');
  expect(pageLess).toContain("#simple-issue-list {");
  expect(pageLess).toContain(".child-issue-list {");
  expect(pageLess).toContain("background-color: transparent !important;");
  expect(pageLess).toContain(".yobicon-checkmark {");
  expect(pageLess).toContain(".child-issue-date {");
  expect(pageLess).toContain(".draft-number {");
  expect(yobicon).toContain('.yobicon-checkmark:before {\n    content: "\\e017";\n}');
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
  expect(issuePartial).not.toContain('id="simple-issue-list"');
  expect(childListPartial).not.toContain('id="simple-issue-list"');
  expect(childPartial).not.toContain('id="simple-issue-list"');

  for (const owner of [
    "user-profile-child-issue-list",
    "user-profile-child-closed-state",
    "user-profile-child-checkmark",
    "user-profile-child-date",
    "user-profile-child-draft-number",
  ]) {
    expect(route).toContain(owner);
  }
  for (const owner of [
    "issueChildList:",
    "issueChildClosedState:",
    "issueChildCheckmark:",
    "issueChildDate:",
    "issueChildDraftNumber:",
  ]) {
    expect(styles).toContain(owner);
  }
  expect(route).not.toContain('className=" yobicon-checkmark"');
  expect(route).not.toContain('className="draft-number"');

  const output = "output/playwright/stylex-user-profile-issue-child-presentation";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
    const list = page.locator('[data-stylex-owner="user-profile-child-issue-list"]');
    await expect(list).toHaveClass(/(?:^|\s)child-issue-list(?:\s|$)/u);
    await expect(list).toBeHidden();
    await page.locator("#toggle-show-subtasks").check();
    await expect(list).toBeVisible();

    const children = list.locator(".issue-item.child-issue");
    await expect(children).toHaveCount(3);
    await expect(children.nth(0)).toContainText("#8Open child - Child Assignee");
    await expect(children.nth(1)).toContainText("#DraftDraft child");
    await expect(children.nth(2)).toContainText("#9Closed child");
    await expect(children.nth(0).locator(".state-label.open")).toHaveCount(1);
    await expect(children.nth(2).locator(".state-label.closed")).toHaveCount(1);
    await expect(children.nth(0).locator('a[href$="/admin/sample/issue/8"]')).toHaveCount(1);
    await expect(children.nth(2).locator('a[href$="/admin/sample/issue/9"]')).toHaveCount(1);
    await expect(
      children.nth(0).locator('[data-stylex-owner="user-profile-child-date"]'),
    ).toHaveAttribute("title", "Jul 8, 2026");
    await expect(list.locator(".yobicon-checkmark")).toHaveCount(0);
    await expect(list.locator(".draft-number")).toHaveCount(0);
    await expect(list.locator("#simple-issue-list")).toHaveCount(0);

    const metrics = await list.evaluate((element) => {
      const closed = element.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-child-closed-state"]',
      );
      const checkmark = element.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-child-checkmark"]',
      );
      const date = element.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-child-date"]',
      );
      const draft = element.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-child-draft-number"]',
      );
      if (!closed || !checkmark || !date || !draft) throw new Error("Batch 1007 owners missing");
      const style = (node: HTMLElement) => getComputedStyle(node);
      const before = getComputedStyle(checkmark, "::before");
      const boxes = [...element.querySelectorAll<HTMLElement>(".child-issue")].map((node) =>
        node.getBoundingClientRect(),
      );
      return {
        listColor: style(element).color,
        closedBackground: style(closed).backgroundColor,
        checkmark: {
          color: style(checkmark).color,
          display: style(checkmark).display,
          fontFamily: style(checkmark).fontFamily,
          fontStyle: style(checkmark).fontStyle,
          fontWeight: style(checkmark).fontWeight,
          lineHeight: style(checkmark).lineHeight,
          verticalAlign: style(checkmark).verticalAlign,
          before: before.content,
          beforeFont: before.fontFamily,
        },
        date: { color: style(date).color, display: style(date).display },
        draftColor: style(draft).color,
        nonmatchingSimpleIssueList: element.closest("#simple-issue-list") === null,
        ordered: boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1]!.top),
        contained: boxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(metrics).toEqual({
      listColor: "rgb(102, 102, 102)",
      closedBackground: "rgba(0, 0, 0, 0)",
      checkmark: {
        color: "rgb(253, 105, 86)",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: "13px",
        verticalAlign: "baseline",
        before: JSON.stringify(String.fromCodePoint(0xe017)),
        beforeFont: "yobicon",
      },
      date: { color: "rgb(211, 211, 211)", display: "none" },
      draftColor: "rgb(11, 181, 60)",
      nonmatchingSimpleIssueList: true,
      ordered: true,
      contained: true,
      overflow: 0,
    });
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
