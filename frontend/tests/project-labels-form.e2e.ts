import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const NEW_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#9e9e9e",
];
const EDIT_COLORS = [
  "#FF7770",
  "#F18CA7",
  "#FFB399",
  "#F1D55C",
  "#A5D870",
  "#32CDA1",
  "#9985D8",
  "#40A0EB",
  "#6BC4E9",
  "#DCBD98",
  "#8C8C9C",
  "#7A9CB4",
];
const EMPTY_LABELS_LIST =
  '<div id="labelsList" class="issue-label-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No label exists</p></div></div>';
const EMPTY_EDIT_LABEL_SELECT = '<select name="category.id"></select>';
const POPULATED_EDIT_LABEL_SELECT =
  '<select name="category.id"><option value="3">type</option><option value="4">priority</option></select>';
const POPULATED_LABELS_LIST = `
<div id="labelsList" class="issue-label-list-wrap">
  <div class="row-fluid list-head"><div class="span3 category"><strong>Category</strong></div><div class="span9 name"><strong>Name</strong></div></div>
  <div class="row-fluid list-item category-wrap" data-category="3" data-category-name="type">
    <div class="span3"><h5 class="right-txt mr20"><span class="category-name">type</span><p class="mt5"><i class="category-exclusive yobicon-tags multiple" data-html="true" title="In this category, you can choose<br>multiple labels"></i><button type="button" class="ybtn ybtn-mini" data-project-id="7" data-category-id="3" data-category-name="type" data-category-is-exclusive="false">Edit category</button></p></h5></div>
    <div class="span9"><table class="table nm"><tr data-label-id="8"><td><span class="issue-label active" data-label-id="8" data-label-name="bug">bug</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="type" data-label-id="8">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="3" data-label-name="bug" data-label-color="#e11d48">Edit</button></td></tr><tr data-label-id="9"><td><span class="issue-label active" data-label-id="9" data-label-name="feature">feature</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="type" data-label-id="9">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="3" data-label-name="feature" data-label-color="#3f51b5">Edit</button></td></tr></table></div>
  </div>
  <div class="row-fluid list-item category-wrap" data-category="4" data-category-name="priority">
    <div class="span3"><h5 class="right-txt mr20"><span class="category-name">priority</span><p class="mt5"><i class="category-exclusive yobicon-tag single" data-html="true" title="In this category, you can choose<br>only a single label"></i><button type="button" class="ybtn ybtn-mini" data-project-id="7" data-category-id="4" data-category-name="priority" data-category-is-exclusive="true">Edit category</button></p></h5></div>
    <div class="span9"><table class="table nm"><tr data-label-id="10"><td><span class="issue-label active" data-label-id="10" data-label-name="high">high</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="priority" data-label-id="10">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="4" data-label-name="high" data-label-color="#ff9800">Edit</button></td></tr></table></div>
  </div>
  <link rel="stylesheet" type="text/css" href="__BASE_PATH__/admin/sample/issue/labels.css">
</div>`;

const EXPECTED_PROJECT_LABELS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" id="gnb-search-scope-title" type="button">This Project</button><ul class="dropdown-menu flat right"><li><button data-action="__BASE_PATH__/admin/sample/search" data-toggle="search-scope" type="button">This Project</button></li><li><button data-action="__BASE_PATH__/search" data-toggle="search-scope" type="button">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" data-placement="bottom" title="Site administration"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap label-editor-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class="active"><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="copyLabel" action="__BASE_PATH__/admin/sample/copyLabels" method="post" class="new-label-wrap"><strong class="form-legend">Copy all labels from a project and append to current project</strong><div class="form-wrap"><input type="text" name="owner" class="input-label mr5" placeholder="Owner Name"><input type="text" name="projectName" class="input-label" placeholder="Project name"></div><button type="submit" class="ybtn ybtn-info btn-submit">Copy labels</button><div>If project path is 'naver/yobi', then owner name is 'naver' and project name is 'yobi'. Character case is ignored.</div><div>If there is already a label with the same name, category and color, another label will not be added.</div></form><form id="frmNewLabel" action="__BASE_PATH__/admin/sample/issue/labels" method="post" class="new-label-wrap"><strong class="form-legend">Add new label</strong><div class="form-wrap"><div><input type="text" name="category" class="input-label mr5" maxlength="250" data-provider="typeahead" autocomplete="off" placeholder="Category"><input type="text" name="name" class="input-label" maxlength="250" autocomplete="off" placeholder="Name"></div><div class="label-preset-colors">__NEW_COLORS__<input type="text" name="color" class="input-small input-label-color" placeholder="Label Color"></div></div><button type="submit" class="ybtn ybtn-primary btn-submit">Add label</button></form><div id="labelsList" class="issue-label-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No label exists</p></div></div></div></div>
<div id="editCategory" class="modal hide yobiDialog" tabindex="-1" role="dialog" aria-hidden="true"><div class="btn-dismiss"><button type="button" class="btn-transparent">×</button></div><div class="message edit-label-category-form"><div class="center-txt"><input type="text" name="name" class="text category-name" placeholder="Category"><div class="desc">In this category, you can choose<select name="isExclusive" data-dropdown-css-class="select2-without-searchbox"><option value="false">multiple labels</option><option value="true">only a single label</option></select></div></div><div class="center-txt buttons mt20 mb20"><button type="button" class="ybtn ybtn-info btnSubmit">Save</button><button type="button" class="ybtn ybtn-default">Cancel</button></div></div></div>
<div id="editLabel" class="modal hide yobiDialog" tabindex="-1" role="dialog" aria-hidden="true"><div class="btn-dismiss"><button type="button" class="btn-transparent">×</button></div><div class="message edit-label-form"><div class="center-txt"><select name="category.id"></select><input type="text" name="name" class="text input-label-name" maxlength="250" placeholder="Name"><div class="label-preset-colors edit">__EDIT_COLORS__<input type="text" name="color" class="input-small input-label-color" placeholder="Label Color"></div></div><div class="center-txt buttons mt20 mb20"><button type="button" class="ybtn ybtn-info btnSubmit">Save</button><button type="button" class="ybtn ybtn-default">Cancel</button></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project labels matches legacy project/issuelabels.scala.html empty DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#labelsList")).toContainText("No label exists");
  await expect(page.locator('#editCategory select[name="isExclusive"]')).not.toHaveAttribute(
    "data-toggle",
    "select2",
  );
  await expect(page.locator('#editCategory select[name="isExclusive"]')).toHaveAttribute(
    "data-dropdown-css-class",
    "select2-without-searchbox",
  );
  await expect(page.locator('#editLabel select[name="category.id"]')).not.toHaveAttribute(
    "data-toggle",
    "select2",
  );

  const expected = expectedProjectLabels(basePath);
  expect(await canonicalizeScreenRoots(page)).toEqual(await canonicalizeHtml(page, expected));
  await expect(labelFormMetrics(page)).resolves.toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    categoryInputWidth: "214px",
    colorInputWidth: "90px",
    colorRowMarginTop: "3px",
    copyFormMarginBottom: "30px",
    copyFormWidth: 1260,
    copyLegendDisplay: "block",
    copyLegendMarginBottom: "10px",
    copyOwnerHeight: "30px",
    copyOwnerWidth: "214px",
    copySubmitHeight: "30px",
    copySubmitPadding: "4px 12px",
    copyWrapMarginTop: "0px",
    editCategoryDisplay: "none",
    editCategoryWidth: "500px",
    editLabelDisplay: "none",
    editLabelWidth: "500px",
    emptyPadding: "100px 0px",
    labelsListMarginTop: "0px",
    newFormMarginBottom: "30px",
    newWrapMarginTop: "0px",
    pageWrapMinWidth: "1100px",
    presetColorHeight: "24px",
    presetColorWidth: "auto",
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
    tabsMarginBottom: "15px",
  });
});

test("project labels uses legacy project-scoped GNB search shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  await mockProjectLabels(page);

  await page.goto(labelsPageUrl);
  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator("#subMenuIssueLabel.active > a")).toBeVisible();

  const scopeButtons = page.locator('.gnb-search-form [data-toggle="search-scope"]');
  await expect(scopeButtons).toHaveText(["This Project", "All Projects"]);
  await expect(scopeButtons.nth(0)).toHaveAttribute(
    "data-action",
    `${basePath}/admin/sample/search`,
  );
  await expect(scopeButtons.nth(1)).toHaveAttribute("data-action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(labelsPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(0).click();
  await expect(page).toHaveURL(labelsPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );

  const metrics = await navbarSearchMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.input.left).toBeGreaterThanOrEqual(metrics!.searchBox.left);
  expect(metrics!.input.right).toBeLessThanOrEqual(metrics!.searchBox.right);
});

test("project labels renders legacy projectLayout browser title through React head", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  await expect(page).toHaveTitle("Label - admin/sample");
});

test("project labels exposes group search scope when project org data exists", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  await mockProjectLabels(page, [], { project: { isProtected: true, organizationName: "admin" } });

  await page.goto(labelsPageUrl);
  const scopeButtons = page.locator('.gnb-search-form [data-toggle="search-scope"]');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(scopeButtons.nth(1)).toHaveAttribute(
    "data-action",
    `${basePath}/organizations/admin/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(labelsPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
});

test("project labels route TSX has no route-local raw anchor elements", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
    "utf8",
  );
  expect(routeSource).toContain("<title>{legacyTitle}</title>");
  expect(routeSource).toContain(
    'const legacyTitle = `${t("label")} - ${ownerName}/${projectName}`;',
  );
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain("window.document");
  expect(routeSource).not.toMatch(/<a\b/);
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("search={undefined");
  expect(routeSource).not.toContain("__legacyInactive");
  expect(routeSource).not.toContain("LEGACY_INACTIVE_SEARCH");
  expect(routeSource).not.toContain("useLinkProps");
  expect(routeSource).not.toContain("onMouseDown=");
  expect(routeSource).not.toContain('createElement("a"');
  expect(routeSource).not.toContain("data-category-update-uri");
  expect(routeSource).not.toContain("data-delete-uri");
  expect(routeSource).not.toContain("data-update-uri");
  expect(routeSource).not.toMatch(/name="isExclusive"[\s\S]{0,120}data-toggle="select2"/);
  expect(routeSource).not.toMatch(/name="category\.id"[\s\S]{0,120}data-toggle="select2"/);
  expect(routeSource).not.toMatch(/category-exclusive[\s\S]{0,240}data-toggle="tooltip"/);
  expect(routeSource).toMatch(/category-exclusive[\s\S]{0,240}data-html="true"/);
  expect(routeSource).toMatch(
    /category-exclusive[\s\S]{0,240}title=\{`\$\{t\("label\.category\.option"\)\}<br>/,
  );
  expect(routeSource).toMatch(
    /name="isExclusive"[\s\S]{0,120}data-dropdown-css-class="select2-without-searchbox"/,
  );
  expect(routeSource).not.toMatch(/\bfunction\s+LegacyLink\b/);
  expect(routeSource).not.toMatch(/\bconst\s+LegacyLink\b/);
});

test("project labels member badges use enrolled users count instead of enrollment requests", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page, [], {
    project: {
      enrolledUsers: [{ id: 101 }, { id: 102 }],
      enrollmentRequestCount: 5,
    },
  });

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  await expect(page.locator(".project-setting .project-menu-count")).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveText("2");
  await expect(page.locator(".project-setting .project-menu-count")).not.toHaveText("5");
  await expect(page.locator("#subMenuProjectMember .num-badge")).not.toHaveText("5");
});

test("project labels internal links preserve legacy hrefs with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectLabelsInternalLinkNativeListenerAudit(page);
  await mockProjectLabels(page);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  const headerLinks = page.locator(".project-header-outer a");
  await expect(headerLinks).toHaveCount(2);
  await expect(headerLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin`);
  await expect(headerLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample`);

  const projectMenuLinks = page.locator(".project-menu-outer a");
  await expect(projectMenuLinks).toHaveCount(8);
  expect(await hrefs(page, ".project-menu-outer a")).toEqual([
    `${basePath}/admin/sample`,
    `${basePath}/admin/sample/code`,
    `${basePath}/admin/sample/issues`,
    `${basePath}/admin/sample/pullRequests`,
    `${basePath}/admin/sample/reviews`,
    `${basePath}/admin/sample/milestones`,
    `${basePath}/admin/sample/posts`,
    `${basePath}/admin/sample/setting`,
  ]);

  const settingsTabs = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabs).toHaveCount(7);
  expect(await hrefs(page, ".project-page-wrap > .nav.nav-tabs a")).toEqual([
    `${basePath}/admin/sample/setting`,
    `${basePath}/admin/sample/members`,
    `${basePath}/admin/sample/issue/labelsform`,
    `${basePath}/admin/sample/webhooks`,
    `${basePath}/admin/sample/transfer`,
    `${basePath}/admin/sample/deleteform`,
    `${basePath}/admin/sample/changeVCS`,
  ]);
  const activeIssueLabelTab = page.locator("#subMenuIssueLabel.active > a");
  await expect(activeIssueLabelTab).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(activeIssueLabelTab).not.toHaveAttribute("class", /.+/);
  await expect(activeIssueLabelTab).not.toHaveAttribute("aria-current", /.+/);
  await expect(activeIssueLabelTab).not.toHaveAttribute("data-status", /.+/);
  await expect(page.locator(".project-header-outer a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".project-header-outer a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a[data-status]")).toHaveCount(0);
  await expect.poll(() => projectLabelsInternalLinkNativeListeners(page)).toEqual([]);

  const settingsLink = page.locator(".project-setting .project-menu-nav a");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("project labels category option icon drops route-local tooltip marker only", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page, [
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#e11d48",
      id: "8",
      name: "bug",
    },
    {
      category: "priority",
      categoryId: "4",
      categoryIsExclusive: true,
      color: "#ff9800",
      id: "10",
      name: "high",
    },
  ]);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  const multipleIcon = page.locator(
    '#labelsList .category-wrap[data-category-name="type"] .category-exclusive',
  );
  await expect(multipleIcon).toHaveClass("category-exclusive yobicon-tags multiple");
  await expect(multipleIcon).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(multipleIcon).toHaveAttribute("data-html", "true");
  await expect(multipleIcon).not.toHaveAttribute("data-placement", /.*/);
  await expect(multipleIcon).toHaveAttribute(
    "title",
    "In this category, you can choose<br>multiple labels",
  );

  const singleIcon = page.locator(
    '#labelsList .category-wrap[data-category-name="priority"] .category-exclusive',
  );
  await expect(singleIcon).toHaveClass("category-exclusive yobicon-tag single");
  await expect(singleIcon).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(singleIcon).toHaveAttribute(
    "title",
    "In this category, you can choose<br>only a single label",
  );
});

test("project labels renders legacy project/partial_issuelabels_list.scala.html populated list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page, [
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#e11d48",
      id: "8",
      name: "bug",
    },
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#3f51b5",
      id: "9",
      name: "feature",
    },
    {
      category: "priority",
      categoryId: "4",
      categoryIsExclusive: true,
      color: "#ff9800",
      id: "10",
      name: "high",
    },
  ]);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await expect(page.locator("#labelsList .category-wrap")).toHaveCount(2);
  await expect(page.locator('#labelsList tr[data-label-id="9"]')).toContainText("feature");
  await expect(page.locator("#labelsList [data-category-update-uri]")).toHaveCount(0);
  await expect(page.locator("#labelsList [data-delete-uri]")).toHaveCount(0);
  await expect(page.locator("#labelsList [data-update-uri]")).toHaveCount(0);

  expect(await canonicalizeElement(page, "#labelsList")).toEqual(
    await canonicalizeHtml(page, POPULATED_LABELS_LIST.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await canonicalizeElement(page, '#editLabel select[name="category.id"]')).toEqual(
    await canonicalizeHtml(page, POPULATED_EDIT_LABEL_SELECT),
  );

  await expect(labelListMetrics(page)).resolves.toMatchObject({
    categoryEditCategoryId: "3",
    categoryEditCategoryName: "type",
    categoryEditIsExclusive: "false",
    categoryEditProjectId: "7",
    categoryEditUri: null,
    categoryHeaderAlign: "right",
    categoryId: "3",
    categoryName: "type",
    deleteCategoryName: "type",
    deleteLabelId: "8",
    deleteUri: null,
    exclusiveClass: "category-exclusive yobicon-tags multiple",
    exclusiveDataHtml: "true",
    exclusivePlacement: null,
    exclusiveTitle: "In this category, you can choose<br>multiple labels",
    exclusiveToggle: null,
    labelColor: "#e11d48",
    labelHeadBackground: "rgb(250, 250, 250)",
    labelId: "8",
    labelListBorderTopWidth: "2px",
    labelName: "bug",
    updateCategoryId: "3",
    updateLabelColor: "#e11d48",
    updateLabelName: "bug",
    updateUri: null,
  });
});

test("project labels renders read-only label management state from legacy permission gates", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#3f51b5",
        id: "9",
        name: "feature",
      },
      {
        category: "priority",
        categoryId: "4",
        categoryIsExclusive: true,
        color: "#ff9800",
        id: "10",
        name: "high",
      },
    ],
    {
      project: {
        viewerCanCreateIssueLabel: false,
        viewerCanDeleteIssueLabel: false,
        viewerCanManageIssueLabels: false,
        viewerCanUpdate: true,
        viewerCanUpdateIssueLabel: false,
      },
    },
  );

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  await expect(page.locator(".project-setting .project-menu-nav li.active")).toBeVisible();
  await expect(page.locator("#subMenuIssueLabel.active > a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(page.locator("#copyLabel")).toHaveCount(0);
  await expect(page.locator("#frmNewLabel")).toHaveCount(0);
  await expect(page.locator("#labelsList .list-head")).toBeVisible();
  await expect(page.locator("#labelsList .category-wrap")).toHaveCount(2);
  await expect(page.locator("#labelsList .category-name")).toHaveText(["type", "priority"]);
  await expect(page.locator("#labelsList .issue-label.active")).toHaveText([
    "bug",
    "feature",
    "high",
  ]);
  await expect(page.locator("#labelsList button[data-category-update-uri]")).toHaveCount(0);
  await expect(page.locator("#labelsList button[data-delete-uri]")).toHaveCount(0);
  await expect(page.locator("#labelsList button[data-update-uri]")).toHaveCount(0);
  await expect(
    page.locator('#labelsList link[href$="/admin/sample/issue/labels.css"]'),
  ).toHaveCount(1);
  await expect(page.locator("#editCategory")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#editLabel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('#editLabel select[name="category.id"] option')).toHaveText([
    "type",
    "priority",
  ]);

  const metrics = await readOnlyLabelManagementMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.tabs.bottom).toBeLessThanOrEqual(metrics!.listHead.top);
  expect(metrics!.firstCategory.top).toBeGreaterThanOrEqual(metrics!.listHead.bottom);
  expect(metrics!.firstLabel.left).toBeGreaterThanOrEqual(metrics!.firstCategory.left);
  expect(metrics!.firstLabel.right).toBeLessThanOrEqual(metrics!.pageWrap.right);
  expect(metrics!.actionsCellWidth).toBeGreaterThanOrEqual(140);
  expect(metrics!.categoryHeaderAlign).toBe("right");
  expect(metrics!.listHeadBackground).toBe("rgb(250, 250, 250)");
});

test("project labels new-category confirm modal preserves legacy option semantics", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  const labelRequests: { body: unknown; method: string; url: string }[] = [];
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
      {
        category: "priority",
        categoryId: "4",
        categoryIsExclusive: true,
        color: "#ff9800",
        id: "10",
        name: "high",
      },
    ],
    { labelRequests },
  );
  await page.goto(labelsPageUrl);
  await rememberSpaMarker(page, "project-labels-new-category-confirm");

  await page.fill('#frmNewLabel input[name="category"]', "needs-triage");
  await page.locator('#frmNewLabel input[name="name"]').focus();
  await expect(page.locator("#frmNewLabel .label-preset-colors")).toBeVisible();
  await page.locator("#frmNewLabel .btn-preset-color").nth(3).click();
  await expect(page.locator('#frmNewLabel input[name="color"]')).toHaveValue("#3f51b5");
  await page.fill('#frmNewLabel input[name="name"]', "feature");

  await page.locator("#frmNewLabel").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("missing form");
    form.requestSubmit();
  });
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-new-category-confirm");
  await expect(page.locator("#newCategoryConfirm")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#newCategoryConfirm")).toHaveClass("modal in yobiDialog");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator("#newCategoryConfirm .message .msg")).toContainText(
    "needs-triage is a new category.",
  );
  await expect(page.locator("#newCategoryConfirm .message .msg")).toContainText(
    "In this category, you can choose",
  );
  await expect(
    page.locator("#newCategoryConfirm .center-txt.buttons .confirm-button-vertical"),
  ).toHaveText(["multiple labels", "only a single label"]);
  expect(labelRequests).toHaveLength(0);

  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(
      page.locator("#newCategoryConfirm .btn-dismiss .btn-transparent"),
    ),
  ).toBe(false);
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-new-category-confirm");
  await expect(page.locator("#newCategoryConfirm")).toHaveCount(0);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  expect(labelRequests).toHaveLength(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await page.locator("#frmNewLabel").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("missing form");
    form.requestSubmit();
  });
  await expect(page.locator("#newCategoryConfirm")).toHaveAttribute("aria-hidden", "false");
  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(
      page.locator("#newCategoryConfirm .center-txt.buttons .confirm-button-vertical").first(),
    ),
  ).toBe(false);
  await expect.poll(() => labelRequests.length).toBe(1);
  expect(labelRequests[0]).toMatchObject({
    body: {
      categoryIsExclusive: false,
      categoryName: "needs-triage",
      labelColor: "#3f51b5",
      labelName: "feature",
    },
    method: "POST",
  });
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-new-category-confirm");
  await expect(page.locator("#newCategoryConfirm")).toHaveCount(0);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await page.fill('#frmNewLabel input[name="category"]', "severity");
  await page.fill('#frmNewLabel input[name="name"]', "critical");
  await page.locator("#frmNewLabel").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("missing form");
    form.requestSubmit();
  });
  await expect(page.locator("#newCategoryConfirm")).toHaveAttribute("aria-hidden", "false");
  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(
      page.locator("#newCategoryConfirm .center-txt.buttons .confirm-button-vertical").nth(1),
    ),
  ).toBe(false);
  await expect.poll(() => labelRequests.length).toBe(2);
  expect(labelRequests[1]).toMatchObject({
    body: {
      categoryIsExclusive: true,
      categoryName: "severity",
      labelColor: "#3f51b5",
      labelName: "critical",
    },
    method: "POST",
  });
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-new-category-confirm");
  await expect(page.locator("#newCategoryConfirm")).toHaveCount(0);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);
});

test("project labels category typeahead suggests rendered categories and suppresses Enter submit", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  const labelRequests: { body: unknown; method: string; url: string }[] = [];
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
      {
        category: "priority",
        categoryId: "4",
        categoryIsExclusive: true,
        color: "#ff9800",
        id: "10",
        name: "high",
      },
    ],
    { labelRequests },
  );

  await page.goto(labelsPageUrl);
  await rememberSpaMarker(page, "project-labels-category-typeahead");

  const categoryInput = page.locator('#frmNewLabel input[name="category"]');
  const typeahead = page.locator("#frmNewLabel .typeahead.dropdown-menu");

  await categoryInput.fill("t");
  await expect(typeahead).toBeVisible();
  await expect(typeahead.locator("li")).toHaveCount(2);
  await expect(typeahead.locator("a")).toHaveCount(0);
  await expect(typeahead.locator("button")).toHaveText(["type", "priority"]);
  await expect(typeahead.locator("button").first()).toHaveAttribute("type", "button");
  await expect(typeahead.locator('li[data-value="type"]')).toHaveClass(/active/u);
  await expect(typeahead.locator('li[data-value="type"] strong')).toHaveText("t");
  await expect(typeahead.locator('li[data-value="priority"] strong')).toHaveText("t");

  const typeaheadMetrics = await categoryTypeaheadMetrics(page);
  expect(typeaheadMetrics).not.toBeNull();
  expect(typeaheadMetrics!.menu.left).toBeCloseTo(typeaheadMetrics!.input.left, 0);
  expect(typeaheadMetrics!.menu.top).toBeGreaterThanOrEqual(typeaheadMetrics!.input.bottom - 1);
  expect(typeaheadMetrics!.menu.top).toBeLessThanOrEqual(typeaheadMetrics!.input.bottom + 6);
  expect(typeaheadMetrics!.menu.width).toBeGreaterThanOrEqual(typeaheadMetrics!.input.width);

  await categoryInput.press("ArrowDown");
  await expect(typeahead.locator('li[data-value="priority"]')).toHaveClass(/active/u);
  await categoryInput.press("Enter");

  await expect(categoryInput).toHaveValue("priority");
  await expect(typeahead).toHaveCount(0);
  expect(labelRequests).toHaveLength(0);
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-category-typeahead");

  await categoryInput.fill("needs-triage");
  await expect(typeahead).toHaveCount(0);
  await categoryInput.press("Enter");

  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-category-typeahead");
  await expect(page.locator("#newCategoryConfirm")).toHaveCount(0);
  expect(labelRequests).toHaveLength(0);

  await categoryInput.fill("p");
  await expect(typeahead).toBeVisible();
  await categoryInput.press("Enter");
  await expect(categoryInput).toHaveValue("priority");
  await page.locator('#frmNewLabel input[name="name"]').focus();
  await expect(page.locator('#frmNewLabel input[name="color"]')).toHaveValue("#ff9800");
  await page.fill('#frmNewLabel input[name="name"]', "urgent");
  await expect(newLabelFormData(page)).resolves.toEqual({
    category: "priority",
    color: "#ff9800",
    name: "urgent",
  });
  await page.locator("#frmNewLabel").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("missing form");
    form.requestSubmit();
  });
  await expect.poll(() => labelRequests.length).toBe(1);
  expect(labelRequests[0]).toMatchObject({
    body: {
      categoryName: "priority",
      labelColor: "#ff9800",
      labelName: "urgent",
    },
    method: "POST",
  });
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-category-typeahead");
});

test("project labels new-label color field refines state and submits form value", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  const labelRequests: { body: unknown; method: string; url: string }[] = [];
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
    ],
    { labelRequests },
  );

  await page.goto(labelsPageUrl);
  await rememberSpaMarker(page, "project-labels-new-label-color-state");

  await page.fill('#frmNewLabel input[name="category"]', "type");
  await page.locator('#frmNewLabel input[name="name"]').focus();
  await expect(page.locator("#frmNewLabel .label-preset-colors")).toBeVisible();
  await expect(page.locator('#frmNewLabel input[name="color"]')).toHaveValue("#e11d48");
  await page.locator("#frmNewLabel .btn-preset-color").nth(4).click();
  await expect(page.locator('#frmNewLabel input[name="color"]')).toHaveValue("#2196f3");
  await page.fill('#frmNewLabel input[name="color"]', "rgb(255, 87, 34)");
  await page.locator('#frmNewLabel input[name="color"]').blur();
  await expect(page.locator('#frmNewLabel input[name="color"]')).toHaveValue("#ff5722");
  await page.fill('#frmNewLabel input[name="name"]', "regression");
  await expect(newLabelFormData(page)).resolves.toEqual({
    category: "type",
    color: "#ff5722",
    name: "regression",
  });

  await page.locator("#frmNewLabel").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("missing form");
    form.requestSubmit();
  });
  await expect.poll(() => labelRequests.length).toBe(1);
  expect(labelRequests[0]).toMatchObject({
    body: {
      categoryName: "type",
      labelColor: "#ff5722",
      labelName: "regression",
    },
    method: "POST",
  });
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-new-label-color-state");
});

test("project labels edit modals submit through route mutations", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelRequests: { body: unknown; method: string; url: string }[] = [];
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
      {
        category: "priority",
        categoryId: "4",
        categoryIsExclusive: true,
        color: "#ff9800",
        id: "10",
        name: "high",
      },
    ],
    { labelRequests },
  );

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await labelEditButton(page, "8", "bug").click();
  await expect(page.locator("#editLabel")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator('#editLabel select[name="category.id"]')).not.toHaveAttribute(
    "data-toggle",
    "select2",
  );
  await expect(page.locator('#editLabel input[name="name"]')).toHaveValue("bug");
  await page.fill('#editLabel input[name="name"]', "bugfix");
  await page.locator("#editLabel .btn-preset-color").nth(1).click();
  await page.locator("#editLabel .btnSubmit").click();
  await expect.poll(() => labelRequests.length).toBe(1);
  expect(labelRequests[0]).toMatchObject({
    body: { categoryId: 3, labelColor: "#f18ca7", labelName: "bugfix" },
    method: "PATCH",
  });
  expect(labelRequests[0].url).toContain("/api/v1/owners/admin/projects/sample/labels/8");

  await categoryEditButton(page, "4", "priority").click();
  await expect(page.locator("#editCategory")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator('#editCategory select[name="isExclusive"]')).not.toHaveAttribute(
    "data-toggle",
    "select2",
  );
  await expect(page.locator('#editCategory select[name="isExclusive"]')).toHaveAttribute(
    "data-dropdown-css-class",
    "select2-without-searchbox",
  );
  await expect(page.locator('#editCategory input[name="name"]')).toHaveValue("priority");
  await page.fill('#editCategory input[name="name"]', "severity");
  await page.selectOption('#editCategory select[name="isExclusive"]', "false");
  await page.locator("#editCategory .btnSubmit").click();
  await expect.poll(() => labelRequests.length).toBe(2);
  expect(labelRequests[1]).toMatchObject({
    body: { categoryIsExclusive: false, categoryName: "severity" },
    method: "PATCH",
  });
  expect(labelRequests[1].url).toContain(
    "/api/v1/owners/admin/projects/sample/labels/categories/4",
  );
});

test("project labels delete confirm modal preserves legacy dismiss and accept flow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  const labelRequests: { body: unknown; method: string; url: string }[] = [];
  await mockProjectLabels(
    page,
    [
      {
        category: "type",
        categoryId: "3",
        categoryIsExclusive: false,
        color: "#e11d48",
        id: "8",
        name: "bug",
      },
      {
        category: "priority",
        categoryId: "4",
        categoryIsExclusive: true,
        color: "#ff9800",
        id: "10",
        name: "high",
      },
    ],
    { labelRequests },
  );

  await page.goto(labelsPageUrl);
  await rememberSpaMarker(page, "project-labels-delete-confirm");

  await armProjectLabelsModalBridgeTrap(page);
  await labelDeleteButton(page, "10", "priority").click();
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-delete-confirm");
  await expect(page.locator("#deleteLabelConfirm")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#deleteLabelConfirm")).toHaveClass("modal in yobiDialog");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator("#deleteLabelConfirm .message .msg")).toContainText(
    "Once you delete this label",
  );
  await expect(page.locator("#deleteLabelConfirm .center-txt.buttons .ybtn")).toHaveText([
    "Cancel",
    "Confirm",
  ]);
  expect(labelRequests).toHaveLength(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(
      page.locator("#deleteLabelConfirm .center-txt.buttons .ybtn").first(),
    ),
  ).toBe(false);
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-delete-confirm");
  await expect(page.locator("#deleteLabelConfirm")).toHaveCount(0);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  expect(labelRequests).toHaveLength(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await labelDeleteButton(page, "10", "priority").click();
  await expect(page.locator("#deleteLabelConfirm")).toHaveAttribute("aria-hidden", "false");
  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(
      page.locator("#deleteLabelConfirm .center-txt.buttons .ybtn").nth(1),
    ),
  ).toBe(false);
  await expect.poll(() => labelRequests.length).toBe(1);
  expect(labelRequests[0]).toMatchObject({ body: null, method: "DELETE" });
  expect(labelRequests[0].url).toContain("/api/v1/owners/admin/projects/sample/labels/10");
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-delete-confirm");
  await expect(page.locator("#deleteLabelConfirm")).toHaveCount(0);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);
});

test("project labels edit modals open and dismiss through route state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const labelsPageUrl = `${basePath}/admin/sample/issue/labelsform`;
  await mockProjectLabels(page, [
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#e11d48",
      id: "8",
      name: "bug",
    },
    {
      category: "priority",
      categoryId: "4",
      categoryIsExclusive: true,
      color: "#ff9800",
      id: "10",
      name: "high",
    },
  ]);

  await page.goto(labelsPageUrl);
  await rememberSpaMarker(page, "project-labels-edit-modals");

  await armProjectLabelsModalBridgeTrap(page);
  await categoryEditButton(page, "4", "priority").click();
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-edit-modals");
  await expect(page.locator("#editCategory")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#editCategory")).toHaveClass("modal in yobiDialog");
  await expect(page.locator("#editCategory")).not.toHaveClass(/hide/u);
  await expect(page.locator('#editCategory input[name="name"]')).toHaveValue("priority");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await armProjectLabelsModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(page.locator("#editCategory .btn-dismiss .btn-transparent")),
  ).toBe(false);
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-edit-modals");
  await expect(page.locator("#editCategory")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#editCategory")).toHaveClass(/hide/u);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await armProjectLabelsModalBridgeTrap(page);
  await labelEditButton(page, "8", "bug").click();
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-edit-modals");
  await expect(page.locator("#editLabel")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#editLabel")).toHaveClass("modal in yobiDialog");
  await expect(page.locator("#editLabel")).not.toHaveClass(/hide/u);
  await expect(page.locator('#editLabel input[name="name"]')).toHaveValue("bug");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);

  await armProjectLabelsModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#editLabel .buttons .ybtn-default"))).toBe(
    false,
  );
  await expect(page).toHaveURL(labelsPageUrl);
  expect(await spaMarker(page)).toBe("project-labels-edit-modals");
  await expect(page.locator("#editLabel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#editLabel")).toHaveClass(/hide/u);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(projectLabelsModalBridgeHits(page)).resolves.toEqual([]);
});

test("project labels modal source insulates delegated modal bridge and removes native confirm", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
    "utf8",
  );
  expect(routeSource).toContain("function enrolledUserCount");
  expect(routeSource).not.toContain("project.enrollmentRequestCount");
  expect(routeSource).toContain("function handleIssueLabelModalButtonClick");
  expect(routeSource).toContain("function dismissIssueLabelModalButtonClick");
  expect(routeSource).toContain("event.preventDefault();");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource).toContain('id="newCategoryConfirm"');
  expect(routeSource).toContain('id="deleteLabelConfirm"');
  expect(routeSource).toContain("confirm-button-vertical");
  expect(routeSource).not.toContain('data-dismiss="modal"');
  expect(routeSource).not.toContain("window.confirm");
  expect(routeSource).not.toContain('data-toggle="modal"');
  expect(routeSource).not.toContain('data-target="#editCategory"');
  expect(routeSource).not.toContain('data-target="#editLabel"');
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).not.toContain("document.");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("style.display");
});

test("project labels typeahead source stays React-owned and legacy-enter guarded", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
    "utf8",
  );
  expect(routeSource).toContain('data-provider="typeahead"');
  expect(routeSource).toContain('className="typeahead dropdown-menu"');
  expect(routeSource).toContain("value={categoryTypeaheadQuery}");
  expect(routeSource).toContain("value={newLabelColor}");
  expect(routeSource).toContain("setCategoryTypeaheadQuery(categoryName);");
  expect(routeSource).toContain("setNewLabelColor(refinedColor);");
  expect(routeSource).toContain('event.key === "Enter"');
  expect(routeSource).toContain('event.key === "ArrowDown"');
  expect(routeSource).toContain('event.key === "ArrowUp"');
  expect(routeSource).toContain("event.preventDefault();");
  expect(routeSource).not.toContain("newLabelCategoryInputRef.current.value");
  expect(routeSource).not.toContain("newLabelColorInputRef.current.value");
  expect(routeSource).not.toContain("querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain(".typeahead(");
  expect(routeSource).not.toContain('data("typeahead")');
  expect(routeSource).not.toContain("document.location.reload");
});

test("project labels header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectLabels(page, [], { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");

  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).not.toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project labels header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectLabels(page, [], {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project labels header favorite star has no route-local native listener", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectLabels(page);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function installFavoriteSpanNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const favoriteListeners: string[] = [];
    Object.defineProperty(window, "__yonaFavoriteSpanNativeListeners", {
      configurable: true,
      value: favoriteListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-breadcrumb .user-project-list")) {
        favoriteListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

function categoryEditButton(page: Page, categoryId: string, categoryName: string) {
  return page.locator(
    `#labelsList .category-wrap[data-category="${categoryId}"][data-category-name="${categoryName}"] button.ybtn-mini[data-category-id="${categoryId}"][data-category-name="${categoryName}"]`,
  );
}

function labelDeleteButton(page: Page, labelId: string, categoryName: string) {
  return page.locator(
    `#labelsList tr[data-label-id="${labelId}"] td.actions button.ybtn-danger.ybtn-small[data-label-id="${labelId}"][data-category-name="${categoryName}"]`,
  );
}

function labelEditButton(page: Page, labelId: string, labelName: string) {
  return page.locator(
    `#labelsList tr[data-label-id="${labelId}"] td.actions button.ybtn-small[data-label-name="${labelName}"][data-label-color]`,
  );
}

async function installProjectLabelsInternalLinkNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const internalLinkListeners: string[] = [];
    Object.defineProperty(window, "__yonaProjectLabelsInternalLinkNativeListeners", {
      configurable: true,
      value: internalLinkListeners,
    });
    Element.prototype.addEventListener =
      function addEventListenerWithProjectLabelsInternalLinkAudit(type, listener, options) {
        if (
          this instanceof Element &&
          this.matches(
            ".project-header-outer a, .project-menu-outer a, .project-page-wrap > .nav.nav-tabs a",
          )
        ) {
          internalLinkListeners.push(`${this.getAttribute("href") ?? ""}:${String(type)}`);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
  });
}

async function projectLabelsInternalLinkNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __yonaProjectLabelsInternalLinkNativeListeners?: string[] }
      ).__yonaProjectLabelsInternalLinkNativeListeners ?? [],
  );
}

async function hrefs(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

async function favoriteSpanNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaFavoriteSpanNativeListeners?: string[] })
        .__yonaFavoriteSpanNativeListeners ?? [],
  );
}

async function armProjectLabelsModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __yonaProjectLabelsModalBridgeHits?: string[];
        __yonaProjectLabelsModalBridgeTrapArmed?: boolean;
      };
    win.__yonaProjectLabelsModalBridgeHits = [];
    if (win.__yonaProjectLabelsModalBridgeTrapArmed) {
      return;
    }
    win.__yonaProjectLabelsModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest(
        '[data-toggle="modal"], [data-dismiss="modal"], .modal .btn-dismiss .btn-transparent, .modal .buttons .ybtn',
      );
      if (bridged) {
        win.__yonaProjectLabelsModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function projectLabelsModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __yonaProjectLabelsModalBridgeHits?: string[];
          }
      ).__yonaProjectLabelsModalBridgeHits ?? [],
  );
}

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((value) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = value;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function newLabelFormData(page: Page) {
  return page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>("#frmNewLabel");
    if (!form) {
      throw new Error("missing #frmNewLabel");
    }
    const formData = new FormData(form);
    return {
      category: String(formData.get("category") ?? ""),
      color: String(formData.get("color") ?? ""),
      name: String(formData.get("name") ?? ""),
    };
  });
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

async function mockProjectLabels(
  page: Page,
  labels: unknown[] = [],
  overrides: {
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    labelRequests?: { body: unknown; method: string; url: string }[];
    project?: Partial<ReturnType<typeof projectSettings>>;
  } = {},
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
      headers: { "x-csrf-token": "csrf-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectSettings(), ...overrides.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      overrides.labelRequests?.push({
        body: request.postData() ? request.postDataJSON() : null,
        method: request.method(),
        url: request.url(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels, ownerName: "admin", projectName: "sample" }),
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
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    overrides.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-labels",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: overrides.favoriteResponseFavorited ?? true }),
    });
  });
}

function expectedProjectLabels(basePath: string) {
  return EXPECTED_PROJECT_LABELS.replaceAll("__BASE_PATH__", basePath)
    .replace("__NEW_COLORS__", colorButtons(NEW_COLORS))
    .replace("__EDIT_COLORS__", colorButtons(EDIT_COLORS));
}

function colorButtons(colors: string[]) {
  return colors
    .map(
      (color) =>
        `<button type="button" class="issue-label btn-preset-color" style="background-color:${color};"></button>`,
    )
    .join("");
}

async function labelListMetrics(page: Page) {
  return page.evaluate(() => {
    const listHead = document.querySelector("#labelsList .list-head");
    const categoryHead = document.querySelector("#labelsList .list-head .category");
    const firstCategory = document.querySelector("#labelsList .category-wrap");
    const exclusiveIcon = firstCategory?.querySelector(".category-exclusive");
    const categoryEdit = firstCategory?.querySelector("button.ybtn-mini[data-category-id]");
    const firstLabel = firstCategory?.querySelector("tr[data-label-id] .issue-label");
    const deleteButton = firstCategory?.querySelector("button.ybtn-danger.ybtn-small");
    const editButton = firstCategory?.querySelector(
      "button.ybtn-small[data-category-id][data-label-name][data-label-color]:not(.ybtn-danger)",
    );
    const listStyle = listHead ? getComputedStyle(listHead) : null;
    const categoryStyle = categoryHead ? getComputedStyle(categoryHead) : null;
    return {
      categoryEditCategoryId: categoryEdit?.getAttribute("data-category-id"),
      categoryEditCategoryName: categoryEdit?.getAttribute("data-category-name"),
      categoryEditIsExclusive: categoryEdit?.getAttribute("data-category-is-exclusive"),
      categoryEditProjectId: categoryEdit?.getAttribute("data-project-id"),
      categoryEditUri: categoryEdit?.getAttribute("data-category-update-uri"),
      categoryHeaderAlign: categoryStyle?.textAlign,
      categoryId: firstCategory?.getAttribute("data-category"),
      categoryName: firstCategory?.getAttribute("data-category-name"),
      deleteCategoryName: deleteButton?.getAttribute("data-category-name"),
      deleteLabelId: deleteButton?.getAttribute("data-label-id"),
      deleteUri: deleteButton?.getAttribute("data-delete-uri"),
      exclusiveClass: exclusiveIcon?.getAttribute("class"),
      exclusiveDataHtml: exclusiveIcon?.getAttribute("data-html"),
      exclusivePlacement: exclusiveIcon?.getAttribute("data-placement"),
      exclusiveTitle: exclusiveIcon?.getAttribute("title"),
      exclusiveToggle: exclusiveIcon?.getAttribute("data-toggle"),
      labelColor: editButton?.getAttribute("data-label-color"),
      labelHeadBackground: listStyle?.backgroundColor,
      labelId: firstLabel?.getAttribute("data-label-id"),
      labelListBorderTopWidth: listStyle?.borderTopWidth,
      labelName: firstLabel?.getAttribute("data-label-name"),
      updateCategoryId: editButton?.getAttribute("data-category-id"),
      updateLabelColor: editButton?.getAttribute("data-label-color"),
      updateLabelName: editButton?.getAttribute("data-label-name"),
      updateUri: editButton?.getAttribute("data-update-uri"),
    };
  });
}

async function readOnlyLabelManagementMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = document.querySelector<HTMLElement>(".project-page-wrap.label-editor-wrap");
    const tabs = document.querySelector<HTMLElement>(".project-page-wrap > .nav.nav-tabs");
    const listHead = document.querySelector<HTMLElement>("#labelsList .list-head");
    const categoryHead = document.querySelector<HTMLElement>("#labelsList .list-head .category");
    const firstCategory = document.querySelector<HTMLElement>("#labelsList .category-wrap");
    const firstLabel = document.querySelector<HTMLElement>(
      "#labelsList tr[data-label-id] .issue-label",
    );
    const actionsCell = document.querySelector<HTMLElement>("#labelsList td.actions");
    if (!pageWrap || !tabs || !listHead || !categoryHead || !firstCategory || !firstLabel) {
      return null;
    }
    return {
      actionsCellWidth: actionsCell ? Math.round(actionsCell.getBoundingClientRect().width) : 0,
      categoryHeaderAlign: getComputedStyle(categoryHead).textAlign,
      firstCategory: rect(firstCategory),
      firstLabel: rect(firstLabel),
      listHead: rect(listHead),
      listHeadBackground: getComputedStyle(listHead).backgroundColor,
      pageWrap: rect(pageWrap),
      tabs: rect(tabs),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function categoryTypeaheadMetrics(page: Page) {
  return page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#frmNewLabel input[name="category"]');
    const menu = document.querySelector<HTMLElement>("#frmNewLabel .typeahead.dropdown-menu");
    if (!input || !menu) {
      return null;
    }
    return {
      input: input.getBoundingClientRect(),
      menu: menu.getBoundingClientRect(),
    };
  });
}

async function navbarSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>(".gnb-outer.project-header");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>(".gnb-search-form .search-box.select");
    const input = document.querySelector<HTMLElement>('.gnb-search-form input[name="keyword"]');
    if (!navbar || !form || !scope || !searchBox || !input) {
      return null;
    }
    return {
      form: rect(form),
      input: rect(input),
      navbar: rect(navbar),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function labelFormMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap.label-editor-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuIssueLabel");
    const copyForm = requireElement("#copyLabel");
    const copyLegend = requireElement("#copyLabel .form-legend");
    const copyWrap = requireElement("#copyLabel .form-wrap");
    const copyOwner = requireElement('#copyLabel input[name="owner"]');
    const copySubmit = requireElement("#copyLabel .btn-submit");
    const newForm = requireElement("#frmNewLabel");
    const newWrap = requireElement("#frmNewLabel .form-wrap");
    const categoryInput = requireElement('#frmNewLabel input[name="category"]');
    const colorRow = requireElement("#frmNewLabel .label-preset-colors");
    const presetColor = requireElement("#frmNewLabel .btn-preset-color");
    const colorInput = requireElement('#frmNewLabel input[name="color"]');
    const labelsList = requireElement("#labelsList");
    const empty = requireElement("#labelsList .error-wrap");
    const editCategory = requireElement("#editCategory");
    const editLabel = requireElement("#editLabel");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const copyFormStyle = getComputedStyle(copyForm);
    const copyLegendStyle = getComputedStyle(copyLegend);
    const copyWrapStyle = getComputedStyle(copyWrap);
    const copyOwnerStyle = getComputedStyle(copyOwner);
    const copySubmitStyle = getComputedStyle(copySubmit);
    const newFormStyle = getComputedStyle(newForm);
    const newWrapStyle = getComputedStyle(newWrap);
    const categoryInputStyle = getComputedStyle(categoryInput);
    const colorRowStyle = getComputedStyle(colorRow);
    const presetColorStyle = getComputedStyle(presetColor);
    const colorInputStyle = getComputedStyle(colorInput);
    const labelsListStyle = getComputedStyle(labelsList);
    const emptyStyle = getComputedStyle(empty);
    const editCategoryStyle = getComputedStyle(editCategory);
    const editLabelStyle = getComputedStyle(editLabel);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      colorInputWidth: colorInputStyle.width,
      colorRowMarginTop: colorRowStyle.marginTop,
      copyFormMarginBottom: copyFormStyle.marginBottom,
      copyFormWidth: Math.round(copyForm.getBoundingClientRect().width),
      copyLegendDisplay: copyLegendStyle.display,
      copyLegendMarginBottom: copyLegendStyle.marginBottom,
      copyOwnerHeight: copyOwnerStyle.height,
      copyOwnerWidth: copyOwnerStyle.width,
      copySubmitHeight: copySubmitStyle.height,
      copySubmitPadding: copySubmitStyle.padding,
      copyWrapMarginTop: copyWrapStyle.marginTop,
      editCategoryDisplay: editCategoryStyle.display,
      editCategoryWidth: editCategoryStyle.width,
      editLabelDisplay: editLabelStyle.display,
      editLabelWidth: editLabelStyle.width,
      emptyPadding: emptyStyle.padding,
      labelsListMarginTop: labelsListStyle.marginTop,
      newFormMarginBottom: newFormStyle.marginBottom,
      newWrapMarginTop: newWrapStyle.marginTop,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      presetColorHeight: presetColorStyle.height,
      presetColorWidth: presetColorStyle.width,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      tabsMarginBottom: tabsStyle.marginBottom,
      categoryInputWidth: categoryInputStyle.width,
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

function projectSettings() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
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
    projectId: 7,
    projectName: "sample",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, #editCategory, #editLabel, .page-footer-outer",
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
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            !isEmptyInputValueAttr(node, attr),
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
      if (attr.name === "style") {
        return normalizeStyle(attr.value);
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function isEmptyInputValueAttr(node: Element, attr: Attr) {
      return node instanceof HTMLInputElement && attr.name === "value" && attr.value === "";
    }

    function normalizeStyle(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/rgb\((\d+),(\d+),(\d+)\)/gi, (_, red, green, blue) => {
          return `#${[red, green, blue]
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")}`;
        })
        .replace(/#[0-9a-f]{6}/gi, (color) => color.toLowerCase())
        .replace(/;$/, "")
        .replaceAll('"', "'");
    }
  });
}

async function canonicalizeElement(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    if (!root) {
      throw new Error(`missing canonical root: ${targetSelector}`);
    }
    return visit(root);

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
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            !isEmptyInputValueAttr(node, attr),
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
      if (attr.name === "style") {
        return normalizeStyle(attr.value);
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function isEmptyInputValueAttr(node: Element, attr: Attr) {
      return node instanceof HTMLInputElement && attr.name === "value" && attr.value === "";
    }

    function normalizeStyle(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/rgb\((\d+),(\d+),(\d+)\)/gi, (_, red, green, blue) => {
          return `#${[red, green, blue]
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")}`;
        })
        .replace(/#[0-9a-f]{6}/gi, (color) => color.toLowerCase())
        .replace(/;$/, "")
        .replaceAll('"', "'");
    }
  }, selector);
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
            !isEmptyInputValueAttr(node, attr),
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
      if (attr.name === "style") {
        return normalizeStyle(attr.value);
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function isEmptyInputValueAttr(node: Element, attr: Attr) {
      return node instanceof HTMLInputElement && attr.name === "value" && attr.value === "";
    }

    function normalizeStyle(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/rgb\((\d+),(\d+),(\d+)\)/gi, (_, red, green, blue) => {
          return `#${[red, green, blue]
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")}`;
        })
        .replace(/#[0-9a-f]{6}/gi, (color) => color.toLowerCase())
        .replace(/;$/, "")
        .replaceAll('"', "'");
    }
  }, html);
}
