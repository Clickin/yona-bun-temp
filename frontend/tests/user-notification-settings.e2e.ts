import { expect, test, type Page } from "@playwright/test";

const NOTIFICATION_TYPES = [
  ["NEW_ISSUE", "New issue added"],
  ["NEW_POSTING", "New post added"],
  ["NEW_PULL_REQUEST", "New pull request added"],
  ["ISSUE_STATE_CHANGED", "Issue status changed"],
  ["ISSUE_ASSIGNEE_CHANGED", "Issue assignee changed."],
  ["PULL_REQUEST_STATE_CHANGED", "Pull request Status changed."],
  ["NEW_COMMENT", "New comment on post or issue added"],
  ["NEW_REVIEW_COMMENT", "New comment on pull request added"],
  ["MEMBER_ENROLL_REQUEST", "Requests for joining projects"],
  ["PULL_REQUEST_MERGED", "Pull request merged"],
  ["ISSUE_REFERRED_FROM_COMMIT", "Issue mentioned in commit"],
  ["PULL_REQUEST_COMMIT_CHANGED", "Pull Request Commit Change"],
  ["NEW_COMMIT", "New commits on a project"],
  ["PULL_REQUEST_REVIEW_STATE_CHANGED", "Pull Request Review Action Changed"],
  ["ISSUE_REFERRED_FROM_PULL_REQUEST", "Issue mentioned in pull request"],
  ["ISSUE_BODY_CHANGED", "Issue body changed"],
  ["REVIEW_THREAD_STATE_CHANGED", "Review Thread State Change"],
  ["ORGANIZATION_MEMBER_ENROLL_REQUEST", "Requests for joining group"],
  ["COMMENT_UPDATED", "Comment updated"],
  ["ISSUE_MOVED", "Issue moved"],
  ["ISSUE_SHARER_CHANGED", "notification.type.issue.sharer.changed"],
  ["ISSUE_LABEL_CHANGED", "Issue label changed"],
  ["ISSUE_MILESTONE_CHANGED", "Milestone changed"],
  ["POSTING_BODY_CHANGED", "Posting changed"],
  ["RESOURCE_DELETED", "Issue/Posting deletion"],
  ["MEMBER_ENROLL_ACCEPT", "Accepted as a member."],
  ["ORGANIZATION_MEMBER_ENROLL_ACCEPT", "Accepted as a member."],
] as const;

const CHECKED_BY_PROJECT = new Map([
  ["2", new Set(["NEW_ISSUE", "NEW_COMMENT"])],
  ["7", new Set(["NEW_POSTING", "NEW_COMMIT"])],
]);

test("current-user notification settings page matches legacy user/edit_notifications.scala.html screen DOM", async ({
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
  await page.route("**/api/v1/workspace/notifications", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({
      eventType: "NEW_COMMENT",
      projectId: "2",
    });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });

  await page.goto(`${basePath}/user/editform/notifications#7`);
  await expect(page.locator("#notification-projects")).toBeAttached();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(page, expectedScreen(basePath, "7"));
  expect(actual).toEqual(expected);
  await expect(page.locator('#notification-projects a[href="#2"]')).toHaveText(
    "admin / projectYobi",
  );
  await expect(page.locator('#notification-projects a[href="#7"]')).toHaveText(
    "weblabs / projectAlpha",
  );
  await expect(page.locator('.tab-content > .tab-pane[id="2"]')).toHaveCount(1);
  await expect(page.locator('.tab-content > .tab-pane[id="7"]')).toHaveClass(/active/);

  expect(await readNotificationSettingsMetrics(page)).toEqual({
    activePaneDisplay: "block",
    breadcrumbHeight: "46px",
    navMarginTop: "0px",
    pageWrapMarginTop: "10px",
    projectListDisplay: "block",
    tableDisplay: "table",
  });

  await page.locator('#notification-projects a[href="#2"]').click();
  await expect(page.locator("#notification-projects li").first()).toHaveClass(/active/);
  await page.locator('[id="2"] input[data-href$="/noti/toggle/2/NEW_COMMENT"]').click();
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
    watchedProjects: [
      watchedProject("2", "admin", "projectYobi"),
      watchedProject("7", "weblabs", "projectAlpha"),
    ],
  };
}

function watchedProject(projectId: string, ownerName: string, projectName: string) {
  const checked = CHECKED_BY_PROJECT.get(projectId) ?? new Set<string>();
  return {
    notifications: NOTIFICATION_TYPES.map(([eventType, label]) => ({
      enabled: checked.has(eventType),
      eventType,
      label,
    })),
    ownerName,
    projectId,
    projectName,
  };
}

function expectedScreen(basePath: string, activeProjectId: string) {
  return `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="${basePath}" class="logo logo-letter">Y</a></li>
      <li><form action="${basePath}/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="${basePath}/admin">Profile</a></span><span class="user-menu"><a href="${basePath}/user/editform">Account</a></span><a href="${basePath}/users/logout"><span class="user-menu logout label">Log out</span></a></div>
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content"><div class="search-result"><div class="group"><input class="search-input org-search" type="text" placeholder="Type name" autocomplete="off"><span class="bar"></span></div><div id="organizations" class="no-result tab-pane user-ul">No results</div></div></div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="${basePath}/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="${basePath}/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="${basePath}/user/issues/new">New issue</a></li><li><a href="${basePath}/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="${basePath}/projectform">Create new project</a></li><li><a href="${basePath}/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner"><h3>Account</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs mt20">
      <li><a href="${basePath}/user/editform">Edit profile</a></li>
      <li><a href="${basePath}/user/editform/password">Change password</a></li>
      <li class="active"><a href="${basePath}/user/editform/notifications">Notification settings</a></li>
      <li><a href="${basePath}/user/editform/emails">Email settings</a></li>
      <li><a href="${basePath}/user/editform/token">User Token</a></li>
    </ul>
    <div>
      <ul id="notification-projects" class="unstyled lst-stacked span3 mr20">
        ${expectedProjectTab("2", "admin", "projectYobi", activeProjectId)}
        ${expectedProjectTab("7", "weblabs", "projectAlpha", activeProjectId)}
      </ul>
      <div class="tab-content">
        ${expectedProjectPane(basePath, "2", activeProjectId)}
        ${expectedProjectPane(basePath, "7", activeProjectId)}
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;
}

function expectedProjectTab(id: string, owner: string, name: string, activeProjectId: string) {
  return `<li${id === activeProjectId ? ' class="active"' : ""}><a href="#${id}" data-toggle="tab">${owner} / ${name}</a></li>`;
}

function expectedProjectPane(basePath: string, projectId: string, activeProjectId: string) {
  const activeClass = projectId === activeProjectId ? "tab-pane active" : "tab-pane";
  return `<div id="${projectId}" class="${activeClass}"><table class="table table-striped table-bordered"><tbody>${NOTIFICATION_TYPES.map(
    ([eventType, label]) => expectedNotificationRow(basePath, projectId, eventType, label),
  ).join("")}</tbody></table></div>`;
}

function expectedNotificationRow(
  basePath: string,
  projectId: string,
  eventType: string,
  label: string,
) {
  const checked = CHECKED_BY_PROJECT.get(projectId)?.has(eventType) ?? false;
  return `<tr><th>${label}</th><td><div class="switch" data-on-label="On" data-off-label="Off"><input class="notiUpdate" data-href="${basePath}/noti/toggle/${projectId}/${eventType}" type="checkbox" data-toggle="switch"${checked ? ' checked="checked"' : ""}></div></td></tr>`;
}

async function readNotificationSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(".site-breadcrumb-outer");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const nav = document.querySelector<HTMLElement>(".nav-tabs.mt20");
    const projectList = document.querySelector<HTMLElement>("#notification-projects");
    const activePane = document.querySelector<HTMLElement>(".tab-pane.active");
    const table = document.querySelector<HTMLElement>(".tab-pane.active table");
    if (!breadcrumb || !pageWrapOuter || !nav || !projectList || !activePane || !table) {
      throw new Error("Expected user notification settings metric targets are missing.");
    }
    return {
      activePaneDisplay: getComputedStyle(activePane).display,
      breadcrumbHeight: getComputedStyle(breadcrumb).height,
      navMarginTop: getComputedStyle(nav).marginTop,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      projectListDisplay: getComputedStyle(projectList).display,
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
        "data-on-label",
        "data-off-label",
        "data-href",
      ];
      const attrs = stableAttrs(current, stableAttributes);
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

    function stableAttrs(current: Element, names: string[]) {
      const attrs = names
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`);
      if (current instanceof HTMLInputElement && current.type === "checkbox" && current.checked) {
        attrs.push('checked="checked"');
      }
      return attrs.join(" ");
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
          "data-on-label",
          "data-off-label",
          "data-href",
        ];
        const attrs = stableAttrs(current, stableAttributes);
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

      function stableAttrs(current: Element, names: string[]) {
        const attrs = names
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`);
        if (current instanceof HTMLInputElement && current.type === "checkbox" && current.checked) {
          attrs.push('checked="checked"');
        }
        return attrs.join(" ");
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
