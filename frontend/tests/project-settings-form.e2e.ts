import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_SETTINGS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class="active"><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/labels">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="saveSetting" method="post" action="__BASE_PATH__/admin/sample/setting" enctype="multipart/form-data" class="nm"><div class="bubble-wrap gray" style="overflow: visible"><input type="hidden" name="id" value="7"><input type="hidden" name="watchingCount" value="5"><div class="box-wrap top clearfix frm-wrap" style="padding-top:20px;"><div class="setting-box left"><div class="logo-wrap" style="background-image:url('/assets/images/project_default_logo.png')"></div><div class="logo-desc"><ul class="unstyled descs"><li><strong>Project logo</strong></li><li>File type: bmp, jpg, gif, png <span class="point">bmp, jpg, gif, png</span></li><li>Maximum file size <span class="point">5MB</span></li><li><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i>File upload<input id="logoPath" type="file" class="file" name="logoPath" accept="image/*"></div></div></li></ul></div></div><dl class="setting-box right"><dt><label for="project-name">Enter project name in alphabetnumerical or symbol characters(_-.)</label></dt><dd><input id="project-name" type="text" name="name" data-trigger="focus" data-content="Also, previous links are available. After changing, during the first 24 hours, you can rename or transfer freely as many times as you want without breaking previous links. The previous URL will be fixed and preserved for 24 hours." data-placement="left" maxlength="250" value="sample"><br></dd><dt><label for="project-desc">Enter project description</label></dt><dd><textarea id="project-desc" name="overview" maxlength="250" class="textarea">Sample overview</textarea></dd></dl></div><div class="box-wrap middle"><div class="cu-label">Share Options</div><div class="cu-desc"><input name="projectScope" type="radio" class="radio-btn" id="public" value="PUBLIC" checked><label for="public" class="bg-radiobtn label-public">PUBLIC</label><input name="projectScope" type="radio" class="radio-btn" id="private" value="PRIVATE"><label for="private" class="bg-radiobtn label-private">PRIVATE</label><span class="note">Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.</span></div></div><div class="box-wrap middle"><div class="cu-label">Issue Template</div><div class="cu-desc"><a href="__BASE_PATH__/admin/sample/postform?issueTemplate=true" class="ybtn" target="_blank">Edit</a></div></div><div class="box-wrap middle"><div class="cu-label">Only project members can access code or related menus</div><div class="cu-desc"><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleMemberOnly" class="radio-btn" value="true"><label for="codeAccessibleMemberOnly" class="bg-radiobtn label-public">Yes</label><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleAnyone" class="radio-btn" value="false" checked><label for="codeAccessibleAnyone" class="bg-radiobtn label-private">No</label><span class="note"></span></div></div><div class="box-wrap middle reviewer-count-wrap" id="reviewerCountSettingPanel"><div class="cu-label vmiddle">Reviewer</div><div class="cu-desc"><input name="isUsingReviewerCount" data-toggle="reviewer-count" data-action="show" type="radio" class="radio-btn" id="reviewerCountEnable" value="true" checked><label for="reviewerCountEnable" class="bg-radiobtn label-public">Enable</label><input name="isUsingReviewerCount" data-toggle="reviewer-count" data-action="hide" type="radio" class="radio-btn" id="reviewerCountDisable" value="false"><label for="reviewerCountDisable" class="bg-radiobtn label-private">Disable</label><div id="welReviewerCount" data-value="true" class="hide"><div class="btn-group branches" data-id="project-reviewer-count" data-name="defaultReviewerCount"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">2</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="1"><a>1</a></li><li data-value="2"><a>2</a></li><li data-value="3"><a>3</a></li></ul></div><span class="note ml10">of reviewers is required to merge pull request.</span></div></div></div><div class="box-wrap middle" id="defaultBranceSettingPanel"><div class="cu-label vmiddle">Default branch</div><div class="cu-desc"><select id="project-default-branch" name="defaultBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" style="min-width: 220px;"><option value="main" selected>main</option><option value="develop">develop</option></select></div></div><div class="box-wrap middle"><div class="cu-label vmiddle">Menu Setting</div><div class="cu-desc"><label for="menuSettingCode" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingCode" name="code" value="true" checked>Code</label><label for="menuSettingIssue" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingIssue" name="issue" value="true" checked>Issue</label><label for="menuSettingPullRequest" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingPullRequest" name="pullRequest" value="true" checked>Pull request</label><label for="menuSettingReview" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingReview" name="review" value="true" checked>Review</label><label for="menuSettingMilestone" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingMilestone" name="milestone" value="true" checked>Milestone</label><label for="menuSettingBoard" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingBoard" name="board" value="true" checked>Board</label></div></div></div><div class="box-wrap bottom"><button id="save" type="submit" class="ybtn ybtn-success">Save</button></div></form></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project settings matches legacy project/setting.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/setting`);
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("#project-default-branch")).toHaveValue("main");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  expect(
    await page
      .locator(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
      )
      .evaluateAll((roots) => roots.map((root) => root.className)),
  ).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "project-header-outer",
    "project-menu-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_SETTINGS.replaceAll("__BASE_PATH__", basePath)),
  );
});

async function mockProjectSettings(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectSettings()),
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
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
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
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }
  }, html);
}
