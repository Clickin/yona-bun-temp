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
          <li class="active"><button type="button">Issue <span class="num-badge">2</span></button></li>
          <li class=""><button type="button">Pull request <span class="num-badge">1</span></button></li>
          <li class=""><button type="button">projects <span class="num-badge">1</span></button></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" style="position:relative"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
        </ul>
        <div class="tab-content">
          <div id="issues" class="tab-pane active">
            <ul class="nav nav-tabs">
              <li class="active"><button type="button">Open<span class="num-badge">1</span></button></li>
              <li class=""><button type="button">Closed<span class="num-badge">1</span></button></li>
              <li><div class="show-subtasks mr10" id="two-column-mode-checkbox" title="Show subtask" style="position:relative"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li>
            </ul>
            <div class="tab-content">
              <div id="openIssues" class="tab-pane active">
                <ul class="post-list-wrap my-issues row-fluid">
                  <li class="post-item title" id="issue-item-11" href="__BASE_PATH__/door/sample/issue/7">
                    <div class="span12 span-hard-wrap">
                      <div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" title="Project name">sample</a></span><span class="infos-item post-id">#7</span></div>
                      <div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/7" class="title">Open profile issue</a><span class="item-count-groups"><a href="__BASE_PATH__/door/sample/issue/7#comments" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">3</span></a></span><span class="for-subtask-progressbar"><div class="subtask-progress upload-progress red-outline"><div class="bar red" style="width: 50%;" title="Subtask"></div></div><span class="subtask-progress completion-ratio">1/2</span></span><a href="__BASE_PATH__/door/sample/issues?state=open&labelIds=17" class="label issue-label list-label" data-label-id="17" style="background:rgb(244,67,54)">Bug</a><div class="child-issue-list hide"><div class="child-issues"><div class="issue-item  child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/door/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Open profile child</span><span> - Alice</span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="2026-07-03">2026-07-03</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/door/sample/issue/14"><span class="item-name"><span class="subtask-number">#14</span><span>Closed profile child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="2026-07-04">2026-07-04</span></div></div></div></span></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" title="door">Door User</a></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" title="alice">Alice</a></div>
                      <div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" title="alice">Alice</a></span><span class="infos-item" title="2026-07-01">2026-07-01</span><span class="pull-right " title="Due date: 2026-08-01"><i class="yobicon-clock2"></i>31 days</span></span></div>
                    </div>
                  </li>
                </ul>
              </div>
              <div id="closedIssues" class="tab-pane "><ul class="post-list-wrap my-issues row-fluid"><li class="post-item title" id="issue-item-12" href="__BASE_PATH__/door/sample/issue/8"><div class="span12 span-hard-wrap"><div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" title="Project name">sample</a></span><span class="infos-item post-id">#8</span></div><div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/8" class="title">Closed profile issue</a><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" title="door">Door User</a></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item"></span></div><div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><span class="infos-item"></span></span><span class="infos-item" title="2026-06-29">2026-06-29</span><span class="mileston-tag"><a href="__BASE_PATH__/door/sample/milestone/3" title="Milestone">v1.0</a></span><span class="pull-right " title="Due date: 2026-08-01"><i class="yobicon-clock2"></i>2026-08-01</span></span></div></div></li></ul></div>
            </div>
          </div>
          <div id="pullRequests" class="tab-pane ">
            <ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="__BASE_PATH__/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="__BASE_PATH__/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="__BASE_PATH__/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="__BASE_PATH__/door" class="infos-item infos-link-item" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="__BASE_PATH__/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="__BASE_PATH__/alice" class="avatar-wrap assinee" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>
          </div>
          <div id="projects" class="tab-pane ">
            <ul class="user-streams all-projects"><li class="project"><div class="info-wrap"><div class="pull-left"><a href="__BASE_PATH__/door/sample" class="avatar-wrap small"><img src="/assets/images/project_default_logo.png"></a></div><div class="pull-left" style="margin-left: 10px;"><div class="header"><a href="__BASE_PATH__/door/sample" class="project-name">sample</a></div><div class="desc">Profile project</div><div class="name-tag"><i class="yobicon-friends yobicon-middle"></i><strong>3</strong> <a href="__BASE_PATH__/door" class="owner-name-small">door</a> <span title="2026-06-01">2026-06-01</span>, Latest code update <span title="2026-06-30">2026-06-30</span></div></div></div><div class="stats-wrap pull-right"><div class="stats"><a href="__BASE_PATH__/door/sample/watch" class="ybtn watchBtn"><i class="yobicon-eye-close yobicon-middle yobicon-white"></i>Watch<span class="num-badge">5</span></a></div></div></li></ul>
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
    <a href="__BASE_ROOT_HREF__" class="logo"><h1 class="blind">Yoram</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
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
      <a href="__BASE_ROOT_HREF__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      & © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      & <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("public user profile route source keeps navigation on TanStack Link", async () => {
  const source = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");

  expect(source).not.toContain("<a ");
  expect(source).not.toContain("</a>");
  expect(source).not.toContain('declare module "react"');
  expect(source).not.toContain("interface LiHTMLAttributes");
  expect(source).not.toContain("as unknown as LiHTMLAttributes");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("runtimeJsx");
  expect(source).not.toContain("react/jsx-runtime");
  expect(source).not.toContain("useLinkProps");
  expect(source).not.toContain("useRouter");
  expect(source).not.toContain("router.history");
  expect(source).not.toContain('ComponentPropsWithoutRef<"a">');
  expect(source).not.toContain("HTMLAnchorElement");
  expect(source).not.toContain("legacyRootHref");
  expect(source).not.toContain("MountedRootLink");
  expect(source).not.toContain("MountedRootHrefLink");
  expect(source).not.toContain("legacyMissingUserLogoLinkProps");
  expect(source).not.toContain("legacyMissingUserHomeButtonLinkProps");
  expect(source).not.toContain("React.createElement");
  expect(source).not.toContain("forwardRef");
  expect(source).not.toContain("function LegacyHrefAnchor({");
  expect(source).not.toContain("<LegacyHrefAnchor");
  expect(source).not.toContain("href={legacyMissingUserHomeHref}");
  expect(source).not.toContain("legacyMissingUserHomeHref");
  expect(source).toContain("import { createFileRoute, Link, Navigate, redirect }");
  expect(source).toContain('className="logo"');
  expect(source).toContain(
    "type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(source).toContain("} satisfies LegacyIssueRowAttributes;");
  expect(source).toContain("LEGACY_LINK_PROPS");
  expect(source).toContain('to="/"');
  expect(source).toContain("Link,");
  expect(source).toContain("Navigate,");
  expect(source).not.toContain('data-toggle="tab"');
  expect(source).toContain('hash="comments"');
  expect(source).toContain('hash="vote"');
  expect(source).toContain("<title>{profile.loginId}</title>");
  expect(source).not.toContain("document.title");
  expect(source).not.toMatch(/\b(?:document|window\.document|globalThis\.document)\s*\./u);
  expect(source).toContain("function ConnectedSocialProviderLogo({");
  expect(source).toContain('normalized === "github"');
  expect(source).toContain('normalized === "google"');
  expect(source).toContain(
    'import googleProviderLogoUrl from "../assets/legacy/provider-logo/btn_google_light_normal_ios.svg?no-inline";',
  );
  expect(source).toContain("src={googleProviderLogoUrl}");
  expect(source).not.toContain('"/assets/images/provider-logo/btn_google_light_normal_ios.svg"');
  expect(source).not.toContain('data-toggle="tooltip"');
  expect(source).not.toContain("data-placement");
  expect(source).toContain("const userProfileStaticStyles = stylex.create({");
  expect(source).toContain("two-column-icon mr10 hide-in-mobile");
  expect(source).toContain("show-subtasks mr10");
  expect(source).toContain("post-list-wrap my-issues row-fluid");
  expect(source).toContain("post-item title");
  expect(source).toContain("popover top");
  expect(source).toContain('role="tooltip"');
  expect(source).toContain(
    'typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true"',
  );
  expect(source).toContain(
    'globalThis.localStorage?.setItem("useTwoColumnMode", String(nextChecked))',
  );
  expect(source).not.toContain('data-toggle="popover"');
  expect(source).not.toContain('data-trigger="hover"');
  expect(source).not.toContain('data-content={t("common.two.column.mode.desc")}');
  expect(source).not.toContain('data-content={t("common.show.subtasks.desc")}');
  expect(source).not.toContain("dangerouslySetInnerHTML");
});

test("public user profile matches legacy user/view.scala.html issues screen", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page).toHaveTitle("door");
  await expect(page.locator("#openIssues .post-item")).toHaveCount(1);
  await expect(page.locator('.user-stream-box > .nav-tabs a[href^="#"]')).toHaveCount(0);
  await expect(
    page.locator('[data-stylex-owner="user-profile-issue-tabs"] a[href^="#"]'),
  ).toHaveCount(0);
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
  await expect(page.locator('.user-box [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator(".user-box [data-placement]")).toHaveCount(0);
  await expect(page.locator("#issue-item-11 .title.project")).toHaveAttribute(
    "title",
    "Project name",
  );
  await expect(page.locator("#issue-item-11 .title.project")).toHaveText("sample");
  await expect(page.locator("#issue-item-11 .author-cell").first()).toHaveAttribute(
    "title",
    "door",
  );
  await expect(page.locator("#issue-item-11 .author-cell").first()).toHaveText("Door User");
  await expect(page.locator("#issue-item-11 .meta-cell > .infos-item")).toHaveAttribute(
    "title",
    "2026-07-01",
  );
  await expect(page.locator("#issue-item-11 .meta-cell > .pull-right")).toHaveAttribute(
    "title",
    "Due date: 2026-08-01",
  );
  await expect(page.locator("#issue-item-11 .meta-cell > .pull-right")).toContainText("31 days");
  await expect(page.locator("#issue-item-12 .mileston-tag a")).toHaveAttribute(
    "title",
    "Milestone",
  );
  await expect(page.locator("#issue-item-12 .mileston-tag a")).toHaveText("v1.0");
  await expect(page.locator("#pullRequests .infos-link-item")).toHaveAttribute("title", "door");
  await expect(page.locator("#pullRequests .infos-link-item")).toHaveText("Door User");
  await expect(page.locator("#pullRequests .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Alice",
  );
  await expect(page.locator('[data-stylex-owner="user-profile-provider-logo"]')).toBeEmpty();
  await expect(page.locator('.user-stream-box > .nav-tabs button[type="button"]')).toHaveText([
    "Issue 2",
    "Pull request 1",
    "projects 1",
  ]);
  await expect(
    page.locator('[data-stylex-owner="user-profile-issue-tabs"] button[type="button"]'),
  ).toHaveText(["Open1", "Closed1"]);
  await expect(page.locator('.user-stream-box > .nav-tabs button[data-toggle="tab"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('[data-stylex-owner="user-profile-issue-tabs"] button[data-toggle="tab"]'),
  ).toHaveCount(0);
  const showSubtasks = page.locator(".show-subtasks");
  await expect(showSubtasks).toHaveAttribute("title", "Show subtask");
  await expect(showSubtasks).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-trigger", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-placement", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-content", /.+/u);
  const twoColumnMode = page.locator(".two-column-icon");
  await expect(twoColumnMode).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(twoColumnMode).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumnMode).not.toHaveAttribute("data-content", /.+/u);
  await expect(page.locator(".two-column-icon .popover.top")).toHaveCount(0);
  await expect(page.locator(".show-subtasks .popover.top")).toHaveCount(0);

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

test("public user profile show-subtasks popover is React-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();

  const showSubtasks = page.locator(".show-subtasks");
  const checkbox = page.locator("#toggle-show-subtasks");
  const popover = showSubtasks.locator(".popover.top");

  await expect(popover).toHaveCount(0);
  await showSubtasks.hover();
  await page.waitForTimeout(50);
  await expect(popover).toHaveCount(0);
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Show subtask");
  await expect(popover.locator(".popover-content")).toHaveText("Show subtask always");

  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await checkbox.focus();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Show subtask");

  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
});

test("public user profile two-column popover and storage are React-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    localStorage.setItem("useTwoColumnMode", "true");
  });
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();

  const twoColumnMode = page.locator(".two-column-icon");
  const checkbox = page.locator("#two-column-mode");
  const popover = twoColumnMode.locator(".popover.top");

  await expect(twoColumnMode).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumnMode).not.toHaveAttribute("data-content", /.+/u);
  await expect(popover).toHaveCount(0);
  await expect(checkbox).toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("true");

  await twoColumnMode.hover();
  await page.waitForTimeout(50);
  await expect(popover).toHaveCount(0);
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(popover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await readTwoColumnPopoverMetrics(page)).toEqual({
    centeredAboveControl: true,
    popoverTopPlacement: true,
  });

  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await checkbox.focus();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");

  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("false");

  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("true");
});

test("public user profile renders legacy connected social provider logos", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, {
    connectedSocialProviders: ["github", "google", "unsupported"],
  });

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();

  const providerLogo = page.locator(
    '[data-stylex-owner="user-profile-user-since"] [data-stylex-owner="user-profile-provider-logo"]',
  );
  await expect(
    providerLogo.locator(':scope > [data-stylex-owner="user-profile-provider-github"]'),
  ).toHaveCount(1);
  await expect(
    providerLogo.locator(':scope > [data-stylex-owner="user-profile-provider-google"]'),
  ).toHaveCount(1);
  await expect(providerLogo.locator(":scope > *")).toHaveCount(2);
  const githubSvg = providerLogo.locator('[data-stylex-owner="user-profile-provider-github"] svg');
  await expect(githubSvg).toHaveAttribute("viewBox", "0 0 16 16");
  await expect(githubSvg).toHaveAttribute("height", "24");
  await expect(githubSvg).toHaveAttribute("width", "19");
  await expect(githubSvg.locator("path")).toHaveCount(1);
  const googleImage = providerLogo.locator(
    '[data-stylex-owner="user-profile-provider-google-image"]',
  );
  await expect(googleImage).toHaveAttribute("src", /btn_google_light_normal_ios\.svg/u);
  expect(await googleImage.getAttribute("src")).not.toContain("/assets/images/provider-logo/");
  await expect(page.locator(".provider-name")).toHaveCount(0);

  expect(await readConnectedSocialProviderMetrics(page)).toEqual({
    authProviderFontFamily: expect.stringContaining("Roboto"),
    githubDisplay: "inline-block",
    githubMarginBottom: "3px",
    githubMarginLeft: "-4px",
    githubMarginTop: "3px",
    githubWidth: "30px",
    svgVerticalAlign: "middle",
  });
});

test("anonymous public user profile hides legacy activity stream controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, { anonymousViewer: true });

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  const guestStream = page.locator('[data-stylex-owner="user-profile-guest-stream-shell"]');
  await expect(guestStream).toHaveCount(1);
  await expect(guestStream).toBeEmpty();
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

  await page
    .locator('[data-stylex-owner="user-profile-issue-tabs"] button', { hasText: "Closed" })
    .click();
  await expect(
    page.locator('[data-stylex-owner="user-profile-issue-tabs"] > li').nth(1),
  ).toHaveClass("active");
  await expect(page.locator("#closedIssues")).toHaveClass(/active/u);
  await expect(page.locator("#openIssues")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);

  await page
    .locator('[data-stylex-owner="user-profile-issue-tabs"] button', { hasText: "Open" })
    .click();
  await expect(
    page.locator('[data-stylex-owner="user-profile-issue-tabs"] > li').first(),
  ).toHaveClass("active");
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
  const rootHref = `${basePath}/`;
  await mockMissingPublicProfile(page);

  await page.goto(`${basePath}/ghost`);
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText("User exists not");
  await expect(page.locator('#mySidenav .right-menu > .nav-tabs.nm a[href^="#"]')).toHaveCount(0);
  await expect(
    page.locator('#mySidenav .right-menu > .nav-tabs.nm button[type="button"]'),
  ).toHaveText(["Favorite", "Project", "Recent History"]);
  await expect(
    page.locator('#mySidenav .right-menu > .nav-tabs.nm button[data-toggle="tab"]'),
  ).toHaveCount(0);
  await expect(page.locator(".gnb-nav a", { hasText: "Project list" })).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "href",
    "https://github.com/yona-projects/yona/issues",
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".gnb-usermenu a", { hasText: "Log in" })).toHaveAttribute(
    "href",
    `${basePath}/users/loginform`,
  );
  await expect(page.locator(".gnb-inner > .logo")).toHaveAttribute("href", rootHref);
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", rootHref);
  await expect(page.locator(".gnb-inner > .logo")).not.toHaveAttribute("aria-current", /.+/u);
  await expect(page.locator(".gnb-inner > .logo")).not.toHaveAttribute("data-status", /.+/u);
  await expect(page.locator(".gnb-inner > .logo")).toHaveAttribute("class", "logo");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).not.toHaveAttribute(
    "aria-current",
    /.+/u,
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).not.toHaveAttribute(
    "data-status",
    /.+/u,
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute(
    "class",
    /(?:^| )ybtn ybtn-info(?: |$)/u,
  );
  expect(await readMissingUserLinkMetrics(page)).toEqual({
    homeInsideErrorWrap: true,
    homeVisibleBelowMessage: true,
    logoInsideHeader: true,
  });

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const beforeHomeClickUrl = page.url();

  await page.locator(".error-wrap .ybtn.ybtn-info").click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(rootHref);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  await page.goBack();
  await expect.poll(() => page.url()).toBe(beforeHomeClickUrl);
  await expect(page.locator(".error-wrap")).toBeVisible();

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
      EXPECTED_MISSING_USER_SCREEN.replaceAll("__BASE_ROOT_HREF__", rootHref).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

type MockPublicProfileOptions = {
  anonymousViewer?: boolean;
  connectedSocialProviders?: string[];
  currentUser?: boolean;
  memberProjectOwnerName?: string;
  pullRequestsEmpty?: boolean;
  viewerCanLeave?: boolean;
  viewerCanWatch?: boolean;
};

async function mockPublicProfile(page: Page, options: MockPublicProfileOptions = {}) {
  const anonymousViewer = options.anonymousViewer ?? false;
  const connectedSocialProviders = options.connectedSocialProviders ?? [];
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
          connectedSocialProviders,
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
    const userInfo = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
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

async function readConnectedSocialProviderMetrics(page: Page) {
  return page.evaluate(() => {
    const providerLogo = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-user-since"] [data-stylex-owner="user-profile-provider-logo"]',
    );
    const github = providerLogo?.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-provider-github"]',
    );
    const svg = github?.querySelector<SVGElement>("svg");
    if (!providerLogo || !github || !svg) {
      throw new Error("Expected connected social provider metric targets are missing.");
    }

    const providerLogoStyle = getComputedStyle(providerLogo);
    const githubStyle = getComputedStyle(github);
    const svgStyle = getComputedStyle(svg);

    return {
      authProviderFontFamily: providerLogoStyle.fontFamily,
      githubDisplay: githubStyle.display,
      githubMarginBottom: githubStyle.marginBottom,
      githubMarginLeft: githubStyle.marginLeft,
      githubMarginTop: githubStyle.marginTop,
      githubWidth: githubStyle.width,
      svgVerticalAlign: svgStyle.verticalAlign,
    };
  });
}

async function readTwoColumnStorage(page: Page) {
  return page.evaluate(() => localStorage.getItem("useTwoColumnMode"));
}

async function readTwoColumnPopoverMetrics(page: Page) {
  return page.evaluate(() => {
    const control = document.querySelector<HTMLElement>(".two-column-icon");
    const popover = document.querySelector<HTMLElement>(".two-column-icon .popover.top");
    if (!control || !popover) {
      throw new Error("Expected two-column popover metric targets are missing.");
    }

    const controlBox = control.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    const controlCenter = controlBox.left + controlBox.width / 2;
    const popoverCenter = popoverBox.left + popoverBox.width / 2;

    return {
      centeredAboveControl: Math.abs(controlCenter - popoverCenter) <= 2,
      popoverTopPlacement: popoverBox.bottom <= controlBox.top + 1,
    };
  });
}

async function readMissingUserLinkMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".gnb-outer");
    const logo = document.querySelector<HTMLElement>(".gnb-inner > .logo");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const message = document.querySelector<HTMLElement>(".error-wrap p");
    const home = document.querySelector<HTMLElement>(".error-wrap .ybtn.ybtn-info");
    if (!header || !logo || !errorWrap || !message || !home) {
      throw new Error("Expected missing-user metric targets are missing.");
    }
    const headerBox = header.getBoundingClientRect();
    const logoBox = logo.getBoundingClientRect();
    const errorBox = errorWrap.getBoundingClientRect();
    const messageBox = message.getBoundingClientRect();
    const homeBox = home.getBoundingClientRect();
    return {
      homeInsideErrorWrap:
        homeBox.left >= errorBox.left &&
        homeBox.right <= errorBox.right &&
        homeBox.top >= errorBox.top &&
        homeBox.bottom <= errorBox.bottom,
      homeVisibleBelowMessage: homeBox.top >= messageBox.bottom,
      logoInsideHeader:
        logoBox.left >= headerBox.left &&
        logoBox.right <= headerBox.right &&
        logoBox.top >= headerBox.top &&
        logoBox.bottom <= headerBox.bottom,
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
        .filter(
          (attr) =>
            attr.name !== "alt" &&
            attr.name !== "style" &&
            attr.name !== "data-stylex-owner" &&
            attr.name !== "data-style-src" &&
            (attr.name !== "class" || normalizeAttr(attr) !== ""),
        )
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
      if (attr.name !== "class") {
        return attr.value;
      }
      return attr.value
        .split(/\s+/u)
        .filter(Boolean)
        .filter(
          (token) =>
            !token.includes("__userProfileStaticStyles.") &&
            !token.startsWith("-user-profile__") &&
            !/^x[a-z0-9]{5,7}$/u.test(token),
        )
        .join(" ");
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
        .filter(
          (attr) =>
            attr.name !== "alt" &&
            attr.name !== "style" &&
            attr.name !== "data-stylex-owner" &&
            attr.name !== "data-style-src" &&
            (attr.name !== "class" || normalizeAttr(attr) !== ""),
        )
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
      if (attr.name !== "class") {
        return attr.value;
      }
      return attr.value
        .split(/\s+/u)
        .filter(Boolean)
        .filter(
          (token) =>
            !token.includes("__userProfileStaticStyles.") &&
            !token.startsWith("-user-profile__") &&
            !/^x[a-z0-9]{5,7}$/u.test(token),
        )
        .join(" ");
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
        .filter(
          (attr) =>
            attr.name !== "alt" &&
            attr.name !== "style" &&
            attr.name !== "data-stylex-owner" &&
            attr.name !== "data-style-src" &&
            (attr.name !== "class" || normalizeAttr(attr) !== ""),
        )
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
      if (attr.name !== "class") {
        return attr.value;
      }
      return attr.value
        .split(/\s+/u)
        .filter(Boolean)
        .filter(
          (token) =>
            !token.includes("__userProfileStaticStyles.") &&
            !token.startsWith("-user-profile__") &&
            !/^x[a-z0-9]{5,7}$/u.test(token),
        )
        .join(" ");
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
      '<li class="active"><button type="button">Issue',
      `<li class="${selected === "issues" ? "active" : ""}"><button type="button">Issue`,
    )
    .replace(
      '<li class=""><button type="button">Pull request',
      `<li class="${selected === "pullRequests" ? "active" : ""}"><button type="button">Pull request`,
    )
    .replace(
      'Pull request <span class="num-badge">1</span></button>',
      pullRequestsEmpty
        ? "Pull request </button>"
        : 'Pull request <span class="num-badge">1</span></button>',
    )
    .replace(
      '<li class=""><button type="button">projects',
      `<li class="${selected === "projects" ? "active" : ""}"><button type="button">projects`,
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
      `<ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="${basePath}/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="${basePath}/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="${basePath}/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="${basePath}/door" class="infos-item infos-link-item" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="${basePath}/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="${basePath}/alice" class="avatar-wrap assinee" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>`,
      pullRequestsEmpty
        ? `<div class="error-wrap"><p>recently No pull requests have been received</p></div><ul class="post-list-wrap  row-fluid"></ul>`
        : `<ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="${basePath}/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="${basePath}/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="${basePath}/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="${basePath}/door" class="infos-item infos-link-item" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="${basePath}/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="${basePath}/alice" class="avatar-wrap assinee" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>`,
    )
    .replace(
      '<div id="projects" class="tab-pane ">',
      `<div id="projects" class="tab-pane ${selected === "projects" ? "active" : ""}">`,
    );
}
