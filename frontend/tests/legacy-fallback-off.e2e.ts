import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

async function expectClassFreeSiteLayout(
  page: Page,
  owners: readonly string[],
) {
  for (const owner of owners) {
    const locator = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(locator).toBeVisible();
    await expect(locator).not.toHaveClass(
      /(?:site-admin-page|page-wrap-outer|site-setting-wrap|row-fluid|span(?:1|2|3|4|5|10))/u,
    );
  }
}

test("site-admin fallback bridge has no React emitter", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".site-admin-page");
  expect(appCss).not.toContain(".site-setting-wrap");

  for (const [route, owners] of [
    [
      "src/routes/sites/userList.tsx",
      [
        "site-user-list-page-wrap-outer",
        "site-user-list-setting-wrap",
        "site-user-list-setting-grid",
        "site-user-list-setting-sidebar-column",
        "site-user-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/postList.tsx",
      [
        "site-post-list-page-wrap-outer",
        "site-post-list-setting-wrap",
        "site-post-list-setting-grid",
        "site-post-list-setting-sidebar-column",
        "site-post-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/projectList.tsx",
      [
        "site-project-list-page-wrap-outer",
        "site-project-list-setting-wrap",
        "site-project-list-setting-grid",
        "site-project-list-setting-sidebar-column",
        "site-project-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/mail.tsx",
      [
        "site-mail-page",
        "site-mail-setting-grid",
        "site-mail-sidebar-column",
        "site-mail-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/massmail.tsx",
      [
        "site-massmail-page",
        "site-massmail-setting-grid",
        "site-massmail-sidebar-column",
        "site-massmail-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/update.tsx",
      [
        "site-update-page",
        "site-update-setting-grid",
        "site-update-sidebar-column",
        "site-update-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/diagnostic.tsx",
      [
        "site-diagnostic-page",
        "site-diagnostic-setting-grid",
        "site-diagnostic-sidebar-column",
        "site-diagnostic-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/data.tsx",
      [
        "site-data-page",
        "site-data-setting-grid",
        "site-data-sidebar-column",
        "site-data-setting-content-column",
      ],
    ],
  ] as const) {
    const source = readFileSync(route, "utf8");
    expect(source).not.toContain("site-admin-page");
    for (const owner of owners) expect(source).toContain(`data-stylex-owner=\"${owner}\"`);
  }
});

test("app-shell fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".app-shell");
});

test("runtime-error-banner fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".runtime-error-banner");
});

test("code and diff fallback bridges have no remaining selectors", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".diff-file",
    ".diff-stats",
    ".diff-code",
    ".diff-table",
    ".line-comment-trigger",
    ".inline-comment-form-row",
    ".code-review-form",
    ".code-syntax-wrap",
    ".code-line-wrap",
    ".line-code",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const retainedSelector of [
    ".diff-body",
    ".diff-partial-codeline",
    ".diff-container tr.comments",
    ".review-wrap",
    ".line-number",
    ".hljs-comment",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
});

test("search-layout fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".search-layout");
  expect(appCss).toContain(".search-category-wrap {");
  expect(appCss).toContain("#searchInnerForm {");
});

async function mockMassMailSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-massmail" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function mockProjectListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-project-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockUserListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-user-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
}

async function mockPostListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-post-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockAuthenticatedNotificationSession(page: Page) {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((configuredBasePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: false,
        items: [
          {
            actor: {
              avatarUrl: `${basePath}/assets/images/default-avatar-64.png`,
              displayName: "Site Admin",
              loginId: "admin",
            },
            createdAt: "2026-07-14T00:00:00Z",
            createdLabel: "방금 전",
            eventType: "NEW_COMMENT",
            id: "notification-1",
            message: "알림 본문",
            targetHref: "",
            targetTitle: "알림 제목",
            typeIcon: "info",
          },
        ],
        total: 1,
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProjectPostsSession(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        showBoard: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 2,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 0,
            createdLabel: "Jul 3, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "4",
            projectName: "sample",
            readme: true,
            title: "README",
          },
        ],
        notices: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            labels: [],
            notice: true,
            ownerName: "admin",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        openIssueCount: 0,
        closedIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
        labels: [],
      },
    }),
  );
}

async function mockGlobalSearchSession(page: Page) {
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) => route.fulfill({ contentType: "application/json", json: session }));
  await page.route("**/api/v1/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        keyword: "bug",
        searchType: "issue",
        counts: {
          issues: 1,
          users: 0,
          projects: 0,
          posts: 0,
          milestones: 0,
          issueComments: 0,
          postComments: 0,
          reviews: 0,
        },
        items: [
          {
            id: "1",
            href: "/yona/weblabs/demo/issue/1",
            type: "issue",
            title: "Bug issue",
            projectName: "demo",
            ownerName: "weblabs",
            authorLabel: "admin",
            authorLoginId: "admin",
            createdLabel: "today",
            updatedLabel: "today",
            number: "1",
            state: "open",
            snippets: [{ text: "Bug issue", highlights: [] }],
          },
        ],
        totalCount: 1,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        context: { organizationName: "", ownerName: "", projectName: "" },
      },
    }),
  );
}

test("generated fallback excludes only proven dead Yobi selectors", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1",
    "normal runtime asset contract",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  const fallbackLink = page.locator(`link[href$="${generatedFallbackHref}"]`);
  await expect(fallbackLink).toHaveCount(1);
  const fallbackHref = await fallbackLink.getAttribute("href");
  if (!fallbackHref) {
    throw new Error("Generated legacy fallback link must have an href.");
  }
  const fallbackCss = await page.evaluate(async (href) => {
    const response = await fetch(href);
    return response.text();
  }, fallbackHref);

  for (const selector of [
    ".all-projects .project .info-wrap .forked",
    ".all-projects .project .stats-wrap .like",
    ".all-projects .project .stats-wrap .like .num",
    ".all-projects .project .stats-wrap .like .ico",
    ".profile-frmwrap .avatar-frm",
    ".profile-frmwrap .avatar-frm .avatar-wrap",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress.loading",
    ".profile-frmwrap .avatar-frm .btn-wrap",
    ".profile-frmwrap .avatar-frm .btn-wrap .nbtn i",
    ".milestones .milestone .infos .desc",
  ]) {
    expect(fallbackCss).not.toContain(`${selector} {`);
  }

  expect(fallbackCss).toContain(".all-projects .project .stats-wrap .members {");
  expect(fallbackCss).toContain(".profile-frmwrap dl {");
  expect(fallbackCss).toContain(".profile-frmwrap form {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .progress-wrap {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .actrow {");
  expect(fallbackCss).toContain(".milestones .milestone .completion-rate {");
});

test("fallback-off discovery mode removes the generated legacy stylesheet", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK !== "1",
    "runs only through test:e2e:fallback-off",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  await expect(
    page.locator(`link[href$="${generatedFallbackHref}"]`),
  ).toHaveCount(0);
  await expect(page.locator("#root")).toHaveCount(1);
});

test("massmail default and selected-project output retain the runtime fallback boundary", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockMassMailSession(page);
  await page.goto(`${basePath}/sites/massmail`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#project-list-wrap")).toBeHidden();
  await expect(page.locator(".app-shell, .site-admin-page, .project-select-row")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-massmail-page",
    "site-massmail-setting-grid",
    "site-massmail-sidebar-column",
    "site-massmail-setting-content-column",
  ]);

  await page.locator("#mailtoPrj").check();
  await page.locator("#input-project").fill("admin/projectYobi");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects")).toHaveText("admin/projectYobi x");
  await expect(page.locator(".app-shell, .site-admin-page, .project-select-row")).toHaveCount(0);
});

test("project-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectListSession(page);
  await page.goto(`${basePath}/sites/projectList?filter=road`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-project-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-stylex-owner="site-project-list-project-name"]')).toHaveText(
    "acme/roadmap",
  );
  await expect(page.locator(".site-admin-page, .project-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-project-list-page-wrap-outer",
    "site-project-list-setting-wrap",
    "site-project-list-setting-grid",
    "site-project-list-setting-sidebar-column",
    "site-project-list-setting-content-column",
  ]);
});

test("user-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockUserListSession(page);
  await page.goto(`${basePath}/sites/userList`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const list = page.locator('[data-stylex-owner="site-user-list-row-list"]');
  await expect(list).toBeVisible();
  await expect(list.locator('[data-stylex-owner="site-user-list-row-user-name"]')).toHaveText(
    "Alice",
  );
  await expect(page.locator(".site-admin-page, .user-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-user-list-page-wrap-outer",
    "site-user-list-setting-wrap",
    "site-user-list-setting-grid",
    "site-user-list-setting-sidebar-column",
    "site-user-list-setting-content-column",
  ]);
});

test("post-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPostListSession(page);
  await page.goto(`${basePath}/sites/postList`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-post-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-stylex-owner="site-post-list-row"]')).toHaveCount(1);
  await expect(page.locator(".site-admin-page, .post-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-post-list-page-wrap-outer",
    "site-post-list-setting-wrap",
    "site-post-list-setting-grid",
    "site-post-list-setting-sidebar-column",
    "site-post-list-setting-content-column",
  ]);
});

test("project posts retains legacy label output without the dead board-badge bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectPostsSession(page);
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator(".app-shell, .board-page")).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-posts-item"]')).toHaveCount(3);
  await expect(page.locator(".post-list-wrap .label.label-notice")).toHaveText("Notice");
  await expect(page.locator(".post-list-wrap .label.label-important")).toHaveText("README");
  await expect(page.locator(".board-badges, .board-badge, .board-label")).toHaveCount(0);
});

test("notifications output retains the runtime fallback boundary without its dead page bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockAuthenticatedNotificationSession(page);
  await page.goto(`${basePath}/notifications`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const list = page.locator('[data-stylex-owner="authenticated-home-notification-list"]');
  await expect(list).toBeVisible();
  await expect(
    list.locator(':scope > [data-stylex-owner="authenticated-home-notification-row"]'),
  ).toHaveCount(1);
  await expect(page.locator(".notification-page, .activity-streams")).toHaveCount(0);
});

test("global search output retains the runtime fallback boundary without the dead search-layout bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockGlobalSearchSession(page);
  await page.goto(`${basePath}/search?keyword=bug&searchType=issue`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator('[data-stylex-owner="global-search-input"]')).toHaveValue("bug");
  await expect(page.locator('[data-stylex-owner="global-search-result-wrap"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="global-search-result-item"]')).toHaveCount(1);
  await expect(page.locator(".search-layout")).toHaveCount(0);
});
