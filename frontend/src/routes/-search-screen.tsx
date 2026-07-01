import { useRouter } from "@tanstack/react-router";
import { type SearchCounts, type SearchResponse, type SearchType } from "../api/search";
import { RestApiError } from "../api/rest-client";
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
  const activeType = result.searchType === "auto" ? "issue" : result.searchType;
  const activeCount = countForType(result.counts, activeType);
  const activeTitle = titleForType(t, activeType);
  const resultTitleHtml = t("search.result.title", { args: [activeCount, activeTitle] });
  const categories = includeProjectCategory
    ? ALL_SEARCH_CATEGORIES
    : ALL_SEARCH_CATEGORIES.filter((category) => category.type !== "project");
  const categoryHref = (nextSearchType: SearchType) => {
    const params = new URLSearchParams();
    params.set("keyword", result.keyword);
    params.set("searchType", nextSearchType);
    return `${prefixBasePath(runtimeConfig.basePath, searchPath)}?${params.toString()}`;
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
                  {categories.map((menu) => {
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
                            router.history.push(categoryHref(menu.type));
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
                    action={prefixBasePath(runtimeConfig.basePath, searchPath)}
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
            {item.originOwnerName && item.originProjectName ? (
              <div className="search-meta-info nm np">
                <span>
                  <i className="yobicon-split yobicon-white vmiddle"></i>
                  {t("fork.original")}
                </span>
                <span>
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/${item.originOwnerName}/${item.originProjectName}`,
                    )}
                    className="project-link"
                  >
                    {item.originOwnerName}/{item.originProjectName}
                  </a>
                </span>
              </div>
            ) : null}
            <div className="search-content np">
              <p className="search-content-body">{item.snippets[0]?.text ?? ""}</p>
            </div>
            <div className="search-meta-info np">
              <span className="meta-info">
                {t("project.create")} <strong title={item.createdLabel}>{item.createdLabel}</strong>
              </span>
              {item.updatedLabel ? (
                <span className="meta-info">
                  {t("project.codeUpdate")}{" "}
                  <strong title={item.updatedLabel}>{item.updatedLabel}</strong>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (result.searchType === "user") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => (
            <li className="search-list-item project" key={item.id}>
              <a
                href={item.href}
                className="avatar-wrap"
                data-toggle="tooltip"
                data-placement="top"
                title={item.authorLoginId}
              >
                <img src={item.avatarUrl || ""} alt={item.authorLabel} width="32" height="32" />
              </a>
              <div className="title-wrap">
                <a href={item.href} className="title user-link">
                  {`${item.authorLabel} (@${item.authorLoginId})`}
                </a>
              </div>
              <div className="infos nm">
                <span className="infos-item">{`${t("userinfo.since")} ${item.createdLabel}`}</span>
              </div>
            </li>
          ))}
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
          {result.items.map((item) => (
            <li className="search-list-item" key={item.id}>
              <div className="title-wrap">
                <span className="post-id">#{item.number}</span>
                <a href={item.href} className={titleClassName}>
                  {item.title}
                </a>
              </div>
              <div className="search-content">
                {item.snippets.map((snippet) => (
                  <p
                    className="search-content-body"
                    key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
                  >
                    {snippet.text}
                    {snippet.truncated ? " ..... " : null}
                  </p>
                ))}
              </div>
              <div className="search-meta-info">
                {result.scope !== "project" ? (
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/${item.ownerName}/${item.projectName}`,
                    )}
                    className="project-link meta-item"
                  >
                    {item.ownerName}/{item.projectName}
                  </a>
                ) : null}
                {item.authorLabel ? (
                  <a
                    href={prefixBasePath(runtimeConfig.basePath, `/${item.authorLoginId}`)}
                    className="meta-item"
                    data-toggle="tooltip"
                    data-placement="top"
                    title={item.authorLoginId}
                  >
                    {item.authorLabel}
                  </a>
                ) : (
                  <span className="meta-item">{t("issue.noAuthor")}</span>
                )}
                <span className="meta-item" title={item.createdLabel}>
                  {item.createdLabel}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div id="pagination"></div>
      </>
    );
  }

  if (result.searchType === "milestone") {
    return (
      <>
        <ul className="search-list-wrap">
          {result.items.map((item) => (
            <li className="search-list-item" key={item.id}>
              <div className="title-wrap">
                <a href={item.href} className="title">
                  {item.title}
                </a>
              </div>
              <div className="search-content">
                {item.snippets.map((snippet) => (
                  <p
                    className="search-content-body"
                    key={`${item.id}-${snippet.text}-${snippet.truncated ? "truncated" : "full"}`}
                  >
                    {snippet.text}
                    {snippet.truncated ? " ..... " : null}
                  </p>
                ))}
              </div>
              <div className="search-meta-info">
                {result.scope !== "project" ? (
                  <a
                    href={prefixBasePath(
                      runtimeConfig.basePath,
                      `/${item.ownerName}/${item.projectName}`,
                    )}
                    className="project-link meta-item"
                  >
                    {item.ownerName}/{item.projectName}
                  </a>
                ) : null}
                {item.updatedLabel ? (
                  <span className="due-date meta-item">
                    {t("label.dueDate")} <strong>{item.updatedLabel}</strong>{" "}
                    {item.dueDateUntilLabel ? `(${item.dueDateUntilLabel})` : null}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <div id="pagination"></div>
      </>
    );
  }

  return <div className="empty-result"></div>;
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
