import fs from "node:fs";
import path from "node:path";
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
  it("lets the project layout own PR list chrome without changing the legacy body", () => {
    const html = renderToStaticMarkup(
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
          recentlyPushedBranches: [],
          sentCount: 0,
          totalCount: 0,
        }}
        query={{ category: "open", contributorId: 0, filter: "", pageNum: 1 }}
        renderShell={false}
        runtimeConfig={testRuntimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const listRouteSources = [
      "routes/$owner/$projectName/pullRequests/route.tsx",
      "routes/$owner/$projectName/closedPullRequests/route.tsx",
      "routes/$owner/$projectName/sentPullRequests/route.tsx",
    ].map((routePath) => fs.readFileSync(path.resolve(__dirname, routePath), "utf8"));

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/pullRequests`");
    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/closedPullRequests`");
    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/sentPullRequests`");
    expect(layoutSource).toContain('activeMenu: "pullRequest"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    for (const routeSource of listRouteSources) {
      expect(routeSource).toContain("renderShell={false}");
    }
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="row-fluid cb"');
    expect(html).toContain('class="span10 span-hard-wrap" id="span10"');
    expect(html).not.toContain("app-shell pull-request-page");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the project layout own PR form chrome without changing the legacy body", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
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
          mode="create"
          renderShell={false}
          runtimeConfig={testRuntimeConfig}
          onSubmit={async () => {}}
        />
      </QueryClientProvider>,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const createRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/newPullRequestForm/route.tsx"),
      "utf8",
    );
    const editRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx",
      ),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/newPullRequestForm`");
    expect(layoutSource).toContain("isPullRequestEditFormPath(appPath, owner, projectName)");
    expect(layoutSource).toContain('activeMenu: "pullRequest"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    expect(createRouteSource).toContain("renderShell={false}");
    expect(editRouteSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="content-wrap frm-wrap"');
    expect(html).toContain('class="board-form pull-request-form"');
    expect(html).not.toContain("app-shell pull-request-page");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("lets the project layout own review-list chrome without changing the legacy body", () => {
    const html = renderToStaticMarkup(
      <ProjectReviewsPage
        detail={detail}
        query={{
          authorId: 0,
          filter: "",
          orderBy: "createdDate",
          orderDir: "desc",
          pageNum: 1,
          participantId: 0,
          state: "open",
        }}
        renderShell={false}
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
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const reviewsRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/reviews/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/reviews`");
    expect(layoutSource).toContain('activeMenu: "review"');
    expect(layoutSource).toContain('shellClassName: "pull-request-page"');
    expect(reviewsRouteSource).toContain("renderShell={false}");
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="row-fluid issue-list-wrap"');
    expect(html).toContain('class="review-list-wrap"');
    expect(html).not.toContain("app-shell pull-request-page");
    expect(html).not.toContain("project-header-outer");
    expect(html).not.toContain("project-menu-outer");
    expect(html).not.toContain("page-wrap-outer");
  });

  it("opts PR route mutation error fallbacks into legacy messages", () => {
    const routePaths = [
      "routes/$owner/$projectName/newPullRequestForm/route.tsx",
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx",
    ];
    const detailRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      ),
      "utf8",
    );
    const changesRouteSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
      ),
      "utf8",
    );
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR", "ja-JP"]);
    runtime.setLanguage("ko-KR");

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(source).toContain('messages("pullRequest.error.newPullRequestForm", {');
      expect(source).toContain('fallback: "pullRequest.error.newPullRequestForm"');
      expect(source).toContain("useNavigate");
      expect(source).toContain("prefixBasePath");
      expect(source).not.toContain("navigateToAppHref");
    }
    expect(detailRouteSource).toContain(
      'messages("error.badrequest", { fallback: "error.badrequest" })',
    );
    expect(changesRouteSource).toContain(
      'messages("error.badrequest", { fallback: "error.badrequest" })',
    );
    expect(runtime.t("error.badrequest", { fallback: "error.badrequest" })).toBe(
      "잘못된 요청입니다",
    );
    expect(
      runtime.t("pullRequest.error.newPullRequestForm", {
        fallback: "pullRequest.error.newPullRequestForm",
      }),
    ).toBe("코드를 보낼 수 없는 프로젝트 또는 브랜치입니다<br>({0} {1})");
    runtime.setLanguage("ja-JP");
    expect(
      runtime.t("pullRequest.error.newPullRequestForm", {
        fallback: "pullRequest.error.newPullRequestForm",
      }),
    ).toBe("Invalid project or branch<br>({0} {1})");
  });

  it("uses default legacy messages without runtime messages", () => {
    const html = renderRemainingPullRequestControls();

    expect(html).toContain(">Recently pushed branch</h5>");
    expect(html).toContain(">Pull request</a>");
    expect(html).toContain(">From");
    expect(html).toContain(">Select branch");
    expect(html).toContain('id="pullRequestState" hidden=""');
    expect(html).toContain('<div class="alert mt20 mb20" id="status">');
    expect(html).toContain(">Title");
    expect(html).toContain('id="title" name="title"');
    expect(html).toContain('id="editor-body-content-body" name="body"');
    expect(html).toContain(" Commits</span>");
    expect(html).toContain(">Send pull request</button>");
    expect(html).toContain(">Cancel</a>");
    expect(html).toContain(">All reviews");
    expect(html).toContain(">Participated.");
    expect(html).toContain(">Created");
    expect(html).toContain(">Created</a>");
    expect(html).toContain(">Open");
    expect(html).toContain(">No review has been added.</p>");
    expect(html).toContain("Download as Excel file");
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
