import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_DASHBOARD = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class="active"><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-breadcrumb hide show-in-mobile"><span class="project-author"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span></div><div class="project-home-header row-fluid"><div class="project-overview span9 span-hard-wrap"><div class="project-description" data-toggle="project-description-tab"><h3><span id="project-description" class="markdown-wrap">Sample overview</span><button type="button" class="ybtn ybtn-minimum" data-toggle="description-edit"><i class="yobicon-edit"></i></button></h3></div><div class="project-description-edit hidden" data-toggle="project-description-tab"><form action="__BASE_PATH__/admin/sample/projectOverviewUpdate"><input type="text" id="project-description-input" class="span6" placeholder="Enter project description" value="Sample overview"><button type="button" class="ybtn ybtn-success" id="descriptionSaveBtn">Save</button> <button type="button" class="ybtn" data-toggle="description-cancel">Cancel</button></form></div></div><div class="project-clone-wrap span3 hide-in-mobile"><input type="text" class="project-clone-url" id="cloneURL" readonly="" value="https://example.com/admin/sample.git"><button class="ybtn project-clone-button" data-clipboard-target="cloneURL" id="cloneURLBtn">Copy URL</button></div></div><div class="row-fluid"><div class="span9 span-left-pane"><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/admin/sample">README</a></li><li class=""><a href="__BASE_PATH__/admin/sample?tabId=history">History</a></li><li class="active"><a href="__BASE_PATH__/admin/sample?tabId=dashboard">Dashboard</a></li></ul><div class="tab-content"><div class="tab-pane active"><div class="content-container nm"><div class="project-overview-home row-fluid"><div class="span6"><h5>Open issues: by assignee</h5><div class="overview-assignee"><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?assigneeId=2" class="usf-group" title="Dev Member (@dev)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div class="span3 num"><strong>3</strong></div><div class="span3 nm"><div class="progress progress-warning " data-toggle="tooltip" title="75%"><div class="bar" style="width:75%"></div></div></div></div><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?assigneeId=-1" class="usf-group"><span class="avatar-wrap smaller"><i class="yobicon-blankstare"></i></span><span class="name">No assignee</span></a></div><div class="span3 num"><strong>1</strong></div><div class="span3 nm"><div class="progress progress-warning " data-toggle="tooltip" title="25%"><div class="bar" style="width:25%"></div></div></div></div></div><hr><h5>Open issues: by milestone</h5><div class="overview-milestone"><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?milestoneId=5">M1</a></div><div class="span3 num"><strong>2</strong></div><div class="span3 nm"><div class="progress progress-success " data-toggle="tooltip" title="40%"><div class="bar bar-success" style="width:40%"></div></div></div></div><div class="row-fluid"><div class="span6"><a href="__BASE_PATH__/admin/sample/issues?milestoneId=-1">No milestone</a></div><div class="span3 num"><strong>2</strong></div><div class="span3 nm"></div></div></div><hr><h5>Open pull requests</h5><div class="overview-pullrequest"><div class="empty"><p>No pull requests have been received</p><a href="__BASE_PATH__/admin/sample/newPullRequestForm" target="_blank" class="ybtn ybtn-small">pull request</a></div></div></div><div class="span6"><h5>Open issues: by label</h5><dl class="dl-horizontal overview-label"><dt>Priority</dt><dd><div class="row-fluid"><div class="span10"><a href="__BASE_PATH__/admin/sample/issues?labelIds=9"><span class="issue-label list-label active" data-label-id="9">bug</span></a></div><div class="span2 num"><strong>4</strong></div></div></dd></dl></div></div></div></div></div></div><div class="span3 span-right-pane"><div class="bubble-wrap gray project-home"><div class="project-btn-wrap"><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></span><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/newFork" class="ybtn ybtn-inverse">Fork</a></span></div><div class="inner member-info"><header><h3>Project members</h3><a href="__BASE_PATH__/admin/sample/members" class="ybtn ybtn-minimum" id="member-add-link"><i class="yobicon-addfriend"></i> Add</a></header><div class="member-wrap"><ul class="project-members"><li class="member"><a href="__BASE_PATH__/admin" class="avatar-wrap img-rounded pull-left small"><img src="/assets/images/default-avatar-32.png" width="24" height="24"></a><a href="__BASE_PATH__/admin" class="name"><strong>Site Admin (admin)</strong></a></li></ul></div></div><button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="projectLeaveBtn" data-href="__BASE_PATH__/admin/sample/members/1">Leave project</button></div></div></div><div id="alertLeave" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Leave project</h3></div><div class="modal-body"><p>Do you want to leave this project?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="leaveBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project home Dashboard tab matches legacy dashboard partials DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample?tabId=dashboard`);
  await expect(page.locator(".project-overview-home")).toBeVisible();
  await expect(page.locator(".span-left-pane > .nav-tabs li.active a")).toHaveText("Dashboard");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_DASHBOARD.replaceAll("__BASE_PATH__", basePath)),
  );
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

async function mockProjectHome(page: Page) {
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
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
      }),
    });
  });
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  });
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
