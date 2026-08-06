import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("pull request changes keeps residual diff and visible review form owners in StyleX", async ({
  page,
}) => {
  await mockChanges(page, { files: [normalFile()] });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  const diffMeta = page.locator("[data-stylex-owner='pull-request-changes-diff-meta']");
  await expect(diffMeta).toHaveCount(1);
  await expect(diffMeta).toHaveCSS("cursor", "pointer");
  await expect(page.locator("[data-stylex-owner='pull-request-changes-visible-form']")).toHaveCount(
    0,
  );

  await expect(page.locator(".diff-partial-file .filename")).toHaveText("src/main.rs");
  await diffMeta.click();
  await expect(page.locator(".diff-partial-code")).toHaveCSS("display", "none");

  expect(ROUTE_SOURCE).toContain('data-stylex-owner="pull-request-changes-diff-meta"');
  expect(ROUTE_SOURCE).toContain("styles.visibleForm");
});

test("pull request changes inline review form keeps its legacy visible display owner", () => {
  expect(ROUTE_SOURCE).toContain("styles.visibleForm");
  expect(ROUTE_SOURCE).toContain(
    'data-stylex-owner={visible ? "pull-request-changes-visible-form"',
  );
  expect(ROUTE_SOURCE).not.toContain('style={visible ? { display: "block" } : undefined}');
});

test("pull request changes keeps right-aligned action and upload geometry", async ({ page }) => {
  await mockChanges(page);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  for (const owner of [
    "pull-request-changes-comment-actions",
    "pull-request-changes-review-actions",
    "pull-request-changes-upload-help",
  ]) {
    // The upload-help owner renders once per visible comment form (review form +
    // per-file inline form = 2 with one file); the legacy view also has one
    // uploadForm per form (reviewForm.scala.html:45, partial_comment_form_on_thread.scala.html:55).
    // Bucket-3 stale-pin fix: assert the first owner's alignment instead of pinning count 1.
    await expect(page.locator(`[data-stylex-owner='${owner}']`).first()).toHaveCSS(
      "text-align",
      "right",
    );
  }
});

async function mockChanges(page: Page, options: { files?: unknown[] } = {}) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          cardThreads: [],
          commits: [],
          files: options.files ?? [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: pullRequestDetail(),
          threads: [],
        }),
      });
    },
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
      canComment: true,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: true,
      canUpdateState: true,
      canWatch: true,
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

function normalFile() {
  return {
    path: "src/main.rs",
    patch: [
      "diff --git a/src/main.rs b/src/main.rs",
      "--- a/src/main.rs",
      "+++ b/src/main.rs",
      "@@ -1,3 +1,3 @@",
      " fn main() {",
      '-    println!("old");',
      '+    println!("new");',
      " }",
    ].join("\n"),
  };
}
