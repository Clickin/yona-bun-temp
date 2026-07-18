import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const BUG_LABEL_STYLE = "background:rgb(81,170,204)";

const EXPECTED_MILESTONES_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="tab-wrap"><div class="pull-right btns"><a href="__BASE_PATH__/admin/sample/newMilestoneForm" class="ybtn ybtn-success">New milestone</a></div><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/milestones?state=open">Open</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=closed">Closed</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=all">All</a></li></ul></div><div class="filter-wrap milestone"><div class="filters"><a href="__BASE_PATH__/admin/sample/milestones?orderBy=dueDate&amp;orderDir=desc&amp;state=open" class="filter active"><i class="ico btn-gray-arrow "></i>Due Date</a><a href="__BASE_PATH__/admin/sample/milestones?orderBy=completionRate&amp;orderDir=asc&amp;state=open" class="filter"><i class="ico btn-gray-arrow"></i>Completion Rate</a></div><div class="pull-left search search-bar"><input name="filter" class="textbox" type="text" placeholder="Search" value=""><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div><div class="row-fluid"><div><ul class="milestones"><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/5" class="milestone-name">v1.0</a><span class="sp">|</span><span class="issue-item">1 / 2</span><span class="sp">|</span><span class="due-date over">Due Date<strong>2026-06-30</strong><span class="date">(Overdue)</span></span><div class="pull-right"><span class="number completion-rate">50 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:50%"></div></div></div></div><div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/11" target="_blank"><div class="issue-item"><span class="state-label open"></span><span class="item-name"><span class="number">#11</span>Open milestone issue - Dev Member<span class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</span></span></div></a></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/12" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#12</span>Closed milestone issue<span class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</span></span></div></a></div></div></li><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/6" class="milestone-name">v2.0</a><span class="sp">|</span><span class="issue-item">0 / 0</span><span class="sp">|</span><span class="due-date ">Due Date<strong>2026-08-31</strong><span class="date">(D-61)</span></span><div class="pull-right"><span class="number completion-rate"></span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:0%"></div></div></div></div><div><div></div><div></div><div></div><div></div></div></li></ul></div></div></div></div>
`;

const EXPECTED_MILESTONES_ALL_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="tab-wrap"><div class="pull-right btns"><a href="__BASE_PATH__/admin/sample/newMilestoneForm" class="ybtn ybtn-success">New milestone</a></div><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=open">Open</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=closed">Closed</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/milestones?state=all">All</a></li></ul></div><div class="filter-wrap milestone"><div class="filters"><a href="__BASE_PATH__/admin/sample/milestones?orderBy=dueDate&amp;orderDir=desc&amp;state=all" class="filter active"><i class="ico btn-gray-arrow "></i>Due Date</a><a href="__BASE_PATH__/admin/sample/milestones?orderBy=completionRate&amp;orderDir=asc&amp;state=all" class="filter"><i class="ico btn-gray-arrow"></i>Completion Rate</a></div><div class="pull-left search search-bar"><input name="filter" class="textbox" type="text" placeholder="Search" value=""><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div><div class="row-fluid"><div><ul class="milestones"><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/5" class="milestone-name">v1.0</a><span class="sp">|</span><span class="issue-item">1 / 2</span><span class="sp">|</span><span class="state nm open">Open</span><span class="sp">|</span><span class="due-date over">Due Date<strong>2026-06-30</strong><span class="date">(Overdue)</span></span><div class="pull-right"><span class="number completion-rate">50 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:50%"></div></div></div></div><div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/11" target="_blank"><div class="issue-item"><span class="state-label open"></span><span class="item-name"><span class="number">#11</span>Open milestone issue - Dev Member<span class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</span></span></div></a></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/12" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#12</span>Closed milestone issue<span class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</span></span></div></a></div></div></li><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/7" class="milestone-name">v0.9</a><span class="sp">|</span><span class="issue-item">1 / 1</span><span class="sp">|</span><span class="state nm closed">Closed</span><span class="sp">|</span><span class="due-date ml5">Due Date<strong>2026-05-31</strong></span><div class="pull-right"><span class="number completion-rate">100 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:100%"></div></div></div></div><div><div></div><div></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/13" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#13</span>Closed all-state issue</span></div></a></div></div></li></ul></div></div></div></div>
`;

test("project milestones list matches legacy milestone/list.scala.html populated DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page);

  await page.goto(`${basePath}/admin/sample/milestones?state=open&orderBy=dueDate&orderDir=asc`);
  await expect(
    page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`),
  ).toHaveAttribute("type", "text/css");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("ul.milestones > li.milestone")).toHaveCount(2);
  await expect(page.locator('.issue-label[data-category-id="3"][data-label-id="8"]')).toHaveCount(
    2,
  );
  await expect(
    page.locator('.issue-label[data-category-id="3"][data-label-id="8"]').first(),
  ).toHaveJSProperty("tagName", "SPAN");
  await expect(page.locator('.issue-link[href$="/issue/11"]')).toHaveAttribute("target", "_blank");
  const progressBars = page.locator('[data-stylex-owner="project-milestones-progress-bar"]');
  await expect(progressBars).toHaveCount(2);
  await expect(progressBars.first()).toHaveAttribute("style", /--x-width:\s*50%/u);
  await expect(progressBars.first()).toHaveCSS("width", "630px");
  await expect(progressBars.nth(1)).toHaveAttribute("style", /--x-width:\s*0%/u);
  await expect(progressBars.nth(1)).toHaveCSS("width", "0px");
  await expect(page.locator(".tab-wrap .ybtn-success")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newMilestoneForm`,
  );
  await expect(page.locator('.nav-tabs a:has-text("Open")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones?state=open`,
  );
  await expect(page.locator('.nav-tabs a:has-text("Closed")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones?state=closed`,
  );
  await expect(page.locator('.nav-tabs a:has-text("All")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones?state=all`,
  );
  await expect(page.locator('.filters a:has-text("Due Date")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones?orderBy=dueDate&orderDir=desc&state=open`,
  );
  await expect(page.locator('.filters a:has-text("Completion Rate")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones?orderBy=completionRate&orderDir=asc&state=open`,
  );
  await expect(page.locator('.milestone-name:has-text("v1.0")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/5`,
  );
  await expect(page.locator('.issue-link[href$="/issue/11"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11`,
  );
  await expect(page.locator(".page-wrap-outer a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer a[data-status]")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer .nav-tabs a.active")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer .filters a.filter.active")).toHaveCount(1);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_MILESTONES_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readMilestoneListMetrics(page)).toEqual({
    completionRateFontSize: "20px",
    completionRateFontWeight: "700",
    dueDateColor: "rgb(243, 108, 34)",
    filterControlsDoNotOverlap: true,
    filterWrapHeight: 30,
    firstMilestonePaddingBottom: "15px",
    firstMilestonePaddingTop: "15px",
    infosWidth: 1260,
    metaInfoMargin: "5px 0px 10px",
    milestoneNameFontSize: "20px",
    milestoneNameFontWeight: "700",
    progressHeight: "8px",
    progressInsideRow: true,
    progressMarginTop: "15px",
    progressSitsBelowMetaInfo: true,
    progressWidth: 1260,
    progressWrapWidth: 1260,
    rowWidth: 1260,
    searchButtonInsideSearchBar: true,
    searchInputLeftAlignedBeforeButton: true,
    searchButtonWidth: 12,
    searchInputWidth: 360,
    tabWrapMarginBottom: "0px",
  });

  await page.fill('.filter-wrap.milestone input[name="filter"]', "closed");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeHidden();
  await expect(page.locator('.issue-link[href$="/issue/11"]')).toHaveAttribute(
    "style",
    /display: none/u,
  );
  await expect(page.locator('.issue-link[href$="/issue/11"] > .issue-item')).not.toHaveAttribute(
    "style",
    /display/u,
  );
  await expect(
    page.locator('.issue-link[href$="/issue/12"]').filter({ hasText: "#12" }),
  ).toBeVisible();

  await page.fill('.filter-wrap.milestone input[name="filter"]', "memberbug");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeVisible();
  await expect(
    page.locator('.issue-link[href$="/issue/12"]').filter({ hasText: "#12" }),
  ).toBeHidden();

  await page.fill('.filter-wrap.milestone input[name="filter"]', "member bug");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeHidden();

  await page.fill('.filter-wrap.milestone input[name="filter"]', "#11");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeVisible();
  await expect(
    page.locator('.issue-link[href$="/issue/12"]').filter({ hasText: "#12" }),
  ).toBeHidden();
  await expect(page.locator('.issue-label[data-category-id="3"][data-label-id="8"] a')).toHaveCount(
    0,
  );

  await page.click('.nav-tabs a:has-text("Closed")');
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestones?state=closed`);
});

test("project milestones route uses direct typed Link targets", () => {
  const routeSource = readFileSync("src/routes/$ownerName/$projectName/milestones.tsx", "utf8");
  const parentRouteSource = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("SiteLayoutShell");
  expect(routeSource).not.toContain("ProjectHeader");
  expect(routeSource).not.toContain("ProjectMenu");
  expect(routeSource).not.toContain("YonaQueryProvider");
  expect(routeSource).not.toContain("LegacyI18nProvider");
  expect(parentRouteSource).toContain("const milestonesPath = `${homePath}/milestones`;");
  expect(parentRouteSource).toContain('"milestone"');
  expect(parentRouteSource).toContain("`${projectName} - milestone - ${ownerName}/${projectName}`");
  expect(parentRouteSource).toContain('active === "milestone"');
  expect(parentRouteSource).toContain("`/${ownerName}/${projectName}/issue/labels.css`");
  expect(routeSource).not.toContain("useProjectMilestonesDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain('globalThis["document"]');
  expect(routeSource).toContain("styles.progressBar(width)");
  expect(routeSource).toContain("sx.progressBar(`${completionPercent}%`)");
  expect(routeSource).toContain('to="/$ownerName/$projectName/newMilestoneForm"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/milestones"');
  expect(routeSource).toContain("const LEGACY_MILESTONE_LIST_LINK_PROPS = {");
  expect(routeSource).toContain(
    "activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true }",
  );
  expect(routeSource).toContain(
    'activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined }',
  );
  expect(routeSource).toContain("{...LEGACY_MILESTONE_LIST_LINK_PROPS}");
  expect(routeSource).toContain("orderBy: optionalStringSearch(search.orderBy)");
  expect(routeSource).toContain('const orderBy = search.orderBy ?? "dueDate"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/milestone/$milestoneId"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/issue/$issueNumber"');
  expect(routeSource).toContain("params={{ ownerName, projectName");
});

test("project milestones all-state list renders legacy open and closed state metadata", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page, "all");

  await page.goto(`${basePath}/admin/sample/milestones?state=all&orderBy=dueDate&orderDir=asc`);
  await expect(page.locator(".page-wrap-outer .nav-tabs li.active a")).toHaveText("All");
  await expect(page.locator(".state.nm.open")).toHaveText("Open");
  await expect(page.locator(".state.nm.closed")).toHaveText("Closed");
  await expect(
    page.locator(".milestone").filter({ hasText: "v0.9" }).locator(".due-date"),
  ).toHaveClass("due-date ml5");

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MILESTONES_ALL_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("protected org-owned project milestones restore legacy title and navbar search scope on localhost", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedPortalMilestones(page);

  await page.goto(`${basePath}/weblabs/portal/milestones?state=open&orderBy=dueDate&orderDir=asc`);
  await expect(page).toHaveTitle("portal - milestone - weblabs/portal");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("ul.milestones > li.milestone")).toHaveCount(2);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-stylex-owner="global-gnb-search-box"]');
  await expect(searchBox).not.toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).not.toHaveClass(/\bselect\b/);
  await expect(page.locator(".gnb-search-form [data-toggle='search-scope']")).toHaveCount(0);

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
    .filter({ hasText: "This Group" })
    .click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
    .filter({ hasText: "All Projects" })
    .click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("2");
  await expect(page.locator(".project-util .watcher-count")).toHaveClass(/watch-on/);

  expect(await readProtectedPortalMilestoneShellMetrics(page)).toEqual({
    gnbClassName: "gnb-outer project-header",
    pageWrapBelowMenu: true,
    projectMenuBelowHeader: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

async function mockProjectMilestones(page: Page, state: "all" | "open" = "open") {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
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
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: state === "all" ? allStateMilestones() : openStateMilestones(),
      }),
    });
  });
}

async function mockProtectedPortalMilestones(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 2,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: true,
        isWatching: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        projectScope: "protected",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchingCount: 2,
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/milestones?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: openStateMilestones(),
      }),
    });
  });
}

function openStateMilestones() {
  return [
    {
      closedIssueCount: 1,
      completionPercent: 50,
      dueDateLabel: "2026-06-30",
      dueDateOverdue: true,
      id: 5,
      openIssueCount: 1,
      openIssues: [
        {
          assigneeLabel: "Dev Member",
          issueNumber: 11,
          labels: [
            {
              categoryId: "3",
              categoryName: "type",
              color: "#51aacc",
              id: "8",
              name: "bug",
            },
          ],
          state: "open",
          title: "Open milestone issue",
        },
      ],
      closedIssues: [
        {
          assigneeLabel: "",
          issueNumber: 12,
          labels: [
            {
              categoryId: "3",
              categoryName: "type",
              color: "#51aacc",
              id: "8",
              name: "bug",
            },
          ],
          state: "closed",
          title: "Closed milestone issue",
        },
      ],
      state: "open",
      title: "v1.0",
      untilLabel: "Overdue",
      viewerCanUpdate: true,
    },
    {
      closedIssueCount: 0,
      completionPercent: 0,
      dueDateLabel: "2026-08-31",
      dueDateOverdue: false,
      id: 6,
      openIssueCount: 0,
      openIssues: [],
      closedIssues: [],
      state: "open",
      title: "v2.0",
      untilLabel: "D-61",
      viewerCanUpdate: true,
    },
  ];
}

function allStateMilestones() {
  return [
    openStateMilestones()[0],
    {
      closedIssueCount: 1,
      completionPercent: 100,
      dueDateLabel: "2026-05-31",
      dueDateOverdue: false,
      id: 7,
      openIssueCount: 0,
      openIssues: [],
      closedIssues: [
        {
          assigneeLabel: "",
          issueNumber: 13,
          labels: [],
          state: "closed",
          title: "Closed all-state issue",
        },
      ],
      state: "closed",
      title: "v0.9",
      untilLabel: "",
      viewerCanUpdate: true,
    },
  ];
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !isNormalizedRuntimeAttr(attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (
        attr.name === "class" &&
        attr.ownerElement?.tagName.toLowerCase() === "a" &&
        attr.value === "active"
      ) {
        return "";
      }
      if (attr.name !== "style") {
        return attr.value;
      }
      return attr.value
        .replace(/--x-width:\s*([^;]+)/u, "width:$1")
        .replace(/\s+/g, "")
        .replace(/;$/u, "");
    }

    function isNormalizedRuntimeAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (attr.name === "class" &&
          attr.ownerElement?.tagName.toLowerCase() === "a" &&
          attr.value === "active")
      );
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !isNormalizedRuntimeAttr(attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (
        attr.name === "class" &&
        attr.ownerElement?.tagName.toLowerCase() === "a" &&
        attr.value === "active"
      ) {
        return "";
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }

    function isNormalizedRuntimeAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (attr.name === "class" &&
          attr.ownerElement?.tagName.toLowerCase() === "a" &&
          attr.value === "active")
      );
    }
  }, html);
}

async function readMilestoneListMetrics(page: Page) {
  return page.evaluate(() => {
    const tabWrap = document.querySelector<HTMLElement>(".tab-wrap");
    const filterWrap = document.querySelector<HTMLElement>(".filter-wrap.milestone");
    const filters = document.querySelector<HTMLElement>(".filter-wrap.milestone .filters");
    const searchBar = document.querySelector<HTMLElement>(".filter-wrap.milestone .search-bar");
    const searchInput = document.querySelector<HTMLElement>(".filter-wrap.milestone .textbox");
    const searchButton = document.querySelector<HTMLElement>(".filter-wrap.milestone .search-btn");
    const milestone = document.querySelector<HTMLElement>("ul.milestones > li.milestone");
    const infos = document.querySelector<HTMLElement>(".milestones .infos");
    const metaInfo = document.querySelector<HTMLElement>(".milestones .meta-info");
    const milestoneName = document.querySelector<HTMLElement>(".milestones .milestone-name");
    const dueDate = document.querySelector<HTMLElement>(".milestones .due-date.over");
    const completionRate = document.querySelector<HTMLElement>(".milestones .completion-rate");
    const progressWrap = document.querySelector<HTMLElement>(".milestones .progress-wrap");
    const progress = document.querySelector<HTMLElement>(".milestones .progress");
    const missing = Object.entries({
      completionRate,
      dueDate,
      filters,
      filterWrap,
      infos,
      metaInfo,
      milestone,
      milestoneName,
      progress,
      progressWrap,
      searchBar,
      searchButton,
      searchInput,
      tabWrap,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected milestone list metric targets are missing: ${missing.join(", ")}`);
    }

    const milestoneStyle = getComputedStyle(milestone);
    const milestoneNameStyle = getComputedStyle(milestoneName);
    const completionRateStyle = getComputedStyle(completionRate);
    const filterBox = filterWrap.getBoundingClientRect();
    const filtersBox = filters.getBoundingClientRect();
    const searchBarBox = searchBar.getBoundingClientRect();
    const searchInputBox = searchInput.getBoundingClientRect();
    const searchButtonBox = searchButton.getBoundingClientRect();
    const milestoneBox = milestone.getBoundingClientRect();
    const metaInfoBox = metaInfo.getBoundingClientRect();
    const progressBox = progress.getBoundingClientRect();
    return {
      completionRateFontSize: completionRateStyle.fontSize,
      completionRateFontWeight: completionRateStyle.fontWeight,
      dueDateColor: getComputedStyle(dueDate).color,
      filterControlsDoNotOverlap: searchBarBox.right <= filtersBox.left,
      filterWrapHeight: Math.round(filterBox.height),
      firstMilestonePaddingBottom: milestoneStyle.paddingBottom,
      firstMilestonePaddingTop: milestoneStyle.paddingTop,
      infosWidth: Math.round(infos.getBoundingClientRect().width),
      metaInfoMargin: getComputedStyle(metaInfo).margin,
      milestoneNameFontSize: milestoneNameStyle.fontSize,
      milestoneNameFontWeight: milestoneNameStyle.fontWeight,
      progressHeight: getComputedStyle(progress).height,
      progressInsideRow:
        progressBox.left >= milestoneBox.left &&
        progressBox.right <= milestoneBox.right &&
        progressBox.bottom <= milestoneBox.bottom,
      progressMarginTop: getComputedStyle(progressWrap).marginTop,
      progressSitsBelowMetaInfo: progressBox.top >= metaInfoBox.bottom,
      progressWidth: Math.round(progressBox.width),
      progressWrapWidth: Math.round(progressWrap.getBoundingClientRect().width),
      rowWidth: Math.round(milestoneBox.width),
      searchButtonInsideSearchBar:
        searchButtonBox.top >= searchBarBox.top &&
        searchButtonBox.bottom <= searchBarBox.bottom &&
        searchButtonBox.right <= searchBarBox.right,
      searchButtonWidth: Math.round(searchButtonBox.width),
      searchInputLeftAlignedBeforeButton: searchInputBox.left < searchButtonBox.left,
      searchInputWidth: Math.round(searchInputBox.width),
      tabWrapMarginBottom: getComputedStyle(tabWrap).marginBottom,
    };
  });
}

async function readProtectedPortalMilestoneShellMetrics(page: Page) {
  return page.evaluate(() => {
    const gnb = requireElement("[data-stylex-owner=global-gnb-outer]");
    const navbar = requireElement('[data-stylex-owner="global-gnb-inner"]');
    const search = requireElement('[data-stylex-owner="global-gnb-search-box"]');
    const projectHeader = requireElement(".project-header-outer");
    const projectMenu = requireElement(".project-menu-outer");
    const pageWrap = requireElement(".page-wrap-outer");
    const navbarBox = navbar.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    const pageWrapBox = pageWrap.getBoundingClientRect();

    return {
      gnbClassName: gnb.className,
      pageWrapBelowMenu: pageWrapBox.top >= projectMenuBox.bottom,
      projectMenuBelowHeader: projectMenuBox.top >= projectHeaderBox.bottom,
      searchBottomWithinNavbar: searchBox.bottom <= navbarBox.bottom,
      searchLeftWithinNavbar: searchBox.left >= navbarBox.left,
      searchRightWithinNavbar: searchBox.right <= navbarBox.right,
      searchTopWithinNavbar: searchBox.top >= navbarBox.top,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
