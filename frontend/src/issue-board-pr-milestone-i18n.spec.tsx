import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { ProjectBoardDetailPage, ProjectBoardListPage } from "./routes/-board-views";
import { ProjectIssueListPage } from "./routes/-issue-views";
import { ProjectMilestoneFormPage, ProjectMilestoneListPage } from "./routes/-milestone-views";
import { ProjectPullRequestListPage } from "./routes/-pull-request-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const detail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "yobi",
  projectName: "yona",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const boardItem = {
  authorAvatarUrl: "/yona/avatar/owner.png",
  authorLabel: "Owner",
  authorLoginId: "owner",
  commentCount: 0,
  createdLabel: "now",
  labels: [],
  notice: false,
  ownerName: "yobi",
  postNumber: "16",
  projectName: "yona",
  readme: false,
  title: "Second page post",
  updatedLabel: "later",
};

function renderIssueBoardPrMilestoneControls(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <>
      <ProjectIssueListPage
        detail={detail}
        issueList={{
          draftItems: [],
          items: [],
          ownerName: "yobi",
          pageNum: 1,
          pageSize: 15,
          projectName: "yona",
          totalCount: 0,
        }}
        labels={[]}
        messages={messages}
        milestones={[]}
        query={{
          assigneeLoginId: "",
          authorLoginId: "",
          dueDate: "",
          labelIds: [],
          milestoneId: 0,
          pageNum: 1,
          state: "open",
        }}
        runtimeConfig={testRuntimeConfig}
      />
      <ProjectBoardListPage
        canCreate={true}
        detail={detail}
        filter=""
        labelIds={[]}
        labels={[]}
        messages={messages}
        orderBy="updatedDate"
        orderDir="desc"
        posts={{
          items: [],
          notices: [],
          ownerName: "yobi",
          pageNum: 1,
          pageSize: 15,
          projectName: "yona",
          readme: null,
          totalCount: 0,
        }}
        runtimeConfig={testRuntimeConfig}
      />
      <ProjectPullRequestListPage
        category="open"
        detail={{ ...detail, isForked: true, showPullRequest: true }}
        list={{
          acceptedCount: 0,
          category: "open",
          closedCount: 0,
          contributors: [],
          items: [],
          openCount: 0,
          pageNum: 1,
          pageSize: 15,
          recentlyPushedBranches: [],
          sentCount: 0,
          totalCount: 0,
        }}
        messages={messages}
        query={{ category: "open", contributorId: 0, filter: "", pageNum: 1 }}
        runtimeConfig={testRuntimeConfig}
      />
      <ProjectMilestoneListPage
        detail={detail}
        list={{ milestones: [], orderBy: "dueDate", orderDir: "asc", state: "open" }}
        messages={messages}
        owner="yobi"
        projectName="yona"
        runtimeConfig={testRuntimeConfig}
      />
      <ProjectMilestoneFormPage
        detail={detail}
        messages={messages}
        mode="create"
        owner="yobi"
        projectName="yona"
        runtimeConfig={testRuntimeConfig}
      />
    </>,
  );
}

function renderProjectPullRequestListWithReviewMetrics(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <ProjectPullRequestListPage
      category="open"
      detail={{ ...detail, isForked: false, showPullRequest: true }}
      list={{
        acceptedCount: 0,
        category: "open",
        closedCount: 0,
        contributors: [],
        items: [
          {
            closedCommentThreadCount: 1,
            commentThreadCount: 2,
            conflict: false,
            contributorLabel: "Owner",
            contributorLoginId: "owner",
            createdLabel: "now",
            fromBranch: "feature",
            fromOwnerName: "yobi",
            fromProjectName: "yona",
            id: 1,
            ownerName: "yobi",
            projectName: "yona",
            pullRequestNumber: 7,
            receiverLabel: "Reviewer",
            receiverLoginId: "reviewer",
            reviewerCount: 1,
            state: "open",
            title: "Review metrics",
            toBranch: "main",
            updatedLabel: "later",
          },
        ],
        openCount: 1,
        pageNum: 1,
        pageSize: 15,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 1,
      }}
      messages={messages}
      query={{ category: "open", contributorId: 0, filter: "", pageNum: 1 }}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderBoardDetailCommentHelpers(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <ProjectBoardDetailPage
      messages={messages}
      post={{
        ...boardItem,
        attachments: [],
        authorId: "1",
        bodyHtml: "",
        bodyMarkdown: "body",
        comments: [
          {
            attachments: [],
            authorId: "1",
            authorLabel: "Owner User",
            authorLoginId: "owner",
            contentsHtml: "",
            contentsMarkdown: "parent",
            createdLabel: "now",
            id: "9",
            parentCommentId: "",
            viaEmail: false,
          },
          {
            attachments: [],
            authorId: "2",
            authorLabel: "Reply User",
            authorLoginId: "reply",
            contentsHtml: "",
            contentsMarkdown: "child reply",
            createdLabel: "later",
            id: "10",
            parentCommentId: "9",
            viaEmail: false,
          },
        ],
        historyHtml: "",
        historyMarkdown: "old body",
        id: "16",
        isWatching: true,
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: false,
          canUpdate: true,
          canWatch: true,
        },
        watcherCount: 2,
      }}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

describe("issue/board/PR/milestone legacy i18n opt-in", () => {
  it("opts project issue, board/post, and milestone loading shells into legacy messages", () => {
    const routePaths = [
      "routes/$owner/$projectName/issueform/route.tsx",
      "routes/$owner/$projectName/issues/route.tsx",
      "routes/$owner/$projectName/issue/$issueNumber/route.tsx",
      "routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx",
      "routes/$owner/$projectName/issue/labelsform/route.tsx",
      "routes/$owner/$projectName/posts/route.tsx",
      "routes/$owner/$projectName/postform/route.tsx",
      "routes/$owner/$projectName/post/$postNumber/route.tsx",
      "routes/$owner/$projectName/post/$postNumber/editform/route.tsx",
      "routes/$owner/$projectName/milestones/route.tsx",
      "routes/$owner/$projectName/newMilestoneForm/route.tsx",
      "routes/$owner/$projectName/milestone/$milestoneId/route.tsx",
      "routes/$owner/$projectName/milestone/$milestoneId/editform/route.tsx",
      "routes/organizations/$organizationName/boards/route.tsx",
    ];

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(source).toContain('messages("common.loading", { fallback: "common.loading" })');
      expect(source).not.toContain("<h1>common.loading</h1>");
    }
  });

  it("keeps route error fallbacks as legacy keys for the root runtime message lookup", () => {
    const rootSource = fs.readFileSync(path.resolve(__dirname, "routes/__root.tsx"), "utf8");
    const boardDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/post/$postNumber/route.tsx"),
      "utf8",
    );
    const boardCreateRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/postform/route.tsx"),
      "utf8",
    );
    const boardEditRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/post/$postNumber/editform/route.tsx"),
      "utf8",
    );

    expect(rootSource).toContain("messages(errorMessage, { fallback: errorMessage })");
    expect(boardDetailRouteSource).toContain(
      'messages("error.badrequest", { fallback: "error.badrequest" })',
    );
    expect(boardCreateRouteSource).toContain(
      'messages("error.badrequest", { fallback: "error.badrequest" })',
    );
    expect(boardEditRouteSource).toContain(
      'messages("post.update.error", { fallback: "post.update.error" })',
    );

    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    expect(runtime.t("error.badrequest", { fallback: "error.badrequest" })).toBe(
      "잘못된 요청입니다",
    );
    expect(runtime.t("post.update.error", { fallback: "post.update.error" })).toBe("입력값 오류");
  });

  it("keeps legacy key fallbacks when rendered without AppRuntimeContext messages", () => {
    const html = renderIssueBoardPrMilestoneControls();

    expect(html).toContain(">issue.menu.new</a>");
    expect(html).toContain(">issue.state.open");
    expect(html).toContain(">issue.is.empty</p>");
    expect(html).toContain('placeholder="project.searchPlaceholder"');
    expect(html).toContain(">post.write</a>");
    expect(html).toContain(">post.is.empty</p>");
    expect(html).toContain(">pullRequest.state.open");
    expect(html).toContain(">pullRequest.sent");
    expect(html).toContain(">pullRequest.is.empty</p>");
    expect(html).toContain('title="common.two.column.mode"');
    expect(html).toContain('data-content="common.two.column.mode.desc"');
    expect(html).toContain('class="two-column-mode-text">common.two.column.view</span>');
    expect(html).toContain(">milestone.menu.new</a>");
    expect(html).toContain(">milestone.is.empty</p>");
    expect(html).toContain(">milestone.form.state</dt>");
    expect(html).toContain(">button.save</button>");

    const reviewMetricsHtml = renderProjectPullRequestListWithReviewMetrics();
    expect(reviewMetricsHtml).toContain(
      'title="pullRequest.review.closed / pullRequest.review.total"',
    );
    expect(reviewMetricsHtml).not.toContain("pullRequest.reviewers");
  });

  it("uses the legacy loading fallback and Korean runtime for the board detail loading shell", () => {
    const fallbackHtml = renderToStaticMarkup(
      <ProjectBoardDetailPage post={null} runtimeConfig={testRuntimeConfig} />,
    );
    expect(fallbackHtml).toContain("<h1>common.loading</h1>");

    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const koreanHtml = renderToStaticMarkup(
      <ProjectBoardDetailPage messages={runtime.t} post={null} runtimeConfig={testRuntimeConfig} />,
    );
    expect(koreanHtml).toContain("<h1>불러오는 중</h1>");
    expect(koreanHtml).not.toContain("<h1>common.loading</h1>");
  });

  it("uses Korean legacy messages for the touched controls when a runtime lookup is provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderIssueBoardPrMilestoneControls(runtime.t);

    expect(html).toContain(">새 이슈</a>");
    expect(html).toContain(">열림");
    expect(html).toContain(">등록된 이슈가 없습니다.</p>");
    expect(html).toContain('placeholder="현재 프로젝트에서 검색"');
    expect(html).toContain(">새 글쓰기</a>");
    expect(html).toContain(">등록된 게시물이 없습니다.</p>");
    expect(html).toContain(">보낸 코드");
    expect(html).toContain(">등록된 코드 주고 받기가 없습니다.</p>");
    expect(html).toContain('title="투 컬럼 모드"');
    expect(html).toContain('data-content="리스트와 본문을 각각 컬럼으로 분할해서 보여줍니다"');
    expect(html).toContain('class="two-column-mode-text">2단 보기</span>');
    expect(html).toContain(">새 마일스톤</a>");
    expect(html).toContain(">등록된 마일스톤이 없습니다</p>");
    expect(html).toContain(">마일스톤 상태</dt>");
    expect(html).toContain(">저장</button>");
    expect(html).not.toContain(">issue.menu.new</a>");
    expect(html).not.toContain(">post.write</a>");
    expect(html).not.toContain(">milestone.menu.new</a>");

    const reviewMetricsHtml = renderProjectPullRequestListWithReviewMetrics(runtime.t);
    expect(reviewMetricsHtml).toContain('title="닫힌 리뷰 / 전체 리뷰"');
    expect(reviewMetricsHtml).not.toContain("pullRequest.review.closed / pullRequest.review.total");
    expect(reviewMetricsHtml).not.toContain("pullRequest.reviewers");
  });

  it("opts board detail auxiliary comment controls into legacy messages", () => {
    const fallbackHtml = renderBoardDetailCommentHelpers();

    expect(fallbackHtml).toContain(">change.history</span>");
    expect(fallbackHtml).toContain("<strong>common.comment</strong>");
    expect(fallbackHtml).toContain('title="button.translation"');
    expect(fallbackHtml).toContain('aria-label="common.comment.edit"');
    expect(fallbackHtml).toContain('aria-label="common.comment.delete"');
    expect(fallbackHtml).toContain(">post.unwatch</button>");
    expect(fallbackHtml).toContain('aria-label="button.comment.new"');
    expect(fallbackHtml).toContain('<span aria-hidden="true">OK</span>');
    expect(fallbackHtml).toContain('<span class="sr-only">button.comment.new</span>');
    expect(fallbackHtml).toContain(
      'placeholder="comment.oneline.comment.placeholder (CTRL + ENTER)"',
    );

    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const koreanHtml = renderBoardDetailCommentHelpers(runtime.t);

    expect(koreanHtml).toContain(">변경 이력</span>");
    expect(koreanHtml).toContain("<strong>댓글</strong>");
    expect(koreanHtml).toContain('title="번역"');
    expect(koreanHtml).toContain('aria-label="댓글 수정"');
    expect(koreanHtml).toContain('aria-label="댓글 삭제"');
    expect(koreanHtml).toContain(">글 그만 지켜보기</button>");
    expect(koreanHtml).toContain('aria-label="댓글 입력"');
    expect(koreanHtml).toContain('<span aria-hidden="true">OK</span>');
    expect(koreanHtml).toContain('<span class="sr-only">댓글 입력</span>');
    expect(koreanHtml).toContain('placeholder="대댓글 추가 (CTRL + ENTER)"');
    expect(koreanHtml).not.toContain(">change.history</span>");
    expect(koreanHtml).not.toContain("<strong>common.comment</strong>");
    expect(koreanHtml).not.toContain(">comment.save</button>");
  });

  it("opts the bounded P4-A issue/board shared controls into legacy message lookups", () => {
    const issueViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-issue-views.tsx"),
      "utf8",
    );
    const boardViewsSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-board-views.tsx"),
      "utf8",
    );

    for (const key of [
      "common.two.column.mode",
      "common.two.column.mode.desc",
      "common.two.column.view",
      "common.show.subtasks",
      "common.show.subtasks.desc",
      "label.select",
      "issue.noAuthor",
      "button.prevPage",
      "button.nextPage",
      "title.favorite",
      "issue.draft.description",
      "common.comment",
      "issue.menu.new.by",
      "milestone",
      "issue.search",
      "issue.myIssue",
      "user.files",
      "issue.sharer.select",
      "issue.noAssignee",
      "common.attach.dropFilesHere",
      "issue.state.draft",
      "issue.option",
      "issue.subtask.select",
      "notification.send.mail",
      "issue.state",
      "issue.assignee",
      "issue.noMilestone",
      "issue.dueDate",
    ]) {
      expect(issueViewsSource).toContain(`legacyMessage(`);
      expect(issueViewsSource).toContain(`"${key}"`);
    }

    for (const key of [
      "common.two.column.mode",
      "common.two.column.mode.desc",
      "common.two.column.view",
      "post.is.empty",
      "post.notice",
      "issue.noAuthor",
      "label.select",
      "common.attach.dropFilesHere",
    ]) {
      expect(boardViewsSource).toContain(`legacyMessage(`);
      expect(boardViewsSource).toContain(`"${key}"`);
    }
  });
});
