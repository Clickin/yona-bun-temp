import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderHome,
  renderOrganizationDirectory,
  renderProjectDirectory,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";

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

    expect(fs.existsSync(notificationRoutePath)).toBe(true);
    const notificationRouteSource = fs.readFileSync(notificationRoutePath, "utf8");
    expect(notificationRouteSource).not.toContain("PlaceholderPage");
    expect(notificationRouteSource).toContain("useQuery");
    expect(notificationRouteSource).toContain("listNotificationsQueryOptions");
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
