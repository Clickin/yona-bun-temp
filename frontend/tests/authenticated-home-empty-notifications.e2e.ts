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

const EXPECTED_AUTHENTICATED_HOME_WITH_NOTIFICATION = EXPECTED_AUTHENTICATED_HOME.replace(
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
    EXPECTED_AUTHENTICATED_HOME.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
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
    EXPECTED_AUTHENTICATED_HOME_WITH_NOTIFICATION.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
});

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
        "data-target",
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
          "data-target",
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
