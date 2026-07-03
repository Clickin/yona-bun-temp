import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type HTMLAttributes, type LiHTMLAttributes } from "react";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import {
  deleteProjectPushedBranchRest,
  projectPullRequestListQueryOptions,
  type PullRequestListCategory,
  type PullRequestListItem,
  type PullRequestPushedBranch,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import { apiQueryKeys } from "../../../api/query-keys";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState(search.filter);
  const [contributorIdValue, setContributorIdValue] = useState(
    search.contributorId ? String(search.contributorId) : "",
  );

  useEffect(() => {
    setFilterValue(search.filter);
    setContributorIdValue(search.contributorId ? String(search.contributorId) : "");
  }, [search.contributorId, search.filter]);

  const searchFor = (filter = filterValue, contributorId = contributorIdValue) =>
    pullRequestSearchObject({
      contributorId: requestType === "sent" ? "" : contributorId,
      filter,
    });
  const searchNavigationMutation = useMutation({
    mutationFn: async ({
      action,
      contributorId,
      filter,
    }: {
      action: string;
      contributorId: number | string;
      filter: string;
    }) =>
      pullRequestSearchHref({
        action,
        contributorId: requestType === "sent" ? "" : contributorId,
        filter,
      }),
    onSuccess(href) {
      void queryClient.invalidateQueries({
        queryKey: [...apiQueryKeys.project.base(ownerName, projectName), "pull-requests"],
      });
      router.navigate({ to: stripBasePath(runtimeConfig.basePath, href) });
    },
  });
  const submitPullRequestSearch = (action = searchAction) => {
    searchNavigationMutation.mutate({
      action,
      contributorId: contributorIdValue,
      filter: filterValue,
    });
  };

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div {...pjaxContainer} className="row-fluid cb">
          <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
            <form
              id="search"
              name="search"
              action={searchAction}
              method="get"
              onSubmit={(event) => {
                event.preventDefault();
                submitPullRequestSearch(event.currentTarget.action);
              }}
            >
              <div className="search">
                <div className="search-bar">
                  <input
                    key={`filter:${search.filter}`}
                    name="filter"
                    className="textbox full"
                    type="text"
                    defaultValue={search.filter}
                    onChange={(event) => setFilterValue(event.currentTarget.value)}
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
                        key={`contributor:${search.contributorId || ""}`}
                        id="contributors"
                        name="contributorId"
                        data-format="user"
                        defaultValue={search.contributorId ? String(search.contributorId) : ""}
                        onChange={(event) => {
                          const nextContributorId = event.currentTarget.value;
                          setContributorIdValue(nextContributorId);
                          searchNavigationMutation.mutate({
                            action: searchAction,
                            contributorId: nextContributorId,
                            filter: filterValue,
                          });
                        }}
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
            <ProjectRecentlyPushedBranches
              runtimeConfig={runtimeConfig}
              listQueryKey={apiQueryKeys.project.pullRequestList(ownerName, projectName, {
                category: requestType,
                contributorId: search.contributorId,
                filter: search.filter,
                pageNum: search.pageNum,
              })}
              pushedBranches={pullRequests.recentlyPushedBranches}
            />
            <div className="pull-right">
              <Link
                to={`/${ownerName}/${projectName}/newPullRequestForm` as never}
                className="ybtn ybtn-success"
              >
                {t("pullRequest.new")}
              </Link>
            </div>
            <ul className="nav nav-tabs nm pullrequeset-tab-menu">
              <li className={requestType === "open" ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/pullRequests"
                  params={{ ownerName, projectName }}
                  search={searchFor()}
                >
                  {t("pullRequest.state.open")}
                  <span className="num-badge">{pullRequests.openCount}</span>
                </Link>
              </li>
              <li className={requestType === "closed" ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/closedPullRequests"
                  params={{ ownerName, projectName }}
                  search={searchFor()}
                >
                  {t("pullRequest.state.closed")}
                  <span className="num-badge">{pullRequests.closedCount}</span>
                </Link>
              </li>
              {isForked ? (
                <li className={requestType === "sent" ? "active" : ""}>
                  <Link
                    to="/$ownerName/$projectName/sentPullRequests"
                    params={{ ownerName, projectName }}
                    search={searchFor(filterValue, "")}
                  >
                    {t("pullRequest.sent")}
                    <span className="num-badge">
                      {pullRequests.acceptedCount} / {pullRequests.sentCount}
                    </span>
                  </Link>
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
                  ownerName={ownerName}
                  pullRequests={pullRequests}
                  projectName={projectName}
                  search={search}
                  titlePrefixSearch={(prefix) => searchFor(prefix)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRecentlyPushedBranches({
  listQueryKey,
  pushedBranches,
  runtimeConfig,
}: {
  listQueryKey: ReturnType<typeof apiQueryKeys.project.pullRequestList>;
  pushedBranches: PullRequestPushedBranch[];
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (branch: PullRequestPushedBranch) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      await deleteProjectPushedBranchRest(runtimeConfig, csrfToken, {
        ownerName: branch.ownerName,
        projectName: branch.projectName,
        pushedBranchId: branch.id,
      });
      return branch.id;
    },
    onSuccess(deletedBranchId) {
      queryClient.setQueryData<PullRequestListResponse>(listQueryKey, (current) =>
        current
          ? {
              ...current,
              recentlyPushedBranches: current.recentlyPushedBranches.filter(
                (branch) => branch.id !== deletedBranchId,
              ),
            }
          : current,
      );
    },
  });

  if (pushedBranches.length === 0) {
    return null;
  }

  return (
    <>
      <h5>{t("pullRequest.pushed.branches.title")}</h5>
      <div className="alert alert-info">
        {pushedBranches.map((branch) => {
          const projectPath = `/${branch.ownerName}/${branch.projectName}`;
          return (
            <div key={branch.id || branch.branchName}>
              <i className="yobicon-split"></i>
              <span style={{ marginLeft: 5, fontWeight: "bold" }}>
                {`${branch.ownerName}/${branch.projectName}:${branch.shortName} ( ${branch.pushedLabel} )`}
              </span>
              &nbsp;-&nbsp;
              <Link
                to={
                  `${projectPath}/newPullRequestForm?fromBranch=${branch.branchName}&toBranch=${branch.defaultBranch}` as never
                }
              >
                {t("pullRequest")}
              </Link>
              {/* oxlint-disable jsx-a11y/no-aria-hidden-on-focusable -- legacy close hook keeps aria-hidden. */}
              <button
                type="button"
                className="close"
                data-dismiss="alert"
                aria-hidden="true"
                data-request-method="delete"
                data-request-uri={prefixBasePath(
                  runtimeConfig.basePath,
                  `${projectPath}/pushedBranch/${branch.id}/delete`,
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteMutation.mutate(branch);
                }}
              >
                &times;
              </button>
              {/* oxlint-enable jsx-a11y/no-aria-hidden-on-focusable */}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProjectPullRequestRows({
  basePath,
  currentUserLabel,
  defaultBranch,
  isUsingReviewerCount,
  listAction,
  ownerName,
  pullRequests,
  projectName,
  search,
  titlePrefixSearch,
}: {
  basePath: string;
  currentUserLabel: string;
  defaultBranch: string;
  isUsingReviewerCount: boolean;
  listAction: string;
  ownerName: string;
  pullRequests: PullRequestListResponse;
  projectName: string;
  search: ProjectPullRequestsSearch;
  titlePrefixSearch: (prefix: string) => ProjectPullRequestsSearch;
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
          ownerName={ownerName}
          pullRequest={pullRequest}
          projectName={projectName}
          titlePrefixSearch={titlePrefixSearch}
        />
      ))}
      <ProjectPullRequestPagination
        basePath={basePath}
        listAction={listAction}
        pullRequests={pullRequests}
        search={search}
      />
    </ul>
  );
}

function ProjectPullRequestPagination({
  basePath,
  listAction,
  pullRequests,
  search,
}: {
  basePath: string;
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
      basePath={basePath}
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
  ownerName,
  pullRequest,
  projectName,
  titlePrefixSearch,
}: {
  basePath: string;
  currentUserLabel: string;
  defaultBranch: string;
  isUsingReviewerCount: boolean;
  ownerName: string;
  pullRequest: PullRequestListItem;
  projectName: string;
  titlePrefixSearch: (prefix: string) => ProjectPullRequestsSearch;
}) {
  const { t } = useLegacyMessages();
  const projectHref = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}`,
  );
  const pullRequestHref = `${projectHref}/pullRequest/${pullRequest.pullRequestNumber}`;
  const pullRequestParams = {
    ownerName: pullRequest.ownerName,
    projectName: pullRequest.projectName,
    pullRequestNumber: String(pullRequest.pullRequestNumber),
  };
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
        <Link
          to="/$user"
          params={{ user: pullRequest.contributorLoginId }}
          className="avatar-wrap mlarge"
          data-toggle="tooltip"
          data-placement="top"
          title={pullRequest.contributorLoginId}
        >
          <img src="/assets/images/default-avatar-32.png" alt="" />
        </Link>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          {titleParts.prefixes.map((prefix) => (
            <LegacyTitlePrefixLink
              key={prefix}
              ownerName={ownerName}
              projectName={projectName}
              search={titlePrefixSearch(prefix)}
            >
              {prefix}
            </LegacyTitlePrefixLink>
          ))}
          <Link
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            params={pullRequestParams}
            className={`title ${pullRequest.conflict ? "conflict" : ""}`}
          >
            {titleParts.title}
          </Link>
        </div>
        <div className="infos">
          {pullRequest.contributorLabel ? (
            <Link
              to="/$user"
              params={{ user: pullRequest.contributorLoginId }}
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
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
          {pullRequest.commentThreadCount > 0 ? (
            <div className="infos-item" style={{ marginRight: 10 }}>
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div className="bar orange" style={{ width: `${percent}%` }}></div>
              </div>
              <Link
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                params={pullRequestParams}
                data-toggle="tooltip"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span className="gray-txt">/</span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </Link>
            </div>
          ) : null}
          {showReviewerCount ? (
            <div className={reviewerClass} style={{ marginTop: -1 }}>
              <i className="infos-icon yobicon-preview vmiddle"></i>
              <Link
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
                params={pullRequestParams}
                hash="reviewers"
                data-toggle="tooltip"
                data-html="true"
                data-title={pullRequest.reviewerNames.join("<br>")}
              >
                <span className="vmiddle">{pullRequest.reviewerCount}</span>
              </Link>
            </div>
          ) : null}
          <span className={toBranchClass}>{pullRequest.toBranch}</span>
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right hide-in-mobile">
          {pullRequest.receiverLoginId ? (
            <Link
              to="/$user"
              params={{ user: pullRequest.receiverLoginId }}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={pullRequest.receiverLabel}
            >
              <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div className={`state ${stateKey} pull-right`}>{t(`pullRequest.state.${stateKey}`)}</div>
      </div>
    </li>
  );
}

function LegacyTitlePrefixLink({
  children,
  ownerName,
  projectName,
  search,
}: {
  children: string;
  ownerName: string;
  projectName: string;
  search: ProjectPullRequestsSearch;
}) {
  return (
    <Link
      to="/$ownerName/$projectName/pullRequests"
      params={{ ownerName, projectName }}
      search={search}
      className="title-prefix"
    >
      {children}
    </Link>
  );
}

function pullRequestSearchHref({
  action,
  contributorId,
  filter,
}: {
  action: string;
  contributorId: number | string;
  filter: string;
}) {
  const params = new URLSearchParams();
  const normalizedFilter = filter.trim();
  const normalizedContributorId = String(contributorId || "").trim();
  if (normalizedFilter) {
    params.set("filter", normalizedFilter);
  }
  if (normalizedContributorId) {
    params.set("contributorId", normalizedContributorId);
  }
  return params.size ? `${action}?${params.toString()}` : action;
}

function pullRequestSearchObject({
  contributorId,
  filter,
}: {
  contributorId: number | string;
  filter: string;
}): ProjectPullRequestsSearch {
  const normalizedContributorId = Number(contributorId) || 0;
  const normalizedFilter = filter.trim();
  return {
    contributorId: normalizedContributorId,
    filter: normalizedFilter,
    pageNum: 1,
  };
}

function stripBasePath(basePath: string, href: string) {
  if (basePath && basePath !== "/" && href.startsWith(basePath)) {
    return href.slice(basePath.length) || "/";
  }
  return href;
}

function TwoColumnModeCheckbox() {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title="Two Column Mode"
      data-content="Splits list and body into columns respectively"
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper without aria-label. */}
      <label className="checkbox">
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
  if (pageNum > 1) {
    params.set("pageNum", String(pageNum));
  }
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
