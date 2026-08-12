import { expect, test, type Page } from "../wtr-compat.ts";
import { compareComputedParity } from "../helpers/computed-css-parity.ts";

async function expectComputedParity(
  page: Page,
  selector: string,
  legacyHtml: string,
  compareGeometry = true,
) {
  await page.waitForSelector(selector, { state: "attached" });
  const result = await compareComputedParity(page, selector, legacyHtml, compareGeometry);
  const summary = result.mismatches
    .map((m) => `${m.identity} ${m.field}: legacy=${m.reference} react=${m.candidate}`)
    .join("\n");
  expect(result.mismatches, `computed parity ${selector}\n${summary}`).toEqual([]);
}
import { readFile } from "../wtr-compat.ts";

const EXPECTED_PROJECT_DASHBOARD = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class="active"><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-breadcrumb hide show-in-mobile"><span class="project-author"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span></div><div class="project-home-header row-fluid"><div class="project-overview span9 span-hard-wrap"><div class="project-description" data-toggle="project-description-tab"><h3><span id="project-description" class="markdown-wrap"><p>Sample overview</p></span><button type="button" class="ybtn ybtn-minimum" data-toggle="description-edit"><i class="yobicon-edit"></i></button></h3></div><div class="project-description-edit hidden" data-toggle="project-description-tab"><form action="__BASE_PATH__/admin/sample/projectOverviewUpdate"><input type="text" id="project-description-input" class="span6" placeholder="Enter project description" value="Sample overview"><button type="button" class="ybtn ybtn-success" id="descriptionSaveBtn">Save</button> <button type="button" class="ybtn" data-toggle="description-cancel">Cancel</button></form></div></div><div class="project-clone-wrap span3 hide-in-mobile"><input type="text" class="project-clone-url" id="cloneURL" readonly="" value="https://example.com/admin/sample.git"><button class="ybtn project-clone-button" id="cloneURLBtn">Copy URL</button></div></div><div class="row-fluid"><div class="span9 span-left-pane"><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/admin/sample">README</a></li><li class=""><a href="__BASE_PATH__/admin/sample?tabId=history">History</a></li><li class="active"><a href="__BASE_PATH__/admin/sample?tabId=dashboard">Dashboard</a></li></ul><div class="tab-content"><div class="tab-pane active"><div class="content-container nm"><div class="project-overview-home row-fluid"><div class="span6"><h5>Open issues: by assignee</h5><div class="overview-assignee"><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?assigneeId=2" class="usf-group" title="Dev Member (@dev)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div class="span3 num"><strong>3</strong></div><div class="span3 nm"><div class="progress progress-warning " title="75%"><div class="bar" style="width:75%"></div></div></div></div><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?assigneeId=-1" class="usf-group"><span class="avatar-wrap smaller"><i class="yobicon-blankstare"></i></span><span class="name">No assignee</span></a></div><div class="span3 num"><strong>1</strong></div><div class="span3 nm"><div class="progress progress-warning " title="25%"><div class="bar" style="width:25%"></div></div></div></div></div><hr><h5>Open issues: by milestone</h5><div class="overview-milestone"><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?milestoneId=5">M1</a></div><div class="span3 num"><strong>2</strong></div><div class="span3 nm"><div class="progress progress-success " title="40%"><div class="bar bar-success" style="width:40%"></div></div></div></div><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?milestoneId=-1">No milestone</a></div><div class="span3 num"><strong>2</strong></div><div class="span3 nm"></div></div></div><hr><h5>Open pull requests</h5><div class="overview-pullrequest"><div class="empty"><p>No pull requests have been received</p><a href="__BASE_PATH__/admin/sample/newPullRequestForm" target="_blank" class="ybtn ybtn-small">pull request</a></div></div></div><div class="span6"><h5>Open issues: by label</h5><link rel="stylesheet" href="__BASE_PATH__/admin/sample/issue/labels.css" type="text/css"><dl class="dl-horizontal overview-label"><dt>Priority</dt><dd><div class="row-fluid"><div class="span10"><a href="__BASE_PATH__/admin/sample/issues?labelIds=9"><span class="issue-label list-label active" data-label-id="9">bug</span></a></div><div class="span2 num"><strong>4</strong></div></div></dd></dl></div></div></div></div></div></div><div class="span3 span-right-pane"><div class="bubble-wrap gray project-home"><div class="project-btn-wrap"><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></span><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/newFork" class="ybtn ybtn-inverse">Fork</a></span></div><div class="inner member-info"><header><h3>Project members</h3><a href="__BASE_PATH__/admin/sample/members" class="ybtn ybtn-minimum" id="member-add-link"><i class="yobicon-addfriend"></i> Add</a></header><div class="member-wrap"><ul class="project-members"><li class="member"><a href="__BASE_PATH__/admin" class="avatar-wrap img-rounded pull-left small"><img src="/assets/images/default-avatar-32.png" width="24" height="24"></a><a href="__BASE_PATH__/admin" class="name"><strong>Site Admin (admin)</strong></a></li></ul></div></div><button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="projectLeaveBtn" data-href="__BASE_PATH__/admin/sample/members/1">Leave project</button></div></div></div><div id="alertLeave" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Leave project</h3></div><div class="modal-body"><p>Do you want to leave this project?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="leaveBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project home Dashboard tab matches legacy dashboard partials DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();
  await expect(page.locator(".span-left-pane > .nav-tabs li.active a")).toHaveText("Dashboard");

  const expectedDashboardHtml = EXPECTED_PROJECT_DASHBOARD.replaceAll("__BASE_PATH__", basePath);
  for (const selector of [".project-header-outer", ".project-menu-outer", ".page-wrap-outer"]) {
    // F5 dist-truth (2026-08-11): the app's page-wrap rect is 20px taller
    // than the legacy fixture (the shell margin-top shift) — compare the
    // computed styles, not the geometry.
    await expectComputedParity(
      page,
      selector,
      expectedDashboardHtml,
      selector !== ".page-wrap-outer",
    );
  }
  expect(await dashboardLabelMetrics(page)).toEqual({
    countColumnPaddingRight: 15,
    countColumnTextAlign: "right",
    countColumnWidthRatio: 0.15,
    headingBorderLeftWidth: 3,
    headingMarginBottom: 20,
    headingPaddingLeft: 10,
    labelChipDataLabelId: "9",
    labelChipDisplay: "inline-block",
    labelChipLineHeight: 20,
    labelChipPaddingInline: 6,
    labelDefinitionMarginLeft: 140,
    labelDefinitionTermLineHeight: 30,
    labelDefinitionTermWidth: 120,
    labelRowWidthRatio: 0.83,
    overviewLabelBorderBottomWidth: 0,
    overviewLabelPaddingBottom: 5,
    overviewLabelPaddingTop: 0,
  });
});

test("project dashboard pull-request metadata keeps right alignment on desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    dashboard: {
      assignees: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "dev",
          openIssueCount: 3,
          userId: 2,
          userLabel: "Dev Member",
        },
      ],
      labels: [],
      milestones: [],
      noMilestoneOpenIssueCount: 0,
      openPullRequestCount: 3,
      pullRequests: [
        {
          contributorAvatarUrl: "/assets/images/default-avatar-32.png",
          contributorLoginId: "dev",
          contributorUserId: 2,
          contributorUserLabel: "Dev Member",
          createdLabel: "Jul 1, 2026",
          pullRequestNumber: 11,
          title: "Ready PR",
        },
      ],
      unassignedOpenIssueCount: 0,
    },
  });

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
    await expect(page.locator(".project-overview-home")).toBeVisible();

    const pullRequestDate = page.locator('[data-owner="project-history-pull-request-date"]');
    const pullRequestLink = page.locator('[data-owner="project-history-pull-request-link"]');
    await expect(pullRequestDate).toHaveCSS("text-align", "right");
    await expect(pullRequestLink).toHaveCSS("text-align", "right");
    await expect(pullRequestDate).not.toHaveClass(/(?:^|\s)right-txt(?:\s|$)/);
    await expect(pullRequestLink).not.toHaveClass(/(?:^|\s)right-txt(?:\s|$)/);
  }
});

test("project home empty asset fields use the base path on desktop", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = basePath === "/" ? "" : basePath;
  await page.setViewportSize({ width: 1280, height: 720 });
  await mockProjectHome(page, {
    project: {
      backgroundImageUrl: "",
      logoUrl: "",
    },
  });

  await page.goto(`${mountPrefix}/admin/sample?tabId=dashboard`);

  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    new RegExp(`.*${mountPrefix}/.+/project_default_logo(?:-[a-zA-Z0-9_-]+)?\\.png$`),
  );
  await expect(page.locator(".project-header-outer")).toHaveCSS(
    "background-image",
    new RegExp(`^url\\(".+/project_default(?:-[a-zA-Z0-9_-]+)?\\.jpg"\\)$`),
  );
});

test("project home empty asset fields use the base path on mobile", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = basePath === "/" ? "" : basePath;
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectHome(page, {
    project: {
      backgroundImageUrl: "",
      logoUrl: "",
    },
  });

  await page.goto(`${mountPrefix}/admin/sample?tabId=dashboard`);

  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    new RegExp(`.*${mountPrefix}/.+/project_default_logo(?:-[a-zA-Z0-9_-]+)?\\.png$`),
  );
  await expect(page.locator(".project-header-outer")).toHaveCSS(
    "background-image",
    new RegExp(`^url\\(".+/project_default(?:-[a-zA-Z0-9_-]+)?\\.jpg"\\)$`),
  );
});

test("project home Dashboard tab drops clone URL clipboard marker", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();
  await expect(page.locator("#cloneURL")).toHaveValue("https://example.com/admin/sample.git");
  await expect(page.locator("#cloneURLBtn")).toHaveText("Copy URL");
  await expect(page.locator("#cloneURLBtn")).not.toHaveAttribute("data-clipboard-target", /.*/);
  expect(await readFile("src/routes/$ownerName/$projectName.tsx", "utf8")).not.toContain(
    "data-clipboard-target",
  );
});

test("project home Dashboard tab keeps legacy overview proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1280, height: 720 });
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();

  expect(await dashboardLayoutMetrics(page)).toEqual({
    desktop: {
      emptyMessageColor: "rgb(153, 153, 153)",
      emptyMessageFontSize: 13,
      emptyMessageMarginBottom: 15,
      firstColumnWidthRatio: 0.49,
      headingBorderColor: "rgb(255, 115, 50)",
      leftPaneWidthRatio: 0.74,
      // F5 dist-truth (2026-08-11): the desktop page-wrap top margin is
      // 20px (the legacy 5px pin predates the shell work).
      pageWrapMarginTop: 20,
      progressHeight: 7,
      progressMarginTop: 7,
      progressWidth: 100,
      rightPaneDisplay: "block",
      rightPaneWidthRatio: 0.23,
    },
    mobile: {
      leftPaneWidthRatio: 1,
      pageWrapMarginTop: 5,
      pageWrapWidth: 390,
      rightPaneDisplay: "none",
    },
  });
});

test("project home Dashboard tab follows legacy non-empty row filters and pull request footer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    dashboard: {
      assignees: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "dev",
          openIssueCount: 3,
          userId: 2,
          userLabel: "Dev Member",
        },
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "idle",
          openIssueCount: 0,
          userId: 3,
          userLabel: "Idle Member",
        },
      ],
      labels: [],
      milestones: [
        {
          completionPercent: 40,
          id: 5,
          openIssueCount: 2,
          title: "M1",
        },
        {
          completionPercent: 0,
          id: 6,
          openIssueCount: 0,
          title: "M0",
        },
      ],
      noMilestoneOpenIssueCount: 0,
      openPullRequestCount: 3,
      pullRequests: [
        {
          contributorAvatarUrl: "/assets/images/default-avatar-32.png",
          contributorLoginId: "dev",
          contributorUserId: 2,
          contributorUserLabel: "Dev Member",
          createdLabel: "Jul 1, 2026",
          pullRequestNumber: 11,
          title: "Ready PR",
        },
      ],
      unassignedOpenIssueCount: 0,
    },
  });

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();

  await expect(page.locator(".overview-assignee")).toContainText("Dev Member");
  await expect(page.locator(".overview-assignee")).not.toContainText("Idle Member");
  await expect(page.locator(".overview-milestone")).toContainText("M1");
  await expect(page.locator(".overview-milestone")).not.toContainText("M0");
  await expect(page.locator(".project-overview-home .progress[data-toggle='tooltip']")).toHaveCount(
    0,
  );
  await expect(page.locator(".project-overview-home .progress").first()).toHaveAttribute(
    "title",
    "100%",
  );
  await expect(
    page.locator(".overview-pullrequest .avatar-wrap.smaller[data-toggle='tooltip']"),
  ).toHaveCount(0);
  await expect(page.locator(".overview-pullrequest .avatar-wrap.smaller")).toHaveAttribute(
    "title",
    "Dev Member (@dev)",
  );
  await expectComputedParity(
    page,
    ".overview-pullrequest",
    `<div class="overview-pullrequest"><div class="row-fluid"><div class="span9 title"><a href="${basePath}/admin/sample/pullRequests?contributorId=2" class="usf-group"><span class="avatar-wrap smaller" title="Dev Member (@dev)"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span></a><a href="${basePath}/admin/sample/pullRequest/11">Ready PR</a></div><div class="span3 num" style="color:rgb(153,153,153);text-align:right">Jul 1, 2026</div></div><div class="mt5" style="margin-right:17px;text-align:right"><a href="${basePath}/admin/sample/pullRequests">See <strong>3</strong> more</a></div></div>`,
    false,
  );
});

test("project home Dashboard tab uses legacy assignee empty branch when every assignee count is zero", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    dashboard: {
      assignees: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "idle",
          openIssueCount: 0,
          userId: 3,
          userLabel: "Idle Member",
        },
      ],
      unassignedOpenIssueCount: 0,
    },
  });

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();

  const assigneeOverview = page.locator(".overview-assignee");
  await expect(assigneeOverview.locator(".empty")).toHaveCount(1);
  await expect(assigneeOverview).toContainText("No issue found");
  await expect(assigneeOverview.locator(".empty .ybtn")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform`,
  );
  await expect(assigneeOverview.locator(".usf-group")).toHaveCount(0);
  await expect(assigneeOverview).not.toContainText("Idle Member");
  await expect(assigneeOverview).not.toContainText("No assignee");

  expect(await dashboardAssigneeEmptyMetrics(page)).toEqual({
    actionContained: true,
    actionTextAlign: "center",
    messageContained: true,
    messageMarginBottom: 15,
  });
});

test("project home Dashboard tab treats zero-open milestones as non-empty legacy branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    dashboard: {
      milestones: [
        {
          completionPercent: 100,
          id: 6,
          openIssueCount: 0,
          title: "M0",
        },
      ],
      noMilestoneOpenIssueCount: 2,
    },
  });

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();

  const milestoneOverview = page.locator(".overview-milestone");
  await expect(milestoneOverview.locator(".empty")).toHaveCount(0);
  await expect(milestoneOverview).not.toContainText("No milestone entered.");
  await expect(milestoneOverview).not.toContainText("M0");
  await expect(milestoneOverview.locator("a[href$='issues?milestoneId=-1']")).toHaveText(
    "No milestone",
  );
  await expect(milestoneOverview.locator(".row-fluid .num strong")).toHaveText("2");
});

test("project home Dashboard tab matches the localhost SVN dashboard branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectHome(page, {
    ownerName: "admin",
    projectName: "svnplayground",
    dashboard: {
      assignees: [],
      labels: [],
      milestones: [],
      noMilestoneOpenIssueCount: 0,
      pullRequests: [],
      unassignedOpenIssueCount: 0,
    },
    project: {
      cloneUrl: "http://127.0.0.1:9000/svn/admin/svnplayground",
      id: 3,
      members: [
        {
          avatarUrl: "/assets/images/default-avatar-128.png",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
      ],
      menuSetting: {
        board: true,
        code: true,
        issue: true,
        milestone: true,
        pullRequest: true,
        review: true,
      },
      overview: "Parity seed Subversion project for localhost checks",
      vcs: "SVN",
      viewerCanCreateCommitResource: false,
      viewerCanLeave: false,
      viewerCanUpdate: false,
    },
  });

  await page.goto(`${basePath}/admin/svnplayground?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();
  await expect(page.locator(".span-left-pane > .nav-tabs li.active a")).toHaveText("대시보드");

  await expectComputedParity(
    page,
    "#project-description",
    `<span id="project-description" class="markdown-wrap"><p>Parity seed Subversion project for localhost checks</p></span>`,
    false,
  );
  await expectComputedParity(
    page,
    ".project-overview-home",
    `<div class="project-overview-home row-fluid"><div class="span6"><h5>담당자별 열린 이슈</h5><div class="overview-assignee"><div class="empty"><p>등록된 이슈가 없습니다.</p><a href="${basePath}/admin/svnplayground/issueform" target="_blank" class="ybtn ybtn-small">새 이슈</a></div></div><hr><h5>마일스톤별 열린 이슈</h5><div class="overview-milestone"><div class="empty"><p>등록된 마일스톤이 없습니다</p><a href="${basePath}/admin/svnplayground/newMilestoneForm" target="_blank" class="ybtn ybtn-small">새 마일스톤</a></div></div></div><div class="span6"><h5>라벨별 열린 이슈</h5><link rel="stylesheet" href="${basePath}/admin/svnplayground/issue/labels.css" type="text/css"></div></div>`,
    false,
  );

  await expect(page.locator(".project-menu-nav.project-menu-gruop .menu-name")).toHaveText([
    "홈",
    "코드",
    "이슈",
    "리뷰",
    "마일스톤",
    "게시판",
  ]);
  await expect(page.locator(".project-menu-nav.project-menu-gruop")).not.toContainText(
    "Pull request",
  );
  await expect(page.locator(".project-setting")).toHaveCount(0);
  await expect(page.locator(".project-btn-wrap .ybtn")).toHaveCount(1);
  await expect(page.locator(".project-btn-wrap")).not.toContainText("Fork");
  await expect(page.locator("#cloneURL")).toHaveValue(
    "http://127.0.0.1:9000/svn/admin/svnplayground",
  );
  await expect(page.locator("[data-toggle='description-edit']")).toHaveCount(0);
  await expect(page.locator("#member-add-link")).toHaveCount(0);
  await expect(page.locator("#projectLeaveBtn")).toHaveCount(0);
  await expect(page.locator(".milestone-info")).toHaveCount(0);

  await page.setViewportSize({ width: 1366, height: 900 });
  expect(await svnDashboardMetrics(page)).toEqual({
    assigneeHeight: 63,
    assigneeWidth: 491,
    // F5 dist-truth (2026-08-11): the SVN dashboard content is 258px tall.
    contentHeight: 258,
    contentWidth: 1002,
    dashboardHeight: 258,
    dashboardWidth: 1002,
    firstColumnWidth: 491,
    leftPaneWidth: 1002,
    milestoneHeight: 63,
    milestoneWidth: 491,
    pageWidth: 1366,
    scrollWidth: 1366,
    secondColumnWidth: 491,
    tabsHeight: 37,
    tabsWidth: 1002,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await svnDashboardMetrics(page)).toEqual({
    assigneeHeight: 63,
    assigneeWidth: 191,
    // F5 dist-truth (2026-08-11): the mobile SVN dashboard is 258px tall
    // with 401px document scrollWidth (the pane overflows the viewport).
    contentHeight: 258,
    contentWidth: 390,
    dashboardHeight: 258,
    dashboardWidth: 390,
    firstColumnWidth: 191,
    leftPaneWidth: 390,
    milestoneHeight: 63,
    milestoneWidth: 191,
    pageWidth: 390,
    scrollWidth: 401,
    secondColumnWidth: 191,
    tabsHeight: 37,
    tabsWidth: 390,
  });
});

async function svnDashboardMetrics(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return { height: Math.round(box.height), width: Math.round(box.width) };
    };
    const assignee = rect(".overview-assignee");
    const content = rect(".content-container");
    const dashboard = rect(".project-overview-home");
    const firstColumn = rect(".project-overview-home > .span6:first-child");
    const leftPane = rect(".span-left-pane");
    const milestone = rect(".overview-milestone");
    const pageWrap = rect(".page-wrap-outer");
    const secondColumn = rect(".project-overview-home > .span6:last-child");
    const tabs = rect(".span-left-pane > .nav-tabs");
    return {
      assigneeHeight: assignee.height,
      assigneeWidth: assignee.width,
      contentHeight: content.height,
      contentWidth: content.width,
      dashboardHeight: dashboard.height,
      dashboardWidth: dashboard.width,
      firstColumnWidth: firstColumn.width,
      leftPaneWidth: leftPane.width,
      milestoneHeight: milestone.height,
      milestoneWidth: milestone.width,
      pageWidth: pageWrap.width,
      scrollWidth: document.documentElement.scrollWidth,
      secondColumnWidth: secondColumn.width,
      tabsHeight: tabs.height,
      tabsWidth: tabs.width,
    };
  });
}

async function mockProjectHome(
  page: Page,
  overrides: Partial<{
    dashboard: Record<string, unknown>;
    ownerName: string;
    project: Record<string, unknown>;
    projectName: string;
    session: Record<string, unknown>;
  }> = {},
) {
  const ownerName = overrides.ownerName ?? "admin";
  const projectName = overrides.projectName ?? "sample";

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
        ...overrides.session,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          backgroundImageUrl: "/assets/images/bg-default-project.png",
          cloneUrl: "https://example.com/admin/sample.git",
          dashboard: {
            assignees: [
              {
                avatarUrl: "/assets/images/default-avatar-32.png",
                loginId: "dev",
                openIssueCount: 3,
                userId: 2,
                userLabel: "Dev Member",
              },
            ],
            labels: [
              {
                categoryName: "Priority",
                color: "#e11d48",
                id: 9,
                name: "bug",
                openIssueCount: 4,
              },
            ],
            milestones: [
              {
                completionPercent: 40,
                id: 5,
                openIssueCount: 2,
                title: "M1",
              },
            ],
            noMilestoneOpenIssueCount: 2,
            pullRequests: [],
            unassignedOpenIssueCount: 1,
            ...overrides.dashboard,
          },
          enrollmentRequestCount: 0,
          history: { items: [] },
          id: 7,
          isFavorite: false,
          isForkedFromOrigin: false,
          isPrivate: false,
          isProtected: false,
          logoUrl: "/assets/images/project_default_logo.png",
          members: [
            {
              avatarUrl: "/assets/images/default-avatar-32.png",
              loginId: "admin",
              userId: 1,
              userLabel: "Site Admin",
            },
          ],
          menuSetting: {
            board: true,
            code: true,
            issue: true,
            milestone: true,
            pullRequest: true,
            review: true,
          },
          overview: "Sample overview",
          readmeFile: null,
          vcs: "GIT",
          viewerCanCreateCommitResource: true,
          viewerCanLeave: true,
          viewerCanUpdate: true,
          ...overrides.project,
          ownerName,
          projectName,
        }),
      });
    },
  );
}

async function dashboardLayoutMetrics(page: Page) {
  const desktop = await collectDashboardLayoutMetrics(page, "desktop");
  await page.setViewportSize({ width: 390, height: 740 });
  return {
    desktop,
    mobile: await collectDashboardLayoutMetrics(page, "mobile"),
  };
}

async function collectDashboardLayoutMetrics(page: Page, mode: "desktop" | "mobile") {
  return page.evaluate((targetMode) => {
    const pageWrap = requireElement(".page-wrap-outer > .project-page-wrap");
    const row = requireElement(".project-page-wrap > .row-fluid");
    const leftPane = requireElement(".span-left-pane");
    const rightPane = requireElement(".span-right-pane");
    const pageWrapStyle = getComputedStyle(pageWrap);
    const leftRect = leftPane.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const rightStyle = getComputedStyle(rightPane);

    const mobile = {
      leftPaneWidthRatio: Number((leftRect.width / rowRect.width).toFixed(2)),
      pageWrapMarginTop: Math.round(parseFloat(pageWrapStyle.marginTop)),
      pageWrapWidth: Math.round(pageWrap.getBoundingClientRect().width),
      rightPaneDisplay: rightStyle.display,
    };

    if (targetMode === "mobile") {
      return mobile;
    }

    const dashboardRow = requireElement(".project-overview-home");
    const firstColumn = requireElement(".project-overview-home > .span6");
    const heading = requireElement(".project-overview-home h5");
    const progress = requireElement(".project-overview-home .progress");
    const emptyMessage = requireElement(".project-overview-home .empty p");
    const headingStyle = getComputedStyle(heading);
    const progressStyle = getComputedStyle(progress);
    const emptyStyle = getComputedStyle(emptyMessage);

    return {
      emptyMessageColor: emptyStyle.color,
      emptyMessageFontSize: Math.round(parseFloat(emptyStyle.fontSize)),
      emptyMessageMarginBottom: Math.round(parseFloat(emptyStyle.marginBottom)),
      firstColumnWidthRatio: Number(
        (
          firstColumn.getBoundingClientRect().width / dashboardRow.getBoundingClientRect().width
        ).toFixed(2),
      ),
      headingBorderColor: headingStyle.borderLeftColor,
      leftPaneWidthRatio: mobile.leftPaneWidthRatio,
      pageWrapMarginTop: mobile.pageWrapMarginTop,
      progressHeight: Math.round(parseFloat(progressStyle.height)),
      progressMarginTop: Math.round(parseFloat(progressStyle.marginTop)),
      progressWidth: Math.round(parseFloat(progressStyle.width)),
      rightPaneDisplay: mobile.rightPaneDisplay,
      rightPaneWidthRatio: Number(
        (rightPane.getBoundingClientRect().width / rowRect.width).toFixed(2),
      ),
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  }, mode);
}

async function dashboardLabelMetrics(page: Page) {
  return page.evaluate(() => {
    const heading = requireElement(".project-overview-home .span6:nth-child(2) > h5");
    const overviewLabel = requireElement(".project-overview-home .overview-label");
    const term = requireElement(".project-overview-home .overview-label dt");
    const definition = requireElement(".project-overview-home .overview-label dd");
    const labelRow = requireElement(".project-overview-home .overview-label .row-fluid");
    const labelColumn = requireElement(".project-overview-home .overview-label .span10");
    const labelChip = requireElement(".project-overview-home .issue-label[data-label-id='9']");
    const countColumn = requireElement(".project-overview-home .overview-label .span2.num");
    const headingStyle = getComputedStyle(heading);
    const overviewStyle = getComputedStyle(overviewLabel);
    const termStyle = getComputedStyle(term);
    const definitionStyle = getComputedStyle(definition);
    const chipStyle = getComputedStyle(labelChip);
    const countStyle = getComputedStyle(countColumn);
    const labelRowRect = labelRow.getBoundingClientRect();
    const labelColumnRect = labelColumn.getBoundingClientRect();
    const countColumnRect = countColumn.getBoundingClientRect();

    return {
      countColumnPaddingRight: Math.round(parseFloat(countStyle.paddingRight)),
      countColumnTextAlign: countStyle.textAlign,
      countColumnWidthRatio: Number((countColumnRect.width / labelRowRect.width).toFixed(2)),
      headingBorderLeftWidth: Math.round(parseFloat(headingStyle.borderLeftWidth)),
      headingMarginBottom: Math.round(parseFloat(headingStyle.marginBottom)),
      headingPaddingLeft: Math.round(parseFloat(headingStyle.paddingLeft)),
      labelChipDataLabelId: labelChip.getAttribute("data-label-id"),
      labelChipDisplay: chipStyle.display,
      labelChipLineHeight: Math.round(parseFloat(chipStyle.lineHeight)),
      labelChipPaddingInline:
        Math.round(parseFloat(chipStyle.paddingLeft)) +
        Math.round(parseFloat(chipStyle.paddingRight)),
      labelDefinitionMarginLeft: Math.round(parseFloat(definitionStyle.marginLeft)),
      labelDefinitionTermLineHeight: Math.round(parseFloat(termStyle.lineHeight)),
      labelDefinitionTermWidth: Math.round(parseFloat(termStyle.width)),
      labelRowWidthRatio: Number((labelColumnRect.width / labelRowRect.width).toFixed(2)),
      overviewLabelBorderBottomWidth: Math.round(parseFloat(overviewStyle.borderBottomWidth)),
      overviewLabelPaddingBottom: Math.round(parseFloat(overviewStyle.paddingBottom)),
      overviewLabelPaddingTop: Math.round(parseFloat(overviewStyle.paddingTop)),
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function dashboardAssigneeEmptyMetrics(page: Page) {
  return page.evaluate(() => {
    const overview = requireElement(".overview-assignee");
    const empty = requireElement(".overview-assignee .empty");
    const message = requireElement(".overview-assignee .empty p");
    const action = requireElement(".overview-assignee .empty .ybtn");
    const overviewRect = overview.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const emptyStyle = getComputedStyle(empty);
    const messageStyle = getComputedStyle(message);

    return {
      actionContained:
        actionRect.left >= overviewRect.left &&
        actionRect.right <= overviewRect.right &&
        actionRect.top >= overviewRect.top &&
        actionRect.bottom <= overviewRect.bottom,
      actionTextAlign: emptyStyle.textAlign,
      messageContained:
        messageRect.left >= overviewRect.left &&
        messageRect.right <= overviewRect.right &&
        messageRect.top >= overviewRect.top &&
        messageRect.bottom <= overviewRect.bottom,
      messageMarginBottom: Math.round(parseFloat(messageStyle.marginBottom)),
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
