import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  SearchCounts,
  SearchInput,
  SearchItem,
  SearchResponse,
  SearchSnippet,
  SearchType,
} from "../api/search";
import {
  isSearchType,
  readGlobalSearch,
  readOrganizationSearch,
  readProjectSearch,
} from "../api/search";
import { apiQueryKeys } from "../api/query-keys";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { useAppRuntime } from "../app-runtime-context";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "./-shared";

type SearchRouteScope =
  | { type: "global" }
  | { organizationName: string; type: "organization" }
  | { ownerName: string; projectName: string; type: "project" };

type SearchRouteQuery =
  | { input: SearchInput; invalid: false }
  | { input: null; invalid: false }
  | { input: null; invalid: true };

const SEARCH_CATEGORIES: Array<{ countKey: keyof SearchCounts; label: string; type: SearchType }> =
  [
    { countKey: "issues", label: "Issues", type: "issue" },
    { countKey: "users", label: "Users", type: "user" },
    { countKey: "projects", label: "Projects", type: "project" },
    { countKey: "posts", label: "Posts", type: "post" },
    { countKey: "milestones", label: "Milestones", type: "milestone" },
    { countKey: "issueComments", label: "Issue Comments", type: "issue_comment" },
    { countKey: "postComments", label: "Post Comments", type: "post_comment" },
    { countKey: "reviews", label: "Code Reviews", type: "review" },
  ];

function readSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function readSearchRouteQuery(): SearchRouteQuery {
  const params = readSearchParams();
  const keyword = (params.get("keyword") ?? "").trim();
  const searchType = (params.get("searchType") ?? "").trim();
  if (!keyword && !searchType) {
    return { input: null, invalid: false };
  }
  if (!keyword || !isSearchType(searchType)) {
    return { input: null, invalid: true };
  }
  return {
    input: {
      keyword,
      pageNum: Number(params.get("pageNum") || "1") || 1,
      searchType,
    },
    invalid: false,
  };
}

function basePathForScope(scope: SearchRouteScope) {
  if (scope.type === "project") {
    return `/${scope.ownerName}/${scope.projectName}/search`;
  }
  if (scope.type === "organization") {
    return `/organizations/${scope.organizationName}/search`;
  }
  return "/search";
}

function searchHref(
  runtimeConfig: RuntimeConfig,
  scope: SearchRouteScope,
  input: SearchInput | null,
  overrides: Partial<SearchInput> = {},
) {
  const keyword = overrides.keyword ?? input?.keyword ?? "";
  const searchType = overrides.searchType ?? input?.searchType ?? "auto";
  const pageNum = overrides.pageNum ?? input?.pageNum ?? 1;
  if (!keyword.trim()) {
    return prefixBasePath(runtimeConfig.basePath, basePathForScope(scope));
  }
  const query = new URLSearchParams();
  query.set("keyword", keyword);
  query.set("searchType", searchType);
  query.set("pageNum", String(pageNum));
  return prefixBasePath(runtimeConfig.basePath, `${basePathForScope(scope)}?${query.toString()}`);
}

function emptyCounts(): SearchCounts {
  return {
    issueComments: 0,
    issues: 0,
    milestones: 0,
    postComments: 0,
    posts: 0,
    projects: 0,
    reviews: 0,
    users: 0,
  };
}

function categoryLabel(type: SearchType) {
  return SEARCH_CATEGORIES.find((category) => category.type === type)?.label ?? "Issues";
}

function HighlightedSnippet({ snippet }: { snippet: SearchSnippet }) {
  const chars = Array.from(snippet.text);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  snippet.highlights.forEach((highlight) => {
    if (highlight.start > cursor) {
      nodes.push(chars.slice(cursor, highlight.start).join(""));
    }
    nodes.push(
      <strong className="keyword" key={`keyword-${highlight.start}-${highlight.end}`}>
        {chars.slice(highlight.start, highlight.end).join("")}
      </strong>,
    );
    cursor = highlight.end;
  });
  if (cursor < chars.length) {
    nodes.push(chars.slice(cursor).join(""));
  }
  return <>{nodes}</>;
}

function SearchCategories(props: {
  activeType: SearchType;
  counts: SearchCounts;
  input: SearchInput | null;
  runtimeConfig: RuntimeConfig;
  scope: SearchRouteScope;
}) {
  const categoryItems: React.ReactNode[] = [];
  for (const category of SEARCH_CATEGORIES) {
    if (props.scope.type === "project" && category.type === "project") {
      continue;
    }
    const count = props.counts[category.countKey];
    const classNames: string[] = [];
    if (category.type === props.activeType) {
      classNames.push("active");
    }
    if (count === 0) {
      classNames.push("empty");
    }
    categoryItems.push(
      <li className={classNames.join(" ")} key={category.type}>
        <a
          data-toggle="search-category"
          data-type={category.type}
          href={searchHref(props.runtimeConfig, props.scope, props.input, {
            pageNum: 1,
            searchType: category.type,
          })}
        >
          {category.label}
          <span className="num-badge pull-right">{count}</span>
        </a>
      </li>,
    );
  }
  return <ul className="lst-stacked unstyled search-category-wrap">{categoryItems}</ul>;
}

function SearchResultTitle(props: { activeType: SearchType; count: number }) {
  return (
    <h3 className="search-result-title">
      Found <strong>{props.count}</strong> result(s) in {categoryLabel(props.activeType)}
    </h3>
  );
}

function SearchMeta({
  item,
  runtimeConfig,
  showProject,
}: {
  item: SearchItem;
  runtimeConfig: RuntimeConfig;
  showProject: boolean;
}) {
  return (
    <div className="search-meta-info">
      {showProject && item.ownerName && item.projectName ? (
        <a
          className="project-link meta-item"
          href={prefixBasePath(runtimeConfig.basePath, `/${item.ownerName}/${item.projectName}`)}
        >
          {item.ownerName}/{item.projectName}
        </a>
      ) : null}
      {item.authorLoginId ? (
        <a
          className="meta-item"
          href={prefixBasePath(runtimeConfig.basePath, `/users/${item.authorLoginId}`)}
          title={item.authorLoginId}
        >
          {item.authorLabel || item.authorLoginId}
        </a>
      ) : null}
      {item.createdLabel || item.updatedLabel ? (
        <span className="meta-item">{item.updatedLabel || item.createdLabel}</span>
      ) : null}
      {item.state ? <span className="meta-item">{item.state}</span> : null}
    </div>
  );
}

function SearchResultItem(props: {
  item: SearchItem;
  runtimeConfig: RuntimeConfig;
  showProject: boolean;
}) {
  const item = props.item;
  const snippetKey = (snippet: SearchSnippet) =>
    `${item.type}-${item.id}-${snippet.text}-${snippet.highlights
      .map((highlight) => `${highlight.start}-${highlight.end}`)
      .join("|")}`;
  return (
    <li className="search-list-item">
      <div className="title-wrap">
        {item.number ? <span className="post-id">#{item.number}</span> : null}
        <a className="title" href={prefixBasePath(props.runtimeConfig.basePath, item.href)}>
          {item.title || "(no title)"}
        </a>
      </div>
      <div className="search-content">
        {item.snippets.map((snippet) => (
          <p className="search-content-body" key={snippetKey(snippet)}>
            <HighlightedSnippet snippet={snippet} />
            {snippet.truncated ? " ....." : null}
          </p>
        ))}
      </div>
      <SearchMeta item={item} runtimeConfig={props.runtimeConfig} showProject={props.showProject} />
    </li>
  );
}

function SearchResults(props: {
  activeType: SearchType;
  input: SearchInput | null;
  isLoading: boolean;
  response: SearchResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
  scope: SearchRouteScope;
}) {
  if (!props.input) {
    return <div className="empty-result"></div>;
  }
  if (props.isLoading) {
    return <div className="empty-result">Loading&hellip;</div>;
  }
  if (!props.response || props.response.items.length === 0) {
    return <div className="empty-result"></div>;
  }

  return (
    <>
      <ul className="search-list-wrap">
        {props.response.items.map((item) => (
          <SearchResultItem
            item={item}
            key={`${item.type}-${item.id}`}
            runtimeConfig={props.runtimeConfig}
            showProject={props.scope.type !== "project"}
          />
        ))}
      </ul>
      <SearchPagination
        input={props.input}
        response={props.response}
        runtimeConfig={props.runtimeConfig}
        scope={props.scope}
      />
    </>
  );
}

export function SearchPagination(props: {
  input: SearchInput;
  response: SearchResponse;
  runtimeConfig: RuntimeConfig;
  scope: SearchRouteScope;
}) {
  const pageSize = Math.max(1, props.response.pageSize || 20);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, props.response.totalCount) / pageSize));
  const pageNum = Math.min(Math.max(1, props.response.pageNum || 1), pageCount);
  if (pageCount <= 1) {
    return <div id="pagination"></div>;
  }
  const prevHref = searchHref(props.runtimeConfig, props.scope, props.input, {
    pageNum: pageNum - 1,
    searchType: props.response.searchType,
  });
  const nextHref = searchHref(props.runtimeConfig, props.scope, props.input, {
    pageNum: pageNum + 1,
    searchType: props.response.searchType,
  });
  return (
    <div className="page-navigation-wrap" id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {pageNum > 1 ? (
            <a href={prevHref} pjax-page="">
              <i className="ico btn-pg-prev"></i>
              <span>button.prevPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">button.prevPage</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={pageNum}
            max={pageCount}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{pageCount}</li>
        <li className="page-num ikon">
          {pageNum < pageCount ? (
            <a href={nextHref} pjax-page="">
              <i className="ico btn-pg-next"></i>
              <span>button.nextPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-next off"></i>
              <span className="off">button.nextPage</span>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

export function SearchRoutePage({ scope }: { scope: SearchRouteScope }) {
  const { bootstrapping, runtimeConfig } = useAppRuntime();
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const routeQuery = readSearchRouteQuery();
  const routeInvalid =
    routeQuery.invalid ||
    (scope.type === "project" && routeQuery.input?.searchType === "project");
  const input = routeQuery.input;
  const keyInput = {
    keyword: input?.keyword ?? "",
    pageNum: input?.pageNum ?? 1,
    searchType: input?.searchType ?? "auto",
  };
  const queryKey =
    scope.type === "project"
      ? apiQueryKeys.search.project(scope.ownerName, scope.projectName, keyInput)
      : scope.type === "organization"
        ? apiQueryKeys.search.organization(scope.organizationName, keyInput)
        : apiQueryKeys.search.global(keyInput);
  const searchQuery = useQuery<SearchResponse>({
    enabled: !bootstrapping && input !== null && !routeInvalid,
    queryFn: () => {
      if (input === null) {
        throw new Error("missing search input");
      }
      if (scope.type === "project") {
        return readProjectSearch(runtimeConfig, {
          ...input,
          ownerName: scope.ownerName,
          projectName: scope.projectName,
        });
      }
      if (scope.type === "organization") {
        return readOrganizationSearch(runtimeConfig, {
          ...input,
          organizationName: scope.organizationName,
        });
      }
      return readGlobalSearch(runtimeConfig, input);
    },
    queryKey,
  });
  const response = searchQuery.data;
  const activeType =
    response?.searchType ?? (input?.searchType === "auto" ? "issue" : input?.searchType) ?? "issue";
  const counts = response?.counts ?? emptyCounts();
  const activeCategory = SEARCH_CATEGORIES.find((category) => category.type === activeType);
  const activeCount = activeCategory ? counts[activeCategory.countKey] : 0;

  useDocumentTitle("Search");

  React.useEffect(() => {
    if (!searchQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(searchQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [searchQuery.error]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={basePathForScope(scope)} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={basePathForScope(scope)} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={prefixBasePath(runtimeConfig.basePath, "/")} />;
  }
  if (routeInvalid) {
    return <BadRequestPage href={prefixBasePath(runtimeConfig.basePath, "/")} />;
  }

  return (
    <main className="app-shell search-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>Search</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="row-fluid search-layout">
            <div className="span2">
              <SearchCategories
                activeType={activeType}
                counts={counts}
                input={input}
                runtimeConfig={runtimeConfig}
                scope={scope}
              />
            </div>
            <div className="span10">
              <div className="search-box-wrap">
                <form
                  action={prefixBasePath(runtimeConfig.basePath, basePathForScope(scope))}
                  id="searchInnerForm"
                  method="get"
                >
                  <input name="searchType" type="hidden" value={activeType} />
                  <input
                    className="span11"
                    defaultValue={input?.keyword ?? ""}
                    id="searchKeyword"
                    name="keyword"
                    type="text"
                  />
                  <input name="pageNum" type="hidden" value="1" />
                  <button className="ybtn" type="submit">
                    Search
                  </button>
                </form>
                <SearchResultTitle activeType={activeType} count={activeCount} />
              </div>
              <div className="search-result-wrap">
                <SearchResults
                  activeType={activeType}
                  input={input}
                  isLoading={searchQuery.isLoading}
                  response={response}
                  runtimeConfig={runtimeConfig}
                  scope={scope}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
