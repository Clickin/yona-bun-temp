import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
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
import { DefaultSearchErrorBody } from "../../-search-screen";
import { SitePagination } from "../../sites/-pagination";
import { ProjectHeader, ProjectMenu } from "../$projectName";

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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectOpenPullRequestsRouteShell
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
          search={search}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectOpenPullRequestsRouteShell({
  ownerName,
  projectName,
  runtimeConfig,
  search,
}: {
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data) {
    return null;
  }

  const isGitProject = stringField(projectQuery.data.vcs, "GIT") === "GIT";
  if (!isGitProject) {
    return (
      <ProjectPullRequestsBadRequestRouteShell
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  return (
    <SiteLayoutShell
      projectSearchScope={{
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }}
      runtimeConfig={runtimeConfig}
    >
      <ProjectPullRequestsScreen
        category="open"
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        requestType="open"
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </SiteLayoutShell>
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
  requestType,
  runtimeConfig,
  search,
}: {
  category: PullRequestListCategory;
  ownerName: string;
  project?: ProjectContainer;
  projectName: string;
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
        <ProjectPullRequestsBrowserTitle
          isGitProject={false}
          ownerName={ownerName}
          projectName={projectName}
        />
        <ProjectPullRequestsBadRequestBody runtimeConfig={runtimeConfig} />
      </>
    );
  }

  if (!pullRequestsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectPullRequestsBrowserTitle
        isGitProject={isGitProject}
        ownerName={ownerName}
        projectName={projectName}
      />
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="pullRequest" basePath={runtimeConfig.basePath} project={project} />
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="row-fluid cb">
          <div
            className="left-menu span2 search-wrap hide-in-mobile"
            style={{ paddingTop: 0, ...(leftMenuHiddenByTwoColumnMode ? { display: "none" } : {}) }}
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
            <ul className="nav nav-tabs nm pullrequeset-tab-menu">
              <li className={requestType === "open" ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/pullRequests"
                  params={{ ownerName, projectName }}
                  search={{ ...searchFor(), tabId: undefined }}
                  {...LEGACY_LIST_LINK_PROPS}
                >
                  {t("pullRequest.state.open")}
                  <span className="num-badge">{pullRequests.openCount}</span>
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
                  <span className="num-badge">{pullRequests.closedCount}</span>
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
                    <span className="num-badge">
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
              <span style={{ marginLeft: 5, fontWeight: "bold" }}>
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
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const toBranchClass = pullRequest.toBranch === defaultBranch ? "to-default-branch" : "to-branch";
  const titleParts = splitHeaderWordsInBrackets(pullRequest.title);
  const showReviewerCount = isUsingReviewerCount && pullRequest.reviewerCount > 0;
  const reviewerClass = pullRequest.reviewerNames.includes(currentUserLabel)
    ? "infos-item over"
    : "infos-item";
  const pullRequestId = stringField(pullRequest.id, String(pullRequest.pullRequestNumber));
  const rowStyle: CSSProperties | undefined = useTwoColumnMode ? { cursor: "pointer" } : undefined;
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
      className={`post-item title${highlighted ? " highlightBg" : ""}`}
      onClickCapture={handleRowClickCapture}
      style={rowStyle}
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
            <div className="infos-item" style={{ marginRight: 10 }}>
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div className="bar orange" style={{ width: `${percent}%` }}></div>
              </div>
              <Link
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                params={pullRequestParams}
                {...LEGACY_LIST_LINK_PROPS}
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

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
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
          className="popover top"
          role="tooltip"
          style={{ display: "block", left: "-75px", top: "-74px" }}
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}
