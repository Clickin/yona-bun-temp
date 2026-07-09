import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Link as RouterLink, useRouter } from "@tanstack/react-router";
import {
  Fragment,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { currentSessionQueryOptions } from "../../../api/session";
import {
  isSearchType,
  projectSearchQueryOptions,
  type SearchCounts,
  type SearchResponse,
  type SearchType,
} from "../../../api/search";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  DefaultSearchErrorBody,
  emptySearchResult,
  isDefaultForbiddenError,
  isDefaultInternalServerError,
  isRequestTextTooLargeError,
  RequestTextTooLargeErrorBody,
} from "../../-search-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectSearchRouteSearch = {
  keyword: string;
  pageNum?: number;
  routeInvalid?: boolean;
  searchType: SearchType;
};

type ProjectSearchCategory = {
  countKey: keyof SearchCounts;
  labelKey: string;
  type: Exclude<SearchType, "auto" | "project">;
};

const PROJECT_SEARCH_CATEGORIES: ProjectSearchCategory[] = [
  { countKey: "issues", labelKey: "search.menu.issues", type: "issue" },
  { countKey: "users", labelKey: "search.menu.users", type: "user" },
  { countKey: "posts", labelKey: "search.menu.boards", type: "post" },
  { countKey: "milestones", labelKey: "search.menu.milestones", type: "milestone" },
  { countKey: "issueComments", labelKey: "search.menu.issue.comments", type: "issue_comment" },
  { countKey: "postComments", labelKey: "search.menu.board.comments", type: "post_comment" },
  { countKey: "reviews", labelKey: "search.menu.reviews", type: "review" },
];

const projectSearchPaginationLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const projectSearchPaginationLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

export const Route = createFileRoute("/$ownerName/$projectName/search")({
  component: ProjectSearchRoute,
  validateSearch: (search: Record<string, unknown>): ProjectSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "";
    const rawKeyword = typeof search.keyword === "string" ? search.keyword : "";
    const hasExplicitPageNum =
      typeof search.pageNum === "number" || typeof search.pageNum === "string";
    const rawPageNum =
      typeof search.pageNum === "number"
        ? search.pageNum
        : typeof search.pageNum === "string"
          ? Number.parseInt(search.pageNum, 10)
          : 1;
    const validSearchType = isSearchType(rawSearchType);
    return {
      keyword: rawKeyword,
      pageNum:
        hasExplicitPageNum && Number.isFinite(rawPageNum) && rawPageNum > 0
          ? rawPageNum
          : undefined,
      routeInvalid:
        rawKeyword.length === 0 || !validSearchType || rawSearchType === "project"
          ? true
          : undefined,
      searchType: validSearchType && rawSearchType !== "project" ? rawSearchType : "auto",
    };
  },
});

function ProjectSearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectSearchScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectSearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: !search.routeInvalid,
  });
  const currentSessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const hasKeyword = search.keyword.length > 0;
  const pageNum = search.pageNum ?? 1;
  const searchQuery = useQuery({
    ...projectSearchQueryOptions(runtimeConfig, {
      ...search,
      pageNum,
      ownerName,
      projectName,
    }),
    enabled: hasKeyword && !search.routeInvalid,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      pageNum,
      scope: "project",
    });

  if (isRequestTextTooLargeError(searchQuery.error)) {
    if (!projectQuery.data) {
      return null;
    }

    return (
      <ProjectSearchRouteShell
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      >
        <RequestTextTooLargeErrorBody />
      </ProjectSearchRouteShell>
    );
  }

  if (search.routeInvalid) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <DefaultSearchErrorBody
          iconClassName="ico-404"
          messageKey="error.badrequest"
          runtimeConfig={runtimeConfig}
          ybtnClassName="ybtn ybtn-info"
        />
      </SiteLayoutShell>
    );
  }

  if (!projectQuery.data) {
    return null;
  }

  if (isDefaultForbiddenError(searchQuery.error)) {
    return (
      <ProjectSearchRouteShell
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      >
        <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
        <ProjectMenu
          active="home"
          basePath={runtimeConfig.basePath}
          counts={projectSearchProjectMenuCounts(projectQuery.data)}
          project={projectQuery.data}
        />
        <ProjectSearchForbiddenErrorBody
          isAnonymous={isAnonymousViewer(currentSessionQuery.data)}
          redirectUrl={legacyProjectSearchRedirectUrl(
            runtimeConfig.basePath,
            ownerName,
            projectName,
            search,
          )}
        />
      </ProjectSearchRouteShell>
    );
  }

  if (isDefaultInternalServerError(searchQuery.error)) {
    return (
      <ProjectSearchRouteShell
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      >
        <DefaultSearchErrorBody
          iconClassName="ico-404"
          messageKey="error.internalServerError"
          runtimeConfig={runtimeConfig}
        />
      </ProjectSearchRouteShell>
    );
  }

  return (
    <ProjectSearchRouteShell
      ownerName={ownerName}
      project={projectQuery.data}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    >
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        basePath={runtimeConfig.basePath}
        counts={projectSearchProjectMenuCounts(projectQuery.data)}
        project={projectQuery.data}
      />
      <ProjectSearchSuccessBody
        ownerName={ownerName}
        projectName={projectName}
        result={result}
        runtimeConfig={runtimeConfig}
      />
    </ProjectSearchRouteShell>
  );
}

function ProjectSearchRouteShell({
  children,
  ownerName,
  project,
  projectName,
  runtimeConfig,
}: {
  children: ReactNode;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();

  return (
    <>
      <title>{`${t("title.search")} - ${ownerName}/${projectName}`}</title>
      <SiteLayoutShell
        projectSearchScope={{
          organizationName: projectSearchScopeOrganizationName(project, ownerName),
          ownerName,
          projectName,
        }}
        runtimeConfig={runtimeConfig}
        showLegacyProjectHeaderLinks
      >
        {children}
      </SiteLayoutShell>
    </>
  );
}

function ProjectSearchSuccessBody({
  ownerName,
  projectName,
  result,
  runtimeConfig,
}: {
  ownerName: string;
  projectName: string;
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeType = projectSearchNormalizedType(result.searchType);
  const activeCount = projectSearchCountForType(result.counts, activeType);
  const resultTitle = renderProjectSearchResultTitle(
    t("search.result.title", {
      args: [activeCount, projectSearchTitleForType(t, activeType)],
    }),
  );
  const searchPath = `/${ownerName}/${projectName}/search`;
  const [keywordValue, setKeywordValue] = useState(result.keyword);

  useEffect(() => {
    setKeywordValue(result.keyword);
  }, [result.keyword]);

  const navigateToSearch = (
    searchType: Exclude<SearchType, "auto" | "project">,
    keyword: string,
  ) => {
    void queryClient.invalidateQueries({
      queryKey: ["search", "project", ownerName, projectName],
    });
    void router.navigate({
      search: {
        keyword,
        searchType,
      },
      to: searchPath,
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
                  {PROJECT_SEARCH_CATEGORIES.map((category) => {
                    const count = result.counts[category.countKey];
                    const className = `${category.type === activeType ? "active" : ""} ${
                      count === 0 ? "empty" : ""
                    }`;
                    return (
                      <li className={className} key={category.type}>
                        <Link
                          activeOptions={projectSearchPaginationLinkActiveOptions}
                          activeProps={projectSearchPaginationLinkActiveProps}
                          from="/$ownerName/$projectName/search"
                          hash={`project-search-category-active-suppressor-${category.type}-${activeType}`}
                          mask={{
                            params: { ownerName, projectName },
                            search: {
                              keyword: keywordValue,
                              searchType: category.type,
                            },
                            to: "/$ownerName/$projectName/search",
                          }}
                          params={{ ownerName, projectName }}
                          search={{
                            keyword: keywordValue,
                            searchType: category.type,
                          }}
                          to="/$ownerName/$projectName/search"
                        >
                          {t(category.labelKey)}{" "}
                          <span className="num-badge pull-right">{count}</span>
                        </Link>
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
                    action={prefixBasePath(runtimeConfig.basePath, searchPath)}
                    onSubmit={(event) => {
                      event.preventDefault();
                      navigateToSearch(activeType, keywordValue);
                    }}
                  >
                    <input type="hidden" name="searchType" value={activeType} />
                    <input
                      type="text"
                      id="searchKeyword"
                      name="keyword"
                      className="span11"
                      value={keywordValue}
                      onChange={(event) => {
                        setKeywordValue(event.currentTarget.value);
                      }}
                    />
                    <button type="submit" className="ybtn">
                      {t("title.search")}
                    </button>
                  </form>
                  <h3 className="search-result-title">{resultTitle}</h3>
                </div>
                <div className="search-result-wrap">
                  <ProjectSearchResultList
                    ownerName={ownerName}
                    projectName={projectName}
                    result={result}
                    runtimeConfig={runtimeConfig}
                    searchPath={searchPath}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProjectSearchResultList({
  ownerName,
  projectName,
  result,
  runtimeConfig,
  searchPath,
}: {
  ownerName: string;
  projectName: string;
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
  searchPath: string;
}) {
  const { t } = useLegacyMessages();

  if (result.items.length === 0) {
    return <div className="empty-result"></div>;
  }

  const normalizedType = projectSearchNormalizedType(result.searchType);

  if (normalizedType === "user") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const userLink = projectSearchInternalLinkTarget(item.href, runtimeConfig);
            return (
              <li className="search-list-item project" key={item.id}>
                <RouterLink
                  to={userLink.to}
                  hash={userLink.hash || undefined}
                  className="avatar-wrap"
                  data-placement="top"
                  title={item.authorLoginId}
                >
                  {isDefaultProjectSearchAvatar(item.avatarUrl) ? (
                    /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
                    <img src={item.avatarUrl} />
                  ) : (
                    <img src={item.avatarUrl || ""} alt={item.authorLabel} width="32" height="32" />
                  )}
                </RouterLink>
                <div className="title-wrap">
                  <Link
                    to={userLink.to}
                    hash={userLink.hash || undefined}
                    className="title user-link"
                  >
                    <HighlightedProjectSearchText
                      text={`${item.authorLabel} (@${item.authorLoginId})`}
                      keyword={result.keyword}
                    />
                  </Link>
                </div>
                <div className="infos nm">
                  <span className="infos-item">
                    {t("userinfo.since")} {item.createdLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <ProjectSearchPagination
          ownerName={ownerName}
          projectName={projectName}
          result={result}
          searchPath={searchPath}
        />
      </>
    );
  }

  if (
    normalizedType === "issue" ||
    normalizedType === "post" ||
    normalizedType === "issue_comment" ||
    normalizedType === "post_comment" ||
    normalizedType === "review"
  ) {
    const titleClassName =
      normalizedType === "issue_comment" ||
      normalizedType === "post_comment" ||
      normalizedType === "review"
        ? undefined
        : "title";

    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const itemLink = projectSearchInternalLinkTarget(item.href, runtimeConfig);
            const authorLink = projectSearchInternalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.authorLoginId}`),
              runtimeConfig,
            );
            const reviewThreadOnPullRequest =
              normalizedType !== "review" || item.reviewThreadOnPullRequest === true;
            const snippets = item.snippets.map((snippet) => (
              <p
                className="search-content-body"
                key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
              >
                <HighlightedProjectSearchText text={snippet.text} keyword={result.keyword} />
                {snippet.truncated ? " ....." : null}
              </p>
            ));
            const legacyReplyTitle = titleClassName ? item.title : `Re) ${item.title}`;

            return (
              <li className="search-list-item" key={item.id}>
                {reviewThreadOnPullRequest ? (
                  <div className="title-wrap">
                    <span className="post-id">#{item.number}</span>
                    <Link
                      to={itemLink.to}
                      hash={itemLink.hash || undefined}
                      className={titleClassName}
                    >
                      {titleClassName ? (
                        <HighlightedProjectSearchText text={item.title} keyword={result.keyword} />
                      ) : (
                        legacyReplyTitle
                      )}
                    </Link>
                  </div>
                ) : null}
                <div className="search-content">
                  {reviewThreadOnPullRequest ? (
                    snippets
                  ) : (
                    <Link to={itemLink.to} hash={itemLink.hash || undefined}>
                      {snippets}
                    </Link>
                  )}
                </div>
                <div className="search-meta-info">
                  {item.authorLabel ? (
                    <RouterLink
                      to={authorLink.to}
                      hash={authorLink.hash || undefined}
                      className="meta-item"
                      data-placement="top"
                      title={item.authorLoginId}
                    >
                      {item.authorLabel}
                    </RouterLink>
                  ) : (
                    <span className="meta-item">
                      {t(normalizedType === "post_comment" ? "posting.noAuthor" : "issue.noAuthor")}
                    </span>
                  )}
                  <span className="meta-item" title={item.createdLabel}>
                    {item.createdLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <ProjectSearchPagination
          ownerName={ownerName}
          projectName={projectName}
          result={result}
          searchPath={searchPath}
        />
      </>
    );
  }

  if (normalizedType === "milestone") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const itemLink = projectSearchInternalLinkTarget(item.href, runtimeConfig);
            return (
              <li className="search-list-item" key={item.id}>
                <div className="title-wrap">
                  <Link to={itemLink.to} hash={itemLink.hash || undefined} className="title">
                    <HighlightedProjectSearchText text={item.title} keyword={result.keyword} />
                  </Link>
                </div>
                <div className="search-content">
                  {item.snippets.map((snippet) => (
                    <p
                      className="search-content-body"
                      key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
                    >
                      <HighlightedProjectSearchText text={snippet.text} keyword={result.keyword} />
                      {snippet.truncated ? " ....." : null}
                    </p>
                  ))}
                </div>
                <div className="search-meta-info">
                  {item.updatedLabel ? (
                    <span className="due-date meta-item">
                      {t("label.dueDate")} <strong>{item.updatedLabel}</strong>{" "}
                      {item.dueDateUntilLabel ? `(${item.dueDateUntilLabel})` : null}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <ProjectSearchPagination
          ownerName={ownerName}
          projectName={projectName}
          result={result}
          searchPath={searchPath}
        />
      </>
    );
  }

  return <div className="empty-result"></div>;
}

function ProjectSearchPagination({
  ownerName,
  projectName,
  result,
  searchPath,
}: {
  ownerName: string;
  projectName: string;
  result: SearchResponse;
  searchPath: string;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const totalPages = projectSearchTotalPages(result);

  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = clampProjectSearchPageNum(result.pageNum, totalPages);
  const activeType = projectSearchNormalizedType(result.searchType);
  const pageSearch = (pageNum: number) => ({
    keyword: result.keyword,
    pageNum,
    searchType: activeType,
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: searchPath,
    });
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (!/^\d+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }

    const pageNum = clampProjectSearchPageNum(
      Number.parseInt(event.currentTarget.value, 10),
      totalPages,
    );
    event.currentTarget.value = String(pageNum);
    navigateToPage(pageNum);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {currentPage > 1 ? (
            <Link
              activeOptions={projectSearchPaginationLinkActiveOptions}
              activeProps={projectSearchPaginationLinkActiveProps}
              from="/$ownerName/$projectName/search"
              params={{ ownerName, projectName }}
              search={pageSearch(currentPage - 1)}
              to="/$ownerName/$projectName/search"
            >
              <i className="ico btn-pg-prev"></i>
              <span>{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{t("button.prevPage")}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            key={currentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {currentPage < totalPages ? (
            <Link
              activeOptions={projectSearchPaginationLinkActiveOptions}
              activeProps={projectSearchPaginationLinkActiveProps}
              from="/$ownerName/$projectName/search"
              params={{ ownerName, projectName }}
              search={pageSearch(currentPage + 1)}
              to="/$ownerName/$projectName/search"
            >
              <span>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">{t("button.nextPage")}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function projectSearchNormalizedType(
  searchType: SearchType,
): Exclude<SearchType, "auto" | "project"> {
  switch (searchType) {
    case "issue":
    case "user":
    case "post":
    case "milestone":
    case "issue_comment":
    case "post_comment":
    case "review":
      return searchType;
    case "auto":
    case "project":
      return "issue";
  }
}

function projectSearchCountForType(
  counts: SearchCounts,
  searchType: Exclude<SearchType, "auto" | "project">,
) {
  switch (searchType) {
    case "issue":
      return counts.issues;
    case "user":
      return counts.users;
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
  }
}

function projectSearchTitleForType(
  t: ReturnType<typeof useLegacyMessages>["t"],
  searchType: Exclude<SearchType, "auto" | "project">,
) {
  const category = PROJECT_SEARCH_CATEGORIES.find((entry) => entry.type === searchType);
  return category ? t(category.labelKey) : "";
}

function renderProjectSearchResultTitle(message: string): ReactNode {
  const match = /^(.*?)<strong>(.*?)<\/\s*strong\s*>(.*)$/u.exec(message);
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

function projectSearchInternalLinkTarget(href: string, runtimeConfig: RuntimeConfig) {
  const [hrefWithoutHash, hash = ""] = href.split("#", 2);
  const basePath = runtimeConfig.basePath.replace(/\/$/u, "");
  const to =
    basePath && hrefWithoutHash.startsWith(`${basePath}/`)
      ? hrefWithoutHash.slice(basePath.length)
      : hrefWithoutHash || "/";
  return { hash, to };
}

function projectSearchTotalPages(result: SearchResponse) {
  const providedTotalPages = Number((result as Record<string, unknown>).totalPages);
  if (Number.isFinite(providedTotalPages) && providedTotalPages > 0) {
    return providedTotalPages;
  }
  return Math.ceil(result.totalCount / Math.max(result.pageSize, 1));
}

function clampProjectSearchPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function isDefaultProjectSearchAvatar(avatarUrl: string | undefined) {
  return avatarUrl?.includes("gravatar.com/avatar/") === true;
}

function HighlightedProjectSearchText({ keyword, text }: { keyword: string; text: string }) {
  const trimmedKeyword = keyword.trim();
  if (trimmedKeyword.length === 0) {
    return <>{text}</>;
  }

  const keywordRegex = new RegExp(escapeProjectSearchRegExp(trimmedKeyword), "gi");
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(keywordRegex)) {
    const start = match.index ?? 0;
    const matchText = match[0] ?? "";
    if (start > cursor) {
      nodes.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor, start)}</Fragment>);
    }
    nodes.push(
      <strong className="keyword" key={`keyword-${start}`}>
        {matchText}
      </strong>,
    );
    cursor = start + matchText.length;
  }

  if (cursor < text.length) {
    nodes.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor)}</Fragment>);
  }

  return <>{nodes.length > 0 ? nodes : text}</>;
}

function escapeProjectSearchRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ProjectSearchForbiddenErrorBody({
  isAnonymous,
  redirectUrl,
}: {
  isAnonymous: boolean;
  redirectUrl: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.forbidden")}</p>
          {isAnonymous ? (
            <Link
              className="ybtn ybtn-primary"
              search={{ redirectUrl } as never}
              to="/users/loginform"
            >
              {t("title.login")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isAnonymousViewer(session: unknown) {
  return (
    typeof session === "object" &&
    session !== null &&
    "isAnonymous" in session &&
    session.isAnonymous === true
  );
}

function legacyProjectSearchRedirectUrl(
  basePath: string,
  ownerName: string,
  projectName: string,
  search: ProjectSearchRouteSearch,
) {
  const params = new URLSearchParams();
  params.set("keyword", search.keyword);
  params.set("searchType", search.searchType);
  if (typeof search.pageNum === "number" && Number.isFinite(search.pageNum) && search.pageNum > 1) {
    params.set("pageNum", String(search.pageNum));
  } else if (search.pageNum === 1) {
    params.set("pageNum", "1");
  }
  return `${prefixBasePath(basePath, `/${ownerName}/${projectName}/search`)}?${params.toString()}`;
}

function projectSearchProjectMenuCounts(project: ProjectContainer) {
  return {
    board: projectSearchNumberField(project, "postCount", "boardCount"),
    issue: projectSearchNumberField(project, "openIssueCount", "issueCount"),
    pullRequest: projectSearchNumberField(project, "openPullRequestCount", "pullRequestCount"),
    review: projectSearchNumberField(project, "reviewCount"),
  };
}

function projectSearchNumberField(value: ProjectContainer, field: string, fallbackField?: string) {
  const record = value as Record<string, unknown>;
  const direct = record[field];
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return direct;
  }
  if (!fallbackField) {
    return 0;
  }
  const fallback = record[fallbackField];
  return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : 0;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}
