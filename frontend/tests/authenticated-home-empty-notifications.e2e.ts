import { expect, test, type Page } from "@playwright/test";

const EXPECTED_AUTHENTICATED_HOME = `
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
            <input type="text" name="keyword" autocomplete="off">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <div class="site-guide-outer hide">
      <h3>
        <span>Tada! Welcome to Yona! - Web-based platform for collaborative software development</span>
      </h3>
      <table class="welcome-table table borderless">
        <tbody>
          <tr>
            <td><a href="__BASE_PATH__/projects/new" class="ybtn ybtn-success">Create new project</a></td>
            <td>Create your own project</td>
          </tr>
          <tr>
            <td><a href="__BASE_PATH__/organizations/new" class="ybtn ybtn-success">New Group</a></td>
            <td>If you want to make a group and work with other members, then create a group</td>
          </tr>
          <tr>
            <td><a href="__BASE_PATH__/projects" class="ybtn ybtn-success">Project list</a></td>
            <td>Find a project in which you are interested</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="guide-toggle">
      <button class="btn-transparent" id="toggleIntro" type="button"><i class="yobicon-resizev"></i></button>
    </div>
    <div class="page on-fold-intro">
      <div class="row-fluid content-container">
        <div class="span8 main-stream">
          <ul class="nav nav-tabs">
            <li class="active"><a href="__BASE_PATH__/notifications">Notification</a></li>
            <li><a href="__BASE_PATH__/issues">My Issues</a></li>
            <li><a href="__BASE_PATH__/user/files">My Files</a></li>
            <li></li>
          </ul>
          <ul class="activity-streams notification-wrap unstyled">
            <div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>
          </ul>
        </div>
        <div class="span4 index-menu right-menu span-hard-wrap"></div>
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

const EXPECTED_DIRECT_NOTIFICATIONS = EXPECTED_AUTHENTICATED_HOME.replace(
  `<li></li>
          </ul>`,
  `<li><button id="setDefaultLoginPage" class="ybtn hide-in-mobile" type="button" data-url="notifications" title="Set to default page" data-trigger="hover" data-placement="bottom" data-toggle="popover" data-content="Make current page the index page when logged in">Set to default page</button></li>
          </ul>`,
);

const EXPECTED_DIRECT_NOTIFICATIONS_WITH_NOTIFICATION = EXPECTED_DIRECT_NOTIFICATIONS.replace(
  `<div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>`,
  `<li class="notification-stream">
    <div class="stream-type comment2"><i class="yobicon-comment2"></i></div>
    <div class="stream-desc" data-target="message-42" data-toggle="learnmore">
      <div class="stream-info">
        <div class="title"><a href="__BASE_PATH__/admin/sample/issue/1">Issue #1 updated</a></div>
        <div class="message-wrap nowrap" id="message-42">
          <div class="message">A new comment was added.</div>
        </div>
        <div class="meta">
          <a class="avatar-wrap smaller" href="__BASE_PATH__/admin">
            <img src="/assets/images/default-avatar-64.png">
          </a>
          <a href="__BASE_PATH__/admin" class="author">Site Admin</a>@admin
          <span class="ago pull-right" title="2026-06-30T12:00:00Z">just now</span>
        </div>
      </div>
    </div>
  </li>`,
);

const EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS = {
  activityStreamsMarginTop: "0px",
  gnbInnerHeight: "40px",
  gnbInnerWidth: 1254,
  gnbOuterBackground: "rgb(27, 27, 27)",
  gnbOuterHeight: "40px",
  guideToggleButtonBorderBottomLeftRadius: "6px",
  guideToggleButtonBorderBottomRightRadius: "6px",
  guideToggleButtonPaddingLeft: "25px",
  logoBackground: "rgb(255, 87, 34)",
  logoLineHeight: "40px",
  logoPadding: "6px 10px",
  mainStreamMarginBottom: "15px",
  navLinkColor: "rgb(85, 85, 85)",
  navLinkFontWeight: "700",
  navLinkPaddingLeft: "30px",
  pageFooterLineHeight: "34px",
  pageFooterOuterPadding: "10px 0px",
  pageWrapOuterMarginTop: "10px",
  pageWrapOuterMinHeight: "450px",
  providerColor: "rgb(51, 51, 51)",
  providerFontSize: "9px",
  providerMarginLeft: "4px",
};

const EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS = {
  ...EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS,
  warningBackground: "rgb(139, 139, 139)",
  warningBorderRadius: "6px",
  warningColor: "rgb(255, 255, 255)",
  warningFontSize: "16px",
  warningPaddingTop: "15px",
};

test("authenticated home empty notifications matches legacy index notifications screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator(".warning-none")).toContainText("No notification");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_AUTHENTICATED_HOME.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );
});

test("direct notifications route matches legacy Application.notifications empty state DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator(".warning-none")).toContainText("No notification");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DIRECT_NOTIFICATIONS.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );
});

test("direct notifications route matches legacy populated notification row DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-64.png",
        displayName: "Site Admin",
        loginId: "admin",
      },
      createdAt: "2026-06-30T12:00:00Z",
      createdLabel: "just now",
      eventType: "NEW_COMMENT",
      id: "42",
      message: "A new comment was added.",
      targetHref: "/admin/sample/issue/1",
      targetTitle: "Issue #1 updated",
      typeIcon: "comment2",
    },
  ]);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".notification-stream")).toHaveCount(1);
  await expect(page.locator(".warning-none")).toHaveCount(0);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DIRECT_NOTIFICATIONS_WITH_NOTIFICATION.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedNotificationShellMetrics(page)).toEqual(
    EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS,
  );
  expect(await readDesktopNotificationStreamMetrics(page)).toEqual({
    agoMarginLeft: "0px",
    avatarMarginTop: "3px",
    messageColor: "rgb(136, 136, 136)",
    messageFontSize: "13px",
    messageLineHeight: "20px",
    messageMarginTop: "3px",
    metaColor: "rgb(187, 187, 187)",
    metaFontSize: "12px",
    metaMarginTop: "5px",
    streamBorderBottomWidth: "1px",
    streamColor: "rgb(221, 221, 221)",
    streamDescDisplay: "inline-block",
    streamDescPaddingLeft: "7px",
    streamDescWidth: "732.812px",
    streamPaddingLeft: "25px",
    streamPaddingTop: "5px",
    streamTypeColor: "rgb(139, 0, 139)",
    streamTypeDisplay: "inline-block",
    streamTypeFontSize: "20px",
    streamTypeLineHeight: "20px",
    streamTypeMarginTop: "2px",
    streamTypePaddingLeft: "6px",
    titleColor: "rgb(81, 170, 204)",
    titleFontSize: "14px",
    titleFontWeight: "700",
  });
});

async function readDesktopAuthenticatedNotificationShellMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const activityStreams = document.querySelector<HTMLElement>(".activity-streams");
    const guideToggleButton = document.querySelector<HTMLElement>(".guide-toggle button");
    const navLink = document.querySelector<HTMLElement>(".nav-tabs > li > a");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !mainStream ||
      !activityStreams ||
      !guideToggleButton ||
      !navLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected authenticated notification shell metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const mainStreamStyle = getComputedStyle(mainStream);
    const activityStreamsStyle = getComputedStyle(activityStreams);
    const guideToggleButtonStyle = getComputedStyle(guideToggleButton);
    const navLinkStyle = getComputedStyle(navLink);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      activityStreamsMarginTop: activityStreamsStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      guideToggleButtonBorderBottomLeftRadius: guideToggleButtonStyle.borderBottomLeftRadius,
      guideToggleButtonBorderBottomRightRadius: guideToggleButtonStyle.borderBottomRightRadius,
      guideToggleButtonPaddingLeft: guideToggleButtonStyle.paddingLeft,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      mainStreamMarginBottom: mainStreamStyle.marginBottom,
      navLinkColor: navLinkStyle.color,
      navLinkFontWeight: navLinkStyle.fontWeight,
      navLinkPaddingLeft: navLinkStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
    };
  });
}

async function readDesktopAuthenticatedHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const activityStreams = document.querySelector<HTMLElement>(".activity-streams");
    const warning = document.querySelector<HTMLElement>(".warning-none");
    const guideToggleButton = document.querySelector<HTMLElement>(".guide-toggle button");
    const navLink = document.querySelector<HTMLElement>(".nav-tabs > li > a");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !mainStream ||
      !activityStreams ||
      !warning ||
      !guideToggleButton ||
      !navLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected authenticated home metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const mainStreamStyle = getComputedStyle(mainStream);
    const activityStreamsStyle = getComputedStyle(activityStreams);
    const warningStyle = getComputedStyle(warning);
    const guideToggleButtonStyle = getComputedStyle(guideToggleButton);
    const navLinkStyle = getComputedStyle(navLink);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      activityStreamsMarginTop: activityStreamsStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      guideToggleButtonBorderBottomLeftRadius: guideToggleButtonStyle.borderBottomLeftRadius,
      guideToggleButtonBorderBottomRightRadius: guideToggleButtonStyle.borderBottomRightRadius,
      guideToggleButtonPaddingLeft: guideToggleButtonStyle.paddingLeft,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      mainStreamMarginBottom: mainStreamStyle.marginBottom,
      navLinkColor: navLinkStyle.color,
      navLinkFontWeight: navLinkStyle.fontWeight,
      navLinkPaddingLeft: navLinkStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      warningBackground: warningStyle.backgroundColor,
      warningBorderRadius: warningStyle.borderTopLeftRadius,
      warningColor: warningStyle.color,
      warningFontSize: warningStyle.fontSize,
      warningPaddingTop: warningStyle.paddingTop,
    };
  });
}

async function readDesktopNotificationStreamMetrics(page: Page) {
  return page.evaluate(() => {
    const stream = document.querySelector<HTMLElement>(".notification-stream");
    const streamType = document.querySelector<HTMLElement>(".notification-stream .stream-type");
    const streamDesc = document.querySelector<HTMLElement>(".notification-stream .stream-desc");
    const title = document.querySelector<HTMLElement>(".notification-stream .title");
    const messageWrap = document.querySelector<HTMLElement>(".notification-stream .message-wrap");
    const meta = document.querySelector<HTMLElement>(".notification-stream .meta");
    const avatar = document.querySelector<HTMLElement>(".notification-stream .avatar-wrap");
    const ago = document.querySelector<HTMLElement>(".notification-stream .ago");
    if (
      !stream ||
      !streamType ||
      !streamDesc ||
      !title ||
      !messageWrap ||
      !meta ||
      !avatar ||
      !ago
    ) {
      throw new Error("Expected notification stream metric targets are missing.");
    }

    const streamStyle = getComputedStyle(stream);
    const streamTypeStyle = getComputedStyle(streamType);
    const streamDescStyle = getComputedStyle(streamDesc);
    const titleStyle = getComputedStyle(title);
    const messageWrapStyle = getComputedStyle(messageWrap);
    const metaStyle = getComputedStyle(meta);
    const avatarStyle = getComputedStyle(avatar);
    const agoStyle = getComputedStyle(ago);

    return {
      agoMarginLeft: agoStyle.marginLeft,
      avatarMarginTop: avatarStyle.marginTop,
      messageColor: messageWrapStyle.color,
      messageFontSize: messageWrapStyle.fontSize,
      messageLineHeight: messageWrapStyle.lineHeight,
      messageMarginTop: messageWrapStyle.marginTop,
      metaColor: metaStyle.color,
      metaFontSize: metaStyle.fontSize,
      metaMarginTop: metaStyle.marginTop,
      streamBorderBottomWidth: streamStyle.borderBottomWidth,
      streamColor: streamStyle.color,
      streamDescDisplay: streamDescStyle.display,
      streamDescPaddingLeft: streamDescStyle.paddingLeft,
      streamDescWidth: streamDescStyle.width,
      streamPaddingLeft: streamStyle.paddingLeft,
      streamPaddingTop: streamStyle.paddingTop,
      streamTypeColor: streamTypeStyle.color,
      streamTypeDisplay: streamTypeStyle.display,
      streamTypeFontSize: streamTypeStyle.fontSize,
      streamTypeLineHeight: streamTypeStyle.lineHeight,
      streamTypeMarginTop: streamTypeStyle.marginTop,
      streamTypePaddingLeft: streamTypeStyle.paddingLeft,
      titleColor: titleStyle.color,
      titleFontSize: titleStyle.fontSize,
      titleFontWeight: titleStyle.fontWeight,
    };
  });
}

async function mockAuthenticatedEmptyNotifications(page: Page) {
  await mockAuthenticatedNotifications(page, []);
}

async function mockAuthenticatedNotifications(page: Page, items: unknown[]) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
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
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ hasMore: false, items, total: items.length }),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");

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
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-trigger",
        "data-content",
        "data-target",
        "data-url",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");

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
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-trigger",
          "data-content",
          "data-target",
          "data-url",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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
    },
    { markup: html },
  );
}
