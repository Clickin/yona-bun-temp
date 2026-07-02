import { expect, test, type Page } from "@playwright/test";

const EXPECTED_USER_PROFILE_SETTINGS_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div>
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner"><h3>Account</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs mt20">
      <li class="active"><a href="__BASE_PATH__/user/editform">Edit profile</a></li>
      <li><a href="__BASE_PATH__/user/editform/password">Change password</a></li>
      <li><a href="__BASE_PATH__/user/editform/notifications">Notification settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/emails">Email settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/token">User Token</a></li>
    </ul>
    <form id="frmBasic" method="post" action="__BASE_PATH__/user/edit" class="pull-left">
      <dl>
        <dt>Login ID</dt>
        <dd class="mt10"><input type="text" class="text" value="admin" readonly=""></dd>
        <dt>Name</dt>
        <dd class="mt10"><input type="text" name="name" class="text" value="Admin User"></dd>
        <dt>Email address</dt>
        <dd class="mt10"><input type="email" name="email" class="text" value="admin@example.com"></dd>
        <dd><button type="submit" class="ybtn ybtn-success">Edit profile</button></dd>
      </dl>
    </form>
    <form id="frmAvatar" method="post" action="__BASE_PATH__/user/edit" class="pull-left">
      <input type="hidden" name="name" value="Admin User">
      <input type="hidden" name="email" value="admin@example.com">
      <div class="avatar-frm">
        <div class="avatar-wrap xlarge"><img src="/assets/images/default-avatar-128.png"></div>
        <div class="upload-progress avatar"><div class="bar orange"></div></div>
        <div class="btn-wrap mt10 center-txt"><div class="ybtn ybtn-small fake-file-wrap btnUploadAvatar">Change avatar<input id="avatarFile" type="file" class="file" name="filePath" accept="image/*"></div></div>
      </div>
    </form>
    <div class="reset-user-visited-list">
      <hr>
      <form method="post" action="__BASE_PATH__/user/resetVisitedList"><button type="submit" class="ybtn">Reset recently visited project list</button></form>
    </div>
    <div id="avatarCropWrap" class="modal hide" role="dialog" data-backdrop="static">
      <div class="modal-header center-txt"><div class="avatar-wrap xlarge"><img></div></div>
      <div class="modal-body"><img><canvas width="128" height="128" class="hide"></canvas></div>
      <div class="modal-footer"><button type="button" class="ybtn ybtn-default" data-dismiss="modal">Cancel</button><button type="button" class="ybtn ybtn-success btnSubmitCrop">Save</button></div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;

test("current-user profile settings page matches legacy user/edit.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ csrfToken: "csrf-token" }),
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });
  await page.route("**/api/v1/workspace/profile", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({
      avatarAttachmentId: "",
      email: "changed@example.com",
      name: "Changed User",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(workspaceBody({ email: "changed@example.com", name: "Changed User" })),
    });
  });
  await page.route("**/api/v1/workspace/recent-projects", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });

  await page.goto(`${basePath}/user/editform`);
  await expect(page.locator("#frmBasic")).toBeAttached();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_PROFILE_SETTINGS_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readProfileSettingsMetrics(page)).toEqual({
    avatarFormFloat: "left",
    avatarWrapWidth: "128px",
    breadcrumbHeight: "46px",
    formFloat: "left",
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
  });

  await expect(page.locator('.nav-tabs a:has-text("Change password")')).toHaveAttribute(
    "href",
    `${basePath}/user/editform/password`,
  );
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "profile-password-tab";
  });
  await page.locator('.nav-tabs a:has-text("Change password")').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("profile-password-tab");

  await page.goto(`${basePath}/user/editform`);
  await page.locator('#frmBasic input[name="name"]').fill("Changed User");
  await page.locator('#frmBasic input[name="email"]').fill("changed@example.com");
  await page.locator("#frmBasic button[type=submit]").click();
  await expect(page.locator('#frmBasic input[name="name"]')).toHaveValue("Changed User");

  await page.locator(".reset-user-visited-list button[type=submit]").click();
});

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
}

function workspaceBody(input: { email?: string; name?: string } = {}) {
  return {
    apiToken: "token-before",
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      connectedSocialProviders: [],
      displayName: input.name ?? "Admin User",
      englishName: "",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: true,
      loginId: "admin",
      primaryEmailAddress: input.email ?? "admin@example.com",
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [],
  };
}

async function readProfileSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(".site-breadcrumb-outer");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(".nav-tabs.mt20");
    const form = document.querySelector<HTMLElement>("#frmBasic");
    const avatarForm = document.querySelector<HTMLElement>("#frmAvatar");
    const avatarWrap = document.querySelector<HTMLElement>("#frmAvatar .avatar-wrap.xlarge");
    if (!breadcrumb || !pageWrapOuter || !nav || !form || !avatarForm || !avatarWrap) {
      throw new Error("Expected user profile settings metric targets are missing.");
    }
    return {
      avatarFormFloat: getComputedStyle(avatarForm).float,
      avatarWrapWidth: getComputedStyle(avatarWrap).width,
      breadcrumbHeight: getComputedStyle(breadcrumb).height,
      formFloat: getComputedStyle(form).float,
      navMarginTop: getComputedStyle(nav).marginTop,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "readonly",
        "accept",
        "width",
        "height",
        "role",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-backdrop",
        "data-dismiss",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      if (current.id === "usermenu-tab-content-list") {
        return `${open}Loading...</${current.tagName.toLowerCase()}>`;
      }
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
    function normalizeAttribute(current: Element, name: string) {
      if (
        name === "class" &&
        current.tagName.toLowerCase() === "a" &&
        current.closest(".page-wrap .nav-tabs")
      ) {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value) => value && value !== "active")
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    return Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
    )
      .map((root) => visit(root))
      .join("");
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "value",
          "readonly",
          "accept",
          "width",
          "height",
          "role",
          "autocomplete",
          "accesskey",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-backdrop",
          "data-dismiss",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
          .join(" ");
        const open = attrs
          ? `<${current.tagName.toLowerCase()} ${attrs}>`
          : `<${current.tagName.toLowerCase()}>`;
        if (current.id === "usermenu-tab-content-list") {
          return `${open}Loading...</${current.tagName.toLowerCase()}>`;
        }
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
      function normalizeAttribute(current: Element, name: string) {
        if (
          name === "class" &&
          current.tagName.toLowerCase() === "a" &&
          current.closest(".page-wrap .nav-tabs")
        ) {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter((value) => value && value !== "active")
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
