import { expect, test, type Page } from "@playwright/test";

const EXPECTED_MASSMAIL_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
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
          <span class="user-menu"><a href="__BASE_PATH__/siteboss">Profile</a></span>
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a>
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
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <h3>Site management</h3>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="site-setting-wrap">
    <div class="row-fluid">
      <div class="span2">
        <ul class="site-setting-nav">
          <li class=""><a href="__BASE_PATH__/sites/userList">Users</a></li>
          <li class=""><a href="__BASE_PATH__/sites/postList">Posts</a></li>
          <li class=""><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li class=""><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li class=""><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class="active"><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Send mass mails</h2>
        </div>
        <div class="mess-mail-wrap">
          <label class="radio" for="mailtoAll">
            <input type="radio" name="mailingType" id="mailtoAll" value="all" checked="checked" data-toggle="mail-type" data-action="hide">
            To all
          </label>
          <label class="radio" for="mailtoPrj">
            <input type="radio" name="mailingType" id="mailtoPrj" value="projects" data-toggle="mail-type" data-action="show">
            To members of a specific project
          </label>
          <div class="control-group hide" id="project-list-wrap">
            <div class="controls">
              <input id="input-project" type="text" class="span3" data-provider="typeahead" autocomplete="off" placeholder="Project name">
              <button id="select-project" type="submit" class="ybtn" data-loading-text="Loading...">
                <strong>Add</strong>
              </button>
            </div>
            <div id="selected-projects"></div>
          </div>
          <button id="write-email" type="submit" class="ybtn ybtn-primary">
            <strong>Write</strong>
          </button>
        </div>
      </div>
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

test("site admin mass mail matches legacy site/massMail.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page);

  await page.goto(`${basePath}/sites/massmail`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send mass emails");
  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#project-list-wrap")).toHaveClass(/hide/);
  const mailLink = page.locator(".site-setting-nav a", { hasText: "Send email" });
  await expect(mailLink).toHaveAttribute("href", `${basePath}/sites/mail`);
  await expect(
    page.locator(".site-setting-nav a", { hasText: "Send mass emails" }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_MASSMAIL_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await massMailDefaultMetrics(page)).toEqual({
    contentWidthRatio: 0.83,
    firstRadioInputMarginLeft: -20,
    firstRadioInputMarginTop: 4,
    firstRadioMinHeight: 20,
    firstRadioPaddingLeft: 20,
    firstRadioTextOffset: 0,
    sidebarWidthRatio: 0.15,
    titleAreaMarginBottom: 29,
    titleAreaPaddingBottom: 8,
    titleLineHeight: 30,
    writeButtonHeight: 30,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-massmail-sidebar";
  });
  await mailLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send email");
  await expect(page.locator(".title_area h2")).toHaveText("Send email");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-massmail-sidebar");
});

test("site admin mass mail project selection and mailto follow legacy JS flow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockMailList(page);
  await captureSubmittedForms(page);

  await page.goto(`${basePath}/sites/massmail`);

  await page.locator("#mailtoPrj").click();
  await expect(page.locator("#project-list-wrap")).not.toHaveClass(/hide/);
  await page.locator("#input-project").fill("admin/projectYobi");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects .label")).toHaveText("admin/projectYobi x");
  expect(await massMailProjectMetrics(page)).toEqual({
    addButtonHeight: 30,
    inputMarginBottom: 0,
    inputWidth: 206,
    projectWrapMarginBottom: 10,
    selectedLabelBackground: "rgb(58, 135, 173)",
    selectedLabelFontSize: 12,
    selectedLabelLineHeight: 14,
    selectedLabelMarginRight: 5,
    selectedLabelPaddingBlock: 4,
    selectedLabelPaddingInline: 8,
  });

  await page.locator("#input-project").fill("yona/docs");
  await page.keyboard.press("Enter");
  await expect(page.locator("#selected-projects .label")).toHaveText([
    "admin/projectYobi x",
    "yona/docs x",
  ]);

  await page.locator("#selected-projects .label a").first().click();
  await expect(page.locator("#selected-projects .label")).toHaveText("yona/docs x");

  await page.locator("#write-email").click();
  await expect.poll(() => requests.payloads).toEqual([{ all: false, projects: ["yona/docs"] }]);
  await expect
    .poll(() => page.evaluate(() => window.__submittedForms ?? []))
    .toEqual([{ action: "mailto:maintainer@example.com,writer@example.com,", method: "POST" }]);

  await page.locator("#mailtoAll").click();
  await expect(page.locator("#project-list-wrap")).toHaveClass(/hide/);
  await expect(page.locator("#selected-projects .label")).toHaveCount(0);

  await page.locator("#write-email").click();
  await expect
    .poll(() => requests.payloads)
    .toEqual([
      { all: false, projects: ["yona/docs"] },
      { all: true, projects: [] },
    ]);
});

async function massMailDefaultMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element;
    };

    const row = requireElement(".site-setting-wrap .row-fluid");
    const sidebar = requireElement(".site-setting-wrap .span2");
    const content = requireElement(".site-setting-wrap .span10");
    const titleArea = requireElement(".site-setting-wrap .title_area");
    const title = requireElement(".site-setting-wrap .title_area h2");
    const firstRadio = requireElement(".mess-mail-wrap .radio");
    const firstRadioInput = requireElement("#mailtoAll");
    const writeButton = requireElement("#write-email");

    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const titleAreaStyle = getComputedStyle(titleArea);
    const titleStyle = getComputedStyle(title);
    const firstRadioStyle = getComputedStyle(firstRadio);
    const firstRadioInputStyle = getComputedStyle(firstRadioInput);
    const firstRadioRect = firstRadio.getBoundingClientRect();
    const firstRadioInputRect = firstRadioInput.getBoundingClientRect();

    return {
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      firstRadioInputMarginLeft: Math.round(parseFloat(firstRadioInputStyle.marginLeft)),
      firstRadioInputMarginTop: Math.round(parseFloat(firstRadioInputStyle.marginTop)),
      firstRadioMinHeight: Math.round(parseFloat(firstRadioStyle.minHeight)),
      firstRadioPaddingLeft: Math.round(parseFloat(firstRadioStyle.paddingLeft)),
      firstRadioTextOffset: Math.round(firstRadioInputRect.left - firstRadioRect.left),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      titleAreaMarginBottom: Math.round(parseFloat(titleAreaStyle.marginBottom)),
      titleAreaPaddingBottom: Math.round(parseFloat(titleAreaStyle.paddingBottom)),
      titleLineHeight: Math.round(parseFloat(titleStyle.lineHeight)),
      writeButtonHeight: Math.round(writeButton.getBoundingClientRect().height),
    };
  });
}

async function massMailProjectMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element;
    };

    const projectWrap = requireElement("#project-list-wrap");
    const input = requireElement("#input-project");
    const addButton = requireElement("#select-project");
    const selectedLabel = requireElement("#selected-projects .label");

    const projectWrapStyle = getComputedStyle(projectWrap);
    const inputStyle = getComputedStyle(input);
    const selectedLabelStyle = getComputedStyle(selectedLabel);

    return {
      addButtonHeight: Math.round(addButton.getBoundingClientRect().height),
      inputMarginBottom: Math.round(parseFloat(inputStyle.marginBottom)),
      inputWidth: Math.round(input.getBoundingClientRect().width),
      projectWrapMarginBottom: Math.round(parseFloat(projectWrapStyle.marginBottom)),
      selectedLabelBackground: selectedLabelStyle.backgroundColor,
      selectedLabelFontSize: Math.round(parseFloat(selectedLabelStyle.fontSize)),
      selectedLabelLineHeight: Math.round(parseFloat(selectedLabelStyle.lineHeight)),
      selectedLabelMarginRight: Math.round(parseFloat(selectedLabelStyle.marginRight)),
      selectedLabelPaddingBlock:
        Math.round(parseFloat(selectedLabelStyle.paddingTop)) +
        Math.round(parseFloat(selectedLabelStyle.paddingBottom)),
      selectedLabelPaddingInline:
        Math.round(parseFloat(selectedLabelStyle.paddingLeft)) +
        Math.round(parseFloat(selectedLabelStyle.paddingRight)),
    };
  });
}

async function mockSiteAdminSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      }),
    });
  });

  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({ user: { loginId: "siteboss" } }),
    });
  });
}

async function mockMailList(page: Page) {
  const requests = {
    payloads: [] as Array<{ all: boolean; projects: string[] }>,
  };

  await page.route("**/api/v1/site/mail-list", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      all?: boolean;
      projects?: string[];
    };
    requests.payloads.push({ all: body.all === true, projects: body.projects ?? [] });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ recipients: ["maintainer@example.com", "writer@example.com"] }),
    });
  });

  return requests;
}

async function mockMailOptions(page: Page) {
  await page.route("**/api/v1/site/mail", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        notConfiguredItems: ["smtp.host", "smtp.port"],
        sender: "noreply@example.com",
        sent: false,
      }),
    });
  });
}

async function captureSubmittedForms(page: Page) {
  await page.addInitScript(() => {
    window.__submittedForms = [];
    HTMLFormElement.prototype.submit = function submit() {
      window.__submittedForms?.push({
        action: this.getAttribute("action") ?? "",
        method: this.getAttribute("method") ?? "",
      });
    };
  });
}

declare global {
  interface Window {
    __submittedForms?: Array<{ action: string; method: string }>;
  }
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "for",
        "name",
        "type",
        "method",
        "action",
        "value",
        "checked",
        "required",
        "placeholder",
        "rows",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-action",
        "data-loading-text",
        "data-provider",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => {
          const value = name === "checked" ? "checked" : (current.getAttribute(name) ?? "");
          return `${name}=${JSON.stringify(value)}`;
        })
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((source) => {
    const template = document.createElement("template");
    template.innerHTML = source;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "for",
        "name",
        "type",
        "method",
        "action",
        "value",
        "checked",
        "required",
        "placeholder",
        "rows",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-action",
        "data-loading-text",
        "data-provider",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => {
          const value = name === "checked" ? "checked" : (current.getAttribute(name) ?? "");
          return `${name}=${JSON.stringify(value)}`;
        })
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
