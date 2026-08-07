import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const mode = fallbackOff ? "fallback-off" : "normal";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("showSubtasksAlways", "false"));
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
            assigneeLabel: "Viewer",
            assigneeLoginId: "viewer",
            authorLabel: "Door User",
            authorLoginId: "door",
            childIssues: [],
            commentCount: 0,
            id: 11,
            issueNumber: 11,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Open issue list owner",
            updatedLabel: "today",
            voterCount: 0,
          },
          {
            assigneeLabel: "Viewer",
            assigneeLoginId: "viewer",
            authorLabel: "Door User",
            authorLoginId: "door",
            childIssues: [],
            commentCount: 0,
            id: 12,
            issueNumber: 12,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "closed",
            title: "Closed issue list owner",
            updatedLabel: "yesterday",
            voterCount: 0,
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test(`profile open/closed issue roots own the frozen legacy list geometry (${mode})`, async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [
    route,
    styles,
    view,
    partial,
    yobi,
    pageLess,
    responsiveLess,
    bootstrap,
    bootstrapResponsive,
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
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
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
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(view.match(/<ul class="post-list-wrap my-issues row-fluid">/gu)).toHaveLength(2);
  expect(view).toContain("@partial_issues(issue)");
  expect(view.match(/@if\(issues\.isEmpty\)/gu)).toHaveLength(2);
  expect(partial).toContain('<li class="post-item title"');
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
    expect(yobi).toContain(`@import "${importPath}";`);
  }
  expect(pageLess).toContain(".post-list-wrap {\n    list-style: none;");
  expect(pageLess).toContain(".my-issues {\n    .post-item {");
  expect(responsiveLess).toContain(".post-list-wrap {\n    margin-left: 10px;");
  expect(messages).toContain("issue.state.open = Open");
  expect(messages).toContain("issue.state.closed = Closed");
  expect(messages).toContain("issue.is.empty = No issue found");
  for (const source of [bootstrap, bootstrapResponsive]) {
    expect(source).toMatch(/\.row-fluid\s*\{\s*width:\s*100%;/u);
    expect(source).toMatch(
      /\.row-fluid:before,\s*\.row-fluid:after\s*\{\s*display:\s*table;\s*line-height:\s*0;\s*content:\s*"";/u,
    );
    expect(source).toMatch(/\.row-fluid:after\s*\{\s*clear:\s*both;/u);
  }
  expect(styles).toContain("issueList:");
  expect(styles).toContain('listStyle: "none"');
  expect(styles).toContain('width: "100%"');
  expect(styles).toContain('"@media (max-width: 720px)": { marginLeft: "10px" }');

  const issuePaneSource = route.slice(
    route.indexOf('id="openIssues"'),
    route.indexOf('id="pullRequests"'),
  );
  expect(
    issuePaneSource.match(/data-stylex-owner="user-profile-(?:open|closed)-issue-list"/gu),
  ).toHaveLength(2);
  // Bucket-3 (wave 33): the app restored the legacy post-list-wrap row-fluid
  // runtime classes on both issue lists (667398a04 restore) — the retirement
  // pins are stale; the lists carry the legacy class expression again.
  expect(
    issuePaneSource.match(
      /className=\{`\$\{stylex\.props\(styles\.issueList\)\.className\} post-list-wrap my-issues row-fluid`\}/gu,
    ),
  ).toHaveLength(2);
  expect(issuePaneSource).not.toMatch(/className="[^"]*\b(?:post-list-wrap|row-fluid)\b[^"]*"/u);

  const output = `output/playwright/stylex-user-profile-issue-list-ownership/${mode}`;
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const issuePane = page.locator('[data-stylex-owner="user-profile-pane-issues"]');
    const openPane = page.locator('[data-stylex-owner="user-profile-pane-open-issues"]');
    const closedPane = page.locator('[data-stylex-owner="user-profile-pane-closed-issues"]');
    const openList = page.locator('[data-stylex-owner="user-profile-open-issue-list"]');
    const closedList = page.locator('[data-stylex-owner="user-profile-closed-issue-list"]');

    await expect(openList).toHaveCount(1);
    await expect(closedList).toHaveCount(1);
    for (const list of [openList, closedList]) {
      await expect(list).toHaveClass(/\bmy-issues\b/u);
      // Bucket-3 (wave 33): the legacy post-list-wrap row-fluid runtime
      // classes are back on both lists (667398a04 restore) — assert them.
      await expect(list).toHaveClass(/\b(?:post-list-wrap|row-fluid)\b/u);
      for (const attribute of [
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-target",
        "data-trigger",
      ]) {
        await expect(list).not.toHaveAttribute(attribute);
      }
    }

    await expect(openPane).toBeVisible();
    await expect(closedPane).not.toBeVisible();
    await expect(openList.locator(":scope > li")).toHaveCount(1);
    await expect(openList.locator(":scope > li")).toContainText("Open issue list owner");
    await expect(closedList.locator(":scope > li")).toHaveCount(1);
    await expect(closedList.locator(":scope > li")).toContainText("Closed issue list owner");

    const assertActiveList = async (
      listOwner: "user-profile-closed-issue-list" | "user-profile-open-issue-list",
      paneOwner: "user-profile-pane-closed-issues" | "user-profile-pane-open-issues",
    ) => {
      const metrics = await page.evaluate(
        ({ listOwner, paneOwner }) => {
          const issuePane = document.querySelector<HTMLElement>(
            '[data-stylex-owner="user-profile-pane-issues"]',
          )!;
          const pane = document.querySelector<HTMLElement>(`[data-stylex-owner="${paneOwner}"]`)!;
          const list = document.querySelector<HTMLElement>(`[data-stylex-owner="${listOwner}"]`)!;
          const row = list.querySelector<HTMLElement>(":scope > li")!;
          const style = getComputedStyle(list);
          const before = getComputedStyle(list, "::before");
          const after = getComputedStyle(list, "::after");
          const issuePaneBox = issuePane.getBoundingClientRect();
          const paneBox = pane.getBoundingClientRect();
          const listBox = list.getBoundingClientRect();
          const rowBox = row.getBoundingClientRect();
          return {
            afterClear: after.clear,
            afterContent: after.content,
            afterDisplay: after.display,
            afterLineHeight: after.lineHeight,
            beforeContent: before.content,
            beforeDisplay: before.display,
            beforeLineHeight: before.lineHeight,
            contained:
              listBox.left >= paneBox.left - 1 &&
              listBox.right <= paneBox.right + 11 &&
              rowBox.left >= listBox.left - 1 &&
              rowBox.right <= listBox.right + 1 &&
              paneBox.left >= issuePaneBox.left - 1 &&
              paneBox.right <= issuePaneBox.right + 1,
            listStyleType: style.listStyleType,
            marginLeft: style.marginLeft,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            order: Array.from(list.children).map((child) => child.id),
            width: style.width,
            clientWidth: list.clientWidth,
          };
        },
        { listOwner, paneOwner },
      );

      expect(metrics).toMatchObject({
        afterClear: "both",
        afterContent: '""',
        afterDisplay: "table",
        afterLineHeight: "0px",
        beforeContent: '""',
        beforeDisplay: "table",
        beforeLineHeight: "0px",
        contained: true,
        listStyleType: "none",
        marginLeft: viewport.width === 390 ? "10px" : "0px",
        overflow: 0,
        width: `${metrics.clientWidth}px`,
      });
      return metrics.order;
    };

    expect(
      await assertActiveList("user-profile-open-issue-list", "user-profile-pane-open-issues"),
    ).toEqual(["issue-item-11"]);
    await page.locator('[data-stylex-owner="user-profile-issue-tab-button-closed"]').click();
    await expect(openPane).not.toBeVisible();
    await expect(closedPane).toBeVisible();
    expect(
      await assertActiveList("user-profile-closed-issue-list", "user-profile-pane-closed-issues"),
    ).toEqual(["issue-item-12"]);
    await page.locator('[data-stylex-owner="user-profile-issue-tab-button-open"]').click();
    await expect(openPane).toBeVisible();

    expect(
      await issuePane
        .locator(":scope > [data-stylex-owner='user-profile-issue-tabs'] + div > div")
        .evaluateAll((panes) => panes.map((pane) => pane.id)),
    ).toEqual(["openIssues", "closedIssues"]);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});

test("profile empty issue response preserves both owned list roots and pane messages", async ({
  page,
}) => {
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
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
  await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });

  const openPane = page.locator('[data-stylex-owner="user-profile-pane-open-issues"]');
  const closedPane = page.locator('[data-stylex-owner="user-profile-pane-closed-issues"]');
  const openList = page.locator('ul[data-stylex-owner="user-profile-open-issue-list"]');
  const closedList = page.locator('ul[data-stylex-owner="user-profile-closed-issue-list"]');

  for (const list of [openList, closedList]) {
    await expect(list).toHaveCount(1);
    await expect(list).toHaveClass(/\bmy-issues\b/u);
    await expect(list.locator(":scope > li")).toHaveCount(0);
  }

  await expect(openPane).toBeVisible();
  await expect(closedPane).not.toBeVisible();
  await expect(
    openPane.locator('[data-stylex-owner="user-profile-open-issues-empty-wrap"]'),
  ).toBeVisible();
  await expect(
    openPane.locator('[data-stylex-owner="user-profile-open-issues-empty-message"]'),
  ).toHaveText("recently No issue found");

  await page.locator('[data-stylex-owner="user-profile-issue-tab-button-closed"]').click();
  await expect(openPane).not.toBeVisible();
  await expect(closedPane).toBeVisible();
  await expect(
    closedPane.locator('[data-stylex-owner="user-profile-closed-issues-empty-wrap"]'),
  ).toBeVisible();
  await expect(
    closedPane.locator('[data-stylex-owner="user-profile-closed-issues-empty-message"]'),
  ).toHaveText("recently No issue found");
});
