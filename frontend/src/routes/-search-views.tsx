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
import { readOrganizationContainerRest, readProjectContainerRest } from "../api/org-project";
import { apiQueryKeys } from "../api/query-keys";
import { toOrganizationContainerView, toProjectContainerView } from "../app-view-models";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  type LegacyI18nContextValue,
  type TranslateOptions,
} from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { useAppRuntime } from "../app-runtime-context";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "./-shared";
import { OrganizationHeader, OrganizationMenu } from "./-organization-views";
import { ProjectHeader, ProjectMenu } from "./-project-views";
import type { OrganizationDetailViewModel, ProjectDetailViewModel } from "./-view-models";

type SearchRouteScope =
  | { type: "global" }
  | { organizationName: string; type: "organization" }
  | { ownerName: string; projectName: string; type: "project" };

type SearchRouteQuery =
  | { input: SearchInput; invalid: false }
  | { input: null; invalid: false }
  | { input: null; invalid: true };

type LegacyMessageLookup = LegacyI18nContextValue["t"];

const SEARCH_CATEGORIES: Array<{ countKey: keyof SearchCounts; label: string; type: SearchType }> =
  [
    { countKey: "issues", label: "search.menu.issues", type: "issue" },
    { countKey: "users", label: "search.menu.users", type: "user" },
    { countKey: "projects", label: "search.menu.projects", type: "project" },
    { countKey: "posts", label: "search.menu.boards", type: "post" },
    { countKey: "milestones", label: "search.menu.milestones", type: "milestone" },
    { countKey: "issueComments", label: "search.menu.issue.comments", type: "issue_comment" },
    { countKey: "postComments", label: "search.menu.board.comments", type: "post_comment" },
    { countKey: "reviews", label: "search.menu.reviews", type: "review" },
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

function legacySearchMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  options?: TranslateOptions,
) {
  const fallback = options?.fallback ?? key;
  return messages
    ? messages(key, { ...options, fallback })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { ...options, fallback });
}

function categoryLabel(type: SearchType, messages?: LegacyMessageLookup) {
  const key =
    SEARCH_CATEGORIES.find((category) => category.type === type)?.label ?? "search.menu.issues";
  return legacySearchMessage(messages, key);
}

function searchResultTitleNodes(
  messages: LegacyMessageLookup | undefined,
  count: number,
  category: string,
) {
  const message = legacySearchMessage(messages, "search.result.title", {
    args: [count, category],
  });
  const match = /^(.*)<strong>([\s\S]*)<\/\s*strong>(.*)$/.exec(message);
  if (!match) {
    return message;
  }
  return (
    <>
      {match[1]}
      <strong>{match[2]}</strong>
      {match[3]}
    </>
  );
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

export function SearchCategories(props: {
  activeType: SearchType;
  counts: SearchCounts;
  input: SearchInput | null;
  messages?: LegacyMessageLookup;
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
          {legacySearchMessage(props.messages, category.label)}
          <span className="num-badge pull-right">{count}</span>
        </a>
      </li>,
    );
  }
  return <ul className="lst-stacked unstyled search-category-wrap">{categoryItems}</ul>;
}

export function SearchResultTitle(props: {
  activeType: SearchType;
  count: number;
  messages?: LegacyMessageLookup;
}) {
  const category = categoryLabel(props.activeType, props.messages);
  return (
    <h3 className="search-result-title">
      {searchResultTitleNodes(props.messages, props.count, category)}
    </h3>
  );
}

function SearchMeta({
  item,
  messages,
  runtimeConfig,
  showProject,
}: {
  item: SearchItem;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  showProject: boolean;
}) {
  if (item.type === "milestone") {
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
        {item.updatedLabel ? (
          <span className="due-date meta-item">
            {legacySearchMessage(messages, "label.dueDate")} <strong>{item.updatedLabel}</strong>
          </span>
        ) : null}
      </div>
    );
  }
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
      {item.authorLoginId && item.authorLabel ? (
        <a
          className="meta-item"
          data-placement="top"
          data-toggle="tooltip"
          href={prefixBasePath(runtimeConfig.basePath, `/${item.authorLoginId}`)}
          title={item.authorLoginId}
        >
          {item.authorLabel}
        </a>
      ) : (
        <span className="meta-item">{legacySearchMessage(messages, "issue.noAuthor")}</span>
      )}
      {item.createdLabel || item.updatedLabel ? (
        <span className="meta-item" title={item.createdLabel || item.updatedLabel}>
          {item.updatedLabel || item.createdLabel}
        </span>
      ) : null}
      {item.state ? <span className="meta-item">{item.state}</span> : null}
    </div>
  );
}

function SearchResultItem(props: {
  item: SearchItem;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
  showProject: boolean;
}) {
  const item = props.item;
  const snippetKey = (snippet: SearchSnippet) =>
    `${item.type}-${item.id}-${snippet.text}-${snippet.highlights
      .map((highlight) => `${highlight.start}-${highlight.end}`)
      .join("|")}`;
  if (item.type === "user") {
    const loginLabel = item.authorLoginId ? ` (@${item.authorLoginId})` : "";
    return (
      <li className="search-list-item project">
        <a
          className="avatar-wrap"
          data-placement="top"
          data-toggle="tooltip"
          href={prefixBasePath(props.runtimeConfig.basePath, item.href)}
          title={item.authorLoginId}
        >
          <img
            alt=""
            height={32}
            src={prefixBasePath(
              props.runtimeConfig.basePath,
              "/assets/images/default-avatar-64.png",
            )}
            width={32}
          />
        </a>
        <div className="title-wrap">
          <a
            className="title user-link"
            href={prefixBasePath(props.runtimeConfig.basePath, item.href)}
          >
            {item.title || item.authorLabel || item.authorLoginId}
            {loginLabel}
          </a>
        </div>
        <div className="infos nm">
          <span className="infos-item">
            {legacySearchMessage(props.messages, "userinfo.since")} {item.createdLabel}
          </span>
        </div>
      </li>
    );
  }
  if (item.type === "project") {
    return (
      <li className="search-list-item project">
        <a className="avatar-wrap" href={prefixBasePath(props.runtimeConfig.basePath, item.href)}>
          <img
            alt=""
            src={prefixBasePath(
              props.runtimeConfig.basePath,
              "/assets/images/project_default_logo.png",
            )}
          />
        </a>
        <div className="title-wrap">
          <a
            className="title project-link"
            href={prefixBasePath(props.runtimeConfig.basePath, item.href)}
          >
            {item.ownerName}/{item.projectName}
          </a>
        </div>
        <div className="search-content np">
          {item.snippets.map((snippet) => (
            <p className="search-content-body" key={snippetKey(snippet)}>
              <HighlightedSnippet snippet={snippet} />
              {snippet.truncated ? " ....." : null}
            </p>
          ))}
        </div>
        <div className="search-meta-info np">
          {item.createdLabel ? (
            <span className="meta-info">
              {legacySearchMessage(props.messages, "project.create")}{" "}
              <strong title={item.createdLabel}>{item.createdLabel}</strong>
            </span>
          ) : null}
          {item.updatedLabel ? (
            <span className="meta-info">
              {legacySearchMessage(props.messages, "project.codeUpdate")}{" "}
              <strong title={item.updatedLabel}>{item.updatedLabel}</strong>
            </span>
          ) : null}
        </div>
      </li>
    );
  }
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
      <SearchMeta
        item={item}
        messages={props.messages}
        runtimeConfig={props.runtimeConfig}
        showProject={props.showProject}
      />
    </li>
  );
}

export function SearchResults(props: {
  activeType: SearchType;
  input: SearchInput | null;
  isLoading: boolean;
  messages?: LegacyMessageLookup;
  response: SearchResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
  scope: SearchRouteScope;
}) {
  if (!props.input) {
    return <div className="empty-result"></div>;
  }
  if (props.isLoading) {
    return <div className="empty-result"></div>;
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
            messages={props.messages}
            runtimeConfig={props.runtimeConfig}
            showProject={props.scope.type !== "project"}
          />
        ))}
      </ul>
      <SearchPagination
        input={props.input}
        messages={props.messages}
        response={props.response}
        runtimeConfig={props.runtimeConfig}
        scope={props.scope}
      />
    </>
  );
}

export function SearchPagination(props: {
  input: SearchInput;
  messages?: LegacyMessageLookup;
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
            <a
              href={prevHref}
              {...({ "pjax-page": "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
              <i className="ico btn-pg-prev"></i>
              <span>{legacySearchMessage(props.messages, "button.prevPage")}</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{legacySearchMessage(props.messages, "button.prevPage")}</span>
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
            <a
              href={nextHref}
              {...({ "pjax-page": "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
              <i className="ico btn-pg-next"></i>
              <span>{legacySearchMessage(props.messages, "button.nextPage")}</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-next off"></i>
              <span className="off">{legacySearchMessage(props.messages, "button.nextPage")}</span>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function projectSearchDetail(
  scope: SearchRouteScope,
  detail: ProjectDetailViewModel | null | undefined,
): ProjectDetailViewModel | null {
  if (scope.type !== "project") {
    return null;
  }
  return detail ?? null;
}

function organizationSearchDetail(
  scope: SearchRouteScope,
  detail: OrganizationDetailViewModel | null | undefined,
): OrganizationDetailViewModel | null {
  if (scope.type !== "organization") {
    return null;
  }
  return detail ?? null;
}

export function SearchRoutePage({ scope }: { scope: SearchRouteScope }) {
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const routeQuery = readSearchRouteQuery();
  const routeInvalid =
    routeQuery.invalid || (scope.type === "project" && routeQuery.input?.searchType === "project");
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
  const projectChromeQuery = useQuery<ProjectDetailViewModel>({
    enabled: !bootstrapping && scope.type === "project" && !routeInvalid,
    queryFn: async () => {
      if (scope.type !== "project") {
        throw new Error("project chrome query requires project scope");
      }
      return toProjectContainerView(
        await readProjectContainerRest(runtimeConfig, scope.ownerName, scope.projectName),
      );
    },
    queryKey:
      scope.type === "project"
        ? apiQueryKeys.project.container(scope.ownerName, scope.projectName)
        : ["api", "v1", "owners", "", "projects", "", "container"],
  });
  const organizationChromeQuery = useQuery<OrganizationDetailViewModel>({
    enabled: !bootstrapping && scope.type === "organization" && !routeInvalid,
    queryFn: async () => {
      if (scope.type !== "organization") {
        throw new Error("organization chrome query requires organization scope");
      }
      return toOrganizationContainerView(
        await readOrganizationContainerRest(runtimeConfig, scope.organizationName),
      );
    },
    queryKey:
      scope.type === "organization"
        ? [...apiQueryKeys.organization.base(scope.organizationName), "container"]
        : ["api", "v1", "organizations", "", "container"],
  });
  const response = searchQuery.data;
  const activeType =
    response?.searchType ?? (input?.searchType === "auto" ? "issue" : input?.searchType) ?? "issue";
  const counts = response?.counts ?? emptyCounts();
  const activeCategory = SEARCH_CATEGORIES.find((category) => category.type === activeType);
  const activeCount = activeCategory ? counts[activeCategory.countKey] : 0;
  const projectDetail = projectSearchDetail(scope, projectChromeQuery.data);
  const organizationDetail = organizationSearchDetail(scope, organizationChromeQuery.data);
  useDocumentTitle("title.search");

  React.useEffect(() => {
    const routeError =
      searchQuery.error ?? projectChromeQuery.error ?? organizationChromeQuery.error;
    if (!routeError) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(routeError);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [organizationChromeQuery.error, projectChromeQuery.error, searchQuery.error]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{legacySearchMessage(messages, "common.loading")}</h1>
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
      {projectDetail ? (
        <>
          <ProjectHeader detail={projectDetail} runtimeConfig={runtimeConfig} />
          <ProjectMenu detail={projectDetail} runtimeConfig={runtimeConfig} />
        </>
      ) : null}
      {organizationDetail ? (
        <>
          <OrganizationHeader
            detail={organizationDetail}
            messages={messages}
            runtimeConfig={runtimeConfig}
          />
          <OrganizationMenu
            detail={organizationDetail}
            messages={messages}
            runtimeConfig={runtimeConfig}
          />
        </>
      ) : null}
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{legacySearchMessage(messages, "title.search")}</h3>
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
                messages={messages}
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
                    {legacySearchMessage(messages, "title.search")}
                  </button>
                </form>
                <SearchResultTitle
                  activeType={activeType}
                  count={activeCount}
                  messages={messages}
                />
              </div>
              <div className="search-result-wrap">
                <SearchResults
                  activeType={activeType}
                  input={input}
                  isLoading={searchQuery.isLoading}
                  messages={messages}
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
