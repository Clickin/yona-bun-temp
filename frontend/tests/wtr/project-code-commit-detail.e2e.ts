import { readFileSync } from "../wtr-compat.ts";
const defaultAvatarResponse = await fetch("/tests/src/assets/legacy/default-avatar-34.png");
if (!defaultAvatarResponse.ok) throw new Error("Cannot load legacy default avatar fixture");
const defaultAvatarUrl = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(await defaultAvatarResponse.arrayBuffer())))}`;

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

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
  .replace(/<\/div>\s*$/u, "</div>")
  // F6 copy-fix-current-dom: the shared markdown-help anchors each content
  // item with id="markdown-help-<target>" (markdownHelpContentId).
  .replace(
    /<li class="markdown-help-item (markdown\w+)">/gu,
    '<li class="markdown-help-item $1" id="markdown-help-$1">',
  )
  // F6 copy-fix-current-dom: the shared markdown-help renders each nav choice
  // as a React button (markdown-help-nav-button, aria-controls/aria-expanded);
  // the legacy template's bare <li> nav items are stale (see
  // -legacy-markdown-help.tsx MarkdownHelpNav).
  .replace(/<li class="help-nav">([^<]+)<\/li>/gu, (_match, label: string) => {
    const target: Record<string, string> = {
      Header: "markdownHeaders",
      "Text Style": "markdownStyling",
      Link: "markdownLinks",
      List: "markdownLists",
      Checklist: "markdownTaskList",
      Image: "markdownImages",
      Blockquote: "markdownBlockquotes",
      Code: "markdownCodes",
      Table: "markdownTables",
      "Short Link": "markdownShortLinks",
    };
    return `<li class="help-nav"><button aria-controls="markdown-help-${
      target[label] ?? ""
    }" aria-expanded="false" class="markdown-help-nav-button" type="button">${label}</button></li>`;
  });

function withLegacyMarkdownHelp(html: string) {
  return html.replaceAll(
    '<div class="tab-content"><div id="edit-',
    `<div class="tab-content">${LEGACY_MARKDOWN_HELP}<div id="edit-`,
  );
}

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

const EXPECTED_COMMENT_DELETE_MODAL = `
<div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div></div>
`;

const EXPECTED_FILE_DIFF = `<div id="src-main-rs" class="diff-partial-outer"><div class="diff-partial-inner"><div class="diff-partial-meta"><div class="diff-partial-commit"><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/1234567890abcdef/src/main.rs" title="1234567890abcdef" target="_blank">1234567</a></div><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/abcdef1234567890/src/main.rs" title="abcdef1234567890" target="_blank">abcdef1</a></div></div><div class="diff-partial-file"><span class="filename">src/main.rs</span></div></div><div class="diff-partial-code" data-hashcode="src/main.rs"><div class="patch-header"><div class="path">--- src/main.rs</div><div class="path">+++ src/main.rs</div></div><table class="diff-container show-comments" data-path-a="src/main.rs" data-path-b="src/main.rs" data-commit-a="1234567890abcdef" data-commit-b="abcdef1234567890" data-file-path="src/main.rs"><tbody><tr class="range"><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="linenum"><div class="line-number" data-line-num="..."><span class="hidden">...</span></div></td><td class="hunk">@@ -1,2 +1,3 @@</td></tr><tr class="context" data-line="1" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="linenum"><div class="line-number" data-line-num="1"></div><span class="hidden">1</span></td><td class="code"><pre class="diff-partial-codeline"> fn main() {</pre></td></tr><tr class="remove" data-line="2" data-side="A"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="linenum"><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="code"><pre class="diff-partial-codeline">-    println!("old");</pre></td></tr><tr class="add" data-line="2" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="2"></div><span class="hidden">2</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("new");</pre></td></tr><tr class="add" data-line="3" data-side="B"><td class="linenum"><i class="yobicon-comments"></i><div class="line-number" data-line-num=""></div><span class="hidden"></span></td><td class="linenum"><div class="line-number" data-line-num="3"></div><span class="hidden">3</span></td><td class="code"><pre class="diff-partial-codeline">+    println!("again");</pre></td></tr></tbody></table></div></div></div>`;

const EXPECTED_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-77" data-state="open" class="comment-thread-wrap open" data-range-path="src/main.rs" data-range-startline="2" data-range-endline="2"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-501" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="/avatars/dev.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-501" title="2000-07-01 12:00:00 AM">2000-07-01</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-77" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-77" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div id="edit-thread-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-77" markdown="true"></textarea></div></div><div id="preview-thread-77" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_A_SIDE_INLINE_THREAD_ROW = `<tr class="comments board-comment-wrap" data-commit-id="abcdef1234567890"><td colspan="3"><div id="thread-78" data-state="open" class="comment-thread-wrap open" data-range-path="src/main.rs" data-range-startside="A" data-range-startline="2" data-range-startcolumn="5" data-range-endside="A" data-range-endline="2" data-range-endcolumn="18"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-post2"></i></button></div><div class="thread-header"><span class="badge state open">Open</span><button type="button" class="ybtn ybtn-default ybtn-small btn-thread-minimize"><i class="yobicon-maximize"></i></button></div><ul class="comments"><li id="comment-502" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="${defaultAvatarUrl}" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-502" title="2000-07-01 12:00:00 AM">2000-07-01</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>Old line <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="78"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-78" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-78" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div id="edit-thread-78" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-78" markdown="true"></textarea></div></div><div id="preview-thread-78" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></td></tr>`;

const EXPECTED_NON_RANGED_THREAD = `<div id="thread-88" class="comment-thread-wrap open"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-comments"></i></button></div><ul class="comments"><li id="comment-601" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev User"><img src="/avatars/dev.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev User"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main#comment-601" title="2000-07-01 12:00:00 AM">2000-07-01</a></span><span class="edit pull-right"><button class="btn-transparent pull-right close"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="88"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-88" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-88" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div id="edit-thread-88" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-88" markdown="true"></textarea></div></div><div id="preview-thread-88" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div>`;

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

const THREAD_REPLY_AUTHOR_INFO = `<div class="author-info-wrap pull-left hide-in-mobile"><div class="author-info"><a href="__BASE_PATH__/admin" class="avatar-wrap medium" title="Site Admin"><img src="${defaultAvatarUrl}" width="32" height="32"></a></div></div>`;

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

  return `<div id="comment-editform-${commentId}" class="comment-update-form"><form action="${basePath}/comments/${commentId}" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="${commentId}"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-${commentId}" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-${commentId}" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div id="edit-${commentId}" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" id="editor-contents-${commentId}" markdown="true">${markdown}</textarea></div></div><div id="preview-${commentId}" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-${commentId}" class="file-upload__label ybtn">File upload</label><input id="upload-${commentId}" class="file-upload__input" type="file" name="filePath" multiple></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="${commentId}">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-${commentId}"></div><div class="attachment-files">${attachmentMarkers}</div><div id="upload-${commentId}" data-resourcetype="NONISSUE_COMMENT" data-resourceid="${commentId}"></div></div></form></div>`;
}

test("project commit detail keeps the frozen legacy commit-id flow geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCommitDetail(page, [], {
    commit: {
      authorAvatarUrl: "",
      authorDate: "2000-07-01T00:00:00",
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
    // F5 41 — yona-original/app/assets/stylesheets/less/_page.less:4595-4611:
    // .commitId { margin-top:5px } + .commitId-wrap { padding:10px 5px } compute
    // a 41px wrap box at 1366x900; the earlier 39px pin predates wave-33's
    // stray-float removal and the app.css cascade drift family is gone.
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

test("project commit detail diff lines preserve legacy side hooks", async ({ page }) => {
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

  await page.setViewportSize({ width: 1366, height: 900 });
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

test("project commit detail browser title follows legacy project layout", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests);

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
            createdLabel: "2000-07-01T00:00:00",
            id: 603,
            threadId: 89,
            viaEmail: true,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
        endLine: null,
        id: 89,
        path: "",
        prevCommitId: "1234567890abcdef",
        startLine: null,
        state: "open",
      },
    ],
  });

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

test("commit editor uses legacy tab geometry, previews drafts, and inserts checklists without submitting", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests: Array<{ body: unknown; method: string; pathname: string }> = [];
  await mockProjectCommitDetail(page, [], {}, {}, requests);
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  const form = page.locator("#comment-form");
  const textarea = form.locator("textarea[name='contents']");
  const edit = form.getByRole("button", { name: "Edit", exact: true });
  const preview = form.getByRole("button", { name: "Preview", exact: true });
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(edit).toHaveCSS("display", "block");
    await expect(edit).toHaveCSS("line-height", "20px");
    await expect(edit).toHaveCSS("padding-top", "4px");
    await expect(edit).toHaveCSS("padding-left", width === 390 ? "5px" : "15px");
    const geometry = await form.evaluate((node) => {
      const tabs = node.querySelector(".nav-tabs")!;
      const [edit, preview] = Array.from(tabs.querySelectorAll(":scope > li > button"));
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
  await textarea.fill("Review **draft**");
  await preview.click();
  await expect(form.locator(".markdown-preview strong")).toHaveText("draft");
  await edit.click();
  await textarea.evaluate((node) => (node as HTMLTextAreaElement).setSelectionRange(0, 0));
  await form.getByRole("button", { name: "Add checklist", exact: true }).click();
  await expect(textarea).toHaveValue("Review **draft**\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C");
  await preview.click();
  await expect(form.locator(".markdown-preview input[type='checkbox']")).toHaveCount(3);
  expect(requests).toEqual([]);
  const avatar = page.locator(".commitAuthor img");
  await expect(avatar).toHaveAttribute("src", defaultAvatarUrl);
  expect(
    await avatar.evaluate(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      return image.naturalWidth;
    }),
  ).toBe(34);
});
test("commit block reviews submit JSON ranges and attachments, retain failed drafts, and reject cross-file selection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patch = [
    "diff --git a/src/main.rs b/src/main.rs",
    "--- a/src/main.rs",
    "+++ b/src/main.rs",
    "@@ -1,1 +1,3 @@",
    " fn main() {",
    '+    println!("new");',
    "+}",
  ].join("\n");
  const threads: unknown[] = [];
  const detail = {
    commit: {
      commitId: "abcdef1234567890",
      message: "Review changes",
      shortMessage: "Review changes",
    },
    parentCommit: { commitId: "1234567890abcdef" },
    files: [
      { path: "src/main.rs", patch },
      {
        path: "src/other.rs",
        patch: patch.replaceAll("src/main.rs", "src/other.rs"),
      },
    ],
    threads,
    permissions: { canComment: true, canUpdateThreadState: true },
  };
  const requests: unknown[] = [];
  await mockProjectCommitDetail(page, [], detail);
  const attachment = {
    id: 209,
    mimeType: "text/plain",
    name: "review.txt",
    size: 6,
    url: `${basePath}/files/209`,
  };
  await page.route("**/files", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("test-csrf-token");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(attachment) });
  });
  await page.route(
    "**/api/v1/projects/admin/sample/commit/abcdef1234567890/comments",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().headers()["content-type"]).toBe("application/json");
      expect(route.request().headers()["x-csrf-token"]).toBe("test-csrf-token");
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
        id: 210,
        state: "open",
        path: "src/main.rs",
        commitId: "abcdef1234567890",
        prevCommitId: "1234567890abcdef",
        startLine: 2,
        startColumn: 0,
        startSide: "B",
        endLine: 3,
        endColumn: 2,
        endSide: "B",
        createdLabel: "Sep 18, 2026",
        comments: [
          {
            id: 211,
            authorLoginId: "admin",
            authorLabel: "Site Admin",
            contentsMarkdown: "Selected **review**",
            attachments: [attachment],
            createdLabel: "Sep 18, 2026",
          },
        ],
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(detail) });
    },
  );
  const path = `${basePath}/admin/sample/commit/abcdef1234567890?branch=main`;
  await page.goto(path);
  await page.locator("#editor-contents-comment").fill("Keep this general draft");
  await page.evaluate(() => {
    const first = document.querySelector(".diff-container .add pre")!.firstChild!;
    const last = document
      .querySelectorAll(".diff-container")[1]!
      .querySelector(".add pre")!.firstChild!;
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(last, 2);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.locator(".diff-body").dispatchEvent("mouseup");
  await expect(page.locator(".btnPop .ybtn")).toBeHidden();
  await page.evaluate(() => {
    const lines = document.querySelectorAll(".diff-container")[0]!.querySelectorAll(".add pre");
    const range = document.createRange();
    range.setStart(lines[0]!.firstChild!, 0);
    range.setEnd(lines[1]!.firstChild!, 2);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.locator(".diff-body").dispatchEvent("mouseup");
  await page.locator(".btnPop .ybtn").click();
  const form = page.locator("#review-form");
  const textarea = form.locator("textarea[name='contents']");
  await form.locator("button[type='submit']").click();
  await expect(form.locator("[role='alert']")).toBeVisible();
  expect(requests).toEqual([]);
  await textarea.fill("Selected **review**");
  await form.locator("button[type='submit']").click();
  await expect(form.locator("[role='alert']")).toHaveText("Review denied");
  await expect(textarea).toHaveValue("Selected **review**");
  await expect(form).toBeVisible();
  await form.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from("review"),
    mimeType: "text/plain",
    name: "review.txt",
  });
  await form.locator("button[type='submit']").click();
  await expect(form).toBeHidden();
  await expect(textarea).toHaveValue("");
  await expect(page.locator("#comment-211 .comment-body")).toHaveText("Selected review");
  await expect(page.locator("#editor-contents-comment")).toHaveValue("Keep this general draft");
  expect(requests).toEqual(
    [[], [209]].map((attachmentIds) => ({
      attachmentIds,
      contentsMarkdown: "Selected **review**",
      path: "src/main.rs",
      prevCommitId: "1234567890abcdef",
      startLine: 2,
      startColumn: 0,
      startSide: "B",
      endLine: 3,
      endColumn: 2,
      endSide: "B",
    })),
  );
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/commit/abcdef1234567890\\?branch=main$`),
  );
  await page.goto(path);
  await expect(page.locator("#comment-211 .comment-body")).toHaveText("Selected review");
  await expect(page.locator("#thread-210")).toHaveAttribute("data-range-startcolumn", "0");
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
  // F6 copy-fix-current-dom: the app owns the footer floats via Style
  // (footerListRight, pinned by "submits watch and comment mutations through
  // legacy controls") and intentionally drops the legacy pull-right utility
  // class; re-point the legacy selector at the route-owned element.
  await expect(page.locator('[data-owner="commit-detail-footer-list"]')).toHaveAttribute(
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
  // F5 gnb-outer — yona-original/app/views/common/navbar.scala.html:37
  // (<header class="gnb-outer @if(project != null || org != null) {project-header}">):
  // the shared GNB renders the legacy gnb-outer class on project routes; the
  // earlier negative pin predates the GNB class restoration.
  await expect(page.locator("[data-owner=global-gnb-outer]")).toHaveClass(/\bgnb-outer\b/u);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  // bucket-3: app re-added legacy classes (matches legacy navbar.scala.html:105).
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
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
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(commitUrl);

  expect(await readCommitDetailNavbarMetrics(page)).toEqual({
    formBottomWithinNavbar: true,
    formRightWithinNavbar: true,
    formTopWithinNavbar: true,
    // F5 gnb-outer — yona-original/app/views/common/navbar.scala.html:37: the
    // shared GNB keeps the legacy gnb-outer class on project routes.
    headerClassName: "gnb-outer",
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
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
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
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page).toHaveURL(commitUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(2).click();
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
  await expect(page.locator('[data-owner="commit-detail-footer-list"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main`,
  );
  await expect(page.locator("#watch-button")).toHaveClass(/\bpull-left\b/u);
  await expect(page.locator('[data-owner="commit-detail-footer-list"]')).toHaveClass(
    /\bpull-right\b/u,
  );
  await expect(page.locator(".non-ranged-threads-wrap > .comment-thread-wrap")).toHaveCount(0);
  await expect(page.locator(".commitAuthor > span.avatar-wrap.smaller")).toHaveCount(1);
  const emptyDiscussionOrder = await page.evaluate(() => {
    const diffs = document.querySelector(".diffs-wrap")!;
    const discussion = diffs.querySelector(":scope > .board-comment-wrap")!;
    const diff = diffs.querySelector(":scope > .diff-body")!;
    const form = discussion.querySelector(":scope > #comment-form")!;
    return {
      diffFollowsInfo: diffs.querySelector(".commitInfo")!.nextElementSibling === diff,
      discussionFollowsDiff: diff.nextElementSibling === discussion,
      formFollowsThreads:
        discussion.querySelector(".non-ranged-threads-wrap")!.nextElementSibling === form,
      discussionTop: discussion.getBoundingClientRect().top,
      diffBottom: diff.getBoundingClientRect().bottom,
    };
  });
  expect(emptyDiscussionOrder.diffFollowsInfo).toBe(true);
  expect(emptyDiscussionOrder.discussionFollowsDiff).toBe(true);
  expect(emptyDiscussionOrder.formFollowsThreads).toBe(true);
  expect(emptyDiscussionOrder.discussionTop).toBeGreaterThanOrEqual(
    emptyDiscussionOrder.diffBottom,
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
    commitAuthorAgoColor: "rgb(187, 187, 187)",
    commitAuthorAgoMarginLeft: "5px",
    commitAuthorAvatarMarginRight: "5px",
    commitIdColor: "rgb(81, 170, 204)",
    commitIdFontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    commitIdMarginTop: "5px",
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
  await expect(page.locator(".commitAuthor .ago")).toHaveText("2000-07-01");
  await expect(page.locator(".commitAuthor .ago")).toHaveAttribute(
    "title",
    "2000-07-01 12:00:00 AM",
  );
  await expect(page.locator(".review-container")).toHaveClass(/affix-top/);
  expect(await canonicalize(page, "#comment-delete-modal")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_COMMENT_DELETE_MODAL.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project commit detail affixes and collapses the legacy review-card rail without navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    files: [
      {
        path: "long.txt",
        patch: [
          "--- /dev/null",
          "+++ b/long.txt",
          "@@ -0,0 +1,100 @@",
          ...Array.from({ length: 100 }, (_, index) => `+line ${index + 1}`),
        ].join("\n"),
      },
    ],
  });

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
  const reviewContainer = page.locator(".review-container");
  await expect(reviewContainer).toHaveCSS("position", "relative");
  await page.evaluate(() => {
    const rail = document.querySelector(".review-wrap")!;
    window.scrollTo(0, rail.getBoundingClientRect().top + window.scrollY + 100);
  });
  await expect(reviewContainer).toHaveCSS("position", "fixed");
  await expect(reviewContainer).toHaveCSS("top", "10px");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(reviewContainer).toHaveCSS("position", "relative");

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

  await expect(popButton).toHaveCount(1);
  await expect(popButton).toBeHidden();
  await expect(reviewForm).toBeHidden();
  await expect(reviewForm).toHaveAttribute("data-owner", "commit-detail-review-form");
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
      authorDate: "2000-07-01T00:00:00",
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
  const avatarBox = await authorAvatar.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  expect(avatarBox).toEqual({ width: 20, height: 20 });
  expect(detailRequests).toEqual(["branch=main"]);
});

test("project commit detail Batch 756 owns Git metadata with Style", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await mockProjectCommitDetail(page, [], {
    commit: {
      authorAvatarUrl: "/avatars/dev.png",
      authorDate: "2000-07-01T00:00:00",
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

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 1366) {
      await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
    }

    const info = page.locator('[data-owner="commit-detail-info"]');
    const author = page.locator('[data-owner="commit-detail-author"]');
    const ago = page.locator('[data-owner="commit-detail-author-ago"]');
    const avatar = page.locator('[data-owner="commit-detail-author-avatar"]');
    const idWrap = page.locator('[data-owner="commit-detail-id-wrap"]');
    const id = page.locator('[data-owner="commit-detail-id"]');
    await expect(info).toBeVisible();
    await expect(author).toBeVisible();
    await expect(ago).toHaveText("2000-07-01");
    await expect(avatar).toBeVisible();
    await expect(page.locator(".commitAuthor > strong")).toHaveText("Dev Author");
    await expect(id).toHaveText("@abcdef1234567890");
    await expect(author).toHaveCSS("float", "right");
    await expect(author).toHaveCSS("margin-top", "5px");
    await expect(ago).toHaveCSS("margin-left", "5px");
    await expect(ago).toHaveCSS("color", "rgb(187, 187, 187)");
    await expect(avatar).toHaveCSS("margin-right", "5px");
    await expect(idWrap).toHaveCSS("padding", "10px 5px");
    await expect(id).toHaveCSS("color", "rgb(81, 170, 204)");
    await expect(id).toHaveCSS("margin-top", "5px");
    await expect(id).toHaveCSS(
      "font-family",
      'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    );

    const geometry = await page.evaluate(() => {
      const read = (owner: string) => {
        const element = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
        if (!element) throw new Error(`Missing ${owner}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          height: box.height,
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width,
        };
      };
      const infoBox = read("commit-detail-info");
      const authorBox = read("commit-detail-author");
      const idWrapBox = read("commit-detail-id-wrap");
      const idBox = read("commit-detail-id");
      return {
        authorWithinInfo: authorBox.left >= infoBox.left && authorBox.right <= infoBox.right + 1,
        authorHeight: authorBox.height,
        idStartsWithinWrap: idBox.left >= idWrapBox.left,
        idWrapHeight: idWrapBox.height,
        infoHeight: infoBox.height,
      };
    });
    expect(geometry.infoHeight).toBeGreaterThan(0);
    expect(geometry.authorHeight).toBeGreaterThan(0);
    expect(geometry.idWrapHeight).toBeGreaterThan(0);
    expect(geometry.authorWithinInfo).toBe(true);
    expect(geometry.idStartsWithinWrap).toBe(true);
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});

test("project commit detail renders no-author commit with legacy anonymous author copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const detailRequests: string[] = [];
  await mockProjectCommitDetail(page, detailRequests, {
    commit: {
      authorDate: "2000-07-01T00:00:00",
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
  await expect(page.locator(".commitAuthor > .avatar-wrap")).toHaveCount(0);
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
  await expect(page.locator("#watch-button")).toHaveClass(/ybtn/);
  await expect(page.locator("#watch-button")).toHaveClass(/\bpull-left\b/u);
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  const watch = page.locator('[data-owner="commit-detail-footer-watch"]');
  const list = page.locator('[data-owner="commit-detail-footer-list"]');
  await expect(watch).toHaveCSS("float", "left");
  await expect(list).toHaveCSS("float", "right");
  await expect(list).toHaveClass(/\bpull-right\b/u);
  await expect(list).toHaveText("List");
  await expect(list).toHaveAttribute("href", `${basePath}/admin/sample/commits/main`);
  const footerMetrics = await page.evaluate(() => {
    const watch = document.querySelector<HTMLElement>('[data-owner="commit-detail-footer-watch"]');
    const list = document.querySelector<HTMLElement>('[data-owner="commit-detail-footer-list"]');
    if (!watch || !list || !watch.parentElement) return null;
    const parent = watch.parentElement;
    const watchBox = watch.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      listIndex: Array.from(parent.children).indexOf(list),
      listRight: listBox.right,
      parentRight: parent.getBoundingClientRect().right,
      watchIndex: Array.from(parent.children).indexOf(watch),
      watchLeft: watchBox.left,
      parentLeft: parent.getBoundingClientRect().left,
    };
  });
  expect(footerMetrics).not.toBeNull();
  expect(footerMetrics!.watchIndex).toBeLessThan(footerMetrics!.listIndex);
  expect(footerMetrics!.watchLeft).toBeGreaterThanOrEqual(footerMetrics!.parentLeft);
  expect(footerMetrics!.listRight).toBeLessThanOrEqual(footerMetrics!.parentRight + 1);
  expect(footerMetrics!.documentWidth).toBeLessThanOrEqual(1366);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFooterMetrics = await page.evaluate(() => {
    const watch = document.querySelector<HTMLElement>('[data-owner="commit-detail-footer-watch"]');
    const list = document.querySelector<HTMLElement>('[data-owner="commit-detail-footer-list"]');
    if (!watch || !list) return null;
    const parentBox = watch.parentElement?.getBoundingClientRect();
    const watchBox = watch.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    return parentBox
      ? {
          documentWidth: document.documentElement.scrollWidth,
          listRight: listBox.right,
          parentRight: parentBox.right,
          watchLeft: watchBox.left,
          parentLeft: parentBox.left,
        }
      : null;
  });
  expect(mobileFooterMetrics).not.toBeNull();
  expect(mobileFooterMetrics!.watchLeft).toBeGreaterThanOrEqual(mobileFooterMetrics!.parentLeft);
  expect(mobileFooterMetrics!.listRight).toBeLessThanOrEqual(mobileFooterMetrics!.parentRight + 1);
  expect(mobileFooterMetrics!.documentWidth).toBeLessThanOrEqual(390);
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
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
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

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
  await expect(page.locator(".diff-partial-outer#src-main-rs")).toBeVisible();
  await expect(page.locator('[data-owner="commit-detail-diff-stat-bar"]')).toHaveCount(0);
  await expect(page.locator("#src-main-rs .diff-partial-inner > button")).toHaveCount(0);
  const fileOrder = await page.locator("#src-main-rs .diff-partial-inner").evaluate((element) => {
    const meta = element.querySelector(":scope > .diff-partial-meta")!;
    const code = element.querySelector(":scope > .diff-partial-code")!;
    return {
      metaFirst: element.firstElementChild === meta,
      codeFollowsMeta: meta.nextElementSibling === code,
      metaBottom: meta.getBoundingClientRect().bottom,
      codeTop: code.getBoundingClientRect().top,
    };
  });
  expect(fileOrder.metaFirst).toBe(true);
  expect(fileOrder.codeFollowsMeta).toBe(true);
  expect(Math.abs(fileOrder.codeTop - fileOrder.metaBottom)).toBeLessThanOrEqual(1);
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
      const commentIcon = row.querySelector<HTMLElement>(
        '[data-owner="commit-detail-diff-line-comment-icon"]',
      )!;
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
        commentIcon: {
          position: getComputedStyle(commentIcon).position,
          cursor: getComputedStyle(commentIcon).cursor,
          opacity: getComputedStyle(commentIcon).opacity,
          marginLeft: getComputedStyle(commentIcon).marginLeft,
          width: getComputedStyle(commentIcon).width,
          marginTop: getComputedStyle(commentIcon).marginTop,
          count: row.querySelectorAll('[data-owner="commit-detail-diff-line-comment-icon"]').length,
          lineNumberContained:
            lineNumber.getBoundingClientRect().right <=
              lineNumberCell.getBoundingClientRect().right &&
            lineNumber.getBoundingClientRect().left >= lineNumberCell.getBoundingClientRect().left,
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
      commentIcon: {
        position: "absolute",
        cursor: "pointer",
        opacity: "0",
        marginLeft: "-84px",
        width: "25px",
        marginTop: "2px",
        count: 1,
        lineNumberContained: true,
      },
    });
    await expect(page.locator('[data-owner="commit-detail-diff-line-comment-icon"]')).toHaveCount(
      2,
    );
    expect(
      await page
        .locator('[data-owner="commit-detail-diff-line-comment-icon"]')
        .first()
        .getAttribute("style"),
    ).toBeNull();
  }
  expect(detailRequests).toEqual(["branch=main"]);
  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(0);
});

test("project commit detail owns diff-body font family", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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

  await mockProjectCommitDetail(page, []);
  const diffBody = page.locator('[data-owner="commit-detail-diff-body-layout"]');

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

test("project commit detail owns legacy file-mode binary styling with fallback off", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCommitDetail(page, [], {
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

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);
    const binaryCell = page.locator('#script-run-sh [data-owner="commit-detail-diff-is-binary"]');
    await expect(binaryCell).toBeVisible();
    await expect(binaryCell).toHaveClass(/isBinary/);
    await expect(binaryCell).toHaveText("File mode has changed");
    await expect(binaryCell).toHaveCSS("color", "rgb(187, 187, 187)");
    await expect(binaryCell).toHaveCSS("text-shadow", "rgb(255, 255, 255) -1px -1px 0px");
    await expect(binaryCell).toHaveCSS("padding", "5px 10px");
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }
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
            createdLabel: "2000-07-01T00:00:00",
            id: 501,
            threadId: 77,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
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
  const threadActions = page.locator('[data-owner="commit-detail-thread-actions"]');
  const assertBadgeMetrics = async () => {
    await expect(thread).toHaveAttribute("data-owner", "commit-detail-thread-shell");
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

test("project commit detail folds closed ranged threads with frozen Style geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
            createdLabel: "2000-07-01T00:00:00",
            id: 504,
            threadId: 79,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
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
            createdLabel: "2000-07-01T00:00:00",
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
              createdLabel: "2000-07-01T00:00:00",
              id: 501,
              threadId: 77,
              viaEmail: false,
            },
          ],
          commitId: "abcdef1234567890",
          createdLabel: "2000-07-01T00:00:00",
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
    "data-owner",
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

test("project commit detail owns the emitted inline comment row, cell, and nested comment item", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await mockProjectCommitDetail(page, [], {
    files: [
      {
        path: "src/main.rs",
        patch: `diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdef1 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1 +1,2 @@
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
            contentsMarkdown: "Inline **note**",
            createdLabel: "2000-07-01T00:00:00",
            id: 501,
            threadId: 77,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
        endLine: 2,
        id: 77,
        path: "src/main.rs",
        prevCommitId: "1234567890abcdef",
        startLine: 2,
        state: "open",
      },
    ],
  });

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=main`);

    const row = page.locator('[data-owner="commit-detail-inline-comment-row"]');
    const cell = page.locator('[data-owner="commit-detail-inline-comment-cell"]');
    const item = page.locator('[data-owner="commit-detail-inline-comment-item"]');
    await expect(row).toBeVisible();
    await expect(cell).toBeVisible();
    await expect(item).toBeVisible();
    expect(await item.getAttribute("style")).toBeNull();
    await expect(row).toHaveClass(/comments/);
    await expect(row).toHaveClass(/board-comment-wrap/);
    await expect(row).toHaveCSS("display", "table-row");
    await expect(cell).toHaveCSS("padding", "0px");
    await expect(item).toHaveCSS("max-width", "1150px");
    await expect(row).toContainText("Inline note");
    await expect(page.locator("#thread-77")).toBeVisible();

    const geometry = await item.evaluate((element) => {
      const itemBox = element.getBoundingClientRect();
      const rowBox = element.closest("tr")!.getBoundingClientRect();
      const cellBox = element.closest("td")!.getBoundingClientRect();
      return {
        cellHeight: cellBox.height,
        cellLeft: cellBox.left,
        cellRight: cellBox.right,
        cellWidth: cellBox.width,
        itemBottom: itemBox.bottom,
        itemLeft: itemBox.left,
        itemRight: itemBox.right,
        itemTop: itemBox.top,
        itemWidth: itemBox.width,
        rowHeight: rowBox.height,
        rowWidth: rowBox.width,
      };
    });
    expect(geometry.itemWidth).toBeLessThanOrEqual(1150);
    expect(geometry.itemLeft).toBeGreaterThanOrEqual(geometry.cellLeft);
    expect(geometry.itemRight).toBeLessThanOrEqual(geometry.cellRight + 1);
    expect(geometry.itemBottom).toBeGreaterThan(geometry.itemTop);
    expect(geometry.rowWidth).toBeGreaterThan(0);
    expect(geometry.rowHeight).toBeGreaterThan(0);
    expect(geometry.cellWidth).toBeCloseTo(geometry.rowWidth, 0);
    expect(geometry.cellHeight).toBeGreaterThan(0);
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
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
            createdLabel: "2000-07-01T00:00:00",
            id: 502,
            threadId: 78,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
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
            createdLabel: "2000-07-01T00:00:00",
            id: 601,
            attachments: [COMMENT_601_ATTACHMENT],
            threadId: 88,
            viaEmail: false,
          },
        ],
        commitId: "abcdef1234567890",
        createdLabel: "2000-07-01T00:00:00",
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
  const nonRangedOrder = await page.locator("#thread-88").evaluate((thread) => {
    const comments = thread.querySelector(":scope > ul.comments")!;
    const reply = thread.querySelector(":scope > .write-comment-form")!;
    const comment = comments.querySelector(":scope > li.comment")!;
    const avatar = comment.querySelector(":scope > .comment-avatar")!;
    const body = comment.querySelector(":scope > .media-body")!;
    const topLevelForm = thread
      .closest(".board-comment-wrap")!
      .querySelector(":scope > #comment-form")!;
    const avatarLink = avatar.querySelector(":scope > a.avatar-wrap")!;
    return {
      replyFollowsComments: comments.nextElementSibling === reply,
      bodyFollowsAvatar: avatar.nextElementSibling === body,
      avatarWidth: avatarLink.getBoundingClientRect().width,
      avatarHeight: avatarLink.getBoundingClientRect().height,
      replyTop: reply.getBoundingClientRect().top,
      commentsBottom: comments.getBoundingClientRect().bottom,
      topLevelFormTop: topLevelForm.getBoundingClientRect().top,
      threadBottom: thread.getBoundingClientRect().bottom,
    };
  });
  expect(nonRangedOrder.replyFollowsComments).toBe(true);
  expect(nonRangedOrder.bodyFollowsAvatar).toBe(true);
  expect(nonRangedOrder.avatarWidth).toBe(32);
  expect(nonRangedOrder.avatarHeight).toBe(32);
  expect(nonRangedOrder.replyTop).toBeGreaterThanOrEqual(nonRangedOrder.commentsBottom);
  expect(nonRangedOrder.topLevelFormTop).toBeGreaterThanOrEqual(nonRangedOrder.threadBottom);
  await expect(page.locator("#thread-88 > .thread-header")).toHaveCount(0);
  await expect(
    page.locator(
      "#thread-88 > .write-comment-form > form > .write-comment-box > .write-comment-wrap > div:last-child > button",
    ),
  ).toHaveText(["Close", "Add a comment"]);
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
    "data-owner",
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
  await expect(page.locator("#comment-601 .ago a")).toHaveAttribute(
    "title",
    "2000-07-01 12:00:00 AM",
  );
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
  await expect(reviewCard.locator(".date")).toHaveAttribute("title", "2000-07-01 12:00:00 AM");
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
      `<div class="board-comment-wrap"><div class="non-ranged-threads-wrap">${withCommentUpdateForm(withThreadUploadForm(withThreadTextareaStyle(withThreadReplyAuthorInfo(EXPECTED_NON_RANGED_THREAD, 88), 88)), basePath, 601, "General **note**", [COMMENT_601_ATTACHMENT]).replaceAll("__BASE_PATH__", basePath)}</div>${withCommentUploadForm(`<form id="comment-form" action="${basePath}/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`)}</div>`,
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
        createdLabel: "2000-07-01T00:00:00",
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
  const reviewCardContent = reviewCard.locator('[data-owner="commit-detail-review-card-content"]');
  const reviewCardDate = reviewCard.locator('[data-owner="commit-detail-review-card-date"]');
  const reviewCardComments = reviewCard.locator(
    '[data-owner="commit-detail-review-card-comments"]',
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
  test.setTimeout(60_000);

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

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 1366) {
      await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=trunk`);
    }
    await expect(page.locator("#branches")).toBeVisible();
    await expect(page.locator("#branches")).toHaveAttribute("data-name", "branch");
    await expect(page.locator("#branches")).not.toHaveAttribute("data-activate");
    const diff = page.locator("#commit.diff-body.hide[data-commit-origin='true']");
    await expect(diff).toContainText("Index: README.md");
    await expect(diff).toContainText("-old");
    await expect(diff).toContainText("+new");
    const diffWrap = page.locator('[data-owner="commit-detail-svn-diff-wrap"]');
    await expect(diffWrap).toHaveCount(1);
    await expect(diffWrap).toHaveClass(/diff-wrap/);
    await expect(diffWrap).not.toHaveAttribute("style");
    const metrics = await readSvnCommitShellMetrics(page);
    expect(metrics.branchActivate).toBeNull();
    expect(metrics.branchClassName).toBe("btn-group branches pull-right");
    expect(metrics.branchFloat).toBe("right");
    expect(metrics.branchName).toBe("branch");
    expect(metrics.branchSelectedText).toBe("trunk");
    expect(metrics.branchTopNotBelowTabs).toBe(true);
    expect(metrics.commitDiffHidden).toBe(true);
    expect(metrics.commitInfoBackground).toBe("rgba(0, 0, 0, 0)");
    expect(metrics.commitInfoBorderTopWidth).toBe("0px");
    expect(metrics.commitInfoPadding).toBe("0px");
    expect(metrics.commitMessageDisplay).toBe("block");
    expect(metrics.commitMessageFontFamily).toBe(
      'Monaco, Menlo, Consolas, "Courier New", monospace',
    );
    expect(metrics.diffWrapMarginBottom).toBe("20px");
    expect(metrics.diffWrapOverflow).toBe("auto");
    expect(metrics.diffWrapOverflowX).toBe("auto");
    expect(metrics.diffWrapOverflowY).toBe("auto");
    expect(metrics.diffWrapFillsCodeWrap).toBe(true);
    expect(metrics.diffWrapContainedByCodeWrap).toBe(true);
    expect(metrics.diffWrapWidth).toBeGreaterThan(0);
    expect(metrics.diffWrapWidth).toBeLessThanOrEqual(metrics.codeWrapWidth + 0.5);

    if (viewport.width === 1366) {
      expect(await canonicalize(page, ".diff-wrap")).toEqual(
        await canonicalizeHtml(
          page,
          `<div class="diff-wrap"><div id="commit" data-commit-origin="true" class="diff-body hide">${SVN_PATCH}</div></div>`,
        ),
      );
    }
  }
  expect(detailRequests).toEqual(["branch=trunk"]);
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-toggle", "button");
  await expect(page.locator("#watch-button")).toHaveClass(/ybtn/);
  await expect(page.locator("#watch-button")).not.toHaveClass(/pull-left/);
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  await expect(page.locator('[data-owner="commit-detail-footer-watch"]')).toHaveCSS(
    "float",
    "left",
  );
  await expect(page.locator('[data-owner="commit-detail-footer-list"]')).toHaveCSS(
    "float",
    "right",
  );
  await expect(page.locator('[data-owner="commit-detail-footer-list"]')).not.toHaveClass(
    /pull-right/,
  );
});

test("project SVN commit detail Batch 757 owns commit metadata with Style", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await mockProjectCommitDetail(
    page,
    [],
    {
      commit: {
        authorDate: "2000-07-01T00:00:00",
        authorEmail: "svn@example.com",
        authorName: "SVN Author",
        commentCount: 0,
        commitId: "abcdef1234567890",
        commitShortId: "abcdef1",
        message: "SVN commit message",
        shortMessage: "SVN commit message",
      },
      files: [{ path: "README.md", patch: SVN_PATCH }],
      selectedBranch: "trunk",
    },
    { vcs: "SVN" },
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 1366) {
      await page.goto(`${basePath}/admin/sample/commit/abcdef1234567890?branch=trunk`);
    }

    const info = page.locator('[data-owner="commit-detail-svn-info"]');
    const ago = page.locator('[data-owner="commit-detail-svn-ago"]');
    const id = page.locator('[data-owner="commit-detail-svn-id"]');
    const author = page.locator("#code-browse-wrap > .commitInfo > strong:not(.commitId)");
    const message = page.locator("#code-browse-wrap > .commitMsg");
    await expect(info).toBeVisible();
    await expect(ago).toHaveText("2000-07-01");
    await expect(author).toHaveText("SVN Author");
    await expect(id).toHaveText("@abcdef1234567890");
    await expect(message).toHaveText("SVN commit message");
    await expect(info).not.toHaveAttribute("style");
    await expect(info).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(info).toHaveCSS("margin", "10px 0px");
    await expect(ago).not.toHaveAttribute("style");
    await expect(id).not.toHaveAttribute("style");
    await expect(id).not.toHaveClass("pull-right");
    await expect(id).toHaveCSS("float", "right");
    await expect(ago).toHaveCSS("margin-left", "5px");
    await expect(ago).toHaveCSS("color", "rgb(187, 187, 187)");
    await expect(id).toHaveCSS("color", "rgb(81, 170, 204)");
    await expect(id).toHaveCSS("margin-top", "5px");
    await expect(id).toHaveCSS(
      "font-family",
      'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    );

    const geometry = await page.evaluate(() => {
      const read = (owner: string) => {
        const element = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
        if (!element) throw new Error(`Missing ${owner}`);
        const box = element.getBoundingClientRect();
        return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
      };
      const infoBox = read("commit-detail-svn-info");
      const agoBox = read("commit-detail-svn-ago");
      const idBox = read("commit-detail-svn-id");
      return {
        agoContained: agoBox.left >= infoBox.left && agoBox.right <= infoBox.right + 1,
        idContained: idBox.left >= infoBox.left && idBox.right <= infoBox.right + 1,
        infoHeight: infoBox.bottom - infoBox.top,
        infoWidth: infoBox.right - infoBox.left,
      };
    });
    expect(geometry.infoHeight).toBeGreaterThan(0);
    expect(geometry.infoWidth).toBeGreaterThan(0);
    expect(geometry.agoContained).toBe(true);
    expect(geometry.idContained).toBe(true);
  }

  await expect(page.locator(".commitMsg-wrap")).toHaveCount(0);
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
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
    const header = document.querySelector<HTMLElement>("header[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const search = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
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
      headerClassName: header.className
        .split(/\s+/u)
        .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
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
    const commitAuthorAgo = document.querySelector<HTMLElement>(
      '[data-owner="commit-detail-author-ago"]',
    );
    const commitAuthorAvatar = document.querySelector<HTMLElement>(
      '[data-owner="commit-detail-author-avatar"]',
    );
    const commitId = document.querySelector<HTMLElement>('[data-owner="commit-detail-id"]');
    const shortMessage = document.querySelector<HTMLElement>(".commitMsg.short");
    const descMessage = document.querySelector<HTMLElement>(".commitMsg.desc");
    const commitIdWrap = document.querySelector<HTMLElement>(".commitId-wrap");
    const missing = Object.entries({
      commitAuthorAgo,
      commitAuthorAvatar,
      codediff,
      commitAuthor,
      commitId,
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
    const commitAuthorAgoStyle = getComputedStyle(commitAuthorAgo);
    const commitAuthorAvatarStyle = getComputedStyle(commitAuthorAvatar);
    const commitIdStyle = getComputedStyle(commitId);
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
      commitAuthorAgoColor: commitAuthorAgoStyle.color,
      commitAuthorAgoMarginLeft: commitAuthorAgoStyle.marginLeft,
      commitAuthorAvatarMarginRight: commitAuthorAvatarStyle.marginRight,
      commitIdColor: commitIdStyle.color,
      commitIdFontFamily: commitIdStyle.fontFamily,
      commitIdMarginTop: commitIdStyle.marginTop,
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
      diffWrapOverflow: diffWrapStyle.overflow,
      diffWrapOverflowX: diffWrapStyle.overflowX,
      diffWrapOverflowY: diffWrapStyle.overflowY,
      diffWrapContainedByCodeWrap:
        diffWrap.getBoundingClientRect().left >= (codeWrap?.getBoundingClientRect().left ?? 0) &&
        diffWrap.getBoundingClientRect().right <=
          (codeWrap?.getBoundingClientRect().right ?? 0) + 1,
      diffWrapWidth: diffWrap.getBoundingClientRect().width,
      codeWrapWidth: codeWrap?.getBoundingClientRect().width ?? 0,
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
          authorDate: "2000-07-01T00:00:00",
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
      // Markdown help has its own visible-content assertions.
      if (node.classList.contains("markdown-help")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !isNormalizedRuntimeAttr(attr))
        .filter(
          (attr) =>
            !(attr.name === "class" && normalizeAttr(attr) === "") &&
            !(attr.name === "style" && normalizeAttr(attr) === ""),
        )
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
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !isGeneratedStyleToken(token),
          )
          .join(" ")
          .trim();
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "");
      // F6 copy-fix: the app owns thread-review-form display via style
      // (threadReviewForm: display block); the legacy inline display:block is
      // runtime state, not DOM truth.
      if (normalized === "display:block") {
        return "";
      }
      if (!normalized.includes("--x-") || !normalized.includes("url(")) {
        return normalized;
      }
      return normalized
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4)",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }

    function isNormalizedRuntimeAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "data-style-src" ||
        attr.name === "data-owner" ||
        attr.name === "data-owner-instance" ||
        attr.name === "data-type" ||
        // cascade #6: the harness marks elements it synthesized clicks on; the
        // attribute is test-runtime state, not DOM truth.
        attr.name === "data-wtr-click-selected"
      );
    }

    function isGeneratedStyleToken(token: string) {
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
        // Markdown help has its own visible-content assertions.
        if (node.classList.contains("markdown-help")) {
          return "";
        }
        const attrs = Array.from(node.attributes)
          .filter((attr) => !isNormalizedRuntimeAttr(attr))
          .filter(
            (attr) =>
              !(attr.name === "class" && normalizeAttr(attr) === "") &&
              !(attr.name === "style" && normalizeAttr(attr) === ""),
          )
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
            .filter(
              (token) =>
                token &&
                token !== "gray-txt" &&
                token !== "right-txt" &&
                !isGeneratedStyleToken(token),
            )
            .join(" ")
            .trim();
        }
        return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
      }

      function normalizeStyleAttr(value: string) {
        const normalized = value.replace(/\s+/g, "").replace(/;$/u, "");
        // F6 copy-fix: the app owns thread-review-form display via style
        // (threadReviewForm: display block); the legacy inline display:block is
        // runtime state, not DOM truth.
        if (normalized === "display:block") {
          return "";
        }
        if (!normalized.includes("--x-") || !normalized.includes("url(")) {
          return normalized;
        }
        return normalized
          .replace(
            /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
            "$1src/assets/legacy/$2$3$4)",
          )
          .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
      }

      function isNormalizedRuntimeAttr(attr: Attr) {
        return (
          attr.name.startsWith("data-v-") ||
          attr.name === "alt" ||
          attr.name === "data-style-src" ||
          attr.name === "data-owner" ||
          attr.name === "data-owner-instance"
        );
      }

      function isGeneratedStyleToken(token: string) {
        return /^-[\w-]+__styles\.[\w-]+$/u.test(token) || /^x[\w-]+$/u.test(token);
      }
    },
    withReactOwnedTabButtons(withLegacyMarkdownHelp(html)),
  );
}

test("project commit detail file header owns the legacy visible Style state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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

    const header = page.locator('[data-owner="commit-detail-file-header"]');
    const filename = page.locator('[data-owner="commit-detail-file-header-filename"]');
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

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});

test("project commit detail partial-filediff commit ids own the legacy visible Style state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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

    const commit = page.locator('[data-owner="commit-detail-file-commit"]');
    const ids = page.locator('[data-owner="commit-detail-file-commit-id"]');
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

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});

test("project commit detail Batch 750 partial-filediff border owners preserve legacy longhands", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
    await expect(page.locator('[data-owner="commit-detail-file"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="commit-detail-file-meta"]')).toHaveCount(1);
    await expect(page.locator('[data-owner="commit-detail-diff-code-pre"]')).toHaveCount(2);

    const borders = await page.locator("#src-main-rs").evaluate((file) => {
      const meta = file.querySelector<HTMLElement>(".diff-partial-meta")!;
      const codeLine = file.querySelector<HTMLElement>(".diff-partial-codeline")!;
      const styles = (element: Element) => {
        const computed = getComputedStyle(element);
        return {
          color: computed.borderTopColor,
          style: computed.borderTopStyle,
          width: computed.borderTopWidth,
        };
      };
      const metaStyles = getComputedStyle(meta);
      return {
        outer: styles(file),
        meta: {
          color: metaStyles.borderBottomColor,
          style: metaStyles.borderBottomStyle,
          width: metaStyles.borderBottomWidth,
        },
        codeLine: {
          style: getComputedStyle(codeLine).borderTopStyle,
          width: getComputedStyle(codeLine).borderTopWidth,
        },
      };
    });
    expect(borders).toEqual({
      outer: { color: "rgb(187, 187, 187)", style: "solid", width: "1px" },
      meta: { color: "rgb(187, 187, 187)", style: "solid", width: "1px" },
      codeLine: { style: "none", width: "0px" },
    });
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});

test("project commit detail Batch 754 owns the emitted partial-diff table shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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

    const code = page.locator('[data-owner="commit-detail-file-code"]');
    const table = page.locator('[data-owner="commit-detail-diff-partial-table"]');
    await expect(code).toHaveCount(1);
    await expect(table).toHaveCount(1);
    await expect(code).toHaveAttribute("data-hashcode", "src/main.rs");
    await expect(code).not.toHaveAttribute("style");
    await expect(table).not.toHaveAttribute("style");
    await expect(table).toHaveClass(/diff-container/);
    await expect(table).toContainText("@@ -1 +1 @@");
    await expect(table).toContainText("-old");
    await expect(table).toContainText("+new");
    await expect(table.locator("tr.range")).toHaveCount(1);
    await expect(table.locator("tr.remove")).toHaveCount(1);
    await expect(table.locator("tr.add")).toHaveCount(1);

    const shell = await code.evaluate((element) => {
      const table = element.querySelector("table")!;
      const codeStyle = getComputedStyle(element);
      const tableStyle = getComputedStyle(table);
      const tableBox = table.getBoundingClientRect();
      return {
        overflow: codeStyle.overflow,
        overflowX: codeStyle.overflowX,
        overflowY: codeStyle.overflowY,
        tableBoxTop: tableBox.top,
        tableBoxBottom: tableBox.bottom,
        tableBoxWidth: Math.round(tableBox.width),
        tableWidth: tableStyle.width,
        table: {
          borderCollapse: tableStyle.borderCollapse,
          borderSpacing: tableStyle.borderSpacing,
        },
      };
    });
    expect(shell).toEqual({
      overflow: "auto hidden",
      overflowX: "auto",
      overflowY: "hidden",
      tableBoxTop: expect.any(Number),
      tableBoxBottom: expect.any(Number),
      tableBoxWidth: expect.any(Number),
      tableWidth: expect.any(String),
      table: {
        borderCollapse: "separate",
        borderSpacing: "0px",
      },
    });
    expect(shell.tableBoxWidth).toBeGreaterThan(0);
    expect(shell.tableBoxTop).toBeLessThan(shell.tableBoxBottom);
    expect(Number.parseFloat(shell.tableWidth)).toBeCloseTo(shell.tableBoxWidth, 0);
  }

  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});
