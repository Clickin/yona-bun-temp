import { expect, test, type Page, type Route } from "../wtr-compat.ts";

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

test("current-user notification settings preserve project navigation and persistent switches", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        csrfToken: "csrf-token",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  const workspace = workspaceBody();
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspace) });
  });
  await page.route("**/api/v1/workspace/notifications", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({
      eventType: "NEW_COMMENT",
      projectId: "2",
    });
    const notification = workspace.watchedProjects[0].notifications.find(
      (entry) => entry.eventType === "NEW_COMMENT",
    )!;
    notification.enabled = !notification.enabled;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspace) });
  });

  await page.goto(`${basePath}/user/editform/notifications#7`);
  await expect(page.locator("#notification-projects")).toBeAttached();
  await expect(page).toHaveTitle("admin");
  expect(await page.locator("head > title").first().textContent()).toBe("admin");

  await expect(page.locator('#notification-projects a[href$="#2"]')).toHaveCount(1);
  await expect(page.locator('#notification-projects a[href$="#7"]')).toHaveCount(1);
  await expect(page.locator("#notification-projects button")).toHaveCount(0);
  expect(await readNotificationProjectTabAnchors(page)).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      dataToggle: null,
      href: `${basePath}/user/editform/notifications#2`,
      text: "admin / projectYobi",
      title: null,
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      dataToggle: null,
      href: `${basePath}/user/editform/notifications#7`,
      text: "weblabs / projectAlpha",
      title: null,
    },
  ]);
  await expect(page.locator('#notification-projects a[data-toggle="tab"]')).toHaveCount(0);
  await expect(page.locator("#notification-projects a").first()).toHaveText("admin / projectYobi");
  await expect(page.locator("#notification-projects a").last()).toHaveText(
    "weblabs / projectAlpha",
  );
  await expect(page.locator('[data-owner="user-notification-project-pane"][id="2"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-owner="user-notification-project-pane"][id="7"]'),
  ).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(`${basePath}/user/editform/notifications#7`);

  expect(await readNotificationSettingsMetrics(page)).toEqual({
    activePaneDisplay: "block",
    breadcrumbHeight: "45px",
    navMarginTop: "20px",
    pageWrapMarginTop: "10px",
    projectListDisplay: "block",
    tableDisplay: "table",
  });

  const editTabs = page.locator('[data-owner="user-settings-edit-tab-item"]');
  await expect(editTabs).toHaveCount(5);
  await expect(editTabs).toHaveText([
    "Edit profile",
    "Change password",
    "Notification settings",
    "Email settings",
    "User Token",
  ]);
  expect(
    await editTabs
      .locator("a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/user/editform`,
    `${basePath}/user/editform/password`,
    `${basePath}/user/editform/notifications`,
    `${basePath}/user/editform/emails`,
    `${basePath}/user/editform/token`,
  ]);
  await expect(editTabs.nth(2)).toHaveAttribute("data-selected", "true");
  expect(
    await editTabs.locator("a").evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className:
          link.getAttribute("data-owner") === "user-settings-edit-tab-link"
            ? null
            : link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
  ]);

  await expect(
    page.locator('[data-owner="user-settings-edit-tab-link"]:has-text("Email settings")'),
  ).toHaveAttribute("href", `${basePath}/user/editform/emails`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "notifications-email-tab";
  });
  await page
    .locator('[data-owner="user-settings-edit-tab-link"]:has-text("Email settings")')
    .click();
  await expect(page).toHaveURL(`${basePath}/user/editform/emails`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("notifications-email-tab");

  await page.goto(`${basePath}/user/editform/notifications#7`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "notifications-project-tab";
  });
  await page.locator('#notification-projects a:has-text("admin / projectYobi")').click();
  await expect(
    page.locator('[data-owner="user-notification-project-item"]').first(),
  ).toHaveAttribute("data-selected", "true");
  await expect(
    page.locator('[data-owner="user-notification-project-pane"][id="2"]'),
  ).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(`${basePath}/user/editform/notifications#2`);
  expect(await readNotificationProjectTabAnchors(page)).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      dataToggle: null,
      href: `${basePath}/user/editform/notifications#2`,
      text: "admin / projectYobi",
      title: null,
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      dataToggle: null,
      href: `${basePath}/user/editform/notifications#7`,
      text: "weblabs / projectAlpha",
      title: null,
    },
  ]);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("notifications-project-tab");
  await expect(page.locator("input.notiUpdate[data-href]")).toHaveCount(0);
  await expect(page.locator('input.notiUpdate[data-toggle="switch"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-owner="user-notification-project-pane"][id="2"] [data-owner="user-notification-switch"]',
    ),
  ).toHaveCount(NOTIFICATION_TYPES.length);
  await expect(page.locator('[data-owner="user-notification-project-pane"][id="2"] th')).toHaveText(
    NOTIFICATION_TYPES.map(([, label]) => label),
  );
  const newCommentSwitch = page
    .locator('[data-owner="user-notification-project-pane"][id="2"] tr', {
      hasText: "New comment on post or issue added",
    })
    .locator('[data-owner="user-notification-switch"]');
  await expect(newCommentSwitch).toHaveAttribute("role", "switch");
  await expect(newCommentSwitch).toHaveAttribute("aria-checked", "true");
  for (const expectedState of ["false", "true"]) {
    const geometry = await newCommentSwitch.evaluate((element) => {
      const inner = element.firstElementChild!;
      const labels = inner.querySelectorAll("[data-owner=user-notification-switch-label]");
      const outerRect = element.getBoundingClientRect();
      return {
        height: outerRect.height,
        width: outerRect.width,
        innerDisplay: getComputedStyle(inner).display,
        innerWidth: inner.getBoundingClientRect().width,
        labelWidths: Array.from(labels, (label) => label.getBoundingClientRect().width),
      };
    });
    // Live legacy .has-switch is 80x29 with a 162%-wide block and two half-width labels.
    expect(geometry.width).toBe(80);
    expect(geometry.height).toBe(29);
    expect(geometry.innerDisplay).toBe("block");
    expect(geometry.innerWidth).toBeCloseTo(129.59375, 1);
    for (const labelWidth of geometry.labelWidths) {
      expect(labelWidth).toBeCloseTo(64.796875, 1);
    }
    await expect(
      newCommentSwitch.locator("[data-owner=user-notification-switch-label]"),
    ).toHaveText(["On", "Off"]);
    const toggleResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/workspace/notifications") &&
        response.request().method() === "POST",
    );
    await newCommentSwitch.click();
    await toggleResponse;
    await expect(newCommentSwitch).toHaveAttribute("aria-checked", expectedState);
    await page.goto(`${basePath}/user/editform/notifications#2`);
    await expect(newCommentSwitch).toHaveAttribute("aria-checked", expectedState);
  }
});

async function mockAuthenticatedSession(page: Page) {
  const fulfillSession = async (route: Route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  };
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
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
      watchedProject(2, "admin", "projectYobi"),
      watchedProject(7, "weblabs", "projectAlpha"),
    ],
  };
}

function watchedProject(projectId: number, ownerName: string, projectName: string) {
  const checked = CHECKED_BY_PROJECT.get(String(projectId)) ?? new Set<string>();
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

async function readNotificationSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector<HTMLElement>(
      '[data-owner="user-settings-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-owner="user-settings-page-wrap-outer"]',
    );
    const nav = document.querySelector<HTMLElement>('[data-owner="user-settings-edit-tabs"]');
    const projectList = document.querySelector<HTMLElement>("#notification-projects");
    const activePane = document.querySelector<HTMLElement>(
      '[data-owner="user-notification-project-pane"][data-selected="true"]',
    );
    const table = activePane?.querySelector<HTMLElement>("table");
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

async function readNotificationProjectTabAnchors(page: Page) {
  return page.locator("#notification-projects a").evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className:
        link.getAttribute("data-owner") === "user-notification-project-link"
          ? null
          : link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      dataToggle: link.getAttribute("data-toggle"),
      href: link.getAttribute("href"),
      text: link.textContent?.trim() ?? "",
      title: link.getAttribute("title"),
    })),
  );
}
