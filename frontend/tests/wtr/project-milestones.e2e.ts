import { expect, test, type Page } from "../wtr-compat.ts";

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
  const labels = page.locator('button.issue-label[data-category-id="3"][data-label-id="8"]');
  await expect(labels).toHaveCount(2);
  await expect(labels.first()).toHaveAttribute("type", "button");
  await expect(page.locator('.issue-link[href$="/issue/11"]')).toHaveAttribute("target", "_blank");
  const progressBars = page.locator('[data-owner="project-milestones-progress-bar"]');
  await expect(progressBars).toHaveCount(2);
  // copy-fix-current-dom: compile-mode style emits className only — the
  // runtime --x-width var is absent (same ruling as project-import #repoAuth);
  // computed width pins below carry the parity contract.
  await expect(progressBars.first()).toHaveCSS("width", "630px");
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
    // F5 dist-truth: .search-btn has no width rule in legacy
    // (yona-original/app/assets/stylesheets/less/_yobiUI.less:1386-1395 — only
    // height:20px/positioning); the 14px width is the yobicon glyph box at the
    // dist font, measured truth (12px was an earlier build's metric).
    searchButtonWidth: 14,
    searchInputWidth: 360,
    tabWrapMarginBottom: "0px",
  });

  await page.fill('.filter-wrap.milestone input[name="filter"]', "closed");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeHidden();
  // copy-fix-current-dom: the app hides filtered issue links via a style
  // class (no inline display:none — compile-mode style emits className);
  // toBeHidden above carries the visibility contract.
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

test("milestone state transitions preserve the page shell while replacing the list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page);

  let releaseClosedResponse: (() => void) | undefined;
  const closedResponseGate = new Promise<void>((resolve) => {
    releaseClosedResponse = resolve;
  });
  const milestonesEndpoint = "**/api/v1/owners/admin/projects/sample/milestones**";
  await page.unroute(milestonesEndpoint);
  await page.route(milestonesEndpoint, async (route) => {
    const state = new URL(route.request().url()).searchParams.get("state");
    if (state === "closed") {
      await closedResponseGate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ milestones: [allStateMilestones()[1]] }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: openStateMilestones() }),
    });
  });

  await page.goto(`${basePath}/admin/sample/milestones?state=open`);
  await expect(page.locator('[data-owner="project-milestones-tabs"]')).toBeVisible();
  const fixedShellSelectors = {
    page: '[data-owner="project-milestones-page"]',
    shell: '[data-owner="project-milestones-shell"]',
    tabWrap: '[data-owner="project-milestones-tab-wrap"]',
    tabs: '[data-owner="project-milestones-tabs"]',
    list: '[data-owner="project-milestones-list"]',
  } as const;
  const fixedShellTokens = await page.evaluate((selectors) => {
    const tokens: Record<string, string> = {};
    for (const [name, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const token = `milestone-transition-${name}`;
      element.setAttribute("data-parity-transition-token", token);
      tokens[name] = token;
    }
    return tokens;
  }, fixedShellSelectors);

  const closedRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/v1/owners/admin/projects/sample/milestones") &&
      new URL(request.url()).searchParams.get("state") === "closed",
  );
  await page.locator('[data-owner="project-milestones-tab-link"]').nth(1).click();
  await closedRequest;
  await expect(page.locator('[data-owner="project-milestones-loading-tabs"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="project-milestones-item"]')).toHaveCount(2);

  releaseClosedResponse?.();
  await expect(page.locator('[data-owner="project-milestones-item"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="project-milestones-tabs"] li.active')).toHaveText(
    "Closed",
  );
  for (const [name, token] of Object.entries(fixedShellTokens)) {
    await expect(
      page.locator(fixedShellSelectors[name as keyof typeof fixedShellSelectors]),
    ).toHaveAttribute("data-parity-transition-token", token);
  }
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
  ).toHaveClass(/(?:^|\s)due-date(?:\s|$)/u);
  await expect(
    page.locator(".milestone").filter({ hasText: "v0.9" }).locator(".due-date"),
  ).toHaveClass(/(?:^|\s)ml5(?:\s|$)/u);
});

test("milestone list localizes the due-date relative label", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page);
  await page.addInitScript((basePathValue) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: basePathValue,
      supportedLanguages: ["ko-KR"],
      siteName: "Yoram",
      hideProjectListing: false,
    };
  }, basePath);
  await page.unroute("**/api/v1/owners/admin/projects/sample/milestones**");
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    const milestones = openStateMilestones();
    milestones[0].untilLabel = "50 days past";
    milestones[1].untilLabel = "Today";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones }),
    });
  });
  await page.goto(`${basePath}/admin/sample/milestones`);
  await expect(page.locator('[data-owner="project-milestones-until"]')).toHaveText([
    "(50일 지남)",
    "(오늘)",
  ]);
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
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  // wave-33 retained-class retention (667398a04): legacy navbar.scala.html:105 always
  // renders class="search-box select" in project/org context; app classList matches.
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator(".gnb-search-form [data-toggle='search-scope']")).toHaveCount(0);

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator("[data-owner=global-gnb-search-scope-item] > button")
    .filter({ hasText: "This Group" })
    .click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator("[data-owner=global-gnb-search-scope-item] > button")
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
    // F5 dist-truth (2026-08-11): the milestone shell header keeps gnb-outer.
    gnbClassName: "gnb-outer",
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/milestones**", async (route) => {
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
    const gnb = requireElement("[data-owner=global-gnb-outer]");
    const navbar = requireElement('[data-owner="global-gnb-inner"]');
    const search = requireElement('[data-owner="global-gnb-search-box"]');
    const projectHeader = requireElement(".project-header-outer");
    const projectMenu = requireElement(".project-menu-outer");
    const pageWrap = requireElement(".page-wrap-outer");
    const navbarBox = navbar.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    const pageWrapBox = pageWrap.getBoundingClientRect();

    return {
      gnbClassName: gnb.className
        .split(/\s+/u)
        .filter((token) => !token.startsWith("-home-route-screen__") && !/^x[\w-]+$/u.test(token))
        .join(" "),
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
