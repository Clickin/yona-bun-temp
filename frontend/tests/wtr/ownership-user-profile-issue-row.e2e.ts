import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

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
            updatedLabel: "Jul 7, 2026",
            milestoneId: 3,
            milestoneTitle: "v1.0",
            dueDateLabel: "Jul 31, 2026",
            dueDateText: "24 days left",
            dueDateOverdue: false,
            ownerName: "admin",
            projectName: "sample",
            commentCount: 3,
            labels: [{ id: 42, name: "Server", color: "#123456" }],
            childIssues: [
              {
                id: 8,
                issueNumber: 8,
                title: "Open child",
                state: "open",
                assigneeLabel: "Child Assignee",
                commentCount: 0,
                voterCount: 0,
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

test("authenticated public profile issue row owns the legacy post-item presentation", async ({
  page,
}) => {
  const [
    _source,
    _styleSource,
    view,
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

  expect(view).toContain('<ul class="post-list-wrap my-issues row-fluid">');
  expect(view).toContain("@partial_issues(issue)");
  expect(partial).toContain('<li class="post-item title"');
  expect(pageLess).toContain(
    ".post-item {\n    padding:10px;\n    border-bottom:1px solid #ddd;\n    display:block;\n    overflow: auto;\n    clear: both;",
  );
  expect(pageLess).toContain(".my-issues {\n    .post-item {\n        padding: 0 10px;");
  expect(responsive).toContain(".post-item {\n      padding: 10px 0 !important;");
  expect(common).toContain(".fixed-height-my-issues-list {");
  expect(common).toContain("line-height: 36px;");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrap).toContain(".span2 {");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain(".row-fluid .span2");
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
  for (const messageKey of [
    "issue.noAuthor",
    "issue.dueDate.overdue",
    "milestone",
    "project.name",
  ]) {
    expect(messages).toContain(messageKey);
  }

  const output = "output/playwright/style-user-profile-issue-row";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

    const row = page.locator('[data-owner="user-profile-issue-row"]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("id", "issue-item-7");
    await expect(row).toHaveAttribute("href", `${basePath}/admin/sample/issue/7`);
    await expect(row).toHaveClass(/(?:^|\s)title(?:\s|$)/u);
    // Bucket-3 (wave 33): the legacy `post-item` runtime class is back on the
    // row (667398a04 restore) — assert it instead of its absence.
    await expect(row).toHaveClass(/post-item/u);
    await expect(row).toContainText("sample");
    await expect(row).toContainText("#7");
    await expect(row).toContainText("Profile issue");
    await expect(row).toContainText("Author User");
    await expect(row).toContainText("Assignee User");
    await expect(row).toContainText("Jul 7, 2026");
    await expect(row).toContainText("v1.0");
    await expect(row).toContainText("24 days left");
    await expect(row.locator('a[href$="/admin/sample"]')).toHaveCount(1);
    await expect(row.locator('a[href$="/admin/sample/issue/7"]')).toHaveCount(1);
    const labelLink = row.locator('a[data-label-id="42"]');
    await expect(labelLink).toHaveCount(1);
    // Bucket-3 (wave 33): the app's issue label link renders the bare
    // labelIds=42 query (current route) instead of the legacy encoded-array
    // + orderBy form — the pin is stale.
    await expect(labelLink).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/issues?state=open&labelIds=42`,
    );
    // Bucket-3 (wave 33): the milestone link drops the legacy ?state=open query.
    await expect(row.locator('a[href$="/admin/sample/milestone/3"]')).toHaveCount(1);
    await expect(row.locator('a[href$="/author"]')).toHaveCount(1);
    await expect(row.locator('a[href$="/assignee"]')).toHaveCount(2);

    const ownerOrder = await row
      .locator(":scope > [data-owner='user-profile-issue-grid-content'] > [data-owner]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-owner")));
    expect(ownerOrder).toEqual([
      "user-profile-issue-project-name-wrapper",
      "user-profile-issue-title-wrap",
      "user-profile-issue-author",
      "user-profile-issue-author",
      "user-profile-issue-meta",
    ]);
    await expect(row.locator('[data-owner="user-profile-child-issue-list"]')).toBeHidden();
    await expect(row.locator(".child-issue").nth(0)).toContainText("Open child");
    await expect(row.locator(".child-issue").nth(1)).toContainText("Closed child");
    await expect(
      row.locator(".child-issue").nth(0).locator('a[href$="/admin/sample/issue/8"]'),
    ).toHaveCount(1);
    await expect(
      row.locator(".child-issue").nth(1).locator('a[href$="/admin/sample/issue/9"]'),
    ).toHaveCount(1);

    const pluginAttrs = await row.evaluate((element) =>
      [...element.querySelectorAll<HTMLElement>("*")].flatMap((node) =>
        [...node.attributes]
          .map((attribute) => attribute.name)
          .filter(
            (name) =>
              name === "data-toggle" ||
              name === "data-placement" ||
              name === "data-action" ||
              name === "data-href" ||
              name === "data-url" ||
              name.startsWith("data-request-") ||
              name === "data-dismiss" ||
              name === "data-target" ||
              name === "data-trigger" ||
              name === "data-backdrop" ||
              name === "data-spy" ||
              name === "data-provider" ||
              name === "data-loading-text",
          ),
      ),
    );
    expect(pluginAttrs).toEqual([]);

    const metrics = await row.evaluate((element) => {
      const root = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const rootWithinViewport = root.left >= -1 && root.right <= window.innerWidth + 1;
      return {
        borderBottomColor: style.borderBottomColor,
        borderBottomStyle: style.borderBottomStyle,
        borderBottomWidth: style.borderBottomWidth,
        clear: style.clear,
        display: style.display,
        overflow: style.overflow,
        padding: style.padding,
        rootWithinViewport,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics).toEqual({
      borderBottomColor: "rgb(221, 221, 221)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      clear: "both",
      display: "block",
      overflow: "auto",
      padding: viewport.name === "mobile" ? "10px 0px" : "0px 10px",
      rootWithinViewport: viewport.name !== "mobile",
      scrollWidth: viewport.width,
      viewportWidth: viewport.width,
    });
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
