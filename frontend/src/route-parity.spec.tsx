import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  renderHome,
  renderOrganizationDirectory,
  renderOrganizationDetail,
  renderProjectDirectory,
  renderPublicUserProfile,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";
import {
  OrganizationBoardListPage,
  ProjectBoardDetailPage,
  ProjectBoardListPage,
  ProjectPostFormPage,
} from "./routes/-board-views";
import {
  CodeBranchListPage,
  CodeBrowserPage,
  CodeCommitDetailPage,
  CodeComparePage,
  CodeHistoryPage,
} from "./routes/-code-views";
import type {
  CodeBrowserViewModel,
  ProjectIssueDetailViewModel,
  ProjectDetailViewModel,
} from "./routes/-view-models";
import { ProjectIssueFormPage, UserIssueListPage } from "./routes/-issue-views";
import {
  ProjectMilestoneDetailPage,
  ProjectMilestoneFormPage,
  ProjectMilestoneListPage,
} from "./routes/-milestone-views";
import { OrganizationIssueListPage } from "./routes/-organization-views";
import {
  OrganizationPullRequestListPage,
  ProjectPullRequestDetailPage,
  ProjectPullRequestListPage,
  ProjectReviewsPage,
  PullRequestChangesPage,
} from "./routes/-pull-request-views";
import { ProjectWebhooksPage } from "./routes/-project-views";
import { SearchPagination } from "./routes/-search-views";

function expectOrderedText(html: string, orderedSnippets: string[]) {
  let previousIndex = -1;
  for (const snippet of orderedSnippets) {
    const nextIndex = html.indexOf(snippet);
    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

const baseIssueDetail: ProjectIssueDetailViewModel = {
  assigneeAvatarUrl: "",
  assigneeLabel: "",
  assigneeLoginId: "",
  attachments: [],
  authorAvatarUrl: "",
  authorId: 1,
  authorLabel: "owner",
  authorLoginId: "owner",
  bodyHtml: "",
  bodyMarkdown: "",
  childClosedCount: 0,
  childIssues: [],
  childOpenCount: 0,
  commentCount: 0,
  comments: [],
  dueDateLabel: "",
  hasVoted: false,
  historyHtml: "",
  historyMarkdown: "",
  isDraft: false,
  isFavorited: false,
  isWatching: false,
  issueNumber: 1,
  labels: [],
  milestoneId: 0,
  milestoneTitle: "",
  ownerName: "owner",
  parentIssueId: 0,
  parentIssueNumber: 0,
  parentIssueTitle: "",
  projectName: "projectYobi",
  sharers: [],
  state: "open",
  timeline: [],
  title: "",
  viewerCanComment: true,
  viewerCanDelete: true,
  viewerCanManageSharers: true,
  viewerCanUpdate: true,
  viewerHasInheritedShare: false,
  viewerIsDirectSharer: false,
  voterCount: 0,
  watcherCount: 0,
  weight: 0,
};

describe("file-route parity harness", () => {
  it("keeps canonical and alias auth/settings routes in the generated route tree", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(routeTreeSource).toContain("fullPath: '/users/loginform'");
    expect(routeTreeSource).toContain("fullPath: '/_UIKit'");
    expect(routeTreeSource).toContain("fullPath: '/users/signupform'");
    expect(routeTreeSource).toContain("fullPath: '/lostPassword'");
    expect(routeTreeSource).toContain("fullPath: '/resetPassword'");
    expect(routeTreeSource).toContain("fullPath: '/projects'");
    expect(routeTreeSource).toContain("fullPath: '/orgs'");
    expect(routeTreeSource).toContain("fullPath: '/notification'");
    expect(routeTreeSource).toContain("fullPath: '/notifications'");
    expect(routeTreeSource).toContain("fullPath: '/user/editform'");
    expect(routeTreeSource).toContain("fullPath: '/user/issues'");
    expect(routeTreeSource).toContain("fullPath: '/verify/$loginId/$verificationCode'");
    expect(routeTreeSource).toContain("fullPath: '/login'");
    expect(routeTreeSource).toContain("fullPath: '/register'");
    expect(routeTreeSource).toContain("fullPath: '/forgot-password'");
    expect(routeTreeSource).toContain("fullPath: '/reset-password'");
    expect(routeTreeSource).toContain("fullPath: '/me/settings/profile'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/milestones'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/newMilestoneForm'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/milestone/$milestoneId'");
    expect(routeTreeSource).toContain(
      "fullPath: '/$owner/$projectName/milestone/$milestoneId/editform'",
    );
    expect(routeTreeSource).toContain("fullPath: '/search'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/search'");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/search'");
  });

  it("requires real project issue routes instead of placeholder pages", () => {
    const issueListRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issues/route.tsx"),
      "utf8",
    );
    const issueDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issue/$issueNumber/route.tsx"),
      "utf8",
    );

    expect(issueListRouteSource).not.toContain("PlaceholderPage");
    expect(issueDetailRouteSource).not.toContain("PlaceholderPage");
    expect(issueDetailRouteSource).toContain("voteIssueComment");
    expect(issueDetailRouteSource).toContain("unvoteIssueComment");
    expect(issueDetailRouteSource).toContain("onCommentVoteToggle");
  });

  it("preserves legacy issue create and edit form shells", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const detail = {
      dashboard: {
        labels: [
          {
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "kind",
            color: "#51aacc",
            id: 5,
            name: "bug",
            openIssueCount: 2,
          },
        ],
      },
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "",
      ownerName: "owner",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanEnroll: false,
      viewerCanUpdate: true,
    };
    const milestones = [
      {
        attachments: [],
        closedIssueCount: 0,
        closedIssues: [],
        completionPercent: 0,
        contentsHtml: "",
        contentsMarkdown: "",
        dueDateLabel: "",
        id: 7,
        openIssueCount: 0,
        openIssues: [],
        state: "open",
        title: "v1.0",
        viewerCanDelete: false,
        viewerCanUpdate: false,
      },
    ];

    const createHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={detail}
        initialBodyMarkdown="Template body"
        initialParentIssueId={31}
        milestoneOptions={milestones}
        mode="create"
        onSubmit={async () => undefined}
        parentIssueOptions={[{ id: 31, issueNumber: 12, selected: true, title: "Parent issue" }]}
        referCommentId="55"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(createHtml).toContain('class="app-shell issue-form-page page-wrap-outer"');
    expect(createHtml).toContain('class="project-page-wrap"');
    expect(createHtml).toContain('class="content-wrap frm-wrap"');
    expect(createHtml).toContain('id="issue-form"');
    expect(createHtml).toContain('action="/yona/owner/projectYobi/issues/latest"');
    expect(createHtml).toContain('encType="multipart/form-data"');
    expect(createHtml).toContain('id="title"');
    expect(createHtml).toContain('name="title"');
    expect(createHtml).toContain('class="text title"');
    expect(createHtml).toContain('maxLength="250"');
    expect(createHtml).toContain('tabindex="1"');
    expect(createHtml).toContain('placeholder="title"');
    expect(createHtml).toContain('class="span1 subtask-message"');
    expect(createHtml).toContain('class="subtask-wrap show"');
    expect(createHtml).toContain('id="targetProjectId"');
    expect(createHtml).toContain('id="parentId"');
    expect(createHtml).toContain('name="parentIssueId"');
    expect(createHtml).toContain('<option value="31" selected="">#12. Parent issue</option>');
    expect(createHtml).toContain('class="span9 span-left-pane"');
    expect(createHtml).toContain('data-toggle="markdown-editor"');
    expect(createHtml).toContain('class="nav nav-tabs nm small"');
    expect(createHtml).toContain("common.editor.edit");
    expect(createHtml).toContain("common.editor.preview");
    expect(createHtml).toContain('class="markdown-help"');
    expect(createHtml).toContain('class="markdown-preview markdown-wrap content-body"');
    expect(createHtml).toContain('class="notification-receiver"');
    expect(createHtml).toContain('class="editorSeries content comment nm"');
    expect(createHtml).toContain('id="editor-body-content-body"');
    expect(createHtml).toContain('name="body"');
    expect(createHtml).toContain('data-editor-mode="content-body"');
    expect(createHtml).toContain("Template body");
    expect(createHtml).toContain('data-resourcetype="ISSUE_POST"');
    expect(createHtml).toContain('id="button-save"');
    expect(createHtml).toContain('class="ybtn ybtn-success"');
    expect(createHtml).toContain('id="draft-save-btn"');
    expect(createHtml).toContain('class="span3 span-hard-wrap right-menu"');
    expect(createHtml).toContain("issue.assignee");
    expect(createHtml).toContain('id="assignee"');
    expect(createHtml).toContain('name="assigneeLoginId"');
    expect(createHtml).toContain('class="bigdrop"');
    expect(createHtml).toContain('id="milestoneOption"');
    expect(createHtml).toContain('id="milestoneId"');
    expect(createHtml).toContain('data-format="milestone"');
    expect(createHtml).toContain('value="7"');
    expect(createHtml).toContain('id="issueDueDate"');
    expect(createHtml).toContain('data-toggle="calendar"');
    expect(createHtml).toContain('class="search-btn btn-calendar"');
    expect(createHtml).toContain('id="labelIds"');
    expect(createHtml).toContain('name="labelIds"');
    expect(createHtml).toContain('data-format="issuelabel"');
    expect(createHtml).toContain('class="label issue-label list-label active"');
    expect(createHtml).toContain('name="referCommentId"');
    expect(createHtml).toContain('value="55"');
    expect(createHtml).not.toContain("Yona Rust Project");

    const editHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={detail}
        initialIssue={
          {
            ...baseIssueDetail,
            assigneeLoginId: "guest",
            authorId: 9,
            authorLoginId: "owner",
            bodyMarkdown: "Existing body",
            dueDateLabel: "2026-08-02",
            issueNumber: 17,
            labels: [{ color: "#51aacc", id: 5, name: "bug" }],
            milestoneId: 7,
            parentIssueId: 31,
            parentIssueNumber: 12,
            parentIssueTitle: "Parent issue",
            state: "closed",
            title: "Existing issue",
          }
        }
        milestoneOptions={milestones}
        mode="edit"
        onSubmit={async () => undefined}
        parentIssueOptions={[{ id: 31, issueNumber: 12, selected: true, title: "Parent issue" }]}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(editHtml).toContain('action="/yona/owner/projectYobi/issue/17/edit"');
    expect(editHtml).toContain('name="authorId"');
    expect(editHtml).toContain('value="9"');
    expect(editHtml).toContain('<strong class="secondary-txt">#17</strong>');
    expect(editHtml).toContain('value="Existing issue"');
    expect(editHtml).toContain("Existing body");
    expect(editHtml).toContain('id="state"');
    expect(editHtml).toContain('data-value="CLOSED"');
    expect(editHtml).toContain('data-selected="true"');
    expect(editHtml).toContain('id="notificationMail"');
    expect(editHtml).toContain('value="guest"');
    expect(editHtml).toContain('id="issueDueDate"');
    expect(editHtml).toContain('value="2026-08-02"');
    expect(editHtml).toContain('<option value="31" selected="">#12. Parent issue</option>');
    expect(editHtml).toContain('<option data-state="open" value="7" selected="">v1.0</option>');
    expect(editHtml).toContain(
      '<option data-category-id="3" data-category-is-exclusive="false" value="5" selected="">bug</option>',
    );

    const draftEditHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={detail}
        initialIssue={
          {
            ...baseIssueDetail,
            assigneeLoginId: "",
            authorLoginId: "owner",
            bodyMarkdown: "Draft body",
            isDraft: true,
            issueNumber: 18,
            labels: [],
            milestoneId: 0,
            state: "draft",
            title: "Draft issue",
          }
        }
        mode="edit"
        onSubmit={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(draftEditHtml).toContain('<span class="draft">issue.state.draft</span>');
    expect(draftEditHtml).toContain('id="button-draft-publish"');
    expect(draftEditHtml).toContain("button.draft.publish");
    expect(draftEditHtml).toContain('id="draft-save-btn"');
    expect(draftEditHtml).not.toContain('id="button-save"');
    expect(draftEditHtml).not.toContain('id="notificationMail"');
  });

  it("requires a real project code browser route instead of a placeholder page", () => {
    const codeRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/route.tsx"),
      "utf8",
    );
    const codeIndexRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/index.tsx"),
      "utf8",
    );
    const codeRouteHelperSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/-code-route.tsx"),
      "utf8",
    );

    expect(codeRouteSource).not.toContain("PlaceholderPage");
    expect(codeRouteSource).toContain("Outlet");
    expect(codeIndexRouteSource).toContain("CodeBrowserRouteView");
    expect(codeRouteHelperSource).toContain("readCodeBrowser");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code/$branch'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code/$branch/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code/$branch/$'");
  });

  it("requires a real project commit history route instead of a placeholder page", () => {
    const commitsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commits/route.tsx"),
      "utf8",
    );
    const commitsIndexRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commits/index.tsx"),
      "utf8",
    );
    const commitsRouteHelperSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commits/-code-history-route.tsx"),
      "utf8",
    );
    const codeViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-code-views.tsx"),
      "utf8",
    );

    expect(commitsRouteSource).not.toContain("PlaceholderPage");
    expect(commitsRouteSource).toContain("Outlet");
    expect(commitsIndexRouteSource).toContain("CodeHistoryRouteView");
    expect(commitsRouteHelperSource).toContain("readCodeHistory");
    expect(codeViewsSource).toContain("data-via-email");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch/$'");
  });

  it("renders code browser surfaces without temporary Yona Rust headings", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const detail: ProjectDetailViewModel = {
      cloneUrl: "http://localhost/owner/projectYobi.git",
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "Project overview",
      ownerName: "owner",
      projectName: "projectYobi",
      projectScope: "public",
      showCode: true,
      viewerCanEnroll: false,
      viewerCanUpdate: true,
    };
    const commit = {
      authorAvatarUrl: "/yona/files/88",
      authorDate: "2026-06-01T00:00:00Z",
      authorEmail: "dev@example.com",
      authorLoginId: "dev",
      authorName: "Dev",
      commentCount: 0,
      commitId: "abcdef1234567890",
      commitShortId: "abcdef1",
      message: "Initial commit\n\nDetailed body",
      shortMessage: "Initial commit",
    };
    const code: CodeBrowserViewModel = {
      branches: [{ name: "main" }],
      breadcrumbs: [],
      entries: [],
      noHead: false,
      ownerName: "owner",
      path: "",
      projectName: "projectYobi",
      selectedBranch: "main",
    };
    const pages = [
      renderToStaticMarkup(
        <CodeBrowserPage code={code} detail={detail} runtimeConfig={runtimeConfig} />,
      ),
      renderToStaticMarkup(
        <CodeCommitDetailPage
          commitDetail={{
            branches: [{ name: "main" }],
            breadcrumbs: [],
            commit,
            files: [],
            noHead: false,
            ownerName: "owner",
            parentCommit: null,
            path: "",
            permissions: { canComment: false, canUpdateThreadState: false },
            projectName: "projectYobi",
            selectedBranch: "main",
            threads: [],
          }}
          detail={detail}
          runtimeConfig={runtimeConfig}
        />,
      ),
      renderToStaticMarkup(
        <CodeComparePage
          compare={{
            commitA: commit,
            commitB: commit,
            files: [],
            noHead: false,
            ownerName: "owner",
            projectName: "projectYobi",
            revA: "main",
            revB: "topic",
          }}
          detail={detail}
          runtimeConfig={runtimeConfig}
        />,
      ),
      renderToStaticMarkup(
        <CodeBranchListPage
          branchList={{
            branches: [
              {
                commitDate: "2026-06-01T00:00:00Z",
                commitId: "abcdef1234567890",
                commitMessage: "Initial commit",
                commitShortId: "abcdef1",
                isDefault: true,
                name: "refs/heads/main",
                pullRequest: null,
                shortName: "main",
              },
              {
                commitDate: "2026-06-02T00:00:00Z",
                commitId: "1234567890abcdef",
                commitMessage: "Topic commit",
                commitShortId: "1234567",
                isDefault: false,
                name: "refs/heads/topic",
                pullRequest: null,
                shortName: "topic",
              },
            ],
            defaultBranch: "main",
            noHead: false,
            ownerName: "owner",
            permissions: { canDelete: true, canUpdate: true },
            projectName: "projectYobi",
          }}
          detail={detail}
          onDeleteBranch={async () => undefined}
          onSetDefaultBranch={async () => undefined}
          runtimeConfig={runtimeConfig}
        />,
      ),
      renderToStaticMarkup(
        <CodeHistoryPage
          detail={detail}
          history={{
            branches: [{ name: "main" }],
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
          }}
          runtimeConfig={runtimeConfig}
        />,
      ),
    ];

    for (const html of pages) {
      expect(html).toContain('class="code-browse-wrap');
      expect(html).not.toContain("Yona Rust Project");
    }
    for (const html of [pages[0], pages[1], pages[3], pages[4]]) {
      expect(html).toContain(">code.files</a>");
      expect(html).toContain(">code.commits</a>");
      expect(html).toContain(">title.branches</a>");
      expect(html).not.toContain(">Files</a>");
      expect(html).not.toContain(">Commit</a>");
      expect(html).not.toContain(">Commits</a>");
      expect(html).not.toContain(">Branches</a>");
    }
    expect(pages[0]).toContain("<h1>menu.code</h1>");
    expect(pages[0]).toContain(
      '<select class="pull-left" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(pages[0]).toContain(">code.download</a>");
    expect(pages[0]).toContain('id="new-file-link"');
    expect(pages[0]).toContain(">code.new.file</a>");
    expect(pages[0]).toContain('href="/yona/owner/projectYobi/postform?path=&amp;branch=main"');
    expect(pages[0]).not.toContain(">Download</a>");
    expect(pages[0]).not.toContain('<label for="branches">Branch</label>');
    expect(pages[2]).toContain("<h1>abcdef1234567890..abcdef1234567890</h1>");
    expect(pages[2]).toContain('<p class="commitInfo">');
    expect(pages[2]).toContain('<strong class="commitId">@abcdef1234567890..abcdef1234567890</strong>');
    expect(pages[2]).not.toContain("<h1>Compare</h1>");
    expect(pages[3]).toContain("<h1>title.branches</h1>");
    expect(pages[3]).not.toContain("<h1>Branches</h1>");
    expect(pages[4]).toContain("<h1>code.commits</h1>");
    expect(pages[4]).toContain(
      '<select class="pull-right" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(pages[4]).toContain('<option value="/yona/owner/projectYobi/commits/main" selected="">main</option>');
    expect(pages[4]).not.toContain("<h1>Commit History</h1>");
    expect(pages[4]).not.toContain('<label for="branches">Branch</label>');
    const branchListHtml = pages[3];
    expect(branchListHtml).toContain("<th>title.branches</th>");
    expect(branchListHtml).toContain("<th>code.branches.commit</th>");
    expect(branchListHtml).toContain("<th>code.branches.pullRequest</th>");
    expect(branchListHtml).toContain("code.branches.defaultBranch");
    expect(branchListHtml).toContain("code.branches.noPullRequest");
    expect(branchListHtml).toContain(">code.branches.setAsDefault</button>");
    expect(branchListHtml).toContain(">button.delete</a>");
    expect(branchListHtml).not.toContain(">Branches</th>");
    expect(branchListHtml).not.toContain(">Commit</th>");
    expect(branchListHtml).not.toContain(">Pull Request</th>");
    expect(branchListHtml).not.toContain(">Default branch<");
    expect(branchListHtml).not.toContain(">No pull request<");
    expect(branchListHtml).not.toContain(">Set as default</button>");
    expect(branchListHtml).not.toContain(">Delete</a>");
    const emptyBranchListHtml = renderToStaticMarkup(
      <CodeBranchListPage
        branchList={{
          branches: [],
          defaultBranch: "main",
          noHead: false,
          ownerName: "owner",
          permissions: { canDelete: true, canUpdate: true },
          projectName: "projectYobi",
        }}
        detail={detail}
        onDeleteBranch={async () => undefined}
        onSetDefaultBranch={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(emptyBranchListHtml).toContain('<tbody></tbody>');
    expect(emptyBranchListHtml).not.toContain("No branches");
    expect(emptyBranchListHtml).not.toContain('class="warning-none"');
    expect(pages[0]).toContain("code.nofiles");
    expect(pages[0]).not.toContain("No file exists");
    expect(pages[2]).toContain("code.noChanges");
    expect(pages[2]).not.toContain("No changes");
    expect(pages[4]).toContain("code.nocommits");
    expect(pages[4]).not.toContain("No commits");
    const folderHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...code,
          path: "docs",
          entries: [
            {
              authorAvatarUrl: "/yona/files/77",
              authorLabel: "Author",
              authorLoginId: "author",
              commitDate: "2026-06-01",
              commitMessage: "Update docs",
              commitShortId: "abcdef1",
              kind: "folder",
              name: "guides",
              path: "docs/guides",
              size: 12,
            },
          ],
        }}
        detail={detail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(folderHtml).toContain("<strong>code.filename</strong>");
    expect(folderHtml).toContain("<strong>code.commitMsg</strong>");
    expect(folderHtml).toContain("<strong>code.commitDate</strong>");
    expect(folderHtml).toContain('class="span6 filename"');
    expect(folderHtml).toContain('class="span5 commitMsg"');
    expect(folderHtml).toContain('<a class="avatar-wrap smaller" href="/yona/author"><img src="/yona/files/77"/></a>');
    expect(folderHtml).toContain('class="span1 commitDate"');
    expect(folderHtml).toContain('class="dynatree-icon vmiddle"');
    expect(folderHtml).toContain('data-listPath="docs"');
    expect(folderHtml).toContain('id="cb-docs/guides"');
    expect(folderHtml).toContain('data-path="docs/guides"');
    expect(folderHtml).toContain('data-targetPath="docs/guides"');
    expect(folderHtml).toContain('data-type="folder"');
    expect(folderHtml).toContain('href="/yona/owner/projectYobi/code/main/docs/guides#cb-docs/guides"');
    expect(folderHtml).toContain('title="guides"');
    expect(folderHtml).toContain(
      'href="/yona/owner/projectYobi/commit/abcdef1?branch=main&amp;path=docs%2Fguides#docs-guides"',
    );
    expect(folderHtml).toContain(">Update docs</a>");
    expect(folderHtml).not.toContain("<strong>File name</strong>");
    expect(folderHtml).not.toContain("<strong>Commit message</strong>");
    expect(folderHtml).not.toContain("<strong>Commit date</strong>");
    expect(folderHtml).not.toContain("No commit message");
    expect(folderHtml).not.toContain("File: guides");
    expect(folderHtml).not.toContain("Folder: ");
    const historyHtml = renderToStaticMarkup(
      <CodeHistoryPage
        detail={detail}
        history={{
          branches: [{ name: "main" }],
          breadcrumbs: [
            { name: "docs", path: "docs" },
            { name: "guides", path: "docs/guides" },
          ],
          commits: [{ ...commit, commentCount: 2 }],
          hasNewer: true,
          hasOlder: true,
          noHead: false,
          ownerName: "owner",
          page: 1,
          path: "README.md",
          projectName: "projectYobi",
          selectedBranch: "main",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(historyHtml).toContain("<strong>code.commitMsg</strong>");
    expect(historyHtml).toContain("<strong>code.authorDate</strong>");
    expect(historyHtml).toContain("<strong>code.author</strong>");
    expect(historyHtml).toContain(
      '<a href="/yona/owner/projectYobi/commits/main/docs">docs</a><a href="/yona/owner/projectYobi/commits/main/docs/guides">guides</a>',
    );
    expect(historyHtml).not.toContain("<span>/</span>");
    expect(historyHtml).toContain('title="code.copyCommitId"');
    expect(historyHtml).toContain('data-commitId="abcdef1234567890"');
    expect(historyHtml).not.toContain('data-commit-id="abcdef1234567890"');
    expect(historyHtml).toContain('class="yobicon-copy"');
    expect(historyHtml).toContain('title="code.showCommit"');
    expect(historyHtml).toContain('<span class="number-of-comments"><i class="yobicon-comments"></i> 2</span>');
    expect(historyHtml).toContain('class="yobicon-comments"');
    expect(historyHtml).toContain("</i> 2</span>");
    expect(historyHtml).toContain('class="commitMsg short"');
    expect(historyHtml).toContain('<button class="commitMsg moreBtn" type="button"><span>…</span></button>');
    expect(historyHtml).toContain('<pre class="commitMsg desc hidden">');
    expect(historyHtml).toContain("Detailed body</pre>");
    expect(historyHtml).not.toContain('<pre class="commitMsg desc hidden">Initial commit');
    expect(historyHtml).not.toContain('class="number-of-comments ml5"');
    expect(historyHtml).toContain('title="code.showCodeAtThisCommit"');
    expect(historyHtml).toContain(">code.showCode</a>");
    expect(historyHtml).toContain(
      '<a class="avatar-wrap" data-placement="top" data-toggle="tooltip" href="/yona/dev" title="dev"><img alt="Dev" height="32" src="/yona/files/88" width="32"/></a>',
    );
    expect(historyHtml).toContain(">code.newer</a>");
    expect(historyHtml).toContain(">code.older</a>");
    expect(historyHtml).not.toContain("<strong>Author date</strong>");
    expect(historyHtml).not.toContain("<strong>Author</strong>");
    expect(historyHtml).not.toContain('title="Copy commit id"');
    expect(historyHtml).not.toContain('title="Show commit"');
    expect(historyHtml).not.toContain("Comments 2");
    expect(historyHtml).not.toContain("Show code");
    expect(historyHtml).not.toContain(">Newer</a>");
    expect(historyHtml).not.toContain(">Older</a>");
    const compareHtml = renderToStaticMarkup(
      <CodeComparePage
        compare={{
          commitA: commit,
          commitB: { ...commit, commitId: "1234567890abcdef" },
          files: [{ path: "README.md", patch: "@@ -1 +1 @@\n-old\n+new" }],
          noHead: false,
          ownerName: "owner",
          projectName: "projectYobi",
          revA: "main",
          revB: "topic",
        }}
        detail={detail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(compareHtml).toContain("<h1>abcdef1234567890..1234567890abcdef</h1>");
    expect(compareHtml).toContain('<div class="diff-body discommentable">');
    expect(compareHtml).toContain('<article class="diff-file" id="README-md">');
    expect(compareHtml).not.toContain("<h1>Compare</h1>");
  });

  it("requires real search routes and legacy search class anchors", () => {
    const globalSearchRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/search/route.tsx"),
      "utf8",
    );
    const projectSearchRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/search/route.tsx"),
      "utf8",
    );
    const organizationSearchRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/search/route.tsx"),
      "utf8",
    );
    const searchViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-search-views.tsx"),
      "utf8",
    );

    expect(globalSearchRouteSource).not.toContain("PlaceholderPage");
    expect(projectSearchRouteSource).not.toContain("PlaceholderPage");
    expect(organizationSearchRouteSource).not.toContain("PlaceholderPage");
    for (const anchor of [
      "site-breadcrumb-outer",
      "search-category-wrap",
      "num-badge",
      "search-box-wrap",
      "searchInnerForm",
      "searchKeyword",
      "search-result-title",
      "search-result-wrap",
      "search-list-wrap",
      "search-list-item",
      "title-wrap",
      "search-content-body",
      "search-meta-info",
      "pagination",
      "empty-result",
      "keyword",
    ]) {
      expect(searchViewsSource).toContain(anchor);
    }
    expect(searchViewsSource).toContain('snippet.truncated ? " ....." : null');
    expect(searchViewsSource).toContain('props.scope.type === "project"');
    expect(searchViewsSource).toContain('category.type === "project"');
    expect(searchViewsSource).toContain("readProjectSearch");
    expect(searchViewsSource).toContain("readOrganizationSearch");
    expect(searchViewsSource).toContain("apiQueryKeys.search.project");

    const paginationHtml = renderToStaticMarkup(
      <SearchPagination
        input={{ keyword: "Needle", pageNum: 2, searchType: "issue" }}
        response={{
          context: { organizationName: "", ownerName: "", projectName: "" },
          counts: {
            issueComments: 0,
            issues: 41,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [],
          keyword: "Needle",
          pageNum: 2,
          pageSize: 20,
          requestedSearchType: "issue",
          scope: "global",
          searchType: "issue",
          totalCount: 41,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        scope={{ type: "global" }}
      />,
    );
    expect(paginationHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(paginationHtml).toContain('<ul class="page-nums">');
    expect(paginationHtml).toContain('name="pageNum"');
    expect(paginationHtml).toContain('value="2"');
    expect(paginationHtml).toContain("button.prevPage");
    expect(paginationHtml).toContain("button.nextPage");
    expect(paginationHtml).toContain(
      'href="/yona/search?keyword=Needle&amp;searchType=issue&amp;pageNum=1"',
    );
    expect(paginationHtml).toContain(
      'href="/yona/search?keyword=Needle&amp;searchType=issue&amp;pageNum=3"',
    );
    expect(paginationHtml).not.toContain("Previous");
    expect(paginationHtml).not.toContain("Page 2 of 3");
  });

  it("requires a real organization issue route instead of a placeholder page", () => {
    const organizationIssueRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/issues/route.tsx"),
      "utf8",
    );

    expect(organizationIssueRouteSource).not.toContain("PlaceholderPage");
    expect(organizationIssueRouteSource).toContain("listOrganizationIssues");
  });

  it("preserves the legacy organization issue list shell", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const listHtml = renderToStaticMarkup(
      <OrganizationIssueListPage
        currentUserId={42}
        detail={{
          description: "A group",
          organizationName: "acme",
          viewerCanUpdate: true,
        }}
        issueList={{
          closedIssueCount: 1,
          items: [
            {
              assigneeLabel: "Mona",
              authorLabel: "Door",
              commentCount: 3,
              issueNumber: 7,
              labels: [{ color: "#ff7332", id: 11, name: "bug" }],
              milestoneTitle: "M1",
              ownerName: "acme",
              projectName: "rocket",
              state: "open",
              title: "Fix the group issue list",
              updatedLabel: "1 hour ago",
              voterCount: 2,
              watcherCount: 5,
            },
            {
              assigneeLabel: "",
              authorLabel: "",
              commentCount: 0,
              issueNumber: 8,
              labels: [],
              milestoneTitle: "",
              ownerName: "acme",
              projectName: "rocket",
              state: "open",
              title: "Unassigned row",
              updatedLabel: "today",
              voterCount: 0,
              watcherCount: 0,
            },
          ],
          openIssueCount: 2,
          organizationName: "acme",
          pageNum: 1,
          pageSize: 20,
          totalCount: 2,
          visibleProjects: [{ ownerName: "acme", projectName: "rocket" }],
        }}
        query={{
          assigneeId: 0,
          authorId: 0,
          filter: "fix",
          mentionId: 0,
          orderBy: "updatedDate",
          orderDir: "desc",
          pageNum: 1,
          projectNames: ["rocket"],
          state: "open",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(listHtml).toContain("page-wrap-outer");
    expect(listHtml).toContain("row-fluid issue-list-wrap");
    expect(listHtml).toContain("left-menu span2 span-hard-wrap");
    expect(listHtml).toContain('id="search"');
    expect(listHtml).toContain('id="projects"');
    expect(listHtml).toContain('name="projectNames[]"');
    expect(listHtml).toContain('data-toggle="select2"');
    expect(listHtml).toContain("lst-stacked unstyled");
    expect(listHtml).toContain("issue.list.all");
    expect(listHtml).toContain("issue.list.assignedToMe");
    expect(listHtml).toContain("issue.list.authoredByMe");
    expect(listHtml).toContain("issue.list.mentionedOfMe");
    expect(listHtml).toContain('data-mention-id="42"');
    expect(listHtml).toMatch(/data-search="mentionId"[^>]*name="mentionId"[^>]*value=""/);
    expect(listHtml).toContain("mentionId=42");
    expect(listHtml).toContain('class="nav nav-tabs nm"');
    expect(listHtml).toContain("issue.state.open");
    expect(listHtml).toContain('class="num-badge">2');
    expect(listHtml).toContain("filter-wrap small-heights");
    expect(listHtml).toContain('data-order-by="updatedDate"');
    expect(listHtml).toContain("common.order.updatedDate");
    expect(listHtml).toContain('class="post-list-wrap"');
    expect(listHtml).toContain("post-item title");
    expect(listHtml).toContain('class="avatar-wrap mlarge hide-in-mobile empty-avatar-wrap"');
    expect(listHtml).toContain('href="/yona/acme/rocket/issue/7"');
    expect(listHtml).toContain("Fix the group issue list");
    expect(listHtml).toContain("infos-item item-count-groups");
    expect(listHtml).toContain('class="infos-link-item group-project-name"');
    expect(listHtml).toContain('class="post-id margin-right-5">#7');
    expect(listHtml).toContain('class="label issue-label list-label"');
    expect(listHtml).toContain('data-label-id="11"');
    expect(listHtml).toContain('title="issue.assignee: Mona"');
    expect(listHtml).toContain('id="pagination"');
    expect(listHtml).not.toContain("Yona Rust Organization");
    expect(listHtml).not.toContain("Search issues");
    expect(listHtml).not.toContain("Assignee:");

    const emptyHtml = renderToStaticMarkup(
      <OrganizationIssueListPage
        currentUserId={0}
        detail={{
          description: "A group",
          organizationName: "acme",
          viewerCanUpdate: false,
        }}
        issueList={{
          closedIssueCount: 0,
          items: [],
          openIssueCount: 0,
          organizationName: "acme",
          pageNum: 1,
          pageSize: 20,
          totalCount: 0,
          visibleProjects: [],
        }}
        query={{
          assigneeId: 0,
          authorId: 0,
          filter: "",
          mentionId: 0,
          orderBy: "",
          orderDir: "",
          pageNum: 1,
          projectNames: [],
          state: "open",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(emptyHtml).toContain("error-wrap");
    expect(emptyHtml).toContain("ico ico-err1");
    expect(emptyHtml).toContain("issue.is.empty");
    expect(emptyHtml).not.toContain("issue.list.assignedToMe");
  });

  it("requires a real user issue route instead of a placeholder page", () => {
    const userIssueRoutePath = path.resolve(__dirname, "routes/user/issues/route.tsx");

    expect(fs.existsSync(userIssueRoutePath)).toBe(true);
    const userIssueRouteSource = fs.readFileSync(userIssueRoutePath, "utf8");
    expect(userIssueRouteSource).not.toContain("PlaceholderPage");
    expect(userIssueRouteSource).toContain("listUserIssues");
  });

  it("preserves the legacy user issue list shell", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <UserIssueListPage
        canSetDefaultLoginPage={true}
        issueList={{
          closedIssueCount: 1,
          filter: "assigned",
          items: [
            {
              assigneeLabel: "Mona",
              authorLabel: "Door",
              commentCount: 4,
              issueNumber: 9,
              labels: [{ color: "#51aacc", id: 23, name: "bug" }],
              milestoneTitle: "M2",
              ownerName: "acme",
              projectName: "rocket",
              state: "open",
              title: "Fix my issue list",
              updatedLabel: "2 hours ago",
              voterCount: 1,
              watcherCount: 3,
            },
            {
              assigneeLabel: "",
              authorLabel: "",
              commentCount: 0,
              issueNumber: 10,
              labels: [],
              milestoneTitle: "",
              ownerName: "acme",
              projectName: "rocket",
              state: "open",
              title: "No assignee",
              updatedLabel: "today",
              voterCount: 0,
              watcherCount: 0,
            },
          ],
          openIssueCount: 2,
          pageNum: 1,
          pageSize: 20,
          sideFilterCounts: { favorite: 3, mentioned: 5, shared: 7 },
          state: "open",
          totalCount: 2,
          viewerUserId: 42,
        }}
        query={{
          filter: "shared",
          orderBy: "updatedDate",
          orderDir: "desc",
          pageNum: 1,
          query: "fix",
          state: "open",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("app-shell user-issue-list-page page-wrap-outer");
    expect(html).toContain("page-wrap");
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('href="/yona/notifications"');
    expect(html).toContain('href="/yona/user/issues"');
    expect(html).toContain('href="/yona/user/files"');
    expect(html).toContain("notification");
    expect(html).toContain("issue.myIssue");
    expect(html).toContain("user.files");
    expect(html).toContain('id="setDefaultLoginPage"');
    expect(html).toContain('data-url="user/issues"');
    expect(html).toContain("button.setDefaultLoginPage");
    expect(html).toContain("row-fluid issue-list-wrap");
    expect(html).toContain("left-menu span2 span-hard-wrap");
    expect(html).toContain("lst-stacked unstyled");
    expect(html).toContain("assigned-to-me");
    expect(html).toContain("issue.list.assignedToMe");
    expect(html).toContain("commented-by-me");
    expect(html).toContain("mentioned-of-me");
    expect(html).toContain("shared-with-me");
    expect(html).toContain('data-mention-id="42"');
    expect(html).toContain('data-sharer-id="42"');
    expect(html).toMatch(/data-search="sharerId"[^>]*name="sharerId"[^>]*value="42"/);
    expect(html).toMatch(/data-search="mentionId"[^>]*name="mentionId"[^>]*value=""/);
    expect(html).toContain("favorite-issue");
    expect(html).not.toContain("(3)");
    expect(html).not.toContain("(5)");
    expect(html).not.toContain("(7)");
    expect(html).toContain('id="search"');
    expect(html).toContain("myissues-search-input");
    expect(html).toContain('name="query"');
    expect(html).toContain('placeholder="issue.search"');
    expect(html).toContain('class="nav nav-tabs nm"');
    expect(html).toContain("issue.state.open");
    expect(html).toContain("show-subtasks-li");
    expect(html).toContain("filter-wrap small-heights");
    expect(html).toContain('data-order-by="updatedDate"');
    expect(html).toContain("common.order.updatedDate");
    expect(html).toContain('class="post-list-wrap my-issues"');
    expect(html).toContain("project-name-in-my-issues");
    expect(html).toContain("fixed-height-my-issues-list");
    expect(html).toContain('href="/yona/acme/rocket/issue/9"');
    expect(html).toContain("Fix my issue list");
    expect(html).toContain("item-count-groups");
    expect(html).toContain("for-subtask-progressbar");
    expect(html).toContain("twoColumeModeTarget");
    expect(html).toContain('data-label-id="23"');
    expect(html).toContain("author-cell");
    expect(html).toContain("meta-cell");
    expect(html).toContain('title="issue.assignee: Mona"');
    expect(html).toContain('id="pagination"');
    expect(html).not.toContain("Yona Rust User Issues");
    expect(html).not.toContain("Search issues");
    expect(html).not.toContain("Author:");
    expect(html).not.toContain("Assignee:");

    const mentionedHtml = renderToStaticMarkup(
      <UserIssueListPage
        issueList={{
          closedIssueCount: 0,
          filter: "mentioned",
          items: [],
          openIssueCount: 0,
          pageNum: 1,
          pageSize: 20,
          sideFilterCounts: { favorite: 3, mentioned: 5, shared: 7 },
          state: "open",
          totalCount: 0,
          viewerUserId: 42,
        }}
        query={{
          filter: "mentioned",
          orderBy: "updatedDate",
          orderDir: "desc",
          pageNum: 1,
          query: "",
          state: "open",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(mentionedHtml).toContain('class="active"><a data-assignee-id=""');
    expect(mentionedHtml).toContain('data-mention-id="42"');
    expect(mentionedHtml).toMatch(
      /data-search="mentionId"[^>]*name="mentionId"[^>]*value="42"/,
    );
    expect(mentionedHtml).toMatch(/data-search="sharerId"[^>]*name="sharerId"[^>]*value=""/);
    expect(mentionedHtml).toContain("issue.list.mentionedOfMe</span><span> (5)</span>");
    expect(mentionedHtml).toContain("issue.list.sharedWithMe</span><span> (7)</span>");
    expect(mentionedHtml).toContain("issue.list.favorite</span><span> (3)</span>");

    const emptyHtml = renderToStaticMarkup(
      <UserIssueListPage
        issueList={{
          closedIssueCount: 0,
          filter: "assigned",
          items: [],
          openIssueCount: 0,
          pageNum: 1,
          pageSize: 20,
          sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
          state: "open",
          totalCount: 0,
          viewerUserId: 42,
        }}
        query={{
          filter: "assigned",
          orderBy: "updatedDate",
          orderDir: "desc",
          pageNum: 1,
          query: "",
          state: "open",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(emptyHtml).toContain("error-wrap");
    expect(emptyHtml).toContain("ico ico-err1");
    expect(emptyHtml).toContain("issue.is.empty");
  });

  it("requires a real notification inbox route using TanStack Query", () => {
    const notificationRoutePath = path.resolve(__dirname, "routes/notification/route.tsx");
    const notificationsAliasRoutePath = path.resolve(__dirname, "routes/notifications/route.tsx");

    expect(fs.existsSync(notificationRoutePath)).toBe(true);
    expect(fs.existsSync(notificationsAliasRoutePath)).toBe(true);
    const notificationRouteSource = fs.readFileSync(notificationRoutePath, "utf8");
    const notificationsAliasRouteSource = fs.readFileSync(notificationsAliasRoutePath, "utf8");
    expect(notificationRouteSource).not.toContain("PlaceholderPage");
    expect(notificationRouteSource).not.toContain("Yona Rust Notifications");
    expect(notificationsAliasRouteSource).not.toContain("PlaceholderPage");
    expect(notificationsAliasRouteSource).toContain("NotificationRouteComponent");
    expect(notificationsAliasRouteSource).toContain('routePath="/notifications"');
    expect(notificationRouteSource).toContain('routePath="/notifications"');
    expect(notificationRouteSource).not.toContain('routePath = "/notification"');
    expect(notificationRouteSource).toContain("useQuery");
    expect(notificationRouteSource).toContain("listNotificationsQueryOptions");
    expect(notificationRouteSource).toContain("page-wrap-outer");
    expect(notificationRouteSource).toContain("page-wrap");
    expect(notificationRouteSource).toContain("content-container");
    expect(notificationRouteSource).toContain("main-stream");
    expect(notificationRouteSource).toContain("MySeriesMenuTabs");
    expect(notificationRouteSource).toContain('className="nav nav-tabs"');
    expect(notificationRouteSource).toContain('href={prefixBasePath(basePath, "/notifications")}');
    expect(notificationRouteSource).toContain("issue.myIssue");
    expect(notificationRouteSource).toContain("user.files");
    expect(notificationRouteSource).toContain('id="setDefaultLoginPage"');
    expect(notificationRouteSource).toContain("button.setDefaultLoginPage");
    expect(notificationRouteSource).toContain("setDefaultLandingPathRest");
    expect(notificationRouteSource).toContain("notification-wrap");
    expect(notificationRouteSource).toContain("warning-none");
    expect(notificationRouteSource).toContain("yobicon-danger");
    expect(notificationRouteSource).toContain("notification.none");
    expect(notificationRouteSource).not.toContain("No notification has been received.");
    expect(notificationRouteSource).not.toContain('<li className="warning-none">notification.none</li>');
    expect(notificationRouteSource).toContain('data-toggle="learnmore"');
    expect(notificationRouteSource).toContain('href="javascript:void(0);"');
    expect(notificationRouteSource).toContain('id="notification-more"');
    expect(notificationRouteSource).not.toContain("`/users/${encodeURIComponent(loginId)}`");
    expect(notificationRouteSource).toContain("`/${encodeURIComponent(loginId)}`");
    const appCssSource = fs.readFileSync(path.resolve(__dirname, "app.css"), "utf8");
    expect(appCssSource).toContain(".notification-stream .message-wrap.nowrap");
  });

  it("requires real board routes and board API wiring instead of placeholders", () => {
    const boardListRoutePath = path.resolve(
      __dirname,
      "routes/$owner/$projectName/posts/route.tsx",
    );
    const boardDetailRoutePath = path.resolve(
      __dirname,
      "routes/$owner/$projectName/post/$postNumber/route.tsx",
    );
    const boardCreateRoutePath = path.resolve(
      __dirname,
      "routes/$owner/$projectName/postform/route.tsx",
    );
    const boardEditRoutePath = path.resolve(
      __dirname,
      "routes/$owner/$projectName/post/$postNumber/editform/route.tsx",
    );
    const organizationBoardRoutePath = path.resolve(
      __dirname,
      "routes/organizations/$organizationName/boards/route.tsx",
    );
    const boardApiPath = path.resolve(__dirname, "api/boards.ts");

    for (const routePath of [
      boardListRoutePath,
      boardDetailRoutePath,
      boardCreateRoutePath,
      boardEditRoutePath,
      organizationBoardRoutePath,
    ]) {
      expect(fs.existsSync(routePath)).toBe(true);
      expect(fs.readFileSync(routePath, "utf8")).not.toContain("PlaceholderPage");
    }

    expect(fs.readFileSync(boardListRoutePath, "utf8")).toContain("listProjectPostsQueryOptions");
    expect(fs.readFileSync(boardDetailRoutePath, "utf8")).toContain("readProjectPostQueryOptions");
    expect(fs.readFileSync(boardCreateRoutePath, "utf8")).toContain("createProjectPostRest");
    expect(fs.readFileSync(boardEditRoutePath, "utf8")).toContain("updateProjectPostRest");
    expect(fs.readFileSync(organizationBoardRoutePath, "utf8")).toContain(
      "listOrganizationBoardsQueryOptions",
    );
    expect(fs.readFileSync(boardApiPath, "utf8")).toContain("/posts");

    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/posts'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/postform'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/post/$postNumber'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/post/$postNumber/editform'");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/boards'");
  });

  it("preserves board permission gates and pagination controls in static markup", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const boardItem = {
      authorAvatarUrl: "/yona/avatar/owner.png",
      authorLabel: "Owner",
      authorLoginId: "owner",
      commentCount: 0,
      createdLabel: "now",
      labels: [],
      notice: false,
      ownerName: "owner",
      postNumber: "16",
      projectName: "projectYobi",
      readme: false,
      title: "Second page post",
      updatedLabel: "now",
    };
    const listHtml = renderToStaticMarkup(
      <ProjectBoardListPage
        canCreate={false}
        detail={null}
        filter="needle"
        labelIds={["7"]}
        labels={[]}
        orderBy="updatedDate"
        orderDir="desc"
        posts={{
          items: [boardItem],
          notices: [],
          ownerName: "owner",
          pageNum: 2,
          pageSize: 15,
          projectName: "projectYobi",
          readme: null,
          totalCount: 31,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(listHtml).not.toContain("postform");
    expect(listHtml).toContain('class="app-shell board-page page-wrap-outer"');
    expect(listHtml).toContain('<div class="post-list project-page-wrap">');
    expect(listHtml).toContain('<div class="search-wrap underline board-toolbar">');
    expect(listHtml).toContain('id="option_form"');
    expect(listHtml).toContain('method="get"');
    expect(listHtml).toContain('class="pull-left"');
    expect(listHtml).toContain('<div class="search-bar">');
    expect(listHtml).toContain('class="textbox"');
    expect(listHtml).toContain('name="filter"');
    expect(listHtml).toContain('placeholder="project.searchPlaceholder"');
    expect(listHtml).toContain('<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>');
    expect(listHtml).toContain('name="orderBy"');
    expect(listHtml).toContain('name="orderDir"');
    expect(listHtml).toContain('<div class="two-column-mode-checkbox-area"></div>');
    expect(listHtml).toContain('<div class="filter-wrap board">');
    expect(listHtml).toContain('<div class="filters">');
    expect(listHtml).toContain('<ul class="post-list-wrap">');
    expect(listHtml).toContain('class="post-item title post-row"');
    expect(listHtml).toContain('class="avatar-wrap mlarge hide-in-mobile"');
    expect(listHtml).toContain(
      '<img alt="Owner" height="32" src="/yona/avatar/owner.png" width="32"/>',
    );
    expect(listHtml).toContain('class="title-wrap post-row-main"');
    expect(listHtml).toContain('<span class="post-id">16</span>');
    expect(listHtml).toContain('class="title post-title"');
    expect(listHtml).toContain('class="infos post-row-meta"');
    expect(listHtml).toContain('class="infos-item infos-link-item"');
    expect(listHtml).toContain('<div class="write-btn-wrap"></div>');
    expect(listHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(listHtml).toContain('<ul class="page-nums">');
    expect(listHtml).toContain('name="pageNum"');
    expect(listHtml).toContain('value="2"');
    expect(listHtml).toContain("button.prevPage");
    expect(listHtml).toContain("button.nextPage");
    expect(listHtml).toContain("pageNum=1");
    expect(listHtml).toContain("pageNum=3");
    expect(listHtml).not.toContain("Page 2 of 3");

    const creatableListHtml = renderToStaticMarkup(
      <ProjectBoardListPage
        canCreate
        detail={null}
        filter=""
        labelIds={["7"]}
        labels={[
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "kind",
            color: "#abc",
            id: "7",
            name: "guide",
          },
        ]}
        orderBy="updatedDate"
        orderDir="desc"
        posts={{
          items: [
            { ...boardItem, commentCount: 2, labels: [], title: "[Guide][Pinned] Board post" },
            { ...boardItem, commentCount: 0, postNumber: "18", readme: true, title: "README" },
          ],
          notices: [{ ...boardItem, notice: true, postNumber: "17", title: "Pinned notice" }],
          ownerName: "owner",
          pageNum: 1,
          pageSize: 15,
          projectName: "projectYobi",
          readme: null,
          totalCount: 3,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(creatableListHtml).toContain('href="/yona/owner/projectYobi/postform"');
    expect(creatableListHtml).toContain("post.write");
    expect(creatableListHtml).toContain('<div class="board-labels"><select');
    expect(creatableListHtml).toContain('name="labelIds[]"');
    expect(creatableListHtml).toContain('<ul class="post-list-wrap notice-wrap">');
    expect(creatableListHtml).toContain('class="label label-notice"');
    expect(creatableListHtml).toContain('class="label label-important"');
    expect(creatableListHtml).not.toContain("board-badge");
    expect(creatableListHtml).not.toContain("board-badges");
    expect(creatableListHtml).toContain('class="title-prefix"');
    expect(creatableListHtml).toContain('href="#!"');
    expect(creatableListHtml).toContain("[Guide]");
    expect(creatableListHtml).toContain("[Pinned]");
    expect(creatableListHtml).toContain("> Board post</a>");
    expect(creatableListHtml).not.toContain("[Guide][Pinned] Board post</a>");
    expect(creatableListHtml).toContain('class="comments-count comments-count-color"');
    expect(creatableListHtml).toContain('class="count-groups item-icon"');
    expect(creatableListHtml).toContain('class="count-groups item-count"');
    expect(creatableListHtml).toContain('href="/yona/owner/projectYobi/post/16#comments"');
    expect(creatableListHtml).not.toContain("Comments 0");

    const emptyListHtml = renderToStaticMarkup(
      <ProjectBoardListPage
        canCreate={false}
        detail={null}
        filter=""
        labelIds={[]}
        labels={[]}
        orderBy="updatedDate"
        orderDir="desc"
        posts={{
          items: [],
          notices: [],
          ownerName: "owner",
          pageNum: 1,
          pageSize: 15,
          projectName: "projectYobi",
          readme: null,
          totalCount: 0,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(emptyListHtml).toContain('<div class="error-wrap">');
    expect(emptyListHtml).toContain('post.is.empty');

    const detailHtml = renderToStaticMarkup(
      <ProjectBoardDetailPage
        post={{
          ...boardItem,
          attachments: [],
          authorId: "1",
          bodyHtml: "",
          bodyMarkdown: "body #1",
          comments: [
            {
              attachments: [],
              authorId: "1",
              authorLabel: "Owner User",
              authorLoginId: "owner",
              contentsHtml: "",
              contentsMarkdown: "via mail",
              createdLabel: "now",
              id: "9",
              parentCommentId: "",
              viaEmail: true,
            },
          ],
          historyHtml: "",
          historyMarkdown: "",
          id: "16",
          labels: [
            {
              categoryId: "3",
              categoryIsExclusive: false,
              categoryName: "kind",
              color: "#abc",
              id: "7",
              name: "guide",
            },
          ],
          issueReferences: [
            {
              issueNumber: 1,
              ownerName: "owner",
              projectName: "projectYobi",
              state: "open",
              title: "Referenced issue",
            },
          ],
          isWatching: false,
          permissions: {
            canComment: false,
            canCreate: false,
            canDelete: false,
            canRead: true,
            canSetNotice: false,
            canUpdate: false,
            canWatch: false,
          },
          watcherCount: 0,
        }}
        onCommentDelete={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(detailHtml).not.toContain(">Watch<");
    expect(detailHtml).not.toContain("Leave a comment");
    expect(detailHtml).toContain('class="app-shell board-page page-wrap-outer"');
    expect(detailHtml).toContain('<div class="project-page-wrap board-view">');
    expect(detailHtml).toContain('<div class="board-header issue">');
    expect(detailHtml).toContain('<strong class="board-id">#16</strong>');
    expect(detailHtml).toContain('<div class="board-body row-fluid">');
    expect(detailHtml).toContain('<div class="span9 span-left-pane">');
    expect(detailHtml).toContain('<div class="author-info">');
    expect(detailHtml).toContain('class="content markdown-wrap"');
    expect(detailHtml).toContain('<div class="board-actrow right-txt board-actions">');
    expect(detailHtml).toContain('id="translate"');
    expect(detailHtml).toContain('title="button.translation"');
    expect(detailHtml).toContain('class="yobicon-lang"');
    expect(detailHtml).toContain('<div class="watcher-list"></div>');
    expect(detailHtml).toContain('<div class="board-comment-wrap" id="comments">');
    expect(detailHtml).toContain('<div id="timeline">');
    expect(detailHtml).toContain('<div class="timeline-list">');
    expect(detailHtml).toContain('<div class="comment-header">');
    expect(detailHtml).toContain('<i class="yobicon-comments"></i>');
    expect(detailHtml).toContain('<strong class="num">1</strong>');
    expect(detailHtml).toContain('<hr class="nm"/>');
    expect(detailHtml).toContain('<ul class="comments board-comments">');
    expect(detailHtml).toContain('class="comment board-comment author"');
    expect(detailHtml).toContain('<div class="comment-avatar">');
    expect(detailHtml).toContain('<div class="media-body">');
    expect(detailHtml).toContain('<div class="meta-info">');
    expect(detailHtml).toContain('class="comment_author"');
    expect(detailHtml).toContain('class="ago-date"');
    expect(detailHtml).toContain('class="share-link"');
    expect(detailHtml).toContain('style="display:none"');
    expect(detailHtml).toContain('class="act-row pull-right"');
    expect(detailHtml).toContain('class="icon btn-transparent ml10 comment-translate"');
    expect(detailHtml).toContain('data-comment-id="9"');
    expect(detailHtml).toContain('id="comment-editform-9"');
    expect(detailHtml).toContain('class="comment-update-form"');
    expect(detailHtml).toContain('data-toggle="markdown-editor"');
    expect(detailHtml).toContain('href="#edit-9"');
    expect(detailHtml).toContain('href="#preview-9"');
    expect(detailHtml).toContain('data-editor-mode="update-comment-body"');
    expect(detailHtml).toContain('class="markdown-help"');
    expect(detailHtml).toContain('class="markdown-preview markdown-wrap update-comment-body"');
    expect(detailHtml).toContain('class="upload-drop-here"');
    expect(detailHtml).toContain('data-resource-type="NONISSUE_COMMENT"');
    expect(detailHtml).toContain('class="ybtn ybtn-cancel"');
    expect(detailHtml).toContain(">button.cancel</button>");
    expect(detailHtml).toContain('class="ybtn ybtn-info"');
    expect(detailHtml).toContain(">button.save</button>");
    expect(detailHtml).not.toContain(">Save</button>");
    expect(detailHtml).not.toContain(">Cancel</button>");
    expect(detailHtml).toContain('id="comment-body-9"');
    expect(detailHtml).toContain('data-via-email="true"');
    expect(detailHtml).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(detailHtml).toContain('data-issue-state="open"');
    expect(detailHtml).toContain('class="write-comment-box mt20"');
    expect(detailHtml).toContain('data-login="required"');
    expect(detailHtml).toContain('class="comment disabled"');
    expect(detailHtml).toContain('<dt>label</dt>');
    expect(detailHtml).toContain('class="label issue-label active static"');
    expect(detailHtml).toContain('data-label-id="7"');
    expect(detailHtml).toContain('href="&amp;labelIds=7"');
    expect(detailHtml).toContain("guide");
    expect(detailHtml).not.toContain('class="board-label"');

    const writableDetailHtml = renderToStaticMarkup(
      <ProjectBoardDetailPage
        post={{
          ...boardItem,
          attachments: [],
          authorId: "1",
          bodyHtml: "",
          bodyMarkdown: "body",
          comments: [],
          historyHtml: "",
          historyMarkdown: "",
          id: "16",
          isWatching: true,
          permissions: {
            canComment: true,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: false,
            canUpdate: true,
            canWatch: true,
          },
          watcherCount: 2,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(writableDetailHtml).toContain('class="ybtn ybtn-watching"');
    expect(writableDetailHtml).toContain('id="watch-button"');
    expect(writableDetailHtml).toContain('data-watching="true"');
    expect(writableDetailHtml).toContain(">post.unwatch</button>");
    expect(writableDetailHtml).not.toContain(">Unwatch</button>");
    expect(writableDetailHtml).not.toContain("Watchers 2");
    expect(writableDetailHtml).toContain('href="/yona/owner/projectYobi/postform"');
    expect(writableDetailHtml).toContain('id="comment-form"');
    expect(writableDetailHtml).toContain(
      'action="/yona/owner/projectYobi/post/16/comment"',
    );
    expect(writableDetailHtml).toContain('encType="multipart/form-data"');
    expect(writableDetailHtml).toContain('<div class="write-comment-box">');
    expect(writableDetailHtml).toContain('<div class="write-comment-wrap">');
    expect(writableDetailHtml).toContain('id="dynamic-comment-btn"');
    expect(writableDetailHtml).toContain(">button.comment.new</button>");
    expect(writableDetailHtml).toContain('id="editor-contents-comment-body"');
    expect(writableDetailHtml).toContain('name="contents"');
    expect(writableDetailHtml).not.toContain("Leave a comment");
    expect(writableDetailHtml).not.toContain(">Comment</button>");
    expect(writableDetailHtml).not.toContain('name="contentsMarkdown"');

    const childCommentHtml = renderToStaticMarkup(
      <ProjectBoardDetailPage
        post={{
          ...boardItem,
          attachments: [],
          authorId: "1",
          bodyHtml: "",
          bodyMarkdown: "body",
          comments: [
            {
              attachments: [],
              authorId: "1",
              authorLabel: "Owner User",
              authorLoginId: "owner",
              contentsHtml: "",
              contentsMarkdown: "parent",
              createdLabel: "now",
              id: "9",
              parentCommentId: "",
              viaEmail: false,
            },
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Reply User",
              authorLoginId: "reply",
              contentsHtml: "",
              contentsMarkdown: "child reply",
              createdLabel: "later",
              id: "10",
              parentCommentId: "9",
              viaEmail: false,
            },
          ],
          historyHtml: "",
          historyMarkdown: "",
          id: "16",
          isWatching: false,
          permissions: {
            canComment: true,
            canCreate: false,
            canDelete: true,
            canRead: true,
            canSetNotice: false,
            canUpdate: true,
            canWatch: false,
          },
          watcherCount: 0,
        }}
        onCommentDelete={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(childCommentHtml).toContain('class="add-a-comment pull-right"');
    expect(childCommentHtml).toContain("comment.oneline.comment.placeholder");
    expect(childCommentHtml).toContain('class="subcomment-media-body"');
    expect(childCommentHtml).toContain('class="child-comments"');
    expect(childCommentHtml).toContain('class="one-line-comment"');
    expect(childCommentHtml).toContain("child reply");
    expect(childCommentHtml).toContain('class="subcomment-author hide"');
    expect(childCommentHtml).toContain('href="/yona/reply"');
    expect(childCommentHtml).toContain('class="btn-transparent deleteButtonX"');
    expect(childCommentHtml).toContain('class="child-comment-input-form"');
    expect(childCommentHtml).toContain('class="parentCommentId"');
    expect(childCommentHtml).toContain('name="parentCommentId"');
    expect(childCommentHtml).toContain('value="9"');
    expect(childCommentHtml).toContain('class="oneline-comment-box"');
    expect(childCommentHtml).toContain('markdown="true"');
    expect(childCommentHtml).toContain('placeholder="comment.oneline.comment.placeholder (CTRL + ENTER)"');
    expect(childCommentHtml).toContain(">OK</button>");
    expect(childCommentHtml).toContain('class="notification-receiver"');
    expect(childCommentHtml).toContain("notification.receiver.list.title");

    const orgHtml = renderToStaticMarkup(
      <OrganizationBoardListPage
        boards={{
          items: [{ ...boardItem, ownerName: "weblabs", projectName: "alpha" }],
          organizationName: "weblabs",
          pageNum: 1,
          pageSize: 15,
          totalCount: 16,
          visibleProjects: [{ ownerName: "weblabs", projectName: "alpha" }],
        }}
        filter="board"
        orderBy="createdDate"
        orderDir="asc"
        organizationName="weblabs"
        projectNames={["alpha"]}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(orgHtml).toContain('<ul class="page-nums">');
    expect(orgHtml).toContain('name="pageNum"');
    expect(orgHtml).toContain('value="1"');
    expect(orgHtml).toContain("button.prevPage");
    expect(orgHtml).toContain("button.nextPage");
    expect(orgHtml).not.toContain("Page 1 of 2");
    expect(orgHtml).not.toContain("<h1>Boards</h1>");
    expect(orgHtml).toContain("projectNames%5B%5D=alpha");
    expect(orgHtml).toContain("pageNum=2");
    expect(orgHtml).toContain('class="app-shell board-page page-wrap-outer"');
    expect(orgHtml).toContain('<div class="project-page-wrap">');
    expect(orgHtml).toContain('<div class="search-wrap underline board-toolbar">');
    expect(orgHtml).toContain('id="option_form"');
    expect(orgHtml).toContain('method="get"');
    expect(orgHtml).toContain('class="pull-left"');
    expect(orgHtml).toContain('<div class="project-selects span7">');
    expect(orgHtml).toContain('id="projects"');
    expect(orgHtml).toContain('name="projectNames[]"');
    expect(orgHtml).toContain('data-format="projects"');
    expect(orgHtml).toContain('data-placeholder="organization.choose.projects"');
    expect(orgHtml).toContain('data-toggle="select2"');
    expect(orgHtml).toContain('data-container-css-class="fullsize"');
    expect(orgHtml).toContain('<div class="search-bar span4">');
    expect(orgHtml).toContain('class="textbox group-board"');
    expect(orgHtml).toContain('name="filter"');
    expect(orgHtml).toContain('placeholder="title.searchByKeyword"');
    expect(orgHtml).toContain('<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>');
    expect(orgHtml).toContain('<div class="two-column-mode-checkbox-area"></div>');
    expect(orgHtml).toContain('<div class="filter-wrap board">');
    expect(orgHtml).toContain('<ul class="post-list-wrap">');
    expect(orgHtml).toContain('class="post-item title post-row"');
    expect(orgHtml).toContain('href="/yona/weblabs/alpha/posts"');
    expect(orgHtml).toContain('class="infos-item infos-link-item group-project-name"');
    expect(orgHtml).toContain('<span class="post-id">#16</span>');
    expect(orgHtml).toContain('<div class="write-btn-wrap"></div>');
    expect(orgHtml).toContain('class="page-navigation-wrap" id="pagination"');

    const emptyOrgHtml = renderToStaticMarkup(
      <OrganizationBoardListPage
        boards={{
          items: [],
          organizationName: "weblabs",
          pageNum: 1,
          pageSize: 15,
          totalCount: 0,
          visibleProjects: [],
        }}
        filter=""
        orderBy="updatedDate"
        orderDir="desc"
        organizationName="weblabs"
        projectNames={[]}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(emptyOrgHtml).toContain('<div class="error-wrap">');
    expect(emptyOrgHtml).toContain("post.is.empty");
  });

  it("preserves legacy board create and edit form shells", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const noopSubmit = async () => {};
    const createHtml = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice
        canMarkReadme
        labels={[]}
        mode="create"
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={noopSubmit}
      />,
    );

    expect(createHtml).toContain('class="app-shell board-page page-wrap-outer"');
    expect(createHtml).toContain('<div class="project-page-wrap">');
    expect(createHtml).toContain(
      'action="/yona/owner/projectYobi/post"',
    );
    expect(createHtml).toContain('method="post"');
    expect(createHtml).toContain('encType="multipart/form-data"');
    expect(createHtml).toContain('class="nm board-form"');
    expect(createHtml).toContain('<div class="content-wrap frm-wrap">');
    expect(createHtml).toContain("<dl>");
    expect(createHtml).toContain("<dd>");
    expect(createHtml).toContain('id="title"');
    expect(createHtml).toContain('name="title"');
    expect(createHtml).toContain('class="zen-mode text title"');
    expect(createHtml).toContain('maxLength="250"');
    expect(createHtml).toContain('tabindex="1"');
    expect(createHtml).toContain('placeholder="title"');
    expect(createHtml).toContain('id="editor-body-content-body"');
    expect(createHtml).toContain('name="body"');
    expect(createHtml).not.toContain('name="bodyMarkdown"');
    expect(createHtml).toContain('data-toggle="markdown-editor"');
    expect(createHtml).toContain('class="markdown-help"');
    expect(createHtml).toContain('class="markdown-preview markdown-wrap content-body"');
    expect(createHtml).toContain('class="notification-receiver"');
    expect(createHtml).toContain('data-editor-mode="content-body"');
    expect(createHtml).toContain('class="editorSeries content comment nm"');
    expect(createHtml).toContain('class="right-txt mt10 mb10"');
    expect(createHtml).toContain('id="notice"');
    expect(createHtml).toContain('name="notice"');
    expect(createHtml).toContain("post.notice.label");
    expect(createHtml).toContain('id="issueTemplate"');
    expect(createHtml).toContain('id="branch"');
    expect(createHtml).toContain('id="path"');
    expect(createHtml).toContain('id="lineEnding"');
    expect(createHtml).toContain('id="readme"');
    expect(createHtml).toContain('name="readme"');
    expect(createHtml).toContain("post.readmefy");
    expect(createHtml).toContain('class="actions board-actions"');
    expect(createHtml).toContain('class="ybtn ybtn-success"');
    expect(createHtml).toContain(">button.save</button>");
    expect(createHtml).toContain(">button.cancel</a>");
    expect(createHtml).not.toContain(">Save</button>");
    expect(createHtml).not.toContain(">Cancel</a>");

    const editHtml = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice
        canMarkReadme
        initialPost={{
          authorId: "1",
          authorLabel: "Owner",
          authorLoginId: "owner",
          attachments: [],
          bodyHtml: "",
          bodyMarkdown: "Existing body",
          commentCount: 0,
          comments: [],
          createdLabel: "now",
          historyHtml: "",
          historyMarkdown: "",
          id: "16",
          isWatching: false,
          labels: [],
          notice: true,
          ownerName: "owner",
          permissions: {
            canComment: true,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: true,
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "16",
          projectName: "projectYobi",
          readme: false,
          title: "Existing post",
          updatedLabel: "now",
          watcherCount: 0,
        }}
        labels={[]}
        mode="edit"
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={noopSubmit}
      />,
    );
    expect(editHtml).toContain('action="/yona/owner/projectYobi/post/16"');
    expect(editHtml).toContain('<label for="title">title</label>');
    expect(editHtml).toContain('value="Existing post"');
    expect(editHtml).toContain('class="ybtn ybtn-info"');
    expect(editHtml).toContain('class="send-notification-check"');
    expect(editHtml).toContain('id="notificationMail"');
    expect(editHtml).toContain('name="notificationMail"');
    expect(editHtml).toContain('value="yes"');
    expect(editHtml).toContain('notification.send.mail');

    const onlineCommitHtml = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice
        canMarkReadme
        labels={[]}
        mode="create"
        onlineCommit={{
          branch: "main",
          edit: false,
          issueTemplate: false,
          path: "docs/",
          preparedBodyMarkdown: "Prepared",
          title: "Commit title",
        }}
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={noopSubmit}
      />,
    );
    expect(onlineCommitHtml).toContain('placeholder="code.commitMsg"');
    expect(onlineCommitHtml).toContain('class="file-path-wrap"');
    expect(onlineCommitHtml).toContain('class="help file-path"');
    expect(onlineCommitHtml).toContain("main: /docs/");
    expect(onlineCommitHtml).toContain('class="new-file-name"');
    expect(onlineCommitHtml).toContain('name="new-file-name"');
    expect(onlineCommitHtml).toContain('placeholder="filename.."');
    expect(onlineCommitHtml).not.toContain('id="notice"');
    expect(onlineCommitHtml).not.toContain('id="readme"');

    const issueTemplateHtml = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice
        canMarkReadme
        labels={[]}
        mode="create"
        onlineCommit={{
          branch: "main",
          edit: true,
          issueTemplate: true,
          path: "ISSUE_TEMPLATE.md",
          preparedBodyMarkdown: "Template",
          title: "ISSUE_TEMPLATE.md: Project Issue Template",
        }}
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={noopSubmit}
      />,
    );
    expect(issueTemplateHtml).toContain('class="attach-wrap"');
    expect(issueTemplateHtml).toContain('class="help help-droppable"');
    expect(issueTemplateHtml).toContain("issue.template.no.attachment.allow");
    expect(issueTemplateHtml).not.toContain('class="new-file-name"');
  });

  it("renders milestone descriptions from Markdown source in React", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <ProjectMilestoneDetailPage
        detail={null}
        issueState="open"
        milestone={{
          attachments: [],
          closedIssueCount: 0,
          closedIssues: [],
          completionPercent: 0,
          contentsHtml: "",
          contentsMarkdown: "Ship **parity** with `React` #1",
          dueDateLabel: "",
          id: 7,
          issueReferences: [
            {
              issueNumber: 1,
              ownerName: "owner",
              projectName: "projectYobi",
              state: "closed",
              title: "Milestone reference",
            },
          ],
          openIssueCount: 0,
          openIssues: [],
          state: "open",
          title: "v1.0",
          viewerCanDelete: false,
          viewerCanUpdate: false,
        }}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<div class="markdown-wrap"><p>Ship <strong>parity</strong> with ');
    expect(html).toContain("<code>React</code>");
    expect(html).toContain('data-issue-state="closed"');
    expect(html).not.toContain("contentsHtml");
  });

  it("preserves legacy milestone list and detail shells", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const detail = {
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "",
      ownerName: "owner",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanEnroll: false,
      viewerCanUpdate: true,
    };
    const milestone = {
      attachments: [],
      closedIssueCount: 1,
      closedIssues: [
        {
          assigneeLabel: "Door",
          commentCount: 0,
          issueNumber: 2,
          labels: [{ color: "#f44336", id: 5, name: "bug" }],
          state: "closed",
          title: "Closed issue",
          updatedLabel: "2026-07-02",
        },
      ],
      completionPercent: 50,
      contentsHtml: "",
      contentsMarkdown: "Milestone body",
      dueDateLabel: "2026-07-01",
      id: 7,
      issueReferences: [],
      mentionReferences: [],
      openIssueCount: 1,
      openIssues: [
        {
          assigneeLabel: "Nori",
          commentCount: 1,
          issueNumber: 1,
          labels: [{ color: "#2196f3", id: 6, name: "feature" }],
          state: "open",
          title: "Open issue",
          updatedLabel: "2026-07-01",
        },
      ],
      state: "open",
      title: "v1.0",
      viewerCanDelete: true,
      viewerCanUpdate: true,
    };

    const listHtml = renderToStaticMarkup(
      <ProjectMilestoneListPage
        detail={detail}
        list={{ milestones: [milestone, { ...milestone, id: 8, title: "v2.0" }], orderBy: "dueDate", orderDir: "desc", state: "all" }}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(listHtml).toContain('class="page-wrap-outer"');
    expect(listHtml).toContain('class="project-page-wrap"');
    expect(listHtml).toContain('class="tab-wrap"');
    expect(listHtml).toContain("milestone.menu.new");
    expect(listHtml).toContain("milestone.state.open");
    expect(listHtml).toContain("milestone.state.closed");
    expect(listHtml).toContain("milestone.state.all");
    expect(listHtml).toContain('class="filter-wrap milestone"');
    expect(listHtml).toContain("common.order.dueDate");
    expect(listHtml).toContain("common.order.completionRate");
    expect(listHtml).toContain('placeholder="search.title"');
    expect(listHtml).toContain('class="milestones"');
    expect(listHtml).toContain('class="milestone"');
    expect(listHtml).toContain('class="version"');
    expect(listHtml).toContain('class="progress-wrap"');
    expect(listHtml).toContain('target="_blank"');
    expect(listHtml).toContain('class="issue-item"');
    expect(listHtml).toContain('data-label-id="6"');
    expect(listHtml).not.toContain("Yona Rust Project");
    expect(listHtml).not.toContain("No milestone exists");

    const emptyListHtml = renderToStaticMarkup(
      <ProjectMilestoneListPage
        detail={detail}
        list={{ milestones: [], orderBy: "dueDate", orderDir: "asc", state: "open" }}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(emptyListHtml).toContain('class="ico ico-err1"');
    expect(emptyListHtml).toContain("milestone.is.empty");

    const detailHtml = renderToStaticMarkup(
      <ProjectMilestoneDetailPage
        detail={detail}
        issueState="open"
        milestone={milestone}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onClose={async () => undefined}
        onDelete={async () => undefined}
      />,
    );
    expect(detailHtml).toContain('class="milesion-wrap"');
    expect(detailHtml).toContain('class="title"');
    expect(detailHtml).toContain("label.dueDate");
    expect(detailHtml).toContain('class="attachments"');
    expect(detailHtml).toContain('data-attachments="[]"');
    expect(detailHtml).toContain('class="actrow right-txt row-fluid"');
    expect(detailHtml).toContain("button.list");
    expect(detailHtml).toContain('href="#deleteConfirm"');
    expect(detailHtml).toContain("button.edit");
    expect(detailHtml).toContain("milestone.close");
    expect(detailHtml).toContain('data-request-method="post"');
    expect(detailHtml).toContain('data-request-uri="/yona/owner/projectYobi/milestone/7/close"');
    expect(detailHtml).toContain('id="issues"');
    expect(detailHtml).toContain('placeholder="milestone.searchPlaceholder"');
    expect(detailHtml).toContain('data-toggle="item-search"');
    expect(detailHtml).toContain('id="deleteConfirm"');
    expect(detailHtml).toContain("milestone.delete");
    expect(detailHtml).toContain("post.delete.confirm");
    expect(detailHtml).toContain('data-request-method="delete"');
    expect(detailHtml).toContain('data-request-uri="/yona/owner/projectYobi/milestone/7/delete"');
    expect(detailHtml).not.toContain("Yona Rust Project");
  });

  it("preserves legacy milestone create and edit form shells", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const detail = {
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "",
      ownerName: "owner",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanEnroll: false,
      viewerCanUpdate: true,
    };
    const baseMilestone = {
      attachments: [],
      closedIssueCount: 0,
      closedIssues: [],
      completionPercent: 0,
      contentsHtml: "",
      contentsMarkdown: "Existing body",
      dueDateLabel: "2026-07-01",
      id: 7,
      openIssueCount: 0,
      openIssues: [],
      state: "closed",
      title: "v1.0",
      viewerCanDelete: true,
      viewerCanUpdate: true,
    };

    const createHtml = renderToStaticMarkup(
      <ProjectMilestoneFormPage
        detail={detail}
        mode="create"
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(createHtml).toContain('class="app-shell milestone-form-page page-wrap-outer"');
    expect(createHtml).toContain('class="project-page-wrap"');
    expect(createHtml).toContain('class="content-wrap frm-wrap"');
    expect(createHtml).toContain('id="milestone-form"');
    expect(createHtml).toContain('action="/yona/owner/projectYobi/milestones"');
    expect(createHtml).toContain('class="row-fluid"');
    expect(createHtml).toContain('class="span12"');
    expect(createHtml).toContain('id="title"');
    expect(createHtml).toContain('class="zen-mode text title"');
    expect(createHtml).toContain('maxLength="250"');
    expect(createHtml).toContain('name="title"');
    expect(createHtml).toContain('placeholder="title.text"');
    expect(createHtml).toContain('tabindex="1"');
    expect(createHtml).toContain('class="span9 span-left-pane"');
    expect(createHtml).toContain('data-toggle="markdown-editor"');
    expect(createHtml).toContain('class="markdown-help"');
    expect(createHtml).toContain('class="markdown-preview markdown-wrap content-body"');
    expect(createHtml).toContain('class="notification-receiver"');
    expect(createHtml).toContain('class="editorSeries content comment nm"');
    expect(createHtml).toContain('data-editor-mode="content-body"');
    expect(createHtml).toContain('id="editor-contents-content-body"');
    expect(createHtml).toContain('name="contents"');
    expect(createHtml).toContain('class="actrow right-txt"');
    expect(createHtml).toContain('class="ybtn ybtn-info"');
    expect(createHtml).toContain('class="span3 span-hard-wrap"');
    expect(createHtml).toContain('class="issue-option"');
    expect(createHtml).toContain("milestone.form.state");
    expect(createHtml).toContain('id="milestone-open"');
    expect(createHtml).toContain('class="radio-btn"');
    expect(createHtml).toContain("milestone.state.open");
    expect(createHtml).toContain('id="milestone-close"');
    expect(createHtml).toContain("milestone.state.closed");
    expect(createHtml).toContain("milestone.form.dueDate");
    expect(createHtml).toContain('id="dueDate"');
    expect(createHtml).toContain('name="dueDate"');
    expect(createHtml).toContain('class="validate due-date"');
    expect(createHtml).toContain('id="datepicker"');
    expect(createHtml).toContain('class="date-picker"');
    expect(createHtml).not.toContain('placeholder="yyyy-MM-dd"');
    expect(createHtml).not.toContain("Yona Rust Project");

    const editHtml = renderToStaticMarkup(
      <ProjectMilestoneFormPage
        detail={detail}
        initialMilestone={baseMilestone}
        mode="edit"
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(editHtml).toContain('action="/yona/owner/projectYobi/milestone/7/edit"');
    expect(editHtml).toContain('value="v1.0"');
    expect(editHtml).toContain("Existing body");
    expect(editHtml).toContain('value="2026-07-01"');
    expect(editHtml).toContain('id="milestone-close"');
    expect(editHtml).toContain('checked=""');
  });

  it("renders pull request bodies and review comments from Markdown source in React", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const commitSha = "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2";
    const html = renderToStaticMarkup(
      <ProjectPullRequestDetailPage
        detail={null}
        pullRequest={{
          bodyHtml: "",
          bodyMarkdown: `Ship **PR** with \`React\` #1 @${commitSha}`,
          commits: [
            {
              authorDateLabel: "now",
              authorEmail: "owner@example.com",
              commitId: commitSha,
              commitMessage: "Commit SHA markdown",
              commitShortId: "be6a8cc",
              state: "CURRENT",
            },
          ],
          conflict: false,
          contributor: {
            avatarUrl: "/yona/avatar/owner.png",
            loginId: "owner",
            userId: 1,
            userLabel: "Owner User",
          },
          createdLabel: "now",
          events: [
            {
              commits: [],
              createdLabel: "now",
              eventType: "PULL_REQUEST_STATE_CHANGED",
              id: 11,
              newValue: "CLOSED",
              oldValue: "OPEN",
              senderLoginId: "owner",
            },
            {
              commits: [
                {
                  authorDateLabel: "now",
                  authorEmail: "owner@example.com",
                  commitId: commitSha,
                  commitMessage: "Commit SHA markdown\nfull message",
                  commitShortId: "be6a8cc",
                  state: "PRIOR",
                },
              ],
              createdLabel: "now",
              eventType: "PULL_REQUEST_COMMIT_CHANGED",
              id: 12,
              newValue: "1",
              oldValue: "basehash",
              senderLoginId: "owner",
            },
            {
              commits: [],
              createdLabel: "now",
              eventType: "PULL_REQUEST_MERGED",
              id: 13,
              newValue: "merged",
              oldValue: "open",
              senderLoginId: "owner",
            },
          ],
          fromBranch: "topic/pr",
          fromOwnerName: "owner",
          fromProjectName: "projectYobi",
          id: 1,
          issueReferences: [
            {
              issueNumber: 1,
              ownerName: "owner",
              projectName: "projectYobi",
              state: "open",
              title: "PR reference",
            },
          ],
          isWatching: false,
          lackingReviewerCount: 1,
          mergedCommitIdFrom: "",
          mergedCommitIdTo: commitSha,
          ownerName: "owner",
          permissions: {
            canComment: false,
            canDeleteSourceBranch: false,
            canRead: true,
            canReadChanges: true,
            canReview: true,
            canRestoreSourceBranch: false,
            canUpdate: true,
            canUpdateState: true,
          },
          projectName: "projectYobi",
          pullRequestNumber: 1,
          receiver: {
            avatarUrl: "/yona/avatar/reviewer.png",
            loginId: "reviewer",
            userId: 2,
            userLabel: "Reviewer",
          },
          requiredReviewerCount: 1,
          reviewed: false,
          reviewers: [],
          sourceBranchExists: true,
          state: "open",
          threads: [
            {
              authorId: 2,
              authorAvatarUrl: "/yona/avatar/reviewer.png",
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              comments: [
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: `Review **comment** with \`React\` #2 ${commitSha}`,
                  createdLabel: "now",
                  id: 8,
                  issueReferences: [
                    {
                      issueNumber: 2,
                      ownerName: "owner",
                      projectName: "projectYobi",
                      state: "closed",
                      title: "Review reference",
                    },
                  ],
                  threadId: 7,
                  viaEmail: true,
                },
              ],
              commitId: "abcdef1",
              createdLabel: "now",
              id: 7,
              path: "",
              prevCommitId: "",
              state: "open",
            },
          ],
          title: "PR detail",
          toBranch: "main",
          updatedLabel: "",
          watcherCount: 0,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="app-shell pull-request-page page-wrap-outer"');
    expect(html).toContain('<div class="project-page-wrap">');
    expect(html).toContain('<div class="board-header issue">');
    expect(html).toContain('<strong class="board-id">#1</strong>');
    expect(html).toContain('<div class="pull-right"><div id="reviewers" style="display:inline-block;margin-right:5px">');
    expect(html).toContain("pullRequest.review.participants 0");
    expect(html).toContain("pullRequest.review.required 0/1");
    expect(html).toContain("pullRequest.review");
    expect(html).toContain("pullRequest.merge");
    expect(html).toContain('<div class="author-info left-txt">');
    expect(html).toContain('class="usf-group pull-left"');
    expect(html).toContain('<span class="avatar-wrap smaller">');
    expect(html).toContain(
      '<img alt="Owner User" height="32" src="/yona/avatar/owner.png" width="32"/>',
    );
    expect(html).toContain('<span class="loginid"> <strong>@</strong>owner</span>');
    expect(html).toContain('<div class="pullRequest-branchInfo">');
    expect(html).toContain('class="from" data-original-title="pullRequest.from" data-toggle="tooltip"');
    expect(html).toContain('class="to" data-original-title="pullRequest.to" data-toggle="tooltip"');
    expect(html).toContain('class="branchName"');
    expect(html).toContain('<div class="content markdown-wrap"><p>Ship <strong>PR</strong> with ');
    expect(html).toContain("<code>React</code>");
    expect(html).toContain('<div class="attachments" data-attachments="[]"></div>');
    expect(html).toContain('<div id="state" class="pullRequest-stateInfo">');
    expect(html).toContain('<div class="alert alert-success">');
    expect(html).toContain('<i class="yobicon-check-circle-alt mr5"></i>');
    expect(html).toContain("<span>pullRequest.is.safe</span>");
    expect(html).toContain('<div class="board-footer board-actrow">');
    expect(html).toContain("button.edit");
    expect(html).toContain("pullRequest.close");
    expect(html).toContain('href="/yona/owner/projectYobi/pullRequest/1/close"');
    expect(html).toContain('data-request-method="post"');
    expect(html).toContain('<hr class="nm"/>');
    expect(html).toContain('href="#helpMessage"');
    expect(html).toContain('id="helpMessage" class="modal hide fade pullreq-info"');
    expect(html).toContain("pullRequest.merge.help.1");
    expect(html).toContain('data-issue-state="open"');
    expect(html).toContain(`href="/yona/owner/projectYobi/commit/${commitSha}"`);
    expect(html).toContain("pullRequest.menu.overview");
    expect(html).toContain("pullRequest.menu.changes");
    expect(html).toContain('<span class="num-badge">1</span>');
    expect(html).toContain('<ul class="comments" id="comments">');
    expect(html).toContain('<li class="event" id="comment-11">');
    expect(html).toContain('<span class="state CLOSED">pullRequest.event.CLOSED</span>');
    expect(html).toContain(
      'class="usf-group" data-placement="top" data-toggle="tooltip" href="/yona/owner" title="owner"',
    );
    expect(html).toContain('<span class="avatar-wrap small">O</span>');
    expect(html).toContain(
      'class="usf-group user-link" data-placement="top" data-toggle="tooltip" href="/yona/owner" title="owner"',
    );
    expect(html).toContain(
      `<a class="link" href="/yona/owner/projectYobi/commit/${commitSha}" title="code.showCommit">be6a8cc</a>`,
    );
    expect(html).toContain('href="#event-11" title="now"');
    expect(html).toContain('<ul class="commit-list">');
    expect(html).toContain('<li class="comment-body commit-info outdated">');
    expect(html).toContain('<a class="commit-id" href="/yona/owner/projectYobi/pullRequest/1/changes/');
    expect(html).toContain('<a class="commitMsg short"');
    expect(html).toContain('<pre class="commitMsg desc hidden">Commit SHA markdown');
    expect(html).not.toContain('<section class="review-list-wrap">');
    expect(html).not.toContain("<h2>Reviews</h2>");
    expect(html).not.toContain("<p>Review <strong>comment</strong> with ");
    expect(html).not.toContain("board-comment-form");
    expect(html).not.toContain("bodyHtml");
    expect(html).not.toContain("contentsHtml");
  });

  it("renders the legacy empty pull request overview event wrapper without placeholder text", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <ProjectPullRequestDetailPage
        detail={null}
        pullRequest={{
          bodyHtml: "",
          bodyMarkdown: "Pull request body",
          commits: [],
          conflict: false,
          contributor: {
            avatarUrl: "/yona/avatar/owner.png",
            loginId: "owner",
            userId: 1,
            userLabel: "Owner User",
          },
          createdLabel: "now",
          events: [],
          fromBranch: "topic/pr",
          fromOwnerName: "owner",
          fromProjectName: "projectYobi",
          id: 1,
          isWatching: false,
          lackingReviewerCount: 0,
          mergedCommitIdFrom: "",
          mergedCommitIdTo: "",
          ownerName: "owner",
          permissions: {
            canComment: false,
            canDeleteSourceBranch: false,
            canRead: true,
            canReadChanges: true,
            canReview: false,
            canRestoreSourceBranch: false,
            canUpdate: false,
            canUpdateState: false,
          },
          projectName: "projectYobi",
          pullRequestNumber: 1,
          receiver: {
            avatarUrl: "/yona/avatar/reviewer.png",
            loginId: "reviewer",
            userId: 2,
            userLabel: "Reviewer",
          },
          requiredReviewerCount: 0,
          reviewed: false,
          reviewers: [],
          sourceBranchExists: true,
          state: "open",
          threads: [],
          title: "PR detail",
          toBranch: "main",
          updatedLabel: "",
          watcherCount: 0,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<div class="board-comment-wrap"></div>');
    expect(html).not.toContain('<ul class="comments" id="comments">');
    expect(html).not.toContain("No pull request event.");
  });

  it("renders pull request changes with the legacy viewChanges shell", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <PullRequestChangesPage
        changes={{
          cardThreads: [
            {
              authorId: 2,
              authorAvatarUrl: "/yona/avatar/reviewer.png",
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              comments: [
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Initial review card",
                  createdLabel: "now",
                  id: 8,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "abcdef123456",
              createdLabel: "now",
              endLine: 1,
              id: 7,
              path: "src/lib.rs",
              prevCommitId: "base",
              startLine: 1,
              state: "open",
            },
          ],
          commits: [
            {
              authorDateLabel: "now",
              authorEmail: "owner@example.com",
              commitId: "abcdef123456",
              commitMessage: "Change src/lib.rs",
              commitShortId: "abcdef1",
              state: "CURRENT",
            },
          ],
          files: [{ path: "src/lib.rs", patch: "@@ -1 +1 @@\n-old line\n+new line" }],
          inlineThreads: [
            {
              authorId: 2,
              authorAvatarUrl: "/yona/avatar/reviewer.png",
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              comments: [
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Initial review card",
                  createdLabel: "now",
                  id: 8,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "abcdef123456",
              createdLabel: "now",
              endLine: 1,
              endSide: "B",
              id: 7,
              path: "src/lib.rs",
              prevCommitId: "base",
              startLine: 1,
              startSide: "B",
              state: "open",
            },
          ],
          nonRangedThreads: [],
          pullRequest: {
            bodyHtml: "",
            bodyMarkdown: "Pull request body",
            commits: [],
            conflict: false,
            contributor: {
              avatarUrl: "/yona/avatar/owner.png",
              loginId: "owner",
              userId: 1,
              userLabel: "Owner User",
            },
            createdLabel: "now",
            events: [],
            fromBranch: "topic/pr",
            fromOwnerName: "owner",
            fromProjectName: "projectYobi",
            id: 1,
            isWatching: false,
            lackingReviewerCount: 0,
            mergedCommitIdFrom: "base",
            mergedCommitIdTo: "abcdef123456",
            ownerName: "owner",
            permissions: {
              canComment: true,
              canDeleteSourceBranch: false,
              canRead: true,
              canReadChanges: true,
              canReview: false,
              canRestoreSourceBranch: false,
              canUpdate: false,
              canUpdateState: false,
            },
            projectName: "projectYobi",
            pullRequestNumber: 1,
            receiver: {
              avatarUrl: "/yona/avatar/reviewer.png",
              loginId: "reviewer",
              userId: 2,
              userLabel: "Reviewer",
            },
            requiredReviewerCount: 0,
            reviewed: true,
            reviewers: [],
            sourceBranchExists: true,
            state: "open",
            threads: [
              {
                authorId: 2,
                authorAvatarUrl: "/yona/avatar/reviewer.png",
                authorLabel: "Reviewer",
                authorLoginId: "reviewer",
                comments: [
                  {
                    authorId: 2,
                    authorLabel: "Reviewer",
                    authorLoginId: "reviewer",
                    canDelete: false,
                    contentsHtml: "",
                    contentsMarkdown: "Initial review card",
                    createdLabel: "now",
                    id: 8,
                    threadId: 7,
                    viaEmail: false,
                  },
                ],
                commitId: "abcdef123456",
                createdLabel: "now",
                endLine: 1,
                id: 7,
                path: "src/lib.rs",
                prevCommitId: "base",
                startLine: 1,
                state: "open",
              },
            ],
            title: "PR changes",
            toBranch: "main",
            updatedLabel: "",
            watcherCount: 0,
          },
          threads: [
            {
              authorId: 2,
              authorAvatarUrl: "/yona/avatar/reviewer.png",
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              comments: [
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Initial review card",
                  createdLabel: "now",
                  id: 8,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "abcdef123456",
              createdLabel: "now",
              endLine: 1,
              id: 7,
              path: "src/lib.rs",
              prevCommitId: "base",
              startLine: 1,
              state: "open",
            },
          ],
        }}
        currentUser={{
          avatarUrl: "/yona/avatar/current-user.png",
          loginId: "currentUser",
          userLabel: "Current User",
        }}
        detail={null}
        onThreadCommentSubmit={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="app-shell pull-request-page page-wrap-outer"');
    expect(html).toContain('<div class="project-page-wrap">');
    expect(html).toContain('<div class="code-browse-wrap">');
    expect(html).toContain('<div class="board-body mb20">');
    expect(html).toContain('<div class="author-info right-txt"');
    expect(html).toContain('<div class="pullRequest-branchInfo">');
    expect(html).toContain('class="codediff-wrap mt10"');
    expect(html).toContain('<div class="diffs-wrap" id="changes">');
    expect(html).toContain('<div class="btn-group auto mb10" id="commits">');
    expect(html).toContain('<div class="diff-body diffs-wrap-scroll">');
    expect(html).toContain('<div class="btnPop">');
    expect(html).toContain('<div class="board-comment-wrap">');
    expect(html).toContain('<div class="non-ranged-threads-wrap">');
    expect(html).toContain('class="board-comment-form"');
    expect(html).toContain('id="comment-form"');
    expect(html).toContain(
      'action="/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments"',
    );
    expect(html).toContain('encType="multipart/form-data"');
    expect(html).toContain('<div class="write-comment-box">');
    expect(html).toContain('<div class="write-comment-wrap">');
    expect(html).toContain('id="dynamic-comment-btn"');
    expect(html).toContain('name="contents"');
    expect(html).not.toContain('name="contentsMarkdown"');
    expect(html).toContain('<div class="review-form" id="review-form"');
    expect(html).toContain('data-toggle="close"');
    expect(html).toContain('data-editor-mode="code-review-body"');
    expect(html).toContain('id="editor-contents-review"');
    expect(html).toContain('<ul class="nav nav-tabs" style="margin-bottom:10px">');
    expect(html).toContain('class="review-card open"');
    expect(html).toContain(
      'href="/yona/owner/projectYobi/pullRequest/1/changes/abcdef123456#thread-7"',
    );
    expect(html).toContain('<div class="write-comment-form">');
    expect(html).toContain('style="display:block"');
    expect(html).toContain('name="thread.id"');
    expect(html).toContain('value="7"');
    expect(html).toContain('href="/yona/currentUser"');
    expect(html).toContain('title="Current User"');
    expect(html).toContain('<img alt="" height="32" src="/yona/avatar/current-user.png" width="32"/>');
    expect(html).not.toContain('href="/yona/owner" title="Owner User"><span class="avatar-img">');
    expect(html).toContain('name="contents"');
    expect(html).toContain('data-toggle="markdown-editor"');
    expect(html).toContain('href="#edit-thread-7"');
    expect(html).toContain('href="#preview-thread-7"');
    expect(html).toContain('data-editor-mode="code-review-body"');
    expect(html).toContain('id="editor-contents-thread-7"');
    expect(html).toContain('class="notification-receiver"');
    expect(html).toContain('class="upload-wrap content-footer"');
    expect(html).toContain('data-resource-type="REVIEW_COMMENT"');
    expect(html).toContain('name="filePath"');
    expect(html).toContain('class="upload-drop-here"');
    expect(html).toContain('<span class="outdated-label">review.outdated</span>');
    expect(html).toContain(
      '<span class="avatar-wrap smaller ml5"><img alt="Reviewer" src="/yona/avatar/reviewer.png"/></span>',
    );
    expect(html).not.toContain("review.is.empty");
    expect(html).not.toContain("Yona Rust Project");
    expect(html).not.toContain("<h1>PR changes</h1>");
  });

  it("renders empty pull request changes without non-legacy placeholder messages", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <PullRequestChangesPage
        changes={{
          cardThreads: [],
          commits: [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: {
            bodyHtml: "",
            bodyMarkdown: "Pull request body",
            commits: [],
            conflict: false,
            contributor: {
              avatarUrl: "/yona/avatar/owner.png",
              loginId: "owner",
              userId: 1,
              userLabel: "Owner User",
            },
            createdLabel: "now",
            events: [],
            fromBranch: "topic/pr",
            fromOwnerName: "owner",
            fromProjectName: "projectYobi",
            id: 1,
            isWatching: false,
            lackingReviewerCount: 0,
            mergedCommitIdFrom: "base",
            mergedCommitIdTo: "abcdef123456",
            ownerName: "owner",
            permissions: {
              canComment: false,
              canDeleteSourceBranch: false,
              canRead: true,
              canReadChanges: true,
              canReview: false,
              canRestoreSourceBranch: false,
              canUpdate: false,
              canUpdateState: false,
            },
            projectName: "projectYobi",
            pullRequestNumber: 1,
            receiver: {
              avatarUrl: "/yona/avatar/reviewer.png",
              loginId: "reviewer",
              userId: 2,
              userLabel: "Reviewer",
            },
            requiredReviewerCount: 0,
            reviewed: false,
            reviewers: [],
            sourceBranchExists: true,
            state: "open",
            threads: [],
            title: "PR changes",
            toBranch: "main",
            updatedLabel: "",
            watcherCount: 0,
          },
          threads: [],
        }}
        detail={null}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<div class="btn-group auto mb10" id="commits">');
    expect(html).toContain('data-value="All"');
    expect(html).toContain("pullRequest.changes.all");
    expect(html).toContain('<div class="diff-body diffs-wrap-scroll">');
    expect(html).toContain('<div class="btnPop">');
    expect(html).not.toContain('class="review-wrap"');
    expect(html).not.toContain("review.is.empty");
    expect(html).not.toContain("No commit metadata is available.");
    expect(html).not.toContain("No changed file diff is available.");
  });

  it("renders selected pull request commit anonymous author with the legacy user label", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <PullRequestChangesPage
        changes={{
          cardThreads: [],
          commits: [
            {
              authorDateLabel: "now",
              authorEmail: "",
              commitId: "abcdef123456",
              commitMessage: "Anonymous author commit",
              commitShortId: "abcdef1",
              state: "CURRENT",
            },
          ],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: {
            bodyHtml: "",
            bodyMarkdown: "Pull request body",
            commits: [],
            conflict: false,
            contributor: {
              avatarUrl: "/yona/avatar/owner.png",
              loginId: "owner",
              userId: 1,
              userLabel: "Owner User",
            },
            createdLabel: "now",
            events: [],
            fromBranch: "topic/pr",
            fromOwnerName: "owner",
            fromProjectName: "projectYobi",
            id: 1,
            isWatching: false,
            lackingReviewerCount: 0,
            mergedCommitIdFrom: "base",
            mergedCommitIdTo: "abcdef123456",
            ownerName: "owner",
            permissions: {
              canComment: false,
              canDeleteSourceBranch: false,
              canRead: true,
              canReadChanges: true,
              canReview: false,
              canRestoreSourceBranch: false,
              canUpdate: false,
              canUpdateState: false,
            },
            projectName: "projectYobi",
            pullRequestNumber: 1,
            receiver: {
              avatarUrl: "/yona/avatar/reviewer.png",
              loginId: "reviewer",
              userId: 2,
              userLabel: "Reviewer",
            },
            requiredReviewerCount: 0,
            reviewed: false,
            reviewers: [],
            sourceBranchExists: true,
            state: "open",
            threads: [],
            title: "PR changes",
            toBranch: "main",
            updatedLabel: "",
            watcherCount: 0,
          },
          threads: [],
        }}
        detail={null}
        runtimeConfig={runtimeConfig}
        selectedCommitId="abcdef123456"
      />,
    );

    expect(html).toContain('<strong>User.anonymous.name</strong>');
    expect(html).toContain("Anonymous author commit");
    expect(html).not.toContain('<strong>Anonymous</strong>');
  });

  it("renders pull request review threads without generic English fallback labels", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const thread = {
      authorId: 0,
      authorAvatarUrl: "/yona/avatar/default.png",
      authorLabel: "",
      authorLoginId: "",
      comments: [
        {
          attachments: [
            {
              id: 42,
              mimeType: "image/png",
              name: "review-note.png",
              size: 512,
              url: "/yona/files/42",
            },
          ],
          authorId: 0,
          authorLabel: "",
          authorLoginId: "",
          canDelete: false,
          contentsHtml: "",
          contentsMarkdown: "General comment body",
          createdLabel: "now",
          id: 8,
          threadId: 7,
          viaEmail: false,
        },
      ],
      commitId: "",
      createdLabel: "now",
      id: 7,
      path: "",
      prevCommitId: "",
      state: "open",
    };
    const html = renderToStaticMarkup(
      <PullRequestChangesPage
        changes={{
          cardThreads: [],
          commits: [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [thread],
          pullRequest: {
            bodyHtml: "",
            bodyMarkdown: "Pull request body",
            commits: [],
            conflict: false,
            contributor: {
              avatarUrl: "/yona/avatar/owner.png",
              loginId: "owner",
              userId: 1,
              userLabel: "Owner User",
            },
            createdLabel: "now",
            events: [],
            fromBranch: "topic/pr",
            fromOwnerName: "owner",
            fromProjectName: "projectYobi",
            id: 1,
            isWatching: false,
            lackingReviewerCount: 0,
            mergedCommitIdFrom: "base",
            mergedCommitIdTo: "abcdef123456",
            ownerName: "owner",
            permissions: {
              canComment: false,
              canDeleteSourceBranch: false,
              canRead: true,
              canReadChanges: true,
              canReview: false,
              canRestoreSourceBranch: false,
              canUpdate: false,
              canUpdateState: false,
            },
            projectName: "projectYobi",
            pullRequestNumber: 1,
            receiver: {
              avatarUrl: "/yona/avatar/reviewer.png",
              loginId: "reviewer",
              userId: 2,
              userLabel: "Reviewer",
            },
            requiredReviewerCount: 0,
            reviewed: false,
            reviewers: [],
            sourceBranchExists: true,
            state: "open",
            threads: [thread],
            title: "PR changes",
            toBranch: "main",
            updatedLabel: "",
            watcherCount: 0,
          },
          threads: [thread],
        }}
        detail={null}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="comment-thread-wrap open"');
    expect(html).not.toContain('data-state="open"');
    expect(html).not.toContain('<div class="thread-header">');
    expect(html).not.toContain('<span class="badge state open">issue.state.open</span>');
    expect(html).toContain('<div class="btn-thread-here btn-thread-minimize">');
    expect(html).toContain(
      '<article class="comment-thread-wrap open" id="thread-7"><div class="btn-thread-here btn-thread-minimize"><button class="ybtn ybtn-default ybtn-small" type="button"><i class="yobicon-comments"></i></button></div>',
    );
    expect(html).toContain('<ul class="comments">');
    expect(html).toContain('<li class="comment" id="comment-8">');
    expect(html).toContain('<div class="comment-avatar">');
    expect(html).toContain('<div class="media-body">');
    expect(html).toContain('<div class="meta-info">');
    expect(html).toContain('<span class="comment_author pull-left">');
    expect(html).toContain("<strong>issue.noAuthor </strong>");
    expect(html).toContain('<span class="ago"><a href="#comment-8" title="now">now</a></span>');
    expect(html).toContain('<div class="comment-body markdown-wrap"');
    expect(html).toContain(
      'data-attachments="[{&quot;id&quot;:42,&quot;mimeType&quot;:&quot;image/png&quot;,&quot;name&quot;:&quot;review-note.png&quot;,&quot;size&quot;:512,&quot;url&quot;:&quot;/yona/files/42&quot;}]"',
    );
    expect(html).not.toContain('class="review-card comment-thread-wrap');
    expect(html).not.toContain("General review");
    expect(html).not.toContain("Unknown");
  });

  it("renders pull request list pagination with legacy pageNum controls", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const item = {
      closedCommentThreadCount: 1,
      commentThreadCount: 2,
      conflict: false,
      contributorLabel: "Owner User",
      contributorLoginId: "owner",
      createdLabel: "now",
      fromBranch: "topic/pr",
      fromOwnerName: "owner",
      fromProjectName: "projectYobi",
      id: 1,
      ownerName: "owner",
      projectName: "projectYobi",
      pullRequestNumber: 1,
      receiverLabel: "Reviewer",
      receiverLoginId: "reviewer",
      reviewerCount: 1,
      state: "open",
      title: "Open read surface",
      toBranch: "main",
      updatedLabel: "now",
    };
    const projectHtml = renderToStaticMarkup(
      <ProjectPullRequestListPage
        category="open"
        detail={{
          enrollmentRequested: false,
          isFavorited: false,
          isForked: true,
          organizationName: "",
          overview: "",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: false,
          viewerCanUpdate: false,
        }}
        list={{
          acceptedCount: 1,
          category: "open",
          closedCount: 4,
          contributors: [
            {
              avatarUrl: "/yona/avatar/owner.png",
              loginId: "owner",
              userId: 7,
              userLabel: "Owner User",
            },
            {
              avatarUrl: "/yona/avatar/reviewer.png",
              loginId: "reviewer",
              userId: 8,
              userLabel: "Reviewer",
            },
          ],
          items: [item],
          openCount: 31,
          pageNum: 2,
          pageSize: 15,
          recentlyPushedBranches: [
            {
              branchName: "refs/heads/topic/recent",
              defaultBranch: "main",
              id: 91,
              ownerName: "owner",
              projectName: "projectYobi",
              pushedLabel: "2026-06-05",
              shortName: "topic/recent",
            },
          ],
          sentCount: 6,
          totalCount: 31,
        }}
        query={{ category: "open", contributorId: 7, filter: "read", pageNum: 2 }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(projectHtml).toContain('<main class="app-shell pull-request-page page-wrap-outer">');
    expect(projectHtml).toContain('<div class="project-page-wrap">');
    expect(projectHtml).toContain('<div class="row-fluid cb" pjax-container="">');
    expect(projectHtml).toContain('<div class="left-menu span2 search-wrap hide-in-mobile"');
    expect(projectHtml).toContain('<form id="search" name="search" action="/yona/owner/projectYobi/pullRequests" method="get">');
    expect(projectHtml).toContain('<div class="srch-advanced" id="advanced-search-form">');
    expect(projectHtml).toContain('<select data-format="user" id="contributors" name="contributorId">');
    expect(projectHtml).toContain('pullRequest.sender');
    expect(projectHtml).toContain('<option data-login-id="owner" value="7" selected="">Owner User</option>');
    expect(projectHtml).toContain('<option data-login-id="reviewer" value="8">Reviewer</option>');
    expect(projectHtml).toContain("<h5>pullRequest.pushed.branches.title</h5>");
    expect(projectHtml).toContain('<div class="alert alert-info">');
    expect(projectHtml).toContain('<i class="yobicon-split"></i>');
    expect(projectHtml).toContain("owner/projectYobi:topic/recent ( 2026-06-05 )");
    expect(projectHtml).toContain(
      'href="/yona/owner/projectYobi/newPullRequestForm?fromBranch=refs%2Fheads%2Ftopic%2Frecent&amp;toBranch=main"',
    );
    expect(projectHtml).toContain(
      'data-request-uri="/yona/owner/projectYobi/pushedBranch/91/delete"',
    );
    expect(projectHtml).toContain('pullRequest.new');
    expect(projectHtml).toContain('<div class="tab-content" style="clear:both;padding-top:15px">');
    expect(projectHtml).toContain('<div class="row-fluid tab-pane active" id="list">');
    expect(projectHtml).toContain('pullRequest.state.open');
    expect(projectHtml).toContain('pullRequest.state.closed');
    expect(projectHtml).toContain('pullRequest.sent');
    expect(projectHtml).toContain('<span class="num-badge">31</span>');
    expect(projectHtml).toContain('<span class="num-badge">4</span>');
    expect(projectHtml).toContain('<span class="num-badge">1 / 6</span>');
    expect(projectHtml).not.toContain("Yona Rust Project");
    expect(projectHtml).not.toContain("<h1>Pull Requests</h1>");
    expect(projectHtml).toContain('<ul class="post-list-wrap">');
    expect(projectHtml).toContain('<li class="post-item title" href="/yona/owner/projectYobi/pullRequest/1">');
    expect(projectHtml).toContain('<span class="post-id">1</span>');
    expect(projectHtml).toContain('<span class="size total">2</span>');
    expect(projectHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(projectHtml).toContain('<ul class="page-nums">');
    expect(projectHtml).toContain('name="pageNum"');
    expect(projectHtml).toContain('value="2"');
    expect(projectHtml).toContain("button.prevPage");
    expect(projectHtml).toContain("button.nextPage");
    expect(projectHtml).toContain(
      'href="/yona/owner/projectYobi/pullRequests?filter=read&amp;contributorId=7"',
    );
    expect(projectHtml).toContain(
      'href="/yona/owner/projectYobi/pullRequests?filter=read&amp;contributorId=7&amp;pageNum=3"',
    );

    const organizationHtml = renderToStaticMarkup(
      <OrganizationPullRequestListPage
        category="open"
        detail={{
          description: "",
          organizationName: "acme",
          viewerCanUpdate: false,
        }}
        list={{
          acceptedCount: 0,
          category: "open",
          closedCount: 4,
          contributors: [],
          items: [{ ...item, ownerName: "acme" }],
          openCount: 31,
          pageNum: 2,
          pageSize: 15,
          recentlyPushedBranches: [],
          sentCount: 0,
          totalCount: 31,
        }}
        organizationName="acme"
        query={{ category: "open", filter: "read", pageNum: 2 }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(organizationHtml).toContain('<main class="app-shell pull-request-page page-wrap-outer">');
    expect(organizationHtml).toContain('<div class="project-page-wrap">');
    expect(organizationHtml).toContain('<div class="row-fluid cb" pjax-container="">');
    expect(organizationHtml).toContain('<form id="search" name="search" action="/yona/organizations/acme/pullrequests" method="get">');
    expect(organizationHtml).toContain('<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>');
    expect(organizationHtml).toContain('pullRequest.state.open');
    expect(organizationHtml).toContain('pullRequest.state.closed');
    expect(organizationHtml).toContain('<span class="num-badge">31</span>');
    expect(organizationHtml).toContain('<span class="num-badge">4</span>');
    expect(organizationHtml).not.toContain("Yona Rust Organization");
    expect(organizationHtml).not.toContain("<h1>Pull Requests</h1>");
    expect(organizationHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(organizationHtml).toContain('class="infos-link-item group-project-name"');
    expect(organizationHtml).toContain('<ul class="page-nums">');
    expect(organizationHtml).toContain('name="pageNum"');
    expect(organizationHtml).toContain('value="2"');
    expect(organizationHtml).toContain("button.prevPage");
    expect(organizationHtml).toContain("button.nextPage");
    expect(organizationHtml).toContain(
      'href="/yona/organizations/acme/pullrequests?filter=read"',
    );
    expect(organizationHtml).toContain(
      'href="/yona/organizations/acme/pullrequests?filter=read&amp;pageNum=3"',
    );
  });

  it("renders project review list with the legacy reviewthread shell", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <ProjectReviewsPage
        detail={{
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: false,
          viewerCanUpdate: false,
        }}
        query={{
          filter: "comment",
          orderBy: "createdDate",
          orderDir: "desc",
          pageNum: 2,
          state: "open",
        }}
        reviews={{
          allCount: 3,
          authorCount: 1,
          closedCount: 0,
          items: [
            {
              authorId: 2,
              authorAvatarUrl: "/yona/avatar/reviewer.png",
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              comments: [
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Review list comment",
                  createdLabel: "now",
                  id: 8,
                  threadId: 7,
                  viaEmail: false,
                },
                {
                  authorId: 1,
                  authorLabel: "Owner",
                  authorLoginId: "owner",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Reply",
                  createdLabel: "later",
                  id: 9,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "abcdef123456",
              createdLabel: "now",
              endLine: 1,
              id: 7,
              path: "src/lib.rs",
              prevCommitId: "base",
              pullRequestNumber: 1,
              startLine: 1,
              state: "open",
            },
            {
              authorId: 1,
              authorAvatarUrl: "/yona/avatar/owner.png",
              authorLabel: "Owner",
              authorLoginId: "owner",
              comments: [
                {
                  authorId: 1,
                  authorLabel: "Owner",
                  authorLoginId: "owner",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "Commit discussion body",
                  createdLabel: "earlier",
                  id: 11,
                  threadId: 10,
                  viaEmail: false,
                },
              ],
              commitId: "fedcba654321",
              createdLabel: "earlier",
              endLine: 2,
              id: 10,
              path: "src/main.rs",
              prevCommitId: "",
              pullRequestNumber: undefined,
              startLine: 2,
              state: "open",
            },
          ],
          openCount: 1,
          pageNum: 2,
          pageSize: 15,
          participantCount: 2,
          state: "open",
          totalCount: 31,
        }}
        runtimeConfig={runtimeConfig}
        viewerId={2}
      />,
    );

    expect(html).toContain('class="app-shell pull-request-page page-wrap-outer"');
    expect(html).toContain('<div class="project-page-wrap">');
    expect(html).toContain('<div class="row-fluid issue-list-wrap">');
    expect(html).toContain('<div class="span2 search-wrap span-hard-wrap">');
    expect(html).toContain('<ul class="lst-stacked unstyled">');
    expect(html).toContain("review.allReview");
    expect(html).toContain('data-type="participantId" data-value="2"');
    expect(html).toContain('href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;authorId=2&amp;orderBy=createdDate&amp;orderDir=desc"');
    expect(html).toContain('href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;participantId=2&amp;orderBy=createdDate&amp;orderDir=desc"');
    expect(html).toContain('form id="search"');
    expect(html).toContain('<div class="pull-right filters">');
    expect(html).toContain('<ul class="nav nav-tabs nm">');
    expect(html).toContain("issue.state.open");
    expect(html).toContain('<div class="review-list-wrap">');
    expect(html).toContain('<ul class="post-list-wrap">');
    expect(html).toContain('class="avatar-wrap mlarge hide-in-mobile"');
    expect(html).toContain('<span class="post-id">7</span>');
    expect(html).toContain(
      'href="/yona/owner/projectYobi/pullRequest/1/changes/abcdef123456#thread-7"',
    );
    expect(html).toContain(
      'href="/yona/owner/projectYobi/commit/fedcba654321#thread-10"',
    );
    expect(html).toContain("Review list comment");
    expect(html).toContain("Commit discussion body");
    expect(html).toContain('class="infos-item item-count-groups"');
    expect(html).toContain('class="page-navigation-wrap" id="pagination"');
    expect(html).toContain('<ul class="page-nums">');
    expect(html).toContain('name="pageNum"');
    expect(html).toContain('value="2"');
    expect(html).toContain("button.prevPage");
    expect(html).toContain("button.nextPage");
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;orderBy=createdDate&amp;orderDir=desc"',
    );
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;orderBy=createdDate&amp;orderDir=desc&amp;pageNum=3"',
    );
    expect(html).toContain("issue.downloadAsExcel");
    expect(html).not.toContain("Yona Rust Project");
    expect(html).not.toContain("<h1>Reviews</h1>");
    expect(html).not.toContain("review-card");
  });

  it("requires real PR/review interaction routes without create/edit placeholders", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/pullRequests'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/closedPullRequests'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/sentPullRequests'");
    expect(routeTreeSource).toContain(
      "fullPath: '/$owner/$projectName/pullRequest/$pullRequestNumber'",
    );
    expect(routeTreeSource).toContain(
      "fullPath: '/$owner/$projectName/pullRequest/$pullRequestNumber/changes'",
    );
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/newPullRequestForm'");
    expect(routeTreeSource).toContain(
      "fullPath: '/$owner/$projectName/pullRequest/$pullRequestNumber/editform'",
    );
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/reviews'");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/pullrequests'");
    expect(routeTreeSource).toContain(
      "fullPath: '/organizations/$organizationName/closedPullrequests'",
    );

    const routePaths = [
      "routes/$owner/$projectName/pullRequests/route.tsx",
      "routes/$owner/$projectName/closedPullRequests/route.tsx",
      "routes/$owner/$projectName/sentPullRequests/route.tsx",
      "routes/$owner/$projectName/newPullRequestForm/route.tsx",
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx",
      "routes/$owner/$projectName/reviews/route.tsx",
      "routes/organizations/$organizationName/pullrequests/route.tsx",
      "routes/organizations/$organizationName/closedPullrequests/route.tsx",
    ];
    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).not.toContain("PlaceholderPage");
      expect(source).toContain("useQuery");
    }

    const pullRequestListRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/pullRequests/route.tsx"),
      "utf8",
    );
    const closedPullRequestListRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/closedPullRequests/route.tsx"),
      "utf8",
    );
    const sentPullRequestListRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/sentPullRequests/route.tsx"),
      "utf8",
    );
    const pullRequestViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-pull-request-views.tsx"),
      "utf8",
    );
    expect(pullRequestListRouteSource).toContain('searchParams.get("contributorId")');
    expect(closedPullRequestListRouteSource).toContain('searchParams.get("contributorId")');
    expect(sentPullRequestListRouteSource).not.toContain("currentSession");
    expect(pullRequestViewsSource).toContain("props.detail.isForked");
    expect(pullRequestViewsSource).toContain("pullRequestQueryString");
    expect(pullRequestViewsSource).toContain('category !== "sent"');
    expect(pullRequestViewsSource).toContain("organizationPullRequestQueryString");
    expect(pullRequestViewsSource).toContain("props.query.filter");
    expect(pullRequestViewsSource).toContain('name="contributorId"');
    expect(pullRequestViewsSource).toContain('name="state"');
    expect(pullRequestViewsSource).toContain('name="participantId"');
    expect(pullRequestViewsSource).toContain('name="orderBy"');
    expect(pullRequestViewsSource).toContain('id="fromProjectId"');
    expect(pullRequestViewsSource).toContain('id="fromBranch"');
    expect(pullRequestViewsSource).toContain('id="toProjectId"');
    expect(pullRequestViewsSource).toContain('id="toBranch"');
    expect(pullRequestViewsSource).toContain('id="pullRequestState"');
    expect(pullRequestViewsSource).toContain('id="status"');
    expect(pullRequestViewsSource).toContain("LegacyMarkdownEditorShell");
    expect(pullRequestViewsSource).toContain('id="__commits"');
    expect(pullRequestViewsSource).toContain('id="mergeResult"');
    expect(pullRequestViewsSource).toContain("title.newPullRequest");
    expect(pullRequestViewsSource).toContain("title.editPullRequest");
    expect(pullRequestViewsSource).toContain("pullRequest.from");
    expect(pullRequestViewsSource).toContain("pullRequest.to");
    expect(pullRequestViewsSource).toContain("pullRequest.select.branch");
    expect(pullRequestViewsSource).toContain("pullRequest.send");
    expect(pullRequestViewsSource).toContain("button.save");
    expect(pullRequestViewsSource).toContain("button.cancel");
    expect(pullRequestViewsSource).toContain("data-merge-result-url");
    expect(pullRequestViewsSource).toContain("data-conflict");
    expect(pullRequestViewsSource).toContain('id="numOfCommits"');
    expect(pullRequestViewsSource).toContain("comment-thread-wrap");
    expect(pullRequestViewsSource).toContain("data-via-email");
    expect(pullRequestViewsSource).toContain("thread-actrow");
    expect(pullRequestViewsSource).toContain("commentThread.close");
    expect(pullRequestViewsSource).toContain("commentThread.open");
    expect(pullRequestViewsSource).toContain("button.comment.new");
    expect(pullRequestViewsSource).toContain("common.comment.delete");
    expect(pullRequestViewsSource).toContain('data-toggle="comment-delete"');
    expect(pullRequestViewsSource).toContain("yobicon-trash");
    expect(pullRequestViewsSource).toContain("reviewThreadStateHref");
    expect(pullRequestViewsSource).toContain('data-request-uri={reviewThreadStateHref');
    expect(pullRequestViewsSource).toContain("review-form");
    expect(pullRequestViewsSource).toContain("board-comment-form");
    expect(pullRequestViewsSource).toContain('id="review-form"');
    expect(pullRequestViewsSource).toContain("LegacyMarkdownHelp");
    expect(pullRequestViewsSource).toContain('data-toggle="close"');
    expect(pullRequestViewsSource).toContain("code-review-body");
    expect(pullRequestViewsSource).toContain("non-ranged-threads-wrap");
    expect(pullRequestViewsSource).toContain("inline-review-form");
    expect(pullRequestViewsSource).toContain("review-comment-edit-form");
    expect(pullRequestViewsSource).toContain("comment-update-form");
    expect(pullRequestViewsSource).toContain("comment-editform-");
    expect(pullRequestViewsSource).toContain('editorMode="update-comment-body"');
    expect(pullRequestViewsSource).toContain("temporaryUploadFiles");
    expect(pullRequestViewsSource).toContain("comment-update-button upload-button-line");
    expect(pullRequestViewsSource).toContain("ybtn-cancel");
    expect(pullRequestViewsSource).toContain("button.save");
    expect(pullRequestViewsSource).toContain("upload-drop-here");
    expect(pullRequestViewsSource).toContain("line-comment-trigger");
    expect(pullRequestViewsSource).toContain("canDelete");
    expect(pullRequestViewsSource).toContain("reviewer-status");
    expect(pullRequestViewsSource).toContain("pullRequest.review.required");
    expect(pullRequestViewsSource).toContain("pullRequest.review.lacking");
    expect(pullRequestViewsSource).toContain("PullRequestOverviewTabs");
    expect(pullRequestViewsSource).toContain("PullRequestBranchInfo");
    expect(pullRequestViewsSource).toContain("page-wrap-outer");
    expect(pullRequestViewsSource).toContain("project-page-wrap");
    expect(pullRequestViewsSource).toContain("code-browse-wrap");
    expect(pullRequestViewsSource).toContain("author-info left-txt");
    expect(pullRequestViewsSource).toContain("author-info right-txt");
    expect(pullRequestViewsSource).toContain("avatar-wrap smaller");
    expect(pullRequestViewsSource).toContain("codediff-wrap mt10");
    expect(pullRequestViewsSource).toContain("diffs-only");
    expect(pullRequestViewsSource).toContain('id="changes"');
    expect(pullRequestViewsSource).toContain("diffs-wrap-scroll");
    expect(pullRequestViewsSource).toContain("btnPop");
    expect(pullRequestViewsSource).toContain("pendingInlineDraft");
    expect(pullRequestViewsSource).toContain("data-block-ready");
    expect(pullRequestViewsSource).toContain("board-footer board-actrow");
    expect(pullRequestViewsSource).toContain("helpMessage");
    expect(pullRequestViewsSource).toContain("pullreq-info");
    expect(pullRequestViewsSource).toContain("pullRequest.menu.overview");
    expect(pullRequestViewsSource).toContain("pullRequest.menu.changes");
    expect(pullRequestViewsSource).toContain("num-badge");
    expect(pullRequestViewsSource).toContain("PullRequestEventTimeline");
    expect(pullRequestViewsSource).toContain('className="event"');
    expect(pullRequestViewsSource).toContain('id="comments"');
    expect(pullRequestViewsSource).toContain("pullRequest.event.message");
    expect(pullRequestViewsSource).toContain("pullRequestEventHasMergedCommit");
    expect(pullRequestViewsSource).toContain("code.showCommit");
    expect(pullRequestViewsSource).toContain("avatar-wrap small");
    expect(pullRequestViewsSource).toContain('data-placement="top"');
    expect(pullRequestViewsSource).toContain("commit-list");
    expect(pullRequestViewsSource).toContain("commit-info");
    expect(pullRequestViewsSource).toContain("commitMsg short");
    expect(pullRequestViewsSource).toContain("pullRequestChangesCommitHref");
    expect(pullRequestViewsSource).toContain('id="btnAccept"');
    expect(pullRequestViewsSource).toContain('data-request-method="post"');
    expect(pullRequestViewsSource).toContain("merge-conflict-help");
    expect(pullRequestViewsSource).toContain("pullRequest.conflict.manualResolve");
    expect(pullRequestViewsSource).toContain("howto-resolve-conflict");
    expect(pullRequestViewsSource).toContain("pullRequest.resolve.conflict");
    expect(pullRequestViewsSource).toContain("git rebase upstream/");
    expect(pullRequestViewsSource).toContain("git push -f origin");
    expect(pullRequestViewsSource).toContain("pull-request-source-branch");
    expect(pullRequestViewsSource).toContain("pullRequest.delete.frombranch.message");
    expect(pullRequestViewsSource).toContain("pullRequest.restore.frombranch.message");
    expect(pullRequestViewsSource).toContain("deletefrombranch");
    expect(pullRequestViewsSource).toContain("restorefrombranch");

    const detailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );
    expect(detailRouteSource).toContain("pullRequestDetailQueryOptions");
    expect(detailRouteSource).toContain("useMutation");
    expect(detailRouteSource).toContain("acceptPullRequestRest");
    expect(detailRouteSource).toContain("deletePullRequestCommentRest");
    expect(detailRouteSource).toContain("updatePullRequestCommentRest");
    expect(detailRouteSource).toContain("deletePullRequestSourceBranchRest");
    expect(detailRouteSource).toContain("restorePullRequestSourceBranchRest");

    const changesRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
      ),
      "utf8",
    );
    expect(changesRouteSource).toContain("createPullRequestCommentRest");
    expect(changesRouteSource).toContain("deletePullRequestCommentRest");
    expect(changesRouteSource).toContain("updatePullRequestCommentRest");

    const pullRequestApiSource = fs.readFileSync(
      path.resolve(__dirname, "api/pull-requests.ts"),
      "utf8",
    );
    expect(pullRequestApiSource).toContain("acceptPullRequestRest");
    expect(pullRequestApiSource).toContain('pullRequestPath(input, "/accept")');
    expect(pullRequestApiSource).toContain("deletePullRequestCommentRest");
    expect(pullRequestApiSource).toContain("updatePullRequestCommentRest");
    expect(pullRequestApiSource).toContain("prevCommitId");
    expect(pullRequestApiSource).toContain("startSide");
    expect(pullRequestApiSource).toContain("startLine");
    expect(pullRequestApiSource).toContain("endSide");
    expect(pullRequestApiSource).toContain("endLine");
    expect(pullRequestApiSource).toContain("deletePullRequestSourceBranchRest");
    expect(pullRequestApiSource).toContain("restorePullRequestSourceBranchRest");
    expect(pullRequestApiSource).toContain('pullRequestPath(input, "/source-branch")');
  });

  it("requires project member management route to use real legacy anchors and mutations", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/members'");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/members/route.tsx"),
      "utf8",
    );
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("useQuery");
    expect(routeSource).toContain("useMutation");
    expect(routeSource).toContain("apiQueryKeys.project.members");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectMembersPage");
    expect(viewSource).toContain('id="addNewMember"');
    expect(viewSource).toContain('className="members project row-fluid"');
    expect(viewSource).toContain('data-action="apply"');
    expect(viewSource).toContain('data-action="delete"');
  });

  it("requires project issue label management route to preserve legacy label editor anchors", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/issue/labelsform'");

    const routePath = path.resolve(
      __dirname,
      "routes/$owner/$projectName/issue/labelsform/route.tsx",
    );
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("copyProjectLabels");
    expect(routeSource).toContain("createProjectLabel");
    expect(routeSource).toContain("updateProjectLabel");
    expect(routeSource).toContain("deleteProjectLabel");
    expect(routeSource).toContain('className="project-page-wrap label-editor-wrap"');
    expect(routeSource).toContain("ProjectSettingsSubMenu");
    expect(routeSource).toContain('id="copyLabel"');
    expect(routeSource).toContain('id="frmNewLabel"');
    expect(routeSource).toContain('className="label-preset-colors"');
    expect(routeSource).toContain('id="labelsList"');
    expect(routeSource).toContain('className="row-fluid list-head"');
    expect(routeSource).toContain('className="span3 category"');
    expect(routeSource).toContain('className="span9 name"');
    expect(routeSource).toContain("data-category-name");
    expect(routeSource).toContain("data-delete-uri");
    expect(routeSource).toContain("data-update-uri");
    expect(routeSource).toContain('id="editCategory"');
    expect(routeSource).toContain('id="editLabel"');
  });

  it("requires organization member management route to use real legacy anchors and mutations", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/members'");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/members/route.tsx"),
      "utf8",
    );
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readOrganizationAdmin");
    expect(routeSource).toContain("addOrganizationMember");
    expect(routeSource).toContain("deleteOrganizationMember");
    expect(routeSource).toContain("updateOrganizationMemberRole");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-organization-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("OrganizationMembersPage");
    expect(viewSource).toContain('id="addNewMember"');
    expect(viewSource).toContain('className="members project row-fluid"');
    expect(viewSource).toContain('data-action="apply"');
    expect(viewSource).toContain('data-action="delete"');
    expect(viewSource).toContain('id="alertDeletion"');
    expect(viewSource).toContain("enrollAcceptBtn");
  });

  it("requires organization delete route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/deleteForm'");

    const routePath = path.resolve(
      __dirname,
      "routes/organizations/$organizationName/deleteForm/route.tsx",
    );
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readOrganizationAdmin");
    expect(routeSource).toContain("deleteOrganization");
    expect(routeSource).toContain("navigateToAppHref");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-organization-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("OrganizationDeletePage");
    expect(viewSource).toContain('className="box-wrap bottom"');
    expect(viewSource).toContain('id="btnDelete"');
    expect(viewSource).toContain('id="alertDeletion"');
    expect(viewSource).toContain('id="btnDeleteExec"');
    expect(viewSource).toContain("organization.delete.requestion");
    expect(viewSource).toContain("organization.delete.reaccept");
  });

  it("requires project delete confirmation route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/deleteform'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/deleteform/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("deleteProjectRest");
    expect(routeSource).toContain("navigateToAppHref");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectDeletePage");
    expect(viewSource).toContain('id="subMenuProjectDelete"');
    expect(viewSource).toContain('id="accept"');
    expect(viewSource).toContain('id="btnDelete"');
    expect(viewSource).toContain('id="alertDeletion"');
    expect(viewSource).toContain('id="btnDeleteExec"');
  });

  it("requires project webhooks route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/webhooks'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/webhooks/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readProjectWebhooksQueryOptions");
    expect(routeSource).toContain("createProjectWebhookRest");
    expect(routeSource).toContain("deleteProjectWebhookRest");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectWebhooksPage");
    expect(viewSource).toContain("webhook-editor-wrap");
    expect(viewSource).toContain('id="formNewWebhook"');
    expect(viewSource).toContain("input-webhook-payload");
    expect(viewSource).toContain("input-webhook-secret");
    expect(viewSource).toContain('id="gitPush"');
    expect(viewSource).toContain('id="webhooksList"');
    expect(viewSource).toContain("data-webhook-id");
    expect(viewSource).toContain('id="webhookDeliveryHistory"');
    expect(viewSource).toContain("data-webhook-delivery-id");
    expect(viewSource).toContain('data-request-method="delete"');
  });

  it("renders the legacy project webhook form and list shell", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const projectDetail: ProjectDetailViewModel = {
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "",
      ownerName: "yona",
      projectName: "projectYobi",
      projectScope: "public",
      showCode: true,
      viewerCanEnroll: false,
      viewerCanUpdate: true,
    };
    const html = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [
            {
              createdLabel: "2026-06-05",
              eventType: "NEW_ISSUE",
              id: 9,
              payloadUrl: "https://hooks.example.test/yona",
              requestBody: "{\"text\":\"hello\"}",
              responseBody: "ok",
              status: "success",
              webhookId: 7,
              webhookType: "SIMPLE",
            },
          ],
          ownerName: "yona",
          projectName: "projectYobi",
          viewerCanUpdate: true,
          webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
          webhooks: [
            {
              gitPush: true,
              id: 7,
              payloadUrl: "https://hooks.example.test/yona",
              secret: "",
              webhookType: "DETAIL_HANGOUT_CHAT",
            },
          ],
        }}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="project-page-wrap webhook-editor-wrap"');
    expect(html).toContain('class="new-webhook-wrap"');
    expect(html).toContain('id="formNewWebhook"');
    expect(html).toContain('action="/yona/yona/projectYobi/webhooks"');
    expect(html).toContain('<strong class="form-legend">project.webhook.new</strong>');
    expect(html).toContain('placeholder="project.webhook.payloadUrl"');
    expect(html).toContain('placeholder="project.webhook.secret"');
    expect(html).toContain("Messenger (Only text)");
    expect(html).toContain("Slack (Meta)");
    expect(html).toContain("Google Chat (Thread)");
    expect(html).toContain("Continuous Integration tool (Only push event)");
    expect(html).toContain("project.webhook.includeGitPush");
    expect(html).toContain("project.webhook.help");
    expect(html).toContain(">project.webhook.add</button>");
    expect(html).toContain("<strong>Type of message</strong>");
    expect(html).toContain("<strong>Include git push events</strong>");
    expect(html).toContain('<h6 class="mr20 truncate">https://hooks.example.test/yona</h6>');
    expect(html).toContain("<h6>NONE</h6>");
    expect(html).toContain('data-request-uri="/yona/yona/projectYobi/webhooks/7"');
    expect(html).toContain('id="webhookDeliveryHistory"');
    expect(html).toContain('data-webhook-delivery-id="9"');
    expect(html).not.toContain("project.webhook.type.SIMPLE");
    expect(html).not.toContain(">button.add</button>");
    expect(html).not.toContain("project.webhook.gitPush");
  });

  it("requires project transfer route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/transfer'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/transfer/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readProjectTransferQueryOptions");
    expect(routeSource).toContain("requestProjectTransferRest");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectTransferPage");
    expect(viewSource).toContain('id="subMenuProjectTransfer"');
    expect(viewSource).toContain('id="owner"');
    expect(viewSource).toContain('id="accept"');
    expect(viewSource).toContain('id="btnTransfer"');
    expect(viewSource).toContain('id="alertTransfer"');
    expect(viewSource).toContain('id="btnTransferExec"');
  });

  it("requires project fork route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/newFork'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/newFork/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readProjectForkOptionsQueryOptions");
    expect(routeSource).toContain("forkProjectRest");

    const apiSource = fs.readFileSync(path.resolve(__dirname, "api/org-project.ts"), "utf8");
    expect(apiSource).toContain("ProjectForkOptionsResponse");
    expect(apiSource).toContain('projectPath(ownerName, projectName, "/fork-options")');
    expect(apiSource).toContain('projectPath(input.ownerName, input.projectName, "/fork")');

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectForkPage");
    expect(viewSource).toContain("href={`${projectHref}/newFork`}");
    expect(viewSource).toContain('className="content-wrap frm-wrap"');
    expect(viewSource).toContain('id="helpMessage"');
    expect(viewSource).toContain('id="project-owner"');
    expect(viewSource).toContain('id="inputName"');
    expect(viewSource).toContain('name="projectScope"');
    expect(viewSource).toContain("label-public");
    expect(viewSource).toContain("label-protected");
    expect(viewSource).toContain("label-private");
    expect(viewSource).toContain("images/fork-pull/fork.jpg");
  });

  it("requires project statistics route to preserve the legacy under-construction shell", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/statistics'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/statistics/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readProjectContainerQueryOptions");
    expect(routeSource).toContain("ProjectStatisticsPage");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectStatisticsPage");
    expect(viewSource).toContain("Under Construction");
    expect(viewSource).toContain('className="page-wrap-outer"');
    expect(viewSource).toContain('className="project-page-wrap"');
  });

  it("requires the public user profile route to preserve the legacy single-segment shell", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$user'");

    const routePath = path.resolve(__dirname, "routes/$user/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("readPublicUserProfile");
    expect(routeSource).toContain("PublicUserProfilePage");

    const html = renderPublicUserProfile({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [
        {
          createdLabel: "May 16, 2026",
          lastPushedLabel: "May 16, 2026",
          memberCount: 2,
          ownerName: "owner",
          overview: "Visible member project",
          projectName: "publicYobi",
          projectScope: "public",
          watchCount: 3,
        },
      ],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "Door English",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "",
        sinceLabel: "May 16, 2026",
      },
      pullRequestItems: [],
      recentProjects: [],
      session: {
        defaultLandingPath: "/me",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "anonymous",
        userLabel: "Anonymous",
      },
    });

    expect(html).toContain('class="site-breadcrumb-outer"');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="user-box"');
    expect(html).toContain('id="daysAgoBtn"');
    expect(html).toContain('id="two-column-mode-checkbox"');
    expect(html).toContain('id="two-column-mode"');
    expect(html).toContain('class="show-subtasks-li"');
    expect(html).toContain('id="toggle-show-subtasks"');
    expect(html).toContain("issue.state.open");
    expect(html).toContain("issue.state.closed");
    expect(html).toContain("userinfo.daysAgo.prefix issue.is.empty");
    expect(html).toContain("userinfo.daysAgo.prefix pullRequest.is.empty");
    expect(html).not.toContain("No pull requests found");
    expect(html).toContain('href="/yona/owner/publicYobi"');
    expect(html).toContain("Visible member project");
    expect(html).not.toContain("Default landing");
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("Edit Profile");

    const emptyProjectsHtml = renderPublicUserProfile({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "",
        sinceLabel: "May 16, 2026",
      },
      pullRequestItems: [],
      recentProjects: [],
      session: {
        defaultLandingPath: "/me",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "anonymous",
        userLabel: "Anonymous",
      },
    });

    expect(emptyProjectsHtml).toContain(">project.is.empty<");
    expect(emptyProjectsHtml).not.toContain("No projects found.");

    const issueHtml = renderPublicUserProfile({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [
        {
          assigneeLabel: "Door",
          authorLabel: "Door",
          commentCount: 2,
          issueNumber: 5,
          ownerName: "owner",
          projectName: "publicYobi",
          state: "open",
          title: "Public issue",
          updatedLabel: "May 17, 2026",
        },
      ],
      memberProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "Door English",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "",
        sinceLabel: "May 16, 2026",
      },
      pullRequestItems: [],
      recentProjects: [],
      session: {
        defaultLandingPath: "/me",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "anonymous",
        userLabel: "Anonymous",
      },
    });

    expect(issueHtml).toContain('class="post-list-wrap my-issues row-fluid"');
    expect(issueHtml).toContain("project-name-in-my-issues");
    expect(issueHtml).toContain("title-cell");
    expect(issueHtml).toContain("item-count-groups");
    expect(issueHtml).toContain("author-cell");
    expect(issueHtml).toContain("meta-cell");
    expect(issueHtml).toContain("for-subtask-progressbar");
    expect(issueHtml).toContain("child-issue-list hide");
    expect(issueHtml).toContain('href="/yona/owner/publicYobi/issue/5"');
    expect(issueHtml).toContain('href="/yona/owner/publicYobi/issue/5#comments"');
    expect(issueHtml).not.toContain("Open Issues");
    expect(issueHtml).not.toContain("Closed Issues");
  });

  it("keeps the public home legacy intro and feature grid stable", () => {
    const html = renderHome();

    expect(html).toContain('class="siteintro-bg row"');
    expect(html).toContain('class="siteintro"');
    expect(html).toContain('class="siteintro-cover"');
    expect(html).toContain('class="siteintro-wrap"');
    expect(html).toContain('class="site-heading"');
    expect(html).toContain("21st Century Software Development Platform");
    expect(html).toContain("Just focus on what you have to do");
    expect(html).toContain('class="signup-btn"');
    expect(html).toContain('class="ybtn ybtn-success ybtn-padding"');
    expect(html).toContain("button.signup");
    expect(html).toContain('class="feature-wrap row"');
    expectOrderedText(html, [
      "title.unlimitedProjects",
      "title.codeManagement",
      "title.issueTracker",
      "title.privateProject",
      "title.codeReview",
      "title.workTeam",
    ]);
    expect(html).not.toContain("Yona Rust Frontend");
    expect(html).not.toContain("Legacy Route Foundation");
  });

  it("pins project directory empty state and search CTA", () => {
    const html = renderProjectDirectory({ items: [] }, "/projects?pageNum=1");

    expect(html).toContain(">project.public title.projectList<");
    expect(html).toContain(">title.organization.list<");
    expect(html).toContain('action="/yona/projects"');
    expect(html).toContain('placeholder="site.project.filter"');
    expect(html).toContain('<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>');
    expect(html).toContain('class="ico ico-err1"');
    expect(html).toContain(">project.is.empty<");
    expect(html).not.toContain(">Search<");
    expect(html).not.toContain("No public projects found.");
  });

  it("keeps the legacy project directory pageNum slice with pagination placeholder", () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      logoUrl: "",
      ownerName: "owner",
      overview: `Project ${index + 1} overview`,
      projectName: `project-${index + 1}`,
      projectScope: "public",
    }));
    const html = renderProjectDirectory({ items }, "/projects?pageNum=2");

    expect(html).not.toContain('href="/yona/owner/project-1"');
    expect(html).toContain('href="/yona/owner/project-11"');
    expect(html).toContain('id="pagination"');
    expect(html).not.toContain('class="nav-pill active"');
    expect(html).not.toContain("Next</span>");
  });

  it("pins organization directory empty state and search CTA", () => {
    const html = renderOrganizationDirectory({ items: [] }, "/orgs?pageNum=1");

    expect(html).toContain(">project.public title.projectList<");
    expect(html).toContain(">title.organization.list<");
    expect(html).toContain('action="/yona/orgs"');
    expect(html).toContain('placeholder="site.organization.filter"');
    expect(html).toContain('<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>');
    expect(html).toContain('class="ico ico-err1"');
    expect(html).toContain(">organization.is.empty<");
    expect(html).not.toContain(">Search<");
    expect(html).not.toContain("No organizations found.");
  });

  it("keeps legacy guest-prohibited directory routes on the forbidden shell", () => {
    for (const routePath of ["routes/projects/route.tsx", "routes/orgs/route.tsx"]) {
      const routeSource = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(routeSource).toContain("classifyConnectFailure");
      expect(routeSource).toContain('failureKind === "forbidden"');
      expect(routeSource).toContain("ForbiddenPage");
      expect(routeSource).not.toContain("PlaceholderPage");
    }
  });

  it("keeps organization home project cards on the legacy view.scala.html structure", () => {
    const html = renderOrganizationDetail({
      adminMembers: [
        {
          avatarUrl: "/yona/assets/avatar/admin.png",
          loginId: "admin",
          role: "admin",
          userLabel: "Admin User",
        },
      ],
      description: "Organization overview",
      memberMembers: [
        {
          avatarUrl: "/yona/assets/avatar/member.png",
          loginId: "member",
          role: "member",
          userLabel: "Member User",
        },
      ],
      organizationName: "yona-org",
      viewerCanCreateProject: true,
      viewerCanUpdate: true,
      visibleProjects: [
        {
          createdLabel: "2026-06-05",
          isWatching: true,
          lastPushedLabel: "2026-06-06",
          logoUrl: "/yona/assets/project.png",
          memberCount: 3,
          originOwnerName: "upstream",
          originProjectName: "origin",
          overview: "Project overview",
          ownerName: "yona-org",
          projectName: "projectYobi",
          projectScope: "protected",
          watchCount: 7,
        },
      ],
    });

    expect(html).toContain('id="project-description"');
    expect(html).toContain('class="project-search-wrap row-fluid mt10"');
    expect(html).toContain('data-toggle="item-search"');
    expect(html).toContain('data-items="project-item"');
    expect(html).toContain('placeholder="title.type.name"');
    expect(html).toContain('class="all-projects organization-project-list"');
    expect(html).toContain('class="project"');
    expect(html).toContain('data-item="project-item"');
    expect(html).toContain('data-value="projectYobi Project overview"');
    expect(html).toContain('class="info-wrap"');
    expect(html).toContain('class="owner-avatar-wrap hide-in-mobile"');
    expect(html).toContain('class="origin-title" href="/yona/upstream/origin"');
    expect(html).toContain('class="project-protected" title="Group Project"');
    expect(html).toContain('class="name-tag"');
    expect(html).toContain('class="stats-wrap pull-right"');
    expect(html).toContain("project.onmember 3");
    expect(html).toContain("project.onwatching 7");
    expect(html).toContain('class="yobicon-lightbulb ramp-on"');
    expect(html).toContain('class="bubble-wrap gray project-home organization-home"');
    expect(html).toContain("user.role.org_admin");
    expect(html).toContain("user.role.org_member");
    expect(html).toContain('class="avatar-wrap"');
    expect(html).toContain('href="/yona/admin"');
    expect(html).toContain('href="/yona/member"');
  });

  it("pins canonical user settings paths and account-settings tab order", () => {
    const html = renderWorkspaceSettings("password", "/user/editform/password", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
      recentProjects: [],
      session: {
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      },
    });

    expectOrderedText(html, [
      'href="/yona/user/editform"',
      'href="/yona/user/editform/password"',
      'href="/yona/user/editform/notifications"',
      'href="/yona/user/editform/emails"',
      'href="/yona/user/editform/token"',
    ]);
    expect(html).toContain('name="oldPassword"');
    expect(html).toContain('name="loginId"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="retypedPassword"');
    expect(html).toContain('href="/yona/lostPassword"');
  });
});
