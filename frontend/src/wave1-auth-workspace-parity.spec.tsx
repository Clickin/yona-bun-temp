import { describe, expect, it } from "vitest";
import {
  renderLogin,
  renderLostPassword,
  renderPublicUserProfile,
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
    expect(loginHtml).toContain('Log in to <span class="highlight">Yona</span>');
    expect(loginHtml).not.toContain(">title.loginFor<");
    expect(loginHtml).toContain('placeholder="Login ID or E-mail"');
    expect(loginHtml).toContain('placeholder="Password"');
    expect(loginHtml).toContain(">Log in<");
    expect(loginHtml).toContain(">Password forgotten?<");
    expect(loginHtml).not.toContain('placeholder="user.login.key"');
    expect(loginHtml).not.toContain(">title.forgotpassword<");
    expect(loginHtml).not.toContain(">title.resetPassword<");

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });
    expect(registerHtml).not.toContain('action="/yona/users/signup"');
    expect(registerHtml).toContain('href="/yona/users/loginform"');
    expect(registerHtml).toContain('Sign up for <span class="highlight">Yona</span>');
    expect(registerHtml).not.toContain(">title.signupFor<");
    expect(registerHtml).toContain('name="email"');
    expect(registerHtml).toContain(">Sign up<");
    expect(registerHtml).not.toContain('name="emailAddress"');
    expect(registerHtml).not.toContain(">button.signup<");
    expect(registerHtml).toContain(">Log in<");
    expect(registerHtml).not.toContain(">user.signupBtn<");

    const lostPasswordHtml = renderLostPassword("/lostPassword");
    expect(lostPasswordHtml).toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain('Reset password for <span class="highlight">Yona</span>');
    expect(lostPasswordHtml).not.toContain(">title.resetPasswordFor<");
    expect(lostPasswordHtml).toContain(">Confirm<");
    expect(lostPasswordHtml).not.toContain(">button.confirm<");

    const resetPasswordHtml = renderResetPassword("/resetPassword");
    expect(resetPasswordHtml).toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain('name="hashString"');
    expect(resetPasswordHtml).toContain('Reset password for <span class="highlight">Yona</span>');
    expect(resetPasswordHtml).not.toContain(">title.resetPasswordFor<");
    expect(resetPasswordHtml).toContain(">Confirm<");
    expect(resetPasswordHtml).not.toContain(">button.confirm<");
  });

  it("renders legacy auth page titles with the configured site name", () => {
    const runtimeConfig = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      siteName: "Legacy Yona",
    };

    expect(renderLogin({ routeHref: "/users/loginform" }, runtimeConfig)).toContain(
      'Log in to <span class="highlight">Legacy Yona</span>',
    );
    expect(
      renderRegister(
        {
          authUiCapabilities: {
            emailVerificationEnabled: false,
            signupRequireConfirm: false,
            socialLoginOnly: false,
          },
        },
        runtimeConfig,
      ),
    ).toContain('Sign up for <span class="highlight">Legacy Yona</span>');
    expect(renderLostPassword("/lostPassword", runtimeConfig)).toContain(
      'Reset password for <span class="highlight">Legacy Yona</span>',
    );
    expect(renderResetPassword("/resetPassword", runtimeConfig)).toContain(
      'Reset password for <span class="highlight">Legacy Yona</span>',
    );
  });

  it("renders password-reset query messages without temporary email-validation page copy", () => {
    const lostPasswordHtml = renderLostPassword("/lostPassword?requested=1");
    expect(lostPasswordHtml).toContain('class="alert alert-success"');
    expect(lostPasswordHtml).toContain("<h4>Mail has been sent.</h4>");
    expect(lostPasswordHtml).not.toContain("Password reset request was accepted.");

    const invalidLostPasswordHtml = renderLostPassword("/lostPassword?error=invalid");
    expect(invalidLostPasswordHtml).toContain('class="alert alert-error"');
    expect(invalidLostPasswordHtml).toContain("<h4>Failed to send mail.</h4>");
    expect(invalidLostPasswordHtml).toContain("Invalid password reset request");
    expect(invalidLostPasswordHtml).not.toContain("Invalid login ID or email address.");

    const invalidResetPasswordHtml = renderResetPassword("/resetPassword?error=invalid");
    expect(invalidResetPasswordHtml).toContain("Wrong url to reset password.");
    expect(invalidResetPasswordHtml).not.toContain("Invalid password reset link.");

    const loginHtml = renderLogin({ routeHref: "/users/loginform?password=reset" });
    expect(loginHtml).toContain("Please log in with the new password!");
    expect(loginHtml).not.toContain("user.loginWithNewPassword");

    const emailHtml = renderWorkspaceSettings("emails", "/user/editform/emails?validation=sent", {
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
    });
    expect(emailHtml).toContain('data-request-uri="/yona/user/email/sendValidationEmail/3"');
    expect(emailHtml).not.toContain("Validation request was accepted.");

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
    expect(invalidConfirmHtml).toContain("Send a validation email.");
    expect(invalidConfirmHtml).not.toContain("Validation request failed.");
    expect(invalidConfirmHtml).not.toContain("Invalid email confirmation link.");
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

    expect(socialLoginHtml).toContain("Only allow sign-in via social login");
    expect(socialLoginHtml).toContain('class="btns-row nm"');
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
          logoUrl: "/yona/files/101",
          memberCount: 4,
          originOwnerName: "naver",
          originProjectName: "legacyYobi",
          ownerName: "admin",
          overview: "Yona project",
          projectName: "projectYobi",
          projectScope: "public",
          watchCount: 2,
        },
      ],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: ["github", "google"],
        displayName: "Door",
        englishName: "Door English",
        isBlocked: false,
        isGuest: true,
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
    expect(html).toContain('class="user-info-box"');
    expect(html).toContain('class="whoami usf-group"');
    expect(html).not.toContain("user-info-box runtime-grid");
    expect(html).not.toContain('class="lede"');
    expect(html).toContain('class="guest-user"');
    expect(html).toContain('<span class="left-mark">OUR GUEST</span>');
    expect(html).toContain("Door English");
    expect(html).toContain("@door");
    expect(html).toContain("SITE ADMIN");
    expect(html).toContain("Edit profile");
    expect(html).toContain("Member since");
    expect(html).toContain("Connected Social Login");
    expect(html).toContain("recently");
    expect(html).toContain("days ago");
    expect(html).toContain('id="two-column-mode"');
    expect(html).toContain('class="two-column-mode-text">Column View</span>');
    expect(html).toContain('class="show-subtasks-li"');
    expect(html).toContain('id="toggle-show-subtasks"');
    expect(html).toContain('class="show-subtasks-text">Show subtask</span>');
    expect(html).not.toContain('id="show-subtasks"');
    expect(html).not.toContain("userinfo.editProfile");
    expect(html).not.toContain(">Since</strong>");
    expect(html).not.toContain("user.connected.social.login");
    expect(html).not.toContain("Connected social login");
    expect(html).toContain('class="github"');
    expect(html).toContain('class="google"');
    expect(html).toContain(
      'src="/yona/assets/images/provider-logo/btn_google_light_normal_ios.svg"',
    );
    expect(html).not.toContain('viewBox="0 0 24 24"');
    expect(html).toContain("Apr 11, 2026");
    expect(html).toContain("Issue <span");
    expect(html).toContain("Pull request <span");
    expect(html).toContain("projects <span");
    expect(html).not.toContain("Issues <span");
    expect(html).not.toContain("Pull Requests <span");
    expect(html).not.toContain("Projects <span");
    expect(html).toContain('data-toggle="tab"');
    expect(html).toContain("Fix login redirect");
    expect(html).toContain("Closed <span");
    expect(html).toContain("project-name-in-my-issues");
    expect(html).toContain("fixed-height-my-issues-list");
    expect(html).toContain("author-cell");
    expect(html).toContain("item-count-groups");
    expect(html).toContain('href="/yona/admin/projectYobi/issue/7#comments"');
    expect(html).toContain("for-subtask-progressbar");
    expect(html).toContain("meta-cell");
    expect(html).not.toContain("Author: Door");
    expect(html).not.toContain("Assignee: Door");
    expect(html).not.toContain("Comments: 3");
    expect(html).not.toContain("Updated 2026-04-09");
    expect(html).toContain('href="/yona/admin/projectYobi/issue/7"');
    expect(html).toContain('href="/yona/admin/projectYobi/pullRequest/4"');
    expect(html).toContain('href="/yona/admin/projectYobi"');
    expect(html).toContain('<span class="post-id">4</span>');
    expect(html).toContain('<span class="infos-item">Door</span>');
    expect(html).toContain('href="/yona/admin/projectYobi/pullRequest/4#comments"');
    expect(html).toContain('<i class="yobicon-comments"></i>');
    expect(html).toContain('<span class="size">2</span>');
    expect(html).toContain('class="avatar-wrap assinee"');
    expect(html).toContain('title="Admin"');
    expect(html).toContain('<div class="state open pull-right">Open</div>');
    expect(html).not.toContain("Contributor: Door");
    expect(html).not.toContain("Reviewer: Admin");
    expect(html).not.toContain("Comments: 2");
    expect(html).not.toContain("State: open");
    expect(html).toContain(
      'class="avatar-wrap small" href="/yona/admin/projectYobi"><img alt="projectYobi" src="/yona/files/101"',
    );
    expect(html).toContain('class="yobicon-split yobicon-white vmiddle"');
    expect(html).toContain('href="/yona/naver/legacyYobi"');
    expect(html).toContain("naver");
    expect(html).toContain("legacyYobi");
    expect(html).toContain('style="margin-left:10px"');
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>4</strong>");
    expect(html).not.toContain("project.onmember 4");
    expect(html).toContain('class="owner-name-small"');
    expect(html).toContain(">admin</a>");
    expect(html).toContain("Latest code update");
    expect(html).toContain('<span class="num-badge">2</span>');
    expect(html).not.toContain("Owner: admin");
    expect(html).not.toContain("Created 2026-04-01");
    expect(html).not.toContain("Updated 2026-04-10");
    expect(html).not.toContain("State: public");
    expect(html).not.toContain("Members: 4");
    expect(html).not.toContain("Watchers: 2");
  });

  it("hides profile email addresses when legacy application.show.user.email is disabled", () => {
    const profileOverview = {
      daysAgo: 14,
      defaultLandingPath: "/me",
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "Door English",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "Apr 11, 2026",
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
    };
    const runtimeConfig = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      showUserEmail: false,
    };

    expect(renderWorkspace(profileOverview, runtimeConfig)).not.toContain("door@example.com");
    expect(renderPublicUserProfile(profileOverview, "/door", runtimeConfig)).not.toContain(
      "door@example.com",
    );
  });

  it("renders legacy empty states for the /me dashboard streams", () => {
    const html = renderWorkspace({
      daysAgo: 14,
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

    expect(html).toContain("recently No issue found");
    expect(html).toContain("recently No pull requests have been received");
    expect(html).toContain(">Project is non existent<");
    expect(html).toContain('class="post-list-wrap my-issues row-fluid"');
    expect(html).toContain('class="post-list-wrap row-fluid"');
    expect(html).toContain('class="user-streams all-projects"');
    expect(html).not.toContain('id="watching"');
    expect(html).not.toContain('id="recentlyVisited"');
    expect(html).not.toContain('class="no-result tab-pane user-ul"');
    expect(html).not.toContain("Set to default page");
    expect(html).not.toContain("Make current page the index page when logged in");
    expect(html).not.toContain(">Favorite</h2>");
    expect(html).not.toContain(">Recently visited</h2>");
    expect(html).not.toContain("<button>Log out</button>");
    expect(html).not.toContain("Default landing");
    expect(html).not.toContain("default landing");
    expect(html).not.toContain("basePath");
    expect(html).not.toContain("linked emails");
    expect(html).not.toContain("watched projects");
    expect(html).not.toContain("Save default landing");
    expect(html).not.toContain("Favorite projects");
    expect(html).not.toContain("Recent projects");
    expect(html).not.toContain("Sign out");
    expect(html).toContain('class="auth-provider-logo"');
    expect(html).toContain("Pull request <span");
    expect(html).toContain("projects <span");
    expect(html).not.toContain("Pull Requests <span");
    expect(html).not.toContain("Projects <span");
    expect(html).not.toContain("No pull requests found in the last 14 days.");
    expect(html).not.toContain("No projects found.");
    expect(html).not.toContain("No favorite projects yet.");
    expect(html).not.toContain("No recent projects yet.");
    expect(html).not.toContain("No connected providers.");
  });

  it("renders workspace settings deep links with section-specific bodies", () => {
    const profileHtml = renderWorkspaceSettings("profile", "/user/editform", {
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
    expect(profileHtml).toContain('class="site-breadcrumb-outer"');
    expect(profileHtml).toContain('class="page-wrap-outer"');
    expect(profileHtml).toContain('class="page-wrap"');
    expect(profileHtml).toContain("<h3>Account</h3>");
    expect(profileHtml).toContain('class="nav nav-tabs mt20"');
    expect(profileHtml).toContain("Edit profile");
    expect(profileHtml).toContain("Change password");
    expect(profileHtml).toContain("Notification settings");
    expect(profileHtml).toContain("Email settings");
    expect(profileHtml).toContain("User Token");
    expect(profileHtml).not.toContain("Yona Rust Workspace");
    expect(profileHtml).toContain('id="frmBasic"');
    expect(profileHtml).toContain('class="pull-left"');
    expect(profileHtml).toContain('action="/yona/user/edit"');
    expect(profileHtml).toContain("Login ID");
    expect(profileHtml).toContain("Name");
    expect(profileHtml).toContain("Email address");
    expect(profileHtml).toContain('name="loginId"');
    expect(profileHtml).toContain('name="name"');
    expect(profileHtml).toContain('name="email"');
    expect(profileHtml).toContain("Edit profile");
    expect(profileHtml).toContain('id="frmAvatar"');
    expect(profileHtml).toContain("avatar-frm");
    expect(profileHtml).toContain("fake-file-wrap btnUploadAvatar");
    expect(profileHtml).toContain("Change avatar");
    expect(profileHtml).toContain('id="avatarFile"');
    expect(profileHtml).toContain('id="avatarCropWrap"');
    expect(profileHtml).toContain("btnSubmitCrop");
    expect(profileHtml).toContain("Cancel");
    expect(profileHtml).toContain("Save");
    expect(profileHtml).toContain("reset-user-visited-list");
    expect(profileHtml).toContain('action="/yona/user/resetVisitedList"');
    expect(profileHtml).toContain("Reset recently visited project list");
    expect(profileHtml).not.toContain("user.loginId");
    expect(profileHtml).not.toContain("userinfo.editProfile");
    expect(profileHtml).not.toContain("userinfo.changeAvatar");
    expect(profileHtml).not.toContain("userinfo.reset.visited.project.list");
    expect(profileHtml).not.toContain("Crop Avatar");
    expect(profileHtml).not.toContain("Crop X");

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
    expect(notificationsHtml).toContain("<h3>Account</h3>");
    expect(notificationsHtml).toContain('id="notification-projects"');
    expect(notificationsHtml).toContain('data-toggle="tab"');
    expect(notificationsHtml).toContain("admin / projectYobi");
    expect(notificationsHtml).toContain('data-href="/yona/noti/toggle/1/NEW_ISSUE"');
    expect(notificationsHtml).toContain("New issue");
    expect(notificationsHtml).toContain("New comment");
    expect(notificationsHtml).not.toContain("Watched Projects");
    expect(notificationsHtml).not.toContain("No watched projects yet.");

    const emailsHtml = renderWorkspaceSettings("emails", "/user/editform/emails", {
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
    });
    expect(emailsHtml).toContain('action="/yona/user/email"');
    expect(emailsHtml).toContain("form-inline inner-bubble");
    expect(emailsHtml).toContain('name="email"');
    expect(emailsHtml).toContain('placeholder="New E-mail address"');
    expect(emailsHtml).toContain(">Add<");
    expect(emailsHtml).toContain("Your primary email address will be used");
    expect(emailsHtml).toContain("You will be identified as the same user by multiple sub emails.");
    expect(emailsHtml).toContain('class="table mt20"');
    expect(emailsHtml).toContain("Primary email address");
    expect(emailsHtml).toContain("door@example.com");
    expect(emailsHtml).toContain("alt@example.com");
    expect(emailsHtml).toContain('data-request-uri="/yona/user/email/delete/2"');
    expect(emailsHtml).toContain("Delete");
    expect(emailsHtml).toContain("Set as primary email address.");
    expect(emailsHtml).toContain("pending@example.com");
    expect(emailsHtml).toContain("Send a validation email.");
    expect(emailsHtml).not.toContain("New email");
    expect(emailsHtml).not.toContain("Main Email");
    expect(emailsHtml).not.toContain("Set as main");
    expect(emailsHtml).not.toContain("Validation required");

    const tokenHtml = renderWorkspaceSettings("token", "/user/editform/token", {
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
    });
    expect(tokenHtml).toContain('action="/yona/user/editform/token_reset"');
    expect(tokenHtml).toContain("token-generate");
    expect(tokenHtml).toContain('id="frmBasic"');
    expect(tokenHtml).toContain('class="pull-left"');
    expect(tokenHtml).toContain("User Token");
    expect(tokenHtml).toContain('name="name"');
    expect(tokenHtml).toContain('value="door-token"');
    expect(tokenHtml).toContain(">Recreate User Token<");
    expect(tokenHtml).not.toContain(">userinfo.recreateToken<");
  });
});
