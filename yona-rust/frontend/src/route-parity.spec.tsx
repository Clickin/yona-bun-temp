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
    const routeTreeSource = fs.readFileSync(
      path.resolve(__dirname, "routeTree.gen.ts"),
      "utf8",
    );

    expect(routeTreeSource).toContain("fullPath: '/users/loginform'");
    expect(routeTreeSource).toContain("fullPath: '/users/signupform'");
    expect(routeTreeSource).toContain("fullPath: '/lostPassword'");
    expect(routeTreeSource).toContain("fullPath: '/resetPassword'");
    expect(routeTreeSource).toContain("fullPath: '/projects'");
    expect(routeTreeSource).toContain("fullPath: '/orgs'");
    expect(routeTreeSource).toContain("fullPath: '/user/editform'");
    expect(routeTreeSource).toContain("fullPath: '/verify/$loginId/$verificationCode'");
    expect(routeTreeSource).toContain("fullPath: '/login'");
    expect(routeTreeSource).toContain("fullPath: '/register'");
    expect(routeTreeSource).toContain("fullPath: '/forgot-password'");
    expect(routeTreeSource).toContain("fullPath: '/reset-password'");
    expect(routeTreeSource).toContain("fullPath: '/me/settings/profile'");
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
