import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import {
  CodeBranchListPage,
  CodeBrowserPage,
  CodeComparePage,
  CodeCommitDetailPage,
  type CodeBranchListViewModel,
  type CodeCompareViewModel,
  CodeHistoryPage,
  type CodeCommitDetailViewModel,
  type CodeHistoryViewModel,
} from "./routes/-code-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "Code browser routing",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

function renderCodeFile(
  file: NonNullable<CodeBrowserViewModel["file"]>,
  messages?: LegacyMessageLookup,
) {
  return renderToStaticMarkup(
    React.createElement(CodeBrowserPage, {
      code: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [],
        file,
        noHead: false,
        ownerName: "owner",
        path: file.path,
        projectName: "projectYobi",
        selectedBranch: "main",
      },
      detail: projectDetail,
      messages,
      runtimeConfig,
    }),
  );
}

function renderCodeHistory(history: CodeHistoryViewModel, messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    React.createElement(CodeHistoryPage, {
      detail: projectDetail,
      history,
      messages,
      runtimeConfig,
    }),
  );
}

function renderCommitDetail(
  commitDetail: CodeCommitDetailViewModel,
  messages?: LegacyMessageLookup,
) {
  return renderToStaticMarkup(
    React.createElement(CodeCommitDetailPage, {
      commitDetail,
      detail: projectDetail,
      messages,
      runtimeConfig,
    }),
  );
}

function renderCompare(compare: CodeCompareViewModel, messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    React.createElement(CodeComparePage, {
      compare,
      detail: projectDetail,
      messages,
      runtimeConfig,
    }),
  );
}

function renderBranches(branchList: CodeBranchListViewModel, messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    React.createElement(CodeBranchListPage, {
      branchList,
      detail: projectDetail,
      messages,
      runtimeConfig,
      onDeleteBranch: async () => {},
      onSetDefaultBranch: async () => {},
    }),
  );
}

describe("project code browser routing", () => {
  it("keeps the project code route inside the project route tree", () => {
    const codeRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/route.tsx"),
      "utf8",
    );
    const codeIndexRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/index.tsx"),
      "utf8",
    );
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(codeRouteSource).toContain("createFileRoute");
    expect(codeRouteSource).toContain("/$owner/$projectName/code");
    expect(codeIndexRouteSource).toContain("CodeBrowserRouteView");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code'");
    expect(routeTreeSource).toContain("OwnerProjectNameCodeRouteRoute");
  });

  it("keeps the commit detail route inside the project route tree", () => {
    const commitRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commit/$commitId/route.tsx"),
      "utf8",
    );
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(commitRouteSource).toContain("createFileRoute");
    expect(commitRouteSource).toContain("/$owner/$projectName/commit/$commitId");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commit/$commitId'");
    expect(routeTreeSource).toContain("OwnerProjectNameCommitCommitIdRoute");
  });

  it("keeps the compare route inside the project route tree", () => {
    const compareRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/compare/$revisionRange/route.tsx"),
      "utf8",
    );
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(compareRouteSource).toContain("createFileRoute");
    expect(compareRouteSource).toContain("/$owner/$projectName/compare/$revisionRange");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/compare/$revisionRange'");
    expect(routeTreeSource).toContain("OwnerProjectNameCompareRevisionRangeRoute");
  });

  it("keeps the branches route inside the project route tree", () => {
    const branchRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/branches/route.tsx"),
      "utf8",
    );
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(branchRouteSource).toContain("createFileRoute");
    expect(branchRouteSource).toContain("/$owner/$projectName/branches");
    expect(branchRouteSource).toContain("useMutation");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/branches'");
    expect(routeTreeSource).toContain("OwnerProjectNameBranchesRoute");
  });

  it("renders tag refs in the legacy branch selector without adding branch-admin actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(CodeBrowserPage, {
        code: {
          branches: [{ name: "main" }, { name: "v1.0.0" }],
          breadcrumbs: [],
          entries: [],
          file: undefined,
          noHead: false,
          ownerName: "owner",
          path: "",
          projectName: "projectYobi",
          selectedBranch: "v1.0.0",
        },
        detail: projectDetail,
        runtimeConfig,
      }),
    );

    expect(html).toContain('id="branches"');
    expect(html).toContain(
      '<option value="/yona/owner/projectYobi/code/v1.0.0" selected="">v1.0.0</option>',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/code/v1.0.0"');
    expect(html).toContain('href="/yona/owner/projectYobi/branches"');
    expect(html).not.toContain('data-request-uri="/yona/owner/projectYobi/code/v1.0.0/');
  });

  it("renders legacy raw/open/image file action anchors", () => {
    const textHtml = renderCodeFile({
      commitId: "abcdef1234567890abcdef1234567890abcdef12",
      isBinary: false,
      isTooLarge: false,
      mimeType: "text/x-rust",
      name: "main.rs",
      path: "src/main.rs",
      size: 13,
      text: "fn main() {}\n",
    });

    expect(textHtml).toContain(
      'href="/yona/owner/projectYobi/rawcode/abcdef1234567890abcdef1234567890abcdef12/src/main.rs"',
    );
    expect(textHtml).toContain('href="/yona/owner/projectYobi/code/main/download"');
    expect(textHtml).toContain('id="open-in-browser"');
    expect(textHtml).toContain('href="/yona/owner/projectYobi/files/main/src/main.rs"');
    expect(textHtml).toContain("</i> Raw</a>");
    expect(textHtml).toContain("</i> code.open</a>");
    expect(textHtml).toContain('data-language="rust"');
    expect(textHtml).toContain('data-mime-type="text/x-rust"');
    expect(textHtml).toContain('data-line-number="1"');
    expect(textHtml).toContain('class="syntax-token syntax-keyword">fn</span>');
    expect(textHtml).toContain('class="line-number">1</span>');

    const imageHtml = renderCodeFile({
      commitId: "abcdef1234567890abcdef1234567890abcdef12",
      isBinary: true,
      isTooLarge: false,
      mimeType: "image/png",
      name: "logo.png",
      path: "assets/logo.png",
      size: 16,
      text: "",
    });

    expect(imageHtml).toContain('id="showImage"');
    expect(imageHtml).toContain(
      'src="/yona/owner/projectYobi/rawcode/abcdef1234567890abcdef1234567890abcdef12/assets/logo.png"',
    );
    expect(imageHtml).toContain('href="/yona/owner/projectYobi/files/main/assets/logo.png"');

    const binaryHtml = renderCodeFile({
      commitId: "abcdef1234567890abcdef1234567890abcdef12",
      isBinary: true,
      isTooLarge: false,
      mimeType: "application/octet-stream",
      name: "archive.bin",
      path: "bin/archive.bin",
      size: 7,
      text: "",
    });

    expect(binaryHtml).toContain('id="showFile"');
    expect(binaryHtml).toContain('<span class="filesize">7 bytes</span>');
    expect(binaryHtml).toContain(
      'class="filehref ybtn" href="/yona/owner/projectYobi/rawcode/abcdef1234567890abcdef1234567890abcdef12/bin/archive.bin"',
    );
    expect(binaryHtml).toContain("</i> button.download</a>");
  });

  it("uses Korean legacy messages for code browser and review controls when provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const messages = runtime.t;

    const textHtml = renderCodeFile(
      {
        commitId: "abcdef1234567890abcdef1234567890abcdef12",
        isBinary: false,
        isTooLarge: false,
        mimeType: "text/x-rust",
        name: "main.rs",
        path: "src/main.rs",
        size: 13,
        text: "fn main() {}\n",
      },
      messages,
    );
    expect(textHtml).toContain("</i> Raw</a>");
    expect(textHtml).toContain("</i> 브라우저로 열기</a>");
    expect(textHtml).toContain(">변경이력</a>");
    expect(textHtml).not.toContain("</i> code.open</a>");

    const branchHtml = renderBranches(
      {
        branches: [
          {
            commitDate: "2026-04-21",
            commitId: "abcdef1234567890abcdef1234567890abcdef12",
            commitMessage: "Branch commit",
            commitShortId: "abcdef1",
            isDefault: false,
            name: "topic",
            pullRequest: null,
            shortName: "topic",
          },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "owner",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "projectYobi",
      },
      messages,
    );
    expect(branchHtml).toContain(">파일</a>");
    expect(branchHtml).toContain(">커밋</a>");
    expect(branchHtml).toContain(">브랜치</a>");
    expect(branchHtml).toContain("<th>최근 커밋</th>");
    expect(branchHtml).toContain("<th>최근 코드 주고받기</th>");
    expect(branchHtml).toContain(">주고받은 코드가 없습니다</span>");
    expect(branchHtml).toContain(">기본 브랜치로 설정</button>");
    expect(branchHtml).toContain(">삭제</a>");

    const compareHtml = renderCompare(
      {
        commitA: null,
        commitB: null,
        files: [],
        noHead: false,
        ownerName: "owner",
        projectName: "projectYobi",
        revA: "a",
        revB: "b",
      },
      messages,
    );
    expect(compareHtml).toContain('<div class="alert">변경 없음</div>');

    const commitHtml = renderCommitDetail(
      {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        commit: {
          authorDate: "2026-04-21",
          authorEmail: "",
          authorName: "",
          commentCount: 0,
          commitId: "abcdef1234567890abcdef1234567890abcdef12",
          commitShortId: "abcdef1",
          message: "",
          shortMessage: "",
        },
        files: [],
        noHead: false,
        ownerName: "owner",
        parentCommit: null,
        path: "",
        permissions: { canComment: true, canUpdateThreadState: true },
        projectName: "projectYobi",
        selectedBranch: "main",
        threads: [],
      },
      messages,
    );
    expect(commitHtml).toContain(">지켜보기</button>");
    expect(commitHtml).toContain(">목록</a>");
    expect(commitHtml).toContain(">댓글 입력</button>");
    expect(commitHtml).toContain(">열림 0</a>");
    expect(commitHtml).not.toContain(">button.comment.new</button>");
  });

  it("renders markdown files with the legacy codebrowser markdown wrapper", () => {
    const markdownHtml = renderCodeFile({
      html: "",
      isBinary: false,
      isTooLarge: false,
      mimeType: "text/markdown",
      name: "README.md",
      path: "README.md",
      size: 67,
      text: "# Hello Yona\n\n@owner @owner/projectYobi @ghost @owner/missing\n\n![logo](/yona/owner/projectYobi/files/main/assets/logo.png)\n\n[Guide](./docs/guide.md)\n",
      mentionReferences: [
        {
          kind: "user",
          label: "Owner",
          loginId: "owner",
          ownerName: "",
          projectName: "",
        },
        {
          kind: "project",
          label: "owner/projectYobi",
          loginId: "",
          ownerName: "owner",
          projectName: "projectYobi",
        },
      ],
    } as NonNullable<CodeBrowserViewModel["file"]>);

    expect(markdownHtml).toContain('id="codeVal"');
    expect(markdownHtml).toContain('class="markdown-wrap codebrowser-markdown"');
    expect(markdownHtml).toContain(
      '<h1 id="hello-yona">Hello Yona<a class="head-anchor" href="#hello-yona">#</a></h1>',
    );
    expect(markdownHtml).toContain('src="/yona/owner/projectYobi/files/main/assets/logo.png"');
    expect(markdownHtml).toContain('href="./docs/guide.md"');
    expect(markdownHtml).toContain('href="/yona/owner"');
    expect(markdownHtml).toContain('href="/yona/owner/projectYobi"');
    expect(markdownHtml).toContain("@ghost");
    expect(markdownHtml).toContain("@owner/missing");
    expect(markdownHtml).not.toContain('href="/yona/ghost"');
    expect(markdownHtml).not.toContain('href="/yona/owner/missing"');
    expect(markdownHtml).not.toContain('id="showCode"');
  });

  it("renders legacy commit history table, branch tabs, and path-scoped actions", () => {
    const codeViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-code-views.tsx"),
      "utf8",
    );
    expect(codeViewsSource).toContain('document.addEventListener("keydown", onKeyDown)');
    expect(codeViewsSource).toContain('key === "a" && newerHref');
    expect(codeViewsSource).toContain('key === "s" && olderHref');

    const rootHtml = renderCodeHistory({
      branches: [{ name: "main" }, { name: "topic" }],
      breadcrumbs: [],
      commits: [],
      hasNewer: false,
      hasOlder: false,
      noHead: false,
      ownerName: "owner",
      page: 0,
      path: "",
      projectName: "projectYobi",
      selectedBranch: "main",
    });

    expect(rootHtml).toContain('href="/yona/owner/projectYobi/code/main"');
    expect(rootHtml).toContain('href="/yona/owner/projectYobi/commits/main"');
    expect(rootHtml).toContain('href="/yona/owner/projectYobi/branches"');

    const pathHtml = renderCodeHistory({
      branches: [{ name: "main" }, { name: "topic" }],
      breadcrumbs: [
        { name: "src", path: "src" },
        { name: "main.rs", path: "src/main.rs" },
      ],
      commits: [
        {
          authorAvatarUrl: "https://www.gravatar.com/avatar/second",
          authorEmail: "second@example.com",
          authorName: "Second Author",
          authorDate: "2026-04-21",
          commentCount: 0,
          commitId: "abcdef1234567890abcdef1234567890abcdef12",
          commitShortId: "abcdef1",
          message: "Update main function",
          shortMessage: "Update main function",
        },
      ],
      hasNewer: false,
      hasOlder: true,
      noHead: false,
      ownerName: "owner",
      page: 0,
      path: "src/main.rs",
      projectName: "projectYobi",
      selectedBranch: "main",
    });

    expect(pathHtml).toContain('id="history"');
    expect(pathHtml).toContain('class="code-table commits mt10"');
    expect(pathHtml).toContain('data-commit-id="abcdef1234567890abcdef1234567890abcdef12"');
    expect(pathHtml).not.toContain('data-commitId="abcdef1234567890abcdef1234567890abcdef12"');
    expect(pathHtml).toContain(
      'href="/yona/owner/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12?branch=main&amp;path=src%2Fmain.rs#src-main-rs"',
    );
    expect(pathHtml).toContain('href="/yona/owner/projectYobi/code/abcdef1/src/main.rs"');
    expect(pathHtml).toContain(">code.showCode</a>");
    expect(pathHtml).toContain(">code.older</a>");
    expect(pathHtml).toContain('class="commitMsg short"');
    expect(pathHtml).toContain(
      'class="avatar-wrap" data-placement="top" data-toggle="tooltip" title="second@example.com"',
    );
    expect(pathHtml).toContain(
      '<img alt="Second Author" src="https://www.gravatar.com/avatar/second"/>',
    );
    expect(pathHtml).toContain("Update main function");

    const emptyMessageHtml = renderCodeHistory({
      branches: [{ name: "main" }],
      breadcrumbs: [],
      commits: [
        {
          authorEmail: "",
          authorName: "",
          authorDate: "2026-04-21",
          commentCount: 0,
          commitId: "0000000000000000000000000000000000000000",
          commitShortId: "0000000",
          message: "",
          shortMessage: "",
        },
      ],
      hasNewer: false,
      hasOlder: false,
      noHead: false,
      ownerName: "owner",
      page: 0,
      path: "",
      projectName: "projectYobi",
      selectedBranch: "main",
    });
    expect(emptyMessageHtml).toContain(">code.commitMsg.empty</a>");
  });

  it("renders legacy commit detail diff anchors and review placeholders", () => {
    const detailHtml = renderCommitDetail({
      branches: [{ name: "main" }],
      breadcrumbs: [
        { name: "src", path: "src" },
        { name: "main.rs", path: "src/main.rs" },
      ],
      commit: {
        authorDate: "2026-04-21",
        authorEmail: "second@example.com",
        authorName: "Second Author",
        commentCount: 0,
        commitId: "abcdef1234567890abcdef1234567890abcdef12",
        commitShortId: "abcdef1",
        message: "Update main function\n\nMore body",
        shortMessage: "Update main function",
      },
      files: [
        {
          patch:
            'diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1,3 @@\n fn main() {\n+    println!("detail");\n }\n',
          path: "src/main.rs",
        },
      ],
      noHead: false,
      ownerName: "owner",
      parentCommit: {
        commitId: "1234567890abcdef1234567890abcdef12345678",
        commitShortId: "1234567",
      },
      path: "src/main.rs",
      permissions: {
        canComment: true,
        canUpdateThreadState: true,
      },
      projectName: "projectYobi",
      selectedBranch: "main",
      threads: [
        {
          authorId: 1,
          authorLabel: "Owner",
          authorLoginId: "owner",
          comments: [
            {
              authorId: 1,
              authorLabel: "Owner",
              authorLoginId: "owner",
              canDelete: true,
              contentsHtml: "",
              contentsMarkdown:
                "First **commit** note #1 @abcdef1234567890abcdef1234567890abcdef12",
              createdLabel: "2026-04-21",
              id: 11,
              issueReferences: [
                {
                  issueNumber: 1,
                  ownerName: "owner",
                  projectName: "projectYobi",
                  state: "open",
                  title: "Commit reference",
                },
              ],
              threadId: 7,
              viaEmail: false,
            },
          ],
          commitId: "abcdef1234567890abcdef1234567890abcdef12",
          createdLabel: "2026-04-21",
          id: 7,
          path: "",
          prevCommitId: "",
          state: "open",
        },
        {
          authorId: 2,
          authorLabel: "Reviewer",
          authorLoginId: "reviewer",
          comments: [
            {
              authorId: 2,
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              canDelete: false,
              contentsHtml: "",
              contentsMarkdown: "Closed note",
              createdLabel: "2026-04-22",
              id: 12,
              threadId: 8,
              viaEmail: false,
            },
          ],
          commitId: "abcdef1234567890abcdef1234567890abcdef12",
          createdLabel: "2026-04-22",
          id: 8,
          path: "",
          prevCommitId: "",
          state: "closed",
        },
      ],
    });

    expect(detailHtml).toContain('id="code-browse-wrap"');
    expect(detailHtml).toContain('class="codediff-wrap"');
    expect(detailHtml).toContain('class="diffs-wrap"');
    expect(detailHtml).toContain('class="commitInfo"');
    expect(detailHtml).toContain('class="commitAuthor"');
    expect(detailHtml).toContain('class="commitMsg-wrap"');
    expect(detailHtml).toContain('class="commitId-wrap"');
    expect(detailHtml).toContain('class="diff-body"');
    expect(detailHtml).toContain('class="board-comment-wrap"');
    expect(detailHtml).toContain('class="non-ranged-threads-wrap"');
    expect(detailHtml).toContain('id="thread-7"');
    expect(detailHtml).toContain('class="comment-thread-wrap open"');
    expect(detailHtml).toContain('id="comment-11"');
    expect(detailHtml).toContain("First <strong>commit</strong> note");
    expect(detailHtml).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(detailHtml).toContain(
      'href="/yona/owner/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12"',
    );
    expect(detailHtml).toContain('data-issue-state="open"');
    expect(detailHtml).toContain('class="comment-body markdown-wrap"');
    expect(detailHtml).toContain('data-request-method="delete"');
    expect(detailHtml).toContain(
      'data-request-uri="/yona/api/v1/projects/owner/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12/comments/11"',
    );
    expect(detailHtml).toContain('class="review-form board-comment-form"');
    expect(detailHtml).not.toContain('aria-label="Commit comment" disabled=""');
    expect(detailHtml).toContain('class="review-wrap span-hard-wrap"');
    expect(detailHtml).toContain('id="reviewcards-open"');
    expect(detailHtml).toContain("issue.state.open 1");
    expect(detailHtml).toContain('id="reviewcards-closed"');
    expect(detailHtml).toContain("issue.state.closed 1");
    expect(detailHtml).toContain('href="#thread-7"');
    expect(detailHtml).toContain(
      'data-request-uri="/yona/api/v1/projects/owner/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12/threads/7/close"',
    );
    expect(detailHtml).toContain(
      'data-request-uri="/yona/api/v1/projects/owner/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12/threads/8/open"',
    );
    expect(detailHtml).toContain('id="watch-button"');
    expect(detailHtml).toContain('href="/yona/owner/projectYobi/commits/main/src/main.rs"');
    expect(detailHtml).toContain("@abcdef1234567890abcdef1234567890abcdef12");
    expect(detailHtml).toContain("Second Author");
    expect(detailHtml).toContain("+    println!(&quot;detail&quot;);");
  });

  it("renders legacy compare diff shell anchors", () => {
    const compareHtml = renderCompare({
      commitA: {
        authorDate: "2026-04-20",
        authorEmail: "author@example.com",
        authorName: "Author",
        commentCount: 0,
        commitId: "1234567890abcdef1234567890abcdef12345678",
        commitShortId: "1234567",
        message: "Initial commit",
        shortMessage: "Initial commit",
      },
      commitB: {
        authorDate: "2026-04-21",
        authorEmail: "second@example.com",
        authorName: "Second Author",
        commentCount: 0,
        commitId: "abcdef1234567890abcdef1234567890abcdef12",
        commitShortId: "abcdef1",
        message: "Update main function",
        shortMessage: "Update main function",
      },
      files: [
        {
          patch:
            'diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1,3 @@\n fn main() {\n+    println!("compare");\n }\n',
          path: "src/main.rs",
        },
      ],
      noHead: false,
      ownerName: "owner",
      projectName: "projectYobi",
      revA: "1234567890abcdef1234567890abcdef12345678",
      revB: "abcdef1234567890abcdef1234567890abcdef12",
    });

    expect(compareHtml).toContain('class="project-page-wrap"');
    expect(compareHtml).toContain('class="code-browse-wrap"');
    expect(compareHtml).toContain('class="commitInfo"');
    expect(compareHtml).toContain(
      "@1234567890abcdef1234567890abcdef12345678..abcdef1234567890abcdef1234567890abcdef12",
    );
    expect(compareHtml).toContain('class="diff-body discommentable"');
    expect(compareHtml).toContain('id="src-main-rs"');
    expect(compareHtml).toContain("+    println!(&quot;compare&quot;);");

    const emptyCompareHtml = renderCompare({
      commitA: null,
      commitB: null,
      files: [],
      noHead: false,
      ownerName: "owner",
      projectName: "projectYobi",
      revA: "abcdef1",
      revB: "abcdef1",
    });
    expect(emptyCompareHtml).toContain('class="alert"');
    expect(emptyCompareHtml).toContain("code.noChanges");
  });

  it("renders legacy branch list table and mutation anchors", () => {
    const branchHtml = renderBranches({
      branches: [
        {
          commitDate: "2026-04-21",
          commitId: "abcdef1234567890abcdef1234567890abcdef12",
          commitMessage: "Initial commit",
          commitShortId: "abcdef1",
          isDefault: true,
          name: "main",
          pullRequest: null,
          shortName: "main",
        },
        {
          commitDate: "2026-04-22",
          commitId: "1234567890abcdef1234567890abcdef12345678",
          commitMessage: "Topic work",
          commitShortId: "1234567",
          isDefault: false,
          name: "topic/branch-admin",
          pullRequest: {
            ownerName: "owner",
            projectName: "projectYobi",
            pullRequestNumber: 7,
            state: "open",
          },
          shortName: "topic/branch-admin",
        },
      ],
      defaultBranch: "main",
      noHead: false,
      ownerName: "owner",
      permissions: {
        canDelete: true,
        canUpdate: true,
      },
      projectName: "projectYobi",
    });

    expect(branchHtml).toContain('class="table branch-list-wrap"');
    expect(branchHtml).toContain('class="head"');
    expect(branchHtml).toContain('class="branchName"');
    expect(branchHtml).toContain('class="headBranch ml10"');
    expect(branchHtml).toContain('href="/yona/owner/projectYobi/code/main"');
    expect(branchHtml).toContain('href="/yona/owner/projectYobi/commits/main"');
    expect(branchHtml).toContain('class="commitId"');
    expect(branchHtml).toContain('class="pullRequest"');
    expect(branchHtml).toContain('href="/yona/owner/projectYobi/pullRequest/7"');
    expect(branchHtml).toContain('class="actions"');
    expect(branchHtml).toContain('data-request-method="post"');
    expect(branchHtml).toContain(
      'data-request-uri="/yona/owner/projectYobi/code/topic%2Fbranch-admin/setAsDefault"',
    );
    expect(branchHtml).toContain('data-request-method="delete"');
    expect(branchHtml).toContain('href="/yona/owner/projectYobi/code/topic%2Fbranch-admin/"');
  });
});
