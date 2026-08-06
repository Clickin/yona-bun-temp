import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const APP_CSS_SOURCE = readFileSync("src/app.css", "utf8");
const LEGACY_DIFF_JS_SOURCE = readFileSync(
  "../yona-original/public/javascripts/service/yobi.code.Diff.js",
  "utf8",
);

test.use({ locale: "ko-KR" });

test("commit review retires the React-only thread-actrow flex arm", () => {
  const legacyThreadForm = readFileSync(
    "../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    "utf8",
  );
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  expect(legacyThreadForm).toContain('class="thread-actrow"');
  expect(LEGACY_DIFF_JS_SOURCE).toContain('.closest(".thread-actrow")');
  expect(route).not.toContain("thread-actrow");
  expect(APP_CSS_SOURCE).not.toContain(".thread-actrow,");
  expect(APP_CSS_SOURCE).toContain(".actions {");
});

test("commit detail owns static review form and original-message styles", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  const stylex = readFileSync(
    "src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/code/diff.scala.html", "utf8");
  const comment = readFileSync(
    "../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    "utf8",
  );
  expect(legacy).toContain("common.reviewForm(project, ResourceType.COMMIT_COMMENT");
  expect(comment).toContain('class="review-form" style="display:block;"');
  expect(route).toContain('data-stylex-owner="commit-detail-thread-review-form"');
  expect(route).toContain('data-stylex-owner="commit-detail-original-message-toggle"');
  expect(route).not.toContain('style={{ display: "block" }}');
  expect(route).not.toContain(
    'style={blockReviewButtonVisible ? { display: "block" } : undefined}',
  );
  expect(route).not.toContain('style={isEditing ? { display: "none" } : undefined}');
  expect(route).not.toContain('style={isEditing ? { display: "block" } : undefined}');
  expect(route).not.toContain('style={isOpen ? { display: "block" } : undefined}');
  expect(route).not.toContain("style={{ border: 0 }}");
  expect(stylex).toContain('borderWidth: "0px"');
  expect(stylex).toContain('threadReviewForm: { display: "block" }');
  expect(stylex).toContain('blockReviewButtonVisible: { display: "block" }');
  expect(stylex).toContain('commentBodyHidden: { display: "none" }');
  expect(stylex).toContain('commentUpdateFormVisible: { display: "block" }');
  expect(stylex).toContain('reviewFormVisible: { display: "block" }');
  expect(stylex).toContain('commentDeleteModalVisible: { display: "block" }');
  expect(stylex).toContain("originalMessageToggle: {");

  await mockCommit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/commit/abc123`, { waitUntil: "commit" });
  const reviewForm = page.locator('[data-stylex-owner="commit-detail-thread-review-form"]');
  await expect(reviewForm).toHaveCSS("display", "block");
  await expect(reviewForm).not.toHaveAttribute("style");
  const originalToggle = page.locator(
    '[data-stylex-owner="commit-detail-original-message-toggle"]',
  );
  await expect(originalToggle).toHaveCSS("padding-left", "5px");
  await expect(originalToggle).toHaveCSS("padding-right", "5px");
  await expect(page.locator('[data-original-message-owner="route"]')).toBeHidden();
  await originalToggle.click();
  await expect(page.locator('[data-original-message-owner="route"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const geometry = await reviewForm.evaluate((element) => ({
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});

test("commit detail maps conditional review visibility to StyleX without inline styles", async ({
  page,
}) => {
  await mockCommit(page);
  await page.goto(`${basePath}/weblabs/demo/commit/abc123`, { waitUntil: "commit" });

  const blockReviewButton = page.locator('[data-stylex-owner="commit-detail-block-review-button"]');
  await expect(blockReviewButton).toBeHidden();
  await expect(blockReviewButton).not.toHaveAttribute("style");

  await page
    .locator(".diff-partial-codeline")
    .first()
    .evaluate((element) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  await page
    .locator('[data-stylex-owner="commit-detail-diff-body-layout"]')
    .dispatchEvent("mouseup");
  await expect(blockReviewButton).toBeVisible();
  await expect(blockReviewButton).toHaveCSS("display", "block");
  await expect(blockReviewButton).not.toHaveAttribute("style");

  const commentBody = page.locator('[data-stylex-owner="commit-detail-comment-body"]');
  const commentUpdateForm = page.locator('[data-stylex-owner="commit-detail-comment-update-form"]');
  await expect(commentBody).toBeVisible();
  await expect(commentBody).not.toHaveAttribute("style");
  await expect(commentUpdateForm).toBeHidden();
  await expect(commentUpdateForm).not.toHaveAttribute("style");

  await page.locator('button[data-comment-id="501"]').first().click();
  await expect(commentBody).toBeHidden();
  await expect(commentBody).not.toHaveAttribute("style");
  await expect(commentUpdateForm).toBeVisible();
  await expect(commentUpdateForm).toHaveCSS("display", "block");
  await expect(commentUpdateForm).not.toHaveAttribute("style");
  await commentUpdateForm.locator(".ybtn-cancel").click();
  await expect(commentBody).toBeVisible();
  await expect(commentUpdateForm).toBeHidden();

  const reviewForm = page.locator('[data-stylex-owner="commit-detail-review-form"]');
  await expect(reviewForm).toBeHidden();
  await expect(reviewForm).not.toHaveAttribute("style");

  const deleteModal = page.locator('[data-stylex-owner="commit-detail-comment-delete-modal"]');
  await expect(deleteModal).toBeHidden();
  await expect(deleteModal).not.toHaveAttribute("style");
});

async function mockCommit(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/projects/**/commit/abc123**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        selectedBranch: "main",
        commit: {
          commitId: "abc123",
          shortMessage: "Fix issue",
          message: "Fix issue\nDetails",
          authorName: "admin",
          authorDate: "today",
        },
        files: [
          {
            path: "src/main.rs",
            patch: "@@ -1 +1 @@\n-old line\n+new line",
          },
        ],
        threads: [
          {
            id: 77,
            state: "open",
            commitId: "abc123",
            prevCommitId: "",
            path: "",
            authorId: 1,
            authorLabel: "Admin",
            authorLoginId: "admin",
            createdLabel: "today",
            comments: [
              {
                id: 501,
                threadId: 77,
                authorId: 1,
                authorLabel: "Admin",
                authorLoginId: "admin",
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                canDelete: false,
                canUpdate: true,
                contentsHtml: "",
                contentsMarkdown: "Visible note\n--- original ---\nOriginal note",
                createdLabel: "today",
                viaEmail: true,
                attachments: [],
              },
            ],
          },
        ],
        isWatching: false,
        permissions: { canComment: true, canUpdateThreadState: true },
      },
    }),
  );
}
