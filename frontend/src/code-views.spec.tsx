import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";
import {
  CodeBrowserPage,
  CodeCommitDetailPage,
  type CodeCommitDetailViewModel,
} from "./routes/-code-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = resolveRuntimeConfig({ basePath: "/yona" });
const codeViewsSource = readFileSync(
  fileURLToPath(new URL("./routes/-code-views.tsx", import.meta.url)),
  "utf8",
);

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  showCode: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const commitDetail: CodeCommitDetailViewModel = {
  branches: [{ name: "main" }],
  breadcrumbs: [],
  commit: {
    authorDate: "2026-05-25",
    authorEmail: "author@example.com",
    authorName: "Author",
    commentCount: 0,
    commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
    commitShortId: "be6a8cc",
    message: "Update file",
    shortMessage: "Update file",
  },
  files: [
    {
      path: "src/main.rs",
      patch: [
        "diff --git a/src/main.rs b/src/main.rs",
        "index 1111111..2222222 100644",
        "--- a/src/main.rs",
        "+++ b/src/main.rs",
        "@@ -1,2 +1,3 @@",
        " fn main() {",
        '-    println!("old");',
        '+    println!("new");',
        '+    println!("another");',
        " }",
      ].join("\n"),
    },
  ],
  noHead: false,
  ownerName: "owner",
  parentCommit: { commitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", commitShortId: "aaaaaaa" },
  path: "",
  permissions: {
    canComment: true,
    canUpdateThreadState: true,
  },
  projectName: "projectYobi",
  selectedBranch: "main",
  threads: [],
};

const codeBrowser: CodeBrowserViewModel = {
  branches: [{ name: "main" }],
  breadcrumbs: [],
  entries: [],
  file: {
    authorAvatarUrl: "/yona/files/99",
    authorLabel: "Author",
    authorLoginId: "author",
    commitDate: "2026-05-25",
    commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
    commitMessage: "Update file",
    commitShortId: "be6a8cc",
    commentCount: 2,
    isBinary: false,
    isTooLarge: false,
    mimeType: "text/x-rust",
    name: "main.rs",
    path: "src/main.rs",
    size: 29,
    text: "fn main() {\n  let value = 1;\n}",
  },
  noHead: false,
  ownerName: "owner",
  path: "src/main.rs",
  projectName: "projectYobi",
  selectedBranch: "main",
};

describe("CodeCommitDetailPage", () => {
  it("renders code browser file syntax tokens through the shared highlighter", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage code={codeBrowser} detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );

    expect(html).toContain('id="showCode"');
    expect(html).toContain('data-mimeType="text/x-rust"');
    expect(html).toContain('<div class="hidden" id="codeVal">fn main() {\n  let value = 1;\n}</div>');
    expect(html).toContain('class="code-viewer-wrap"');
    expect(html).toContain('id="spin"');
    expect(html).toContain('style="left:50%;position:fixed;top:50%"');
    expect(html).toContain(
      '<div aria-label="Breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left" id="breadcrumbs"',
    );
    expect(html).not.toContain('aria-label="Code tabs"');
    expect(html).not.toContain(">code.files</a>");
    expect(html).not.toContain(">code.commits</a>");
    expect(html).not.toContain(">title.branches</a>");
    expect(html).toContain(
      '<select class="pull-left mb10" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(html).toContain('<option value="/yona/owner/projectYobi/code/main/src/main.rs" selected="">main</option>');
    expect(html).not.toContain('<label for="branches">Branch</label>');
    expect(html).toContain('id="new-file-link"');
    expect(html).toContain('<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/code/main/download">code.download</a></div>');
    expect(html).toContain('<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/postform?path=src%2F&amp;branch=main" id="new-file-link">code.new.file</a></div>');
    expect(html).toContain('href="/yona/owner/projectYobi/postform?path=src%2F&amp;branch=main"');
    expect(html).toContain(">code.new.file</a>");
    expect(html).toContain('id="fileInfo"');
    expect(html).toContain('id="commiter"');
    expect(html).toContain('class="commiter"');
    expect(html).toContain('<a class="avatar-wrap smaller" href="/yona/author"><img src="/yona/files/99"/></a>');
    expect(html).toContain('class="ml5"');
    expect(html).toContain('<a class="ml5" href="/yona/author">Author</a>');
    expect(html).toContain('id="commitDate"');
    expect(html).toContain('class="commitDate"');
    expect(html).toContain(">2026-05-25</span>");
    expect(html).toContain('id="revisionNo"');
    expect(html).toContain('class="revision"');
    expect(html).toContain(">be6a8cc");
    expect(html).toContain('<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span>');
    expect(html).toContain('id="commitMessage"');
    expect(html).toContain('class="commitMsg"');
    expect(html).toContain(">Update file</span>");
    expect(html).toContain(">UNIX</span>");
    expect(html).toContain('data-content="code.open.desc"');
    expect(html).toContain('class="yobicon-download-alt yobicon-white vmiddle"');
    expect(html).toContain('href="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/src/main.rs"');
    expect(html).toContain('href="/yona/owner/projectYobi/files/main/src/main.rs"');
    expect(html).toContain("</i> Raw</a>");
    expect(html).toContain(
      'href="/yona/owner/projectYobi/postform?path=src%2Fmain.rs&amp;branch=main&amp;edit=true"',
    );
    expect(html).toContain(">Edit</a>");
    expect(html).toContain("code.open</a>");
    expect(html).toContain(">code.history</a>");
    expect(html).toContain('class="syntax-token syntax-keyword">fn</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
    expect(html).not.toContain('data-content="Open file in browser"');
    expect(html).not.toContain(">Open</a>");
  });

  it("renders the legacy new-file link path for root and nested folders", () => {
    const rootHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: undefined,
          path: "",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(rootHtml).toContain('id="new-file-link"');
    expect(rootHtml).toContain('<option value="/yona/owner/projectYobi/code/main" selected="">main</option>');
    expect(rootHtml).toContain('<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/code/main/download">code.download</a></div>');
    expect(rootHtml).toContain('<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/postform?path=&amp;branch=main" id="new-file-link">code.new.file</a></div>');
    expect(rootHtml).toContain('class="code-viewer-wrap"');
    expect(rootHtml).toContain('id="spin"');
    expect(rootHtml).toContain(
      '<div aria-label="Breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left" id="breadcrumbs"',
    );
    expect(rootHtml).toContain('aria-label="Code tabs"');
    expect(rootHtml).toContain(">code.files</a>");
    expect(rootHtml).toContain(">code.commits</a>");
    expect(rootHtml).toContain(">title.branches</a>");
    expect(rootHtml).toContain('href="/yona/owner/projectYobi/postform?path=&amp;branch=main"');
    expect(rootHtml).toContain(">code.new.file</a>");

    const nestedFolderHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          breadcrumbs: [
            { name: "docs", path: "docs" },
            { name: "guides", path: "docs/guides" },
          ],
          file: undefined,
          path: "docs",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(nestedFolderHtml).toContain(
      'href="/yona/owner/projectYobi/postform?path=docs%2F&amp;branch=main"',
    );
    expect(nestedFolderHtml).toContain('<a href="/yona/owner/projectYobi/code/main/docs">docs</a><a href="/yona/owner/projectYobi/code/main/docs/guides">guides</a>');
    expect(nestedFolderHtml).not.toContain("<span>/</span>");
    expect(nestedFolderHtml).not.toContain("Folder: ");
    expect(nestedFolderHtml).not.toContain("File: ");
  });

  it("renders binary and too-large file states with legacy file-view copy", () => {
    const binaryHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isBinary: true,
            mimeType: "application/octet-stream",
            name: "artifact.bin",
            path: "artifact.bin",
            text: "",
          },
          path: "artifact.bin",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(binaryHtml).toContain('class="yobicon-download-alt yobicon-white vmiddle"');
    expect(binaryHtml).toContain('<span class="filesize">29 bytes</span>');
    expect(binaryHtml).toContain('href="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/artifact.bin"');
    expect(binaryHtml).toContain("button.download</a>");
    expect(binaryHtml).toContain("code.open</a>");
    expect(binaryHtml).toContain(">code.history</a>");
    expect(binaryHtml).not.toContain(">Download</a>");
    expect(binaryHtml).not.toContain(">Open</a>");
    expect(binaryHtml).not.toContain('class="filehref ybtn" href="/yona/owner/projectYobi/files/main/artifact.bin"');
    expect(binaryHtml).not.toContain(">UNIX</span>");
    expect(binaryHtml).not.toContain(">UNDEFINED</span>");
    expect(binaryHtml).not.toContain("&amp;edit=true");

    const tooLargeHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isTooLarge: true,
            name: "large.txt",
            path: "large.txt",
            text: "",
          },
          path: "large.txt",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(tooLargeHtml).toContain("code.tooBigFileForCodeBrowser");
    expect(tooLargeHtml).toContain(">code.viewRaw</a>");
    expect(tooLargeHtml).toContain(">UNDEFINED</span>");
    expect(tooLargeHtml).not.toContain("Sorry, we cannot show a file larger than");
    expect(tooLargeHtml).not.toContain(">View Raw</a>");
    expect(tooLargeHtml).not.toContain("&amp;edit=true");

    const imageHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isBinary: true,
            mimeType: "image/png",
            name: "logo.png",
            path: "logo.png",
            text: "",
          },
          path: "logo.png",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(imageHtml).toContain('<div class="image-wrap" id="showImage">');
    expect(imageHtml).toContain('src="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/logo.png"');
  });

  it("renders the legacy Git no-head guidance instead of raw placeholder copy", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{ ...codeBrowser, file: undefined, noHead: true }}
        detail={{ ...projectDetail, cloneUrl: "http://example.test/owner/projectYobi.git" }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("code.nohead");
    expect(html).toContain("code.nohead.clone");
    expect(html).toContain("git clone http://example.test/owner/projectYobi.git projectYobi");
    expect(html).toContain("git remote add origin http://example.test/owner/projectYobi.git");
    expect(html).toContain("code.nohead.pull.push");
    expect(html).not.toContain("The repository is empty!");
    expect(html).not.toContain("Clone URL:");
  });

  it("renders the legacy SVN no-head guidance for Subversion projects", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{ ...codeBrowser, file: undefined, noHead: true }}
        detail={{
          ...projectDetail,
          cloneUrl: "http://example.test/svn/owner/projectYobi",
          vcs: "Subversion",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("code.nohead");
    expect(html).toContain("code.nohead.svn.clone");
    expect(html).toContain("svn co http://example.test/svn/owner/projectYobi");
    expect(html).toContain('echo &quot;# projectYobi&quot; &gt; README.md');
    expect(html).not.toContain("code.nohead.clone");
    expect(html).not.toContain("The repository is empty!");
  });

  it("renders legacy commit diff file stats and inline comment anchors", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={commitDetail}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("src/main.rs");
    expect(html).toContain('class="diff-stats"');
    expect(html).toContain('class="num-added">+2</span>');
    expect(html).toContain('class="num-deleted">-1</span>');
    expect(html).toContain("line-comment-trigger");
    expect(html).toContain('data-line="2"');
  });

  it("renders empty commit diff body without non-legacy placeholder copy", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={{ ...commitDetail, files: [] }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<div class="diff-body">');
    expect(html).toContain('<div class="btnPop">');
    expect(html).not.toContain("No changed file diff is available.");
  });

  it("renders commit discussion controls with legacy message-key copy", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={{
          ...commitDetail,
          commit: commitDetail.commit
            ? {
                ...commitDetail.commit,
                authorEmail: "",
                authorName: "",
              }
            : null,
          threads: [
            {
              authorId: 1,
              authorLabel: "Author",
              authorLoginId: "author",
              comments: [
                {
                  authorId: 1,
                  authorLabel: "Author",
                  authorLoginId: "author",
                  canDelete: true,
                  contentsHtml: "",
                  contentsMarkdown: "Thread comment",
                  createdLabel: "now",
                  id: 12,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
              createdLabel: "now",
              endLine: 2,
              id: 7,
              path: "src/main.rs",
              prevCommitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              startLine: 2,
              state: "open",
            },
          ],
        }}
        detail={projectDetail}
        onCloseThread={async () => undefined}
        onCreateComment={async () => undefined}
        onDeleteComment={async () => undefined}
        onUpdateComment={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("<strong>User.anonymous.name</strong>");
    expect(html).toContain(">notification.watch</button>");
    expect(html).toContain(">button.list</a>");
    expect(html).toContain('class="yobicon-post2"');
    expect(html).toContain(">button.edit</button>");
    expect(html).toContain('title="common.comment.delete"');
    expect(html).toContain('class="yobicon-trash"');
    expect(html).toContain('class="yobicon-restore"');
    expect(html).toContain('class="ybtn ybtn-default btn-show-reviewcards"');
    expect(html).toContain('class="ybtn ybtn-default btn-hide-reviewcards"');
    expect(html).toContain('data-toggle="tab" href="#reviewcards-open"');
    expect(html).toContain(">issue.state.open 1</a>");
    expect(html).toContain('data-toggle="tab" href="#reviewcards-closed"');
    expect(html).toContain(">issue.state.closed 0</a>");
    expect(html).toContain(">issue.state.closed 0</span>");
    expect(html).toContain('class="review-form board-comment-form"');
    expect(html).toContain('href="#edit-commit-comment"');
    expect(html).toContain('href="#preview-commit-comment"');
    expect(html).toContain('data-editor-mode="comment-body"');
    expect(html).toContain('class="markdown-preview markdown-wrap comment-body"');
    expect(html).toContain('class="markdown-help"');
    expect(html).toContain('href="#edit-thread-comment-7"');
    expect(html).toContain('href="#preview-thread-comment-7"');
    expect(html).toContain('data-editor-mode="code-review-body"');
    expect(html).toContain('class="markdown-preview markdown-wrap code-review-body"');
    expect(html).toContain(">commentThread.close</button>");
    expect(html).toContain(">button.comment.new</button>");
    expect(html).not.toContain("<strong>Anonymous</strong>");
    expect(html).not.toContain(">Watch</button>");
    expect(html).not.toContain(">List</a>");
    expect(html).not.toContain(">Comments</button>");
    expect(html).not.toContain("Review cards");
    expect(html).not.toContain("Hide review cards");
    expect(html).not.toContain(">Open 1</a>");
    expect(html).not.toContain(">Closed 0</a>");
    expect(html).not.toContain(">Closed 0</span>");
    expect(html).not.toContain(">Edit</button>");
    expect(html).not.toContain(">Delete</button>");
    expect(html).not.toContain(">Close</button>");
    expect(html).not.toContain(">Comment</button>");
  });

  it("keeps state-driven commit discussion editors in legacy common.editor shells", () => {
    expect(codeViewsSource).toContain("<LegacyMarkdownEditorShell");
    expect(codeViewsSource).toContain('editorMode="code-review-body"');
    expect(codeViewsSource).toContain('editorMode="update-comment-body"');
    expect(codeViewsSource).toContain("upload-drop-here");
    expect(codeViewsSource).toContain("editor-contents-");
  });
});
