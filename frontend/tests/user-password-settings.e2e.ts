import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_USER_PASSWORD_SETTINGS_SCREEN = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
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
      <li class="active"><a href="__BASE_PATH__/user/editform/password">Change password</a></li>
      <li><a href="__BASE_PATH__/user/editform/notifications">Notification settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/emails">Email settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/token">User Token</a></li>
    </ul>
    <form id="frmPassword" method="post" action="__BASE_PATH__/user/resetPassword">
      <input type="hidden" name="loginId" value="admin">
      <dl>
        <dt>Current password</dt>
        <dd class="mt10"><input type="password" id="oldPassword" name="oldPassword" value="" autocomplete="off"></dd>
        <dt>New password</dt>
        <dd class="mt10"><input type="password" id="password" name="password" value="" autocomplete="off"></dd>
        <dt>Password confirmation</dt>
        <dd class="mt10"><input type="password" id="retypedPassword" name="retypedPassword" value="" autocomplete="off"></dd>
        <dd><button type="submit" class="ybtn ybtn-success">Change password</button></dd>
      </dl>
    </form>
    <hr>
    <div class="mt10">
      <dl>
        <dt>If you forget the current password or what was generated at first social login...</dt>
        <dd class="mt10"><a href="__BASE_PATH__/lostPassword" class="ybtn ybtn-fail">Password reset request</a></dd>
      </dl>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;

test("current-user password settings page matches legacy user/edit_password.scala.html screen DOM", async ({
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
  let passwordPostCount = 0;
  await page.route("**/api/v1/workspace/password", async (route) => {
    passwordPostCount += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({
      loginId: "admin",
      oldPassword: "old-pass",
      password: "new-pass",
      retypedPassword: "new-pass",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ isAnonymous: true }),
    });
  });

  await page.goto(`${basePath}/user/editform/password`);
  await expect(page.locator("#frmPassword")).toBeAttached();
  await expect(page).toHaveTitle("admin");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "admin",
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_PASSWORD_SETTINGS_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readPasswordSettingsMetrics(page)).toEqual({
    breadcrumbHeight: "45px",
    formDisplay: "block",
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
    resetLinkDisplay: "inline-block",
  });

  await expectPasswordEditTabs(page, basePath);

  await expect(
    page.locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("User Token")'),
  ).toHaveAttribute("href", `${basePath}/user/editform/token`);
  await expect(page.locator(".page-wrap > .mt10 a.ybtn-fail")).toHaveAttribute(
    "href",
    `${basePath}/lostPassword`,
  );

  await page.locator("#frmPassword button[type=submit]").click();
  await expectPasswordValidationPopovers(page, [
    "Required field!",
    "Required field!",
    "Required field!",
  ]);
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  expect(passwordPostCount).toBe(0);

  await page.locator("#password").fill("abc");
  await page.locator("#password").blur();
  await expectPasswordValidationPopovers(page, [
    "Required field!",
    "Password must be at least 4 characters in length.",
    "Required field!",
  ]);
  expect(passwordPostCount).toBe(0);

  await page.locator("#oldPassword").fill("old-pass");
  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("different");
  await page.locator("#retypedPassword").blur();
  await expectPasswordValidationPopovers(page, ["Retyped password doesn't match"]);
  await expect(page.locator("#frmPassword .popover.right.in")).toHaveCount(1);
  expect(passwordPostCount).toBe(0);

  await page.locator("#frmPassword button[type=submit]").click();
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  expect(passwordPostCount).toBe(0);
  await expectPasswordValidationPopovers(page, ["Retyped password doesn't match"]);

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "password-token-tab";
  });
  await page
    .locator('[data-stylex-owner="user-settings-edit-tab-link"]:has-text("User Token")')
    .click();
  await expect(page).toHaveURL(`${basePath}/user/editform/token`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("password-token-tab");

  await page.goto(`${basePath}/user/editform/password`);
  await page.locator("#oldPassword").fill("old-pass");
  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("new-pass");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "password-submit";
  });
  await page.locator("#frmPassword button[type=submit]").click();
  await page.waitForURL("**/users/loginform*");
  expect(passwordPostCount).toBe(1);
  const redirectedUrl = new URL(page.url());
  expect(redirectedUrl.pathname).toBe(`${basePath}/users/loginform`);
  expect(redirectedUrl.searchParams.get("password")).toBe("reset");
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Please log in with the new password!",
  );
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("password-submit");
});

test("current-user password settings tabs use typed TanStack links without route-local adapter", () => {
  const source = readFileSync("src/routes/user/editform/password.tsx", "utf8");
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("AnchorHTMLAttributes");
  expect(source).not.toContain("ComponentType");
});

test("current-user password settings title is rendered metadata, not route-local document mutation", () => {
  const source = readFileSync("src/routes/user/editform.tsx", "utf8");
  expect(source).toContain("<UserProfileSettingsTitle loginId={loginId} />");
  expect(source).toContain("<title>{loginId}</title>");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toMatch(/useEffect\s*\([^)]*title/s);
  expect(source).not.toMatch(/useLayoutEffect\s*\([^)]*title/s);
});

async function expectPasswordValidationPopovers(page: Page, messages: string[]) {
  const popovers = page.locator("#frmPassword .popover.right.in .popover-content");
  await expect(popovers).toHaveText(messages);
}

async function expectPasswordEditTabs(page: Page, basePath: string) {
  const tabItems = page.locator('[data-stylex-owner="user-settings-edit-tab-item"]');
  const tabLinks = tabItems.locator("a");
  const expectedTabs = [
    { href: `${basePath}/user/editform`, text: "Edit profile" },
    { href: `${basePath}/user/editform/password`, text: "Change password" },
    { href: `${basePath}/user/editform/notifications`, text: "Notification settings" },
    { href: `${basePath}/user/editform/emails`, text: "Email settings" },
    { href: `${basePath}/user/editform/token`, text: "User Token" },
  ];
  await expect(tabItems).toHaveCount(5);
  await expect(tabLinks).toHaveText(expectedTabs.map((tab) => tab.text));
  for (const [index, tab] of expectedTabs.entries()) {
    const link = tabLinks.nth(index);
    await expect(link).toHaveAttribute("href", tab.href);
    await expect(link).not.toHaveAttribute("class");
    await expect(link).not.toHaveAttribute("aria-current");
    await expect(link).not.toHaveAttribute("data-status");
  }
  await expect(tabItems.nth(1)).toHaveClass("active");
  await expect(tabItems.nth(0)).not.toHaveClass(/active/);
  await expect(tabItems.nth(2)).not.toHaveClass(/active/);
  await expect(tabItems.nth(3)).not.toHaveClass(/active/);
  await expect(tabItems.nth(4)).not.toHaveClass(/active/);
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

function workspaceBody() {
  return {
    apiToken: "token-before",
    emails: [],
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

async function readPasswordSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-settings-edit-tabs"]',
    );
    const form = document.querySelector<HTMLElement>("#frmPassword");
    const resetLink = document.querySelector<HTMLElement>(".page-wrap > .mt10 .ybtn-fail");
    if (!breadcrumb || !pageWrapOuter || !nav || !form || !resetLink) {
      throw new Error("Expected user password settings metric targets are missing.");
    }
    return {
      breadcrumbHeight: getComputedStyle(breadcrumb).height,
      formDisplay: getComputedStyle(form).display,
      navMarginTop: getComputedStyle(nav).marginTop,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      resetLinkDisplay: getComputedStyle(resetLink).display,
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
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
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
        if (owner === "user-password-description")
          return current.querySelector('input[type="password"]') ? 'class="mt10"' : "";
        if (
          owner === "user-password-form" ||
          owner === "user-password-input" ||
          owner === "user-password-list" ||
          owner === "user-password-term"
        )
          return "";
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
          "value",
          "autocomplete",
          "accesskey",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
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
