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
      viewerCanEditProfile
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
      expect(html).toContain("userinfo.editProfile");
      expect(html).toContain("<strong>userinfo.since</strong>");
      expect(html).toContain("<strong>user.connected.social.login</strong>");
      expect(html).toContain(">userinfo.daysAgo.prefix</span>");
      expect(html).toContain(">userinfo.daysAgo.suffix</span>");
    }
    expect(profileHtml).toContain('title="common.two.column.mode"');
    expect(profileHtml).toContain('data-content="common.two.column.mode.desc"');
    expect(profileHtml).toContain('aria-label="common.two.column.view"');
    expect(profileHtml).toContain('class="two-column-mode-text">common.two.column.view</span>');
    expect(profileHtml).toContain('title="common.show.subtasks"');
    expect(profileHtml).toContain('data-content="common.show.subtasks.desc"');
    expect(profileHtml).toContain('aria-label="common.show.subtasks"');
    expect(profileHtml).toContain('class="show-subtasks-text">common.show.subtasks</span>');
    expect(workspaceHtml).toContain(">button.setDefaultLoginPage</h2>");
    expect(workspaceHtml).toContain(">button.setDefaultLoginPage.desc</span>");
    expect(workspaceHtml).toContain(">title.favorite</h2>");
    expect(workspaceHtml).toContain(">title.recently.visited</h2>");
    expect(workspaceHtml).toContain(">title.no.results</div>");
  });

  it("keeps empty stream and missing author fallback keys without a runtime provider", () => {
    const emptyOverview: WorkspaceOverviewViewModel = {
      ...overview,
      favoriteProjects: [],
      issueItems: [],
      memberProjects: [],
      pullRequestItems: [],
      recentProjects: [],
    };
    const missingAuthorOverview: WorkspaceOverviewViewModel = {
      ...overview,
      issueItems: [{ ...overview.issueItems![0], authorLabel: "" }],
      pullRequestItems: [{ ...overview.pullRequestItems![0], contributorLabel: "" }],
    };

    const emptyWorkspaceHtml = renderToStaticMarkup(
      <WorkspacePage runtimeConfig={testRuntimeConfig} workspaceOverview={emptyOverview} />,
    );
    const emptyProfileHtml = renderToStaticMarkup(
      <PublicUserProfilePage
        profileOverview={emptyOverview}
        routeHref="/door"
        runtimeConfig={testRuntimeConfig}
        viewerCanEditProfile
      />,
    );
    const missingAuthorHtml = renderToStaticMarkup(
      <PublicUserProfilePage
        profileOverview={missingAuthorOverview}
        routeHref="/door"
        runtimeConfig={testRuntimeConfig}
      />,
    );

    for (const html of [emptyWorkspaceHtml, emptyProfileHtml]) {
      expect(html).toContain(">userinfo.daysAgo.prefix issue.is.empty</p>");
      expect(html).toContain(">userinfo.daysAgo.prefix pullRequest.is.empty</p>");
      expect(html).toContain(">project.is.empty</p>");
    }
    expect(missingAuthorHtml).toContain(">issue.noAuthor</span>");
  });

  it("uses provided English legacy messages for workspace and profile controls", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const workspaceHtml = renderWorkspace(runtime.t);
    const profileHtml = renderProfile(runtime.t);

    for (const html of [workspaceHtml, profileHtml]) {
      expect(html).toContain(">Issue <span");
      expect(html).toContain(">Pull request <span");
      expect(html).toContain(">projects <span");
      expect(html).toContain("Edit profile");
      expect(html).toContain("<strong>Member since</strong>");
      expect(html).toContain("<strong>Connected Social Login</strong>");
      expect(html).toContain("> recently</span>");
      expect(html).toContain("> days ago</span>");
      expect(html).not.toContain(">menu.issue <span");
      expect(html).not.toContain(">menu.pullRequest <span");
    }
    expect(profileHtml).toContain('title="Two Column Mode"');
    expect(profileHtml).toContain('data-content="Splits list and body into columns respectively"');
    expect(profileHtml).toContain('aria-label="Column View"');
    expect(profileHtml).toContain('class="two-column-mode-text">Column View</span>');
    expect(profileHtml).toContain('title="Show subtask"');
    expect(profileHtml).toContain('data-content="Show subtask always"');
    expect(profileHtml).toContain('class="show-subtasks-text">Show subtask</span>');
    expect(workspaceHtml).toContain(">Set to default page</h2>");
    expect(workspaceHtml).toContain(">Make current page the index page when logged in</span>");
    expect(workspaceHtml).toContain(">Favorite</h2>");
    expect(workspaceHtml).toContain("> Recently visited</h2>");
    expect(workspaceHtml).toContain(">No results</div>");
  });

  it("switches workspace and profile controls to a non-default legacy language", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const workspaceHtml = renderWorkspace(runtime.t);
    const profileHtml = renderProfile(runtime.t);

    for (const html of [workspaceHtml, profileHtml]) {
      expect(html).toContain(">이슈 <span");
      expect(html).toContain(">코드 주고받기 <span");
      expect(html).toContain(">프로젝트 <span");
      expect(html).toContain("프로필 수정");
      expect(html).toContain("<strong>가입일</strong>");
      expect(html).toContain("<strong>연결된 소셜 로그인</strong>");
      expect(html).toContain("> 최근</span>");
      expect(html).toContain("> 일</span>");
      expect(html).not.toContain(">Issue <span");
    }
    expect(profileHtml).toContain('title="투 컬럼 모드"');
    expect(profileHtml).toContain('aria-label="2단 보기"');
    expect(profileHtml).toContain('class="two-column-mode-text">2단 보기</span>');
    expect(profileHtml).toContain('title="자식이슈 펼쳐보기"');
    expect(profileHtml).toContain('class="show-subtasks-text">자식이슈 펼쳐보기</span>');
    expect(workspaceHtml).toContain(">기본 페이지로 지정</h2>");
    expect(workspaceHtml).toContain(
      ">현재 페이지를 로그인 후 표시되는 기본 인덱스 페이지로 지정합니다</span>",
    );
    expect(workspaceHtml).toContain(">즐겨찾기</h2>");
    expect(workspaceHtml).toContain("> 최근 방문</h2>");
    expect(workspaceHtml).toContain(">결과 없음</div>");
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
