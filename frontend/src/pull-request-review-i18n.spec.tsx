import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { ProjectPullRequestDetailPage } from "./routes/-pull-request-views";
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
  it("keeps literal key fallbacks without runtime messages", () => {
    const html = renderPullRequestDetail();

    expect(html).toContain("pullRequest.review.participants");
    expect(html).not.toContain("pullRequest.review.participants 0");
    expect(html).toContain(">pullRequest.review</button>");
    expect(html).toContain(">pullRequest.merge</a>");
    expect(html).toContain("<span>pullRequest.is.safe</span>");
    expect(html).toContain(">button.edit</a>");
    expect(html).toContain(">pullRequest.close</a>");
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
