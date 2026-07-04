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
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
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
        <tr><td><img src="/legacy-assets/images/sub-avatar-valid.png" width="40" height="40"><span class="ml10">valid@example.com</span></td><td><button type="button" data-request-method="delete" data-request-uri="__BASE_PATH__/user/email/delete/11" class="ybtn ybtn-small ybtn-danger">Delete</button><button type="button" data-request-method="put" data-request-uri="__BASE_PATH__/user/email/setAsMain/11" class="ybtn ybtn-small">Set as primary email address.</button></td></tr>
        <tr><td><img src="/legacy-assets/images/sub-avatar-invalid.png" width="40" height="40"><span class="ml10">pending@example.com</span></td><td><button type="button" data-request-method="delete" data-request-uri="__BASE_PATH__/user/email/delete/12" class="ybtn ybtn-small ybtn-danger">Delete</button><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/user/email/sendValidationEmail/12" class="ybtn ybtn-small"><i class="yobicon-error2 orange-txt mr5"></i>Send a validation email.</button></td></tr>
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
  await expect(page.locator("form.form-inline.inner-bubble")).toBeAttached();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_EMAIL_SETTINGS_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readEmailSettingsMetrics(page)).toEqual({
    addFormDisplay: "block",
    breadcrumbHeight: "46px",
    firstAvatarWidth: "40px",
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
    tableDisplay: "table",
  });

  const tabLinks = page.locator(".page-wrap .nav.nav-tabs.mt20 > li > a");
  await expect(tabLinks).toHaveCount(5);
  await expect(tabLinks).toHaveText([
    "Edit profile",
    "Change password",
    "Notification settings",
    "Email settings",
    "User Token",
  ]);
  expect(
    await tabLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/user/editform`,
    `${basePath}/user/editform/password`,
    `${basePath}/user/editform/notifications`,
    `${basePath}/user/editform/emails`,
    `${basePath}/user/editform/token`,
  ]);
  await expect(page.locator(".page-wrap .nav.nav-tabs.mt20 > li.active > a")).toHaveText(
    "Email settings",
  );

  const setMainButton = page.locator('button[data-request-uri$="/user/email/setAsMain/11"]');
  const sendValidationButton = page.locator(
    'button[data-request-uri$="/user/email/sendValidationEmail/12"]',
  );
  await expect(setMainButton).toHaveAttribute("data-request-method", "put");
  await expect(setMainButton).not.toHaveAttribute("href", /.*/u);
  await expect(setMainButton).toHaveText("Set as primary email address.");
  await expect(sendValidationButton).toHaveAttribute("data-request-method", "post");
  await expect(sendValidationButton).not.toHaveAttribute("href", /.*/u);
  await expect(sendValidationButton).toContainText("Send a validation email.");
  const setMainRequest = page.waitForRequest("**/api/v1/workspace/emails/11/main");
  await setMainButton.click();
  const setMainAction = await setMainRequest;
  const sendValidationRequest = page.waitForRequest("**/api/v1/workspace/emails/12/validation");
  await sendValidationButton.click();
  const sendValidationAction = await sendValidationRequest;
  expect(setMainAction.method()).toBe("POST");
  expect(setMainAction.headers()["x-csrf-token"]).toBe("csrf-token");
  expect(new URL(setMainAction.url()).pathname).toBe(`${basePath}/api/v1/workspace/emails/11/main`);
  expect(sendValidationAction.method()).toBe("POST");
  expect(sendValidationAction.headers()["x-csrf-token"]).toBe("csrf-token");
  expect(new URL(sendValidationAction.url()).pathname).toBe(
    `${basePath}/api/v1/workspace/emails/12/validation`,
  );

  await expect(page.locator('.nav-tabs a:has-text("User Token")')).toHaveAttribute(
    "href",
    `${basePath}/user/editform/token`,
  );
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "emails-token-tab";
  });
  await page.locator('.nav-tabs a:has-text("User Token")').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/token`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("emails-token-tab");

  await page.goto(`${basePath}/user/editform/emails`);
  await page.locator('form.form-inline input[name="email"]').fill("new@example.com");
  await page.locator("form.form-inline button[type=submit]").click();
  await expect(page.locator('form.form-inline input[name="email"]')).toHaveValue("");
});

test("current-user email settings tab menu uses direct typed router links", () => {
  const source = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ComponentType");
  expect(source).not.toContain("AnchorHTMLAttributes");
  expect(source).not.toContain("{...legacyHref}");
  expect(source).toContain("data-request-uri={requestUri}");
  expect(source).not.toContain("href={requestUri}");
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

async function readEmailSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(".site-breadcrumb-outer");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(".nav-tabs.mt20");
    const addForm = document.querySelector<HTMLElement>("form.form-inline.inner-bubble");
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
