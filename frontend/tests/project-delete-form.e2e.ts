import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_PROJECT_DELETE_FORM = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li>
        <form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="btn-group">
            <button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button>
            <ul class="dropdown-menu flat right">
              <li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li>
              <li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li>
            </ul>
          </div>
          <div class="search-box select">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
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
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')">
  <div class="project-header-inner">
    <div class="project-header-wrap">
      <div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div>
      <div class="project-breadcrumb-wrap">
        <div class="project-breadcrumb">
          <span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span>
          <span class="project-separator hide-in-mobile">/</span>
          <span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span>
          <span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span>
        </div>
      </div>
      <div class="project-util-wrap"><ul class="project-util"></ul></div>
    </div>
  </div>
</div>
<div class="project-menu-outer">
  <div class="project-menu-inner">
    <ul class="project-menu-nav project-menu-gruop">
      <li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li>
      <li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span><span class="project-menu-count">3</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span><span class="project-menu-count">2</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span><span class="project-menu-count">4</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span><span class="project-menu-count">5</span></a></li>
    </ul>
    <div class="project-setting">
      <ul class="project-menu-nav">
        <li class="active"><a href="__BASE_PATH__/admin/sample/settingform"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li>
        <li></li>
      </ul>
    </div>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <ul class="nav nav-tabs">
      <li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/settingform">Settings</a></li>
      <li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li>
      <li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li>
      <li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li>
      <li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li>
      <li id="subMenuProjectDelete" class="active"><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li>
      <li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li>
    </ul>
    <div class="bubble-wrap gray wp">
      <div class="cu-label">Delete project</div>
      <div class="cu-desc">
        <p><strong class="notice">Once you delete the project, data related to code, board, issues etc. will also be deleted, and won't be able to be recovered.</strong></p>
        <p><input type="checkbox" class="checkbox" autocomplete="off" id="accept"><label for="accept" class="bg-checkbox label-agreement">I agree to delete this project.</label></p>
      </div>
    </div>
    <div class="box-wrap bottom">
      <button id="btnDelete" type="button" class="ybtn ybtn-danger" data-toggle="modal"><i class="yobicon-database-remove"></i> Delete this project</button>
    </div>
    <div id="alertDeletion" class="modal hide">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal">×</button>
        <h3>Do you want to delete this project?</h3>
      </div>
      <div class="modal-body">
        <p> Once you delete the project, data related to code, board, issues etc. will also be deleted, and won't be able to be recovered.</p>
        <p> Are you sure you want to delete this project? </p>
      </div>
      <div class="modal-footer">
        <button id="btnDeleteExec" type="button" class="ybtn ybtn-danger">Yes</button>
        <button type="button" class="ybtn" data-dismiss="modal">No</button>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("project delete form matches legacy project/delete.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/deleteform`);
  await expect(page).toHaveTitle("Delete project - admin/sample");
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer li")).toHaveCount(9);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  await expect(page.locator("#alertDeletion .modal-header h3")).toHaveText(
    "Do you want to delete this project?",
  );
  expect(await readLegacyGnbTexts(page)).toEqual([
    "Y",
    "List All",
    "Feedback",
    "This Project",
    "This Project",
    "All Projects",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_DELETE_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  await expect(page.locator("#subMenuProjectDelete")).toHaveClass("active");
  expect(await readSettingsMenuAnchorAttrs(page)).toEqual([{}, {}, {}, {}, {}, {}, {}]);
  expect(await readDesktopDeleteMetrics(page)).toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    agreementLineHeight: "20px",
    agreementMarginLeft: "0px",
    bottomPadding: "20px 0px 12px",
    bubbleBackground: "rgb(247, 247, 247)",
    bubblePadding: "20px 20px 10px",
    bubbleWidth: 1260,
    buttonHeight: "31px",
    buttonLineHeight: "20px",
    buttonPadding: "4px 12px",
    checkboxMargin: "2px",
    descMarginLeft: "0px",
    descWidth: 795,
    labelLineHeight: "20px",
    labelWidth: 205,
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
    tabsMarginBottom: "15px",
  });
});

test("project delete form localhost legacy portal shell is restored", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    ownerName: "weblabs",
    projectName: "portal",
    project: {
      isProtected: true,
      organizationName: "weblabs",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/deleteform`);
  await expect(page).toHaveTitle("Delete project - weblabs/portal");
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer li")).toHaveCount(9);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(7);
  await expect(page.locator("#alertDeletion .modal-header h3")).toHaveText(
    "Do you want to delete this project?",
  );
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

test("project delete form route has no TanStack route-cast escapes", async () => {
  const source = await readFile("src/routes/$ownerName/$projectName/deleteform.tsx", "utf8");
  expect(source).not.toContain("as never");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("<a");
  expect(source).not.toContain("onMouseDown=");
  expect(source).not.toContain("setAttribute");
  expect(source).not.toContain("removeAttribute");
  expect(source).not.toContain("activeProps={{ className: undefined }}");
  expect(source).toContain("projectSearchScope={projectSearchScope}");
  expect(source).toContain("showLegacyProjectHeaderLinks");
  expect(source).toContain(
    'const legacyTitle = `${t("project.delete")} - ${ownerName}/${projectName}`;',
  );
  expect(source).toContain("<title>{legacyTitle}</title>");
  expect(source).not.toContain("useProjectDeleteDocumentTitle");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).toContain("onClick=");
});

test("project delete member badges stay sourced from enrolledUsers only", async () => {
  const source = await readFile("src/routes/$ownerName/$projectName/deleteform.tsx", "utf8");

  expect(source).not.toContain("project.enrollmentRequestCount");
  expect(source).not.toMatch(/countField\(\s*project\.enrolledUsers\s*,/);
});

test("project delete confirmation modal source stays route-owned", async () => {
  const source = await readFile("src/routes/$ownerName/$projectName/deleteform.tsx", "utf8");
  const modalSource = source.slice(
    source.indexOf("const insulateDeletionModalButtonClick"),
    source.indexOf("function ProjectHeader"),
  );

  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain('data-toggle="modal"');
  expect(modalSource).not.toContain("data-target");
  expect(modalSource).toContain('data-dismiss="modal"');
  expect(modalSource).toContain("setDeletionModalOpen(true);");
  expect(modalSource).toContain("setDeletionModalOpen(false);");
  expect(modalSource).toContain("onClick={openDeletionModal}");
  expect(modalSource).toContain("onClick={dismissDeletionModal}");
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("style.display");
  expect(modalSource).not.toContain("addEventListener(");
});

test("project delete confirmation modal opens, dismisses, deletes, and redirects through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await auditDeleteNativeListeners(page);
  await mockProjectAdmin(page, { deleteRequests });

  await page.goto(`${basePath}/admin/sample/deleteform`);
  const deleteFormUrl = page.url();
  await rememberSpaMarker(page, "kept");
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  const alertDeletion = page.locator("#alertDeletion");
  const rejectedAlertPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
  await armRootDeleteModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnDelete"))).toBe(false);
  await expect(rejectedAlertPromise).resolves.toBe("You should agree to delete this project.");
  await expect(alertDeletion).toHaveClass("modal hide");
  await expect(alertDeletion).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  await expect.poll(() => spaMarker(page)).toBe("kept");

  await page.locator("#accept").check();
  await armRootDeleteModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnDelete"))).toBe(false);
  await expect(alertDeletion).toHaveClass("modal hide in");
  await expect(alertDeletion).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  await expect.poll(() => spaMarker(page)).toBe("kept");

  await armRootDeleteModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(page.locator('#alertDeletion [data-dismiss="modal"]').last()),
  ).toBe(false);
  await expect(alertDeletion).toHaveClass("modal hide");
  await expect(alertDeletion).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  await expect.poll(() => spaMarker(page)).toBe("kept");

  await armRootDeleteModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnDelete"))).toBe(false);
  await expect(alertDeletion).toHaveClass("modal hide in");
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  await expect.poll(() => spaMarker(page)).toBe("kept");

  await armRootDeleteModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#alertDeletion .close"))).toBe(false);
  await expect(alertDeletion).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  await expect.poll(() => spaMarker(page)).toBe("kept");

  await armRootDeleteModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnDelete"))).toBe(false);
  expect(await rootDeleteModalBridgeHits(page)).toEqual([]);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#btnDeleteExec").click();
  await deleteResponsePromise;

  expect(deleteRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(page).toHaveURL(basePath);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  expect(await readDeleteNativeListenerAudit(page)).toEqual([]);
});

test("project delete request failure hides modal and shows legacy error alert", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, { deleteFails: true, deleteRequests });

  await page.goto(`${basePath}/admin/sample/deleteform`);
  await page.locator("#accept").check();
  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide in");

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample") &&
      response.request().method() === "DELETE",
  );
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Error occurred while deleting a project.");
    await dialog.accept();
  });
  await page.locator("#btnDeleteExec").click();
  await deleteResponsePromise;

  expect(deleteRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/deleteform`);
});

test("project delete settings tab links preserve legacy hrefs without native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectDeleteSettingsTabAnchorAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/deleteform`);
  const tabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(tabLinks).toHaveCount(7);
  expect(
    await tabLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/admin/sample/settingform`,
    `${basePath}/admin/sample/members`,
    `${basePath}/admin/sample/issue/labelsform`,
    `${basePath}/admin/sample/webhooks`,
    `${basePath}/admin/sample/transfer`,
    `${basePath}/admin/sample/deleteform`,
    `${basePath}/admin/sample/changeVCS`,
  ]);
  expect(await readProjectDeleteSettingsTabAnchorAudit(page)).toEqual([]);

  const settingsLink = page.locator("#subMenuProjectSetting a");
  await expect(settingsLink).toHaveAttribute("href", `${basePath}/admin/sample/settingform`);
  await expect(page.locator("#subMenuIssueLabel a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/settingform`);
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

test("project delete settings tab follows legacy enrolled user badge and hidden VCS branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: [{ loginId: "alice" }, { loginId: "bob" }],
      enrollmentRequestCount: 99,
      menuSetting: { ...projectSettings().menuSetting, code: false },
    },
  });

  await page.goto(`${basePath}/admin/sample/deleteform`);
  const memberTab = page.locator("#subMenuProjectMember a");
  await expect(memberTab).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(memberTab.locator(".num-badge")).toHaveText("2");
  await expect(page.locator(".project-setting a .project-menu-count")).toHaveText("2");

  const changeVcsTab = page.locator("#subMenuProjectChangeVCS");
  await expect(changeVcsTab).toHaveAttribute("style", "display: none;");
  await expect(changeVcsTab).toBeHidden();
  await expect(changeVcsTab.locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
});

test("project delete settings tab hides member badges when enrolledUsers is absent", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: undefined,
      enrollmentRequestCount: 99,
    },
  });

  await page.goto(`${basePath}/admin/sample/deleteform`);

  const memberTab = page.locator("#subMenuProjectMember a");
  await expect(memberTab).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(memberTab.locator(".num-badge")).toHaveCount(0);
  await expect(page.locator(".project-setting a .project-menu-count")).toHaveCount(0);
});

test("project delete header and project menu links preserve legacy hrefs and SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      isForkedFromOrigin: true,
      originalOwnerName: "seed",
      originalProjectName: "origin",
    },
  });

  await page.goto(`${basePath}/admin/sample/deleteform`);

  await expect(page.locator(".project-author a")).toHaveAttribute("href", `${basePath}/admin`);
  await expect(page.locator(".project-name a")).toHaveAttribute("href", `${basePath}/admin/sample`);
  expect(await readLegacyAnchorSnapshots(page, ".project-breadcrumb a, .project-origin a")).toEqual(
    [
      {
        ariaCurrent: null,
        className: null,
        dataStatus: null,
        href: `${basePath}/admin`,
        text: "admin",
      },
      {
        ariaCurrent: null,
        className: null,
        dataStatus: null,
        href: `${basePath}/admin/sample`,
        text: "sample",
      },
      {
        ariaCurrent: null,
        className: "project-origin-name",
        dataStatus: null,
        href: `${basePath}/seed/origin`,
        text: "seed / origin",
      },
    ],
  );
  expect(
    await page
      .locator(".project-menu-gruop > li > a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/admin/sample`,
    `${basePath}/admin/sample/code`,
    `${basePath}/admin/sample/issues`,
    `${basePath}/admin/sample/pullRequests`,
    `${basePath}/admin/sample/reviews`,
    `${basePath}/admin/sample/milestones`,
    `${basePath}/admin/sample/posts`,
  ]);
  expect(await readLegacyAnchorSnapshots(page, ".project-menu-gruop > li > a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample`,
      text: "Project homeH",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/code`,
      text: "CodeC",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/issues`,
      text: "IssueI 3",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/pullRequests`,
      text: "Pull requestP 2",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/reviews`,
      text: "ReviewR 4",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/milestones`,
      text: "MilestoneM",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/posts`,
      text: "BoardB 5",
    },
  ]);

  const settingsCog = page.locator(".project-setting a");
  await expect(settingsCog).toHaveAttribute("href", `${basePath}/admin/sample/settingform`);
  expect(await readLegacyAnchorSnapshots(page, ".project-setting a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample/settingform`,
      text: "Project configuration",
    },
  ]);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsCog.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("project delete header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/deleteform`);
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

test("project delete header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/deleteform`);
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

test("project delete header favorite star has no route-local native listener", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/deleteform`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function readDesktopDeleteMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectDelete");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const label = requireElement(".bubble-wrap.gray.wp .cu-label");
    const desc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const accept = requireElement("#accept");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const deleteButton = requireElement("#btnDelete");
    const modal = requireElement("#alertDeletion");
    const modalHeader = requireElement("#alertDeletion .modal-header");
    const modalFooter = requireElement("#alertDeletion .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const labelStyle = getComputedStyle(label);
    const descStyle = getComputedStyle(desc);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(deleteButton);
    const modalStyle = getComputedStyle(modal);
    const modalHeaderStyle = getComputedStyle(modalHeader);
    const modalFooterStyle = getComputedStyle(modalFooter);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      agreementLineHeight: agreementStyle.lineHeight,
      agreementMarginLeft: agreementStyle.marginLeft,
      bottomPadding: bottomStyle.padding,
      bubbleBackground: bubbleStyle.backgroundColor,
      bubblePadding: bubbleStyle.padding,
      bubbleWidth: Math.round(bubble.getBoundingClientRect().width),
      buttonHeight: buttonStyle.height,
      buttonLineHeight: buttonStyle.lineHeight,
      buttonPadding: buttonStyle.padding,
      checkboxMargin: acceptStyle.margin,
      descMarginLeft: descStyle.marginLeft,
      descWidth: Math.round(desc.getBoundingClientRect().width),
      labelLineHeight: labelStyle.lineHeight,
      labelWidth: Math.round(label.getBoundingClientRect().width),
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
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

async function readSettingsMenuAnchorAttrs(page: Page) {
  return page.locator(".project-page-wrap > .nav.nav-tabs a").evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      ...(anchor.getAttribute("class") === null ? {} : { class: anchor.getAttribute("class") }),
      ...(anchor.getAttribute("aria-current") === null
        ? {}
        : { "aria-current": anchor.getAttribute("aria-current") }),
      ...(anchor.getAttribute("data-status") === null
        ? {}
        : { "data-status": anchor.getAttribute("data-status") }),
    })),
  );
}

async function readLegacyAnchorSnapshots(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      ariaCurrent: anchor.getAttribute("aria-current"),
      className: anchor.getAttribute("class"),
      dataStatus: anchor.getAttribute("data-status"),
      href: anchor.getAttribute("href"),
      text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
  );
}

async function readLegacyGnbTexts(page: Page) {
  return page
    .locator(".gnb-nav a, .gnb-search-form .dropdown-menu button, #gnb-search-scope-title")
    .evaluateAll((elements) =>
      elements.map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim()),
    );
}

async function mockProjectAdmin(
  page: Page,
  options: {
    deleteFails?: boolean;
    deleteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    ownerName?: string;
    project?: Partial<ReturnType<typeof projectSettings>>;
    projectName?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
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
      headers: { "x-csrf-token": "csrf-delete" },
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
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/settings`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...projectSettings({ ownerName, projectName }),
          ...options.project,
        }),
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
  await page.route(`**/api/v1/owners/${ownerName}/projects/${projectName}`, async (route) => {
    if (route.request().method() === "DELETE") {
      const request = route.request();
      options.deleteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-delete",
        method: request.method(),
      });
      if (options.deleteFails) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "delete failed" }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, redirectPath: "/" }),
      });
      return;
    }
    await route.fallback();
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/favorite`,
    async (route) => {
      const request = route.request();
      options.favoriteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-delete",
        method: request.method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
      });
    },
  );
}

function projectSettings({
  ownerName = "admin",
  projectName = "sample",
}: {
  ownerName?: string;
  projectName?: string;
} = {}) {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrolledUsers: [],
    enrollmentRequestCount: 0,
    id: 7,
    isCodeAccessibleMemberOnly: false,
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
    openIssueCount: 3,
    openPullRequestCount: 2,
    organizationName: "",
    overview: "Sample overview",
    ownerName,
    postCount: 5,
    projectId: 7,
    projectName,
    projectScope: "PUBLIC",
    reviewCount: 4,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    viewerCanWatch: false,
    watchCount: 5,
  };
}

async function auditDeleteNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const records: string[] = [];
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        this instanceof Element &&
        (this.id === "btnDelete" ||
          this.id === "alertDeletion" ||
          Boolean(this.closest("#alertDeletion")))
      ) {
        records.push(`${this.id || this.className}:${type}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & typeof globalThis & { __deleteNativeListenerAudit?: typeof records }
    ).__deleteNativeListenerAudit = records;
  });
}

async function readDeleteNativeListenerAudit(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __deleteNativeListenerAudit?: string[] })
        .__deleteNativeListenerAudit ?? [],
  );
}

async function armRootDeleteModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __yonaDeleteModalBridgeHits?: string[];
        __yonaDeleteModalBridgeTrapArmed?: boolean;
      };
    win.__yonaDeleteModalBridgeHits = [];
    if (win.__yonaDeleteModalBridgeTrapArmed) {
      return;
    }
    win.__yonaDeleteModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest('#btnDelete, #alertDeletion [data-dismiss="modal"]');
      if (bridged) {
        win.__yonaDeleteModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootDeleteModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __yonaDeleteModalBridgeHits?: string[];
          }
      ).__yonaDeleteModalBridgeHits ?? [],
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

async function rememberSpaMarker(page: Page, value: string) {
  await page.evaluate((nextValue) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextValue;
  }, value);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function installProjectDeleteSettingsTabAnchorAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const listeners: string[] = [];
    Object.defineProperty(window, "__projectDeleteSettingsTabAnchorListeners", {
      configurable: true,
      value: listeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithDeleteSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-page-wrap > .nav.nav-tabs a")) {
        listeners.push(`${this.id || this.textContent?.trim() || this.className}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectDeleteSettingsTabAnchorAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __projectDeleteSettingsTabAnchorListeners?: string[] }
      ).__projectDeleteSettingsTabAnchorListeners ?? [],
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
        .filter((attr) => shouldKeepRouteActiveAttr(node, attr))
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

    function shouldKeepRouteActiveAttr(node: Element, attr: Attr) {
      if (attr.name !== "aria-current" && attr.name !== "data-status") {
        return true;
      }
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
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
        .filter((attr) => shouldKeepRouteActiveAttr(node, attr))
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

    function shouldKeepRouteActiveAttr(node: Element, attr: Attr) {
      if (attr.name !== "aria-current" && attr.name !== "data-status") {
        return true;
      }
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }
  }, html);
}
