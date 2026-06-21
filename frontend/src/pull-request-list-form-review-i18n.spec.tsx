import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { createLegacyI18nRuntime } from "./i18n";
import {
  ProjectPullRequestFormPage,
  ProjectPullRequestListPage,
  ProjectReviewsPage,
} from "./routes/-pull-request-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const detail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  isForked: true,
  organizationName: "",
  overview: "",
  ownerName: "yobi",
  projectName: "yona",
  projectScope: "public",
  showPullRequest: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

function renderRemainingPullRequestControls(messages?: LegacyMessageLookup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ProjectPullRequestListPage
        category="open"
        detail={detail}
        list={{
          acceptedCount: 0,
          category: "open",
          closedCount: 0,
          contributors: [],
          items: [],
          openCount: 0,
          pageNum: 1,
          pageSize: 15,
          recentlyPushedBranches: [
            {
              branchName: "refs/heads/topic",
              defaultBranch: "main",
              id: 7,
              ownerName: "yobi",
              projectName: "yona",
              pushedLabel: "now",
              shortName: "topic",
            },
          ],
          sentCount: 0,
          totalCount: 0,
        }}
        messages={messages}
        query={{ category: "open", contributorId: 0, filter: "", pageNum: 1 }}
        runtimeConfig={testRuntimeConfig}
      />
      <ProjectPullRequestFormPage
        detail={detail}
        formOptions={{
          fromBranches: [],
          fromProjects: [],
          mode: "create",
          selected: { fromBranch: "", fromProjectId: 0, toBranch: "", toProjectId: 0 },
          toBranches: [],
          toProjects: [],
        }}
        messages={messages}
        mode="create"
        runtimeConfig={testRuntimeConfig}
        onSubmit={async () => {}}
      />
      <ProjectReviewsPage
        detail={detail}
        messages={messages}
        query={{
          authorId: 0,
          filter: "",
          orderBy: "createdDate",
          orderDir: "desc",
          pageNum: 1,
          participantId: 0,
          state: "open",
        }}
        reviews={{
          allCount: 0,
          authorCount: 0,
          closedCount: 0,
          items: [],
          openCount: 0,
          pageNum: 1,
          pageSize: 15,
          participantCount: 0,
          state: "open",
          totalCount: 0,
        }}
        runtimeConfig={testRuntimeConfig}
        viewerId={1}
      />
    </QueryClientProvider>,
  );
}

describe("PR list/form/review-list legacy i18n opt-in", () => {
  it("keeps literal key fallbacks without runtime messages", () => {
    const html = renderRemainingPullRequestControls();

    expect(html).toContain(">pullRequest.pushed.branches.title</h5>");
    expect(html).toContain(">pullRequest</a>");
    expect(html).toContain(">pullRequest.from");
    expect(html).toContain(">pullRequest.select.branch");
    expect(html).toContain(">title");
    expect(html).toContain(" pullRequest.menu.commit</span>");
    expect(html).toContain(">pullRequest.send</button>");
    expect(html).toContain(">button.cancel</a>");
    expect(html).toContain(">review.allReview");
    expect(html).toContain(">review.involvingYou");
    expect(html).toContain(">review.createdByYou");
    expect(html).toContain(">common.order.date</a>");
    expect(html).toContain(">issue.state.open");
    expect(html).toContain(">review.is.empty</p>");
    expect(html).toContain("issue.downloadAsExcel");
  });

  it("uses Korean legacy messages for the remaining controls when provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderRemainingPullRequestControls(runtime.t);

    expect(html).toContain(">최근 푸쉬된 브랜치</h5>");
    expect(html).toContain(">코드 보내기</a>");
    expect(html).toContain(">코드 보내는 곳");
    expect(html).toContain(">코드 받을 곳");
    expect(html).toContain(">브랜치를 선택하세요.");
    expect(html).toContain(">제목");
    expect(html).toContain(" 커밋</span>");
    expect(html).toContain(">코드 보내기</button>");
    expect(html).toContain(">취소</a>");
    expect(html).toContain(">모든 리뷰");
    expect(html).toContain(">참여한 리뷰");
    expect(html).toContain(">작성한 리뷰");
    expect(html).toContain(">날짜순</a>");
    expect(html).toContain(">열림");
    expect(html).toContain(">등록된 리뷰가 없습니다.</p>");
    expect(html).toContain("엑셀파일로 다운받기");
    expect(html).not.toContain("title.newPullRequest");
    expect(html).not.toContain(">review.allReview");
    expect(html).not.toContain(">pullRequest.send</button>");
  });
});
