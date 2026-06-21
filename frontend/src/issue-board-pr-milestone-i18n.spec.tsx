import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { ProjectBoardListPage } from "./routes/-board-views";
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

describe("issue/board/PR/milestone legacy i18n opt-in", () => {
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
    expect(html).toContain(">milestone.menu.new</a>");
    expect(html).toContain(">milestone.is.empty</p>");
    expect(html).toContain(">milestone.form.state</dt>");
    expect(html).toContain(">button.save</button>");
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
    expect(html).toContain(">새 마일스톤</a>");
    expect(html).toContain(">등록된 마일스톤이 없습니다</p>");
    expect(html).toContain(">마일스톤 상태</dt>");
    expect(html).toContain(">저장</button>");
    expect(html).not.toContain(">issue.menu.new</a>");
    expect(html).not.toContain(">post.write</a>");
    expect(html).not.toContain(">milestone.menu.new</a>");
  });
});
