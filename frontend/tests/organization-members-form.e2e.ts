import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ORGANIZATION_MEMBERS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform">Setting</a></li><li class="active"><a href="__BASE_PATH__/organizations/weblabs/members">Group member</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/deleteForm">Group Delete</a></li></ul><div class="inner-bubble"><form class="nm" action="__BASE_PATH__/organizations/weblabs/members" method="post" id="addNewMember"><input type="text" class="text uname" id="loginId" name="loginId" required="required" data-provider="typeahead" autocomplete="off" placeholder="Add new member ID." pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$" title="Enter Valid ID"><button type="submit" class="ybtn ybtn-success"><i class="yobicon-addfriend"></i> Add</button></form></div><ul class="members project row-fluid"><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-64.png" width="64" height="64"></a><div class="member-name">Site Admin</div><div class="member-id">@admin</div><div class="member-setting"><div class="btn-group" data-name="roleof-admin"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">Group Manager</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="org_admin" data-selected="true" class="active"><a href="javascript:void(0)" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/members/1" data-loginId="admin">Group Manager</a></li><li data-value="org_member"><a href="javascript:void(0)" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/members/1" data-loginId="admin">Group Member</a></li></ul></div><a href="javascript:void(0)" data-action="delete" data-href="__BASE_PATH__/organizations/weblabs/members/1" class="ybtn ybtn-danger ybtn-small">Delete</a></div></li><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-64.png" width="64" height="64"></a><div class="member-name">Dev Member</div><div class="member-id">@dev</div><div class="member-setting"><div class="btn-group" data-name="roleof-dev"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">Group Member</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="org_admin"><a href="javascript:void(0)" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/members/2" data-loginId="dev">Group Manager</a></li><li data-value="org_member" data-selected="true" class="active"><a href="javascript:void(0)" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/members/2" data-loginId="dev">Group Member</a></li></ul></div><a href="javascript:void(0)" data-action="delete" data-href="__BASE_PATH__/organizations/weblabs/members/2" class="ybtn ybtn-danger ybtn-small">Delete</a></div></li></ul><div id="alertDeletion" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete a group member</h3></div><div class="modal-body"><p>Are you sure this user should leave this group?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="deleteBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div><legend><h3>Sign-up request(1)</h3></legend><div class="row-fluid"><div class="span2"><div class="pull-left mr10"><a href="__BASE_PATH__/pending"><img src="/assets/images/default-avatar-64.png" height="65" width="65" class="img-circle"></a></div><div class="pull-left" style="width: 60px;"><span><a href="__BASE_PATH__/pending"><strong>Pending User</strong></a></span><span>(pending)</span><button type="button" class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn" data-loginId="pending"><i class="yobicon-addfriend"></i>Add</button></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("organization members matches legacy organization/members.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".members.project .member")).toHaveCount(2);
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_MEMBERS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockOrganizationMembers(page: Page) {
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
  await page.route("**/api/v1/organizations/weblabs/admin", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        deleteAllowed: true,
        enrollmentRequests: [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "pending",
            userId: 3,
            userLabel: "Pending User",
          },
        ],
        id: 42,
        logoUrl: "/assets/images/organization_default_logo.png",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "admin",
            role: "org_admin",
            userId: 1,
            userLabel: "Site Admin",
          },
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "dev",
            role: "org_member",
            userId: 2,
            userLabel: "Dev Member",
          },
        ],
        organizationName: "weblabs",
        roleOptions: [
          { label: "Group Manager", role: "org_admin" },
          { label: "Group Member", role: "org_member" },
        ],
        viewerCanUpdate: true,
      }),
    });
  });
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
      if (attr.name === "required") {
        return "required";
      }
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
      if (attr.name === "required") {
        return "required";
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
