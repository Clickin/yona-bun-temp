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
  testRuntimeConfig,
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
import {
  ProjectIssueDetailPage,
  ProjectIssueFormPage,
  UserIssueListPage,
} from "./routes/-issue-views";
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
import {
  ProjectChangeVcsPage,
  ProjectForkPage,
  ProjectStatisticsPage,
  ProjectTransferPage,
  ProjectWebhooksPage,
} from "./routes/-project-views";
import { SearchPagination, SearchResults } from "./routes/-search-views";
import { BadRequestPage, ForbiddenPage, NotFoundPage } from "./routes/-shared";
import { NotificationWelcomeGuide } from "./routes/notification/route";

function collectFiles(rootPath: string): string[] {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(rootPath, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

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
  bodyMarkdown: "",
  childClosedCount: 0,
  childIssues: [],
  childOpenCount: 0,
  commentCount: 0,
  createdLabel: "now",
  comments: [],
  dueDateLabel: "",
  hasVoted: false,
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
  parentIssueState: "",
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

function listRouteSourceFiles(directory = path.resolve(__dirname, "routes")): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteSourceFiles(entryPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
      return [];
    }
    return [path.relative(__dirname, entryPath)];
  });
}

function lineNumberForIndex(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function sourceLineForIndex(source: string, index: number) {
  return source.split("\n")[lineNumberForIndex(source, index) - 1]?.trim() ?? "";
}

describe("file-route parity harness", () => {
  it("keeps direct browser navigation limited to legacy href/select pagination flows", () => {
    const directNavigations = listRouteSourceFiles()
      .flatMap((file) => {
        const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
        return Array.from(source.matchAll(/window\.location\.(?:assign|href\s*=)/g), (match) => ({
          file,
          line: lineNumberForIndex(source, match.index ?? 0),
          sourceLine: sourceLineForIndex(source, match.index ?? 0),
        }));
      })
      .sort((left, right) =>
        left.file === right.file ? left.line - right.line : left.file.localeCompare(right.file),
      );

    expect(directNavigations).toEqual([
      {
        file: "routes/__root.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.href = prefixBasePath(",
      },
      {
        file: "routes/-code-views.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.assign(event.currentTarget.value);",
      },
      {
        file: "routes/-code-views.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.assign(event.currentTarget.value);",
      },
      {
        file: "routes/-code-views.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.assign(newerHref);",
      },
      {
        file: "routes/-code-views.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.assign(olderHref);",
      },
      {
        file: "routes/-pull-request-views.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.href = props.hrefForPage(nextPage);",
      },
      {
        file: "routes/-shared.tsx",
        line: expect.any(Number),
        sourceLine: "window.location.assign(prefixBasePath(basePath, href));",
      },
    ]);
  });

  it("keeps canonical and alias auth/settings routes in the generated route tree", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(routeTreeSource).toContain("fullPath: '/users/loginform'");
    expect(routeTreeSource).toContain("fullPath: '/_UIKit'");
    expect(routeTreeSource).toContain("fullPath: '/users/signupform'");
    expect(routeTreeSource).toContain("fullPath: '/secret'");
    expect(routeTreeSource).toContain("fullPath: '/restart'");
    expect(routeTreeSource).toContain("fullPath: '/lostPassword'");
    expect(routeTreeSource).toContain("fullPath: '/resetPassword'");
    expect(routeTreeSource).toContain("fullPath: '/projects'");
    expect(routeTreeSource).toContain("fullPath: '/projectform'");
    expect(routeTreeSource).toContain("fullPath: '/_import'");
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

    const projectFormRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/projectform/route.tsx"),
      "utf8",
    );
    expect(projectFormRouteSource).not.toContain("PlaceholderPage");
    expect(projectFormRouteSource).not.toContain("Read project form options failed.");
    expect(projectFormRouteSource).toContain("BadRequestPage");
    expect(projectFormRouteSource).toContain("readProjectCreateFormOptionsRest");

    const projectHomeRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    expect(projectHomeRouteSource).not.toContain("Read project failed.");
    expect(projectHomeRouteSource).toContain("BadRequestPage");
    expect(projectHomeRouteSource).toContain("classifyConnectFailure");
    expect(projectHomeRouteSource).toContain("error.badrequest");
    expect(projectHomeRouteSource).toContain("user.enroll.failed.network");
    expect(projectHomeRouteSource).toContain("user.enroll.failed.client");
    expect(projectHomeRouteSource).toContain("user.enroll.failed.server");
    expect(projectHomeRouteSource).not.toContain("Cancel enrollment failed.");
    expect(projectHomeRouteSource).not.toContain("Enroll failed.");
    expect(projectHomeRouteSource).not.toContain("Server Error");
    expect(projectHomeRouteSource).not.toContain("Update failed: ");
    expect(projectHomeRouteSource).not.toContain("Toggle favorite failed.");
    expect(projectHomeRouteSource).not.toContain("Toggle watch failed.");
    expect(projectHomeRouteSource).not.toContain("Update overview failed.");

    const homeRouteSource = fs.readFileSync(path.resolve(__dirname, "routes/index.tsx"), "utf8");
    expect(homeRouteSource).toContain('useDocumentTitle(runtimeConfig.siteName ?? "Yona")');
    expect(homeRouteSource).not.toContain('useDocumentTitle("Yona")');

    const restrictedRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/restricted/route.tsx"),
      "utf8",
    );
    expect(restrictedRouteSource).toContain('useDocumentTitle(runtimeConfig.siteName ?? "Yona")');
    expect(restrictedRouteSource).not.toContain('useDocumentTitle("Yona")');

    const secretRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/secret/route.tsx"),
      "utf8",
    );
    expect(secretRouteSource).not.toContain("PlaceholderPage");
    expect(secretRouteSource).toContain('createFileRoute("/secret")');
    expect(secretRouteSource).toContain('messages("app.welcome", { args: [siteName]');
    expect(secretRouteSource).toContain("useDocumentTitle(welcomeTitle)");
    expect(secretRouteSource).not.toContain('useDocumentTitle("app.welcome")');
    expect(secretRouteSource).toContain("setupSecretAdminRest");
    expect(secretRouteSource).toContain("authUiCapabilities.secretSetupRequired === false");
    expect(secretRouteSource).toContain('<NotFoundPage href="/secret" />');
    expect(secretRouteSource).toContain("event.preventDefault()");
    expect(secretRouteSource).not.toContain(
      'action={prefixBasePath(runtimeConfig.basePath, "/secret")}',
    );
    expect(secretRouteSource).not.toContain('method="post"');
    expect(secretRouteSource).toContain('value="admin"');
    expect(secretRouteSource).toContain("app.welcome.warning.title");
    expect(secretRouteSource).toContain("app.welcome.warning.desc");
    expect(secretRouteSource).toContain("app.welcome.submit");
    expect(secretRouteSource).not.toContain("registerWithPasswordRest");
    expect(secretRouteSource).not.toContain("direct_legacy_secret_admin_setup");

    const appRuntimeSource = fs.readFileSync(
      path.resolve(__dirname, "app-runtime-context.tsx"),
      "utf8",
    );
    expect(appRuntimeSource).toContain("secretSetupRequired: response.secretSetupRequired");

    const restartRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/restart/route.tsx"),
      "utf8",
    );
    expect(restartRouteSource).not.toContain("PlaceholderPage");
    expect(restartRouteSource).toContain('createFileRoute("/restart")');
    expect(restartRouteSource).toContain('useDocumentTitle("app.restart.welcome")');
    expect(restartRouteSource).toContain("app.restart.notice");
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
    expect(issueListRouteSource).not.toContain("Read project issues failed.");
    expect(issueListRouteSource).toContain("BadRequestPage");
    expect(issueListRouteSource).toContain('"bad-request"');
    expect(issueListRouteSource).toContain('searchParams.get("dueDate")');
    const issueViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-issue-views.tsx"),
      "utf8",
    );
    expect(issueViewsSource).toContain("issue.error.invalid.duedate");
    expect(issueViewsSource).toContain('id="issueDueDate"');
    expect(issueViewsSource).toContain('data-submit="submit" type="submit"');
    expect(issueDetailRouteSource).not.toContain("PlaceholderPage");
    expect(issueDetailRouteSource).not.toContain("Read issue detail failed.");
    expect(issueDetailRouteSource).toContain("BadRequestPage");
    expect(issueDetailRouteSource).toContain('"bad-request"');
    expect(issueDetailRouteSource).toContain("voteIssueComment");
    expect(issueDetailRouteSource).toContain("unvoteIssueComment");
    expect(issueDetailRouteSource).toContain("onCommentVoteToggle");
    expect(issueViewsSource).toContain("copyEmailBtn");
    expect(issueViewsSource).toContain("button.copy.email.success.message");
    expect(issueViewsSource).toContain("site.features.error.clipboard");

    const directIssueFormRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/user/issues/new/route.tsx"),
      "utf8",
    );
    expect(directIssueFormRouteSource).not.toContain("Read direct issue form failed.");
    expect(directIssueFormRouteSource).toContain("BadRequestPage");
    expect(directIssueFormRouteSource).toContain('"bad-request"');
    const directMyIssueFormRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/user/issues/new/mine/route.tsx"),
      "utf8",
    );
    expect(directMyIssueFormRouteSource).toContain('createFileRoute("/user/issues/new/mine")');
    expect(directMyIssueFormRouteSource).toContain(
      '<DirectIssueCreateFormRouteComponent mine={true} routeHref="/user/issues/new/mine" />',
    );

    const issueCreateRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issueform/route.tsx"),
      "utf8",
    );
    const issueEditRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx"),
      "utf8",
    );
    expect(issueCreateRouteSource).not.toContain("Read project failed.");
    expect(issueCreateRouteSource).toContain("BadRequestPage");
    expect(issueCreateRouteSource).toContain('"bad-request"');
    expect(issueEditRouteSource).not.toContain("Read issue failed.");
    expect(issueEditRouteSource).toContain("BadRequestPage");
    expect(issueEditRouteSource).toContain('"bad-request"');
    expect(issueCreateRouteSource).toContain("navigateToAppHref(");
    expect(issueCreateRouteSource).toContain("runtimeConfig.basePath");
    expect(issueCreateRouteSource).not.toContain("window.location.assign(`/${owner}");
    expect(issueEditRouteSource).toContain("navigateToAppHref(");
    expect(issueEditRouteSource).toContain("runtimeConfig.basePath");
    expect(issueEditRouteSource).not.toContain("window.location.assign(`/${owner}");
    expect(issueDetailRouteSource).toContain("navigateToAppHref(");
    expect(issueDetailRouteSource).toContain("runtimeConfig.basePath");
    expect(issueDetailRouteSource).not.toContain("window.location.assign(`/${owner}");
  });

  it("uses legacy message keys for form route document titles", () => {
    const routeSources = [
      ["routes/$owner/$projectName/issueform/route.tsx", "title.newIssue", "New Issue"],
      ["routes/user/issues/new/route.tsx", "title.newIssue", "New Issue"],
      [
        "routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx",
        "title.editIssue",
        "Edit Issue",
      ],
      ["routes/$owner/$projectName/postform/route.tsx", "post.write", "New post"],
      [
        "routes/$owner/$projectName/post/$postNumber/editform/route.tsx",
        "post.modify",
        "Edit post",
      ],
      [
        "routes/$owner/$projectName/newMilestoneForm/route.tsx",
        "title.newMilestone",
        "New Milestone",
      ],
      [
        "routes/$owner/$projectName/milestone/$milestoneId/editform/route.tsx",
        "title.editMilestone",
        "Edit Milestone",
      ],
      [
        "routes/$owner/$projectName/newPullRequestForm/route.tsx",
        "title.newPullRequest",
        "New Pull Request",
      ],
      [
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx",
        "title.editPullRequest",
        "Edit Pull Request",
      ],
      ["routes/projects/route.tsx", "title.projectList", "Project List"],
      ["routes/orgs/route.tsx", "title.organization.list", "Organization List"],
      ["routes/users/loginform/route.tsx", "title.login", "Login"],
      ["routes/users/signupform/route.tsx", "title.signup", "Sign Up"],
      ["routes/-search-views.tsx", "title.search", "Search"],
      ["routes/$owner/$projectName/issues/route.tsx", "menu.issue", "Issues"],
      [
        "routes/organizations/$organizationName/issues/route.tsx",
        "title.issueList",
        "Organization Issues",
      ],
      ["routes/$owner/$projectName/posts/route.tsx", "menu.board", "Boards"],
      [
        "routes/organizations/$organizationName/boards/route.tsx",
        "menu.board",
        "Organization Boards",
      ],
      ["routes/$owner/$projectName/pullRequests/route.tsx", "menu.pullRequest", "Pull Requests"],
      [
        "routes/$owner/$projectName/closedPullRequests/route.tsx",
        "menu.pullRequest",
        "Closed Pull Requests",
      ],
      [
        "routes/$owner/$projectName/sentPullRequests/route.tsx",
        "menu.pullRequest",
        "Sent Pull Requests",
      ],
      [
        "routes/organizations/$organizationName/pullrequests/route.tsx",
        "title.pullrequest",
        "Organization Pull Requests",
      ],
      [
        "routes/organizations/$organizationName/closedPullrequests/route.tsx",
        "title.pullrequest",
        "Organization Closed Pull Requests",
      ],
      ["routes/$owner/$projectName/milestones/route.tsx", "title.milestoneList", "Milestones"],
      ["routes/$owner/$projectName/branches/route.tsx", "title.branches", "Branches"],
      [
        "routes/$owner/$projectName/commits/-code-history-route.tsx",
        "title.commitHistory",
        "Commit History",
      ],
      ["routes/$owner/$projectName/code/-code-route.tsx", "menu.code", "Code"],
      ["routes/user/issues/route.tsx", "issue.myIssue", "User Issues"],
      ["routes/user/editform/password/route.tsx", "userinfo.accountSetting", "Account Settings"],
      ["routes/verify/$loginId/$verificationCode/route.tsx", "user.verification", "Verify User"],
      [
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
        "menu.pullRequest",
        "Pull Request Changes",
      ],
      ["routes/$owner/$projectName/issue/labelsform/route.tsx", "label", "Issue Labels"],
    ] as const;

    for (const [routePath, legacyTitle, rawTitle] of routeSources) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).toContain(`useDocumentTitle("${legacyTitle}")`);
      expect(source).not.toContain(`useDocumentTitle("${rawTitle}")`);
    }

    const loginRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/users/loginform/route.tsx"),
      "utf8",
    );
    const signupRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/users/signupform/route.tsx"),
      "utf8",
    );
    expect(loginRouteSource).toContain("user.login.failed");
    expect(loginRouteSource).toContain("user.login.failed.network");
    expect(loginRouteSource).toContain("user.login.failed.client");
    expect(loginRouteSource).toContain("user.login.failed.server");
    expect(loginRouteSource).not.toContain("Sign in failed.");
    expect(signupRouteSource).toContain("user.enroll.failed");
    expect(signupRouteSource).toContain("user.enroll.failed.network");
    expect(signupRouteSource).toContain("user.enroll.failed.client");
    expect(signupRouteSource).toContain("user.enroll.failed.server");
    expect(signupRouteSource).toContain('"/?signup=requested"');
    expect(signupRouteSource).toContain('"/?verify=sent"');
    expect(signupRouteSource).not.toContain('"/users/loginform?signup=requested"');
    expect(signupRouteSource).not.toContain('"/users/loginform?verify=sent"');
    expect(signupRouteSource).not.toContain("Register failed.");

    const milestoneRouteSources = [
      ["routes/$owner/$projectName/milestones/route.tsx", "Read project milestones failed."],
      ["routes/$owner/$projectName/newMilestoneForm/route.tsx", "Read project failed."],
      ["routes/$owner/$projectName/milestone/$milestoneId/route.tsx", "Read milestone failed."],
      [
        "routes/$owner/$projectName/milestone/$milestoneId/editform/route.tsx",
        "Read milestone failed.",
      ],
    ] as const;
    for (const [routePath, fallback] of milestoneRouteSources) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).not.toContain(fallback);
      expect(source).toContain("BadRequestPage");
      expect(source).toContain('"bad-request"');
    }
    for (const routePath of [
      "routes/$owner/$projectName/newMilestoneForm/route.tsx",
      "routes/$owner/$projectName/milestone/$milestoneId/route.tsx",
      "routes/$owner/$projectName/milestone/$milestoneId/editform/route.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).toContain("navigateToAppHref(");
      expect(source).toContain("runtimeConfig.basePath");
      expect(source).not.toContain("window.location.assign(");
    }
  });

  it("uses legacy message keys for modal close button labels", () => {
    const routePaths = [
      "routes/-auth-views.tsx",
      "routes/-board-views.tsx",
      "routes/-issue-views.tsx",
      "routes/-milestone-views.tsx",
      "routes/-organization-views.tsx",
      "routes/-project-views.tsx",
      "routes/sites/$pageName/route.tsx",
    ];

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      const closeButtons =
        source.match(/<button(?=[^>]*className="close(?: [^"]*)?")[^>]*>[\s\S]*?<\/button>/g) ?? [];

      expect(source).not.toContain('aria-label="Close"');
      for (const closeButton of closeButtons) {
        expect(
          closeButton.includes('aria-label="button.close"') ||
            closeButton.includes('aria-label={legacyMessage(messages, "button.close")}') ||
            closeButton.includes('aria-label={legacyMessage(props.messages, "button.close")}') ||
            closeButton.includes('aria-label={messages.t("button.close",') ||
            /aria-label=\{legacyMessage\([^)]*,\s*"button\.close"\)\}/.test(closeButton),
        ).toBe(true);
        expect(closeButton).not.toMatch(/>\s*x\s*<\/button>/);
      }
    }
  });

  it("uses legacy loading scalar for route bootstrap shells", () => {
    const routeRoot = path.resolve(__dirname, "routes");
    const routeFiles = collectFiles(routeRoot).filter((filePath) => filePath.endsWith(".tsx"));

    expect(routeFiles.length).toBeGreaterThan(0);
    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(routeFile, "utf8");
      expect(source).not.toContain("Loading…");
      expect(source).not.toContain("Loading...");
      expect(source).not.toContain("Loading&hellip;");
      expect(source).not.toContain("Redirecting…");
    }
  });

  it("wires legacy checklist insertion for direct markdown editor shells", () => {
    const routePaths = ["routes/-issue-views.tsx", "routes/-pull-request-views.tsx"] as const;

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).toContain("addLegacyTasklistTemplateFromButton");
      expect(source).toContain("addLegacyTasklistTemplateFromButton(event.currentTarget)");
    }
  });

  it("uses legacy dynamic document title expressions for review and code routes", () => {
    const reviewRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/reviews/route.tsx"),
      "utf8",
    );
    const commitRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commit/$commitId/route.tsx"),
      "utf8",
    );
    const compareRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/compare/$revisionRange/route.tsx"),
      "utf8",
    );
    const pullRequestDetailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );
    const issueDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issue/$issueNumber/route.tsx"),
      "utf8",
    );
    const milestoneDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/milestone/$milestoneId/route.tsx"),
      "utf8",
    );

    expect(reviewRouteSource).toContain('messages("menu.review", { fallback: "menu.review" })');
    expect(reviewRouteSource).not.toContain("useDocumentTitle(`${projectName} - menu.review`)");
    expect(reviewRouteSource).not.toContain('useDocumentTitle("Reviews")');
    expect(commitRouteSource).toContain('messages("code.commits", { fallback: "code.commits" })');
    expect(commitRouteSource).not.toContain("useDocumentTitle(`code.commits @${commitId}`)");
    expect(commitRouteSource).not.toContain('useDocumentTitle("Commit")');
    expect(pullRequestDetailRouteSource).toContain(
      'useDocumentTitle(pullRequestQuery.data?.title ?? "menu.pullRequest")',
    );
    expect(pullRequestDetailRouteSource).not.toContain('"Pull Request"');
    expect(issueDetailRouteSource).toContain(
      'useDocumentTitle(issue?.title ?? "title.issueDetail")',
    );
    expect(issueDetailRouteSource).not.toContain('"Issue"');
    expect(milestoneDetailRouteSource).toContain(
      'useDocumentTitle(milestone?.title ?? "milestone")',
    );
    expect(milestoneDetailRouteSource).not.toContain('"Milestone"');
    expect(compareRouteSource).not.toContain("Read compare diff failed.");
    expect(compareRouteSource).toContain("BadRequestPage");
    expect(compareRouteSource).toContain('"bad-request"');
    expect(compareRouteSource).toContain("useDocumentTitle(revisionRange)");
    expect(compareRouteSource).not.toContain('useDocumentTitle("Compare")');
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
      showIssue: true,
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
      {
        attachments: [],
        closedIssueCount: 0,
        closedIssues: [],
        completionPercent: 0,
        contentsHtml: "",
        contentsMarkdown: "",
        dueDateLabel: "",
        id: 8,
        openIssueCount: 0,
        openIssues: [],
        state: "closed",
        title: "v0.9",
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
    expect(createHtml).toContain('class="app-shell issue-form-page"');
    expect(createHtml).toContain('class="project-header-outer"');
    expect(createHtml).toContain('class="project-header-inner"');
    expect(createHtml).toContain('class="project-header-wrap"');
    expect(createHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(createHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(createHtml).toContain('class="project-menu-outer"');
    expect(createHtml).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/issues"><span class="menu-name">Issue</span>',
    );
    expect(createHtml).toContain('class="page-wrap-outer"');
    expect(createHtml).toContain('class="project-page-wrap"');
    expect(createHtml).toContain('class="content-wrap frm-wrap"');
    expect(createHtml).toContain('id="issue-form"');
    expect(createHtml).not.toContain('action="/yona/owner/projectYobi/issues/latest"');
    expect(createHtml).not.toContain('method="post"');
    expect(createHtml).toContain('encType="multipart/form-data"');
    expect(createHtml).toContain('id="title"');
    expect(createHtml).toContain('name="title"');
    expect(createHtml).toContain('class="text title"');
    expect(createHtml).toContain('maxLength="250"');
    expect(createHtml).toContain('tabindex="1"');
    expect(createHtml).toContain('placeholder="Title"');
    expect(createHtml).toContain('class="span1 subtask-message"');
    expect(createHtml).toContain('class="subtask-wrap show"');
    expect(createHtml).toContain('id="targetProjectId"');
    expect(createHtml).toContain('id="parentId"');
    expect(createHtml).toContain('name="parentIssueId"');
    expect(createHtml).toContain('<option value="31" selected="">#12. Parent issue</option>');
    expect(createHtml).toContain('class="span9 span-left-pane"');
    expect(createHtml).toContain('data-toggle="markdown-editor"');
    expect(createHtml).toContain('class="nav nav-tabs nm small"');
    expect(createHtml).toContain(">Edit</a>");
    expect(createHtml).toContain(">Preview</a>");
    expect(createHtml).toContain('class="markdown-help"');
    expect(createHtml).toContain('class="markdown-preview markdown-wrap content-body"');
    expect(createHtml).toContain("<p>Template body</p>");
    expect(createHtml).toContain('class="notification-receiver"');
    expect(createHtml).toContain('class="editorSeries content comment nm"');
    expect(createHtml).toContain('id="editor-body-content-body"');
    expect(createHtml).toContain('name="body"');
    expect(createHtml).toContain('data-editor-mode="content-body"');
    expect(createHtml).toContain("Template body");
    expect(createHtml).toContain('class="upload-wrap content-footer"');
    expect(createHtml).toContain('data-resource-type="ISSUE_POST"');
    expect(createHtml).toContain('class="help help-droppable"');
    expect(createHtml).toContain('class="nbtn medium white fake-file-wrap"');
    expect(createHtml).toContain('name="filePath"');
    expect(createHtml).toContain('class="attached-files unstyled"');
    expect(createHtml).toContain('id="tplAttachedFile"');
    expect(createHtml).toContain('class="attached-file"');
    expect(createHtml).toContain('class="progress upload-progress"');
    expect(createHtml).toContain('class="pull-right nbtn small white btn-insert"');
    expect(createHtml).toContain('id="tplDropFilesHere"');
    expect(createHtml).toContain('class="upload-drop-here"');
    expect(createHtml).toContain('id="button-save"');
    expect(createHtml).toContain('class="ybtn ybtn-success"');
    expect(createHtml).toContain('id="draft-save-btn"');
    expect(createHtml).toContain('data-content="Only you can see it until you publish"');
    expect(createHtml).toContain('data-placement="top"');
    expect(createHtml).toContain('data-toggle="tooltip"');
    expect(createHtml).toContain('class="span3 span-hard-wrap right-menu"');
    expect(createHtml).toContain("<dt>Assignee</dt>");
    expect(createHtml).toContain('id="assignee"');
    expect(createHtml).toContain('name="assigneeLoginId"');
    expect(createHtml).toContain('class="bigdrop"');
    expect(createHtml).toContain('id="milestoneOption"');
    expect(createHtml).toContain('id="milestoneId"');
    expect(createHtml).toContain('data-format="milestone"');
    expect(createHtml).toContain('value="7"');
    expect(createHtml).not.toContain('value="8"');
    expect(createHtml).toContain('id="issueDueDate"');
    expect(createHtml).toContain('data-toggle="calendar"');
    expect(createHtml).toContain('class="search-btn btn-calendar"');
    expect(createHtml).toContain('id="labelIds"');
    expect(createHtml).toContain('name="labelIds"');
    expect(createHtml).toContain('data-format="issuelabel"');
    expect(createHtml).toContain('aria-label="Select label"');
    expect(createHtml).toContain('data-placeholder="Select label"');
    expect(createHtml).not.toContain("[button.edit]");
    expect(createHtml).toContain('class="label issue-label list-label active white"');
    expect(createHtml).toContain('name="referCommentId"');
    expect(createHtml).toContain('value="55"');
    expect(createHtml).not.toContain("Yona Rust Project");
    const issueViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-issue-views.tsx"),
      "utf8",
    );
    expect(issueViewsSource).toContain("legacyIssueValidationMessage");
    expect(issueViewsSource).toContain("issue.error.emptyTitle");
    expect(issueViewsSource).toContain("issue.error.invalid.duedate");
    expect(issueViewsSource).toContain("legacyIssueFormSubmitGuardDurationMs = 3000");
    expect(issueViewsSource).toContain("setSubmitGuardActive(true)");
    expect(issueViewsSource).toContain("window.confirm(message)");

    const editHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={detail}
        initialIssue={{
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
          parentIssueState: "open",
          parentIssueTitle: "Parent issue",
          state: "closed",
          title: "Existing issue",
        }}
        milestoneOptions={milestones}
        mode="edit"
        onSubmit={async () => undefined}
        parentIssueOptions={[{ id: 31, issueNumber: 12, selected: true, title: "Parent issue" }]}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(editHtml).not.toContain('action="/yona/owner/projectYobi/issue/17/edit"');
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
    expect(editHtml).toContain('<optgroup label="Open">');
    expect(editHtml).toContain('<option data-state="open" value="7" selected="">v1.0</option>');
    expect(editHtml).toContain('<optgroup label="Closed">');
    expect(editHtml).toContain('<option data-state="closed" value="8">v0.9</option>');
    expect(editHtml).not.toContain("[button.edit]");
    expect(editHtml).toContain(
      '<option data-category-id="3" data-category-is-exclusive="false" value="5" selected="">bug</option>',
    );

    const draftEditHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={detail}
        initialIssue={{
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
        }}
        mode="edit"
        onSubmit={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(draftEditHtml).toContain('<span class="draft">Draft</span>');
    expect(draftEditHtml).toContain('id="button-draft-publish"');
    expect(draftEditHtml).toContain(">Publish</button>");
    expect(draftEditHtml).toContain('data-content="Publish issue. Notification will be sent."');
    expect(draftEditHtml).toContain('data-placement="top-start"');
    expect(draftEditHtml).toContain('id="draft-save-btn"');
    expect(draftEditHtml).toContain('data-content="Only you can see it until you publish"');
    expect(draftEditHtml).not.toContain('id="button-save"');
    expect(draftEditHtml).not.toContain('id="notificationMail"');
  });

  it("preserves the legacy issue detail created-date header scalar", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const detail: ProjectDetailViewModel = {
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
    const html = renderToStaticMarkup(
      <ProjectIssueDetailPage
        detail={detail}
        issue={{
          ...baseIssueDetail,
          createdLabel: "May 20, 2026",
          issueNumber: 17,
          state: "open",
          title: "Created date issue",
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<header class="board-header issue">');
    expect(html).toContain('<div class="date" title="May 20, 2026">May 20, 2026</div>');
    expect(html).toContain('<span class="date" title="May 20, 2026">May 20, 2026</span>');
    expect(html).toContain('<span class="badge badge-issue-open">open</span>');
    expect(html).toContain('<span class="badge badge-small badge-issue-open">open</span>');
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
    const commitDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/commit/$commitId/route.tsx"),
      "utf8",
    );

    expect(codeRouteSource).not.toContain("PlaceholderPage");
    expect(codeRouteSource).toContain("Outlet");
    expect(codeIndexRouteSource).toContain("CodeBrowserRouteView");
    expect(codeRouteHelperSource).not.toContain("Read code browser failed.");
    expect(codeRouteHelperSource).toContain("BadRequestPage");
    expect(codeRouteHelperSource).toContain('"bad-request"');
    expect(codeRouteHelperSource).toContain("readCodeBrowser");
    expect(commitDetailRouteSource).not.toContain("Read commit detail failed.");
    expect(commitDetailRouteSource).toContain("BadRequestPage");
    expect(commitDetailRouteSource).toContain("codeCommitDetailQueryOptions");
    expect(commitDetailRouteSource).toContain("watchCommitRest");
    expect(commitDetailRouteSource).toContain("unwatchCommitRest");
    expect(commitDetailRouteSource).toContain("onToggleCommitWatch");
    expect(commitDetailRouteSource).toContain("error.badrequest");
    expect(commitDetailRouteSource).not.toContain("Create commit comment failed.");
    expect(commitDetailRouteSource).not.toContain("Delete commit comment failed.");
    expect(commitDetailRouteSource).not.toContain("Update commit comment failed.");
    expect(commitDetailRouteSource).not.toContain("Close commit thread failed.");
    expect(commitDetailRouteSource).not.toContain("Open commit thread failed.");
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
    expect(commitsRouteHelperSource).not.toContain("Read code history failed.");
    expect(commitsRouteHelperSource).toContain("BadRequestPage");
    expect(commitsRouteHelperSource).toContain('"bad-request"');
    expect(commitsRouteHelperSource).toContain("readCodeHistory");
    expect(codeViewsSource).toContain("data-via-email");
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch/'");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/commits/$branch/$'");
  });

  it("renders code browser surfaces without temporary Yona Rust headings", () => {
    const branchRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/branches/route.tsx"),
      "utf8",
    );
    expect(branchRouteSource).not.toContain("Read branches failed.");
    expect(branchRouteSource).toContain("BadRequestPage");
    expect(branchRouteSource).toContain('"bad-request"');
    expect(branchRouteSource).toContain("error.badrequest");
    expect(branchRouteSource).not.toContain("Set default branch failed.");
    expect(branchRouteSource).not.toContain("Delete branch failed.");

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
                    contentsMarkdown: "Review comment",
                    createdLabel: "2026-06-03",
                    id: 9,
                    threadId: 8,
                    viaEmail: false,
                  },
                ],
                commitId: "abcdef1234567890",
                createdLabel: "2026-06-03",
                id: 8,
                path: "",
                prevCommitId: "",
                state: "open",
              },
            ],
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
                pullRequest: {
                  ownerName: "owner",
                  projectName: "projectYobi",
                  pullRequestNumber: 12,
                  state: "OPEN",
                },
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
      expect(html).toContain('class="project-header-outer"');
      expect(html).toContain('class="project-header-inner"');
      expect(html).toContain('class="project-header-wrap"');
      expect(html).toContain('class="project-menu-outer"');
      expect(html).toContain('class="page-wrap-outer"');
      expect(html).toContain('class="project-page-wrap"');
      expect(html).toContain('href="/yona/owner">owner</a>');
      expect(html).toContain('href="/yona/owner/projectYobi">projectYobi</a>');
      expect(html).not.toContain("Yona Rust Project");
      expect(html).not.toContain("<h1>menu.code</h1>");
      expect(html).not.toContain("<h1>code.commits</h1>");
      expect(html).not.toContain("<h1>title.branches</h1>");
      expect(html).not.toContain("<p>owner/projectYobi</p>");
    }
    for (const html of [pages[0], pages[1], pages[3], pages[4]]) {
      expect(html).toContain(">Files</a>");
      expect(html).toContain(">Commit</a>");
      expect(html).toContain(">Branches</a>");
      expect(html).not.toContain(">code.files</a>");
      expect(html).not.toContain(">code.commits</a>");
      expect(html).not.toContain(">title.branches</a>");
    }
    expect(pages[0]).toContain(
      '<select class="pull-left" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(pages[0]).toContain(">Download as .zip file</a>");
    expect(pages[0]).toContain('id="new-file-link"');
    expect(pages[0]).toContain(">New file</a>");
    expect(pages[0]).toContain('href="/yona/owner/projectYobi/postform?path=&amp;branch=main"');
    expect(pages[0]).not.toContain(">Download</a>");
    expect(pages[0]).not.toContain('<label for="branches">Branch</label>');
    expect(pages[2]).toContain('<p class="commitInfo">');
    expect(pages[2]).toContain(
      '<strong class="commitId">@abcdef1234567890..abcdef1234567890</strong>',
    );
    expect(pages[2]).not.toContain("<h1>Compare</h1>");
    expect(pages[1]).toContain(
      'class="avatar-wrap" data-placement="top" data-toggle="tooltip" href="/yona/reviewer" title="Reviewer"',
    );
    expect(pages[1]).toContain(
      'data-placement="top" data-toggle="tooltip" href="/yona/reviewer" title="Reviewer"><strong>reviewer </strong></a>',
    );
    expect(pages[1]).toContain(
      '<span class="ago"><a href="#comment-9" title="2026-06-03">2026-06-03</a></span>',
    );
    expect(pages[3]).not.toContain("<h1>Branches</h1>");
    expect(pages[4]).toContain(
      '<select class="pull-right" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(pages[4]).toContain(
      '<option value="/yona/owner/projectYobi/commits/main" selected="">main</option>',
    );
    expect(pages[4]).not.toContain("<h1>Commit History</h1>");
    expect(pages[4]).not.toContain('<label for="branches">Branch</label>');
    const branchListHtml = pages[3];
    expect(branchListHtml).toContain("<th>Branches</th>");
    expect(branchListHtml).toContain("<th>Latest commit</th>");
    expect(branchListHtml).toContain("<th>Latest pull request</th>");
    expect(branchListHtml).toContain("Default branch");
    expect(branchListHtml).toContain("No pull request has been sent");
    expect(branchListHtml).toContain(
      '<span class="date" data-placement="top" data-toggle="tooltip" title="2026-06-01T00:00:00Z">2026-06-01T00:00:00Z</span>',
    );
    expect(branchListHtml).toContain(
      'class="blue-txt pullrequest-state open" data-placement="top" data-toggle="tooltip" href="/yona/owner/projectYobi/pullRequest/12" title="Open"',
    );
    expect(branchListHtml).toContain(">Set as default branch</button>");
    expect(branchListHtml).toContain(">Delete</a>");
    expect(branchListHtml).not.toContain(">title.branches</th>");
    expect(branchListHtml).not.toContain(">code.branches.commit</th>");
    expect(branchListHtml).not.toContain(">code.branches.pullRequest</th>");
    expect(branchListHtml).not.toContain(">code.branches.defaultBranch<");
    expect(branchListHtml).not.toContain(">code.branches.noPullRequest<");
    expect(branchListHtml).not.toContain(">Set as default</button>");
    expect(branchListHtml).not.toContain(">button.delete</a>");
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
    expect(emptyBranchListHtml).toContain("<tbody></tbody>");
    expect(emptyBranchListHtml).not.toContain("No branches");
    expect(emptyBranchListHtml).not.toContain('class="warning-none"');
    expect(pages[0]).toContain("No file exists");
    expect(pages[0]).not.toContain("code.nofiles");
    expect(pages[2]).toContain("No changes");
    expect(pages[2]).not.toContain("code.noChanges");
    expect(pages[4]).toContain("No commit exists");
    expect(pages[4]).not.toContain("code.nocommits");
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
    expect(folderHtml).toContain("<strong>File name</strong>");
    expect(folderHtml).toContain("<strong>Commit message</strong>");
    expect(folderHtml).toContain("<strong>Commit date</strong>");
    expect(folderHtml).toContain('class="span6 filename"');
    expect(folderHtml).toContain('class="span5 commitMsg"');
    expect(folderHtml).toContain(
      '<a class="avatar-wrap smaller" href="/yona/author"><img alt="Author" src="/yona/files/77"/></a>',
    );
    expect(folderHtml).toContain('class="span1 commitDate"');
    expect(folderHtml).toContain('class="dynatree-icon vmiddle"');
    expect(folderHtml).toContain('data-list-path="docs"');
    expect(folderHtml).not.toContain('data-listPath="docs"');
    expect(folderHtml).toContain('id="cb-docs/guides"');
    expect(folderHtml).toContain('data-path="docs/guides"');
    expect(folderHtml).toContain('data-target-path="docs/guides"');
    expect(folderHtml).not.toContain('data-targetPath="docs/guides"');
    expect(folderHtml).toContain('data-type="folder"');
    expect(folderHtml).toContain(
      'href="/yona/owner/projectYobi/code/main/docs/guides#cb-docs/guides"',
    );
    expect(folderHtml).toContain('title="guides"');
    expect(folderHtml).toContain(
      'href="/yona/owner/projectYobi/commit/abcdef1?branch=main&amp;path=docs%2Fguides#docs-guides"',
    );
    expect(folderHtml).toContain(">Update docs</a>");
    expect(folderHtml).not.toContain("<strong>code.filename</strong>");
    expect(folderHtml).not.toContain("<strong>code.commitMsg</strong>");
    expect(folderHtml).not.toContain("<strong>code.commitDate</strong>");
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
    expect(historyHtml).toContain("<strong>Commit message</strong>");
    expect(historyHtml).toContain("<strong>Author Date</strong>");
    expect(historyHtml).toContain("<strong>Author</strong>");
    expect(historyHtml).toContain(
      '<a href="/yona/owner/projectYobi/commits/main/docs">docs</a><a href="/yona/owner/projectYobi/commits/main/docs/guides">guides</a>',
    );
    expect(historyHtml).not.toContain("<span>/</span>");
    expect(historyHtml).toContain('title="Copy commit ID"');
    expect(historyHtml).toContain('data-commit-id="abcdef1234567890"');
    expect(historyHtml).not.toContain('data-commitId="abcdef1234567890"');
    expect(historyHtml).toContain('class="yobicon-copy"');
    expect(historyHtml).toContain('title="View commit"');
    expect(historyHtml).toContain(
      '<span class="number-of-comments"><i class="yobicon-comments"></i> 2</span>',
    );
    expect(historyHtml).toContain('class="yobicon-comments"');
    expect(historyHtml).toContain("</i> 2</span>");
    expect(historyHtml).toContain('class="commitMsg short"');
    expect(historyHtml).toContain(
      '<button class="commitMsg moreBtn" type="button"><span>…</span></button>',
    );
    expect(historyHtml).toContain('<pre class="commitMsg desc hidden">');
    expect(historyHtml).toContain("Detailed body</pre>");
    expect(historyHtml).not.toContain('<pre class="commitMsg desc hidden">Initial commit');
    expect(historyHtml).not.toContain('class="number-of-comments ml5"');
    expect(historyHtml).toContain('title="Browse code at this point"');
    expect(historyHtml).toContain(">Browse code</a>");
    expect(historyHtml).toContain(
      '<td class="date" title="2026-06-01T00:00:00Z">2026-06-01T00:00:00Z</td>',
    );
    expect(historyHtml).toContain(
      '<a class="avatar-wrap" data-placement="top" data-toggle="tooltip" href="/yona/dev" title="dev"><img alt="Dev" height="32" src="/yona/files/88" width="32"/></a>',
    );
    expect(historyHtml).toContain(">Newer</a>");
    expect(historyHtml).toContain(">Older</a>");
    expect(historyHtml).not.toContain("<strong>code.authorDate</strong>");
    expect(historyHtml).not.toContain("<strong>code.author</strong>");
    expect(historyHtml).not.toContain('title="code.copyCommitId"');
    expect(historyHtml).not.toContain('title="code.showCommit"');
    expect(historyHtml).not.toContain("Comments 2");
    expect(historyHtml).not.toContain("code.showCode");
    expect(historyHtml).not.toContain(">code.newer</a>");
    expect(historyHtml).not.toContain(">code.older</a>");
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
    expect(compareHtml).toContain('<p class="commitInfo">');
    expect(compareHtml).toContain(
      '<strong class="commitId">@abcdef1234567890..1234567890abcdef</strong>',
    );
    expect(compareHtml).toContain('<div class="diff-body discommentable">');
    expect(compareHtml).toContain('<article class="diff-file" id="README-md">');
    expect(compareHtml).not.toContain("<h1>abcdef1234567890..1234567890abcdef</h1>");
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
    const projectLayoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const organizationLayoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/route.tsx"),
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
    expect(searchViewsSource).toContain('scope.type === "project"');
    expect(searchViewsSource).toContain('category.type === "project"');
    expect(searchViewsSource).toContain("readProjectSearch");
    expect(searchViewsSource).toContain("ProjectHeader");
    expect(searchViewsSource).toContain("ProjectMenu");
    expect(searchViewsSource).toContain("projectSearchDetail");
    expect(searchViewsSource).toContain('scope.type !== "project"');
    expect(projectLayoutSource).toContain("appPath === `/${owner}/${projectName}/search`");
    expect(projectLayoutSource).toContain('shellClassName: "search-page"');
    expect(projectLayoutSource).toContain("wrapPageOuter: false");
    expect(projectSearchRouteSource).toContain("renderShell={false}");
    expect(organizationLayoutSource).toContain(
      "appPath === `/organizations/${organizationName}/search`",
    );
    expect(organizationLayoutSource).toContain('shellClassName: "search-page"');
    expect(organizationLayoutSource).toContain("wrapPageOuter: false");
    expect(organizationSearchRouteSource).toContain("renderShell={false}");
    expect(searchViewsSource).toContain("OrganizationHeader");
    expect(searchViewsSource).toContain("OrganizationMenu");
    expect(searchViewsSource).toContain("organizationSearchDetail");
    expect(searchViewsSource).toContain('scope.type !== "organization"');
    expect(searchViewsSource).toContain("detail={organizationDetail}");
    expect(searchViewsSource).toContain("messages={messages}");
    expect(searchViewsSource).toContain("runtimeConfig={runtimeConfig}");
    expect(searchViewsSource).toContain("readOrganizationSearch");
    expect(searchViewsSource).toContain("apiQueryKeys.search.project");
    expect(searchViewsSource).toContain("useNavigate");
    expect(searchViewsSource).toContain("navigate({ href })");
    expect(searchViewsSource).toContain("event.preventDefault();");
    expect(searchViewsSource).toContain("new FormData(event.currentTarget)");
    expect(searchViewsSource).toContain("onNavigate={navigateSearch}");
    for (const key of [
      "title.search",
      "search.result.title",
      "search.menu.issues",
      "search.menu.users",
      "search.menu.projects",
      "search.menu.boards",
      "search.menu.milestones",
      "search.menu.issue.comments",
      "search.menu.board.comments",
      "search.menu.reviews",
    ]) {
      expect(searchViewsSource).toContain(key);
    }
    for (const rawLabel of [
      'label: "Issues"',
      'label: "Users"',
      'label: "Projects"',
      'label: "Posts"',
      'label: "Milestones"',
      'label: "Issue Comments"',
      'label: "Post Comments"',
      'label: "Code Reviews"',
      "<h3>Search</h3>",
      ">Search</button>",
      "Found <strong>",
      '<div className="empty-result">Loading&hellip;</div>',
    ]) {
      expect(searchViewsSource).not.toContain(rawLabel);
    }

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
    expect(paginationHtml).toContain("Previous page");
    expect(paginationHtml).toContain("Next page");
    expect(paginationHtml).toContain(
      'href="/yona/search?keyword=Needle&amp;searchType=issue&amp;pageNum=1"',
    );
    expect(paginationHtml).toContain(
      'href="/yona/search?keyword=Needle&amp;searchType=issue&amp;pageNum=3"',
    );
    expect(paginationHtml).not.toContain("Page 2 of 3");

    const resultsHtml = renderToStaticMarkup(
      <SearchResults
        activeType="issue"
        input={{ keyword: "Needle", pageNum: 1, searchType: "issue" }}
        isLoading={false}
        response={{
          context: { organizationName: "", ownerName: "", projectName: "" },
          counts: {
            issueComments: 0,
            issues: 2,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Door",
              authorLoginId: "door",
              createdLabel: "May 18, 2026",
              href: "/owner/projectYobi/issue/7",
              id: "issue-7",
              number: "7",
              ownerName: "owner",
              projectName: "projectYobi",
              snippets: [{ highlights: [], text: "Needle body" }],
              state: "",
              title: "Search issue",
              type: "issue",
              updatedLabel: "",
            },
            {
              authorLabel: "",
              authorLoginId: "ghost",
              createdLabel: "May 19, 2026",
              href: "/owner/projectYobi/issue/8",
              id: "issue-8",
              number: "8",
              ownerName: "owner",
              projectName: "projectYobi",
              snippets: [{ highlights: [], text: "No author body", truncated: true }],
              state: "",
              title: "No author search issue",
              type: "issue",
              updatedLabel: "",
            },
          ],
          keyword: "Needle",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "issue",
          scope: "global",
          searchType: "issue",
          totalCount: 2,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        scope={{ type: "global" }}
      />,
    );
    expect(resultsHtml).toContain('href="/yona/door"');
    expect(resultsHtml).toContain(
      'class="meta-item" data-placement="top" data-toggle="tooltip" href="/yona/door" title="door"',
    );
    expect(resultsHtml).toContain(
      '<span class="meta-item" title="May 18, 2026">May 18, 2026</span>',
    );
    expect(resultsHtml).toContain(">No author search issue</a>");
    expect(resultsHtml).toContain(">No author</span>");
    expect(resultsHtml).not.toContain(">issue.noAuthor</span>");
    expect(resultsHtml).not.toContain('href="/yona/users/door"');
    expect(resultsHtml).not.toContain('title="issue.noAuthor"');
    expect(resultsHtml).not.toContain('href="/yona/issue.noAuthor"');
    expect(resultsHtml).toContain(" .....");

    const milestoneResultsHtml = renderToStaticMarkup(
      <SearchResults
        activeType="milestone"
        input={{ keyword: "Needle", pageNum: 1, searchType: "milestone" }}
        isLoading={false}
        response={{
          context: { organizationName: "", ownerName: "", projectName: "" },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 1,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "",
              authorLoginId: "",
              createdLabel: "",
              href: "/owner/projectYobi/milestone/7",
              id: "7",
              number: "7",
              ownerName: "owner",
              projectName: "projectYobi",
              snippets: [{ highlights: [], text: "Needle milestone body" }],
              state: "open",
              title: "Search milestone",
              type: "milestone",
              dueDateUntilLabel: "Today",
              updatedLabel: "2026-05-18",
            },
          ],
          keyword: "Needle",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "milestone",
          scope: "global",
          searchType: "milestone",
          totalCount: 1,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
        scope={{ type: "global" }}
      />,
    );
    expect(milestoneResultsHtml).toContain('href="/yona/owner/projectYobi/milestone/7"');
    expect(milestoneResultsHtml).toContain(
      'class="project-link meta-item" href="/yona/owner/projectYobi"',
    );
    expect(milestoneResultsHtml).toContain(
      '<span class="due-date meta-item">Due Date <strong>2026-05-18</strong> (Today)</span>',
    );
    expect(milestoneResultsHtml).not.toContain("label.dueDate");
    expect(milestoneResultsHtml).not.toContain(">issue.noAuthor</span>");
    expect(milestoneResultsHtml).not.toContain('<span class="meta-item">open</span>');
  });

  it("requires a real organization issue route instead of a placeholder page", () => {
    const organizationIssueRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/issues/route.tsx"),
      "utf8",
    );

    expect(organizationIssueRouteSource).not.toContain("PlaceholderPage");
    expect(organizationIssueRouteSource).not.toContain("Read organization issues failed.");
    expect(organizationIssueRouteSource).toContain("BadRequestPage");
    expect(organizationIssueRouteSource).toContain('"bad-request"');
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
    expect(listHtml).toContain('class="project-header-outer"');
    expect(listHtml).toContain('class="project-header-inner"');
    expect(listHtml).toContain('class="group-title-head">group</span>');
    expect(listHtml).toContain('<a href="/yona/organizations/acme">acme</a>');
    expect(listHtml).toContain("row-fluid issue-list-wrap");
    expect(listHtml).toContain("left-menu span2 span-hard-wrap");
    expect(listHtml).toContain('id="search"');
    expect(listHtml).toContain('id="projects"');
    expect(listHtml).toContain('name="projectNames[]"');
    expect(listHtml).toContain('data-toggle="select2"');
    expect(listHtml).toContain("lst-stacked unstyled");
    expect(listHtml).toContain("All issues");
    expect(listHtml).toContain("Assigned");
    expect(listHtml).toContain("Created");
    expect(listHtml).toContain("Mentioned");
    expect(listHtml).toContain('data-mention-id="42"');
    expect(listHtml).toMatch(/data-search="mentionId"[^>]*name="mentionId"[^>]*value=""/);
    expect(listHtml).toContain("mentionId=42");
    expect(listHtml).toContain('class="nav nav-tabs nm"');
    expect(listHtml).toContain("Open");
    expect(listHtml).toContain('class="num-badge">2');
    expect(listHtml).toContain('class="two-column-icon mr10 hide-in-mobile"');
    expect(listHtml).toContain('title="Two Column Mode"');
    expect(listHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(listHtml).toContain('id="two-column-mode"');
    expect(listHtml).toContain('class="two-column-mode-text">Column View</span>');
    expect(listHtml).toContain("filter-wrap small-heights");
    expect(listHtml).toContain('data-order-by="updatedDate"');
    expect(listHtml).toContain("Updated");
    expect(listHtml).toContain('class="post-list-wrap"');
    expect(listHtml).toContain("post-item title");
    expect(listHtml).toContain('class="avatar-wrap mlarge hide-in-mobile empty-avatar-wrap"');
    expect(listHtml).toContain('href="/yona/acme/rocket/issue/7"');
    expect(listHtml).toContain("Fix the group issue list");
    expect(listHtml).toContain("infos-item item-count-groups");
    expect(listHtml).toContain('class="infos-link-item group-project-name"');
    expect(listHtml).toContain('class="post-id margin-right-5">#7');
    expect(listHtml).toContain('class="label issue-label list-label white"');
    expect(listHtml).toContain('data-label-id="11"');
    expect(listHtml).toContain('title="Assignee: Mona"');
    expect(listHtml).toContain('id="pagination"');
    expect(listHtml).not.toContain("Yona Rust Organization");
    expect(listHtml).not.toContain("Search issues");
    expect(listHtml).not.toContain("issue.assignee:");

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
    expect(emptyHtml).toContain("No issue found");
    expect(emptyHtml).not.toContain("Assigned");
  });

  it("requires a real user issue route instead of a placeholder page", () => {
    const userIssueRoutePath = path.resolve(__dirname, "routes/user/issues/route.tsx");
    const issueViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-issue-views.tsx"),
      "utf8",
    );

    expect(fs.existsSync(userIssueRoutePath)).toBe(true);
    const userIssueRouteSource = fs.readFileSync(userIssueRoutePath, "utf8");
    expect(userIssueRouteSource).not.toContain("PlaceholderPage");
    expect(userIssueRouteSource).not.toContain("Read user issues failed.");
    expect(userIssueRouteSource).toContain("set Default page failed: ");
    expect(userIssueRouteSource).not.toContain("set Default page failed.");
    expect(userIssueRouteSource).toContain("BadRequestPage");
    expect(userIssueRouteSource).toContain("listUserIssues");
    expect(userIssueRouteSource).toContain("useNavigate");
    expect(userIssueRouteSource).toContain("useRouterState");
    expect(userIssueRouteSource).toContain("state.location.href");
    expect(userIssueRouteSource).toContain("navigate({ href })");
    expect(issueViewsSource).toContain("onNavigate?: (href: string) => void");
    expect(issueViewsSource).toContain("event.preventDefault();");
    expect(issueViewsSource).toContain("new FormData(event.currentTarget)");
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
              authorLoginId: "door",
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

    expect(html).toContain('class="app-shell user-issue-list-page"');
    expect(html).not.toContain("app-shell user-issue-list-page page-wrap-outer");
    expect(html).toContain('<div class="page-wrap-outer"><div class="page-wrap">');
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('href="/yona/notifications"');
    expect(html).toContain('href="/yona/user/issues"');
    expect(html).toContain('href="/yona/user/files"');
    expect(html).toContain("notification");
    expect(html).toContain("My Issues");
    expect(html).toContain("My Files");
    expect(html).toContain('id="setDefaultLoginPage"');
    expect(html).toContain('data-url="user/issues"');
    expect(html).toContain("Set to default page");
    expect(html).toContain("row-fluid issue-list-wrap");
    expect(html).toContain('pjax-container=""');
    expect(html).toContain("left-menu span2 span-hard-wrap");
    expect(html).toContain("lst-stacked unstyled");
    expect(html).toContain("assigned-to-me");
    expect(html).toContain('pjax-filter=""');
    expect(html).toContain('data-author-id=""');
    expect(html).toContain('data-assignee-id="42"');
    expect(html).toContain('data-commenter-id=""');
    expect(html).toContain('data-milestone-id=""');
    expect(html).toContain('data-favorite-id=""');
    expect(html).toContain("Assigned");
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
    expect(html).toContain('placeholder="Search Issues"');
    expect(html).toContain('class="nav nav-tabs nm"');
    expect(html).toContain('state="open"');
    expect(html).toContain('state="closed"');
    expect(html).toContain("Open");
    expect(html).toContain("show-subtasks-li");
    expect(html).toContain('class="two-column-icon mr10 hide-in-mobile"');
    expect(html).toContain('title="Two Column Mode"');
    expect(html).toContain('data-content="Splits list and body into columns respectively"');
    expect(html).toContain('id="two-column-mode"');
    expect(html).toContain('class="two-column-mode-text">Column View</span>');
    expect(html).toContain('class="show-subtasks mr10"');
    expect(html).toContain('data-toggle="popover"');
    expect(html).toContain('title="Show subtask"');
    expect(html).toContain('data-content="Show subtask always"');
    expect(html).toContain('id="toggle-show-subtasks"');
    expect(html).toContain("filter-wrap small-heights");
    expect(html).toContain('data-order-by="updatedDate"');
    expect(html).toContain('orderBy="updatedDate"');
    expect(html).toContain('orderDir="asc"');
    expect(html).toContain("Updated");
    expect(html).toContain('class="post-list-wrap my-issues"');
    expect(html).toContain("project-name-in-my-issues");
    expect(html).toContain("fixed-height-my-issues-list");
    expect(html).toContain('id="issue-item-9"');
    expect(html).toContain('href="/yona/acme/rocket/issue/9"');
    expect(html).toContain('class="span2 project-name-in-my-issues fixed-height-my-issues-list"');
    expect(html).toContain('class="title project"');
    expect(html).toContain('title="Project name"');
    expect(html).toContain('<span class="infos-item post-id">#9</span>');
    expect(html).toContain('href="/yona/acme/rocket/issue/9"');
    expect(html).toContain("Fix my issue list");
    expect(html).toContain("item-count-groups");
    expect(html).toContain("for-subtask-progressbar");
    expect(html).toContain("twoColumeModeTarget");
    expect(html).toContain('data-label-id="23"');
    expect(html).toContain("author-cell");
    expect(html).toContain('href="/yona/door"');
    expect(html).toContain('title="door"');
    expect(html).toContain(">No author</span>");
    expect(html).not.toContain('title="No author"');
    expect(html).not.toContain('href="/yona/issue.noAuthor"');
    expect(html).toContain("meta-cell");
    expect(html).toContain('title="Assignee: Mona"');
    expect(html).toContain('id="pagination"');
    expect(html).not.toContain("Yona Rust User Issues");
    expect(html).not.toContain("Search issues");
    expect(html).not.toContain("Author:");
    expect(html).not.toContain("issue.assignee:");

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
    expect(mentionedHtml).toMatch(/data-search="mentionId"[^>]*name="mentionId"[^>]*value="42"/);
    expect(mentionedHtml).toMatch(/data-search="sharerId"[^>]*name="sharerId"[^>]*value=""/);
    expect(mentionedHtml).toContain("Mentioned</span><span> (5)</span>");
    expect(mentionedHtml).toContain("Shared</span><span> (7)</span>");
    expect(mentionedHtml).toContain("Favorite</span><span> (3)</span>");

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
    expect(emptyHtml).toContain("No issue found");
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
    expect(notificationRouteSource).not.toContain("Read notifications failed.");
    expect(notificationRouteSource).toContain("BadRequestPage");
    expect(notificationRouteSource).toContain('useDocumentTitle(runtimeConfig.siteName ?? "Yona")');
    expect(notificationRouteSource).not.toContain('useDocumentTitle("Notifications")');
    expect(notificationsAliasRouteSource).not.toContain("PlaceholderPage");
    expect(notificationsAliasRouteSource).toContain("NotificationRouteComponent");
    expect(notificationsAliasRouteSource).toContain('routePath="/notifications"');
    expect(notificationRouteSource).toContain('routePath="/notifications"');
    expect(notificationRouteSource).not.toContain('routePath = "/notification"');
    expect(notificationRouteSource).toContain("useQuery");
    expect(notificationRouteSource).toContain("listNotificationsQueryOptions");
    expect(notificationRouteSource).toContain('className="app-shell notification-page"');
    expect(notificationRouteSource).not.toContain(
      'className="app-shell notification-page page-wrap-outer"',
    );
    expect(notificationRouteSource).toContain("page-wrap-outer");
    expect(notificationRouteSource).toContain("page-wrap");
    expect(notificationRouteSource).toContain("NotificationWelcomeGuide");
    expect(notificationRouteSource).toContain("siteName={runtimeConfig.siteName}");
    expect(notificationRouteSource).toContain(
      'className={`site-guide-outer${visible ? "" : " hide"}`}',
    );
    expect(notificationRouteSource).toContain('legacyMessage(messages, "app.welcome"');
    expect(notificationRouteSource).toContain('legacyMessage(messages, "app.description")');
    expect(notificationRouteSource).toContain("welcome-table table borderless");
    expect(notificationRouteSource).toContain("button.newProject");
    expect(notificationRouteSource).toContain("title.newOrganization");
    expect(notificationRouteSource).toContain("app.welcome.searchProject.desc");
    expect(notificationRouteSource).toContain('className="guide-toggle"');
    expect(notificationRouteSource).toContain('id="toggleIntro"');
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
    expect(notificationRouteSource).toContain("set Default page failed: ");
    expect(notificationRouteSource).not.toContain("set Default page failed.");
    expect(notificationRouteSource).toContain("notification-wrap");
    expect(notificationRouteSource).toContain("warning-none");
    expect(notificationRouteSource).toContain("yobicon-danger");
    expect(notificationRouteSource).toContain("notification.none");
    expect(notificationRouteSource).not.toContain("No notification has been received.");
    expect(notificationRouteSource).not.toContain('<li className="warning-none">Loading…</li>');
    expect(notificationRouteSource).toContain('<li className="warning-none">');
    expect(notificationRouteSource).not.toContain(
      '<div className="warning-none">\n                    <i className="yobicon-danger"></i> notification.none',
    );
    expect(notificationRouteSource).toContain('data-toggle="learnmore"');
    expect(notificationRouteSource).toContain("NotificationMessage");
    expect(notificationRouteSource).toContain("handleLearnMoreClick");
    expect(notificationRouteSource).toContain('target.closest("a, img")');
    expect(notificationRouteSource).toContain(
      "onClick={(event) => handleLearnMoreClick(item.id, event)}",
    );
    expect(notificationRouteSource).toContain("event.stopPropagation()");
    expect(notificationRouteSource).toContain("ResizeObserver");
    expect(notificationRouteSource).toContain('className="more"');
    expect(notificationRouteSource).toContain("/assets/images/default-avatar-64.png");
    expect(notificationRouteSource).toContain('className="smaller"');
    expect(notificationRouteSource).toContain("height={42}");
    expect(notificationRouteSource).toContain("width={42}");
    expect(notificationRouteSource).toContain('type="button"');
    expect(notificationRouteSource).not.toContain('href="javascript:void(0);"');
    expect(notificationRouteSource).toContain('id="notification-more"');
    expect(notificationRouteSource).toContain("listNotificationsRest(runtimeConfig");
    expect(notificationRouteSource).toContain("from: items.length");
    expect(notificationRouteSource).toContain("size: NOTIFICATION_PAGE_SIZE");
    expect(notificationRouteSource).toContain("event.preventDefault()");
    expect(notificationRouteSource).toContain(
      "setItems((current) => [...current, ...nextPage.items])",
    );
    expect(notificationRouteSource).not.toContain("setSize((current) => current +");
    expect(notificationRouteSource).not.toContain("`/users/${encodeURIComponent(loginId)}`");
    expect(notificationRouteSource).toContain("`/${encodeURIComponent(loginId)}`");
    const appCssSource = fs.readFileSync(path.resolve(__dirname, "app.css"), "utf8");
    expect(appCssSource).toContain(".notification-stream .message-wrap.nowrap");
    expect(appCssSource).toContain(".notification-stream .more");
    expect(appCssSource).toContain(".site-guide-outer");
    expect(appCssSource).toContain(".welcome-table");
    expect(appCssSource).toContain(".guide-toggle");
  });

  it("renders the legacy notification welcome guide shell", () => {
    const legacyMessages = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/conf/messages"),
      "utf8",
    );
    const html = renderToStaticMarkup(<NotificationWelcomeGuide basePath="/yona" />);

    expect(legacyMessages).toContain("app.welcome = Tada! Welcome to {0}!");
    expect(legacyMessages).toContain(
      "app.description = Web-based platform for collaborative software development",
    );
    expect(html).toContain('class="site-guide-outer"');
    expect(html).toContain(
      "Tada! Welcome to Yona! - Web-based platform for collaborative software development",
    );
    expect(html).toContain('class="welcome-table table borderless"');
    expect(html).toContain('href="/yona/projects/new"');
    expect(html).toContain(">Create new project</a>");
    expect(html).toContain("Create your own project");
    expect(html).toContain('href="/yona/organizations/new"');
    expect(html).toContain(">New Group</a>");
    expect(html).toContain(
      "If you want to make a group and work with other members, then create a group",
    );
    expect(html).toContain('href="/yona/projects"');
    expect(html).toContain(">Project list</a>");
    expect(html).toContain("Find a project in which you are interested");
    expect(html).not.toContain("app.welcome.project.desc");
    expect(html).toContain('class="guide-toggle"');
    expect(html).toContain('id="toggleIntro"');
    expect(html).toContain('class="yobicon-resizev"');
  });

  it("renders the legacy notification welcome guide with the configured site name", () => {
    const html = renderToStaticMarkup(
      <NotificationWelcomeGuide basePath="/yona" siteName="Legacy Yona" />,
    );

    expect(html).toContain(
      "Tada! Welcome to Legacy Yona! - Web-based platform for collaborative software development",
    );
    expect(html).not.toContain("Tada! Welcome to Yona!");
    expect(html).not.toContain("app.welcome Legacy Yona - app.description");
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

    const boardListRouteSource = fs.readFileSync(boardListRoutePath, "utf8");
    expect(boardListRouteSource).not.toContain("Read project board failed.");
    expect(boardListRouteSource).toContain("BadRequestPage");
    expect(boardListRouteSource).toContain('"bad-request"');
    expect(boardListRouteSource).toContain("listProjectPostsQueryOptions");
    const boardDetailRouteSource = fs.readFileSync(boardDetailRoutePath, "utf8");
    const boardCreateRouteSource = fs.readFileSync(boardCreateRoutePath, "utf8");
    const boardEditRouteSource = fs.readFileSync(boardEditRoutePath, "utf8");
    expect(boardDetailRouteSource).not.toContain("Read post failed.");
    expect(boardDetailRouteSource).toContain("BadRequestPage");
    expect(boardDetailRouteSource).toContain('"bad-request"');
    expect(boardDetailRouteSource).toContain("readProjectPostQueryOptions");
    expect(boardDetailRouteSource).toContain(
      'useDocumentTitle(postQuery.data?.title ?? "menu.board")',
    );
    expect(boardDetailRouteSource).toContain("error.badrequest");
    expect(boardDetailRouteSource).not.toContain('"Board"');
    expect(boardDetailRouteSource).not.toContain("Delete board comment failed.");
    expect(boardDetailRouteSource).not.toContain("Create board comment failed.");
    expect(boardDetailRouteSource).not.toContain("Update board comment failed.");
    expect(boardDetailRouteSource).not.toContain("Delete board post failed.");
    expect(boardDetailRouteSource).not.toContain("Update board watch failed.");
    expect(boardCreateRouteSource).not.toContain("Read post form options failed.");
    expect(boardCreateRouteSource).toContain("BadRequestPage");
    expect(boardCreateRouteSource).toContain('"bad-request"');
    expect(boardCreateRouteSource).toContain("createProjectPostRest");
    expect(boardCreateRouteSource).toContain("error.badrequest");
    expect(boardCreateRouteSource).not.toContain("Create post failed.");
    expect(boardEditRouteSource).not.toContain("Read post form options failed.");
    expect(boardEditRouteSource).not.toContain("Read post failed.");
    expect(boardEditRouteSource).toContain("BadRequestPage");
    expect(boardEditRouteSource).toContain('"bad-request"');
    expect(boardEditRouteSource).toContain("updateProjectPostRest");
    expect(boardEditRouteSource).toContain("post.update.error");
    expect(boardEditRouteSource).not.toContain("Update post failed.");
    const organizationBoardRouteSource = fs.readFileSync(organizationBoardRoutePath, "utf8");
    expect(organizationBoardRouteSource).not.toContain("Read organization boards failed.");
    expect(organizationBoardRouteSource).toContain("BadRequestPage");
    expect(organizationBoardRouteSource).toContain('"bad-request"');
    expect(organizationBoardRouteSource).toContain("listOrganizationBoardsQueryOptions");
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
      updatedLabel: "later",
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
          items: [
            boardItem,
            {
              ...boardItem,
              authorAvatarUrl: "",
              authorLabel: "",
              authorLoginId: "",
              postNumber: "17",
              title: "No author board post",
            },
          ],
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
    expect(listHtml).toContain('class="app-shell board-page"');
    expect(listHtml).toContain('class="project-header-outer"');
    expect(listHtml).toContain('class="project-header-inner"');
    expect(listHtml).toContain('class="project-header-wrap"');
    expect(listHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(listHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(listHtml).toContain('class="project-menu-outer"');
    expect(listHtml).toContain('href="#helpKeys"');
    expect(listHtml).toContain('class="modal hide fade keymap-help"');
    expect(listHtml).toContain("<h5>Posting List</h5>");
    expect(listHtml).toContain('<span class="help-inline">New post</span>');
    expect(listHtml).toContain('<span class="help-inline">Previous page</span>');
    expect(listHtml).toContain('<span class="help-inline">Next page</span>');
    expect(listHtml).toContain('class="page-wrap-outer"');
    expect(listHtml).toContain('<div class="post-list project-page-wrap">');
    expect(listHtml).toContain('<div class="search-wrap underline board-toolbar">');
    expect(listHtml).toContain('id="option_form"');
    expect(listHtml).toContain('method="get"');
    expect(listHtml).toContain('class="pull-left"');
    expect(listHtml).toContain('<div class="search-bar">');
    expect(listHtml).toContain('class="textbox"');
    expect(listHtml).toContain('name="filter"');
    expect(listHtml).toContain('placeholder="Search current project"');
    expect(listHtml).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(listHtml).toContain('name="orderBy"');
    expect(listHtml).toContain('name="orderDir"');
    expect(listHtml).toContain('class="two-column-icon mr10 hide-in-mobile"');
    expect(listHtml).toContain('title="Two Column Mode"');
    expect(listHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(listHtml).toContain('id="two-column-mode"');
    expect(listHtml).toContain('class="two-column-mode-text">Column View</span>');
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
    expect(listHtml).toContain(">No author board post</a>");
    expect(listHtml).toContain(">No author</span>");
    expect(listHtml).not.toContain('title="No author"');
    expect(listHtml).not.toContain('href="/yona/issue.noAuthor"');
    expect(listHtml).toContain(
      '<span class="infos-item" data-placement="bottom" data-toggle="tooltip" title="now">now</span>',
    );
    expect(listHtml).not.toContain(">later</span>");
    expect(listHtml).toContain('<div class="write-btn-wrap"></div>');
    expect(listHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(listHtml).toContain('<ul class="page-nums">');
    expect(listHtml).toContain('name="pageNum"');
    expect(listHtml).toContain('value="2"');
    expect(listHtml).toContain("Previous page");
    expect(listHtml).toContain("Next page");
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
    expect(creatableListHtml).toContain("New post");
    expect(creatableListHtml).toContain('<div class="board-labels"><select');
    expect(creatableListHtml).toContain('name="labelIds[]"');
    expect(creatableListHtml).toContain('aria-label="Select label"');
    expect(creatableListHtml).toContain('data-placeholder="Select label"');
    expect(creatableListHtml).toContain('<ul class="post-list-wrap notice-wrap">');
    expect(creatableListHtml).toContain('class="label label-notice"');
    expect(creatableListHtml).toContain('class="label label-important"');
    expect(creatableListHtml).not.toContain("board-badge");
    expect(creatableListHtml).not.toContain("board-badges");
    expect(creatableListHtml).toContain('class="title-prefix"');
    expect(creatableListHtml).toContain('href="/yona/owner/projectYobi/post/16"');
    expect(creatableListHtml).not.toContain('href="#!"');
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
    expect(emptyListHtml).toContain("No post has been added.");

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
              contentsMarkdown: "- [ ] via mail",
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
        onCommentUpdate={async () => undefined}
        runtimeConfig={runtimeConfig}
        viewerId="1"
      />,
    );
    expect(detailHtml).not.toContain(">Watch<");
    expect(detailHtml).not.toContain("Leave a comment");
    expect(detailHtml).toContain('class="app-shell board-page"');
    expect(detailHtml).toContain('class="project-header-outer"');
    expect(detailHtml).toContain('class="project-menu-outer"');
    expect(detailHtml).toContain('href="#helpKeys"');
    expect(detailHtml).toContain('class="modal hide fade keymap-help"');
    expect(detailHtml).toContain("<h5>title.boardDetail</h5>");
    expect(detailHtml).toContain('<span class="help-inline">New post</span>');
    expect(detailHtml).toContain('<span class="help-inline">List</span>');
    expect(detailHtml).toContain('<span class="help-inline">Edit</span>');
    expect(detailHtml).toContain('class="page-wrap-outer"');
    expect(detailHtml).toContain('<div class="project-page-wrap board-view">');
    expect(detailHtml).toContain('<div class="board-header issue">');
    expect(detailHtml).toContain('<strong class="board-id">#16</strong>');
    expect(detailHtml).toContain('<div class="board-body row-fluid">');
    expect(detailHtml).toContain('<div class="span9 span-left-pane">');
    expect(detailHtml).toContain('<div class="author-info">');
    expect(detailHtml).toContain('class="hide" id="post-16"');
    expect(detailHtml).toContain(
      'action="/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/16/content"',
    );
    expect(detailHtml).toContain('class="content markdown-wrap"');
    expect(detailHtml).toContain('<div class="board-actrow right-txt board-actions">');
    expect(detailHtml).toContain('id="translate"');
    expect(detailHtml).toContain('title="Translation"');
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
    expect(detailHtml).toContain(">Cancel</button>");
    expect(detailHtml).toContain('class="ybtn ybtn-info"');
    expect(detailHtml).toContain(">Save</button>");
    expect(detailHtml).not.toContain(">button.save</button>");
    expect(detailHtml).not.toContain(">button.cancel</button>");
    expect(detailHtml).toContain('id="comment-body-9"');
    expect(detailHtml).toContain('data-task-index="0"');
    expect(detailHtml).toContain('data-via-email="true"');
    expect(detailHtml).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(detailHtml).toContain('data-issue-state="open"');
    expect(detailHtml).toContain('class="write-comment-box mt20"');
    expect(detailHtml).toContain('data-login="required"');
    expect(detailHtml).toContain('class="comment disabled"');
    expect(detailHtml).toContain("<dt>Label</dt>");
    expect(detailHtml).toContain('class="label issue-label active static white"');
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
    expect(writableDetailHtml).toContain(">Stop watching</button>");
    expect(writableDetailHtml).toContain('aria-label="Edit"');
    expect(writableDetailHtml).toContain('<span class="sr-only">Edit</span>');
    expect(writableDetailHtml).toContain(
      'class="icon btn-transparent-with-fontsize-lineheight ml6"',
    );
    expect(writableDetailHtml).toContain('<span class="sr-only">Delete</span>');
    expect(writableDetailHtml).not.toContain(
      'class="icon btn-transparent-with-fontsize-lineheight ml6 danger"',
    );
    expect(writableDetailHtml).not.toContain(">post.unwatch</button>");
    expect(writableDetailHtml).not.toContain("Watchers 2");
    expect(writableDetailHtml).toContain('href="/yona/owner/projectYobi/postform"');
    expect(writableDetailHtml).toContain('id="comment-form"');
    expect(writableDetailHtml).toContain('action="/yona/owner/projectYobi/post/16/comment"');
    expect(writableDetailHtml).toContain('encType="multipart/form-data"');
    expect(writableDetailHtml).toContain('<div class="write-comment-box">');
    expect(writableDetailHtml).toContain('<div class="write-comment-wrap">');
    expect(writableDetailHtml).toContain('id="dynamic-comment-btn"');
    expect(writableDetailHtml).toContain(">Add a comment</button>");
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
    expect(childCommentHtml).toContain("Reply");
    expect(childCommentHtml).toContain('class="subcomment-media-body"');
    expect(childCommentHtml).toContain('class="child-comments"');
    expect(childCommentHtml).toContain('class="one-line-comment"');
    expect(childCommentHtml).toContain("child reply");
    expect(childCommentHtml).toContain(
      '<div class="contents"><p>child reply</p><div class="attachments"',
    );
    expect(childCommentHtml).not.toContain(
      '<div class="contents"><div><p>child reply</p></div><span',
    );
    expect(childCommentHtml).toContain('class="subcomment-author hide"');
    expect(childCommentHtml).toContain('href="/yona/reply"');
    expect(childCommentHtml).toContain('aria-label="Edit comment"');
    expect(childCommentHtml).toContain('<span class="sr-only">Edit comment</span>');
    expect(childCommentHtml).toContain('aria-label="Delete comment"');
    expect(childCommentHtml).not.toContain('aria-label="common.comment.edit"');
    expect(childCommentHtml).toContain('<span class="sr-only">Delete comment</span>');
    expect(childCommentHtml).toContain('class="btn-transparent ml6"');
    expect(childCommentHtml).not.toContain('class="btn-transparent ml6 danger"');
    expect(childCommentHtml).toContain('class="btn-transparent deleteButtonX"');
    expect(childCommentHtml).toContain('class="child-comment-input-form"');
    expect(childCommentHtml).toContain('class="parentCommentId"');
    expect(childCommentHtml).toContain('name="parentCommentId"');
    expect(childCommentHtml).toContain('value="9"');
    expect(childCommentHtml).toContain('class="oneline-comment-box"');
    expect(childCommentHtml).toContain('markdown="true"');
    expect(childCommentHtml).toContain('placeholder="Reply (CTRL + ENTER)"');
    expect(childCommentHtml).toContain('aria-label="Add a comment"');
    expect(childCommentHtml).toContain('data-legacy-label="OK"');
    expect(childCommentHtml).toContain('<span aria-hidden="true">OK</span>');
    expect(childCommentHtml).toContain('<span class="sr-only">Add a comment</span>');
    expect(childCommentHtml).not.toContain(">comment.save</button>");
    expect(childCommentHtml).toContain('class="notification-receiver"');
    expect(childCommentHtml).toContain("Notification receivers");

    const boardViewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-board-views.tsx"),
      "utf8",
    );
    expect(boardViewSource).not.toContain("if (!props.onCommentUpdate) {");
    expect(boardViewSource).toContain(".onCommentUpdate?.(");
    expect(boardViewSource).not.toContain("if (!props.onCommentSubmit) {");
    expect(boardViewSource).toContain(".onCommentSubmit?.(contents, [], comment.id)");
    expect(boardViewSource).toContain(".onCommentSubmit?.(contents, commentAttachmentIds)");

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
    expect(orgHtml).toContain("Previous page");
    expect(orgHtml).toContain("Next page");
    expect(orgHtml).not.toContain("Page 1 of 2");
    expect(orgHtml).not.toContain("<h1>Boards</h1>");
    expect(orgHtml).toContain("projectNames%5B%5D=alpha");
    expect(orgHtml).toContain("pageNum=2");
    expect(orgHtml).toContain('class="app-shell board-page"');
    expect(orgHtml).not.toContain('class="app-shell board-page page-wrap-outer"');
    expect(orgHtml).toContain('class="project-header-outer"');
    expect(orgHtml).toContain('class="project-header-inner"');
    expect(orgHtml).toContain('class="group-title-head">group</span>');
    expect(orgHtml).toContain('<a href="/yona/organizations/weblabs">weblabs</a>');
    expect(orgHtml).toContain('class="project-menu-nav project-menu-gruop"');
    expect(orgHtml).toContain(">Group Home</a>");
    expect(orgHtml).toContain(">Issue</a>");
    expect(orgHtml).toContain(
      '<li class="active"><a href="/yona/organizations/weblabs/boards">Board</a>',
    );
    expect(orgHtml).toContain(">Pull request</a>");
    expect(orgHtml).toContain('<div class="page-wrap-outer"><div class="project-page-wrap">');
    expect(orgHtml).toContain('<div class="search-wrap underline board-toolbar">');
    expect(orgHtml).toContain('id="option_form"');
    expect(orgHtml).toContain('method="get"');
    expect(orgHtml).toContain('class="pull-left"');
    expect(orgHtml).toContain('<div class="project-selects span7">');
    expect(orgHtml).toContain('id="projects"');
    expect(orgHtml).toContain('name="projectNames[]"');
    expect(orgHtml).toContain('aria-label="Choose projects"');
    expect(orgHtml).toContain('data-format="projects"');
    expect(orgHtml).toContain('data-placeholder="Choose projects"');
    expect(orgHtml).toContain('data-toggle="select2"');
    expect(orgHtml).toContain('data-container-css-class="fullsize"');
    expect(orgHtml).not.toContain('aria-label="Projects"');
    expect(orgHtml).toContain('<div class="search-bar span4">');
    expect(orgHtml).toContain('class="textbox group-board"');
    expect(orgHtml).toContain('name="filter"');
    expect(orgHtml).toContain('placeholder="Search by keyword"');
    expect(orgHtml).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(orgHtml).toContain('class="two-column-icon mr10 hide-in-mobile"');
    expect(orgHtml).toContain('title="Two Column Mode"');
    expect(orgHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(orgHtml).toContain('id="two-column-mode"');
    expect(orgHtml).toContain('class="two-column-mode-text">Column View</span>');
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
    expect(emptyOrgHtml).toContain("No post has been added.");
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

    expect(createHtml).toContain('class="app-shell board-page"');
    expect(createHtml).toContain('class="project-header-outer"');
    expect(createHtml).toContain('class="project-header-inner"');
    expect(createHtml).toContain('class="project-header-wrap"');
    expect(createHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(createHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(createHtml).toContain('class="project-menu-outer"');
    expect(createHtml).toContain('class="page-wrap-outer"');
    expect(createHtml).toContain('<h1 class="sr-only">New post</h1>');
    expect(createHtml).not.toContain('<h1 class="sr-only">post.write</h1>');
    expect(createHtml).toContain('<div class="project-page-wrap">');
    expect(createHtml).not.toContain('action="/yona/owner/projectYobi/post"');
    expect(createHtml).not.toContain('method="post"');
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
    expect(createHtml).toContain('placeholder="Title"');
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
    expect(createHtml).toContain("Set this post as notice.");
    expect(createHtml).toContain('id="issueTemplate"');
    expect(createHtml).toContain('id="branch"');
    expect(createHtml).toContain('id="path"');
    expect(createHtml).toContain('id="lineEnding"');
    expect(createHtml).toContain('id="readme"');
    expect(createHtml).toContain('name="readme"');
    expect(createHtml).toContain("make it a README file");
    expect(createHtml).toContain('class="actions board-actions"');
    expect(createHtml).toContain('class="ybtn ybtn-success"');
    expect(createHtml).toContain(">Save</button>");
    expect(createHtml).toContain(">Cancel</a>");
    expect(createHtml).not.toContain(">button.save</button>");
    expect(createHtml).not.toContain(">button.cancel</a>");
    const boardViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-board-views.tsx"),
      "utf8",
    );
    expect(boardViewsSource).toContain("post.error.emptyTitle");

    const labeledCreateHtml = renderToStaticMarkup(
      <ProjectPostFormPage
        canMarkNotice
        canMarkReadme
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
        mode="create"
        ownerName="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
        onSubmit={noopSubmit}
      />,
    );
    expect(labeledCreateHtml).not.toContain("board-label-picker");
    expect(labeledCreateHtml).not.toContain("<legend>Label</legend>");
    expect(labeledCreateHtml).toContain('data-resource-type="BOARD_POST"');

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
    expect(editHtml).not.toContain('action="/yona/owner/projectYobi/post/16"');
    expect(editHtml).toContain('<h1 class="sr-only">Edit post</h1>');
    expect(editHtml).not.toContain('<h1 class="sr-only">post.modify</h1>');
    expect(editHtml).toContain('<label for="title">Title</label>');
    expect(editHtml).toContain('value="Existing post"');
    expect(editHtml).toContain('class="ybtn ybtn-info"');
    expect(editHtml).toContain('class="send-notification-check"');
    expect(editHtml).toContain('id="notificationMail"');
    expect(editHtml).toContain('name="notificationMail"');
    expect(editHtml).toContain('value="yes"');
    expect(editHtml).toContain("Send notification mail");

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
    expect(onlineCommitHtml).toContain('placeholder="Commit message"');
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
    expect(issueTemplateHtml).toContain("Issue templates do not support attachments.");
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
      showMilestone: true,
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
        list={{
          milestones: [milestone, { ...milestone, id: 8, title: "v2.0" }],
          orderBy: "dueDate",
          orderDir: "desc",
          state: "all",
        }}
        owner="owner"
        projectName="projectYobi"
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(listHtml).toContain('class="page-wrap-outer"');
    expect(listHtml).toContain('class="project-header-outer"');
    expect(listHtml).toContain('class="project-header-inner"');
    expect(listHtml).toContain('class="project-header-wrap"');
    expect(listHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(listHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(listHtml).toContain('class="project-menu-outer"');
    expect(listHtml).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/milestones"><span class="menu-name">Milestone</span>',
    );
    expect(listHtml).toContain('class="project-page-wrap"');
    expect(listHtml).toContain('class="tab-wrap"');
    expect(listHtml).toContain("New milestone");
    expect(listHtml).toContain("Open");
    expect(listHtml).toContain("Closed");
    expect(listHtml).toContain("All");
    expect(listHtml).toContain('class="filter-wrap milestone"');
    expect(listHtml).toContain('href="/yona/owner/projectYobi/issue/labels.css"');
    expect(listHtml).toContain('rel="stylesheet"');
    expect(listHtml).toContain("Due Date");
    expect(listHtml).toContain("Completion Rate");
    expect(listHtml).toContain('placeholder="Search"');
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
    expect(emptyListHtml).toContain("No milestone entered.");

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
    expect(detailHtml).toContain('class="project-header-outer"');
    expect(detailHtml).toContain('class="project-menu-outer"');
    expect(detailHtml).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/milestones"><span class="menu-name">Milestone</span>',
    );
    expect(detailHtml).toContain('href="/yona/owner/projectYobi/issue/labels.css"');
    expect(detailHtml).toContain('rel="stylesheet"');
    expect(detailHtml).toContain('class="milesion-wrap"');
    expect(detailHtml).toContain('class="title"');
    expect(detailHtml).toContain("Due Date");
    expect(detailHtml).toContain('class="attachments"');
    expect(detailHtml).toContain('data-attachments="[]"');
    expect(detailHtml).toContain('class="actrow right-txt row-fluid"');
    expect(detailHtml).toContain("List");
    expect(detailHtml).toContain('href="#deleteConfirm"');
    expect(detailHtml).toContain("Edit");
    expect(detailHtml).toContain("Close milestone");
    expect(detailHtml).toContain('data-request-method="post"');
    expect(detailHtml).toContain('data-request-uri="/yona/owner/projectYobi/milestone/7/close"');
    expect(detailHtml).toContain('id="issues"');
    expect(detailHtml).toContain('placeholder="search at current milestone"');
    expect(detailHtml).toContain('data-toggle="item-search"');
    expect(detailHtml).toContain('id="deleteConfirm"');
    expect(detailHtml).toContain("Delete milestone");
    expect(detailHtml).toContain("Once you delete the post");
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
      showMilestone: true,
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
    expect(createHtml).toContain('class="app-shell milestone-form-page"');
    expect(createHtml).toContain('class="project-header-outer"');
    expect(createHtml).toContain('class="project-header-inner"');
    expect(createHtml).toContain('class="project-header-wrap"');
    expect(createHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(createHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(createHtml).toContain('class="project-menu-outer"');
    expect(createHtml).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/milestones"><span class="menu-name">Milestone</span>',
    );
    expect(createHtml).toContain('<h1 class="sr-only">New milestone</h1>');
    expect(createHtml).not.toContain("title.newMilestone");
    expect(createHtml).toContain('class="page-wrap-outer"');
    expect(createHtml).toContain('class="project-page-wrap"');
    expect(createHtml).toContain('class="content-wrap frm-wrap"');
    expect(createHtml).toContain('id="milestone-form"');
    expect(createHtml).not.toContain('action="/yona/owner/projectYobi/milestones"');
    expect(createHtml).not.toContain('method="post"');
    const milestoneViewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-milestone-views.tsx"),
      "utf8",
    );
    expect(milestoneViewSource).not.toContain("if (!props.onSubmit) {");
    expect(milestoneViewSource).toContain("const submitMilestone = props.onSubmit;");
    expect(milestoneViewSource).toContain("void submitMilestone({");
    expect(createHtml).toContain('class="row-fluid"');
    expect(createHtml).toContain('class="span12"');
    expect(createHtml).toContain('id="title"');
    expect(createHtml).toContain('class="zen-mode text title"');
    expect(createHtml).toContain('maxLength="250"');
    expect(createHtml).toContain('name="title"');
    expect(createHtml).toContain('placeholder="Title"');
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
    expect(createHtml).toContain('aria-label="Enter milestone description"');
    expect(createHtml).not.toContain('aria-label="milestone.form.content"');
    expect(createHtml).toContain('class="actrow right-txt"');
    expect(createHtml).toContain('class="ybtn ybtn-info"');
    expect(createHtml).toContain('class="span3 span-hard-wrap"');
    expect(createHtml).toContain('class="issue-option"');
    expect(createHtml).toContain("Milestone status");
    expect(createHtml).toContain('id="milestone-open"');
    expect(createHtml).toContain('class="radio-btn"');
    expect(createHtml).toContain("Open");
    expect(createHtml).toContain('id="milestone-close"');
    expect(createHtml).toContain("Closed");
    expect(createHtml).toContain("Choose due date");
    expect(createHtml).toContain('aria-label="Choose due date"');
    expect(createHtml).not.toContain('aria-label="milestone.dueDate"');
    expect(createHtml).toContain('id="dueDate"');
    expect(createHtml).toContain('name="dueDate"');
    expect(createHtml).toContain('class="validate due-date"');
    expect(createHtml).toContain('id="datepicker"');
    expect(createHtml).toContain('class="date-picker"');
    expect(createHtml).not.toContain('placeholder="yyyy-MM-dd"');
    expect(createHtml).not.toContain("Yona Rust Project");
    const milestoneViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-milestone-views.tsx"),
      "utf8",
    );
    expect(milestoneViewsSource).toContain("legacyMilestoneValidationMessage");
    expect(milestoneViewsSource).toContain("milestone.error.title");
    expect(milestoneViewsSource).toContain("milestone.error.content");
    expect(milestoneViewsSource).toContain("milestone.error.duedateFormat");

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
    expect(editHtml).not.toContain('action="/yona/owner/projectYobi/milestone/7/edit"');
    expect(editHtml).toContain('<h1 class="sr-only">Edit milestone</h1>');
    expect(editHtml).not.toContain("title.editMilestone");
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
            {
              commits: [],
              createdLabel: "now",
              eventType: "PULL_REQUEST_STATE_CHANGED",
              id: 14,
              newValue: "OPEN",
              oldValue: "CLOSED",
              senderLoginId: "",
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

    expect(html).toContain('class="app-shell pull-request-page"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/owner">owner</a>');
    expect(html).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('<div class="project-page-wrap">');
    expect(html).toContain('<div class="board-header issue">');
    expect(html).toContain('<strong class="board-id">#1</strong>');
    expect(html).toContain(
      '<div class="pull-right"><div id="reviewers" style="display:inline-block;margin-right:5px">',
    );
    expect(html).toContain("&lt;strong&gt;0&lt;/strong&gt; participants");
    expect(html).not.toContain("pullRequest.review.participants 0");
    expect(html).toContain("Approve");
    expect(html).toContain("Merge");
    expect(html).toContain('<div class="author-info left-txt">');
    expect(html).toContain('class="usf-group pull-left"');
    expect(html).toContain('<span class="avatar-wrap smaller">');
    expect(html).toContain(
      '<img alt="Owner User" height="32" src="/yona/avatar/owner.png" width="32"/>',
    );
    expect(html).toContain('<span class="loginid"> <strong>@</strong>owner</span>');
    expect(html).toContain('<div class="pullRequest-branchInfo">');
    expect(html).toContain('class="from" data-original-title="From" data-toggle="tooltip"');
    expect(html).toContain('class="to" data-original-title="To" data-toggle="tooltip"');
    expect(html).toContain('class="branchName"');
    expect(html).toContain('<div class="content markdown-wrap"><p>Ship <strong>PR</strong> with ');
    expect(html).toContain("<code>React</code>");
    expect(html).toContain('<div class="attachments" data-attachments="[]"></div>');
    expect(html).toContain('<div id="state" class="pullRequest-stateInfo">');
    expect(html).toContain('<div class="alert alert-success">');
    expect(html).toContain('<i class="yobicon-check-circle-alt mr5"></i>');
    expect(html).toContain("<span>This pull request can be merged safely.</span>");
    expect(html).toContain('<div class="board-footer board-actrow">');
    expect(html).toContain("Edit");
    expect(html).toContain("Close");
    expect(html).toContain('href="/yona/owner/projectYobi/pullRequest/1/close"');
    expect(html).toContain('data-request-method="post"');
    expect(html).toContain('<hr class="nm"/>');
    expect(html).toContain('href="#helpMessage"');
    expect(html).toContain('id="helpMessage" class="modal hide fade pullreq-info"');
    expect(html).toContain("You can check commits and descriptions on received code.");
    expect(html).toContain('data-issue-state="open"');
    expect(html).toContain(`href="/yona/owner/projectYobi/commit/${commitSha}"`);
    expect(html).toContain("Overview");
    expect(html).toContain("Changes");
    expect(html).toContain('<span class="num-badge">1</span>');
    expect(html).toContain('<ul class="comments" id="comments">');
    expect(html).toContain('<li class="event" id="comment-11">');
    expect(html).toContain('<span class="state closed">Closed</span>');
    expect(html).toContain(
      'class="usf-group" data-placement="top" data-toggle="tooltip" href="/yona/owner" title="owner"',
    );
    expect(html).toContain('<span class="avatar-wrap small">O</span>');
    expect(html).toContain("owner closed this pull request.");
    expect(html).toContain("owner has committed.");
    expect(html).toContain("owner merged commit (");
    expect(html).not.toContain("pullRequest.event.message");
    expect(html).toContain(
      `<a class="link" href="/yona/owner/projectYobi/commit/${commitSha}" title="View commit">be6a8cc</a>`,
    );
    expect(html).toContain('<li class="event" id="comment-14">');
    expect(html).toContain("User.anonymous.name opened this pull request.");
    expect(html).not.toContain("<strong>Anonymous</strong>");
    expect(html).toContain('href="#event-11" title="now"');
    expect(html).toContain('<ul class="commit-list">');
    expect(html).toContain('<li class="comment-body commit-info outdated">');
    expect(html).toContain(
      '<a class="commit-id" href="/yona/owner/projectYobi/pullRequest/1/changes/',
    );
    expect(html).toContain('<a class="commitMsg short"');
    expect(html).toContain(
      '<button class="commitMsg moreBtn" type="button"><span>…</span></button>',
    );
    expect(html).toContain('<pre class="commitMsg desc hidden">full message</pre>');
    expect(html).not.toContain('<pre class="commitMsg desc hidden">Commit SHA markdown');
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

    expect(html).toContain('class="app-shell pull-request-page"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('class="page-wrap-outer"');
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
    expect(html).toContain('action="/yona/owner/projectYobi/pullRequest/1/comments"');
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
    expect(html).toContain(
      '<img alt="" height="32" src="/yona/avatar/current-user.png" width="32"/>',
    );
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
    expect(html).toContain('<span class="outdated-label">Outdated</span>');
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
    expect(html).toContain("All commit changes");
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

    expect(html).toContain("<strong>User.anonymous.name</strong>");
    expect(html).toContain("Anonymous author commit");
    expect(html).not.toContain("<strong>Anonymous</strong>");
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
    expect(html).toContain("<strong>No author </strong>");
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
          showPullRequest: true,
          viewerCanEnroll: false,
          viewerCanUpdate: false,
        }}
        list={{
          acceptedCount: 1,
          category: "open",
          closedCount: 4,
          currentUserId: 7,
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
          items: [
            item,
            {
              ...item,
              contributorLabel: "",
              id: 2,
              pullRequestNumber: 2,
              title: "No contributor display name",
            },
          ],
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

    expect(projectHtml).toContain('<main class="app-shell pull-request-page">');
    expect(projectHtml).toContain('class="project-header-outer"');
    expect(projectHtml).toContain('class="project-header-inner"');
    expect(projectHtml).toContain('class="project-header-wrap"');
    expect(projectHtml).toContain('<a href="/yona/owner">owner</a>');
    expect(projectHtml).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(projectHtml).toContain('class="project-menu-outer"');
    expect(projectHtml).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/pullRequests"><span class="menu-name">Pull request</span>',
    );
    expect(projectHtml).toContain('class="page-wrap-outer"');
    expect(projectHtml).toContain('<div class="project-page-wrap">');
    expect(projectHtml).toContain('<div class="row-fluid cb" pjax-container="">');
    expect(projectHtml).toContain('<div class="left-menu span2 search-wrap hide-in-mobile"');
    expect(projectHtml).toContain(
      '<form id="search" name="search" action="/yona/owner/projectYobi/pullRequests" method="get">',
    );
    expect(projectHtml).toContain('<div class="srch-advanced" id="advanced-search-form">');
    expect(projectHtml).toContain(
      '<select data-format="user" id="contributors" name="contributorId">',
    );
    expect(projectHtml).toContain("Sender");
    expect(projectHtml).toContain('<option value="7">Sent by me</option>');
    expect(projectHtml).toContain(
      '<option data-login-id="owner" data-selected="true" value="7">Owner User</option>',
    );
    expect(projectHtml).toContain('<option data-login-id="reviewer" value="8">Reviewer</option>');
    expect(projectHtml).toContain("<h5>Recently pushed branch</h5>");
    expect(projectHtml).toContain('<div class="alert alert-info">');
    expect(projectHtml).toContain('<i class="yobicon-split"></i>');
    expect(projectHtml).toContain("owner/projectYobi:topic/recent ( 2026-06-05 )");
    expect(projectHtml).toContain(
      'href="/yona/owner/projectYobi/newPullRequestForm?fromBranch=refs%2Fheads%2Ftopic%2Frecent&amp;toBranch=main"',
    );
    expect(projectHtml).toContain(
      'data-request-uri="/yona/owner/projectYobi/pushedBranch/91/delete"',
    );
    expect(projectHtml).toContain("pull request");
    expect(projectHtml).toContain('<div class="tab-content" style="clear:both;padding-top:15px">');
    expect(projectHtml).toContain('<div class="row-fluid tab-pane active" id="list">');
    expect(projectHtml).toContain("Open");
    expect(projectHtml).toContain("Closed");
    expect(projectHtml).toContain("Sent code");
    expect(projectHtml).toContain('<span class="num-badge">31</span>');
    expect(projectHtml).toContain('<span class="num-badge">4</span>');
    expect(projectHtml).toContain('<span class="num-badge">1 / 6</span>');
    expect(projectHtml).not.toContain("Yona Rust Project");
    expect(projectHtml).not.toContain("<h1>Pull Requests</h1>");
    expect(projectHtml).toContain('<ul class="post-list-wrap">');
    expect(projectHtml).toContain(
      '<li class="post-item title" href="/yona/owner/projectYobi/pullRequest/1">',
    );
    expect(projectHtml).toContain('<span class="post-id">1</span>');
    expect(projectHtml).toContain(">No contributor display name</a>");
    expect(projectHtml).toContain(">No author</span>");
    expect(projectHtml).not.toContain('title="No author"');
    expect(projectHtml).not.toContain('href="/yona/issue.noAuthor"');
    expect(projectHtml).toContain('<span class="size total">2</span>');
    expect(projectHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(projectHtml).toContain('<ul class="page-nums">');
    expect(projectHtml).toContain('name="pageNum"');
    expect(projectHtml).toContain('value="2"');
    expect(projectHtml).toContain("Previous page");
    expect(projectHtml).toContain("Next page");
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

    expect(organizationHtml).toContain('<main class="app-shell pull-request-page">');
    expect(organizationHtml).not.toContain(
      '<main class="app-shell pull-request-page page-wrap-outer">',
    );
    expect(organizationHtml).toContain('class="project-header-outer"');
    expect(organizationHtml).toContain('class="project-header-inner"');
    expect(organizationHtml).toContain('class="group-title-head">group</span>');
    expect(organizationHtml).toContain('<a href="/yona/organizations/acme">acme</a>');
    expect(organizationHtml).toContain(
      '<div class="page-wrap-outer"><div class="project-page-wrap">',
    );
    expect(organizationHtml).toContain('<div class="row-fluid cb" pjax-container="">');
    expect(organizationHtml).toContain(
      '<form id="search" name="search" action="/yona/organizations/acme/pullrequests" method="get">',
    );
    expect(organizationHtml).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(organizationHtml).toContain("Open");
    expect(organizationHtml).toContain("Closed");
    expect(organizationHtml).toContain('<span class="num-badge">31</span>');
    expect(organizationHtml).toContain('<span class="num-badge">4</span>');
    expect(organizationHtml).not.toContain("Yona Rust Organization");
    expect(organizationHtml).not.toContain("<h1>Pull Requests</h1>");
    expect(organizationHtml).toContain('class="page-navigation-wrap" id="pagination"');
    expect(organizationHtml).toContain('class="infos-link-item group-project-name"');
    expect(organizationHtml).toContain('<ul class="page-nums">');
    expect(organizationHtml).toContain('name="pageNum"');
    expect(organizationHtml).toContain('value="2"');
    expect(organizationHtml).toContain("Previous page");
    expect(organizationHtml).toContain("Next page");
    expect(organizationHtml).toContain('href="/yona/organizations/acme/pullrequests?filter=read"');
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
          showReview: true,
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
            {
              authorId: 3,
              authorAvatarUrl: "/yona/avatar/ghost.png",
              authorLabel: "",
              authorLoginId: "ghost",
              comments: [
                {
                  authorId: 3,
                  authorLabel: "",
                  authorLoginId: "ghost",
                  canDelete: false,
                  contentsHtml: "",
                  contentsMarkdown: "No author review body",
                  createdLabel: "old",
                  id: 13,
                  threadId: 12,
                  viaEmail: false,
                },
              ],
              commitId: "1234567890ab",
              createdLabel: "old",
              endLine: 3,
              id: 12,
              path: "src/ghost.rs",
              prevCommitId: "",
              pullRequestNumber: undefined,
              startLine: 3,
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

    expect(html).toContain('class="app-shell pull-request-page"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/owner/projectYobi/reviews"><span class="menu-name">Review</span>',
    );
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('<div class="project-page-wrap">');
    expect(html).toContain('<div class="row-fluid issue-list-wrap">');
    expect(html).toContain('<div class="span2 search-wrap span-hard-wrap">');
    expect(html).toContain('<ul class="lst-stacked unstyled">');
    expect(html).toContain("All reviews");
    expect(html).toContain('data-type="participantId" data-value="2"');
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;authorId=2&amp;orderBy=createdDate&amp;orderDir=desc"',
    );
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;participantId=2&amp;orderBy=createdDate&amp;orderDir=desc"',
    );
    expect(html).toContain('form id="search"');
    expect(html).toContain('<div class="pull-right filters">');
    expect(html).toContain('<ul class="nav nav-tabs nm">');
    expect(html).toContain("Open");
    expect(html).toContain('<div class="review-list-wrap">');
    expect(html).toContain('<ul class="post-list-wrap">');
    expect(html).toContain('class="avatar-wrap mlarge hide-in-mobile"');
    expect(html).toContain('<span class="post-id">7</span>');
    expect(html).toContain(
      'href="/yona/owner/projectYobi/pullRequest/1/changes/abcdef123456#thread-7"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/commit/fedcba654321#thread-10"');
    expect(html).toContain("Review list comment");
    expect(html).toContain("Commit discussion body");
    expect(html).toContain("No author review body");
    expect(html).toContain(">No author</span>");
    expect(html).not.toContain('title="No author"');
    expect(html).not.toContain('href="/yona/issue.noAuthor"');
    expect(html).toContain('class="infos-item item-count-groups"');
    expect(html).toContain('class="page-navigation-wrap" id="pagination"');
    expect(html).toContain('<ul class="page-nums">');
    expect(html).toContain('name="pageNum"');
    expect(html).toContain('value="2"');
    expect(html).toContain("Previous page");
    expect(html).toContain("Next page");
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;orderBy=createdDate&amp;orderDir=desc"',
    );
    expect(html).toContain(
      'href="/yona/owner/projectYobi/reviews?state=open&amp;filter=comment&amp;orderBy=createdDate&amp;orderDir=desc&amp;pageNum=3"',
    );
    expect(html).toContain("Download as Excel file");
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
    const organizationPullRequestRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/pullrequests/route.tsx"),
      "utf8",
    );
    const organizationClosedPullRequestRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/organizations/$organizationName/closedPullrequests/route.tsx",
      ),
      "utf8",
    );
    expect(organizationPullRequestRouteSource).not.toContain("Read organization PRs failed.");
    expect(organizationPullRequestRouteSource).toContain("BadRequestPage");
    expect(organizationPullRequestRouteSource).toContain('"bad-request"');
    expect(organizationClosedPullRequestRouteSource).not.toContain("Read organization PRs failed.");
    expect(organizationClosedPullRequestRouteSource).toContain("BadRequestPage");
    expect(organizationClosedPullRequestRouteSource).toContain('"bad-request"');

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
    const newPullRequestFormRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/newPullRequestForm/route.tsx"),
      "utf8",
    );
    const pullRequestDetailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );
    const pullRequestChangesRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
      ),
      "utf8",
    );
    const pullRequestEditFormRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx",
      ),
      "utf8",
    );
    const pullRequestViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-pull-request-views.tsx"),
      "utf8",
    );
    expect(pullRequestListRouteSource).toContain('searchParams.get("contributorId")');
    expect(pullRequestListRouteSource).not.toContain("Read pull requests failed.");
    expect(pullRequestListRouteSource).toContain("BadRequestPage");
    expect(pullRequestListRouteSource).toContain('"bad-request"');
    expect(closedPullRequestListRouteSource).toContain('searchParams.get("contributorId")');
    expect(closedPullRequestListRouteSource).not.toContain("Read pull requests failed.");
    expect(closedPullRequestListRouteSource).toContain("BadRequestPage");
    expect(closedPullRequestListRouteSource).toContain('"bad-request"');
    expect(sentPullRequestListRouteSource).not.toContain("currentSession");
    expect(sentPullRequestListRouteSource).not.toContain("Read pull requests failed.");
    expect(sentPullRequestListRouteSource).toContain("BadRequestPage");
    expect(sentPullRequestListRouteSource).toContain('"bad-request"');
    expect(newPullRequestFormRouteSource).not.toContain("Read pull request form options failed.");
    expect(newPullRequestFormRouteSource).toContain("BadRequestPage");
    expect(newPullRequestFormRouteSource).toContain("pullRequest.error.newPullRequestForm");
    expect(newPullRequestFormRouteSource).not.toContain("Create pull request failed.");
    expect(pullRequestEditFormRouteSource).not.toContain("Read pull request form options failed.");
    expect(pullRequestEditFormRouteSource).toContain("BadRequestPage");
    expect(pullRequestEditFormRouteSource).toContain("pullRequest.error.newPullRequestForm");
    expect(pullRequestEditFormRouteSource).not.toContain("Update pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Read pull request failed.");
    expect(pullRequestDetailRouteSource).toContain("BadRequestPage");
    expect(pullRequestDetailRouteSource).toContain("error.badrequest");
    expect(pullRequestDetailRouteSource).not.toContain(
      "Delete pull request review comment failed.",
    );
    expect(pullRequestDetailRouteSource).not.toContain(
      "Update pull request review comment failed.",
    );
    expect(pullRequestDetailRouteSource).not.toContain("Close pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Reopen pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Merge pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Delete pull request source branch failed.");
    expect(pullRequestDetailRouteSource).not.toContain(
      "Restore pull request source branch failed.",
    );
    expect(pullRequestDetailRouteSource).not.toContain("Review pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Unreview pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Watch pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Unwatch pull request failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Close review thread failed.");
    expect(pullRequestDetailRouteSource).not.toContain("Open review thread failed.");
    expect(pullRequestChangesRouteSource).not.toContain("Read pull request changes failed.");
    expect(pullRequestChangesRouteSource).toContain("BadRequestPage");
    expect(pullRequestChangesRouteSource).toContain("error.badrequest");
    expect(pullRequestChangesRouteSource).not.toContain(
      "Create pull request inline review comment failed.",
    );
    expect(pullRequestChangesRouteSource).not.toContain("Create pull request comment failed.");
    expect(pullRequestChangesRouteSource).not.toContain(
      "Delete pull request review comment failed.",
    );
    expect(pullRequestChangesRouteSource).not.toContain(
      "Update pull request review comment failed.",
    );
    expect(pullRequestChangesRouteSource).not.toContain("Close review thread failed.");
    expect(pullRequestChangesRouteSource).not.toContain("Open review thread failed.");
    const projectReviewsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/reviews/route.tsx"),
      "utf8",
    );
    expect(projectReviewsRouteSource).not.toContain("Read reviews failed.");
    expect(projectReviewsRouteSource).toContain("BadRequestPage");
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
    expect(pullRequestViewsSource).toContain('id="title"');
    expect(pullRequestViewsSource).toContain('id="editor-body-content-body"');
    expect(pullRequestViewsSource).toContain("LegacyMarkdownEditorShell");
    expect(pullRequestViewsSource).toContain('id="__commits"');
    expect(pullRequestViewsSource).toContain('id="mergeResult"');
    expect(pullRequestViewsSource).toContain("title.newPullRequest");
    expect(pullRequestViewsSource).toContain("title.editPullRequest");
    expect(pullRequestViewsSource).toContain("pullRequest.title.required");
    expect(pullRequestViewsSource).toContain("pullRequest.body.required");
    expect(pullRequestViewsSource).toContain("pullRequest.fromBranch.required");
    expect(pullRequestViewsSource).toContain("pullRequest.toBranch.required");
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
    expect(pullRequestViewsSource).toContain("data-request-uri={reviewThreadStateHref");
    expect(pullRequestViewsSource).toContain("review-form");
    expect(pullRequestViewsSource).toContain("board-comment-form");
    expect(pullRequestViewsSource).toContain('id="review-form"');
    expect(pullRequestViewsSource).toContain("submitBlockReview");
    expect(pullRequestViewsSource).toContain("props.onInlineCommentSubmit");
    expect(pullRequestViewsSource).not.toContain("if (!props.onCommentSubmit) {");
    expect(pullRequestViewsSource).not.toContain("if (!props.onThreadCommentSubmit) {");
    expect(pullRequestViewsSource).not.toContain("if (!props.onCommentUpdate) {");
    expect(pullRequestViewsSource).toContain("await props.onCommentSubmit?.(");
    expect(pullRequestViewsSource).toContain("await props.onThreadCommentSubmit?.(");
    expect(pullRequestViewsSource).toContain("await props.onCommentUpdate?.(");
    expect(pullRequestViewsSource).toContain(
      "props.pullRequest && props.runtimeConfig && props.canComment",
    );
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
    expect(pullRequestViewsSource).toContain("PullRequestOverviewTabs");
    expect(pullRequestViewsSource).toContain("PullRequestBranchInfo");
    expect(pullRequestViewsSource).toContain("page-wrap-outer");
    expect(pullRequestViewsSource).toContain("project-page-wrap");
    expect(pullRequestViewsSource).toContain("code-browse-wrap");
    expect(pullRequestViewsSource).not.toContain("Loading&hellip;");
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
    expect(pullRequestViewsSource).toContain(
      "pullRequest.not.acceptable.because.is.not.enough.review.point",
    );
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
    expect(routeSource).not.toContain("Read project members failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("useQuery");
    expect(routeSource).toContain("useMutation");
    expect(routeSource).toContain("apiQueryKeys.project.members");
    expect(routeSource).not.toContain("Add project member failed.");
    expect(routeSource).not.toContain("Update project member role failed.");
    expect(routeSource).not.toContain("Delete project member failed.");
    expect(routeSource).toContain("project.member.ownerMustBeAManager");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectMembersPage");
    expect(viewSource).toContain("<ProjectHeader");
    expect(viewSource).toContain('id="addNewMember"');
    expect(viewSource).not.toContain(
      "action={prefixBasePath(props.runtimeConfig.basePath, memberPath)}",
    );
    expect(viewSource).not.toContain('id="addNewMember"\n              method="post"');
    expect(viewSource).not.toContain("if (!props.onAddMember) {");
    expect(viewSource).toContain("props.onAddMember?.(loginId);");
    expect(viewSource).toContain('className="members project row-fluid"');
    expect(viewSource).toContain('data-action="apply"');
    expect(viewSource).toContain('data-action="delete"');
    expect(viewSource).not.toContain("if (!props.onUpdateMemberRole) {");
    expect(viewSource).toContain("props.onUpdateMemberRole?.(member.userId, roleOption.role);");
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
    expect(routeSource).not.toContain("Read issue labels failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("copyProjectLabels");
    expect(routeSource).toContain("createProjectLabel");
    expect(routeSource).toContain("updateProjectLabel");
    expect(routeSource).toContain("deleteProjectLabel");
    expect(routeSource).toContain("ProjectHeader");
    expect(routeSource).toContain(
      "<ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />",
    );
    expect(routeSource).toContain('<ProjectMenu activeMenu="settings"');
    expect(routeSource).toContain('className="page-wrap-outer"');
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
    expect(routeSource).not.toContain(
      'action={buildProjectHref(props.runtimeConfig, props.owner, props.projectName, "copyLabels")}',
    );
    expect(routeSource).not.toContain(
      'action={buildProjectHref(props.runtimeConfig, props.owner, props.projectName, "issue/labels")}',
    );
    expect(routeSource).not.toMatch(/\n\s+method="post"/);
    expect(routeSource).toContain("label.failedTo");
    expect(routeSource).toContain("label.error.empty");
    expect(routeSource).toContain("label.error.color");
    expect(routeSource).toContain("label.error.duplicated");
    expect(routeSource).toContain("label.error.duplicated.in.category");
    expect(routeSource).toContain("label.confirm.delete");
    expect(routeSource).not.toContain("error.failedTo");
    expect(routeSource).not.toContain("label.failedTo label.add");
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
    expect(routeSource).not.toContain("Read organization admin failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readOrganizationAdmin");
    expect(routeSource).toContain("addOrganizationMember");
    expect(routeSource).toContain("deleteOrganizationMember");
    expect(routeSource).toContain("searchLegacyMemberUsers");
    expect(routeSource).toContain("updateOrganizationMemberRole");
    expect(routeSource).toContain("error.badrequest");
    expect(routeSource).not.toContain("Accept enrollment failed.");
    expect(routeSource).not.toContain("Add member failed.");
    expect(routeSource).not.toContain("Delete member failed.");
    expect(routeSource).not.toContain("Update member failed.");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-organization-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("OrganizationMembersPage");
    expect(viewSource).toContain('id="addNewMember"');
    expect(viewSource).not.toContain("action={memberPath}");
    expect(viewSource).not.toContain('id="addNewMember"\n              method="post"');
    expect(viewSource).not.toContain("if (!props.onAddMember) {");
    expect(viewSource).toContain("props.onAddMember?.(detail.organizationName, loginId);");
    expect(viewSource).toContain("onSearchMemberUsers");
    expect(viewSource).toContain('className="typeahead dropdown-menu"');
    expect(viewSource).not.toContain("dangerouslySetInnerHTML");
    expect(viewSource).toContain('className="members project row-fluid"');
    expect(viewSource).toContain('data-action="apply"');
    expect(viewSource).toContain('data-action="delete"');
    expect(viewSource).not.toContain("if (!props.onUpdateMemberRole) {");
    expect(viewSource).toContain(
      "props.onUpdateMemberRole?.(\n                                detail.organizationName,",
    );
    expect(viewSource).toContain('id="alertDeletion"');
    expect(viewSource).toContain("enrollAcceptBtn");
  });

  it("requires organization create/settings routes to use legacy common fallback shells", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/organizations/new'");
    expect(routeTreeSource).toContain("fullPath: '/organizations/$organizationName/settingform'");

    const newRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/new/route.tsx"),
      "utf8",
    );
    expect(newRouteSource).toContain("createOrganization");
    expect(newRouteSource).toContain("error.badrequest");
    expect(newRouteSource).not.toContain("Create organization failed.");

    const settingsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/organizations/$organizationName/settingform/route.tsx"),
      "utf8",
    );
    expect(settingsRouteSource).not.toContain("PlaceholderPage");
    expect(settingsRouteSource).toContain("BadRequestPage");
    expect(settingsRouteSource).toContain('"bad-request"');
    expect(settingsRouteSource).toContain("readOrganizationContainer");
    expect(settingsRouteSource).toContain("updateOrganization");
    expect(settingsRouteSource).toContain("error.badrequest");
    expect(settingsRouteSource).not.toContain("Update organization failed.");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-organization-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("organization.name.alert");
    expect(viewSource).not.toContain('prefixBasePath(props.basePath ?? "", "/organizations/new")');
    expect(viewSource).not.toContain(
      'action={prefixBasePath(props.basePath ?? "", "/organizations/new")}',
    );
    expect(viewSource).not.toContain("if (!props.onCreateOrganization) {");
    expect(viewSource).not.toContain("if (!props.onUpdateOrganization) {");
    expect(viewSource).toContain("props.onCreateOrganization?.(formState);");
    expect(viewSource).toContain("props.onUpdateOrganization?.(formState);");
    expect(viewSource).toContain("props.onUpdateOrganization?.(nextFormState);");
    expect(viewSource.match(/setValidationMessage\("organization\.name\.alert"\)/g)?.length).toBe(
      2,
    );
    expect(viewSource).toContain("project.logo.alert");
    expect(viewSource).toContain("isOrganizationLogoImageFile");
    expect(viewSource).toContain("isLegacyOrganizationName");
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
    expect(routeSource).not.toContain("Read organization admin failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readOrganizationAdmin");
    expect(routeSource).toContain("deleteOrganization");
    expect(routeSource).toContain("navigateToAppHref");
    expect(routeSource).toContain("organization.delete.error");
    expect(routeSource).not.toContain("Delete organization failed.");

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

  it("requires project settings route to use legacy common fallback shells", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/settingform'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/settingform/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectSettings");
    expect(routeSource).toContain("updateProject");
    expect(routeSource).toContain("error.badrequest");
    expect(routeSource).not.toContain("Update project failed.");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("project.name.alert");
    expect(viewSource).toContain("project.name.reserved.alert");
    expect(viewSource).toContain("project.logo.alert");
    expect(viewSource).toContain('[".", "..", ".git"]');
    expect(viewSource).toContain("/^[0-9A-Za-z-_.가-힣]+$/");
    expect(viewSource).toContain("isProjectLogoImageFile");
  });

  it("requires project delete confirmation route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/deleteform'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/deleteform/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project delete form failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("deleteProjectRest");
    expect(routeSource).toContain("navigateToAppHref");
    expect(routeSource).toContain("project.delete.error");
    expect(routeSource).not.toContain("Delete project failed.");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectDeletePage");
    expect(viewSource).toContain("<ProjectHeader");
    expect(viewSource).toContain('id="subMenuProjectDelete"');
    expect(viewSource).toContain('id="accept"');
    expect(viewSource).toContain('id="btnDelete"');
    expect(viewSource).toContain('id="alertDeletion"');
    expect(viewSource).toContain('id="btnDeleteExec"');
    expect(viewSource).toContain('setValidationMessage("project.delete.alert")');
    expect(viewSource).toContain("const canOpenDeleteModal = accepted");
    expect(viewSource).toContain('href="#alertDeletion"');
    expect(viewSource).not.toContain("disabled={!accepted || props.pending}");
  });

  it("requires project webhooks route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/webhooks'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/webhooks/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project webhooks failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectWebhooksQueryOptions");
    expect(routeSource).toContain("createProjectWebhookRest");
    expect(routeSource).toContain("deleteProjectWebhookRest");
    expect(routeSource).not.toContain("Create project webhook failed.");
    expect(routeSource).not.toContain("Delete project webhook failed.");
    expect(routeSource).toContain('"error.badrequest"');
    expect(routeSource).not.toContain(
      "containerQuery.data && !containerQuery.data.viewerCanUpdate",
    );

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectWebhooksPage");
    expect(viewSource).toContain("webhook-editor-wrap");
    expect(viewSource).toContain('id="formNewWebhook"');
    expect(viewSource).not.toContain("if (!props.onCreateWebhook) {");
    expect(viewSource).toContain("props.onCreateWebhook?.(formState);");
    expect(viewSource).toContain("input-webhook-payload");
    expect(viewSource).toContain("input-webhook-secret");
    expect(viewSource).toContain('id="gitPush"');
    expect(viewSource).toContain('id="webhooksList"');
    expect(viewSource).toContain("data-webhook-id");
    expect(viewSource).not.toContain('id="webhookDeliveryHistory"');
    expect(viewSource).not.toContain("data-webhook-delivery-id");
    expect(viewSource).toContain('data-request-method="delete"');
    expect(viewSource).toContain("project.webhook.payloadUrl.empty");
    expect(viewSource).not.toContain('required\n                      type="url"');

    const serverSource = fs.readFileSync(
      path.resolve(__dirname, "../..", "crates/server/src/routes/projects/webhooks.rs"),
      "utf8",
    );
    expect(serverSource).toContain(
      "require_project_read(repository, &owner_name, &project_name, actor_id)",
    );
    expect(serverSource).toContain(
      "rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id))",
    );
    expect(serverSource).toContain("project.webhook.payloadUrl.empty");
    expect(serverSource).not.toContain("project.webhook.payloadUrl.required");
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
              requestBody: '{"text":"hello"}',
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
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/yona">yona</a>');
    expect(html).toContain('<a href="/yona/yona/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/yona/projectYobi/settingform"><i class="yobicon-cog"></i>',
    );
    expect(html).toContain('class="new-webhook-wrap"');
    expect(html).toContain('id="formNewWebhook"');
    expect(html).not.toContain('action="/yona/yona/projectYobi/webhooks"');
    expect(html).not.toContain('method="post"');
    expect(html).toContain('<strong class="form-legend">Create new webhook</strong>');
    expect(html).toContain('placeholder="Payload URL"');
    expect(html).toContain('type="text"');
    expect(html).toContain('placeholder="Authorization Token"');
    expect(html).toContain("Messenger (Only text)");
    expect(html).toContain("Slack (Meta)");
    expect(html).toContain("Google Chat (Thread)");
    expect(html).toContain("Continuous Integration tool (Only push event)");
    expect(html).toContain("Include git push events");
    expect(html).toContain("Every webhook is sent in POST");
    expect(html).toContain(">Add webhook</button>");
    expect(html).toContain("<strong>Type of message</strong>");
    expect(html).toContain("<strong>Include git push events</strong>");
    expect(html).toContain('<h6 class="mr20 truncate">https://hooks.example.test/yona</h6>');
    expect(html).toContain("<h6>NONE</h6>");
    expect(html).toContain('data-request-uri="/yona/yona/projectYobi/webhooks/7"');
    expect(html).not.toContain('id="webhookDeliveryHistory"');
    expect(html).not.toContain('data-webhook-delivery-id="9"');
    expect(html).not.toContain("project.webhook.type.SIMPLE");
    expect(html).not.toContain(">button.add</button>");
    expect(html).not.toContain("project.webhook.gitPush");
  });

  it("hides the project webhook create form without update permission", () => {
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
      viewerCanUpdate: false,
    };
    const html = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [],
          ownerName: "yona",
          projectName: "projectYobi",
          viewerCanUpdate: false,
          webhookTypes: ["SIMPLE", "JSON"],
          webhooks: [
            {
              gitPush: false,
              id: 7,
              payloadUrl: "https://hooks.example.test/yona",
              secret: "token",
              webhookType: "SIMPLE",
            },
          ],
        }}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).not.toContain('id="formNewWebhook"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).not.toContain("project.webhook.add");
    expect(html).toContain('id="webhooksList"');
    expect(html).toContain('data-webhook-id="7"');
    expect(html).toContain('<h6 class="mr20 truncate">https://hooks.example.test/yona</h6>');
  });

  it("renders the legacy project change VCS anchor and modal shell", () => {
    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/changeVCS/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project change VCS failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectChangeVcsQueryOptions");
    expect(routeSource).toContain("changeProjectVcsRest");
    expect(routeSource).toContain("project.changeVCS.error");
    expect(routeSource).not.toContain("Change project VCS failed.");

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectChangeVcsPage");
    expect(viewSource).toContain('setValidationMessage("project.changeVCS.alert")');
    expect(viewSource).toContain("const canOpenChangeVcsModal = accepted");

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
      <ProjectChangeVcsPage
        changeVcs={{
          currentVcs: "GIT",
          nextVcs: "Subversion",
          ownerName: "yona",
          projectName: "projectYobi",
          viewerCanChange: true,
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/yona">yona</a>');
    expect(html).toContain('<a href="/yona/yona/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/yona/projectYobi/settingform"><i class="yobicon-cog"></i>',
    );
    expect(html).toContain('id="acceptChangeVCS"');
    expect(html).toContain('class="bg-checkbox label-agreement"');
    expect(html).toContain('class="ybtn ybtn-danger"');
    expect(html).toContain('data-toggle="modal"');
    expect(html).toContain('href="#alertChangeVCS"');
    expect(html).toContain('id="btnChangeVCS"');
    expect(html).toContain("Change Repository Type.");
    expect(html).toContain('id="alertChangeVCS"');
    expect(html).toContain("modal hide");
    expect(html).toContain("Do you want to change the repository to Subversion?");
    expect(html).toContain("If the repository is changed, all code and history will be deleted.");
    expect(html).toContain("Are you sure?");
    expect(html).toContain('id="btnChangeVCSExec"');
    expect(html).toContain(">Yes</button>");
    expect(html).toContain(">No</button>");
    expect(html).not.toContain("project.changeVCS.alert");
  });

  it("requires project transfer route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/transfer'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/transfer/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project transfer failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectTransferQueryOptions");
    expect(routeSource).toContain("requestProjectTransferRest");
    expect(routeSource).toContain("project.transfer.error");
    expect(routeSource).not.toContain("Request project transfer failed.");

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
    expect(viewSource).toContain('setValidationMessage("project.transfer.alert")');
    expect(viewSource).toContain("const canOpenTransferModal = accepted");
    expect(viewSource).not.toContain("destination.trim().length > 0 &&");

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
      <ProjectTransferPage
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
        transfer={{
          acceptPath: "/project/transfer/7/key",
          destination: "",
          ownerName: "yona",
          projectName: "projectYobi",
          viewerCanTransfer: true,
        }}
      />,
    );
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/yona">yona</a>');
    expect(html).toContain('<a href="/yona/yona/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/yona/projectYobi/settingform"><i class="yobicon-cog"></i>',
    );
    expect(html).toContain('id="subMenuProjectTransfer"');
    expect(html).toContain('class="bubble-wrap gray wp"');
    expect(html).toContain('<div class="cu-label">new owner or group</div>');
    expect(html).toContain('id="owner"');
    expect(html).toContain('<div class="cu-label">Transfer</div>');
    expect(html).toContain("This transfer will be done when the new owner");
    expect(html).toContain("The URL of the repository of this project will be changed.");
    expect(html).toContain('id="accept"');
    expect(html).toContain('class="bg-checkbox label-agreement"');
    expect(html).toContain('class="box-wrap bottom"');
    expect(html).toContain('href="#alertTransfer"');
    expect(html).toContain('data-toggle="modal"');
    expect(html).toContain('id="btnTransfer"');
    expect(html).toContain("Transfer this project");
    expect(html).toContain('id="alertTransfer"');
    expect(html).toContain("modal hide");
    expect(html).toContain("Do you want to transfer this project?");
    expect(html).toContain("If this project is transferred, the new owner");
    expect(html).toContain("Are you sure?");
    expect(html).toContain('id="btnTransferExec"');
    expect(html).toContain(">Yes</button>");
    expect(html).toContain(">No</button>");
    expect(html).not.toContain("project.transfer.alert");
    expect(html).not.toContain("<h1>project.transfer</h1>");
    const transferModalHtml = html.slice(html.indexOf('id="alertTransfer"'));
    expect(transferModalHtml).not.toContain("button.confirm");
  });

  it("requires project fork route to preserve legacy anchors and mutation wiring", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/newFork'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/newFork/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project fork failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectForkOptionsQueryOptions");
    expect(routeSource).toContain("forkProjectRest");
    expect(routeSource).toContain("fork.failed");
    expect(routeSource).not.toContain("Fork project failed.");
    expect(routeSource).toContain("navigateToAppHref(");
    expect(routeSource).toContain("runtimeConfig.basePath");
    expect(routeSource).not.toContain("window.location.assign(");

    const apiSource = fs.readFileSync(path.resolve(__dirname, "api/org-project.ts"), "utf8");
    expect(apiSource).toContain("ProjectForkOptionsResponse");
    expect(apiSource).toContain('projectPath(ownerName, projectName, "/fork-options")');
    expect(apiSource).toContain('projectPath(input.ownerName, input.projectName, "/fork")');

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectForkPage");
    expect(viewSource).toContain('<ProjectMenu activeMenu="pullRequest"');
    expect(viewSource).toContain("href={`${projectHref}/newFork`}");
    expect(viewSource).not.toContain("action={forkPath}");
    expect(viewSource).not.toContain('className="form-horizontal nm"\n              method="post"');
    expect(viewSource).not.toContain("if (!props.onFork) {");
    expect(viewSource).toContain("void props.onFork?.({");
    expect(viewSource).toContain('className="content-wrap frm-wrap"');
    expect(viewSource).toContain('id="helpMessage"');
    expect(viewSource).toContain('id="project-owner"');
    expect(viewSource).toContain('id="inputName"');
    expect(viewSource).toContain('name="projectScope"');
    expect(viewSource).toContain("label-public");
    expect(viewSource).toContain("label-protected");
    expect(viewSource).toContain("label-private");
    expect(viewSource).toContain("images/fork-pull/fork.jpg");
    expect(viewSource).toContain("fork.help.title");
    expect(viewSource).toContain("fork.help.message.1");
    expect(viewSource).toContain("fork.help.message.2");
    expect(viewSource).toContain("fork.already.exist");
    expect(viewSource).toContain("project.name.alert");
    expect(viewSource).toContain("project.shareOption");
    expect(viewSource).not.toContain("project.fork.help");
    expect(viewSource).not.toContain("project.fork");
    expect(viewSource).not.toContain("project.name.help");
    expect(viewSource).not.toContain("project.scope.");

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
      <ProjectForkPage
        detail={projectDetail}
        forkOptions={{
          canFork: true,
          existingForks: [],
          ownerOptions: [{ organization: false, ownerName: "yona", selected: true }],
          selected: { ownerName: "yona", projectName: "projectYobi", projectScope: "public" },
          source: {
            isForked: false,
            overview: "",
            ownerName: "yona",
            projectName: "projectYobi",
            projectScope: "public",
            vcs: "GIT",
          },
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(html).toContain("<h4>yona / projectYobi Fork</h4>");
    expect(html).toContain('<button class="ybtn ybtn-info" type="submit">');
    expect(html).toContain('<i class="yobicon-fork"></i> Fork');
    expect(html).not.toContain("project.fork");
  });

  it("requires project statistics route to preserve the legacy under-construction shell", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/statistics'");

    const routePath = path.resolve(__dirname, "routes/$owner/$projectName/statistics/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read project statistics failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).toContain("readProjectContainerQueryOptions");
    expect(routeSource).toContain("ProjectStatisticsPage");
    expect(routeSource).toContain("renderShell={false}");
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/statistics`");
    expect(layoutSource).toContain('return { activeMenu: "issue" };');

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("ProjectStatisticsPage");
    expect(viewSource).toContain("Under Construction");
    expect(viewSource).toContain("<ProjectHeader");
    expect(viewSource).toContain('className="page-wrap-outer"');
    expect(viewSource).toContain('className="project-page-wrap"');

    const html = renderToStaticMarkup(
      <ProjectStatisticsPage
        detail={{
          backgroundUrl: "/backgrounds/projectYobi.png",
          enrollmentRequested: false,
          isFavorited: true,
          logoUrl: "/logos/projectYobi.png",
          organizationName: "weblabs",
          overview: "",
          ownerName: "weblabs",
          projectName: "projectYobi",
          projectScope: "protected",
          showIssue: true,
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('class="project-header-avatar"');
    expect(html).toContain('<img alt="" src="/logos/projectYobi.png"/>');
    expect(html).toContain('<a href="/yona/weblabs">weblabs</a>');
    expect(html).toContain('<a href="/yona/weblabs/projectYobi">projectYobi</a>');
    expect(html).toContain(
      '<li class="active"><a href="/yona/weblabs/projectYobi/issues"><span class="menu-name">Issue</span>',
    );
    expect(html).not.toContain("project-title-text");
    expect(html).toContain('<span class="project-protected" title="Group Project">G</span>');
    expect(html).toContain("<h1>Under Construction</h1>");

    const leafHtml = renderToStaticMarkup(
      <ProjectStatisticsPage
        detail={{
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "",
          ownerName: "weblabs",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: false,
          viewerCanUpdate: false,
        }}
        renderShell={false}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );
    expect(leafHtml).not.toContain('class="app-shell"');
    expect(leafHtml).not.toContain('class="page-wrap-outer"');
    expect(leafHtml).not.toContain('class="project-header-outer"');
    expect(leafHtml).not.toContain('class="project-menu-outer"');
    expect(leafHtml).toContain('class="project-page-wrap"');
    expect(leafHtml).toContain("<h1>Under Construction</h1>");
  });

  it("requires the public user profile route to preserve the legacy single-segment shell", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/$user'");

    const routePath = path.resolve(__dirname, "routes/$user/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).not.toContain("Read public user profile failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('"bad-request"');
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
        isGuest: true,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "",
        sinceLabel: "May 16, 2026",
      },
      pullRequestItems: [
        {
          commentCount: 2,
          contributorLabel: "Door",
          contributorLoginId: "door",
          ownerName: "owner",
          projectName: "publicYobi",
          pullRequestNumber: 12,
          receiverLabel: "Mona",
          receiverLoginId: "mona",
          state: "open",
          title: "Public profile PR",
          updatedLabel: "May 18, 2026",
        },
        {
          commentCount: 0,
          contributorLabel: "",
          ownerName: "owner",
          projectName: "publicYobi",
          pullRequestNumber: 13,
          receiverLabel: "",
          state: "closed",
          title: "Public profile no author PR",
          updatedLabel: "May 19, 2026",
        },
      ],
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
    expect(html).toContain('class="guest-user"');
    expect(html).toContain('<span class="left-mark">OUR GUEST</span>');
    expect(html).toContain('id="daysAgoBtn"');
    expect(html).toContain('id="two-column-mode-checkbox"');
    expect(html).toContain('id="two-column-mode"');
    expect(html).toContain('class="show-subtasks-li"');
    expect(html).toContain('id="toggle-show-subtasks"');
    expect(html).toContain("Issue");
    expect(html).toContain("Pull request");
    expect(html).toContain("projects");
    expect(html).not.toContain("menu.issue");
    expect(html).not.toContain("menu.pullRequest");
    expect(html).not.toContain("project.projects");
    expect(html).toContain("Open");
    expect(html).toContain("Closed");
    expect(html).toContain("recently No issue found");
    expect(html).toContain("Public profile PR");
    expect(html).toContain('class="avatar-wrap mlarge"');
    expect(html).toContain('alt="owner / publicYobi"');
    expect(html).toContain(
      'class="infos-item infos-link-item" data-placement="top" data-toggle="tooltip" title="Door" href="/yona/door"',
    );
    expect(html).toContain('<span class="infos-item" title="May 18, 2026">May 18, 2026</span>');
    expect(html).toContain('data-original-title="Mona"');
    expect(html).toContain('href="/yona/mona"');
    expect(html).toContain("Public profile no author PR");
    expect(html).toContain(">No author</span>");
    expect(html).not.toContain('title="No author"');
    expect(html).not.toContain("No pull requests found");
    expect(html).toContain('href="/yona/owner/publicYobi"');
    expect(html).toContain("Visible member project");
    expect(html).toContain('<span title="May 16, 2026">May 16, 2026</span>');
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

    expect(emptyProjectsHtml).toContain(">Project is non existent<");
    expect(emptyProjectsHtml).not.toContain("No projects found.");

    const anonymousFallbackHtml = renderPublicUserProfile({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "",
        primaryEmailAddress: "",
        sinceLabel: "",
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

    expect(anonymousFallbackHtml).toContain("<h3>User.anonymous.name</h3>");
    expect(anonymousFallbackHtml).toContain('<span class="name">User.anonymous.name</span>');
    expect(anonymousFallbackHtml).not.toContain("Unknown user");
    for (const routePath of [
      "routes/$user/route.tsx",
      "routes/-workspace-views.tsx",
      "routes/-workspace-settings-view.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).toContain('userLabel: "User.anonymous.name"');
      expect(source).not.toContain('userLabel: "Anonymous"');
    }

    const issueHtml = renderPublicUserProfile({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [
        {
          assigneeLabel: "Door",
          assigneeLoginId: "door",
          authorLabel: "Door",
          authorLoginId: "door",
          commentCount: 2,
          issueNumber: 5,
          ownerName: "owner",
          projectName: "publicYobi",
          state: "open",
          title: "Public issue",
          updatedLabel: "May 17, 2026",
        },
        {
          assigneeLabel: "",
          authorLabel: "",
          commentCount: 0,
          issueNumber: 6,
          ownerName: "owner",
          projectName: "publicYobi",
          state: "open",
          title: "Public no author",
          updatedLabel: "May 18, 2026",
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
    expect(issueHtml).toContain(
      'class="infos-item infos-link-item author-cell" data-placement="bottom" data-toggle="tooltip" href="/yona/door" title="Door"',
    );
    expect(issueHtml).toContain(">Public no author<");
    expect(issueHtml).toContain(">No author</span>");
    expect(issueHtml).not.toContain('title="No author"');
    expect(issueHtml).not.toContain("Open Issues");
    expect(issueHtml).not.toContain("Closed Issues");
  });

  it("keeps the public home legacy intro and feature grid stable", () => {
    const legacyMessages = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/conf/messages"),
      "utf8",
    );
    const html = renderHome();

    expect(legacyMessages).toContain("button.signup = Sign up for {0}");
    expect(html).toContain('class="siteintro-bg row"');
    expect(html).toContain('class="siteintro"');
    expect(html).toContain('class="siteintro-cover"');
    expect(html).toContain('class="siteintro-wrap"');
    expect(html).toContain('class="site-heading"');
    expect(html).toContain("21st Century Software Development Platform");
    expect(html).toContain("Just focus on what you have to do");
    expect(html).toContain('class="signup-btn"');
    expect(html).toContain('class="ybtn ybtn-success ybtn-padding"');
    expect(html).toContain(">Sign up for Yona</a>");
    expect(html).not.toContain(">button.signup</a>");
    const signupRequestedHtml = renderHome(testRuntimeConfig, "user.signup.requested");
    expect(signupRequestedHtml).toContain('data-toggle="yobi-notify"');
    expect(signupRequestedHtml).toContain("Sign-up request has been sent.");
    expect(html).toContain('class="feature-wrap row"');
    expectOrderedText(html, [
      "Project / Organization",
      "Code management",
      "Issue tracker",
      "Private repositories",
      "Code review",
      "Team play",
    ]);
    expect(html).not.toContain("Yona Rust Frontend");
    expect(html).not.toContain("Legacy Route Foundation");
  });

  it("renders the public home signup CTA with the configured site name", () => {
    const html = renderHome({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      siteName: "Legacy Yona",
    });

    expect(html).toContain(">Sign up for Legacy Yona</a>");
    expect(html).not.toContain(">button.signup</a>");
  });

  it("pins project directory empty state and search CTA", () => {
    const html = renderProjectDirectory({ items: [] }, "/projects?pageNum=1");

    expect(html).toContain(">PUBLIC Project list<");
    expect(html).toContain(">Group List<");
    expect(html).toContain('action="/yona/projects"');
    expect(html).toContain('placeholder="Search by keyword"');
    expect(html).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(html).toContain('class="ico ico-err1"');
    expect(html).toContain(">Project is non existent<");
    expect(html).not.toContain(">Search<");
    expect(html).not.toContain("No public projects found.");
  });

  it("keeps the legacy project directory pageNum slice with pagination controls", () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      createdLabel: `2026-06-${String(index + 1).padStart(2, "0")}`,
      lastPushedLabel: index === 10 ? "2026-06-30" : "",
      logoUrl: "",
      memberCount: index + 1,
      ownerName: "owner",
      overview: `Project ${index + 1} overview`,
      projectName: `project-${index + 1}`,
      projectScope: "public",
      watchCount: index + 2,
    }));
    const html = renderProjectDirectory({ items }, "/projects?pageNum=2");

    expect(html).not.toContain('href="/yona/owner/project-1"');
    expect(html).toContain('href="/yona/owner/project-11"');
    expect(html).toContain('class="owner-avatar-wrap"');
    expect(html).toContain('class="owner-name-small" href="/yona/owner"');
    expect(html).toContain('title="2026-06-11">2026-06-11</strong>');
    expect(html).toContain("Latest code update");
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>11</strong>");
    expect(html).toContain('class="yobicon-eye yobicon-middle"');
    expect(html).toContain("<strong>12</strong>");
    expect(html).not.toContain('<p class="name-tag">by owner</p>');
    expect(html).not.toContain('class="project-avatar"');
    expect(html).toContain('class="page-navigation-wrap" id="pagination"');
    expect(html).toContain('href="/yona/projects?pageNum=1"');
    expect(html).toContain('class="ico btn-pg-prev"');
    expect(html).toContain('name="pageNum"');
    expect(html).toContain('max="2"');
    expect(html).toContain('value="2"');
    expect(html).toContain('<li class="page-num delimiter">/</li>');
    expect(html).toContain('<li class="page-num">2</li>');
    expect(html).toContain('<span class="off">Next page</span>');
    expect(html).toContain('class="ico btn-pg-next off"');
    expect(html).not.toContain('class="nav-pill active"');
  });

  it("keeps private project directory rows on the legacy lock scalar", () => {
    const html = renderProjectDirectory(
      {
        items: [
          {
            createdLabel: "2026-06-01",
            lastPushedLabel: "",
            logoUrl: "/yona/files/secret.png",
            memberCount: 1,
            ownerName: "owner",
            overview: "Secret project",
            projectName: "secret",
            projectScope: "private",
            watchCount: 0,
          },
        ],
      },
      "/projects?pageNum=1",
    );

    expect(html).toContain('href="/yona/owner/secret"');
    expect(html).toContain('class="yobicon-lock yobicon-small"');
    expect(html).not.toContain('class="project-protected" title="Group Project">G</span>');
    expect(html).not.toContain('class="stats-wrap pull-right"');
  });

  it("pins organization directory empty state and search CTA", () => {
    const html = renderOrganizationDirectory({ items: [] }, "/orgs?pageNum=1");

    expect(html).toContain(">PUBLIC Project list<");
    expect(html).toContain(">Group List<");
    expect(html).toContain('action="/yona/orgs"');
    expect(html).toContain('placeholder="Find organization by name"');
    expect(html).toContain(
      '<button class="search-btn" type="submit"><i class="yobicon-search"></i></button>',
    );
    expect(html).toContain('class="ico ico-err1"');
    expect(html).toContain(">You do not belong to any group<");
    expect(html).not.toContain(">Search<");
    expect(html).not.toContain("No organizations found.");
  });

  it("keeps organization directory rows on the legacy list.scala.html avatar shell", () => {
    const html = renderOrganizationDirectory(
      {
        items: [
          {
            createdLabel: "2026-06-01",
            description: "Web labs",
            logoUrl: "/yona/files/2",
            organizationName: "weblabs",
          },
        ],
      },
      "/orgs?pageNum=1",
    );

    expect(html).toContain('class="owner-avatar-wrap"');
    expect(html).toContain(
      '<a href="/yona/organizations/weblabs"><img alt="weblabs" src="/yona/files/2"/></a>',
    );
    expect(html).toContain('class="black" href="/yona/organizations/weblabs"');
    expect(html).toContain(">Web labs<");
    expect(html).toContain('<p class="name-tag">created');
    expect(html).toContain('title="2026-06-01">2026-06-01</strong>');
    expect(html).not.toContain('class="project-avatar"');
    expect(html).not.toContain('<img alt="" src="/yona/files/2"/>');
  });

  it("keeps the legacy organization directory pageNum slice with pagination controls", () => {
    const items = Array.from({ length: 31 }, (_, index) => ({
      createdLabel: `2026-06-${String(index + 1).padStart(2, "0")}`,
      description: `Organization ${index + 1}`,
      logoUrl: "",
      organizationName: `org-${index + 1}`,
    }));
    const html = renderOrganizationDirectory({ items }, "/orgs?pageNum=2&filter=org");

    expect(html).not.toContain('href="/yona/organizations/org-1"');
    expect(html).toContain('href="/yona/organizations/org-31"');
    expect(html).toContain('title="2026-06-31">2026-06-31</strong>');
    expect(html).toContain('class="page-navigation-wrap" id="pagination"');
    expect(html).toContain('href="/yona/orgs?pageNum=1&amp;filter=org"');
    expect(html).toContain('name="pageNum"');
    expect(html).toContain('max="2"');
    expect(html).toContain('value="2"');
    expect(html).toContain('<span class="off">Next page</span>');
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
    expect(html).toContain('placeholder="Type name"');
    expect(html).toContain('class="all-projects organization-project-list"');
    expect(html).toContain('class="project"');
    expect(html).toContain('data-item="project-item"');
    expect(html).toContain('data-value="projectYobi Project overview"');
    expect(html).toContain('class="info-wrap"');
    expect(html).toContain('class="owner-avatar-wrap hide-in-mobile"');
    expect(html).toContain('class="origin-title" href="/yona/upstream/origin"');
    expect(html).toContain('class="project-protected" title="Group Project"');
    expect(html).toContain('class="name-tag"');
    expect(html).toContain('<strong title="2026-06-05">2026-06-05</strong>');
    expect(html).toContain('<strong title="2026-06-06">2026-06-06</strong>');
    expect(html).toContain('class="stats-wrap pull-right"');
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>3</strong>");
    expect(html).toContain('class="yobicon-eye"');
    expect(html).toContain("<strong>7</strong>");
    expect(html).not.toContain("project.onmember 3");
    expect(html).not.toContain("project.onwatching 7");
    expect(html).toContain('class="yobicon-lightbulb ramp-on"');
    expect(html).toContain('class="bubble-wrap gray project-home organization-home"');
    expect(html).toContain("Group Manager");
    expect(html).toContain("Group Member");
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

  it("renders common error pages with legacy message keys and home buttons", () => {
    const sharedSource = fs.readFileSync(path.resolve(__dirname, "routes/-shared.tsx"), "utf8");
    const rootRouteSource = fs.readFileSync(path.resolve(__dirname, "routes/__root.tsx"), "utf8");
    const appRuntimeSource = fs.readFileSync(
      path.resolve(__dirname, "app-runtime-context.tsx"),
      "utf8",
    );
    const badRequestHtml = renderToStaticMarkup(<BadRequestPage href="/yona/" />);
    const forbiddenHtml = renderToStaticMarkup(<ForbiddenPage href="/yona/" />);
    const notFoundHtml = renderToStaticMarkup(<NotFoundPage href="/yona/missing" />);

    expect(sharedSource).not.toContain("export function PlaceholderPage");
    expect(sharedSource).not.toContain("Redirecting…");
    expect(rootRouteSource).toContain("button.close");
    expect(rootRouteSource).not.toContain(">Dismiss<");
    expect(appRuntimeSource).toContain("error.internalServerError");
    expect(appRuntimeSource).not.toContain("Auth bootstrap failed.");
    expect(badRequestHtml).toContain('class="error-wrap"');
    expect(badRequestHtml).toContain('class="ico-404"');
    expect(badRequestHtml).toContain(">The request cannot be fulfilled due to bad syntax</p>");
    expect(badRequestHtml).toContain('class="ybtn ybtn-info" href="/yona/"');
    expect(badRequestHtml).toContain(">Home</a>");
    expect(badRequestHtml).not.toContain(">error.badrequest</p>");
    expect(badRequestHtml).not.toContain(">menu.home</a>");

    expect(forbiddenHtml).toContain('class="ico ico-err2"');
    expect(forbiddenHtml).toContain(">You are not authorized</p>");
    expect(forbiddenHtml).toContain('class="ybtn ybtn-primary" href="/yona/"');
    expect(forbiddenHtml).toContain(">Home</a>");
    expect(forbiddenHtml).not.toContain(">error.forbidden</p>");

    expect(notFoundHtml).toContain('class="ico ico-err2"');
    expect(notFoundHtml).toContain(">Page not found</p>");
    expect(notFoundHtml).toContain('class="ybtn ybtn-info" href="/yona/missing"');
    expect(notFoundHtml).toContain(">Home</a>");
    expect(notFoundHtml).not.toContain(">error.notfound</p>");
    expect(notFoundHtml).not.toContain('class="lede"');
  });
});
