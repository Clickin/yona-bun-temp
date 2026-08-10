import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const EXPECTED_USER_TOKEN_SCREEN = `
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
  <div class="site-breadcrumb-inner"><h3>User Token</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs mt20">
      <li><a href="__BASE_PATH__/user/editform">Edit profile</a></li>
      <li><a href="__BASE_PATH__/user/editform/password">Change password</a></li>
      <li><a href="__BASE_PATH__/user/editform/notifications">Notification settings</a></li>
      <li><a href="__BASE_PATH__/user/editform/emails">Email settings</a></li>
      <li class="active"><a href="__BASE_PATH__/user/editform/token">User Token</a></li>
    </ul>
    <div class="token-generate">
      <form id="frmBasic" method="post" action="__BASE_PATH__/user/editform/token_reset" class="pull-left" style="width: 100%;">
        <div>User Token</div>
        <div><input size="45" style="width: 90%;" type="text" name="name" class="text" value="token-before" readonly=""></div>
        <div><button type="submit" class="ybtn ybtn-success">Recreate User Token</button></div>
      </form>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;

test("current-user token route body matches legacy user/edit_token.scala.html DOM", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
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
    const body =
      route.request().method() === "POST"
        ? workspaceBody("token-after")
        : workspaceBody("token-before");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("**/api/v1/workspace/api-token/reset", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(workspaceBody("token-after")),
    });
  });

  await page.goto(`${basePath}/user/editform/token`);
  const wrapper = page.locator("[data-testid=user-token-settings-wrapper]");
  const form = page.locator('[data-owner="user-token-settings-form"]');
  const input = page.locator('[data-owner="user-token-settings-input"]');
  const action = page.locator('[data-owner="user-token-settings-reset-action"]');
  await expect(wrapper).toBeAttached();
  await expect(form).not.toHaveClass(/\bpull-left\b/u);
  await expect(input).not.toHaveClass(/\btext\b/u);
  await expect(action).not.toHaveClass(/\bybtn(?:-success)?\b/u);
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
    EXPECTED_USER_TOKEN_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readTokenMetrics(page)).toEqual({
    breadcrumbHeight: "45px",
    formFloat: "left",
    navMarginTop: "20px",
    pageWrapMarginTop: "10px",
  });
  expectTokenOwnerMetrics(await readTokenOwnerMetrics(page), "desktop");
  await action.hover();
  await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
  await expect(action).toHaveCSS("border-color", "rgb(233, 94, 1)");
  await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
  await action.focus();
  await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
  const actionBox = await action.boundingBox();
  if (!actionBox) throw new Error("Expected token reset action geometry");
  await page.mouse.move(actionBox.x + actionBox.width / 2, actionBox.y + actionBox.height / 2);
  await page.mouse.down();
  await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
  await page.mouse.move(actionBox.x + actionBox.width + 20, actionBox.y + actionBox.height + 20);
  await page.mouse.up();

  const editTabs = page.locator('[data-owner="user-settings-edit-tab-item"]');
  await expect(editTabs).toHaveCount(5);
  await expect(editTabs).toHaveText([
    "Edit profile",
    "Change password",
    "Notification settings",
    "Email settings",
    "User Token",
  ]);
  const editTabLinks = editTabs.locator("a");
  await expect(editTabLinks).toHaveClass(["", "", "", "", ""]);
  expect(
    await editTabLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/user/editform`,
    `${basePath}/user/editform/password`,
    `${basePath}/user/editform/notifications`,
    `${basePath}/user/editform/emails`,
    `${basePath}/user/editform/token`,
  ]);
  expect(
    await editTabLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
        text: link.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Edit profile" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Change password" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Notification settings" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Email settings" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "User Token" },
  ]);
  await expect(editTabs.nth(4)).toHaveClass("active");
  await input.click();
  expect(await input.evaluate((node) => [node.selectionStart, node.selectionEnd])).toEqual([
    0,
    "token-before".length,
  ]);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "token-password-tab";
  });
  await page
    .locator('[data-owner="user-settings-edit-tab-link"]:has-text("Change password")')
    .click();
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("token-password-tab");

  await page.goto(`${basePath}/user/editform/token`);
  await action.click();
  await expect(input).toHaveValue("token-after");
});

test("current-user token settings route owns the token form without presentation classes", async () => {
  const source = readFileSync("src/routes/user/editform/token.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const owner of [
    "user-token-settings-wrapper",
    "user-token-settings-form",
    "user-token-settings-input",
    "user-token-settings-reset-action",
  ])
    expect(source).toContain(`data-owner="${owner}"`);
  for (const style of ["styles.form", "styles.input", "styles.resetAction"])
    expect(source).toContain(style);
  for (const retired of ["token-generate", "pull-left", 'className="text"', "ybtn-success"])
    expect(source).not.toContain(retired);

  for (const variable of [
    "actionBorder",
    "actionShadow",
    "actionSurface",
    "actionInteractiveSurface",
    "actionText",
  ])
    expect(theme).toContain(variable);
});

test("current-user token settings preserves exact mobile token geometry and generic input fallback", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token-mobile" },
      body: JSON.stringify({ csrfToken: "csrf-token-mobile" }),
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(workspaceBody("token-before")),
    }),
  );
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/user/editform/token`);
  await expect(page.locator("[data-testid=user-token-settings-wrapper]")).toBeAttached();
  expectTokenOwnerMetrics(await readTokenOwnerMetrics(page), "mobile");
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

function workspaceBody(apiToken: string) {
  return {
    apiToken,
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      connectedSocialProviders: [],
      displayName: "Admin",
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

async function readTokenMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(
      '[data-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>('[data-owner="user-settings-edit-tabs"]');
    const form = document.querySelector<HTMLElement>("#frmBasic");
    if (!breadcrumb || !pageWrapOuter || !nav || !form) {
      throw new Error("Expected user token metric targets are missing.");
    }
    return {
      breadcrumbHeight: getComputedStyle(breadcrumb).height,
      formFloat: getComputedStyle(form).float,
      navMarginTop: getComputedStyle(nav).marginTop,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
    };
  });
}

function expectTokenOwnerMetrics(
  metrics: Awaited<ReturnType<typeof readTokenOwnerMetrics>>,
  viewport: "desktop" | "mobile",
) {
  // Shared page/tab ancestry shifts absolute local coordinates, and translated button copy changes
  // intrinsic width. This owner pins only the legacy-relative geometry it actually controls.
  const { action, form, input, wrapper } = metrics;
  expect(wrapper.height).toBe(0);
  expect(form.box).toEqual({ ...wrapper, height: 90 });
  expect(form.cssFloat).toBe("left");
  expect(form.marginBottom).toBe("2px");
  expect(Number.parseFloat(form.width)).toBeCloseTo(wrapper.width, 4);

  expect(input.box.x).toBeCloseTo(form.box.x, 4);
  expect(input.box.y - form.box.y).toBeCloseTo(20, 4);
  expect(input.box.height).toBe(30);
  expect(input.box.width).toBeCloseTo(form.box.width * 0.9 + 14, 4);
  expect(Number.parseFloat(input.width)).toBeCloseTo(form.box.width * 0.9, 4);
  expect(input.box.x + input.box.width).toBeLessThanOrEqual(form.box.x + form.box.width + 0.01);
  expect(input).toMatchObject({
    backgroundColor: "rgb(238, 238, 238)",
    border: "1px solid rgb(204, 204, 204)",
    color: "rgb(85, 85, 85)",
    fontSize: viewport === "desktop" ? "12px" : "16px",
    lineHeight: "20px",
  });

  expect(action.box.x).toBeCloseTo(form.box.x, 4);
  expect(action.box.y - form.box.y).toBeCloseTo(60, 4);
  expect(action.box.height).toBe(30);
  expect(action.box.width).toBeGreaterThan(0);
  expect(action.box.x + action.box.width).toBeLessThanOrEqual(form.box.x + form.box.width + 0.01);
  expect(action).toMatchObject({
    backgroundColor: "rgb(255, 115, 50)",
    border: "1px solid rgb(233, 94, 1)",
    borderRadius: "3px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    color: "rgb(255, 255, 255)",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 12px",
  });
}

async function readTokenOwnerMetrics(page: Page) {
  return page.evaluate(() => {
    const get = (owner: string) => document.querySelector<HTMLElement>(`[data-owner="${owner}"]`)!;
    const wrapper = get("user-token-settings-wrapper");
    const form = get("user-token-settings-form");
    const input = get("user-token-settings-input");
    const action = get("user-token-settings-reset-action");
    const box = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const formStyle = getComputedStyle(form);
    const inputStyle = getComputedStyle(input);
    const actionStyle = getComputedStyle(action);
    return {
      action: {
        backgroundColor: actionStyle.backgroundColor,
        border: actionStyle.border,
        borderRadius: actionStyle.borderRadius,
        box: box(action),
        boxShadow: actionStyle.boxShadow,
        color: actionStyle.color,
        fontSize: actionStyle.fontSize,
        lineHeight: actionStyle.lineHeight,
        padding: actionStyle.padding,
      },
      form: {
        box: box(form),
        cssFloat: formStyle.cssFloat,
        marginBottom: formStyle.marginBottom,
        width: formStyle.width,
      },
      input: {
        backgroundColor: inputStyle.backgroundColor,
        border: inputStyle.border,
        box: box(input),
        color: inputStyle.color,
        fontSize: inputStyle.fontSize,
        lineHeight: inputStyle.lineHeight,
        width: inputStyle.width,
      },
      wrapper: box(wrapper),
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
        "size",
        "style",
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
        const owner = current.getAttribute("data-owner");
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
        (current.getAttribute("data-owner") ?? "").startsWith("user-token-settings-")
      ) {
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
      if (name === "style" && current instanceof HTMLElement) {
        return `${name}=${JSON.stringify(current.style.cssText)}`;
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    return Array.from(
      document.querySelectorAll('[data-owner="user-settings-breadcrumb-outer"], .page-wrap-outer'),
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
          "size",
          "style",
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
        if (
          name === "class" &&
          (current.matches(".token-generate") ||
            current.matches(".token-generate > form.pull-left") ||
            current.matches('.token-generate input.text[name="name"]') ||
            current.matches(".token-generate button.ybtn.ybtn-success"))
        ) {
          const normalized = value
            .split(/\s+/u)
            .filter(
              (token) =>
                !["token-generate", "pull-left", "text", "ybtn", "ybtn-success"].includes(token),
            )
            .join(" ");
          return normalized ? `${name}=${JSON.stringify(normalized)}` : "";
        }
        if (
          name === "style" &&
          (current.matches(".token-generate > form") ||
            current.matches('.token-generate input[name="name"]'))
        ) {
          return "";
        }
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
        if (name === "style" && current instanceof HTMLElement) {
          return `${name}=${JSON.stringify(current.style.cssText)}`;
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .filter((root) => root.matches(".site-breadcrumb-outer, .page-wrap-outer"))
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
