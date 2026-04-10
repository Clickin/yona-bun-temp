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
    expect(loginHtml).toContain('href="/yona/lostPassword"');

    const registerHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "register", href: "/users/signupform" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
    expect(registerHtml).toContain('href="/yona/users/loginform"');

    const lostPasswordHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "lost-password", href: "/lostPassword" }}
        runtimeConfig={runtimeConfig}
        workspaceOverview={null}
      />,
    );
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
    expect(resetPasswordHtml).toContain(">Confirm<");
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
    expect(profileHtml).toContain('name="name"');
    expect(profileHtml).toContain('name="emailAddress"');

    const notificationsHtml = renderToString(
      <AuthWorkspaceShell
        route={{ kind: "workspace-settings", href: "/user/editform/notifications", section: "notifications" } as any}
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
    expect(notificationsHtml).toContain("Notifications");
    expect(notificationsHtml).toContain("Watched Projects");
  });
});
