import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AuthWorkspaceShell,
  resolveAuthRedirectPath,
  resolvePostAuthHref,
} from "./auth-workspace-shell";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

describe("AuthWorkspaceShell", () => {
  it("renders the canonical login shell with legacy field names and recovery link", () => {
    const html = renderToString(
      <AuthWorkspaceShell route={{ kind: "login", href: "/users/loginform?redirectUrl=/admin/projectYobi/issue/1" }} runtimeConfig={runtimeConfig} workspaceOverview={null} />,
    );

    expect(html).toContain("Login for Yona");
    expect(html).toContain("name=\"loginIdOrEmail\"");
    expect(html).toContain("placeholder=\"Login ID or email\"");
    expect(html).toContain("name=\"password\"");
    expect(html).toContain("name=\"rememberMe\"");
    expect(html).toContain("method=\"post\"");
    expect(html).toContain("action=\"/yona/users/login\"");
    expect(html).toContain("name=\"redirectUrl\"");
    expect(html).toContain("value=\"/admin/projectYobi/issue/1\"");
    expect(html).toContain(">Login<");
    expect(html).toContain("href=\"/yona/lostPassword\"");
  });

  it("renders the canonical signup shell with legacy labels and login link", () => {
    const html = renderToString(
      <AuthWorkspaceShell route={{ kind: "register", href: "/users/signupform" }} runtimeConfig={runtimeConfig} workspaceOverview={null} />,
    );

    expect(html).toContain("Sign Up for Yona");
    expect(html).toContain(">Login ID<");
    expect(html).toContain("name=\"loginId\"");
    expect(html).toContain(">Name<");
    expect(html).toContain("name=\"name\"");
    expect(html).toContain(">Email<");
    expect(html).toContain("name=\"emailAddress\"");
    expect(html).toContain(">Password<");
    expect(html).toContain("name=\"password\"");
    expect(html).toContain(">Retype password<");
    expect(html).toContain("name=\"retypedPassword\"");
    expect(html).toContain("method=\"post\"");
    expect(html).toContain("action=\"/yona/users/signup\"");
    expect(html).toContain(">Sign up<");
    expect(html).toContain("href=\"/yona/users/loginform\"");
  });

  it("renders lost-password and reset-password shells with legacy field layout", () => {
    const lostPasswordHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "lost-password", href: "/lostPassword" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(lostPasswordHtml).toContain("Reset Password for Yona");
    expect(lostPasswordHtml).toContain("action=\"/yona/lostPassword\"");
    expect(lostPasswordHtml).toContain("name=\"loginId\"");
    expect(lostPasswordHtml).toContain("name=\"emailAddress\"");
    expect(lostPasswordHtml).toContain(">Confirm<");

    const resetPasswordHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "reset-password", href: "/resetPassword" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(resetPasswordHtml).toContain("Reset Password for Yona");
    expect(resetPasswordHtml).toContain("action=\"/yona/resetPassword\"");
    expect(resetPasswordHtml).toContain("name=\"password\"");
    expect(resetPasswordHtml).toContain("name=\"retypedPassword\"");
    expect(resetPasswordHtml).toContain(">Confirm<");
  });

  it("renders auth capability help copy when email verification or signup confirmation is enabled", () => {
    const loginHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          authUiCapabilities: {
            emailVerificationEnabled: true,
            signupRequireConfirm: false,
            socialLoginOnly: false,
          },
          route: { kind: "login", href: "/users/loginform" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(loginHtml).toContain("Confirmation mail will be sent");

    const registerHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          authUiCapabilities: {
            emailVerificationEnabled: false,
            signupRequireConfirm: true,
            socialLoginOnly: false,
          },
          route: { kind: "register", href: "/users/signupform" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(registerHtml).toContain("Sign up requires confirmation");
  });

  it("renders login-side post-submit messages from auth query parameters", () => {
    const verifyHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          route: { kind: "login", href: "/users/loginform?verify=sent" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(verifyHtml).toContain("Confirmation mail will be sent.");

    const requestedHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          route: { kind: "login", href: "/users/loginform?signup=requested" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(requestedHtml).toContain("Sign up requires confirmation.");
  });

  it("hides local auth forms when social-login-only mode is enabled", () => {
    const loginHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          authUiCapabilities: {
            emailVerificationEnabled: false,
            signupRequireConfirm: false,
            socialLoginOnly: true,
          },
          route: { kind: "login", href: "/users/loginform" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(loginHtml).toContain("Social login only");
    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');

    const registerHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          authUiCapabilities: {
            emailVerificationEnabled: false,
            signupRequireConfirm: false,
            socialLoginOnly: true,
          },
          route: { kind: "register", href: "/users/signupform" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );
    expect(registerHtml).toContain("Social login only");
    expect(registerHtml).not.toContain('name="loginId"');
    expect(registerHtml).not.toContain('name="emailAddress"');
    expect(registerHtml).not.toContain('name="password"');
  });

  it("does not render local auth forms before auth capabilities resolve", () => {
    const loginHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          authUiCapabilities: null,
          route: { kind: "login", href: "/users/loginform" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');
  });

  it("renders a loading shell instead of protected workspace settings during bootstrap", () => {
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          bootstrapping: true,
          route: { kind: "workspace-settings", href: "/user/editform/password", section: "password" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(html).toContain("Loading...");
    expect(html).not.toContain("Account Settings");
    expect(html).not.toContain('name="currentPassword"');
  });

  it("renders the /me shell with default landing and workspace lists", () => {
    const html = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "me", href: "/me" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={{
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
        }}
      />,
    );

    expect(html).toContain("Workspace");
    expect(html).toContain("door");
    expect(html).toContain("admin");
    expect(html).toContain("projectYobi");
  });

  it("renders the public landing and directory shells instead of the unsupported fallback", () => {
    const homeHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          route: { kind: "public-home", href: "/" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(homeHtml).toContain("Yona Rust Frontend");
    expect(homeHtml).toContain('href="/yona/users/loginform"');
    expect(homeHtml).toContain('href="/yona/users/signupform"');
    expect(homeHtml).toContain('href="/yona/projects"');
    expect(homeHtml).toContain('href="/yona/orgs"');
    expect(homeHtml).not.toContain("Unsupported route");

    const projectsHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          projectDirectory: {
            items: [
              {
                overview: "Yona project",
                ownerName: "yobi",
                projectName: "projectYobi",
                projectScope: "public",
              },
            ],
          },
          route: { kind: "public-projects", href: "/projects?filter=yobi&pageNum=1" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(projectsHtml).toContain("Project List");
    expect(projectsHtml).toContain('action="/yona/projects"');
    expect(projectsHtml).toContain("projectYobi");
    expect(projectsHtml).toContain("yobi");
    expect(projectsHtml).not.toContain("Unsupported route");

    const organizationsHtml = renderToString(
      <AuthWorkspaceShell
        {...({
          organizationDirectory: {
            items: [
              {
                description: "web labs",
                organizationName: "weblabs",
              },
            ],
          },
          route: { kind: "public-organizations", href: "/orgs?filter=lab&pageNum=1" },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(organizationsHtml).toContain("Organization List");
    expect(organizationsHtml).toContain('action="/yona/orgs"');
    expect(organizationsHtml).toContain("weblabs");
    expect(organizationsHtml).toContain("web labs");
    expect(organizationsHtml).not.toContain("Unsupported route");
  });

  it("renders organization and project baseline shells", () => {
    const orgHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "organization-detail", href: "/organizations/weblabs", organizationName: "weblabs" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
        organizationDetail={{
          description: "web labs",
          organizationName: "weblabs",
          viewerCanUpdate: true,
        }}
      />,
    );
    expect(orgHtml).toContain("weblabs");
    expect(orgHtml).toContain("web labs");

    const projectHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "project-detail", href: "/admin/projectYobi", ownerName: "admin", projectName: "projectYobi" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
        projectDetail={{
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "Yona",
          ownerName: "admin",
          projectName: "projectYobi",
          projectScope: "public",
          viewerCanEnroll: true,
          viewerCanUpdate: false,
        }}
      />,
    );
    expect(projectHtml).toContain("admin/projectYobi");
    expect(projectHtml).toContain("Request enrollment");
    expect(projectHtml).toContain("Favorite project");
  });

  it("renders workspace settings tabs with canonical legacy user-editform paths", () => {
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          route: { kind: "workspace-settings", href: "/user/editform/password", section: "password" },
          runtimeConfig,
          workspaceOverview: {
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
        } as any)}
      />,
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

  it("renders legacy deep-link placeholders without falling back to unsupported route", () => {
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          route: {
            kind: "project-issues",
            href: "/admin/projectYobi/issues?pageNum=2",
            ownerName: "admin",
            projectName: "projectYobi",
          },
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(html).toContain("Issues");
    expect(html).toContain("/admin/projectYobi/issues?pageNum=2");
    expect(html).not.toContain("Unsupported route");
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

  it("rejects external or unsupported redirect targets", () => {
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=https%3A%2F%2Fevil.example")),
    ).toBeNull();
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2F%2Fevil.example")),
    ).toBeNull();
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2Ftotally-unsupported")),
    ).toBeNull();
  });
});
