import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  globalSearchQueryOptions,
  isSearchType,
  type SearchCounts,
  type SearchResponse,
  type SearchType,
} from "../api/search";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type SearchRouteSearch = {
  keyword: string;
  pageNum: number;
  searchType: SearchType;
};

const SEARCH_MENU: Array<{
  countKey: keyof SearchCounts;
  labelKey: string;
  type: Exclude<SearchType, "auto">;
}> = [
  { countKey: "issues", labelKey: "search.menu.issues", type: "issue" },
  { countKey: "users", labelKey: "search.menu.users", type: "user" },
  { countKey: "projects", labelKey: "search.menu.projects", type: "project" },
  { countKey: "posts", labelKey: "search.menu.boards", type: "post" },
  { countKey: "milestones", labelKey: "search.menu.milestones", type: "milestone" },
  { countKey: "issueComments", labelKey: "search.menu.issue.comments", type: "issue_comment" },
  { countKey: "postComments", labelKey: "search.menu.board.comments", type: "post_comment" },
  { countKey: "reviews", labelKey: "search.menu.reviews", type: "review" },
];

export const Route = createFileRoute("/search")({
  component: SearchRoute,
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "auto";
    const rawPageNum = typeof search.pageNum === "string" ? Number.parseInt(search.pageNum, 10) : 1;
    return {
      keyword: typeof search.keyword === "string" ? search.keyword : "",
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      searchType: isSearchType(rawSearchType) ? rawSearchType : "auto",
    };
  },
});

function SearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const { t } = useLegacyMessages();
  const navigate = useNavigate({ from: Route.fullPath });
  const hasKeyword = search.keyword.trim().length > 0;
  const searchQuery = useQuery({
    ...globalSearchQueryOptions(runtimeConfig, search),
    enabled: hasKeyword,
  });
  const result = searchQuery.data ?? emptySearchResult(search);
  const activeType = result.searchType === "auto" ? "issue" : result.searchType;
  const activeCount = countForType(result.counts, activeType);
  const activeTitle = titleForType(t, activeType);
  const resultTitleHtml = t("search.result.title", { args: [activeCount, activeTitle] });

  const submitCategory = (nextSearchType: SearchType) => {
    void navigate({
      search: (current) => ({
        ...current,
        pageNum: 1,
        searchType: nextSearchType,
      }),
    });
  };

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("title.search")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="project-page-wrap">
            <div className="row-fluid">
              <div className="span2">
                <ul className="lst-stacked unstyled search-category-wrap">
                  {SEARCH_MENU.map((menu) => {
                    const count = result.counts[menu.countKey];
                    return (
                      <li
                        className={`${menu.type === activeType ? "active" : ""} ${
                          count === 0 ? "empty" : ""
                        }`}
                        key={menu.type}
                      >
                        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy search categories use href="#" plus JS submit behavior. */}
                        <a
                          href="#"
                          data-toggle="search-category"
                          data-type={menu.type}
                          onClick={(event) => {
                            event.preventDefault();
                            submitCategory(menu.type);
                          }}
                        >
                          {t(menu.labelKey)}
                          <span className="num-badge pull-right">{count}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="span10">
                <div className="search-box-wrap">
                  <form
                    id="searchInnerForm"
                    method="get"
                    action={prefixBasePath(runtimeConfig.basePath, "/search")}
                  >
                    <input type="hidden" name="searchType" value={activeType} />
                    <input
                      type="text"
                      id="searchKeyword"
                      name="keyword"
                      className="span11"
                      defaultValue={result.keyword}
                    />
                    <button type="submit" className="ybtn">
                      {t("title.search")}
                    </button>
                  </form>

                  <h3
                    className="search-result-title"
                    dangerouslySetInnerHTML={{ __html: resultTitleHtml }}
                  />
                </div>
                <div className="search-result-wrap">
                  <SearchResultList result={result} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SearchResultList({ result }: { result: SearchResponse }) {
  if (result.items.length === 0) {
    return <div className="empty-result"></div>;
  }

  if (result.searchType === "project") {
    return (
      <ul className="search-list-wrap">
        {result.items.map((item) => (
          <li className="search-list-item project" key={item.id}>
            <a href={item.href} className="avatar-wrap">
              <img
                src={item.projectLogoUrl || "/assets/images/project_default_logo.png"}
                alt={item.projectName}
              />
            </a>
            <div className="title-wrap">
              <a href={item.href} className="title project-link">
                {item.ownerName}/{item.projectName}
              </a>
            </div>
            <div className="search-content np">
              <p className="search-content-body">{item.snippets[0]?.text ?? ""}</p>
            </div>
            <div className="search-meta-info np">
              <span className="meta-info">
                Create a project <strong title={item.createdLabel}>{item.createdLabel}</strong>
              </span>
              {item.updatedLabel ? (
                <span className="meta-info">
                  Latest code update <strong title={item.updatedLabel}>{item.updatedLabel}</strong>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return <div className="empty-result"></div>;
}

function emptySearchResult(search: SearchRouteSearch): SearchResponse {
  return {
    context: {
      organizationName: "",
      ownerName: "",
      projectName: "",
    },
    counts: {
      issueComments: 0,
      issues: 0,
      milestones: 0,
      postComments: 0,
      posts: 0,
      projects: 0,
      reviews: 0,
      users: 0,
    },
    items: [],
    keyword: search.keyword,
    pageNum: search.pageNum,
    pageSize: 20,
    requestedSearchType: search.searchType,
    scope: "global",
    searchType: search.searchType === "auto" ? "issue" : search.searchType,
    totalCount: 0,
  };
}

function countForType(counts: SearchCounts, searchType: SearchType): number {
  switch (searchType) {
    case "issue":
      return counts.issues;
    case "user":
      return counts.users;
    case "project":
      return counts.projects;
    case "post":
      return counts.posts;
    case "milestone":
      return counts.milestones;
    case "issue_comment":
      return counts.issueComments;
    case "post_comment":
      return counts.postComments;
    case "review":
      return counts.reviews;
    case "auto":
      return counts.issues;
  }
}

function titleForType(t: ReturnType<typeof useLegacyMessages>["t"], searchType: SearchType) {
  const match = SEARCH_MENU.find((menu) => menu.type === searchType);
  return match ? t(match.labelKey) : "";
}
