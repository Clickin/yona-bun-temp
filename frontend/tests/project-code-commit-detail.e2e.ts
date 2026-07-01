import { expect, test, type Page } from "@playwright/test";

const EXPECTED_COMMIT_DETAIL_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div id="code-browse-wrap" class="code-browse-wrap"><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div class="codediff-wrap"><button type="button" class="ybtn ybtn-default btn-show-reviewcards"><i class="yobicon-restore"></i></button><div class="diffs-wrap"><div class="commitInfo"><div class="commitAuthor"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Dev Author</strong><span class="ago" title="Jul 1, 2026">Jul 1, 2026</span></div><div class="commitMsg-wrap"><span class="commitMsg short">Initial commit</span><pre class="commitMsg desc">Add README</pre></div><div class="commitId-wrap"><strong class="commitId">@abcdef1234567890</strong></div></div><div class="diff-body"><div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div><div class="board-comment-wrap"><div class="non-ranged-threads-wrap"></div><form id="comment-form" action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div><div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="write-comment-wrap"><div class="pull-right"><button type="button" class="ybtn ybtn-default ybtn-small" data-toggle="close">×</button></div><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-review" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-review" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-review" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" markdown="true" id="editor-contents-review"></textarea></div></div><div id="preview-review" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div><div class="review-wrap span-hard-wrap"><div class="review-container"><button type="button" class="ybtn ybtn-default btn-hide-reviewcards"><i class="yobicon-maximize"></i></button><ul class="nav nav-tabs" style="margin-bottom:10px"><li class="active"><a href="#reviewcards-open" data-toggle="tab">Open 0</a></li><li><a href="#reviewcards-closed" data-toggle="tab">Closed 0</a></li></ul><div class="tab-content review-list"><div id="reviewcards-open" class="tab-pane active"></div><div id="reviewcards-closed" class="tab-pane"></div></div></div></div></div></div><button id="watch-button" type="button" class="pull-left ybtn " data-toggle="button">Watch</button><a href="__BASE_PATH__/admin/sample/commits/main" class="ybtn pull-right">List</a></div></div>
`;

const EXPECTED_COMMENT_DELETE_MODAL = `
<div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div>
`;

const EXPECTED_FILE_DIFF = `<div id="src-main-rs" class="diff-partial-outer"><div class="diff-partial-inner"><div class="diff-partial-meta"><div class="diff-partial-commit"><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/1234567890abcdef/src/main.rs" title="1234567890abcdef" target="_blank">1234567</a></div><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/abcdef1234567890/src/main.rs" title="abcdef1234567890" target="_blank">abcdef1</a></div></div><div class="diff-partial-file"><span class="filename">src/main.rs</span></div></div><div class="diff-partial-code" data-hashcode="src/main.rs"><div class="patch-header"><div class="path">--- src/main.rs</div><div class="path">+++ src/main.rs</div></div><table class="diff-container show-comments" data-path-a="src/main.rs" data-path-b="src/main.rs" data-commit-a="1234567890abcdef" data-commit-b="abcdef1234567890" data-file-path="src/main.rs"><tbody><tr class="range"><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="hunk">@@ -1,2 +1,3 @@</td></tr><tr class="context" data-line="1" data-type="context" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="linenum"><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="code"><pre class="diff-partial-codeline"> fn main() {</pre></td></tr><tr class="remove" data-line="2" data-type="remove" data-side="A"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="linenum"><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="code"><pre class="diff-partial-codeline">-    println!("old");</pre></td></tr><tr class="add" data-line="2" data-type="add" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("new");</pre></td></tr><tr class="add" data-line="3" data-type="add" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="3"></div><span class="hidden">3</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("again");</pre></td></tr></tbody></table></div></div></div>`;

const EXPECTED_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-77" data-state="open" class="comment-thread-wrap open" data-toggle="CodeCommentThread" data-range-path="src/main.rs" data-range-startline="2" data-range-endline="2"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-501" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev User"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="#comment-501" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/comments/501" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-77" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-77" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-77" markdown="true"></textarea></div></div><div id="preview-thread-77" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/threads/77/close" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_A_SIDE_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-78" data-state="open" class="comment-thread-wrap open" data-toggle="CodeCommentThread" data-range-path="src/main.rs" data-range-startside="A" data-range-startline="2" data-range-startcolumn="5" data-range-endside="A" data-range-endline="2" data-range-endcolumn="18"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-502" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev User"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="#comment-502" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/comments/502" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Old line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="78"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-78" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-78" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-78" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-78" markdown="true"></textarea></div></div><div id="preview-thread-78" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/threads/78/close" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_NON_RANGED_THREAD = `<div id="thread-88" class="comment-thread-wrap open"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-comments"></i></button></div><ul class="comments"><li id="comment-601" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev User"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="#comment-601" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" data-request-method="delete" data-request-uri="__BASE_PATH__/comments/601"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="88"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-88" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-88" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-88" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-88" markdown="true"></textarea></div></div><div id="preview-thread-88" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/threads/88/close" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div>`;

const SVN_PATCH = `Index: README.md
===================================================================
--- README.md\t(revision 1234567890abcdef)
+++ README.md\t(revision abcdef1234567890)
@@ -1 +1 @@
-old
+new`;

const EXPECTED_SVN_COMMIT_BODY = `<div class="page-wrap-outer"><div class="project-page-wrap"><div id="code-browse-wrap" class="code-browse-wrap"><div id="branches" class="btn-group branches pull-right" data-name="branch" data-activate="manual"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">trunk</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="trunk" data-selected="true"><a href="__BASE_PATH__/admin/sample/commits/trunk">trunk</a></li><li data-value="branches/release"><a href="__BASE_PATH__/admin/sample/commits/branches%2Frelease">branches/release</a></li></ul></div><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits">Commit</a></li></ul><p class="commitInfo"><span class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Dev Author</strong><span class="ago" title="Jul 1, 2026">Jul 1, 2026</span><strong class="commitId pull-right">@abcdef1234567890</strong></p><pre class="commitMsg">Initial commit
Add README</pre><div class="diff-wrap"><div id="commit" data-commit-origin="true" class="diff-body hide">${SVN_PATCH}</div></div><div class="board-comment-wrap"><form id="comment-form" action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" id="editor-contents-comment" markdown="true"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div></div><button id="watch-button" type="button" class="ybtn " data-toggle="button">Watch</button><a href="__BASE_PATH__/admin/sample/commits/trunk" class="ybtn pull-right">List</a><div id="minimap" class="minimap-outer"><div class="minimap-wrap"><div class="minimap-curr"></div><div class="minimap-links"></div></div></div></div></div>`;

test("project commit detail matches legacy code/diff.scala.html empty discussion state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#code-browse-wrap .codediff-wrap")).toBeVisible();
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_COMMIT_DETAIL_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await canonicalize(page, "#comment-delete-modal")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_COMMENT_DELETE_MODAL.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project commit detail renders legacy partial_filediff rows", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,2 +1,3 @@
 fn main() {
-    println!("old");
+    println!("new");
+    println!("again");`,
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".diff-partial-outer#src-main-rs")).toBeVisible();
  await expect(page.locator(".diff-container.show-comments tr.add")).toHaveCount(2);
  await expect(page.locator(".diff-container.show-comments tr.remove")).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
    ),
  );
});

test("project commit detail renders legacy inline diff comment row", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,2 +1,3 @@
 fn main() {
-    println!("old");
+    println!("new");
+    println!("again");`,
      },
    ],
    threads: [
      {
        authorId: 2,
        authorLabel: "Dev User",
        authorLoginId: "dev",
        comments: [
          {
            authorId: 2,
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: true,
            contentsHtml: "<p>Line <strong>note</strong></p>",
            contentsMarkdown: "Line **note**",
            createdLabel: "Jul 1, 2026",
            id: 501,
            threadId: 77,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endLine: 2,
        id: 77,
        path: "src/main.rs",
        prevCommitId: "1234567890abcdef",
        startLine: 2,
        state: "open",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(
    page.locator("tr.comments.board-comment-wrap[data-commit-id='abcdef1234567890']"),
  ).toBeVisible();
  await expect(page.locator("#thread-77.comment-thread-wrap.open")).toBeVisible();
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replace('</tr><tr class="add" data-line="3"', `</tr>${EXPECTED_INLINE_THREAD_ROW}<tr class="add" data-line="3"`).replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
    ),
  );
});

test("project commit detail renders legacy A-side inline range hooks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,2 +1,3 @@
 fn main() {
-    println!("old");
+    println!("new");
+    println!("again");`,
      },
    ],
    threads: [
      {
        authorId: 2,
        authorLabel: "Dev User",
        authorLoginId: "dev",
        comments: [
          {
            authorId: 2,
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: true,
            contentsHtml: "<p>Old line <strong>note</strong></p>",
            contentsMarkdown: "Old line **note**",
            createdLabel: "Jul 1, 2026",
            id: 502,
            threadId: 78,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endColumn: 18,
        endLine: 2,
        endSide: "A",
        id: 78,
        path: "src/main.rs",
        prevCommitId: "1234567890abcdef",
        startColumn: 5,
        startLine: 2,
        startSide: "A",
        state: "open",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator("#thread-78[data-range-startside='A']")).toBeVisible();
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replace('</tr><tr class="add" data-line="2"', `</tr>${EXPECTED_A_SIDE_INLINE_THREAD_ROW}<tr class="add" data-line="2"`).replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
    ),
  );
});

test("project commit detail renders legacy non-ranged comment thread", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    threads: [
      {
        authorId: 2,
        authorLabel: "Dev User",
        authorLoginId: "dev",
        comments: [
          {
            authorId: 2,
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: true,
            contentsHtml: "<p>General <strong>note</strong></p>",
            contentsMarkdown: "General **note**",
            createdLabel: "Jul 1, 2026",
            id: 601,
            threadId: 88,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        id: 88,
        path: "",
        prevCommitId: "1234567890abcdef",
        state: "open",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".non-ranged-threads-wrap #thread-88")).toBeVisible();
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".board-comment-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="board-comment-wrap"><div class="non-ranged-threads-wrap">${EXPECTED_NON_RANGED_THREAD.replaceAll("__BASE_PATH__", basePath)}</div><form id="comment-form" action="${basePath}/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div>`,
    ),
  );
});

test("project SVN commit detail matches legacy code/svnDiff.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(
    page,
    detailRequests,
    {
      branches: [{ name: "trunk" }, { name: "branches/release" }],
      files: [{ path: "README.md", patch: SVN_PATCH }],
      selectedBranch: "trunk",
    },
    { vcs: "SVN" },
  );

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=trunk`);
  await expect(page.locator("#branches[data-activate='manual']")).toBeVisible();
  await expect(page.locator("#commit.diff-body.hide[data-commit-origin='true']")).toContainText(
    "Index: README.md",
  );
  expect(detailRequests).toEqual(["branch=trunk"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_SVN_COMMIT_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
});

async function mockProjectCommitDetail(
  page: Page,
  detailRequests: string[],
  detailOverrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
) {
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
        ...projectOverrides,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/commit/abcdef1234567890**", async (route) => {
    const url = new URL(route.request().url());
    detailRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [],
        commit: {
          authorDate: "Jul 1, 2026",
          authorEmail: "dev@example.com",
          authorName: "Dev Author",
          commentCount: 0,
          commitId: "abcdef1234567890",
          commitShortId: "abcdef1",
          message: "Initial commit\nAdd README",
          shortMessage: "Initial commit",
        },
        files: [],
        isWatching: false,
        noHead: false,
        ownerName: "admin",
        parentCommit: { commitId: "1234567890abcdef", commitShortId: "1234567" },
        path: "",
        permissions: {
          canComment: true,
          canUpdateThreadState: true,
        },
        projectName: "sample",
        selectedBranch: "main",
        threads: [],
        ...detailOverrides,
      }),
    });
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
