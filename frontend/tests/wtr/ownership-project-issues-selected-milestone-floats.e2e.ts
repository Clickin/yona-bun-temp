import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-issues-selected-milestone-floats",
  fallbackMode,
);
const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");
const routeSource = readSource("../src/routes/$ownerName/$projectName/issues.tsx");
const styleSource = readSource("../src/app.css");
const legacyListSource = readSource("../../yona-original/app/views/issue/list.scala.html");
const legacyWrapSource = readSource(
  "../../yona-original/app/views/issue/partial_list_wrap.scala.html",
);
const legacySearchFormSource = readSource(
  "../../yona-original/app/views/issue/partial_searchform.scala.html",
);
const legacySelectLabelSource = readSource(
  "../../yona-original/app/views/issue/partial_select_label.scala.html",
);
const legacyMilestoneStatusSource = readSource(
  "../../yona-original/app/views/milestone/partial_status.scala.html",
);
const legacyYobiSource = readSource("../../yona-original/app/assets/stylesheets/yobi.less");
const legacyBootstrapSource = readSource("../../yona-original/public/bootstrap/css/bootstrap.css");
const legacyBootstrapResponsiveSource = readSource(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
);
const legacyMessagesSource = readSource("../../yona-original/conf/messages");
const legacyIssueListJsSource = readSource(
  "../../yona-original/public/javascripts/service/yobi.issue.List.js",
);
const legacyLessFiles = [
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

const owners = {
  labelManage: "project-issues-label-manage-action",
  milestoneCount: "project-issues-milestone-progress-count",
} as const;

test.use({ locale: "en-US" });

test("selected milestone float owners preserve legacy source and React ownership", () => {
  expect(legacyListSource).toContain("@partial_list_wrap(title, currentPage, param, project)");
  expect(legacyWrapSource).toContain('<div pjax-container class="row-fluid issue-list-wrap">');
  expect(legacyWrapSource).toContain("@partial_searchform(param, project)");
  expect(legacySearchFormSource).toContain('<form id="search" name="search"');
  expect(legacySearchFormSource).toContain(
    "@views.html.milestone.partial_status(milestone, project)",
  );
  expect(legacySearchFormSource).toContain(
    '<a href="@routes.IssueLabelApp.labelsForm(project.owner, project.name)" class="ybtn ybtn-default ybtn-mini pull-right">',
  );
  expect(legacySelectLabelSource).toContain('data-search="labelIds"');
  expect(legacyMilestoneStatusSource).toContain('<div class="progress-info">');
  expect(legacyMilestoneStatusSource).toContain('<span class="pull-right">');
  expect(legacyMilestoneStatusSource).toContain('<div class="meta-info">');

  for (const lessFile of legacyLessFiles) {
    expect(legacyYobiSource).toContain(`@import "less/${lessFile}"`);
    expect(readSource(`../../../yona-original/app/assets/stylesheets/less/${lessFile}`)).not.toBe(
      "",
    );
  }
  expect(readSource("../../yona-original/app/assets/stylesheets/less/_page.less")).toContain(
    ".milestone-info",
  );
  expect(readSource("../../yona-original/app/assets/stylesheets/less/_page.less")).toContain(
    ".labels-wrap",
  );
  expect(readSource("../../yona-original/app/assets/stylesheets/less/_yobiUI.less")).toContain(
    ".ybtn-mini",
  );
  expect(readSource("../../yona-original/app/assets/stylesheets/less/_common.less")).toContain(
    ".page-navigation-wrap",
  );
  expect(readSource("../../yona-original/app/assets/stylesheets/less/_responsive.less")).toContain(
    "max-width: 720px",
  );
  expect(legacyBootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;/u);
  expect(legacyBootstrapResponsiveSource).toContain(".pull-right");

  for (const message of [
    "label.manage = Manage label",
    "label.dueDate = Due Date",
    "milestone.state.open = Open",
    "milestone.state.closed = Closed",
  ]) {
    expect(legacyMessagesSource).toContain(message);
  }
  expect(legacyIssueListJsSource).toContain("[data-search]");
  expect(legacyIssueListJsSource).toContain("welSearchForm.submit();");

  expect(routeSource).not.toContain('className="ybtn ybtn-default ybtn-mini pull-right"');
  expect(routeSource).not.toContain('<span className="pull-right">');

  expect(routeSource).toContain(`data-owner="${owners.labelManage}"`);
  expect(routeSource).toContain(`data-owner="${owners.milestoneCount}"`);
});

test(`selected milestone float owners preserve desktop/mobile geometry and interaction (${fallbackMode})`, async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await mockSelectedMilestone(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issues?milestoneId=5`, { waitUntil: "commit" });

    const labelManage = page.locator(`[data-owner="${owners.labelManage}"]`);
    const milestoneCount = page.locator(`[data-owner="${owners.milestoneCount}"]`);
    await expect(labelManage).toHaveCount(1);
    await expect(milestoneCount).toHaveCount(1);
    await expect(labelManage).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(labelManage).toHaveClass(/(?:^|\s)ybtn-default(?:\s|$)/u);
    await expect(labelManage).toHaveClass(/(?:^|\s)ybtn-mini(?:\s|$)/u);
    await expect(labelManage).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
    await expect(milestoneCount).toHaveText("1 / 2");
    await expect(milestoneCount).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);

    for (const owner of [labelManage, milestoneCount]) {
      await expect(owner).toHaveCSS("float", "right");
      await expect(owner).not.toHaveAttribute("style");
      for (const attribute of [
        "data-action",
        "data-dismiss",
        "data-format",
        "data-target",
        "data-toggle",
        "data-url",
      ]) {
        await expect(owner).not.toHaveAttribute(attribute);
      }
    }

    const milestone = page.locator(".milestone-info");
    await expect(milestone).toHaveCount(1);
    await expect(milestone.locator(".meta-info .title")).toHaveText("Selected milestone");
    await expect(milestone.locator(".due-date")).toContainText("Due Date");
    await expect(milestone.locator(".due-date strong")).toHaveText("Jul 31, 2026");
    await expect(milestone.locator(".date")).toHaveText("(7 days left)");
    await expect(milestone.locator(".progress-info strong")).toHaveText("1 / 2");
    await expect(milestone.locator(".progress-info").locator("xpath=./span")).toHaveAttribute(
      "data-owner",
      owners.milestoneCount,
    );

    if (viewport.name === "desktop") {
      await expect(milestone).toBeVisible();
      await expect(labelManage).toBeVisible();
    }

    const milestoneHref = await milestone.locator(".meta-info .title").getAttribute("href");
    expect(milestoneHref).toContain(`${basePath}/admin/sample/milestone/5`);
    const labelManageHref = await labelManage.getAttribute("href");
    expect(labelManageHref).toContain(`${basePath}/admin/sample/issue/labelsform`);

    const geometry = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(".left-menu");
      const sidebarBox = sidebar?.getBoundingClientRect();
      const ownersToMeasure = [
        "project-issues-label-manage-action",
        "project-issues-milestone-progress-count",
      ];
      return {
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        ownerBoxes: ownersToMeasure.map((owner) => {
          const element = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
          const box = element?.getBoundingClientRect();
          return box
            ? { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
            : null;
        }),
        sidebar: sidebarBox
          ? {
              bottom: sidebarBox.bottom,
              left: sidebarBox.left,
              right: sidebarBox.right,
              top: sidebarBox.top,
            }
          : null,
      };
    });
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    if (viewport.name === "desktop") {
      expect(geometry.sidebar).not.toBeNull();
      for (const box of geometry.ownerBoxes) {
        expect(box).not.toBeNull();
        expect(box!.left).toBeGreaterThanOrEqual(geometry.sidebar!.left);
        expect(box!.right).toBeLessThanOrEqual(geometry.sidebar!.right);
      }
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    if (viewport.name === "desktop") {
      await expect(labelManage).toBeVisible();
      await expect(labelManage).toHaveAttribute("href", /\/admin\/sample\/issue\/labelsform/u);
      await Promise.all([
        page.waitForURL((url) => url.pathname.endsWith("/admin/sample/issue/labelsform")),
        labelManage.click(),
      ]);
      expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issue/labelsform`);
    }
  }
});

async function mockSelectedMilestone(page: Page) {
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
        viewerCanCreateIssueLabel: true,
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) => {
    const state = new URL(route.request().url()).searchParams.get("state");
    route.fulfill({
      contentType: "application/json",
      json: {
        milestones:
          state === "closed"
            ? []
            : [
                {
                  closedIssueCount: 1,
                  completionPercent: 50,
                  dueDateLabel: "Jul 31, 2026",
                  dueDateOverdue: false,
                  id: 5,
                  openIssueCount: 1,
                  openIssues: [],
                  state: "open",
                  title: "Selected milestone",
                  untilLabel: "7 days left",
                },
              ],
      },
    });
  });
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
        assignedToMeCount: 1,
        authoredByMeCount: 1,
        closedIssueCount: 1,
        commentedByMeCount: 1,
        draftItems: [],
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorUserId: 1,
            commentCount: 0,
            createdLabel: "Jul 23, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 42,
            issueNumber: 11,
            labels: [],
            milestoneId: 5,
            milestoneTitle: "Selected milestone",
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Issue in selected milestone",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
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
