import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function assertLegacyIssueListPageShellMetrics(page: Page) {
  const appShell = await layoutBox(page, "main.app-shell.issue-list-page");
  const projectHeader = await layoutBox(page, ".issue-list-page .project-header-outer");
  const projectMenu = await layoutBox(page, ".issue-list-page .project-menu-outer");
  const pageWrapOuter = await layoutBox(page, ".issue-list-page > .page-wrap-outer");
  const projectPageWrap = await layoutBox(page, ".issue-list-page .project-page-wrap");
  const issueWrap = await layoutBox(page, ".issue-list-page .row-fluid.issue-list-wrap");
  const leftMenu = await layoutBox(page, ".issue-list-page .left-menu.span2.span-hard-wrap");
  const contentPane = await layoutBox(page, ".issue-list-page #span10.span10.span-hard-wrap");
  const newIssueButton = await layoutBox(page, "#span10 > .pull-right .ybtn.ybtn-success");
  const stateTabs = await layoutBox(page, ".issue-list-page ul.nav.nav-tabs.nm");
  const filterWrap = await layoutBox(page, ".issue-list-page .filter-wrap.board");
  const firstList = await layoutBox(page, ".issue-list-page ul.post-list-wrap.row-fluid");
  const pagination = await layoutBox(page, ".issue-list-page #pagination");
  const styles = await page.locator(".issue-list-page").evaluate((element) => {
    const shell = window.getComputedStyle(element);
    const pageWrap = window.getComputedStyle(
      element.querySelector(".page-wrap-outer") as HTMLElement,
    );
    const projectPage = window.getComputedStyle(
      element.querySelector(".project-page-wrap") as HTMLElement,
    );
    const issueWrap = window.getComputedStyle(
      element.querySelector(".issue-list-wrap") as HTMLElement,
    );
    const left = window.getComputedStyle(element.querySelector(".left-menu") as HTMLElement);
    const content = window.getComputedStyle(element.querySelector("#span10") as HTMLElement);
    return {
      contentFloat: content.float,
      issueWrapDisplay: issueWrap.display,
      leftFloat: left.float,
      pageWrapDisplay: pageWrap.display,
      projectPageDisplay: projectPage.display,
      shellDisplay: shell.display,
    };
  });

  await expect(page.locator("main.app-shell.issue-list-page")).toHaveCount(1);
  await expect(page.locator(".issue-list-page .project-header-outer")).toHaveCount(1);
  await expect(page.locator(".issue-list-page .project-menu-outer")).toHaveCount(1);
  await expect(page.locator(".issue-list-page .row-fluid.issue-list-wrap")).toHaveAttribute(
    "pjax-container",
    "",
  );
  await expect(page.locator("#span10 > .pull-right .ybtn.ybtn-success")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issueform",
  );
  await expect(page.locator("#pagination")).toHaveAttribute("data-total", "1");

  expect(projectHeader.y).toBeGreaterThanOrEqual(appShell.y);
  expect(projectMenu.y).toBeGreaterThan(projectHeader.y + projectHeader.height - 1);
  expect(pageWrapOuter.y).toBeGreaterThan(projectMenu.y + projectMenu.height - 1);
  expect(projectPageWrap.x).toBeGreaterThanOrEqual(pageWrapOuter.x);
  expect(projectPageWrap.width).toBeLessThanOrEqual(pageWrapOuter.width + 1);
  expect(issueWrap.y).toBeGreaterThanOrEqual(projectPageWrap.y);
  expect(issueWrap.x).toBeGreaterThanOrEqual(projectPageWrap.x);
  expect(leftMenu.x).toBeGreaterThanOrEqual(issueWrap.x);
  expect(contentPane.x).toBeGreaterThan(leftMenu.x + leftMenu.width - 1);
  expect(contentPane.width).toBeGreaterThan(leftMenu.width);
  expect(Math.abs(contentPane.y - leftMenu.y)).toBeLessThanOrEqual(2);
  expect(newIssueButton.x).toBeGreaterThan(contentPane.x + contentPane.width / 2);
  expect(stateTabs.y).toBeGreaterThanOrEqual(contentPane.y);
  expect(filterWrap.y).toBeGreaterThan(stateTabs.y + stateTabs.height - 1);
  expect(firstList.y).toBeGreaterThan(filterWrap.y + filterWrap.height - 1);
  expect(pagination.y).toBeGreaterThan(firstList.y + firstList.height - 1);
  expect(styles).toEqual({
    contentFloat: "left",
    issueWrapDisplay: "block",
    leftFloat: "left",
    pageWrapDisplay: "block",
    projectPageDisplay: "block",
    shellDisplay: "block",
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 14,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        dashboard: {
          assignees: [
            {
              avatarUrl: "/avatars/door.png",
              loginId: "door",
              openIssueCount: 1,
              userId: 2,
              userLabel: "Door",
            },
          ],
          labels: [],
          milestones: [],
          unassignedOpenIssueCount: 0,
        },
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project issue parity route",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        draftItems: [
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            authorLabel: "Nori",
            authorLoginId: "nori",
            childClosedCount: 0,
            childIssues: [],
            childOpenCount: 0,
            commentCount: 0,
            dueDateLabel: "",
            dueDateOverdue: false,
            id: "102",
            issueNumber: "2",
            labels: [],
            milestoneTitle: "",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "draft",
            title: "Draft issue",
            updatedLabel: "2026-04-16",
            voterCount: 0,
            watcherCount: 0,
            weight: 0,
          },
        ],
        items: [
          {
            assigneeAvatarUrl: "/avatars/door.png",
            assigneeLabel: "Door",
            assigneeLoginId: "door",
            authorLabel: "Nori",
            authorLoginId: "nori",
            childClosedCount: 1,
            childIssues: [
              {
                assigneeLabel: "Door",
                commentCount: 2,
                createdLabel: "2026-04-14",
                isDraft: false,
                issueNumber: "11",
                labels: [
                  {
                    categoryId: 4,
                    categoryIsExclusive: false,
                    categoryName: "Type",
                    color: "#2196f3",
                    id: "8",
                    name: "child",
                  },
                ],
                state: "open",
                title: "Open child issue",
                voterCount: 1,
              },
              {
                assigneeLabel: "",
                commentCount: 0,
                createdLabel: "2026-04-13",
                isDraft: false,
                issueNumber: "12",
                labels: [],
                state: "closed",
                title: "Closed child issue",
                voterCount: 0,
              },
            ],
            childOpenCount: 2,
            commentCount: 3,
            dueDateLabel: "2026-05-01",
            dueDateOverdue: false,
            id: "101",
            issueNumber: "1",
            labels: [{ categoryId: 4, color: "#ffeb3b", id: "7", name: "bright" }],
            milestoneTitle: "",
            ownerName: "admin",
            parentIssueNumber: "77",
            parentIssueTitle: "Parent issue title keeps legacy truncation",
            projectName: "projectYobi",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
            voterCount: 1,
            watcherCount: 2,
            weight: 0,
          },
        ],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        labels: [
          { categoryId: 4, categoryName: "Type", color: "#ffeb3b", id: "7", name: "bright" },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          milestones: [
            {
              dueDate: "",
              id: 9,
              issueClosedCount: 0,
              issueOpenCount: 1,
              state: "open",
              title: "v1.0",
            },
          ],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
});

test("issue list shared partials preserve legacy vote count and checkbox metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");
  await assertLegacyIssueListPageShellMetrics(page);
  const parentCountSelector = "#issue-item-101 .infos > .infos-item.item-count-groups";

  const quickSearch = page.locator(".issue-list-page .left-menu .lst-stacked.unstyled");
  await expect(quickSearch).toHaveCount(1);
  await expect(quickSearch.locator("> li")).toHaveCount(4);
  await expect(quickSearch.locator("> li.active")).toHaveCount(1);
  await expect(quickSearch.locator("> li.active > a")).toContainText("Open");
  await expect(quickSearch.locator("> li:nth-child(2) > a")).toContainText("Assigned");
  await expect(quickSearch.locator("> li:nth-child(3) > a")).toContainText("Created");
  await expect(quickSearch.locator("> li:nth-child(4) > a")).toContainText("Commented");
  await expect(quickSearch.locator("> li.active .num-badge")).toHaveText("1");
  await expect(quickSearch.locator("> li:nth-child(2) .num-badge")).toHaveText("0");
  await expect(quickSearch.locator("> li.active > a")).toHaveAttribute("data-assignee-id", "");
  await expect(quickSearch.locator("> li.active > a")).toHaveAttribute("data-author-id", "");
  await expect(quickSearch.locator("> li.active > a")).toHaveAttribute("data-commenter-id", "");
  await expect(quickSearch.locator("> li.active > a")).toHaveAttribute("data-milestone-id", "");
  await expect(quickSearch.locator("> li.active > a")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issues?orderBy=updatedDate&orderDir=desc",
  );
  const issueWrap = await layoutBox(page, ".issue-list-page .row-fluid.issue-list-wrap");
  const leftMenu = await layoutBox(page, ".issue-list-page .left-menu.span2.span-hard-wrap");
  const quickSearchBox = await layoutBox(page, ".issue-list-page .left-menu .lst-stacked");
  const allFilter = await layoutBox(page, ".issue-list-page .lst-stacked > li:nth-child(1)");
  const assignedFilter = await layoutBox(page, ".issue-list-page .lst-stacked > li:nth-child(2)");
  const createdFilter = await layoutBox(page, ".issue-list-page .lst-stacked > li:nth-child(3)");
  const commentedFilter = await layoutBox(page, ".issue-list-page .lst-stacked > li:nth-child(4)");
  const allAnchor = await layoutBox(page, ".issue-list-page .lst-stacked > li:nth-child(1) > a");
  const allBadge = await layoutBox(
    page,
    ".issue-list-page .lst-stacked > li:nth-child(1) .num-badge",
  );
  const assignedBadge = await layoutBox(
    page,
    ".issue-list-page .lst-stacked > li:nth-child(2) .num-badge",
  );
  const quickSearchStyles = await page
    .locator(".issue-list-page .lst-stacked > li:nth-child(1)")
    .evaluate((element) => {
      const list = element.closest(".lst-stacked") as HTMLElement;
      const anchor = element.querySelector("a") as HTMLElement;
      const badge = element.querySelector(".num-badge") as HTMLElement;
      const listStyle = window.getComputedStyle(list);
      const itemStyle = window.getComputedStyle(element);
      const anchorStyle = window.getComputedStyle(anchor);
      const badgeStyle = window.getComputedStyle(badge);
      return {
        activeBackground: itemStyle.backgroundColor,
        activeBorderRadius: itemStyle.borderRadius,
        activeColor: itemStyle.color,
        activeFontWeight: itemStyle.fontWeight,
        activeOverflow: itemStyle.overflow,
        activePadding: `${itemStyle.paddingTop} ${itemStyle.paddingRight} ${itemStyle.paddingBottom} ${itemStyle.paddingLeft}`,
        anchorDisplay: anchorStyle.display,
        badgeBorderRadius: badgeStyle.borderRadius,
        badgeColor: badgeStyle.color,
        badgeFontSize: badgeStyle.fontSize,
        badgeLineHeight: badgeStyle.lineHeight,
        badgePadding: `${badgeStyle.paddingTop} ${badgeStyle.paddingRight} ${badgeStyle.paddingBottom} ${badgeStyle.paddingLeft}`,
        itemFontSize: itemStyle.fontSize,
        listDisplay: listStyle.display,
      };
    });

  expect(leftMenu.x).toBeGreaterThanOrEqual(issueWrap.x);
  expect(quickSearchBox.x).toBeGreaterThanOrEqual(leftMenu.x);
  expect(quickSearchBox.x + quickSearchBox.width).toBeLessThanOrEqual(
    leftMenu.x + leftMenu.width + 1,
  );
  expect(allFilter.y).toBeGreaterThanOrEqual(quickSearchBox.y);
  expect(assignedFilter.y).toBeGreaterThan(allFilter.y + allFilter.height - 1);
  expect(createdFilter.y).toBeGreaterThan(assignedFilter.y + assignedFilter.height - 1);
  expect(commentedFilter.y).toBeGreaterThan(createdFilter.y + createdFilter.height - 1);
  expect(allAnchor.x).toBeGreaterThanOrEqual(allFilter.x);
  expect(allAnchor.width).toBeLessThanOrEqual(allFilter.width);
  expect(allBadge.x).toBeGreaterThan(allAnchor.x);
  expect(allBadge.x + allBadge.width).toBeLessThanOrEqual(allFilter.x + allFilter.width + 1);
  expect(assignedBadge.x).toBeCloseTo(allBadge.x, 0);
  expect(quickSearchStyles).toEqual({
    activeBackground: "rgb(81, 170, 204)",
    activeBorderRadius: "6px",
    activeColor: "rgb(255, 255, 255)",
    activeFontWeight: "700",
    activeOverflow: "auto",
    activePadding: "8px 8px 8px 8px",
    anchorDisplay: "block",
    badgeBorderRadius: "10px",
    badgeColor: "rgb(255, 255, 255)",
    badgeFontSize: "12px",
    badgeLineHeight: "18px",
    badgePadding: "0px 2px 0px 2px",
    itemFontSize: "13px",
    listDisplay: "block",
  });

  const issueTabsSelector = ".issue-list-page ul.nav.nav-tabs.nm:has(#toggle-show-subtasks)";
  await expect(page.locator(".issue-list-page .span10.span-hard-wrap#span10")).toHaveCount(1);
  await expect(page.locator("#span10 > .pull-right .ybtn.ybtn-success")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issueform",
  );
  await expect(page.locator("#span10 > .pull-right .ybtn.ybtn-success")).toHaveText("New issue");
  await expect(page.locator(`${issueTabsSelector} > li[data-pjax]`)).toHaveCount(2);
  await expect(page.locator(`${issueTabsSelector} > li:nth-child(1)`)).toHaveClass(/active/);
  await expect(page.locator(`${issueTabsSelector} > li:nth-child(1) > a`)).toHaveAttribute(
    "state",
    "open",
  );
  await expect(page.locator(`${issueTabsSelector} > li:nth-child(2) > a`)).toHaveAttribute(
    "state",
    "closed",
  );
  await expect(page.locator(`${issueTabsSelector} > li:nth-child(1) .num-badge`)).toHaveText("1");
  await expect(page.locator(`${issueTabsSelector} > li:nth-child(2) .num-badge`)).toHaveText("0");
  await expect(page.locator(".issue-list-page .filter-wrap.board")).toHaveCount(1);
  await expect(page.locator(".issue-list-page .filters.pull-right > a.filter")).toHaveCount(4);
  await expect(
    page.locator(".issue-list-page .filters.pull-right > a.filter").nth(0),
  ).toHaveAttribute("orderby", "dueDate");
  await expect(
    page.locator(".issue-list-page .filters.pull-right > a.filter").nth(1),
  ).toHaveAttribute("orderby", "updatedDate");
  await expect(
    page.locator(".issue-list-page .filters.pull-right > a.filter.active"),
  ).toHaveAttribute("orderby", "updatedDate");
  await expect(
    page.locator(".issue-list-page .filters.pull-right > a.filter.active"),
  ).toHaveAttribute("orderdir", "asc");
  await expect(
    page.locator(".issue-list-page .filters.pull-right > a.filter").nth(3),
  ).toContainText("Comments");
  await expect(page.locator(".issue-list-page .pull-left .ybtn.small")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issues?orderBy=updatedDate&orderDir=desc&format=xls",
  );
  await expect(page.locator(".issue-list-page .pull-left .ybtn.small")).toContainText(
    "Download as Excel",
  );
  await expect(page.locator(".issue-list-page .pull-left .yobicon-file-excel")).toHaveCount(1);
  await expect(page.locator(".issue-list-page #pagination")).toHaveAttribute("data-total", "1");

  await expect(page.locator(".issue-list-page form#search")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issues",
  );
  await expect(page.locator(".issue-list-page form#search")).toHaveAttribute("method", "get");
  await expect(page.locator('form#search input[name="orderBy"]')).toHaveValue("updatedDate");
  await expect(page.locator('form#search input[name="orderDir"]')).toHaveValue("desc");
  await expect(page.locator('form#search input[name="state"]')).toHaveValue("");
  await expect(page.locator('form#search input[name="filter"][data-search="filter"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('form#search button[data-submit="submit"] .yobicon-search'),
  ).toHaveCount(1);
  await expect(page.locator("#advanced-search-form.srch-advanced.hide-in-mobile")).toHaveCount(1);
  await expect(
    page.locator('#advanced-search-form select#authorId[data-toggle="select2"]'),
  ).toHaveAttribute("data-format", "user");
  await expect(
    page.locator('#advanced-search-form select#assigneeId[data-search="assigneeId"]'),
  ).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(page.locator("#advanced-search-form select#milestoneId")).toHaveAttribute(
    "data-format",
    "milestone",
  );
  await expect(
    page.locator('#advanced-search-form input#issueDueDate[name="dueDate"]'),
  ).toHaveAttribute("data-toggle", "calendar");
  await expect(page.locator("#advanced-search-form .btn-calendar .yobicon-calendar2")).toHaveCount(
    1,
  );
  await expect(page.locator("#advanced-search-form .labels-wrap .ybtn-mini")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/labelsform",
  );
  const searchForm = await layoutBox(page, ".issue-list-page form#search");
  const searchHr = await layoutBox(page, ".issue-list-page form#search hr.hide-in-mobile");
  const searchWrap = await layoutBox(page, ".issue-list-page form#search > .search");
  const searchBar = await layoutBox(page, ".issue-list-page form#search .search > .search-bar");
  const searchInput = await layoutBox(page, 'form#search input[name="filter"]');
  const searchButton = await layoutBox(page, 'form#search button[data-submit="submit"]');
  const advancedForm = await layoutBox(page, "#advanced-search-form");
  const authorOption = await layoutBox(page, "#advanced-search-form .issue-option:nth-of-type(1)");
  const assigneeOption = await layoutBox(
    page,
    "#advanced-search-form .issue-option:nth-of-type(2)",
  );
  const milestoneOption = await layoutBox(
    page,
    "#advanced-search-form .issue-option:nth-of-type(3)",
  );
  const dueDateOption = await layoutBox(page, "#advanced-search-form .issue-option:nth-of-type(4)");
  const authorTerm = await layoutBox(
    page,
    "#advanced-search-form .issue-option:nth-of-type(1) > dt",
  );
  const authorSelect = await layoutBox(page, "#advanced-search-form select#authorId");
  const dueDateInput = await layoutBox(page, "#advanced-search-form input#issueDueDate");
  const calendarButton = await layoutBox(page, "#advanced-search-form .btn-calendar");
  const labelsWrap = await layoutBox(page, "#advanced-search-form .labels-wrap");
  const labelManage = await layoutBox(page, "#advanced-search-form .labels-wrap .ybtn-mini");
  const searchFormStyles = await page
    .locator("form#search > .search > .search-bar")
    .evaluate((element) => {
      const input = element.querySelector(".textbox") as HTMLElement;
      const button = element.querySelector(".search-btn") as HTMLElement;
      const advanced = document.querySelector("#advanced-search-form") as HTMLElement;
      const option = advanced.querySelector(".issue-option") as HTMLElement;
      const optionDt = option.querySelector("dt") as HTMLElement;
      const optionDd = option.querySelector("dd") as HTMLElement;
      const labelsWrap = advanced.querySelector(".labels-wrap") as HTMLElement;
      const barStyle = window.getComputedStyle(element);
      const inputStyle = window.getComputedStyle(input);
      const buttonStyle = window.getComputedStyle(button);
      const advancedStyle = window.getComputedStyle(advanced);
      const optionStyle = window.getComputedStyle(option);
      const optionDtStyle = window.getComputedStyle(optionDt);
      const optionDdStyle = window.getComputedStyle(optionDd);
      const labelsWrapStyle = window.getComputedStyle(labelsWrap);
      return {
        advancedMarginTop: advancedStyle.marginTop,
        barBackground: barStyle.backgroundColor,
        barBorderColor: barStyle.borderTopColor,
        barBorderRadius: barStyle.borderRadius,
        barHeight: barStyle.height,
        barLineHeight: barStyle.lineHeight,
        barPadding: `${barStyle.paddingTop} ${barStyle.paddingRight} ${barStyle.paddingBottom} ${barStyle.paddingLeft}`,
        buttonBackground: buttonStyle.backgroundColor,
        buttonBorderTopWidth: buttonStyle.borderTopWidth,
        buttonHeight: buttonStyle.height,
        buttonPosition: buttonStyle.position,
        buttonRight: buttonStyle.right,
        buttonTop: buttonStyle.top,
        inputBorderTopWidth: inputStyle.borderTopWidth,
        inputHeight: inputStyle.height,
        inputMargin: `${inputStyle.marginTop} ${inputStyle.marginRight} ${inputStyle.marginBottom} ${inputStyle.marginLeft}`,
        inputPadding: `${inputStyle.paddingTop} ${inputStyle.paddingRight} ${inputStyle.paddingBottom} ${inputStyle.paddingLeft}`,
        labelsWrapPosition: labelsWrapStyle.position,
        optionDdMargin: `${optionDdStyle.marginTop} ${optionDdStyle.marginRight} ${optionDdStyle.marginBottom} ${optionDdStyle.marginLeft}`,
        optionDtMarginBottom: optionDtStyle.marginBottom,
        optionMarginBottom: optionStyle.marginBottom,
        optionWidth: optionStyle.width,
      };
    });
  const span10 = await layoutBox(page, ".issue-list-page #span10");
  const newIssueWrap = await layoutBox(page, "#span10 > .pull-right");
  const newIssueButton = await layoutBox(page, "#span10 > .pull-right .ybtn.ybtn-success");
  const tabs = await layoutBox(page, issueTabsSelector);
  const openTab = await layoutBox(page, `${issueTabsSelector} > li:nth-child(1)`);
  const openTabLink = await layoutBox(page, `${issueTabsSelector} > li:nth-child(1) > a`);
  const openTabBadge = await layoutBox(page, `${issueTabsSelector} > li:nth-child(1) .num-badge`);
  const closedTabLink = await layoutBox(page, `${issueTabsSelector} > li:nth-child(2) > a`);
  const wrapperFilterWrap = await layoutBox(page, ".issue-list-page .filter-wrap.board");
  const filters = await layoutBox(page, ".issue-list-page .filters.pull-right");
  const dueDateFilter = await layoutBox(page, ".issue-list-page .filters > a.filter:nth-child(1)");
  const updatedDateFilter = await layoutBox(
    page,
    ".issue-list-page .filters > a.filter:nth-child(2)",
  );
  const createdDateFilter = await layoutBox(
    page,
    ".issue-list-page .filters > a.filter:nth-child(3)",
  );
  const commentsFilter = await layoutBox(page, ".issue-list-page .filters > a.filter:nth-child(4)");
  const excelWrap = await layoutBox(page, ".issue-list-page .pull-left:has(.yobicon-file-excel)");
  const excelButton = await layoutBox(page, ".issue-list-page .pull-left .ybtn.small");
  const excelIcon = await layoutBox(page, ".issue-list-page .pull-left .yobicon-file-excel");
  const pagination = await layoutBox(page, ".issue-list-page #pagination");
  const normalListForWrap = await layoutBox(
    page,
    ".issue-list-page .post-list-wrap.row-fluid:not([data-list])",
  );
  const listWrapStyles = await page.locator(".issue-list-page #span10").evaluate((element) => {
    const newIssue = element.querySelector(":scope > .pull-right .ybtn") as HTMLElement;
    const tabsElement = element.querySelector("ul.nav.nav-tabs.nm") as HTMLElement;
    const activeTab = tabsElement.querySelector("li.active") as HTMLElement;
    const activeTabLink = activeTab.querySelector("a") as HTMLElement;
    const filterWrapElement = element.querySelector(".filter-wrap.board") as HTMLElement;
    const filtersElement = element.querySelector(".filters.pull-right") as HTMLElement;
    const activeFilter = filtersElement.querySelector("a.active") as HTMLElement;
    const excelWrapElement = element.querySelector(
      ".pull-left:has(.yobicon-file-excel)",
    ) as HTMLElement;
    const paginationElement = element.querySelector("#pagination") as HTMLElement;
    const newIssueStyle = window.getComputedStyle(newIssue);
    const tabsStyle = window.getComputedStyle(tabsElement);
    const activeTabStyle = window.getComputedStyle(activeTab);
    const activeTabLinkStyle = window.getComputedStyle(activeTabLink);
    const filterWrapStyle = window.getComputedStyle(filterWrapElement);
    const filtersStyle = window.getComputedStyle(filtersElement);
    const activeFilterStyle = window.getComputedStyle(activeFilter);
    const excelWrapStyle = window.getComputedStyle(excelWrapElement);
    const paginationStyle = window.getComputedStyle(paginationElement);
    return {
      activeFilterDisplay: activeFilterStyle.display,
      activeFilterFontWeight: activeFilterStyle.fontWeight,
      activeTabBackground: activeTabStyle.backgroundColor,
      activeTabLinkDisplay: activeTabLinkStyle.display,
      activeTabLinkPadding: `${activeTabLinkStyle.paddingTop} ${activeTabLinkStyle.paddingRight} ${activeTabLinkStyle.paddingBottom} ${activeTabLinkStyle.paddingLeft}`,
      excelWrapFloat: excelWrapStyle.float,
      excelWrapPadding: excelWrapStyle.padding,
      filtersFloat: filtersStyle.float,
      filterWrapDisplay: filterWrapStyle.display,
      filterWrapMarginTop: filterWrapStyle.marginTop,
      newIssueDisplay: newIssueStyle.display,
      newIssueHeight: newIssueStyle.height,
      paginationDisplay: paginationStyle.display,
      paginationMarginTop: paginationStyle.marginTop,
      tabsDisplay: tabsStyle.display,
      tabsMarginBottom: tabsStyle.marginBottom,
    };
  });

  expect(searchForm.x).toBeGreaterThanOrEqual(leftMenu.x);
  expect(searchForm.x + searchForm.width).toBeLessThanOrEqual(leftMenu.x + leftMenu.width + 1);
  expect(searchHr.y).toBeGreaterThan(commentedFilter.y + commentedFilter.height - 1);
  expect(searchWrap.y).toBeGreaterThan(searchHr.y);
  expect(searchBar.x).toBeGreaterThanOrEqual(searchForm.x);
  expect(searchBar.x + searchBar.width).toBeLessThanOrEqual(searchForm.x + searchForm.width + 1);
  expect(searchInput.x).toBeGreaterThanOrEqual(searchBar.x);
  expect(searchInput.y).toBeGreaterThanOrEqual(searchBar.y);
  expect(searchButton.x).toBeGreaterThan(searchInput.x + searchInput.width - 1);
  expect(searchButton.x + searchButton.width).toBeLessThanOrEqual(
    searchBar.x + searchBar.width + 1,
  );
  expect(advancedForm.y).toBeGreaterThan(searchBar.y + searchBar.height - 1);
  expect(authorOption.y).toBeGreaterThanOrEqual(advancedForm.y);
  expect(assigneeOption.y).toBeGreaterThan(authorOption.y + authorOption.height - 1);
  expect(milestoneOption.y).toBeGreaterThan(assigneeOption.y + assigneeOption.height - 1);
  expect(dueDateOption.y).toBeGreaterThan(milestoneOption.y + milestoneOption.height - 1);
  expect(authorTerm.y).toBeLessThan(authorSelect.y);
  expect(authorSelect.width).toBeLessThanOrEqual(authorOption.width);
  expect(dueDateInput.x).toBeGreaterThanOrEqual(dueDateOption.x);
  expect(calendarButton.x).toBeGreaterThan(dueDateInput.x + dueDateInput.width - 1);
  expect(labelsWrap.y).toBeGreaterThan(dueDateOption.y + dueDateOption.height - 1);
  expect(labelManage.x).toBeGreaterThanOrEqual(labelsWrap.x);
  expect(searchFormStyles).toEqual({
    advancedMarginTop: "10px",
    barBackground: "rgb(255, 255, 255)",
    barBorderColor: "rgb(204, 204, 204)",
    barBorderRadius: "3px",
    barHeight: "20px",
    barLineHeight: "20px",
    barPadding: "4px 25px 4px 5px",
    buttonBackground: "rgba(0, 0, 0, 0)",
    buttonBorderTopWidth: "0px",
    buttonHeight: "20px",
    buttonPosition: "absolute",
    buttonRight: "5px",
    buttonTop: "5px",
    inputBorderTopWidth: "0px",
    inputHeight: "20px",
    inputMargin: "0px -5px 0px -5px",
    inputPadding: "0px 5px 0px 5px",
    labelsWrapPosition: "relative",
    optionDdMargin: "0px 0px 0px 0px",
    optionDtMarginBottom: "5px",
    optionMarginBottom: "16px",
    optionWidth: "190.625px",
  });

  expect(span10.x).toBeGreaterThan(leftMenu.x + leftMenu.width - 1);
  expect(span10.y).toBeCloseTo(leftMenu.y, 0);
  expect(newIssueWrap.x).toBeGreaterThan(span10.x + span10.width / 2);
  expect(newIssueButton.x + newIssueButton.width).toBeLessThanOrEqual(span10.x + span10.width + 1);
  expect(tabs.x).toBeGreaterThanOrEqual(span10.x);
  expect(tabs.y).toBeGreaterThanOrEqual(newIssueButton.y - 1);
  expect(openTab.x).toBeGreaterThanOrEqual(tabs.x);
  expect(openTabLink.x).toBeGreaterThanOrEqual(openTab.x);
  expect(openTabBadge.x).toBeGreaterThan(openTabLink.x);
  expect(closedTabLink.x).toBeGreaterThan(openTabLink.x + openTabLink.width - 1);
  expect(wrapperFilterWrap.x).toBeGreaterThanOrEqual(span10.x);
  expect(wrapperFilterWrap.y).toBeGreaterThan(tabs.y + tabs.height - 1);
  expect(filters.x).toBeGreaterThan(wrapperFilterWrap.x + wrapperFilterWrap.width / 2);
  expect(filters.x + filters.width).toBeLessThanOrEqual(
    wrapperFilterWrap.x + wrapperFilterWrap.width + 1,
  );
  expect(dueDateFilter.x).toBeGreaterThanOrEqual(filters.x);
  expect(updatedDateFilter.x).toBeGreaterThan(dueDateFilter.x + dueDateFilter.width - 1);
  expect(createdDateFilter.x).toBeGreaterThan(updatedDateFilter.x + updatedDateFilter.width - 1);
  expect(commentsFilter.x).toBeGreaterThan(createdDateFilter.x + createdDateFilter.width - 1);
  expect(excelWrap.x).toBeGreaterThanOrEqual(span10.x);
  expect(excelWrap.y).toBeGreaterThan(normalListForWrap.y + normalListForWrap.height - 1);
  expect(excelButton.x).toBeGreaterThanOrEqual(excelWrap.x);
  expect(excelIcon.x).toBeGreaterThanOrEqual(excelButton.x);
  expect(pagination.y).toBeGreaterThanOrEqual(excelWrap.y - 1);
  expect(listWrapStyles).toEqual({
    activeFilterDisplay: "inline",
    activeFilterFontWeight: "700",
    activeTabBackground: "rgba(0, 0, 0, 0)",
    activeTabLinkDisplay: "block",
    activeTabLinkPadding: "8px 12px 8px 12px",
    excelWrapFloat: "left",
    excelWrapPadding: "10px",
    filtersFloat: "right",
    filterWrapDisplay: "block",
    filterWrapMarginTop: "5px",
    newIssueDisplay: "inline-block",
    newIssueHeight: "20px",
    paginationDisplay: "flex",
    paginationMarginTop: "16px",
    tabsDisplay: "block",
    tabsMarginBottom: "0px",
  });

  const twoColumn = page.locator(".issue-list-page .two-column-icon.mr10.hide-in-mobile");
  await expect(twoColumn).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(twoColumn).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumn).toHaveAttribute(
    "data-content",
    "Splits list and body into columns respectively",
  );
  await expect(page.locator("#two-column-mode")).toHaveAttribute("type", "checkbox");
  await expect(page.locator(".issue-list-page .two-column-mode-text")).toHaveText("Column View");

  const showSubtasks = page.locator(".issue-list-page .show-subtasks.mr10");
  await expect(showSubtasks).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(showSubtasks).toHaveAttribute("data-toggle", "popover");
  await expect(showSubtasks).toHaveAttribute("data-trigger", "hover");
  await expect(showSubtasks).toHaveAttribute("data-placement", "top");
  await expect(showSubtasks).toHaveAttribute("title", "Show subtask");
  await expect(showSubtasks).toHaveAttribute("data-content", "Show subtask always");
  await expect(page.locator("#toggle-show-subtasks")).toHaveAttribute("type", "checkbox");
  await expect(page.locator(".issue-list-page .show-subtasks-text")).toHaveText("Show subtask");

  const closedTab = await layoutBox(page, `${issueTabsSelector} > li:nth-child(2)`);
  const twoColumnLi = await layoutBox(page, `${issueTabsSelector} > li:nth-child(3)`);
  const twoColumnBox = await layoutBox(page, ".issue-list-page .two-column-icon");
  const twoColumnBorder = await layoutBox(page, ".issue-list-page .two-column-icon-border");
  const twoColumnCheckbox = await layoutBox(page, "#two-column-mode");
  const twoColumnText = await layoutBox(page, ".issue-list-page .two-column-mode-text");
  const showSubtasksLi = await layoutBox(page, `${issueTabsSelector} > li.show-subtasks-li`);
  const showSubtasksBox = await layoutBox(page, ".issue-list-page .show-subtasks.mr10");
  const buttonBorder = await layoutBox(page, ".issue-list-page .show-subtasks-button-border");
  const checkbox = await layoutBox(page, "#toggle-show-subtasks");
  const showSubtasksText = await layoutBox(page, ".issue-list-page .show-subtasks-text");
  const showSubtasksStyles = await page
    .locator(".issue-list-page .show-subtasks.mr10")
    .evaluate((element) => {
      const li = element.closest(".show-subtasks-li") as HTMLElement;
      const label = element.querySelector("label") as HTMLElement;
      const border = element.querySelector(".show-subtasks-button-border") as HTMLElement;
      const checkboxElement = element.querySelector("#toggle-show-subtasks") as HTMLElement;
      const text = element.querySelector(".show-subtasks-text") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const liStyle = window.getComputedStyle(li);
      const labelStyle = window.getComputedStyle(label);
      const borderStyle = window.getComputedStyle(border);
      const checkboxStyle = window.getComputedStyle(checkboxElement);
      const textStyle = window.getComputedStyle(text);
      return {
        borderBorderRadius: borderStyle.borderRadius,
        borderColor: borderStyle.borderTopColor,
        borderPadding: `${borderStyle.paddingTop} ${borderStyle.paddingRight} ${borderStyle.paddingBottom} ${borderStyle.paddingLeft}`,
        borderTextColor: borderStyle.color,
        checkboxMargin: `${checkboxStyle.marginTop} ${checkboxStyle.marginRight} ${checkboxStyle.marginBottom} ${checkboxStyle.marginLeft}`,
        checkboxMinHeight: checkboxStyle.minHeight,
        checkboxPadding: checkboxStyle.padding,
        checkboxVerticalAlign: checkboxStyle.verticalAlign,
        labelPaddingLeft: labelStyle.paddingLeft,
        labelPaddingTop: labelStyle.paddingTop,
        liMarginLeft: liStyle.marginLeft,
        textLineHeight: textStyle.lineHeight,
        textPaddingRight: textStyle.paddingRight,
        textVerticalAlign: textStyle.verticalAlign,
        wrapperDisplay: wrapperStyle.display,
        wrapperLineHeight: wrapperStyle.lineHeight,
        wrapperMarginLeft: wrapperStyle.marginLeft,
      };
    });
  const twoColumnStyles = await page
    .locator(".issue-list-page .two-column-icon")
    .evaluate((element) => {
      const label = element.querySelector("label") as HTMLElement;
      const border = element.querySelector(".two-column-icon-border") as HTMLElement;
      const checkboxElement = element.querySelector("#two-column-mode") as HTMLElement;
      const text = element.querySelector(".two-column-mode-text") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const labelStyle = window.getComputedStyle(label);
      const borderStyle = window.getComputedStyle(border);
      const checkboxStyle = window.getComputedStyle(checkboxElement);
      const textStyle = window.getComputedStyle(text);
      return {
        borderBorderRadius: borderStyle.borderRadius,
        borderColor: borderStyle.borderTopColor,
        borderPadding: `${borderStyle.paddingTop} ${borderStyle.paddingRight} ${borderStyle.paddingBottom} ${borderStyle.paddingLeft}`,
        borderTextColor: borderStyle.color,
        checkboxMargin: `${checkboxStyle.marginTop} ${checkboxStyle.marginRight} ${checkboxStyle.marginBottom} ${checkboxStyle.marginLeft}`,
        checkboxMinHeight: checkboxStyle.minHeight,
        checkboxPadding: checkboxStyle.padding,
        checkboxVerticalAlign: checkboxStyle.verticalAlign,
        labelPaddingLeft: labelStyle.paddingLeft,
        labelPaddingTop: labelStyle.paddingTop,
        textLineHeight: textStyle.lineHeight,
        textPaddingRight: textStyle.paddingRight,
        textVerticalAlign: textStyle.verticalAlign,
        wrapperDisplay: wrapperStyle.display,
        wrapperLineHeight: wrapperStyle.lineHeight,
        wrapperMarginLeft: wrapperStyle.marginLeft,
        wrapperMarginRight: wrapperStyle.marginRight,
      };
    });

  expect(twoColumnLi.x).toBeGreaterThanOrEqual(closedTab.x + closedTab.width);
  expect(twoColumnBox.x).toBeGreaterThanOrEqual(twoColumnLi.x + 9);
  expect(twoColumnBox.y).toBeGreaterThanOrEqual(tabs.y - 1);
  expect(twoColumnBorder.x).toBeGreaterThanOrEqual(twoColumnBox.x);
  expect(twoColumnCheckbox.x).toBeGreaterThanOrEqual(twoColumnBorder.x + 2);
  expect(twoColumnText.x).toBeGreaterThan(twoColumnCheckbox.x + twoColumnCheckbox.width);
  expect(twoColumnText.y).toBeLessThanOrEqual(twoColumnCheckbox.y + twoColumnCheckbox.height + 2);
  expect(twoColumnCheckbox.y).toBeLessThanOrEqual(twoColumnText.y + twoColumnText.height);
  expect(twoColumnText.x + twoColumnText.width).toBeLessThanOrEqual(
    twoColumnBorder.x + twoColumnBorder.width + 1,
  );
  expect(twoColumnStyles).toEqual({
    borderBorderRadius: "3px",
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px 3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxMargin: "4px 4px 0px 2px",
    checkboxMinHeight: "0px",
    checkboxPadding: "0px",
    checkboxVerticalAlign: "top",
    labelPaddingLeft: "0px",
    labelPaddingTop: "4px",
    textLineHeight: "20px",
    textPaddingRight: "4px",
    textVerticalAlign: "text-bottom",
    wrapperDisplay: "inline-block",
    wrapperLineHeight: "37px",
    wrapperMarginLeft: "10px",
    wrapperMarginRight: "10px",
  });

  expect(showSubtasksLi.x).toBeGreaterThan(twoColumnLi.x);
  expect(showSubtasksLi.x).toBeLessThanOrEqual(twoColumnLi.x + twoColumnLi.width + 1);
  expect(showSubtasksBox.x).toBeGreaterThanOrEqual(showSubtasksLi.x + 9);
  expect(showSubtasksBox.x).toBeLessThanOrEqual(twoColumnBox.x + twoColumnBox.width + 2);
  expect(showSubtasksBox.y).toBeGreaterThanOrEqual(tabs.y - 1);
  expect(buttonBorder.x).toBeGreaterThanOrEqual(showSubtasksBox.x);
  expect(checkbox.x).toBeGreaterThanOrEqual(buttonBorder.x + 2);
  expect(showSubtasksText.x).toBeGreaterThan(checkbox.x + checkbox.width);
  expect(showSubtasksText.y).toBeLessThanOrEqual(checkbox.y + checkbox.height + 2);
  expect(checkbox.y).toBeLessThanOrEqual(showSubtasksText.y + showSubtasksText.height);
  expect(showSubtasksText.x + showSubtasksText.width).toBeLessThanOrEqual(
    buttonBorder.x + buttonBorder.width + 1,
  );
  expect(showSubtasksStyles).toEqual({
    borderBorderRadius: "3px",
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px 3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxMargin: "4px 4px 0px 2px",
    checkboxMinHeight: "0px",
    checkboxPadding: "0px",
    checkboxVerticalAlign: "top",
    labelPaddingLeft: "0px",
    labelPaddingTop: "4px",
    liMarginLeft: "-18px",
    textLineHeight: "20px",
    textPaddingRight: "4px",
    textVerticalAlign: "text-bottom",
    wrapperDisplay: "inline-block",
    wrapperLineHeight: "37px",
    wrapperMarginLeft: "10px",
  });

  await expect(page.locator("#issue-item-101")).toContainText("Pilot issue");
  await expect(
    page.locator(`${parentCountSelector} > .comments-count.comments-count-color`),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/1#comments");
  await expect(
    page.locator(`${parentCountSelector} > .comments-count .count-groups.item-icon`),
  ).toHaveCount(1);
  await expect(
    page.locator(`${parentCountSelector} > .comments-count .yobicon-comment2`),
  ).toHaveCount(1);
  await expect(
    page.locator(`${parentCountSelector} > .comments-count .count-groups.item-count`),
  ).toHaveText("3");
  await expect(
    page.locator(`${parentCountSelector} > .comments-count .count-groups.item-count.strong`),
  ).toHaveCount(0);
  await expect(page.locator('#issue-item-101 .issue-label[data-label-id="7"]')).toHaveText(
    "bright",
  );
  await expect(page.locator('#issue-item-101 .issue-label[data-label-id="7"]')).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issues?orderBy=updatedDate&orderDir=desc&labelIds=7",
  );
  await expect(page.locator(`${parentCountSelector} > .vote-count.vote-color`)).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/1#vote",
  );
  await expect(
    page.locator(`${parentCountSelector} > .vote-count .count-groups.item-icon`),
  ).toHaveCount(1);
  await expect(page.locator(`${parentCountSelector} > .vote-count .yobicon-hearts`)).toHaveCount(1);
  await expect(
    page.locator(`${parentCountSelector} > .vote-count .count-groups.item-count.strong`),
  ).toHaveText("1");
  await expect(page.locator(`${parentCountSelector} > .sharer-color`)).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator(`${parentCountSelector} > .sharer-color`)).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(page.locator(`${parentCountSelector} > .sharer-color`)).toHaveAttribute(
    "title",
    "Issue Sharer",
  );
  await expect(page.locator(`${parentCountSelector} > .sharer-color .yobicon-friends`)).toHaveCount(
    1,
  );
  await expect(
    page.locator(`${parentCountSelector} > .sharer-color .count-groups.item-count.strong`),
  ).toHaveText("2");
  await expect(
    page
      .locator(`${parentCountSelector} > .sharer-color`)
      .evaluate((element) => element.hasAttribute("href")),
  ).resolves.toBe(false);
  await expect(page.locator("#issue-item-101 .span9.span-hard-wrap")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .span3.hide-in-mobile")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .mass-update-check.hide-in-mobile")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .issue-item-row")).toHaveCount(1);
  await expect(page.locator(".mass-update-wrap.hide-in-mobile")).toHaveCount(1);
  await expect(page.locator("#mass-update-form.mass-update-form.pull-left")).toHaveCount(1);
  await expect(page.locator(".btn-group.check-all #check-all")).toHaveAttribute(
    "data-target",
    "checked-issue",
  );
  await expect(page.locator("#state")).toHaveAttribute("data-name", "state");
  await expect(page.locator("#assignee")).toHaveAttribute("data-name", "assignee.id");
  await expect(page.locator("#milestone")).toHaveAttribute("data-name", "milestone.id");
  await expect(page.locator("#attaching-label")).toHaveAttribute("data-name", "attachingLabelIds");
  await expect(page.locator("#detaching-label")).toHaveAttribute("data-name", "detachingLabelIds");
  await expect(page.locator("#state .dropdown-toggle.medium")).toBeDisabled();
  await expect(page.locator("#assignee .dropdown-toggle.medium")).toBeDisabled();
  await expect(page.locator("#milestone .dropdown-toggle.medium")).toBeDisabled();
  await expect(page.locator("#attaching-label .dropdown-toggle.medium")).toBeDisabled();
  await expect(page.locator("#detaching-label .dropdown-toggle.medium")).toBeDisabled();
  await expect(page.locator("#issue-item-101 .title-wrap .post-id")).toHaveText("#1");
  await expect(page.locator("#issue-item-101 .infos .infos-link-item")).toHaveText("Nori");
  await expect(page.locator("#issue-item-101 .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Assignee: Door",
  );
  await expect(page.locator("#issue-item-101 .avatar-wrap.assinee img")).toHaveAttribute(
    "src",
    "/avatars/door.png",
  );
  await expect(page.locator("#issue-item-101 .span3 .mr20.mt10.pull-right")).toContainText(
    "2026-05-01",
  );
  await expect(
    page.locator("#issue-item-101 .for-subtask-progressbar .subtask-progress.upload-progress"),
  ).toHaveClass(/red-outline/);
  await expect(
    page.locator("#issue-item-101 .for-subtask-progressbar .subtask-progress .bar"),
  ).toHaveClass(/red/);
  await expect(page.locator("#issue-item-101 .subtask-progress .bar")).toHaveAttribute(
    "title",
    "Subtask",
  );
  await expect(page.locator("#issue-item-101 .subtask-progress.completion-ratio")).toHaveText(
    "1/3",
  );
  await expect(page.locator("#issue-item-101 .infos-item.subtask a")).toHaveText(
    "#77 Parent iss...",
  );
  await expect(page.locator("#issue-item-101 .infos-item.subtask a")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/77",
  );
  await expect(page.locator("#issue-item-101 .child-issue-list.hide")).toHaveCount(1);
  await expect(
    page.locator("#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue"),
  ).toHaveCount(2);
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .state-label.open",
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .twoColumeModeTarget:has(.item-name)",
    ),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/11");
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .item-name",
    ),
  ).toContainText("#11 Open child issue - Door");
  await expect(
    page.locator(
      '#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .issue-label[data-label-id="8"]',
    ),
  ).toHaveAttribute("data-category-id", "4");
  await expect(
    page.locator(
      '#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .issue-label[data-label-id="8"]',
    ),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issues?state=open&labelIds=8");
  await expect(
    page.locator(
      '#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .issue-label[data-label-id="8"]',
    ),
  ).toHaveText("child");
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .comments-count.comments-count-color",
    ),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/11#comments");
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .vote-count.vote-color",
    ),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/11#vote");
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1) .child-issue-date",
    ),
  ).toHaveAttribute("title", "2026-04-14");
  await expect(
    page.locator(
      "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(2) .state-label.closed .yobicon-checkmark",
    ),
  ).toHaveCount(1);
  await expect(page.locator('.post-list-wrap.row-fluid[data-list="draft-issues"]')).toHaveCount(1);
  await expect(page.locator('#issue-item-102[data-item="issue-item"]')).toHaveCount(1);
  await expect(page.locator("#issue-item-102")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/2",
  );
  await expect(page.locator("#issue-item-102")).toHaveAttribute("data-value", "nori 2 Draft issue");
  await expect(page.locator("#issue-item-102 .draft-number")).toHaveText("#Draft");
  await expect(page.locator("#issue-item-102 .title-wrap a.title").nth(1)).toHaveText(
    "Draft issue",
  );
  await expect(page.locator("#issue-item-102 .infos .infos-link-item")).toHaveText("Nori");
  await expect(page.locator("#issue-item-102 .span3 .empty-avatar-wrap")).toHaveCount(1);
  await expect(page.locator("#issue-item-102 .item-count-groups")).toHaveCount(0);

  const list = await layoutBox(page, ".issue-list-page .post-list-wrap.row-fluid");
  const draftList = await layoutBox(page, '.post-list-wrap.row-fluid[data-list="draft-issues"]');
  const normalList = await layoutBox(
    page,
    ".issue-list-page .post-list-wrap.row-fluid:not([data-list])",
  );
  const draftRow = await layoutBox(page, "#issue-item-102");
  const draftLeftColumn = await layoutBox(page, "#issue-item-102 .span9.span-hard-wrap");
  const draftRightColumn = await layoutBox(page, "#issue-item-102 .span3.hide-in-mobile");
  const draftMassCheck = await layoutBox(page, "#issue-item-102 .mass-update-check.hide-in-mobile");
  const draftCheckboxInput = await layoutBox(page, "#issue-102");
  const draftTitleWrap = await layoutBox(page, "#issue-item-102 .title-wrap");
  const draftNumber = await layoutBox(page, "#issue-item-102 .draft-number");
  const draftTitle = await layoutBox(page, "#issue-item-102 .title-wrap a.title:nth-of-type(2)");
  const draftInfos = await layoutBox(page, "#issue-item-102 .infos");
  const draftAuthorInfo = await layoutBox(page, "#issue-item-102 .infos .infos-link-item");
  const draftUpdatedInfo = await layoutBox(
    page,
    "#issue-item-102 .infos > .infos-item:nth-child(2)",
  );
  const draftEmptyAvatar = await layoutBox(page, "#issue-item-102 .span3 .empty-avatar-wrap");
  const draftRowStyles = await page.locator("#issue-item-102").evaluate((element) => {
    const rowStyle = window.getComputedStyle(element);
    const titleElement = element.querySelector(".title-wrap") as HTMLElement;
    const infosElement = element.querySelector(".infos") as HTMLElement;
    const draftNumber = element.querySelector(".draft-number") as HTMLElement;
    const emptyAvatar = element.querySelector(".empty-avatar-wrap") as HTMLElement;
    const titleStyle = window.getComputedStyle(titleElement);
    const infosStyle = window.getComputedStyle(infosElement);
    const draftNumberStyle = window.getComputedStyle(draftNumber);
    const emptyAvatarStyle = window.getComputedStyle(emptyAvatar);
    return {
      draftNumberColor: draftNumberStyle.color,
      draftNumberDisplay: draftNumberStyle.display,
      emptyAvatarHeight: emptyAvatarStyle.height,
      emptyAvatarWidth: emptyAvatarStyle.width,
      infosFontSize: infosStyle.fontSize,
      rowDisplay: rowStyle.display,
      rowPadding: `${rowStyle.paddingTop} ${rowStyle.paddingRight} ${rowStyle.paddingBottom} ${rowStyle.paddingLeft}`,
      titleLineHeight: titleStyle.lineHeight,
      titleWhiteSpace: titleStyle.whiteSpace,
    };
  });
  const row = await layoutBox(page, "#issue-item-101");
  const filterWrap = await layoutBox(page, ".issue-list-page .filter-wrap.board");
  const massUpdateWrap = await layoutBox(page, ".mass-update-wrap.hide-in-mobile");
  const massUpdateForm = await layoutBox(page, "#mass-update-form");
  const checkAllGroup = await layoutBox(page, ".btn-group.check-all");
  const checkAllInput = await layoutBox(page, "#check-all");
  const stateGroup = await layoutBox(page, "#state");
  const stateButton = await layoutBox(page, "#state .dropdown-toggle.medium");
  const stateButtonLabel = await layoutBox(page, "#state .d-label");
  const stateButtonCaret = await layoutBox(page, "#state .d-caret");
  const assigneeGroup = await layoutBox(page, "#assignee");
  const milestoneGroup = await layoutBox(page, "#milestone");
  const attachingLabelGroup = await layoutBox(page, "#attaching-label");
  const detachingLabelGroup = await layoutBox(page, "#detaching-label");
  const leftColumn = await layoutBox(page, "#issue-item-101 .span9.span-hard-wrap");
  const rightColumn = await layoutBox(page, "#issue-item-101 .span3.hide-in-mobile");
  const massCheck = await layoutBox(page, "#issue-item-101 .mass-update-check.hide-in-mobile");
  const checkboxInput = await layoutBox(page, "#issue-101");
  const issueItemRow = await layoutBox(page, "#issue-item-101 .issue-item-row");
  const titleWrap = await layoutBox(page, "#issue-item-101 .title-wrap");
  const postId = await layoutBox(page, "#issue-item-101 .title-wrap .post-id");
  const issueTitle = await layoutBox(page, "#issue-item-101 .title-wrap a.title:nth-of-type(2)");
  const infos = await layoutBox(page, "#issue-item-101 .infos");
  const authorInfo = await layoutBox(page, "#issue-item-101 .infos .infos-link-item");
  const updatedInfo = await layoutBox(page, "#issue-item-101 .infos > .infos-item:nth-child(2)");
  const subtaskWrapper = await layoutBox(page, "#issue-item-101 .for-subtask-progressbar");
  const subtaskProgress = await layoutBox(
    page,
    "#issue-item-101 .for-subtask-progressbar .subtask-progress.upload-progress",
  );
  const subtaskBar = await layoutBox(page, "#issue-item-101 .subtask-progress .bar");
  const subtaskRatio = await layoutBox(page, "#issue-item-101 .subtask-progress.completion-ratio");
  const parentSubtask = await layoutBox(page, "#issue-item-101 .infos-item.subtask");
  const parentSubtaskLink = await layoutBox(page, "#issue-item-101 .infos-item.subtask a");
  const assigneeWrap = await layoutBox(page, "#issue-item-101 .avatar-wrap.assinee");
  const assigneeImage = await layoutBox(page, "#issue-item-101 .avatar-wrap.assinee img");
  const dueDate = await layoutBox(page, "#issue-item-101 .span3 .mr20.mt10.pull-right");
  const issueRowStyles = await page.locator("#issue-item-101").evaluate((element) => {
    const rowStyle = window.getComputedStyle(element);
    const left = element.querySelector(".span9.span-hard-wrap") as HTMLElement;
    const right = element.querySelector(".span3.hide-in-mobile") as HTMLElement;
    const titleElement = element.querySelector(".title-wrap") as HTMLElement;
    const infosElement = element.querySelector(".infos") as HTMLElement;
    const checkboxLabel = element.querySelector(".mass-update-check") as HTMLElement;
    const rightRail = element.querySelector(".span3.hide-in-mobile") as HTMLElement;
    const avatar = element.querySelector(".avatar-wrap.assinee") as HTMLElement;
    const due = element.querySelector(".span3 .mr20.mt10.pull-right") as HTMLElement;
    const subtaskProgress = element.querySelector(
      ".for-subtask-progressbar .subtask-progress.upload-progress",
    ) as HTMLElement;
    const subtaskBar = element.querySelector(".subtask-progress .bar") as HTMLElement;
    const subtaskRatio = element.querySelector(".subtask-progress.completion-ratio") as HTMLElement;
    const parentSubtask = element.querySelector(".infos-item.subtask") as HTMLElement;
    const leftStyle = window.getComputedStyle(left);
    const rightStyle = window.getComputedStyle(right);
    const titleStyle = window.getComputedStyle(titleElement);
    const infosStyle = window.getComputedStyle(infosElement);
    const checkboxLabelStyle = window.getComputedStyle(checkboxLabel);
    const rightRailStyle = window.getComputedStyle(rightRail);
    const avatarStyle = window.getComputedStyle(avatar);
    const dueStyle = window.getComputedStyle(due);
    const subtaskProgressStyle = window.getComputedStyle(subtaskProgress);
    const subtaskBarStyle = window.getComputedStyle(subtaskBar);
    const subtaskRatioStyle = window.getComputedStyle(subtaskRatio);
    const parentSubtaskStyle = window.getComputedStyle(parentSubtask);
    return {
      avatarDisplay: avatarStyle.display,
      avatarHeight: avatarStyle.height,
      avatarWidth: avatarStyle.width,
      checkboxLabelDisplay: checkboxLabelStyle.display,
      dueDisplay: dueStyle.display,
      dueMarginRight: dueStyle.marginRight,
      dueMarginTop: dueStyle.marginTop,
      infosDisplay: infosStyle.display,
      infosFontSize: infosStyle.fontSize,
      infosLineHeight: infosStyle.lineHeight,
      leftDisplay: leftStyle.display,
      rightDisplay: rightStyle.display,
      rightRailTextAlign: rightRailStyle.textAlign,
      rowDisplay: rowStyle.display,
      rowPadding: `${rowStyle.paddingTop} ${rowStyle.paddingRight} ${rowStyle.paddingBottom} ${rowStyle.paddingLeft}`,
      parentSubtaskDisplay: parentSubtaskStyle.display,
      parentSubtaskFontSize: parentSubtaskStyle.fontSize,
      subtaskBarHeight: subtaskBarStyle.height,
      subtaskBarWidth: subtaskBarStyle.width,
      subtaskProgressDisplay: subtaskProgressStyle.display,
      subtaskProgressHeight: subtaskProgressStyle.height,
      subtaskProgressWidth: subtaskProgressStyle.width,
      subtaskRatioDisplay: subtaskRatioStyle.display,
      subtaskRatioFontSize: subtaskRatioStyle.fontSize,
      titleDisplay: titleStyle.display,
      titleLineHeight: titleStyle.lineHeight,
      titleWhiteSpace: titleStyle.whiteSpace,
    };
  });
  const massUpdateStyles = await page.locator("#mass-update-form").evaluate((element) => {
    const formStyle = window.getComputedStyle(element);
    const checkAll = element.querySelector(".btn-group.check-all") as HTMLElement;
    const checkAllInput = element.querySelector("#check-all") as HTMLElement;
    const button = element.querySelector("#state .dropdown-toggle.medium") as HTMLElement;
    const buttonStyle = window.getComputedStyle(button);
    const checkAllStyle = window.getComputedStyle(checkAll);
    const checkAllInputStyle = window.getComputedStyle(checkAllInput);
    return {
      buttonDisplay: buttonStyle.display,
      buttonHeight: buttonStyle.height,
      buttonPadding: `${buttonStyle.paddingTop} ${buttonStyle.paddingRight} ${buttonStyle.paddingBottom} ${buttonStyle.paddingLeft}`,
      checkAllDisplay: checkAllStyle.display,
      checkAllInputMarginTop: checkAllInputStyle.marginTop,
      formDisplay: formStyle.display,
      formFloat: formStyle.float,
    };
  });

  expect(massUpdateWrap.x).toBeGreaterThanOrEqual(filterWrap.x);
  expect(massUpdateWrap.y).toBeGreaterThanOrEqual(filterWrap.y);
  expect(massUpdateForm.x).toBeGreaterThanOrEqual(massUpdateWrap.x);
  expect(massUpdateForm.y).toBeGreaterThanOrEqual(massUpdateWrap.y);
  expect(checkAllGroup.x).toBeGreaterThanOrEqual(massUpdateForm.x);
  expect(checkAllInput.x).toBeGreaterThanOrEqual(checkAllGroup.x);
  expect(stateGroup.x).toBeGreaterThan(checkAllGroup.x + checkAllGroup.width - 1);
  expect(assigneeGroup.x).toBeGreaterThan(stateGroup.x + stateGroup.width - 1);
  expect(milestoneGroup.x).toBeGreaterThan(assigneeGroup.x + assigneeGroup.width - 1);
  expect(attachingLabelGroup.x).toBeGreaterThan(milestoneGroup.x + milestoneGroup.width - 1);
  expect(detachingLabelGroup.x).toBeGreaterThan(
    attachingLabelGroup.x + attachingLabelGroup.width - 1,
  );
  expect(stateGroup.y).toBeCloseTo(checkAllGroup.y, 0);
  expect(assigneeGroup.y).toBeCloseTo(stateGroup.y, 0);
  expect(milestoneGroup.y).toBeCloseTo(stateGroup.y, 0);
  expect(attachingLabelGroup.y).toBeCloseTo(stateGroup.y, 0);
  expect(detachingLabelGroup.y).toBeCloseTo(stateGroup.y, 0);
  expect(stateButtonLabel.x).toBeGreaterThanOrEqual(stateButton.x);
  expect(stateButtonCaret.x).toBeGreaterThan(stateButtonLabel.x + stateButtonLabel.width - 1);
  expect(stateButtonCaret.x + stateButtonCaret.width).toBeLessThanOrEqual(
    stateButton.x + stateButton.width + 1,
  );
  expect(massUpdateStyles).toEqual({
    buttonDisplay: "inline-block",
    buttonHeight: "30px",
    buttonPadding: "4px 12px 4px 12px",
    checkAllDisplay: "inline-block",
    checkAllInputMarginTop: "4px",
    formDisplay: "block",
    formFloat: "left",
  });

  await page.locator("#issue-101").check();
  await expect(page.locator("#state .dropdown-toggle.medium")).toBeEnabled();
  await expect(page.locator("#assignee .dropdown-toggle.medium")).toBeEnabled();
  await expect(page.locator("#milestone .dropdown-toggle.medium")).toBeEnabled();
  await expect(page.locator("#attaching-label .dropdown-toggle.medium")).toBeEnabled();
  await expect(page.locator("#detaching-label .dropdown-toggle.medium")).toBeEnabled();
  await expect(page.locator("#check-all")).toHaveJSProperty("checked", false);

  await page.locator("#state .dropdown-toggle.medium").click();
  await expect(page.locator("#state")).toHaveClass(/open/);
  await expect(page.locator("#state .mass-update-list > li")).toHaveCount(2);
  await expect(page.locator("#state .mass-update-list > li").nth(0)).toHaveAttribute(
    "data-value",
    "OPEN",
  );
  await expect(page.locator("#state .mass-update-list > li").nth(1)).toHaveAttribute(
    "data-value",
    "CLOSED",
  );
  await expect(page.locator("#state .mass-update-list")).toContainText("Open");
  await expect(page.locator("#state .mass-update-list")).toContainText("Closed");
  const openStateButton = await layoutBox(page, "#state .dropdown-toggle.medium");
  const openStateMenu = await layoutBox(page, "#state .mass-update-list");
  expect(openStateMenu.x).toBeGreaterThanOrEqual(openStateButton.x - 1);
  expect(openStateMenu.y).toBeGreaterThanOrEqual(openStateButton.y + openStateButton.height - 1);

  await page.locator("#attaching-label .dropdown-toggle.medium").click();
  await expect(page.locator("#attaching-label")).toHaveClass(/open/);
  await expect(page.locator("#attach-label-list > li.disabled")).toHaveAttribute(
    "data-category",
    "4",
  );
  await expect(page.locator('#attach-label-list [data-label-id="7"]')).toHaveText("bright");
  await expect(page.locator("#attach-label-list > li.divider")).toHaveAttribute(
    "data-category",
    "4",
  );
  const openLabelButton = await layoutBox(page, "#attaching-label .dropdown-toggle.medium");
  const openLabelMenu = await layoutBox(page, "#attach-label-list");
  expect(openLabelMenu.x).toBeGreaterThanOrEqual(openLabelButton.x - 1);
  expect(openLabelMenu.y).toBeGreaterThanOrEqual(openLabelButton.y + openLabelButton.height - 1);

  expect(draftList.y).toBeGreaterThanOrEqual(list.y);
  expect(normalList.y).toBeGreaterThan(draftList.y + draftList.height - 1);
  expect(draftRow.y).toBeGreaterThanOrEqual(draftList.y);
  expect(draftRow.width).toBeGreaterThanOrEqual(draftList.width - 2);
  expect(draftLeftColumn.x).toBeGreaterThanOrEqual(draftRow.x);
  expect(draftRightColumn.x).toBeGreaterThan(draftLeftColumn.x + draftLeftColumn.width - 1);
  expect(draftRightColumn.y).toBeCloseTo(draftLeftColumn.y, 0);
  expect(draftMassCheck.x).toBeGreaterThanOrEqual(draftLeftColumn.x);
  expect(draftCheckboxInput.x).toBeGreaterThanOrEqual(draftMassCheck.x);
  expect(draftTitleWrap.y).toBeGreaterThanOrEqual(draftRow.y);
  expect(draftNumber.x).toBeGreaterThanOrEqual(draftTitleWrap.x);
  expect(draftTitle.x).toBeGreaterThan(draftNumber.x + draftNumber.width - 1);
  expect(draftInfos.y).toBeGreaterThan(draftTitleWrap.y);
  expect(draftAuthorInfo.x).toBeGreaterThanOrEqual(draftInfos.x);
  expect(draftUpdatedInfo.x).toBeGreaterThan(draftAuthorInfo.x + draftAuthorInfo.width - 1);
  expect(draftEmptyAvatar.x).toBeGreaterThanOrEqual(draftRightColumn.x);
  expect(draftEmptyAvatar.x + draftEmptyAvatar.width).toBeLessThanOrEqual(
    draftRightColumn.x + draftRightColumn.width + 1,
  );
  expect(draftRowStyles).toEqual({
    draftNumberColor: "rgb(153, 153, 153)",
    draftNumberDisplay: "inline",
    emptyAvatarHeight: "32px",
    emptyAvatarWidth: "32px",
    infosFontSize: "12px",
    rowDisplay: "block",
    rowPadding: "10px 10px 10px 10px",
    titleLineHeight: "20px",
    titleWhiteSpace: "nowrap",
  });

  expect(row.y).toBeGreaterThanOrEqual(normalList.y);
  expect(row.width).toBeGreaterThanOrEqual(list.width - 2);
  expect(leftColumn.x).toBeGreaterThanOrEqual(row.x);
  expect(rightColumn.x).toBeGreaterThan(leftColumn.x + leftColumn.width - 1);
  expect(rightColumn.x + rightColumn.width).toBeLessThanOrEqual(row.x + row.width + 1);
  expect(leftColumn.width).toBeGreaterThan(rightColumn.width * 2.5);
  expect(rightColumn.y).toBeCloseTo(leftColumn.y, 0);
  expect(massCheck.x).toBeGreaterThanOrEqual(leftColumn.x);
  expect(checkboxInput.x).toBeGreaterThanOrEqual(massCheck.x);
  expect(issueItemRow.x).toBeGreaterThanOrEqual(leftColumn.x);
  expect(issueItemRow.x).toBeLessThan(checkboxInput.x + checkboxInput.width + 1);
  expect(issueItemRow.x + issueItemRow.width).toBeLessThanOrEqual(
    leftColumn.x + leftColumn.width + 1,
  );
  expect(titleWrap.y).toBeGreaterThanOrEqual(row.y);
  expect(postId.x).toBeGreaterThanOrEqual(titleWrap.x);
  expect(issueTitle.x).toBeGreaterThan(postId.x + postId.width - 1);
  expect(infos.y).toBeGreaterThan(titleWrap.y);
  expect(authorInfo.x).toBeGreaterThanOrEqual(infos.x);
  expect(updatedInfo.x).toBeGreaterThan(authorInfo.x + authorInfo.width - 1);
  expect(subtaskWrapper.x).toBeGreaterThanOrEqual(infos.x);
  expect(subtaskWrapper.y).toBeLessThanOrEqual(infos.y + infos.height);
  expect(subtaskProgress.x).toBeGreaterThanOrEqual(subtaskWrapper.x);
  expect(subtaskProgress.y).toBeGreaterThanOrEqual(updatedInfo.y - 2);
  expect(subtaskProgress.y).toBeGreaterThanOrEqual(infos.y - 2);
  expect(subtaskBar.x).toBeGreaterThanOrEqual(subtaskProgress.x);
  expect(subtaskBar.width).toBeGreaterThan(0);
  expect(subtaskBar.width).toBeLessThan(subtaskProgress.width);
  expect(subtaskRatio.x).toBeGreaterThanOrEqual(infos.x);
  expect(subtaskRatio.y).toBeGreaterThanOrEqual(infos.y - 2);
  expect(parentSubtask.x).toBeGreaterThanOrEqual(infos.x);
  expect(parentSubtaskLink.x).toBeGreaterThanOrEqual(parentSubtask.x);
  expect(parentSubtask.y).toBeLessThanOrEqual(infos.y + infos.height);
  expect(assigneeWrap.x).toBeGreaterThanOrEqual(rightColumn.x);
  expect(assigneeWrap.x + assigneeWrap.width).toBeLessThanOrEqual(
    rightColumn.x + rightColumn.width + 1,
  );
  expect(assigneeImage.width).toBeGreaterThanOrEqual(32);
  expect(assigneeImage.width).toBeLessThanOrEqual(34);
  expect(assigneeImage.height).toBeGreaterThanOrEqual(32);
  expect(assigneeImage.height).toBeLessThanOrEqual(34);
  expect(dueDate.x).toBeGreaterThanOrEqual(rightColumn.x);
  expect(dueDate.x + dueDate.width).toBeLessThanOrEqual(assigneeWrap.x + 1);
  expect(dueDate.y).toBeGreaterThanOrEqual(row.y);
  expect(dueDate.y).toBeLessThanOrEqual(assigneeWrap.y + assigneeWrap.height + 2);
  expect(issueRowStyles).toEqual({
    avatarDisplay: "block",
    avatarHeight: "32px",
    avatarWidth: "32px",
    checkboxLabelDisplay: "block",
    dueDisplay: "block",
    dueMarginRight: "20px",
    dueMarginTop: "10px",
    infosDisplay: "block",
    infosFontSize: "12px",
    infosLineHeight: "20px",
    leftDisplay: "block",
    rightDisplay: "block",
    rightRailTextAlign: "start",
    rowDisplay: "block",
    rowPadding: "10px 10px 10px 10px",
    parentSubtaskDisplay: "block",
    parentSubtaskFontSize: "9.6px",
    subtaskBarHeight: "7px",
    subtaskBarWidth: "9.89062px",
    subtaskProgressDisplay: "inline-block",
    subtaskProgressHeight: "7px",
    subtaskProgressWidth: "30px",
    subtaskRatioDisplay: "inline-block",
    subtaskRatioFontSize: "9.6px",
    titleDisplay: "block",
    titleLineHeight: "20px",
    titleWhiteSpace: "nowrap",
  });

  await expect(page.locator("#issue-item-101 .child-issue-list.hide")).toBeHidden();
  await page.locator("#issue-item-101 .child-issue-list").evaluate((element) => {
    element.classList.remove("hide");
  });
  await page.locator("#issue-item-101 .issue-item-row").hover();

  const childList = await layoutBox(page, "#issue-item-101 .child-issue-list");
  const childListInner = await layoutBox(page, "#issue-item-101 .child-issue-list > .child-issues");
  const firstChild = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(1)",
  );
  const firstChildState = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) .state-label.open",
  );
  const firstChildLink = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) > .twoColumeModeTarget",
  );
  const firstChildName = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) .item-name",
  );
  const firstChildPair = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) .font12.no-border-at-child",
  );
  const firstChildLabel = await layoutBox(
    page,
    '#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) .issue-label[data-label-id="8"]',
  );
  const firstChildDate = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(1) .child-issue-date",
  );
  const secondChild = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list > .child-issues > .issue-item.child-issue:nth-child(2)",
  );
  const secondChildState = await layoutBox(
    page,
    "#issue-item-101 .child-issue-list .issue-item.child-issue:nth-child(2) .state-label.closed",
  );
  const childListStyles = await page
    .locator("#issue-item-101 .child-issue-list")
    .evaluate((element) => {
      const wrapperStyle = window.getComputedStyle(element);
      const firstChild = element.querySelector(".issue-item.child-issue") as HTMLElement;
      const closedState = element.querySelector(".state-label.closed") as HTMLElement;
      const closedIcon = element.querySelector(
        ".state-label.closed .yobicon-checkmark",
      ) as HTMLElement;
      const childDate = element.querySelector(".child-issue-date") as HTMLElement;
      const childLabel = element.querySelector(".issue-label") as HTMLElement;
      const childStyle = window.getComputedStyle(firstChild);
      const closedStateStyle = window.getComputedStyle(closedState);
      const closedIconStyle = window.getComputedStyle(closedIcon);
      const childDateStyle = window.getComputedStyle(childDate);
      const childLabelStyle = window.getComputedStyle(childLabel);
      return {
        childDateColor: childDateStyle.color,
        childDateDisplay: childDateStyle.display,
        childDisplay: childStyle.display,
        childLabelBackgroundColor: childLabelStyle.backgroundColor,
        childLabelBoxShadow: childLabelStyle.boxShadow,
        childLabelColor: childLabelStyle.color,
        childPaddingLeft: childStyle.paddingLeft,
        closedIconColor: closedIconStyle.color,
        closedStateBackgroundColor: closedStateStyle.backgroundColor,
        wrapperColor: wrapperStyle.color,
        wrapperDisplay: wrapperStyle.display,
      };
    });

  expect(childList.x).toBeGreaterThanOrEqual(infos.x);
  expect(childList.y).toBeGreaterThanOrEqual(infos.y);
  expect(childListInner.x).toBeGreaterThanOrEqual(childList.x);
  expect(firstChild.y).toBeGreaterThanOrEqual(childListInner.y);
  expect(firstChildState.x).toBeGreaterThanOrEqual(firstChild.x);
  expect(firstChildLink.x).toBeGreaterThanOrEqual(firstChildState.x + firstChildState.width - 1);
  expect(firstChildName.x).toBeGreaterThanOrEqual(firstChildLink.x);
  expect(firstChildPair.x).toBeGreaterThan(firstChildLink.x + firstChildLink.width - 1);
  expect(firstChildLabel.x).toBeGreaterThan(firstChildPair.x + firstChildPair.width - 1);
  expect(firstChildDate.x).toBeGreaterThan(firstChildLabel.x + firstChildLabel.width - 1);
  expect(secondChild.y).toBeGreaterThan(firstChild.y + firstChild.height - 1);
  expect(secondChildState.x).toBeGreaterThanOrEqual(secondChild.x);
  expect(childListStyles).toEqual({
    childDateColor: "rgb(211, 211, 211)",
    childDateDisplay: "inline-block",
    childDisplay: "block",
    childLabelBackgroundColor: "rgb(33, 150, 243)",
    childLabelBoxShadow: "rgb(33, 150, 243) 2px 0px 0px 0px inset",
    childLabelColor: "rgb(255, 255, 255)",
    childPaddingLeft: "0px",
    closedIconColor: "rgb(253, 105, 86)",
    closedStateBackgroundColor: "rgba(0, 0, 0, 0)",
    wrapperColor: "rgb(102, 102, 102)",
    wrapperDisplay: "block",
  });

  const group = await layoutBox(page, parentCountSelector);
  const issueLabel = await layoutBox(page, '#issue-item-101 .issue-label[data-label-id="7"]');
  const commentLink = await layoutBox(
    page,
    `${parentCountSelector} > .comments-count.comments-count-color`,
  );
  const commentIcon = await layoutBox(
    page,
    `${parentCountSelector} > .comments-count .count-groups.item-icon`,
  );
  const commentCount = await layoutBox(
    page,
    `${parentCountSelector} > .comments-count .count-groups.item-count`,
  );
  const voteLink = await layoutBox(page, `${parentCountSelector} > .vote-count.vote-color`);
  const voteIcon = await layoutBox(
    page,
    `${parentCountSelector} > .vote-count .count-groups.item-icon`,
  );
  const voteCount = await layoutBox(
    page,
    `${parentCountSelector} > .vote-count .count-groups.item-count`,
  );
  const sharerLink = await layoutBox(page, `${parentCountSelector} > .sharer-color`);
  const sharerIcon = await layoutBox(
    page,
    `${parentCountSelector} > .sharer-color .count-groups.item-icon`,
  );
  const sharerCount = await layoutBox(
    page,
    `${parentCountSelector} > .sharer-color .count-groups.item-count`,
  );
  const countGroupStyles = await page.locator(parentCountSelector).evaluate((groupElement) => {
    const groupStyle = window.getComputedStyle(groupElement);
    const commentLinkElement = groupElement.querySelector(".comments-count") as HTMLElement;
    const commentIconElement = commentLinkElement.querySelector(".item-icon") as HTMLElement;
    const commentCountElement = commentLinkElement.querySelector(".item-count") as HTMLElement;
    const voteLinkElement = groupElement.querySelector(".vote-count") as HTMLElement;
    const voteIconElement = voteLinkElement.querySelector(".item-icon") as HTMLElement;
    const voteCountElement = voteLinkElement.querySelector(".item-count") as HTMLElement;
    const sharerLinkElement = groupElement.querySelector(".sharer-color") as HTMLElement;
    const sharerIconElement = sharerLinkElement.querySelector(".item-icon") as HTMLElement;
    const sharerCountElement = sharerLinkElement.querySelector(".item-count") as HTMLElement;
    const commentLinkStyle = window.getComputedStyle(commentLinkElement);
    const commentIconStyle = window.getComputedStyle(commentIconElement);
    const commentCountStyle = window.getComputedStyle(commentCountElement);
    const voteLinkStyle = window.getComputedStyle(voteLinkElement);
    const voteIconStyle = window.getComputedStyle(voteIconElement);
    const voteCountStyle = window.getComputedStyle(voteCountElement);
    const sharerLinkStyle = window.getComputedStyle(sharerLinkElement);
    const sharerIconStyle = window.getComputedStyle(sharerIconElement);
    const sharerCountStyle = window.getComputedStyle(sharerCountElement);
    return {
      commentColor: commentLinkStyle.color,
      commentCountFontWeight: commentCountStyle.fontWeight,
      commentCountPaddingRight: commentCountStyle.paddingRight,
      commentIconFontSize: commentIconStyle.fontSize,
      commentIconLineHeight: commentIconStyle.lineHeight,
      commentIconPaddingTop: commentIconStyle.paddingTop,
      groupBorderTopWidth: groupStyle.borderTopWidth,
      groupLineHeight: groupStyle.lineHeight,
      sharerColor: sharerLinkStyle.color,
      sharerCountPaddingRight: sharerCountStyle.paddingRight,
      sharerIconFontSize: sharerIconStyle.fontSize,
      sharerIconLineHeight: sharerIconStyle.lineHeight,
      sharerIconPaddingTop: sharerIconStyle.paddingTop,
      sharerMarginLeft: sharerLinkStyle.marginLeft,
      voteColor: voteLinkStyle.color,
      voteCountPaddingRight: voteCountStyle.paddingRight,
      voteIconFontSize: voteIconStyle.fontSize,
      voteIconLineHeight: voteIconStyle.lineHeight,
      voteIconPaddingTop: voteIconStyle.paddingTop,
      voteMarginLeft: voteLinkStyle.marginLeft,
    };
  });
  const labelStyles = await page
    .locator('#issue-item-101 .issue-label[data-label-id="7"]')
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    });

  expect(commentLink.x).toBeGreaterThanOrEqual(group.x);
  expect(commentLink.y).toBeGreaterThanOrEqual(group.y);
  expect(commentIcon.x).toBeGreaterThanOrEqual(commentLink.x);
  expect(commentCount.x).toBeGreaterThan(commentIcon.x);
  expect(commentIcon.y).toBeLessThanOrEqual(commentCount.y + commentCount.height);
  expect(commentCount.y).toBeLessThanOrEqual(commentIcon.y + commentIcon.height);
  expect(commentCount.x + commentCount.width).toBeLessThanOrEqual(
    commentLink.x + commentLink.width + 1,
  );
  expect(voteLink.x).toBeGreaterThan(commentLink.x);
  expect(voteLink.x).toBeGreaterThanOrEqual(group.x);
  expect(voteLink.y).toBeGreaterThanOrEqual(group.y);
  expect(voteIcon.x).toBeGreaterThanOrEqual(voteLink.x);
  expect(voteCount.x).toBeGreaterThan(voteIcon.x);
  expect(sharerLink.x).toBeGreaterThan(voteLink.x);
  expect(sharerIcon.x).toBeGreaterThanOrEqual(sharerLink.x);
  expect(sharerCount.x).toBeGreaterThan(sharerIcon.x);
  expect(sharerIcon.y).toBeLessThanOrEqual(sharerCount.y + sharerCount.height);
  expect(sharerCount.y).toBeLessThanOrEqual(sharerIcon.y + sharerIcon.height);
  expect(Math.max(voteIcon.y, voteCount.y)).toBeLessThanOrEqual(
    Math.min(voteIcon.y + voteIcon.height, voteCount.y + voteCount.height),
  );
  expect(voteCount.x + voteCount.width).toBeLessThanOrEqual(voteLink.x + voteLink.width + 1);
  expect(sharerCount.x + sharerCount.width).toBeLessThanOrEqual(
    sharerLink.x + sharerLink.width + 1,
  );
  expect(issueLabel.x).toBeGreaterThan(group.x + group.width - 1);
  expect(issueLabel.y).toBeGreaterThanOrEqual(group.y - 2);
  expect(labelStyles).toEqual({
    backgroundColor: "rgb(255, 235, 59)",
    boxShadow: "rgb(255, 235, 59) 2px 0px 0px 0px inset",
    color: "rgb(105, 105, 105)",
  });
  expect(countGroupStyles).toEqual({
    commentColor: "rgb(139, 0, 139)",
    commentCountFontWeight: "400",
    commentCountPaddingRight: "5px",
    commentIconFontSize: "9px",
    commentIconLineHeight: "12px",
    commentIconPaddingTop: "2px",
    groupBorderTopWidth: "1px",
    groupLineHeight: "14px",
    sharerColor: "rgb(0, 127, 202)",
    sharerCountPaddingRight: "5px",
    sharerIconFontSize: "9px",
    sharerIconLineHeight: "12px",
    sharerIconPaddingTop: "2px",
    sharerMarginLeft: "-5px",
    voteColor: "rgb(243, 108, 34)",
    voteCountPaddingRight: "5px",
    voteIconFontSize: "9px",
    voteIconLineHeight: "12px",
    voteIconPaddingTop: "2px",
    voteMarginLeft: "-5px",
  });
});
