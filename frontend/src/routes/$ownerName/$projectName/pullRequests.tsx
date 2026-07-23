import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { DefaultSearchErrorBody } from "../../-search-screen";
import { SitePagination } from "../../sites/-pagination";
import { ProjectHeader, ProjectMenu } from "../$projectName";
import { styles } from "./-pull-requests.stylex";

const sx = {
  page: stylex.props(styles.page),
  searchColumn: stylex.props(styles.searchColumn),
  searchBar: stylex.props(styles.searchBar),
  searchInput: stylex.props(styles.searchInput),
  searchButton: stylex.props(styles.searchButton),
  tabs: stylex.props(styles.tabs),
  searchColumnHidden: stylex.props(styles.searchColumnHidden),
  recentlyPushedBranch: stylex.props(styles.recentlyPushedBranch),
  reviewProgressItem: stylex.props(styles.reviewProgressItem),
  reviewProgressBar: (width: string) => stylex.props(styles.reviewProgressBar(width)),
  reviewerCount: stylex.props(styles.reviewerCount),
  badge: stylex.props(styles.badge),
  content: stylex.props(styles.content),
  twoColumnAnchor: stylex.props(styles.twoColumnAnchor),
  twoColumnPopover: stylex.props(styles.twoColumnPopover),
  rowPointer: stylex.props(styles.rowPointer),
  grayTextSeparator: stylex.props(styles.grayTextSeparator),
  errorWrap: stylex.props(styles.errorWrap),
  errorIcon: (backgroundImage: string) => stylex.props(styles.errorIcon(backgroundImage)),
  errorMessage: stylex.props(styles.errorMessage),
} as const;

const LEGACY_LIST_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export type ProjectPullRequestsSearch = {
  filter: string;
  contributorId: number;
  pageNum: number;
};

type PullRequestListRouteTarget =
  | "/$ownerName/$projectName/pullRequests"
  | "/$ownerName/$projectName/closedPullRequests"
  | "/$ownerName/$projectName/sentPullRequests";

export function validateProjectPullRequestsSearch(
  search: Record<string, unknown>,
): ProjectPullRequestsSearch {
  return {
    filter: typeof search.filter === "string" ? search.filter : "",
    contributorId: Number(search.contributorId) || 0,
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
    <ProjectPullRequestsScreen
      category="open"
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={false}
      requestType="open"
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

export function ProjectPullRequestsBadRequestRouteShell({
  ownerName,
  projectName,
  runtimeConfig,
}: {
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
      <ProjectPullRequestsBrowserTitle
        isGitProject={false}
        ownerName={ownerName}
        projectName={projectName}
      />
      <ProjectPullRequestsBadRequestBody runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
}

function ProjectPullRequestsBadRequestBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <DefaultSearchErrorBody
      iconClassName="ico-404"
      messageKey="error.badrequest.only.available.for.git"
      runtimeConfig={runtimeConfig}
      ybtnClassName="ybtn ybtn-info"
    />
  );
}

export function ProjectPullRequestsScreen({
  category,
  ownerName,
  project: initialProject,
  projectName,
  renderProjectShell = true,
  requestType,
  runtimeConfig,
  search,
}: {
  category: PullRequestListCategory;
  ownerName: string;
  project?: ProjectContainer;
  projectName: string;
  renderProjectShell?: boolean;
  requestType: "closed" | "open" | "sent";
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const project = initialProject ?? projectQuery.data;
  const isGitProject = stringField(project?.vcs, "GIT") === "GIT";
  const pullRequestsQuery = useQuery({
    ...projectPullRequestListQueryOptions(runtimeConfig, {
      category,
      contributorId: search.contributorId,
      filter: search.filter,
      ownerName,
      pageNum: search.pageNum,
      projectName,
    }),
    enabled: isGitProject,
  });

  if (!project) {
    return null;
  }

  if (!isGitProject) {
    return (
      <>
        {renderProjectShell ? (
          <ProjectPullRequestsBrowserTitle
            isGitProject={false}
            ownerName={ownerName}
            projectName={projectName}
          />
        ) : null}
        <ProjectPullRequestsBadRequestBody runtimeConfig={runtimeConfig} />
      </>
    );
  }

  if (!pullRequestsQuery.data) {
    return null;
  }

  return (
    <>
      {renderProjectShell ? (
        <>
          <ProjectPullRequestsBrowserTitle
            isGitProject={isGitProject}
            ownerName={ownerName}
            projectName={projectName}
          />
          <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
          <ProjectMenu active="pullRequest" basePath={runtimeConfig.basePath} project={project} />
        </>
      ) : null}
      <ProjectPullRequestsBody
        project={project}
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
  const titlePrefixRoute = pullRequestListRouteTarget(requestType);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState(search.filter);
  const [contributorIdValue, setContributorIdValue] = useState(
    search.contributorId ? String(search.contributorId) : "",
  );
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [highlightedPullRequestId, setHighlightedPullRequestId] = useState("");
  const [leftMenuHiddenByTwoColumnMode, setLeftMenuHiddenByTwoColumnMode] = useState(false);

  useEffect(() => {
    setFilterValue(search.filter);
    setContributorIdValue(search.contributorId ? String(search.contributorId) : "");
  }, [search.contributorId, search.filter]);

  const searchFor = (filter = filterValue, contributorId = contributorIdValue) =>
    pullRequestSearchObject({
      contributorId: requestType === "sent" ? "" : contributorId,
      filter,
    });
  const navigatePullRequestSearch = ({
    action,
    contributorId,
    filter,
  }: {
    action: string;
    contributorId: number | string;
    filter: string;
  }) => {
    const nextSearch = pullRequestSearchObject({
      contributorId: requestType === "sent" ? "" : contributorId,
      filter,
    });
    void queryClient.invalidateQueries({
      queryKey: [...apiQueryKeys.project.base(ownerName, projectName), "pull-requests"],
    });
    if (action === closedAction) {
      router.navigate({
        to: "/$ownerName/$projectName/closedPullRequests",
        params: { ownerName, projectName },
        search: nextSearch,
      });
      return;
    }
    if (action === sentAction) {
      router.navigate({
        to: "/$ownerName/$projectName/sentPullRequests",
        params: { ownerName, projectName },
        search: nextSearch,
      });
      return;
    }
    router.navigate({
      to: "/$ownerName/$projectName/pullRequests",
      params: { ownerName, projectName },
      search: nextSearch,
    });
  };
  const submitPullRequestSearch = (action = searchAction) => {
    navigatePullRequestSearch({
      action,
      contributorId: contributorIdValue,
      filter: filterValue,
    });
  };

  return (
    <div {...sx.page} data-stylex-owner="project-pullrequests-page">
      <div data-stylex-owner="project-pullrequests-shell">
        <div className="row-fluid cb">
          <div
            {...sx.searchColumn}
            {...(leftMenuHiddenByTwoColumnMode ? sx.searchColumnHidden : {})}
            data-stylex-owner="project-pullrequests-search-column"
          >
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
                <div {...sx.searchBar} data-stylex-owner="project-pullrequests-search-bar">
                  <input
                    key={`filter:${search.filter}`}
                    name="filter"
                    {...sx.searchInput}
                    data-stylex-owner="project-pullrequests-search-input"
                    type="text"
                    defaultValue={search.filter}
                    onChange={(event) => setFilterValue(event.currentTarget.value)}
                  />
                  <button
                    {...sx.searchButton}
                    data-stylex-owner="project-pullrequests-search-button"
                    type="submit"
                  >
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
                          navigatePullRequestSearch({
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
                          <option value={contributor.userId} key={contributor.userId}>
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
                to="/$ownerName/$projectName/newPullRequestForm"
                params={{ ownerName, projectName }}
                {...LEGACY_LIST_LINK_PROPS}
                className="ybtn ybtn-success"
              >
                {t("pullRequest.new")}
              </Link>
            </div>
            <ul {...sx.tabs} data-stylex-owner="project-pullrequests-tabs">
              <li className={requestType === "open" ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/pullRequests"
                  params={{ ownerName, projectName }}
                  search={{ ...searchFor(), tabId: undefined }}
                  {...LEGACY_LIST_LINK_PROPS}
                >
                  {t("pullRequest.state.open")}
                  <span {...sx.badge}>{pullRequests.openCount}</span>
                </Link>
              </li>
              <li className={requestType === "closed" ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/closedPullRequests"
                  params={{ ownerName, projectName }}
                  search={{ ...searchFor(), tabId: undefined }}
                  {...LEGACY_LIST_LINK_PROPS}
                >
                  {t("pullRequest.state.closed")}
                  <span {...sx.badge}>{pullRequests.closedCount}</span>
                </Link>
              </li>
              {isForked ? (
                <li className={requestType === "sent" ? "active" : ""}>
                  <Link
                    to="/$ownerName/$projectName/sentPullRequests"
                    params={{ ownerName, projectName }}
                    search={{ ...searchFor(filterValue, ""), tabId: undefined }}
                    {...LEGACY_LIST_LINK_PROPS}
                  >
                    {t("pullRequest.sent")}
                    <span {...sx.badge}>
                      {pullRequests.acceptedCount} / {pullRequests.sentCount}
                    </span>
                  </Link>
                </li>
              ) : null}
              <li>
                <TwoColumnModeCheckbox
                  checked={useTwoColumnMode}
                  onToggle={(checked) => {
                    localStorage.setItem("useTwoColumnMode", String(checked));
                    if (!checked) {
                      setHighlightedPullRequestId("");
                      setLeftMenuHiddenByTwoColumnMode(false);
                    }
                    setUseTwoColumnMode(checked);
                  }}
                />
              </li>
            </ul>
            <div {...sx.content} data-stylex-owner="project-pullrequests-content">
              <div
                id="list"
                className="row-fluid tab-pane active"
                data-stylex-owner="project-pullrequests-list"
              >
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
                  highlightedPullRequestId={highlightedPullRequestId}
                  titlePrefixRoute={titlePrefixRoute}
                  titlePrefixSearch={(prefix) => searchFor(prefix)}
                  useTwoColumnMode={useTwoColumnMode}
                  onTwoColumnPullRequestTarget={(pullRequestId, href, title) => {
                    applyTwoColumnLocation({
                      highlightedPullRequestId: pullRequestId,
                      href,
                      title,
                    });
                    setHighlightedPullRequestId(pullRequestId);
                    setLeftMenuHiddenByTwoColumnMode(true);
                  }}
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
          const newPullRequestHref = prefixBasePath(
            runtimeConfig.basePath,
            `${projectPath}/newPullRequestForm?fromBranch=${branch.branchName}&toBranch=${branch.defaultBranch}`,
          );
          return (
            <div key={branch.id || branch.branchName}>
              <i className="yobicon-split"></i>
              <span
                {...sx.recentlyPushedBranch}
                data-stylex-owner="project-pullrequests-pushed-branch"
              >
                {`${branch.ownerName}/${branch.projectName}:${branch.shortName} ( ${branch.pushedLabel} )`}
              </span>
              &nbsp;-&nbsp;
              <Link
                to={stripBasePath(runtimeConfig.basePath, newPullRequestHref)}
                {...LEGACY_LIST_LINK_PROPS}
              >
                {t("pullRequest")}
              </Link>
              {/* oxlint-disable jsx-a11y/no-aria-hidden-on-focusable -- legacy close hook keeps aria-hidden. */}
              <button
                type="button"
                className="close"
                aria-hidden="true"
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
  highlightedPullRequestId,
  titlePrefixRoute,
  titlePrefixSearch,
  useTwoColumnMode,
  onTwoColumnPullRequestTarget,
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
  highlightedPullRequestId: string;
  titlePrefixRoute: PullRequestListRouteTarget;
  titlePrefixSearch: (prefix: string) => ProjectPullRequestsSearch;
  useTwoColumnMode: boolean;
  onTwoColumnPullRequestTarget: (pullRequestId: string, href: string, title: string) => void;
}) {
  const { t } = useLegacyMessages();

  if (pullRequests.items.length === 0) {
    return (
      <ul className="post-list-wrap" data-stylex-owner="project-pullrequests-empty">
        <div
          {...sx.errorWrap}
          className={`${sx.errorWrap.className} error-wrap`}
          data-stylex-owner="project-pullrequests-empty-error-wrap"
        >
          <i
            {...sx.errorIcon(`url(${legacySpriteUrl})`)}
            className={`${sx.errorIcon(`url(${legacySpriteUrl})`).className ?? ""} ico ico-err1`.trim()}
            data-stylex-owner="project-pullrequests-empty-icon"
          ></i>
          <p
            {...sx.errorMessage}
            className={sx.errorMessage.className}
            data-stylex-owner="project-pullrequests-empty-message"
          >
            {t("pullRequest.is.empty")}
          </p>
        </div>
      </ul>
    );
  }

  return (
    <ul className="post-list-wrap" data-stylex-owner="project-pullrequests-rows">
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
          highlighted={
            highlightedPullRequestId ===
            stringField(pullRequest.id, String(pullRequest.pullRequestNumber))
          }
          titlePrefixRoute={titlePrefixRoute}
          titlePrefixSearch={titlePrefixSearch}
          useTwoColumnMode={useTwoColumnMode}
          onTwoColumnPullRequestTarget={onTwoColumnPullRequestTarget}
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
  highlighted,
  titlePrefixRoute,
  titlePrefixSearch,
  useTwoColumnMode,
  onTwoColumnPullRequestTarget,
}: {
  basePath: string;
  currentUserLabel: string;
  defaultBranch: string;
  isUsingReviewerCount: boolean;
  ownerName: string;
  pullRequest: PullRequestListItem;
  projectName: string;
  highlighted: boolean;
  titlePrefixRoute: PullRequestListRouteTarget;
  titlePrefixSearch: (prefix: string) => ProjectPullRequestsSearch;
  useTwoColumnMode: boolean;
  onTwoColumnPullRequestTarget: (pullRequestId: string, href: string, title: string) => void;
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
  const reviewProgressBar = sx.reviewProgressBar(`${percent}%`);
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const toBranchClass = pullRequest.toBranch === defaultBranch ? "to-default-branch" : "to-branch";
  const titleParts = splitHeaderWordsInBrackets(pullRequest.title);
  const showReviewerCount = isUsingReviewerCount && pullRequest.reviewerCount > 0;
  const reviewerClass = pullRequest.reviewerNames.includes(currentUserLabel)
    ? "infos-item over"
    : "infos-item";
  const pullRequestId = stringField(pullRequest.id, String(pullRequest.pullRequestNumber));
  const rowStyle = useTwoColumnMode ? sx.rowPointer : undefined;
  const titleHistoryLabel = `${pullRequest.pullRequestNumber} ${titleParts.title}`;
  const handleRowClickCapture = (event: ReactMouseEvent<HTMLLIElement>) => {
    if (!useTwoColumnMode) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".title-prefix")) {
      return;
    }
    const titleTarget = target?.closest(".title-wrap > .title");
    onTwoColumnPullRequestTarget(
      pullRequestId,
      pullRequestHref,
      titleTarget ? titleHistoryLabel : (event.currentTarget.textContent ?? ""),
    );
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <li
      {...rowStyle}
      className={`post-item title${highlighted ? " highlightBg" : ""} ${rowStyle?.className ?? ""}`.trim()}
      onClickCapture={handleRowClickCapture}
      data-stylex-owner="project-pullrequests-row"
    >
      <div className="span10 span-hard-wrap">
        <Link
          to="/$user"
          params={{ user: pullRequest.contributorLoginId }}
          {...LEGACY_LIST_LINK_PROPS}
          className="avatar-wrap mlarge"
          title={pullRequest.contributorLoginId}
        >
          <img src={prefixBasePath(basePath, "/assets/images/default-avatar-32.png")} alt="" />
        </Link>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          {titleParts.prefixes.map((prefix) => (
            <Link
              key={prefix}
              to={titlePrefixRoute}
              params={{ ownerName, projectName }}
              search={titlePrefixSearch(prefix)}
              {...LEGACY_LIST_LINK_PROPS}
              className="title-prefix"
            >
              {prefix}
            </Link>
          ))}
          <Link
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            params={pullRequestParams}
            {...LEGACY_LIST_LINK_PROPS}
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
              {...LEGACY_LIST_LINK_PROPS}
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
          {pullRequest.commentThreadCount > 0 ? (
            <div
              className="infos-item"
              {...sx.reviewProgressItem}
              data-stylex-owner="project-pullrequests-review-progress"
            >
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div
                  {...reviewProgressBar}
                  className={`${reviewProgressBar.className} bar orange`}
                  data-stylex-owner="project-pullrequests-review-progress-fill"
                ></div>
              </div>
              <Link
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                params={pullRequestParams}
                {...LEGACY_LIST_LINK_PROPS}
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span
                  {...sx.grayTextSeparator}
                  data-stylex-owner="project-pullrequests-review-separator"
                >
                  /
                </span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </Link>
            </div>
          ) : null}
          {showReviewerCount ? (
            <div
              className={reviewerClass}
              {...sx.reviewerCount}
              data-stylex-owner="project-pullrequests-reviewer-count"
            >
              <i className="infos-icon yobicon-preview vmiddle"></i>
              <Link
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
                params={pullRequestParams}
                hash="reviewers"
                {...LEGACY_LIST_LINK_PROPS}
                title={pullRequest.reviewerNames.join(", ")}
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
              {...LEGACY_LIST_LINK_PROPS}
              className="avatar-wrap assinee"
              title={pullRequest.receiverLabel}
            >
              <img
                src={prefixBasePath(basePath, "/assets/images/default-avatar-32.png")}
                width="32"
                height="32"
                alt=""
              />
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
    filter: normalizedFilter,
    contributorId: normalizedContributorId,
    pageNum: 1,
  };
}

function stripBasePath(basePath: string, href: string) {
  if (basePath && basePath !== "/" && href.startsWith(basePath)) {
    return href.slice(basePath.length) || "/";
  }
  return href;
}

function TwoColumnModeCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { t } = useLegacyMessages();
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPopoverTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimers();
    showTimerRef.current = setTimeout(() => setIsPopoverVisible(true), 100);
  };
  const hidePopover = () => {
    clearPopoverTimers();
    hideTimerRef.current = setTimeout(() => setIsPopoverVisible(false), 100);
  };

  useEffect(() => clearPopoverTimers, []);
  const twoColumnAnchorStyleProps = sx.twoColumnAnchor;
  const popoverStyle = sx.twoColumnPopover;

  return (
    <div
      {...twoColumnAnchorStyleProps}
      className={`${twoColumnAnchorStyleProps.className ?? ""} two-column-icon mr10 hide-in-mobile`.trim()}
      data-stylex-owner="project-pullrequests-two-column-anchor"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper without aria-label. */}
      <label className="checkbox">
        <div className="two-column-icon-border">
          <input
            id="two-column-mode"
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              onToggle(event.currentTarget.checked);
            }}
          />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div
          role="tooltip"
          {...popoverStyle}
          className={`popover top ${popoverStyle.className}`}
          data-stylex-owner="project-pullrequests-two-column-popover"
        >
          <div className="arrow"></div>
          <h3 className="popover-title">{t("common.two.column.mode")}</h3>
          <div className="popover-content">
            <p>{t("common.two.column.mode.desc")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function applyTwoColumnLocation({
  highlightedPullRequestId,
  href,
  title,
}: {
  highlightedPullRequestId: string;
  href: string;
  title: string;
}) {
  const nextState = {
    ...(history.state as Record<string, unknown> | null),
    startPath: location.pathname,
    yonaPullRequestListHighlightedPullRequestId: highlightedPullRequestId,
  };
  if (!history.state) {
    History.prototype.pushState.call(history, nextState, title, href);
    return;
  }
  History.prototype.replaceState.call(history, nextState, title, href);
}

function projectPullRequestsHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`);
}

function pullRequestListRouteTarget(
  requestType: "closed" | "open" | "sent",
): PullRequestListRouteTarget {
  if (requestType === "closed") {
    return "/$ownerName/$projectName/closedPullRequests";
  }
  if (requestType === "sent") {
    return "/$ownerName/$projectName/sentPullRequests";
  }
  return "/$ownerName/$projectName/pullRequests";
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

function ProjectPullRequestsBrowserTitle({
  isGitProject,
  ownerName,
  projectName,
}: {
  isGitProject: boolean;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const pullRequestMenuTitle = t("menu.pullRequest");
  const badRequestOnlyForGit = t("error.badrequest.only.available.for.git");
  const browserTitle = projectPullRequestsBrowserTitle({
    badRequestOnlyForGit,
    isGitProject,
    ownerName,
    projectName,
    pullRequestMenuTitle,
  });

  return <title>{browserTitle}</title>;
}

function projectPullRequestsBrowserTitle({
  badRequestOnlyForGit,
  isGitProject,
  ownerName,
  projectName,
  pullRequestMenuTitle,
}: {
  badRequestOnlyForGit: string;
  isGitProject: boolean;
  ownerName: string;
  projectName: string;
  pullRequestMenuTitle: string;
}) {
  return isGitProject
    ? `${projectName} - ${pullRequestMenuTitle} - ${ownerName}/${projectName}`
    : badRequestOnlyForGit;
}
