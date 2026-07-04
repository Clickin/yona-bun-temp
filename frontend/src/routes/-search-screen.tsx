import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Link as RouterLink, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { type SearchCounts, type SearchResponse, type SearchType } from "../api/search";
import { RestApiError } from "../api/rest-client";
import { apiQueryKeys } from "../api/query-keys";
import { useLegacyMessages } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

type SearchCategory = {
  countKey: keyof SearchCounts;
  labelKey: string;
  type: Exclude<SearchType, "auto">;
};

const ALL_SEARCH_CATEGORIES: SearchCategory[] = [
  { countKey: "issues", labelKey: "search.menu.issues", type: "issue" },
  { countKey: "users", labelKey: "search.menu.users", type: "user" },
  { countKey: "projects", labelKey: "search.menu.projects", type: "project" },
  { countKey: "posts", labelKey: "search.menu.boards", type: "post" },
  { countKey: "milestones", labelKey: "search.menu.milestones", type: "milestone" },
  { countKey: "issueComments", labelKey: "search.menu.issue.comments", type: "issue_comment" },
  { countKey: "postComments", labelKey: "search.menu.board.comments", type: "post_comment" },
  { countKey: "reviews", labelKey: "search.menu.reviews", type: "review" },
];

export type SearchBodyInput = {
  includeProjectCategory: boolean;
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
  searchPath: string;
};

export function isRequestTextTooLargeError(error: unknown) {
  return error instanceof RestApiError && error.status === 413;
}

export function isDefaultForbiddenError(error: unknown) {
  return error instanceof RestApiError && error.status === 403;
}

export function isDefaultInternalServerError(error: unknown) {
  return error instanceof RestApiError && error.status >= 500;
}

export function DefaultSearchErrorBody({
  iconClassName,
  messageKey,
  runtimeConfig: _runtimeConfig,
  ybtnClassName = "ybtn ybtn-primary",
}: {
  iconClassName: string;
  messageKey: string;
  runtimeConfig: RuntimeConfig;
  ybtnClassName?: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className={iconClassName}></i>
          <p>{t(messageKey)}</p>
          <Link to="/" className={ybtnClassName}>
            {t("menu.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RequestTextTooLargeErrorBody() {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.tooLargeText.title")}</p>
          <p>{t("error.tooLargeText.limit", { args: [102400] })}</p>
        </div>
      </div>
    </div>
  );
}

export function LegacySearchBody({
  includeProjectCategory,
  result,
  runtimeConfig,
  searchPath,
}: SearchBodyInput) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeType = result.searchType === "auto" ? "issue" : result.searchType;
  const activeCount = countForType(result.counts, activeType);
  const activeTitle = titleForType(t, activeType);
  const resultTitle = renderLegacySearchResultTitle(
    t("search.result.title", { args: [activeCount, activeTitle] }),
  );
  const [keywordValue, setKeywordValue] = useState(result.keyword);
  const categories = includeProjectCategory
    ? ALL_SEARCH_CATEGORIES
    : ALL_SEARCH_CATEGORIES.filter((category) => category.type !== "project");
  const searchTarget = (nextSearchType: SearchType, keyword: string) => ({
    search: {
      keyword,
      pageNum: 1,
      searchType: nextSearchType,
    },
    to: searchPath,
  });
  const navigationMutation = useMutation({
    mutationFn: async ({ keyword, searchType }: { keyword: string; searchType: SearchType }) =>
      searchTarget(searchType, keyword),
    onSuccess(target) {
      void queryClient.invalidateQueries({ queryKey: searchQueryKey(result) });
      router.navigate(target);
    },
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
                  {categories.map((menu) => {
                    const count = result.counts[menu.countKey];
                    return (
                      <li
                        className={`${menu.type === activeType ? "active" : ""} ${
                          count === 0 ? "empty" : ""
                        }`}
                        key={menu.type}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            navigationMutation.mutate({
                              keyword: keywordValue,
                              searchType: menu.type,
                            });
                          }}
                        >
                          {t(menu.labelKey)}
                          <span className="num-badge pull-right">{count}</span>
                        </button>
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
                  <SearchResultList result={result} runtimeConfig={runtimeConfig} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SearchResultList({
  result,
  runtimeConfig,
}: {
  result: SearchResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();

  if (result.items.length === 0) {
    return <div className="empty-result"></div>;
  }

  if (result.searchType === "project") {
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

  if (result.searchType === "user") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => {
            const userLink = internalLinkTarget(item.href, runtimeConfig);

            return (
              <li className="search-list-item project" key={item.id}>
                <RouterLink
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
                </RouterLink>
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
        <div id="pagination"></div>
      </>
    );
  }

  if (
    result.searchType === "issue" ||
    result.searchType === "post" ||
    result.searchType === "issue_comment" ||
    result.searchType === "post_comment" ||
    result.searchType === "review"
  ) {
    const titleClassName =
      result.searchType === "issue_comment" ||
      result.searchType === "post_comment" ||
      result.searchType === "review"
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
              result.searchType !== "review" || item.reviewThreadOnPullRequest === true;
            const snippets = item.snippets.map((snippet) => (
              <p
                className="search-content-body"
                key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
              >
                <HighlightedText text={snippet.text} keyword={result.keyword} />
                {snippet.truncated ? " ..... " : null}
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
                  {result.scope !== "project" ? (
                    <Link
                      to={projectLink.to}
                      hash={projectLink.hash || undefined}
                      className="project-link meta-item"
                    >
                      {item.ownerName}/{item.projectName}
                    </Link>
                  ) : null}
                  {item.authorLabel ? (
                    <RouterLink
                      to={authorLink.to}
                      hash={authorLink.hash || undefined}
                      className="meta-item"
                      title={item.authorLoginId}
                    >
                      {item.authorLabel}
                    </RouterLink>
                  ) : (
                    <span className="meta-item">{t(noAuthorMessageKey(result.searchType))}</span>
                  )}
                  <span className="meta-item" title={item.createdLabel}>
                    {item.createdLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <div id="pagination"></div>
      </>
    );
  }

  if (result.searchType === "milestone") {
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
                      {snippet.truncated ? " ..... " : null}
                    </p>
                  ))}
                </div>
                <div className="search-meta-info">
                  {result.scope !== "project" ? (
                    <Link
                      to={projectLink.to}
                      hash={projectLink.hash || undefined}
                      className="project-link meta-item"
                    >
                      {item.ownerName}/{item.projectName}
                    </Link>
                  ) : null}
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
        <div id="pagination"></div>
      </>
    );
  }

  return <div className="empty-result"></div>;
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
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    imageRef.current?.removeAttribute("alt");
  }, []);

  return <img alt="" ref={imageRef} src={src} />;
}

function isDefaultUserSearchAvatar(avatarUrl: string | undefined) {
  return avatarUrl?.includes("gravatar.com/avatar/") === true;
}

export function emptySearchResult(input: {
  keyword: string;
  pageNum: number;
  scope: SearchResponse["scope"];
  searchType: SearchType;
}): SearchResponse {
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
    keyword: input.keyword,
    pageNum: input.pageNum,
    pageSize: 20,
    requestedSearchType: input.searchType,
    scope: input.scope,
    searchType: input.searchType === "auto" ? "issue" : input.searchType,
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
  const match = ALL_SEARCH_CATEGORIES.find((menu) => menu.type === searchType);
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

function searchQueryKey(result: SearchResponse) {
  if (result.scope === "project") {
    return [
      ...apiQueryKeys.project.base(result.context.ownerName, result.context.projectName),
      "search",
    ] as const;
  }
  if (result.scope === "organization") {
    return [...apiQueryKeys.organization.base(result.context.organizationName), "search"] as const;
  }
  return apiQueryKeys.search.all();
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
