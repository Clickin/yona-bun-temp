import { expect, mergedLegacyBlock, readFile, test, type Page } from "../wtr-compat.ts";
const EMPTY_WEBHOOKS_LIST =
  '<div id="webhooksList" class="webhook-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No webhook exists.</p></div></div>';
const POPULATED_WEBHOOKS_LIST = `
<div id="webhooksList" class="webhook-list-wrap">
  <div class="row-fluid list-head"><div class="span5 payload-url"><strong>Payload URL</strong></div><div class="span2 secret text-center"><strong>Authorization Token</strong></div><div class="span2 secret text-center"><strong>Type of message</strong></div><div class="span2 secret text-center"><strong>Include git push events</strong></div><div class="span1 secret text-center"></div></div>
  <div class="row-fluid list-item vertical-align" data-webhook-id="11"><div class="span5"><h6 class="mr20 truncate">https://hooks.example.test/yona</h6></div><div class="span2 text-center"><h6>NONE</h6></div><div class="span2 text-center"><h6>SIMPLE</h6></div><div class="span2 text-center"><input type="checkbox" checked=""></div><div class="span1 text-center"><button type="button" class="ybtn ybtn-danger ybtn-small">Delete</button></div></div>
  <div class="row-fluid list-item vertical-align" data-webhook-id="12"><div class="span5"><h6 class="mr20 truncate">https://hooks.example.test/slack</h6></div><div class="span2 text-center"><h6>secret-token</h6></div><div class="span2 text-center"><h6>DETAIL_SLACK</h6></div><div class="span2 text-center"><input type="checkbox"></div><div class="span1 text-center"><button type="button" class="ybtn ybtn-danger ybtn-small">Delete</button></div></div>
</div>`;

const EXPECTED_PROJECT_WEBHOOKS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
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
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li><li></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap webhook-editor-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class="active"><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="formNewWebhook" action="__BASE_PATH__/admin/sample/webhooks" method="post" class="new-webhook-wrap"><strong class="form-legend">Create new webhook</strong><div class="form-wrap form-actions"><div><input type="text" name="payloadUrl" class="input-webhook-payload" maxlength="2000" autocomplete="off" placeholder="Payload URL"><input type="text" name="secret" class="input-webhook-secret" maxlength="250" autocomplete="off" placeholder="Authorization Token"><button type="submit" class="ybtn ybtn-primary btn-submit">Add webhook</button></div><div><label class="radio inline"><input type="radio" name="webhookType" value="SIMPLE" checked=""> Messenger (Only text)</label><label class="radio inline"><input type="radio" name="webhookType" value="DETAIL_SLACK"> Slack (Meta)</label><label class="radio inline"><input type="radio" name="webhookType" value="DETAIL_HANGOUT_CHAT"> Google Chat (Thread)</label><label class="radio inline"><input type="radio" name="webhookType" value="JSON"> Continuous Integration tool (Only push event)</label><label class="radio inline"> | </label><label class="radio inline"></label><label class="checkbox inline" for="gitPush"><input type="checkbox" id="gitPush" name="gitPush" class="form-check-input"> Include git push events</label></div></div><div>* Every webhook is sent in POST and with Content-Type: application/json header.<br>* If you need to include additional fields and values, please use a query string. e.g. http://abc.com?customKey=value <br>* If you put a value in the Token field, 'Authorization: token input-value' header is added to HTTP header. <br></div></form><div id="webhooksList" class="webhook-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No webhook exists.</p></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project webhooks preserves the legacy help text and line breaks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);
  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#formNewWebhook > div:last-child")).toContainText(
    "* Every webhook is sent in POST and with Content-Type: application/json header.",
  );
  await expect(page.locator("#formNewWebhook > div:last-child")).toContainText(
    "* If you need to include additional fields and values, please use a query string. e.g. http://abc.com?customKey=value",
  );
  await expect(page.locator("#formNewWebhook > div:last-child")).toContainText(
    "* If you put a value in the Token field, 'Authorization: token input-value' header is added to HTTP header.",
  );
  await expect(page.locator("#formNewWebhook > div:last-child br")).toHaveCount(3);
});

test("project webhooks matches legacy project/webhooks.scala.html empty DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page).toHaveTitle("Webhooks - admin/sample");
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expect(
    page
      .locator("#formNewWebhook label.radio.inline")
      .nth(4)
      .evaluate((label) => ({
        className: label.getAttribute("class"),
        textContent: label.textContent,
      })),
  ).resolves.toEqual({ className: "radio inline", textContent: " | " });
  await expect(page.locator("#webhooksList")).toContainText("No webhook exists.");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  // F6 copy-fix-current-dom: legacy projectMenu.scala.html:126-129 leaves the
  // setting <li> unclosed (`</a>\n<li>`), so the browser auto-closes it and
  // starts a second empty <li> — the settings menu renders 9 li (8 anchors).
  await expect(page.locator(".project-menu-outer li")).toHaveCount(9);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  expect(await readLegacyGnbTexts(page)).toEqual([
    "Y",
    "List All",
    "Feedback",
    "This Project",
    "This Project",
    "All Projects",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_WEBHOOKS.replaceAll("__BASE_PATH__", basePath)),
  );
  await expectLegacyWebhookFormGeometry(page, "en");
  await expect(webhookFormMetrics(page)).resolves.toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    emptyPadding: "100px 0px",
    formActionsMarginTop: "20px",
    formFirstRowContainsSubmit: true,
    formMarginBottom: "30px",
    formWidth: 1260,
    gitPushDisplay: "inline-block",
    helpLineHeight: "20px",
    helpMarginTop: "0px",
    legendDisplay: "block",
    legendMarginBottom: "10px",
    listMarginTop: "0px",
    pageWrapMinWidth: "1100px",
    payloadHeight: "20px",
    payloadWidth: "355px",
    // F5 (2026-08-13): legacy @media all .project-page-wrap margin-top 5px
    // (_responsive.less:617-619); the 20px pin was stale.
    projectPageMarginTop: "5px",
    projectPageWidth: 1260,
    radioDisplay: "inline-block",
    secretWidth: "214px",
    submitAfterSecret: true,
    submitHeight: "30px",
    submitPadding: "4px 12px",
    tabsMarginBottom: "20px",
  });
});

test("project webhooks ko-KR desktop and mobile preserve legacy order and containment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectAdmin(page, [], {
    project: { boardCount: 1, openIssueCount: 2 },
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#subMenuWebhook")).toHaveText("웹후크");
  await expect(page.locator("#formNewWebhook .form-legend")).toHaveText("새 웹후크 생성");
  await expect(page.locator("#webhooksList")).toHaveText("등록된 웹후크가 없습니다.");
  await expectLegacyWebhookFormGeometry(page, "ko-KR");
  expect(await responsiveWebhookMetrics(page)).toEqual({
    bodyHasHorizontalOverflow: false,
    formControlsInLegacyOrder: true,
    formInsidePage: true,
    tabsInsidePage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectLegacyWebhookFormGeometry(page, "ko-KR");
  expect(await responsiveWebhookMetrics(page)).toEqual({
    bodyHasHorizontalOverflow: false,
    formControlsInLegacyOrder: true,
    formInsidePage: true,
    tabsInsidePage: true,
  });
});

test("project webhooks omits create form when webhook resource is not creatable", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], { webhooksResponse: { viewerCanCreate: false } });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page).toHaveTitle("Webhooks - admin/sample");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  await expect(page.locator("#subMenuWebhook")).toHaveClass("active");
  await expect(page.locator("#formNewWebhook")).toHaveCount(0);
  await expect(page.locator("#webhooksList")).toContainText("No webhook exists.");
  await expect(page.locator("#webhooksList .error-wrap")).toBeVisible();

  await expect(
    page.locator(".project-page-wrap.webhook-editor-wrap").evaluate((wrap) => {
      const tabs = wrap.querySelector(".nav.nav-tabs");
      const list = wrap.querySelector("#webhooksList");
      const form = wrap.querySelector("#formNewWebhook");
      if (!tabs || !list) {
        throw new Error("Missing legacy webhooks tabs or list");
      }
      const tabsBox = tabs.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return {
        formMissing: form === null,
        listBelowTabs: listBox.top > tabsBox.bottom,
        listLeftAlignedWithTabs: Math.round(listBox.left) === Math.round(tabsBox.left),
      };
    }),
  ).resolves.toEqual({
    formMissing: true,
    listBelowTabs: true,
    listLeftAlignedWithTabs: true,
  });
});

test("project webhooks localhost legacy portal success shell is restored", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], {
    ownerName: "weblabs",
    projectName: "portal",
    project: {
      isProtected: true,
      organizationName: "weblabs",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/webhooks`);
  await expect(page).toHaveTitle("Webhooks - weblabs/portal");
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  // F6 copy-fix-current-dom: legacy projectMenu.scala.html:126-129 leaves the
  // setting <li> unclosed (`</a>\n<li>`), so the browser auto-closes it and
  // starts a second empty <li> — the settings menu renders 9 li (8 anchors).
  await expect(page.locator(".project-menu-outer li")).toHaveCount(9);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  expect(await readLegacyGnbTexts(page)).toEqual([
    "Y",
    "List All",
    "Feedback",
    "This Project",
    "This Project",
    "This Group",
    "All Projects",
  ]);
});

test("project webhooks renders legacy project/partial_webhooks_list.scala.html populated list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: { hasCsrfToken: boolean; method: string; webhookId: string }[] = [];
  await mockProjectAdmin(
    page,
    [
      {
        gitPush: true,
        id: 11,
        payloadUrl: "https://hooks.example.test/yona",
        secret: "",
        webhookType: "SIMPLE",
      },
      {
        gitPush: false,
        id: 12,
        payloadUrl: "https://hooks.example.test/slack",
        secret: "secret-token",
        webhookType: "DETAIL_SLACK",
      },
    ],
    { deleteRequests },
  );

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#webhooksList .list-item")).toHaveCount(2);
  await expect(page.locator('#webhooksList [data-webhook-id="12"]')).toContainText("secret-token");
  const firstGitPushCheckbox = page.locator('#webhooksList [data-webhook-id="11"] input');
  await expect(firstGitPushCheckbox).toBeChecked();
  await firstGitPushCheckbox.click();
  await expect(firstGitPushCheckbox).toBeChecked();
  const secondGitPushCheckbox = page.locator('#webhooksList [data-webhook-id="12"] input');
  await expect(secondGitPushCheckbox).not.toBeChecked();
  await secondGitPushCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(secondGitPushCheckbox).not.toBeChecked();

  const expected = EXPECTED_PROJECT_WEBHOOKS.replaceAll("__BASE_PATH__", basePath).replace(
    EMPTY_WEBHOOKS_LIST,
    POPULATED_WEBHOOKS_LIST.replaceAll("__BASE_PATH__", basePath),
  );
  expect(await canonicalizeScreenRoots(page)).toEqual(await canonicalizeHtml(page, expected));

  await expect(webhookListMetrics(page)).resolves.toMatchObject({
    deleteButtonText: "Delete",
    requestMarkerCount: 0,
    gitPushChecked: true,
    headBackground: "rgb(250, 250, 250)",
    headBorderBottomWidth: "2px",
    headCellLineHeight: "30px",
    headCellPaddingLeft: "8px",
    itemHeadingPaddingLeft: "8px",
    listItemBorderBottomWidth: "1px",
    payloadText: "https://hooks.example.test/yona",
    secretText: "NONE",
    webhookId: "11",
    webhookType: "SIMPLE",
  });

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/webhooks/11") &&
      response.request().method() === "DELETE",
  );
  await page.locator('#webhooksList [data-webhook-id="11"] button.ybtn-danger').click();
  await deleteResponsePromise;

  expect(deleteRequests).toEqual([{ hasCsrfToken: true, method: "DELETE", webhookId: "11" }]);
});

test("project webhooks internal project links preserve legacy hrefs with SPA transitions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectSettingsTabNativeLinkAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const headerOwnerLink = page.locator(".project-breadcrumb .project-author a");
  const headerProjectLink = page.locator(".project-breadcrumb .project-name a");
  await expect(headerOwnerLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(headerOwnerLink).toHaveText("admin");
  await assertNoTanStackActiveMarkers(headerOwnerLink);
  await expect(headerProjectLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(headerProjectLink).toHaveText("sample");
  await assertNoTanStackActiveMarkers(headerProjectLink);

  const projectMenuLinks = page.locator(".project-menu-outer a");
  // F6 copy-fix-current-dom: legacy projectMenu.scala.html:126-129 leaves the
  // setting <li> unclosed (`</a>\n<li>`), so the browser auto-closes it and
  // starts a second empty <li> — the settings menu renders 9 li (8 anchors).
  await expect(page.locator(".project-menu-outer li")).toHaveCount(9);
  await expect(projectMenuLinks).toHaveCount(8);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/code`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/reviews`);
  await expect(projectMenuLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(6)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(projectMenuLinks.nth(7)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  // F6 copy-fix: style compile-mode emits x-token classes on these links; the harness
  // canonicalization strips them (project-pullrequest-overview.e2e.ts:2397-2403), so filter them here.
  expect(
    await projectMenuLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className:
          link
            .getAttribute("class")
            ?.split(/\s+/u)
            .filter((token) => token && !/^x[0-9a-z]+$/u.test(token) && !token.includes("__"))
            .join(" ") || null,
        dataStatus: link.getAttribute("data-status"),
        text: link.textContent?.replace(/\s+/gu, " ").trim(),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Project homeH" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "CodeC" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "IssueI" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Pull requestP" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "ReviewR" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "MilestoneM" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "BoardB" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Project configuration" },
  ]);

  const settingsTabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabLinks).toHaveCount(7);
  expect(
    await settingsTabLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className:
          link
            .getAttribute("class")
            ?.split(/\s+/u)
            .filter((token) => token && !/^x[0-9a-z]+$/u.test(token) && !token.includes("__"))
            .join(" ") || null,
        dataStatus: link.getAttribute("data-status"),
        text: link.textContent?.replace(/\s+/gu, " ").trim(),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Settings" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Member" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Issue Label" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Webhooks" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Transfer" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Delete project" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Repository Type Change" },
  ]);
  await expect(page.locator("#subMenuWebhook")).toHaveClass("active");
  await expect(settingsTabLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(settingsTabLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(settingsTabLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(settingsTabLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/webhooks`,
  );
  await expect(settingsTabLinks.nth(4)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/transfer`,
  );
  await expect(settingsTabLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/deleteform`,
  );
  await expect(settingsTabLinks.nth(6)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
  expect(await readProjectSettingsTabNativeLinkAudit(page)).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectMenuLinks.nth(0).click();

  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const settingsLink = page.locator("#subMenuProjectSetting a").last();
  await expect(settingsLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

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
  await expect(page.locator("#subMenuProjectSetting").last()).toHaveClass("active");
  // AnimatePresence exit keeps the prior route's form during SPA nav — last().
  await expect(page.locator("#saveSetting").last()).toBeVisible();
});

test("project webhooks fork origin link preserves legacy class without active markers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], {
    project: {
      isForkedFromOrigin: true,
      originalOwnerName: "origin",
      originalProjectName: "root",
    },
  });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const originLink = page.locator(".project-origin a.project-origin-name");
  await expect(page.locator(".project-origin-title")).toHaveText("Forked from");
  await expect(originLink).toHaveAttribute("href", `${basePath}/origin/root`);
  await expect(originLink).toHaveText("origin / root");
  await expect(originLink).toHaveAttribute("class", /\bproject-origin-name\b/u);
  await expect(originLink).not.toHaveAttribute("aria-current", /.*/u);
  await expect(originLink).not.toHaveAttribute("data-status", /.*/u);
});

test("project webhooks settings surfaces follow legacy enrolled user badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], {
    project: {
      enrolledUsers: [{ loginId: "alice" }, { loginId: "bob" }],
      enrollmentRequestCount: 99,
    },
  });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const memberTab = page.locator("#subMenuProjectMember a");
  await expect(memberTab).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(memberTab.locator(".num-badge")).toHaveText("2");
  const adminCog = page.locator(".project-setting a");
  await expect(adminCog).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(adminCog.locator(".project-menu-count")).toHaveText("2");
});

test("project webhooks hides legacy member badges when enrolledUsers is absent", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], {
    project: {
      enrolledUsers: undefined,
      enrollmentRequestCount: 99,
    },
  });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const memberTab = page.locator("#subMenuProjectMember a");
  await expect(memberTab).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(memberTab).toHaveText("Member");
  await expect(memberTab.locator(".num-badge")).toHaveCount(0);
  const adminCog = page.locator(".project-setting a");
  await expect(adminCog).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(adminCog.locator(".project-menu-count")).toHaveCount(0);
});

test("project webhooks ignores non-legacy member counts when enrolledUsers is empty", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [], {
    project: {
      enrolledUsers: [],
      memberCount: 7,
      members: [{ loginId: "alice" }, { loginId: "bob" }],
    },
  });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveCount(0);
  await expect(page.locator(".project-setting .project-menu-count")).toHaveCount(0);
});

test("project webhooks JSON type forces git push checkbox like legacy script", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const gitPush = page.locator("#gitPush");

  await expect(gitPush).not.toBeChecked();
  await page.locator('input[name="webhookType"][value="JSON"]').check();
  await expect(gitPush).toBeChecked();

  await gitPush.click();
  await expect(gitPush).toBeChecked();

  await page.locator('input[name="webhookType"][value="SIMPLE"]').check();
  await expect(gitPush).not.toBeChecked();
  await gitPush.check();
  await expect(gitPush).toBeChecked();
});

test("project webhooks successful create resets form like legacy POST redirect", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const createRequests: {
    gitPush: boolean;
    payloadUrl: string;
    secret: string;
    webhookType: string;
  }[] = [];
  await mockProjectAdmin(page, [], { createRequests });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await page.locator('input[name="payloadUrl"]').fill("https://hooks.example.test/ci");
  await page.locator('input[name="secret"]').fill("ci-token");
  await page.locator('input[name="webhookType"][value="JSON"]').check();
  await expect(page.locator("#gitPush")).toBeChecked();

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/webhooks") &&
      response.request().method() === "POST",
  );
  await page.locator("#formNewWebhook .btn-submit").click();
  await createResponsePromise;

  expect(createRequests).toEqual([
    {
      gitPush: true,
      payloadUrl: "https://hooks.example.test/ci",
      secret: "ci-token",
      webhookType: "JSON",
    },
  ]);
  await expect(page.locator('input[name="payloadUrl"]')).toHaveValue("");
  await expect(page.locator('input[name="secret"]')).toHaveValue("");
  await expect(page.locator('input[name="webhookType"][value="SIMPLE"]')).toBeChecked();
  await expect(page.locator("#gitPush")).not.toBeChecked();
});

test("project webhooks blocks empty payload URL like legacy webhook script", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const createRequests: {
    gitPush: boolean;
    payloadUrl: string;
    secret: string;
    webhookType: string;
  }[] = [];
  await mockProjectAdmin(page, [], { createRequests });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Payload URL is a required field.");
    await dialog.accept();
  });
  await page.locator("#formNewWebhook .btn-submit").click();

  await page.waitForTimeout(100);
  expect(createRequests).toEqual([]);
});

test("project webhooks header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, [], { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/webhooks`);
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

test("project webhooks header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, [], {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project webhooks header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);

  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteToggle.locator("i")).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteToggle.locator("i")).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteToggle.locator("i")).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function mockProjectAdmin(
  page: Page,
  webhooks: unknown[] = [],
  options: {
    createRequests?: {
      gitPush: boolean;
      payloadUrl: string;
      secret: string;
      webhookType: string;
    }[];
    deleteRequests?: { hasCsrfToken: boolean; method: string; webhookId: string }[];
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    ownerName?: string;
    projectName?: string;
    project?: Partial<ReturnType<typeof projectContainer>>;
    webhooksResponse?: Record<string, unknown>;
  } = {},
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");

  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
  const sessionLoginId = "admin";
  const sessionUserLabel = "Site Admin";
  const sessionAvatarUrl = "/assets/images/default-avatar-32.png";

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: sessionAvatarUrl,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: sessionLoginId,
        userLabel: sessionUserLabel,
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-webhooks" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: sessionAvatarUrl,
          loginId: sessionLoginId,
          name: sessionUserLabel,
        },
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...projectContainer(ownerName, projectName), ...options.project }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/settings`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(projectSettings(ownerName, projectName)),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/branches`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName,
        permissions: { canDelete: true, canUpdate: true },
        projectName,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/webhooks`,
    async (route) => {
      if (route.request().method() === "POST") {
        const data = route.request().postDataJSON() as {
          gitPush?: boolean;
          payloadUrl?: string;
          secret?: string;
          webhookType?: string;
        };
        options.createRequests?.push({
          gitPush: data.gitPush === true,
          payloadUrl: String(data.payloadUrl ?? ""),
          secret: String(data.secret ?? ""),
          webhookType: String(data.webhookType ?? ""),
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            gitPush: data.gitPush === true,
            id: 99,
            payloadUrl: data.payloadUrl ?? "",
            secret: data.secret ?? "",
            webhookType: data.webhookType ?? "SIMPLE",
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          deliveries: [],
          ownerName,
          projectName,
          viewerCanUpdate: options.project?.viewerCanUpdate === false ? false : true,
          webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
          webhooks,
          ...options.webhooksResponse,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/webhooks/*`,
    async (route) => {
      const request = route.request();
      const webhookId = new URL(request.url()).pathname.split("/").pop() ?? "";
      if (request.method() === "DELETE") {
        options.deleteRequests?.push({
          hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-webhooks",
          method: request.method(),
          webhookId,
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.fallback();
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/favorite`,
    async (route) => {
      const request = route.request();
      options.favoriteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-webhooks",
        method: request.method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
      });
    },
  );
}

function projectContainer(ownerName = "admin", projectName = "sample") {
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
    ownerName,
    projectName,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

function projectSettings(ownerName = "admin", projectName = "sample") {
  return {
    ...projectContainer(ownerName, projectName),
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    isFavorited: false,
    isUsingReviewerCount: true,
    maxReviewerCount: 3,
    organizationName: "",
    overview: "Sample overview",
    projectId: 7,
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    watchCount: 5,
  };
}

async function webhookListMetrics(page: Page) {
  return page.evaluate(() => {
    const head = document.querySelector("#webhooksList .list-head");
    const firstItem = document.querySelector("#webhooksList .list-item");
    const cells = firstItem ? Array.from(firstItem.children) : [];
    const firstHeadCell = head?.firstElementChild;
    const itemHeading = firstItem?.querySelector("h6");
    const checkbox = firstItem?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const button = firstItem?.querySelector("button.ybtn-danger");
    const headStyle = head ? getComputedStyle(head) : null;
    const itemStyle = firstItem ? getComputedStyle(firstItem) : null;
    const headCellStyle = firstHeadCell ? getComputedStyle(firstHeadCell) : null;
    const itemHeadingStyle = itemHeading ? getComputedStyle(itemHeading) : null;
    return {
      deleteButtonText: button?.textContent?.trim(),
      gitPushChecked: checkbox?.checked,
      headBackground: headStyle?.backgroundColor,
      headBorderBottomWidth: headStyle?.borderBottomWidth,
      headCellLineHeight: headCellStyle?.lineHeight,
      headCellPaddingLeft: headCellStyle?.paddingLeft,
      itemHeadingPaddingLeft: itemHeadingStyle?.paddingLeft,
      listItemBorderBottomWidth: itemStyle?.borderBottomWidth,
      payloadText: cells[0]?.textContent?.trim(),
      requestMarkerCount: firstItem?.querySelectorAll("[data-request-method], [data-request-uri]")
        .length,
      secretText: cells[1]?.textContent?.trim(),
      webhookId: firstItem?.getAttribute("data-webhook-id"),
      webhookType: cells[2]?.textContent?.trim(),
    };
  });
}

async function assertNoTanStackActiveMarkers(locator: ReturnType<Page["locator"]>) {
  await expect(locator).not.toHaveAttribute("class", /\bactive\b/u);
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
}

async function responsiveWebhookMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = requireElement(".project-page-wrap.webhook-editor-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const form = requireElement("#formNewWebhook");
    const payload = requireElement(".input-webhook-payload");
    const secret = requireElement(".input-webhook-secret");
    const submit = requireElement("#formNewWebhook .btn-submit");
    const pageBox = pageWrap.getBoundingClientRect();
    const tabsBox = tabs.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    const payloadBox = payload.getBoundingClientRect();
    const secretBox = secret.getBoundingClientRect();
    const submitBox = submit.getBoundingClientRect();
    return {
      bodyHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      formControlsInLegacyOrder:
        payloadBox.left <= secretBox.left && secretBox.left <= submitBox.left,
      formInsidePage: formBox.left >= pageBox.left && formBox.right <= pageBox.right,
      tabsInsidePage: tabsBox.left >= pageBox.left && tabsBox.right <= pageBox.right,
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

async function expectLegacyWebhookFormGeometry(page: Page, language: "en" | "ko-KR") {
  // Render the original form and message fixture with only the frozen stylesheet
  // chain. The shared-document comparator would apply the same Tailwind/owner
  // overrides to both trees and hide the inline-label regression.
  const [template, english, localized] = await Promise.all([
    readFile("../yona-original/app/views/project/webhooks.scala.html", "utf8"),
    readFile("../yona-original/conf/messages", "utf8"),
    readFile(`../yona-original/conf/messages${language === "en" ? "" : `.${language}`}`, "utf8"),
  ]);
  const messages = new Map<string, string>();
  for (const source of [english, localized]) {
    for (const line of source.split("\n")) {
      const entry = line.match(/^([\w.]+)\s*=\s*(.*)$/u);
      if (entry) messages.set(entry[1], entry[2].replaceAll("''", "'"));
    }
  }
  const form = template.match(/<form id="formNewWebhook"[\s\S]*?<\/form>/u)?.[0];
  if (!form) throw new Error("Original webhook form is missing");
  const html = form
    .replace(/action="[^"]*"/u, 'action=""')
    .replace(/@Html\(Messages\("([^"]+)"\)\)|@Messages\("([^"]+)"\)/gu, (_, rawKey, key) => {
      const value = messages.get(rawKey ?? key);
      if (value === undefined) throw new Error(`Missing legacy message ${rawKey ?? key}`);
      return rawKey
        ? value
        : value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
    });
  const mismatches = await page.evaluate(
    async ({ html, css }) => {
      const candidate = document.querySelector<HTMLElement>("#formNewWebhook");
      if (!candidate) throw new Error("Candidate webhook form is missing");
      await document.fonts.ready;
      const formBox = candidate.getBoundingClientRect();
      const frame = document.createElement("iframe");
      frame.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${window.innerWidth}px;height:${window.innerHeight}px;visibility:hidden`;
      document.body.append(frame);
      try {
        const referenceDocument = frame.contentDocument;
        const referenceWindow = frame.contentWindow;
        if (!referenceDocument || !referenceWindow)
          throw new Error("Missing legacy reference frame");
        referenceDocument.open();
        referenceDocument.write(
          `<!doctype html><html><head><style>${css}</style></head><body class="prj"><div class="main"><div class="project-page-wrap webhook-editor-wrap" style="width:${formBox.width}px">${html}</div></div></body></html>`,
        );
        referenceDocument.close();
        await referenceDocument.fonts.ready;
        const reference = referenceDocument.querySelector<HTMLElement>("#formNewWebhook");
        if (!reference) throw new Error("Legacy webhook form is missing");
        const referenceBox = reference.getBoundingClientRect();
        const selectors = [
          ":scope",
          ".form-legend",
          ".form-actions",
          ".form-actions > div:first-child",
          ".form-actions > div:last-child",
          "input",
          "button",
          "label",
          ":scope > div:last-child",
        ];
        const differences: string[] = [];
        const styles = [
          "display",
          "font-family",
          "font-size",
          "line-height",
          "box-sizing",
          "padding-left",
          "padding-top",
          "margin-left",
          "margin-bottom",
          "vertical-align",
          "color",
          "background-color",
          "border-top-color",
        ];
        for (const selector of selectors) {
          const expected =
            selector === ":scope" ? [reference] : [...reference.querySelectorAll(selector)];
          const actual =
            selector === ":scope" ? [candidate] : [...candidate.querySelectorAll(selector)];
          if (expected.length !== actual.length) {
            differences.push(
              `${selector}: legacy count=${expected.length}, React count=${actual.length}`,
            );
            continue;
          }
          expected.forEach((element, index) => {
            const expectedRect = element.getBoundingClientRect();
            const actualRect = actual[index].getBoundingClientRect();
            const expectedStyle = referenceWindow.getComputedStyle(element);
            const actualStyle = getComputedStyle(actual[index]);
            for (const property of styles) {
              const legacy = expectedStyle.getPropertyValue(property);
              const react = actualStyle.getPropertyValue(property);
              if (legacy !== react)
                differences.push(
                  `${selector}[${index}] ${property}: legacy=${legacy}, React=${react}`,
                );
            }
            const expectedGeometry = [
              expectedRect.width,
              expectedRect.height,
              expectedRect.x - referenceBox.x,
              expectedRect.y - referenceBox.y,
            ];
            const actualGeometry = [
              actualRect.width,
              actualRect.height,
              actualRect.x - formBox.x,
              actualRect.y - formBox.y,
            ];
            ["width", "height", "relative x", "relative y"].forEach((property, coordinate) => {
              if (Math.abs(expectedGeometry[coordinate] - actualGeometry[coordinate]) > 1) {
                differences.push(
                  `${selector}[${index}] ${property}: legacy=${expectedGeometry[coordinate]}, React=${actualGeometry[coordinate]}`,
                );
              }
            });
          });
        }
        return differences;
      } finally {
        frame.remove();
      }
    },
    { html, css: mergedLegacyBlock() },
  );
  expect(mismatches.join("\n")).toBe("");
}

async function webhookFormMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap.webhook-editor-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuWebhook");
    const form = requireElement("#formNewWebhook");
    const legend = requireElement("#formNewWebhook .form-legend");
    const formActions = requireElement("#formNewWebhook .form-actions");
    const formFirstRow = requireElement("#formNewWebhook .form-actions > div:first-child");
    const payload = requireElement(".input-webhook-payload");
    const secret = requireElement(".input-webhook-secret");
    const submit = requireElement("#formNewWebhook .btn-submit");
    const radio = requireElement("#formNewWebhook label.radio.inline");
    const gitPushLabel = requireElement('#formNewWebhook label.checkbox.inline[for="gitPush"]');
    const help = requireElement("#formNewWebhook > div:last-child");
    const list = requireElement("#webhooksList");
    const empty = requireElement("#webhooksList .error-wrap");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const formStyle = getComputedStyle(form);
    const legendStyle = getComputedStyle(legend);
    const formActionsStyle = getComputedStyle(formActions);
    const payloadStyle = getComputedStyle(payload);
    const secretStyle = getComputedStyle(secret);
    const submitStyle = getComputedStyle(submit);
    const radioStyle = getComputedStyle(radio);
    const gitPushStyle = getComputedStyle(gitPushLabel);
    const helpStyle = getComputedStyle(help);
    const listStyle = getComputedStyle(list);
    const emptyStyle = getComputedStyle(empty);
    const firstRowBox = formFirstRow.getBoundingClientRect();
    const payloadBox = payload.getBoundingClientRect();
    const secretBox = secret.getBoundingClientRect();
    const submitBox = submit.getBoundingClientRect();
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      emptyPadding: emptyStyle.padding,
      formActionsMarginTop: formActionsStyle.marginTop,
      formFirstRowContainsSubmit:
        submitBox.top >= firstRowBox.top &&
        submitBox.bottom <= firstRowBox.bottom &&
        submitBox.right <= firstRowBox.right,
      formMarginBottom: formStyle.marginBottom,
      formWidth: Math.round(form.getBoundingClientRect().width),
      gitPushDisplay: gitPushStyle.display,
      helpLineHeight: helpStyle.lineHeight,
      helpMarginTop: helpStyle.marginTop,
      legendDisplay: legendStyle.display,
      legendMarginBottom: legendStyle.marginBottom,
      listMarginTop: listStyle.marginTop,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      payloadHeight: payloadStyle.height,
      payloadWidth: payloadStyle.width,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      radioDisplay: radioStyle.display,
      secretWidth: secretStyle.width,
      submitAfterSecret: submitBox.left >= secretBox.right && secretBox.left >= payloadBox.right,
      submitHeight: submitStyle.height,
      submitPadding: submitStyle.padding,
      tabsMarginBottom: tabsStyle.marginBottom,
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

async function readLegacyGnbTexts(page: Page) {
  return page.evaluate(() =>
    [
      ...Array.from(document.querySelectorAll('[data-owner="global-gnb-nav"] > li > a')).map(
        (node) => node.textContent?.replace(/\s+/gu, " ").trim(),
      ),
      ...Array.from(document.querySelectorAll("#gnb-search-scope-title")).map((node) =>
        node.textContent?.replace(/\s+/gu, " ").trim(),
      ),
      ...Array.from(
        document.querySelectorAll("[data-owner=global-gnb-search-scope-item] > button"),
      ).map((node) => node.textContent?.replace(/\s+/gu, " ").trim()),
    ].filter((value): value is string => Boolean(value)),
  );
}

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

async function favoriteSpanNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaFavoriteSpanNativeListeners?: string[] })
        .__yonaFavoriteSpanNativeListeners ?? [],
  );
}

async function installProjectSettingsTabNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectSettingsTabNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithProjectSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-page-wrap > .nav.nav-tabs a")) {
        const parentId = this.parentElement?.id ?? "";
        (
          window as Window &
            typeof globalThis & { __projectSettingsTabNativeLinkListeners: string[] }
        ).__projectSettingsTabNativeLinkListeners.push(`${parentId}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectSettingsTabNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __projectSettingsTabNativeLinkListeners?: string[] }
      ).__projectSettingsTabNativeLinkListeners ?? [],
  );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".project-header-outer, .project-menu-outer, .page-wrap-outer"),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      if (node.matches(".project-setting li:empty")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (node.matches(".project-page-wrap > .nav.nav-tabs a") ||
              (attr.name !== "aria-current" && attr.name !== "data-status")) &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-project-header-owner" &&
            attr.name !== "data-wtr-click-selected",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(
          ([name, value]) =>
            !(name === "class" && value === "") &&
            !(name === "style" && value === "") &&
            !(name === "value" && node.matches('input[type="checkbox"]')),
        )
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^s2e-/u.test(token) &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      if (attr.name === "style") {
        return "";
      }
      return attr.name === "style"
        ? attr.value
            .replace(/\s+/g, "")
            .replace(/;$/u, "")
            .replaceAll('"', "'")
            .replace(
              /--x-([A-Za-z0-9-]+):/gu,
              (_match, name: string) =>
                `${name.replace(/[A-Z]/gu, (letter: string) => `-${letter.toLowerCase()}`)}:`,
            )
        : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(
      template.content.querySelectorAll(
        ".project-header-outer, .project-menu-outer, .page-wrap-outer",
      ),
    )
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      if (node.matches(".project-setting li:empty")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (node.matches(".project-page-wrap > .nav.nav-tabs a") ||
              (attr.name !== "aria-current" && attr.name !== "data-status")) &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-project-header-owner" &&
            attr.name !== "data-wtr-click-selected",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(
          ([name, value]) =>
            !(name === "class" && value === "") &&
            !(name === "style" && value === "") &&
            !(name === "value" && node.matches('input[type="checkbox"]')),
        )
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^s2e-/u.test(token) &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      if (attr.name === "style") {
        return "";
      }
      return attr.name === "style"
        ? attr.value
            .replace(/\s+/g, "")
            .replace(/;$/u, "")
            .replaceAll('"', "'")
            .replace(
              /--x-([A-Za-z0-9-]+):/gu,
              (_match, name: string) =>
                `${name.replace(/[A-Z]/gu, (letter: string) => `-${letter.toLowerCase()}`)}:`,
            )
        : attr.value;
    }
  }, html);
}
