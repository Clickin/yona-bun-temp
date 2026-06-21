import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { PublicUserProfilePage, WorkspacePage } from "./routes/-workspace-views";
import type { WorkspaceOverviewViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const overview: WorkspaceOverviewViewModel = {
  defaultLandingPath: "/me",
  daysAgo: 14,
  emails: [],
  favoriteProjects: [],
  issueItems: [
    {
      assigneeLabel: "",
      authorLabel: "Door",
      commentCount: 0,
      issueNumber: 1,
      ownerName: "yona",
      projectName: "projectYobi",
      state: "open",
      title: "Workspace issue",
      updatedLabel: "2026-06-21",
    },
  ],
  memberProjects: [
    {
      createdLabel: "2026-06-21",
      lastPushedLabel: "",
      memberCount: 2,
      ownerName: "yona",
      overview: "Project overview",
      projectName: "projectYobi",
      projectScope: "public",
      watchCount: 1,
    },
  ],
  profile: {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: "Door",
    englishName: "Door",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "door",
    primaryEmailAddress: "door@example.com",
    sinceLabel: "2026-06-21",
  },
  pullRequestItems: [
    {
      commentCount: 0,
      contributorLabel: "Door",
      ownerName: "yona",
      projectName: "projectYobi",
      pullRequestNumber: 2,
      receiverLabel: "",
      state: "open",
      title: "Workspace pull request",
      updatedLabel: "2026-06-21",
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
  watchedProjects: [],
};

function renderWorkspace(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <WorkspacePage
      messages={messages}
      runtimeConfig={testRuntimeConfig}
      workspaceOverview={overview}
    />,
  );
}

function renderProfile(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <PublicUserProfilePage
      messages={messages}
      profileOverview={overview}
      routeHref="/door"
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

describe("workspace/profile legacy i18n opt-in", () => {
  it("keeps workspace and public profile tab fallback keys without a runtime provider", () => {
    const workspaceHtml = renderWorkspace();
    const profileHtml = renderProfile();

    for (const html of [workspaceHtml, profileHtml]) {
      expect(html).toContain(">menu.issue <span");
      expect(html).toContain(">menu.pullRequest <span");
      expect(html).toContain(">project.projects <span");
    }
  });

  it("uses default English legacy messages for workspace and profile tabs", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const workspaceHtml = renderWorkspace(runtime.t);
    const profileHtml = renderProfile(runtime.t);

    for (const html of [workspaceHtml, profileHtml]) {
      expect(html).toContain(">Issue <span");
      expect(html).toContain(">Pull request <span");
      expect(html).toContain(">projects <span");
      expect(html).not.toContain(">menu.issue <span");
      expect(html).not.toContain(">menu.pullRequest <span");
    }
  });

  it("switches workspace and profile tabs to a non-default legacy language", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const workspaceHtml = renderWorkspace(runtime.t);
    const profileHtml = renderProfile(runtime.t);

    for (const html of [workspaceHtml, profileHtml]) {
      expect(html).toContain(">이슈 <span");
      expect(html).toContain(">코드 주고받기 <span");
      expect(html).toContain(">프로젝트 <span");
      expect(html).not.toContain(">Issue <span");
    }
  });

  it("passes AppRuntimeContext message lookup into the route shells", () => {
    const meRoute = fs.readFileSync(path.resolve(__dirname, "routes/me/route.tsx"), "utf8");
    const publicProfileRoute = fs.readFileSync(
      path.resolve(__dirname, "routes/$user/route.tsx"),
      "utf8",
    );

    expect(meRoute).toContain("messages,");
    expect(meRoute).toContain("messages={messages}");
    expect(publicProfileRoute).toContain("messages,");
    expect(publicProfileRoute).toContain("messages={messages}");
  });
});
