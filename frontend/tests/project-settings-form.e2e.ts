import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_SETTINGS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" title="Site administration" data-placement="bottom"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class="active"><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="saveSetting" method="post" action="__BASE_PATH__/admin/sample/setting" enctype="multipart/form-data" class="nm"><div class="bubble-wrap gray" style="overflow: visible"><input type="hidden" name="id" value="7"><input type="hidden" name="watchingCount" value="5"><div class="box-wrap top clearfix frm-wrap" style="padding-top:20px;"><div class="setting-box left"><div class="logo-wrap" style="background-image:url('/assets/images/project_default_logo.png')"></div><div class="logo-desc"><ul class="unstyled descs"><li><strong>Project logo</strong></li><li>File type: bmp, jpg, gif, png <span class="point">bmp, jpg, gif, png</span></li><li>Maximum file size <span class="point">5MB</span></li><li><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i>File upload<input id="logoPath" type="file" class="file" name="logoPath" accept="image/*"></div></div></li></ul></div></div><dl class="setting-box right"><dt><label for="project-name">Enter project name in alphabetnumerical or symbol characters(_-.)</label></dt><dd><input id="project-name" type="text" name="name" data-trigger="focus" data-content="Also, previous links are available. After changing, during the first 24 hours, you can rename or transfer freely as many times as you want without breaking previous links. The previous URL will be fixed and preserved for 24 hours." data-placement="left" maxlength="250" value="sample"><br></dd><dt><label for="project-desc">Enter project description</label></dt><dd><textarea id="project-desc" name="overview" maxlength="250" class="textarea">Sample overview</textarea></dd></dl></div><div class="box-wrap middle"><div class="cu-label">Share Options</div><div class="cu-desc"><input name="projectScope" type="radio" class="radio-btn" id="public" value="PUBLIC" checked><label for="public" class="bg-radiobtn label-public">PUBLIC</label><input name="projectScope" type="radio" class="radio-btn" id="private" value="PRIVATE"><label for="private" class="bg-radiobtn label-private">PRIVATE</label><span class="note">Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.</span></div></div><div class="box-wrap middle"><div class="cu-label">Issue Template</div><div class="cu-desc"><a href="__BASE_PATH__/admin/sample/postform?issueTemplate=true" class="ybtn" target="_blank">Edit</a></div></div><div class="box-wrap middle"><div class="cu-label">Only project members can access code or related menus</div><div class="cu-desc"><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleMemberOnly" class="radio-btn" value="true"><label for="codeAccessibleMemberOnly" class="bg-radiobtn label-public">Yes</label><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleAnyone" class="radio-btn" value="false" checked><label for="codeAccessibleAnyone" class="bg-radiobtn label-private">No</label><span class="note"></span></div></div><div class="box-wrap middle reviewer-count-wrap" id="reviewerCountSettingPanel"><div class="cu-label vmiddle">Reviewer</div><div class="cu-desc"><input name="isUsingReviewerCount" data-toggle="reviewer-count" data-action="show" type="radio" class="radio-btn" id="reviewerCountEnable" value="true" checked><label for="reviewerCountEnable" class="bg-radiobtn label-public">Enable</label><input name="isUsingReviewerCount" data-toggle="reviewer-count" data-action="hide" type="radio" class="radio-btn" id="reviewerCountDisable" value="false"><label for="reviewerCountDisable" class="bg-radiobtn label-private">Disable</label><div id="welReviewerCount" data-value="true" class="hide" style="display: block;"><input type="hidden" name="defaultReviewerCount" value="2"><div class="btn-group branches" data-id="project-reviewer-count" data-name="defaultReviewerCount"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">2</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="1"><button type="button">1</button></li><li data-value="2"><button type="button">2</button></li><li data-value="3"><button type="button">3</button></li></ul></div><span class="note ml10">of reviewers is required to merge pull request.</span></div></div></div><div class="box-wrap middle" id="defaultBranceSettingPanel"><div class="cu-label vmiddle">Default branch</div><div class="cu-desc"><select id="project-default-branch" name="defaultBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" style="min-width: 220px;"><option value="main" selected>main</option><option value="develop">develop</option></select></div></div><div class="box-wrap middle"><div class="cu-label vmiddle">Menu Setting</div><div class="cu-desc"><label for="menuSettingCode" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingCode" name="code" value="true" checked>Code</label><label for="menuSettingIssue" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingIssue" name="issue" value="true" checked>Issue</label><label for="menuSettingPullRequest" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingPullRequest" name="pullRequest" value="true" checked>Pull request</label><label for="menuSettingReview" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingReview" name="review" value="true" checked>Review</label><label for="menuSettingMilestone" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingMilestone" name="milestone" value="true" checked>Milestone</label><label for="menuSettingBoard" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingBoard" name="board" value="true" checked>Board</label></div></div></div><div class="box-wrap bottom"><button id="save" type="submit" class="ybtn ybtn-success">Save</button></div></form></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project settings matches legacy project/setting.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("#project-default-branch")).toHaveValue("main");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator('.user-menu-wrap .user-menu a[href$="/admin"]')).not.toHaveAttribute(
    "class",
    /(?:^|\s)active(?:\s|$)/,
  );
  expect(
    await page
      .locator(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
      )
      .evaluateAll((roots) => roots.map((root) => root.className)),
  ).toEqual([
    "unsupported hidden",
    "gnb-outer project-header",
    "project-header-outer",
    "project-menu-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_SETTINGS.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await projectHeaderMetrics(page)).toEqual({
    avatarHeight: 90,
    avatarTopOffsetFromHeaderBottom: -60,
    avatarWidth: 90,
    headerHeight: 120,
    headerInnerHeight: 120,
    menuHeight: 40,
    menuTopOffsetFromHeaderBottom: 0,
    wrapHeight: 120,
    wrapWidthRatio: 0.97,
  });
  expect(await projectSettingMetrics(page)).toMatchObject({
    bubbleBackground: "rgb(247, 247, 247)",
    bubbleBorderRadius: "5px",
    defaultBranchName: "defaultBranch",
    formAction: `${basePath}/admin/sample/setting`,
    formEnctype: "multipart/form-data",
    formMethod: "post",
    hiddenId: "7",
    logoHeight: 188,
    logoWidth: 260,
    menuSettingName: "pullRequest",
    saveTextAlign: "center",
    textareaHeight: 80,
    watchingCount: "5",
  });
});

test("project settings renders legacy old-place notice below the project name", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page, {
    project: {
      hasOldPlace: true,
      previous: {
        place: {
          description: "old-admin/old-sample",
        },
      },
    },
  });

  await page.goto(`${basePath}/admin/sample/setting`);

  const nameFieldWrap = page.locator("#project-name").locator("..");
  const oldPlaceNotice = nameFieldWrap.locator("div");
  await expect(oldPlaceNotice).toHaveText("This project was moved from old-admin/old-sample");
  await expect(oldPlaceNotice.locator("span")).toHaveText("old-admin/old-sample");
  await expect(oldPlaceNotice.locator("span")).toHaveAttribute("style", "color: red;");
  expect(
    await nameFieldWrap.evaluate((element) =>
      Array.from(element.childNodes).map((node) =>
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element).tagName.toLowerCase()
          : node.textContent,
      ),
    ),
  ).toEqual(["input", "div", "br"]);
});

test("project settings menu links preserve legacy hrefs with SPA transition", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectSettingsTabAnchorListeners", {
      configurable: true,
      value: [] as string[],
    });
    Element.prototype.addEventListener = function addEventListenerWithSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-page-wrap > .nav.nav-tabs a")) {
        (
          window as Window & typeof globalThis & { __projectSettingsTabAnchorListeners: string[] }
        ).__projectSettingsTabAnchorListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);
  const settingsTabs = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabs).toHaveCount(7);
  await expect(settingsTabs).toHaveText([
    "Settings",
    "Member",
    "Issue Label",
    "Webhooks",
    "Transfer",
    "Delete project",
    "Repository Type Change",
  ]);
  expect(
    await settingsTabs.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/admin/sample/setting`,
    `${basePath}/admin/sample/members`,
    `${basePath}/admin/sample/issue/labelsform`,
    `${basePath}/admin/sample/webhooks`,
    `${basePath}/admin/sample/transfer`,
    `${basePath}/admin/sample/deleteform`,
    `${basePath}/admin/sample/changeVCS`,
  ]);
  expect(
    await settingsTabs.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
  ]);
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator(".project-setting li")).toHaveClass("active");
  await expect(page.locator(".project-setting li.active a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  expect(
    await page.locator(".project-setting li.active a").evaluate((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      text: link.textContent?.trim(),
    })),
  ).toEqual({
    ariaCurrent: null,
    className: null,
    dataStatus: null,
    text: "Project configuration",
  });
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectSettingsTabAnchorListeners?: string[] })
          .__projectSettingsTabAnchorListeners ?? [],
    ),
  ).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const memberLink = page.locator("#subMenuProjectMember a");
  await memberLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectMember")).toHaveClass("active");
  await expect(page.locator(".members.project .member")).toHaveCount(2);
});

test("project settings project links render legacy hrefs and navigate through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-menu-gruop a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-setting li.active a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  await expect(page.locator('.cu-desc .ybtn[target="_blank"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?issueTemplate=true`,
  );
  await expect(page.locator("#subMenuIssueLabel a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(page.locator("#subMenuIssueLabel a")).not.toHaveAttribute(
    "href",
    `${basePath}/admin/sample/labels`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator(".project-menu-gruop a", { hasText: "Board" }).click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/admin/sample/posts`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project settings route source keeps internal navigation on Link", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/setting.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toMatch(/<a\b[^>]*href=\{?(?:prefixBasePath|projectHref)/);
  expect(source).not.toMatch(/<a\b[^>]*href=["']\/[^"']*["']/);
  expect(source).not.toMatch(/href=["'](?:#|javascript:)/);
  expect(source).not.toContain("as never");
  expect(source).not.toContain("search={(current) => current}");
  expect(source).not.toContain("/$ownerName/$projectName/labels");
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).toContain('target="_blank"');
});

test("project settings navbar search scope matches legacy projectLayout common navbar", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);

  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  const searchForm = page.locator('form[name="gnb-search-form"]');
  await expect(searchForm).toHaveAttribute("action", `${basePath}/admin/sample/search`);
  await expect(searchForm.locator('input[name="searchType"]')).toHaveValue("auto");
  await expect(searchForm.locator(".search-box")).toHaveClass("search-box select");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(
    page.locator('.gnb-search-form a[href="#"][data-toggle="search-scope"]'),
  ).toHaveCount(0);
  const scopeControls = page.locator(
    '.gnb-search-form button[type="button"][data-toggle="search-scope"]',
  );
  await expect(scopeControls).toHaveCount(2);
  await expect(scopeControls.nth(0)).toHaveText("This Project");
  await expect(scopeControls.nth(1)).toHaveText("All Projects");
  await expect(scopeControls.nth(0)).toHaveAttribute(
    "data-action",
    `${basePath}/admin/sample/search`,
  );
  await expect(scopeControls.nth(1)).toHaveAttribute("data-action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator(".gnb-search-form .btn-group")).toHaveClass("btn-group open");
  await expect(page.locator(".gnb-search-form .dropdown-menu")).toBeVisible();

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await scopeControls.nth(1).click();
  await expect(searchForm).toHaveAttribute("action", `${basePath}/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project settings header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectFavoriteSpanListeners", {
      configurable: true,
      value: [] as string[],
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteSpanAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-breadcrumb .user-project-list")) {
        (
          window as Window & typeof globalThis & { __projectFavoriteSpanListeners: string[] }
        ).__projectFavoriteSpanListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockProjectSettings(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).not.toHaveClass(/starred/);
  await expect(
    page.locator('.project-breadcrumb .user-project-list[data-project-id="7"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectFavoriteSpanListeners?: string[] })
          .__projectFavoriteSpanListeners ?? [],
    ),
  ).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).toHaveClass(/starred/);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectFavoriteSpanListeners?: string[] })
          .__projectFavoriteSpanListeners ?? [],
    ),
  ).toEqual([]);
});

test("project settings header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectSettings(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: {
      isFavorited: true,
    },
  });

  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).not.toHaveClass(/starred/);
});

test("project settings reviewer count radios mirror legacy show/hide behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);

  await expect(page.locator("#welReviewerCount")).toBeVisible();
  await page.locator("#reviewerCountDisable").check();
  await expect(page.locator("#welReviewerCount")).toBeHidden();
  await page.locator("#reviewerCountEnable").check();
  await expect(page.locator("#welReviewerCount")).toBeVisible();
});

test("project settings reviewer count dropdown uses route-local open state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.sessionStorage.setItem("__yonaSessionMarker", "kept");
  });

  const reviewerDropdown = page.locator(
    '.reviewer-count-wrap .btn-group.branches[data-id="project-reviewer-count"][data-name="defaultReviewerCount"]',
  );
  const toggle = reviewerDropdown.locator(
    'button.btn.dropdown-toggle.large[data-toggle="dropdown"]',
  );
  const options = reviewerDropdown.locator(".dropdown-menu li");

  await expect(reviewerDropdown).toHaveClass("btn-group branches");
  await expect(toggle.locator(".d-label")).toHaveText("2");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute("data-value", "1");
  await expect(options.nth(1)).toHaveAttribute("data-value", "2");
  await expect(options.nth(2)).toHaveAttribute("data-value", "3");
  await expect(reviewerDropdown.locator(".dropdown-menu button[type=button]")).toHaveText([
    "1",
    "2",
    "3",
  ]);
  await expect(reviewerDropdown.locator(".dropdown-menu a")).toHaveCount(0);
  await expect(reviewerDropdown.locator(".dropdown-menu button:not([type=button])")).toHaveCount(0);

  await toggle.click();
  await expect(reviewerDropdown).toHaveClass("btn-group branches open");
  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("__yonaSessionMarker")))
    .toBe("kept");

  await options.nth(2).locator("button").click();
  await expect(reviewerDropdown).toHaveClass("btn-group branches");
  await expect(toggle.locator(".d-label")).toHaveText("3");
  await expect(page.locator('input[name="defaultReviewerCount"]')).toHaveValue("3");
  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("__yonaSessionMarker")))
    .toBe("kept");
});

test("project settings menu checkboxes mirror legacy dependency behavior", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
  await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeHidden();
  await expect(page.locator("#reviewerCountDisable")).toBeChecked();
  await expect(page.locator("#welReviewerCount")).toBeHidden();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();

  await page.locator("#menuSettingPullRequest").uncheck();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
  await expect(page.locator("#reviewerCountDisable")).toBeChecked();

  await page.locator("#menuSettingReview").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
});

test("project settings save validates legacy project name rules before update", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockProjectSettings(page, { updateRequests });

  await page.goto(`${basePath}/admin/sample/setting`);

  await page.locator("#project-name").fill("sample!");
  const invalidNameDialog = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#save").click();
  await expect(invalidNameDialog).resolves.toBe(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  expect(updateRequests).toEqual([]);

  await page.locator("#project-name").fill(".git");
  const reservedNameDialog = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#save").click();
  await expect(reservedNameDialog).resolves.toBe("You can't use reserved names.");
  expect(updateRequests).toEqual([]);
});

test("project settings logo input validates image files and auto-submits like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const uploadRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockProjectSettings(page, { updateRequests, uploadRequests });

  await page.goto(`${basePath}/admin/sample/setting`);

  const dialogPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "not-image.txt",
  });
  await expect(dialogPromise).resolves.toBe("This is not an image file.");
  await expect(page.locator("#logoPath")).toHaveValue("");
  expect(uploadRequests).toEqual([]);
  expect(updateRequests).toEqual([]);

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/owners/admin/projects/sample") &&
      response.request().method() === "PATCH",
  );
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    mimeType: "image/png",
    name: "project-logo.png",
  });
  await updateResponsePromise;

  expect(uploadRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  expect(updateRequests).toHaveLength(1);
  expect(updateRequests[0]).toMatchObject({
    body: {
      logoAttachmentId: 42,
      overview: "Sample overview",
      projectName: "sample",
      projectScope: "PUBLIC",
    },
    hasCsrfToken: true,
    method: "PATCH",
  });
  await expect(page.locator("#logoPath")).toHaveValue("");
});

async function mockProjectSettings(
  page: Page,
  overrides: Partial<{
    favoriteResponseFavorited: boolean;
    favoriteRequests: { hasCsrfToken: boolean; method: string }[];
    project: Record<string, unknown>;
    updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[];
    uploadRequests: { hasCsrfToken: boolean; method: string }[];
  }> = {},
) {
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-settings" },
      body: JSON.stringify({
        session: {
          csrfToken: "csrf-settings",
          projection: {},
          userId: 1,
        },
        user: {
          emailAddress: "admin@example.com",
          id: 1,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...projectSettings(),
        ...overrides.project,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectContainer()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    overrides.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: overrides.favoriteResponseFavorited ?? true }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample", async (route) => {
    const request = route.request();
    if (request.method() !== "PATCH") {
      await route.fallback();
      return;
    }
    overrides.updateRequests?.push({
      body: request.postDataJSON() as Record<string, unknown>,
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...projectSettings(),
        logoUrl: "/files/42",
      }),
    });
  });
  await page.route("**/files", async (route) => {
    const request = route.request();
    overrides.uploadRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 42,
        mimeType: "image/png",
        name: "project-logo.png",
        size: 4,
        url: "/files/42",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/members", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrollmentRequests: [],
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            isOwner: true,
            loginId: "admin",
            role: "manager",
            userId: 1,
            userLabel: "Site Admin",
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            isOwner: false,
            loginId: "alice",
            role: "member",
            userId: 2,
            userLabel: "Alice Doe",
          },
        ],
        ownerName: "admin",
        projectName: "sample",
        roleOptions: [
          { label: "Manager", role: "manager" },
          { label: "Member", role: "member" },
        ],
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      }),
    });
  });
}

function projectSettings() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isUsingReviewerCount: true,
    logoUrl: "/assets/images/project_default_logo.png",
    maxReviewerCount: 3,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "",
    overview: "Sample overview",
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    watchCount: 5,
  };
}

function projectContainer() {
  return {
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
  };
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (isProjectSettingsMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
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

    function isProjectSettingsMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }
  });
}

async function projectHeaderMetrics(page: Page) {
  return page.evaluate(() => {
    const header = requireElement(".project-header-outer");
    const inner = requireElement(".project-header-inner");
    const wrap = requireElement(".project-header-wrap");
    const avatar = requireElement(".project-header-avatar");
    const menu = requireElement(".project-menu-outer");
    const headerRect = header.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      avatarHeight: Math.round(avatarRect.height),
      avatarTopOffsetFromHeaderBottom: Math.round(avatarRect.top - headerRect.bottom),
      avatarWidth: Math.round(avatarRect.width),
      headerHeight: Math.round(headerRect.height),
      headerInnerHeight: Math.round(innerRect.height),
      menuHeight: Math.round(menuRect.height),
      menuTopOffsetFromHeaderBottom: Math.round(menuRect.top - headerRect.bottom),
      wrapHeight: Math.round(wrapRect.height),
      wrapWidthRatio: Number((wrapRect.width / headerRect.width).toFixed(2)),
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

async function projectSettingMetrics(page: Page) {
  return page.evaluate(() => {
    const form = requireElement<HTMLFormElement>("#saveSetting");
    const bubble = requireElement(".bubble-wrap.gray");
    const logo = requireElement(".setting-box.left .logo-wrap");
    const textarea = requireElement("#project-desc");
    const saveWrap = requireElement(".box-wrap.bottom");
    const bubbleStyle = getComputedStyle(bubble);
    const textareaRect = textarea.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();

    return {
      bubbleBackground: bubbleStyle.backgroundColor,
      bubbleBorderRadius: bubbleStyle.borderTopLeftRadius,
      defaultBranchName: requireElement<HTMLSelectElement>("#project-default-branch").name,
      formAction: form.getAttribute("action"),
      formEnctype: form.getAttribute("enctype"),
      formMethod: form.getAttribute("method"),
      hiddenId: form.querySelector<HTMLInputElement>('input[name="id"]')?.value,
      logoHeight: Math.round(logoRect.height),
      logoWidth: Math.round(logoRect.width),
      menuSettingName: requireElement<HTMLInputElement>("#menuSettingPullRequest").name,
      saveTextAlign: getComputedStyle(saveWrap).textAlign,
      textareaHeight: Math.round(textareaRect.height),
      watchingCount: form.querySelector<HTMLInputElement>('input[name="watchingCount"]')?.value,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup;
    return Array.from(template.content.childNodes)
      .map((node) => visit(node))
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
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (isProjectSettingsMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
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

    function isProjectSettingsMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }
  }, html);
}
