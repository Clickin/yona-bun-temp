import { describe, expect, it } from "vitest";
import {
  boundedSearchScopeValues,
  boundedSearchTypeValues,
  deferredSearchTypeValues,
  globalSearchInputSchema,
  makeSearchSnippets,
  organizationSearchInputSchema,
  projectSearchInputSchema,
  searchInputSchema,
  searchPageSchema,
} from "./search";

describe("search contracts", () => {
  it("keeps the bounded scope surface limited to global, organization, and project", () => {
    expect(boundedSearchScopeValues).toEqual(["global", "organization", "project"]);

    expect(
      globalSearchInputSchema.parse({
        pageSize: 10,
        query: "  project issue  ",
        scope: "global",
        types: ["project", "issue"],
      }),
    ).toEqual({
      pageSize: 10,
      query: "project issue",
      scope: "global",
      types: ["project", "issue"],
    });

    expect(
      organizationSearchInputSchema.parse({
        cursor: "  org-cursor  ",
        organizationName: "  labs  ",
        pageSize: 5,
        query: "  protected review  ",
        scope: "organization",
        types: ["review_comment"],
      }),
    ).toEqual({
      cursor: "org-cursor",
      organizationName: "labs",
      pageSize: 5,
      query: "protected review",
      scope: "organization",
      types: ["review_comment"],
    });

    expect(
      projectSearchInputSchema.parse({
        cursor: "  project-cursor  ",
        ownerName: "  yona  ",
        pageSize: 20,
        projectName: "  projectYobi  ",
        query: "  private post  ",
        scope: "project",
        types: ["posting"],
      }),
    ).toEqual({
      cursor: "project-cursor",
      ownerName: "yona",
      pageSize: 20,
      projectName: "projectYobi",
      query: "private post",
      scope: "project",
      types: ["posting"],
    });
  });

  it("keeps result types bounded and leaves deferred legacy types out of the contract", () => {
    expect(boundedSearchTypeValues).toEqual([
      "user",
      "project",
      "issue",
      "posting",
      "review_comment",
    ]);
    expect(deferredSearchTypeValues).toEqual(["issue_comment", "posting_comment", "milestone"]);

    expect(
      searchInputSchema.safeParse({
        pageSize: 10,
        query: "comment",
        scope: "global",
        types: ["issue_comment"],
      }).success,
    ).toBe(false);

    expect(
      searchInputSchema.safeParse({
        pageSize: 10,
        query: "comment",
        scope: "global",
        types: ["milestone"],
      }).success,
    ).toBe(false);
  });

  it("keeps boolean-query operators and AI-facing payloads out of the bounded input surface", () => {
    expect(
      searchInputSchema.safeParse({
        operator: "AND",
        pageSize: 10,
        query: "public issue",
        scope: "global",
      }).success,
    ).toBe(false);

    expect(
      searchInputSchema.safeParse({
        aiPrompt: "summarize results",
        pageSize: 10,
        query: "public issue",
        scope: "global",
      }).success,
    ).toBe(false);
  });

  it("parses bounded result counts, pagination, and typed result payloads", () => {
    expect(
      searchPageSchema.parse({
        counts: {
          returned: 5,
          total: 12,
        },
        items: [
          {
            loginId: "doortts",
            scope: "global",
            snippets: [],
            type: "user",
            userLabel: "suwon",
          },
          {
            ownerName: "yona",
            projectName: "projectYobi",
            scope: "organization",
            snippets: ["protected project"],
            type: "project",
          },
          {
            issueNumber: 1478,
            ownerName: "yona",
            projectName: "projectYobi",
            scope: "project",
            snippets: ["issue body snippet"],
            title: "public issue",
            type: "issue",
          },
          {
            ownerName: "yona",
            postingNumber: 12,
            projectName: "projectYobi",
            scope: "project",
            snippets: ["posting body snippet"],
            title: "public post",
            type: "posting",
          },
          {
            ownerName: "yona",
            projectName: "projectYobi",
            reviewCommentId: 99,
            scope: "project",
            snippets: ["review body snippet"],
            type: "review_comment",
          },
        ],
        nextCursor: "cursor-2",
        pageSize: 5,
      }),
    ).toEqual({
      counts: {
        returned: 5,
        total: 12,
      },
      items: [
        {
          loginId: "doortts",
          scope: "global",
          snippets: [],
          type: "user",
          userLabel: "suwon",
        },
        {
          ownerName: "yona",
          projectName: "projectYobi",
          scope: "organization",
          snippets: ["protected project"],
          type: "project",
        },
        {
          issueNumber: 1478,
          ownerName: "yona",
          projectName: "projectYobi",
          scope: "project",
          snippets: ["issue body snippet"],
          title: "public issue",
          type: "issue",
        },
        {
          ownerName: "yona",
          postingNumber: 12,
          projectName: "projectYobi",
          scope: "project",
          snippets: ["posting body snippet"],
          title: "public post",
          type: "posting",
        },
        {
          ownerName: "yona",
          projectName: "projectYobi",
          reviewCommentId: 99,
          scope: "project",
          snippets: ["review body snippet"],
          type: "review_comment",
        },
      ],
      nextCursor: "cursor-2",
      pageSize: 5,
    });
  });

  it("maps the single legacy snippet example from SearchResultTests.java", () => {
    const contents =
      "자동링크로 바꿀 수 있는 url은 자동링크처럼 보여주기 이슈 본문이나 댓글 등에 Yobi의 어떤 페이지에 대한 링크를 넣었을 때, 이를 렌더링해서 보여줄 때는 자동링크로 보여주면 좋을 것 같습니다. 예를 들어 `http://yobi.navercorp.com/dlab/hive/issue/1478`를 자동으로 #1478 로 보여준다거나, `http://yobi.navercorp.com/dlab/hive/commit/2f0ef4c0bbe535eb3475b0e7cdaadf86add6f220?branch=master`는 2f0ef4c로 보여주는 식입니다.";

    expect(makeSearchSnippets(contents, "이슈", 10)).toEqual([
      "링크처럼 보여주기 이슈 본문이나 댓글 등",
    ]);
  });

  it("maps the overlapping legacy snippet example from SearchResultTests.java", () => {
    const contents =
      "#1477 마일스톤 이슈리스트 화면 개선 #1466 이슈에서 응준님께서 말씀주신 내용을 처리하고자 의견을 기다립니다. 1. github에서처럼 마일스톤내의 이슈검색시, 이슈리스트로 해당마일스톤을 검색필터로 선정하여 이동 * 별다른 개발없이 링크만 바꿔주면됨 * back버튼으로 마일스톤 리스트화면으로 이동이 가능하며, 이슈리스트의 검색기능을 그대로 활용가능 2. 마일스톤내 이슈화면에 검색기능을 추가 * 추가기능을 개발하다보면, 이슈리스트화면과 같아짐 * 향후, 마일스톤내 이슈페이지만의 기능을 넣고자 한다면, 이 방법이 나아보임 그럼 의견주시면 주신대로 작업진행하도록 하겠습니다~";

    expect(makeSearchSnippets(contents, "이슈", 40)).toEqual([
      "#1477 마일스톤 이슈리스트 화면 개선 #1466 이슈에서 응준님께서 말씀주신 내용을 처리하고자 의견을 기다립니다. 1. github에서처럼 마일스톤내의 이슈검색시, 이슈리스트로 해당마일스톤을 검색필터로 선정하여 이동 * 별다른 개발없이 링크",
      "바꿔주면됨 * back버튼으로 마일스톤 리스트화면으로 이동이 가능하며, 이슈리스트의 검색기능을 그대로 활용가능 2. 마일스톤내 이슈화면에 검색기능을 추가 * 추가기능을 개발하다보면, 이슈리스트화면과 같아짐 * 향후, 마일스톤내 이슈페이지만의 기능을 넣고자 한다면, 이 방법이 나아보임 그럼 의견주시면 주",
    ]);
  });

  it("extracts bounded snippets with case-insensitive keyword matching", () => {
    expect(makeSearchSnippets("Alpha review body", "alpha", 7)).toEqual(["Alpha review"]);
  });
});
