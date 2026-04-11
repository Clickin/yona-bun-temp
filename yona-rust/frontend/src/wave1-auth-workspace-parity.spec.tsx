import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthWorkspaceShell } from "./auth-workspace-shell";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

describe("wave 1 auth and workspace parity", () => {
  it("renders legacy auth links and password-reset request fields", () => {
    const loginHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "login", href: "/users/loginform" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(loginHtml).toContain('action="/yona/users/login"');
    expect(loginHtml).toContain('href="/yona/lostPassword"');

    const registerHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "register", href: "/users/signupform" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(registerHtml).toContain('action="/yona/users/signup"');
    expect(registerHtml).toContain('href="/yona/users/loginform"');

    const lostPasswordHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "lost-password", href: "/lostPassword" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(lostPasswordHtml).toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain(">Confirm<");

    const resetPasswordHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "reset-password", href: "/resetPassword" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(resetPasswordHtml).toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain(">Confirm<");
  });

  it("renders capability-driven auth help messaging", () => {
    const socialLoginHtml = renderToString(
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

    expect(socialLoginHtml).toContain("Social login only");
    expect(socialLoginHtml).not.toContain('name="loginIdOrEmail"');
    expect(socialLoginHtml).not.toContain('name="password"');
  });

  it("renders the legacy /me tabs and account-setting tab menu scaffolding", () => {
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

    expect(html).toContain(">Issues<");
    expect(html).toContain(">Pull Requests<");
    expect(html).toContain(">Projects<");
    expect(html).toContain(">Edit Profile<");
    expect(html).toContain(">Change Password<");
    expect(html).toContain(">Notifications<");
    expect(html).toContain(">Emails<");
    expect(html).toContain(">Token<");
  });

  it("renders workspace settings deep links with section-specific bodies", () => {
    const profileHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "workspace-settings", href: "/user/editform", section: "profile" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={{
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
        }}
      />,
    );
    expect(profileHtml).toContain("Account Settings");
    expect(profileHtml).toContain('action="/yona/user/edit"');
    expect(profileHtml).toContain('name="loginId"');
    expect(profileHtml).toContain('name="name"');
    expect(profileHtml).toContain('name="email"');
    expect(profileHtml).toContain('name="filePath"');
    expect(profileHtml).toContain('action="/yona/user/resetVisitedList"');
    expect(profileHtml).toContain("Reset visited project list");

    const notificationsHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "workspace-settings", href: "/user/editform/notifications", section: "notifications" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={{
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
        }}
      />,
    );
    expect(notificationsHtml).toContain("Notifications");
    expect(notificationsHtml).toContain("Watched Projects");
    expect(notificationsHtml).toContain("admin / projectYobi");
    expect(notificationsHtml).toContain('data-href="/yona/noti/toggle/1/NEW_ISSUE"');
    expect(notificationsHtml).toContain("New issue");
    expect(notificationsHtml).toContain("New comment");

    const emailsHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "workspace-settings", href: "/user/editform/emails", section: "emails" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={{
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
        }}
      />,
    );
    expect(emailsHtml).toContain('action="/yona/user/email"');
    expect(emailsHtml).toContain('name="email"');
    expect(emailsHtml).toContain(">Add<");
    expect(emailsHtml).toContain("Main Email");
    expect(emailsHtml).toContain("door@example.com");
    expect(emailsHtml).toContain("alt@example.com");
    expect(emailsHtml).toContain('data-request-uri="/yona/user/email/delete/2"');
    expect(emailsHtml).toContain('href="/yona/user/email/setAsMain/2"');
    expect(emailsHtml).toContain("Set as main");
    expect(emailsHtml).toContain("pending@example.com");
    expect(emailsHtml).toContain('href="/yona/user/email/sendValidationEmail/3"');
    expect(emailsHtml).toContain("Send validation mail");

    const tokenHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "workspace-settings", href: "/user/editform/token", section: "token" } as any}
        runtimeConfig={runtimeConfig}
        workspaceOverview={{
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
        }}
      />,
    );
    expect(tokenHtml).toContain('action="/yona/user/editform/token_reset"');
    expect(tokenHtml).toContain('name="name"');
    expect(tokenHtml).toContain('value="door-token"');
    expect(tokenHtml).toContain(">Recreate Token<");
  });
});
