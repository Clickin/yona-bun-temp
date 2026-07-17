import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const USER_PROFILE_SETTINGS_ROUTE_SOURCE = readFileSync("src/routes/user/editform.tsx", "utf8");

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
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" title="Site administration" data-placement="bottom"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
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
      <div class="modal-footer"><button type="button" class="ybtn ybtn-default">Cancel</button><button type="button" class="ybtn ybtn-success btnSubmitCrop">Save</button></div>
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
  const profileUpdates: Array<Record<string, unknown>> = [];
  const fileUploads: string[] = [];
  await page.route("**/api/v1/workspace/profile", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    profileUpdates.push(body);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        workspaceBody({
          avatarUrl: body.avatarAttachmentId === "77" ? "/files/77" : undefined,
          email: typeof body.email === "string" ? body.email : undefined,
          name: typeof body.name === "string" ? body.name : undefined,
        }),
      ),
    });
  });
  await page.route("**/files", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(route.request().postDataBuffer()?.toString()).toContain('name="filePath"');
    fileUploads.push(route.request().postDataBuffer()?.toString() ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 77,
        mimeType: "image/png",
        name: "avatar.png",
        size: 128,
        url: "/files/77",
      }),
    });
  });
  await page.route("**/api/v1/workspace/recent-projects", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });

  await page.goto(`${basePath}/user/editform`);
  await expect(page.locator("#frmBasic")).toBeAttached();
  await expect(page).toHaveTitle("admin");
  expect(await firstHeadTitleText(page)).toBe("admin");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_PROFILE_SETTINGS_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);
  await expect(page.locator("#frmAvatar .avatar-wrap.xlarge > img")).not.toHaveAttribute(
    "alt",
    /.*/,
  );
  await expect(
    page.locator("#avatarCropWrap .modal-header .avatar-wrap > img"),
  ).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator("#avatarCropWrap .modal-body > img")).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator("#avatarCropWrap .btnSubmitCrop")).not.toHaveAttribute(
    "disabled",
    /.*/,
  );

  expect(await readProfileSettingsMetrics(page)).toEqual({
    avatarFormFloat: "left",
    avatarWrapWidth: "128px",
    breadcrumbHeight: "45px",
    formFloat: "left",
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
  });

  await expectProfileEditTabs(page, basePath);

  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("Change password")'),
  ).toHaveAttribute("href", `${basePath}/user/editform/password`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "profile-password-tab";
  });
  await page
    .locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("Change password")')
    .click();
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("profile-password-tab");

  await page.goto(`${basePath}/user/editform`);
  await page.locator('#frmBasic input[name="name"]').fill("Changed User");
  await page.locator('#frmBasic input[name="email"]').fill("changed@example.com");
  await page.locator("#frmBasic button[type=submit]").click();
  await expect(page.locator('#frmBasic input[name="name"]')).toHaveValue("Changed User");
  await expect.poll(() => profileUpdates.length).toBe(1);
  expect(profileUpdates.at(-1)).toEqual({
    avatarAttachmentId: "",
    email: "changed@example.com",
    name: "Changed User",
  });

  const invalidAvatarAlert = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#avatarFile").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "avatar.txt",
  });
  await expect(invalidAvatarAlert).resolves.toBe("Only image files are allowed to be uploaded.");
  await expect(page.locator("#avatarCropWrap")).toHaveClass(/hide/);
  await expect(page.locator("#avatarCropWrap")).not.toHaveAttribute("aria-hidden", /.*/);
  await expect(page.locator("#frmAvatar .upload-progress.avatar")).toHaveCSS("display", "none");
  expect(fileUploads).toHaveLength(0);
  expect(profileUpdates).toHaveLength(1);

  await page.locator("#avatarFile").setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "avatar.png",
  });
  await expect(page.locator("#avatarCropWrap")).toHaveClass("modal hide in");
  await expect(page.locator("#avatarCropWrap")).toHaveCSS("display", "block");
  await expect(page.locator("#avatarCropWrap")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#avatarCropWrap .btnSubmitCrop")).not.toHaveAttribute(
    "disabled",
    /.*/,
  );
  expect(await avatarBackdropOwner(page)).toEqual({
    directBodyChild: false,
    routeTreeChild: true,
  });
  await expect(page.locator("#avatarCropWrap .modal-body > img")).toHaveAttribute("src", /^blob:/);
  await expect(
    page.locator("#avatarCropWrap .modal-header .avatar-wrap > img"),
  ).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator("#avatarCropWrap .modal-body > img")).not.toHaveAttribute("alt", /.*/);
  await page.locator("#avatarCropWrap .btnSubmitCrop").click();
  await expect.poll(() => profileUpdates.length).toBe(2);
  expect(fileUploads).toHaveLength(1);
  await expect(page.locator("#frmAvatar .avatar-wrap.xlarge > img")).toHaveAttribute(
    "src",
    "/files/77",
  );
  expect(profileUpdates.at(-1)).toEqual({
    avatarAttachmentId: "77",
    email: "changed@example.com",
    name: "Changed User",
  });

  await page.locator(".reset-user-visited-list button[type=submit]").click();
});

test("current-user profile settings tabs use typed TanStack links without route-local adapter", () => {
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).toContain(
    "<UserProfileSettingsTitle loginId={loginId} />",
  );
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).toContain("function UserProfileSettingsTitle");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).toContain("<title>{loginId}</title>");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("document.title");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain('globalThis["document"]');
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toMatch(/useEffect\s*\([^)]*title/s);
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toMatch(
    /title[^;]*useEffect|useEffect[^;]*title/s,
  );
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("LegacyInternalLink");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("AnchorHTMLAttributes");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("ComponentType");
});

test("user profile avatar crop modal stays route-owned across dismiss and save", async ({
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
  const profileUpdates: Array<Record<string, unknown>> = [];
  const fileUploads: string[] = [];
  await page.route("**/api/v1/workspace/profile", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    profileUpdates.push(body);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        workspaceBody({
          avatarUrl: body.avatarAttachmentId === "77" ? "/files/77" : undefined,
          email: typeof body.email === "string" ? body.email : undefined,
          name: typeof body.name === "string" ? body.name : undefined,
        }),
      ),
    });
  });
  await page.route("**/files", async (route) => {
    fileUploads.push(route.request().postDataBuffer()?.toString() ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 77,
        mimeType: "image/png",
        name: "avatar.png",
        size: 128,
        url: "/files/77",
      }),
    });
  });

  await page.goto(`${basePath}/user/editform`);
  await installAvatarCropModalBridgeAudit(page, ["avatarCropWrap"]);
  await rememberSpaMarker(page, "user-profile-avatar-crop");
  const editFormUrl = page.url();
  const avatarCropModal = page.locator("#avatarCropWrap");
  const cancelButton = "#avatarCropWrap .modal-footer .ybtn-default";
  const saveButton = "#avatarCropWrap .btnSubmitCrop";
  const avatarPng = {
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "avatar.png",
  };

  await expect(avatarCropModal).toHaveClass("modal hide");
  await expect(avatarCropModal).toHaveCSS("display", "none");
  await expect(avatarCropModal).not.toHaveAttribute("aria-hidden", /.*/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(editFormUrl);
  await expect.poll(() => spaMarker(page)).toBe("user-profile-avatar-crop");
  await expect
    .poll(() => avatarCropModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  await page.locator("#avatarFile").setInputFiles(avatarPng);
  await expect(avatarCropModal).toHaveClass("modal hide in");
  await expect(avatarCropModal).toHaveCSS("display", "block");
  await expect(avatarCropModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(await avatarBackdropOwner(page)).toEqual({
    directBodyChild: false,
    routeTreeChild: true,
  });
  await expect(page.locator(cancelButton)).not.toHaveAttribute("data-dismiss", /.*/);
  await expect(page.locator("#frmAvatar .avatar-wrap.xlarge > img")).not.toHaveAttribute(
    "alt",
    /.*/,
  );
  await expect(page.locator("#avatarCropWrap .modal-header .avatar-wrap > img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(
    page.locator("#avatarCropWrap .modal-header .avatar-wrap > img"),
  ).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator("#avatarCropWrap .modal-body > img")).toHaveAttribute("src", /^blob:/);
  await expect(page.locator("#avatarCropWrap .modal-body > img")).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator(saveButton)).not.toHaveAttribute("disabled", /.*/);
  await expect(page).toHaveURL(editFormUrl);
  await expect.poll(() => spaMarker(page)).toBe("user-profile-avatar-crop");
  await expect
    .poll(() => avatarCropModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });
  expect(fileUploads).toHaveLength(0);
  expect(profileUpdates).toHaveLength(0);

  expect(await dispatchCancelableClick(page, cancelButton)).toBe(false);
  await expect(avatarCropModal).toHaveClass("modal hide");
  await expect(avatarCropModal).toHaveCSS("display", "none");
  await expect(avatarCropModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(editFormUrl);
  await expect.poll(() => spaMarker(page)).toBe("user-profile-avatar-crop");
  await expect
    .poll(() => avatarCropModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });
  expect(fileUploads).toHaveLength(0);
  expect(profileUpdates).toHaveLength(0);

  await page.locator("#avatarFile").setInputFiles(avatarPng);
  await expect(avatarCropModal).toHaveClass("modal hide in");
  await expect(avatarCropModal).toHaveCSS("display", "block");
  await expect(avatarCropModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(await avatarBackdropOwner(page)).toEqual({
    directBodyChild: false,
    routeTreeChild: true,
  });
  await expect(page).toHaveURL(editFormUrl);
  await expect.poll(() => spaMarker(page)).toBe("user-profile-avatar-crop");
  await expect
    .poll(() => avatarCropModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  await rememberSpaMarker(page, "kept");
  const uploadResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/files") && response.request().method() === "POST",
  );
  const profileUpdateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/workspace/profile") &&
      response.request().method() === "PATCH",
  );
  expect(await dispatchCancelableClick(page, saveButton)).toBe(false);
  await uploadResponsePromise;
  await profileUpdateResponsePromise;

  await expect(avatarCropModal).toHaveClass("modal hide");
  await expect(avatarCropModal).toHaveCSS("display", "none");
  await expect(avatarCropModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page.locator("#frmAvatar .avatar-wrap.xlarge > img")).toHaveAttribute(
    "src",
    "/files/77",
  );
  await expect(page).toHaveURL(editFormUrl);
  await expect.poll(() => spaMarker(page)).toBe("kept");
  await expect
    .poll(() => avatarCropModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });
  expect(fileUploads).toHaveLength(1);
  expect(profileUpdates).toEqual([
    {
      avatarAttachmentId: "77",
      email: "admin@example.com",
      name: "Admin User",
    },
  ]);
});

test("user profile avatar crop modal source stays route-owned", () => {
  const modalSource = USER_PROFILE_SETTINGS_ROUTE_SOURCE.slice(
    USER_PROFILE_SETTINGS_ROUTE_SOURCE.indexOf("function insulateAvatarCropModalButtonClick"),
    USER_PROFILE_SETTINGS_ROUTE_SOURCE.indexOf("function EditTabMenu"),
  );

  expect(modalSource).toContain("function insulateAvatarCropModalButtonClick");
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain("const resetAvatarCropSelection");
  expect(modalSource).toContain("const handleAvatarFileChange");
  expect(modalSource).toContain("const dismissAvatarCropModal");
  expect(modalSource).toContain("const submitAvatarCrop");
  expect(modalSource).toContain("avatarCropModalHasOpened");
  expect(modalSource).toContain("setAvatarCropModalOpen(false);");
  expect(modalSource).toContain("setAvatarCropModalOpen(nextFile !== null);");
  expect(modalSource).toContain('id="avatarCropWrap"');
  expect(modalSource).not.toContain('data-dismiss="modal"');
  expect(modalSource).not.toContain("data-dismiss");
  expect(modalSource).toContain("aria-hidden=");
  expect(modalSource).toContain('className={avatarCropModalOpen ? "modal hide in" : "modal hide"}');
  expect(modalSource).toContain("key={avatarFileInputKey}");
  expect(modalSource).toContain("onClick={dismissAvatarCropModal}");
  expect(modalSource).toContain("onClick={submitAvatarCrop}");
  expect(modalSource).toContain('className="modal-backdrop in"');
  expect(modalSource).not.toContain("createPortal");
  expect(modalSource).not.toContain("document.body");
  expect(modalSource).not.toContain("document.");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain('alt=""');
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain('from "react-dom"');
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("createPortal");
  expect(USER_PROFILE_SETTINGS_ROUTE_SOURCE).not.toContain("document.body");
  expect(modalSource).not.toContain("disabled=");
  expect(modalSource).not.toMatch(/document\.(querySelector|getElementById|addEventListener)/);
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("addEventListener(");
});

async function avatarBackdropOwner(page: Page) {
  return page.locator(".modal-backdrop.in").evaluate((backdrop) => ({
    directBodyChild: backdrop.parentElement === document.body,
    routeTreeChild: backdrop.parentElement?.classList.contains("page-wrap") ?? false,
  }));
}

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

function workspaceBody(input: { avatarUrl?: string; email?: string; name?: string } = {}) {
  return {
    apiToken: "token-before",
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: input.avatarUrl ?? "/assets/images/default-avatar-128.png",
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
    const breadcrumb = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-settings-edit-tabs"]',
    );
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

async function expectProfileEditTabs(page: Page, basePath: string) {
  const tabs = page.locator('[data-stylex-owner="user-settings-edit-tabs"]');
  await expect(tabs).toBeAttached();
  await expect(tabs.locator("a")).toHaveText([
    "Edit profile",
    "Change password",
    "Notification settings",
    "Email settings",
    "User Token",
  ]);
  expect(
    await tabs
      .locator("a")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href"))),
  ).toEqual([
    `${basePath}/user/editform`,
    `${basePath}/user/editform/password`,
    `${basePath}/user/editform/notifications`,
    `${basePath}/user/editform/emails`,
    `${basePath}/user/editform/token`,
  ]);
  await expect(tabs.locator("li")).toHaveClass(["active", "", "", "", ""]);
  await expect(tabs.locator("a")).toHaveClass(["", "", "", "", ""]);
  expect(
    await tabs.locator("a").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        ariaCurrent: anchor.getAttribute("aria-current"),
        className: anchor.getAttribute("class"),
        dataStatus: anchor.getAttribute("data-status"),
        text: anchor.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Edit profile" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Change password" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Notification settings" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Email settings" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "User Token" },
  ]);
}

async function installAvatarCropModalBridgeAudit(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __avatarCropModalBridgeAudit?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __avatarCropModalBridgeAuditArmed?: boolean;
      __avatarCropModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__avatarCropModalBridgeAudit = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__avatarCropModalBridgeNativeGetElementById ??= Document.prototype.getElementById;
    const nativeGetElementById = guardedWindow.__avatarCropModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__avatarCropModalBridgeAudit?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };

    if (guardedWindow.__avatarCropModalBridgeAuditArmed) {
      return;
    }

    guardedWindow.__avatarCropModalBridgeAuditArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }
      if (target.closest("#avatarCropWrap .btnSubmitCrop")) {
        guardedWindow.__avatarCropModalBridgeAudit?.documentClicks.push("modal-confirm");
        return;
      }
      if (target.closest('#avatarCropWrap [data-dismiss="modal"]')) {
        guardedWindow.__avatarCropModalBridgeAudit?.documentClicks.push("modal-dismiss");
      }
    });
  }, modalIds);
}

async function avatarCropModalBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __avatarCropModalBridgeAudit?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
      ).__avatarCropModalBridgeAudit ?? { documentClicks: [], getElementById: [] },
  );
}

async function dispatchCancelableClick(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
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

async function firstHeadTitleText(page: Page) {
  return page.evaluate(() => document.querySelector("head > title")?.textContent ?? "");
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
      ].concat(legacyAvatarAttributeNames(current));
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
    function normalizeAttribute(current: Element, name: string): string {
      if (name === "class") {
        const owner = current.getAttribute("data-stylex-owner");
        if (owner === "user-settings-breadcrumb-outer") return 'class="site-breadcrumb-outer"';
        if (owner === "user-settings-breadcrumb-inner") return 'class="site-breadcrumb-inner"';
        if (owner === "user-settings-breadcrumb-heading") return "";
        if (owner === "user-settings-edit-tabs") return 'class="nav nav-tabs mt20"';
        if (owner === "user-settings-edit-tab-item")
          return current.getAttribute("data-selected") === "true" ? 'class="active"' : "";
        if (owner === "user-settings-edit-tab-link") return "";
      }
      if (
        name === "class" &&
        (current.matches('[data-stylex-owner="global-gnb-inner"]') ||
          current.matches('[data-stylex-owner="global-gnb-outer"]') ||
          current.matches('[data-stylex-owner="site-footer"]') ||
          current.matches('[data-stylex-owner="site-footer-inner"]') ||
          current.matches('[data-stylex-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        name === "class" &&
        current.classList.contains("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        const originalValue = current.getAttribute(name) ?? "";
        current.setAttribute(
          name,
          originalValue
            .split(/\s+/u)
            .filter((token) => token !== "gnb-nav")
            .join(" "),
        );
        try {
          return normalizeAttribute(current, name);
        } finally {
          current.setAttribute(name, originalValue);
        }
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }
    function legacyAvatarAttributeNames(current: Element) {
      return current.matches("#frmAvatar img, #avatarCropWrap img, #avatarCropWrap button")
        ? ["alt", "disabled"]
        : [];
    }

    return Array.from(
      document.querySelectorAll(
        '.unsupported, [data-stylex-owner=global-gnb-outer], [data-stylex-owner="user-settings-breadcrumb-outer"], .page-wrap-outer, [data-stylex-owner=site-footer]',
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
        ].concat(legacyAvatarAttributeNames(current));
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
      function normalizeAttribute(current: Element, name: string): string {
        const isSiteLayoutHeader =
          name === "class" &&
          current.classList.contains("gnb-outer") &&
          current.matches("header.gnb-outer") &&
          current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
        const isSiteLayoutFooterOuter =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer-outer") &&
          current.matches("footer.page-footer-outer") &&
          current.querySelector(":scope > div.page-footer > span.provider") !== null;
        const isSiteLayoutFooterInner =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer") &&
          current.matches("footer.page-footer-outer > div.page-footer") &&
          current.querySelector(":scope > span.provider") !== null;
        const isSiteLayoutFooterProvider =
          name === "class" &&
          value.split(/\s+/u).includes("provider") &&
          current.matches("footer.page-footer-outer > div.page-footer > span.provider");
        const retiredToken = isSiteLayoutFooterOuter
          ? "page-footer-outer"
          : isSiteLayoutFooterInner
            ? "page-footer"
            : isSiteLayoutFooterProvider
              ? "provider"
              : isSiteLayoutHeader && current.classList.contains("project-header")
                ? "project-header"
                : isSiteLayoutHeader
                  ? "gnb-outer"
                  : name === "class" &&
                      current.classList.contains("gnb-inner") &&
                      current.matches("header.gnb-outer > div.gnb-inner") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-inner"
                    : name === "class" &&
                        current.classList.contains("gnb-nav") &&
                        current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                        current.querySelector('form[name="gnb-search-form"]') !== null
                      ? "gnb-nav"
                      : null;
        if (retiredToken) {
          const originalValue = current.getAttribute(name) ?? "";
          current.setAttribute(
            name,
            originalValue
              .split(/\s+/u)
              .filter((token) => token !== retiredToken)
              .join(" "),
          );
          try {
            return normalizeAttribute(current, name);
          } finally {
            current.setAttribute(name, originalValue);
          }
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
      function legacyAvatarAttributeNames(current: Element) {
        return current.matches("#frmAvatar img, #avatarCropWrap img, #avatarCropWrap button")
          ? ["alt", "disabled"]
          : [];
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
