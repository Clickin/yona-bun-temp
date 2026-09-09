import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as React from "react";
import type { HTMLAttributes, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  organizationPullRequestListQueryOptions,
  type PullRequestListItem,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { legacyOrganizationPullRequestTabsClassName } from "./-pullrequest-tabs";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";

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
    const base = prefixBasePath(runtimeConfig.basePath, "");
    // legacy PJAX tab switch lands on a clean URL (no ?filter=&pageNum=1);
    // history.push with the bare prefixed path avoids validateSearch re-serializing
    // filter/pageNum defaults onto the URL
    router.history.push(to.startsWith(base) ? to : prefixBasePath(runtimeConfig.basePath, to));
  };

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-owner="organization-pullrequests-page">
        <div className="project-page-wrap" data-owner="organization-pullrequests-shell">
          <div className="row-fluid cb">
            <div
              className="left-menu span2 search-wrap hide-in-mobile"
              data-owner="organization-pullrequests-search-column"
              style={{ paddingTop: 0 }}
            >
              <form id="search" name="search" action={searchAction} method="get">
                <div className="search">
                  <div className="search-bar" data-owner="organization-pullrequests-search-bar">
                    <input
                      name="filter"
                      className="textbox full"
                      data-owner="organization-pullrequests-search-input"
                      type="text"
                      defaultValue={search.filter}
                    />
                    <button
                      className="search-btn"
                      data-owner="organization-pullrequests-search-button"
                      type="submit"
                    >
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="span10 span-hard-wrap" id="span10">
              <ul
                className={`nav nav-tabs nm ${legacyOrganizationPullRequestTabsClassName}`}
                data-owner="organization-pullrequests-tabs"
              >
                <li className={selectedCategory === "open" ? "active" : ""}>
                  <button
                    data-owner="organization-pullrequests-tab"
                    type="button"
                    onClick={() => navigateTab(openAction)}
                  >
                    {t("pullRequest.state.open")}
                    <span className="num-badge">{pullRequests.openCount}</span>
                  </button>
                </li>
                <li className={selectedCategory === "closed" ? "active" : ""}>
                  <button
                    data-owner="organization-pullrequests-tab"
                    type="button"
                    onClick={() => navigateTab(closedAction)}
                  >
                    {t("pullRequest.state.closed")}
                    <span className="num-badge">{pullRequests.closedCount}</span>
                  </button>
                </li>
              </ul>
              <div
                className="tab-content"
                data-owner="organization-pullrequests-content"
                style={{ clear: "both", paddingTop: 15 }}
              >
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
    <ul className="post-list-wrap" data-owner="organization-pullrequests-list">
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
        <div className="error-wrap" data-owner="organization-pullrequests-empty">
          <i
            className="ico ico-err1"
            style={
              {
                "--organization-pullrequests-empty-sprite": `url(${legacySpriteUrl})`,
              } as React.CSSProperties
            }
            data-owner="organization-pullrequests-empty-icon"
          ></i>
          <p data-owner="organization-pullrequests-empty-message">{t("pullRequest.is.empty")}</p>
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
      id="pagination"
      className="page-navigation-wrap"
      data-owner="organization-pullrequests-pagination"
    >
      <ul className="page-nums" data-owner="organization-pullrequests-pagination-page-nums">
        <li className="page-num ikon" data-owner="organization-pullrequests-pagination-prev-page">
          {safeCurrentPage > 1 ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={pathForPage(safeCurrentPage - 1)}
            >
              <i
                className="ico btn-pg-prev"
                data-owner="organization-pullrequests-pagination-prev-icon"
              ></i>
              <span data-owner="organization-pullrequests-pagination-prev-label">
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                className="ico btn-pg-prev off"
                data-owner="organization-pullrequests-pagination-prev-icon"
              ></i>
              <span className="off" data-owner="organization-pullrequests-pagination-prev-label">
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li className="page-num" data-owner="organization-pullrequests-pagination-input-page">
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
            key={safeCurrentPage}
            data-owner="organization-pullrequests-pagination-input"
          />
        </li>
        <li
          className="page-num delimiter"
          data-owner="organization-pullrequests-pagination-delimiter"
        >
          /
        </li>
        <li className="page-num" data-owner="organization-pullrequests-pagination-total">
          {totalPages}
        </li>
        <li className="page-num ikon" data-owner="organization-pullrequests-pagination-next-page">
          {safeCurrentPage < totalPages ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={pathForPage(safeCurrentPage + 1)}
            >
              <span data-owner="organization-pullrequests-pagination-next-label">
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next"
                data-owner="organization-pullrequests-pagination-next-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span className="off" data-owner="organization-pullrequests-pagination-next-label">
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next off"
                data-owner="organization-pullrequests-pagination-next-icon"
              ></i>
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
      className="post-item title"
      data-owner="organization-pullrequests-row"
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
        <div className="infos" data-owner="organization-pullrequests-row-meta">
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
            <div className="infos-item" data-owner="organization-pullrequests-row-progress">
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div
                className="upload-progress"
                data-owner="organization-pullrequests-row-progress-track"
              >
                <div
                  className="bar orange"
                  style={{ "--x-review-progress-width": `${percent}%` } as React.CSSProperties}
                  data-owner="organization-pullrequests-row-progress-fill"
                ></div>
              </div>
              <Link
                params={pullRequestParams}
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span data-owner="organization-pullrequests-review-separator">/</span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div
          className="mt5 hide-in-mobile"
          data-owner="organization-pullrequests-row-receiver-rail"
        >
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
        <div className={`state ${stateKey}`} data-owner="organization-pullrequests-row-state">
          {t(`pullRequest.state.${stateKey}`)}
        </div>
      </div>
    </li>
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
