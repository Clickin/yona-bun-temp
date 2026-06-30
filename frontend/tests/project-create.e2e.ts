import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_CREATE = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
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
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
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
        <a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </a>
      </li>
      <li class="gnb-usermenu-dropdown">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </a>
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
      <form id="newProjectForm" action="__BASE_PATH__/projects" method="post" class="frm-wrap">
        <legend>
          Create new project
          <span>
            <small>Or &nbsp; </small>
            <a href="__BASE_PATH__/_import?owner=admin" class="ybtn ybtn-small nm"><strong>Import Git repository.</strong></a>
          </span>
        </legend>
        <dl>
          <dt><label for="project-owner">Owner Name<strong class="orange-txt">*</strong></label></dt>
          <dd>
            <select id="project-owner" name="owner" data-toggle="select2" data-format="user" class="mb10" style="min-width: 220px;">
              <option data-type="user" data-avatar-url="/assets/images/default-avatar-32.png" value="admin">admin</option>
              <option data-type="group" data-avatar-url="/assets/images/organization_default_logo.png" value="weblabs">weblabs</option>
            </select>
          </dd>
          <dt><label for="project-name">Project name<strong class="orange-txt">*</strong></label></dt>
          <dd><input id="project-name" type="text" name="name" class="text" maxlength="250" value="" placeholder="Enter project name in alphabetnumerical or symbol characters(_-.)"></dd>
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
                <li id="opt-protected" class="mt10" style="display: none;">
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
              <select id="vcs" name="vcs" data-toggle="select2" data-dropdown-css-class="select2-without-searchbox" class="mb10 mt5" style="min-width: 220px;">
                <option value="GIT">Git</option>
                <option value="SUBVERSION">Subversion</option>
              </select>
              <span id="svn" class="ml10 notice" style="display: none;">Subversion can't use pull request</span>
            </div>
          </div>
          <hr>
          <div class="row-fluid">
            <div class="span2 right-txt">Menu Setting</div>
            <div class="span10">
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
          <button class="ybtn ybtn-success">Create a project</button>
          <a href="__BASE_PATH__" class="ybtn">Cancel</a>
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

test("project create form matches legacy project/create.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  await expect(page.locator("#newProjectForm")).toBeVisible();
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_CREATE.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await projectCreateMetrics(page)).toMatchObject({
    actionTextAlign: "center",
    advancedBackground: "rgb(250, 250, 250)",
    advancedBorderRadius: "10px",
    formAction: `${basePath}/projects`,
    formMethod: "post",
    formWidth: 700,
    groupAvatarUrl: "/assets/images/organization_default_logo.png",
    groupDataType: "group",
    inputWidthRatio: 0.98,
    ownerDataFormat: "user",
    ownerDataToggle: "select2",
    ownerStyle: "min-width: 220px;",
    userAvatarUrl: "/assets/images/default-avatar-32.png",
    userDataType: "user",
  });
});

async function mockProjectCreate(page: Page) {
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
      }),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
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
        "selected",
        "data-toggle",
        "data-placement",
        "data-format",
        "data-type",
        "data-avatar-url",
        "data-dropdown-css-class",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
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

async function projectCreateMetrics(page: Page) {
  return page.evaluate(() => {
    const formWrap = requireElement(".form-wrap.new-project");
    const form = requireElement<HTMLFormElement>("#newProjectForm");
    const owner = requireElement<HTMLSelectElement>("#project-owner");
    const nameInput = requireElement<HTMLInputElement>("#project-name");
    const advanced = requireElement(".advanced-options");
    const actions = requireElement(".actions");
    const userOption = owner.querySelector('option[value="admin"]');
    const groupOption = owner.querySelector('option[value="weblabs"]');
    const formWrapRect = formWrap.getBoundingClientRect();
    const nameRect = nameInput.getBoundingClientRect();
    const advancedStyle = getComputedStyle(advanced);

    return {
      actionTextAlign: getComputedStyle(actions).textAlign,
      advancedBackground: advancedStyle.backgroundColor,
      advancedBorderRadius: advancedStyle.borderTopLeftRadius,
      formAction: form.getAttribute("action"),
      formMethod: form.getAttribute("method"),
      formWidth: Math.round(formWrapRect.width),
      groupAvatarUrl: groupOption?.getAttribute("data-avatar-url"),
      groupDataType: groupOption?.getAttribute("data-type"),
      inputWidthRatio: Number((nameRect.width / formWrapRect.width).toFixed(2)),
      ownerDataFormat: owner.getAttribute("data-format"),
      ownerDataToggle: owner.getAttribute("data-toggle"),
      ownerStyle: owner.getAttribute("style"),
      userAvatarUrl: userOption?.getAttribute("data-avatar-url"),
      userDataType: userOption?.getAttribute("data-type"),
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
        "selected",
        "data-toggle",
        "data-placement",
        "data-format",
        "data-type",
        "data-avatar-url",
        "data-dropdown-css-class",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
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
