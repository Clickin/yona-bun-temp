import { describe, expect, it } from "vitest";
import { resolveAuthRedirectPath, resolvePostAuthHref } from "./routes/-auth-views";
import {
  renderHome,
  renderLogin,
  renderLostPassword,
  renderOrganizationDetail,
  renderOrganizationDirectory,
  renderProjectDetail,
  renderProjectDirectory,
  renderRegister,
  renderResetPassword,
  renderWorkspace,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";

describe("auth and workspace views", () => {
  it("renders the canonical login shell with legacy field names and recovery link", () => {
    const html = renderLogin({
      routeHref: "/users/loginform?redirectUrl=/admin/projectYobi/issue/1",
    });

    expect(html).toContain("Login for Yona");
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('placeholder="Login ID or email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="rememberMe"');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/yona/users/login"');
    expect(html).toContain('name="redirectUrl"');
    expect(html).toContain('value="/admin/projectYobi/issue/1"');
    expect(html).toContain(">Login<");
    expect(html).toContain('href="/yona/lostPassword"');
  });

  it("renders the canonical signup shell with legacy labels and login link", () => {
    const html = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });

    expect(html).toContain("Sign Up for Yona");
    expect(html).toContain(">Login ID<");
    expect(html).toContain('name="loginId"');
    expect(html).toContain(">Name<");
    expect(html).toContain('name="name"');
    expect(html).toContain(">Email<");
    expect(html).toContain('name="emailAddress"');
    expect(html).toContain(">Password<");
    expect(html).toContain('name="password"');
    expect(html).toContain(">Retype password<");
    expect(html).toContain('name="retypedPassword"');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/yona/users/signup"');
    expect(html).toContain(">Sign up<");
    expect(html).toContain('href="/yona/users/loginform"');
  });

  it("renders lost-password and reset-password shells with legacy field layout", () => {
    const lostPasswordHtml = renderLostPassword("/lostPassword");
    expect(lostPasswordHtml).toContain("Reset Password for Yona");
    expect(lostPasswordHtml).toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain(">Confirm<");

    const resetPasswordHtml = renderResetPassword("/resetPassword");
    expect(resetPasswordHtml).toContain("Reset Password for Yona");
    expect(resetPasswordHtml).toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain('name="password"');
    expect(resetPasswordHtml).toContain('name="retypedPassword"');
    expect(resetPasswordHtml).toContain(">Confirm<");
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
    expect(loginHtml).toContain("Email verification is required");

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: true,
        socialLoginOnly: false,
      },
    });
    expect(registerHtml).toContain("Sign up requires confirmation");
  });

  it("renders login-side post-submit messages from auth query parameters", () => {
    const verifyHtml = renderLogin({ routeHref: "/users/loginform?verify=sent" });
    expect(verifyHtml).toContain("Confirmation request was accepted.");

    const requestedHtml = renderLogin({ routeHref: "/users/loginform?signup=requested" });
    expect(requestedHtml).toContain("Sign up requires confirmation.");
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
    expect(loginHtml).toContain("Social login only");
    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
    });
    expect(registerHtml).toContain("Social login only");
    expect(registerHtml).not.toContain('name="loginId"');
    expect(registerHtml).not.toContain('name="emailAddress"');
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

  it("renders the /me shell with default landing and workspace lists", () => {
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
    expect(html).toContain("admin");
    expect(html).toContain("projectYobi");
  });

  it("renders the public landing and directory views", () => {
    const homeHtml = renderHome();
    expect(homeHtml).toContain("Yona Rust Frontend");
    expect(homeHtml).toContain('href="/yona/users/loginform"');
    expect(homeHtml).toContain('href="/yona/users/signupform"');
    expect(homeHtml).toContain('href="/yona/projects"');
    expect(homeHtml).toContain('href="/yona/orgs"');

    const projectsHtml = renderProjectDirectory(
      {
        items: [
          {
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
          },
        ],
      },
      "/projects?filter=yobi&pageNum=1",
    );

    expect(projectsHtml).toContain("Project List");
    expect(projectsHtml).toContain('action="/yona/projects"');
    expect(projectsHtml).toContain("projectYobi");
    expect(projectsHtml).toContain("yobi");

    const organizationsHtml = renderOrganizationDirectory(
      {
        items: [
          {
            description: "web labs",
            organizationName: "weblabs",
          },
        ],
      },
      "/orgs?filter=lab&pageNum=1",
    );

    expect(organizationsHtml).toContain("Organization List");
    expect(organizationsHtml).toContain('action="/yona/orgs"');
    expect(organizationsHtml).toContain("weblabs");
    expect(organizationsHtml).toContain("web labs");
  });

  it("renders organization and project baseline views", () => {
    const orgHtml = renderOrganizationDetail({
      description: "web labs",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
    expect(orgHtml).toContain("weblabs");
    expect(orgHtml).toContain("web labs");

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
    expect(projectHtml).toContain("Request enrollment");
    expect(projectHtml).toContain("Favorite project");
  });

  it("renders workspace settings tabs with canonical legacy user-editform paths", () => {
    const html = renderWorkspaceSettings(
      "password",
      "/user/editform/password",
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

    expect(html).toContain('href="/yona/user/editform"');
    expect(html).toContain('href="/yona/user/editform/password"');
    expect(html).toContain('href="/yona/user/editform/notifications"');
    expect(html).toContain('href="/yona/user/editform/emails"');
    expect(html).toContain('href="/yona/user/editform/token"');
    expect(html).toContain('action="/yona/user/resetPassword"');
    expect(html).toContain('name="oldPassword"');
    expect(html).toContain('name="loginId"');
    expect(html).toContain('href="/yona/lostPassword"');
    expect(html).toContain("Change Password");
  });
});

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
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2Fadmin%2FprojectYobi")),
    ).toBe("/admin/projectYobi");
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
