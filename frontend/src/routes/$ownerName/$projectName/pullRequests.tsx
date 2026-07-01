import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type HTMLAttributes, type LiHTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import {
  projectPullRequestListQueryOptions,
  type PullRequestListCategory,
  type PullRequestListItem,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { SitePagination } from "../../sites/-pagination";
import { ProjectHeader, ProjectMenu } from "../$projectName";

export type ProjectPullRequestsSearch = {
  contributorId: number;
  filter: string;
  pageNum: number;
};

export function validateProjectPullRequestsSearch(
  search: Record<string, unknown>,
): ProjectPullRequestsSearch {
  return {
    contributorId: Number(search.contributorId) || 0,
    filter: typeof search.filter === "string" ? search.filter : "",
    pageNum: Number(search.pageNum) || 1,
  };
}

export const Route = createFileRoute("/$ownerName/$projectName/pullRequests")({
  component: ProjectPullRequestsRoute,
  validateSearch: validateProjectPullRequestsSearch,
});

function ProjectPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestsScreen
            category="open"
            ownerName={ownerName}
            projectName={projectName}
            requestType="open"
            runtimeConfig={runtimeConfig}
            search={search}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

export function ProjectPullRequestsScreen({
  category,
  ownerName,
  projectName,
  requestType,
  runtimeConfig,
  search,
}: {
  category: PullRequestListCategory;
  ownerName: string;
  projectName: string;
  requestType: "closed" | "open" | "sent";
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const pullRequestsQuery = useQuery(
    projectPullRequestListQueryOptions(runtimeConfig, {
      category,
      contributorId: search.contributorId,
      filter: search.filter,
      ownerName,
      pageNum: search.pageNum,
      projectName,
    }),
  );

  if (!projectQuery.data || !pullRequestsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="pullRequest"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <ProjectPullRequestsBody
        project={projectQuery.data}
        pullRequests={pullRequestsQuery.data}
        requestType={requestType}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectPullRequestsBody({
  project,
  pullRequests,
  requestType,
  runtimeConfig,
  search,
}: {
  project: ProjectContainer;
  pullRequests: PullRequestListResponse;
  requestType: "closed" | "open" | "sent";
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, pullRequests.items[0]?.ownerName ?? "");
  const projectName = stringField(project.projectName, pullRequests.items[0]?.projectName ?? "");
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const openAction = projectPullRequestsHref(runtimeConfig.basePath, ownerName, projectName);
  const closedAction = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/closedPullRequests`,
  );
  const sentAction = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/sentPullRequests`,
  );
  const isForked = booleanField(project.isForkedFromOrigin);
  const searchAction =
    requestType === "closed" ? closedAction : requestType === "sent" ? sentAction : openAction;

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div {...pjaxContainer} className="row-fluid cb">
          <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
            <form id="search" name="search" action={searchAction} method="get">
              <div className="search">
                <div className="search-bar">
                  <input
                    name="filter"
                    className="textbox full"
                    type="text"
                    defaultValue={search.filter}
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </div>
              {requestType === "sent" ? null : (
                <div id="advanced-search-form" className="srch-advanced">
                  <dl className="issue-option">
                    <dt>{t("pullRequest.sender")}</dt>
                    <dd>
                      <select
                        id="contributors"
                        name="contributorId"
                        data-format="user"
                        defaultValue={search.contributorId ? String(search.contributorId) : ""}
                      >
                        <option value="">{t("common.order.all")}</option>
                        {pullRequests.contributors.some(
                          (contributor) => contributor.userId === pullRequests.currentUserId,
                        ) ? (
                          <option value={pullRequests.currentUserId}>
                            {t("pullRequest.sentByMe")}
                          </option>
                        ) : null}
                        {pullRequests.contributors.map((contributor) => (
                          <option
                            value={contributor.userId}
                            data-avatar-url={contributor.avatarUrl}
                            data-login-id={contributor.loginId}
                            key={contributor.userId}
                          >
                            {contributor.userLabel}
                          </option>
                        ))}
                      </select>
                    </dd>
                  </dl>
                </div>
              )}
            </form>
          </div>
          <div className="span10 span-hard-wrap" id="span10">
            <div className="pull-right">
              <a
                href={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/newPullRequestForm`,
                )}
                className="ybtn ybtn-success"
              >
                {t("pullRequest.new")}
              </a>
            </div>
            <ul className="nav nav-tabs nm pullrequeset-tab-menu">
              <li className={requestType === "open" ? "active" : ""}>
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                <a href="#" data-url={openAction} data-type="state">
                  {t("pullRequest.state.open")}
                  <span className="num-badge">{pullRequests.openCount}</span>
                </a>
              </li>
              <li className={requestType === "closed" ? "active" : ""}>
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                <a href="#" data-url={closedAction} data-type="state">
                  {t("pullRequest.state.closed")}
                  <span className="num-badge">{pullRequests.closedCount}</span>
                </a>
              </li>
              {isForked ? (
                <li className={requestType === "sent" ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                  <a href="#" data-url={sentAction} data-type="state">
                    {t("pullRequest.sent")}
                    <span className="num-badge">
                      {pullRequests.acceptedCount} / {pullRequests.sentCount}
                    </span>
                  </a>
                </li>
              ) : null}
              <li>
                <TwoColumnModeCheckbox />
              </li>
            </ul>
            <div className="tab-content" style={{ clear: "both", paddingTop: 15 }}>
              <div id="list" className="row-fluid tab-pane active">
                <ProjectPullRequestRows
                  basePath={runtimeConfig.basePath}
                  currentUserLabel={currentUserLabel(pullRequests)}
                  defaultBranch={stringField(recordField(project).defaultBranch, "main")}
                  isUsingReviewerCount={booleanField(recordField(project).isUsingReviewerCount)}
                  listAction={searchAction}
                  pullRequests={pullRequests}
                  search={search}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectPullRequestRows({
  basePath,
  currentUserLabel,
  defaultBranch,
  isUsingReviewerCount,
  listAction,
  pullRequests,
  search,
}: {
  basePath: string;
  currentUserLabel: string;
  defaultBranch: string;
  isUsingReviewerCount: boolean;
  listAction: string;
  pullRequests: PullRequestListResponse;
  search: ProjectPullRequestsSearch;
}) {
  const { t } = useLegacyMessages();

  if (pullRequests.items.length === 0) {
    return (
      <ul className="post-list-wrap">
        <div className="error-wrap">
          <i className="ico ico-err1"></i>
          <p>{t("pullRequest.is.empty")}</p>
        </div>
      </ul>
    );
  }

  return (
    <ul className="post-list-wrap">
      {pullRequests.items.map((pullRequest) => (
        <ProjectPullRequestRow
          basePath={basePath}
          currentUserLabel={currentUserLabel}
          defaultBranch={defaultBranch}
          isUsingReviewerCount={isUsingReviewerCount}
          key={pullRequest.id || pullRequest.pullRequestNumber}
          pullRequest={pullRequest}
        />
      ))}
      <ProjectPullRequestPagination
        listAction={listAction}
        pullRequests={pullRequests}
        search={search}
      />
    </ul>
  );
}

function ProjectPullRequestPagination({
  listAction,
  pullRequests,
  search,
}: {
  listAction: string;
  pullRequests: PullRequestListResponse;
  search: ProjectPullRequestsSearch;
}) {
  const pages = totalPages(pullRequests);
  if (pages <= 1) {
    return <div id="pagination"></div>;
  }
  return (
    <SitePagination
      currentPage={pullRequests.pageNum}
      pageHref={(pageNum) => pullRequestPageHref(listAction, search, pageNum)}
      totalPages={pages}
    />
  );
}

function ProjectPullRequestRow({
  basePath,
  currentUserLabel,
  defaultBranch,
  isUsingReviewerCount,
  pullRequest,
}: {
  basePath: string;
  currentUserLabel: string;
  defaultBranch: string;
  isUsingReviewerCount: boolean;
  pullRequest: PullRequestListItem;
}) {
  const { t } = useLegacyMessages();
  const projectHref = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}`,
  );
  const pullRequestHref = `${projectHref}/pullRequest/${pullRequest.pullRequestNumber}`;
  const changesHref = `${pullRequestHref}/changes`;
  const contributorHref = prefixBasePath(basePath, `/${pullRequest.contributorLoginId}`);
  const receiverHref = prefixBasePath(basePath, `/${pullRequest.receiverLoginId}`);
  const percent = percentOf(pullRequest.closedCommentThreadCount, pullRequest.commentThreadCount);
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const legacyHref = { href: pullRequestHref } as unknown as LiHTMLAttributes<HTMLLIElement>;
  const toBranchClass = pullRequest.toBranch === defaultBranch ? "to-default-branch" : "to-branch";
  const titleParts = splitHeaderWordsInBrackets(pullRequest.title);
  const showReviewerCount = isUsingReviewerCount && pullRequest.reviewerCount > 0;
  const reviewerClass = pullRequest.reviewerNames.includes(currentUserLabel)
    ? "infos-item over"
    : "infos-item";

  return (
    <li className="post-item title" {...legacyHref}>
      <div className="span10 span-hard-wrap">
        <a
          href={contributorHref}
          className="avatar-wrap mlarge"
          data-toggle="tooltip"
          data-placement="top"
          title={pullRequest.contributorLoginId}
        >
          <img src="/assets/images/default-avatar-32.png" alt="" />
        </a>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          {titleParts.prefixes.map((prefix) => (
            <LegacyTitlePrefixAnchor key={prefix}>{prefix}</LegacyTitlePrefixAnchor>
          ))}
          <a href={pullRequestHref} className={`title ${pullRequest.conflict ? "conflict" : ""}`}>
            {titleParts.title}
          </a>
        </div>
        <div className="infos">
          {pullRequest.contributorLabel ? (
            <a
              href={contributorHref}
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
              title={pullRequest.contributorLoginId}
            >
              {pullRequest.contributorLabel}
            </a>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={pullRequest.createdLabel}>
            {pullRequest.createdLabel}
          </span>
          {pullRequest.commentThreadCount > 0 ? (
            <div className="infos-item" style={{ marginRight: 10 }}>
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div className="bar orange" style={{ width: `${percent}%` }}></div>
              </div>
              <a
                href={changesHref}
                data-toggle="tooltip"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span className="gray-txt">/</span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </a>
            </div>
          ) : null}
          {showReviewerCount ? (
            <div className={reviewerClass} style={{ marginTop: -1 }}>
              <i className="infos-icon yobicon-preview vmiddle"></i>
              <a
                href={`${pullRequestHref}#reviewers`}
                data-toggle="tooltip"
                data-html="true"
                data-title={pullRequest.reviewerNames.join("<br>")}
              >
                <span className="vmiddle">{pullRequest.reviewerCount}</span>
              </a>
            </div>
          ) : null}
          <span className={toBranchClass}>{pullRequest.toBranch}</span>
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right hide-in-mobile">
          {pullRequest.receiverLoginId ? (
            <a
              href={receiverHref}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={pullRequest.receiverLabel}
            >
              <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
            </a>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div className={`state ${stateKey} pull-right`}>{t(`pullRequest.state.${stateKey}`)}</div>
      </div>
    </li>
  );
}

function LegacyTitlePrefixAnchor({ children }: { children: string }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    anchorRef.current?.setAttribute("href", "javascript:void(0)");
  }, []);
  return (
    <a ref={anchorRef} href="/" className="title-prefix">
      {children}
    </a>
  );
}

function TwoColumnModeCheckbox() {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title="Two Column Mode"
      data-content="Splits list and body into columns respectively"
    >
      <label className="checkbox" aria-label="Column View">
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">Column View</span>
        </div>
      </label>
    </div>
  );
}

function projectPullRequestsHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`);
}

function pullRequestPageHref(
  listAction: string,
  search: ProjectPullRequestsSearch,
  pageNum: number,
) {
  const params = new URLSearchParams();
  if (search.contributorId) {
    params.set("contributorId", String(search.contributorId));
  }
  if (search.filter) {
    params.set("filter", search.filter);
  }
  params.set("pageNum", String(pageNum));
  return `${listAction}?${params.toString()}`;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}

function currentUserLabel(pullRequests: PullRequestListResponse) {
  const currentUser = pullRequests.contributors.find(
    (contributor) => contributor.userId === pullRequests.currentUserId,
  );
  return currentUser?.userLabel ?? "";
}

function recordField(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function percentOf(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function totalPages(pullRequests: PullRequestListResponse) {
  return Math.ceil(pullRequests.totalCount / Math.max(pullRequests.pageSize, 1));
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
