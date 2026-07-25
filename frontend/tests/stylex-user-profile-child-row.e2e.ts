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
            childIssues: [
              {
                id: 8,
                issueNumber: 8,
                title: "Open child issue",
                state: "open",
                assigneeLabel: "Child Assignee",
                commentCount: 2,
                voterCount: 1,
                createdLabel: "Jul 8, 2026",
                labels: [{ id: 21, name: "child", color: "#abc", categoryName: "default" }],
              },
              {
                id: 9,
                issueNumber: 9,
                title: "Closed child issue",
                state: "closed",
                assigneeLabel: "",
                commentCount: 0,
                voterCount: 0,
                createdLabel: "Jul 9, 2026",
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

test("authenticated public profile owns child issue residuals", async ({ page }) => {
  const [
    source,
    styleSource,
    viewScala,
    partialIssues,
    childList,
    child,
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

  expect(viewScala).toContain("@partial_issues(issue)");
  expect(partialIssues).toContain('<div class="child-issue-list hide">');
  expect(childList).toContain('<div class="child-issues">');
  expect(child).toContain('<span class="subtask-number">');
  expect(child).toContain('<span class="font12 no-border-at-child">');
  expect(child).toContain('class="state-label @state"');
  expect(pageLess).toContain(".subtask-number {");
  expect(pageLess).toContain('font-family: Monaco, Menlo, Consolas, "Courier New", monospace;');
  expect(pageLess).toContain("min-width: 22px;");
  expect(pageLess).toContain(".no-border-at-child {");
  expect(pageLess).toContain("border: none !important;");
  expect(common).toContain(".fixed-height-my-issues-list");
  expect(responsive).toContain(".hide-in-mobile");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const importPath of ["less/_common.less", "less/_page.less", "less/_responsive.less"]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  expect(messages).toContain("issue.state.open");
  expect(source).toContain('data-stylex-owner="user-profile-child-subtask-number"');
  expect(source).toContain('data-stylex-owner="user-profile-child-count-groups"');
  expect(source).not.toContain("no-border-at-child");
  expect(styleSource).toContain("issueSubtaskNumber:");
  expect(styleSource).toContain('fontSize: "12px"');
  expect(styleSource).toContain(
    "fontFamily: 'Monaco, Menlo, Consolas, \"Courier New\", monospace'",
  );
  expect(styleSource).toContain('minWidth: "22px"');
  expect(styleSource).toContain('issueChildCountGroups: { borderStyle: "none !important" }');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
  const row = page.locator('[data-stylex-owner="user-profile-issue-row"]');
  const toggle = page.locator("#toggle-show-subtasks");
  await expect(row.locator(".child-issue")).toHaveCount(0);
  await toggle.check();
  const children = row.locator(".child-issue");
  await expect(children).toHaveCount(2);
  await expect(children.nth(0)).toContainText("#8Open child issue - Child Assignee");
  await expect(children.nth(1)).toContainText("#9Closed child issue");
  await expect(children.nth(0).locator(".state-label")).toHaveClass(/open/);
  await expect(children.nth(1).locator(".state-label")).toHaveClass(/closed/);
  await expect(children.nth(0).locator('a[href$="/admin/sample/issue/8"]')).toHaveCount(1);
  await expect(children.nth(1).locator('a[href$="/admin/sample/issue/9"]')).toHaveCount(1);
  await expect(children.nth(0).locator('a[data-label-id="21"]')).toHaveText("child");

  const numbers = row.locator('[data-stylex-owner="user-profile-child-subtask-number"]');
  const countGroups = row.locator('[data-stylex-owner="user-profile-child-count-groups"]');
  await expect(numbers).toHaveCount(2);
  await expect(countGroups).toHaveCount(1);
  await expect(numbers.nth(0)).toHaveText("#8");
  await expect(numbers.nth(1)).toHaveText("#9");
  await expect(countGroups.locator(".comments-count")).toHaveCount(1);
  await expect(countGroups.locator(".vote-count")).toHaveCount(1);
  await expect(countGroups.locator('a[href$="/admin/sample/issue/8#comments"]')).toHaveCount(1);
  await expect(countGroups.locator('a[href$="/admin/sample/issue/8#vote"]')).toHaveCount(1);

  const measure = async () =>
    row.evaluate((node) => {
      const numbers = [
        ...node.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="user-profile-child-subtask-number"]',
        ),
      ];
      const groups = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-child-count-groups"]',
      );
      if (numbers.length !== 2 || !groups) throw new Error("Batch 963 owners missing");
      const boxes = [...numbers, groups].map((element) => element.getBoundingClientRect());
      return {
        numberFontSizes: numbers.map((element) => getComputedStyle(element).fontSize),
        numberDisplay: getComputedStyle(numbers[0]).display,
        numberMinWidth: getComputedStyle(numbers[0]).minWidth,
        numberMarginRight: getComputedStyle(numbers[0]).marginRight,
        numberFontFamily: getComputedStyle(numbers[0]).fontFamily,
        groupBorder: getComputedStyle(groups).borderTopStyle,
        contained: boxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
  expect(await measure()).toEqual({
    numberFontSizes: ["12px", "12px"],
    numberDisplay: "inline-block",
    numberMinWidth: "22px",
    numberMarginRight: "5px",
    numberFontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    groupBorder: "none",
    contained: true,
    scrollWidth: 1366,
  });

  for (const element of await children
    .locator('*:not([data-stylex-owner="user-profile-issue-label-background"])')
    .all()) {
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
  expect(await measure()).toEqual({
    numberFontSizes: ["12px", "12px"],
    numberDisplay: "inline-block",
    numberMinWidth: "22px",
    numberMarginRight: "5px",
    numberFontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    groupBorder: "none",
    contained: true,
    scrollWidth: 390,
  });
});
