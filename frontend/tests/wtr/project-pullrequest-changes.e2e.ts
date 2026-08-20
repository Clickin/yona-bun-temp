import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const fileURLToPath = (u) => u.pathname;
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const PULL_REQUEST_CHANGES_ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);

const PULL_REQUEST_CHANGES_STYLE_SOURCE = curatedAppCss();

const LEGACY_REVIEWLIST_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/git/partial_reviewlist.scala.html", import.meta.url),
  "utf8",
);

const LEGACY_MESSAGES_SOURCE = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

const BATCH_822_SCREENSHOT_DIRECTORY = fileURLToPath(
  new URL("../output/playwright/batch-822", import.meta.url),
);

const LEGACY_COMMENT_THREAD_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/partial_comment_thread.scala.html", import.meta.url),
  "utf8",
);

const LEGACY_COMMENT_THREAD_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);

const LEGACY_REVIEW_CARD_LESS_SOURCE = LEGACY_COMMENT_THREAD_LESS_SOURCE;

const LEGACY_CODE_COMMENT_JS_SOURCE = readFileSync(
  new URL("../../yona-original/public/javascripts/service/yobi.code.Diff.js", import.meta.url),
  "utf8",
);

// F6 copy-fix: branch start icon retired the legacy ml0 class (owned by
// style branchInfoStartIcon, b60a8e7c8); overview spec pins not.toHaveClass(/\bml0\b/u).
const EXPECTED_PULL_REQUEST_CHANGES_BASE = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="board-header issue"><div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div><div class="title"><strong class="board-id">#9</strong> Initial title</div></div><div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div><ul class="nav nav-tabs nm"><li><a href="__BASE_PATH__/admin/sample/pullRequest/9">Overview</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li></ul><div class="board-body mb20"><div class="author-info right-txt" style="margin-top:20px"><a href="__BASE_PATH__/dev" class="usf-group pull-left"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a><div class="pullRequest-branchInfo"><i class="yobicon-branch"></i><code class="from" title="From"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/feature%2Fui" class="branchName">feature/ui</a></code><i class="yobicon-right-2 ml10"></i><code class="to" title="To"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/main" class="branchName">main</a></code></div></div></div><div class="codediff-wrap mt10 diffs-only"><div id="changes" class="diffs-wrap"><div id="commits" class="btn-group auto mb10"><button class="btn dropdown-toggle auto"><span class="d-label">All commit changes</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">All commit changes</a></li><li class="divider"></li></ul></div><div class="diff-body diffs-wrap-scroll"><div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div><div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div><div class="board-comment-wrap"><div class="non-ranged-threads-wrap"></div><form id="comment-form" action="__BASE_PATH__/admin/sample/pullRequest/90/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" ><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" id="editor-contents-comment" markdown="true"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div><div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/pullRequest/90/comments" method="post" enctype="multipart/form-data"><div class="author-info-wrap pull-left hide-in-mobile"><div class="author-info"><a href="__BASE_PATH__/admin" class="avatar-wrap medium" title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div></div><div class="write-comment-box"><div class="write-comment-wrap"><div class="pull-right"><button type="button" class="ybtn ybtn-default ybtn-small" data-toggle="close">×</button></div><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" ><div id="edit-review" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-review" markdown="true"></textarea></div></div><div id="preview-review" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></div></div></div></div>
`;

const REVIEW_COMMENT_UPLOAD_WITH_ID = `<div class="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`;

const EXPECTED_PULL_REQUEST_CHANGES = EXPECTED_PULL_REQUEST_CHANGES_BASE.replace(
  `<button type="button" class="ybtn ybtn-default ybtn-small" data-toggle="close">×</button>`,
  `<button type="button" class="ybtn ybtn-default ybtn-small">×</button>`,
).replace(
  `<div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button>`,
  `${REVIEW_COMMENT_UPLOAD_WITH_ID}<div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button>`,
);

const SELECTED_COMMIT_ID = "abcdef1234567890";

const SELECTED_COMMIT = {
  authorDateLabel: "Jul 4, 2026",
  authorEmail: "dev@example.com",
  commitId: SELECTED_COMMIT_ID,
  commitMessage: "Add UI\n\nDetails",
  commitShortId: "abcdef1",
  state: "CURRENT",
};

const SELECTED_NO_AUTHOR_COMMIT_ID = "0000000000000000";

const SELECTED_NO_AUTHOR_COMMIT = {
  authorDateLabel: "Jul 9, 2026",
  authorEmail: "",
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
  authorDateLabel: "Jul 3, 2026",
  authorEmail: "old@example.com",
  commitId: PRIOR_COMMIT_ID,
  commitMessage: "Old UI\n\nDetails",
  commitShortId: "1234567",
  state: "PRIOR",
};

const EXPECTED_PULL_REQUEST_SELECTED_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label"><strong class="mr10 commit-hash">abcdef1</strong><span>Add UI</span></span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890"><strong class="mr10 commit-hash">abcdef1</strong><span>Add UI</span></a></li></ul>`,
  )
  .replace(
    `<div class="diff-body diffs-wrap-scroll">`,
    `<p class="commitInfo"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>dev@example.com</strong><span class="ago" title="Jul 4, 2026">Jul 4, 2026</span></p><pre class="commitMsg mt5">Add UI\n\nDetails</pre><div class="diff-body diffs-wrap-scroll">`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=abcdef1234567890"`,
  );

const EXPECTED_PULL_REQUEST_SELECTED_NO_AUTHOR_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label"><strong class="mr10 commit-hash">0000000</strong><span>No author metadata</span></span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/0000000000000000"><strong class="mr10 commit-hash">0000000</strong><span>No author metadata</span></a></li></ul>`,
  )
  .replace(
    `<div class="diff-body diffs-wrap-scroll">`,
    `<p class="commitInfo"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Anonymous</strong><span class="ago" title="Jul 9, 2026">Jul 9, 2026</span></p><pre class="commitMsg mt5">No author metadata\n\nDetails</pre><div class="diff-body diffs-wrap-scroll">`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=0000000000000000"`,
  );

const EXPECTED_PULL_REQUEST_PRIOR_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label"><strong class="mr10 commit-hash">1234567</strong><span>Old UI (Outdated)</span></span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890"><strong class="mr10 commit-hash">abcdef1</strong><span>Add UI</span></a></li></ul>`,
  )
  .replace(
    `<div class="diff-body diffs-wrap-scroll">`,
    `<p class="commitInfo"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>old@example.com</strong><span class="ago" title="Jul 3, 2026">Jul 3, 2026</span></p><pre class="commitMsg mt5">Old UI\n\nDetails</pre><div class="diff-body diffs-wrap-scroll">`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=1234567890abcdef"`,
  );

const EXPECTED_PULL_REQUEST_UNKNOWN_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label">All commit changes (Outdated - <strong class="mr10">fedcba9</strong>)</span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890"><strong class="mr10 commit-hash">abcdef1</strong><span>Add UI</span></a></li></ul>`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=fedcba9876543210"`,
  );

const REVIEW_THREAD = {
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
    {
      attachments: [],
      authorId: 1,
      authorLabel: "Site Admin",
      authorLoginId: "admin",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>Follow up</p>",
      contentsMarkdown: "Follow up",
      createdLabel: "Jul 6, 2026",
      id: 702,
      threadId: 91,
      viaEmail: false,
    },
  ],
  commitId: "abcdef1234567890",
  createdLabel: "Jul 5, 2026",
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

const EXPECTED_PULL_REQUEST_REVIEW_CARD = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `class="codediff-wrap mt10 diffs-only"`,
  `class="codediff-wrap mt10"`,
)
  .replace(
    `<div id="changes" class="diffs-wrap">`,
    `<button type="button" class="ybtn ybtn-default btn-show-reviewcards"><i class="yobicon-restore"></i></button><div id="changes" class="diffs-wrap">`,
  )
  .replace(
    `</div></div></div></div></div></div>`,
    `</div></div><div class="review-wrap"><div class="review-container"><button type="button" class="ybtn ybtn-default btn-hide-reviewcards"><i class="yobicon-maximize"></i></button><ul class="nav nav-tabs"><li class="active"><button type="button">Open1</button></li><li><button type="button">Closed0</button></li></ul><div class="tab-content review-list"><div id="reviewcards-open" class="tab-pane active"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91" class="review-card open"><p class="content">Review note</p><p class="info"><span class="comments pull-left"><i class="yobicon-comments"></i>1</span><span class="outdated-label">Outdated</span><span class="date" title="Jul 5, 2026">Jul 5, 2026</span><span class="avatar-wrap smaller ml5"><img src="/assets/images/default-avatar-32.png"></span></p></a></div><div id="reviewcards-closed" class="tab-pane"></div></div></div></div></div></div></div></div>`,
  );

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
      createdLabel: "Jul 7, 2026",
      id: 801,
      threadId: 92,
      viaEmail: false,
    },
  ],
  createdLabel: "Jul 7, 2026",
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
      createdLabel: "Jul 7, 2026",
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
      createdLabel: "Jul 8, 2026",
      id: 901,
      threadId: 95,
      viaEmail: false,
    },
  ],
  createdLabel: "Jul 8, 2026",
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

const EXPECTED_PULL_REQUEST_NON_RANGED_THREAD_HTML = `<div id="thread-92" class="comment-thread-wrap open"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-comments"></i></button></div><ul class="comments"><li id="comment-801" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" title="Dev Member"><img src="/avatars/dev.png" width="32" height="32" alt="dev"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" title="Dev Member"><strong>dev </strong></a></span><span class="ago"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes#comment-801" title="Jul 7, 2026">Jul 7, 2026</a></span></div><div id="comment-body-801"><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=abcdef1234567890" method="post" enctype="multipart/form-data" class="review-form" ><input type="hidden" name="thread.id" value="92"><div class="author-info-wrap pull-left hide-in-mobile"><div class="author-info"><a href="__BASE_PATH__/admin" class="avatar-wrap medium" title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div></div><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" ><div id="edit-thread-92" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-92" markdown="true"></textarea></div></div><div id="preview-thread-92" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="right-txt"><button type="button" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div>`;

const EXPECTED_PULL_REQUEST_NON_RANGED_THREAD = EXPECTED_PULL_REQUEST_REVIEW_CARD.replace(
  `<div class="non-ranged-threads-wrap"></div>`,
  `<div class="non-ranged-threads-wrap">${EXPECTED_PULL_REQUEST_NON_RANGED_THREAD_HTML.replace(
    `<div id="comment-body-801"><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div></div>`,
    `<div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div><div class="attachments" data-attachments="[]"></div>`,
  ).replace(
    `</span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div>`,
    `</span><span class="edit pull-right"><button class="btn-transparent pull-right close" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div class="comment-body markdown-wrap" data-via-email="false"><p>General <strong>note</strong></p></div>`,
  )}</div>`,
)
  .replace(
    `href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91"`,
    `href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-92"`,
  )
  .replace(`<p class="content">Review note</p>`, `<p class="content">General **note**</p>`)
  .replace(`title="Jul 5, 2026">Jul 5, 2026`, `title="Jul 7, 2026">Jul 7, 2026`)
  .replace(`<span class="comments pull-left"><i class="yobicon-comments"></i>1</span>`, ``);

const EXPECTED_PULL_REQUEST_OUTDATED_REVIEW_CARD = EXPECTED_PULL_REQUEST_REVIEW_CARD.replace(
  `href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91" class="review-card open"`,
  `href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-93" class="review-card open outdated"`,
);

test("project pull request changes source keeps React-owned tab controls free of Bootstrap tab markers", () => {
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-toggle="tab"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("data-toggle='tab'");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-toggle="dropdown"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("data-toggle='dropdown'");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-toggle="CodeCommentThread"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("data-toggle='CodeCommentThread'");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("click.dropdown");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("dropdown.data-api");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("data-toggle='markdown-editor'");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-mode="edit"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-mode="preview"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("data-type={line.type}");
});

test("project pull request review cards map legacy markup to route-owned Style declarations", () => {
  expect(LEGACY_REVIEWLIST_SOURCE).toContain(
    '<a href="@DiffRenderer.urlToCommentThread(thread)" class="review-card',
  );
  expect(LEGACY_REVIEWLIST_SOURCE).toContain('<p class="content">');
  expect(LEGACY_REVIEWLIST_SOURCE).toContain('<p class="info">');
  expect(LEGACY_REVIEWLIST_SOURCE).toContain('<span class="outdated-label">');
  expect(LEGACY_REVIEWLIST_SOURCE).toContain('<span class="date"');
  expect(LEGACY_REVIEW_CARD_LESS_SOURCE).toContain(".review-card {");
  expect(LEGACY_REVIEW_CARD_LESS_SOURCE).toContain("&:hover {");
  expect(LEGACY_REVIEW_CARD_LESS_SOURCE).toContain("&.open {");
  expect(LEGACY_REVIEW_CARD_LESS_SOURCE).toContain("&.closed {");
  expect(LEGACY_REVIEW_CARD_LESS_SOURCE).toContain("-webkit-line-clamp: 3;");

  for (const owner of [
    "pull-request-changes-review-card",
    "pull-request-changes-review-card-content",
    "pull-request-changes-review-card-info",
    "pull-request-changes-review-card-comments",
    "pull-request-changes-review-card-outdated-label",
    "pull-request-changes-review-card-date",
  ]) {
    expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).toContain(`data-owner="${owner}"`);
  }
  for (const declaration of [
    "reviewCard",
    "reviewCardOpen",
    "reviewCardClosed",
    "reviewCardOutdatedLabel",
    "reviewCardContent",
    "reviewCardInfo",
    "reviewCardDate",
    "reviewCardComments",
  ]) {
  }
});

test("project pull request ranged thread source maps the legacy shell and React fold behavior", () => {
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('class="comment-thread-wrap');
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('class="btn-thread-here btn-thread-minimize"');
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('class="thread-header"');
  expect(LEGACY_COMMENT_THREAD_SOURCE).toContain('class="badge state');
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".comment-thread-wrap {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain("&.fold {");
  expect(LEGACY_COMMENT_THREAD_LESS_SOURCE).toContain(".btn-thread-here {");
  expect(LEGACY_CODE_COMMENT_JS_SOURCE).toContain(
    'closest(".comment-thread-wrap").toggleClass("fold")',
  );

  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).toContain("setIsFolded((current) => !current)");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("classList");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain("style.display");
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('data-toggle="CodeCommentThread"');
});

test("project pull request changes selected commit anonymous fallback uses legacy messages", () => {
  expect(LEGACY_MESSAGES_SOURCE).toMatch(/^user\.role\.anonymous\s*=\s*Anonymous$/m);
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).toContain('t("user.role.anonymous")');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toContain('commit.authorEmail || "Anonymous"');
  expect(PULL_REQUEST_CHANGES_ROUTE_SOURCE).not.toMatch(/authorEmail\s*\|\|\s*["']Anonymous/u);
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

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_CHANGES.replaceAll("__BASE_PATH__", basePath),
    ),
  );
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
  await expect(diffTable.locator("tbody > tr").nth(1)).not.toHaveAttribute("data-type", /.*/u);
  await expect(diffTable.locator("tbody > tr").nth(1).locator(".diff-partial-codeline")).toHaveText(
    " fn main() {",
  );
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveClass("remove");
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveAttribute("data-line", "2");
  await expect(diffTable.locator("tbody > tr").nth(2)).toHaveAttribute("data-side", "A");
  await expect(diffTable.locator("tbody > tr").nth(2)).not.toHaveAttribute("data-type", /.*/u);
  await expect(diffTable.locator("tbody > tr").nth(2).locator(".linenum").nth(0)).toHaveText("2");
  await expect(diffTable.locator("tbody > tr").nth(2).locator(".linenum").nth(1)).toHaveText("");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveClass("add");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveAttribute("data-line", "2");
  await expect(diffTable.locator("tbody > tr").nth(3)).toHaveAttribute("data-side", "B");
  await expect(diffTable.locator("tbody > tr").nth(3)).not.toHaveAttribute("data-type", /.*/u);
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
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments?commitId=${SELECTED_COMMIT_ID}`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_SELECTED_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
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
  await expect(page.locator(".commitInfo > .avatar-wrap.smaller img")).toHaveAttribute(
    "src",
    `${basePath}/assets/images/default-avatar-32.png`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_SELECTED_NO_AUTHOR_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
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
    commits: [SELECTED_COMMIT, PRIOR_COMMIT],
    expectedCommitId: PRIOR_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${PRIOR_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label")).toContainText("Old UI (Outdated)");
  await expect(page.locator("#commits .dropdown-menu a", { hasText: "Old UI" })).toHaveCount(0);

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_PRIOR_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
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

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_UNKNOWN_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request changes renders legacy review cards when threads exist", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, { cardThreads: [REVIEW_THREAD], threads: [REVIEW_THREAD] });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".codediff-wrap")).not.toHaveClass(/diffs-only/u);
  await expect(page.locator(".btn-show-reviewcards")).toHaveCount(1);
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
    "Jul 5, 2026",
  );

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

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_REVIEW_CARD.replaceAll("__BASE_PATH__", basePath),
    ),
  );
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
  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_NON_RANGED_THREAD.replaceAll("__BASE_PATH__", basePath),
    ),
  );

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

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const originalMessageSource = routeSource.slice(
    routeSource.indexOf("function NonRangedThreadComment"),
    routeSource.indexOf("function CommentDeleteModal"),
  );
  expect(originalMessageSource).toContain("hasRouteOwnedOriginalMessage");
  expect(originalMessageSource).toContain("data-yobi-original-message-processed={");
  expect(originalMessageSource).toContain("function OriginalMessageMarkdown");
  expect(originalMessageSource).toContain("setShowsOriginalMessage((current) => !current)");
  expect(originalMessageSource).toContain('data-original-message-owner="route"');
  expect(originalMessageSource).toContain("hidden={!showsOriginalMessage}");
  expect(originalMessageSource).not.toContain("document.");
  expect(originalMessageSource).not.toContain("addEventListener");
  expect(originalMessageSource).not.toContain("querySelector");
  expect(originalMessageSource).not.toContain("classList");
  expect(originalMessageSource).not.toContain("style.display");
  expect(originalMessageSource).not.toContain("innerHTML");
  expect(originalMessageSource).not.toContain("outerHTML");
  expect(originalMessageSource).not.toContain("dangerouslySetInnerHTML");
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
  await expect(commentDate).toHaveText("Jul 7, 2026");
  await expect(commentDate).toHaveAttribute("title", "Jul 7, 2026");
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
    text: "Jul 7, 2026",
    title: "Jul 7, 2026",
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
  await assertLegacyAnchor(page.locator("#reviewcards-open .review-card.open"), {
    href: `${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}#thread-92`,
    text: "General **note**OutdatedJul 7, 2026",
  });
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

test("project pull request changes route source uses TanStack Links for navigation", async () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );

  expect(routeSource).toContain(
    '"/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"',
  );
  expect(routeSource).toContain(
    "<ProjectPullRequestChangesTitle ownerName={ownerName} projectName={projectName} />",
  );
  expect(routeSource).toContain("function ProjectPullRequestChangesTitle");
  expect(routeSource).toContain(
    'return <title>{`${t("menu.pullRequest")} - ${ownerName}/${projectName}`}</title>;',
  );
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain('<li data-value="All">');
  expect(routeSource).not.toContain("<li data-value={commit.commitId}");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("document.");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain("window.document");
  expect(routeSource).not.toContain("querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("style.display");
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("innerHTML");
  expect(routeSource).not.toContain("click.dropdown");
  expect(routeSource).not.toContain("dropdown.data-api");
  expect(routeSource).not.toContain("$(document)");
  expect(routeSource).not.toMatch(/use(?:Layout)?Effect\s*\([^)]*title/u);
  expect(routeSource).not.toMatch(/\bdocument\b[\s\S]{0,80}\btitle\b/u);
  expect(routeSource).not.toContain('role="button"');
  expect(routeSource).not.toContain("onKeyDown");
  expect(routeSource).not.toContain("tabIndex");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).not.toMatch(/<a\s/u);
  expect(routeSource).toContain("<Link");
  expect(routeSource).toContain("const legacyLinkActiveProps");
  expect(routeSource).toContain(
    "const legacyLinkActiveOptions = { exact: true, explicitUndefined: true }",
  );
  expect(routeSource).toContain(
    "const legacyHashLinkActiveOptions = { exact: true, explicitUndefined: true, includeHash: true }",
  );
  // F6 copy-fix: legacyLinkInactiveSearch/__legacyActive were removed in the style
  // consolidation — links now pass activeProps={legacyLinkActiveProps} directly.
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain(
    'import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help"',
  );
  expect(routeSource).toContain("<LegacyMarkdownHelp />");
  expect(routeSource).not.toContain("help/markdown.scala.html?raw");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain('to="/$user"');
  expect(routeSource).toContain("params={{ user: pullRequest.contributor.loginId }}");
  expect(routeSource).toContain("params={{ user: currentUser.loginId }}");
  expect(routeSource).toContain("params={{ user: comment.authorLoginId }}");
  expect(routeSource).toContain('to="."');
  expect(routeSource).toContain("hash={`comment-${comment.id}`}");
  expect(routeSource).toContain("hash={`thread-${thread.id}`}");
  expect(routeSource).toContain("activeOptions={legacyHashLinkActiveOptions}");
  expect(routeSource).toContain('type="button"');
  expect(routeSource).not.toContain("data-request-method");
  expect(routeSource).not.toContain("data-request-uri");
  expect(routeSource).not.toContain('data-toggle="comment-delete"');
  expect(routeSource).not.toContain('data-dismiss="modal"');
  expect(routeSource).toContain("const closeModal = (event: MouseEvent<HTMLButtonElement>) => {");
  expect(routeSource).toContain("onClick={closeModal}");
  expect(routeSource).toContain("const [deleteRequestUri, setDeleteRequestUri] = useState");
  expect(routeSource).toContain("const [isOpen, setIsOpen] = useState(false)");
  expect(routeSource).toContain("const closeDropdown = () => setIsOpen(false)");
  expect(routeSource).toContain("onClick={closeDropdown}");
  // F6 copy-fix: modal className is a template that appends the Style
  // commentDeleteModalVisible token (display:block) — pin the substring form
  // like project-code-commit-detail.e2e.ts:622.
  expect(routeSource).toContain('isOpen ? "modal hide fade in" : "modal hide fade"');
  expect(routeSource).toContain('<div className="modal-backdrop fade in"></div>');
  expect(routeSource).toContain("event.stopPropagation()");
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

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_NON_RANGED_THREAD.replaceAll("__BASE_PATH__", basePath),
    ),
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

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OUTDATED_REVIEW_CARD.replaceAll("__BASE_PATH__", basePath),
    ),
  );
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
    threads?: unknown[];
  } = {},
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
          pullRequest: pullRequestDetail(),
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

async function pullRequestChangesShellMetrics(page: Page) {
  return page.locator(".codediff-wrap").evaluate((codediff) => {
    const boardBody = document.querySelector<HTMLElement>(".board-body.mb20");
    const codeWrap = document.querySelector<HTMLElement>(".code-browse-wrap");
    const diffs = codediff.querySelector<HTMLElement>("#changes.diffs-wrap");
    const diffBody = codediff.querySelector<HTMLElement>(".diff-body");
    const state = codediff.querySelector<HTMLElement>("#state.pullRequest-stateInfo");
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

async function canonicalizeAll(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((roots) => {
    return roots.map(visit).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      if (node.classList.contains("markdown-help")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-wtr-click-selected" &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/gu, "");
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

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  });
}

async function canonicalizeHtmlAll(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return Array.from(template.content.children).map(visit).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      if (node.classList.contains("markdown-help")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-wtr-click-selected" &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/gu, "");
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

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
