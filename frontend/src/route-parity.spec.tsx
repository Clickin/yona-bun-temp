import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  renderHome,
  renderOrganizationDirectory,
  renderProjectDirectory,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";
import {
  OrganizationBoardListPage,
  ProjectBoardDetailPage,
  ProjectBoardListPage,
} from "./routes/-board-views";

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
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/watchers'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/members'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/webhooks'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/statistics'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/deleteform'");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/search'");
  });

  it("requires a real project watcher list route instead of a placeholder page", () => {
    const watchersRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/watchers/route.tsx"),
      "utf8",
    );

    expect(watchersRouteSource).not.toContain("PlaceholderPage");
    expect(watchersRouteSource).toContain("ProjectWatchersPage");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/watchers'");
  });

  it("requires a real project member management route instead of a placeholder page", () => {
    const membersRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/members/route.tsx"),
      "utf8",
    );

    expect(membersRouteSource).not.toContain("PlaceholderPage");
    expect(membersRouteSource).toContain("ProjectMembersPage");
    expect(membersRouteSource).toContain("readProjectMembersQueryOptions");
    expect(membersRouteSource).toContain("useMutation");
    expect(membersRouteSource).toContain("addProjectMemberRest");
    expect(membersRouteSource).toContain("updateProjectMemberRoleRest");
    expect(membersRouteSource).toContain("deleteProjectMemberRest");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/members'");
  });

  it("requires a real project webhook route instead of a placeholder page", () => {
    const webhooksRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/webhooks/route.tsx"),
      "utf8",
    );

    expect(webhooksRouteSource).not.toContain("PlaceholderPage");
    expect(webhooksRouteSource).toContain("ProjectWebhooksPage");
    expect(webhooksRouteSource).toContain("useQuery");
    expect(webhooksRouteSource).toContain("useMutation");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/webhooks'");
  });

  it("requires a real project statistics route instead of a placeholder page", () => {
    const statisticsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/statistics/route.tsx"),
      "utf8",
    );

    expect(statisticsRouteSource).not.toContain("PlaceholderPage");
    expect(statisticsRouteSource).toContain("ProjectStatisticsPage");
    expect(statisticsRouteSource).toContain("useQuery");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/statistics'");
  });

  it("requires a real project delete confirmation route instead of a placeholder page", () => {
    const deleteRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/deleteform/route.tsx"),
      "utf8",
    );

    expect(deleteRouteSource).not.toContain("PlaceholderPage");
    expect(deleteRouteSource).toContain("ProjectDeletePage");
    expect(deleteRouteSource).toContain("deleteProjectRest");
    expect(deleteRouteSource).toContain("useMutation");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/deleteform'");
  });

  it("requires a real site-admin user list route instead of a placeholder page", () => {
    const siteRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );

    expect(siteRouteSource).not.toContain("PlaceholderPage");
    expect(siteRouteSource).toContain("SiteAdminUserListPage");
    expect(siteRouteSource).toContain("listSiteUsersQueryOptions");
    expect(siteRouteSource).toContain("useMutation");
    expect(siteRouteSource).toContain("toggleSiteUserRoleRest");
    expect(siteRouteSource).toContain("toggleSiteUserAccountLockRest");
    expect(siteRouteSource).toContain("toggleSiteUserGuestModeRest");
    expect(siteRouteSource).toContain("resetSiteUserPasswordRest");
    expect(siteRouteSource).toContain("deleteSiteUserRest");
    expect(siteRouteSource).toContain("site-setting-wrap");
    expect(siteRouteSource).toContain("site-setting-nav");
    expect(siteRouteSource).toContain("user-list-wrap");
    expect(siteRouteSource).toContain("data-request-uri");
    expect(siteRouteSource).toContain('data-toggle="reset-password"');
    expect(siteRouteSource).toContain('data-toggle="account-delete"');
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/sites/$pageName'");
  });

  it("requires a real site-admin project list route instead of a follow-up shell", () => {
    const siteRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );

    expect(siteRouteSource).toContain("SiteAdminProjectListPage");
    expect(siteRouteSource).toContain("listSiteProjectsQueryOptions");
    expect(siteRouteSource).toContain("deleteSiteProjectRest");
    expect(siteRouteSource).toContain("useMutation");
    expect(siteRouteSource).toContain("project-list-wrap");
    expect(siteRouteSource).toContain('data-toggle="delete-project"');
    expect(siteRouteSource).not.toContain("This site-admin page remains a follow-up parity slice");
  });

  it("requires a real site-admin post list route instead of a follow-up shell", () => {
    const siteRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );

    expect(siteRouteSource).toContain("SiteAdminPostListPage");
    expect(siteRouteSource).toContain("listSitePostsQueryOptions");
    expect(siteRouteSource).toContain("post-list-wrap");
    expect(siteRouteSource).toContain("post-meta-wrap");
  });

  it("requires a real site-admin issue list route instead of a follow-up shell", () => {
    const siteRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );

    expect(siteRouteSource).toContain("SiteAdminIssueListPage");
    expect(siteRouteSource).toContain("listSiteIssuesQueryOptions");
    expect(siteRouteSource).toContain("SITE_ISSUE_STATES");
    expect(siteRouteSource).toContain("post-list-wrap");
    expect(siteRouteSource).toContain("post-info-wrap");
    expect(siteRouteSource).toContain("post-comments");
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

  it("keeps the legacy issue-label copy form wired to a real mutation", () => {
    const issueLabelsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issue/labelsform/route.tsx"),
      "utf8",
    );
    const issueLabelsApiSource = fs.readFileSync(
      path.resolve(__dirname, "api/project-labels.ts"),
      "utf8",
    );

    expect(issueLabelsRouteSource).not.toContain("PlaceholderPage");
    expect(issueLabelsRouteSource).toContain('id="copyLabel"');
    expect(issueLabelsRouteSource).toContain("copyProjectLabels");
    expect(issueLabelsApiSource).toContain("/labels/copy");
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

    expect(commitsRouteSource).not.toContain("PlaceholderPage");
    expect(commitsRouteSource).toContain("Outlet");
    expect(commitsIndexRouteSource).toContain("CodeHistoryRouteView");
    expect(commitsRouteHelperSource).toContain("readCodeHistory");
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
    const notificationRouteSource = fs.readFileSync(notificationRoutePath, "utf8");
    expect(notificationRouteSource).not.toContain("PlaceholderPage");
    expect(notificationRouteSource).toContain("useQuery");
    expect(notificationRouteSource).toContain("listNotificationsQueryOptions");

    expect(fs.existsSync(notificationsAliasRoutePath)).toBe(true);
    const notificationsAliasRouteSource = fs.readFileSync(notificationsAliasRoutePath, "utf8");
    expect(notificationsAliasRouteSource).not.toContain("PlaceholderPage");
    expect(notificationsAliasRouteSource).toContain('createFileRoute("/notifications")');
    expect(notificationsAliasRouteSource).toContain("NotificationRouteComponent");
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
          bodyHtml: "<p>body</p>",
          bodyMarkdown: "body",
          comments: [],
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
    expect(pullRequestViewsSource).toContain("thread-actrow");
    expect(pullRequestViewsSource).toContain("review-form");

    const detailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );
    expect(detailRouteSource).toContain("pullRequestDetailQueryOptions");
    expect(detailRouteSource).toContain("useMutation");
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
