import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Link as RouterLink, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  Fragment,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { apiQueryKeys } from "../api/query-keys";
import {
  globalSearchQueryOptions,
  isSearchType,
  type SearchCounts,
  type SearchResponse,
  type SearchType,
} from "../api/search";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
import {
  emptySearchResult,
  DefaultSearchErrorBody,
  isDefaultForbiddenError,
  isDefaultInternalServerError,
  isRequestTextTooLargeError,
  RequestTextTooLargeErrorBody,
} from "./-search-screen";
import { styles } from "./-search.stylex";

type SearchCategory = {
  countKey: keyof SearchCounts;
  labelKey: string;
  type: Exclude<SearchType, "auto">;
};

const GLOBAL_SEARCH_CATEGORIES: SearchCategory[] = [
  { countKey: "issues", labelKey: "search.menu.issues", type: "issue" },
  { countKey: "users", labelKey: "search.menu.users", type: "user" },
  { countKey: "projects", labelKey: "search.menu.projects", type: "project" },
  { countKey: "posts", labelKey: "search.menu.boards", type: "post" },
  { countKey: "milestones", labelKey: "search.menu.milestones", type: "milestone" },
  { countKey: "issueComments", labelKey: "search.menu.issue.comments", type: "issue_comment" },
  { countKey: "postComments", labelKey: "search.menu.board.comments", type: "post_comment" },
  { countKey: "reviews", labelKey: "search.menu.reviews", type: "review" },
];

// The legacy Scala HTML/JS is the output DOM/UX source of truth; interaction is
// translated to React state/events and TanStack Router navigation below.
const globalSearchCategoryStyles = stylex.create({
  list: {
    borderTopColor: "#ddd",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    listStyle: "none",
    margin: "0px",
    padding: "0px",
  },
  item: {
    borderBottomColor: "#e5e5e5",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    fontSize: "13px",
    fontWeight: "bold",
    padding: "8px",
  },
  link: {
    alignItems: "center",
    appearance: "none",
    backgroundColor: "transparent",
    border: "0px",
    borderRadius: "0px",
    boxShadow: "none",
    color: "#333",
    display: "flex",
    font: "inherit",
    gap: "8px",
    justifyContent: "space-between",
    padding: "9px 8px",
    textAlign: "left",
    textDecoration: "none",
    width: "100%",
  },
  linkActive: { color: "#fff" },
  linkEmpty: { color: "#d3d2d3" },
  badge: { paddingLeft: "2px", paddingRight: "2px" },
  badgeActive: { color: "#fff" },
});

const legacySearchPaginationLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
} as const;

const legacySearchPaginationLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

type SearchRouteSearch = {
  keyword: string;
  pageNum?: number;
  routeInvalid?: boolean;
  searchType: SearchType;
};

export const Route = createFileRoute("/search")({
  component: SearchRoute,
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => {
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
      routeInvalid: rawKeyword.length === 0 || !validSearchType ? true : undefined,
      searchType: validSearchType ? rawSearchType : "auto",
    };
  },
});

function SearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const search = Route.useSearch();
  const hasKeyword = search.keyword.length > 0;
  const pageNum = search.pageNum ?? 1;
  const searchQuery = useQuery({
    ...globalSearchQueryOptions(runtimeConfig, {
      ...search,
      pageNum,
    }),
    enabled: hasKeyword && !search.routeInvalid,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      pageNum,
      scope: "global",
    });

  if (search.routeInvalid) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.badrequest"
        runtimeConfig={runtimeConfig}
        ybtnClassName="ybtn ybtn-info"
      />
    );
  }

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }
  if (isDefaultForbiddenError(searchQuery.error)) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico ico-err2"
        messageKey="error.forbidden"
        runtimeConfig={runtimeConfig}
      />
    );
  }
  if (isDefaultInternalServerError(searchQuery.error)) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.internalServerError"
        runtimeConfig={runtimeConfig}
      />
    );
  }

  return (
    <>
      <title>{t("title.search")}</title>
      <GlobalSearchSuccessBody result={result} runtimeConfig={runtimeConfig} />
    </>
  );
}

function GlobalSearchSuccessBody({
  result,
  runtimeConfig,
}: {
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeType = result.searchType === "auto" ? "issue" : result.searchType;
  const activeCount = globalSearchCountForType(result.counts, activeType);
  const activeTitle = globalSearchTitleForType(t, activeType);
  const resultTitle = renderGlobalSearchResultTitle(
    t("search.result.title", { args: [activeCount, activeTitle] }),
  );
  const [keywordValue, setKeywordValue] = useState(result.keyword);
  const searchTarget = (searchType: SearchType, keyword: string) => ({
    search: {
      keyword,
      searchType,
    },
    to: "/search" as const,
  });
  const navigationMutation = useMutation({
    mutationFn: async ({ keyword, searchType }: { keyword: string; searchType: SearchType }) =>
      searchTarget(searchType, keyword),
    onSuccess(target) {
      void queryClient.invalidateQueries({ queryKey: globalSearchQueryKey(result) });
      void router.navigate(target);
    },
  });

  useEffect(() => {
    setKeywordValue(result.keyword);
  }, [result.keyword]);

  return (
    <>
      <div className="site-breadcrumb-outer" data-stylex-owner="global-search-breadcrumb-outer">
        <div
          {...stylex.props(styles.breadcrumb)}
          data-stylex-owner="global-search-breadcrumb-inner"
        >
          <h3>{t("title.search")}</h3>
        </div>
      </div>
      <div {...stylex.props(styles.page)} data-stylex-owner="global-search-page">
        <div data-stylex-owner="global-search-shell">
          <div className="project-page-wrap">
            <div
              className={`row-fluid ${stylex.props(styles.globalSearchGridRow).className}`}
              data-stylex-owner="global-search-grid-row"
            >
              <div
                className={`span2 ${stylex.props(styles.globalSearchCategoryColumn, styles.category).className}`}
                data-stylex-owner="global-search-category"
              >
                <ul
                  className={`lst-stacked unstyled search-category-wrap ${stylex.props(globalSearchCategoryStyles.list).className}`}
                  data-stylex-owner="global-search-category-list"
                >
                  {GLOBAL_SEARCH_CATEGORIES.map((category) => {
                    const count = result.counts[category.countKey];

                    return (
                      <li
                        className={`${category.type === activeType ? "active" : ""} ${
                          count === 0 ? "empty" : ""
                        } ${
                          stylex.props(
                            globalSearchCategoryStyles.item,
                            styles.categoryItem,
                            category.type === activeType && styles.categoryItemActive,
                          ).className
                        }`}
                        data-stylex-owner="global-search-category-item"
                        key={category.type}
                      >
                        <Link
                          {...stylex.props(
                            globalSearchCategoryStyles.link,
                            styles.categoryLink,
                            category.type === activeType && globalSearchCategoryStyles.linkActive,
                            category.type === activeType && styles.categoryLinkActive,
                            count === 0 && globalSearchCategoryStyles.linkEmpty,
                            count === 0 && styles.categoryLinkEmpty,
                          )}
                          to="/search"
                          search={{
                            keyword: keywordValue,
                            searchType: category.type,
                          }}
                          activeOptions={legacySearchPaginationLinkActiveOptions}
                          activeProps={legacySearchPaginationLinkActiveProps}
                        >
                          {t(category.labelKey)}{" "}
                          <span
                            className={`num-badge pull-right ${
                              stylex.props(
                                globalSearchCategoryStyles.badge,
                                styles.categoryBadge,
                                category.type === activeType &&
                                  globalSearchCategoryStyles.badgeActive,
                                category.type === activeType && styles.categoryBadgeActive,
                              ).className
                            }`}
                          >
                            {count}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div
                className={`span10 ${stylex.props(styles.globalSearchResultsColumn).className}`}
                data-stylex-owner="global-search-results-column"
              >
                <div {...stylex.props(styles.searchBox)} data-stylex-owner="global-search-box-wrap">
                  <form
                    id="searchInnerForm"
                    method="get"
                    action={prefixBasePath(runtimeConfig.basePath, "/search")}
                    onSubmit={(event) => {
                      event.preventDefault();
                      navigationMutation.mutate({
                        keyword: keywordValue,
                        searchType: activeType,
                      });
                    }}
                  >
                    <input type="hidden" name="searchType" value={activeType} />
                    <input
                      type="text"
                      id="searchKeyword"
                      name="keyword"
                      {...stylex.props(styles.searchInput)}
                      data-stylex-owner="global-search-input"
                      value={keywordValue}
                      onChange={(event) => {
                        setKeywordValue(event.currentTarget.value);
                      }}
                    />
                    <button type="submit" className="ybtn">
                      {t("title.search")}
                    </button>
                  </form>

                  <h3
                    className={`search-result-title ${stylex.props(styles.resultHeading).className}`}
                    data-stylex-owner="global-search-result-heading"
                  >
                    {resultTitle}
                  </h3>
                </div>
                <div {...stylex.props(styles.result)} data-stylex-owner="global-search-result-wrap">
                  <GlobalSearchResultList result={result} runtimeConfig={runtimeConfig} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GlobalSearchResultList({
  result,
  runtimeConfig,
}: {
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const searchType = result.searchType === "auto" ? "issue" : result.searchType;

  if (result.items.length === 0) {
    const emptyResultProps = stylex.props(
      styles.emptyResult,
      styles.emptyResultBackground(
        `url(${prefixBasePath(runtimeConfig.basePath, "/legacy-assets/images/no_contents.jpg")})`,
      ),
    );
    return (
      <div
        {...emptyResultProps}
        className={`empty-result ${emptyResultProps.className}`}
        data-stylex-owner="global-search-empty-result"
      ></div>
    );
  }

  if (searchType === "project") {
    return (
      <ul
        className={`search-list-wrap ${stylex.props(styles.resultList).className}`}
        data-stylex-owner="global-search-result-list"
      >
        {result.items.map((item) => {
          const projectLink = globalSearchInternalLinkTarget(item.href, runtimeConfig);
          const originProjectLink =
            item.originOwnerName && item.originProjectName
              ? globalSearchInternalLinkTarget(
                  prefixBasePath(
                    runtimeConfig.basePath,
                    `/${item.originOwnerName}/${item.originProjectName}`,
                  ),
                  runtimeConfig,
                )
              : null;

          return (
            <li
              className={`search-list-item project ${stylex.props(styles.resultItem, styles.resultItemProject).className}`}
              key={item.id}
              data-stylex-owner="global-search-result-item"
            >
              <Link
                to={projectLink.to}
                hash={projectLink.hash || undefined}
                className={`avatar-wrap ${stylex.props(styles.avatar).className}`}
                data-stylex-owner="global-search-avatar"
              >
                <GlobalSearchProjectLogoImage
                  src={item.projectLogoUrl || "/assets/images/project_default_logo.png"}
                />
              </Link>
              <div
                className={`title-wrap ${stylex.props(styles.resultTitleWrap).className}`}
                data-stylex-owner="global-search-result-title-wrap"
              >
                <Link
                  to={projectLink.to}
                  hash={projectLink.hash || undefined}
                  className={`title project-link ${stylex.props(styles.projectLink).className}`}
                >
                  <GlobalSearchHighlightedText
                    text={`${item.ownerName}/${item.projectName}`}
                    keyword={result.keyword}
                  />
                </Link>
              </div>
              {originProjectLink ? (
                <div
                  className={`search-meta-info nm np ${stylex.props(styles.meta, styles.metaNoPadding).className}`}
                  data-stylex-owner="global-search-meta"
                >
                  <span>
                    <i className="yobicon-split yobicon-white vmiddle"></i> {t("fork.original")}
                  </span>
                  <span>
                    <Link
                      to={originProjectLink.to}
                      hash={originProjectLink.hash || undefined}
                      className={`project-link ${stylex.props(styles.projectLink).className}`}
                    >
                      {item.originOwnerName}/{item.originProjectName}
                    </Link>
                  </span>
                </div>
              ) : null}
              <div
                className={`search-content np ${stylex.props(styles.content, styles.contentNoPadding).className}`}
                data-stylex-owner="global-search-content"
              >
                <p className={`search-content-body ${stylex.props(styles.contentBody).className}`}>
                  <GlobalSearchHighlightedText
                    text={item.snippets[0]?.text ?? ""}
                    keyword={result.keyword}
                  />
                </p>
              </div>
              <div
                className={`search-meta-info np ${stylex.props(styles.meta, styles.metaNoPadding).className}`}
                data-stylex-owner="global-search-meta"
              >
                <span className={`meta-info ${stylex.props(styles.metaItem).className}`}>
                  {t("project.create")}{" "}
                  <strong title={item.createdLabel}>{item.createdLabel}</strong>
                </span>
                {item.updatedLabel ? (
                  <span className={`meta-info ${stylex.props(styles.metaItem).className}`}>
                    {t("project.codeUpdate")}{" "}
                    <strong title={item.updatedLabel}>{item.updatedLabel}</strong>
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (searchType === "user") {
    return (
      <>
        <ul
          className={`search-list-wrap ${stylex.props(styles.resultList).className}`}
          data-stylex-owner="global-search-result-list"
        >
          {result.items.map((item) => {
            const userLink = globalSearchInternalLinkTarget(item.href, runtimeConfig);

            return (
              <li
                className={`search-list-item project ${stylex.props(styles.resultItem, styles.resultItemProject).className}`}
                key={item.id}
                data-stylex-owner="global-search-result-item"
              >
                <RouterLink
                  to={userLink.to}
                  hash={userLink.hash || undefined}
                  className={`avatar-wrap ${stylex.props(styles.avatar).className}`}
                  data-stylex-owner="global-search-avatar"
                  title={item.authorLoginId}
                >
                  {isDefaultUserSearchAvatar(item.avatarUrl) ? (
                    /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
                    <img {...stylex.props(styles.avatarImage)} src={item.avatarUrl} />
                  ) : (
                    <img
                      {...stylex.props(styles.avatarImage)}
                      src={item.avatarUrl || ""}
                      alt={item.authorLabel}
                      width="32"
                      height="32"
                    />
                  )}
                </RouterLink>
                <div
                  className={`title-wrap ${stylex.props(styles.resultTitleWrap).className}`}
                  data-stylex-owner="global-search-result-title-wrap"
                >
                  <Link
                    to={userLink.to}
                    hash={userLink.hash || undefined}
                    className={`title user-link ${stylex.props(styles.userLink).className}`}
                  >
                    <GlobalSearchHighlightedText
                      text={`${item.authorLabel} (@${item.authorLoginId})`}
                      keyword={result.keyword}
                    />
                  </Link>
                </div>
                <div className="infos nm">
                  <span className="infos-item">{`${t("userinfo.since")} ${item.createdLabel}`}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <GlobalSearchPagination result={result} />
      </>
    );
  }

  if (
    searchType === "issue" ||
    searchType === "post" ||
    searchType === "issue_comment" ||
    searchType === "post_comment" ||
    searchType === "review"
  ) {
    const titleClassName =
      searchType === "issue_comment" || searchType === "post_comment" || searchType === "review"
        ? undefined
        : "title";

    return (
      <>
        <ul
          className={`search-list-wrap ${stylex.props(styles.resultList).className}`}
          data-stylex-owner="global-search-result-list"
        >
          {result.items.map((item) => {
            const itemLink = globalSearchInternalLinkTarget(item.href, runtimeConfig);
            const projectLink = globalSearchInternalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.ownerName}/${item.projectName}`),
              runtimeConfig,
            );
            const authorLink = globalSearchInternalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.authorLoginId}`),
              runtimeConfig,
            );
            const reviewThreadOnPullRequest =
              searchType !== "review" || item.reviewThreadOnPullRequest === true;
            const snippets = item.snippets.map((snippet) => (
              <p
                className={`search-content-body ${stylex.props(styles.contentBody).className}`}
                key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
              >
                <GlobalSearchHighlightedText text={snippet.text} keyword={result.keyword} />
                {snippet.truncated ? " ..... " : null}
              </p>
            ));

            return (
              <li
                className={`search-list-item ${stylex.props(styles.resultItem).className}`}
                key={item.id}
                data-stylex-owner="global-search-result-item"
              >
                {reviewThreadOnPullRequest ? (
                  <div
                    className={`title-wrap ${stylex.props(styles.resultTitleWrap).className}`}
                    data-stylex-owner="global-search-result-title-wrap"
                  >
                    <span
                      className={`post-id ${stylex.props(styles.resultPostId).className}`}
                      data-stylex-owner="global-search-result-post-id"
                    >
                      #{item.number}
                    </span>
                    <Link
                      to={itemLink.to}
                      hash={itemLink.hash || undefined}
                      className={`${titleClassName ?? ""} ${stylex.props(styles.resultTitle).className}`.trim()}
                      data-stylex-owner="global-search-result-title"
                    >
                      {titleClassName ? (
                        <GlobalSearchHighlightedText text={item.title} keyword={result.keyword} />
                      ) : (
                        item.title
                      )}
                    </Link>
                  </div>
                ) : null}
                <div
                  className={`search-content ${stylex.props(styles.content).className}`}
                  data-stylex-owner="global-search-content"
                >
                  {reviewThreadOnPullRequest ? (
                    snippets
                  ) : (
                    <Link to={itemLink.to} hash={itemLink.hash || undefined}>
                      {snippets}
                    </Link>
                  )}
                </div>
                <div
                  className={`search-meta-info ${stylex.props(styles.meta).className}`}
                  data-stylex-owner="global-search-meta"
                >
                  <Link
                    to={projectLink.to}
                    hash={projectLink.hash || undefined}
                    className={`project-link meta-item ${stylex.props(styles.projectLink, styles.metaItem).className}`}
                  >
                    {item.ownerName}/{item.projectName}
                  </Link>
                  {item.authorLabel ? (
                    <RouterLink
                      to={authorLink.to}
                      hash={authorLink.hash || undefined}
                      className={`meta-item ${stylex.props(styles.metaItem).className}`}
                      title={item.authorLoginId}
                    >
                      {item.authorLabel}
                    </RouterLink>
                  ) : (
                    <span className={`meta-item ${stylex.props(styles.metaItem).className}`}>
                      {t(globalSearchNoAuthorMessageKey(searchType))}
                    </span>
                  )}
                  <span
                    className={`meta-item ${stylex.props(styles.metaItem).className}`}
                    title={item.createdLabel}
                  >
                    {item.createdLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <GlobalSearchPagination result={result} />
      </>
    );
  }

  if (searchType === "milestone") {
    return (
      <>
        <ul
          className={`search-list-wrap ${stylex.props(styles.resultList).className}`}
          data-stylex-owner="global-search-result-list"
        >
          {result.items.map((item) => {
            const itemLink = globalSearchInternalLinkTarget(item.href, runtimeConfig);
            const projectLink = globalSearchInternalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.ownerName}/${item.projectName}`),
              runtimeConfig,
            );

            return (
              <li
                className={`search-list-item ${stylex.props(styles.resultItem).className}`}
                key={item.id}
                data-stylex-owner="global-search-result-item"
              >
                <div
                  className={`title-wrap ${stylex.props(styles.resultTitleWrap).className}`}
                  data-stylex-owner="global-search-result-title-wrap"
                >
                  <Link
                    to={itemLink.to}
                    hash={itemLink.hash || undefined}
                    className={`title ${stylex.props(styles.resultTitle).className}`}
                    data-stylex-owner="global-search-result-title"
                  >
                    <GlobalSearchHighlightedText text={item.title} keyword={result.keyword} />
                  </Link>
                </div>
                <div
                  className={`search-content ${stylex.props(styles.content).className}`}
                  data-stylex-owner="global-search-content"
                >
                  {item.snippets.map((snippet) => (
                    <p
                      className={`search-content-body ${stylex.props(styles.contentBody).className}`}
                      key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
                    >
                      <GlobalSearchHighlightedText text={snippet.text} keyword={result.keyword} />
                      {snippet.truncated ? " ..... " : null}
                    </p>
                  ))}
                </div>
                <div
                  className={`search-meta-info ${stylex.props(styles.meta).className}`}
                  data-stylex-owner="global-search-meta"
                >
                  <Link
                    to={projectLink.to}
                    hash={projectLink.hash || undefined}
                    className={`project-link meta-item ${stylex.props(styles.projectLink, styles.metaItem).className}`}
                  >
                    {item.ownerName}/{item.projectName}
                  </Link>
                  {item.updatedLabel ? (
                    <span
                      className={`due-date meta-item ${stylex.props(styles.metaItem).className}`}
                    >
                      {t("label.dueDate")} <strong>{item.updatedLabel}</strong>{" "}
                      {item.dueDateUntilLabel ? `(${item.dueDateUntilLabel})` : null}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <GlobalSearchPagination result={result} />
      </>
    );
  }

  const emptyResultProps = stylex.props(
    styles.emptyResult,
    styles.emptyResultBackground(
      `url(${prefixBasePath(runtimeConfig.basePath, "/legacy-assets/images/no_contents.jpg")})`,
    ),
  );
  return (
    <div
      {...emptyResultProps}
      className={`empty-result ${emptyResultProps.className}`}
      data-stylex-owner="global-search-empty-result"
    ></div>
  );
}

function GlobalSearchPagination({ result }: { result: SearchResponse }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const totalPages = globalSearchTotalPages(result);
  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = clampPageNum(result.pageNum, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({
    keyword: result.keyword,
    pageNum,
    searchType: result.searchType,
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: "/search",
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
    const pageNum = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(pageNum);
    navigateToPage(pageNum);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeOptions={legacySearchPaginationLinkActiveOptions}
              activeProps={legacySearchPaginationLinkActiveProps}
              from="/search"
              search={pageSearch(currentPage - 1)}
              to="/search"
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
          {hasNext ? (
            <Link
              activeOptions={legacySearchPaginationLinkActiveOptions}
              activeProps={legacySearchPaginationLinkActiveProps}
              from="/search"
              search={pageSearch(currentPage + 1)}
              to="/search"
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

function globalSearchCountForType(counts: SearchCounts, searchType: SearchType) {
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

function globalSearchTitleForType(
  t: ReturnType<typeof useLegacyMessages>["t"],
  searchType: SearchType,
) {
  const match = GLOBAL_SEARCH_CATEGORIES.find((category) => category.type === searchType);
  return match ? t(match.labelKey) : "";
}

function renderGlobalSearchResultTitle(message: string): ReactNode {
  const match = /^(.*?)<strong>(.*?)<\/\s*strong\s*>(.*)$/u.exec(message);
  if (!match) {
    return message;
  }
  return (
    <>
      {match[1]}
      <strong {...stylex.props(styles.resultHeadingAccent)}>{match[2]}</strong>
      {match[3]}
    </>
  );
}

function globalSearchNoAuthorMessageKey(searchType: SearchType) {
  return searchType === "post_comment" ? "posting.noAuthor" : "issue.noAuthor";
}

function globalSearchQueryKey(_result: SearchResponse) {
  return apiQueryKeys.search.all();
}

function GlobalSearchHighlightedText({ keyword, text }: { keyword: string; text: string }) {
  const trimmedKeyword = keyword.trim();
  if (trimmedKeyword.length === 0) {
    return <>{text}</>;
  }

  const keywordRegex = new RegExp(escapeRegExp(trimmedKeyword), "gi");
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(keywordRegex)) {
    const start = match.index ?? 0;
    const matchText = match[0] ?? "";
    if (start > cursor) {
      nodes.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor, start)}</Fragment>);
    }
    nodes.push(
      <strong
        className={`keyword ${stylex.props(styles.keyword).className}`}
        data-stylex-owner="global-search-keyword"
        key={`keyword-${start}`}
      >
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

function globalSearchInternalLinkTarget(href: string, runtimeConfig: RuntimeConfig) {
  const [hrefWithoutHash, hash = ""] = href.split("#", 2);
  const basePath = runtimeConfig.basePath.replace(/\/$/u, "");
  const to =
    basePath && hrefWithoutHash.startsWith(`${basePath}/`)
      ? hrefWithoutHash.slice(basePath.length)
      : hrefWithoutHash || "/";

  return { hash, to };
}

function GlobalSearchProjectLogoImage({ src }: { src: string }) {
  /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default project logo branch renders no alt attribute. */
  return <img {...stylex.props(styles.avatarImage)} src={src} />;
}

function isDefaultUserSearchAvatar(avatarUrl: string | undefined) {
  return avatarUrl?.includes("gravatar.com/avatar/") === true;
}

function globalSearchTotalPages(result: SearchResponse) {
  const providedTotalPages = Number((result as Record<string, unknown>).totalPages);
  if (Number.isFinite(providedTotalPages) && providedTotalPages > 0) {
    return providedTotalPages;
  }
  return Math.ceil(result.totalCount / Math.max(result.pageSize, 1));
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
