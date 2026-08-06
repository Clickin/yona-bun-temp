import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve joins path parts.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-pull-request-changes-commit-hash-mr10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyViewSource = readFileSync(
  new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("pull request changes commit hashes preserve legacy mr10 ownership and behavior", async ({
  page,
}) => {
  expect(legacyViewSource).toContain('class="blue-txt mr10 commit-hash"');
  expect(legacyViewSource).toContain(
    'Messages("review.outdated") - <strong class="blue-txt mr10">@shortId(commitId)</strong>',
  );
  expect(legacyCommonSource).toContain(".mr10 { margin-right:10px; }");
  expect(routeSource).toContain('data-stylex-owner="pull-request-changes-commit-hash"');
  expect(routeSource.match(/data-stylex-owner="pull-request-changes-commit-hash"/g)).toHaveLength(
    3,
  );
  expect(routeSource).toContain("styles.commitHash");
  expect(styleSource).toContain(
    'commitHash: { color: pullRequestChangesColors.commitHash, marginRight: "10px" }',
  );

  await mockPullRequestChanges(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890`, {
      waitUntil: "networkidle",
    });

    const hashes = page.locator('[data-stylex-owner="pull-request-changes-commit-hash"]');
    await expect(hashes).toHaveCount(2);
    await expect(hashes).toHaveText(["abcdef1", "abcdef1"]);
    for (const hash of [hashes.nth(0), hashes.nth(1)]) {
      await expect(hash).toHaveClass(/\bmr10\b/u);
      await expect(hash).toHaveClass(/\bcommit-hash\b/u);
      await expect(hash).toHaveCSS("margin-right", "10px");
      await expect(hash).toHaveCSS("color", "rgb(93, 187, 224)");
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/1234567890abcdef`, {
    waitUntil: "networkidle",
  });
  const selectedOutdated = page.locator('[data-stylex-owner="pull-request-changes-commit-hash"]');
  await expect(selectedOutdated).toHaveCount(2);
  await expect(selectedOutdated.first()).toHaveText("1234567");
  await expect(selectedOutdated.first()).toHaveClass(/\bmr10\b/u);
  await expect(selectedOutdated.first()).toHaveClass(/\bcommit-hash\b/u);
  await expect(selectedOutdated.first()).toHaveCSS("margin-right", "10px");
  await expect(page.locator(".d-label")).toContainText("Outdated");

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/unknowncommit`, {
    waitUntil: "networkidle",
  });
  const allOutdated = page
    .locator('[data-stylex-owner="pull-request-changes-commit-hash"]')
    .filter({ hasText: "unknown" });
  await expect(allOutdated).toHaveCount(1);
  await expect(allOutdated).toHaveText("unknown");
  await expect(allOutdated).toHaveClass(/\bmr10\b/u);
  await expect(allOutdated).not.toHaveClass(/\bcommit-hash\b/u);
  await expect(allOutdated).toHaveCSS("margin-right", "10px");
});

async function mockPullRequestChanges(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
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
          cardThreads: [],
          commits: [
            {
              authorDateLabel: "Jul 2, 2026",
              authorEmail: "dev@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
              state: "CURRENT",
            },
            {
              authorDateLabel: "Jul 1, 2026",
              authorEmail: "dev@example.com",
              commitId: "1234567890abcdef",
              commitMessage: "Previous UI",
              commitShortId: "1234567",
              state: "PRIOR",
            },
          ],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: pullRequestDetail(),
          threads: [],
        },
      }),
  );
}

function pullRequestDetail() {
  return {
    attachments: [],
    bodyHtml: "<p>Initial body</p>",
    bodyMarkdown: "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
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
      avatarUrl: "/assets/images/default-avatar-32.png",
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
