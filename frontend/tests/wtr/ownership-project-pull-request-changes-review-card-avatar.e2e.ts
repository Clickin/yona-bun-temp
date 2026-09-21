import { readFileSync, curatedAppCss as _curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve joins path parts.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);

const legacyReviewListSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/git/partial_reviewlist.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyDiffSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/code/diff.scala.html", import.meta.url)),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiUiSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/style-project-pull-request-changes-review-card-avatar",
);
mkdirSync(screenshotDirectory, { recursive: true });

test("populated pull-request changes review-card avatar owns legacy ml5 spacing", async ({
  page,
}) => {
  expect(legacyReviewListSource).toContain('<span class="avatar-wrap smaller ml5">');
  expect(legacyDiffSource).toContain('<div class="review-wrap span-hard-wrap">');
  expect(legacyDiffSource).toContain('class="review-card @thread.state.toString().toLowerCase()"');
  expect(legacyCommonSource).toContain(".ml5 { margin-left:5px; }");
  expect(legacyCommonSource).toContain("&.smaller { width:20px; height:20px;");
  expect(legacyYobiUiSource).toContain("&.smaller { width:20px; height:20px; }");
  expect(legacyPageSource).toContain(".review-card {");
  expect(legacyPageSource).toContain(".info {");
  expect(legacyPageSource).toContain(".date {");
  expect(legacyPageSource).toContain(".comments {");
  for (const importedFile of [
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
    expect(legacyYobiSource).toContain(`@import "less/${importedFile}";`);
  }

  expect(routeSource).toContain('data-owner="pull-request-changes-review-card-avatar"');
  expect(routeSource).not.toMatch(/<a\s/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, basePath);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`, {
      waitUntil: "networkidle",
    });

    const card = page.locator('[data-owner="pull-request-changes-review-card"]');
    const info = page.locator('[data-owner="pull-request-changes-review-card-info"]');
    const avatar = page.locator('[data-owner="pull-request-changes-review-card-avatar"]');
    const avatarImage = avatar.locator("img");
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/\breview-card\b/u);
    await expect(card).toHaveClass(/\bopen\b/u);
    await expect(card).toContainText("Review note");
    await expect(info).toBeVisible();
    await expect(avatar).toHaveCount(1);
    await expect(avatar).toHaveClass(/\bavatar-wrap\b/u);
    await expect(avatar).toHaveClass(/\bsmaller\b/u);
    await expect(avatar).toHaveClass(/\bml5\b/u);
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    await expect(avatarImage).toHaveAttribute(
      "src",
      `${basePath}/legacy-assets/images/default-avatar-34.png`,
    );
    await expect(avatarImage).toHaveAttribute("alt", "Dev Member");
    await expect(avatarImage).toBeVisible();
    await expect(avatar).toHaveCSS("margin-left", "5px");
    await expect(avatar).toHaveCSS("width", "20px");
    await expect(avatar).toHaveCSS("height", "20px");

    const geometry = await info.evaluate((element) => {
      const avatarElement = element.querySelector<HTMLElement>(
        '[data-owner="pull-request-changes-review-card-avatar"]',
      );
      if (!avatarElement) throw new Error("review-card avatar owner is missing");
      const infoBox = element.getBoundingClientRect();
      const avatarBox = avatarElement.getBoundingClientRect();
      return {
        avatarBottom: avatarBox.bottom,
        avatarHeight: avatarBox.height,
        avatarLeft: avatarBox.left,
        avatarRight: avatarBox.right,
        avatarTop: avatarBox.top,
        avatarWidth: avatarBox.width,
        documentScrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        infoLeft: infoBox.left,
        infoBottom: infoBox.bottom,
        infoTop: infoBox.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.avatarWidth).toBe(20);
    expect(geometry.avatarHeight).toBe(20);
    expect(geometry.avatarLeft).toBeGreaterThanOrEqual(geometry.infoLeft - 1);
    expect(geometry.avatarRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.avatarTop).toBeGreaterThanOrEqual(geometry.infoTop - 1);
    expect(geometry.avatarBottom).toBeLessThanOrEqual(geometry.infoBottom + 1);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`, {
    waitUntil: "networkidle",
  });
  await page.locator('[data-owner="pull-request-changes-review-card-avatar"]').click();
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91$`, "u"),
  );
});

async function mockPullRequestChanges(page: Page, basePath: string) {
  const avatarUrl = `${basePath}/legacy-assets/images/default-avatar-34.png`;
  const session = {
    actorId: 1,
    avatarUrl,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
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
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          cardThreads: [reviewThread(avatarUrl)],
          commits: [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: pullRequestDetail(avatarUrl),
          threads: [reviewThread(avatarUrl)],
        },
      }),
  );
}

function reviewThread(avatarUrl: string) {
  return {
    authorAvatarUrl: avatarUrl,
    authorId: 2,
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    comments: [
      {
        attachments: [],
        authorAvatarUrl: avatarUrl,
        authorId: 2,
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        canDelete: false,
        canUpdate: false,
        contentsHtml: "<p>Review note</p>",
        contentsMarkdown: "Review note",
        createdLabel: "Jul 5, 2026",
        id: 701,
        threadId: 91,
        viaEmail: false,
      },
    ],
    commitId: "abcdef1234567890",
    createdLabel: "Jul 5, 2026",
    endLine: 1,
    endSide: "B",
    id: 91,
    isOutdated: false,
    path: "src/main.rs",
    prevCommitId: "",
    pullRequestNumber: 9,
    startLine: 1,
    startSide: "B",
    state: "open",
  };
}

function pullRequestDetail(avatarUrl: string) {
  return {
    attachments: [],
    bodyHtml: "<p>Initial body</p>",
    bodyMarkdown: "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl,
      loginId: "dev",
      userId: 2,
      userLabel: "Dev Member",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isMerging: false,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
    ownerName: "admin",
    permissions: {
      canComment: false,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: false,
      canUpdateState: false,
      canWatch: false,
    },
    projectName: "sample",
    pullRequestNumber: 9,
    receiver: {
      avatarUrl,
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "open",
    threads: [],
    title: "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}
