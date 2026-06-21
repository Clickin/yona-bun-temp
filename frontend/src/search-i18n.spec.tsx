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
  it("keeps search tab and shell fallback keys without a runtime provider", () => {
    const html = renderSearchShell();

    expect(html).toContain(">search.menu.issues<span");
    expect(html).toContain(">search.menu.users<span");
    expect(html).toContain(">search.menu.projects<span");
    expect(html).toContain(">search.menu.boards<span");
    expect(html).toContain(">search.menu.issue.comments<span");
    expect(html).toContain("search.result.title <strong>7</strong> search.menu.issues");
    expect(html).toContain(">issue.noAuthor</span>");
    expect(html).toContain(">button.nextPage</span>");
  });

  it("uses default English legacy messages for search tabs and shell labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const html = renderSearchShell(runtime.t);

    expect(html).toContain(">Issues<span");
    expect(html).toContain("> Users<span");
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
    expect(html).toContain("> 사용자<span");
    expect(html).toContain(">프로젝트<span");
    expect(html).toContain(">게시판<span");
    expect(html).toContain(">이슈 댓글<span");
    expect(html).toContain("이슈에서 <strong>7</strong> 건이 검색 되었습니다");
    expect(html).toContain(">작성자 없음</span>");
    expect(html).toContain(">다음 페이지</span>");
    expect(html).not.toContain("Found <strong>7</strong>");
  });
});
