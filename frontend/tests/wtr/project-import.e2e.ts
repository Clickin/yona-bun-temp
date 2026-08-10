import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const PROJECT_IMPORT_ROUTE_SOURCE = "src/routes/[_]import.tsx";

const EXPECTED_PROJECT_IMPORT = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_ROOT__" class="logo logo-letter">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
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
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </button>
      </li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </button>
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
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="form-wrap new-project">
      <form id="importGit" action="__BASE_PATH__/_import" method="post" class="frm-wrap">
        <legend>
          Import Git repository.
          <span>
            <small>Or &nbsp; </small>
            <a href="__BASE_PATH__/projectform?owner=admin" class="ybtn ybtn-small nm"><strong>Create new project</strong></a>
          </span>
        </legend>
        <dl>
          <dt><label for="url">Git repository URL<strong class="orange-txt">*</strong></label></dt>
          <dd><input id="url" type="text" name="url" class="text" placeholder="Please type the Git repository URL. E.g. https://github.com/doortts/Yoram.git" value=""></dd>
          <dd>
            <label class="checkbox"><input type="checkbox" id="useRepoAuth">Requires authorization</label>
            <div id="repoAuth" class="repo-auth-wrap">
              <div class="row-fluid">
                <dl class="span6">
                  <dt>Access ID</dt>
                  <dd><input type="text" name="authId" class="text" value="" placeholder="Entered information will not be stored anywhere."></dd>
                </dl>
                <dl class="span6">
                  <dt>Access Password</dt>
                  <dd><input type="password" name="authPw" class="text"></dd>
                </dl>
              </div>
            </div>
          </dd>
          <dt class="bordertop"><label for="project-owner">Owner Name<strong class="orange-txt">*</strong></label></dt>
          <dd>
            <div class="select2-container mb10"><button type="button" class="select2-choice"><span class="select2-chosen"><span class="usf-group" title="admin "><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-128.png" width="20" height="20"></span><strong class="name">admin</strong><span class="loginid"></span></span></span><span class="select2-arrow"><b></b></span></button><input class="select2-focusser select2-offscreen" type="text"><div class="select2-drop select2-with-searchbox select2-display-none"><div class="select2-search"><input type="text" class="select2-input"></div><ul class="select2-results"><li><button type="button">admin</button></li><li><button type="button">weblabs</button></li></ul></div></div>
            <select id="project-owner" name="owner" data-format="user" class="mb10 select2-offscreen" tabindex="-1">
              <option value="admin">admin</option>
              <option value="weblabs">weblabs</option>
            </select>
          </dd>
          <dt><label for="project-name">Project name<strong class="orange-txt">*</strong></label></dt>
          <dd><input id="project-name" type="text" name="name" class="text" maxlength="250" value="" placeholder="Enter name in alphabetnumerical or symbol characters(_-.)"></dd>
          <dt><label for="description">Description</label></dt>
          <dd><textarea id="description" name="overview" class="text textarea.span4"></textarea></dd>
        </dl>
        <div class="advanced-options">
          <div class="row-fluid">
            <div class="span2 right-txt mt10">Share Options</div>
            <div class="span10">
              <ul class="unstyled project-scopes mt10">
                <li>
                  <input type="radio" id="public" name="projectScope" value="PUBLIC" class="radio-btn pull-left" checked="">
                  <label for="public"><strong class="ml5">PUBLIC</strong><p class="note">Anonymous users are able to access the project.</p></label>
                </li>
                <li id="opt-protected" class="mt10">
                  <input type="radio" id="protected" name="projectScope" value="PROTECTED" class="radio-btn pull-left">
                  <label for="protected"><strong class="ml5">GROUP PUBLIC</strong><p class="note">Users in the group and also users who have been explicitly granted access are able to access the project.</p></label>
                </li>
                <li class="mt10">
                  <input type="radio" id="private" name="projectScope" value="PRIVATE" class="radio-btn pull-left">
                  <label for="private"><strong class="ml5">PRIVATE</strong><p class="note">Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.</p></label>
                </li>
              </ul>
            </div>
          </div>
          <hr>
          <div class="row-fluid">
            <div class="span2 right-txt mt10"><label for="vcs">Repository type</label></div>
            <div class="span10 cu-desc">
              <div class="select2-container select2-container-disabled mb10 mt5"><button type="button" class="select2-choice" disabled><span class="select2-chosen">Git</span><span class="select2-arrow"><b></b></span></button><input class="select2-focusser select2-offscreen" type="text" disabled><div class="select2-drop select2-display-none select2-with-searchbox"><div class="select2-search"><input class="select2-input" type="text" disabled></div><ul class="select2-results"></ul></div></div>
              <select class="mb10 mt5 select2-offscreen" disabled="" tabindex="-1">
                <option>Git</option>
              </select>
              <input type="hidden" name="vcs" value="GIT">
            </div>
          </div>
          <hr>
          <div class="row-fluid">
            <div class="span2 right-txt">Menu Setting</div>
            <div class="span10 cu-desc">
              <label for="menuSettingCode" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingCode" name="code" value="true" checked="">Code</label>
              <label for="menuSettingIssue" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingIssue" name="issue" value="true" checked="">Issue</label>
              <label for="menuSettingPullRequest" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingPullRequest" name="pullRequest" value="true" checked="">Pull request</label>
              <label for="menuSettingReview" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingReview" name="review" value="true" checked="">Review</label>
              <label for="menuSettingMilestone" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingMilestone" name="milestone" value="true" checked="">Milestone</label>
              <label for="menuSettingBoard" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingBoard" name="board" value="true" checked="">Board</label>
            </div>
          </div>
        </div>
        <div class="actions mt20">
          <button class="ybtn ybtn-primary">Create a project</button>
          <a href="__CANCEL_ROOT_HREF__" class="ybtn">Cancel</a>
        </div>
      </form>
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

test("project import form matches legacy project/importing.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectImport(page);

  await page.goto(`${basePath}/_import?owner=admin`);
  await expect(page).toHaveTitle("Create new project");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "Create new project",
  );
  await expect(page.locator("#importGit")).toBeVisible();
  await expect(page.locator("#repoAuth .span6")).toHaveCount(2);
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#project-owner")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#project-owner")).toHaveClass("mb10 select2-offscreen");
  await expect(page.locator("#project-owner")).toHaveAttribute("tabindex", "-1");
  await expect(
    page.locator("#project-owner").locator("xpath=preceding-sibling::div[1]"),
  ).toHaveClass(/select2-container/);
  await expect(page.locator("#project-owner")).toHaveAttribute("data-format", "user");
  await expect(page.locator("#project-owner option[value='admin']")).toHaveText("admin");
  await expect(page.locator("#project-owner option[value='admin']")).not.toHaveAttribute(
    "data-type",
    /.*/u,
  );
  await expect(page.locator("#project-owner option[value='admin']")).not.toHaveAttribute(
    "data-avatar-url",
    /.*/u,
  );
  const vcsSelect = page.locator(".advanced-options .cu-desc select.mb10.mt5");
  await expect(vcsSelect).toBeDisabled();
  await expect(vcsSelect).toHaveClass("mb10 mt5 select2-offscreen");
  await expect(vcsSelect).not.toHaveAttribute("data-toggle", "select2");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_IMPORT.slice(
        EXPECTED_PROJECT_IMPORT.indexOf('<div class="page-wrap-outer">'),
        EXPECTED_PROJECT_IMPORT.indexOf('<footer class="page-footer-outer">'),
      )
        .replaceAll("__BASE_ROOT__", rootHref(basePath))
        .replaceAll("__BASE_PATH__", basePath)
        .replaceAll("__CANCEL_ROOT_HREF__", routerRootHref(basePath)),
    ),
  );
  expect(await importFormMetrics(page)).toEqual({
    actionsTextAlign: "center",
    advancedBackground: "rgb(250, 250, 250)",
    advancedBorderRadius: 10,
    advancedPaddingBlock: 20,
    formMarginBlock: 60,
    formPosition: "relative",
    formWidth: 700,
    repoAuthBackground: "rgb(250, 250, 250)",
    repoAuthDisplay: "none",
    repoAuthPaddingInline: 50,
    textInputWidthRatio: 0.98,
  });
});

test("project import form mirrors legacy auth, owner, and menu dependencies", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectImport(page);

  await page.goto(`${basePath}/_import?owner=admin`);

  await expect(page.locator("#repoAuth")).toBeHidden();
  await expect(page.locator("#project-owner")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#project-owner")).toHaveAttribute("data-format", "user");
  await expect(page.locator("#project-owner option[value='weblabs']")).toHaveText("weblabs");
  await expect(page.locator("#project-owner option[value='weblabs']")).not.toHaveAttribute(
    "data-type",
    /.*/u,
  );
  await expect(page.locator("#project-owner option[value='weblabs']")).not.toHaveAttribute(
    "data-avatar-url",
    /.*/u,
  );
  const vcsSelect = page.locator(".advanced-options .cu-desc select.mb10.mt5");
  await expect(vcsSelect).toBeDisabled();
  await expect(vcsSelect).not.toHaveAttribute("data-toggle", "select2");
  await page.locator("#importGit .actions button.ybtn-primary").click();
  await expect(page.locator("#url + .popover .popover-content")).toHaveText(
    "Please type the Git repository URL.",
  );
  await expect(page.locator("#project-name + .popover .popover-content")).toHaveText(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  await page.locator("#useRepoAuth").check();
  await expect(page.locator("#url + .popover")).toHaveCount(0);
  await expect(page.locator("#project-name + .popover")).toHaveCount(0);
  await expect(page.locator("#repoAuth")).toBeVisible();
  await expect(page.locator("#repoAuth input[name='authId']")).toBeEnabled();
  await expect(page.locator("#repoAuth input[name='authPw']")).toBeEnabled();
  const repoAuthBoxes = await page.evaluate(() => {
    const form = document.querySelector("#importGit");
    const checkbox = document.querySelector("label.checkbox");
    const repoAuth = document.querySelector("#repoAuth");
    if (!form || !checkbox || !repoAuth) return null;
    const f = form.getBoundingClientRect();
    const c = checkbox.getBoundingClientRect();
    const r = repoAuth.getBoundingClientRect();
    return {
      checkboxBottom: c.bottom,
      formLeft: f.left,
      formRight: f.right,
      repoAuthBottom: r.bottom,
      repoAuthLeft: r.left,
      repoAuthRight: r.right,
      repoAuthTop: r.top,
    };
  });
  expect(repoAuthBoxes).not.toBeNull();
  expect(repoAuthBoxes!.repoAuthTop).toBeGreaterThanOrEqual(repoAuthBoxes!.checkboxBottom);
  expect(repoAuthBoxes!.repoAuthLeft).toBeGreaterThanOrEqual(repoAuthBoxes!.formLeft);
  expect(repoAuthBoxes!.repoAuthRight).toBeLessThanOrEqual(repoAuthBoxes!.formRight);
  expect(repoAuthBoxes!.repoAuthBottom).toBeGreaterThan(repoAuthBoxes!.repoAuthTop);
  await page.locator("#useRepoAuth").uncheck();
  await expect(page.locator("#repoAuth")).toBeHidden();
  await expect(page.locator("#repoAuth input[name='authId']")).toBeDisabled();
  await expect(page.locator("#repoAuth input[name='authPw']")).toBeDisabled();

  await page.locator("#project-owner").selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await page.locator("#protected").check();
  await page.locator("#project-owner").selectOption("admin");
  await expect(page.locator("#opt-protected")).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();

  await page.locator("#menuSettingReview").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
});

test("project import renders React-owned legacy Select2 composition and owner behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectImport(page);
  await page.goto(`${basePath}/_import?owner=admin`);

  const ownerContainer = page.locator("#project-owner").locator("xpath=preceding-sibling::div[1]");
  await expect(ownerContainer).toHaveClass("select2-container mb10");
  await expect(ownerContainer).toHaveCSS("width", "220px");
  await expect(ownerContainer.locator(".select2-chosen .name")).toHaveText("admin");
  await expect(ownerContainer.locator(".select2-focusser")).toHaveCount(1);
  await expect(ownerContainer.locator(".select2-search .select2-input")).toHaveCount(1);
  await ownerContainer.locator("button.select2-choice").click();
  await expect(ownerContainer).toHaveClass(/select2-container-active/);
  await expect(ownerContainer.locator(".select2-drop")).toHaveClass(/select2-drop-active/);
  await expect(ownerContainer.locator(".select2-drop")).toBeVisible();
  await expect(ownerContainer.locator(".select2-result-label .usf-group")).toHaveCount(2);
  await expect(ownerContainer.locator(".select2-result-label img")).toHaveCount(2);
  const resultGeometry = await ownerContainer
    .locator(".select2-result-label")
    .evaluateAll((labels) =>
      labels.map((label) => {
        const item = label.parentElement;
        if (!item) throw new Error("Select2 result item is missing");
        const labelBox = label.getBoundingClientRect();
        const itemBox = item.getBoundingClientRect();
        return {
          itemClientWidth: item.clientWidth,
          itemLeft: itemBox.left,
          labelLeft: labelBox.left,
          labelRight: labelBox.right,
          labelWidth: labelBox.width,
        };
      }),
    );
  for (const geometry of resultGeometry) {
    expect(geometry.labelLeft).toBeCloseTo(geometry.itemLeft, 1);
    expect(geometry.labelWidth).toBeCloseTo(geometry.itemClientWidth, 1);
    expect(geometry.labelRight).toBeCloseTo(geometry.itemLeft + geometry.itemClientWidth, 1);
  }
  for (const label of await ownerContainer.locator(".select2-result-label").all()) {
    await expect(label).toHaveCSS("text-align", "left");
    await expect(label).toHaveCSS("font-size", "13px");
  }
  await ownerContainer.locator(".select2-results button", { hasText: "weblabs" }).click();
  await expect(page.locator("#project-owner")).toHaveValue("weblabs");
  await expect(ownerContainer.locator(".select2-chosen .name")).toHaveText("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();

  const vcs = page.locator(".advanced-options .select2-container-disabled");
  await expect(vcs).toHaveCSS("width", "220px");
  await expect(vcs.locator(".select2-chosen")).toHaveText("Git");
  await expect(vcs.locator("button.select2-choice")).toBeDisabled();
  await expect(vcs.locator(".select2-focusser")).toBeDisabled();

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const boxes = await page.evaluate(() => {
      const form = document.querySelector("#importGit")?.getBoundingClientRect();
      const owner = document
        .querySelector("#project-owner")
        ?.previousElementSibling?.getBoundingClientRect();
      const vcs = document.querySelector(".select2-container-disabled")?.getBoundingClientRect();
      if (!form || !owner || !vcs) return null;
      return {
        form: { left: form.left, right: form.right },
        owner: { left: owner.left, right: owner.right },
        vcs: { left: vcs.left, right: vcs.right },
      };
    });
    expect(boxes).not.toBeNull();
    expect(boxes!.owner.left).toBeGreaterThanOrEqual(boxes!.form.left);
    expect(boxes!.owner.right).toBeLessThanOrEqual(boxes!.form.right);
    expect(boxes!.vcs.left).toBeGreaterThanOrEqual(boxes!.form.left);
    expect(boxes!.vcs.right).toBeLessThanOrEqual(boxes!.form.right);
    const select2Geometry = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".select2-container")].map((container) => {
        const choice = container.querySelector<HTMLElement>(".select2-choice");
        const chosen = container.querySelector<HTMLElement>(".select2-chosen");
        const arrow = container.querySelector<HTMLElement>(".select2-arrow");
        if (!choice || !chosen || !arrow) throw new Error("Select2 choice geometry is missing");
        const choiceBox = choice.getBoundingClientRect();
        const chosenBox = chosen.getBoundingClientRect();
        const arrowBox = arrow.getBoundingClientRect();
        return {
          arrowRight: arrowBox.right,
          choiceCenter: choiceBox.left + choiceBox.width / 2,
          choiceRight: choiceBox.right,
          choiceWidth: choiceBox.width,
          chosenLeft: chosenBox.left,
          chosenWidth: chosenBox.width,
          containerClientWidth: container.clientWidth,
          choiceTextAlign: getComputedStyle(choice).textAlign,
          choiceFontSize: getComputedStyle(choice).fontSize,
          choiceLineHeight: getComputedStyle(choice).lineHeight,
          chosenFontSize: getComputedStyle(chosen).fontSize,
          chosenLineHeight: getComputedStyle(chosen).lineHeight,
          chosenTextAlign: getComputedStyle(chosen).textAlign,
        };
      }),
    );
    expect(select2Geometry).toHaveLength(2);
    for (const geometry of select2Geometry) {
      expect(geometry.choiceWidth).toBeCloseTo(geometry.containerClientWidth, 1);
      expect(geometry.chosenWidth).toBeCloseTo(180, 0);
      expect(geometry.arrowRight).toBeCloseTo(geometry.choiceRight, 1);
      expect(geometry.choiceTextAlign).toBe("left");
      expect(geometry.choiceFontSize).toBe("13px");
      expect(geometry.choiceLineHeight).toBe("26px");
      expect(geometry.chosenFontSize).toBe("13px");
      expect(geometry.chosenLineHeight).toBe("26px");
      expect(geometry.chosenTextAlign).toBe("left");
      expect(geometry.chosenLeft).toBeLessThan(geometry.choiceCenter);
    }
  }
});

test("project import form mirrors legacy project.New focus and project-name validation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let importPosts = 0;
  await mockProjectImport(page);
  await page.route("**/api/v1/projects/import", async (route) => {
    importPosts += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectPath: "/admin/imported" }),
    });
  });

  await page.goto(`${basePath}/_import?owner=admin`);
  await expect(page.locator("#url")).toBeFocused();

  await page.locator("#project-name").fill("imported project");
  await page.locator("#project-name").blur();
  await expect(page.locator("#project-name")).toHaveValue("imported-project");

  await page.locator("#url").fill("https://github.com/yona-projects/yona.git");
  await page.locator("#project-name").fill("");
  await page.locator("#importGit .actions button.ybtn-primary").click();
  await expect(page.locator("#project-name + .popover .popover-content")).toHaveText(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  await expect(page.locator("#project-name")).toHaveAttribute("aria-invalid", "true");

  await page.locator("#project-name").fill(".git");
  await page.locator("#importGit .actions button.ybtn-primary").click();
  await expect(page.locator("#project-name + .popover .popover-content")).toHaveText(
    "You can't use reserved names.",
  );
  await expect.poll(() => importPosts).toBe(0);
});

test("project import form renders legacy server auth and owner validation state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectImport(page, {
    formErrors: {
      owner: "project.owner.invalidate",
      repoAuth: "project.import.error.transport.unauthorized",
    },
    formValues: {
      authId: "deploy-bot",
      name: "restored-import",
      overview: "Restored import description",
      owner: "weblabs",
      projectScope: "PROTECTED",
      url: "https://github.com/yona-projects/yona.git",
    },
  });

  await page.goto(`${basePath}/_import?owner=admin`);

  await expect(page.locator("#useRepoAuth")).toBeChecked();
  await expect(page.locator("#repoAuth input[name='authId']")).toBeFocused();
  await expect(page.locator("#repoAuth")).toBeVisible();
  // F6 copy-fix: compile-mode style emits className only (styles.repoAuthVisible, [_]import.tsx:95,282-285) —
  // no inline --x-display var; computed display:block parity holds vs legacy importing.scala.html:44.
  const repoAuthDisplay = await page.evaluate(() => {
    const el = document.querySelector("#repoAuth");
    return el ? getComputedStyle(el).display : null;
  });
  expect(repoAuthDisplay).toBe("block");
  await expect(page.locator("#repoAuth input[name='authId']")).toHaveValue("deploy-bot");
  await expect(page.locator("#url")).toHaveValue("https://github.com/yona-projects/yona.git");
  await expect(page.locator("#project-name")).toHaveValue("restored-import");
  await expect(page.locator("#description")).toHaveValue("Restored import description");
  await expect(page.locator("#project-owner")).toHaveValue("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await expect(page.locator("#protected")).toBeChecked();
  await expect(page.locator("#project-owner + span.orange-text")).toHaveText(
    "Owner information is not valid.",
  );
  expect(
    (
      await canonicalizeElements(page, [
        "#useRepoAuth",
        "#repoAuth",
        "#project-owner",
        "#project-owner + span.orange-text",
      ])
    ).replace(/ style="[^"]*"/u, ""),
  ).toEqual(
    [
      '<input id="useRepoAuth" type="checkbox"></input>',
      '<div class="repo-auth-wrap" id="repoAuth"><div class="row-fluid"><dl class="span6"><dt>Access ID</dt><dd><input class="text" name="authId" placeholder="Entered information will not be stored anywhere." type="text" value="deploy-bot"></input></dd></dl><dl class="span6"><dt>Access Password</dt><dd><input class="text" name="authPw" type="password"></input></dd></dl></div></div>',
      '<select class="mb10 select2-offscreen" data-format="user" id="project-owner" name="owner"><option value="admin">admin</option><option value="weblabs">weblabs</option></select>',
      '<span class="orange-text">Owner information is not valid.</span>',
    ].join(""),
  );
});

test("project import form blocks empty URL submit with legacy validation copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let importPosts = 0;
  await mockProjectImport(page);
  await page.route("**/api/v1/projects/import", async (route) => {
    importPosts += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectPath: "/admin/imported" }),
    });
  });

  await page.goto(`${basePath}/_import?owner=admin`);
  await page.locator("#project-name").fill("imported-project");
  await page.locator("#url").fill("   ");
  await page.locator("#importGit .actions button.ybtn-primary").click();

  await expect(page.locator("#url + .popover .popover-content")).toHaveText(
    "Please type the Git repository URL.",
  );
  await expect(page.locator("#url")).toHaveAttribute("aria-invalid", "true");
  await expect.poll(() => importPosts).toBe(0);
});

test("project import form links preserve legacy destinations and navigate in the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectImport(page);

  await page.goto(`${basePath}/_import?owner=admin`);

  const createProjectLink = page.locator("legend a.ybtn.ybtn-small.nm");
  await expect(createProjectLink).toHaveText("Create new project");
  await expect(createProjectLink).toHaveAttribute("href", `${basePath}/projectform?owner=admin`);
  await expect(createProjectLink).toHaveClass("ybtn ybtn-small nm");
  await expect(createProjectLink).not.toHaveAttribute("title", /.*/u);
  await expect(createProjectLink).not.toHaveAttribute("aria-current", /.*/u);
  await expect(createProjectLink).not.toHaveAttribute("data-status", /.*/u);

  await page.evaluate(() => {
    (window as Window & { __projectImportSpaMarker?: string }).__projectImportSpaMarker = "alive";
  });
  await createProjectLink.click();
  await page.waitForURL(
    (url) =>
      url.pathname === `${basePath}/projectform` && url.searchParams.get("owner") === "admin",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectImportSpaMarker?: string }).__projectImportSpaMarker,
      ),
    )
    .toBe("alive");

  await page.goto(`${basePath}/_import?owner=admin`);

  const cancelLink = page.locator("#importGit .actions a.ybtn");
  await expect(cancelLink).toHaveText("Cancel");
  await expect(cancelLink).toHaveAttribute("href", routerRootHref(basePath));
  await expect(await cancelLink.getAttribute("href")).toBe(routerRootHref(basePath));
  await expect(cancelLink).toHaveClass("ybtn");
  await expect(cancelLink).not.toHaveAttribute("title", /.*/u);
  await expect(cancelLink).not.toHaveAttribute("aria-current", /.*/u);
  await expect(cancelLink).not.toHaveAttribute("data-status", /.*/u);

  await page.evaluate(() => {
    (window as Window & { __projectImportSpaMarker?: string }).__projectImportSpaMarker = "alive";
  });
  await cancelLink.click();
  await page.waitForURL((url) => url.pathname === routerRootHref(basePath));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectImportSpaMarker?: string }).__projectImportSpaMarker,
      ),
    )
    .toBe("alive");
  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(routerRootHref(basePath));
});

test("project import form navigation links use TanStack Router Link in route source", () => {
  const routeSource = readFileSync(PROJECT_IMPORT_ROUTE_SOURCE, "utf8");

  expect(routeSource).toContain("import { Link, createFileRoute, useRouter }");
  expect(routeSource).toContain('<title>{t("title.newProject")}</title>');
  expect(routeSource).toContain("const legacyImportActionLinkActiveOptions =");
  expect(routeSource).toContain("const legacyImportActionLinkActiveProps =");
  expect(routeSource).not.toContain("const cancelHref =");
  expect(routeSource).toContain('<Link\n                  to="/"');
  expect(routeSource).not.toContain("href={cancelHref}");
  expect(routeSource).toContain("activeOptions={legacyImportActionLinkActiveOptions}");
  expect(routeSource).toContain("activeProps={legacyImportActionLinkActiveProps}");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('<Link\n                    to="/projectform"');
  expect(routeSource).toContain("<option key={option.ownerName} value={option.ownerName}>");
  expect(routeSource).not.toContain("data-type={");
  expect(routeSource).not.toContain("data-avatar-url={");
  expect(routeSource).not.toContain('data-toggle="select2"');
  expect(routeSource).not.toContain('data-toggle={"select2"}');
  expect(routeSource).not.toContain('dataToggle="select2"');
  expect(routeSource).not.toContain("data-toggle='select2'");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("reactJsx");
  expect(routeSource).not.toContain("useLinkProps");
  expect(routeSource).not.toContain("LegacyRootLinkAnchor");
  expect(routeSource).not.toContain("LegacyRootLink");
  expect(routeSource).not.toContain("LegacyHrefAnchor");
  expect(routeSource).not.toContain("LegacyHrefLink");
  expect(routeSource).not.toContain("React.createElement");
  expect(routeSource).not.toContain("jsx as reactJsx");
  expect(routeSource).not.toContain('reactJsx("a"');
  expect(routeSource).not.toContain("router.history.push(cancelHref);");
  expect(routeSource).not.toMatch(/<a\b/);
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain("window.document");
  expect(routeSource).not.toMatch(/use(?:Layout)?Effect\s*\([^)]*title/iu);
  expect(routeSource).not.toMatch(/title\s*=\s*["'`]Create new project/iu);
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
});

async function mockProjectImport(
  page: Page,
  initialState: {
    formErrors?: Record<string, string>;
    formValues?: Record<string, string>;
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
  await page.route("**/api/v1/projects/form-options*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
        ...initialState,
      }),
    });
  });
}

function rootHref(basePath: string) {
  return basePath === "/" ? "/" : basePath;
}

function routerRootHref(basePath: string) {
  return basePath === "/" ? "/" : `${basePath}/`;
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".page-wrap-outer"));
    return roots.map((root) => visit(root)).join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "maxlength",
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "style",
        "checked",
        "disabled",
        "data-format",
        "data-type",
        "data-avatar-url",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "style" && current.matches(".select2-choice, .select2-result-label")),
        )
        .map((name) => {
          const value = current.getAttribute(name) ?? "";
          const normalized =
            name === "style"
              ? value.replace(/\s+/g, "").replace(/;$/u, "")
              : name === "class"
                ? value
                    .split(/\s+/u)
                    .filter(
                      (token) =>
                        token &&
                        token !== "gray-txt" &&
                        token !== "orange-txt" &&
                        token !== "right-txt" &&
                        !/^x[0-9a-z]+$/u.test(token) &&
                        !token.includes("__"),
                    )
                    .sort()
                    .join(" ")
                : value;
          return [name, normalized] as const;
        })
        .filter(([name, normalized]) => !(name === "class" && normalized === ""))
        .map(([name, normalized]) => `${name}=${JSON.stringify(normalized)}`)
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.matches(".select2-results") ? [] : current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  });
}

async function canonicalizeElements(page: Page, selectors: string[]) {
  return page.evaluate((targetSelectors) => {
    return targetSelectors
      .map((selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          throw new Error(`Missing ${selector}`);
        }
        return visit(element);
      })
      .join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "maxlength",
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "style",
        "checked",
        "disabled",
        "data-format",
        "data-type",
        "data-avatar-url",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "style" && current.matches(".select2-choice, .select2-result-label")),
        )
        .map((name) => {
          const value = current.getAttribute(name) ?? "";
          const normalized =
            name === "style"
              ? value.replace(/\s+/g, "").replace(/;$/u, "")
              : name === "class"
                ? value
                    .split(/\s+/u)
                    .filter(
                      (token) =>
                        token &&
                        token !== "gray-txt" &&
                        token !== "orange-txt" &&
                        token !== "right-txt" &&
                        !/^x[0-9a-z]+$/u.test(token) &&
                        !token.includes("__"),
                    )
                    .sort()
                    .join(" ")
                : value;
          return [name, normalized] as const;
        })
        .filter(([name, normalized]) => !(name === "class" && normalized === ""))
        .map(([name, normalized]) => `${name}=${JSON.stringify(normalized)}`)
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.matches(".select2-results") ? [] : current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  }, selectors);
}

async function importFormMetrics(page: Page) {
  return page.evaluate(() => {
    const formWrap = requireElement(".form-wrap.new-project");
    const formStyle = getComputedStyle(formWrap);
    const input = requireElement("#url");
    const inputStyle = getComputedStyle(input);
    const advanced = requireElement(".advanced-options");
    const advancedStyle = getComputedStyle(advanced);
    const repoAuth = requireElement("#repoAuth");
    const repoAuthStyle = getComputedStyle(repoAuth);
    const actions = requireElement(".actions.mt20");
    const actionsStyle = getComputedStyle(actions);

    return {
      actionsTextAlign: actionsStyle.textAlign,
      advancedBackground: advancedStyle.backgroundColor,
      advancedBorderRadius: Math.round(parseFloat(advancedStyle.borderTopLeftRadius)),
      advancedPaddingBlock:
        Math.round(parseFloat(advancedStyle.paddingTop)) +
        Math.round(parseFloat(advancedStyle.paddingBottom)),
      formMarginBlock:
        Math.round(parseFloat(formStyle.marginTop)) +
        Math.round(parseFloat(formStyle.marginBottom)),
      formPosition: formStyle.position,
      formWidth: Math.round(formWrap.getBoundingClientRect().width),
      repoAuthBackground: repoAuthStyle.backgroundColor,
      repoAuthDisplay: repoAuthStyle.display,
      repoAuthPaddingInline:
        Math.round(parseFloat(repoAuthStyle.paddingLeft)) +
        Math.round(parseFloat(repoAuthStyle.paddingRight)),
      textInputWidthRatio: Number((parseFloat(inputStyle.width) / 700).toFixed(2)),
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
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "maxlength",
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "style",
        "checked",
        "disabled",
        "data-format",
        "data-type",
        "data-avatar-url",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "style" && current.matches(".select2-choice, .select2-result-label")),
        )
        .map((name) => {
          const value = current.getAttribute(name) ?? "";
          const normalized =
            name === "style"
              ? value.replace(/\s+/g, "").replace(/;$/u, "")
              : name === "class"
                ? value
                    .split(/\s+/u)
                    .filter(
                      (token) =>
                        token &&
                        token !== "gray-txt" &&
                        token !== "orange-txt" &&
                        token !== "right-txt" &&
                        !/^x[0-9a-z]+$/u.test(token) &&
                        !token.includes("__"),
                    )
                    .sort()
                    .join(" ")
                : value;
          return [name, normalized] as const;
        })
        .filter(([name, normalized]) => !(name === "class" && normalized === ""))
        .map(([name, normalized]) => `${name}=${JSON.stringify(normalized)}`)
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.matches(".select2-results") ? [] : current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  }, html);
}
