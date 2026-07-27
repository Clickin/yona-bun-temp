import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-issues-quicksearch-count-floats",
  fallbackMode,
);
const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");
const routeSource = readSource("../src/routes/$ownerName/$projectName/issues.tsx");
const styleSource = readSource("../src/routes/$ownerName/$projectName/-issues.stylex.ts");
const legacyListSource = readSource("../../yona-original/app/views/issue/list.scala.html");
const legacyWrapSource = readSource(
  "../../yona-original/app/views/issue/partial_list_wrap.scala.html",
);
const legacyQuickSearchSource = readSource(
  "../../yona-original/app/views/issue/partial_list_quicksearch.scala.html",
);
const legacySearchFormSource = readSource(
  "../../yona-original/app/views/issue/partial_searchform.scala.html",
);
const legacyYobiSource = readSource("../../yona-original/app/assets/stylesheets/yobi.less");
const legacyBootstrapSource = readSource("../../yona-original/public/bootstrap/css/bootstrap.css");
const legacyBootstrapResponsiveSource = readSource(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
);
const legacyTemporaryLessSource = readSource(
  "../../yona-original/app/assets/stylesheets/less/_temporary.less",
);
const legacyIssueListJsSource = readSource(
  "../../yona-original/public/javascripts/service/yobi.issue.List.js",
);
const legacyMessagesSource = readSource("../../yona-original/conf/messages");
const yobiLessImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
] as const;
const owners = [
  { name: "project-issues-quicksearch-all-count", count: 8 },
  { name: "project-issues-quicksearch-assigned-count", count: 3 },
  { name: "project-issues-quicksearch-authored-count", count: 2 },
  { name: "project-issues-quicksearch-commented-count", count: 1 },
] as const;

test.use({ locale: "en-US" });

test("project issue quick-search count owners preserve legacy evidence", () => {
  expect(legacyListSource).toContain("@partial_list_wrap(title, currentPage, param, project)");
  expect(legacyWrapSource).toContain('<div pjax-container class="row-fluid issue-list-wrap">');
  expect(legacyWrapSource).toContain("@partial_list_quicksearch(param, project)");
  expect(legacyWrapSource).toContain("@partial_searchform(param, project)");
  expect(legacyQuickSearchSource).toContain('<ul class="lst-stacked unstyled">');
  expect(legacyQuickSearchSource.match(/<span class="num-badge pull-right">/gu) ?? []).toHaveLength(
    4,
  );
  expect(legacySearchFormSource).toContain('<form id="search" name="search"');
  expect(legacySearchFormSource).toContain('data-search="commenterId"');

  for (const imported of yobiLessImports) {
    expect(legacyYobiSource).toContain(`@import "less/${imported}"`);
    expect(readSource(`../../yona-original/app/assets/stylesheets/less/${imported}`)).not.toBe("");
  }
  expect(legacyTemporaryLessSource).toContain(".lst-stacked");
  expect(legacyTemporaryLessSource).toContain(".num-badge { padding:0 2px; }");
  expect(legacyBootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;/u);
  expect(legacyBootstrapResponsiveSource).toContain(".pull-right");
  for (const message of [
    "issue.list.all.open = Open",
    "issue.list.assignedToMe = Assigned",
    "issue.list.authoredByMe = Created",
    "issue.list.commentedByMe = Commented",
  ]) {
    expect(legacyMessagesSource).toContain(message);
  }
  expect(legacyIssueListJsSource).toContain("a[pjax-filter]");
  expect(legacyIssueListJsSource).toContain("_onClickSearchFilter");
  expect(legacyIssueListJsSource).toContain("welSearchForm.submit();");

  expect(routeSource).not.toContain('className="num-badge pull-right"');
  expect(routeSource).toContain("styles.quickSearchCount");
  expect(styleSource).toContain('quickSearchCount: { float: "right" }');
  expect(routeSource).toContain('data-assignee-id=""');
  expect(routeSource).toContain('data-author-id=""');
  expect(routeSource).toContain('data-commenter-id=""');
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner.name}"`);
  }
});

test(`project issue quick-search counts preserve float, interaction, and responsive parity (${fallbackMode})`, async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await mockProjectIssues(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });

    const quickSearch = page.locator(".lst-stacked");
    await expect(quickSearch).toBeVisible();
    await expect(quickSearch.locator("li")).toHaveCount(4);
    for (const owner of owners) {
      const count = page.locator(`[data-stylex-owner="${owner.name}"]`);
      await expect(count).toHaveCount(1);
      await expect(count).toHaveText(String(owner.count));
      await expect(count).toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);
      await expect(count).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
      await expect(count).toHaveCSS("float", "right");
      await expect(count).not.toHaveAttribute("style");
      await expect(count.locator("xpath=..")).toHaveAttribute("type", "button");
    }

    const attributes = await quickSearch.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => ({
        assigneeId: button.getAttribute("data-assignee-id"),
        authorId: button.getAttribute("data-author-id"),
        commenterId: button.getAttribute("data-commenter-id"),
        milestoneId: button.getAttribute("data-milestone-id"),
      })),
    );
    expect(attributes).toEqual([
      { assigneeId: "", authorId: "", commenterId: "", milestoneId: "" },
      { assigneeId: "1", authorId: "", commenterId: "", milestoneId: "" },
      { assigneeId: "", authorId: "1", commenterId: "", milestoneId: "" },
      { assigneeId: "", authorId: "", commenterId: "1", milestoneId: "" },
    ]);

    const geometry = await page.evaluate(
      (ownerNames) => {
        const sidebar = document.querySelector<HTMLElement>(".left-menu");
        const sidebarBox = sidebar?.getBoundingClientRect();
        const countBoxes = ownerNames.map((name) => {
          const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`);
          const box = element?.getBoundingClientRect();
          return box ? { left: box.left, right: box.right } : null;
        });
        return {
          bodyScrollWidth: document.body.scrollWidth,
          countBoxes,
          documentScrollWidth: document.documentElement.scrollWidth,
          sidebar: sidebarBox ? { left: sidebarBox.left, right: sidebarBox.right } : null,
        };
      },
      owners.map((owner) => owner.name),
    );
    expect(geometry.sidebar).not.toBeNull();
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    for (const box of geometry.countBoxes) {
      expect(box).not.toBeNull();
      expect(box!.left).toBeGreaterThanOrEqual(geometry.sidebar!.left);
      expect(box!.right).toBeLessThanOrEqual(geometry.sidebar!.right);
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });
  for (const filter of [
    { key: "assigneeId", owner: owners[1].name, value: "1" },
    { key: "authorId", owner: owners[2].name, value: "1" },
    { key: "commenterId", owner: owners[3].name, value: "1" },
    { key: "all", owner: owners[0].name, value: "" },
  ] as const) {
    const count = page.locator(`[data-stylex-owner="${filter.owner}"]`);
    await count.locator("xpath=..").click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get(filter.key))
      .toBe(filter.value || null);
    const search = new URL(page.url()).searchParams;
    expect(search.get("state")).toBe("open");
    for (const key of ["assigneeId", "authorId", "commenterId"]) {
      expect(search.get(key)).toBe(key === filter.key ? filter.value : null);
    }
    await expect(count.locator("xpath=../..")).toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  }
});

async function mockProjectIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [], total: 0 } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        assignedToMeCount: 3,
        authoredByMeCount: 2,
        closedIssueCount: 4,
        commentedByMeCount: 1,
        draftItems: [],
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorUserId: 1,
            commentCount: 2,
            createdLabel: "Jul 23, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 42,
            issueNumber: 11,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "First populated issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 8,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
}
