import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_USER_EMAIL_SETTINGS_SCREEN = `
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
  await expect(page.locator('[data-stylex-owner="user-email-add-form"]')).toBeAttached();
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
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
    tableDisplay: "table",
  });

  const tabItems = page.locator('[data-stylex-owner="user-settings-edit-tab-item"]');
  const tabLinks = page.locator('[data-stylex-owner="user-settings-edit-tab-link"]');
  await expect(tabItems).toHaveCount(5);
  expect(
    await tabItems.evaluateAll((items) => items.map((item) => item.getAttribute("class"))),
  ).toEqual([null, null, null, "active", null]);
  await expect(tabLinks).toHaveCount(5);
  expect(
    await tabLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
        href: link.getAttribute("href"),
        text: link.textContent?.replace(/\s+/g, " ").trim(),
      })),
    ),
  ).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/user/editform`,
      text: "Edit profile",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/user/editform/password`,
      text: "Change password",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/user/editform/notifications`,
      text: "Notification settings",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/user/editform/emails`,
      text: "Email settings",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/user/editform/token`,
      text: "User Token",
    },
  ]);
  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-link"][aria-current]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-link"][data-status]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-item"][data-selected="true"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-stylex-owner="user-settings-edit-tab-item"][data-selected="true"] > [data-stylex-owner="user-settings-edit-tab-link"]',
    ),
  ).toHaveText("Email settings");
  await expect(page.locator("table.table.mt20 img")).toHaveCount(3);
  expect(
    await page
      .locator("table.table.mt20 img")
      .evaluateAll((images) => images.map((image) => image.hasAttribute("alt"))),
  ).toEqual([false, false, false]);

  await expect(page.locator("table.table.mt20 [data-request-method]")).toHaveCount(0);
  await expect(page.locator("table.table.mt20 [data-request-uri]")).toHaveCount(0);
  await expect(page.locator("table.table.mt20 button[href]")).toHaveCount(0);

  const validEmailRow = page.locator("table.table.mt20 tr", { hasText: "valid@example.com" });
  const pendingEmailRow = page.locator("table.table.mt20 tr", { hasText: "pending@example.com" });
  const validDeleteButton = validEmailRow.locator("button.ybtn-danger", { hasText: "Delete" });
  const setMainButton = validEmailRow.locator("button.ybtn-small", {
    hasText: "Set as primary email address.",
  });
  const sendValidationButton = pendingEmailRow.locator("button.ybtn-small", {
    hasText: "Send a validation email.",
  });
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
  expect(deleteAction.headers()["x-csrf-token"]).toBe("csrf-token");
  expect(new URL(deleteAction.url()).pathname).toBe(`${basePath}/api/v1/workspace/emails/11`);
  expect(setMainAction.method()).toBe("POST");
  expect(setMainAction.headers()["x-csrf-token"]).toBe("csrf-token");
  expect(new URL(setMainAction.url()).pathname).toBe(`${basePath}/api/v1/workspace/emails/11/main`);
  expect(sendValidationAction.method()).toBe("POST");
  expect(sendValidationAction.headers()["x-csrf-token"]).toBe("csrf-token");
  expect(new URL(sendValidationAction.url()).pathname).toBe(
    `${basePath}/api/v1/workspace/emails/12/validation`,
  );

  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("User Token")'),
  ).toHaveAttribute("href", `${basePath}/user/editform/token`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "emails-token-tab";
  });
  await page
    .locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("User Token")')
    .click();
  await expect(page).toHaveURL(`${basePath}/user/editform/token`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("emails-token-tab");

  await page.goto(`${basePath}/user/editform/emails`);
  await page.locator('[data-stylex-owner="user-email-add-input"]').fill("new@example.com");
  await page.locator('[data-stylex-owner="user-email-add-action"]').click();
  await expect(page.locator('[data-stylex-owner="user-email-add-input"]')).toHaveValue("");
});

test("current-user email settings tab menu uses direct typed router links", () => {
  const source = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
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
  const source = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  expect(source).toContain("<UserEmailSettingsTitle loginId={loginId} />");
  expect(source).toContain("function UserEmailSettingsTitle({ loginId }: { loginId: string })");
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

  const tableImages = page.locator("table.table.mt20 img");
  await expect(tableImages).toHaveCount(3);
  const imageSources = await tableImages.evaluateAll((images) =>
    images.map((image) => image.getAttribute("src")),
  );
  expect(imageSources).toEqual([
    "/assets/images/default-avatar-128.png",
    "/assets/images/default-avatar-128.png",
    "/assets/images/default-avatar-128.png",
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
      '[data-stylex-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-settings-edit-tabs"]',
    );
    const addForm = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-email-add-form"]',
    );
    const table = document.querySelector<HTMLElement>("table.table.mt20");
    const firstAvatar = document.querySelector<HTMLElement>("table.table.mt20 img");
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
        const owner = current.getAttribute("data-stylex-owner");
        if (owner === "user-settings-breadcrumb-outer") return 'class="site-breadcrumb-outer"';
        if (owner === "user-settings-breadcrumb-inner") return 'class="site-breadcrumb-inner"';
        if (owner === "user-settings-breadcrumb-heading") return "";
        if (owner === "user-settings-edit-tabs") return 'class="nav nav-tabs mt20"';
        if (owner === "user-settings-edit-tab-item")
          return current.getAttribute("data-selected") === "true" ? 'class="active"' : "";
        if (owner === "user-settings-edit-tab-link") return "";
        if (owner === "user-email-add-form") return 'class="form-inline inner-bubble"';
        if (owner === "user-email-add-input") return 'class="text uname"';
        if (owner === "user-email-add-action") return 'class="ybtn ybtn-success"';
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
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
