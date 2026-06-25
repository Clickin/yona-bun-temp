import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchCounts, SearchInput, SearchResponse } from "./api/search";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import {
  SearchCategories,
  SearchPagination,
  SearchResultTitle,
  SearchResults,
} from "./routes/-search-views";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const counts: SearchCounts = {
  issueComments: 6,
  issues: 7,
  milestones: 3,
  postComments: 5,
  posts: 4,
  projects: 2,
  reviews: 1,
  users: 8,
};

const input: SearchInput = {
  keyword: "needle",
  pageNum: 1,
  searchType: "issue",
};

const response: SearchResponse = {
  context: {
    organizationName: "",
    ownerName: "",
    projectName: "",
  },
  counts,
  items: [
    {
      authorLabel: "",
      authorLoginId: "",
      createdLabel: "2026-06-21",
      href: "/yona/project/issue/1",
      id: "issue-1",
      number: "1",
      ownerName: "yona",
      projectName: "projectYobi",
      snippets: [{ highlights: [{ end: 6, start: 0 }], text: "needle result" }],
      state: "open",
      title: "Needle issue",
      type: "issue",
      updatedLabel: "",
    },
  ],
  keyword: "needle",
  pageNum: 1,
  pageSize: 20,
  requestedSearchType: "issue",
  scope: "global",
  searchType: "issue",
  totalCount: 21,
};

function renderSearchShell(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <>
      <SearchCategories
        activeType="issue"
        counts={counts}
        input={input}
        messages={messages}
        runtimeConfig={testRuntimeConfig}
        scope={{ type: "global" }}
      />
      <SearchResultTitle activeType="issue" count={counts.issues} messages={messages} />
      <SearchResults
        activeType="issue"
        input={input}
        isLoading={false}
        messages={messages}
        response={response}
        runtimeConfig={testRuntimeConfig}
        scope={{ type: "global" }}
      />
      <SearchPagination
        input={input}
        messages={messages}
        response={response}
        runtimeConfig={testRuntimeConfig}
        scope={{ type: "global" }}
      />
    </>,
  );
}

describe("search legacy i18n opt-in", () => {
  it("resolves search tab and shell labels without a runtime provider", () => {
    const html = renderSearchShell();

    expect(html).toContain(">Issues<span");
    expect(html).toContain(">Users<span");
    expect(html).toContain(">Projects<span");
    expect(html).toContain(">Posts<span");
    expect(html).toContain(">Issue Comments<span");
    expect(html).toContain("Found <strong>7</strong> result(s) in Issues");
    expect(html).not.toContain("search.result.title <strong>7</strong> search.menu.issues");
    expect(html).toContain(">No author</span>");
    expect(html).toContain(">Next page</span>");
    expect(html).not.toContain(">search.menu.issues<span");
  });

  it("uses default English legacy messages for search tabs and shell labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const html = renderSearchShell(runtime.t);

    expect(html).toContain(">Issues<span");
    expect(html).toContain(">Users<span");
    expect(html).toContain(">Projects<span");
    expect(html).toContain(">Posts<span");
    expect(html).toContain(">Issue Comments<span");
    expect(html).toContain("Found <strong>7</strong> result(s) in Issues");
    expect(html).toContain(">No author</span>");
    expect(html).toContain(">Next page</span>");
    expect(html).not.toContain(">search.menu.issues<span");
  });

  it("switches search tabs and shell labels to a non-default legacy language", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderSearchShell(runtime.t);

    expect(html).toContain(">이슈<span");
    expect(html).toContain(">사용자<span");
    expect(html).toContain(">프로젝트<span");
    expect(html).toContain(">게시판<span");
    expect(html).toContain(">이슈 댓글<span");
    expect(html).toContain("이슈에서 <strong>7</strong> 건이 검색 되었습니다");
    expect(html).toContain(">작성자 없음</span>");
    expect(html).toContain(">다음 페이지</span>");
    expect(html).not.toContain("Found <strong>7</strong>");
  });

  it("renders legacy-specific user, project, milestone, comment, and review result rows", () => {
    const resultFor = (item: SearchResponse["items"][number], searchType = item.type) =>
      renderToStaticMarkup(
        <SearchResults
          activeType={searchType}
          input={{ ...input, searchType }}
          isLoading={false}
          response={{
            ...response,
            items: [item],
            requestedSearchType: searchType,
            searchType,
          }}
          runtimeConfig={testRuntimeConfig}
          scope={{ type: "global" }}
        />,
      );

    const userHtml = resultFor({
      authorLabel: "Needle User",
      authorLoginId: "needle-user",
      createdLabel: "2026-05-01",
      href: "/users/needle-user",
      id: "user-1",
      number: "",
      ownerName: "",
      projectName: "",
      snippets: [],
      state: "active",
      title: "Needle User",
      type: "user",
      updatedLabel: "",
    });
    expect(userHtml).toContain('class="search-list-item project"');
    expect(userHtml).toContain('class="avatar-wrap"');
    expect(userHtml).toContain('class="title user-link"');
    expect(userHtml).toContain("Needle User (@needle-user)");
    expect(userHtml).toContain("Member since 2026-05-01");

    const projectHtml = resultFor({
      authorLabel: "owner",
      authorLoginId: "owner",
      createdLabel: "2026-05-01",
      href: "/owner/projectYobi",
      id: "project-1",
      number: "",
      ownerName: "owner",
      projectName: "projectYobi",
      snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle project overview" }],
      state: "public",
      title: "owner/projectYobi",
      type: "project",
      updatedLabel: "2026-05-02",
    });
    expect(projectHtml).toContain('class="title project-link"');
    expect(projectHtml).toContain("/yona/assets/images/project_default_logo.png");
    expect(projectHtml).toContain('Create a project <strong title="2026-05-01">2026-05-01');
    expect(projectHtml).toContain('Latest code update <strong title="2026-05-02">2026-05-02');

    const milestoneHtml = resultFor({
      authorLabel: "",
      authorLoginId: "",
      createdLabel: "",
      href: "/owner/projectYobi/milestone/7",
      id: "milestone-7",
      number: "7",
      ownerName: "owner",
      projectName: "projectYobi",
      snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle milestone" }],
      state: "open",
      title: "Needle milestone",
      type: "milestone",
      updatedLabel: "2026-05-09",
    });
    expect(milestoneHtml).toContain('class="due-date meta-item"');
    expect(milestoneHtml).toContain("Due Date <strong>2026-05-09</strong>");

    for (const item of [
      {
        href: "/owner/projectYobi/issue/1#comment-2",
        id: "issue-comment-2",
        number: "1",
        title: "Re) Needle issue",
        type: "issue_comment" as const,
      },
      {
        href: "/owner/projectYobi/post/3#comment-4",
        id: "post-comment-4",
        number: "3",
        title: "Re) Needle post",
        type: "post_comment" as const,
      },
      {
        href: "/owner/projectYobi/pullRequest/5#comment-6",
        id: "review-6",
        number: "5",
        title: "Re) Needle pull request",
        type: "review" as const,
      },
    ]) {
      const html = resultFor({
        authorLabel: "Reviewer",
        authorLoginId: "reviewer",
        createdLabel: "2026-05-03",
        href: item.href,
        id: item.id,
        number: item.number,
        ownerName: "owner",
        projectName: "projectYobi",
        snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle comment body" }],
        state: "open",
        title: item.title,
        type: item.type,
        updatedLabel: "",
      });
      expect(html).toContain(`<span class="post-id">#${item.number}</span>`);
      expect(html).toContain(`href="/yona${item.href}"`);
      expect(html).toContain(item.title);
      expect(html).toContain('class="project-link meta-item"');
      expect(html).toContain('title="reviewer"');
    }
  });
});
