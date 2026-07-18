import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_THREAD_FORM_SOURCE = readFileSync(
  new URL(
    "../../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    import.meta.url,
  ),
  "utf8",
);

test("pull request changes owns static review and editor declarations in StyleX", async ({
  page,
}) => {
  await mockChanges(page);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

    const reviewTabs = page.locator('[data-stylex-owner="pull-request-changes-review-tabs"]');
    const editorTabs = page
      .locator('[data-stylex-owner="pull-request-changes-editor-tab-content"]')
      .first();
    await expect(reviewTabs).toHaveCount(1);
    await expect(reviewTabs).toHaveCSS("margin-bottom", "10px");
    await expect(editorTabs).toHaveCSS("position", "relative");
    await expect(editorTabs).toHaveCSS("overflow", "visible");
    await expect(page.locator("#reviewcards-open .review-card")).toContainText("Review note");
    await expect(page.locator("#editor-contents-comment")).toBeVisible();
    const nonRangedForm = page.locator(
      '[data-stylex-owner="pull-request-changes-non-ranged-review-form"]',
    );
    const rangedForm = page.locator(
      '[data-stylex-owner="pull-request-changes-ranged-review-form"]',
    );
    await expect(nonRangedForm).toHaveCount(1);
    await expect(rangedForm).toHaveCount(1);
    for (const form of [nonRangedForm, rangedForm]) {
      await expect(form).toBeVisible();
      await expect(form).toHaveCSS("display", "block");
      await expect(form.locator(".right-txt .ybtn").first()).toBeVisible();
      const formBox = await form.boundingBox();
      const threadBox = await form
        .locator("xpath=ancestor::*[contains(@class, 'comment-thread-wrap')][1]")
        .boundingBox();
      expect(formBox).not.toBeNull();
      expect(threadBox).not.toBeNull();
      expect(formBox!.x).toBeGreaterThanOrEqual(threadBox!.x - 1);
      expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(threadBox!.x + threadBox!.width + 1);
    }
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
  }
});

test("pull request changes static residual source owners preserve legacy values", () => {
  expect(ROUTE_SOURCE).toContain('data-stylex-owner="pull-request-changes-review-tabs"');
  expect(ROUTE_SOURCE).toContain('data-stylex-owner="pull-request-changes-editor-tab-content"');
  expect(ROUTE_SOURCE).toContain(
    'data-stylex-owner="pull-request-changes-original-message-toggle"',
  );
  expect(ROUTE_SOURCE).not.toContain('style={{ marginBottom: "10px" }}');
  expect(ROUTE_SOURCE).not.toContain('style={{ position: "relative", overflow: "visible" }}');
  expect(ROUTE_SOURCE).not.toContain("style={{ border: 0, paddingLeft: 5, paddingRight: 5 }}");
  expect(ROUTE_SOURCE).not.toContain('style={{ display: "block" }}');
  expect(ROUTE_SOURCE).toContain('data-stylex-owner="pull-request-changes-non-ranged-review-form"');
  expect(ROUTE_SOURCE).toContain('data-stylex-owner="pull-request-changes-ranged-review-form"');
  expect(LEGACY_THREAD_FORM_SOURCE).toContain(
    '<form action="@urlToPostNewComment(thread)" method="post" enctype="multipart/form-data" class="review-form" style="display:block;">',
  );
});

async function mockChanges(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
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
      const thread = {
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorId: 2,
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        comments: [
          {
            attachments: [],
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
        commitId: "",
        createdLabel: "Jul 5, 2026",
        endLine: 1,
        endSide: "B",
        id: 91,
        path: "src/main.rs",
        prevCommitId: "",
        pullRequestNumber: 9,
        startLine: 1,
        startSide: "B",
        state: "open",
      };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          cardThreads: [thread],
          commits: [],
          files: [
            {
              path: "src/main.rs",
              patch:
                "diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1 @@\n-old\n+new",
            },
          ],
          inlineThreads: [thread],
          nonRangedThreads: [thread],
          pullRequest: pullRequestDetail(),
          threads: [thread],
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
    title: "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}
