import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  renderHome,
  renderOrganizationDirectory,
  renderProjectDirectory,
  renderPublicUserProfile,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";
import {
  OrganizationBoardListPage,
  ProjectBoardDetailPage,
  ProjectBoardListPage,
} from "./routes/-board-views";
import { ProjectMilestoneDetailPage } from "./routes/-milestone-views";
import { ProjectPullRequestDetailPage } from "./routes/-pull-request-views";

function expectOrderedText(html: string, orderedSnippets: string[]) {
  let previousIndex = -1;
  for (const snippet of orderedSnippets) {
    const nextIndex = html.indexOf(snippet);
    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

describe("file-route parity harness", () => {
  it("keeps canonical and alias auth/settings routes in the generated route tree", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(routeTreeSource).toContain("fullPath: '/users/loginform'");
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
    expect(searchViewsSource).toContain('props.scope.type === "project"');
    expect(searchViewsSource).toContain('category.type === "project"');
    expect(searchViewsSource).toContain("readProjectSearch");
    expect(searchViewsSource).toContain("readOrganizationSearch");
    expect(searchViewsSource).toContain("apiQueryKeys.search.project");
  });

  it("requires a real organization issue route instead of a placeholder page", () => {
    const organizationIssueRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/issues/route.tsx"),
      "utf8",
    );

    expect(organizationIssueRouteSource).not.toContain("PlaceholderPage");
    expect(organizationIssueRouteSource).toContain("listOrganizationIssues");
  });

  it("requires a real user issue route instead of a placeholder page", () => {
    const userIssueRoutePath = path.resolve(__dirname, "routes/user/issues/route.tsx");

    expect(fs.existsSync(userIssueRoutePath)).toBe(true);
    const userIssueRouteSource = fs.readFileSync(userIssueRoutePath, "utf8");
    expect(userIssueRouteSource).not.toContain("PlaceholderPage");
    expect(userIssueRouteSource).toContain("listUserIssues");
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
    expect(notificationRouteSource).toContain("useQuery");
    expect(notificationRouteSource).toContain("listNotificationsQueryOptions");
    expect(notificationRouteSource).toContain("page-wrap-outer");
    expect(notificationRouteSource).toContain("page-wrap");
    expect(notificationRouteSource).toContain("content-container");
    expect(notificationRouteSource).toContain("main-stream");
    expect(notificationRouteSource).toContain("notification-wrap");
    expect(notificationRouteSource).toContain('data-toggle="learnmore"');
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
    expect(listHtml).toContain("Page 2 of 3");
    expect(listHtml).toContain("pageNum=1");
    expect(listHtml).toContain("pageNum=3");

    const detailHtml = renderToStaticMarkup(
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
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(detailHtml).not.toContain(">Watch<");
    expect(detailHtml).not.toContain("Leave a comment");
    expect(detailHtml).toContain('data-via-email="true"');

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
    expect(orgHtml).toContain("Page 1 of 2");
    expect(orgHtml).toContain("projectNames%5B%5D=alpha");
    expect(orgHtml).toContain("pageNum=2");
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
          contentsMarkdown: "Ship **parity** with `React`",
          dueDateLabel: "",
          id: 7,
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
    expect(html).not.toContain("contentsHtml");
  });

  it("renders pull request bodies and review comments from Markdown source in React", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const html = renderToStaticMarkup(
      <ProjectPullRequestDetailPage
        detail={null}
        pullRequest={{
          bodyHtml: "",
          bodyMarkdown: "Ship **PR** with `React`",
          commits: [],
          conflict: false,
          contributor: { loginId: "owner", userId: 1, userLabel: "Owner User" },
          createdLabel: "now",
          events: [],
          fromBranch: "topic/pr",
          fromOwnerName: "owner",
          fromProjectName: "projectYobi",
          id: 1,
          isWatching: false,
          lackingReviewerCount: 1,
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
          receiver: { loginId: "reviewer", userId: 2, userLabel: "Reviewer" },
          requiredReviewerCount: 1,
          reviewed: false,
          reviewers: [],
          sourceBranchExists: true,
          state: "open",
          threads: [
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
                  contentsMarkdown: "Review **comment** with `React`",
                  createdLabel: "now",
                  id: 8,
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

    expect(html).toContain('<div class="markdown-wrap"><p>Ship <strong>PR</strong> with ');
    expect(html).toContain("<code>React</code>");
    expect(html).toContain('<div class="comment-body markdown-wrap" data-via-email="true"');
    expect(html).toContain("<p>Review <strong>comment</strong> with ");
    expect(html).not.toContain("bodyHtml");
    expect(html).not.toContain("contentsHtml");
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
    expect(pullRequestViewsSource).toContain('id="__commits"');
    expect(pullRequestViewsSource).toContain("comment-thread-wrap");
    expect(pullRequestViewsSource).toContain("data-via-email");
    expect(pullRequestViewsSource).toContain("thread-actrow");
    expect(pullRequestViewsSource).toContain("review-form");
    expect(pullRequestViewsSource).toContain("inline-review-form");
    expect(pullRequestViewsSource).toContain("review-comment-edit-form");
    expect(pullRequestViewsSource).toContain("line-comment-trigger");
    expect(pullRequestViewsSource).toContain("canDelete");
    expect(pullRequestViewsSource).toContain("reviewer-status");
    expect(pullRequestViewsSource).toContain("pullRequest.review.required");
    expect(pullRequestViewsSource).toContain("pullRequest.review.lacking");
    expect(pullRequestViewsSource).toContain('id="btnAccept"');
    expect(pullRequestViewsSource).toContain('data-request-method="post"');
    expect(pullRequestViewsSource).toContain("merge-conflict-help");
    expect(pullRequestViewsSource).toContain("pullRequest.conflict.manualResolve");
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
    expect(viewSource).toContain('data-request-method="delete"');
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
    expect(html).toContain('href="/yona/owner/publicYobi"');
    expect(html).toContain("Visible member project");
    expect(html).not.toContain("Default landing");
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("Edit Profile");
  });

  it("keeps the public home title and entry CTA/navigation order stable", () => {
    const html = renderHome();

    expect(html).toContain("Legacy Route Foundation");
    expectOrderedText(html, [
      'href="/yona/users/loginform"',
      'href="/yona/users/signupform"',
      'href="/yona/projects"',
      'href="/yona/orgs"',
      'href="/yona/search?pageSize=20&amp;scope=global"',
    ]);
  });

  it("pins project directory empty state and search CTA", () => {
    const html = renderProjectDirectory({ items: [] }, "/projects?pageNum=1");

    expect(html).toContain('action="/yona/projects"');
    expect(html).toContain(">Search<");
    expect(html).toContain("No public projects found.");
  });

  it("keeps the legacy project directory pageNum pagination at ten projects", () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      ownerName: "owner",
      overview: `Project ${index + 1} overview`,
      projectName: `project-${index + 1}`,
      projectScope: "public",
    }));
    const html = renderProjectDirectory({ items }, "/projects?pageNum=2");

    expect(html).not.toContain('href="/yona/owner/project-1"');
    expect(html).toContain('href="/yona/owner/project-11"');
    expect(html).toContain('href="/projects?pageNum=1"');
    expect(html).toContain('class="nav-pill active"');
    expect(html).toContain(">2</span>");
    expect(html).toContain("Next</span>");
  });

  it("pins organization directory empty state and search CTA", () => {
    const html = renderOrganizationDirectory({ items: [] }, "/orgs?pageNum=1");

    expect(html).toContain('action="/yona/orgs"');
    expect(html).toContain(">Search<");
    expect(html).toContain("No organizations found.");
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
