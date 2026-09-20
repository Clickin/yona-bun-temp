const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const fileURLToPath = (u) => u.pathname;
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";
const defaultAvatarResponse = await fetch("/tests/src/assets/legacy/default-avatar-34.png");
if (!defaultAvatarResponse.ok) throw new Error("Cannot load legacy default avatar fixture");
const defaultAvatarUrl = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(await defaultAvatarResponse.arrayBuffer())))}`;

const BATCH_822_SCREENSHOT_DIRECTORY = fileURLToPath(
  new URL("../output/playwright/batch-822", import.meta.url),
);

// The branch start icon retains the legacy ml0 geometry class.

const SELECTED_COMMIT_ID = "abcdef1234567890";

const SELECTED_COMMIT = {
  authorAvatarUrl: "/avatars/dev.png",
  authorDateLabel: "Jul 4, 2026",
  authorEmail: "dev@example.com",
  authorLoginId: "dev",
  authorName: "Dev Member",
  commitId: SELECTED_COMMIT_ID,
  commitMessage: "Add UI\n\nDetails",
  commitShortId: "abcdef1",
  state: "CURRENT",
};

const SELECTED_NO_AUTHOR_COMMIT_ID = "0000000000000000";

const SELECTED_NO_AUTHOR_COMMIT = {
  authorAvatarUrl: "",
  authorDateLabel: "Jul 9, 2026",
  authorEmail: "",
  authorLoginId: "",
  authorName: "",
  commitId: SELECTED_NO_AUTHOR_COMMIT_ID,
  commitMessage: "No author metadata\n\nDetails",
  commitShortId: "0000000",
  state: "CURRENT",
};

const PRIOR_COMMIT_ID = "1234567890abcdef";
const UNKNOWN_COMMIT_ID = "fedcba9876543210";
const NORMAL_FILE_PATCH = [
  "diff --git a/src/main.rs b/src/main.rs",
  "index 1111111..2222222 100644",
  "--- a/src/main.rs",
  "+++ b/src/main.rs",
  "@@ -1,3 +1,3 @@",
  " fn main() {",
  '-    println!("old");',
  '+    println!("new");',
  " }",
].join("\n");

const PRIOR_COMMIT = {
  authorAvatarUrl: "https://www.gravatar.com/avatar/bf25d950bde50b8e13f413bb4eb0b1dd?s=32",
  authorDateLabel: "Jul 3, 2026",
  authorEmail: "old@example.com",
  authorLoginId: "",
  authorName: "Former Contributor",
  commitId: PRIOR_COMMIT_ID,
  commitMessage: "Old UI\n\nDetails",
  commitShortId: "1234567",
  state: "PRIOR",
};

const REVIEW_THREAD = {
  authorAvatarUrl: defaultAvatarUrl,
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
      createdLabel: new Date(2000, 6, 5, 10, 15).toISOString(),
      id: 701,
      threadId: 91,
      viaEmail: false,
    },
    {
      attachments: [],
      authorId: 1,
      authorLabel: "Site Admin",
      authorLoginId: "admin",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>Follow up</p>",
      contentsMarkdown: "Follow up",
      createdLabel: new Date(2000, 6, 6, 10, 15).toISOString(),
      id: 702,
      threadId: 91,
      viaEmail: false,
    },
  ],
  commitId: "abcdef1234567890",
  createdLabel: new Date(2000, 6, 5, 10, 15).toISOString(),
  endLine: 2,
  endSide: "B",
  id: 91,
  path: "src/main.rs",
  prevCommitId: "1234567890abcdef",
  pullRequestNumber: 9,
  startLine: 2,
  startSide: "B",
  state: "open",
};

const NON_RANGED_THREAD = {
  ...REVIEW_THREAD,
  comments: [
    {
      attachments: [],
      authorAvatarUrl: "/avatars/dev.png",
      authorId: 2,
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      canDelete: true,
      canUpdate: false,
      contentsHtml: "<p>Server HTML should not render</p>",
      contentsMarkdown: "General **note**",
      createdLabel: new Date(2000, 6, 7, 10, 15).toISOString(),
      id: 801,
      threadId: 92,
      viaEmail: false,
    },
  ],
  createdLabel: new Date(2000, 6, 7, 10, 15).toISOString(),
  id: 92,
  path: "",
};

const VIA_EMAIL_NON_RANGED_THREAD = {
  ...NON_RANGED_THREAD,
  comments: [
    {
      attachments: [],
      authorAvatarUrl: "/avatars/dev.png",
      authorId: 2,
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>Server HTML should not render</p>",
      contentsMarkdown:
        "Reply before quoted mail.\n\n-----Original Message-----\nOriginal author wrote:\nQuoted original line",
      createdLabel: new Date(2000, 6, 7, 10, 15).toISOString(),
      id: 802,
      threadId: 94,
      viaEmail: true,
    },
  ],
  id: 94,
};

const OUTDATED_REVIEW_THREAD = {
  ...REVIEW_THREAD,
  id: 93,
  isOutdated: true,
};

const INLINE_REVIEW_THREAD = {
  ...REVIEW_THREAD,
  comments: [
    {
      attachments: [],
      authorAvatarUrl: "/avatars/dev.png",
      authorId: 2,
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      canDelete: true,
      canUpdate: false,
      contentsHtml: "<p>Server HTML should not render</p>",
      contentsMarkdown: "Inline **review**",
      createdLabel: new Date(2000, 6, 8, 10, 15).toISOString(),
      id: 901,
      threadId: 95,
      viaEmail: false,
    },
  ],
  createdLabel: new Date(2000, 6, 8, 10, 15).toISOString(),
  endLine: 2,
  endSide: "B",
  id: 95,
  path: "src/main.rs",
  startLine: 2,
  startSide: "B",
};

const CLOSED_INLINE_REVIEW_THREAD = {
  ...INLINE_REVIEW_THREAD,
  id: 96,
  state: "closed",
};

test("PR changes posts a general review without navigation and retains drafts on failure", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const threads: unknown[] = [];
  const requests: unknown[] = [];
  const attachment = {
    id: 202,
    mimeType: "text/plain",
    name: "review.txt",
    size: 6,
    url: `${basePath}/files/202`,
  };
  await mockPullRequestChanges(page, { threads, nonRangedThreads: threads });
  await page.route("**/files", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("review-csrf");
    expect(route.request().postDataBuffer()?.toString("utf8")).toContain('filename="review.txt"');
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(attachment) });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/comments",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().headers()["content-type"]).toBe("application/json");
      expect(route.request().headers()["x-csrf-token"]).toBe("review-csrf");
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "forbidden", message: "Review denied", status: 403 },
          }),
        });
        return;
      }
      threads.push({
        ...NON_RANGED_THREAD,
        commitId: "",
        comments: [
          {
            ...NON_RANGED_THREAD.comments[0],
            id: 1001,
            contentsMarkdown: "Saved **review**",
            attachments: [attachment],
          },
        ],
      });
      // The changes refetch, not the mutation response, supplies the persisted thread.
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(pullRequestDetail()),
      });
    },
  );
  const path = `${basePath}/admin/sample/pullRequest/9/changes`;
  await page.goto(path);
  await page.evaluate(() => {
    (window as Window & { __reviewSubmission?: string }).__reviewSubmission = "general-review";
  });
  const form = page.locator("#comment-form");
  const editor = form.locator("#editor-contents-comment");
  await editor.fill("Preview **draft**");
  await form.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(form.locator(".markdown-preview strong")).toHaveText("draft");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await editor.evaluate((node) => (node as HTMLTextAreaElement).setSelectionRange(0, 0));
  await form.getByRole("button", { name: "Add checklist", exact: true }).click();
  await expect(editor).toHaveValue("Preview **draft**\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C");
  expect(requests).toEqual([]);
  await editor.fill("  ");
  await form.locator("button[type='submit']").click();
  await expect(form.locator("[role='alert']")).toHaveText("Comment should not be empty.");
  expect(requests).toEqual([]);

  await editor.fill("Saved **review**");
  await form.locator("button[type='submit']").click();
  await expect(form.locator("[role='alert']")).toHaveText("Review denied");
  await expect(editor).toHaveValue("Saved **review**");
  await expect(page.locator("#comment-1001")).toHaveCount(0);
  await form.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from("review"),
    mimeType: "text/plain",
    name: "review.txt",
  });
  await form.locator("button[type='submit']").click();
  await expect(page.locator("#comment-1001 .comment-body")).toHaveText("Saved review");
  await expect(editor).toHaveValue("");
  await expect(form.locator("[role='alert']")).toHaveCount(0);
  expect(requests).toEqual([
    { attachmentIds: [], contentsMarkdown: "Saved **review**" },
    { attachmentIds: [202], contentsMarkdown: "Saved **review**" },
  ]);
  expect(
    await page.evaluate(
      () => (window as Window & { __reviewSubmission?: string }).__reviewSubmission,
    ),
  ).toBe("general-review");
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.goto(path);
  await expect(page.locator("#comment-1001 .comment-body")).toHaveText("Saved review");
  await expect(page.locator("#comment-1001 .attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([attachment]),
  );
});

test("PR changes replies to non-ranged and inline threads without replacing other drafts", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const options = {
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
    inlineThreads: [INLINE_REVIEW_THREAD],
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD, INLINE_REVIEW_THREAD],
  };
  const requests: unknown[] = [];
  await mockPullRequestChanges(page, options);
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/comments",
    async (route) => {
      requests.push(route.request().postDataJSON());
      const thread = requests.length === 1 ? NON_RANGED_THREAD : INLINE_REVIEW_THREAD;
      const updated = {
        ...thread,
        comments: [
          ...thread.comments,
          {
            ...thread.comments[0],
            id: requests.length === 1 ? 1002 : 1003,
            contentsMarkdown: requests.length === 1 ? "General reply" : "Inline reply",
          },
        ],
      };
      if (requests.length === 1) {
        options.nonRangedThreads = [updated];
      } else {
        options.inlineThreads = [updated];
      }
      options.threads = [...options.nonRangedThreads, ...options.inlineThreads];
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(pullRequestDetail()),
      });
    },
  );
  const path = `${basePath}/admin/sample/pullRequest/9/changes`;
  await page.goto(path);
  await page.evaluate(() => {
    (window as Window & { __reviewSubmission?: string }).__reviewSubmission = "thread-replies";
  });
  const replyForm = page.locator("#thread-92 form");
  const replyAvatar = replyForm.locator(".author-info img");
  await expect(replyAvatar).toHaveAttribute("src", defaultAvatarUrl);
  expect(
    await replyAvatar.evaluate(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      return image.naturalWidth;
    }),
  ).toBe(34);
  await expect(page.locator("#comment-801 .comment-avatar img")).toHaveAttribute(
    "src",
    "/avatars/dev.png",
  );
  const editTab = replyForm.getByRole("button", { name: "Edit", exact: true });
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(editTab).toHaveCSS("display", "block");
    await expect(editTab).toHaveCSS("line-height", "20px");
    await expect(editTab).toHaveCSS("padding-top", "4px");
    await expect(editTab).toHaveCSS("padding-left", width === 390 ? "5px" : "15px");
    const geometry = await replyForm.evaluate((node) => {
      const [edit, preview] = Array.from(node.querySelectorAll(".nav-tabs > li > button"));
      const e = edit!.getBoundingClientRect();
      const p = preview!.getBoundingClientRect();
      const t = node.querySelector("textarea")!.getBoundingClientRect();
      return {
        editTop: e.top,
        previewTop: p.top,
        editRight: e.right,
        previewLeft: p.left,
        previewBottom: p.bottom,
        textareaTop: t.top,
        previewRight: p.right,
        textareaRight: t.right,
      };
    });
    expect(geometry.editTop).toBeCloseTo(geometry.previewTop, 1);
    expect(geometry.editRight).toBeLessThanOrEqual(geometry.previewLeft);
    expect(geometry.previewBottom).toBeLessThanOrEqual(geometry.textareaTop);
    expect(geometry.previewRight).toBeLessThanOrEqual(geometry.textareaRight);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.locator("#editor-contents-comment").fill("Unsubmitted general review");
  await page.locator("#editor-contents-thread-92").fill("General reply");
  await page.locator("#thread-92 form button[type='submit']").click();
  await expect(page.locator("#thread-92 #comment-1002 .comment-body")).toHaveText("General reply");
  await expect(page.locator("#editor-contents-thread-92")).toHaveValue("");
  await page.locator("#editor-contents-thread-95").fill("Inline reply");
  await page.locator("#thread-95 form button[type='submit']").click();
  await expect(page.locator("#thread-95 #comment-1003 .comment-body")).toHaveText("Inline reply");
  await expect(page.locator("#editor-contents-thread-95")).toHaveValue("");
  await expect(page.locator("#editor-contents-comment")).toHaveValue("Unsubmitted general review");
  expect(requests).toEqual([
    {
      attachmentIds: [],
      commitId: SELECTED_COMMIT_ID,
      contentsMarkdown: "General reply",
      threadId: 92,
    },
    {
      attachmentIds: [],
      commitId: SELECTED_COMMIT_ID,
      contentsMarkdown: "Inline reply",
      threadId: 95,
    },
  ]);
  expect(
    await page.evaluate(
      () => (window as Window & { __reviewSubmission?: string }).__reviewSubmission,
    ),
  ).toBe("thread-replies");
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.goto(path);
  await expect(page.locator("#thread-92 #comment-1002 .comment-body")).toHaveText("General reply");
  await expect(page.locator("#thread-95 #comment-1003 .comment-body")).toHaveText("Inline reply");
});

test("PR selected changes saves the selected review range and keeps a failed inline draft", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const threads: unknown[] = [];
  const requests: unknown[] = [];
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    expectedCommitId: SELECTED_COMMIT_ID,
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
    inlineThreads: threads,
    threads,
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/comments",
    async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "internal_error", message: "Review unavailable", status: 500 },
          }),
        });
        return;
      }
      threads.push({
        ...INLINE_REVIEW_THREAD,
        id: 99,
        startColumn: 0,
        endColumn: 8,
        comments: [
          {
            ...INLINE_REVIEW_THREAD.comments[0],
            id: 1004,
            threadId: 99,
            contentsMarkdown: "Selected review",
          },
        ],
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(pullRequestDetail()),
      });
    },
  );
  const path = `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`;
  await page.goto(path);
  await expect(page.locator("tr.add pre.diff-partial-codeline")).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __reviewSubmission?: string }).__reviewSubmission = "selected-review";
    const pre = document.querySelector("tr.add pre.diff-partial-codeline");
    if (!pre?.firstChild) throw new Error("Missing selectable added line");
    const range = document.createRange();
    range.setStart(pre.firstChild, 0);
    range.setEnd(pre.firstChild, 8);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page
    .locator("tr.add pre.diff-partial-codeline")
    .dispatchEvent("mousedown", { button: 0, bubbles: true });
  await page.locator(".diff-partial-code").dispatchEvent("mouseup", { button: 0, bubbles: true });
  await page.locator(".diff-partial-code > .btnPop button").click();
  const form = page.locator("tr.comment-form #review-form form");
  await form.locator("#editor-contents-review").fill("Selected review");
  await form.locator("button[type='submit']").click();
  await expect(form.locator("[role='alert']")).toHaveText("Review unavailable");
  await expect(form.locator("#editor-contents-review")).toHaveValue("Selected review");
  await expect(form.locator("input[name='startColumn']")).toHaveValue("0");
  await expect(form.locator("input[name='endColumn']")).toHaveValue("8");
  await form.locator("button[type='submit']").click();
  await expect(page.locator("#thread-99 #comment-1004 .comment-body")).toHaveText(
    "Selected review",
  );
  await expect(page.locator("tr.comment-form")).toHaveCount(0);
  expect(requests).toEqual(
    [1, 2].map(() => ({
      attachmentIds: [],
      commitId: SELECTED_COMMIT_ID,
      contentsMarkdown: "Selected review",
      path: "src/main.rs",
      startColumn: 0,
      startLine: 2,
      startSide: "B",
      endColumn: 8,
      endLine: 2,
      endSide: "B",
    })),
  );
  await expect(page.locator("#thread-99")).toHaveAttribute("data-range-startcolumn", "0");
  await expect(page.locator("#thread-99")).toHaveAttribute("data-range-endcolumn", "8");
  expect(
    await page.evaluate(
      () => (window as Window & { __reviewSubmission?: string }).__reviewSubmission,
    ),
  ).toBe("selected-review");
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.goto(path);
  await expect(page.locator("#thread-99 #comment-1004 .comment-body")).toHaveText(
    "Selected review",
  );
  await expect(page.locator("#thread-99")).toHaveAttribute("data-range-endcolumn", "8");
});

test("project pull request changes matches legacy git/viewChanges.scala.html empty diff DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page).toHaveTitle("Pull request - admin/sample");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.textContent),
  ).toBe("Pull request - admin/sample");
  await expect(page.locator(".code-browse-wrap > .nav-tabs.nm li.active a")).toHaveText("Changes");
  await expect(page.locator(".codediff-wrap")).toHaveClass(/diffs-only/u);
  await expect(page.locator("#commits .d-label")).toHaveText("All commit changes");
  await expect(page.locator("#btnAccept")).toHaveAttribute("type", "button");
  await expect(page.locator("[data-request-method]")).toHaveCount(0);
  await expect(page.locator("[data-request-uri]")).toHaveCount(0);
  await expect(page.locator(".pullRequest-branchInfo .from")).toHaveAttribute("title", "From");
  await expect(page.locator(".pullRequest-branchInfo .to")).toHaveAttribute("title", "To");
  await expect(page.locator(".pullRequest-branchInfo .from")).not.toHaveAttribute(
    "data-original-title",
    /.+/u,
  );
  await expect(page.locator(".pullRequest-branchInfo .to")).not.toHaveAttribute(
    "data-original-title",
    /.+/u,
  );
  await assertEditorTabsAreReactOwned(page);

  expect(await pullRequestChangesShellMetrics(page)).toEqual({
    boardBodyMarginBottom: "20px",
    codediffClassName: "codediff-wrap mt10 diffs-only",
    codediffMarginTop: "10px",
    codediffPosition: "relative",
    diffsDisplay: "block",
    diffsMarginRight: "282px",
    diffsPosition: "relative",
    diffsWidthMatchesCodeWrap: true,
    noReviewRail: true,
    showReviewButtonCount: 0,
    stateInsideDiffBody: true,
  });
});

test("project pull request changes uses legacy project-scoped GNB search shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changesPageUrl = `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`;
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    expectedCommitId: SELECTED_COMMIT_ID,
    project: { isProtected: true, organizationName: "admin" },
  });

  await page.goto(changesPageUrl);
  await expect(page.locator(".commitInfo .ago")).toHaveAttribute("title", "Jul 4, 2026");
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );

  const scopeButtons = page.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(changesPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(2).click();
  await expect(page).toHaveURL(changesPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(0).click();
  await expect(page).toHaveURL(changesPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );

  const metrics = await pullRequestChangesNavbarMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.input.left).toBeGreaterThanOrEqual(metrics!.searchBox.left);
  expect(metrics!.input.right).toBeLessThanOrEqual(metrics!.searchBox.right);
  expect(metrics!.menu.top).toBeGreaterThanOrEqual(metrics!.projectHeader.bottom - 1);
});

test("project pull request default changes keeps the project shell for project-scoped 403 and 404", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const [status, copy] of [
    [403, "You are not authorized"],
    [404, "Page not found"],
  ] as const) {
    await mockPullRequestChanges(page, { changesErrorStatus: status });
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes?status=${status}`);
    await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
    await expect(page.locator(".project-header-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText(
      "Pull request",
    );
    await expect(page.locator(".project-page-wrap > .error-wrap p")).toHaveText(copy);
  }
});

test("project pull request changes renders legacy file diff error row", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    files: [{ errorCode: "DIFF_SIZE_EXCEEDED", patch: "", path: "src/main.rs" }],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  const diffTable = page.locator(".diff-partial-code table.diff-container.show-comments");
  await expect(diffTable).toHaveCount(1);
  await expect(diffTable.locator("tbody > tr")).toHaveCount(1);
  await expect(diffTable.locator("tbody > tr > td")).toHaveAttribute("colspan", "3");
  await expect(diffTable.locator("tbody > tr > td")).toHaveText("This diff is too big to display.");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-file-diff-collapse";
  });
  const urlBeforeToggle = page.url();
  const diffMeta = page.locator(".diff-partial-meta");
  const diffCode = page.locator(".diff-partial-code");
  await expect(diffMeta).toHaveJSProperty("tagName", "DIV");
  await expect(diffMeta).not.toHaveAttribute("role", "button");
  await expect(diffMeta).not.toHaveAttribute("tabindex", "0");
  await expect(diffMeta).toHaveCSS("cursor", "pointer");
  await expect(diffCode).toBeVisible();
  await diffMeta.click();
  await expect(diffCode).toHaveCSS("display", "none");
  await diffMeta.click();
  await expect(diffCode).toBeVisible();
  expect(page.url()).toBe(urlBeforeToggle);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("pull-request-file-diff-collapse");
});

test("project pull request changes renders normal file diffs as legacy table rows", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  const file = page.locator("#src-main-rs.diff-partial-outer");
  await expect(file).toHaveCount(1);
  await expect(file.locator(".diff-partial-meta .diff-partial-commit-id")).toHaveCount(2);
  await expect(file.locator(".diff-partial-file .filename")).toHaveText("src/main.rs");
  await expect(file.locator(".diff-partial-code")).toHaveAttribute("data-hashcode", "src/main.rs");
  await expect(file.locator(".patch-header .path")).toHaveText([
    "--- src/main.rs",
    "+++ src/main.rs",
  ]);

  const diffTable = file.locator("table.diff-container.show-comments");
  await expect(diffTable).toHaveAttribute("data-path-a", "src/main.rs");
  await expect(diffTable).toHaveAttribute("data-path-b", "src/main.rs");
  await expect(diffTable).toHaveAttribute("data-file-path", "src/main.rs");
  await expect(file.locator("pre.diff-body")).toHaveCount(0);
  await expect(diffTable.locator("tbody > tr")).toHaveCount(5);
  await expect(diffTable.locator("tbody > tr").nth(0)).toHaveClass("range");
  await expect(diffTable.locator("tbody > tr").nth(0).locator(".hunk")).toHaveText(
    "@@ -1,3 +1,3 @@",
  );
  await expect(diffTable.locator("tbody > tr").nth(1)).toHaveClass("context");
  await expect(diffTable.locator("tbody > tr").nth(1)).toHaveAttribute("data-line", "1");
  await expect(diffTable.locator("tbody > tr").nth(1)).toHaveAttribute("data-side", "B");
  await expect(diffTable.locator("tbody > tr").nth(1)).toHaveAttribute("data-type", "context");
  await expect(diffTable.locator("tbody > tr").nth(1).locator(".diff-partial-codeline")).toHaveText(
    " fn main() {",
  );
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveClass("remove");
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveAttribute("data-line", "2");
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveAttribute("data-side", "A");
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveAttribute("data-type", "remove");
  await expect(diffTable.locator("tbody > tr").nth(2).locator(".linenum").nth(0)).toHaveText("2");
  await expect(diffTable.locator("tbody > tr").nth(2).locator(".linenum").nth(1)).toHaveText("");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveClass("add");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveAttribute("data-line", "2");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveAttribute("data-side", "B");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveAttribute("data-type", "add");
  await expect(diffTable.locator("tbody > tr").nth(3).locator(".linenum").nth(0)).toHaveText("");
  await expect(diffTable.locator("tbody > tr").nth(3).locator(".linenum").nth(1)).toHaveText("2");

  const metrics = await pullRequestNormalDiffMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.metaBottom).toBeLessThanOrEqual(metrics!.codeTop);
  expect(metrics!.rangeTop).toBeLessThan(metrics!.contextTop);
  expect(metrics!.contextTop).toBeLessThan(metrics!.removeTop);
  expect(metrics!.removeTop).toBeLessThan(metrics!.addTop);
  expect(metrics!.oldColumnRight).toBeLessThanOrEqual(metrics!.newColumnLeft + 1);
  expect(metrics!.newColumnRight).toBeLessThanOrEqual(metrics!.codeColumnLeft + 1);
});

test("project pull request changes renders legacy inline review thread and block comment form", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
    inlineThreads: [INLINE_REVIEW_THREAD],
    threads: [INLINE_REVIEW_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  const inlineRow = page.locator(
    "tr.comments.board-comment-wrap[data-commit-id='abcdef1234567890']",
  );
  await expect(inlineRow).toHaveCount(1);
  await expect(inlineRow).toBeVisible();
  await expect(inlineRow.locator("#thread-95")).toHaveClass(/comment-thread-wrap open/u);
  await expect(inlineRow.locator("#thread-95")).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(inlineRow.locator("#thread-95")).toHaveAttribute("data-range-path", "src/main.rs");
  await expect(inlineRow.locator("#thread-95")).toHaveAttribute("data-range-startside", "B");
  await expect(inlineRow.locator("#thread-95")).toHaveAttribute("data-range-startline", "2");
  await expect(inlineRow.locator("#thread-95")).toHaveAttribute("data-range-endside", "B");
  await expect(inlineRow.locator("#thread-95")).toHaveAttribute("data-range-endline", "2");
  await expect(inlineRow.locator("#thread-95 .thread-header .badge.state.open")).toHaveText("Open");
  await expect(inlineRow.locator("#comment-901 .comment-body.markdown-wrap")).toHaveText(
    "Inline review",
  );
  await expect(inlineRow.locator("#thread-95 form.review-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments?commitId=${SELECTED_COMMIT_ID}`,
  );
  await expect(inlineRow.locator("#thread-95 input[name='thread.id']")).toHaveValue("95");
  await expect(
    inlineRow.locator(
      '#thread-95 [data-owner="pull-request-changes-thread-actions"] .ybtn-default',
    ),
  ).toHaveText("Close");
  await expect(inlineRow.locator("#thread-95 [data-request-method]")).toHaveCount(0);
  await expect(inlineRow.locator("#thread-95 [data-request-uri]")).toHaveCount(0);
  const inlineThreadMetrics = await page.locator("table.diff-container").evaluate((table) => {
    const addRow = table.querySelector("tr.add");
    const inlineRow = table.querySelector("tr.comments.board-comment-wrap");
    const inlineCell = inlineRow?.querySelector("td");
    const thread = table.querySelector("#thread-95");
    const codeCell = addRow?.querySelector("td.code");
    const addBox = addRow?.getBoundingClientRect();
    const inlineRowBox = inlineRow?.getBoundingClientRect();
    const inlineCellBox = inlineCell?.getBoundingClientRect();
    const threadBox = thread?.getBoundingClientRect();
    const codeCellBox = codeCell?.getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();

    return addBox && inlineRowBox && inlineCellBox && threadBox && codeCellBox
      ? {
          cellContainsThread:
            threadBox.left >= inlineCellBox.left &&
            threadBox.right <= inlineCellBox.right + 1 &&
            threadBox.top >= inlineCellBox.top &&
            threadBox.bottom <= inlineCellBox.bottom + 1,
          inlineAfterCodeLine: inlineRowBox.top >= addBox.bottom - 1,
          inlineDoesNotOverlapCode: threadBox.top >= codeCellBox.bottom - 1,
          rowWidth: Math.round(inlineRowBox.width),
          tableWidth: Math.round(tableBox.width),
          threadLeftMatchesCell: Math.round(threadBox.left) === Math.round(inlineCellBox.left),
        }
      : null;
  });
  expect(inlineThreadMetrics).not.toBeNull();
  expect(inlineThreadMetrics!.inlineAfterCodeLine).toBe(true);
  expect(inlineThreadMetrics!.inlineDoesNotOverlapCode).toBe(true);
  expect(inlineThreadMetrics!.cellContainsThread).toBe(true);
  expect(inlineThreadMetrics!.threadLeftMatchesCell).toBe(true);
  expect(inlineThreadMetrics!.rowWidth).toBe(inlineThreadMetrics!.tableWidth);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-inline-block-review";
    const pre = document.querySelector("tr.add pre.diff-partial-codeline");
    if (!pre?.firstChild) return;
    const range = document.createRange();
    range.setStart(pre.firstChild, 1);
    range.setEnd(pre.firstChild, 8);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.locator("tr.add pre.diff-partial-codeline").dispatchEvent("mousedown", {
    button: 0,
    bubbles: true,
  });
  await page.locator(".diff-partial-code").dispatchEvent("mouseup", {
    button: 0,
    bubbles: true,
  });

  const blockButton = page.locator(".diff-partial-code > .btnPop button");
  await expect(blockButton).toBeVisible();
  await blockButton.click();

  const commentFormRow = page.locator("tr.comment-form");
  await expect(commentFormRow).toHaveCount(1);
  await expect(page.locator("#changes > #review-form")).toHaveCount(0);
  await expect(commentFormRow.locator("#review-form form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments`,
  );
  await expect(commentFormRow.locator("input[name='startLine']")).toHaveValue("2");
  await expect(commentFormRow.locator("input[name='startSide']")).toHaveValue("B");
  await expect(commentFormRow.locator("input[name='endLine']")).toHaveValue("2");
  await expect(commentFormRow.locator("input[name='endSide']")).toHaveValue("B");
  await expect(commentFormRow.locator("input[name='path']")).toHaveValue("src/main.rs");
  await expect(commentFormRow.locator("input[name='pathA']")).toHaveValue("src/main.rs");
  await expect(commentFormRow.locator("input[name='pathB']")).toHaveValue("src/main.rs");
  await expect(commentFormRow.locator("input[type='hidden'][name='filePath']")).toHaveValue(
    "src/main.rs",
  );
  await expect(commentFormRow.locator("#editor-contents-review")).toBeVisible();
  const closeInlineReviewButton = commentFormRow.locator(
    "#review-form .pull-right > button.ybtn-default",
  );
  await expect(closeInlineReviewButton).toHaveText("×");
  await expect(closeInlineReviewButton).not.toHaveAttribute("data-toggle", /.*/u);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("pull-request-inline-block-review");

  const metrics = await page.locator("table.diff-container").evaluate((table) => {
    const addRow = table.querySelector("tr.add");
    const commentRow = table.querySelector("tr.comments.board-comment-wrap");
    const formRow = table.querySelector("tr.comment-form");
    const addBox = addRow?.getBoundingClientRect();
    const commentBox = commentRow?.getBoundingClientRect();
    const formBox = formRow?.getBoundingClientRect();
    return addBox && commentBox && formBox
      ? {
          commentAfterForm: commentBox.top >= formBox.bottom - 1,
          formAfterAdd: formBox.top >= addBox.bottom - 1,
          formWidth: Math.round(formBox.width),
          tableWidth: Math.round(table.getBoundingClientRect().width),
        }
      : null;
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.formAfterAdd).toBe(true);
  expect(metrics!.commentAfterForm).toBe(true);
  expect(metrics!.formWidth).toBe(metrics!.tableWidth);

  await closeInlineReviewButton.click();
  await expect(page.locator("tr.comment-form")).toHaveCount(0);
  await expect(page.locator("#changes > #review-form")).toHaveCount(1);
  await expect(page.locator("#changes > #review-form")).not.toHaveCSS("display", "block");
});

test("project pull request ranged open thread shell owns legacy fold controls and mobile geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
    inlineThreads: [INLINE_REVIEW_THREAD],
    threads: [INLINE_REVIEW_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  const thread = page.locator("#thread-95");
  await expect(thread).toHaveClass(/comment-thread-wrap open/u);
  await expect(thread).toHaveAttribute("data-thread-folded", "false");
  await expect(thread).toHaveAttribute("data-owner", "pull-request-changes-ranged-thread-shell");
  await expect(thread.locator('[data-owner^="pull-request-changes-ranged-thread-"]')).toHaveCount(
    6,
  );
  await expect(thread.locator(".thread-header .badge.state.open")).toHaveText("Open");
  await expect(thread.locator(".comments")).toBeVisible();
  await expect(thread.locator(".write-comment-form")).toBeVisible();
  await expect(thread).toHaveCSS("background-color", "rgb(254, 254, 254)");
  await expect(thread).toHaveCSS("box-shadow", "rgb(182, 218, 84) 5px 0px 0px 0px inset");
  await expect(thread.locator(".thread-header")).toHaveCSS("padding", "5px 10px 10px");
  await expect(thread.locator(".badge.state")).toHaveCSS("padding", "2px 10px");
  await page.screenshot({
    path: "output/playwright/batch-821/ranged-thread-open-desktop.png",
    fullPage: true,
  });

  await thread.locator(".thread-header .btn-thread-minimize").click();
  await expect(thread).toHaveClass(/comment-thread-wrap open fold/u);
  await expect(thread).toHaveAttribute("data-thread-folded", "true");
  await expect(thread.locator(".thread-header")).toBeHidden();
  await expect(thread.locator(".comments")).toBeHidden();
  await expect(thread.locator(".write-comment-form")).toBeHidden();
  await expect(thread.locator(".btn-thread-here")).toBeVisible();
  await expect(thread.locator(".btn-thread-here button")).toHaveCSS(
    "border-left",
    "3px solid rgb(182, 218, 84)",
  );
  await page.screenshot({
    path: "output/playwright/batch-821/ranged-thread-open-folded-desktop.png",
    fullPage: true,
  });

  await thread.locator(".btn-thread-here button").click();
  await expect(thread).toHaveClass(/comment-thread-wrap open$/u);
  await expect(thread.locator(".thread-header")).toBeVisible();
  await expect(thread.locator(".comments")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileThreadMetrics = await thread.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const scrollportElement = element.closest(".diffs-wrap-scroll");
    const scrollport = scrollportElement?.getBoundingClientRect();
    const codeRow = document.querySelector("tr.add")?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      contained:
        !!scrollport &&
        !!scrollportElement &&
        scrollportElement.contains(element) &&
        box.left >= scrollport.left - 1,
      noOverlapWithCode: !codeRow || box.top >= codeRow.bottom - 1,
      noDocumentOverflow: document.documentElement.scrollWidth <= viewportWidth + 1,
    };
  });
  expect(mobileThreadMetrics.contained).toBe(true);
  expect(mobileThreadMetrics.noOverlapWithCode).toBe(true);
  expect(mobileThreadMetrics.noDocumentOverflow).toBe(true);
  await page.screenshot({
    path: "output/playwright/batch-821/ranged-thread-open-mobile.png",
    fullPage: true,
  });
});

test("project pull request ranged closed thread starts folded and exposes here control", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    files: [{ patch: NORMAL_FILE_PATCH, path: "src/main.rs" }],
    inlineThreads: [CLOSED_INLINE_REVIEW_THREAD],
    threads: [CLOSED_INLINE_REVIEW_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  const thread = page.locator("#thread-96");
  await expect(thread).toHaveClass(/comment-thread-wrap closed fold/u);
  await expect(thread).toHaveAttribute("data-state", "closed");
  await expect(thread).toHaveAttribute("data-thread-folded", "true");
  await expect(thread.locator(".thread-header")).toBeHidden();
  await expect(thread.locator(".comments")).toBeHidden();
  await expect(thread.locator(".write-comment-form")).toBeHidden();
  await expect(thread.locator(".btn-thread-here")).toBeVisible();
  await expect(thread.locator(".btn-thread-here button")).toHaveCSS(
    "border-left",
    "3px solid rgb(253, 105, 86)",
  );
  await expect(thread.locator(".thread-header .badge.state.closed")).toHaveText("Closed");

  await thread.locator(".btn-thread-here button").click();
  await expect(thread).toHaveClass(/comment-thread-wrap closed(?! fold)/u);
  await expect(thread).toHaveAttribute("data-thread-folded", "false");
  await expect(thread.locator(".thread-header")).toBeVisible();
  await expect(thread.locator(".comments")).toBeVisible();
  await expect(thread.locator(".write-comment-form")).toBeVisible();
  await thread.locator(".thread-header .btn-thread-minimize").click();
  await expect(thread).toHaveClass(/comment-thread-wrap closed fold/u);
  await expect(thread.locator(".btn-thread-here")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFoldMetrics = await thread.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const scrollportElement = element.closest(".diffs-wrap-scroll");
    const scrollport = scrollportElement?.getBoundingClientRect();
    const hereBox = element.querySelector(".btn-thread-here")?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      contained:
        !!scrollport &&
        !!scrollportElement &&
        scrollportElement.contains(element) &&
        box.left >= scrollport.left - 1,
      hereContained:
        !hereBox ||
        (!!scrollport &&
          hereBox.left >= scrollport.left - 1 &&
          hereBox.right <= scrollport.right + 1),
      noDocumentOverflow: document.documentElement.scrollWidth <= viewportWidth + 1,
    };
  });
  expect(mobileFoldMetrics.contained).toBe(true);
  expect(mobileFoldMetrics.hereContained).toBe(true);
  expect(mobileFoldMetrics.noDocumentOverflow).toBe(true);
  await page.screenshot({
    path: "output/playwright/batch-821/ranged-thread-closed-folded-mobile.png",
    fullPage: true,
  });
});

test("project pull request selected commit changes matches legacy git/viewChanges.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    expectedCommitId: SELECTED_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label .commit-hash")).toHaveText("abcdef1");
  await expect(page.locator(".commitInfo .ago")).toHaveAttribute("title", "Jul 4, 2026");
  await expect(page.locator(".commitInfo strong")).toHaveText("Dev Member");
  await expect(page.locator(".commitInfo > a.avatar-wrap")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator(".commitInfo img")).toHaveAttribute("src", "/avatars/dev.png");
  await expect(page.locator(".commitInfo img")).toHaveAttribute("alt", "Dev Member");
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments?commitId=${SELECTED_COMMIT_ID}`,
  );
});

test("project pull request selected commit without author renders legacy anonymous fallback", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_NO_AUTHOR_COMMIT],
    expectedCommitId: SELECTED_NO_AUTHOR_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_NO_AUTHOR_COMMIT_ID}`);
  await expect(page.locator(".commitInfo strong")).toHaveText("Anonymous");
  await expect(page.locator(".commitInfo > a.avatar-wrap")).toHaveCount(0);
  await expect(page.locator(".commitInfo img")).toHaveCount(0);
});

test("project pull request selected commit dropdown is React-owned and preserves legacy links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT, PRIOR_COMMIT],
    expectedCommitId: SELECTED_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`);
  await assertCommitDropdownOpensReactOwned(page, {
    allHref: `${basePath}/admin/sample/pullRequest/9/changes`,
    allText: "All commit changes",
    currentHref: `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`,
    currentLabel: "Add UI",
    currentShortId: "abcdef1",
    marker: "pull-request-selected-commit-dropdown",
    selectedLabel: "abcdef1Add UI",
  });
});

test("project pull request prior commit changes matches legacy outdated dropdown DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    pullRequestCommits: [SELECTED_COMMIT, PRIOR_COMMIT],
    expectedCommitId: PRIOR_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${PRIOR_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label")).toContainText("Old UI (Outdated)");
  await expect(page.locator("#commits .dropdown-menu a", { hasText: "Old UI" })).toHaveCount(0);
  await expect(page.locator(".commitInfo strong")).toHaveText("Former Contributor");
  await expect(page.locator(".commitInfo > a.avatar-wrap")).toHaveCount(0);
  await expect(page.locator(".commitInfo img")).toHaveAttribute(
    "src",
    PRIOR_COMMIT.authorAvatarUrl,
  );
});

test("project pull request prior commit dropdown is React-owned and preserves legacy links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT, PRIOR_COMMIT],
    expectedCommitId: PRIOR_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${PRIOR_COMMIT_ID}`);
  await assertCommitDropdownOpensReactOwned(page, {
    allHref: `${basePath}/admin/sample/pullRequest/9/changes`,
    allText: "All commit changes",
    currentHref: `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`,
    currentLabel: "Add UI",
    currentShortId: "abcdef1",
    marker: "pull-request-prior-commit-dropdown",
    selectedLabel: "1234567Old UI (Outdated)",
  });
  await expect(page.locator("#commits .dropdown-menu a", { hasText: "Old UI" })).toHaveCount(0);
});

test("project pull request unknown commit changes matches legacy outdated fallback DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    expectedCommitId: UNKNOWN_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${UNKNOWN_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label")).toContainText(
    "All commit changes (Outdated - fedcba9)",
  );
  await expect(page.locator("#commits .d-label strong")).toHaveText("fedcba9");
  await expect(page.locator(".commitInfo")).toHaveCount(0);
});

test("project pull request changes renders legacy review cards when threads exist", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, { cardThreads: [REVIEW_THREAD], threads: [REVIEW_THREAD] });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".codediff-wrap")).not.toHaveClass(/diffs-only/u);
  await expect(page.locator(".btn-show-reviewcards")).toHaveCount(1);
  await page.locator(".btn-hide-reviewcards").click();
  await expect(page.locator(".review-wrap")).not.toBeVisible();
  await expect(page.locator(".btn-show-reviewcards")).toBeVisible();
  await page.locator(".btn-show-reviewcards").click();
  await expect(page.locator(".review-wrap")).toBeVisible();
  await expect(page.locator(".review-card.open")).toContainText("Review note");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-review-tabs";
  });
  const reviewTabs = page.locator(".review-container .nav-tabs");
  const urlBeforeReviewTabClick = page.url();
  await expect(reviewTabs.locator('a[href^="#"]')).toHaveCount(0);
  await expect(reviewTabs.locator('button[type="button"][data-toggle="tab"]')).toHaveCount(0);
  await expect(reviewTabs.locator('button[type="button"]')).toHaveCount(2);
  await expect(reviewTabs.locator("button").nth(0)).toHaveText("Open 1");
  await expect(reviewTabs.locator("button").nth(1)).toHaveText("Closed 0");
  await reviewTabs.locator("button").nth(1).click();
  await expect(reviewTabs.locator("li").nth(0)).not.toHaveClass(/active/);
  await expect(reviewTabs.locator("li").nth(1)).toHaveClass(/active/);
  await expect(page.locator("#reviewcards-open")).not.toHaveClass(/active/);
  await expect(page.locator("#reviewcards-closed")).toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeReviewTabClick);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("pull-request-review-tabs");
  await reviewTabs.locator("button").nth(0).click();
  await expect(reviewTabs.locator("li").nth(0)).toHaveClass(/active/);
  await expect(reviewTabs.locator("li").nth(1)).not.toHaveClass(/active/);
  await expect(page.locator("#reviewcards-open")).toHaveClass(/active/);
  await expect(page.locator("#reviewcards-closed")).not.toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeReviewTabClick);
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91`,
  );
  await expect(page.locator("#reviewcards-open .avatar-wrap.smaller.ml5 img")).toHaveAttribute(
    "alt",
    "Dev Member",
  );
  await expect(page.locator('[data-owner="pull-request-changes-review-card"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="pull-request-changes-review-card-content"]')).toHaveText(
    "Review note",
  );
  await expect(page.locator('[data-owner="pull-request-changes-review-card-info"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="pull-request-changes-review-card-comments"]')).toHaveText(
    "1",
  );
  await expect(page.locator('[data-owner="pull-request-changes-review-card-date"]')).toHaveText(
    "2000-07-05",
  );
  await expect(
    page.locator('[data-owner="pull-request-changes-review-card-date"]'),
  ).toHaveAttribute("title", "2000-07-05 10:15:00 AM");

  expect(await pullRequestReviewCardMetrics(page)).toEqual({
    cardBorder: "1px solid rgb(221, 221, 221)",
    cardBoxShadow: "rgb(182, 218, 84) 5px 0px 0px 0px inset",
    cardDisplay: "block",
    cardMarginBottom: "0px",
    cardPadding: "10px 10px 10px 15px",
    cardRadius: "0px 3px 3px 0px",
    closedTabAfterOpenTab: true,
    contentMaxHeight: "60px",
    contentOverflow: "hidden",
    contentTextAlign: "justify",
    contentWordBreak: "break-all",
    dateColor: "rgb(153, 153, 153)",
    hiddenOutdatedDisplay: "none",
    infoMarginTop: "10px",
    infoTextAlign: "right",
    openCardHref: `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91`,
    reviewContainerWidth: "260px",
    reviewDisplay: "block",
    reviewListOverflow: "auto",
    reviewPosition: "absolute",
    reviewRight: "0px",
    reviewTop: "0px",
    reviewWidth: "260px",
  });
});

test("project pull request review cards keep Style state and responsive containment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const closedCardThread = { ...REVIEW_THREAD, id: 95, state: "closed" };
  await mockPullRequestChanges(page, {
    cardThreads: [REVIEW_THREAD, closedCardThread],
    threads: [REVIEW_THREAD, closedCardThread],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  const openCard = page.locator("#reviewcards-open .review-card.open");
  const closedCard = page.locator("#reviewcards-closed .review-card.closed");
  await expect(openCard).toHaveClass(/review-card\s+open/u);
  await expect(closedCard).toHaveClass(/review-card\s+closed/u);
  await expect(openCard).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91`,
  );
  await expect(closedCard).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-95`,
  );
  await expect(openCard.locator("[data-owner$='-outdated-label']")).toHaveCSS("display", "none");
  await expect(openCard.locator("[data-owner$='-content']")).toHaveCSS("-webkit-line-clamp", "3");
  await expect(openCard.locator("[data-owner$='-content']")).toHaveCSS("max-height", "60px");
  await expect(openCard.locator("[data-owner$='-info']")).toHaveCSS("margin-top", "10px");
  await expect(openCard.locator("[data-owner$='-date']")).toHaveCSS("color", "rgb(153, 153, 153)");
  await expect(openCard.locator("[data-owner$='-comments']")).toHaveCSS(
    "color",
    "rgb(53, 146, 181)",
  );
  mkdirSync(BATCH_822_SCREENSHOT_DIRECTORY, { recursive: true });
  await page.locator(".review-container").screenshot({
    path: resolve(BATCH_822_SCREENSHOT_DIRECTORY, "review-card-desktop.png"),
  });
  await openCard.hover();
  await expect(openCard).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(openCard).toHaveCSS("box-shadow", "rgb(182, 218, 84) 5px 0px 0px 0px inset");

  await page.locator(".review-container .nav-tabs button").nth(1).click();
  await expect(closedCard).toBeVisible();
  await expect(closedCard).toHaveCSS("box-shadow", "rgb(221, 221, 221) 5px 0px 0px 0px inset");
  await page.locator(".review-container .nav-tabs button").nth(0).click();
  await expect(page.locator("#reviewcards-open")).toHaveClass(/active/u);

  await page.setViewportSize({ width: 390, height: 844 });
  const containment = await page.locator(".review-container").evaluate((container) => {
    const card = container.querySelector<HTMLElement>("#reviewcards-open .review-card.open");
    const content = card?.querySelector<HTMLElement>(".content");
    if (!card || !content) return null;
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      cardInsideContainer:
        cardRect.left >= containerRect.left && cardRect.right <= containerRect.right,
      contentInsideCard: contentRect.left >= cardRect.left && contentRect.right <= cardRect.right,
      viewportWidth: window.innerWidth,
    };
  });
  expect(containment).toEqual({
    cardInsideContainer: true,
    contentInsideCard: true,
    viewportWidth: 390,
  });
  await page.locator(".review-container").screenshot({
    path: resolve(BATCH_822_SCREENSHOT_DIRECTORY, "review-card-390.png"),
  });
});

test("project pull request changes renders legacy non-ranged thread DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    cardThreads: [NON_RANGED_THREAD],
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD],
  });
  const threadStateRequests: string[] = [];
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/threads/92/close",
    async (route) => {
      threadStateRequests.push(route.request().method());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...NON_RANGED_THREAD, state: "closed" }),
      });
    },
  );

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".non-ranged-threads-wrap #thread-92")).toHaveCount(1);
  await expect(page.locator("#thread-92 .write-comment-form")).toHaveCount(1);
  await expect(page.locator("#comment-801 .comment-avatar img")).toHaveAttribute("alt", "dev");
  // F6 copy-fix: the 100px editor height is Style-owned (reviewTextarea,
  // -pull-request-changes.style.ts:49), no inline style — assert computed.
  await expect(page.locator("#editor-contents-thread-92")).toHaveCSS("height", "100px");
  await assertEditorTabsAreReactOwned(page, true);

  const deleteButton = page.locator(
    '#comment-801 .edit.pull-right > button.btn-transparent.pull-right.close[title="Delete comment"]',
  );
  await expect(deleteButton).toHaveCount(1);
  await expect(deleteButton.locator(".yobicon-trash")).toHaveCount(1);
  await expect(deleteButton).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(deleteButton).not.toHaveAttribute("data-request-method", /.*/u);
  await expect(deleteButton).not.toHaveAttribute("data-request-uri", /.*/u);
  await expect(page.locator('#comment-801 [data-toggle="comment-delete"]')).toHaveCount(0);
  await expect(page.locator("#changes [data-request-method]")).toHaveCount(0);
  await expect(page.locator("#changes [data-request-uri]")).toHaveCount(0);
  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __commentDeleteBubbles?: number }
    ).__commentDeleteBubbles = 0;
    document.addEventListener(
      "click",
      () => {
        (
          window as Window & typeof globalThis & { __commentDeleteBubbles?: number }
        ).__commentDeleteBubbles =
          ((window as Window & typeof globalThis & { __commentDeleteBubbles?: number })
            .__commentDeleteBubbles ?? 0) + 1;
      },
      { once: true },
    );
  });
  await deleteButton.click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade in");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);
  await expect(page.locator("#comment-delete-modal .modal-header .close")).not.toHaveAttribute(
    "data-dismiss",
    /.*/u,
  );
  await expect(
    page.locator("#comment-delete-modal .modal-footer .ybtn").last(),
  ).not.toHaveAttribute("data-dismiss", /.*/u);
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.*/u,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.*/u,
  );
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __commentDeleteBubbles?: number })
          .__commentDeleteBubbles,
    ),
  ).toBe(0);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/pullRequest/9/changes`);

  await armRootModalBridgeTrap(page);
  await page.locator("#comment-delete-modal .modal-header .close").click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await deleteButton.click();
  await armRootModalBridgeTrap(page);
  await page.locator("#comment-delete-modal .modal-footer .ybtn").last().click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  const closeThreadButton = page.locator("#thread-92 .write-comment-form .right-txt .ybtn-default");
  await expect(closeThreadButton).toHaveText("Close");
  await closeThreadButton.click();
  await expect.poll(() => threadStateRequests).toEqual(["POST"]);
  await expect(page.locator("#thread-92")).toHaveClass("comment-thread-wrap closed");
  await expect(closeThreadButton).toHaveText("Open");
});

test("project pull request changes folds original message content in via-email review comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    cardThreads: [VIA_EMAIL_NON_RANGED_THREAD],
    nonRangedThreads: [VIA_EMAIL_NON_RANGED_THREAD],
    threads: [VIA_EMAIL_NON_RANGED_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  const commentBody = page.locator("#comment-802 .comment-body.markdown-wrap");
  await expect(commentBody).toHaveAttribute("data-via-email", "true");
  await expect(commentBody).toHaveAttribute("data-yobi-original-message-processed", "true");
  await expect(commentBody.locator("p").first()).toHaveText("Reply before quoted mail.");

  const toggle = commentBody.locator('button[type="button"]', { hasText: "..." });
  await page.waitForTimeout(100);
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await expect
    .poll(() =>
      commentBody.locator('button[type="button"]').evaluateAll(
        (buttons) =>
          buttons.filter((button) => {
            const element = button as HTMLElement;
            return element.textContent?.trim() === "..." && element.offsetParent !== null;
          }).length,
      ),
    )
    .toBe(1);

  const foldedOriginal = commentBody.locator('[data-original-message-owner="route"]');
  await expect(foldedOriginal).toBeHidden();
  await expect(foldedOriginal.getByText("Original author wrote:")).toBeHidden();
  await expect(foldedOriginal.getByText("Quoted original line")).toBeHidden();

  await toggle.click();
  await expect(foldedOriginal).toBeVisible();
  await expect(foldedOriginal.getByText("Original author wrote:")).toBeVisible();
  await expect(foldedOriginal.getByText("Quoted original line")).toBeVisible();

  await toggle.click();
  await expect(foldedOriginal).toBeHidden();
  await expect(foldedOriginal.getByText("Quoted original line")).toBeHidden();
});

test("project pull request changes owns comment hash links through router", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    cardThreads: [NON_RANGED_THREAD],
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-comment-hash";
  });

  await expect(page.locator('.non-ranged-threads-wrap .ago a[href^="#comment-"]')).toHaveCount(0);
  const commentDate = page.locator("#comment-801 .ago a");
  await expect(commentDate).toHaveText("2000-07-07");
  await expect(commentDate).toHaveAttribute("title", "2000-07-07 10:15:00 AM");
  await expect(commentDate).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes#comment-801`,
  );

  await commentDate.click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#comment-801");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("pull-request-comment-hash");
});

test("project pull request changes internal navigation links render legacy hrefs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    cardThreads: [NON_RANGED_THREAD],
    commits: [SELECTED_COMMIT],
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);

  await assertLegacyAnchor(page.locator(".author-info > .usf-group"), {
    className: "usf-group pull-left",
    href: `${basePath}/dev`,
    text: "Dev Member @dev",
  });
  await assertLegacyAnchor(page.locator("#review-form .author-info .avatar-wrap.medium"), {
    className: "avatar-wrap medium",
    href: `${basePath}/admin`,
    text: "",
    title: "Site Admin",
  });
  await assertLegacyAnchor(page.locator("#thread-92 .author-info .avatar-wrap.medium"), {
    className: "avatar-wrap medium",
    href: `${basePath}/admin`,
    text: "",
    title: "Site Admin",
  });
  await assertLegacyAnchor(page.locator("#comment-801 .comment-avatar .avatar-wrap"), {
    className: "avatar-wrap",
    href: `${basePath}/dev`,
    text: "",
    title: "Dev Member",
  });
  await assertLegacyAnchor(page.locator("#comment-801 .comment_author a"), {
    href: `${basePath}/dev`,
    text: "dev",
    title: "Dev Member",
  });
  await assertLegacyAnchor(page.locator("#comment-801 .ago a"), {
    href: `${basePath}/admin/sample/pullRequest/9/changes#comment-801`,
    text: "2000-07-07",
    title: "2000-07-07 10:15:00 AM",
  });
  await assertLegacyAnchor(page.locator("#commits .dropdown-menu li").nth(0).locator("a"), {
    href: `${basePath}/admin/sample/pullRequest/9/changes`,
    text: "All commit changes",
  });
  await assertLegacyAnchor(page.locator("#commits .dropdown-menu li").nth(2).locator("a"), {
    href: `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`,
    text: "abcdef1Add UI",
  });
  await expect(
    page.locator("#commits .dropdown-menu li").nth(2).locator("a .commit-hash"),
  ).toHaveClass(/mr10/u);
  await expect(
    page.locator("#commits .dropdown-menu li").nth(2).locator("a .commit-hash"),
  ).toHaveAttribute("data-owner", "pull-request-changes-commit-hash");
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}#thread-92`,
  );
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveClass(
    /review-card\s+open/u,
  );
});

test("project pull request commit hashes keep legacy blue text on desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, { commits: [SELECTED_COMMIT] });

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
    const commitHash = page.locator("#commits .commit-hash").last();
    await expect(commitHash).toHaveCount(1);
    await expect(commitHash).toHaveAttribute("data-owner", "pull-request-changes-commit-hash");
    await expect(commitHash).not.toHaveClass(/blue-txt/u);
    await expect(commitHash).toHaveCSS("color", "rgb(93, 187, 224)");
  }
});

async function armRootModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __pullRequestChangesRootModalBridgeHits?: string[];
        __pullRequestChangesRootModalBridgeTrapArmed?: boolean;
      };
    win.__pullRequestChangesRootModalBridgeHits = [];
    if (win.__pullRequestChangesRootModalBridgeTrapArmed) {
      return;
    }
    win.__pullRequestChangesRootModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridged) {
        win.__pullRequestChangesRootModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __pullRequestChangesRootModalBridgeHits?: string[] }
      ).__pullRequestChangesRootModalBridgeHits ?? [],
  );
}

test("project pull request changes renders review cards for non-ranged-only threads", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".codediff-wrap")).not.toHaveClass(/diffs-only/u);
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-92`,
  );
});

test("project pull request changes renders legacy outdated review-card class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, { threads: [OUTDATED_REVIEW_THREAD] });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator("#reviewcards-open .review-card")).toHaveClass(
    /review-card\s+open\s+outdated/u,
  );
  expect(
    await page.locator(".review-card.outdated .outdated-label").evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        padding: style.padding,
        text: element.textContent?.trim(),
      };
    }),
  ).toEqual({
    background: "rgb(119, 119, 119)",
    borderRadius: "3px",
    color: "rgb(255, 255, 255)",
    display: "inline",
    padding: "3px 6px",
    text: "Outdated",
  });
});

async function assertLegacyAnchor(
  locator: Locator,
  {
    className,
    href,
    text,
    title,
  }: {
    className?: string;
    href: string;
    text: string;
    title?: string;
  },
) {
  await expect(locator).toHaveAttribute("href", href);
  await expect(locator).toHaveText(text);
  if (className !== undefined) {
    await expect(locator).toHaveClass(className);
  }
  if (title !== undefined) {
    await expect(locator).toHaveAttribute("title", title);
  }
  await expect(locator).not.toHaveAttribute("aria-current", /.+/u);
  await expect(locator).not.toHaveAttribute("data-status", /.+/u);
}

async function assertEditorTabsAreReactOwned(page: Page, includesThread = false) {
  const editors = page.locator('.codediff-wrap .mt10:has(textarea[id^="editor-contents-"])');
  await expect(editors).toHaveCount(includesThread ? 3 : 2);
  await expect(page.locator('.codediff-wrap [data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(editors.locator(".markdown-help")).toHaveCount(includesThread ? 3 : 2);
  await expect(editors.locator(".markdown-help-nav .label")).toHaveText(
    Array.from({ length: includesThread ? 3 : 2 }, () => "Markdown help"),
  );
  await expect(editors.locator('a[href^="#edit-"], a[href^="#preview-"]')).toHaveCount(0);
  await expect(editors.locator('button[type="button"][data-toggle="tab"]')).toHaveCount(0);
  await expect(editors.locator('button[type="button"][data-mode]')).toHaveCount(0);
  await expect(editors.locator("ul.nav-tabs.nm.small > li:nth-child(1) > button")).toHaveText(
    Array.from({ length: includesThread ? 3 : 2 }, () => "Edit"),
  );
  await expect(editors.locator("ul.nav-tabs.nm.small > li:nth-child(2) > button")).toHaveText(
    Array.from({ length: includesThread ? 3 : 2 }, () => "Preview"),
  );

  const commentEditor = page.locator("#comment-form .mt10:has(textarea#editor-contents-comment)");
  const reviewEditor = page.locator("#review-form .mt10:has(textarea#editor-contents-review)");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-editor-tabs";
  });
  const urlBeforeEditorTabClick = page.url();

  await expect(commentEditor.locator("ul.nav-tabs.nm.small > li")).toHaveText([
    "Edit",
    "Preview",
    "Add checklist",
    "Clear Temporary",
    "",
  ]);
  await expect(commentEditor.locator(".notification-receiver")).toHaveCount(1);
  await expect(commentEditor.locator(".notification-receiver")).toContainText(
    "Notification receivers",
  );

  await commentEditor.getByRole("button", { exact: true, name: "Preview" }).click();
  await expect(commentEditor.locator("li").nth(0)).not.toHaveClass(/active/);
  await expect(commentEditor.locator("li").nth(1)).toHaveClass(/active/);
  await expect(page.locator("#edit-comment")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-comment")).toHaveClass(/active/);
  await expect(
    page.locator("#preview-comment .markdown-preview.markdown-wrap.comment-body"),
  ).toHaveCount(1);
  await expect(reviewEditor.locator("li").nth(0)).toHaveClass(/active/);
  await expect(page.locator("#edit-review")).toHaveClass(/active/);
  await expect(reviewEditor.locator("ul.nav-tabs.nm.small > li").nth(0)).toHaveText("Edit");
  await expect(reviewEditor.locator("ul.nav-tabs.nm.small > li").nth(1)).toHaveText("Preview");

  if (includesThread) {
    const threadEditor = page.locator("#thread-92 .mt10:has(textarea#editor-contents-thread-92)");
    await expect(threadEditor.locator("li").nth(0)).toHaveClass(/active/);
    await threadEditor.getByRole("button", { exact: true, name: "Preview" }).click();
    await expect(threadEditor.locator("li").nth(1)).toHaveClass(/active/);
    await expect(commentEditor.locator("li").nth(1)).toHaveClass(/active/);
    await expect(reviewEditor.locator("li").nth(0)).toHaveClass(/active/);
    await threadEditor.getByRole("button", { exact: true, name: "Edit" }).click();
    await expect(threadEditor.locator("li").nth(0)).toHaveClass(/active/);
  }

  await commentEditor.getByRole("button", { exact: true, name: "Edit" }).click();
  await expect(commentEditor.locator("li").nth(0)).toHaveClass(/active/);
  await expect(reviewEditor.locator("li").nth(0)).toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("pull-request-editor-tabs");
}

async function assertCommitDropdownOpensReactOwned(
  page: Page,
  {
    allHref,
    allText,
    currentHref,
    currentLabel,
    currentShortId,
    marker,
    selectedLabel,
  }: {
    allHref: string;
    allText: string;
    currentHref: string;
    currentLabel: string;
    currentShortId: string;
    marker: string;
    selectedLabel: string;
  },
) {
  const commits = page.locator("#commits");
  const toggle = commits.locator(".dropdown-toggle");
  await expect(commits).toHaveClass("btn-group auto mb10");
  await expect(toggle).toHaveClass("btn dropdown-toggle auto");
  await expect(toggle).not.toHaveAttribute("data-toggle", "dropdown");
  await expect(toggle).not.toHaveAttribute("data-target", /.*/u);
  await expect(commits.locator(".d-caret .caret")).toHaveCount(1);
  await expect(commits.locator(".d-label")).toHaveText(selectedLabel);
  await expect(commits.locator(".dropdown-menu li")).toHaveCount(3);
  await expect(commits.locator(".dropdown-menu li").nth(0)).not.toHaveAttribute(
    "data-value",
    /.*/u,
  );
  await expect(commits.locator(".dropdown-menu li").nth(1)).toHaveClass("divider");
  await expect(commits.locator(".dropdown-menu li").nth(2)).not.toHaveAttribute(
    "data-value",
    /.*/u,
  );

  await page.evaluate((value) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = value;
  }, marker);
  const urlBeforeDropdownClick = page.url();

  await toggle.click();
  await expect(commits).toHaveClass("btn-group auto mb10 open");
  expect(page.url()).toBe(urlBeforeDropdownClick);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe(marker);

  const allItem = commits.locator(".dropdown-menu li").nth(0).locator("a");
  await expect(allItem).toHaveText(allText);
  await expect(allItem).toHaveAttribute("href", allHref);

  const currentItem = commits.locator(".dropdown-menu li").nth(2).locator("a");
  await expect(currentItem.locator(".commit-hash")).toHaveText(currentShortId);
  await expect(currentItem.locator("span")).toHaveText(currentLabel);
  await expect(currentItem).toHaveAttribute("href", currentHref);

  if (currentHref === urlBeforeDropdownClick) {
    await currentItem.click();
    await expect(commits).toHaveClass("btn-group auto mb10");
    expect(page.url()).toBe(urlBeforeDropdownClick);
    expect(
      await page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    ).toBe(marker);
    await toggle.click();
    await expect(commits).toHaveClass("btn-group auto mb10 open");
  }

  await toggle.click();
  await expect(commits).toHaveClass("btn-group auto mb10");
  expect(page.url()).toBe(urlBeforeDropdownClick);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe(marker);
}

async function mockPullRequestChanges(
  page: Page,
  options: {
    cardThreads?: unknown[];
    changesErrorStatus?: 403 | 404;
    commits?: unknown[];
    expectedCommitId?: string;
    files?: unknown[];
    inlineThreads?: unknown[];
    nonRangedThreads?: unknown[];
    project?: Record<string, unknown>;
    pullRequestCommits?: unknown[];
    threads?: unknown[];
  } = {},
) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "review-csrf" },
      body: JSON.stringify({}),
    });
  });
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: null,
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
        ...options.project,
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("commitId") ?? "").toBe(options.expectedCommitId ?? "");
      if (options.changesErrorStatus) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ error: { status: options.changesErrorStatus } }),
          status: options.changesErrorStatus,
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          cardThreads: options.cardThreads ?? [],
          commits: options.commits ?? [],
          files: options.files ?? [],
          inlineThreads: options.inlineThreads ?? [],
          nonRangedThreads: options.nonRangedThreads ?? [],
          pullRequest: {
            ...pullRequestDetail(),
            commits: options.pullRequestCommits ?? options.commits ?? [],
          },
          threads: options.threads ?? [],
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
      avatarUrl: defaultAvatarUrl,
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
      avatarUrl: defaultAvatarUrl,
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

async function pullRequestChangesShellMetrics(page: Page) {
  return page.locator(".codediff-wrap").evaluate((codediff) => {
    const boardBody = document.querySelector<HTMLElement>(".board-body.mb20");
    const codeWrap = document.querySelector<HTMLElement>(".code-browse-wrap");
    const diffs = codediff.querySelector<HTMLElement>("#changes.diffs-wrap");
    const diffBody = codediff.querySelector<HTMLElement>(".diff-body");
    const state = codediff.querySelector<HTMLElement>(".diff-body > .alert");
    const review = codediff.querySelector<HTMLElement>(".review-wrap");
    const showReviewButton = codediff.querySelectorAll(".btn-show-reviewcards");
    const codediffStyle = getComputedStyle(codediff);
    const diffsStyle = getComputedStyle(diffs as HTMLElement);
    return {
      boardBodyMarginBottom: getComputedStyle(boardBody as HTMLElement).marginBottom,
      // F6 copy-fix: legacy classes all retained (viewChanges.scala.html:46) but the raw
      // className carries a generated Style token — strip it before comparing.
      codediffClassName: codediff.className
        .split(/\s+/u)
        .filter((token) => !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
      codediffMarginTop: codediffStyle.marginTop,
      codediffPosition: codediffStyle.position,
      diffsDisplay: diffsStyle.display,
      diffsMarginRight: diffsStyle.marginRight,
      diffsPosition: diffsStyle.position,
      diffsWidthMatchesCodeWrap:
        Math.round((diffs as HTMLElement).getBoundingClientRect().width) ===
        Math.round((codeWrap as HTMLElement).getBoundingClientRect().width),
      noReviewRail: review === null,
      showReviewButtonCount: showReviewButton.length,
      stateInsideDiffBody: state?.parentElement === diffBody,
    };
  });
}

async function pullRequestChangesNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    const input = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-input"]');
    const projectHeader = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !form || !scope || !searchBox || !input || !projectHeader || !menu) {
      return null;
    }
    return {
      form: rect(form),
      input: rect(input),
      menu: rect(menu),
      navbar: rect(navbar),
      projectHeader: rect(projectHeader),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function pullRequestNormalDiffMetrics(page: Page) {
  return page.evaluate(() => {
    const file = document.querySelector<HTMLElement>("#src-main-rs.diff-partial-outer");
    const meta = file?.querySelector<HTMLElement>(".diff-partial-meta");
    const code = file?.querySelector<HTMLElement>(".diff-partial-code");
    const rows = file?.querySelectorAll<HTMLElement>("table.diff-container.show-comments tr");
    const removeCells = rows?.[2]?.querySelectorAll<HTMLElement>("td");
    if (
      !file ||
      !meta ||
      !code ||
      !rows ||
      rows.length < 4 ||
      !removeCells ||
      removeCells.length < 3
    ) {
      return null;
    }
    const metaBox = meta.getBoundingClientRect();
    const codeBox = code.getBoundingClientRect();
    const rangeBox = rows[0].getBoundingClientRect();
    const contextBox = rows[1].getBoundingClientRect();
    const removeBox = rows[2].getBoundingClientRect();
    const addBox = rows[3].getBoundingClientRect();
    const oldColumn = removeCells[0].getBoundingClientRect();
    const newColumn = removeCells[1].getBoundingClientRect();
    const codeColumn = removeCells[2].getBoundingClientRect();
    return {
      addTop: addBox.top,
      codeColumnLeft: codeColumn.left,
      codeTop: codeBox.top,
      contextTop: contextBox.top,
      metaBottom: metaBox.bottom,
      newColumnLeft: newColumn.left,
      newColumnRight: newColumn.right,
      oldColumnRight: oldColumn.right,
      rangeTop: rangeBox.top,
      removeTop: removeBox.top,
    };
  });
}

async function pullRequestReviewCardMetrics(page: Page) {
  return page.locator(".review-wrap").evaluate((review) => {
    const container = review.querySelector<HTMLElement>(".review-container");
    const reviewList = review.querySelector<HTMLElement>(".review-list");
    const openTab = review.querySelector<HTMLElement>(".nav-tabs li:first-child");
    const closedTab = review.querySelector<HTMLElement>(".nav-tabs li:nth-child(2)");
    const card = review.querySelector<HTMLElement>(".review-card.open");
    const content = card?.querySelector<HTMLElement>(".content");
    const info = card?.querySelector<HTMLElement>(".info");
    const date = card?.querySelector<HTMLElement>(".date");
    const hiddenOutdated = card?.querySelector<HTMLElement>(".outdated-label");
    const reviewStyle = getComputedStyle(review);
    const containerStyle = getComputedStyle(container as HTMLElement);
    const reviewListStyle = getComputedStyle(reviewList as HTMLElement);
    const cardStyle = getComputedStyle(card as HTMLElement);
    const contentStyle = getComputedStyle(content as HTMLElement);
    const infoStyle = getComputedStyle(info as HTMLElement);
    const openRect = (openTab as HTMLElement).getBoundingClientRect();
    const closedRect = (closedTab as HTMLElement).getBoundingClientRect();
    return {
      cardBorder: cardStyle.border,
      cardBoxShadow: cardStyle.boxShadow,
      cardDisplay: cardStyle.display,
      cardMarginBottom: cardStyle.marginBottom,
      cardPadding: cardStyle.padding,
      cardRadius: cardStyle.borderRadius,
      closedTabAfterOpenTab: openRect.left < closedRect.left,
      contentMaxHeight: contentStyle.maxHeight,
      contentOverflow: contentStyle.overflow,
      contentTextAlign: contentStyle.textAlign,
      contentWordBreak: contentStyle.wordBreak,
      dateColor: getComputedStyle(date as HTMLElement).color,
      hiddenOutdatedDisplay: getComputedStyle(hiddenOutdated as HTMLElement).display,
      infoMarginTop: infoStyle.marginTop,
      infoTextAlign: infoStyle.textAlign,
      openCardHref: card?.getAttribute("href"),
      reviewContainerWidth: containerStyle.width,
      reviewDisplay: reviewStyle.display,
      reviewListOverflow: reviewListStyle.overflow,
      reviewPosition: reviewStyle.position,
      reviewRight: reviewStyle.right,
      reviewTop: reviewStyle.top,
      reviewWidth: reviewStyle.width,
    };
  });
}
