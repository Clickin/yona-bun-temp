import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthWorkspaceShell } from "./auth-workspace-shell";
import { routeDocumentTitle } from "./route-table";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

function expectOrderedText(html: string, orderedSnippets: string[]) {
  let previousIndex = -1;
  for (const snippet of orderedSnippets) {
    const nextIndex = html.indexOf(snippet);
    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

describe("route parity harness", () => {
  it("keeps the public home title and entry CTA/navigation order stable", () => {
    const route = { kind: "public-home", href: "/" } as const;
    const html = renderToString(
      <AuthWorkspaceShell route={route} runtimeConfig={runtimeConfig} workspaceOverview={null} />,
    );

    expect(routeDocumentTitle(route)).toBe("Yona");
    expect(html).toContain("Legacy Route Foundation");
    expectOrderedText(html, [
      'href="/yona/users/loginform"',
      'href="/yona/users/signupform"',
      'href="/yona/projects"',
      'href="/yona/orgs"',
      'href="/yona/search?pageSize=20&amp;scope=global"',
    ]);
  });

  it("pins project directory title, empty-state copy, and primary search CTA", () => {
    const route = { kind: "public-projects", href: "/projects?pageNum=1" } as const;
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          projectDirectory: { items: [] },
          route,
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(routeDocumentTitle(route)).toBe("Project List");
    expect(html).toContain('action="/yona/projects"');
    expect(html).toContain(">Search<");
    expect(html).toContain("No public projects found.");
  });

  it("pins organization directory title, empty-state copy, and primary search CTA", () => {
    const route = { kind: "public-organizations", href: "/orgs?pageNum=1" } as const;
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          organizationDirectory: { items: [] },
          route,
          runtimeConfig,
          workspaceOverview: null,
        } as any)}
      />,
    );

    expect(routeDocumentTitle(route)).toBe("Organization List");
    expect(html).toContain('action="/yona/orgs"');
    expect(html).toContain(">Search<");
    expect(html).toContain("No organizations found.");
  });

  it("pins canonical user settings paths and account-settings tab order", () => {
    const route = {
      kind: "workspace-settings",
      href: "/user/editform/password",
      section: "password",
    } as const;
    const html = renderToString(
      <AuthWorkspaceShell
        {...({
          route,
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

    expect(routeDocumentTitle(route)).toBe("Account Settings");
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
