import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  isSearchType,
  organizationSearchQueryOptions,
  type SearchCounts,
  type SearchResponse,
  type SearchType,
} from "../../../api/search";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
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
import { OrganizationHeader, OrganizationMenu } from "../$organizationName";

type SearchCategory = {
  countKey: keyof SearchCounts;
  labelKey: string;
  type: Exclude<SearchType, "auto">;
};

const ORGANIZATION_SEARCH_ROUTE = "/organizations/$organizationName/search" as const;
const ORGANIZATION_SEARCH_CATEGORIES: SearchCategory[] = [
  { countKey: "issues", labelKey: "search.menu.issues", type: "issue" },
  { countKey: "users", labelKey: "search.menu.users", type: "user" },
  { countKey: "projects", labelKey: "search.menu.projects", type: "project" },
  { countKey: "posts", labelKey: "search.menu.boards", type: "post" },
  { countKey: "milestones", labelKey: "search.menu.milestones", type: "milestone" },
  { countKey: "issueComments", labelKey: "search.menu.issue.comments", type: "issue_comment" },
  { countKey: "postComments", labelKey: "search.menu.board.comments", type: "post_comment" },
  { countKey: "reviews", labelKey: "search.menu.reviews", type: "review" },
];
const legacySearchLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
} as const;
const legacySearchLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

type OrganizationSearchRouteSearch = {
  keyword: string;
  pageNum: number;
  routeInvalid?: boolean;
  searchType: SearchType;
};

export const Route = createFileRoute("/organizations/$organizationName/search")({
  component: OrganizationSearchRoute,
  validateSearch: (search: Record<string, unknown>): OrganizationSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "";
    const rawKeyword = typeof search.keyword === "string" ? search.keyword : "";
    const rawPageNum =
      typeof search.pageNum === "number"
        ? search.pageNum
        : typeof search.pageNum === "string"
          ? Number.parseInt(search.pageNum, 10)
          : 1;
    const validSearchType = isSearchType(rawSearchType);
    return {
      keyword: rawKeyword,
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      routeInvalid: rawKeyword.length === 0 || !validSearchType ? true : undefined,
      searchType: validSearchType ? rawSearchType : "auto",
    };
  },
});

function OrganizationSearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrganizationSearchScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationSearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();
  const organizationQuery = useQuery({
    enabled: !search.routeInvalid,
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });
  const hasKeyword = search.keyword.length > 0;
  const searchQuery = useQuery({
    ...organizationSearchQueryOptions(runtimeConfig, {
      ...search,
      organizationName,
    }),
    enabled: hasKeyword && !search.routeInvalid,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "organization",
    });
  const useScopedSearchShell =
    !search.routeInvalid &&
    !isRequestTextTooLargeError(searchQuery.error) &&
    !isDefaultInternalServerError(searchQuery.error);
  const siteName = runtimeConfig.siteName ?? "Yona";

  useEffect(() => {
    if (!useScopedSearchShell) {
      return;
    }

    const htmlDocument = globalThis.document;
    htmlDocument.title = t("title.search");

    return () => {
      htmlDocument.title = siteName;
    };
  }, [siteName, t, useScopedSearchShell]);

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

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <RequestTextTooLargeErrorBody />
      </SiteLayoutShell>
    );
  }

  if (isDefaultInternalServerError(searchQuery.error)) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <DefaultSearchErrorBody
          iconClassName="ico-404"
          messageKey="error.internalServerError"
          runtimeConfig={runtimeConfig}
        />
      </SiteLayoutShell>
    );
  }

  if (!organizationQuery.data) {
    return null;
  }

  const logoUrl =
    typeof organizationQuery.data.logoUrl === "string" && organizationQuery.data.logoUrl.length > 0
      ? organizationQuery.data.logoUrl
      : "/assets/images/organization_default_logo.png";

  if (isDefaultForbiddenError(searchQuery.error)) {
    return (
      <SiteLayoutShell
        projectSearchScope={{ organizationName }}
        runtimeConfig={runtimeConfig}
        showLegacyProjectHeaderLinks
      >
        <OrganizationHeader logoUrl={logoUrl} organizationName={organizationName} />
        <OrganizationMenu
          organizationName={organizationName}
          viewerCanUpdate={Boolean(organizationQuery.data.viewerCanUpdate)}
        />
        <OrganizationSearchErrorBody messageKey="error.forbidden" />
      </SiteLayoutShell>
    );
  }

  return (
    <SiteLayoutShell
      projectSearchScope={{ organizationName }}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      <OrganizationHeader logoUrl={logoUrl} organizationName={organizationName} />
      <OrganizationMenu
        organizationName={organizationName}
        viewerCanUpdate={Boolean(organizationQuery.data.viewerCanUpdate)}
      />
      <OrganizationSearchBody
        organizationName={organizationName}
        result={result}
        runtimeConfig={runtimeConfig}
      />
    </SiteLayoutShell>
  );
}

function OrganizationSearchBody({
  organizationName,
  result,
  runtimeConfig,
}: {
  organizationName: string;
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const activeType = result.searchType === "auto" ? "issue" : result.searchType;
  const activeCount = countForType(result.counts, activeType);
  const activeTitle = titleForType(t, activeType);
  const resultTitle = renderLegacySearchResultTitle(
    t("search.result.title", { args: [activeCount, activeTitle] }),
  );
  const [keywordValue, setKeywordValue] = useState(result.keyword);
  const searchPath = `/organizations/${organizationName}/search`;
  const searchParams = (searchType: SearchType, keyword: string, pageNum = 1) => ({
    keyword,
    pageNum,
    searchType,
  });

  useEffect(() => {
    setKeywordValue(result.keyword);
  }, [result.keyword]);

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
                  {ORGANIZATION_SEARCH_CATEGORIES.map((category) => {
                    const count = result.counts[category.countKey];
                    return (
                      <li
                        className={`${category.type === activeType ? "active" : ""} ${
                          count === 0 ? "empty" : ""
                        }`}
                        key={category.type}
                      >
                        <Link
                          activeOptions={legacySearchLinkActiveOptions}
                          activeProps={legacySearchLinkActiveProps}
                          params={{ organizationName }}
                          search={searchParams(category.type, keywordValue)}
                          to={ORGANIZATION_SEARCH_ROUTE}
                        >
                          {t(category.labelKey)}
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
                      void navigate({
                        params: { organizationName },
                        search: searchParams(activeType, keywordValue),
                        to: ORGANIZATION_SEARCH_ROUTE,
                      });
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
                  <OrganizationSearchResultList
                    organizationName={organizationName}
                    result={result}
                    runtimeConfig={runtimeConfig}
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

function OrganizationSearchResultList({
  organizationName,
  result,
  runtimeConfig,
}: {
  organizationName: string;
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const searchType = result.searchType === "auto" ? "issue" : result.searchType;

  if (result.items.length === 0) {
    return <div className="empty-result"></div>;
  }

  if (searchType === "project") {
    return (
      <ul className="search-list-wrap">
        {result.items.map((item) => {
          const projectLink = internalLinkTarget(item.href, runtimeConfig);
          const originProjectLink =
            item.originOwnerName && item.originProjectName
              ? internalLinkTarget(
                  prefixBasePath(
                    runtimeConfig.basePath,
                    `/${item.originOwnerName}/${item.originProjectName}`,
                  ),
                  runtimeConfig,
                )
              : null;

          return (
            <li className="search-list-item project" key={item.id}>
              <Link
                to={projectLink.to}
                hash={projectLink.hash || undefined}
                className="avatar-wrap"
              >
                <LegacyProjectLogoImage
                  src={item.projectLogoUrl || "/assets/images/project_default_logo.png"}
                />
              </Link>
              <div className="title-wrap">
                <Link
                  to={projectLink.to}
                  hash={projectLink.hash || undefined}
                  className="title project-link"
                >
                  <HighlightedText
                    text={`${item.ownerName}/${item.projectName}`}
                    keyword={result.keyword}
                  />
                </Link>
              </div>
              {originProjectLink ? (
                <div className="search-meta-info nm np">
                  <span>
                    <i className="yobicon-split yobicon-white vmiddle"></i>
                    {t("fork.original")}
                  </span>
                  <span>
                    <Link
                      to={originProjectLink.to}
                      hash={originProjectLink.hash || undefined}
                      className="project-link"
                    >
                      {item.originOwnerName}/{item.originProjectName}
                    </Link>
                  </span>
                </div>
              ) : null}
              <div className="search-content np">
                <p className="search-content-body">
                  <HighlightedText text={item.snippets[0]?.text ?? ""} keyword={result.keyword} />
                </p>
              </div>
              <div className="search-meta-info np">
                <span className="meta-info">
                  {t("project.create")}{" "}
                  <strong title={item.createdLabel}>{item.createdLabel}</strong>
                </span>
                {item.updatedLabel ? (
                  <span className="meta-info">
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
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const userLink = internalLinkTarget(item.href, runtimeConfig);

            return (
              <li className="search-list-item project" key={item.id}>
                <Link
                  to={userLink.to}
                  hash={userLink.hash || undefined}
                  className="avatar-wrap"
                  title={item.authorLoginId}
                >
                  {isDefaultUserSearchAvatar(item.avatarUrl) ? (
                    /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
                    <img src={item.avatarUrl} />
                  ) : (
                    <img src={item.avatarUrl || ""} alt={item.authorLabel} width="32" height="32" />
                  )}
                </Link>
                <div className="title-wrap">
                  <Link
                    to={userLink.to}
                    hash={userLink.hash || undefined}
                    className="title user-link"
                  >
                    <HighlightedText
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
        <OrganizationSearchPagination organizationName={organizationName} result={result} />
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
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const itemLink = internalLinkTarget(item.href, runtimeConfig);
            const projectLink = internalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.ownerName}/${item.projectName}`),
              runtimeConfig,
            );
            const authorLink = internalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.authorLoginId}`),
              runtimeConfig,
            );
            const reviewThreadOnPullRequest =
              searchType !== "review" || item.reviewThreadOnPullRequest === true;
            const snippets = item.snippets.map((snippet) => (
              <p
                className="search-content-body"
                key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
              >
                <HighlightedText text={snippet.text} keyword={result.keyword} />
                {snippet.truncated ? " ....." : null}
              </p>
            ));

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
                        <HighlightedText text={item.title} keyword={result.keyword} />
                      ) : (
                        item.title
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
                  <Link
                    to={projectLink.to}
                    hash={projectLink.hash || undefined}
                    className="project-link meta-item"
                  >
                    {item.ownerName}/{item.projectName}
                  </Link>
                  {item.authorLabel ? (
                    <Link
                      to={authorLink.to}
                      hash={authorLink.hash || undefined}
                      className="meta-item"
                      title={item.authorLoginId}
                    >
                      {item.authorLabel}
                    </Link>
                  ) : (
                    <span className="meta-item">{t(noAuthorMessageKey(searchType))}</span>
                  )}
                  <span className="meta-item" title={item.createdLabel}>
                    {item.createdLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <OrganizationSearchPagination organizationName={organizationName} result={result} />
      </>
    );
  }

  if (searchType === "milestone") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const itemLink = internalLinkTarget(item.href, runtimeConfig);
            const projectLink = internalLinkTarget(
              prefixBasePath(runtimeConfig.basePath, `/${item.ownerName}/${item.projectName}`),
              runtimeConfig,
            );

            return (
              <li className="search-list-item" key={item.id}>
                <div className="title-wrap">
                  <Link to={itemLink.to} hash={itemLink.hash || undefined} className="title">
                    <HighlightedText text={item.title} keyword={result.keyword} />
                  </Link>
                </div>
                <div className="search-content">
                  {item.snippets.map((snippet) => (
                    <p
                      className="search-content-body"
                      key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
                    >
                      <HighlightedText text={snippet.text} keyword={result.keyword} />
                      {snippet.truncated ? " ....." : null}
                    </p>
                  ))}
                </div>
                <div className="search-meta-info">
                  <Link
                    to={projectLink.to}
                    hash={projectLink.hash || undefined}
                    className="project-link meta-item"
                  >
                    {item.ownerName}/{item.projectName}
                  </Link>
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
        <OrganizationSearchPagination organizationName={organizationName} result={result} />
      </>
    );
  }

  return <div className="empty-result"></div>;
}

function OrganizationSearchPagination({
  organizationName,
  result,
}: {
  organizationName: string;
  result: SearchResponse;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const searchType = result.searchType === "auto" ? "issue" : result.searchType;
  const totalPages = searchTotalPages(result);
  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = clampPageNum(result.pageNum, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({
    keyword: result.keyword,
    pageNum,
    searchType,
  });
  const navigateToPage = (pageNum: number) => {
    void navigate({
      params: { organizationName },
      search: pageSearch(pageNum),
      to: ORGANIZATION_SEARCH_ROUTE,
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
              activeOptions={legacySearchLinkActiveOptions}
              activeProps={legacySearchLinkActiveProps}
              params={{ organizationName }}
              search={pageSearch(currentPage - 1)}
              to={ORGANIZATION_SEARCH_ROUTE}
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
              activeOptions={legacySearchLinkActiveOptions}
              activeProps={legacySearchLinkActiveProps}
              params={{ organizationName }}
              search={pageSearch(currentPage + 1)}
              to={ORGANIZATION_SEARCH_ROUTE}
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

function OrganizationSearchErrorBody({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t(messageKey)}</p>
        </div>
      </div>
    </div>
  );
}

function countForType(counts: SearchCounts, searchType: SearchType) {
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
  const match = ORGANIZATION_SEARCH_CATEGORIES.find((category) => category.type === searchType);
  return match ? t(match.labelKey) : "";
}

function renderLegacySearchResultTitle(message: string): ReactNode {
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

function noAuthorMessageKey(searchType: SearchType) {
  return searchType === "post_comment" ? "posting.noAuthor" : "issue.noAuthor";
}

function HighlightedText({ keyword, text }: { keyword: string; text: string }) {
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

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchTotalPages(result: SearchResponse) {
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

function internalLinkTarget(href: string, runtimeConfig: RuntimeConfig) {
  const [hrefWithoutHash, hash = ""] = href.split("#", 2);
  const basePath = runtimeConfig.basePath.replace(/\/$/u, "");
  const to =
    basePath && hrefWithoutHash.startsWith(`${basePath}/`)
      ? hrefWithoutHash.slice(basePath.length)
      : hrefWithoutHash || "/";

  return { hash, to };
}

function LegacyProjectLogoImage({ src }: { src: string }) {
  /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default project logo branch renders no alt attribute. */
  return <img src={src} />;
}

function isDefaultUserSearchAvatar(avatarUrl: string | undefined) {
  return avatarUrl?.includes("gravatar.com/avatar/") === true;
}
