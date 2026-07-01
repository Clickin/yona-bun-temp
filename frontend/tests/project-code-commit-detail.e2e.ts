import { expect, test, type Page } from "@playwright/test";

const EXPECTED_COMMIT_DETAIL_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div id="code-browse-wrap" class="code-browse-wrap"><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div class="codediff-wrap"><button type="button" class="ybtn ybtn-default btn-show-reviewcards"><i class="yobicon-restore"></i></button><div class="diffs-wrap"><div class="commitInfo"><div class="commitAuthor"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>Dev Author</strong><span class="ago" title="Jul 1, 2026">Jul 1, 2026</span></div><div class="commitMsg-wrap"><span class="commitMsg short">Initial commit</span><pre class="commitMsg desc">Add README</pre></div><div class="commitId-wrap"><strong class="commitId">@abcdef1234567890</strong></div></div><div class="diff-body"><div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div><div class="board-comment-wrap"><div class="non-ranged-threads-wrap"></div><form id="comment-form" action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-comment"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div><div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/commit/abcdef1234567890/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="write-comment-wrap"><div class="pull-right"><button type="button" class="ybtn ybtn-default ybtn-small" data-toggle="close">×</button></div><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-review" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-review" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-review" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" markdown="true" id="editor-contents-review"></textarea></div></div><div id="preview-review" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div><div class="review-wrap span-hard-wrap"><div class="review-container"><button type="button" class="ybtn ybtn-default btn-hide-reviewcards"><i class="yobicon-maximize"></i></button><ul class="nav nav-tabs" style="margin-bottom:10px"><li class="active"><a href="#reviewcards-open" data-toggle="tab">Open 0</a></li><li><a href="#reviewcards-closed" data-toggle="tab">Closed 0</a></li></ul><div class="tab-content review-list"><div id="reviewcards-open" class="tab-pane active"></div><div id="reviewcards-closed" class="tab-pane"></div></div></div></div></div></div><button id="watch-button" type="button" class="pull-left ybtn " data-toggle="button">Watch</button><a href="__BASE_PATH__/admin/sample/commits/main" class="ybtn pull-right">List</a></div></div>
`;

const EXPECTED_COMMENT_DELETE_MODAL = `
<div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div>
`;

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

async function mockProjectCommitDetail(page: Page, detailRequests: string[]) {
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
