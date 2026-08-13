import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-reviews-sidebar-count-floats");
const routeSource = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
const styleSource =
  readFileSync("src/app.css", "utf8") +
  readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
const legacyListSource = readFileSync(
  "../yona-original/app/views/reviewthread/list.scala.html",
  "utf8",
);
const legacyPartialSource = readFileSync(
  "../yona-original/app/views/reviewthread/partial_list.scala.html",
  "utf8",
);
const legacyCommonLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);
const legacyPageLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_page.less",
  "utf8",
);
const legacyResponsiveLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const legacyYobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const legacyBootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const legacyBootstrapResponsive = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const legacyMessages = readFileSync("../yona-original/conf/messages", "utf8");
const legacyReviewListJs = readFileSync(
  "../yona-original/public/javascripts/service/yobi.review.List.js",
  "utf8",
);

const sidebarCountOwners = [
  "project-reviews-sidebar-count-all",
  "project-reviews-sidebar-count-participant",
  "project-reviews-sidebar-count-author",
] as const;

test("project review sidebar counts preserve the legacy float owner and route state", async ({
  page,
}) => {
  expect(legacyListSource).toContain('<span class="num-badge pull-right">');
  expect(legacyListSource.match(/<span class="num-badge pull-right">/gu)).toHaveLength(3);
  expect(legacyPartialSource).toContain('<ul class="post-list-wrap">');
  expect(legacyCommonLess).toContain(".nm { margin: 0 !important; }");
  expect(legacyPageLess).toContain(".issue-list-wrap { clear:both;}");
  expect(legacyPageLess).toContain(".filters {");
  expect(legacyPageLess).toContain("float: right;");
  expect(legacyPageLess).toContain(".post-list-wrap {");
  expect(legacyResponsiveLess).toContain(".span-hard-wrap");
  expect(legacyResponsiveLess).toContain("width: 100vw;");
  expect(legacyResponsiveLess).toContain("padding: 10px 0 !important;");
  expect(legacyBootstrap).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(legacyBootstrapResponsive).toContain(".media .pull-right");
  for (const imported of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ]) {
    expect(legacyYobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const message of [
    "review.allReview = All reviews",
    "review.involvingYou = Participated.",
    "review.createdByYou = Created",
    "issue.state.open = Open",
    "issue.state.closed = Closed",
    "common.order.date = Created",
  ]) {
    expect(legacyMessages).toContain(message);
  }
  expect(legacyReviewListJs).toContain('[data-toggle="filter"]');
  expect(legacyReviewListJs).toContain('[data-toggle="order"]');
  expect(legacyReviewListJs).toContain("welElement.data('value')");
  expect(legacyReviewListJs).toContain("htElement.welSearchForm.submit()");

  // F5 dist-truth — frontend/src/app.css:9118-9122 owns the float as a
  // grouped selector (`[data-owner="project-reviews-sidebar-count-all"],
  // [data-owner="project-reviews-sidebar-count-participant"],
  // [data-owner="project-reviews-sidebar-count-author"] { float: right; }`),
  // mirroring the legacy `num-badge pull-right` (reviewthread/list.scala.html).
  expect(styleSource).toContain('[data-owner="project-reviews-sidebar-count-author"]');
  expect(styleSource).toContain("float: right;");
  for (const owner of sidebarCountOwners) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  expect(routeSource).not.toContain("pull-right");

  await mockProjectReviews(page);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/portal/reviews?state=open&filter=comment`);

  await expect(page.locator(".review-list-wrap .post-item")).toHaveCount(2);
  for (const owner of sidebarCountOwners) {
    await expect(page.locator(`[data-owner="${owner}"]`)).toHaveCount(1);
  }
  await expect(page.locator(".lst-stacked button")).toHaveText([
    "All reviews2",
    "Participated.1",
    "Created1",
  ]);
  await expect(page.locator(".lst-stacked li.active button")).toHaveText("All reviews2");
  await expect(page.locator(".filters button.filter")).toHaveText("Created");
  await expect(page.locator(".span10 > .nav-tabs li")).toHaveText(["Open2", "Closed1"]);
  await expect(page.locator(".review-list-wrap .post-item .title").first()).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/pullRequest/3/changes#thread-31`,
  );
  await expect(
    page.locator(".review-list-wrap .post-item .comments-count").first(),
  ).toHaveAttribute("href", `${basePath}/weblabs/portal/pullRequest/3/changes#thread-31`);

  const pluginOnlyAttributes = [
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-request-method",
    "data-dismiss",
    "data-target",
    "data-trigger",
    "data-backdrop",
    "data-spy",
    "data-provider",
    "data-loading-text",
    "data-type",
    "data-field",
    "data-value",
  ];
  await expect(
    page.locator(
      `.issue-list-wrap ${pluginOnlyAttributes.map((attribute) => `[${attribute}]`).join(", ")}`,
    ),
  ).toHaveCount(0);

  const desktopMetrics = await sidebarCountMetrics(page);
  expect(desktopMetrics).toMatchObject({
    bodyScrollWidth: 1366,
    documentScrollWidth: 1366,
    viewportWidth: 1366,
  });
  assertSidebarCountMetrics(desktopMetrics);
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "desktop.png"),
  });

  await page.locator(".lst-stacked button").filter({ hasText: "Participated." }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("participantId")).toBe("1");
  await expect(page.locator(".lst-stacked li.active button")).toHaveText("Participated.1");

  await page.goto(`${basePath}/weblabs/portal/reviews?state=open&filter=comment`);
  await page.locator(".filters button.filter").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe("asc");

  await page.goto(`${basePath}/weblabs/portal/reviews?state=open&filter=comment`);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-owner="project-reviews-sidebar-count-all"]')).toBeVisible();
  const mobileMetrics = await sidebarCountMetrics(page);
  expect(mobileMetrics).toMatchObject({
    bodyScrollWidth: 390,
    documentScrollWidth: 390,
    viewportWidth: 390,
  });
  assertSidebarCountMetrics(mobileMetrics);
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "mobile.png"),
  });
});

async function sidebarCountMetrics(page: Page) {
  return page.evaluate((owners) => {
    const sidebar = document.querySelector<HTMLElement>(".issue-list-wrap .search-wrap");
    if (!sidebar) throw new Error("Missing review sidebar");
    const sidebarBox = sidebar.getBoundingClientRect();
    return {
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      owners: owners.map((owner) => {
        const element = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
        if (!element) throw new Error(`Missing ${owner}`);
        const box = element.getBoundingClientRect();
        return {
          className: element.className,
          float: getComputedStyle(element).float,
          left: box.left,
          right: box.right,
        };
      }),
      sidebar: { left: sidebarBox.left, right: sidebarBox.right },
      viewportWidth: document.documentElement.clientWidth,
    };
  }, sidebarCountOwners);
}

function assertSidebarCountMetrics(metrics: Awaited<ReturnType<typeof sidebarCountMetrics>>) {
  for (const owner of metrics.owners) {
    expect(owner.float).toBe("right");
    expect(owner.className).toContain("num-badge");
    expect(owner.className).not.toMatch(/(?:^|\s)pull-right(?:\s|$)/u);
    expect(owner.left).toBeGreaterThanOrEqual(metrics.sidebar.left);
    expect(owner.right).toBeLessThanOrEqual(metrics.sidebar.right);
    expect(owner.left).toBeGreaterThanOrEqual(0);
    expect(owner.right).toBeLessThanOrEqual(metrics.viewportWidth);
  }
}

async function mockProjectReviews(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isProtected: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerUserId: 1,
      },
    }),
  );
  await page.route("**/api/v1/owners/weblabs/projects/portal/reviews**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        allCount: 2,
        authorCount: 1,
        closedCount: 1,
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorId: 2,
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            comments: [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 2,
                authorLabel: "Dev Member",
                authorLoginId: "dev",
                contentsMarkdown: "Please check this change",
                createdLabel: "Jul 1, 2026",
                id: 1001,
                threadId: 31,
              },
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 1,
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                contentsMarkdown: "Follow-up",
                createdLabel: "Jul 1, 2026",
                id: 1002,
                threadId: 31,
              },
            ],
            commitId: "",
            createdLabel: "Jul 1, 2026",
            id: 31,
            path: "",
            pullRequestNumber: 3,
            state: "open",
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorId: 9,
            authorLabel: "",
            authorLoginId: "ghost",
            comments: [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 9,
                authorLabel: "",
                authorLoginId: "ghost",
                contentsMarkdown: "Commit-specific pull request thread",
                createdLabel: "Jul 2, 2026",
                id: 2001,
                threadId: 32,
              },
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 1,
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                contentsMarkdown: "Ack",
                createdLabel: "Jul 2, 2026",
                id: 2002,
                threadId: 32,
              },
            ],
            commitId: "fedcba987654",
            createdLabel: "Jul 2, 2026",
            id: 32,
            path: "src/commit-specific-thread.rs",
            pullRequestNumber: 4,
            state: "open",
          },
        ],
        openCount: 2,
        pageNum: 1,
        pageSize: 15,
        participantCount: 1,
        state: "open",
        totalCount: 2,
      },
    }),
  );
}
