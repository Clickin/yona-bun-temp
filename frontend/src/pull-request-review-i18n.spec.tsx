import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { ProjectPullRequestDetailPage, PullRequestChangesPage } from "./routes/-pull-request-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

const detail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const pullRequest = {
  bodyHtml: "",
  bodyMarkdown: "Pull request body",
  commits: [],
  conflict: false,
  contributor: {
    avatarUrl: "/yona/avatar/owner.png",
    loginId: "owner",
    userId: 1,
    userLabel: "Owner User",
  },
  createdLabel: "now",
  events: [],
  fromBranch: "topic/pr",
  fromOwnerName: "owner",
  fromProjectName: "projectYobi",
  id: 1,
  isWatching: false,
  lackingReviewerCount: 0,
  mergedCommitIdFrom: "base",
  mergedCommitIdTo: "abcdef123456",
  ownerName: "owner",
  permissions: {
    canComment: true,
    canDeleteSourceBranch: false,
    canRead: true,
    canReadChanges: true,
    canReview: true,
    canRestoreSourceBranch: false,
    canUpdate: true,
    canUpdateState: true,
  },
  projectName: "projectYobi",
  pullRequestNumber: 1,
  receiver: {
    avatarUrl: "/yona/avatar/reviewer.png",
    loginId: "reviewer",
    userId: 2,
    userLabel: "Reviewer",
  },
  requiredReviewerCount: 0,
  reviewed: false,
  reviewers: [],
  sourceBranchExists: true,
  state: "open",
  threads: [],
  title: "PR detail",
  toBranch: "main",
  updatedLabel: "",
  watcherCount: 0,
};

function renderPullRequestDetail(messages?: ReturnType<typeof createLegacyI18nRuntime>["t"]) {
  return renderToStaticMarkup(
    <ProjectPullRequestDetailPage
      detail={detail}
      messages={messages}
      pullRequest={pullRequest}
      runtimeConfig={runtimeConfig}
      viewerId={1}
      onClose={async () => {}}
      onReview={async () => {}}
      onWatchToggle={async () => {}}
    />,
  );
}

describe("pull request review legacy i18n opt-in", () => {
  it("lets the project layout own PR detail chrome without changing the legacy body", () => {
    const html = renderToStaticMarkup(
      <ProjectPullRequestDetailPage
        detail={detail}
        pullRequest={pullRequest}
        renderShell={false}
        runtimeConfig={runtimeConfig}
        viewerId={1}
        onClose={async () => {}}
        onReview={async () => {}}
        onWatchToggle={async () => {}}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const detailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );

    expect(layoutSource).toContain("isPullRequestDetailPath(appPath, owner, projectName)");
    expect(layoutSource).toContain('activeMenu: "pullRequest"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    expect(detailRouteSource).toContain("renderShell={false}");
    expect(detailRouteSource).toContain("useRouterState");
    expect(detailRouteSource).not.toContain("window.location.pathname");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="board-header issue"');
    expect(html).toContain('class="board-body"');
    expect(html).not.toContain("app-shell pull-request-page");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the project layout own PR changes chrome without changing the legacy body", () => {
    const html = renderToStaticMarkup(
      <PullRequestChangesPage
        changes={undefined}
        detail={detail}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const changesRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
      ),
      "utf8",
    );
    const commitRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/$commitId/route.tsx",
      ),
      "utf8",
    );

    expect(layoutSource).toContain("isPullRequestChangesPath(appPath, owner, projectName)");
    expect(layoutSource).toContain('activeMenu: "pullRequest"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    expect(changesRouteSource).toContain("renderShell={false}");
    expect(commitRouteSource).toContain("PullRequestChangesRouteContent");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="code-browse-wrap"');
    expect(html).toContain('class="codediff-wrap mt10 diffs-only"');
    expect(html).not.toContain("app-shell pull-request-page");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("uses default legacy messages without runtime messages", () => {
    const html = renderPullRequestDetail();

    expect(html).toContain("&lt;strong&gt;0&lt;/strong&gt; participants");
    expect(html).not.toContain("pullRequest.review.participants 0");
    expect(html).toContain(">Approve</button>");
    expect(html).toContain(">Merge</a>");
    expect(html).toContain("<span>This pull request can be merged safely.</span>");
    expect(html).toContain(">Edit</a>");
    expect(html).toContain(">Close</a>");
  });

  it("uses Korean legacy messages for review controls when provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderPullRequestDetail(runtime.t);

    expect(html).toContain(">리뷰 승인</button>");
    expect(html).toContain(">코드 병합</a>");
    expect(html).toContain("<span>코드를 안전하게 자동으로 병합할 수 있습니다.</span>");
    expect(html).toContain(">수정</a>");
    expect(html).toContain(">닫기</a>");
    expect(html).not.toContain(">pullRequest.review</button>");
    expect(html).not.toContain(">button.edit</a>");
  });
});
