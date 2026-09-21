import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
            childClosedCount: 1,
            childOpenCount: 2,
            parentIssueNumber: 4,
            parentIssueTitle: "Parent issue title",
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

test("authenticated public profile owns populated issue subtask layout residuals", async ({
  page,
}) => {
  const [
    source,
    _styleSource,
    scala,
    partialSubtask,
    pageLess,
    common,
    responsive,
    bootstrap,
    bootstrapResponsive,
    yobiLess,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/issue/partial_list_subtask.scala.html",
        import.meta.url,
      ),
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
  expect(partialSubtask).toContain('<div class="subtask-progress upload-progress');
  expect(partialSubtask).toContain("@percentage%;");
  expect(partialSubtask).toContain('<span class="subtask-progress completion-ratio');
  expect(partialSubtask).toContain('<span class="infos-item subtask">');
  expect(partialSubtask).toContain("routes.IssueApp.issue(parentIssue.project.owner");
  expect(pageLess).toContain(".for-subtask-progressbar {\n    padding-left: 5px;");
  expect(pageLess).toContain(
    ".subtask-progress {\n        display: inline-block;\n        width: 30px;\n        vertical-align: bottom;",
  );
  expect(pageLess).toContain(".completion-ratio {\n        font-size: 0.8em;");
  expect(pageLess).toContain(".subtask {\n        font-size: 0.8em;");
  expect(common).toContain(".fixed-height-my-issues-list");
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
  expect(messages).toContain("issue.state.open");
  for (const owner of [
    "user-profile-issue-subtask-progress-wrapper",
    "user-profile-issue-subtask-progress-shell",
    "user-profile-issue-subtask-completion-ratio",
    "user-profile-issue-subtask-parent",
    "user-profile-subtask-progress-bar",
  ]) {
    expect(source).toContain(`data-owner="${owner}"`);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const row = page.locator('[data-owner="user-profile-issue-row"]');
  const wrapper = row.locator('[data-owner="user-profile-issue-subtask-progress-wrapper"]');
  const shell = row.locator('[data-owner="user-profile-issue-subtask-progress-shell"]');
  const ratio = row.locator('[data-owner="user-profile-issue-subtask-completion-ratio"]');
  const parent = row.locator('[data-owner="user-profile-issue-subtask-parent"]');
  const bar = row.locator('[data-owner="user-profile-subtask-progress-bar"]');
  await expect(wrapper).toHaveCount(1);
  await expect(shell).toHaveCount(1);
  await expect(ratio).toHaveText("1/3");
  await expect(parent).toContainText("#4 Parent iss...");
  // Bucket-3 (wave 33): the app's legacy-parity restore (667398a04) retains
  // the subtask runtime classes — assert retention instead of absence.
  await expect(wrapper).toHaveClass(/\bfor-subtask-progressbar\b/u);
  await expect(shell).toHaveClass(
    /(?:^|\s)(?:subtask-progress|upload-progress|red-outline)(?:\s|$)/u,
  );
  await expect(shell).not.toHaveClass(/(?:^|\s)done-outline(?:\s|$)/u);
  await expect(ratio).toHaveClass(/(?:^|\s)(?:subtask-progress|completion-ratio)(?:\s|$)/u);
  await expect(ratio).not.toHaveClass(/(?:^|\s)txt-green(?:\s|$)/u);
  await expect(parent).not.toHaveClass(/(?:^|\s)(?:infos-item|subtask)(?:\s|$)/u);
  await expect(parent.locator('a[href$="/admin/sample/issue/4"]')).toHaveCount(1);
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveClass(/(?:^|\s)(?:bar|red)(?:\s|$)/u);
  await expect(bar).not.toHaveClass(/(?:^|\s)done(?:\s|$)/u);
  await expect(bar).toHaveAttribute("style", /--x-width:\s*33%/u);
  const desktop = await row.evaluate((node) => {
    const rowBox = node.getBoundingClientRect();
    const wrapper = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-progress-wrapper"]',
    );
    const shell = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-progress-shell"]',
    );
    const ratio = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-completion-ratio"]',
    );
    const parent = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-parent"]',
    );
    const bar = node.querySelector<HTMLElement>('[data-owner="user-profile-subtask-progress-bar"]');
    if (!wrapper || !shell || !ratio || !parent || !bar)
      throw new Error("Batch 961 owners missing");
    const shellStyle = getComputedStyle(shell);
    const ratioStyle = getComputedStyle(ratio);
    const parentStyle = getComputedStyle(parent);
    const shellBox = shell.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    return {
      wrapperPaddingLeft: getComputedStyle(wrapper).paddingLeft,
      shellDisplay: shellStyle.display,
      shellWidth: shellStyle.width,
      shellVerticalAlign: shellStyle.verticalAlign,
      ratioFontSize: ratioStyle.fontSize,
      parentFontSize: parentStyle.fontSize,
      barWidth: barBox.width,
      shellContained: shellBox.left >= rowBox.left - 1 && shellBox.right <= rowBox.right + 1,
      barContained: barBox.left >= shellBox.left - 1 && barBox.right <= shellBox.right + 1,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    wrapperPaddingLeft: "5px",
    shellDisplay: "inline-block",
    shellWidth: "30px",
    shellVerticalAlign: "bottom",
    ratioFontSize: "10.4px",
    parentFontSize: "10.4px",
    barWidth: expect.any(Number),
    shellContained: true,
    barContained: true,
    scrollWidth: 1366,
  });
  expect(desktop.barWidth).toBeGreaterThan(0);
  expect(desktop.barWidth).toBeLessThanOrEqual(30);

  for (const element of await wrapper.locator("*").all()) {
    if ((await element.getAttribute("data-owner")) !== "user-profile-subtask-progress-bar") {
      await expect(element).not.toHaveAttribute("style");
    }
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
    const wrapperBox = element.getBoundingClientRect();
    const shell = element.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-progress-shell"]',
    );
    const ratio = element.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-completion-ratio"]',
    );
    const parent = element.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-subtask-parent"]',
    );
    if (!shell || !ratio || !parent) throw new Error("Batch 961 mobile owners missing");
    return {
      paddingLeft: getComputedStyle(element).paddingLeft,
      shellDisplay: getComputedStyle(shell).display,
      shellWidth: getComputedStyle(shell).width,
      ratioFontSize: getComputedStyle(ratio).fontSize,
      parentFontSize: getComputedStyle(parent).fontSize,
      contained: wrapperBox.left >= 0 && wrapperBox.right <= window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    paddingLeft: "5px",
    shellDisplay: "inline-block",
    shellWidth: "30px",
    ratioFontSize: "10.4px",
    parentFontSize: "10.4px",
    contained: false,
    scrollWidth: 390,
    viewportWidth: 390,
  });
});
