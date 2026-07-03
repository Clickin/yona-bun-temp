import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EXPECTED_PROFILE_SCREEN = `
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner"><h3>Door User</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <section class="user-box">
      <div class="user-info-box">
        <div class="whoami-wrap" style="background-image:url('/assets/images/default-avatar-256.png')"></div>
        <div class="whoami usf-group">
          <span class="name">Door English</span>
          <span class="loginid">@door</span>
          <span class="email">door@example.com</span>
        </div>
        <div class="user-status"><span class="badge label-success">SITE ADMIN</span></div>
        <div class="user-status"></div>
        <div class="user-since"><strong>Member since</strong><span class="since">2026-06-30</span></div>
        <div class="user-since"><div><strong>Connected Social Login</strong></div><div class="auth-provider-logo"></div></div>
      </div>
      <div class="user-stream-box">
        <div class="pull-right">recently<input id="daysAgoBtn" name="daysAgo" type="number" min="1" max="99" class="input-mini-min" value="14" style="margin:0px 5px; vertical-align:bottom;">days ago</div>
        <ul class="nav nav-tabs">
          <li class="active"><button type="button" data-toggle="tab">Issue <span class="num-badge">2</span></button></li>
          <li class=""><button type="button" data-toggle="tab">Pull request <span class="num-badge">1</span></button></li>
          <li class=""><button type="button" data-toggle="tab">projects <span class="num-badge">1</span></button></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
        </ul>
        <div class="tab-content">
          <div id="issues" class="tab-pane active">
            <ul class="nav nav-tabs nm">
              <li class="active"><button type="button" data-toggle="tab">Open<span class="num-badge">1</span></button></li>
              <li class=""><button type="button" data-toggle="tab">Closed<span class="num-badge">1</span></button></li>
              <li><div class="show-subtasks mr10" id="two-column-mode-checkbox" data-toggle="popover" data-trigger="hover" data-placement="top" title="Show subtask" data-content="Show subtask always"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li>
            </ul>
            <div class="tab-content">
              <div id="openIssues" class="tab-pane active">
                <ul class="post-list-wrap my-issues row-fluid">
                  <li class="post-item title" id="issue-item-11" href="__BASE_PATH__/door/sample/issue/7">
                    <div class="span12 span-hard-wrap">
                      <div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#7</span></div>
                      <div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/7" class="title">Open profile issue</a><span class="item-count-groups"><a href="__BASE_PATH__/door/sample/issue/7#comments" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">3</span></a></span><span class="for-subtask-progressbar"><div class="subtask-progress upload-progress red-outline"><div class="bar red" style="width: 50%;" title="Subtask"></div></div><span class="subtask-progress completion-ratio">1/2</span></span><a href="__BASE_PATH__/door/sample/issues?state=open&labelIds=17" class="label issue-label list-label" data-label-id="17" style="background:rgb(244,67,54)">Bug</a><div class="child-issue-list hide"><div class="child-issues"><div class="issue-item  child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/door/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Open profile child</span><span> - Alice</span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="2026-07-03">2026-07-03</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/door/sample/issue/14"><span class="item-name"><span class="subtask-number">#14</span><span>Closed profile child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="2026-07-04">2026-07-04</span></div></div></div></span></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="door">Door User</a></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></div>
                      <div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="2026-07-01">2026-07-01</span><span class="pull-right " data-toggle="tooltip" data-placement="top" title="Due date: 2026-08-01"><i class="yobicon-clock2"></i>31 days</span></span></div>
                    </div>
                  </li>
                </ul>
              </div>
              <div id="closedIssues" class="tab-pane "><ul class="post-list-wrap my-issues row-fluid"><li class="post-item title" id="issue-item-12" href="__BASE_PATH__/door/sample/issue/8"><div class="span12 span-hard-wrap"><div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#8</span></div><div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/8" class="title">Closed profile issue</a><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="door">Door User</a></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item"></span></div><div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><span class="infos-item"></span></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="2026-06-29">2026-06-29</span><span class="mileston-tag"><a href="__BASE_PATH__/door/sample/milestone/3" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span><span class="pull-right " data-toggle="tooltip" data-placement="top" title="Due date: 2026-08-01"><i class="yobicon-clock2"></i>2026-08-01</span></span></div></div></li></ul></div>
            </div>
          </div>
          <div id="pullRequests" class="tab-pane ">
            <ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="__BASE_PATH__/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="__BASE_PATH__/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="__BASE_PATH__/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="__BASE_PATH__/door" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="__BASE_PATH__/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="__BASE_PATH__/alice" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>
          </div>
          <div id="projects" class="tab-pane ">
            <ul class="user-streams all-projects"><li class="project"><div class="info-wrap"><div class="pull-left"><a href="__BASE_PATH__/door/sample" class="avatar-wrap small"><img src="/assets/images/project_default_logo.png"></a></div><div class="pull-left" style="margin-left: 10px;"><div class="header"><a href="__BASE_PATH__/door/sample" class="project-name">sample</a></div><div class="desc">Profile project</div><div class="name-tag"><i class="yobicon-friends yobicon-middle"></i><strong>3</strong> <a href="__BASE_PATH__/door" class="owner-name-small">door</a> <span title="2026-06-01">2026-06-01</span>,Latest code update<span title="2026-06-30">2026-06-30</span></div></div></div><div class="stats-wrap pull-right"><div class="stats"><a href="__BASE_PATH__/door/sample/watch" class="ybtn watchBtn"><i class="yobicon-eye-close yobicon-middle yobicon-white"></i>Watch<span class="num-badge">5</span></a></div></div></li></ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
`;

const EXPECTED_MISSING_USER_SCREEN = `
<header class="gnb-outer">
  <div class="gnb-inner">
    <a href="__BASE_PATH__/" class="logo"><h1 class="blind">Yona</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
      <li><a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">Feedback</a></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico ico-err2"></i>
      <p>User exists not</p>
      <a href="__BASE_PATH__/" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright © <a href="http://navercorp.com/" target="_blank">NAVER Corp.</a> Supported by <a href="https://developers.naver.com/d2/" target="_blank" class="d2-program"><span class="d2">D2</span><span class="program"> Program</span></a></span>
  </div>
</footer>
`;

test("public user profile route source keeps navigation on TanStack Link", async () => {
  const source = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");

  expect(source).not.toContain("<a ");
  expect(source).not.toContain("</a>");
  expect(source).toContain("Link, Navigate");
  expect(source).toContain('hash="comments"');
  expect(source).toContain('hash="vote"');
});

test("public user profile matches legacy user/view.scala.html issues screen", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#openIssues .post-item")).toHaveCount(1);
  await expect(page.locator('.user-stream-box > .nav-tabs a[href^="#"]')).toHaveCount(0);
  await expect(page.locator('#issues > .nav-tabs.nm a[href^="#"]')).toHaveCount(0);
  await expect(page.locator("#issue-item-11 .title-cell > a.title")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issue/7`,
  );
  await expect(page.locator("#issue-item-11 .comments-count")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issue/7#comments`,
  );
  await expect(page.locator("#issue-item-11 .label.issue-label")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issues?state=open&labelIds=17`,
  );
  await expect(page.locator("#pullRequests .infos-icon-link")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/pullRequest/4#comments`,
  );
  await expect(page.locator('.user-stream-box > .nav-tabs button[data-toggle="tab"]')).toHaveCount(
    3,
  );
  await expect(page.locator('#issues > .nav-tabs.nm button[data-toggle="tab"]')).toHaveCount(2);

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROFILE_SCREEN.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readProfileMetrics(page)).toEqual({
    issueListDisplay: "block",
    pageWrapMarginTop: "10px",
    userBoxDisplay: "block",
    userInfoWidth: 200,
    userStreamWidth: 1060,
  });
});

test("anonymous public user profile hides legacy activity stream controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, { anonymousViewer: true });

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box")).toHaveCount(1);
  await expect(page.locator(".user-stream-box > .nav-tabs")).toHaveCount(0);
  await expect(page.locator("#daysAgoBtn")).toHaveCount(0);
  await expect(page.locator("#issues")).toHaveCount(0);
  await expect(page.locator("#pullRequests")).toHaveCount(0);
  await expect(page.locator("#projects")).toHaveCount(0);
});

test("public user profile matches legacy selected projects tab and click switching", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door?daysAgo=7&selected=projects`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(2)).toHaveClass("active");

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProfileScreen({
        basePath,
        daysAgo: 7,
        selected: "projects",
      }),
    ),
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const beforeTabClickUrl = page.url();

  await page.locator(".user-stream-box > .nav-tabs button", { hasText: "Pull request" }).click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#pullRequests")).toHaveClass(/active/u);
  await expect(page.locator("#projects")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");
  expect(new URL(page.url()).searchParams.get("daysAgo")).toBe("7");
  expect(new URL(page.url()).searchParams.get("selected")).toBe("projects");

  await page.locator(".user-stream-box > .nav-tabs button", { hasText: "Issue" }).click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").first()).toHaveClass("active");
  await expect(page.locator("#issues")).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);

  await page.locator("#issues > .nav-tabs.nm button", { hasText: "Closed" }).click();
  await expect(page.locator("#issues > .nav-tabs.nm > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#closedIssues")).toHaveClass(/active/u);
  await expect(page.locator("#openIssues")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);

  await page.locator("#issues > .nav-tabs.nm button", { hasText: "Open" }).click();
  await expect(page.locator("#issues > .nav-tabs.nm > li").first()).toHaveClass("active");
  await expect(page.locator("#openIssues")).toHaveClass(/active/u);
  await expect(page.locator("#closedIssues")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");
});

test("public user profile matches legacy selected pull-request tab", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door?daysAgo=7&selected=pullRequests`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#pullRequests")).toHaveClass(/active/u);

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProfileScreen({
        basePath,
        daysAgo: 7,
        selected: "pullRequests",
      }),
    ),
  );
});

test("public user profile matches legacy empty pull-request tab", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, { pullRequestsEmpty: true });

  await page.goto(`${basePath}/door?daysAgo=7&selected=pullRequests`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#pullRequests .error-wrap p")).toHaveText(
    "recently No pull requests have been received",
  );
  await expect(page.locator("#pullRequests .post-list-wrap .post-item")).toHaveCount(0);

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProfileScreen({
        basePath,
        daysAgo: 7,
        pullRequestsEmpty: true,
        selected: "pullRequests",
      }),
    ),
  );
});

test("current user profile projects tab renders legacy leave-project branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, {
    currentUser: true,
    memberProjectOwnerName: "alice",
    viewerCanLeave: true,
    viewerCanWatch: false,
  });

  await page.goto(`${basePath}/door?daysAgo=7&selected=projects`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#projects")).toHaveClass(/active/u);

  const leaveProject = page.locator("#projects .leaveProject");
  await expect(leaveProject).toHaveAttribute("href", `${basePath}/info/leave/alice/sample`);
  await expect(leaveProject).toHaveAttribute("data-projectname", "sample");

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProfileScreen({
        basePath,
        currentUser: true,
        daysAgo: 7,
        memberProjectOwnerName: "alice",
        selected: "projects",
        viewerCanLeave: true,
        viewerCanWatch: false,
      }),
    ),
  );
});

test("missing public user renders legacy user.notExists.name not-found screen", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockMissingPublicProfile(page);

  await page.goto(`${basePath}/ghost`);
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText("User exists not");
  await expect(page.locator('#mySidenav .right-menu > .nav-tabs.nm a[href^="#"]')).toHaveCount(0);
  await expect(
    page.locator('#mySidenav .right-menu > .nav-tabs.nm button[data-toggle="tab"]'),
  ).toHaveText(["Favorite", "Project", "Recent History"]);
  await expect(page.locator(".gnb-nav a", { hasText: "Project list" })).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "href",
    "https://github.com/nforge/yobi/issues?state=open",
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".gnb-usermenu a", { hasText: "Log in" })).toHaveAttribute(
    "href",
    `${basePath}/users/loginform`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const beforeUsermenuTabClickUrl = page.url();

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Project" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myProjectList"),
  ).toHaveClass(/active/u);
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myOrganizationList"),
  ).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Recent History" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myRecentIssueList"),
  ).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Favorite" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myOrganizationList"),
  ).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MISSING_USER_SCREEN.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

type MockPublicProfileOptions = {
  anonymousViewer?: boolean;
  currentUser?: boolean;
  memberProjectOwnerName?: string;
  pullRequestsEmpty?: boolean;
  viewerCanLeave?: boolean;
  viewerCanWatch?: boolean;
};

async function mockPublicProfile(page: Page, options: MockPublicProfileOptions = {}) {
  const anonymousViewer = options.anonymousViewer ?? false;
  const currentUser = options.currentUser ?? false;
  const memberProjectOwnerName = options.memberProjectOwnerName ?? "door";
  const pullRequestsEmpty = options.pullRequestsEmpty ?? false;
  const viewerCanLeave = options.viewerCanLeave ?? false;
  const viewerCanWatch = options.viewerCanWatch ?? true;

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: anonymousViewer,
        loginId: anonymousViewer ? "anonymous" : currentUser ? "door" : "alice",
      }),
    });
  });
  await page.route("**/api/v1/users/door/profile**", async (route) => {
    const url = new URL(route.request().url());
    const daysAgo = Number(url.searchParams.get("daysAgo") ?? "14");
    const selected = url.searchParams.get("selected") ?? "issues";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        daysAgo,
        issueItems: [
          {
            assigneeLabel: "Alice",
            assigneeLoginId: "alice",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 1,
            childIssues: [
              {
                assigneeLabel: "Alice",
                commentCount: 0,
                createdLabel: "2026-07-03",
                isDraft: false,
                issueNumber: 13,
                labels: [],
                state: "open",
                title: "Open profile child",
                voterCount: 0,
              },
              {
                assigneeLabel: "",
                commentCount: 0,
                createdLabel: "2026-07-04",
                isDraft: false,
                issueNumber: 14,
                labels: [],
                state: "closed",
                title: "Closed profile child",
                voterCount: 0,
              },
            ],
            childOpenCount: 1,
            commentCount: 3,
            dueDateLabel: "2026-08-01",
            dueDateOverdue: false,
            dueDateText: "31 days",
            id: 11,
            issueNumber: 7,
            labels: [
              {
                categoryName: "Type",
                color: "#f44336",
                id: 17,
                name: "Bug",
              },
            ],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Open profile issue",
            updatedLabel: "2026-07-01",
          },
          {
            assigneeLabel: "",
            assigneeLoginId: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            commentCount: 0,
            dueDateLabel: "2026-08-01",
            dueDateOverdue: false,
            id: 12,
            issueNumber: 8,
            milestoneId: 3,
            milestoneTitle: "v1.0",
            ownerName: "door",
            projectName: "sample",
            state: "closed",
            title: "Closed profile issue",
            updatedLabel: "2026-06-29",
          },
        ],
        memberProjects: [
          {
            createdLabel: "2026-06-01",
            isWatching: false,
            lastPushedLabel: "2026-06-30",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 3,
            originOwnerName: "",
            originProjectName: "",
            overview: "Profile project",
            ownerName: memberProjectOwnerName,
            projectName: "sample",
            projectScope: "public",
            viewerCanLeave,
            viewerCanWatch,
            watchCount: 5,
          },
        ],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "door",
          primaryEmailAddress: "door@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: pullRequestsEmpty
          ? []
          : [
              {
                commentCount: 2,
                contributorLabel: "Door User",
                contributorLoginId: "door",
                ownerName: "door",
                projectName: "sample",
                pullRequestNumber: 4,
                receiverAvatarUrl: "/assets/images/default-avatar-32.png",
                receiverLabel: "Alice",
                receiverLoginId: "alice",
                state: "open",
                title: "Profile pull request",
                updatedLabel: "2026-07-02",
              },
            ],
        selected,
        viewerCanEditProfile: currentUser,
      }),
    });
  });
}

async function mockMissingPublicProfile(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: true,
        loginId: "anonymous",
      }),
    });
  });
  await page.route("**/api/v1/users/ghost/profile**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 404,
      body: JSON.stringify({
        error: {
          code: "not_found",
          message: "User exists not",
          status: 404,
        },
      }),
    });
  });
}

async function readProfileMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const userBox = document.querySelector<HTMLElement>(".user-box");
    const userInfo = document.querySelector<HTMLElement>(".user-info-box");
    const userStream = document.querySelector<HTMLElement>(".user-stream-box");
    const issueList = document.querySelector<HTMLElement>(".post-list-wrap.my-issues");
    if (!pageWrapOuter || !userBox || !userInfo || !userStream || !issueList) {
      throw new Error("Expected profile metric targets are missing.");
    }
    return {
      issueListDisplay: getComputedStyle(issueList).display,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      userBoxDisplay: getComputedStyle(userBox).display,
      userInfoWidth: Math.round(userInfo.getBoundingClientRect().width),
      userStreamWidth: Math.round(userStream.getBoundingClientRect().width),
    };
  });
}

async function readSpaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function canonicalizeProfileRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".site-breadcrumb-outer, .page-wrap-outer"));
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => attr.name !== "alt")
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
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
        .filter((attr) => attr.name !== "alt")
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
        .filter((attr) => attr.name !== "alt")
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

function expectedProfileScreen({
  basePath,
  daysAgo,
  selected,
  currentUser = false,
  memberProjectOwnerName = "door",
  pullRequestsEmpty = false,
  viewerCanLeave = false,
  viewerCanWatch = true,
}: {
  basePath: string;
  currentUser?: boolean;
  daysAgo: number;
  memberProjectOwnerName?: string;
  pullRequestsEmpty?: boolean;
  selected: "issues" | "projects" | "pullRequests";
  viewerCanLeave?: boolean;
  viewerCanWatch?: boolean;
}) {
  const projectHref = `${basePath}/${memberProjectOwnerName}/sample`;
  const stats = viewerCanLeave
    ? `<a href="${basePath}/info/leave/${memberProjectOwnerName}/sample" class="nbtn black medium last leaveProject" data-projectname="sample"><i class="yobicon-trash"></i> Leave</a>`
    : viewerCanWatch
      ? `<a href="${projectHref}/watch" class="ybtn watchBtn"><i class="yobicon-eye-close yobicon-middle yobicon-white"></i>Watch<span class="num-badge">5</span></a>`
      : "";
  return EXPECTED_PROFILE_SCREEN.replaceAll("__BASE_PATH__", basePath)
    .replace('value="14"', `value="${daysAgo}"`)
    .replace(
      '<span class="email">door@example.com</span>',
      currentUser
        ? `<span class="email">door@example.com</span><div class="edit"><a href="${basePath}/user/editform" class="ybtn ybtn-default ybtn-mini"><i class="yobicon-edit"></i> Edit profile</a></div>`
        : '<span class="email">door@example.com</span>',
    )
    .replace(
      `<a href="${basePath}/door/sample" class="avatar-wrap small"><img src="/assets/images/project_default_logo.png"></a>`,
      `<a href="${projectHref}" class="avatar-wrap small"><img src="/assets/images/project_default_logo.png"></a>`,
    )
    .replace(
      `<a href="${basePath}/door/sample" class="project-name">sample</a>`,
      `<a href="${projectHref}" class="project-name">sample</a>`,
    )
    .replace(
      `<a href="${basePath}/door" class="owner-name-small">door</a>`,
      `<a href="${basePath}/${memberProjectOwnerName}" class="owner-name-small">${memberProjectOwnerName}</a>`,
    )
    .replace(
      `<a href="${basePath}/door/sample/watch" class="ybtn watchBtn"><i class="yobicon-eye-close yobicon-middle yobicon-white"></i>Watch<span class="num-badge">5</span></a>`,
      stats,
    )
    .replace(
      '<li class="active"><button type="button" data-toggle="tab">Issue',
      `<li class="${selected === "issues" ? "active" : ""}"><button type="button" data-toggle="tab">Issue`,
    )
    .replace(
      '<li class=""><button type="button" data-toggle="tab">Pull request',
      `<li class="${selected === "pullRequests" ? "active" : ""}"><button type="button" data-toggle="tab">Pull request`,
    )
    .replace(
      'Pull request <span class="num-badge">1</span></button>',
      pullRequestsEmpty
        ? "Pull request </button>"
        : 'Pull request <span class="num-badge">1</span></button>',
    )
    .replace(
      '<li class=""><button type="button" data-toggle="tab">projects',
      `<li class="${selected === "projects" ? "active" : ""}"><button type="button" data-toggle="tab">projects`,
    )
    .replace(
      '<div id="issues" class="tab-pane active">',
      `<div id="issues" class="tab-pane ${selected === "issues" ? "active" : ""}">`,
    )
    .replace(
      '<div id="pullRequests" class="tab-pane ">',
      `<div id="pullRequests" class="tab-pane ${selected === "pullRequests" ? "active" : ""}">`,
    )
    .replace(
      `<ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="${basePath}/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="${basePath}/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="${basePath}/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="${basePath}/door" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="${basePath}/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="${basePath}/alice" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>`,
      pullRequestsEmpty
        ? `<div class="error-wrap"><p>recently No pull requests have been received</p></div><ul class="post-list-wrap  row-fluid"></ul>`
        : `<ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="${basePath}/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="${basePath}/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="${basePath}/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="${basePath}/door" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="${basePath}/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="${basePath}/alice" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>`,
    )
    .replace(
      '<div id="projects" class="tab-pane ">',
      `<div id="projects" class="tab-pane ${selected === "projects" ? "active" : ""}">`,
    );
}
