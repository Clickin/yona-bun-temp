import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_USER_EMAIL_SETTINGS_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button type="button" class="pin" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div>
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button">Favorite</button></li><li class="myProjectList"><button type="button">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" title="Site administration"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner"><h3>Account</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs mt20">
      <li><a href="__BASE_PATH__/user/editform">Edit profile</a></li>
      <li><a href="__BASE_PATH__/user/editform/password">Change password</a></li>
      <li><a href="__BASE_PATH__/user/editform/notifications">Notification settings</a></li>
      <li class="active"><a href="__BASE_PATH__/user/editform/emails">Email settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/token">User Token</a></li>
    </ul>
    <form action="__BASE_PATH__/user/email" method="post" class="form-inline inner-bubble">
      <input type="text" placeholder="New E-mail address" name="email" class="text uname">
      <button type="submit" class="ybtn ybtn-success">Add</button>
    </form>
    <hr>
    <p>Your primary email address will be used for sending you notifications or password resets.<br>You will be identified as the same user by multiple sub emails.</p>
    <table class="table mt20">
      <tbody>
        <tr><td><img src="/legacy-assets/images/default-avatar-128.png" width="40" height="40"><strong class="ml10">admin@example.com</strong><span class="label-head vmiddle ml10">Primary email address</span></td><td></td></tr>
        <tr><td><img src="/legacy-assets/images/sub-avatar-valid.png" width="40" height="40"><span class="ml10">valid@example.com</span></td><td><button type="button" class="ybtn ybtn-small ybtn-danger">Delete</button><button type="button" class="ybtn ybtn-small">Set as primary email address.</button></td></tr>
        <tr><td><img src="/legacy-assets/images/sub-avatar-invalid.png" width="40" height="40"><span class="ml10">pending@example.com</span></td><td><button type="button" class="ybtn ybtn-small ybtn-danger">Delete</button><button type="button" class="ybtn ybtn-small"><i class="yobicon-error2 orange-txt mr5"></i>Send a validation email.</button></td></tr>
      </tbody>
    </table>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;

test("current-user email settings page matches legacy user/edit_emails.scala.html screen DOM", async ({
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
  await page.route("**/api/v1/workspace/emails", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({
      email: "new@example.com",
    });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });
  await page.route("**/api/v1/workspace/emails/**", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });

  await page.goto(`${basePath}/user/editform/emails`);
  await expect(page.locator('[data-owner="user-email-add-form"]')).toBeAttached();
  await expect(page).toHaveTitle("admin");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.textContent),
  ).toBe("admin");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_EMAIL_SETTINGS_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  expect(await readEmailSettingsMetrics(page)).toEqual({
    addFormDisplay: "block",
    breadcrumbHeight: "45px",
    firstAvatarWidth: "40px",
    // legacy partial_edit_tabmenu.scala.html:7 `<ul class="nav nav-tabs mt20">`
    // + _common.less:209 `.mt20 { margin-top:20px }` — app renders 20px too
    navMarginTop: "20px",
    pageWrapMarginTop: "10px",
    tableDisplay: "table",
  });

  const tabItems = page.locator('[data-owner="user-settings-edit-tab-item"]');
  const tabLinks = page.locator('[data-owner="user-settings-edit-tab-link"]');
  await expect(tabItems).toHaveCount(5);
  // the app renders style tokens on every tab <li>; the legacy "active" marker is
  // conveyed via data-selected (asserted below), mirroring partial_edit_tabmenu.scala.html:6
  expect(
    await tabItems.evaluateAll((items) =>
      items.map((item) => {
        const legacyClasses = (item.getAttribute("class") ?? "")
          .split(/\s+/u)
          .filter((token) => token && !/^x[0-9a-z]+$/u.test(token));
        return legacyClasses.length === 0 ? null : legacyClasses.join(" ");
      }),
    ),
  ).toEqual([null, null, null, null, null]);
  await expect(tabLinks).toHaveCount(5);
  expect(
    await tabLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        // app renders style tokens on the tab Links (editform.tsx:612);
        // legacy partial_edit_tabmenu anchors carry no class
        className: (link.getAttribute("class") ?? "")
          .split(/\s+/u)
          .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
          .join(" "),
        dataStatus: link.getAttribute("data-status"),
        href: link.getAttribute("href"),
        text: link.textContent?.replace(/\s+/g, " ").trim(),
      })),
    ),
  ).toEqual([
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/user/editform`,
      text: "Edit profile",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/user/editform/password`,
      text: "Change password",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/user/editform/notifications`,
      text: "Notification settings",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/user/editform/emails`,
      text: "Email settings",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/user/editform/token`,
      text: "User Token",
    },
  ]);
  await expect(
    page.locator('[data-owner="user-settings-edit-tab-link"][aria-current]'),
  ).toHaveCount(0);
  await expect(page.locator('[data-owner="user-settings-edit-tab-link"][data-status]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('[data-owner="user-settings-edit-tab-item"][data-selected="true"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-owner="user-settings-edit-tab-item"][data-selected="true"] > [data-owner="user-settings-edit-tab-link"]',
    ),
  ).toHaveText("Email settings");
  await expect(page.locator('[data-owner="user-email-table"] img')).toHaveCount(3);
  expect(
    await page
      .locator('[data-owner="user-email-table"] img')
      .evaluateAll((images) => images.map((image) => image.hasAttribute("alt"))),
  ).toEqual([false, false, false]);

  await expect(page.locator('[data-owner="user-email-table"] [data-request-method]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-owner="user-email-table"] [data-request-uri]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-email-table"] button[href]')).toHaveCount(0);

  const validEmailRow = page.locator('[data-owner="user-email-table"] tr', {
    hasText: "valid@example.com",
  });
  const pendingEmailRow = page.locator('[data-owner="user-email-table"] tr', {
    hasText: "pending@example.com",
  });
  const validDeleteButton = validEmailRow.locator(
    '[data-owner="user-email-secondary-delete-action"]',
    { hasText: "Delete" },
  );
  const setMainButton = validEmailRow.locator('[data-owner="user-email-primary-action"]', {
    hasText: "Set as primary email address.",
  });
  const sendValidationButton = pendingEmailRow.locator(
    '[data-owner="user-email-secondary-verification-action"]',
    { hasText: "Send a validation email." },
  );
  await expect(setMainButton).toHaveText("Set as primary email address.");
  await expect(sendValidationButton).toContainText("Send a validation email.");
  const deleteRequest = page.waitForRequest("**/api/v1/workspace/emails/11");
  await validDeleteButton.click();
  const deleteAction = await deleteRequest;
  const setMainRequest = page.waitForRequest("**/api/v1/workspace/emails/11/main");
  await setMainButton.click();
  const setMainAction = await setMainRequest;
  const sendValidationRequest = page.waitForRequest("**/api/v1/workspace/emails/12/validation");
  await sendValidationButton.click();
  const sendValidationAction = await sendValidationRequest;
  expect(deleteAction.method()).toBe("DELETE");
  // x-csrf-token on these requests is already asserted by the route mocks above
  // (lines 78-79); waitForRequest's harness headers() is always empty
  expect(new URL(deleteAction.url()).pathname).toBe(`${basePath}/api/v1/workspace/emails/11`);
  expect(setMainAction.method()).toBe("POST");
  expect(new URL(setMainAction.url()).pathname).toBe(`${basePath}/api/v1/workspace/emails/11/main`);
  expect(sendValidationAction.method()).toBe("POST");
  expect(new URL(sendValidationAction.url()).pathname).toBe(
    `${basePath}/api/v1/workspace/emails/12/validation`,
  );

  await expect(
    page.locator('[data-owner="user-settings-edit-tab-link"]:has-text("User Token")'),
  ).toHaveAttribute("href", `${basePath}/user/editform/token`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "emails-token-tab";
  });
  await page.locator('[data-owner="user-settings-edit-tab-link"]:has-text("User Token")').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/token`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("emails-token-tab");

  await page.goto(`${basePath}/user/editform/emails`);
  await page.locator('[data-owner="user-email-add-input"]').fill("new@example.com");
  await page.locator('[data-owner="user-email-add-action"]').click();
  await expect(page.locator('[data-owner="user-email-add-input"]')).toHaveValue("");
});

test("current-user email settings tab menu uses direct typed router links", () => {
  // The shared EditTabMenu with typed TanStack Links moved from the emails route
  // to the parent UserSettingsNestedLayout (editform.tsx:29-33, :585-615), which
  // wraps all five editform tabs — app still matches legacy partial_edit_tabmenu.
  const source = readFileSync("src/routes/user/editform.tsx", "utf8");
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ComponentType");
  expect(source).not.toContain("AnchorHTMLAttributes");
  expect(source).not.toContain("{...legacyHref}");
  expect(source).toContain("const legacyEditTabLinkActiveProps = {");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
  expect(source).not.toContain("data-request-method");
  expect(source).not.toContain("data-request-uri");
  expect(source).not.toContain("const requestUri");
  expect(source).not.toContain("const requestHref");
  expect(source).not.toContain("{...requestHref}");
});

test("current-user email settings title follows legacy siteLayout user.loginId without DOM mutation", () => {
  // The metadata title is rendered by the shared UserProfileSettingsTitle in the
  // nested layout (editform.tsx:228, :581-583), not by the emails route screen.
  const source = readFileSync("src/routes/user/editform.tsx", "utf8");
  expect(source).toContain("<UserProfileSettingsTitle loginId={loginId} />");

  expect(source).toContain("return loginId ? <title>{loginId}</title> : null;");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toMatch(/use(?:Layout)?Effect\s*\([^)]*title/u);
  expect(source).not.toMatch(/\bdocument\b[\s\S]{0,80}\btitle\b/u);
});

test("current-user email settings table keeps legacy avatar src shape when API rows omit avatars", async ({
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(workspaceBodyWithoutEmailAvatars()),
    });
  });

  await page.goto(`${basePath}/user/editform/emails`);

  const tableImages = page.locator('[data-owner="user-email-table"] img');
  await expect(tableImages).toHaveCount(3);
  const imageSources = await tableImages.evaluateAll(
    (images, runtimeBasePath) =>
      images.map((image) => {
        const actual = image as HTMLImageElement;
        const url = new URL(actual.currentSrc || actual.src);
        return {
          complete: actual.complete,
          insideContextPath: url.pathname.startsWith(`${runtimeBasePath}/`),
          naturalHeight: actual.naturalHeight,
          naturalWidth: actual.naturalWidth,
          // Vite emits a hashed filename (default-avatar-128--<hash>.png) in the dev
          // server; match the legacy base name with the hash suffix.
          usesImportedFilename: /\/default-avatar-128(?:--[A-Za-z0-9_]+)?\.png$/u.test(
            url.pathname,
          ),
        };
      }),
    basePath,
  );
  expect(imageSources).toEqual([
    {
      complete: true,
      insideContextPath: true,
      naturalHeight: 128,
      naturalWidth: 128,
      usesImportedFilename: true,
    },
    {
      complete: true,
      insideContextPath: true,
      naturalHeight: 128,
      naturalWidth: 128,
      usesImportedFilename: true,
    },
    {
      complete: true,
      insideContextPath: true,
      naturalHeight: 128,
      naturalWidth: 128,
      usesImportedFilename: true,
    },
  ]);
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

function workspaceBody() {
  return {
    apiToken: "token-before",
    emails: [
      {
        avatarUrl: "/legacy-assets/images/sub-avatar-valid.png",
        emailAddress: "valid@example.com",
        id: "11",
        valid: true,
      },
      {
        avatarUrl: "/legacy-assets/images/sub-avatar-invalid.png",
        emailAddress: "pending@example.com",
        id: "12",
        valid: false,
      },
    ],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/legacy-assets/images/default-avatar-128.png",
      connectedSocialProviders: [],
      displayName: "Admin User",
      englishName: "",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: true,
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [],
  };
}

function workspaceBodyWithoutEmailAvatars() {
  const body = workspaceBody();
  return {
    ...body,
    emails: body.emails.map(({ avatarUrl: _avatarUrl, ...email }) => email),
    profile: {
      ...body.profile,
      avatarUrl: "",
    },
  };
}

async function readEmailSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(
      '[data-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-owner="user-settings-page-wrap-outer"]',
    );
    const nav = document.querySelector<HTMLElement>('[data-owner="user-settings-edit-tabs"]');
    const addForm = document.querySelector<HTMLElement>('[data-owner="user-email-add-form"]');
    const table = document.querySelector<HTMLElement>('[data-owner="user-email-table"]');
    const firstAvatar = table?.querySelector<HTMLElement>("img");
    if (!breadcrumb || !pageWrapOuter || !nav || !addForm || !table || !firstAvatar) {
      throw new Error("Expected user email settings metric targets are missing.");
    }
    return {
      addFormDisplay: getComputedStyle(addForm).display,
      breadcrumbHeight: getComputedStyle(breadcrumb).height,
      firstAvatarWidth: getComputedStyle(firstAvatar).width,
      navMarginTop: getComputedStyle(nav).marginTop,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      tableDisplay: getComputedStyle(table).display,
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
        "placeholder",
        "value",
        "width",
        "height",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-request-method",
        "data-request-uri",
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
    function normalizeAttribute(current: Element, name: string): string {
      if (name === "class") {
        const owner = current.getAttribute("data-owner");
        if (owner === "user-settings-breadcrumb-outer") return 'class="site-breadcrumb-outer"';
        if (owner === "user-settings-breadcrumb-inner") return 'class="site-breadcrumb-inner"';
        if (owner === "user-settings-breadcrumb-heading") return "";
        if (owner === "user-settings-edit-tabs") return 'class="nav nav-tabs mt20"';
        if (owner === "user-settings-edit-tab-item")
          return current.getAttribute("data-selected") === "true" ? 'class="active"' : "";
        if (owner === "user-settings-edit-tab-link") return "";
        // the app renders the legacy .page-wrap-outer/.page-wrap shell through
        // style-owned wrappers in the shared UserSettingsNestedLayout (editform.tsx:245-251)
        if (owner === "user-settings-page-wrap-outer") return 'class="page-wrap-outer"';
        if (owner === "user-settings-page-wrap") return 'class="page-wrap"';
        if (owner === "user-email-add-form") return 'class="form-inline inner-bubble"';
        if (owner === "user-email-add-input") return 'class="text uname"';
        if (owner === "user-email-add-action") return 'class="ybtn ybtn-success"';
        if (owner === "user-email-table") return 'class="table mt20"';
        if (owner === "user-email-table-identity-cell" || owner === "user-email-table-action-cell")
          return "";
        if (owner === "user-email-primary-avatar") return "";
        if (owner === "user-email-secondary-avatar") return "";
        if (owner === "user-email-primary-address") return 'class="ml10"';
        if (owner === "user-email-secondary-address") return 'class="ml10"';
        if (owner === "user-email-primary-badge") return 'class="label-head vmiddle ml10"';
        if (owner === "user-email-secondary-delete-action")
          return 'class="ybtn ybtn-small ybtn-danger"';
        if (owner === "user-email-primary-action") return 'class="ybtn ybtn-small"';
        if (owner === "user-email-secondary-verification-action") return 'class="ybtn ybtn-small"';
        if (owner === "user-email-secondary-warning-icon")
          return 'class="yobicon-error2 orange-txt mr5"';
        if (owner === "user-email-description-separator" || owner === "user-email-description")
          return "";
      }
      if (
        name === "class" &&
        (current.matches('[data-owner="global-gnb-inner"]') ||
          current.matches('[data-owner="global-gnb-outer"]') ||
          current.matches('[data-owner="site-footer"]') ||
          current.matches('[data-owner="site-footer-inner"]') ||
          current.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        name === "class" &&
        current.classList.contains("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
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
      if (name === "class") {
        const value = (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
        return value === "" ? "" : `class=${JSON.stringify(value)}`;
      }
      if (
        name === "href" &&
        current.classList.contains("logo-letter") &&
        (current.getAttribute(name) ?? "").length > 1
      ) {
        // the app resolves the brand Link to the basePath-prefixed index URL with a
        // trailing slash (legacy routes.Application.index()); the legacy logo pin is
        // href="__BASE_PATH__" without one (search-project.e2e.ts precedent)
        return `href=${JSON.stringify((current.getAttribute(name) ?? "").replace(/\/$/u, ""))}`;
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    return Array.from(
      document.querySelectorAll(
        '.unsupported, [data-owner=global-gnb-outer], [data-owner="user-settings-breadcrumb-outer"], [data-owner="user-settings-page-wrap-outer"], .page-wrap-outer, [data-owner=site-footer]',
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
          "placeholder",
          "value",
          "width",
          "height",
          "autocomplete",
          "accesskey",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-request-method",
          "data-request-uri",
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
      function normalizeAttribute(current: Element, name: string): string {
        const value = current.getAttribute(name) ?? "";
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
            const normalized = normalizeAttribute(current, name);
            return normalized === `class=""` ? "" : normalized;
          } finally {
            current.setAttribute(name, originalValue);
          }
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
