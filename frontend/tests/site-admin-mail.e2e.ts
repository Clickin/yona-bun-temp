import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

interface SiteMailSubmitRequest {
  body: {
    body: string;
    from: string;
    subject: string;
    to: string;
  };
  csrfToken: string | null;
}

const EXPECTED_MAIL_NOT_CONFIGURED_SCREEN = `
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
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
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
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
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
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button>
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
          <li class="active"><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class=""><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Send email</h2>
        </div>
        <div class="alert alert-error">
          <p>Mailer has not been configured. Set following properties in conf/application.conf.</p>
          <ul>
            <li>smtp.host</li>
            <li>smtp.user</li>
            <li>smtp.password</li>
          </ul>
        </div>
        <form id="mailForm" method="post" action="__BASE_PATH__/sites/mail" class="form-horizontal">
          <div class="control-group">
            <label name="from" class="control-label span3">From</label>
            <div class="controls">
              <input type="text" name="from" value="noreply@example.com" required="" placeholder="sender@mail.com" class="span4">
            </div>
          </div>
          <div class="control-group">
            <label name="to" class="control-label">To</label>
            <div class="controls">
              <input type="text" class="span4" name="to" required="" placeholder="receipient@mail.com">
            </div>
          </div>
          <div class="control-group mr10">
            <label name="subject" class="control-label">Subject</label>
            <div class="controls">
              <input type="text" name="subject" class="span12">
            </div>
          </div>
          <div class="control-group mr10">
            <label name="body" class="control-label">Body</label>
            <div class="controls">
              <textarea id="body" name="body" rows="16" class="span12 input-xlarge textbody"></textarea>
            </div>
          </div>
          <div class="span12 mail-btn-wrap">
            <button type="submit" class="ybtn ybtn-primary"><strong>Send</strong></button>
          </div>
        </form>
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

test("site admin mail matches legacy site/mail.scala.html not-configured DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page);

  await page.goto(`${basePath}/sites/mail`);
  await expect(page).toHaveTitle("Send email");
  expect(new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
  expect(new URL(page.url()).search).toBe("");
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  expect(await gnbNavAnchorHrefs(page)).toEqual([
    basePath,
    `${basePath}/projects`,
    "https://github.com/yona-projects/yona/issues",
  ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send email");
  await expect(page.locator(".site-setting-nav a")).toHaveText([
    "Users",
    "Posts",
    "Issues",
    "Projects",
    "Send email",
    "Send mass emails",
    "Software Update",
    "Diagnostics",
  ]);
  expect(await siteSettingSidebarHrefs(page)).toEqual([
    `${basePath}/sites/userList`,
    `${basePath}/sites/postList`,
    `${basePath}/sites/issueList`,
    `${basePath}/sites/projectList`,
    `${basePath}/sites/mail`,
    `${basePath}/sites/massmail`,
    `${basePath}/sites/update`,
    `${basePath}/sites/diagnostic`,
  ]);
  expect(await siteSettingSidebarAnchorActiveMarkers(page)).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Users" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Posts" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Issues" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Projects" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send email" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send mass emails" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Software Update" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Diagnostics" },
  ]);
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  await expect(page.locator(".site-setting-nav li").nth(4)).toHaveClass("active");
  await expect(page.locator("#mailForm")).toHaveAttribute("action", `${basePath}/sites/mail`);
  await expect(page.locator('input[name="from"]')).toHaveValue("noreply@example.com");
  const massMailLink = page.locator(".site-setting-nav a", { hasText: "Send mass emails" });
  await expect(massMailLink).toHaveAttribute("href", `${basePath}/sites/massmail`);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_MAIL_NOT_CONFIGURED_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await legacyMailShellMetrics(page)).toEqual({
    feedbackRightOfProjects: true,
    navbarClassName: "gnb-outer",
    searchBottomWithinNavbar: true,
    searchBoxDoesNotOverlapFeedback: true,
    searchBoxHasSelectClass: false,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
  expect(await mailFormMetrics(page)).toEqual({
    alertBackground: "rgb(242, 222, 222)",
    alertBorderTopWidth: 1,
    alertMarginBottom: 20,
    alertPaddingBlock: 16,
    alertPaddingInline: 49,
    bodyTextareaRows: 16,
    buttonHeight: 30,
    buttonOffsetFromCenter: 0,
    contentWidthRatio: 0.83,
    controlGap: 20,
    controlGroupMarginBottom: 20,
    controlLabelPaddingTop: 5,
    controlLabelTextAlign: "right",
    controlLabelWidth: 160,
    controlsMarginLeft: 180,
    fromInputHeight: 30,
    fromInputWidthRatio: 0.32,
    sidebarWidthRatio: 0.15,
    subjectInputWidthRatio: 0.99,
    titleAreaMarginBottom: 29,
    titleAreaPaddingBottom: 8,
    titleLineHeight: 30,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-mail-sidebar";
  });
  await massMailLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/massmail`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send mass emails");
  await expect(page.locator(".title_area h2")).toHaveText("Send mass mails");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-mail-sidebar");
});

test("site admin mail renders legacy sended=true success state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });

  await page.goto(`${basePath}/sites/mail?sended=true`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".title_area h2")).toHaveText("Send email");
  await expect(page.locator(".span10 > .alert-success")).toHaveText("Mail has been sent.");
  await expect(page.locator(".span10 > .alert-error")).toHaveCount(0);
  await expect(page.locator("#mailForm")).toHaveAttribute("action", `${basePath}/sites/mail`);
  await expect(page.locator('input[name="from"]')).toHaveValue("site-admin@yona.local");
  expect(await mailSuccessStateOrder(page)).toEqual([
    "title_area",
    "alert alert-success",
    "form-horizontal",
  ]);
});

test("site admin mail submits the legacy payload and rerenders a blank compose form on success", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let submitRequest: SiteMailSubmitRequest | null = null;

  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });
  await page.route("**/api/v1/site/mail/test", async (route) => {
    submitRequest = {
      body: JSON.parse(route.request().postData() ?? "{}") as SiteMailSubmitRequest["body"],
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        notConfiguredItems: [],
        sender: "site-admin@yona.local",
        sent: true,
      }),
    });
  });

  await page.goto(`${basePath}/sites/mail`);
  await page.fill('input[name="from"]', "custom-sender@example.com");
  await page.fill('input[name="to"]', "recipient@example.com");
  await page.fill('input[name="subject"]', "Legacy parity subject");
  await page.fill('textarea[name="body"]', "Legacy parity body");
  await page.click('#mailForm button[type="submit"]');

  await expect(page.locator(".span10 > .alert-success")).toHaveText("Mail has been sent.");
  expect(submitRequest).toEqual({
    body: {
      body: "Legacy parity body",
      from: "custom-sender@example.com",
      subject: "Legacy parity subject",
      to: "recipient@example.com",
    },
    csrfToken: "csrf-site-mail",
  });
  await expect(page.locator('input[name="from"]')).toHaveValue("site-admin@yona.local");
  await expect(page.locator('input[name="to"]')).toHaveValue("");
  await expect(page.locator('input[name="subject"]')).toHaveValue("");
  await expect(page.locator('textarea[name="body"]')).toHaveValue("");
  expect(await mailSuccessStateOrder(page)).toEqual([
    "title_area",
    "alert alert-success",
    "form-horizontal",
  ]);
});

test("site admin mail shows legacy common.loading while mail options load", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let releaseMailOptions: (() => void) | undefined;

  await mockSiteAdminSession(page);
  await page.route("**/api/v1/site/mail", async (route) => {
    await new Promise<void>((resolve) => {
      releaseMailOptions = resolve;
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        notConfiguredItems: [],
        sender: "site-admin@yona.local",
        sent: false,
      }),
    });
  });

  await page.goto(`${basePath}/sites/mail`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".span10 > .title_area h2")).toHaveText("Send email");
  await expect(page.locator(".span10 > p")).toHaveText("Loading");
  await expect(page.locator("#mailForm")).toHaveCount(0);

  releaseMailOptions?.();
  await expect(page.locator("#mailForm")).toBeVisible();
  await expect(page.locator(".span10 > p")).toHaveCount(0);
});

test("site admin mail renders legacy errorMessage alert state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });

  await page.goto(`${basePath}/sites/mail?errorMessage=validation.invalidEmail`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".span10 > .alert-error p")).toHaveText([
    "Failed to send mail.",
    "Enter valid email address!",
  ]);
  await expect(page.locator(".span10 > .alert-success")).toHaveCount(0);
  await expect(page.locator("#mailForm")).toHaveAttribute("action", `${basePath}/sites/mail`);
  expect(await mailErrorStateOrder(page)).toEqual([
    "title_area",
    "alert alert-error",
    "form-horizontal",
  ]);
});

test("site admin mail renders legacy Html error message line breaks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });

  await page.goto(`${basePath}/sites/mail?errorMessage=common.experimental.description`);
  const message = page.locator(".span10 > .alert-error p").nth(1);
  await expect(message).toContainText(
    "Work on this function is underway; it can be modified or interrupted at any moment.",
  );
  await expect(message).toContainText("Thanks for your patience.");
  await expect(message.locator("br")).toHaveCount(1);
  await expect(message.locator("a")).toHaveCount(0);
});

test("site admin mail renders legacy Html error message external link", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });

  await page.goto(`${basePath}/sites/mail?errorMessage=error.unsupported.ie`);
  const message = page.locator(".span10 > .alert-error p").nth(1);
  await expect(message.locator("br")).toHaveCount(1);
  await expect(message).toContainText("Please note that you're using an unsupported version");
  await expect(message).toContainText("We recommend the Google Chrome or 10+ version");

  const chromeLink = message.locator("a", { hasText: "Google Chrome" });
  await expect(chromeLink).toHaveAttribute("href", "http://www.google.com/chrome/");
  await expect(chromeLink).toHaveAttribute("target", "_blank");
});

test("site admin mail renders legacy Html error message arbitrary anchor", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page, {
    notConfiguredItems: [],
    sender: "site-admin@yona.local",
    sent: false,
  });

  await page.goto(`${basePath}/sites/mail?errorMessage=notification.linkToViewHtml`);
  const message = page.locator(".span10 > .alert-error p").nth(1);
  await expect(message).toHaveText("View it on {0}");
  await expect(message.locator("a")).toHaveCount(0);
  await expect(message.locator("br")).toHaveCount(0);
});

test("site admin mail renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page);
  await mockAvailableUpdate(page);

  await page.goto(`${basePath}/sites/mail`);
  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
});

test("site admin mail route source keeps direct typed sidebar links", async () => {
  const source = await readFile("src/routes/sites/mail.tsx", "utf8");

  expect(source).toContain("showLegacyProjectHeaderLinks");
  expect(source).toContain('<title>{t("title.sendMail")}</title>');
  expect(source).toContain(
    "const legacyMailSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };",
  );
  expect(source).toContain(
    '<Link {...legacySiteSidebarLinkProps} search={legacyMailSidebarSearch} to="/sites/mail">',
  );
  expect(source).not.toContain(
    'errorMessage: typeof search.errorMessage === "string" ? search.errorMessage : ""',
  );
  expect(source).not.toContain('sended: search.sended === true || search.sended === "true",');
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("legacyHtmlAnchorTag");
  expect(source).not.toContain("matchAll(tokenPattern)");
  expect(source).not.toContain("new RegExp(");
  expect(source).not.toContain("to={item.href}");
  expect(source).not.toContain("DOMParser");
  expect(source).not.toContain("parseFromString");
  expect(source).not.toContain("useLegacySiteMailDocumentTitle");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain('globalThis["document"]');
  expect(source).not.toContain("const document =");
  expect(source).not.toContain("document.body");
  expect(source).not.toContain("const mailHref =");
  expect(source).not.toContain("<a href={mailHref}>");
  expect(source).toContain("<Link");
});

async function gnbNavAnchorHrefs(page: Page) {
  return page.locator('[data-stylex-owner="global-gnb-nav"] a[href]').evaluateAll((links) =>
    links.map((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        throw new Error("Missing gnb nav href");
      }
      return href.startsWith("http") ? href : new URL(href, window.location.origin).pathname;
    }),
  );
}

async function siteSettingSidebarHrefs(page: Page) {
  return page.locator(".site-setting-nav a").evaluateAll((links) =>
    links.map((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        throw new Error("Missing site setting sidebar href");
      }
      return new URL(href, window.location.origin).pathname;
    }),
  );
}

async function siteSettingSidebarAnchorActiveMarkers(page: Page) {
  return page.locator(".site-setting-nav a").evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      text: link.textContent?.trim() ?? "",
    })),
  );
}

async function mailErrorStateOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".site-setting-wrap .span10 > *"),
      (element) => element.getAttribute("class") ?? element.tagName.toLowerCase(),
    ),
  );
}

async function mailSuccessStateOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".site-setting-wrap .span10 > *"),
      (element) => element.getAttribute("class") ?? element.tagName.toLowerCase(),
    ),
  );
}

async function mailFormMetrics(page: Page) {
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
    const alert = requireElement(".site-setting-wrap .alert-error");
    const firstControlGroup = requireElement("#mailForm .control-group");
    const secondControlGroup = requireElement("#mailForm .control-group:nth-of-type(2)");
    const firstControlLabel = requireElement("#mailForm .control-label");
    const firstControls = requireElement("#mailForm .controls");
    const fromInput = requireElement('#mailForm input[name="from"]');
    const subjectInput = requireElement('#mailForm input[name="subject"]');
    const bodyTextarea = requireElement("#body");
    const buttonWrap = requireElement(".mail-btn-wrap");
    const button = requireElement('[data-stylex-owner="site-mail-send-action"]');

    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const titleAreaStyle = getComputedStyle(titleArea);
    const titleStyle = getComputedStyle(title);
    const alertStyle = getComputedStyle(alert);
    const firstControlGroupStyle = getComputedStyle(firstControlGroup);
    const firstControlGroupRect = firstControlGroup.getBoundingClientRect();
    const secondControlGroupRect = secondControlGroup.getBoundingClientRect();
    const firstControlLabelStyle = getComputedStyle(firstControlLabel);
    const firstControlsStyle = getComputedStyle(firstControls);
    const firstControlsRect = firstControls.getBoundingClientRect();
    const fromInputRect = fromInput.getBoundingClientRect();
    const subjectInputRect = subjectInput.getBoundingClientRect();
    const buttonWrapRect = buttonWrap.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    return {
      alertBackground: alertStyle.backgroundColor,
      alertBorderTopWidth: Math.round(parseFloat(alertStyle.borderTopWidth)),
      alertMarginBottom: Math.round(parseFloat(alertStyle.marginBottom)),
      alertPaddingBlock:
        Math.round(parseFloat(alertStyle.paddingTop)) +
        Math.round(parseFloat(alertStyle.paddingBottom)),
      alertPaddingInline:
        Math.round(parseFloat(alertStyle.paddingLeft)) +
        Math.round(parseFloat(alertStyle.paddingRight)),
      bodyTextareaRows: Number(bodyTextarea.getAttribute("rows")),
      buttonHeight: Math.round(buttonRect.height),
      buttonOffsetFromCenter: Math.abs(
        Math.round(
          buttonRect.left + buttonRect.width / 2 - (buttonWrapRect.left + buttonWrapRect.width / 2),
        ),
      ),
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      controlGap: Math.round(secondControlGroupRect.top - firstControlGroupRect.bottom),
      controlGroupMarginBottom: Math.round(parseFloat(firstControlGroupStyle.marginBottom)),
      controlLabelPaddingTop: Math.round(parseFloat(firstControlLabelStyle.paddingTop)),
      controlLabelTextAlign: firstControlLabelStyle.textAlign,
      controlLabelWidth: Math.round(firstControlLabel.getBoundingClientRect().width),
      controlsMarginLeft: Math.round(parseFloat(firstControlsStyle.marginLeft)),
      fromInputHeight: Math.round(fromInputRect.height),
      fromInputWidthRatio: Number((fromInputRect.width / firstControlsRect.width).toFixed(2)),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      subjectInputWidthRatio: Number((subjectInputRect.width / firstControlsRect.width).toFixed(2)),
      titleAreaMarginBottom: Math.round(parseFloat(titleAreaStyle.marginBottom)),
      titleAreaPaddingBottom: Math.round(parseFloat(titleAreaStyle.paddingBottom)),
      titleLineHeight: Math.round(parseFloat(titleStyle.lineHeight)),
    };
  });
}

async function legacyMailShellMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element;
    };

    const navbar = requireElement("[data-stylex-owner=global-gnb-outer]");
    const searchForm = requireElement('form[name="gnb-search-form"]');
    const searchBox = requireElement('[data-stylex-owner="global-gnb-search-box"]');
    const feedbackLink = requireElement(
      '[data-stylex-owner="global-gnb-nav"] a[href="https://github.com/yona-projects/yona/issues"]',
    );
    const projectsLink = requireElement(
      '[data-stylex-owner="global-gnb-nav"] a[href$="/projects"]',
    );
    const navbarRect = navbar.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();
    const feedbackRect = feedbackLink.getBoundingClientRect();
    const projectsRect = projectsLink.getBoundingClientRect();

    return {
      feedbackRightOfProjects: feedbackRect.left >= projectsRect.right,
      navbarClassName: navbar.className,
      searchBottomWithinNavbar: searchFormRect.bottom <= navbarRect.bottom,
      searchBoxDoesNotOverlapFeedback: searchBoxRect.left >= feedbackRect.right,
      searchBoxHasSelectClass: searchBox.classList.contains("select"),
      searchRightWithinNavbar: searchFormRect.right <= navbarRect.right,
      searchTopWithinNavbar: searchFormRect.top >= navbarRect.top,
    };
  });
}

async function mockSiteAdminSession(page: Page) {
  const fulfillSession = async (route: Route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-mail" },
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
  };

  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
}

async function mockAvailableUpdate(page: Page) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/yona-1.1.0",
        versionToUpdate: "1.1.0",
      }),
    });
  });
}

async function mockMailOptions(
  page: Page,
  response = {
    notConfiguredItems: ["smtp.host", "smtp.user", "smtp.password"],
    sender: "noreply@example.com",
    sent: false,
  },
) {
  await page.route("**/api/v1/site/mail", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .site-breadcrumb-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (name === "class" && current.matches('[data-stylex-owner="site-mail-send-action"]')) {
        return "";
      }
      if (
        name === "class" &&
        current.closest('[data-stylex-owner="site-mail-title-strip"]') !== null
      ) {
        return (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter((token) => !token.startsWith("x"))
          .join(" ");
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
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      return value;
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
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
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
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

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      const isMailSendAction =
        name === "class" &&
        current.matches(".mail-btn-wrap > button.ybtn.ybtn-primary") &&
        current.querySelector(":scope > strong") !== null;
      if (isMailSendAction) {
        return "";
      }
      const isSiteLayoutHeader =
        name === "class" &&
        value.split(/\s+/u).includes("gnb-outer") &&
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
            : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : name === "class" &&
                    value.split(/\s+/u).includes("gnb-inner") &&
                    current.matches("header.gnb-outer > div.gnb-inner") &&
                    current.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : name === "class" &&
                      value.split(/\s+/u).includes("gnb-nav") &&
                      current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
      }
      return value;
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
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
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
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
