import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_HISTORY = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class="active"><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-breadcrumb hide show-in-mobile"><span class="project-author"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span></div><div class="project-home-header row-fluid"><div class="project-overview span9 span-hard-wrap"><div class="project-description" data-toggle="project-description-tab"><h3><span id="project-description" class="markdown-wrap">Sample overview</span><button type="button" class="ybtn ybtn-minimum" data-toggle="description-edit"><i class="yobicon-edit"></i></button></h3></div><div class="project-description-edit hidden" data-toggle="project-description-tab"><form action="__BASE_PATH__/admin/sample/projectOverviewUpdate"><input type="text" id="project-description-input" class="span6" placeholder="Enter project description" value="Sample overview"><button type="button" class="ybtn ybtn-success" id="descriptionSaveBtn">Save</button> <button type="button" class="ybtn" data-toggle="description-cancel">Cancel</button></form></div></div><div class="project-clone-wrap span3 hide-in-mobile"><input type="text" class="project-clone-url" id="cloneURL" readonly="" value="https://example.com/admin/sample.git"><button class="ybtn project-clone-button" data-clipboard-target="cloneURL" id="cloneURLBtn">Copy URL</button></div></div><div class="row-fluid"><div class="span9 span-left-pane"><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/admin/sample">README</a></li><li class="active"><a href="__BASE_PATH__/admin/sample?tabId=history">History</a></li><li class=""><a href="__BASE_PATH__/admin/sample?tabId=dashboard">Dashboard</a></li></ul><div class="tab-content"><div class="tab-pane active"><div class="content-container nm"><div class="main-stream" style="width:100%"><ul class="activity-streams unstyled"><li class="activity-stream"><a href="__BASE_PATH__/admin" class="avatar-wrap pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="activity-desc"><p class="header-text" style="margin-bottom:5px"><a href="__BASE_PATH__/admin" class="actor">Site Admin</a> Committed <span class="whereis"><a href="__BASE_PATH__/admin/sample/commit/abcdef0" class="where">abcdef0</a> <a href="__BASE_PATH__/admin/sample/commit/abcdef0" class="title">Initial commit</a></span></p><p class="others" style="padding-left:0px"><span class="date" style="margin-left:0px" title="2026-07-01">Jul 1, 2026</span></p></div></li></ul></div></div></div></div></div><div class="span3 span-right-pane"><div class="bubble-wrap gray project-home"><div class="project-btn-wrap"><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></span><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/newFork" class="ybtn ybtn-inverse">Fork</a></span></div><div class="inner member-info"><header><h3>Project members</h3><a href="__BASE_PATH__/admin/sample/members" class="ybtn ybtn-minimum" id="member-add-link"><i class="yobicon-addfriend"></i> Add</a></header><div class="member-wrap"><ul class="project-members"><li class="member"><a href="__BASE_PATH__/admin" class="avatar-wrap img-rounded pull-left small"><img src="/assets/images/default-avatar-32.png" width="24" height="24"></a><a href="__BASE_PATH__/admin" class="name"><strong>Site Admin (admin)</strong></a></li></ul></div></div><button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="projectLeaveBtn" data-href="__BASE_PATH__/admin/sample/members/1">Leave project</button></div></div></div><div id="alertLeave" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Leave project</h3></div><div class="modal-body"><p>Do you want to leave this project?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="leaveBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project home History tab matches legacy partial_history.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample?tabId=history`);
  await expect(page.locator(".activity-streams .activity-stream")).toBeVisible();
  await expect(page.locator(".span-left-pane > .nav-tabs li.active a")).toHaveText("History");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_HISTORY.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project home History tab keeps legacy stream proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample?tabId=history`);
  await expect(page.locator(".activity-streams .activity-stream")).toBeVisible();

  const desktop = await projectHistoryLayoutMetrics(page);
  expect(desktop.pageWrapMarginTop).toBe(20);
  expect(desktop.mainStreamMarginBottom).toBe(15);
  expect(desktop.activityStreamsMarginTop).toBe(0);
  expect(desktop.activityPaddingTop).toBe(10);
  expect(desktop.activityPaddingBottom).toBe(6);
  expect(desktop.activityMarginBottom).toBe(6);
  expect(desktop.activityBorderBottomWidth).toBe(0);
  expect(desktop.headerTextFontSize).toBe(12);
  expect(desktop.headerTextLineHeight).toBe(12);
  expect(desktop.headerTextMarginTop).toBe(0);
  expect(desktop.headerTextMarginBottom).toBe(5);
  expect(desktop.whereisFontSize).toBe(11);
  expect(desktop.wherePadding).toBe("3px 5px");
  expect(desktop.whereDisplay).toBe("inline-block");
  expect(desktop.dateColor).toBe("rgb(187, 187, 187)");
  expect(desktop.leftPanePercent).toBeCloseTo(74.47, 1);
  expect(desktop.rightPaneDisplay).not.toBe("none");

  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto(`${basePath}/admin/sample?tabId=history`);
  await expect(page.locator(".activity-streams .activity-stream")).toBeVisible();

  const mobile = await projectHistoryLayoutMetrics(page);
  expect(mobile.pageWrapMarginTop).toBe(5);
  expect(mobile.pageWrapWidth).toBe(390);
  expect(mobile.leftPanePercent).toBeCloseTo(100, 1);
  expect(mobile.rightPaneDisplay).toBe("none");
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
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrollmentRequestCount: 0,
        history: {
          items: [
            {
              actorAvatarUrl: "/assets/images/default-avatar-32.png",
              actorName: "Site Admin",
              actorUrl: "/yona/admin",
              createdLabel: "Jul 1, 2026",
              createdTitle: "2026-07-01",
              itemType: "commit",
              shortTitle: "abcdef0",
              title: "Initial commit",
              url: "/yona/admin/sample/commit/abcdef0",
            },
          ],
        },
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

async function projectHistoryLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element);
    const numberStyle = (selector: string, property: string) =>
      Number.parseFloat(style(selector).getPropertyValue(property));
    const rect = (selector: string) =>
      (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
    const pageWrap = rect(".project-page-wrap");
    const leftPane = rect(".span-left-pane");

    return {
      activityBorderBottomWidth: numberStyle(".activity-stream", "border-bottom-width"),
      activityMarginBottom: numberStyle(".activity-stream", "margin-bottom"),
      activityPaddingBottom: numberStyle(".activity-stream", "padding-bottom"),
      activityPaddingTop: numberStyle(".activity-stream", "padding-top"),
      activityStreamsMarginTop: numberStyle(".activity-streams", "margin-top"),
      dateColor: style(".activity-desc .date").color,
      headerTextFontSize: numberStyle(".activity-desc .header-text", "font-size"),
      headerTextLineHeight: numberStyle(".activity-desc .header-text", "line-height"),
      headerTextMarginBottom: numberStyle(".activity-desc .header-text", "margin-bottom"),
      headerTextMarginTop: numberStyle(".activity-desc .header-text", "margin-top"),
      leftPanePercent: (leftPane.width / pageWrap.width) * 100,
      mainStreamMarginBottom: numberStyle(".content-container .main-stream", "margin-bottom"),
      pageWrapMarginTop: numberStyle(".project-page-wrap", "margin-top"),
      pageWrapWidth: pageWrap.width,
      rightPaneDisplay: style(".span-right-pane").display,
      whereDisplay: style(".activity-desc .whereis .where").display,
      whereisFontSize: numberStyle(".activity-desc .whereis", "font-size"),
      wherePadding: style(".activity-desc .whereis .where").padding,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
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
        .map((attr) => normalizeSerializedAttr(node, attr))
        .filter(Boolean)
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

    function normalizeSerializedAttr(node: Element, attr: Attr) {
      if (attr.name === "aria-current" || attr.name === "data-status") {
        return "";
      }
      if (
        node.matches(".user-project-list") &&
        (attr.name === "role" || attr.name === "tabindex")
      ) {
        return "";
      }
      return `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .filter((root) => !root.matches(".gnb-outer"))
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
