import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { HTMLAttributes, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  organizationPullRequestListQueryOptions,
  type PullRequestListItem,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { styles } from "./-organization-pullrequests.stylex";

const sx = {
  page: stylex.props(styles.page),
  searchColumn: stylex.props(styles.searchColumn),
  searchBar: stylex.props(styles.searchBar),
  searchInput: stylex.props(styles.searchInput),
  searchButton: stylex.props(styles.searchButton),
  tabs: stylex.props(styles.tabs),
  tabButton: stylex.props(styles.tabButton),
  activeTabButton: stylex.props(styles.tabButton, styles.activeTabButton),
  badge: stylex.props(styles.badge),
  content: stylex.props(styles.content),
  list: stylex.props(styles.list),
  empty: stylex.props(styles.empty),
  row: stylex.props(styles.row),
  meta: stylex.props(styles.meta),
  state: stylex.props(styles.state),
  pagination: stylex.props(styles.pagination),
  progress: stylex.props(styles.progress),
  progressMeta: stylex.props(styles.progress, styles.progressMeta),
  progressFill: (width: string) => stylex.props(styles.progressFill(width)),
  headerLogo: (backgroundImage: string) => stylex.props(styles.headerLogo(backgroundImage)),
  grayTextSeparator: stylex.props(styles.grayTextSeparator),
} as const;

type LegacyListItemHrefAttrs = HTMLAttributes<HTMLLIElement> & { href: string };

export type OrganizationPullRequestsSearch = {
  filter: string;
  pageNum: number;
};

export type OrganizationPullRequestsCategory = "closed" | "open";

export const Route = createFileRoute("/organizations/$organizationName/pullrequests")({
  component: OrganizationPullRequestsRoute,
  validateSearch(search: Record<string, unknown>): OrganizationPullRequestsSearch {
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      pageNum: Number(search.pageNum) || 1,
    };
  },
});

function OrganizationPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <OrganizationPullRequestsPage
      category="open"
      organizationName={organizationName}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

export function OrganizationPullRequestsPage({
  category,
  organizationName,
  runtimeConfig,
  search,
}: {
  category: OrganizationPullRequestsCategory;
  organizationName: string;
  runtimeConfig: RuntimeConfig;
  search: OrganizationPullRequestsSearch;
}) {
  const pullRequestsQuery = useQuery(
    organizationPullRequestListQueryOptions(runtimeConfig, {
      category,
      organizationName,
      ...search,
    }),
  );

  if (!pullRequestsQuery.data) {
    return null;
  }

  return (
    <OrganizationPullRequestsBody
      organizationName={organizationName}
      pullRequests={pullRequestsQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
      selectedCategory={category}
    />
  );
}

function OrganizationPullRequestsBody({
  organizationName,
  pullRequests,
  runtimeConfig,
  search,
  selectedCategory,
}: {
  organizationName: string;
  pullRequests: PullRequestListResponse;
  runtimeConfig: RuntimeConfig;
  search: OrganizationPullRequestsSearch;
  selectedCategory: OrganizationPullRequestsCategory;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const openAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/pullrequests`,
  );
  const closedAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/closedPullrequests`,
  );
  const searchAction = selectedCategory === "closed" ? closedAction : openAction;
  const navigateTab = (to: string) => {
    router.history.push(to);
  };

  return (
    <>
      <title>{organizationName}</title>
      <div {...sx.page} data-stylex-owner="organization-pullrequests-page">
        <div data-stylex-owner="organization-pullrequests-shell">
          <div className="row-fluid cb">
            <div {...sx.searchColumn} data-stylex-owner="organization-pullrequests-search-column">
              <form id="search" name="search" action={searchAction} method="get">
                <div className="search">
                  <div {...sx.searchBar} data-stylex-owner="organization-pullrequests-search-bar">
                    <input
                      name="filter"
                      {...sx.searchInput}
                      data-stylex-owner="organization-pullrequests-search-input"
                      type="text"
                      defaultValue={search.filter}
                    />
                    <button
                      {...sx.searchButton}
                      data-stylex-owner="organization-pullrequests-search-button"
                      type="submit"
                    >
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="span10 span-hard-wrap" id="span10">
              <ul {...sx.tabs} data-stylex-owner="organization-pullrequests-tabs">
                <li className={selectedCategory === "open" ? "active" : ""}>
                  <button
                    {...(selectedCategory === "open" ? sx.activeTabButton : sx.tabButton)}
                    data-stylex-owner="organization-pullrequests-tab"
                    type="button"
                    onClick={() => navigateTab(openAction)}
                  >
                    {t("pullRequest.state.open")}
                    <span {...sx.badge}>{pullRequests.openCount}</span>
                  </button>
                </li>
                <li className={selectedCategory === "closed" ? "active" : ""}>
                  <button
                    {...(selectedCategory === "closed" ? sx.activeTabButton : sx.tabButton)}
                    data-stylex-owner="organization-pullrequests-tab"
                    type="button"
                    onClick={() => navigateTab(closedAction)}
                  >
                    {t("pullRequest.state.closed")}
                    <span {...sx.badge}>{pullRequests.closedCount}</span>
                  </button>
                </li>
              </ul>
              <div {...sx.content} data-stylex-owner="organization-pullrequests-content">
                <div id="list" className="row-fluid tab-pane active">
                  <OrganizationPullRequestList
                    basePath={runtimeConfig.basePath}
                    category={selectedCategory}
                    organizationName={organizationName}
                    pullRequests={pullRequests}
                    search={search}
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

function OrganizationPullRequestList({
  basePath,
  category,
  organizationName,
  pullRequests,
  search,
}: {
  basePath: string;
  category: OrganizationPullRequestsCategory;
  organizationName: string;
  pullRequests: PullRequestListResponse;
  search: OrganizationPullRequestsSearch;
}) {
  const { t } = useLegacyMessages();
  const totalPages = Math.ceil(pullRequests.totalCount / pullRequests.pageSize);

  return (
    <ul
      {...sx.list}
      className={`${sx.list.className} post-list-wrap`}
      data-stylex-owner="organization-pullrequests-list"
    >
      {pullRequests.items.length > 0 ? (
        <>
          {pullRequests.items.map((pullRequest) => (
            <OrganizationPullRequestItem
              basePath={basePath}
              category={category}
              key={pullRequest.id || pullRequest.pullRequestNumber}
              organizationName={organizationName}
              pullRequest={pullRequest}
            />
          ))}
          <OrganizationPullRequestPagination
            basePath={basePath}
            category={category}
            currentPage={pullRequests.pageNum || search.pageNum}
            organizationName={organizationName}
            search={search}
            totalPages={totalPages}
          />
        </>
      ) : (
        <div
          {...sx.empty}
          className={`${sx.empty.className} error-wrap`}
          data-stylex-owner="organization-pullrequests-empty"
        >
          <i className="ico ico-err1"></i>
          <p>{t("pullRequest.is.empty")}</p>
        </div>
      )}
    </ul>
  );
}

function OrganizationPullRequestPagination({
  basePath,
  category,
  currentPage,
  organizationName,
  search,
  totalPages,
}: {
  basePath: string;
  category: OrganizationPullRequestsCategory;
  currentPage: number;
  organizationName: string;
  search: OrganizationPullRequestsSearch;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const safeCurrentPage = clampPageNum(currentPage, totalPages);
  const route =
    category === "closed"
      ? "/organizations/$organizationName/closedPullrequests"
      : "/organizations/$organizationName/pullrequests";
  const pathForPage = (pageNum: number) =>
    `/organizations/${organizationName}/${
      category === "closed" ? "closedPullrequests" : "pullrequests"
    }?${new URLSearchParams({
      filter: search.filter,
      pageNum: String(pageNum),
    }).toString()}`;
  const goToPage = (pageNum: number) => {
    router.history.push(prefixBasePath(basePath, pathForPage(pageNum)));
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(safeCurrentPage);
      return;
    }
    const pageNum = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(pageNum);
    goToPage(pageNum);
  };

  return (
    <div
      {...sx.pagination}
      id="pagination"
      className={`${sx.pagination.className} page-navigation-wrap`}
      data-stylex-owner="organization-pullrequests-pagination"
    >
      <ul className="page-nums">
        <li className="page-num ikon">
          {safeCurrentPage > 1 ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={{ filter: search.filter, pageNum: safeCurrentPage - 1 }}
              to={route}
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
            defaultValue={safeCurrentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {safeCurrentPage < totalPages ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={{ filter: search.filter, pageNum: safeCurrentPage + 1 }}
              to={route}
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

function OrganizationPullRequestItem({
  basePath,
  category,
  organizationName,
  pullRequest,
}: {
  basePath: string;
  category: OrganizationPullRequestsCategory;
  organizationName: string;
  pullRequest: PullRequestListItem;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const projectParams = {
    ownerName: pullRequest.ownerName,
    projectName: pullRequest.projectName,
  };
  const pullRequestParams = {
    ...projectParams,
    pullRequestNumber: String(pullRequest.pullRequestNumber),
  };
  const percent = percentOf(pullRequest.closedCommentThreadCount, pullRequest.commentThreadCount);
  const progressFill = sx.progressFill(`${percent}%`);
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const pullRequestRowHref = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}`,
  );
  const pullRequestRowAttrs = { href: pullRequestRowHref } satisfies LegacyListItemHrefAttrs;
  const titleParts = splitHeaderWordsInBrackets(pullRequest.title);
  const applyTitlePrefixFilter = (prefix: string) => {
    const categoryPath = category === "closed" ? "closedPullrequests" : "pullrequests";
    router.history.push(
      prefixBasePath(
        basePath,
        `/organizations/${organizationName}/${categoryPath}?${new URLSearchParams({
          filter: prefix,
          pageNum: "1",
        }).toString()}`,
      ),
    );
  };

  return (
    <li
      {...sx.row}
      className={`${sx.row.className} post-item title`}
      data-stylex-owner="organization-pullrequests-row"
      {...pullRequestRowAttrs}
    >
      <div className="span10 span-hard-wrap">
        <Link
          params={{ user: pullRequest.contributorLoginId }}
          to="/$user"
          className="avatar-wrap mlarge"
          title={pullRequest.contributorLoginId}
        >
          <img src={prefixBasePath(basePath, "/assets/images/default-avatar-32.png")} alt="" />
        </Link>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          {titleParts.prefixes.map((prefix) => (
            <button
              className="title-prefix"
              key={prefix}
              onClick={() => applyTitlePrefixFilter(prefix)}
              type="button"
            >
              {prefix}
            </button>
          ))}
          <Link
            params={pullRequestParams}
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            className={`title ${pullRequest.conflict ? "conflict" : ""}`}
          >
            {titleParts.title}
          </Link>
        </div>
        <div
          {...sx.meta}
          className={`${sx.meta.className} infos`}
          data-stylex-owner="organization-pullrequests-row-meta"
        >
          {pullRequest.contributorLabel ? (
            <Link
              params={{ user: pullRequest.contributorLoginId }}
              to="/$user"
              className="infos-item infos-link-item"
              title={pullRequest.contributorLoginId}
            >
              {pullRequest.contributorLabel}
            </Link>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={pullRequest.createdLabel}>
            {pullRequest.createdLabel}
          </span>
          <Link
            params={projectParams}
            to="/$ownerName/$projectName"
            className="infos-link-item group-project-name"
          >
            {pullRequest.projectName}
          </Link>
          {pullRequest.commentThreadCount > 0 ? (
            <div
              {...sx.progressMeta}
              className={`${sx.progressMeta.className} infos-item`}
              data-stylex-owner="organization-pullrequests-row-progress"
            >
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div
                  {...progressFill}
                  className={`${progressFill.className} bar orange`}
                  data-stylex-owner="organization-pullrequests-row-progress-fill"
                ></div>
              </div>
              <Link
                params={pullRequestParams}
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span
                  {...sx.grayTextSeparator}
                  data-stylex-owner="organization-pullrequests-review-separator"
                >
                  /
                </span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right hide-in-mobile">
          {pullRequest.receiverLoginId ? (
            <Link
              params={{ user: pullRequest.receiverLoginId }}
              to="/$user"
              className="avatar-wrap assinee"
              title={pullRequest.receiverLabel}
            >
              <img
                src={prefixBasePath(basePath, "/assets/images/default-avatar-32.png")}
                width="32"
                height="32"
                alt={pullRequest.receiverLabel}
              />
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div
          {...sx.state}
          className={`${sx.state.className} state ${stateKey} pull-right`}
          data-stylex-owner="organization-pullrequests-row-state"
        >
          {t(`pullRequest.state.${stateKey}`)}
        </div>
      </div>
    </li>
  );
}

function OrganizationHeader({
  logoUrl,
  organizationName,
}: {
  logoUrl: string;
  organizationName: string;
}) {
  const logoStyleProps = sx.headerLogo(`url('${logoUrl}')`);

  return (
    <div
      {...logoStyleProps}
      className={`project-header-outer ${logoStyleProps.className ?? ""}`.trim()}
      data-stylex-owner="organization-pullrequests-header-logo"
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  search={{}}
                  to="/organizations/$organizationName"
                  params={{ organizationName }}
                >
                  {organizationName}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
  active,
  organizationName,
  viewerCanUpdate,
}: {
  active: "pullrequests";
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={{}}
              to="/organizations/$organizationName"
              params={{ organizationName }}
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={{
                assigneeId: "",
                authorId: "",
                filter: "",
                mentionId: "",
                orderBy: "createdDate",
                orderDir: "desc",
                pageNum: 1,
                projectNames: [],
                state: "open",
              }}
              to="/organizations/$organizationName/issues"
              params={{ organizationName }}
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={{
                filter: "",
                orderBy: "updatedDate",
                orderDir: "desc",
                pageNum: 1,
                projectNames: [],
              }}
              to="/organizations/$organizationName/boards"
              params={{ organizationName }}
            >
              {t("menu.board")}
            </Link>
          </li>
          <li className={active === "pullrequests" ? "active" : ""}>
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={{ filter: "", pageNum: 1 }}
              to="/organizations/$organizationName/pullrequests"
              params={{ organizationName }}
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to="/organizations/$organizationName/settingform"
                  params={{ organizationName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function booleanField(value: unknown) {
  return value === true;
}

function percentOf(count: number, total: number) {
  return total <= 0 ? 0 : Math.round((count / total) * 100);
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function splitHeaderWordsInBrackets(title: string) {
  const prefixes: string[] = [];
  const pattern = /^\s*(\[[^\]]+\])/u;
  let rest = title;
  while (true) {
    const match = pattern.exec(rest);
    if (!match) {
      break;
    }
    prefixes.push(match[1].trim());
    rest = rest.slice(match[0].length);
  }
  const onlyPrefixes = rest.trim() === "";
  return {
    prefixes: onlyPrefixes ? [] : prefixes,
    title: onlyPrefixes ? title : rest.trimStart(),
  };
}
