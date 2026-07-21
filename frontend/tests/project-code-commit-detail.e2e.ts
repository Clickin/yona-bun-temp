import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/\sdata-toggle="markdown-help"/g, "")
  .replace(/\sdata-target="markdown[^"]+"/g, "")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, '<div class="markdown-help">')
  .replace(/<\/div>\s*$/u, "</div>");
const COMMIT_DETAIL_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/commit/$commitId.tsx", import.meta.url),
  "utf8",
);
const COMMIT_DETAIL_STYLEX_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts", import.meta.url),
  "utf8",
);
const LEGACY_COMMENT_THREAD_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/partial_comment_thread.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_THREAD_FORM_SOURCE = readFileSync(
  new URL(
    "../../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_REVIEW_FORM_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/reviewForm.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_VARIABLES_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
  "utf8",
);
const LEGACY_RESPONSIVE_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const LEGACY_COMMENT_THREAD_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const APP_CSS_SOURCE = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const LEGACY_CODE_DIFF_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/code/diff.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_FILE_DIFF_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/partial_filediff.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_REVIEWLIST_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/git/partial_reviewlist.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_COMMIT_MSG_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/commitMsg.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_MESSAGES_SOURCE = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

function withLegacyMarkdownHelp(html: string) {
  return html.replaceAll(
    '<div class="tab-content" style="position:relative;overflow:visible"><div id="edit-',
    `<div class="tab-content" style="position:relative;overflow:visible">${LEGACY_MARKDOWN_HELP}<div id="edit-`,
  );
}

test("project commit detail retires the unreachable commit-message wrapper fallback arms", () => {
  expect(LEGACY_CODE_DIFF_SOURCE).toContain('class="commitMsg-wrap"');
  expect(LEGACY_COMMIT_MSG_SOURCE).toContain('class="commitMsg short"');
  expect(LEGACY_COMMIT_MSG_SOURCE).toContain('class="commitMsg desc');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("commitMsg-wrap");
  expect(APP_CSS_SOURCE).not.toContain(
    ".code-browse-wrap .commitInfo .commitMsg-wrap .commitMsg.short {",
  );
  expect(APP_CSS_SOURCE).not.toContain(
    ".code-browse-wrap .commitInfo .commitMsg-wrap .commitMsg.desc {",
  );
  expect(APP_CSS_SOURCE).toContain(".code-browse-wrap .commitInfo {");
  expect(APP_CSS_SOURCE).toContain(".commitMsg");
});

function withReactOwnedTabButtons(html: string) {
  return html
    .replaceAll(
      /<a href="#edit-[^"]+" data-toggle="tab" data-mode="edit">Edit<\/a>/g,
      '<button type="button">Edit</button>',
    )
    .replaceAll(
      /<a href="#preview-[^"]+" data-toggle="tab" data-mode="preview">Preview<\/a>/g,
      '<button type="button">Preview</button>',
    )
    .replaceAll(/<button type="button" data-toggle="tab">/g, '<button type="button">')
    .replaceAll(
      /<button type="button" data-toggle="tab" data-mode="([^"]+)">/g,
      '<button type="button">',
    );
}

const EXPECTED_COMMIT_DETAIL_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div id="code-browse-wrap" class="code-browse-wrap"><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div class="codediff-wrap"><button type="button" class="ybtn ybtn-default btn-show-reviewcards"><i class="yobicon-restore"></i></button><div class="diffs-wrap"><div class="commitInfo"><div class="commitAuthor"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Dev Author</strong><span class="ago" title="Jul 1, 2026">Jul 1, 2026</span></div><div class="commitMsg-wrap"><span class="commitMsg short">Initial commit</span><pre class="commitMsg desc">Add README</pre></div><div class="commitId-wrap"><strong class="commitId">@abcdef1234567890</strong></div></div><div class="diff-body"><div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div><div class="board-comment-wrap"><div class="non-ranged-threads-wrap"></div><form id="comment-form" action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div><div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="write-comment-wrap"><div class="pull-right"><button type="button" class="ybtn ybtn-default ybtn-small">×</button></div><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-review" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-review" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-review" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" markdown="true" id="editor-contents-review"></textarea></div></div><div id="preview-review" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div><div class="review-wrap span-hard-wrap"><div class="review-container"><button type="button" class="ybtn ybtn-default btn-hide-reviewcards"><i class="yobicon-maximize"></i></button><ul class="nav nav-tabs" style="margin-bottom:10px"><li class="active"><button type="button" data-toggle="tab">Open 0</button></li><li><button type="button" data-toggle="tab">Closed 0</button></li></ul><div class="tab-content review-list"><div id="reviewcards-open" class="tab-pane active"></div><div id="reviewcards-closed" class="tab-pane"></div></div></div></div></div></div><button id="watch-button" type="button" class="pull-left ybtn ">Watch</button><a href="__BASE_PATH__/admin/sample/commits/main" class="ybtn pull-right">List</a></div></div>
`;

const EXPECTED_COMMENT_DELETE_MODAL = `
<div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div></div>
`;

const EXPECTED_FILE_DIFF = `<div id="src-main-rs" class="diff-partial-outer"><div class="diff-partial-inner"><div class="diff-partial-meta"><div class="diff-partial-commit"><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/1234567890abcdef/src/main.rs" title="1234567890abcdef" target="_blank">1234567</a></div><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/abcdef1234567890/src/main.rs" title="abcdef1234567890" target="_blank">abcdef1</a></div></div><div class="diff-partial-file"><span class="filename">src/main.rs</span></div></div><div class="diff-partial-code" data-hashcode="src/main.rs"><div class="patch-header"><div class="path">--- src/main.rs</div><div class="path">+++ src/main.rs</div></div><table class="diff-container show-comments" data-path-a="src/main.rs" data-path-b="src/main.rs" data-commit-a="1234567890abcdef" data-commit-b="abcdef1234567890" data-file-path="src/main.rs"><tbody><tr class="range"><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="hunk">@@ -1,2 +1,3 @@</td></tr><tr class="context" data-line="1" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="linenum"><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="code"><pre class="diff-partial-codeline"> fn main() {</pre></td></tr><tr class="remove" data-line="2" data-side="A"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="linenum"><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="code"><pre class="diff-partial-codeline">-    println!("old");</pre></td></tr><tr class="add" data-line="2" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("new");</pre></td></tr><tr class="add" data-line="3" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="3"></div><span class="hidden">3</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("again");</pre></td></tr></tbody></table></div></div></div>`;

const EXPECTED_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-77" data-state="open" class="comment-thread-wrap open" data-range-path="src/main.rs" data-range-startline="2" data-range-endline="2"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-501" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="/avatars/dev.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-501" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-77" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-77" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-77" markdown="true"></textarea></div></div><div id="preview-thread-77" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_A_SIDE_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-78" data-state="open" class="comment-thread-wrap open" data-range-path="src/main.rs" data-range-startside="A" data-range-startline="2" data-range-startcolumn="5" data-range-endside="A" data-range-endline="2" data-range-endcolumn="18"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-502" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-502" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Old line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="78"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-78" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-78" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-78" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-78" markdown="true"></textarea></div></div><div id="preview-thread-78" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_NON_RANGED_THREAD = `<div id="thread-88" class="comment-thread-wrap open"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-comments"></i></button></div><ul class="comments"><li id="comment-601" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="/avatars/dev.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-601" title="Jul 1, 2026">Jul 1, 2026</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="88"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-88" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-88" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-88" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-88" markdown="true"></textarea></div></div><div id="preview-thread-88" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div>`;

const COMMENT_601_ATTACHMENT = {
  id: 701,
  mimeType: "text/plain",
  name: "note.txt",
  size: "42",
};

const SVN_PATCH = `Index: README.md
===================================================================
--- README.md\t(revision 1234567890abcdef)
+++ README.md\t(revision abcdef1234567890)
@@ -1 +1 @@
-old
+new`;

const EXPECTED_SVN_COMMIT_BODY = `<div class="page-wrap-outer"><div class="project-page-wrap"><div id="code-browse-wrap" class="code-browse-wrap"><div id="branches" class="btn-group branches pull-right" data-name="branch"><button class="btn dropdown-toggle large"><span class="d-label">trunk</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="trunk" data-selected="true"><a href="__BASE_PATH__/admin/sample/commits/trunk">trunk</a></li><li data-value="branches/release"><a href="__BASE_PATH__/admin/sample/commits/branches%2Frelease">branches/release</a></li></ul></div><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits">Commit</a></li></ul><p class="commitInfo"><span class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Dev Author</strong><span class="ago" title="Jul 1, 2026">Jul 1, 2026</span><strong class="commitId pull-right">@abcdef1234567890</strong></p><pre class="commitMsg">Initial commit
Add README</pre><div class="diff-wrap"><div id="commit" data-commit-origin="true" class="diff-body hide">${SVN_PATCH}</div></div><div class="board-comment-wrap"><form id="comment-form" action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" id="editor-contents-comment" markdown="true"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div></div><button id="watch-button" type="button" class="ybtn ">Watch</button><a href="__BASE_PATH__/admin/sample/commits/trunk" class="ybtn pull-right">List</a><div id="minimap" class="minimap-outer"><div class="minimap-wrap"><div class="minimap-curr"></div><div class="minimap-links"></div></div></div></div></div>`;

const THREAD_REPLY_AUTHOR_INFO = `<div class="author-info-wrap pull-left hide-in-mobile"><div class="author-info"><a href="__BASE_PATH__/admin" class="avatar-wrap medium" title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div></div>`;
const REVIEW_FORM_AUTHOR_INFO = `<div class="author-info-wrap pull-left hide-in-mobile"><div class="author-info"><a href="__BASE_PATH__/admin" class="avatar-wrap medium" title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div></div>`;

function withReviewAuthorInfo(html: string) {
  return html.replace(
    `<div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box">`,
    `<div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data">${REVIEW_FORM_AUTHOR_INFO}<div class="write-comment-box">`,
  );
}

function withThreadReplyAuthorInfo(html: string, threadId: number) {
  return html.replace(
    `<input type="hidden" name="thread.id" value="${threadId}"><div class="write-comment-box">`,
    `<input type="hidden" name="thread.id" value="${threadId}">${THREAD_REPLY_AUTHOR_INFO}<div class="write-comment-box">`,
  );
}

function withThreadTextareaStyle(html: string, threadId: number) {
  return html.replace(
    `<textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-${threadId}" markdown="true">`,
    `<textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-${threadId}" style="height:100px" markdown="true">`,
  );
}

function withCodeReviewUploadForm(html: string) {
  return html.replace(
    `<div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">`,
    `${uploadForm("COMMIT_COMMENT")}<div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">`,
  );
}

function withThreadUploadForm(html: string) {
  return html.replace(
    `<div class="right-txt"><button type="button"`,
    `${uploadForm("COMMIT_COMMENT")}<div class="right-txt"><button type="button"`,
  );
}

function withCommentUploadForm(html: string) {
  return html.replace(
    `<div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn">`,
    `${uploadForm("COMMIT_COMMENT")}<div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn">`,
  );
}

function uploadForm(resourceType: string) {
  return `<div class="upload-wrap content-footer" data-resource-type="${resourceType}"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`;
}

async function expectEditorTabState(
  editor: Locator,
  wrapId: string,
  activeMode: "edit" | "preview",
) {
  if (activeMode === "edit") {
    await expect(editor.locator("li").nth(0)).toHaveClass(/active/);
    await expect(editor.locator("li").nth(1)).not.toHaveClass(/active/);
    await expect(editor.locator(`#edit-${wrapId}`)).toHaveClass(/active/);
    await expect(editor.locator(`#preview-${wrapId}`)).not.toHaveClass(/active/);
    return;
  }
  await expect(editor.locator("li").nth(0)).not.toHaveClass(/active/);
  await expect(editor.locator("li").nth(1)).toHaveClass(/active/);
  await expect(editor.locator(`#edit-${wrapId}`)).not.toHaveClass(/active/);
  await expect(editor.locator(`#preview-${wrapId}`)).toHaveClass(/active/);
}

function editorTabButton(editor: Locator, mode: "edit" | "preview") {
  const index = mode === "edit" ? 0 : 1;
  const name = mode === "edit" ? "Edit" : "Preview";
  return editor.locator("ul.nav-tabs > li").nth(index).locator("button").filter({ hasText: name });
}

function withCommentUpdateForm(
  html: string,
  basePath: string,
  commentId: number,
  markdown: string,
  attachments: Array<typeof COMMENT_601_ATTACHMENT> = [],
) {
  const id = String(commentId);
  const editButton = `<span class="edit pull-right"><button type="button" class="btn-transparent pull-right" data-comment-id="${id}" title="Edit comment"><i class="yobicon-edit-2"></i></button></span>`;
  const bodyStart = `<div class="comment-body markdown-wrap" data-via-email="false">`;
  const attachmentsJson = JSON.stringify(attachments);
  return html
    .replace(
      `<span class="edit pull-right"><button class="btn-transparent pull-right close"`,
      `${editButton}<span class="edit pull-right"><button class="btn-transparent pull-right close"`,
    )
    .replace(
      bodyStart,
      `${commentUpdateForm(basePath, id, markdown, attachments)}<div id="comment-body-${id}">${bodyStart}`,
    )
    .replace(
      `<div class="attachments" data-attachments="[]"></div></div></li>`,
      `<div class="attachments" data-attachments='${attachmentsJson}'></div></div></div></li>`,
    );
}

function commentUpdateForm(
  basePath: string,
  commentId: string,
  markdown: string,
  attachments: Array<typeof COMMENT_601_ATTACHMENT>,
) {
  const attachmentMarkers = attachments
    .map(
      (file) =>
        `<div class="attached-file attached-file-marker" data-name="${file.name}" data-mime="${file.mimeType}"><i class="mimetype"></i><strong class="name">${file.name}</strong><span class="size">${file.size}</span><button type="button" class="btn-transparent btn-delete">×</button></div>`,
    )
    .join("");

  return `<div id="comment-editform-${commentId}" class="comment-update-form"><form action="${basePath}/comments/${commentId}" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="${commentId}"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-${commentId}" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-${commentId}" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-${commentId}" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" id="editor-contents-${commentId}" markdown="true">${markdown}</textarea></div></div><div id="preview-${commentId}" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-${commentId}" class="file-upload__label ybtn">File upload</label><input id="upload-${commentId}" class="file-upload__input" type="file" name="filePath" multiple></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="${commentId}">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-${commentId}"></div><div class="attachment-files">${attachmentMarkers}</div><div id="upload-${commentId}" data-resourcetype="NONISSUE_COMMENT" data-resourceid="${commentId}"></div></div></form></div>`;
}

test("project commit detail route source has no generic LegacyInternalLink adapter", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("LegacyInternalLink");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("ComponentType");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("AnchorHTMLAttributes");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("CommitHashLink");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("as never");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("search={{} as never}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("hash={`comment-${comment.id}`}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("hash={`thread-${thread.id}`}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("attachmentFileHtml");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("data-href={href}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("escapeHtml");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(
    /function AttachmentFileMarker[\s\S]{0,700}<button[^>]*className="btn-transparent btn-delete"[^>]*data-id=/u,
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(
    /className="attachment-files"[\s\S]{0,160}dangerouslySetInnerHTML/u,
  );
});

test("project commit detail uses the parent nested project shell when its path is exact", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("use(ProjectNestedShellContext)");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("if (nestedProjectShell) return body;");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("ProjectCommitDetailStandaloneShell");
});

test("project commit detail anonymous author fallback uses legacy message key", async () => {
  expect(LEGACY_MESSAGES_SOURCE).toMatch(/^user\.role\.anonymous\s*=\s*Anonymous$/m);
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('t("user.role.anonymous")');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('|| "Anonymous"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("<strong>Anonymous</strong>");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('commit?.authorEmail || "Anonymous"');
});

test("project commit detail watch buttons are route-owned React controls", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('id="watch-button"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    "onClick={() => watchMutation.mutate(!detail.isWatching)}",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("onClick={toggleWatch}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'className={`pull-left ybtn ${detail.isWatching ? "active ybtn-watching" : ""}`}',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'className={`ybtn ${detail.isWatching ? "active" : ""}`}',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(
    /id="watch-button"[\s\S]{0,220}data-toggle="button"/u,
  );
});

test("project commit detail keeps the frozen legacy commit-id flow geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCommitDetail(page, [], {
    commit: {
      authorAvatarUrl: "",
      authorDate: "Jul 1, 2026",
      authorEmail: "dev@example.com",
      authorLoginId: "",
      authorName: "Dev Author",
      commentCount: 0,
      commitId: "abcdef1234567890",
      commitShortId: "abcdef1",
      message: "Initial commit",
      shortMessage: "Initial commit",
    },
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890`);
  await expect(page.locator(".upload-wrap.content-footer").first()).toBeVisible();
  expect(await commitIdFlowGeometry(page)).toEqual({
    display: "block",
    fontSize: "13px",
    margin: "0px",
    uploadFollowsEditor: true,
    wrapHeight: 41,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await commitIdFlowGeometry(page)).toMatchObject({
    display: "block",
    fontSize: "13px",
    margin: "0px",
    uploadFollowsEditor: true,
  });
});

test("project commit detail markdown help uses shared React helper", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("LegacyMarkdownHelp");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("help/markdown.scala.html?raw");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("legacyMarkdownHelpTemplate");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(
    /markdown-help[\s\S]{0,160}dangerouslySetInnerHTML/u,
  );
});

test("project commit detail comment edit toggle is route-owned React state", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setEditingCommentIds");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("data-comment-id={comment.id}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="comment-edit"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="close"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("event.stopPropagation();");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("document.");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("querySelector");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("classList");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("style.display");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("setAttribute");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("removeAttribute");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("innerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("outerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.commentUpdateFormHidden");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.commentUpdateFormVisible");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewFormHidden");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewFormVisible");
});

test("project commit detail diff lines drop legacy data-type while preserving line side hooks", async ({
  page,
}) => {
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

  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("data-type={line.type}");

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".diff-container.show-comments tr[data-type]")).toHaveCount(0);
  await expect(
    page.locator(".diff-container.show-comments tr.context[data-line='1']"),
  ).toHaveAttribute("data-side", "B");
  await expect(
    page.locator(".diff-container.show-comments tr.remove[data-line='2']"),
  ).toHaveAttribute("data-side", "A");
  await expect(page.locator(".diff-container.show-comments tr.add[data-line='2']")).toHaveAttribute(
    "data-side",
    "B",
  );
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail React tab controls do not carry Bootstrap tab triggers", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="tab"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-mode="edit"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-mode="preview"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setReviewCardTab");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setActiveTab");
});

test("project code diff retains review tabs without the removed markdown-editor bridge", () => {
  expect(APP_CSS_SOURCE).not.toContain(
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li > button',
  );
  expect(APP_CSS_SOURCE).not.toContain(
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li.active > button',
  );
  expect(APP_CSS_SOURCE).toContain(".codediff-wrap .review-container .nav-tabs > li > button");
  expect(APP_CSS_SOURCE).toContain(
    ".codediff-wrap .review-container .nav-tabs > li.active > button",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
});

test("project commit detail native titles are preserved without Bootstrap tooltip markers", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-placement="top"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toMatch(
    /className="avatar-wrap"[\s\S]{0,120}title=\{comment\.authorLabel\}/u,
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toMatch(
    /<span className="comment_author pull-left">[\s\S]{0,260}title=\{comment\.authorLabel\}[\s\S]{0,120}<strong>\{`\$\{comment\.authorLoginId\} `\}<\/strong>/u,
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toMatch(
    /className="avatar-wrap medium"[\s\S]{0,120}title=\{currentUser\.userLabel\}/u,
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("data-original-title={currentUser.userLabel}");
});

test("project commit detail browser title follows legacy project layout", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("function ProjectCommitDetailTitle");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("<ProjectCommitDetailTitle");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    '<title>{`${t("code.commits")} @${commitId} - ${ownerName}/${projectName}`}</title>',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("document.title");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(/useEffect[\s\S]{0,240}title/u);
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(/title[\s\S]{0,120}= /u);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  await expect(page).toHaveTitle("Commit @abcdef1234567890 - admin/sample");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail folds original email message in route-owned comments", async ({
  page,
}) => {
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
            authorAvatarUrl: "/avatars/dev.png",
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: true,
            contentsHtml: "<p>Server HTML should not render</p>",
            contentsMarkdown: [
              "Visible reply from reviewer",
              "",
              "--- Original Message ---",
              "Quoted tail from mail client",
            ].join("\n"),
            createdLabel: "Jul 1, 2026",
            id: 603,
            threadId: 89,
            viaEmail: true,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endLine: null,
        id: 89,
        path: "",
        prevCommitId: "1234567890abcdef",
        startLine: null,
        state: "open",
      },
    ],
  });

  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("OriginalMessageMarkdown");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("data-yobi-original-message-processed={");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("document.");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("querySelector");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("classList");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("style.display");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("innerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("outerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  const commentBody = page.locator("#comment-603 .comment-body.markdown-wrap");
  await expect(commentBody).toHaveAttribute("data-via-email", "true");
  await expect(commentBody).toHaveAttribute("data-yobi-original-message-processed", "true");
  await expect(commentBody.getByText("Visible reply from reviewer")).toBeVisible();
  await expect(commentBody.getByText("Quoted tail from mail client")).toBeHidden();

  await page.waitForTimeout(100);
  const originalMessageToggle = page.getByRole("button", { name: "..." });
  await expect(originalMessageToggle).toHaveCount(1);
  await originalMessageToggle.click();
  await expect(commentBody.getByText("Quoted tail from mail client")).toBeVisible();
  await originalMessageToggle.click();
  await expect(commentBody.getByText("Quoted tail from mail client")).toBeHidden();
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail comment delete modal is route-owned React state", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setCommentDeleteCommentId");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("openCommentDeleteModal(comment.id)");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('id="comment-delete-modal"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'className={isOpen ? "modal hide fade in" : "modal hide fade"}',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('className="modal-backdrop fade in"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('role="presentation"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("onClick={onClose}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("onKeyUp={onClose}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("onClick={onConfirm}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('className="close" data-dismiss="modal"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('className="ybtn" data-dismiss="modal"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("data-request-method");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("data-request-uri");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('"CodeCommentThread"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('"comment-delete"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("document.");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("querySelector");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("classList");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("style.display");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("setAttribute");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("removeAttribute");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("innerHTML");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
});

test("project commit detail route mounts legacy project-scoped search shell", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    "function projectIsProtected(project: ProjectContainer)",
  );
});

test("project SVN commit detail branch dropdown is route-owned React state", async () => {
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("branchDropdownOpen");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setBranchDropdownOpen((isOpen) => !isOpen)");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('data-toggle="dropdown"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toMatch(
    /id="branches"[\s\S]{0,240}data-name="branch"[\s\S]{0,80}data-activate="manual"/,
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("event.preventDefault();");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("event.stopPropagation();");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("document.addEventListener");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('querySelector("#branches');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("bootstrap.Dropdown");
});

test("project commit detail internal nav links keep legacy hrefs with SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code`,
  );
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits`,
  );
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/branches`,
  );
  await expect(page.locator(".project-page-wrap > .ybtn.pull-right")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main`,
  );
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-route-link";
  });

  await page.locator("#code-browse-wrap > .nav-tabs a").nth(2).click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/branches`);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-route-link");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail restores legacy project GNB search scope", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-stylex-owner="global-gnb-search-box"]');
  await expect(searchBox).not.toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).not.toHaveClass(/\bselect\b/);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page
        .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            hasDataAction: element.hasAttribute("data-action"),
            text: element.textContent?.trim() ?? "",
          })),
        ),
    )
    .toEqual([
      { hasDataAction: false, text: "This Project" },
      { hasDataAction: false, text: "All Projects" },
    ]);

  const commitUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(commitUrl);

  expect(await readCommitDetailNavbarMetrics(page)).toEqual({
    formBottomWithinNavbar: true,
    formRightWithinNavbar: true,
    formTopWithinNavbar: true,
    headerClassName: "gnb-outer project-header",
    searchBottomWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
    scopeBottomWithinNavbar: true,
    scopeTopWithinNavbar: true,
  });
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail includes group search scope when project container has org data", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {}, { organizationName: "weblabs" });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page
        .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            hasDataAction: element.hasAttribute("data-action"),
            text: element.textContent?.trim() ?? "",
          })),
        ),
    )
    .toEqual([
      { hasDataAction: false, text: "This Project" },
      { hasDataAction: false, text: "This Group" },
      { hasDataAction: false, text: "All Projects" },
    ]);

  const commitUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page).toHaveURL(commitUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(commitUrl);
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail matches legacy code/diff.scala.html empty discussion state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#code-browse-wrap .codediff-wrap")).toBeVisible();
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code`,
  );
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits`,
  );
  await expect(page.locator("#code-browse-wrap > .nav-tabs a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/branches`,
  );
  await expect(page.locator(".project-page-wrap > .ybtn.pull-right")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main`,
  );
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(
    page.locator("#review-form .upload-wrap.content-footer[data-resource-type='COMMIT_COMMENT']"),
  ).toHaveCount(1);
  await expect(
    page.locator("#comment-form .upload-wrap.content-footer[data-resource-type='COMMIT_COMMENT']"),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '#comment-form [data-toggle="markdown-editor"], #review-form [data-toggle="markdown-editor"]',
    ),
  ).toHaveCount(0);
  const editorTabs = page.locator(
    "#comment-form .mt10:has(#editor-contents-comment), #review-form .mt10:has(#editor-contents-review)",
  );
  await expect(editorTabs.locator('a[href^="#edit-"], a[href^="#preview-"]')).toHaveCount(0);
  await expect(editorTabs.locator('button[type="button"][data-mode]')).toHaveCount(0);
  await expect(editorTabs.locator("> ul.nav-tabs > li:nth-child(1) button")).toHaveText([
    "Edit",
    "Edit",
  ]);
  await expect(editorTabs.locator("> ul.nav-tabs > li:nth-child(2) button")).toHaveText([
    "Preview",
    "Preview",
  ]);
  await expect(editorTabs.locator('[data-toggle="tab"]')).toHaveCount(0);
  const commentEditor = page.locator("#comment-form .mt10:has(#editor-contents-comment)");
  const reviewEditor = page.locator("#review-form .mt10:has(#editor-contents-review)");
  await expect(commentEditor.locator(".tab-content > .markdown-help")).toHaveCount(1);
  await expect(reviewEditor.locator(".tab-content > .markdown-help")).toHaveCount(1);
  await expect(commentEditor.locator(".markdown-help .markdown-help-nav .label")).toHaveText(
    "Markdown help",
  );
  await expect(
    commentEditor.locator(".markdown-help .markdown-help-item.markdownHeaders"),
  ).toHaveCount(1);
  await expect(editorTabButton(commentEditor, "edit")).toHaveText("Edit");
  await expect(editorTabButton(commentEditor, "preview")).toHaveText("Preview");
  await expect(editorTabButton(reviewEditor, "edit")).toHaveText("Edit");
  await expect(editorTabButton(reviewEditor, "preview")).toHaveText("Preview");
  await expectEditorTabState(commentEditor, "comment", "edit");
  await expectEditorTabState(reviewEditor, "review", "edit");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-editor-tabs";
  });
  const urlBeforeEditorTabClick = page.url();
  await editorTabButton(commentEditor, "preview").click();
  await expectEditorTabState(commentEditor, "comment", "preview");
  await expectEditorTabState(reviewEditor, "review", "edit");
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-editor-tabs");
  await editorTabButton(commentEditor, "edit").click();
  await expectEditorTabState(commentEditor, "comment", "edit");
  await expectEditorTabState(reviewEditor, "review", "edit");
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-review-tabs";
  });
  const reviewTabs = page.locator(".review-container .nav-tabs");
  const urlBeforeReviewTabClick = page.url();
  await expect(reviewTabs.locator('a[href^="#"]')).toHaveCount(0);
  await expect(reviewTabs.locator('button[type="button"]')).toHaveCount(2);
  await expect(reviewTabs.locator('[data-toggle="tab"]')).toHaveCount(0);
  await expect(reviewTabs.locator("button").nth(0)).toHaveText("Open 0");
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
  ).toBe("commit-review-tabs");
  await reviewTabs.locator("button").nth(0).click();
  await expect(reviewTabs.locator("li").nth(0)).toHaveClass(/active/);
  await expect(reviewTabs.locator("li").nth(1)).not.toHaveClass(/active/);
  await expect(page.locator("#reviewcards-open")).toHaveClass(/active/);
  await expect(page.locator("#reviewcards-closed")).not.toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeReviewTabClick);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await readCommitDiffShellMetrics(page)).toEqual({
    btnShowDisplay: "none",
    codediffPosition: "relative",
    commitAuthorFloat: "right",
    commitAuthorMarginTop: "5px",
    commitIdWrapDisplay: "block",
    commitIdWrapFontSize: "13px",
    commitIdWrapMargin: "0px",
    commitIdWrapPadding: "10px 5px",
    commitInfoBackground: "rgba(0, 0, 0, 0)",
    commitInfoBorderTopWidth: "0px",
    commitInfoPadding: "0px",
    commitMsgDescFontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    commitMsgDescMargin: "5px",
    commitMsgShortFontSize: "18px",
    commitMsgShortWhiteSpace: "normal",
    diffsDisplay: "block",
    diffsMarginRight: "282px",
    diffsPosition: "relative",
    reviewContainerWidth: "260px",
    reviewDisplay: "block",
    reviewMinHeight: "30px",
    reviewPosition: "absolute",
    reviewRight: "0px",
    reviewTop: "0px",
    reviewWidth: "260px",
  });
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      withReviewAuthorInfo(
        withCommentUploadForm(withCodeReviewUploadForm(EXPECTED_COMMIT_DETAIL_BODY)),
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await canonicalize(page, "#comment-delete-modal")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_COMMENT_DELETE_MODAL.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project commit detail toggles legacy review-card rail collapse without navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  const codediffWrap = page.locator(".codediff-wrap");
  const reviewWrap = page.locator(".review-wrap");
  const showButton = page.locator(".btn-show-reviewcards");
  const hideButton = page.locator(".btn-hide-reviewcards");
  const initialUrl = page.url();

  await expect(codediffWrap).not.toHaveClass(/diffs-only/);
  await expect(reviewWrap).toBeVisible();
  await expect(showButton).toBeHidden();
  await expect(hideButton).toBeVisible();

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-review-rail";
  });

  await hideButton.click();

  await expect(codediffWrap).toHaveClass(/diffs-only/);
  await expect(reviewWrap).toBeHidden();
  await expect(showButton).toBeVisible();
  await expect(hideButton).toBeHidden();
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-review-rail");
  expect(detailRequests).toEqual(["branch=main"]);

  await showButton.click();

  await expect(codediffWrap).not.toHaveClass(/diffs-only/);
  await expect(reviewWrap).toBeVisible();
  await expect(showButton).toBeHidden();
  await expect(hideButton).toBeVisible();
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-review-rail");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail opens and closes legacy block review form without navigation", async ({
  page,
}) => {
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

  const reviewForm = page.locator("#review-form");
  const popButton = page.locator(".btnPop .ybtn");
  const closeButton = reviewForm.locator(".pull-right > button.ybtn.ybtn-default.ybtn-small", {
    hasText: "×",
  });
  const initialUrl = page.url();

  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setBlockReviewFormOpen");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setBlockReviewButtonVisible");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("globalThis.getSelection");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("setBlockReviewFormOpen(true)");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("onClose={() => setBlockReviewFormOpen(false)}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewFormHidden");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewFormVisible");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.blockReviewButtonHidden");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.blockReviewButtonVisible");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewFormShell");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewAuthorInfoWrap");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewWriteCommentBox");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('padding: "0px 10px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('paddingRight: "6px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderRadius: "6px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('marginBottom: "10px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('height: "35px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('marginLeft: "46px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    '"@media all and (max-width: 720px)": { marginLeft: "0px" }',
  );
  expect(LEGACY_REVIEW_FORM_SOURCE).toContain('<div id="review-form" class="review-form">');
  expect(LEGACY_REVIEW_FORM_SOURCE).toContain(
    '<div class="author-info-wrap pull-left hide-in-mobile">',
  );
  expect(LEGACY_REVIEW_FORM_SOURCE).toContain('<div class="write-comment-box">');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".review-form {\n    display: none;\n    padding: 0px 10px; padding-right:6px;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".author-info-wrap {\n        padding: 0px; margin-bottom: 10px;\n        display: block; clear: both;\n        height: 35px;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".write-comment-box {\n        padding:0;\n        margin:0;\n        margin-left:46px;",
  );
  expect(LEGACY_VARIABLES_SOURCE).toContain(
    '@base-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";',
  );
  expect(LEGACY_RESPONSIVE_SOURCE).toContain(
    ".review-form .write-comment-box {\n    margin-left: 0 !important;\n  }",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("CodeCommentBox");
  await expect(popButton).toHaveCount(1);
  await expect(popButton).toBeHidden();
  await expect(reviewForm).toBeHidden();
  await expect(reviewForm).toHaveAttribute("data-stylex-owner", "commit-detail-review-form");
  await expect(reviewForm).toHaveCSS("display", "none");
  await expect(reviewForm).toHaveCSS("padding", "0px 6px 0px 10px");
  await expect(reviewForm).toHaveCSS("padding-right", "6px");
  await expect(reviewForm).toHaveCSS(
    "font-family",
    '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  );
  await expect(reviewForm).toHaveCSS("border-radius", "6px");
  const authorInfoWrap = reviewForm.locator(":scope > form > .author-info-wrap");
  const writeCommentBox = reviewForm.locator(":scope > form > .write-comment-box");
  await expect(authorInfoWrap).toHaveCSS("padding", "0px");
  await expect(reviewForm.locator(":scope > form > .author-info-wrap")).toHaveCSS("height", "35px");
  await expect(authorInfoWrap).toHaveCSS("margin-bottom", "10px");
  await expect(authorInfoWrap).toHaveCSS("display", "block");
  await expect(authorInfoWrap).toHaveCSS("clear", "both");
  await expect(writeCommentBox).toHaveCSS("padding", "0px");
  await expect(writeCommentBox).toHaveCSS("margin", "0px 0px 0px 46px");
  await expect(writeCommentBox).toHaveCSS("margin-left", "46px");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-block-review-form";
  });

  await page.locator(".diff-partial-codeline").first().selectText();
  await page.locator(".diff-body").dispatchEvent("mouseup");
  await expect(popButton).toBeVisible();
  await popButton.click();

  await expect(reviewForm).toBeVisible();
  await expect(popButton).toBeHidden();
  await expect(reviewForm).toHaveCSS("display", "block");
  await expect(reviewForm.locator(":scope > form > .author-info-wrap")).toHaveCSS(
    "display",
    "block",
  );
  await expect(reviewForm.locator(":scope > form > .write-comment-box")).toHaveCSS(
    "padding",
    "0px",
  );
  expect(await blockReviewFormMetrics(page)).toEqual({
    authorAvatarVisible: true,
    authorDataOriginalTitle: null,
    authorDataPlacement: null,
    authorTitle: "Site Admin",
    closeButtonText: "×",
    closeDataToggle: null,
    display: "block",
    editorMode: "code-review-body",
    uploadResourceType: "COMMIT_COMMENT",
  });
  expect(page.url()).toBe(initialUrl);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(reviewForm).toHaveCSS("display", "block");
  await expect(authorInfoWrap).toHaveCSS("height", "35px");
  await expect(authorInfoWrap).toHaveCSS("margin-bottom", "10px");
  await expect(writeCommentBox).toHaveCSS("margin-left", "0px");
  const mobileReviewBox = await reviewForm.evaluate((form) => {
    const box = form.getBoundingClientRect();
    return { left: box.left, right: box.right, viewportWidth: window.innerWidth };
  });
  expect(mobileReviewBox.left).toBeGreaterThanOrEqual(0);
  expect(mobileReviewBox.right).toBeLessThanOrEqual(mobileReviewBox.viewportWidth);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-block-review-form");

  await closeButton.click();

  await expect(reviewForm).toBeHidden();
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-block-review-form");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail links known commit author avatar like legacy diff.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    commit: {
      authorAvatarUrl: "/avatars/dev.png",
      authorDate: "Jul 1, 2026",
      authorEmail: "dev@example.com",
      authorLoginId: "dev",
      authorName: "Dev Author",
      commentCount: 0,
      commitId: "abcdef1234567890",
      commitShortId: "abcdef1",
      message: "Initial commit\nAdd README",
      shortMessage: "Initial commit",
    },
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  const authorAvatar = page.locator(".commitAuthor > .avatar-wrap.smaller");
  await expect(authorAvatar).toHaveAttribute("href", `${basePath}/dev`);
  await expect(authorAvatar.locator("img")).toHaveAttribute("src", "/avatars/dev.png");
  await expect(authorAvatar.locator("img")).toHaveAttribute("alt", "Dev Author");
  await expect(authorAvatar.locator("img")).toHaveAttribute("width", "32");
  await expect(authorAvatar.locator("img")).toHaveAttribute("height", "32");
  await expect(page.locator(".commitAuthor > strong")).toHaveText("Dev Author");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail renders no-author commit with legacy anonymous author copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    commit: {
      authorDate: "Jul 1, 2026",
      authorEmail: null,
      authorName: null,
      commentCount: 0,
      commitId: "abcdef1234567890",
      commitShortId: "abcdef1",
      message: "Initial commit\nAdd README",
      shortMessage: "Initial commit",
    },
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  await expect(page.locator(".commitAuthor > strong")).toHaveText("Anonymous");
  await expect(page.locator(".commitAuthor > .avatar-wrap.smaller")).not.toHaveAttribute("href");
  await expect(page.locator(".commitAuthor > .avatar-wrap.smaller img")).toHaveAttribute("alt", "");
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail submits watch and comment mutations through legacy controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  const mutationRequests: Array<{ body: unknown; method: string; pathname: string }> = [];
  await mockProjectCommitDetail(page, detailRequests, {}, {}, mutationRequests);

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-toggle", "button");
  await expect(page.locator("#watch-button")).toHaveClass(/^pull-left ybtn\s*$/);
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  await page.locator("#watch-button").click();
  await page.locator("#editor-contents-comment").fill("Top level note");
  await page.locator("#comment-form button[type=submit]").click();

  await expect.poll(() => mutationRequests.length).toBe(2);
  expect(mutationRequests).toEqual([
    {
      body: null,
      method: "POST",
      pathname: `${basePath}/api/v1/projects/admin/sample/commit/abcdef1234567890/watch`,
    },
    {
      body: {
        attachmentIds: [],
        contentsMarkdown: "Top level note",
      },
      method: "POST",
      pathname: `${basePath}/api/v1/projects/admin/sample/commit/abcdef1234567890/comments`,
    },
  ]);
  await expect(page.locator("#watch-button")).toHaveClass(/active/);
  await expect(page.locator("#watch-button")).toHaveClass(/ybtn-watching/);
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-toggle", "button");
});

test("project commit detail renders legacy partial_filediff rows", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".linenum {\n                                text-align: right;\n                                color: rgba(0, 0, 0, 0.3);",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".line-number {\n                                    width: 50px;\n                                    height: 20px;\n                                    position: relative;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".code {\n                                white-space: nowrap;\n                                padding:0 5px;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".diff-partial-codeline {\n                                    font-family: @fixed-font-family;\n                                    background-color: transparent;",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.diffLineNumber");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.diffLineNumberMarker");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.diffCodeCell");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.diffCodeLine");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    '.diff-body {\n    font-family: "monospace", Consolas, Tahoma;',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("fontFamily: '\"monospace\", Consolas, Tahoma'");
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

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".diff-partial-outer#src-main-rs")).toBeVisible();
  await expect(page.locator("#src-main-rs .diff-partial-commit-id a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/1234567890abcdef/src/main.rs`,
  );
  await expect(page.locator("#src-main-rs .diff-partial-commit-id a").nth(0)).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator("#src-main-rs .diff-partial-commit-id a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/abcdef1234567890/src/main.rs`,
  );
  await expect(page.locator("#src-main-rs .diff-partial-commit-id a").nth(1)).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".diff-container.show-comments tr.add")).toHaveCount(2);
  await expect(page.locator(".diff-container.show-comments tr.remove")).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
    ),
  );
  expect(await readPartialDiffMetrics(page)).toEqual({
    codeLineBackground: "rgba(0, 0, 0, 0)",
    codeLineBorderTopWidth: "0px",
    codeLineFontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    codeLineFontSize: "12px",
    codeLineMargin: "0px",
    codeLinePadding: "0px",
    diffBodyMinHeight: "30px",
    diffBodyFontFamily: '"monospace", Consolas, Tahoma',
    diffBodyPosition: "relative",
    diffOuterBorderColor: "rgb(187, 187, 187)",
    diffOuterMarginBottom: "20px",
    fileFontSize: "13px",
    fileFontWeight: "700",
    fileMarginRight: "115px",
    filePadding: "5px 10px",
    firstLineNumberWidth: "50px",
    lineNumberCellBorderRightColor: "rgb(229, 229, 229)",
    lineNumberCellPadding: "0px 3px",
    lineNumberCellWidth: 78,
    metaBackground: "rgb(238, 238, 238)",
    metaBorderBottomColor: "rgb(187, 187, 187)",
    metaHeight: "30px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".diff-body")).toHaveCSS(
    "font-family",
    '"monospace", Consolas, Tahoma',
  );
});

test("project commit detail Batch 746 partial diff row and cell owners keep legacy declarations", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("&.linenum {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".line-number {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".code {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".diff-partial-codeline {");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-diff-line-number-cell"',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-diff-line-number"',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-diff-code-cell"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-diff-code-pre"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('textAlign: "right"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('width: "50px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('whiteSpace: "nowrap"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('padding: "0px 5px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('fontSize: "12px"');

  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1 +1 @@
-old
+new`,
      },
    ],
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  for (const width of [1366, 390]) {
    if (width === 390) await page.setViewportSize({ width, height: 844 });
    const styles = await page.locator("#src-main-rs tr.remove").evaluate((row) => {
      const lineNumberCell = row.querySelector<HTMLElement>(".linenum")!;
      const lineNumber = row.querySelector<HTMLElement>(".line-number")!;
      const code = row.querySelector<HTMLElement>(".code")!;
      const codeLine = row.querySelector<HTMLElement>(".diff-partial-codeline")!;
      return {
        code: {
          padding: getComputedStyle(code).padding,
          whiteSpace: getComputedStyle(code).whiteSpace,
        },
        codeLine: {
          backgroundColor: getComputedStyle(codeLine).backgroundColor,
          fontSize: getComputedStyle(codeLine).fontSize,
          margin: getComputedStyle(codeLine).margin,
          padding: getComputedStyle(codeLine).padding,
          whiteSpace: getComputedStyle(codeLine).whiteSpace,
        },
        lineNumber: {
          height: getComputedStyle(lineNumber).height,
          position: getComputedStyle(lineNumber).position,
          width: getComputedStyle(lineNumber).width,
        },
        lineNumberCell: {
          padding: getComputedStyle(lineNumberCell).padding,
          textAlign: getComputedStyle(lineNumberCell).textAlign,
          whiteSpace: getComputedStyle(lineNumberCell).whiteSpace,
        },
      };
    });
    expect(styles).toEqual({
      code: { padding: "0px 5px", whiteSpace: "nowrap" },
      codeLine: {
        backgroundColor: "rgba(0, 0, 0, 0)",
        fontSize: "12px",
        margin: "0px",
        padding: "0px",
        whiteSpace: "pre",
      },
      lineNumber: { height: "20px", position: "relative", width: "50px" },
      lineNumberCell: { padding: "0px 3px", textAlign: "right", whiteSpace: "nowrap" },
    });
  }
  expect(detailRequests).toEqual(["branch=main"]);
  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1);
});

test("project commit detail owns diff-body font family", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    '.diff-body {\n    font-family: "monospace", Consolas, Tahoma;',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("fontFamily: '\"monospace\", Consolas, Tahoma'");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("className={`${sx.diffBody.className} diff-body`}");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-diff-body-layout"',
  );

  await mockProjectCommitDetail(page, []);
  const diffBody = page.locator(".diff-body");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(diffBody).toHaveCSS("font-family", '"monospace", Consolas, Tahoma');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(diffBody).toHaveCSS("font-family", '"monospace", Consolas, Tahoma');
});

test("project commit detail owns diff-body layout", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".diff-body {\n            position:relative;\n            .border-radius(3px);\n            min-height:30px;",
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('position: "relative"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderRadius: "3px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('minHeight: "30px"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-diff-body-layout"',
  );

  await mockProjectCommitDetail(page, []);
  const diffBody = page.locator('[data-stylex-owner="commit-detail-diff-body-layout"]');

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 1366) {
      await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
    }
    await expect(diffBody).toHaveClass(/diff-body/);
    await expect(diffBody).toHaveCSS("position", "relative");
    await expect(diffBody).toHaveCSS("border-radius", "3px");
    await expect(diffBody).toHaveCSS("min-height", "30px");
  }
});

test("project commit detail renders legacy added deleted and renamed filename headers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "docs/new.md",
        patch: `diff --git a/docs/new.md b/docs/new.md
new file mode 100644
index 0000000..abcdef1
--- /dev/null
+++ b/docs/new.md
@@ -0,0 +1 @@
+hello`,
      },
      {
        path: "docs/old.md",
        patch: `diff --git a/docs/old.md b/docs/old.md
deleted file mode 100644
index 1234567..0000000
--- a/docs/old.md
+++ /dev/null
@@ -1 +0,0 @@
-bye`,
      },
      {
        path: "docs/new-name.md",
        patch: `diff --git a/docs/old-name.md b/docs/new-name.md
similarity index 82%
rename from docs/old-name.md
rename to docs/new-name.md
index 1234567..abcdef1 100644
--- a/docs/old-name.md
+++ b/docs/new-name.md
@@ -1 +1 @@
-old name
+new name`,
      },
    ],
  });

  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("code.addedPath");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("code.deletedPath");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("code.renamedPath");

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  await expect(page.locator(".diff-partial-file .filename")).toHaveText([
    "docs/new.md (added)",
    "docs/old.md (deleted)",
    "docs/new-name.md (Renamed from docs/old-name.md)",
  ]);
  await expect(page.locator("#docs-new-md .patch-header .path")).toHaveText(["+++ docs/new.md"]);
  await expect(page.locator("#docs-old-md .patch-header .path")).toHaveText(["--- docs/old.md"]);
  await expect(page.locator("#docs-new-name-md .patch-header .path")).toHaveText([
    "--- docs/old-name.md",
    "+++ docs/new-name.md",
  ]);
  await expect(page.locator("#docs-new-md tr.add")).toHaveCount(1);
  await expect(page.locator("#docs-old-md tr.remove")).toHaveCount(1);
  await expect(page.locator("#docs-new-name-md tr.remove")).toHaveCount(1);
  await expect(page.locator("#docs-new-name-md tr.add")).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail renders legacy file diff error row", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        errorCode: "DIFF_SIZE_EXCEEDED",
        path: "src/large.rs",
        patch: `diff --git a/src/large.rs b/src/large.rs
index 1234567..abcdef1 100644
--- a/src/large.rs
+++ b/src/large.rs`,
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  const errorCell = page.locator("#src-large-rs .diff-container.show-comments tbody tr td");
  await expect(errorCell).toHaveAttribute("colspan", "3");
  await expect(errorCell).toHaveText("This diff is too big to display.");
  await expect(page.locator("#src-large-rs .diff-container.show-comments tbody tr")).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail renders legacy no-changes row for empty hunks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "src/unchanged.rs",
        patch: `diff --git a/src/unchanged.rs b/src/unchanged.rs
index 1234567..abcdef1 100644
--- a/src/unchanged.rs
+++ b/src/unchanged.rs`,
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  const noChangesCell = page.locator("#src-unchanged-rs .diff-container.show-comments tbody tr td");
  await expect(noChangesCell).toHaveAttribute("colspan", "3");
  await expect(noChangesCell).toHaveText("No changes");
  await expect(
    page.locator("#src-unchanged-rs .diff-container.show-comments tbody tr"),
  ).toHaveCount(1);
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail renders legacy file mode change row", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "script/run.sh",
        patch: `diff --git a/script/run.sh b/script/run.sh
old mode 100644
new mode 100755
index 1234567..abcdef1
--- a/script/run.sh
+++ b/script/run.sh`,
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

  const modeRow = page.locator("#script-run-sh .diff-container.show-comments tbody tr").first();
  await expect(modeRow.locator("td").nth(0)).toHaveClass("linenum");
  await expect(modeRow.locator("td").nth(0).locator(".line-number")).toHaveAttribute(
    "data-line-num",
    "100644",
  );
  await expect(modeRow.locator("td").nth(0).locator(".hidden")).toHaveText("100644");
  await expect(modeRow.locator("td").nth(1)).toHaveClass("linenum");
  await expect(modeRow.locator("td").nth(1).locator(".line-number")).toHaveAttribute(
    "data-line-num",
    "100755",
  );
  await expect(modeRow.locator("td").nth(1).locator(".hidden")).toHaveText("100755");
  await expect(modeRow.locator("td").nth(2)).toHaveClass("isBinary");
  await expect(modeRow.locator("td").nth(2)).toHaveText("File mode has changed");
  await expect(page.locator("#script-run-sh .diff-container.show-comments tbody tr")).toHaveCount(
    1,
  );
  expect(detailRequests).toEqual(["branch=main"]);
});

async function readPartialDiffMetrics(page: Page) {
  return page.evaluate(() => {
    const diffBody = document.querySelector<HTMLElement>(".diff-body");
    const diffOuter = document.querySelector<HTMLElement>(".diff-partial-outer");
    const meta = document.querySelector<HTMLElement>(".diff-partial-meta");
    const file = document.querySelector<HTMLElement>(".diff-partial-file");
    const filename = document.querySelector<HTMLElement>(".diff-partial-file .filename");
    const lineNumberCell = document.querySelector<HTMLElement>(".diff-container .linenum");
    const firstLineNumber = document.querySelector<HTMLElement>(".diff-container .line-number");
    const codeLine = document.querySelector<HTMLElement>(".diff-partial-codeline");
    const missing = Object.entries({
      codeLine,
      diffBody,
      diffOuter,
      file,
      filename,
      firstLineNumber,
      lineNumberCell,
      meta,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected partial diff metric targets are missing: ${missing.join(", ")}`);
    }

    const codeLineStyle = getComputedStyle(codeLine);
    const diffBodyStyle = getComputedStyle(diffBody);
    const diffOuterStyle = getComputedStyle(diffOuter);
    const fileStyle = getComputedStyle(file);
    const lineNumberCellStyle = getComputedStyle(lineNumberCell);
    const metaStyle = getComputedStyle(meta);
    return {
      codeLineBackground: codeLineStyle.backgroundColor,
      codeLineBorderTopWidth: codeLineStyle.borderTopWidth,
      codeLineFontFamily: codeLineStyle.fontFamily,
      codeLineFontSize: codeLineStyle.fontSize,
      codeLineMargin: codeLineStyle.margin,
      codeLinePadding: codeLineStyle.padding,
      diffBodyFontFamily: diffBodyStyle.fontFamily,
      diffBodyMinHeight: diffBodyStyle.minHeight,
      diffBodyPosition: diffBodyStyle.position,
      diffOuterBorderColor: diffOuterStyle.borderTopColor,
      diffOuterMarginBottom: diffOuterStyle.marginBottom,
      fileFontSize: getComputedStyle(filename).fontSize,
      fileFontWeight: fileStyle.fontWeight,
      fileMarginRight: fileStyle.marginRight,
      filePadding: fileStyle.padding,
      firstLineNumberWidth: getComputedStyle(firstLineNumber).width,
      lineNumberCellBorderRightColor: lineNumberCellStyle.borderRightColor,
      lineNumberCellPadding: lineNumberCellStyle.padding,
      lineNumberCellWidth: Math.round(lineNumberCell.getBoundingClientRect().width),
      metaBackground: metaStyle.backgroundColor,
      metaBorderBottomColor: metaStyle.borderBottomColor,
      metaHeight: metaStyle.height,
    };
  });
}

async function readInlineDiffCommentRowMetrics(page: Page) {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLTableRowElement>("tr.comments.board-comment-wrap");
    const cell = document.querySelector<HTMLTableCellElement>(
      "tr.comments.board-comment-wrap > td",
    );
    const thread = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap",
    );
    const threadHeader = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap .thread-header",
    );
    const badge = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap .thread-header .badge",
    );
    const comments = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap > .comments",
    );
    const comment = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap > .comments > .comment",
    );
    const mediaBody = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap .media-body",
    );
    const threadHere = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap .btn-thread-here",
    );
    const minimize = document.querySelector<HTMLElement>(
      "tr.comments.board-comment-wrap .comment-thread-wrap .thread-header .btn-thread-minimize",
    );
    const missing = Object.entries({
      badge,
      cell,
      comment,
      comments,
      mediaBody,
      minimize,
      row,
      thread,
      threadHeader,
      threadHere,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected inline diff comment metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const cellStyle = getComputedStyle(cell);
    const commentStyle = getComputedStyle(comment);
    const commentsStyle = getComputedStyle(comments);
    const mediaBodyStyle = getComputedStyle(mediaBody);
    const minimizeStyle = getComputedStyle(minimize);
    const rowStyle = getComputedStyle(row);
    const threadStyle = getComputedStyle(thread);
    const threadHeaderStyle = getComputedStyle(threadHeader);
    const threadHereStyle = getComputedStyle(threadHere);
    return {
      badgeMargin: getComputedStyle(badge).margin,
      badgePadding: getComputedStyle(badge).padding,
      cellColspan: cell.colSpan,
      cellPadding: cellStyle.padding,
      commentPadding: commentStyle.padding,
      commentsMargin: commentsStyle.margin,
      mediaBodyBackground: mediaBodyStyle.backgroundColor,
      minimizePosition: minimizeStyle.position,
      minimizeRight: minimizeStyle.right,
      minimizeTop: minimizeStyle.top,
      rowDisplay: rowStyle.display,
      threadBackground: threadStyle.backgroundColor,
      threadBorderBottomWidth: threadStyle.borderBottomWidth,
      threadBorderColor: threadStyle.borderTopColor,
      threadBorderLeftWidth: threadStyle.borderLeftWidth,
      threadBoxShadow: threadStyle.boxShadow,
      threadHereDisplay: threadHereStyle.display,
      threadHeaderPadding: threadHeaderStyle.padding,
      threadMarginTop: threadStyle.marginTop,
      threadMaxWidth: threadStyle.maxWidth,
      threadPadding: threadStyle.padding,
      threadPosition: threadStyle.position,
    };
  });
}

async function readNonRangedThreadMetrics(page: Page) {
  return page.evaluate(() => {
    const thread = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap",
    );
    const comments = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap > .comments",
    );
    const comment = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap > .comments > .comment",
    );
    const mediaBody = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap .media-body",
    );
    const threadHere = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap .btn-thread-here",
    );
    const minimize = document.querySelector<HTMLElement>(
      ".non-ranged-threads-wrap .comment-thread-wrap > .btn-thread-minimize",
    );
    const missing = Object.entries({
      comment,
      comments,
      mediaBody,
      minimize,
      thread,
      threadHere,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected non-ranged thread metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const commentStyle = getComputedStyle(comment);
    const commentsStyle = getComputedStyle(comments);
    const mediaBodyStyle = getComputedStyle(mediaBody);
    const minimizeStyle = getComputedStyle(minimize);
    const threadHereStyle = getComputedStyle(threadHere);
    const threadStyle = getComputedStyle(thread);
    return {
      commentPadding: commentStyle.padding,
      commentsMargin: commentsStyle.margin,
      mediaBodyBackground: mediaBodyStyle.backgroundColor,
      minimizePosition: minimizeStyle.position,
      minimizeRight: minimizeStyle.right,
      minimizeTop: minimizeStyle.top,
      threadBackground: threadStyle.backgroundColor,
      threadBorderBottomWidth: threadStyle.borderBottomWidth,
      threadBorderColor: threadStyle.borderTopColor,
      threadBorderLeftStyle: threadStyle.borderLeftStyle,
      threadBoxShadow: threadStyle.boxShadow,
      threadHereDisplay: threadHereStyle.display,
      threadMarginTop: threadStyle.marginTop,
      threadMaxWidth: threadStyle.maxWidth,
      threadPadding: threadStyle.padding,
      threadPosition: threadStyle.position,
    };
  });
}

test("project commit detail ranged thread header and badge own frozen geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('<div class="thread-header">');
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain(
    '<span class="badge state @thread.state.toString().toLowerCase()">',
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".comment-thread-wrap {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("border:1px solid #e5e5e5;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("border-width:1px 0px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding:5px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding-bottom:0;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("background-color:#fefefe;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("max-width:876px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("position:relative;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("&.open");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("&.closed");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("margin:0 5px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".comment { padding: 2px 0; }");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".media-body { background: #fff; }");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("position:absolute;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("top:8px; right:10px;");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadComments: { margin: "0px 5px" }');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadComment: { padding: "2px 0px" }');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadMediaBody: { backgroundColor: "#fff" }');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'rangedThreadMinimize: { position: "absolute", right: "10px", top: "8px" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadComments");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadComment");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadMediaBody");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.rangedThreadMinimize");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("btn-thread-here");
  expect(LEGACY_THREAD_FORM_SOURCE).toContain('<div class="right-txt">');
  expect(LEGACY_THREAD_FORM_SOURCE).toContain('<p class="thread-actrow">');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".thread-actrow {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("text-align:right;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding:5px 5px 10px;");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadActions: { padding: "5px 5px 10px" }');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadActions");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-thread-actions"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("threadShell:");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('backgroundColor: "#fefefe"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('border: "1px solid #e5e5e5"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderWidth: "1px 0px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('padding: "5px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('paddingBottom: "0px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('maxWidth: "876px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('position: "relative"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'threadShellOpen: { boxShadow: "inset 5px 0px 0px #b6da54" }',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'threadShellClosed: { boxShadow: "inset 5px 0px 0px #fd6956" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadShell");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-thread-shell"');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".thread-header{");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding: 5px 10px 10px 10px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("margin:0; padding:2px 10px;");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'rangedThreadHeader: { padding: "5px 10px 10px 10px" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.rangedThreadHeader");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'rangedThreadBadge: { margin: "0px", padding: "2px 10px" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.rangedThreadBadge");

  await mockProjectCommitDetail(page, [], {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,1 +1,2 @@
 fn main() {
+    println!("new");`,
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
            authorAvatarUrl: "/avatars/dev.png",
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: false,
            contentsHtml: "<p>Server HTML should not render</p>",
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

  const badge = page.locator("#thread-77 .thread-header .badge");
  const header = page.locator("#thread-77 .thread-header");
  const thread = page.locator("#thread-77.comment-thread-wrap");
  const comments = thread.locator(":scope > ul.comments");
  const comment = comments.locator(":scope > li.comment");
  const mediaBody = comment.locator(":scope > .media-body");
  const minimize = header.locator(":scope > .btn-thread-minimize");
  const threadActions = page.locator('[data-stylex-owner="commit-detail-thread-actions"]');
  const assertBadgeMetrics = async () => {
    await expect(thread).toHaveAttribute("data-stylex-owner", "commit-detail-thread-shell");
    await expect(thread).toHaveCSS("border-top-width", "1px");
    await expect(thread).toHaveCSS("border-right-width", "0px");
    await expect(thread).toHaveCSS("border-bottom-width", "1px");
    await expect(thread).toHaveCSS("border-left-width", "0px");
    await expect(thread).toHaveCSS("border-top-color", "rgb(229, 229, 229)");
    await expect(thread).toHaveCSS("padding", "5px 5px 0px");
    await expect(thread).toHaveCSS("background-color", "rgb(254, 254, 254)");
    await expect(thread).toHaveCSS("max-width", "876px");
    await expect(thread).toHaveCSS("position", "relative");
    await expect(thread).toHaveCSS("box-shadow", "rgb(182, 218, 84) 5px 0px 0px 0px inset");
    await expect(comments).toHaveCSS("margin", "0px 5px");
    await expect(comment).toHaveCSS("padding", "2px 0px");
    await expect(mediaBody).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(minimize).toHaveCSS("position", "absolute");
    await expect(minimize).toHaveCSS("top", "8px");
    await expect(minimize).toHaveCSS("right", "10px");
    await expect(threadActions).toHaveCSS("padding", "5px 5px 10px");
    await expect(threadActions).toHaveCSS("text-align", "right");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("Open");
    await expect(header).toHaveCSS("padding", "5px 10px 10px");
    await expect(badge).toHaveCSS("margin", "0px");
    await expect(badge).toHaveCSS("padding", "2px 10px");
    const badgeBox = await badge.boundingBox();
    const headerBox = await header.boundingBox();
    const threadBox = await thread.boundingBox();
    expect(badgeBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(threadBox).not.toBeNull();
    expect(headerBox!.x).toBeGreaterThanOrEqual(threadBox!.x);
    expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(threadBox!.x + threadBox!.width);
    expect(badgeBox!.x).toBeGreaterThanOrEqual(headerBox!.x);
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width);
  };

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await assertBadgeMetrics();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertBadgeMetrics();
});

test("project commit detail folds closed ranged threads with frozen StyleX geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(`&.fold {
        position:static;
        padding:0; margin:0;
        background: transparent;
        border: none;`);
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(`.thread-header,
        .thread-actrow,
        .comments,
        .write-comment-form {
            display:none;
        }`);
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain(
    'class="comment-thread-wrap @thread.state.toString().toLowerCase()\n     @if(thread.isInstanceOf[CodeCommentThread] && thread.state == CommentThread.ThreadState.CLOSED){fold}"',
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".comment-thread-wrap + .comment-thread-wrap {\n    margin-top:10px;\n}",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".comment-thread-wrap.fold + .comment-thread-wrap {\n    margin-top:0;\n}",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'const isClosedRangedFold = !isNonRanged && state === "closed" && isFolded;',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadShellClosedFold");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadFoldHidden");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadFoldHere");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.threadFoldClosedButton");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("threadShellClosedFold: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'threadFoldHere: {\n    position: "absolute",\n    zIndex: 99,\n    right: "0px",\n    marginTop: "0px",\n    display: "block",\n  }',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("threadFoldClosedButton: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderLeftWidth: "3px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderLeftStyle: "solid"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('borderLeftColor: "#fd6956"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadAfterThread: { marginTop: "10px" }');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('threadAfterFoldedThread: { marginTop: "0px" }');

  await mockProjectCommitDetail(page, [], {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,1 +1,2 @@
 fn main() {
+    println!("new");`,
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
            authorAvatarUrl: "/avatars/dev.png",
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: false,
            contentsHtml: "<p>Server HTML should not render</p>",
            contentsMarkdown: "Closed ranged note",
            createdLabel: "Jul 1, 2026",
            id: 504,
            threadId: 79,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endLine: 2,
        id: 79,
        path: "src/main.rs",
        prevCommitId: "1234567890abcdef",
        startLine: 2,
        state: "closed",
      },
      {
        authorId: 2,
        authorLabel: "Dev User",
        authorLoginId: "dev",
        comments: [
          {
            authorId: 2,
            authorAvatarUrl: "/avatars/dev.png",
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: false,
            contentsHtml: "<p>Server HTML should not render</p>",
            contentsMarkdown: "Second ranged note",
            createdLabel: "Jul 1, 2026",
            id: 505,
            threadId: 80,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        endLine: 2,
        id: 80,
        path: "src/main.rs",
        prevCommitId: "1234567890abcdef",
        startLine: 2,
        state: "open",
      },
    ],
  });

  const thread = page.locator("#thread-79.comment-thread-wrap");
  const foldedHere = thread.locator(":scope > .btn-thread-here");
  const foldedButton = foldedHere.locator("button");
  const header = thread.locator(":scope > .thread-header");
  const comments = thread.locator(":scope > ul.comments");
  const replyForm = thread.locator(":scope > .write-comment-form");
  const headerMinimize = header.locator(":scope > .btn-thread-minimize");
  const nextThread = page.locator("#thread-80.comment-thread-wrap");

  const assertClosedFold = async () => {
    await expect(thread).toHaveClass(/closed fold/);
    await expect(thread).toHaveCSS("position", "static");
    await expect(thread).toHaveCSS("padding", "0px");
    await expect(thread).toHaveCSS("margin", "0px");
    await expect(thread).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(thread).toHaveCSS("border-top-width", "0px");
    await expect(thread).toHaveCSS("box-shadow", "none");
    await expect(header).toBeHidden();
    await expect(comments).toBeHidden();
    await expect(replyForm).toBeHidden();
    await expect(headerMinimize).toBeHidden();
    await expect(foldedHere).toBeVisible();
    await expect(foldedHere).toHaveCSS("position", "absolute");
    await expect(foldedHere).toHaveCSS("z-index", "99");
    await expect(foldedHere).toHaveCSS("right", "0px");
    await expect(foldedHere).toHaveCSS("margin-top", "0px");
    await expect(foldedHere).toHaveCSS("display", "block");
    await expect(foldedButton).toHaveCSS("border-left", "3px solid rgb(253, 105, 86)");
  };

  const assertAdjacentMargin = async (margin: string) => {
    await expect(nextThread).toHaveCSS("margin-top", margin);
  };

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await assertClosedFold();
  await assertAdjacentMargin("0px");

  await page.setViewportSize({ width: 390, height: 844 });
  await assertClosedFold();
  await assertAdjacentMargin("0px");

  await foldedButton.click();
  await expect(thread).not.toHaveClass(/fold/);
  await expect(header).toBeVisible();
  await expect(comments).toBeVisible();
  await expect(replyForm).toBeVisible();
  await expect(foldedHere).toBeHidden();
  await expect(headerMinimize).toBeVisible();
  await assertAdjacentMargin("10px");
});

test("project commit detail renders legacy inline diff comment row", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('<div class="thread-header">');
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain(
    '<span class="badge state @thread.state.toString().toLowerCase()">',
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".comment-thread-wrap {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".thread-header{");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("margin:0; padding:2px 10px;");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'rangedThreadBadge: { margin: "0px", padding: "2px 10px" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.rangedThreadBadge");
  const detailRequests: string[] = [];
  const mutationRequests: Array<{ body: unknown; method: string; pathname: string }> = [];
  await mockProjectCommitDetail(
    page,
    detailRequests,
    {
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
              authorAvatarUrl: "/avatars/dev.png",
              authorLabel: "Dev User",
              authorLoginId: "dev",
              canDelete: true,
              contentsHtml: "<p>Server HTML should not render</p>",
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
    },
    {},
    mutationRequests,
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(
    page.locator("tr.comments.board-comment-wrap[data-commit-id='abcdef1234567890']"),
  ).toBeVisible();
  await expect(page.locator("#thread-77.comment-thread-wrap.open")).toBeVisible();
  await expect(
    page.locator("#thread-77 .upload-wrap.content-footer[data-resource-type='COMMIT_COMMENT']"),
  ).toBeVisible();
  await expect(page.locator("#editor-contents-thread-77")).toHaveCSS("height", "100px");
  expect(await readInlineDiffCommentRowMetrics(page)).toEqual({
    badgeMargin: "0px",
    badgePadding: "2px 10px",
    cellColspan: 3,
    cellPadding: "0px",
    commentPadding: "2px 0px",
    commentsMargin: "0px 5px",
    mediaBodyBackground: "rgb(255, 255, 255)",
    minimizePosition: "absolute",
    minimizeRight: "10px",
    minimizeTop: "8px",
    rowDisplay: "table-row",
    threadBackground: "rgb(254, 254, 254)",
    threadBorderBottomWidth: "1px",
    threadBorderColor: "rgb(229, 229, 229)",
    threadBorderLeftWidth: "0px",
    threadBoxShadow: "rgb(182, 218, 84) 5px 0px 0px 0px inset",
    threadHereDisplay: "none",
    threadHeaderPadding: "5px 10px 10px",
    threadMarginTop: "0px",
    threadMaxWidth: "876px",
    threadPadding: "5px 5px 0px",
    threadPosition: "relative",
  });
  const badge = page.locator("#thread-77 .thread-header .badge");
  await expect(badge).toHaveCSS("margin", "0px");
  await expect(badge).toHaveCSS("padding", "2px 10px");
  const desktopBadgeBox = await badge.boundingBox();
  const desktopHeaderBox = await page.locator("#thread-77 .thread-header").boundingBox();
  expect(desktopBadgeBox).not.toBeNull();
  expect(desktopHeaderBox).not.toBeNull();
  expect(desktopBadgeBox!.x).toBeGreaterThanOrEqual(desktopHeaderBox!.x);
  expect(desktopBadgeBox!.x + desktopBadgeBox!.width).toBeLessThanOrEqual(
    desktopHeaderBox!.x + desktopHeaderBox!.width,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(badge).toHaveCSS("margin", "0px");
  await expect(badge).toHaveCSS("padding", "2px 10px");
  const mobileBadgeBox = await badge.boundingBox();
  const mobileHeaderBox = await page.locator("#thread-77 .thread-header").boundingBox();
  expect(mobileBadgeBox).not.toBeNull();
  expect(mobileHeaderBox).not.toBeNull();
  expect(mobileBadgeBox!.x).toBeGreaterThanOrEqual(mobileHeaderBox!.x);
  expect(mobileBadgeBox!.x + mobileBadgeBox!.width).toBeLessThanOrEqual(
    mobileHeaderBox!.x + mobileHeaderBox!.width,
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator("#comment-501 .comment-avatar img")).toHaveAttribute("alt", "dev");
  await expect(page.locator("#thread-77")).not.toHaveAttribute("data-toggle");
  await expect(page.locator("#thread-77")).toHaveAttribute("data-range-path", "src/main.rs");
  await expect(page.locator("#thread-77")).toHaveAttribute("data-range-startline", "2");
  await expect(page.locator("#thread-77")).toHaveAttribute("data-range-endline", "2");
  await expect(page.locator('#comment-501 [data-toggle="comment-delete"]')).toHaveCount(0);
  const deleteButton = page.locator('#comment-501 button[title="Delete comment"]');
  await deleteButton.click();
  await expect(page.locator("#comment-delete-modal")).toHaveAttribute(
    "data-stylex-owner",
    "commit-detail-comment-delete-modal",
  );
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);
  await expect(page.locator("[data-request-method], [data-request-uri]")).toHaveCount(0);
  await page.evaluate(() => {
    const bridgeWindow = window as Window &
      typeof globalThis & {
        __commitRootModalBridgeHits?: number;
        __commitRootModalBridgeInstalled?: boolean;
      };
    bridgeWindow.__commitRootModalBridgeHits = 0;
    if (bridgeWindow.__commitRootModalBridgeInstalled) {
      return;
    }
    bridgeWindow.__commitRootModalBridgeInstalled = true;
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('[data-toggle="modal"], [data-dismiss="modal"]')) {
          bridgeWindow.__commitRootModalBridgeHits =
            (bridgeWindow.__commitRootModalBridgeHits ?? 0) + 1;
        }
      },
      true,
    );
  });
  expect(await commentDeleteModalMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyDisplay: "block",
    confirmMethod: null,
    confirmText: "Yes",
    confirmUri: null,
    display: "block",
    dismissCount: 0,
    footerTextAlign: "right",
    headerDisplay: "block",
    left: 1,
    noText: "No",
    title: "Delete comment",
    top: 10,
    width: 562,
  });
  const beforeCloseDismissUrl = page.url();
  await page.locator("#comment-delete-modal .modal-header .close").click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page).toHaveURL(beforeCloseDismissUrl);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __commitRootModalBridgeHits?: number })
          .__commitRootModalBridgeHits,
    ),
  ).toBe(0);
  await deleteButton.click();
  await page.locator("#comment-delete-modal .modal-footer .ybtn").last().click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page).toHaveURL(beforeCloseDismissUrl);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __commitRootModalBridgeHits?: number })
          .__commitRootModalBridgeHits,
    ),
  ).toBe(0);
  await deleteButton.click();
  const beforeBackdropDismissUrl = page.url();
  await page.locator(".modal-backdrop.fade.in").click({ position: { x: 1, y: 1 } });
  await expect(page.locator("#comment-delete-modal")).toHaveClass("modal hide fade");
  await expect(page.locator("#comment-delete-modal")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page).toHaveURL(beforeBackdropDismissUrl);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __commitRootModalBridgeHits?: number })
          .__commitRootModalBridgeHits,
    ),
  ).toBe(0);
  await deleteButton.click();
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => mutationRequests.length).toBe(1);
  expect(mutationRequests).toEqual([
    {
      body: null,
      method: "DELETE",
      pathname: `${basePath}/api/v1/projects/admin/sample/commit/abcdef1234567890/comments/501`,
    },
  ]);
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replace('</tr><tr class="add" data-line="3"', `</tr>${withCommentUpdateForm(withThreadUploadForm(withThreadTextareaStyle(withThreadReplyAuthorInfo(EXPECTED_INLINE_THREAD_ROW, 77), 77)), basePath, 501, "Line **note**")}<tr class="add" data-line="3"`).replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
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
            contentsHtml: "<p>Server HTML should not render</p>",
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
  await expect(page.locator("#editor-contents-thread-78")).toHaveAttribute(
    "style",
    /height:\s*100px/,
  );
  await expect(page.locator("#comment-502 .comment-avatar img")).toHaveAttribute("alt", "dev");
  expect(detailRequests).toEqual(["branch=main"]);
  expect(await canonicalize(page, ".diff-body")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="diff-body">${EXPECTED_FILE_DIFF.replace('</tr><tr class="add" data-line="2"', `</tr>${withCommentUpdateForm(withThreadUploadForm(withThreadTextareaStyle(withThreadReplyAuthorInfo(EXPECTED_A_SIDE_INLINE_THREAD_ROW, 78), 78)), basePath, 502, "Old line **note**")}<tr class="add" data-line="2"`).replaceAll("__BASE_PATH__", basePath)}<div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div>`,
    ),
  );
});

test("project commit detail renders legacy non-ranged comment thread", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_REVIEWLIST_SOURCE).toContain(
    '<a href="@DiffRenderer.urlToCommentThread(thread)" class="review-card @thread.state.toString().toLowerCase()',
  );
  expect(LEGACY_CODE_DIFF_SOURCE).toContain('<a href="#thread-@thread.id" class="review-card');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".review-card {\n    display:block;\n    border: 1px solid #ddd;\n    padding: 10px;\n    padding-left: 15px;\n    margin-bottom: 5px;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".border-radius(0 3px 3px 0);\n\n    &:last-of-type { margin-bottom:0; }",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    "&:hover {\n        text-decoration:none;\n        background-color:#fafafa;",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    "&.open {\n        .box-shadow(inset 5px 0px 0px @state-open);",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    "&.closed {\n        .box-shadow(inset 5px 0px 0px @state-closed);",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewCard");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewCardOpen");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain("styles.reviewCardClosed");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-review-card"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'reviewCard: {\n    display: "block",\n    borderWidth: "1px",\n    borderStyle: "solid",\n    borderColor: "#ddd",\n    padding: "10px",\n    paddingLeft: "15px",\n    marginBottom: "5px",\n    borderRadius: "0px 3px 3px 0px",\n    ":last-of-type": { marginBottom: "0px" },\n    ":hover": { textDecoration: "none", backgroundColor: "#fafafa" },\n  },',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'reviewCardOpen: { boxShadow: "inset 5px 0px 0px #b6da54" },',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'reviewCardClosed: { boxShadow: "inset 5px 0px 0px #fd6956" },',
  );
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
            authorAvatarUrl: "/avatars/dev.png",
            authorLabel: "Dev User",
            authorLoginId: "dev",
            canDelete: true,
            contentsHtml: "<p>Server HTML should not render</p>",
            contentsMarkdown: "General **note**",
            createdLabel: "Jul 1, 2026",
            id: 601,
            attachments: [COMMENT_601_ATTACHMENT],
            threadId: 88,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endLine: null,
        id: 88,
        path: "",
        prevCommitId: "1234567890abcdef",
        startLine: null,
        state: "open",
      },
    ],
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".non-ranged-threads-wrap #thread-88")).toBeVisible();
  const reviewCard = page.locator("#reviewcards-open .review-card.open");
  await expect(reviewCard).toHaveCount(1);
  await expect(reviewCard).toHaveCSS("display", "block");
  await expect(reviewCard).toHaveCSS("border", "1px solid rgb(221, 221, 221)");
  await expect(reviewCard).toHaveCSS("padding", "10px 10px 10px 15px");
  await expect(reviewCard).toHaveCSS("margin-bottom", "0px");
  await expect(reviewCard).toHaveCSS("border-radius", "0px 3px 3px 0px");
  await expect(reviewCard).toHaveCSS("box-shadow", "rgb(182, 218, 84) 5px 0px 0px 0px inset");
  const desktopCardBox = await reviewCard.boundingBox();
  expect(desktopCardBox).not.toBeNull();
  expect(desktopCardBox!.x).toBeGreaterThanOrEqual(0);
  expect(desktopCardBox!.x + desktopCardBox!.width).toBeLessThanOrEqual(1366);
  await reviewCard.hover();
  await expect(reviewCard).toHaveCSS("text-decoration-line", "none");
  await expect(reviewCard).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(
    page.locator("#reviewcards-open .review-card.open .avatar-wrap.smaller.margin-right-5 img"),
  ).toHaveAttribute("alt", "Dev User");
  await expect(page.locator("#comment-editform-601")).toBeHidden();
  await expect(page.locator("#comment-editform-601")).toHaveAttribute(
    "data-stylex-owner",
    "commit-detail-comment-update-form",
  );
  await expect(page.locator("#comment-editform-601")).toHaveCSS("display", "none");
  const updateAttachment = page.locator(
    "#comment-editform-601 .attachment-files .attached-file.attached-file-marker",
  );
  await expect(updateAttachment).toHaveCount(1);
  await expect(updateAttachment).toHaveAttribute("data-name", "note.txt");
  await expect(updateAttachment).not.toHaveAttribute("data-href", /.+/);
  await expect(
    page.locator("#comment-editform-601 .attachment-files .attached-file-marker[data-href]"),
  ).toHaveCount(0);
  await expect(updateAttachment).toHaveAttribute("data-mime", "text/plain");
  await expect(updateAttachment.locator("i.mimetype")).toHaveCount(1);
  await expect(updateAttachment.locator("strong.name")).toHaveText("note.txt");
  await expect(updateAttachment.locator("span.size")).toHaveText("42");
  const updateAttachmentDelete = updateAttachment.locator(
    'button[type="button"].btn-transparent.btn-delete',
  );
  await expect(updateAttachmentDelete).not.toHaveAttribute("data-id", /.+/);
  await expect(updateAttachmentDelete).toHaveText("×");
  await expect(
    page.locator("#thread-88 .upload-wrap.content-footer[data-resource-type='COMMIT_COMMENT']"),
  ).toBeVisible();
  await expect(page.locator("#editor-contents-thread-88")).toHaveCSS("height", "100px");
  await expect(page.locator("#comment-601 .comment-avatar img")).toHaveAttribute("alt", "dev");
  await expect(page.locator("#comment-601 .comment-avatar a")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#comment-601 .comment-avatar a")).toHaveAttribute("title", "Dev User");
  await expect(page.locator("#comment-601 .comment-avatar a")).not.toHaveAttribute(
    "data-placement",
    /.+/,
  );
  await expect(page.locator("#comment-601 .comment_author a")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#comment-601 .comment_author a")).toHaveAttribute("title", "Dev User");
  await expect(page.locator("#comment-601 .comment_author a")).not.toHaveAttribute(
    "data-placement",
    /.+/,
  );
  await expect(page.locator("#thread-88 .author-info-wrap .avatar-wrap.medium")).toHaveAttribute(
    "title",
    "Site Admin",
  );
  await expect(
    page.locator("#thread-88 .author-info-wrap .avatar-wrap.medium"),
  ).not.toHaveAttribute("data-placement", /.+/);
  await expect(page.locator("#code-browse-wrap [data-placement]")).toHaveCount(0);
  await expect(page.locator('.board-comment-wrap a[href^="#comment-"]')).toHaveCount(0);
  await expect(page.locator('.review-list a[href^="#thread-"]')).toHaveCount(0);
  await expect(page.locator("#comment-601 .ago a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main#comment-601`,
  );
  await expect(page.locator("#comment-601 .ago a")).toHaveAttribute("title", "Jul 1, 2026");
  await expect(page.locator("#comment-601 .ago a")).not.toHaveAttribute("class", /.+/);
  await expect(page.locator("#comment-601 .ago a")).not.toHaveAttribute("aria-current", /.+/);
  await expect(page.locator("#comment-601 .ago a")).not.toHaveAttribute("data-status", /.+/);
  await expect(reviewCard).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main#thread-88`,
  );
  await expect(reviewCard).toHaveClass(/review-card/);
  await expect(reviewCard).toHaveClass(/\bopen\b/);
  await expect(reviewCard).not.toHaveAttribute("title", /.+/);
  await expect(reviewCard).not.toHaveAttribute("aria-current", /.+/);
  await expect(reviewCard).not.toHaveAttribute("data-status", /.+/);
  await expect(reviewCard.locator(".date")).toHaveAttribute("title", "Jul 1, 2026");
  expect(await readNonRangedThreadMetrics(page)).toEqual({
    commentPadding: "2px 0px",
    commentsMargin: "0px 5px",
    mediaBodyBackground: "rgb(255, 255, 255)",
    minimizePosition: "absolute",
    minimizeRight: "10px",
    minimizeTop: "8px",
    threadBackground: "rgb(254, 254, 254)",
    threadBorderBottomWidth: "1px",
    threadBorderColor: "rgb(229, 229, 229)",
    threadBorderLeftStyle: "none",
    threadBoxShadow: "rgb(182, 218, 84) 5px 0px 0px 0px inset",
    threadHereDisplay: "none",
    threadMarginTop: "0px",
    threadMaxWidth: "876px",
    threadPadding: "5px 5px 0px",
    threadPosition: "relative",
  });
  expect(detailRequests).toEqual(["branch=main"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(reviewCard).toBeVisible();
  await expect(reviewCard).toHaveCSS("display", "block");
  await expect(reviewCard).toHaveCSS("padding", "10px 10px 10px 15px");
  await expect(reviewCard).toHaveCSS("margin-bottom", "0px");
  const mobileCardBox = await reviewCard.boundingBox();
  expect(mobileCardBox).not.toBeNull();
  expect(mobileCardBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileCardBox!.x + mobileCardBox!.width).toBeLessThanOrEqual(390);
  expect(await canonicalize(page, ".board-comment-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="board-comment-wrap"><div class="non-ranged-threads-wrap">${withCommentUpdateForm(withThreadUploadForm(withThreadTextareaStyle(withThreadReplyAuthorInfo(EXPECTED_NON_RANGED_THREAD, 88), 88)), basePath, 601, "General **note**", [COMMENT_601_ATTACHMENT]).replaceAll("__BASE_PATH__", basePath)}</div>${withCommentUploadForm(`<form id="comment-form" action="${basePath}/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`)}</div>`,
    ),
  );
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-comment-hash";
  });
  await page.locator("#comment-601 .ago a").click();
  await expect(page).toHaveURL(/#comment-601$/);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-comment-hash");
  await reviewCard.click();
  await expect(page).toHaveURL(/#thread-88$/);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-comment-hash");
  await page.locator('[data-comment-id="601"][title="Edit comment"]').click();
  await expect(page.locator("#comment-editform-601")).toBeVisible();
  await expect(page.locator("#comment-body-601")).toBeHidden();
  const desktopUpdateBox = await page.locator("#comment-editform-601").evaluate((form) => {
    const box = form.getBoundingClientRect();
    return { left: box.left, right: box.right, viewportWidth: window.innerWidth };
  });
  expect(desktopUpdateBox.left).toBeGreaterThanOrEqual(0);
  expect(desktopUpdateBox.right).toBeLessThanOrEqual(desktopUpdateBox.viewportWidth);
  await expect(
    page.locator(
      ".mt10:has(textarea[id^='editor-contents-']) a[href^='#edit-'], .mt10:has(textarea[id^='editor-contents-']) a[href^='#preview-']",
    ),
  ).toHaveCount(0);
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(
    page.locator(".mt10:has(textarea[id^='editor-contents-']) [data-toggle='tab']"),
  ).toHaveCount(0);
  await expect(
    page.locator(".mt10:has(textarea[id^='editor-contents-']) > ul.nav-tabs button[data-mode]"),
  ).toHaveCount(0);
  const threadEditor = page.locator(
    "#thread-88 .write-comment-form .mt10:has(#editor-contents-thread-88)",
  );
  const updateEditor = page.locator("#comment-editform-601 .mt10:has(#editor-contents-601)");
  await expectEditorTabState(threadEditor, "thread-88", "edit");
  await expectEditorTabState(updateEditor, "601", "edit");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "commit-thread-editor-tabs";
  });
  const urlBeforeThreadEditorTabs = page.url();
  await editorTabButton(threadEditor, "preview").click();
  await expectEditorTabState(threadEditor, "thread-88", "preview");
  await expectEditorTabState(updateEditor, "601", "edit");
  await editorTabButton(updateEditor, "preview").click();
  await editorTabButton(threadEditor, "edit").click();
  await expectEditorTabState(threadEditor, "thread-88", "edit");
  await expectEditorTabState(updateEditor, "601", "preview");
  expect(page.url()).toBe(urlBeforeThreadEditorTabs);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-thread-editor-tabs");
  await page.locator("#comment-editform-601 .ybtn-cancel").click();
  await expect(page.locator("#comment-editform-601")).toBeHidden();
  await expect(page.locator("#comment-body-601")).toBeVisible();
  await page.locator('[data-comment-id="601"][title="Edit comment"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileUpdateBox = await page.locator("#comment-editform-601").evaluate((form) => {
    const box = form.getBoundingClientRect();
    return { left: box.left, right: box.right, viewportWidth: window.innerWidth };
  });
  expect(mobileUpdateBox.left).toBeGreaterThanOrEqual(0);
  expect(mobileUpdateBox.right).toBeLessThanOrEqual(mobileUpdateBox.viewportWidth);
});

test("project commit detail review cards own legacy rail geometry and hash", async ({ page }) => {
  expect(LEGACY_CODE_DIFF_SOURCE).toContain(
    '<p class="content">@thread.getFirstReviewComment().getContents()</p>',
  );
  expect(LEGACY_REVIEWLIST_SOURCE).toContain('<p class="content">');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".content {\n        display: box;\n        display: -webkit-box;\n        overflow:hidden;\n        text-overflow:ellipsis;\n        text-align: justify;\n        max-height: 60px;\n        -webkit-line-clamp: 3;\n        -webkit-box-orient:vertical;\n        word-break:break-all;\n    }",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".date {\n        color:#999;\n        vertical-align:middle;\n    }",
  );
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(
    ".comments {\n        color:#3592b5;\n        margin-top:2px;\n        margin-left:1px;\n    }",
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-review-card-content"',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-review-card-date"',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-review-card-comments"',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("reviewCardContent: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'display: stylex.firstThatWorks("-webkit-box", "box")',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'reviewCardDate: { color: "#999", verticalAlign: "middle" }',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain(
    'reviewCardComments: { color: "#3592b5", marginTop: "2px", marginLeft: "1px" }',
  );
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain('className="info"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).not.toContain("outdated-label");
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    threads: [
      {
        authorId: 2,
        authorLabel: "Dev User",
        authorLoginId: "dev",
        comments: [],
        commitId: "abcdef1234567890",
        createdLabel: "Jul 1, 2026",
        endLine: null,
        id: 88,
        path: "",
        prevCommitId: "1234567890abcdef",
        startLine: null,
        state: "open",
      },
    ],
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  const reviewCard = page.locator("#reviewcards-open .review-card.open");
  const reviewCardContent = reviewCard.locator(
    '[data-stylex-owner="commit-detail-review-card-content"]',
  );
  const reviewCardDate = reviewCard.locator('[data-stylex-owner="commit-detail-review-card-date"]');
  const reviewCardComments = reviewCard.locator(
    '[data-stylex-owner="commit-detail-review-card-comments"]',
  );
  await expect(reviewCard).toBeVisible();
  await expect(reviewCardContent).toHaveCSS("display", "flow-root");
  await expect(reviewCardContent).toHaveCSS("overflow", "hidden");
  await expect(reviewCardContent).toHaveCSS("text-overflow", "ellipsis");
  await expect(reviewCardContent).toHaveCSS("text-align", "justify");
  await expect(reviewCardContent).toHaveCSS("max-height", "60px");
  await expect(reviewCardContent).toHaveCSS("-webkit-line-clamp", "3");
  await expect(reviewCardContent).toHaveCSS("-webkit-box-orient", "vertical");
  await expect(reviewCardContent).toHaveCSS("word-break", "break-all");
  await expect(reviewCardDate).toHaveCSS("color", "rgb(153, 153, 153)");
  await expect(reviewCardDate).toHaveCSS("vertical-align", "middle");
  await expect(reviewCardComments).toHaveCSS("color", "rgb(53, 146, 181)");
  await expect(reviewCardComments).toHaveCSS("margin-top", "2px");
  await expect(reviewCardComments).toHaveCSS("margin-left", "1px");
  await expect(reviewCard).toHaveCSS("display", "block");
  await expect(reviewCard).toHaveCSS("border", "1px solid rgb(221, 221, 221)");
  await expect(reviewCard).toHaveCSS("padding", "10px 10px 10px 15px");
  await expect(reviewCard).toHaveCSS("margin-bottom", "0px");
  await expect(reviewCard).toHaveCSS("border-radius", "0px 3px 3px 0px");
  await expect(reviewCard).toHaveCSS("box-shadow", "rgb(182, 218, 84) 5px 0px 0px 0px inset");
  const desktopCardBox = await reviewCard.boundingBox();
  expect(desktopCardBox).not.toBeNull();
  expect(desktopCardBox!.x).toBeGreaterThanOrEqual(0);
  expect(desktopCardBox!.x + desktopCardBox!.width).toBeLessThanOrEqual(1366);
  await reviewCard.hover();
  await expect(reviewCard).toHaveCSS("text-decoration-line", "none");
  await expect(reviewCard).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(reviewCard).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main#thread-88`,
  );
  await reviewCard.click();
  await expect(page).toHaveURL(/#thread-88$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(reviewCard).toBeVisible();
  await expect(reviewCard).toHaveCSS("display", "block");
  await expect(reviewCard).toHaveCSS("padding", "10px 10px 10px 15px");
  await expect(reviewCard).toHaveCSS("margin-bottom", "0px");
  const mobileCardBox = await reviewCard.boundingBox();
  expect(mobileCardBox).not.toBeNull();
  expect(mobileCardBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileCardBox!.x + mobileCardBox!.width).toBeLessThanOrEqual(390);
  await expect(reviewCard).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main#thread-88`,
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
  await expect(page.locator("#branches")).toBeVisible();
  await expect(page.locator("#branches")).toHaveAttribute("data-name", "branch");
  await expect(page.locator("#branches")).not.toHaveAttribute("data-activate");
  await expect(page.locator("#commit.diff-body.hide[data-commit-origin='true']")).toContainText(
    "Index: README.md",
  );
  expect(detailRequests).toEqual(["branch=trunk"]);
  expect(await readSvnCommitShellMetrics(page)).toEqual({
    branchActivate: null,
    branchClassName: "btn-group branches pull-right",
    branchFloat: "right",
    branchName: "branch",
    branchSelectedText: "trunk",
    branchTopNotBelowTabs: true,
    commitDiffHidden: true,
    commitInfoBackground: "rgba(0, 0, 0, 0)",
    commitInfoBorderTopWidth: "0px",
    commitInfoPadding: "0px",
    commitMessageDisplay: "block",
    commitMessageFontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    diffWrapMarginBottom: "20px",
    diffWrapOverflowX: "auto",
    diffWrapFillsCodeWrap: true,
  });
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      withCommentUploadForm(EXPECTED_SVN_COMMIT_BODY).replaceAll("__BASE_PATH__", basePath),
    ),
  );
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-toggle", "button");
  await expect(page.locator("#watch-button")).toHaveClass(/^ybtn\s*$/);
  await expect(page.locator("#watch-button")).toHaveText("Watch");
});

test("project SVN commit detail branch dropdown uses route-local state", async ({ page }) => {
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
  const branches = page.locator("#branches");
  const toggle = branches.locator(".dropdown-toggle");
  await expect(branches).toHaveClass("btn-group branches pull-right");
  await expect(branches).not.toHaveAttribute("data-activate");
  await expect(branches).toHaveAttribute("data-name", "branch");
  await expect(toggle).not.toHaveAttribute("data-toggle", "dropdown");
  await expect(branches.locator(".d-label")).toHaveText("trunk");
  await expect(branches.locator(".dropdown-menu li")).toHaveCount(2);
  await expect(branches.locator("li").nth(0)).toHaveAttribute("data-value", "trunk");
  await expect(branches.locator("li").nth(0)).toHaveAttribute("data-selected", "true");
  await expect(branches.locator("li").nth(0).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/trunk`,
  );
  await expect(branches.locator("li").nth(1)).toHaveAttribute("data-value", "branches/release");
  await expect(branches.locator("li").nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/branches%2Frelease`,
  );

  await page.evaluate(() => {
    const testWindow = window as Window &
      typeof globalThis & {
        __yonaBranchDropdownDocumentBubble?: boolean;
        __yonaSpaMarker?: string;
      };
    testWindow.__yonaSpaMarker = "commit-branch-dropdown";
    testWindow.__yonaBranchDropdownDocumentBubble = false;
    document.addEventListener(
      "click",
      (event) => {
        if ((event.target as Element | null)?.closest?.("#branches .dropdown-toggle")) {
          testWindow.__yonaBranchDropdownDocumentBubble = true;
        }
      },
      { once: true },
    );
  });
  const urlBeforeOpen = page.url();

  await toggle.click();
  await expect(branches).toHaveClass("btn-group branches pull-right open");
  expect(page.url()).toBe(urlBeforeOpen);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-branch-dropdown");
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __yonaBranchDropdownDocumentBubble?: boolean })
          .__yonaBranchDropdownDocumentBubble,
    ),
  ).toBe(false);

  await toggle.click();
  await expect(branches).toHaveClass("btn-group branches pull-right");
  expect(page.url()).toBe(urlBeforeOpen);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("commit-branch-dropdown");
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __yonaBranchDropdownDocumentBubble?: boolean })
          .__yonaBranchDropdownDocumentBubble,
    ),
  ).toBe(false);
  expect(detailRequests).toEqual(["branch=trunk"]);
});

async function readCommitDetailNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(
      "header[data-stylex-owner=global-gnb-outer]",
    );
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const missing = Object.entries({ form, header, scope, search })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected commit detail navbar metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const headerBox = header.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    const scopeBox = scope.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    return {
      formBottomWithinNavbar: formBox.bottom <= headerBox.bottom + 1,
      formRightWithinNavbar: formBox.right <= headerBox.right,
      formTopWithinNavbar: formBox.top >= headerBox.top,
      headerClassName: header.className,
      searchBottomWithinNavbar: searchBox.bottom <= headerBox.bottom + 1,
      searchRightWithinNavbar: searchBox.right <= headerBox.right,
      searchTopWithinNavbar: searchBox.top >= headerBox.top,
      scopeBottomWithinNavbar: scopeBox.bottom <= headerBox.bottom + 1,
      scopeTopWithinNavbar: scopeBox.top >= headerBox.top,
    };
  });
}

async function readCommitDiffShellMetrics(page: Page) {
  return page.evaluate(() => {
    const codediff = document.querySelector<HTMLElement>(".codediff-wrap");
    const showButton = document.querySelector<HTMLElement>(".btn-show-reviewcards");
    const diffs = document.querySelector<HTMLElement>(".diffs-wrap");
    const review = document.querySelector<HTMLElement>(".review-wrap");
    const reviewContainer = document.querySelector<HTMLElement>(".review-container");
    const commitInfo = document.querySelector<HTMLElement>(".diffs-wrap .commitInfo");
    const commitAuthor = document.querySelector<HTMLElement>(".commitAuthor");
    const shortMessage = document.querySelector<HTMLElement>(".commitMsg.short");
    const descMessage = document.querySelector<HTMLElement>(".commitMsg.desc");
    const commitIdWrap = document.querySelector<HTMLElement>(".commitId-wrap");
    const missing = Object.entries({
      codediff,
      commitAuthor,
      commitIdWrap,
      commitInfo,
      descMessage,
      diffs,
      review,
      reviewContainer,
      shortMessage,
      showButton,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected commit diff shell metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const codediffStyle = getComputedStyle(codediff);
    const commitAuthorStyle = getComputedStyle(commitAuthor);
    const commitIdWrapStyle = getComputedStyle(commitIdWrap);
    const commitInfoStyle = getComputedStyle(commitInfo);
    const descStyle = getComputedStyle(descMessage);
    const diffsStyle = getComputedStyle(diffs);
    const reviewContainerStyle = getComputedStyle(reviewContainer);
    const reviewStyle = getComputedStyle(review);
    const shortStyle = getComputedStyle(shortMessage);

    return {
      btnShowDisplay: getComputedStyle(showButton).display,
      codediffPosition: codediffStyle.position,
      commitAuthorFloat: commitAuthorStyle.cssFloat,
      commitAuthorMarginTop: commitAuthorStyle.marginTop,
      commitIdWrapDisplay: commitIdWrapStyle.display,
      commitIdWrapFontSize: commitIdWrapStyle.fontSize,
      commitIdWrapMargin: commitIdWrapStyle.margin,
      commitIdWrapPadding: commitIdWrapStyle.padding,
      commitInfoBackground: commitInfoStyle.backgroundColor,
      commitInfoBorderTopWidth: commitInfoStyle.borderTopWidth,
      commitInfoPadding: commitInfoStyle.padding,
      commitMsgDescFontFamily: descStyle.fontFamily,
      commitMsgDescMargin: descStyle.margin,
      commitMsgShortFontSize: shortStyle.fontSize,
      commitMsgShortWhiteSpace: shortStyle.whiteSpace,
      diffsDisplay: diffsStyle.display,
      diffsMarginRight: diffsStyle.marginRight,
      diffsPosition: diffsStyle.position,
      reviewContainerWidth: reviewContainerStyle.width,
      reviewDisplay: reviewStyle.display,
      reviewMinHeight: reviewStyle.minHeight,
      reviewPosition: reviewStyle.position,
      reviewRight: reviewStyle.right,
      reviewTop: reviewStyle.top,
      reviewWidth: reviewStyle.width,
    };
  });
}

async function commitIdFlowGeometry(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector<HTMLElement>(".commitId-wrap")!;
    const editor = document.querySelector<HTMLElement>("#comment-form .textarea-box")!;
    const upload = document.querySelector<HTMLElement>(
      "#comment-form .upload-wrap.content-footer",
    )!;
    const style = getComputedStyle(wrap);
    const editorBox = editor.getBoundingClientRect();
    const uploadBox = upload.getBoundingClientRect();
    return {
      display: style.display,
      fontSize: style.fontSize,
      margin: style.margin,
      uploadFollowsEditor: Math.abs(editorBox.bottom - uploadBox.top) < 0.01,
      wrapHeight: Math.round(wrap.getBoundingClientRect().height),
    };
  });
}

async function readSvnCommitShellMetrics(page: Page) {
  return page.evaluate(() => {
    const branches = document.querySelector<HTMLElement>("#branches");
    const selected = document.querySelector<HTMLElement>("#branches .d-label");
    const tabs = document.querySelector<HTMLElement>("#code-browse-wrap > .nav-tabs");
    const commitInfo = document.querySelector<HTMLElement>("#code-browse-wrap > .commitInfo");
    const commitMessage = document.querySelector<HTMLElement>("#code-browse-wrap > .commitMsg");
    const diffWrap = document.querySelector<HTMLElement>(".diff-wrap");
    const commitDiff = document.querySelector<HTMLElement>("#commit.diff-body");
    const missing = Object.entries({
      branches,
      commitDiff,
      commitInfo,
      commitMessage,
      diffWrap,
      selected,
      tabs,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected SVN commit shell metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const branchStyle = getComputedStyle(branches);
    const commitInfoStyle = getComputedStyle(commitInfo);
    const commitMessageStyle = getComputedStyle(commitMessage);
    const diffWrapStyle = getComputedStyle(diffWrap);
    const codeWrap = document.querySelector<HTMLElement>("#code-browse-wrap");
    const branchRect = branches.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();

    return {
      branchActivate: branches.getAttribute("data-activate"),
      branchClassName: branches.className,
      branchFloat: branchStyle.cssFloat,
      branchName: branches.dataset.name,
      branchSelectedText: selected.textContent?.trim(),
      branchTopNotBelowTabs: branchRect.top <= tabsRect.top,
      commitDiffHidden: commitDiff.classList.contains("hide"),
      commitInfoBackground: commitInfoStyle.backgroundColor,
      commitInfoBorderTopWidth: commitInfoStyle.borderTopWidth,
      commitInfoPadding: commitInfoStyle.padding,
      commitMessageDisplay: commitMessageStyle.display,
      commitMessageFontFamily: commitMessageStyle.fontFamily,
      diffWrapMarginBottom: diffWrapStyle.marginBottom,
      diffWrapOverflowX: diffWrapStyle.overflowX,
      diffWrapFillsCodeWrap:
        Math.round(diffWrap.getBoundingClientRect().width) ===
        Math.round(codeWrap?.getBoundingClientRect().width ?? -1),
    };
  });
}

async function blockReviewFormMetrics(page: Page) {
  return page.locator("#review-form").evaluate((form) => {
    const close = form.querySelector<HTMLButtonElement>(
      ".pull-right > button.ybtn.ybtn-default.ybtn-small",
    );
    const textarea = form.querySelector<HTMLTextAreaElement>(
      'textarea[data-editor-mode="code-review-body"]',
    );
    const upload = form.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const author = form.querySelector<HTMLElement>(".author-info-wrap .avatar-wrap.medium");

    return {
      authorAvatarVisible: Boolean(
        form.querySelector(".author-info-wrap .avatar-wrap.medium img")?.getClientRects().length,
      ),
      authorDataOriginalTitle: author?.getAttribute("data-original-title") ?? null,
      authorDataPlacement: author?.dataset.placement ?? null,
      authorTitle: author?.getAttribute("title") ?? null,
      closeButtonText: close?.textContent?.trim() ?? null,
      closeDataToggle: close?.dataset.toggle ?? null,
      display: window.getComputedStyle(form).display,
      editorMode: textarea?.dataset.editorMode ?? null,
      uploadResourceType: upload?.dataset.resourceType ?? null,
    };
  });
}

async function commentDeleteModalMetrics(page: Page) {
  return page.locator("#comment-delete-modal").evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop");
    const body = modal.querySelector<HTMLElement>(".modal-body");
    const confirm = modal.querySelector<HTMLButtonElement>("#comment-delete-confirm");
    const footer = modal.querySelector<HTMLElement>(".modal-footer");
    const header = modal.querySelector<HTMLElement>(".modal-header");
    const viewportWidth = document.documentElement.clientWidth;
    const width = Math.round(rect.width);

    return {
      backdropDisplay: backdrop ? window.getComputedStyle(backdrop).display : null,
      bodyDisplay: body ? window.getComputedStyle(body).display : null,
      confirmMethod: confirm?.dataset.requestMethod ?? null,
      confirmText: confirm?.textContent?.trim() ?? null,
      confirmUri: confirm?.dataset.requestUri ?? null,
      display: window.getComputedStyle(modal).display,
      dismissCount: modal.querySelectorAll('[data-dismiss="modal"]').length,
      footerTextAlign: footer ? window.getComputedStyle(footer).textAlign : null,
      headerDisplay: header ? window.getComputedStyle(header).display : null,
      left: Math.round(rect.left - (viewportWidth - width) / 2),
      noText:
        footer?.querySelector<HTMLButtonElement>("button.ybtn:last-child")?.textContent?.trim() ??
        null,
      title: header?.querySelector("h3")?.textContent?.trim() ?? null,
      top: Math.round((rect.top / window.innerHeight) * 100),
      width,
    };
  });
}

async function mockProjectCommitDetail(
  page: Page,
  detailRequests: string[],
  detailOverrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
  mutationRequests: Array<{ body: unknown; method: string; pathname: string }> = [],
) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({ session: null, user: null }),
    });
  });
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
  let currentWatching =
    typeof detailOverrides.isWatching === "boolean" ? detailOverrides.isWatching : false;
  await page.route("**/api/v1/projects/admin/sample/commit/abcdef1234567890**", async (route) => {
    const url = new URL(route.request().url());
    const request = route.request();
    const method = request.method();
    if (url.pathname.endsWith("/watch")) {
      currentWatching = method === "POST";
    }
    if (method === "GET") {
      detailRequests.push(url.searchParams.toString());
    } else {
      const postData = request.postData();
      mutationRequests.push({
        body: postData ? JSON.parse(postData) : null,
        method,
        pathname: url.pathname,
      });
    }
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
        isWatching: currentWatching,
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
        .filter((attr) => !isNormalizedRuntimeAttr(attr))
        .filter((attr) => !(attr.name === "class" && normalizeAttr(attr) === ""))
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter((token) => !isGeneratedStyleXToken(token))
          .join(" ")
          .trim();
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }

    function isNormalizedRuntimeAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "data-style-src" ||
        attr.name === "data-stylex-owner"
      );
    }

    function isGeneratedStyleXToken(token: string) {
      return /^-[\w-]+__styles\.[\w-]+$/u.test(token) || /^x[\w-]+$/u.test(token);
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    (input) => {
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
          .filter((attr) => !isNormalizedRuntimeAttr(attr))
          .filter((attr) => !(attr.name === "class" && normalizeAttr(attr) === ""))
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
        if (attr.name === "class") {
          return attr.value
            .split(/\s+/u)
            .filter((token) => !isGeneratedStyleXToken(token))
            .join(" ")
            .trim();
        }
        return attr.name === "style"
          ? attr.value.replace(/\s+/g, "").replace(/;$/u, "")
          : attr.value;
      }

      function isNormalizedRuntimeAttr(attr: Attr) {
        return (
          attr.name.startsWith("data-v-") ||
          attr.name === "alt" ||
          attr.name === "data-style-src" ||
          attr.name === "data-stylex-owner"
        );
      }

      function isGeneratedStyleXToken(token: string) {
        return /^-[\w-]+__styles\.[\w-]+$/u.test(token) || /^x[\w-]+$/u.test(token);
      }
    },
    withReactOwnedTabButtons(withLegacyMarkdownHelp(html)),
  );
}

test("project commit detail file header owns the legacy visible StyleX state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_CODE_DIFF_SOURCE).toContain("partial_diff");
  expect(LEGACY_FILE_DIFF_SOURCE).toContain('<div class="diff-partial-file">');
  expect(LEGACY_FILE_DIFF_SOURCE).toContain('<span class="filename" >');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".diff-partial-file {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding:5px 10px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("margin-right: 115px;");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-file-header"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain(
    'data-stylex-owner="commit-detail-file-header-filename"',
  );
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("diffPartialFile: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("diffPartialFilename: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('padding: "5px 10px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('marginRight: "115px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("color: commitDetailColors.commitText");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('fontSize: "13px"');

  await mockProjectCommitDetail(page, [], {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1 +1 @@
-old
+new`,
      },
    ],
  });

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

    const header = page.locator('[data-stylex-owner="commit-detail-file-header"]');
    const filename = page.locator('[data-stylex-owner="commit-detail-file-header-filename"]');
    await expect(header).toBeVisible();
    await expect(filename).toBeVisible();
    await expect(filename).toHaveText("src/main.rs");
    await expect(header).toHaveCSS("padding", "5px 10px");
    await expect(header).toHaveCSS("font-weight", "700");
    await expect(header).toHaveCSS("overflow", "hidden");
    await expect(header).toHaveCSS("white-space", "nowrap");
    await expect(header).toHaveCSS("word-break", "break-all");
    await expect(header).toHaveCSS("margin-right", "115px");
    await expect(filename).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(filename).toHaveCSS("font-size", "13px");
    expect(
      await header.evaluate((element) => element.getBoundingClientRect().width),
    ).toBeGreaterThan(0);

    const links = page.locator("#src-main-rs .diff-partial-commit-id a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/1234567890abcdef/src/main.rs`,
    );
    await expect(links.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/abcdef1234567890/src/main.rs`,
    );
    await expect(links.nth(0)).toHaveAttribute("target", "_blank");
    await expect(links.nth(1)).toHaveAttribute("target", "_blank");
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});

test("project commit detail partial-filediff commit ids own the legacy visible StyleX state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_FILE_DIFF_SOURCE).toContain('<div class="diff-partial-commit">');
  expect(LEGACY_FILE_DIFF_SOURCE).toContain('<div class="diff-partial-commit-id">');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".diff-partial-commit {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("float:left;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".diff-partial-commit-id {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("padding:5px 2px;");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("width:52px;");
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-file-commit"');
  expect(COMMIT_DETAIL_ROUTE_SOURCE).toContain('data-stylex-owner="commit-detail-file-commit-id"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('diffPartialCommit: { float: "left" }');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain("diffPartialCommitId: {");
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('padding: "5px 2px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('width: "52px"');
  expect(COMMIT_DETAIL_STYLEX_SOURCE).toContain('textAlign: "center"');

  await mockProjectCommitDetail(page, [], {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1 +1 @@
-old
+new`,
      },
    ],
  });

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

    const commit = page.locator('[data-stylex-owner="commit-detail-file-commit"]');
    const ids = page.locator('[data-stylex-owner="commit-detail-file-commit-id"]');
    await expect(commit).toBeVisible();
    await expect(ids).toHaveCount(2);
    await expect(ids.nth(0)).toHaveText("1234567");
    await expect(ids.nth(1)).toHaveText("abcdef1");
    await expect(commit).toHaveCSS("float", "left");
    for (const id of [ids.nth(0), ids.nth(1)]) {
      await expect(id).toHaveCSS("float", "left");
      await expect(id).toHaveCSS("padding", "5px 2px");
      await expect(id).toHaveCSS("font-weight", "700");
      await expect(id).toHaveCSS("border-right", "1px solid rgb(187, 187, 187)");
      await expect(id).toHaveCSS("width", "52px");
      await expect(id).toHaveCSS("text-align", "center");
    }

    const links = page.locator("#src-main-rs .diff-partial-commit-id a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/1234567890abcdef/src/main.rs`,
    );
    await expect(links.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/abcdef1234567890/src/main.rs`,
    );
    await expect(links.nth(0)).toHaveAttribute("title", "1234567890abcdef");
    await expect(links.nth(1)).toHaveAttribute("title", "abcdef1234567890");
    await expect(links.nth(0)).toHaveAttribute("target", "_blank");
    await expect(links.nth(1)).toHaveAttribute("target", "_blank");
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
