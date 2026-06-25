import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildProfileUpdateInput,
  createDefaultAvatarCrop,
  drawAvatarCropToCanvas,
  getAvatarCropPreviewStyle,
  workspaceAvatarUploadErrorForMimeType,
} from "./routes/-workspace-settings-view";
import {
  LegacyLoginDialog,
  resolveAuthRedirectPath,
  resolvePostAuthHref,
} from "./routes/-auth-views";
import {
  renderHome,
  renderLogin,
  renderLostPassword,
  renderOrganizationDelete,
  renderOrganizationDetail,
  renderOrganizationDirectory,
  renderOrganizationMembersAdmin,
  renderProjectDetail,
  renderProjectDirectory,
  renderRegister,
  renderResetPassword,
  renderVerifyUser,
  renderWorkspace,
  renderWorkspaceSettings,
  testLegacyMessages,
} from "./auth-workspace-shell.test-helpers";
import {
  ISSUE_MENTION_SEARCH_DEBOUNCE_MS,
  IssueMentionUserSuggestions,
  IssueReferenceSuggestions,
  ProjectIssueFormPage,
  ProjectIssueDetailPage,
  buildProjectIssueFormSubmitInput,
  findIssueMentionQuery,
  findIssueReferenceQuery,
  insertIssueMentionText,
  insertIssueReferenceText,
  issueMentionTextForItem,
  issueReferenceTextForItem,
  shouldSearchIssueAssignee,
  submitIssueAssigneeSuggestion,
  submitIssueAssigneeText,
} from "./routes/-issue-views";
import { ProjectNewPage, ProjectSettingsPage } from "./routes/-project-views";
import type { ProjectIssueDetailViewModel } from "./routes/-view-models";

describe("auth and workspace views", () => {
  it("keeps the legacy global navigation shell in the root route", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "routes/__root.tsx"), "utf8");

    expect(source).toContain(
      'className={`gnb-outer${searchScope.type !== "global" ? " project-header" : ""}`}',
    );
    expect(source).toContain('className="gnb-inner"');
    expect(source).toContain('className="gnb-nav"');
    expect(source).toContain('className="admin-logged-in-affix"');
    expect(source).toContain('data-spy="affix"');
    expect(source).toContain('data-offset-top="30"');
    expect(source).toContain(
      'messages("user.siteAdminLoggedInAffix", { fallback: "user.siteAdminLoggedInAffix" })',
    );
    expect(source).toContain("user.siteAdminLoggedInAffix.maxim");
    expect(source).toContain('messages("title.list", { fallback: "title.list" })');
    expect(source).toContain("runtimeConfig.hideProjectListing");
    expect(source).toContain("workspaceOverview?.profile?.isGuest");
    expect(source).toContain("showProjectListing");
    expect(source).toContain(
      'messages("title.yobi.feedback", { fallback: "title.yobi.feedback" })',
    );
    expect(source).toContain("runtimeConfig.feedbackUrl");
    expect(source).not.toContain("https://github.com/yona-projects/yona/issues");
    expect(source).toContain("rootSearchScopeFromPathname");
    expect(source).toContain("rootSearchAction");
    expect(source).toContain('name="gnb-search-form"');
    expect(source).toContain('name="searchType"');
    expect(source).toContain('id="gnb-search-scope-title"');
    expect(source).toContain('data-toggle="search-scope"');
    expect(source).toContain("search.scope.project");
    expect(source).toContain("search.scope.group");
    expect(source).toContain("search.scope.all");
    expect(source).toContain("signInWithPassword");
    expect(source).toContain("resolvePostAuthHref(null, session.defaultLandingPath)");
    expect(source).toContain(
      'className={`search-box${searchScope.type !== "global" ? " select" : ""}`}',
    );
    expect(source).toContain('accessKey="S"');
    expect(source).toContain("<RootAnonymousMenu />");
    expect(source).toContain('id="sidebar-open-btn"');
    expect(source).toContain("dropdwon-box-btn");
    expect(source).toContain('messages("issue.myIssue", { fallback: "issue.myIssue" })');
    expect(source).toContain('messages("userinfo.profile", { fallback: "userinfo.profile" })');
    expect(source).toContain(
      'messages("userinfo.accountSetting", { fallback: "userinfo.accountSetting" })',
    );
    expect(source).toContain('messages("title.logout", { fallback: "title.logout" })');
    expect(source).toContain('messages("title.favorite", { fallback: "title.favorite" })');
    expect(source).toContain('messages("title.project", { fallback: "title.project" })');
    expect(source).toContain("title.recently.visited.issue");
    expect(source).toContain('messages("issue.menu.new", { fallback: "issue.menu.new" })');
    expect(source).toContain(
      'messages("issue.menu.new.mine", { fallback: "issue.menu.new.mine" })',
    );
    expect(source).toContain('messages("button.newProject", { fallback: "button.newProject" })');
    expect(source).toContain(
      'messages("title.newOrganization", { fallback: "title.newOrganization" })',
    );
    expect(source).toContain("<RootFooter />");
    expect(source).toContain('className="page-footer-outer"');
    expect(source).toContain('className="page-footer"');
    expect(source).toContain('className="provider"');
    expect(source).toContain("STANDALONE_FOOTER_PATHS");
    expect(source).toContain('"/secret"');
    expect(source).toContain('"/restart"');
    expect(source).toContain('"/_UIKit"');
    expect(source).toContain("Yona authors");
    expect(source).toContain("NAVER Corp.");
    expect(source).toContain("NAVER LABS");
    expect(source).toContain("NAVER CLOUD PLATFORM");
    expect(source).not.toContain('<ul className="gnb-outer gnb-usermenu">');
    expect(source).not.toContain(">Profile</a>");
    expect(source).not.toContain(">Account</a>");
    expect(source).not.toContain(">Log out</span>");
  });

  it("renders the canonical login shell with legacy field names and recovery link", () => {
    const html = renderLogin({
      routeHref: "/users/loginform?redirectUrl=/admin/projectYobi/issue/1",
    });

    expect(html).toContain('Log in to <span class="highlight">Yona</span>');
    expect(html).not.toContain(">title.loginFor<");
    expect(html).toContain('class="page full"');
    expect(html).toContain('class="center-wrap tag-line-wrap login"');
    expect(html).toContain('class="login-form-wrap frm-wrap"');
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('id="loginIdOrEmailD"');
    expect(html).toContain('class="text email"');
    expect(html).toContain('placeholder="Login ID or E-mail"');
    expect(html).toContain('name="password"');
    expect(html).toContain('id="password"');
    expect(html).toContain('class="text password"');
    expect(html).toContain('placeholder="Password"');
    expect(html).toContain('name="rememberMe"');
    expect(html).toContain('id="remember-me"');
    expect(html).toContain('class="remember-me-wrap pull-left"');
    expect(html).toContain('class="links-wrap pull-right"');
    expect(html).not.toContain('method="post"');
    expect(html).not.toContain('action="/yona/users/login"');
    expect(html).toContain('name="redirectUrl"');
    expect(html).toContain('value="/admin/projectYobi/issue/1"');
    expect(html).toContain(">Log in<");
    expect(html).toContain(">Password forgotten?<");
    expect(html).not.toContain(">Login<");
    expect(html).not.toContain(">Forgot password<");
    expect(html).not.toContain('placeholder="Login ID or email"');
    expect(html).not.toContain('placeholder="user.password"');
    expect(html).not.toContain(">title.resetPassword<");
    expect(html).toContain('href="/yona/lostPassword"');
    expect(html).not.toContain("oauth-login-btn");
  });

  it("keeps legacy auth submit labels while submit is pending", () => {
    const loginHtml = renderLogin({
      pending: true,
      routeHref: "/users/loginform",
    });
    expect(loginHtml).toContain(">Log in<");
    expect(loginHtml).not.toContain(">Logging in<");
    expect(loginHtml).not.toContain(">Loading<");

    const registerHtml = renderRegister({ pending: true });
    expect(registerHtml).toContain(">Sign up<");
    expect(registerHtml).not.toContain(">Signing up<");
    expect(registerHtml).not.toContain(">Creating<");
  });

  it("renders the common legacy login dialog shell", () => {
    const html = renderToStaticMarkup(
      <LegacyLoginDialog
        authUiCapabilities={{
          emailVerificationEnabled: false,
          loginIdPlaceholder: "",
          passwordPlaceholder: "",
          signupRequireConfirm: false,
          socialLoginOnly: false,
        }}
        csrfToken="csrf-1"
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('id="loginDialog"');
    expect(html).toContain('class="modal hide loginDialog"');
    expect(html).toContain('class="frm-wrap login-form-wrap"');
    expect(html).not.toContain('action="/yona/users/login"');
    expect(html).toContain('name="csrfToken"');
    expect(html).toContain('value="csrf-1"');
    expect(html).toContain('id="loginIdOrEmailD"');
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('placeholder="Login ID or E-mail"');
    expect(html).toContain('id="passwordD"');
    expect(html).toContain('placeholder="Password"');
    expect(html).toContain('class="yobicon-error"');
    expect(html).toContain('class="error-message"');
    expect(html).toContain(">Log in<");
    expect(html).toContain('id="remember-meD"');
    expect(html).toContain(">Stay logged in<");
    expect(html).toContain('href="/yona/lostPassword"');
    expect(html).toContain(">Reset password<");
    expect(html).toContain('href="/yona/users/signupform"');
    expect(html).toContain(">Sign up<");
    expect(html).not.toContain(">title.forgotpassword<");
    expect(html).not.toContain("oauth-login-btn");

    const source = fs.readFileSync(path.resolve(__dirname, "routes/-auth-views.tsx"), "utf8");
    expect(source).toContain("onSignIn?: (input:");
    expect(source).toContain('formData.get("loginIdOrEmail")');
    expect(source).toContain('formData.get("password")');
    expect(source).toContain('formData.has("rememberMe")');
  });

  it("renders configured OAuth provider buttons on the login page", () => {
    const html = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });

    expect(html).toContain('class="social-login-title-line"');
    expect(html).toContain(">or<");
    expect(html).toContain('class="ybtn oauth-login-btn"');
    expect(html).toContain('href="/yona/authenticate/github"');
    expect(html).toContain('href="/yona/authenticate/google"');
    expect(html).toContain('class="auth-provider-logo"');
    expect(html).toContain('class="provider-name"');
    expect(html).toContain("Sign in with github");
    expect(html).not.toContain("Sign in with GitHub");
    expect(html).toContain(
      'src="/yona/assets/images/provider-logo/btn_google_light_normal_ios.svg"',
    );
    expect(html).toContain('alt="login with Google"');
    expect(html).toContain("Sign in with Google");
    expect(html).not.toContain('class="google"');
  });

  it("preserves no-button behavior when the configured OAuth provider list is empty", () => {
    const html = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });

    expect(html).not.toContain("oauth-login-btn");
    expect(html).not.toContain("social-login-title-line");
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('name="password"');
  });

  it("does not render non-legacy OAuth providers from stale capability state", () => {
    const html = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["gitlab", " github ", "Google"],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });

    expect(html).toContain('href="/yona/authenticate/github"');
    expect(html).toContain('href="/yona/authenticate/google"');
    expect(html).not.toContain('href="/yona/authenticate/gitlab"');
    expect(html).not.toContain(">gitlab<");
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('name="password"');
  });

  it("renders configured OAuth provider buttons on the legacy login dialog", () => {
    const html = renderToStaticMarkup(
      <LegacyLoginDialog
        authUiCapabilities={{
          emailVerificationEnabled: false,
          enabled_social_providers: ["github"],
          loginIdPlaceholder: "",
          passwordPlaceholder: "",
          signupRequireConfirm: false,
          socialLoginOnly: false,
        }}
        csrfToken="csrf-1"
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('id="loginDialog"');
    expect(html).toContain('class="social-login-title-line"');
    expect(html).toContain('href="/yona/authenticate/github"');
    expect(html).toContain('class="ybtn oauth-login-btn"');
    expect(html).toContain("Sign in with github");
    expect(html).not.toContain("Sign in with GitHub");
  });

  it("keeps social-login-only warning while rendering configured provider buttons", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github"],
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
      routeHref: "/users/loginform",
    });

    expect(loginHtml).toContain("Only allow sign-in via social login");
    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');
    expect(loginHtml).toContain('href="/yona/authenticate/github"');
    expect(loginHtml).toContain('class="ybtn oauth-login-btn"');
    expect(loginHtml).not.toContain('class="social-login-title-line"');

    const dialogHtml = renderToStaticMarkup(
      <LegacyLoginDialog
        authUiCapabilities={{
          emailVerificationEnabled: false,
          enabledSocialProviders: ["google"],
          signupRequireConfirm: false,
          socialLoginOnly: true,
        }}
        messages={testLegacyMessages}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(dialogHtml).toContain("Only allow sign-in via social login");
    expect(dialogHtml).not.toContain('name="loginIdOrEmail"');
    expect(dialogHtml).not.toContain('name="password"');
    expect(dialogHtml).toContain('href="/yona/authenticate/google"');
    expect(dialogHtml).toContain('class="ybtn oauth-login-btn"');
    expect(dialogHtml).toContain(
      'src="/yona/assets/images/provider-logo/btn_google_light_normal_ios.svg"',
    );
    expect(dialogHtml).toContain('alt="login with Google"');
    expect(dialogHtml).not.toContain('class="social-login-title-line"');
  });

  it("uses configured legacy login placeholders from auth capabilities", () => {
    const html = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        loginIdPlaceholder: "Use employee number",
        passwordPlaceholder: "Company password",
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });

    expect(html).toContain('placeholder="Use employee number"');
    expect(html).toContain('placeholder="Company password"');
  });

  it("uses the configured project default scope on the create project form", () => {
    const html = renderToStaticMarkup(<ProjectNewPage defaultProjectScope="private" />);

    expect(html).toContain('id="private"');
    expect(html).toContain('name="projectScope"');
    expect(html).toContain('checked="" value="PRIVATE"');
  });

  it("renders the legacy create project form shell and field anchors", () => {
    const html = renderToStaticMarkup(<ProjectNewPage />);

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="form-wrap new-project"');
    expect(html).toContain('id="newProjectForm"');
    expect(html).not.toContain('action="/projects"');
    expect(html).not.toContain('method="post"');
    expect(html).toContain('class="frm-wrap"');
    expect(html).toContain('id="project-owner"');
    expect(html).toContain('name="owner"');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('id="description"');
    expect(html).toContain('name="overview"');
    expect(html).toContain('class="advanced-options"');
    expect(html).toContain('id="vcs"');
    expect(html).toContain('name="vcs"');
    expect(html).toContain('value="GIT"');
    expect(html).toContain(">Git</option>");
    expect(html).toContain('value="SVN"');
    expect(html).toContain(">Subversion</option>");
    expect(html).not.toContain("project.new.vcsType.subversion");
    expect(html).toContain('id="svn"');
    expect(html).toContain('class="actions mt20"');
  });

  it("renders legacy project scope radio anchors on the create project form", () => {
    const html = renderToStaticMarkup(<ProjectNewPage />);

    expect(html).toContain('class="unstyled project-scopes mt10"');
    expect(html).toContain('id="public"');
    expect(html).toContain('name="projectScope"');
    expect(html).toContain('value="PUBLIC"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('value="PROTECTED"');
    expect(html).toContain('id="private"');
    expect(html).toContain('value="PRIVATE"');
    expect(html).toContain("Anonymous users are able to access the project.");
    expect(html).toContain(
      "Users in the group and also users who have been explicitly granted access are able to access the project.",
    );
    expect(html).toContain(
      "Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.",
    );
    expect(html).not.toContain('<select name="projectScope"');
  });

  it("uses configured legacy project default menus on the create project form", () => {
    const html = renderToStaticMarkup(
      <ProjectNewPage defaultProjectMenus={["issue", "board"]} defaultProjectScope="private" />,
    );

    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('name="code"');
    expect(html).toContain('id="menuSettingIssue"');
    expect(html).toContain('name="issue" checked=""');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('name="pullRequest"');
    expect(html).toContain('id="menuSettingReview"');
    expect(html).toContain('name="review"');
    expect(html).toContain('id="menuSettingMilestone"');
    expect(html).toContain('name="milestone"');
    expect(html).toContain('id="menuSettingBoard"');
    expect(html).toContain('name="board" checked=""');
  });

  it("renders editable legacy menu checkboxes on the project settings form", () => {
    const html = renderToStaticMarkup(
      <ProjectSettingsPage
        detail={{
          boardCount: 0,
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "Overview",
          ownerName: "admin",
          projectName: "projectYobi",
          projectScope: "protected",
          defaultReviewerCount: 2,
          isUsingReviewerCount: true,
          maxReviewerCount: 3,
          showBoard: false,
          showCode: true,
          showIssue: false,
          showMilestone: true,
          showPullRequest: true,
          showReview: false,
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        messages={testLegacyMessages}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('id="saveSetting"');
    expect(html).toContain('class="nm"');
    expect(html).toContain('class="bubble-wrap gray"');
    expect(html).toContain('class="box-wrap top clearfix frm-wrap"');
    expect(html).toContain('class="setting-box left"');
    expect(html).toContain('class="setting-box right"');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('id="project-desc"');
    expect(html).toContain('name="overview"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('name="projectScope"');
    expect(html).toContain('checked="" value="PROTECTED"');
    expect(html).not.toContain('<select name="projectScope">');
    expect(html).toContain('id="codeAccessibleMemberOnly"');
    expect(html).toContain('id="codeAccessibleAnyone"');
    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('name="code" checked=""');
    expect(html).toContain('id="menuSettingIssue"');
    expect(html).toContain('name="issue"');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('name="pullRequest" checked=""');
    expect(html).toContain('id="menuSettingReview"');
    expect(html).toContain('name="review"');
    expect(html).toContain('id="menuSettingMilestone"');
    expect(html).toContain('name="milestone" checked=""');
    expect(html).toContain('id="menuSettingBoard"');
    expect(html).toContain('name="board"');
    expect(html).toContain('id="reviewerCountSettingPanel"');
    expect(html).toContain('name="isUsingReviewerCount"');
    expect(html).toContain('id="reviewerCountEnable"');
    expect(html).toContain('id="reviewerCountDisable"');
    expect(html).toContain('id="welReviewerCount"');
    expect(html).toContain('data-id="project-reviewer-count"');
    expect(html).toContain('data-name="defaultReviewerCount"');
    expect(html).toContain('name="defaultReviewerCount"');
    expect(html).toContain('<option value="2" selected="">2</option>');
    expect(html).toContain('class="box-wrap bottom"');
    expect(html).toContain('id="save"');
    expect(html).toContain("Save");
  });

  it("renders the canonical signup shell with legacy labels and login link", () => {
    const html = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });

    expect(html).toContain('Sign up for <span class="highlight">Yona</span>');
    expect(html).not.toContain(">title.signupFor<");
    expect(html).toContain('class="page full"');
    expect(html).toContain('class="center-wrap tag-line-wrap signup"');
    expect(html).toContain('class="signup-form-wrap frm-wrap"');
    expect(html).toContain('name="signup"');
    expect(html).toContain(">User ID (lower case)<");
    expect(html).toContain('id="loginId"');
    expect(html).toContain('name="loginId"');
    expect(html).toContain(">Name<");
    expect(html).toContain('id="uname"');
    expect(html).toContain('name="name"');
    expect(html).toContain(">Email address<");
    expect(html).toContain('id="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain(">Password<");
    expect(html).toContain('name="password"');
    expect(html).toContain(">Password confirmation<");
    expect(html).toContain('name="retypedPassword"');
    expect(html).toContain('class="text password"');
    expect(html).not.toContain('method="post"');
    expect(html).not.toContain('action="/yona/users/signup"');
    expect(html).toContain(">Sign up<");
    expect(html).not.toContain(">user.signupBtn<");
    expect(html).toContain("Already signed up?");
    expect(html).toContain('href="/yona/users/loginform"');
    expect(html).toContain(">Log in<");
  });

  it("renders lost-password and reset-password shells with legacy field layout", () => {
    const lostPasswordHtml = renderLostPassword("/lostPassword");
    expect(lostPasswordHtml).toContain('Reset password for <span class="highlight">Yona</span>');
    expect(lostPasswordHtml).not.toContain(">title.resetPasswordFor<");
    expect(lostPasswordHtml).toContain('class="center-wrap tag-line-wrap reset-password"');
    expect(lostPasswordHtml).toContain('class="login-form-wrap frm-wrap"');
    expect(lostPasswordHtml).not.toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('id="loginId"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('placeholder="Login ID"');
    expect(lostPasswordHtml).toContain('id="emailAddress"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain('placeholder="Email address"');
    expect(lostPasswordHtml).toContain('class="ybtn ybtn-primary ybtn-large ybtn-fullsize"');
    expect(lostPasswordHtml).toContain(">Confirm<");
    expect(lostPasswordHtml).not.toContain(">button.confirm<");

    const resetPasswordHtml = renderResetPassword("/resetPassword");
    expect(resetPasswordHtml).toContain('Reset password for <span class="highlight">Yona</span>');
    expect(resetPasswordHtml).not.toContain(">title.resetPasswordFor<");
    expect(resetPasswordHtml).toContain('class="center-wrap tag-line-wrap reset-password"');
    expect(resetPasswordHtml).toContain('class="login-form-wrap frm-wrap"');
    expect(resetPasswordHtml).toContain('name="passwordReset"');
    expect(resetPasswordHtml).not.toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain('name="hashString"');
    expect(resetPasswordHtml).toContain('id="password"');
    expect(resetPasswordHtml).toContain('name="password"');
    expect(resetPasswordHtml).toContain('placeholder="Password"');
    expect(resetPasswordHtml).toContain('id="retypedPassword"');
    expect(resetPasswordHtml).toContain('name="retypedPassword"');
    expect(resetPasswordHtml).toContain('placeholder="Password confirmation"');
    expect(resetPasswordHtml).toContain('class="ybtn ybtn-primary ybtn-fullsize"');
    expect(resetPasswordHtml).toContain(">Confirm<");
    expect(resetPasswordHtml).not.toContain(">button.confirm<");
    expect(resetPasswordHtml).not.toContain('placeholder="user.password"');
    expect(resetPasswordHtml).not.toContain('placeholder="Retype password"');
  });

  it("keeps REST auth submit handlers primary without rendered legacy form actions", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "routes/-auth-views.tsx"), "utf8");

    expect(source).not.toContain('action={appHref(runtimeConfig, "/users/login")}');
    expect(source).not.toContain('action={appHref(runtimeConfig, "/users/signup")}');
    expect(source).not.toContain('action={appHref(runtimeConfig, "/lostPassword")}');
    expect(source).not.toContain('action={appHref(runtimeConfig, "/resetPassword")}');
    expect(source).not.toContain('method="post"');
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("onSignIn?.(formState)");
    expect(source).toContain("onSignIn?.({");
    expect(source).toContain("onRegister?.(formState)");
    expect(source).toContain("onRequestReset?.(formState)");
    expect(source).toContain("onResetPassword?.({");
  });

  it("renders auth capability help copy when email verification or signup confirmation is enabled", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: true,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });
    expect(loginHtml).toContain(
      "If you are trying to login for the first time, a confirmation mail will be sent.",
    );
    expect(loginHtml).toContain('class="email-verification-help"');

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: true,
        socialLoginOnly: false,
      },
    });
    expect(registerHtml).toContain('class="center-txt"');
    expect(registerHtml).toContain("Administrator admission is required for activation.");
    expect(registerHtml).toContain("If needed, please contact");
  });

  it("renders login-side post-submit messages from auth query parameters", () => {
    const verifyHtml = renderLogin({ routeHref: "/users/loginform?verify=sent" });
    expect(verifyHtml).toContain("User verification mail was sent.");
    expect(verifyHtml).not.toContain("Confirmation request was accepted.");

    const requestedHtml = renderLogin({ routeHref: "/users/loginform?signup=requested" });
    expect(requestedHtml).toContain(
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
    );
    expect(requestedHtml).not.toContain("Sign up requires confirmation.");
  });

  it("renders unsupported social-login provider state from auth query parameters", () => {
    const html = renderLogin({
      routeHref: "/users/loginform?error=unsupported&provider=github",
    });

    expect(html).toContain("The request cannot be fulfilled due to bad syntax");
    expect(html).not.toContain("auth.socialLogin.unsupportedProvider");
    expect(html).not.toContain("github");
    expect(html).not.toContain("Social login provider is not configured.");
  });

  it("renders OAuth denied provider state from auth query parameters", () => {
    const html = renderLogin({
      routeHref: "/users/loginform?error=oauthDenied&provider=github",
    });

    expect(html).toContain("Request forbidden or not allowed");
    expect(html).not.toContain("auth.socialLogin.denied");
    expect(html).not.toContain("github");
    expect(html).not.toContain("auth.socialLogin.unsupportedProvider");
  });

  it("renders verify-user success and invalid surfaces", () => {
    const successHtml = renderVerifyUser({ loginId: "door" });
    expect(successHtml).toContain('class="app-shell page full"');
    expect(successHtml).toContain('class="center-wrap tag-line-wrap reset-password"');
    expect(successHtml).toContain('class="title">Verified User</h1>');
    expect(successHtml).toContain("door");
    expect(successHtml).toContain("<hr/>");
    expect(successHtml).toContain('class="tag-line">User is verified. Try logging in.</p>');
    expect(successHtml).not.toContain("Yona Rust Auth");
    expect(successHtml).not.toContain('href="/yona/users/loginform"');

    const invalidHtml = renderVerifyUser({ invalid: true, loginId: "door" });
    expect(invalidHtml).toContain('class="error-wrap"');
    expect(invalidHtml).toContain("Invalid verification");
    expect(invalidHtml).not.toContain("door");
    expect(invalidHtml).not.toContain("Yona Rust Auth");
  });

  it("hides local auth forms when social-login-only mode is enabled", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
      routeHref: "/users/loginform",
    });
    expect(loginHtml).toContain("Only allow sign-in via social login");
    expect(loginHtml).toContain('class="btns-row nm"');
    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
    });
    expect(registerHtml).toContain("Only allow sign-in via social login");
    expect(registerHtml).toContain('class="btns-row nm"');
    expect(registerHtml).not.toContain('name="loginId"');
    expect(registerHtml).not.toContain('name="email"');
    expect(registerHtml).not.toContain('name="password"');
  });

  it("does not render local auth forms before auth capabilities resolve", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: null,
      routeHref: "/users/loginform",
    });

    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');
  });

  it("renders the /me shell without private dashboard-only sections", () => {
    const html = renderWorkspace({
      defaultLandingPath: "/me",
      favoriteProjects: [{ ownerName: "admin", projectName: "projectYobi" }],
      recentProjects: [{ ownerName: "admin", projectName: "projectYobi" }],
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

    expect(html).toContain("door");
    expect(html).not.toContain(">Set to default page</h2>");
    expect(html).not.toContain(">Favorite</h2>");
    expect(html).not.toContain(">Recently visited</h2>");
    expect(html).not.toContain("<button>Log out</button>");
  });

  it("renders the public landing and directory views", () => {
    const homeHtml = renderHome();
    expect(homeHtml).toContain('class="siteintro-bg row"');
    expect(homeHtml).toContain('class="site-heading"');
    expect(homeHtml).toContain("21st Century Software Development Platform");
    expect(homeHtml).toContain("Just focus on what you have to do");
    expect(homeHtml).toContain('href="/yona/users/signupform"');
    expect(homeHtml).toContain(">Sign up for Yona</a>");
    expect(homeHtml).not.toContain(">button.signup</a>");
    expect(homeHtml).toContain("Key features");
    expect(homeHtml).toContain("Project / Organization");
    expect(homeHtml).toContain("Code review");
    expect(homeHtml).not.toContain("Yona Rust Frontend");
    expect(homeHtml).not.toContain("Legacy Route Foundation");

    const projectsHtml = renderProjectDirectory(
      {
        items: [
          {
            createdLabel: "2026-04-01",
            lastPushedLabel: "2026-04-10",
            logoUrl: "/yona/files/1",
            memberCount: 4,
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
      },
      "/projects?filter=yobi&pageNum=1",
    );

    expect(projectsHtml).toContain("PUBLIC Project list");
    expect(projectsHtml).toContain("Group List");
    expect(projectsHtml).toContain('action="/yona/projects"');
    expect(projectsHtml).toContain('class="owner-avatar-wrap"');
    expect(projectsHtml).toContain(
      '<a href="/yona/yobi/projectYobi"><img alt="projectYobi" src="/yona/files/1"/></a>',
    );
    expect(projectsHtml).not.toContain('class="project-avatar"');
    expect(projectsHtml).not.toContain('<img alt="" src="/yona/files/1"/>');
    expect(projectsHtml).toContain("projectYobi");
    expect(projectsHtml).toContain('class="owner-name-small" href="/yona/yobi"');
    expect(projectsHtml).toContain('title="2026-04-01">2026-04-01</strong>');
    expect(projectsHtml).toContain("Latest code update");
    expect(projectsHtml).toContain('class="yobicon-friends yobicon-middle"');
    expect(projectsHtml).toContain("<strong>4</strong>");
    expect(projectsHtml).toContain('class="yobicon-eye yobicon-middle"');
    expect(projectsHtml).toContain("<strong>3</strong>");
    expect(projectsHtml).not.toContain('<p class="name-tag">by yobi</p>');

    const organizationsHtml = renderOrganizationDirectory(
      {
        items: [
          {
            description: "web labs",
            logoUrl: "/yona/files/2",
            organizationName: "weblabs",
          },
        ],
      },
      "/orgs?filter=lab&pageNum=1",
    );

    expect(organizationsHtml).toContain("PUBLIC Project list");
    expect(organizationsHtml).toContain("Group List");
    expect(organizationsHtml).toContain('action="/yona/orgs"');
    expect(organizationsHtml).toContain('class="owner-avatar-wrap"');
    expect(organizationsHtml).toContain('href="/yona/organizations/weblabs"');
    expect(organizationsHtml).toContain('<img alt="weblabs" src="/yona/files/2"/>');
    expect(organizationsHtml).not.toContain('class="project-avatar"');
    expect(organizationsHtml).not.toContain('<img alt="" src="/yona/files/2"/>');
    expect(organizationsHtml).toContain("weblabs");
    expect(organizationsHtml).toContain("web labs");
  });

  it("renders the public landing signup CTA with the configured site name", () => {
    const html = renderHome({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      siteName: "Legacy Yona",
    });

    expect(html).toContain(">Sign up for Legacy Yona</a>");
    expect(html).not.toContain(">button.signup</a>");
  });

  it("renders organization and project baseline views", () => {
    const orgHtml = renderOrganizationDetail({
      description: "web labs",
      enrollmentRequested: false,
      organizationName: "weblabs",
      viewerCanEnroll: true,
      viewerCanUpdate: true,
    });
    expect(orgHtml).toContain("weblabs");
    expect(orgHtml).toContain("web labs");
    expect(orgHtml).toContain("Member enrollment request");
    expect(orgHtml).toContain("Admins of this group can check your enrollment request.");
    expect(orgHtml).toContain("Send sign-up request");
    const leaveOrgHtml = renderOrganizationDetail({
      description: "web labs",
      organizationName: "weblabs",
      viewerCanLeave: true,
      viewerCanUpdate: false,
    });
    expect(leaveOrgHtml).toContain("Leave the group");
    expect(leaveOrgHtml).toContain(
      'class="ybtn ybtn-minimum ybtn-danger pull-right" data-href="/yona/organizations/weblabs/leave" id="groupLeaveBtn"',
    );
    expect(leaveOrgHtml).not.toContain("Membership");
    expect(leaveOrgHtml).not.toContain("organization.member.leave");

    const projectHtml = renderProjectDetail({
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "Yona",
      ownerName: "admin",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanEnroll: true,
      viewerCanUpdate: false,
    });
    expect(projectHtml).toContain("admin/projectYobi");
    expect(projectHtml).toContain("Send sign-up request");
    expect(projectHtml).not.toContain("Request enrollment");
    expect(projectHtml).toContain('title="Favorite"');
    expect(projectHtml).toContain("material-icons va-text-top");
    expect(projectHtml).not.toContain("Favorite project");
  });

  it("renders the legacy organization members management shell", () => {
    const html = renderOrganizationMembersAdmin({
      deleteAllowed: true,
      enrollmentRequests: [
        {
          avatarUrl: "https://cdn.yona/avatar-candidate.png",
          loginId: "candidate",
          userId: "8",
          userLabel: "Candidate User",
        },
      ],
      members: [
        {
          avatarUrl: "https://cdn.yona/avatar-admin.png",
          loginId: "admin",
          role: "org_admin",
          userId: "7",
          userLabel: "Admin User",
        },
      ],
      organizationName: "weblabs",
      roleOptions: [
        { label: "org_admin", role: "org_admin" },
        { label: "org_member", role: "org_member" },
      ],
      viewerCanUpdate: true,
    });

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="group-title-head">group</span>');
    expect(html).toContain('<a href="/yona/organizations/weblabs">weblabs</a>');
    expect(html).toContain('class="project-menu-nav project-menu-gruop"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="addNewMember"');
    expect(html).not.toContain('action="/yona/organizations/weblabs/members"');
    expect(html).not.toContain('method="post"');
    expect(html).toContain('class="text uname"');
    expect(html).toContain('data-provider="typeahead"');
    expect(html).toContain('placeholder="Add new member ID."');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).toContain('class="member span6 span-hard-wrap"');
    expect(html).toContain('class="avatar-wrap mlarge pull-left mr10"');
    expect(html).toContain('class="member-name"');
    expect(html).toContain('class="member-id"');
    expect(html).toContain('data-name="roleof-admin"');
    expect(html).toContain('class="dropdown-menu"');
    expect(html).toContain('data-action="apply"');
    expect(html).toContain('data-href="/yona/organizations/weblabs/member/7/edit"');
    expect(html).toContain('data-action="delete"');
    expect(html).toContain('data-href="/yona/organizations/weblabs/member/7/delete"');
    expect(html).toContain('id="alertDeletion"');
    expect(html).toContain("Are you sure this user should leave this group?");
    expect(html).toContain('id="deleteBtn"');
    expect(html).toContain("Sign-up request (1)");
    expect(html).toContain('class="img-circle"');
    expect(html).toContain('class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"');
    expect(html).toContain('data-loginid="candidate"');
  });

  it("renders the legacy organization delete confirmation shell", () => {
    const html = renderOrganizationDelete({
      deleteAllowed: true,
      enrollmentRequests: [],
      members: [],
      organizationName: "weblabs",
      roleOptions: [],
      viewerCanUpdate: true,
    });

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="group-title-head">group</span>');
    expect(html).toContain('<a href="/yona/organizations/weblabs">weblabs</a>');
    expect(html).toContain('class="project-menu-nav project-menu-gruop"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('href="/yona/organizations/weblabs/settingform"');
    expect(html).toContain('href="/yona/organizations/weblabs/members"');
    expect(html).toContain('href="/yona/organizations/weblabs/deleteForm"');
    expect(html).toContain('class="active"');
    expect(html).toContain('class="box-wrap bottom"');
    expect(html).toContain('id="btnDelete"');
    expect(html).toContain('data-toggle="modal"');
    expect(html).toContain("Delete This Group");
    expect(html).toContain('id="alertDeletion"');
    expect(html).toContain('class="modal hide"');
    expect(html).toContain("Do you want to delete this group?");
    expect(html).toContain("Are you sure you want to delete this group?");
    expect(html).toContain('id="btnDeleteExec"');
    expect(html).toContain("Yes");
    expect(html).toContain("No");
  });

  it("renders workspace settings tabs with canonical legacy user-editform paths", () => {
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

    expect(html).toContain('href="/yona/user/editform"');
    expect(html).toContain('href="/yona/user/editform/password"');
    expect(html).toContain('href="/yona/user/editform/notifications"');
    expect(html).toContain('href="/yona/user/editform/emails"');
    expect(html).toContain('href="/yona/user/editform/token"');
    expect(html).not.toContain('action="/yona/user/resetPassword"');
    expect(html).toContain('id="frmPassword"');
    expect(html).toContain('name="oldPassword"');
    expect(html).toContain('name="loginId"');
    expect(html).toContain('href="/yona/lostPassword"');
    expect(html).toContain("Current password");
    expect(html).toContain("New password");
    expect(html).toContain("Password confirmation");
    expect(html).toContain("Change password");
    expect(html).toContain(
      "If you forget the current password or what was generated at first social login...",
    );
    expect(html).toContain("Password reset request");
    expect(html).not.toContain("user.currentPassword");
    expect(html).not.toContain("site.resetPasswordEmail.title");
  });

  it("keeps route-level anonymous workspace fallbacks on the legacy user label key", () => {
    for (const routePath of [
      "routes/$user/route.tsx",
      "routes/-workspace-views.tsx",
      "routes/-workspace-settings-view.tsx",
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");
      expect(source).toContain('userLabel: "User.anonymous.name"');
      expect(source).not.toContain('userLabel: "Anonymous"');
    }
  });

  it("prefers profile.avatarUrl on /me and profile settings before placeholder fallback", () => {
    const withAvatarHtml = renderWorkspace({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      recentProjects: [],
      profile: {
        avatarUrl: "https://cdn.yona/avatar-door.png",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
      },
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
    expect(withAvatarHtml).toContain("https://cdn.yona/avatar-door.png");

    const settingsWithAvatarHtml = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
      profile: {
        avatarUrl: "https://cdn.yona/avatar-door.png",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
      },
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
    expect(settingsWithAvatarHtml).toContain("https://cdn.yona/avatar-door.png");

    const fallbackHtml = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
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
    expect(fallbackHtml).toContain("data:image/svg+xml;utf8,");
  });

  it("builds updateProfile input with avatarAttachmentId", () => {
    const formData = new FormData();
    formData.set("email", "door@example.com");
    formData.set("name", "Door");

    expect(buildProfileUpdateInput(formData, "avatar-attachment-1")).toEqual({
      avatarAttachmentId: "avatar-attachment-1",
      email: "door@example.com",
      name: "Door",
    });
  });

  it("renders the avatar uploader shell and crop modal in profile settings", () => {
    const html = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
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

    expect(html).toContain("Change avatar");
    expect(html).toContain('name="avatarAttachmentId"');
    expect(html).toContain('id="avatarCropWrap"');
    expect(html).toContain("Cancel");
    expect(html).toContain("Save");
    expect(html).not.toContain('src=""');
    expect(html).not.toContain("userinfo.changeAvatar");
    expect(html).not.toContain("Crop Avatar");

    const source = fs.readFileSync(
      path.resolve(__dirname, "routes/-workspace-settings-view.tsx"),
      "utf8",
    );
    expect(source).toContain('id="frmAvatar"');
    expect(source).toContain("event.preventDefault();");
  });

  it("uses legacy message keys for user-profile workspace avatar upload validation errors", () => {
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/user/editform/index.tsx"),
      "utf8",
    );
    expect(workspaceAvatarUploadErrorForMimeType("image/png")).toBeNull();
    expect(workspaceAvatarUploadErrorForMimeType("text/plain")).toBe("user.avatar.onlyImage");
    expect(workspaceAvatarUploadErrorForMimeType("")).toBe("user.avatar.onlyImage");
    expect(routeSource).toContain("user.avatar.uploadError");
    expect(routeSource).not.toContain("Avatar upload failed");
    expect(routeSource).not.toContain(
      'setErrorMessage(error instanceof Error ? error.message : "user.avatar.uploadError")',
    );
  });

  it("keeps workspace settings mutation fallbacks on legacy scalar keys", () => {
    const routeSources = [
      "routes/user/editform/index.tsx",
      "routes/user/editform/password/route.tsx",
      "routes/user/editform/token/route.tsx",
      "routes/user/editform/notifications/route.tsx",
      "routes/user/editform/emails/route.tsx",
    ]
      .map((routePath) => fs.readFileSync(path.resolve(__dirname, routePath), "utf8"))
      .join("\n");

    expect(routeSources).toContain("error.badrequest");
    expect(routeSources).toContain("error.failedTo");
    expect(routeSources).toContain("userinfo.changeNotifications");
    expect(routeSources).toContain("sendWorkspaceEmailValidation");
    expect(routeSources).toContain("onSendWorkspaceEmailValidation");
    expect(routeSources).not.toContain("error.failedTo userinfo.changeNotifications");
    expect(routeSources).not.toContain("Update profile failed.");
    expect(routeSources).not.toContain("Change password failed.");
    expect(routeSources).not.toContain("Reset token failed.");
    expect(routeSources).not.toContain("Toggle notification failed.");
    expect(routeSources).not.toContain("Add email failed.");
    expect(routeSources).not.toContain("Delete email failed.");
    expect(routeSources).not.toContain("Send validation email failed.");
    expect(routeSources).not.toContain("Set main email failed.");
  });

  it("keeps REST workspace settings submit handlers primary without legacy direct form fallbacks", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "routes/-workspace-settings-view.tsx"),
      "utf8",
    );

    expect(source).not.toContain('action={appHref(props.runtimeConfig, "/user/edit")}');
    expect(source).not.toContain('action={appHref(props.runtimeConfig, "/user/resetVisitedList")}');
    expect(source).not.toContain('action={appHref(props.runtimeConfig, "/user/resetPassword")}');
    expect(source).not.toContain('action={appHref(props.runtimeConfig, "/user/email")}');
    expect(source).not.toContain(
      'action={appHref(props.runtimeConfig, "/user/editform/token_reset")}',
    );
    expect(source).not.toMatch(/\n\s+method="post"/);
    expect(source).not.toContain("if (!props.onUpdateProfile) {");
    expect(source).not.toContain("if (!props.onResetVisitedProjects) {");
    expect(source).not.toContain("if (!props.onChangePassword) {");
    expect(source).not.toContain("if (!props.onAddWorkspaceEmail) {");
    expect(source).not.toContain("if (!props.onResetApiToken) {");
    expect(source).toContain("props.onUpdateProfile?.(buildProfileUpdateInput");
    expect(source).toContain("props.onResetVisitedProjects?.();");
    expect(source).toContain("props.onChangePassword?.({");
    expect(source).toContain("props.onAddWorkspaceEmail?.(");
    expect(source).toContain("props.onResetApiToken?.();");
  });

  it("renders issue sharer list and manager controls in the issue sidebar", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        viewerCanDelete: true,
        viewerCanManageSharers: true,
        viewerCanUpdate: true,
      },
      {
        onShareIssue: async () => undefined,
        onSearchSharableUsers: async () => ({ items: [], total: 0, truncated: false }),
        onUnshareIssue: async () => undefined,
      },
    );

    expect(html).toContain('class="sharer-list"');
    expect(html).toContain('class="issue-share-title mb10"');
    expect(html).toContain("Issue Sharer");
    expect(html).toContain("Guest User");
    expect(html).toContain('href="/yona/guest"');
    expect(html).toContain('class="usf-group"');
    expect(html).toContain('class="text-ellipsis sharer-item"');
    expect(html).toContain('id="issueSharer"');
    expect(html).toContain('class="bigdrop width100p"');
    expect(html).toContain('name="issueSharer"');
    expect(html).toContain('placeholder="Select Issue Sharer"');
    expect(html).toContain(">Issue Sharing<");
    expect(html).toContain("Cancelled");
    expect(html).not.toContain("issue.sharer");
    expect(html).not.toContain('placeholder="Issue sharer login ID"');
    expect(html).not.toContain(">Share<");
    expect(html).not.toContain(">Remove sharer<");
    expect(html).not.toContain("Searching…");
  });

  it("renders issue mention and reference autocomplete like legacy At.js", () => {
    const emptyMentionHtml = renderToStaticMarkup(
      <IssueMentionUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loaded", truncated: false }}
      />,
    );
    expect(emptyMentionHtml).toBe("");
    expect(emptyMentionHtml).not.toContain("No matching mentions");

    const errorReferenceHtml = renderToStaticMarkup(
      <IssueReferenceSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "error", truncated: false }}
      />,
    );
    expect(errorReferenceHtml).toBe("");
    expect(errorReferenceHtml).not.toContain("Issue reference search failed.");

    const mentionHtml = renderToStaticMarkup(
      <IssueMentionUserSuggestions
        onSelect={() => undefined}
        state={{
          items: [
            {
              avatarUrl: "/avatars/door.png",
              displayName: "Door User",
              loginId: "door",
              searchText: "Door User door",
              type: "user",
            },
          ],
          status: "loaded",
          truncated: true,
        }}
      />,
    );
    expect(mentionHtml).toContain("Door User");
    expect(mentionHtml).toContain("@door");
    expect(mentionHtml).not.toContain("More matches available");

    const referenceHtml = renderToStaticMarkup(
      <IssueReferenceSuggestions
        onSelect={() => undefined}
        state={{
          items: [{ issueNumber: 17, state: "open", title: "Reference issue" }],
          status: "loaded",
          truncated: true,
        }}
      />,
    );
    expect(referenceHtml).toContain("#17");
    expect(referenceHtml).toContain("Reference issue");
    expect(referenceHtml).not.toContain("No matching issues");
    expect(referenceHtml).not.toContain("More matches available");
  });

  it("keeps assignee suggestion selection, manual assign, and blank unassign on the existing submit flow", async () => {
    const assigned: string[] = [];
    const onSubmit = async (loginId: string) => {
      assigned.push(loginId);
    };

    await submitIssueAssigneeSuggestion(
      {
        avatarUrl: "",
        displayName: "Guest User",
        loginId: "guest",
        pureNameOnly: "Guest",
        type: "user",
      },
      onSubmit,
    );
    await submitIssueAssigneeText("  member  ", onSubmit);
    await submitIssueAssigneeText("   ", onSubmit);

    expect(assigned).toEqual(["guest", "member", ""]);
    expect(shouldSearchIssueAssignee("")).toBe(false);
    expect(shouldSearchIssueAssignee("   ")).toBe(false);
    expect(shouldSearchIssueAssignee("do")).toBe(true);
  });

  it("detects and inserts issue mention tokens without triggering issue-number autocomplete", () => {
    expect(ISSUE_MENTION_SEARCH_DEBOUNCE_MS).toBe(300);
    expect(findIssueMentionQuery("cc @do")).toBe("do");
    expect(findIssueMentionQuery("cc @")).toBe("");
    expect(findIssueMentionQuery("cc #12")).toBeNull();
    expect(findIssueReferenceQuery("cc #12")).toBe("12");
    expect(findIssueReferenceQuery("cc #")).toBe("");
    expect(findIssueReferenceQuery("mail@example.com")).toBeNull();
    expect(findIssueMentionQuery("mail@example.com")).toBeNull();

    const projectMention = {
      avatarUrl: "",
      displayName: "projectYobi",
      loginId: "owner/projectYobi",
      searchText: "owner/projectYobi/project/member/all",
      type: "project" as const,
    };

    expect(issueMentionTextForItem(projectMention)).toBe("@owner/projectYobi");
    expect(insertIssueMentionText("cc @owner/pro please", 13, projectMention)).toEqual({
      cursorIndex: 21,
      value: "cc @owner/projectYobi please",
    });

    const issueReference = {
      issueNumber: 12,
      state: "open",
      title: "Issue reference target",
    };
    expect(issueReferenceTextForItem(issueReference)).toBe("#12");
    expect(insertIssueReferenceText("cc #1 please", 5, issueReference)).toEqual({
      cursorIndex: 6,
      value: "cc #12 please",
    });
    expect(insertIssueReferenceText("cc #1", 5, issueReference)).toEqual({
      cursorIndex: 7,
      value: "cc #12 ",
    });
  });

  it("renders create and edit issue forms with project-scoped autocomplete wiring", () => {
    const getIssueReferencesQueryOptions = (query: string) => ({
      queryFn: async () => ({ items: [], total: 0, truncated: false }),
      queryKey: ["test", query] as const,
    });
    const createHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={{
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        getIssueReferencesQueryOptions={getIssueReferencesQueryOptions}
        initialBodyMarkdown="Source comment body"
        initialParentIssueId={31}
        mode="create"
        onSearchAssignableUsers={async () => ({ items: [], total: 0, truncated: false })}
        onSubmit={async () => undefined}
        parentIssueOptions={[{ id: 31, issueNumber: 12, selected: true, title: "Parent issue" }]}
        referCommentId="55"
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );
    expect(createHtml).toContain('name="assigneeLoginId"');
    expect(createHtml).toContain('name="body"');
    expect(createHtml).toContain('name="referCommentId"');
    expect(createHtml).toContain('name="parentIssueId"');
    expect(createHtml).toContain('<option value="31" selected="">#12. Parent issue</option>');
    expect(createHtml).toContain('value="55"');
    expect(createHtml).toContain("Source comment body");
    expect(createHtml).toContain('placeholder="No assignee"');
    expect(createHtml).toContain('<h1 class="sr-only">New issue</h1>');
    expect(createHtml).not.toContain("New Issue");
    expect(createHtml).not.toContain("Searching…");

    const editHtml = renderToStaticMarkup(
      <ProjectIssueFormPage
        detail={null}
        initialIssue={
          {
            assigneeLoginId: "guest",
            bodyMarkdown: "Existing body",
            title: "Existing issue",
          } as ProjectIssueDetailViewModel
        }
        getIssueReferencesQueryOptions={getIssueReferencesQueryOptions}
        mode="edit"
        onSearchAssignableUsers={async () => ({ items: [], total: 0, truncated: false })}
        onSubmit={async () => undefined}
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }}
      />,
    );
    expect(editHtml).toContain('value="guest"');
    expect(editHtml).toContain('<h1 class="sr-only">Edit</h1>');
    expect(editHtml).not.toContain("Edit Issue");
  });

  it("builds create and edit issue submit payloads with selected, manual, and blank assignee values", () => {
    expect(
      buildProjectIssueFormSubmitInput({
        assigneeLoginId: "guest",
        attachmentIds: [5],
        bodyMarkdown: "Body",
        dueDate: "2026-08-01",
        isDraft: true,
        labelIds: [7],
        milestoneId: 9,
        parentIssueId: 31,
        title: "  New issue  ",
      }),
    ).toEqual({
      assigneeLoginId: "guest",
      attachmentIds: [5],
      bodyMarkdown: "Body",
      dueDate: "2026-08-01",
      isDraft: true,
      isPublish: false,
      labelIds: [7],
      milestoneId: 9,
      parentIssueId: 31,
      title: "New issue",
    });

    expect(
      buildProjectIssueFormSubmitInput({
        assigneeLoginId: "  member  ",
        bodyMarkdown: "Updated",
        title: "Edit issue",
      }),
    ).toEqual({
      assigneeLoginId: "member",
      attachmentIds: [],
      bodyMarkdown: "Updated",
      dueDate: "",
      isDraft: false,
      isPublish: false,
      labelIds: [],
      milestoneId: 0,
      parentIssueId: 0,
      title: "Edit issue",
    });

    expect(
      buildProjectIssueFormSubmitInput({
        assigneeLoginId: "   ",
        bodyMarkdown: "Updated",
        title: "Edit issue",
      }),
    ).toEqual({
      assigneeLoginId: "",
      attachmentIds: [],
      bodyMarkdown: "Updated",
      dueDate: "",
      isDraft: false,
      isPublish: false,
      labelIds: [],
      milestoneId: 0,
      parentIssueId: 0,
      title: "Edit issue",
    });

    expect(
      buildProjectIssueFormSubmitInput({
        assigneeLoginId: "guest",
        bodyMarkdown: "Body",
        isPublish: true,
        title: "Publish draft",
      }),
    ).toEqual({
      assigneeLoginId: "guest",
      attachmentIds: [],
      bodyMarkdown: "Body",
      dueDate: "",
      isDraft: false,
      isPublish: true,
      labelIds: [],
      milestoneId: 0,
      parentIssueId: 0,
      title: "Publish draft",
    });

    expect(
      buildProjectIssueFormSubmitInput({
        assigneeLoginId: "guest",
        bodyMarkdown: "Body",
        title: "   ",
      }),
    ).toBeNull();
  });

  it("keeps shared issue viewers on read/comment controls without issue mutation controls", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        viewerCanDelete: false,
        viewerCanManageSharers: false,
        viewerCanUpdate: false,
      },
      {
        onCommentSubmit: async () => undefined,
      },
    );

    expect(html).toContain("Issue Sharer");
    expect(html).toContain('id="sharer-list"');
    expect(html).toContain('class="text-ellipsis sharer-item"');
    expect(html).toContain('href="/yona/guest"');
    expect(html).toContain("Guest User");
    expect(html).not.toContain("issue.sharer");
    expect(html).toContain('id="comment-form"');
    expect(html).toContain('action="/yona/owner/projectYobi/issue/1/comments"');
    expect(html).toContain('id="dynamic-comment-btn"');
    expect(html).toContain("Add a comment");
    expect(html).not.toContain("Leave a comment");
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1/editform"');
    expect(html).toContain('title="See text"');
    expect(html).not.toContain(">Close<");
    expect(html).not.toContain(">Assign<");
    expect(html).not.toContain(">Delete<");
  });

  it("renders the legacy favorite issue star beside the issue title", () => {
    const html = renderIssueDetailPage(
      {
        isFavorited: true,
        viewerCanComment: true,
      },
      {
        onFavoriteToggle: async () => undefined,
      },
    );

    expect(html).toContain("Shared issue");
    expect(html).toContain("favorite-issue");
    expect(html).toContain("starred");
    expect(html).toContain('aria-label="Favorite"');
    expect(html).not.toContain('aria-label="Unfavorite issue"');
  });

  it("renders legacy issue author info with avatar", () => {
    const html = renderIssueDetailPage({});

    expect(html).toContain('class="author-info"');
    expect(html).toContain('class="usf-group"');
    expect(html).toContain('class="avatar-wrap smaller"');
    expect(html).toContain('src="https://cdn.yona/avatar-owner.png"');
    expect(html).toContain('class="name"');
    expect(html).toContain('class="loginid"');
    expect(html).toContain("@</strong>owner");
  });

  it("renders legacy issue assignee info with avatar", () => {
    const html = renderIssueDetailPage({
      assigneeAvatarUrl: "https://cdn.yona/avatar-door.png",
      assigneeLabel: "Door User",
      assigneeLoginId: "door",
    });

    expect(html).toContain('class="assignee-info"');
    expect(html).toContain('href="/yona/door"');
    expect(html).toContain('src="https://cdn.yona/avatar-door.png"');
    expect(html).toContain("Door User");
    expect(html).toContain("@</strong>door");
  });

  it("renders legacy issue no-assignee marker when unassigned", () => {
    const html = renderIssueDetailPage({});

    expect(html).toContain('class="assignee-info"');
    expect(html).toContain("No assignee");
  });

  it("renders updateable issue assignee control with legacy select2 anchors", () => {
    const html = renderIssueDetailPage(
      {
        assigneeLoginId: "",
        viewerCanUpdate: true,
      },
      {
        onAssign: async () => undefined,
      },
    );

    expect(html).toContain('id="assignee"');
    expect(html).toContain('class="bigdrop"');
    expect(html).toContain('name="assigneeLoginId"');
    expect(html).toContain('placeholder="No assignee"');
    expect(html).toContain('style="width:100%"');
    expect(html).not.toContain('placeholder="Assignee"');
    expect(html).not.toContain(">Assign<");
  });

  it("renders issue comment agreement count, voters, and agree action", () => {
    const html = renderIssueDetailPage(
      {
        commentCount: 1,
        viewerCanComment: true,
        timeline: [
          {
            comment: {
              authorAvatarUrl: "https://cdn.yona/avatar-owner.png",
              authorLabel: "Owner User",
              authorLoginId: "owner",
              contentsHtml: "",
              contentsMarkdown: "Useful comment",
              createdLabel: "now",
              id: 10,
              viewerCanDelete: false,
              viewerCanUpdate: false,
              viewerHasVoted: false,
              voterCount: 2,
              viaEmail: true,
              voters: [
                {
                  avatarUrl: "https://cdn.yona/avatar-guest.png",
                  loginId: "guest",
                  userId: 2,
                  userLabel: "Guest User",
                },
              ],
            },
            createdLabel: "now",
            eventType: "",
            id: 10,
            kind: "comment",
            newValue: "",
            oldValue: "",
            senderLoginId: "",
          },
        ],
      },
      {
        onCommentVoteToggle: async () => undefined,
      },
    );

    expect(html).toContain('class="board-comment-wrap"');
    expect(html).toContain('class="comments"');
    expect(html).toContain('class="comment-avatar"');
    expect(html).toContain('class="avatar-wrap"');
    expect(html).toContain('src="https://cdn.yona/avatar-owner.png"');
    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('class="comment_author"');
    expect(html).toContain('class="ago"');
    expect(html).toContain("2 Agreements");
    expect(html).toContain("Guest User");
    expect(html).toContain("comment-vote");
    expect(html).toContain('data-via-email="true"');
    expect(html).toContain('aria-label="Agree"');
    expect(html).not.toContain('aria-label="Agree with comment"');
    expect(html).toContain("vote-heart-off");
  });

  it("renders voted issue comment state as withdraw action", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        timeline: [
          {
            comment: {
              authorAvatarUrl: "https://cdn.yona/avatar-owner.png",
              authorLabel: "Owner User",
              authorLoginId: "owner",
              contentsHtml: "",
              contentsMarkdown: "Already agreed",
              createdLabel: "now",
              id: 11,
              viewerCanDelete: false,
              viewerCanUpdate: false,
              viewerHasVoted: true,
              voterCount: 1,
              voters: [
                {
                  avatarUrl: "https://cdn.yona/avatar-door.png",
                  loginId: "door",
                  userId: 3,
                  userLabel: "Door User",
                },
              ],
            },
            createdLabel: "now",
            eventType: "",
            id: 11,
            kind: "comment",
            newValue: "",
            oldValue: "",
            senderLoginId: "",
          },
        ],
      },
      {
        onCommentVoteToggle: async () => undefined,
      },
    );

    expect(html).toContain("1 Agreement");
    expect(html).toContain('aria-label="Withdraw"');
    expect(html).not.toContain('aria-label="Withdraw comment agreement"');
    expect(html).toContain("vote-heart-on");
  });

  it("creates centered avatar crop defaults and preview styles", () => {
    const crop = createDefaultAvatarCrop(640, 480);
    expect(crop).toEqual({
      size: 480,
      x: 80,
      y: 0,
    });

    expect(getAvatarCropPreviewStyle(crop, 640, 480)).toEqual({
      height: "128px",
      marginLeft: "-21px",
      marginTop: "0px",
      width: "171px",
    });
  });

  it("draws the selected avatar crop into a 128px canvas", () => {
    const drawImage = vi.fn();
    const canvas = {
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage,
      })),
      height: 128,
      width: 128,
    } as unknown as HTMLCanvasElement;
    const image = {
      naturalHeight: 480,
      naturalWidth: 640,
    } as HTMLImageElement;

    drawAvatarCropToCanvas(canvas, image, {
      size: 480,
      x: 80,
      y: 0,
    });

    expect(drawImage).toHaveBeenCalledWith(image, 80, 0, 480, 480, 0, 0, 128, 128);
  });
});

function renderIssueDetailPage(
  overrides: Partial<ProjectIssueDetailViewModel> & {
    viewerCanManageSharers?: boolean;
  },
  extraProps: Record<string, unknown> = {},
) {
  const issue = {
    assigneeAvatarUrl: "",
    assigneeLabel: "",
    assigneeLoginId: "",
    attachments: [],
    authorAvatarUrl: "https://cdn.yona/avatar-owner.png",
    authorLabel: "Owner User",
    authorLoginId: "owner",
    bodyHtml: "",
    bodyMarkdown: "Body",
    commentCount: 0,
    comments: [],
    hasVoted: false,
    historyHtml: "",
    historyMarkdown: "",
    isFavorited: false,
    isWatching: false,
    issueNumber: 1,
    labels: [],
    milestoneTitle: "",
    ownerName: "owner",
    projectName: "projectYobi",
    sharers: [{ loginId: "guest", userId: 2, userLabel: "Guest User" }],
    state: "open",
    timeline: [],
    title: "Shared issue",
    viewerCanComment: false,
    viewerCanDelete: false,
    viewerCanManageSharers: false,
    viewerCanUpdate: false,
    voterCount: 0,
    watcherCount: 0,
    ...overrides,
  } as unknown as ProjectIssueDetailViewModel;

  return renderToStaticMarkup(
    React.createElement(ProjectIssueDetailPage, {
      detail: {
        enrollmentRequested: false,
        isFavorited: false,
        organizationName: "",
        overview: "",
        ownerName: "owner",
        projectName: "projectYobi",
        projectScope: "private",
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      },
      issue,
      messages: testLegacyMessages,
      runtimeConfig: { apiBaseUrl: "/yona/api", basePath: "/yona" },
      ...extraProps,
    }),
  );
}

describe("resolvePostAuthHref", () => {
  it("prefers redirect query, then saved default landing, then /me", () => {
    expect(resolvePostAuthHref("/owner/project/pulls/1", "/search?pageSize=20&scope=global")).toBe(
      "/owner/project/pulls/1",
    );
    expect(resolvePostAuthHref(null, "/search?pageSize=20&scope=global")).toBe(
      "/search?pageSize=20&scope=global",
    );
    expect(resolvePostAuthHref(null, null)).toBe("/me");
  });
});

describe("resolveAuthRedirectPath", () => {
  it("prefers redirectUrl, then redirect, then null", () => {
    expect(resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2Fadmin%2FprojectYobi"))).toBe(
      "/admin/projectYobi",
    );
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirect=%2Fsearch%3Fscope%3Dglobal")),
    ).toBe("/search?scope=global");
    expect(resolveAuthRedirectPath(new URLSearchParams(""))).toBeNull();
  });

  it("rejects external or protocol-relative redirect targets", () => {
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=https%3A%2F%2Fevil.example")),
    ).toBeNull();
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2F%2Fevil.example")),
    ).toBeNull();
  });
});
