import { describe, expect, it } from "vitest";
import {
  renderLogin,
  renderLostPassword,
  renderRegister,
  renderResetPassword,
  renderWorkspace,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";

describe("wave 1 auth and workspace parity", () => {
  it("renders legacy auth links and password-reset request fields", () => {
    const loginHtml = renderLogin({ routeHref: "/users/loginform" });
    expect(loginHtml).toContain('action="/yona/users/login"');
    expect(loginHtml).toContain('href="/yona/lostPassword"');

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });
    expect(registerHtml).toContain('action="/yona/users/signup"');
    expect(registerHtml).toContain('href="/yona/users/loginform"');

    const lostPasswordHtml = renderLostPassword("/lostPassword");
    expect(lostPasswordHtml).toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain(">Confirm<");

    const resetPasswordHtml = renderResetPassword("/resetPassword");
    expect(resetPasswordHtml).toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain('name="hashString"');
    expect(resetPasswordHtml).toContain(">Confirm<");
  });

  it("renders password-reset and email-validation status messaging from query params", () => {
    const lostPasswordHtml = renderLostPassword("/lostPassword?requested=1");
    expect(lostPasswordHtml).toContain("Password reset request was accepted.");

    const loginHtml = renderLogin({ routeHref: "/users/loginform?password=reset" });
    expect(loginHtml).toContain("Login with your new password.");

    const emailHtml = renderWorkspaceSettings(
      "emails",
      "/user/editform/emails?validation=sent",
      {
        defaultLandingPath: "/me",
        emails: [{ emailAddress: "pending@example.com", id: "3", valid: false }],
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
      },
    );
    expect(emailHtml).toContain("Validation request was accepted.");
    expect(emailHtml).toContain('action="/yona/user/email/sendValidationEmail/3"');

    const invalidConfirmHtml = renderWorkspaceSettings(
      "emails",
      "/user/editform/emails?confirmed=invalid&validation=error",
      {
        defaultLandingPath: "/me",
        emails: [{ emailAddress: "pending@example.com", id: "3", valid: false }],
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
      },
    );
    expect(invalidConfirmHtml).toContain("Validation request failed.");
    expect(invalidConfirmHtml).toContain("Invalid email confirmation link.");
  });

  it("renders capability-driven auth help messaging", () => {
    const socialLoginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
      routeHref: "/users/loginform",
    });

    expect(socialLoginHtml).toContain("Social login only");
    expect(socialLoginHtml).not.toContain('name="loginIdOrEmail"');
    expect(socialLoginHtml).not.toContain('name="password"');
  });

  it("renders the legacy /me user card and dashboard streams", () => {
    const html = renderWorkspace({
      defaultLandingPath: "/me",
      daysAgo: 14,
      favoriteProjects: [],
      issueItems: [
        {
          assigneeLabel: "Door",
          authorLabel: "Door",
          commentCount: 3,
          issueNumber: 7,
          ownerName: "admin",
          projectName: "projectYobi",
          state: "open",
          title: "Fix login redirect",
          updatedLabel: "2026-04-09",
        },
        {
          assigneeLabel: "",
          authorLabel: "Door",
          commentCount: 0,
          issueNumber: 3,
          ownerName: "admin",
          projectName: "projectYobi",
          state: "closed",
          title: "Close the stale issue",
          updatedLabel: "2026-04-08",
        },
      ],
      memberProjects: [
        {
          createdLabel: "2026-04-01",
          lastPushedLabel: "2026-04-10",
          memberCount: 4,
          ownerName: "admin",
          overview: "Yona project",
          projectName: "projectYobi",
          projectScope: "public",
          watchCount: 2,
        },
      ],
      profile: {
        connectedSocialProviders: ["github", "google"],
        displayName: "Door",
        englishName: "Door English",
        isBlocked: false,
        isSiteAdmin: true,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "Apr 11, 2026",
      },
      pullRequestItems: [
        {
          commentCount: 2,
          contributorLabel: "Door",
          ownerName: "admin",
          projectName: "projectYobi",
          pullRequestNumber: 4,
          receiverLabel: "Admin",
          state: "open",
          title: "Review queue",
          updatedLabel: "2026-04-10",
        },
      ],
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

    expect(html).toContain("whoami-wrap");
    expect(html).toContain("Door English");
    expect(html).toContain("@door");
    expect(html).toContain("SITE ADMIN");
    expect(html).toContain("Connected social login");
    expect(html).toContain('class="github"');
    expect(html).toContain('class="google"');
    expect(html).toContain("Apr 11, 2026");
    expect(html).toContain("Issues <span");
    expect(html).toContain("Pull Requests <span");
    expect(html).toContain("Projects <span");
    expect(html).toContain('data-toggle="tab"');
    expect(html).toContain("Fix login redirect");
    expect(html).toContain("Closed Issues <span");
    expect(html).toContain("Author: Door");
    expect(html).toContain("Assignee: Door");
    expect(html).toContain("Comments: 3");
    expect(html).toContain("Updated 2026-04-09");
    expect(html).toContain("State: open");
    expect(html).toContain('href="/yona/admin/projectYobi/issue/7"');
    expect(html).toContain('href="/yona/admin/projectYobi/pullRequest/4"');
    expect(html).toContain('href="/yona/admin/projectYobi"');
    expect(html).toContain("Contributor: Door");
    expect(html).toContain("Reviewer: Admin");
    expect(html).toContain("Comments: 2");
    expect(html).toContain("State: public");
    expect(html).toContain("Members: 4");
    expect(html).toContain("Watchers: 2");
  });

  it("renders legacy empty states for the /me dashboard streams", () => {
    const html = renderWorkspace({
      daysAgo: 14,
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [],
      profile: {
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
      },
      pullRequestItems: [],
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

    expect(html).toContain("No issues found in the last 14 days.");
    expect(html).toContain("Pull Requests <span");
    expect(html).toContain("Projects <span");
  });

  it("renders workspace settings deep links with section-specific bodies", () => {
    const profileHtml = renderWorkspaceSettings(
      "profile",
      "/user/editform",
      {
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
      },
    );
    expect(profileHtml).toContain("Account Settings");
    expect(profileHtml).toContain('action="/yona/user/edit"');
    expect(profileHtml).toContain('name="loginId"');
    expect(profileHtml).toContain('name="name"');
    expect(profileHtml).toContain('name="email"');
    expect(profileHtml).toContain('action="/yona/user/resetVisitedList"');
    expect(profileHtml).toContain("Reset visited project list");

    const notificationsHtml = renderWorkspaceSettings(
      "notifications",
      "/user/editform/notifications",
      {
        apiToken: "door-token",
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        recentProjects: [],
        watchedProjects: [
          {
            notifications: [
              { enabled: true, eventType: "NEW_ISSUE", label: "New issue" },
              { enabled: false, eventType: "NEW_COMMENT", label: "New comment" },
            ],
            ownerName: "admin",
            projectId: "1",
            projectName: "projectYobi",
          },
        ],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      },
    );
    expect(notificationsHtml).toContain("Notifications");
    expect(notificationsHtml).toContain("Watched Projects");
    expect(notificationsHtml).toContain("admin / projectYobi");
    expect(notificationsHtml).toContain('data-href="/yona/noti/toggle/1/NEW_ISSUE"');
    expect(notificationsHtml).toContain("New issue");
    expect(notificationsHtml).toContain("New comment");

    const emailsHtml = renderWorkspaceSettings(
      "emails",
      "/user/editform/emails",
      {
        apiToken: "door-token",
        defaultLandingPath: "/me",
        emails: [
          { emailAddress: "alt@example.com", id: "2", valid: true },
          { emailAddress: "pending@example.com", id: "3", valid: false },
        ],
        favoriteProjects: [],
        recentProjects: [],
        watchedProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      },
    );
    expect(emailsHtml).toContain('action="/yona/user/email"');
    expect(emailsHtml).toContain('name="email"');
    expect(emailsHtml).toContain(">Add<");
    expect(emailsHtml).toContain("Main Email");
    expect(emailsHtml).toContain("door@example.com");
    expect(emailsHtml).toContain("alt@example.com");
    expect(emailsHtml).toContain('data-request-uri="/yona/user/email/delete/2"');
    expect(emailsHtml).toContain("Set as main");
    expect(emailsHtml).toContain("pending@example.com");
    expect(emailsHtml).toContain("Validation required");

    const tokenHtml = renderWorkspaceSettings(
      "token",
      "/user/editform/token",
      {
        apiToken: "door-token",
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        recentProjects: [],
        watchedProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      },
    );
    expect(tokenHtml).toContain('action="/yona/user/editform/token_reset"');
    expect(tokenHtml).toContain('name="name"');
    expect(tokenHtml).toContain('value="door-token"');
    expect(tokenHtml).toContain(">Recreate Token<");
  });
});
