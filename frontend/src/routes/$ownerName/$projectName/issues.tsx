import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { currentSessionQueryOptions } from "../../../api/session";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import type { ProjectContainer, ProjectMilestone } from "../../../api/types";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { useLegacyMessages } from "../../../i18n";
import { styles } from "./-issues.stylex";

const issueListKeymapStyles = stylex.create({ visible: { display: "block" } });

const projectIssuesStyles = stylex.create({ clickableRow: { cursor: "pointer" } });
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  listProjectIssues,
  listProjectMilestones,
  listProjectIssueSearchUsers,
  massUpdateIssues,
  readSessionBootstrap,
  searchProjectAssignableUsers,
  type ProjectIssueListRestResponse,
  type RestIssueListItem,
} from "../../../auth-workspace-client";

type ProjectIssuesSearch = {
  assigneeId: string;
  authorId: string;
  commenterId: string;
  dueDate: string;
  filter: string;
  labelIds: string[];
  milestoneId: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  state: IssueListState;
};

type IssueListState = "all" | "closed" | "open";

type ProjectAssignableUserOptionSource = {
  avatarUrl?: string;
  displayName?: string;
  loginId?: string;
  pureNameOnly?: string;
  type?: string;
  userId?: string;
};

type ProjectIssueSearchUserOptionSource = {
  avatarUrl?: string;
  displayName?: string;
  loginId?: string;
  pureNameOnly?: string;
  userId?: string;
};

type ProjectIssueSearchUserOption = {
  avatarUrl: string;
  id: string;
  label: string;
  loginId: string;
};

const ISSUE_SEARCH_CURRENT_USER_SHORTCUT_PREFIX = "__currentUserShortcut__:";

type LegacyIssueRowListAttributes = HTMLAttributes<HTMLLIElement> & {
  href: string;
};
type LegacyIssueRowForAttributes = HTMLAttributes<HTMLDivElement> & {
  htmlFor: string;
};
const legacyRouteLocalActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyRouteLocalActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
export const Route = createFileRoute("/$ownerName/$projectName/issues")({
  component: ProjectIssuesRoute,
  validateSearch(search: Record<string, unknown>): ProjectIssuesSearch {
    return {
      assigneeId: stringSearch(search.assigneeId),
      authorId: stringSearch(search.authorId),
      commenterId: stringSearch(search.commenterId),
      dueDate: stringSearch(search.dueDate),
      filter: stringSearch(search.filter),
      labelIds: arraySearch(search.labelIds),
      milestoneId: stringSearch(search.milestoneId),
      orderBy: stringSearch(search.orderBy, "updatedDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
      state: issueListStateSearch(search.state),
    };
  },
});

function ProjectIssuesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectIssuesScreen runtimeConfig={runtimeConfig} />;
}

function ProjectIssuesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const location = useLocation();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const issuesQuery = useQuery({
    queryFn: () =>
      listProjectIssues(runtimeConfig, ownerName, projectName, {
        assigneeId: idSearch(search.assigneeId),
        authorId: idSearch(search.authorId),
        commenterId: idSearch(search.commenterId),
        dueDate: search.dueDate,
        filter: search.filter,
        labelIds: search.labelIds.map((value) => Number(value)),
        milestoneId: idSearch(search.milestoneId),
        orderBy: search.orderBy,
        orderDir: search.orderDir,
        pageNum: search.pageNum,
        state: search.state,
      }),
    queryKey: [
      "project",
      ownerName,
      projectName,
      "issues",
      search.assigneeId,
      search.authorId,
      search.commenterId,
      search.dueDate,
      search.filter,
      search.labelIds.join("\u0000"),
      search.milestoneId,
      search.orderBy,
      search.orderDir,
      search.pageNum,
      search.state,
    ],
  });
  const openMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "open",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "open", "issue-search"],
  });
  const closedMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "closed",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "closed", "issue-search"],
  });
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const assignableUsersQuery = useQuery({
    queryFn: () =>
      searchProjectAssignableUsers(runtimeConfig, {
        ownerName,
        projectName,
        query: "",
      }),
    queryKey: ["project", ownerName, projectName, "assignable-users", "issue-list", ""],
  });
  const issueAuthorsQuery = useQuery({
    queryFn: () =>
      listProjectIssueSearchUsers(runtimeConfig, {
        ownerName,
        projectName,
        role: "author",
      }),
    queryKey: ["project", ownerName, projectName, "issue-search-users", "author"],
  });
  const issueAssigneesQuery = useQuery({
    queryFn: () =>
      listProjectIssueSearchUsers(runtimeConfig, {
        ownerName,
        projectName,
        role: "assignee",
      }),
    queryKey: ["project", ownerName, projectName, "issue-search-users", "assignee"],
  });

  if (
    !projectQuery.data ||
    !sessionQuery.data ||
    !issuesQuery.data ||
    !openMilestonesQuery.data ||
    !closedMilestonesQuery.data ||
    !labelsQuery.data ||
    !assignableUsersQuery.data ||
    !issueAuthorsQuery.data ||
    !issueAssigneesQuery.data
  ) {
    return null;
  }

  return (
    <>
      <link
        rel="stylesheet"
        href={prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/labels.css`,
        )}
        type="text/css"
      />
      <ProjectIssuesBody
        assignableUsers={assignableUsersQuery.data.items}
        currentUserId={stringField(sessionQuery.data.actorId, "0")}
        isAnonymous={Boolean(sessionQuery.data.isAnonymous)}
        currentUserLoginId={stringField(sessionQuery.data.loginId, "")}
        currentSearchString={
          typeof globalThis.location === "undefined"
            ? location.searchStr
            : globalThis.location.search
        }
        issues={issuesQuery.data}
        issueAssignees={issueAssigneesQuery.data.items}
        issueAuthors={issueAuthorsQuery.data.items}
        labels={labelsQuery.data.labels}
        milestones={{
          closed: closedMilestonesQuery.data.milestones,
          open: openMilestonesQuery.data.milestones,
        }}
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectIssuesBody({
  assignableUsers,
  currentUserId,
  currentUserLoginId,
  currentSearchString,
  isAnonymous,
  issues,
  issueAssignees,
  issueAuthors,
  labels,
  milestones,
  ownerName,
  project,
  projectName,
  runtimeConfig,
  search,
}: {
  assignableUsers: ProjectAssignableUserOptionSource[];
  currentUserId: string;
  currentUserLoginId: string;
  currentSearchString: string;
  isAnonymous: boolean;
  issues: ProjectIssueListRestResponse;
  issueAssignees: ProjectIssueSearchUserOptionSource[];
  issueAuthors: ProjectIssueSearchUserOptionSource[];
  labels: Array<Record<string, unknown>>;
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  search: ProjectIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const currentPageItems = issues.items;
  const currentPageHasItems = currentPageItems.length > 0;
  const [showSubtasksAlways, setShowSubtasksAlways] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("showSubtasksAlways") === "true",
  );
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [hoveredTitlePrefix, setHoveredTitlePrefix] = useState("");
  const [issueRowHoverStyle, setIssueRowHoverStyle] = useState<{
    backgroundColor: "#fafafa" | "#fff";
    issueId: string;
  } | null>(null);
  const [revealedChildIssueIds, setRevealedChildIssueIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectedIssueIds, setSelectedIssueIds] = useState<ReadonlySet<string>>(() => new Set());
  const [highlightedIssueId, setHighlightedIssueId] = useState(readTwoColumnHighlightedIssueId);
  const rawDraftItems = shouldShowDraftItems(search) ? (issues.draftItems ?? []) : [];
  const draftItems = rawDraftItems.filter(
    (issue) => stringField(issue.authorLoginId, "") === currentUserLoginId,
  );
  const normalItems = currentPageItems.filter(
    (issue) => !issue.isDraft || stringField(issue.authorLoginId, "") === currentUserLoginId,
  );
  const visibleMassUpdateIssues = useMemo(
    () => [...draftItems, ...normalItems],
    [draftItems, normalItems],
  );
  const visibleMassUpdateIssueIds = useMemo(
    () => visibleMassUpdateIssues.map((issue) => stringField(issue.id, String(issue.issueNumber))),
    [visibleMassUpdateIssues],
  );
  useEffect(() => {
    const visibleIds = new Set(visibleMassUpdateIssueIds);
    setSelectedIssueIds((previousIds) => {
      const nextIds = new Set([...previousIds].filter((issueId) => visibleIds.has(issueId)));
      return nextIds.size === previousIds.size &&
        [...nextIds].every((issueId) => previousIds.has(issueId))
        ? previousIds
        : nextIds;
    });
  }, [visibleMassUpdateIssueIds]);
  const handleSortChange = (orderBy: string, orderDir: string) => {
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        orderBy,
        orderDir,
        pageNum: 1,
      }),
    });
  };
  const handleTitlePrefixSearch = (filter: string) => {
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        filter,
        pageNum: 1,
      }),
    });
  };
  const titlePrefixRoute = (filter: string) =>
    projectIssuesRoutePath(ownerName, projectName, {
      ...search,
      filter,
      pageNum: 1,
    });
  const handlePageChange = (pageNum: number) => {
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        pageNum,
      }),
    });
  };
  const applyTwoColumnLocation = (issueId: string, href: string, title: string) => {
    const nextState = {
      ...(history.state as Record<string, unknown> | null),
      startPath: location.pathname,
      yonaIssueListHighlightedIssueId: issueId,
    };
    if (!history.state) {
      history.pushState(nextState, title, href);
    } else {
      history.replaceState(nextState, title, href);
    }
  };
  const handleTwoColumnIssueTarget = (issueId: string, href: string, title: string) => {
    applyTwoColumnLocation(issueId, href, title);
    setHighlightedIssueId(issueId);
  };
  const handleIssueLabelSearch = (labelId: string) => {
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        labelIds: [...search.labelIds, labelId],
        pageNum: 1,
      }),
    });
  };
  const revealChildIssueList = (issueId: string) => {
    setRevealedChildIssueIds((previousIds) => {
      if (previousIds.has(issueId)) {
        return previousIds;
      }
      const nextIds = new Set(previousIds);
      nextIds.add(issueId);
      return nextIds;
    });
  };
  const toggleIssueSelection = (issueId: string, checked: boolean) => {
    setSelectedIssueIds((previousIds) => {
      const nextIds = new Set(previousIds);
      if (checked) {
        nextIds.add(issueId);
      } else {
        nextIds.delete(issueId);
      }
      return nextIds;
    });
  };
  const toggleAllIssueSelection = (checked: boolean) => {
    setSelectedIssueIds(checked ? new Set(visibleMassUpdateIssueIds) : new Set());
  };
  const showMilestone = projectMilestoneMenuEnabled(project);
  const showMassUpdateControls = projectMemberControlsEnabled(project);
  const allVisibleIssuesSelected =
    visibleMassUpdateIssueIds.length > 0 &&
    visibleMassUpdateIssueIds.every((issueId) => selectedIssueIds.has(issueId));
  const handleIssueListKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.key.toLowerCase() !== "a" ||
      (!event.ctrlKey && !event.metaKey) ||
      event.altKey ||
      !showMassUpdateControls ||
      !currentPageHasItems
    ) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable]")) {
      return;
    }

    event.preventDefault();
    toggleAllIssueSelection(!allVisibleIssuesSelected);
  };
  const showAssigneeCurrentUserSearchOption = projectMemberSearchOptionsEnabled(project);
  const showAuthorCurrentUserSearchOption = projectAuthorSearchOptionsEnabled(
    project,
    assignableUsers,
    currentUserId,
  );
  const showLabelManagement = projectIssueLabelCreatable(project);
  const showLabelEdit = projectManagerControlsEnabled(project);

  return (
    <div className="page-wrap-outer" data-stylex-owner="project-issues-page">
      <div className="project-page-wrap" data-stylex-owner="project-issues-list">
        <div className="row-fluid issue-list-wrap" onKeyDownCapture={handleIssueListKeyDownCapture}>
          <div className="left-menu span2 span-hard-wrap">
            <QuickSearch
              currentUserId={currentUserId}
              isAnonymous={isAnonymous}
              issues={issues}
              onQuickSearch={(nextSearch) => {
                void navigate({
                  to: projectIssuesRoutePath(ownerName, projectName, nextSearch),
                });
              }}
              search={search}
              state={search.state}
            />
            <IssueSearchForm
              basePath={runtimeConfig.basePath}
              currentUserId={currentUserId}
              issueAssignees={issueAssignees}
              issueAuthors={issueAuthors}
              issues={currentPageItems}
              isAnonymous={isAnonymous}
              labels={labels}
              milestones={milestones}
              ownerName={ownerName}
              projectName={projectName}
              search={search}
              showAssigneeCurrentUserOption={showAssigneeCurrentUserSearchOption}
              showAuthorCurrentUserOption={showAuthorCurrentUserSearchOption}
              onSearchSubmit={(nextSearch) => {
                void navigate({
                  to: projectIssuesRoutePath(ownerName, projectName, nextSearch),
                });
              }}
              labelControls={{
                showEditLink: showLabelEdit,
                showManageLink: showLabelManagement,
              }}
            />
          </div>
          <div
            className={`${stylex.props(styles.results).className} span10 span-hard-wrap`}
            id="span10"
            data-stylex-owner="project-issues-results"
          >
            <div
              {...stylex.props(styles.newIssueAction)}
              data-stylex-owner="project-issues-new-issue-action"
            >
              <Link
                activeProps={legacyRouteLocalActiveProps}
                to="/$ownerName/$projectName/issueform"
                params={{ ownerName, projectName }}
                search={{ commentId: undefined, parentIssueId: undefined }}
                className="ybtn ybtn-success"
              >
                {t("issue.menu.new")}
              </Link>
            </div>
            <ul className="nav nav-tabs nm">
              <StateTab
                active={search.state === "open"}
                count={countField(issues, "openIssueCount")}
                label={t("issue.state.open")}
                to={projectIssuesRoutePath(ownerName, projectName, {
                  ...search,
                  pageNum: 1,
                  state: "open",
                })}
              />
              <StateTab
                active={search.state === "closed"}
                count={countField(issues, "closedIssueCount")}
                label={t("issue.state.closed")}
                to={projectIssuesRoutePath(ownerName, projectName, {
                  ...search,
                  pageNum: 1,
                  state: "closed",
                })}
              />
              <li>
                <TwoColumnModeCheckbox
                  checked={useTwoColumnMode}
                  onToggle={(checked) => {
                    localStorage.setItem("useTwoColumnMode", String(checked));
                    if (!checked) {
                      setHighlightedIssueId("");
                    }
                    setUseTwoColumnMode(checked);
                  }}
                />
              </li>
              <li className="show-subtasks-li">
                <ShowSubtasksCheckbox
                  checked={showSubtasksAlways}
                  onToggle={(checked) => {
                    localStorage.setItem("showSubtasksAlways", String(checked));
                    if (!checked) {
                      setRevealedChildIssueIds(new Set());
                    }
                    setShowSubtasksAlways(checked);
                  }}
                />
              </li>
            </ul>
            {!currentPageHasItems ? (
              <>
                <div
                  {...stylex.props(styles.errorWrap)}
                  className={`${stylex.props(styles.errorWrap).className} error-wrap`}
                  data-stylex-owner="project-issues-empty-error-wrap"
                >
                  <i
                    {...stylex.props(styles.errorIcon, styles.errorIconSprite(legacySpriteUrl))}
                    className={`${stylex.props(styles.errorIcon, styles.errorIconSprite(legacySpriteUrl)).className ?? ""} ico ico-err1`.trim()}
                    data-stylex-owner="project-issues-empty-error-icon"
                  ></i>
                  <p
                    {...stylex.props(styles.errorMessage)}
                    data-stylex-owner="project-issues-empty-error-message"
                  >
                    {t("issue.is.empty")}
                  </p>
                </div>
                <IssueListKeymap project={project} />
              </>
            ) : (
              <>
                <div className="filter-wrap board">
                  {showMassUpdateControls ? (
                    <MassUpdateToolbar
                      assignableUsers={assignableUsers}
                      currentUserId={currentUserId}
                      issues={visibleMassUpdateIssues}
                      labels={labels}
                      milestones={milestones.open}
                      ownerName={ownerName}
                      projectName={projectName}
                      runtimeConfig={runtimeConfig}
                      selectedIssueIds={selectedIssueIds}
                      showMilestone={showMilestone}
                      visibleIssueIds={visibleMassUpdateIssueIds}
                      onSelectAllIssues={toggleAllIssueSelection}
                    />
                  ) : null}
                  {issues.items.length > 1 ? (
                    <IssueFilters
                      onSortChange={handleSortChange}
                      orderBy={search.orderBy}
                      orderDir={search.orderDir}
                    />
                  ) : null}
                </div>
                {rawDraftItems.length > 0 ? (
                  <ul className="post-list-wrap row-fluid">
                    {draftItems.map((issue) => (
                      <ProjectIssueItem
                        basePath={runtimeConfig.basePath}
                        childIssueListRevealed={revealedChildIssueIds.has(
                          stringField(issue.id, String(issue.issueNumber)),
                        )}
                        currentUserLoginId={currentUserLoginId}
                        draftNumberSource="draft-list"
                        highlighted={
                          highlightedIssueId === stringField(issue.id, String(issue.issueNumber))
                        }
                        issue={issue}
                        issueSelected={selectedIssueIds.has(
                          stringField(issue.id, String(issue.issueNumber)),
                        )}
                        key={`draft-${issue.id || issue.issueNumber}`}
                        ownerName={ownerName}
                        projectName={projectName}
                        onIssueSelectedChange={toggleIssueSelection}
                        showMassUpdateControls={showMassUpdateControls}
                        showMilestone={showMilestone}
                        showSubtasksAlways={showSubtasksAlways}
                        hoveredTitlePrefix={hoveredTitlePrefix}
                        issueRowHoverStyle={issueRowHoverStyle}
                        onTitlePrefixHover={setHoveredTitlePrefix}
                        onIssueRowHover={setIssueRowHoverStyle}
                        onIssueLabelSearch={handleIssueLabelSearch}
                        useTwoColumnMode={useTwoColumnMode}
                        onTwoColumnIssueTarget={handleTwoColumnIssueTarget}
                        titlePrefixRoute={titlePrefixRoute}
                        onTitlePrefixSearch={handleTitlePrefixSearch}
                        onRevealChildIssueList={revealChildIssueList}
                      />
                    ))}
                  </ul>
                ) : null}
                <ul className="post-list-wrap row-fluid">
                  {normalItems.map((issue) => (
                    <ProjectIssueItem
                      basePath={runtimeConfig.basePath}
                      childIssueListRevealed={revealedChildIssueIds.has(
                        stringField(issue.id, String(issue.issueNumber)),
                      )}
                      currentUserLoginId={currentUserLoginId}
                      draftNumberSource="normal-list"
                      highlighted={
                        highlightedIssueId === stringField(issue.id, String(issue.issueNumber))
                      }
                      issue={issue}
                      issueSelected={selectedIssueIds.has(
                        stringField(issue.id, String(issue.issueNumber)),
                      )}
                      key={issue.id || issue.issueNumber}
                      ownerName={ownerName}
                      projectName={projectName}
                      onIssueSelectedChange={toggleIssueSelection}
                      showMassUpdateControls={showMassUpdateControls}
                      showMilestone={showMilestone}
                      showSubtasksAlways={showSubtasksAlways}
                      hoveredTitlePrefix={hoveredTitlePrefix}
                      issueRowHoverStyle={issueRowHoverStyle}
                      onTitlePrefixHover={setHoveredTitlePrefix}
                      onIssueRowHover={setIssueRowHoverStyle}
                      onIssueLabelSearch={handleIssueLabelSearch}
                      useTwoColumnMode={useTwoColumnMode}
                      onTwoColumnIssueTarget={handleTwoColumnIssueTarget}
                      titlePrefixRoute={titlePrefixRoute}
                      onTitlePrefixSearch={handleTitlePrefixSearch}
                      onRevealChildIssueList={revealChildIssueList}
                    />
                  ))}
                </ul>
                <div
                  {...stylex.props(styles.downloadWrap)}
                  data-stylex-owner="project-issues-excel-download"
                >
                  <Link
                    activeProps={{ className: "ybtn small" }}
                    to={excelHref("", ownerName, projectName, currentSearchString)}
                    href={excelHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      currentSearchString,
                    )}
                    reloadDocument
                    className="ybtn small"
                  >
                    <i className="yobicon-file-excel"></i> {t("issue.downloadAsExcel")}
                  </Link>
                </div>
                <IssueListKeymap project={project} />
                <IssuePagination
                  currentPage={search.pageNum}
                  ownerName={ownerName}
                  projectName={projectName}
                  search={search}
                  totalPages={totalPages(issues)}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssuePagination({
  currentPage,
  ownerName,
  projectName,
  search,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  ownerName: string;
  projectName: string;
  search: ProjectIssuesSearch;
  totalPages: number;
  onPageChange: (pageNum: number) => void;
}) {
  const { t } = useLegacyMessages();
  if (totalPages <= 0) {
    return <div id="pagination" data-total={totalPages}></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageRoutePath = (pageNum: number) =>
    projectIssuesRoutePath(ownerName, projectName, {
      ...search,
      pageNum,
    });
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    onPageChange(value);
  };

  return (
    <div
      id="pagination"
      className={`${stylex.props(styles.paginationWrap).className} page-navigation-wrap`}
      data-stylex-owner="project-issues-pagination"
      data-total={totalPages}
    >
      <ul
        className={`${stylex.props(styles.paginationPageNums).className} page-nums`}
        data-stylex-owner="project-issues-pagination-page-nums"
      >
        <li
          className={`${stylex.props(styles.paginationPageNum, styles.paginationIconPageNum).className} page-num ikon`}
          data-stylex-owner="project-issues-pagination-prev-page"
        >
          {hasPrev ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              to={pageRoutePath(currentPage - 1)}
            >
              <i
                className={`${stylex.props(styles.paginationIcon(legacySpriteUrl), styles.paginationPrev).className} ico btn-pg-prev`}
                data-stylex-owner="project-issues-pagination-prev-icon"
              ></i>
              <span
                className={stylex.props(styles.paginationIconLabel).className}
                data-stylex-owner="project-issues-pagination-prev-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                className={`${stylex.props(styles.paginationIcon(legacySpriteUrl), styles.paginationPrev, styles.paginationPrevOff).className} ico btn-pg-prev off`}
                data-stylex-owner="project-issues-pagination-prev-icon"
              ></i>
              <span
                className={`${stylex.props(styles.paginationIconLabelOff).className} off`}
                data-stylex-owner="project-issues-pagination-prev-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          className={`${stylex.props(styles.paginationPageNum).className} page-num`}
          data-stylex-owner="project-issues-pagination-input-page"
        >
          <input
            className={`${stylex.props(styles.paginationInput, styles.paginationNoSpinner).className} input-mini nospinner`}
            defaultValue={currentPage}
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
            data-stylex-owner="project-issues-pagination-input"
          />
        </li>
        <li
          className={`${stylex.props(styles.paginationPageNum, styles.paginationDelimiter).className} page-num delimiter`}
          data-stylex-owner="project-issues-pagination-delimiter"
        >
          /
        </li>
        <li
          className={`${stylex.props(styles.paginationPageNum).className} page-num`}
          data-stylex-owner="project-issues-pagination-total"
        >
          {totalPages}
        </li>
        <li
          className={`${stylex.props(styles.paginationPageNum, styles.paginationIconPageNum).className} page-num ikon`}
          data-stylex-owner="project-issues-pagination-next-page"
        >
          {hasNext ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              to={pageRoutePath(currentPage + 1)}
            >
              <span
                className={stylex.props(styles.paginationIconLabel).className}
                data-stylex-owner="project-issues-pagination-next-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                className={`${stylex.props(styles.paginationIcon(legacySpriteUrl), styles.paginationNext).className} ico btn-pg-next`}
                data-stylex-owner="project-issues-pagination-next-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span
                className={`${stylex.props(styles.paginationIconLabelOff).className} off`}
                data-stylex-owner="project-issues-pagination-next-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                className={`${stylex.props(styles.paginationIcon(legacySpriteUrl), styles.paginationNext, styles.paginationNextOff).className} ico btn-pg-next off`}
                data-stylex-owner="project-issues-pagination-next-icon"
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function IssueFilters({
  onSortChange,
  orderBy,
  orderDir,
}: {
  onSortChange: (orderBy: string, orderDir: string) => void;
  orderBy: string;
  orderDir: string;
}) {
  const { t } = useLegacyMessages();
  const filters = [
    { field: "dueDate", label: t("common.order.dueDate") },
    { field: "updatedDate", label: t("common.order.updatedDate") },
    { field: "createdDate", label: t("common.order.date") },
    { field: "numOfComments", label: t("common.order.comments") },
  ];

  return (
    <div
      {...stylex.props(styles.sortFilters)}
      className={`${stylex.props(styles.sortFilters).className} filters`}
      data-stylex-owner="project-issues-sort-filters"
    >
      {filters.map((filter) => {
        const active = orderBy === filter.field;
        return (
          <IssueSortFilter
            active={active}
            field={filter.field}
            key={filter.field}
            label={filter.label}
            onSortChange={onSortChange}
            orderDir={active && orderDir === "desc" ? "asc" : "desc"}
          >
            <i className={`ico btn-gray-arrow${!active || orderDir === "desc" ? " down" : ""}`}></i>
          </IssueSortFilter>
        );
      })}
    </div>
  );
}

function IssueSortFilter({
  active,
  children,
  field,
  label,
  onSortChange,
  orderDir,
}: {
  active: boolean;
  children: ReactNode;
  field: string;
  label: string;
  onSortChange: (orderBy: string, orderDir: string) => void;
  orderDir: string;
}) {
  const selectIssueSortFilter = (event: ReactMouseEvent) => {
    event.preventDefault();
    onSortChange(field, orderDir);
  };

  return (
    <button
      type="button"
      className={active ? "filter active" : "filter"}
      onClick={selectIssueSortFilter}
    >
      {children}
      {label}
    </button>
  );
}

function shouldShowDraftItems(search: ProjectIssuesSearch) {
  return (
    search.state !== "closed" &&
    search.pageNum === 1 &&
    !search.assigneeId &&
    !search.authorId &&
    !search.commenterId &&
    !search.dueDate &&
    !search.filter &&
    search.labelIds.length === 0 &&
    !search.milestoneId
  );
}

function MassUpdateToolbar({
  assignableUsers,
  currentUserId,
  issues,
  labels: projectLabels,
  milestones: openMilestones,
  ownerName,
  projectName,
  runtimeConfig,
  selectedIssueIds,
  showMilestone,
  visibleIssueIds,
  onSelectAllIssues,
}: {
  assignableUsers: ProjectAssignableUserOptionSource[];
  currentUserId: string;
  issues: RestIssueListItem[];
  labels: Array<Record<string, unknown>>;
  milestones: ProjectMilestone[];
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedIssueIds: ReadonlySet<string>;
  showMilestone: boolean;
  visibleIssueIds: string[];
  onSelectAllIssues: (checked: boolean) => void;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const milestones = projectMilestoneOptions(openMilestones);
  const labels = projectIssueLabelOptions(projectLabels, issues);
  const users = projectAssignableUserOptions(assignableUsers, issues, currentUserId);
  const selectedIssues = issues.filter((issue) =>
    selectedIssueIds.has(stringField(issue.id, String(issue.issueNumber))),
  );
  const massUpdateWrapRef = useRef<HTMLDivElement>(null);
  const selectedIssueCount = selectedIssues.length;
  const hasSelectedIssues = selectedIssueCount > 0;
  const [massUpdateAffixed, setMassUpdateAffixed] = useState(false);
  const [openMassUpdateDropdown, setOpenMassUpdateDropdown] = useState<string | null>(null);
  const allVisibleIssuesSelected =
    visibleIssueIds.length > 0 && visibleIssueIds.every((issueId) => selectedIssueIds.has(issueId));
  const selectedLabelCounts = countSelectedIssueLabels(selectedIssues);
  const selectedLabels = uniqueLabels(selectedIssues);
  const attachHiddenLabelIds = hiddenLabelIdsForSelectedIssueCount(
    selectedLabelCounts,
    hasSelectedIssues ? selectedIssueCount : 0,
  );
  const detachDisabled = !hasSelectedIssues || selectedLabels.length === 0;
  const massUpdateAction = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/issues`,
  );
  const { mutate: mutateMassUpdate } = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return massUpdateIssues(runtimeConfig, csrfToken, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "issues"],
      });
    },
  });
  useEffect(() => {
    if (!hasSelectedIssues) {
      setOpenMassUpdateDropdown(null);
    }
  }, [hasSelectedIssues]);
  useEffect(() => {
    const wrap = massUpdateWrapRef.current;
    const affixAnchor = wrap?.parentElement;
    if (!wrap || !affixAnchor || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          setMassUpdateAffixed(false);
          return;
        }
        setMassUpdateAffixed(entry.intersectionRatio < 1);
      },
      {
        root: null,
        rootMargin: "-15px 0px 0px 0px",
        threshold: [1],
      },
    );
    observer.observe(affixAnchor);
    return () => {
      observer.disconnect();
      setMassUpdateAffixed(false);
    };
  }, []);

  useEffect(() => {
    if (!massUpdateAffixed) {
      return;
    }
    const wrap = massUpdateWrapRef.current;
    if (!wrap) {
      setMassUpdateAffixed(false);
      return;
    }
    const affixAnchor = wrap.parentElement;
    if (!affixAnchor) {
      setMassUpdateAffixed(false);
      return;
    }
    const anchorTop = affixAnchor.getBoundingClientRect().top;
    if (anchorTop >= 15) {
      setMassUpdateAffixed(false);
    }
  }, [massUpdateAffixed, selectedIssueIds]);
  const toggleMassUpdateDropdown = (dropdownId: string) => {
    if (!hasSelectedIssues) {
      return;
    }
    setOpenMassUpdateDropdown((currentDropdownId) =>
      currentDropdownId === dropdownId ? null : dropdownId,
    );
  };
  const submitMassUpdate = (name: string, value: string) => {
    setOpenMassUpdateDropdown(null);
    if (!hasSelectedIssues) {
      return;
    }

    const issueNumbers: number[] = [];
    for (const issue of selectedIssues) {
      const issueNumber = Number(stringField(issue.issueNumber, "0"));
      if (issueNumber > 0) {
        issueNumbers.push(issueNumber);
      }
    }
    if (issueNumbers.length === 0) {
      return;
    }

    const userLoginById = new Map(users.map((user) => [user.id, user.loginId]));
    const input: Record<string, unknown> = { issueNumbers, ownerName, projectName };
    switch (name) {
      case "state":
        input.state = value;
        break;
      case "assignee.id":
        input.assigneeUpdate = true;
        input.assigneeLoginId = userLoginById.get(value) ?? "";
        break;
      case "milestone.id":
        input.milestoneUpdate = true;
        input.milestoneId = value === "-1" ? 0 : Number(value);
        break;
      case "attachingLabelIds": {
        const attachingLabel = labels.find((label) => label.id === value);
        input.addLabelIds = [Number(value)];
        if (attachingLabel?.categoryIsExclusive) {
          const exclusiveDetachLabelIds: number[] = [];
          for (const label of selectedLabels) {
            if (
              label.id !== value &&
              label.categoryId === attachingLabel.categoryId &&
              label.categoryIsExclusive
            ) {
              exclusiveDetachLabelIds.push(Number(label.id));
            }
          }
          if (exclusiveDetachLabelIds.length > 0) {
            input.removeLabelIds = exclusiveDetachLabelIds;
          }
        }
        break;
      }
      case "detachingLabelIds":
        input.removeLabelIds = [Number(value)];
        break;
      default:
        return;
    }
    mutateMassUpdate(input);
  };
  const handleMassUpdateOptionClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    name: string,
    value: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    submitMassUpdate(name, value);
  };

  return (
    <div
      ref={massUpdateWrapRef}
      className={
        massUpdateAffixed
          ? "mass-update-wrap hide-in-mobile affix"
          : "mass-update-wrap hide-in-mobile"
      }
    >
      <form
        id="mass-update-form"
        className={`${stylex.props(styles.massUpdateForm).className} mass-update-form`}
        action={massUpdateAction}
        method="post"
        onSubmit={(event) => event.preventDefault()}
        data-stylex-owner="project-issues-mass-update-form"
      >
        <div className="btn-group check-all">
          {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update wraps this checkbox in a label. */}
          <label htmlFor="check-all">
            <input
              type="checkbox"
              id="check-all"
              checked={allVisibleIssuesSelected}
              onChange={(event) => onSelectAllIssues(event.currentTarget.checked)}
            />
          </label>
        </div>
        <MassUpdateDropdown
          disabled={!hasSelectedIssues}
          id="state"
          label={t("issue.update.state")}
          name="state"
          options={[
            { label: t("issue.state.open"), value: "OPEN" },
            { label: t("issue.state.closed"), value: "CLOSED" },
          ]}
          isOpen={openMassUpdateDropdown === "state"}
          onSelect={submitMassUpdate}
          onToggle={toggleMassUpdateDropdown}
        />
        <div
          id="assignee"
          className={massUpdateDropdownGroupClassName(openMassUpdateDropdown === "assignee")}
          data-name="assignee.id"
        >
          <button
            className="btn dropdown-toggle medium"
            disabled={!hasSelectedIssues}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleMassUpdateDropdown("assignee");
            }}
          >
            <span className="d-label">{t("issue.update.assignee.id")}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu mass-update-list">
            <li data-value="0">
              <button
                type="button"
                {...stylex.props(styles.massUpdateOptionButton)}
                onClick={(event) => handleMassUpdateOptionClick(event, "assignee.id", "0")}
              >
                {t("issue.noAssignee")}
              </button>
            </li>
            <li data-value={currentUserId}>
              <button
                type="button"
                {...stylex.props(styles.massUpdateOptionButton)}
                onClick={(event) =>
                  handleMassUpdateOptionClick(event, "assignee.id", currentUserId)
                }
              >
                {t("issue.assignToMe")}
              </button>
            </li>
            {users.length ? <li className="divider"></li> : null}
            {users.map((user) => (
              <li data-value={user.id} key={user.id}>
                <button
                  type="button"
                  className="usf-group"
                  {...stylex.props(styles.massUpdateOptionButton)}
                  onClick={(event) => handleMassUpdateOptionClick(event, "assignee.id", user.id)}
                >
                  <span className="avatar-wrap smaller">
                    <img
                      src={mountedAppLocalUrl(runtimeConfig.basePath, user.avatarUrl)}
                      width="20"
                      height="20"
                      alt=""
                    />
                  </span>
                  <strong className="name">{user.label}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {user.loginId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {showMilestone && milestones.length ? (
          <MassUpdateDropdown
            disabled={!hasSelectedIssues}
            id="milestone"
            label={t("issue.update.milestone.id")}
            name="milestone.id"
            options={[
              { label: t("issue.noMilestone"), value: "-1" },
              { divider: true, value: "__divider" },
              ...milestones.map((milestone) => ({
                label: milestone.title,
                value: milestone.id,
              })),
            ]}
            isOpen={openMassUpdateDropdown === "milestone"}
            onSelect={submitMassUpdate}
            onToggle={toggleMassUpdateDropdown}
          />
        ) : null}
        {labels.length ? (
          <>
            <LabelMassUpdateDropdown
              disabled={!hasSelectedIssues}
              hiddenLabelIds={attachHiddenLabelIds}
              id="attaching-label"
              label={t("issue.update.attachLabel")}
              listId="attach-label-list"
              name="attachingLabelIds"
              options={labels}
              isOpen={openMassUpdateDropdown === "attaching-label"}
              onSelect={submitMassUpdate}
              onToggle={toggleMassUpdateDropdown}
            />
            <LabelMassUpdateDropdown
              disabled={detachDisabled}
              id="detaching-label"
              label={t("issue.update.detachLabel")}
              listId="delete-label-list"
              name="detachingLabelIds"
              options={hasSelectedIssues ? selectedLabels : labels}
              isOpen={openMassUpdateDropdown === "detaching-label"}
              onSelect={submitMassUpdate}
              onToggle={toggleMassUpdateDropdown}
            />
          </>
        ) : null}
      </form>
    </div>
  );
}

function MassUpdateDropdown({
  disabled,
  id,
  isOpen,
  label,
  name,
  onSelect,
  onToggle,
  options,
}: {
  disabled: boolean;
  id: string;
  isOpen: boolean;
  label: string;
  name: string;
  onSelect: (name: string, value: string) => void;
  onToggle: (id: string) => void;
  options: Array<{ divider?: boolean; label?: string; value: string }>;
}) {
  const handleMassUpdateOptionClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    value: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(name, value);
  };
  return (
    <div id={id} className={massUpdateDropdownGroupClassName(isOpen)} data-name={name}>
      <button
        className="btn dropdown-toggle medium"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(id);
        }}
      >
        <span className="d-label">{label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul className="dropdown-menu mass-update-list">
        {options.map((option) =>
          option.divider ? (
            <li className="divider" key={option.value}></li>
          ) : (
            <li data-value={option.value} key={option.value}>
              <button
                type="button"
                {...stylex.props(styles.massUpdateOptionButton)}
                onClick={(event) => handleMassUpdateOptionClick(event, option.value)}
              >
                {option.label}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function LabelMassUpdateDropdown({
  disabled,
  hiddenLabelIds,
  id,
  isOpen,
  label,
  listId,
  name,
  onSelect,
  onToggle,
  options,
}: {
  disabled: boolean;
  hiddenLabelIds?: ReadonlySet<string>;
  id: string;
  isOpen: boolean;
  label: string;
  listId: string;
  name: string;
  onSelect: (name: string, value: string) => void;
  onToggle: (id: string) => void;
  options: Array<{
    categoryIsExclusive?: boolean;
    categoryId: string;
    categoryName: string;
    color?: string;
    id: string;
    name: string;
  }>;
}) {
  return (
    <div id={id} className={massUpdateDropdownGroupClassName(isOpen)} data-name={name}>
      <button
        className="btn dropdown-toggle medium"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(id);
        }}
      >
        <span className="d-label">{label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul id={listId} className="dropdown-menu mass-update-list">
        {groupLabels(options).map((group) => (
          <LabelMassUpdateGroup
            group={group}
            hiddenLabelIds={hiddenLabelIds}
            key={group.categoryId}
            name={name}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

function LabelMassUpdateGroup({
  group,
  hiddenLabelIds,
  name,
  onSelect,
}: {
  group: {
    categoryId: string;
    categoryName: string;
    labels: Array<{ categoryIsExclusive?: boolean; color?: string; id: string; name: string }>;
  };
  hiddenLabelIds?: ReadonlySet<string>;
  name: string;
  onSelect: (name: string, value: string) => void;
}) {
  const categoryHidden =
    group.labels.length > 0 && group.labels.every((label) => hiddenLabelIds?.has(label.id));
  const handleMassUpdateOptionClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    value: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(name, value);
  };
  return (
    <>
      <li className="disabled" data-category={group.categoryId} hidden={categoryHidden}>
        <span>{group.categoryName}</span>
      </li>
      {group.labels.map((label) => (
        <li
          data-value={label.id}
          data-category={group.categoryId}
          hidden={hiddenLabelIds?.has(label.id)}
          key={label.id}
        >
          <button
            type="button"
            {...stylex.props(styles.massUpdateOptionButton)}
            onClick={(event) => handleMassUpdateOptionClick(event, label.id)}
          >
            <span className="issue-label active list-label" data-label-id={label.id}>
              {label.name}
            </span>
          </button>
        </li>
      ))}
      <li className="divider" data-category={group.categoryId} hidden={categoryHidden}></li>
    </>
  );
}

function massUpdateDropdownGroupClassName(isOpen: boolean) {
  return isOpen ? "btn-group open" : "btn-group";
}

function ProjectIssueItem({
  basePath,
  childIssueListRevealed,
  currentUserLoginId,
  draftNumberSource,
  highlighted,
  hoveredTitlePrefix,
  issue,
  issueSelected,
  issueRowHoverStyle,
  onIssueLabelSearch,
  onIssueRowHover,
  onIssueSelectedChange,
  onRevealChildIssueList,
  onTitlePrefixHover,
  onTitlePrefixSearch,
  onTwoColumnIssueTarget,
  ownerName,
  projectName,
  showMassUpdateControls,
  showMilestone,
  showSubtasksAlways,
  titlePrefixRoute,
  useTwoColumnMode,
}: {
  basePath: string;
  childIssueListRevealed: boolean;
  currentUserLoginId: string;
  draftNumberSource: "draft-list" | "normal-list";
  highlighted: boolean;
  hoveredTitlePrefix: string;
  issue: RestIssueListItem;
  issueSelected: boolean;
  issueRowHoverStyle: {
    backgroundColor: "#fafafa" | "#fff";
    issueId: string;
  } | null;
  onIssueRowHover: (
    style: {
      backgroundColor: "#fafafa" | "#fff";
      issueId: string;
    } | null,
  ) => void;
  onIssueLabelSearch: (labelId: string) => void;
  onIssueSelectedChange: (issueId: string, checked: boolean) => void;
  onRevealChildIssueList: (issueId: string) => void;
  onTitlePrefixHover: (prefix: string) => void;
  onTitlePrefixSearch: (filter: string) => void;
  onTwoColumnIssueTarget: (issueId: string, href: string, title: string) => void;
  ownerName: string;
  projectName: string;
  showMassUpdateControls: boolean;
  showMilestone: boolean;
  showSubtasksAlways: boolean;
  titlePrefixRoute: (filter: string) => string;
  useTwoColumnMode: boolean;
}) {
  const { t } = useLegacyMessages();
  const issueId = stringField(issue.id, String(issue.issueNumber));
  const issueNumber = stringField(issue.issueNumber, issueId);
  const issueParams = { issueNumber, ownerName, projectName };
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const authorLoginId = stringField(issue.authorLoginId, "");
  const assigneeLabel = stringField(issue.assigneeLabel, "");
  const assigneeLoginId = stringField(issue.assigneeLoginId, "");
  const createdLabel = stringField(issue.createdLabel, stringField(issue.updatedLabel, ""));
  const issueWeight = issue.weight ?? 0;
  const issueLabels = sortedIssueLabels(issue);
  const titleParts = splitHeaderWordsInBrackets(issue.title);
  const issueListItemLegacyAttrs = { href: issueHref } satisfies LegacyIssueRowListAttributes;
  const currentIssueRowHoverStyle =
    issueRowHoverStyle?.issueId === issueId ? issueRowHoverStyle : null;
  const issueRowLegacyForAttrs = {
    htmlFor: `issue-${issueId}`,
  } satisfies LegacyIssueRowForAttributes;
  const dueDateAttrs =
    issue.state === "open"
      ? {
          title: issue.dueDateLabel,
        }
      : {};
  const dueDateStyleProps = stylex.props(
    styles.dueDateWrapper,
    issue.state === "closed" ? styles.dueDateClosed : undefined,
  );
  const childIssueListVisible = showSubtasksAlways || childIssueListRevealed;
  const revealChildIssueListFromRow = (target: Element | null) => {
    if (target?.closest(".mass-update-check") || target?.closest(".title-wrap > .title")) {
      return;
    }
    onRevealChildIssueList(issueId);
  };
  const titleHistoryLabel = `${issueNumber} ${titleParts.title}`;
  const handleTitleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (useTwoColumnMode) {
      onTwoColumnIssueTarget(issueId, issueHref, titleHistoryLabel);
      event.preventDefault();
    }
  };
  const handleIssueLabelClick = (event: ReactMouseEvent<HTMLElement>, labelId: string) => {
    event.preventDefault();
    event.stopPropagation();
    onIssueLabelSearch(labelId);
  };
  const handleTitleWrapClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".title")) {
      handleTitleClick(event);
    }
  };
  const handleIssueItemClick = (event: ReactMouseEvent<HTMLLIElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    revealChildIssueListFromRow(target);
    if (!target?.closest(".mass-update-check") && !target?.closest(".title-wrap > .title")) {
      if (useTwoColumnMode) {
        onTwoColumnIssueTarget(issueId, issueHref, event.currentTarget.textContent ?? "");
        event.preventDefault();
      }
    }
  };
  const handleIssueItemClickCapture = (event: ReactMouseEvent<HTMLLIElement>) => {
    if (!useTwoColumnMode) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(".mass-update-check") ||
      target?.closest(".issue-label") ||
      target?.closest(".title-wrap > .title")
    ) {
      return;
    }
    onTwoColumnIssueTarget(issueId, issueHref, event.currentTarget.textContent ?? "");
    event.preventDefault();
    event.stopPropagation();
  };
  const handleIssueItemKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    revealChildIssueListFromRow(event.target instanceof Element ? event.target : null);
  };

  const issuePostItemClassName = [
    `post-item title${issueSelected ? " active" : ""}${highlighted ? " highlightBg" : ""}`,
    stylex.props(styles.issuePostItem, issueSelected ? styles.issuePostItemActive : undefined)
      .className,
    currentIssueRowHoverStyle
      ? stylex.props(styles.issueRowHoverBackground(currentIssueRowHoverStyle.backgroundColor))
          .className
      : "",
    useTwoColumnMode ? stylex.props(projectIssuesStyles.clickableRow).className : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={issuePostItemClassName}
      id={`issue-item-${issueId}`}
      data-item="issue-item"
      data-value={`${authorLoginId} ${issueNumber} ${issue.title}`}
      onClickCapture={handleIssueItemClickCapture}
      onClick={handleIssueItemClick}
      onKeyDown={handleIssueItemKeyDown}
      onMouseEnter={() => onIssueRowHover({ backgroundColor: "#fafafa", issueId })}
      onMouseLeave={() => onIssueRowHover({ backgroundColor: "#fff", issueId })}
      data-stylex-owner-clickable={useTwoColumnMode ? "project-issues-clickable-row" : undefined}
      {...issueListItemLegacyAttrs}
      data-stylex-owner="project-issues-post-item"
    >
      <div className="span9 span-hard-wrap">
        {showMassUpdateControls ? (
          /* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update checkbox label targets the row checkbox by id. */
          <label
            htmlFor={`issue-${issueId}`}
            className={`mass-update-check hide-in-mobile ${stylex.props(styles.massUpdateCheck).className}`}
            data-stylex-owner="project-issues-mass-update-check"
          >
            <input
              {...stylex.props(styles.massUpdateCheckInput)}
              id={`issue-${issueId}`}
              type="checkbox"
              name="checked-issue"
              data-issue-id={issueId}
              data-issue-labels={issueLabelData(issueLabels)}
              checked={issueSelected}
              onChange={(event) => onIssueSelectedChange(issueId, event.currentTarget.checked)}
              data-stylex-owner="project-issues-mass-update-check-input"
            />
          </label>
        ) : null}
        <div {...issueRowLegacyForAttrs} className="issue-item-row">
          <div
            className={`title-wrap ${stylex.props(styles.titleWrap).className}`}
            onClickCapture={handleTitleWrapClick}
            data-stylex-owner="project-issues-title-wrap"
          >
            <Link
              activeProps={legacyRouteLocalActiveProps}
              to="/$ownerName/$projectName/issue/$issueNumber"
              params={issueParams}
              className={`title ${stylex.props(styles.issueTitle).className}`}
              data-stylex-owner="project-issues-title"
            >
              <span
                className={`post-id ${stylex.props(styles.postId).className}`}
                data-stylex-owner="project-issues-post-id"
              >
                {issue.isDraft && draftNumberSource === "draft-list" ? (
                  <span className="draft-number">#{t("issue.state.draft")}</span>
                ) : issue.isDraft ? (
                  <>
                    #<span className="draft-number">{t("issue.state.draft")}</span>
                  </>
                ) : (
                  `#${issueNumber}`
                )}
              </span>
            </Link>
            {issueWeight > 0 ? (
              <span className="weight-up-arrow" title={`${t("issue.weight")} ${issueWeight}`}>
                <i className="yobicon-angle-circled-up"></i>
              </span>
            ) : null}
            {issueWeight < 0 ? (
              <span className="weight-down-arrow" title={`${t("issue.weight")} ${issueWeight}`}>
                <i className="yobicon-angle-circled-down"></i>
              </span>
            ) : null}
            {titleParts.prefixes.map((prefix) => (
              <Link
                activeProps={legacyRouteLocalActiveProps}
                className={
                  hoveredTitlePrefix === prefix ? "title-prefix title-prefix-hover" : "title-prefix"
                }
                key={`${issueId}-${prefix}`}
                to={titlePrefixRoute(prefix)}
                onClick={(event) => {
                  event.preventDefault();
                  onTitlePrefixSearch(prefix);
                }}
                onMouseEnter={() => onTitlePrefixHover(prefix)}
                onMouseLeave={() => onTitlePrefixHover("")}
              >
                {prefix}
              </Link>
            ))}
            <Link
              activeProps={legacyRouteLocalActiveProps}
              to="/$ownerName/$projectName/issue/$issueNumber"
              params={issueParams}
              className={`title ${stylex.props(styles.issueTitle).className}`}
              data-stylex-owner="project-issues-title"
            >
              {titleParts.title}
            </Link>
          </div>
          <div
            className={`infos ${stylex.props(styles.issueInfos).className}`}
            data-stylex-owner="project-issues-infos"
          >
            {issue.authorLabel ? (
              <Link
                activeProps={legacyRouteLocalActiveProps}
                to="/$user"
                params={{ user: authorLoginId }}
                className="infos-item infos-link-item"
                title={authorLoginId}
              >
                {issue.authorLabel}
              </Link>
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
            <span className="infos-item" title={createdLabel}>
              {createdLabel}
            </span>
            <IssueSubtaskSummary issue={issue} ownerName={ownerName} projectName={projectName} />
            {showMilestone && issue.milestoneId ? (
              <span
                className={`${stylex.props(styles.milestoneTag).className} mileston-tag`}
                data-stylex-owner="project-issues-milestone-tag"
              >
                <Link
                  activeProps={legacyRouteLocalActiveProps}
                  to="/$ownerName/$projectName/milestone/$milestoneId"
                  params={{ milestoneId: String(issue.milestoneId), ownerName, projectName }}
                  title={t("milestone")}
                >
                  {issue.milestoneTitle}
                </Link>
              </span>
            ) : null}
            {issue.commentCount > 0 || issue.voterCount > 0 || (issue.sharerCount ?? 0) > 0 ? (
              <span className="infos-item item-count-groups">
                {issue.commentCount > 0 ? (
                  <Link
                    activeProps={legacyRouteLocalActiveProps}
                    to="/$ownerName/$projectName/issue/$issueNumber"
                    params={issueParams}
                    hash="comments"
                    className="comments-count comments-count-color"
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-comment2"></i>
                    </span>
                    <span className="count-groups item-count">{issue.commentCount}</span>
                  </Link>
                ) : null}
                {issue.voterCount > 0 ? (
                  <Link
                    activeProps={legacyRouteLocalActiveProps}
                    to="/$ownerName/$projectName/issue/$issueNumber"
                    params={issueParams}
                    hash="vote"
                    className="vote-count vote-color"
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-hearts"></i>
                    </span>
                    <span className="count-groups item-count strong">{issue.voterCount}</span>
                  </Link>
                ) : null}
                {(issue.sharerCount ?? 0) > 0 ? (
                  <button type="button" className="sharer-color" title={t("issue.sharer")}>
                    <span className="count-groups item-icon">
                      <i className="yobicon-friends"></i>
                    </span>
                    <span className="count-groups item-count strong">{issue.sharerCount}</span>
                  </button>
                ) : null}
              </span>
            ) : null}
            {issueLabels.map((label) => (
              <button
                type="button"
                className="label issue-label list-label active"
                data-category-id={label.categoryId ?? ""}
                data-label-id={label.id}
                key={String(label.id)}
                onClick={(event) => handleIssueLabelClick(event, String(label.id))}
              >
                {label.name}
              </button>
            ))}
            <div
              className="child-issue-list hide"
              {...(childIssueListVisible ? stylex.props(styles.childIssueListVisible) : {})}
              data-stylex-owner="project-issues-child-list"
            >
              <IssueChildRows
                basePath={basePath}
                currentUserLoginId={currentUserLoginId}
                issues={issue.childIssues ?? []}
                onIssueLabelSearch={onIssueLabelSearch}
                onTwoColumnIssueTarget={onTwoColumnIssueTarget}
                ownerName={ownerName}
                parentIssueId={issueId}
                projectName={projectName}
                useTwoColumnMode={useTwoColumnMode}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="span3 hide-in-mobile">
        <div
          className={`mt5 ${stylex.props(styles.issueAssigneeRail).className}`}
          data-stylex-owner="project-issues-assignee-rail"
        >
          {assigneeLoginId && assigneeLabel ? (
            <Link
              activeProps={legacyRouteLocalActiveProps}
              to="/$user"
              params={{ user: assigneeLoginId }}
              className={`avatar-wrap assinee ${stylex.props(styles.issueAvatar, styles.issueAssigneeAvatar).className}`}
              data-stylex-owner="project-issues-assignee-avatar"
              title={`${t("issue.assignee")}: ${assigneeLabel}`}
            >
              <img
                src={mountedAppLocalUrl(
                  basePath,
                  issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png",
                )}
                width="32"
                height="32"
                alt={assigneeLabel}
              />
            </Link>
          ) : (
            <div
              className={`${stylex.props(styles.emptyAvatar).className} empty-avatar-wrap`}
              data-stylex-owner="project-issues-empty-avatar"
            >
              &nbsp;
            </div>
          )}
        </div>
        {issue.dueDateLabel ? (
          <div
            {...dueDateStyleProps}
            className={`mr20 mt10${
              issue.dueDateOverdue ? " overdue" : ""
            } ${dueDateStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="project-issues-due-date"
            {...dueDateAttrs}
          >
            <i
              className={`yobicon-clock2 vmiddle ${stylex.props(styles.dueDateIcon).className ?? ""}`}
              data-stylex-owner="project-issues-due-date-icon"
            ></i>
            <span className="vmiddle">
              {issue.state === "open" && issue.dueDateOverdue
                ? t("issue.dueDate.overdue")
                : issue.state === "open"
                  ? (issue.dueDateText ?? issue.dueDateLabel)
                  : issue.dueDateLabel}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

type RestIssueChildItem = NonNullable<RestIssueListItem["childIssues"]>[number];

function IssueChildRows({
  basePath,
  currentUserLoginId,
  issues,
  onIssueLabelSearch,
  onTwoColumnIssueTarget,
  ownerName,
  parentIssueId,
  projectName,
  useTwoColumnMode,
}: {
  basePath: string;
  currentUserLoginId: string;
  issues: RestIssueChildItem[];
  onIssueLabelSearch: (labelId: string) => void;
  onTwoColumnIssueTarget: (issueId: string, href: string, title: string) => void;
  ownerName: string;
  parentIssueId: string;
  projectName: string;
  useTwoColumnMode: boolean;
}) {
  const visibleIssues = issues.filter(
    (issue) => !issue.isDraft || stringField(issue.authorLoginId, "") === currentUserLoginId,
  );
  const openIssues = visibleIssues.filter((issue) => issue.state !== "closed");
  const closedIssues = visibleIssues.filter((issue) => issue.state === "closed");
  const orderedIssues = [...openIssues, ...closedIssues];

  return orderedIssues.length ? (
    <div className="child-issues">
      {orderedIssues.map((issue) => (
        <IssueChildRow
          basePath={basePath}
          issue={issue}
          key={`${issue.state}-${issue.issueNumber}`}
          onIssueLabelSearch={onIssueLabelSearch}
          onTwoColumnIssueTarget={onTwoColumnIssueTarget}
          ownerName={ownerName}
          parentIssueId={parentIssueId}
          projectName={projectName}
          useTwoColumnMode={useTwoColumnMode}
        />
      ))}
    </div>
  ) : null;
}

function IssueChildRow({
  basePath,
  issue,
  onIssueLabelSearch,
  onTwoColumnIssueTarget,
  ownerName,
  parentIssueId,
  projectName,
  useTwoColumnMode,
}: {
  basePath: string;
  issue: RestIssueChildItem;
  onIssueLabelSearch: (labelId: string) => void;
  onTwoColumnIssueTarget: (issueId: string, href: string, title: string) => void;
  ownerName: string;
  parentIssueId: string;
  projectName: string;
  useTwoColumnMode: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const issueNumber = stringField(issue.issueNumber, "");
  const issueId = stringField(issue.id, "");
  const issueParams = { issueNumber, ownerName, projectName };
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const isClosed = issue.state === "closed";
  const labels = issue.labels.slice().sort(compareIssueLabels);
  const childLabelRoutePath = (labelId: string) =>
    `/${ownerName}/${projectName}/issues?state=open&labelIds=${labelId}`;
  const childLabelHref = (labelId: string) =>
    `${prefixBasePath(basePath, `/${ownerName}/${projectName}`)}/issues?state=open&labelIds=${labelId}`;
  const handleChildTargetClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (useTwoColumnMode) {
      onTwoColumnIssueTarget(parentIssueId, issueHref, event.currentTarget.textContent ?? "");
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const handleChildRowClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".issue-label")) {
      return;
    }
    if (target?.closest(".twoColumeModeTarget")) {
      handleChildTargetClick(event);
    }
  };
  const handleChildLabelClick = (
    event: ReactMouseEvent<HTMLElement>,
    labelId: string,
    href: string,
  ) => {
    if (useTwoColumnMode) {
      onTwoColumnIssueTarget(parentIssueId, href, event.currentTarget.textContent ?? "");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    onIssueLabelSearch(labelId);
  };
  const childClassName =
    issueId && issueId === parentIssueId
      ? "issue-item selected-child child-issue"
      : "issue-item  child-issue";

  return (
    <div
      className={childClassName}
      onClickCapture={handleChildRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={`state-label ${isClosed ? "closed" : "open"}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <Link
        activeProps={legacyRouteLocalActiveProps}
        className="twoColumeModeTarget"
        to="/$ownerName/$projectName/issue/$issueNumber"
        params={issueParams}
      >
        <span className="item-name">
          <span className="subtask-number">
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{issue.title}</span>
          <span>{issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}</span>
        </span>
      </Link>
      <span className="font12 no-border-at-child">
        <IssueChildCommentAndVotePair issue={issue} issueParams={issueParams} />
      </span>
      {labels.map((label) => (
        <Link
          activeProps={legacyRouteLocalActiveProps}
          to={childLabelRoutePath(String(label.id))}
          className="label issue-label list-label active twoColumeModeTarget"
          data-category-id={label.categoryId ?? ""}
          data-label-id={label.id}
          key={String(label.id)}
          onClick={(event) =>
            handleChildLabelClick(event, String(label.id), childLabelHref(String(label.id)))
          }
          {...(childIssueLabelStyle(label.color)
            ? stylex.props(styles.childLabelBackground(childIssueLabelStyle(label.color)!))
            : {})}
        >
          {label.name}
        </Link>
      ))}
      <span
        className={`child-issue-date ${stylex.props(hovered ? styles.childDateVisible : styles.childDate).className}`}
        title={issue.createdLabel}
        data-stylex-owner="project-issues-child-date"
      >
        {issue.createdLabel}
      </span>
    </div>
  );
}

function childIssueLabelStyle(color: string | undefined): string | undefined {
  return color || undefined;
}

function IssueChildCommentAndVotePair({
  issue,
  issueParams,
}: {
  issue: RestIssueChildItem;
  issueParams: {
    issueNumber: string;
    ownerName: string;
    projectName: string;
  };
}) {
  const commentCount = numberField(issue.commentCount);
  const voterCount = numberField(issue.voterCount);
  if (!commentCount && !voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {commentCount ? (
        <Link
          activeProps={legacyRouteLocalActiveProps}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={issueParams}
          hash="comments"
          className="comments-count comments-count-color"
        >
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{commentCount}</span>
        </Link>
      ) : null}
      {voterCount ? (
        <Link
          activeProps={legacyRouteLocalActiveProps}
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={issueParams}
          hash="vote"
          className="vote-count vote-color"
        >
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{voterCount}</span>
        </Link>
      ) : null}
    </span>
  );
}

function IssueSubtaskSummary({
  issue,
  ownerName,
  projectName,
}: {
  issue: RestIssueListItem;
  ownerName: string;
  projectName: string;
}) {
  const childClosedCount = issue.childClosedCount ?? 0;
  const childOpenCount = issue.childOpenCount ?? 0;
  const childTotalCount = childClosedCount + childOpenCount;
  const percentage = childTotalCount ? Math.trunc((childClosedCount / childTotalCount) * 100) : 0;
  const parentIssueNumber = stringField(issue.parentIssueNumber, "");
  const parentIssueTitle = issue.parentIssueTitle ?? "";

  return (
    <>
      {childTotalCount ? (
        <>
          <div
            className={`subtask-progress upload-progress ${
              percentage === 100 ? "done-outline" : "red-outline"
            } ${stylex.props(styles.subtaskProgress, percentage === 100 ? styles.subtaskProgressDone : styles.subtaskProgressOpen).className}`}
            data-stylex-owner="project-issues-subtask-progress"
          >
            <div
              className={`${stylex.props(styles.subtaskProgressBar, styles.progressBar(`${percentage}%`), percentage === 100 ? styles.subtaskProgressDoneBar : styles.subtaskProgressOpenBar).className} bar ${percentage === 100 ? "done" : "red"}`}
              title="Subtask"
              data-stylex-owner="project-issues-subtask-progress-bar"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""} ${stylex.props(styles.subtaskProgressRatio).className}`}
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span className="infos-item subtask">
          <Link
            activeProps={legacyRouteLocalActiveProps}
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{ issueNumber: parentIssueNumber, ownerName, projectName }}
          >
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </Link>
        </span>
      ) : null}
    </>
  );
}

function QuickSearch({
  currentUserId,
  isAnonymous,
  issues,
  onQuickSearch,
  search,
  state,
}: {
  currentUserId: string;
  isAnonymous: boolean;
  issues: ProjectIssueListRestResponse;
  onQuickSearch: (search: ProjectIssuesSearch) => void;
  search: ProjectIssuesSearch;
  state: IssueListState;
}) {
  const { t } = useLegacyMessages();
  const allLabel = state === "closed" ? t("issue.list.all.closed") : t("issue.list.all.open");
  const allCount = countField(issues, state === "closed" ? "closedIssueCount" : "openIssueCount");
  const quickSearchCountClassName = stylex.props(styles.quickSearchCount).className;

  return (
    <ul className="lst-stacked unstyled">
      <li
        className={
          !search.assigneeId && !search.authorId && !search.commenterId ? "active" : undefined
        }
      >
        <button
          type="button"
          data-assignee-id=""
          data-author-id=""
          data-commenter-id=""
          data-milestone-id={search.milestoneId}
          onClick={(event) => {
            event.preventDefault();
            onQuickSearch({
              ...search,
              assigneeId: "",
              authorId: "",
              commenterId: "",
              pageNum: 1,
            });
          }}
        >
          {allLabel}
          <span
            className={`num-badge ${quickSearchCountClassName ?? ""}`.trim()}
            data-stylex-owner="project-issues-quicksearch-all-count"
          >
            {allCount}
          </span>
        </button>
      </li>
      {!isAnonymous ? (
        <>
          <li className={search.assigneeId === currentUserId ? "active" : undefined}>
            <button
              type="button"
              data-assignee-id={currentUserId}
              data-author-id=""
              data-commenter-id=""
              data-milestone-id={search.milestoneId}
              onClick={(event) => {
                event.preventDefault();
                onQuickSearch({
                  ...search,
                  assigneeId: currentUserId,
                  authorId: "",
                  commenterId: "",
                  pageNum: 1,
                });
              }}
            >
              {t("issue.list.assignedToMe")}
              <span
                className={`num-badge ${quickSearchCountClassName ?? ""}`.trim()}
                data-stylex-owner="project-issues-quicksearch-assigned-count"
              >
                {countField(issues, "assignedToMeCount")}
              </span>
            </button>
          </li>
          <li className={search.authorId === currentUserId ? "active" : undefined}>
            <button
              type="button"
              data-assignee-id=""
              data-author-id={currentUserId}
              data-commenter-id=""
              data-milestone-id={search.milestoneId}
              onClick={(event) => {
                event.preventDefault();
                onQuickSearch({
                  ...search,
                  assigneeId: "",
                  authorId: currentUserId,
                  commenterId: "",
                  pageNum: 1,
                });
              }}
            >
              {t("issue.list.authoredByMe")}
              <span
                className={`num-badge ${quickSearchCountClassName ?? ""}`.trim()}
                data-stylex-owner="project-issues-quicksearch-authored-count"
              >
                {countField(issues, "authoredByMeCount")}
              </span>
            </button>
          </li>
          <li className={search.commenterId === currentUserId ? "active" : undefined}>
            <button
              type="button"
              data-assignee-id=""
              data-author-id=""
              data-commenter-id={currentUserId}
              data-milestone-id={search.milestoneId}
              onClick={(event) => {
                event.preventDefault();
                onQuickSearch({
                  ...search,
                  assigneeId: "",
                  authorId: "",
                  commenterId: currentUserId,
                  pageNum: 1,
                });
              }}
            >
              {t("issue.list.commentedByMe")}
              <span
                className={`num-badge ${quickSearchCountClassName ?? ""}`.trim()}
                data-stylex-owner="project-issues-quicksearch-commented-count"
              >
                {countField(issues, "commentedByMeCount")}
              </span>
            </button>
          </li>
        </>
      ) : null}
    </ul>
  );
}

function projectIssuesRoutePath(
  ownerName: string,
  projectName: string,
  search: ProjectIssuesSearch,
) {
  const queryPairs: string[] = [];
  pushSearchParam(queryPairs, "assigneeId", search.assigneeId);
  pushSearchParam(queryPairs, "authorId", search.authorId);
  pushSearchParam(queryPairs, "commenterId", search.commenterId);
  pushSearchParam(queryPairs, "dueDate", search.dueDate);
  pushSearchParam(queryPairs, "filter", search.filter);
  for (const labelId of search.labelIds) {
    pushSearchParam(queryPairs, "labelIds", labelId);
  }
  pushSearchParam(queryPairs, "milestoneId", search.milestoneId);
  pushSearchParam(queryPairs, "orderBy", search.orderBy);
  pushSearchParam(queryPairs, "orderDir", search.orderDir);
  pushSearchParam(queryPairs, "pageNum", String(search.pageNum));
  pushSearchParam(queryPairs, "state", search.state);

  const queryString = queryPairs.join("&");
  const path = `/${ownerName}/${projectName}/issues`;
  return queryString ? `${path}?${queryString}` : path;
}

function projectIssuesSearchFromForm(
  form: HTMLFormElement,
  search: ProjectIssuesSearch,
): ProjectIssuesSearch {
  const data = new FormData(form);
  return {
    ...search,
    assigneeId: issueSearchUserFormValue(data, "assigneeId"),
    authorId: issueSearchUserFormValue(data, "authorId"),
    commenterId: stringFormValue(data, "commenterId"),
    dueDate: stringFormValue(data, "dueDate"),
    filter: stringFormValue(data, "filter"),
    labelIds: data.getAll("labelIds").flatMap((value) => {
      const labelId = String(value);
      return labelId ? [labelId] : [];
    }),
    milestoneId: stringFormValue(data, "milestoneId"),
    orderBy: stringFormValue(data, "orderBy"),
    orderDir: stringFormValue(data, "orderDir"),
    pageNum: 1,
    state: issueListStateSearch(data.get("state")),
  };
}

function stringFormValue(data: FormData, name: string) {
  return String(data.get(name) ?? "");
}

function issueListStateSearch(value: unknown): IssueListState {
  return value === "all" || value === "closed" ? value : "open";
}

function issueSearchUserFormValue(data: FormData, name: string) {
  const value = stringFormValue(data, name);
  if (value.startsWith(ISSUE_SEARCH_CURRENT_USER_SHORTCUT_PREFIX)) {
    return value.slice(ISSUE_SEARCH_CURRENT_USER_SHORTCUT_PREFIX.length);
  }
  return value;
}

function isValidIssueDueDate(value: string) {
  const trimmed = value.trim();
  return trimmed === "" || !Number.isNaN(Date.parse(trimmed));
}

function YoramToast({ message, noticeKey }: { message: string; noticeKey: number }) {
  if (noticeKey === 0) {
    return null;
  }

  return (
    <div className="yobiToasts" key={noticeKey}>
      <div className="toast" tabIndex={-1} key={noticeKey}>
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent">
            &times;
          </button>
        </div>
        <div className="center-text">
          <span className="v"></span>
          <div className="msg">{message}</div>
        </div>
      </div>
    </div>
  );
}

function pushSearchParam(queryPairs: string[], name: string, value: string) {
  if (value) {
    queryPairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
}

function IssueSearchForm({
  basePath,
  currentUserId,
  issueAssignees,
  issueAuthors,
  issues,
  isAnonymous,
  labels,
  labelControls,
  milestones,
  ownerName,
  onSearchSubmit,
  projectName,
  search,
  showAssigneeCurrentUserOption,
  showAuthorCurrentUserOption,
}: {
  basePath: string;
  currentUserId: string;
  issueAssignees: ProjectIssueSearchUserOptionSource[];
  issueAuthors: ProjectIssueSearchUserOptionSource[];
  issues: RestIssueListItem[];
  isAnonymous: boolean;
  labels: Array<Record<string, unknown>>;
  labelControls: {
    showEditLink: boolean;
    showManageLink: boolean;
  };
  milestones: {
    closed: ProjectMilestone[];
    open: ProjectMilestone[];
  };
  ownerName: string;
  onSearchSubmit: (search: ProjectIssuesSearch) => void;
  projectName: string;
  search: ProjectIssuesSearch;
  showAssigneeCurrentUserOption: boolean;
  showAuthorCurrentUserOption: boolean;
}) {
  const { t } = useLegacyMessages();
  const [invalidDueDateNoticeKey, setInvalidDueDateNoticeKey] = useState(0);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const focusedSearchInputValuesRef = useRef(new Map<HTMLInputElement, string>());
  const authors = projectIssueSearchUserOptions(issueAuthors, issues, "author");
  const assignees = projectIssueSearchUserOptions(issueAssignees, issues, "assignee");
  const hasMilestones = milestones.open.length > 0 || milestones.closed.length > 0;
  const selectedMilestone = selectedSearchMilestone(search.milestoneId, milestones);
  const authorHasCurrentUserOption = issueSearchUserOptionsIncludeUser(authors, currentUserId);
  const assigneeHasCurrentUserOption = issueSearchUserOptionsIncludeUser(assignees, currentUserId);
  const authorCurrentUserShortcutValue = issueSearchCurrentUserShortcutValue(
    search.authorId,
    currentUserId,
    authorHasCurrentUserOption,
  );
  const assigneeCurrentUserShortcutValue = issueSearchCurrentUserShortcutValue(
    search.assigneeId,
    currentUserId,
    assigneeHasCurrentUserOption,
  );
  const handleSubmit = (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dueDateInput = dueDateInputRef.current;
    if (dueDateInput && !isValidIssueDueDate(dueDateInput.value)) {
      setInvalidDueDateNoticeKey((currentKey) => currentKey + 1);
      dueDateInput.focus();
      return;
    }

    onSearchSubmit(projectIssuesSearchFromForm(event.currentTarget, search));
  };
  const rememberSearchInputValue = (control: HTMLInputElement) => {
    focusedSearchInputValuesRef.current.set(control, control.value);
  };
  const submitSearchInputIfChanged = (control: HTMLInputElement) => {
    const initialValue = focusedSearchInputValuesRef.current.get(control) ?? control.value;
    focusedSearchInputValuesRef.current.delete(control);
    if (control.value === initialValue) {
      return;
    }
    control.form?.requestSubmit();
  };
  const submitSearchControlForm = (control: HTMLSelectElement | HTMLInputElement) => {
    control.form?.requestSubmit();
  };

  return (
    <form
      id="search"
      name="search"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
      method="get"
      onSubmit={handleSubmit}
    >
      <YoramToast noticeKey={invalidDueDateNoticeKey} message={t("issue.error.invalid.duedate")} />
      <input type="hidden" name="orderBy" value={search.orderBy} />
      <input type="hidden" name="orderDir" value={search.orderDir} />
      <input type="hidden" name="state" value={search.state} />
      <input type="hidden" name="commenterId" value={search.commenterId} />
      <hr className="hide-in-mobile" />
      <div className="search">
        <div className="search-bar">
          <input
            key={search.filter}
            name="filter"
            className="textbox full"
            type="text"
            defaultValue={search.filter}
            onFocus={(event) => rememberSearchInputValue(event.currentTarget)}
            onBlur={(event) => submitSearchInputIfChanged(event.currentTarget)}
          />
          <button
            type="button"
            className="search-btn"
            data-submit="submit"
            onClick={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <i className="yobicon-search"></i>
          </button>
        </div>
      </div>

      <div
        id="advanced-search-form"
        className={`${stylex.props(styles.searchAdvanced).className} srch-advanced hide-in-mobile`}
        data-stylex-owner="project-issues-search-advanced"
      >
        <dl className="issue-option">
          <dt>{t("issue.author")}</dt>
          <dd>
            <IssueSearchSingleSelectDisplay
              id="authorId"
              label={
                search.authorId
                  ? (authors.find((author) => author.id === search.authorId)?.label ??
                    t("issue.list.authoredByMe"))
                  : t("common.order.all")
              }
            />
            <select
              key={issueSearchUserSelectKey("author", search.authorId, authors)}
              id="authorId"
              name="authorId"
              data-format="user"
              data-container-css-class="fullsize"
              className="select2-offscreen"
              defaultValue={search.authorId}
              onChange={(event) => submitSearchControlForm(event.currentTarget)}
            >
              <option value="">{t("common.order.all")}</option>
              {!isAnonymous && showAuthorCurrentUserOption ? (
                <option value={authorCurrentUserShortcutValue}>
                  {t("issue.list.authoredByMe")}
                </option>
              ) : null}
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.label}
                </option>
              ))}
            </select>
          </dd>
        </dl>
        <dl className="issue-option">
          <dt>{t("issue.assignee")}</dt>
          <dd>
            <IssueSearchSingleSelectDisplay
              id="assigneeId"
              label={
                search.assigneeId === "0"
                  ? t("issue.noAssignee")
                  : search.assigneeId
                    ? (assignees.find((assignee) => assignee.id === search.assigneeId)?.label ??
                      t("issue.list.assignedToMe"))
                    : t("common.order.all")
              }
            />
            <select
              key={issueSearchUserSelectKey("assignee", search.assigneeId, assignees)}
              id="assigneeId"
              name="assigneeId"
              data-format="user"
              data-container-css-class="fullsize"
              className="select2-offscreen"
              defaultValue={search.assigneeId}
              onChange={(event) => submitSearchControlForm(event.currentTarget)}
            >
              <option value="">{t("common.order.all")}</option>
              <option value="0">{t("issue.noAssignee")}</option>
              {!isAnonymous && showAssigneeCurrentUserOption ? (
                <option value={assigneeCurrentUserShortcutValue}>
                  {t("issue.list.assignedToMe")}
                </option>
              ) : null}
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.label}
                </option>
              ))}
            </select>
          </dd>
        </dl>
        {hasMilestones ? (
          <dl className="issue-option">
            <dt>{t("milestone")}</dt>
            <dd>
              <IssueSearchSingleSelectDisplay
                id="milestoneId"
                label={
                  search.milestoneId === "-1"
                    ? t("issue.noMilestone")
                    : selectedMilestone
                      ? stringField(selectedMilestone.title, "")
                      : t("milestone.state.all")
                }
              />
              <select
                id="milestoneId"
                key={[search.milestoneId, milestones.open.length, milestones.closed.length].join(
                  ":",
                )}
                name="milestoneId"
                data-format="milestone"
                data-container-css-class="fullsize"
                className="select2-offscreen"
                defaultValue={search.milestoneId}
                onChange={(event) => submitSearchControlForm(event.currentTarget)}
              >
                <option value="">{t("milestone.state.all")}</option>
                <option value="-1">{t("issue.noMilestone")}</option>
                <optgroup label={t("milestone.state.open")}>
                  {milestones.open.map((milestone) => (
                    <option
                      value={stringField(milestone.id, "")}
                      data-state="open"
                      key={milestone.id}
                    >
                      {stringField(milestone.title, "")}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("milestone.state.closed")}>
                  {milestones.closed.map((milestone) => (
                    <option
                      value={stringField(milestone.id, "")}
                      data-state="closed"
                      key={milestone.id}
                    >
                      {stringField(milestone.title, "")}
                    </option>
                  ))}
                </optgroup>
              </select>
              {selectedMilestone ? (
                <>
                  <SearchMilestoneStatus
                    milestone={selectedMilestone}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                  <hr />
                </>
              ) : null}
            </dd>
          </dl>
        ) : null}
        <dl className="issue-option">
          <dt>{t("issue.dueDate")}</dt>
          <dd className="search search-bar">
            <input
              ref={dueDateInputRef}
              id="issueDueDate"
              type="text"
              name="dueDate"
              className="textbox full"
              defaultValue={search.dueDate}
              onFocus={(event) => rememberSearchInputValue(event.currentTarget)}
              onBlur={(event) => submitSearchInputIfChanged(event.currentTarget)}
            />
            <button type="button" className="search-btn btn-calendar">
              <i className="yobicon-calendar2"></i>
            </button>
          </dd>
        </dl>
        <div
          className={`${stylex.props(styles.labelsWrap).className} labels-wrap`}
          data-stylex-owner="project-issues-labels-wrap"
        >
          {labelControls.showManageLink ? (
            <Link
              activeProps={legacyRouteLocalActiveProps}
              to="/$ownerName/$projectName/issue/labelsform"
              params={{ ownerName, projectName }}
              className={`${stylex.props(styles.labelManageAction).className} ybtn ybtn-default ybtn-mini`}
              data-stylex-owner="project-issues-label-manage-action"
            >
              <i className="yobicon-cog vmiddle"></i>
              {labels.length === 0 ? (
                <span
                  className={`${stylex.props(styles.manageLabel).className} vmiddle`}
                  data-stylex-owner="project-issues-manage-label"
                >
                  {t("label.manage")}
                </span>
              ) : null}
            </Link>
          ) : null}
          <IssueSearchLabelSelect
            labels={labels}
            ownerName={ownerName}
            projectName={projectName}
            search={search}
            showLabelEdit={labelControls.showEditLink}
          />
        </div>
      </div>
    </form>
  );
}

function IssueSearchSingleSelectDisplay({ id, label }: { id: string; label: string }) {
  return (
    <div id={`s2id_${id}`} className="select2-container fullsize">
      <div className="select2-choice" role="presentation">
        <span className="select2-chosen">{label}</span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </div>
    </div>
  );
}

function issueSearchUserOptionsIncludeUser(
  options: ProjectIssueSearchUserOption[],
  userId: string,
) {
  return options.some((option) => option.id === userId);
}

function issueSearchCurrentUserShortcutValue(
  selectedUserId: string,
  currentUserId: string,
  hasCurrentUserOption: boolean,
) {
  if (selectedUserId === currentUserId && hasCurrentUserOption) {
    return `${ISSUE_SEARCH_CURRENT_USER_SHORTCUT_PREFIX}${currentUserId}`;
  }
  return currentUserId;
}

function issueSearchUserSelectKey(
  role: "assignee" | "author",
  selectedUserId: string,
  options: ProjectIssueSearchUserOption[],
) {
  return [role, selectedUserId, ...options.map((option) => `${option.id}:${option.loginId}`)].join(
    "|",
  );
}

function SearchMilestoneStatus({
  milestone,
  ownerName,
  projectName,
}: {
  milestone: ProjectMilestone;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const milestoneId = stringField(milestone.id, "");
  const isClosed = stringField(milestone.state, "open") === "closed";
  const dueDateLabel = stringField(milestone.dueDateLabel, "");
  const completionPercent = numberField(milestone.completionPercent);
  const openCount = numberField(milestone.openIssueCount);
  const closedCount = numberField(milestone.closedIssueCount);

  return (
    <div className="milestone-info">
      <div className="meta-info">
        <Link
          activeProps={legacyRouteLocalActiveProps}
          to="/$ownerName/$projectName/milestone/$milestoneId"
          params={{ milestoneId, ownerName, projectName }}
          className="title"
        >
          {stringField(milestone.title, "")}
        </Link>
        {dueDateLabel ? (
          <span
            className={
              !isClosed && booleanField(milestone.dueDateOverdue) ? "due-date over" : "due-date"
            }
          >
            {t("label.dueDate")}
            <strong>{dueDateLabel}</strong>
            {!isClosed ? (
              <span className="date">({stringField(milestone.untilLabel, "")})</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="progress-wrap">
        <div className="progress progress-success nm">
          <div
            className={`${stylex.props(styles.progressBar(`${completionPercent}%`)).className} bar`}
            data-stylex-owner="project-issues-milestone-progress-bar"
          ></div>
        </div>
        <div className="progress-info">
          <span
            className={stylex.props(styles.milestoneProgressCount).className}
            data-stylex-owner="project-issues-milestone-progress-count"
          >
            <strong>{`${closedCount} / ${openCount + closedCount}`}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function selectedSearchMilestone(
  milestoneId: string,
  milestones: { closed: ProjectMilestone[]; open: ProjectMilestone[] },
) {
  if (!milestoneId || milestoneId === "-1") {
    return null;
  }
  return (
    [...milestones.open, ...milestones.closed].find(
      (milestone) => stringField(milestone.id, "") === milestoneId,
    ) ?? null
  );
}

function IssueSearchLabelSelect({
  labels,
  ownerName,
  projectName,
  search,
  showLabelEdit,
}: {
  labels: Array<Record<string, unknown>>;
  ownerName: string;
  projectName: string;
  search: ProjectIssuesSearch;
  showLabelEdit: boolean;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const groupedLabels = groupProjectLabels(labels);
  const labelOptions = groupedLabels.flatMap((category) => category.labels);
  const selectedLabels = search.labelIds.flatMap((labelId) => {
    const label = labelOptions.find((option) => option.id === labelId);
    return label ? [label] : [];
  });

  const updateSelectedLabels = (labelIds: string[]) => {
    setOpen(false);
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        labelIds,
        pageNum: 1,
      }),
    });
  };

  if (groupedLabels.length === 0) {
    return null;
  }

  return (
    <dl className="issue-option">
      <dt>
        {t("label")}{" "}
        {showLabelEdit ? (
          <Link
            activeProps={legacyRouteLocalActiveProps}
            to="/$ownerName/$projectName/issue/labelsform"
            params={{ ownerName, projectName }}
            target="_blank"
            className="label-edit"
            rel="noreferrer"
          >
            [{t("button.edit")}]
          </Link>
        ) : null}
      </dt>
      <dd>
        <div
          id="s2id_labelIds"
          className={`select2-container select2-container-multi issue-labels bordered fullsize${open ? " select2-container-active select2-dropdown-open" : ""}`}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
        >
          <ul className="select2-choices">
            {selectedLabels.map((label) => (
              <li className="select2-search-choice" key={label.id}>
                <div>
                  <div className="label issue-label active static" data-label-id={label.id}>
                    {label.name}
                  </div>
                </div>
                <span
                  className="select2-search-choice-close"
                  aria-label={`${t("button.delete")} ${label.name}`}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    updateSelectedLabels(search.labelIds.filter((labelId) => labelId !== label.id))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      updateSelectedLabels(
                        search.labelIds.filter((labelId) => labelId !== label.id),
                      );
                    }
                  }}
                ></span>
              </li>
            ))}
            <li className="select2-search-field">
              <input
                id="labelIds-search"
                type="text"
                autoComplete="off"
                role="combobox"
                aria-controls="labelIds-options"
                aria-expanded={open}
                placeholder={selectedLabels.length > 0 ? "" : t("label.select")}
                {...(selectedLabels.length > 0
                  ? stylex.props(styles.selectedLabelSearchInput)
                  : {})}
                onClick={() => setOpen(true)}
                onFocus={() => setOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                  }
                }}
              />
            </li>
          </ul>
          <div
            className={`select2-drop select2-drop-multi issue-labels${open ? " select2-drop-active" : " select2-display-none"}`}
          >
            <ul id="labelIds-options" className="select2-results" role="listbox">
              {groupedLabels.map((category) => {
                const categorySelected = category.labels.every((label) =>
                  search.labelIds.includes(label.id),
                );
                return (
                  <li
                    className={`select2-result-with-children${categorySelected ? " select2-selected" : ""}`}
                    key={category.id}
                  >
                    <div className="select2-result-label">
                      <i
                        className={
                          category.isExclusive
                            ? "yobicon-tag category-exclusive single"
                            : "yobicon-tags category-exclusive multiple"
                        }
                        title={`${t("label.category.option")}\n${t(category.isExclusive ? "label.category.option.single" : "label.category.option.multiple")}`}
                      ></i>
                      <span>{category.name}</span>
                    </div>
                    <ul className="select2-result-sub">
                      {category.labels.map((label) => {
                        const selected = search.labelIds.includes(label.id);
                        return (
                          <li
                            className={`select2-results-dept-1 select2-result select2-result-selectable${selected ? " select2-selected" : ""}`}
                            key={label.id}
                            role="option"
                            aria-selected={selected}
                            tabIndex={selected ? -1 : 0}
                            onClick={() => {
                              if (!selected) {
                                updateSelectedLabels([...search.labelIds, label.id]);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (!selected && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault();
                                updateSelectedLabels([...search.labelIds, label.id]);
                              }
                            }}
                          >
                            <div className="select2-result-label">
                              <div
                                className="label issue-label active static"
                                data-label-id={label.id}
                              >
                                {label.name}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <select
          id="labelIds"
          name="labelIds"
          multiple
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder={t("label.select")}
          className="hide select2-offscreen"
          defaultValue={search.labelIds}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option></option>
          {groupedLabels.map((category) => (
            <optgroup
              label={category.name}
              data-category-id={category.id}
              data-category-is-exclusive={String(category.isExclusive)}
              key={category.id}
            >
              {category.labels.map((label) => (
                <option
                  value={label.id}
                  data-category-id={category.id}
                  data-category-is-exclusive={String(category.isExclusive)}
                  key={label.id}
                >
                  {label.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </dd>
    </dl>
  );
}

function StateTab({
  active,
  count,
  label,
  to,
}: {
  active: boolean;
  count: number;
  label: string;
  to: string;
}) {
  return (
    <li className={active ? "active" : undefined}>
      <Link
        activeOptions={legacyRouteLocalActiveOptions}
        activeProps={legacyRouteLocalActiveProps}
        to={to}
      >
        {label}
        <span className="num-badge">{count}</span>
      </Link>
    </li>
  );
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
  const popoverTimer = useRef<number | null>(null);
  const popoverTitle = t("common.two.column.mode");
  const popoverContent = t("common.two.column.mode.desc");
  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  };
  const hidePopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  };

  useEffect(() => clearPopoverTimer, []);

  return (
    <div
      className={`${stylex.props(styles.relativeAnchor, styles.modeControl).className} two-column-icon mr10 hide-in-mobile`}
      id="two-column-mode-checkbox"
      title={popoverTitle}
      data-stylex-owner="project-issues-two-column-anchor"
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
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
        <div className="popover top" role="tooltip" {...stylex.props(styles.twoColumnPopover)}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">
            <p>{popoverContent}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShowSubtasksCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { t } = useLegacyMessages();
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = useRef<number | null>(null);
  const popoverTitle = t("common.show.subtasks");
  const popoverContent = t("common.show.subtasks.desc");
  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  };
  const hidePopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  };

  useEffect(() => clearPopoverTimer, []);

  return (
    <div
      className={`${stylex.props(styles.relativeAnchor, styles.modeControl).className} show-subtasks mr10`}
      id="two-column-mode-checkbox"
      title={popoverTitle}
      data-stylex-owner="project-issues-subtasks-anchor"
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
      <label className="checkbox">
        <div className="show-subtasks-button-border">
          <input
            id="toggle-show-subtasks"
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              onToggle(event.currentTarget.checked);
            }}
          />
          <span className="show-subtasks-text">{t("common.show.subtasks")}</span>
        </div>
      </label>
      {isPopoverVisible ? (
        <div className="popover top" role="tooltip" {...stylex.props(styles.showSubtasksPopover)}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
    </div>
  );
}

function IssueListKeymap({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const [keymapOpen, setKeymapOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const ctrlKey = isMac ? "⌘" : "CTRL";
  const showPullRequest = stringField((project as Record<string, unknown>).vcs, "GIT") === "GIT";
  const showProjectSetting = projectMemberControlsEnabled(project);

  return (
    <>
      <div
        className={`${stylex.props(styles.keymapWrap).className} pull-left`}
        data-stylex-owner="project-issues-keymap"
      >
        <button
          type="button"
          className="ybtn ybtn-inverse ybtn-mini"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setKeymapOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && keymapOpen) {
              event.preventDefault();
              setKeymapOpen(false);
            }
          }}
        >
          {t("title.keymap")}
        </button>
        <div
          id="helpKeys"
          {...(keymapOpen ? stylex.props(issueListKeymapStyles.visible) : undefined)}
          className={`modal ${keymapOpen ? "" : "hide "}fade keymap-help${keymapOpen ? " in" : ""} ${keymapOpen ? (stylex.props(issueListKeymapStyles.visible).className ?? "") : ""}`.trim()}
          data-stylex-owner="project-issues-keymap-modal"
          tabIndex={-1}
          role="dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setKeymapOpen(false);
            }
          }}
        >
          <div className="row-fluid">
            <div className="span3">
              <h5>{t("project.projects")}</h5>
              <KeymapEntry keys={["H"]} label={t("menu.home")} />
              <KeymapEntry keys={["B"]} label={t("menu.board")} />
              <KeymapEntry keys={["I"]} label={t("menu.issue")} />
              <KeymapEntry keys={["C"]} label={t("menu.code")} />
              <KeymapEntry keys={["M"]} label={t("milestone")} />
              {showPullRequest ? <KeymapEntry keys={["P"]} label={t("menu.pullRequest")} /> : null}
              {showProjectSetting ? (
                <KeymapEntry keys={["Q"]} label={t("project.setting")} />
              ) : null}
            </div>
            <div className="span9">
              <div className="row-fluid">
                <div className="span5">
                  <h5>{t("title.issueList")}</h5>
                  <KeymapEntry keys={["N"]} label={t("issue.menu.new")} />
                  <KeymapEntry keys={["←"]} label={t("button.prevPage")} />
                  <KeymapEntry keys={["→"]} label={t("button.nextPage")} />
                  <KeymapEntry keys={[ctrlKey, "A"]} label={t("button.selectAll")} />
                </div>
                <div className="span7">
                  <h5>{t("site")}</h5>
                  <KeymapEntry keys={["A"]} label={t("issue.myIssue")} />
                  <KeymapEntry keys={["U"]} label={t("userinfo.profile")} />
                  <KeymapEntry keys={["F"]} label={t("user.menu")} />
                  <KeymapEntry
                    keys={isMac ? ["CTRL", "ALT", "S"] : ["ALT", "S"]}
                    label={t("site.search")}
                  />
                  <KeymapEntry keys={[ctrlKey, "ENTER"]} label={t("button.submitForm")} />
                </div>
              </div>
              <div className="row-fluid mt20">
                <div className="span12"></div>
              </div>
            </div>
          </div>
          <p className="actrow">
            <button
              type="button"
              className="ybtn ybtn-info"
              onClick={() => {
                setKeymapOpen(false);
              }}
            >
              {t("button.confirm")}
            </button>
          </p>
        </div>
      </div>
      {keymapOpen ? (
        <div
          className="modal-backdrop fade in"
          role="presentation"
          onClick={() => {
            setKeymapOpen(false);
          }}
        ></div>
      ) : null}
    </>
  );
}

function KeymapEntry({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      {keys.map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? " + " : ""}
          <span className="ybtn ybtn-small">{key}</span>
        </Fragment>
      ))}
      <span className="help-inline">{label}</span>
      <br />
    </>
  );
}

function totalPages(issues: ProjectIssueListRestResponse) {
  const providedTotalPages = Number((issues as Record<string, unknown>).totalPages);
  if (Number.isFinite(providedTotalPages) && providedTotalPages > 0) {
    return providedTotalPages;
  }
  const totalCount = Number(issues.totalCount) || 0;
  const pageSize = Number(issues.pageSize) || 15;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

function excelHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  currentSearchString: string,
) {
  const params = new URLSearchParams(currentSearchString);
  params.delete("pageNum");
  const routeDefaultParams = [];
  for (const [name, value] of params) {
    if (
      value === "" ||
      (name === "labelIds" && value === "[]") ||
      (name === "orderBy" && value === "updatedDate") ||
      (name === "orderDir" && value === "desc") ||
      (name === "state" && value === "open" && !initialNavigationSearchHas("state", "open"))
    ) {
      routeDefaultParams.push(name);
    }
  }
  for (const name of routeDefaultParams) {
    params.delete(name);
  }
  const labelIds = legacyExcelLabelIds(params.getAll("labelIds"));
  const queryPairs: string[] = [];
  for (const [name, value] of params) {
    if (name !== "labelIds") {
      pushSearchParam(queryPairs, name, value);
    }
  }
  if (labelIds.length > 0) {
    for (const labelId of labelIds) {
      pushSearchParam(queryPairs, "labelIds", labelId);
    }
  }
  pushSearchParam(queryPairs, "format", "xls");
  return `${prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}?${queryPairs.join("&")}`;
}

function initialNavigationSearchHas(name: string, value: string) {
  if (typeof globalThis.location === "undefined" || typeof performance === "undefined") {
    return false;
  }
  const navigation = performance.getEntriesByType("navigation")[0];
  if (!navigation) {
    return false;
  }
  try {
    const url = new URL(navigation.name);
    return url.searchParams.get(name) === value;
  } catch {
    return false;
  }
}

function legacyExcelLabelIds(values: string[]) {
  return values.flatMap((value) => {
    if (!value || value === "[]") {
      return [];
    }
    if (!value.startsWith("[")) {
      return [value];
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.flatMap((item) => (item ? [String(item)] : []))
        : [value];
    } catch {
      return [value];
    }
  });
}

function sortedIssueLabels(issue: RestIssueListItem) {
  return issue.labels.slice().sort(compareIssueLabels);
}

function compareIssueLabels(
  left: { categoryName?: unknown; name: string },
  right: { categoryName?: unknown; name: string },
) {
  const categoryOrder = stringField(left.categoryName, "").localeCompare(
    stringField(right.categoryName, ""),
  );
  return categoryOrder || left.name.localeCompare(right.name);
}

function groupProjectLabels(labels: Array<Record<string, unknown>>) {
  const categories = new Map<
    string,
    {
      id: string;
      isExclusive: boolean;
      labels: Array<{ id: string; name: string }>;
      name: string;
    }
  >();

  for (const label of labels) {
    const categoryId = stringField(label.categoryId, "0");
    const categoryName = stringField(label.categoryName, stringField(label.category, ""));
    const categoryKey = `${categoryId}\u0000${categoryName}`;
    const category = categories.get(categoryKey) ?? {
      id: categoryId,
      isExclusive: Boolean(label.categoryIsExclusive),
      labels: [],
      name: categoryName,
    };
    category.labels.push({
      id: stringField(label.id, ""),
      name: stringField(label.name, ""),
    });
    categories.set(categoryKey, category);
  }

  const groupedLabels = [];
  for (const category of categories.values()) {
    const categoryLabels = [];
    for (const label of category.labels) {
      if (label.id && label.name) {
        categoryLabels.push(label);
      }
    }
    categoryLabels.sort((left, right) => left.name.localeCompare(right.name));
    if (categoryLabels.length > 0) {
      groupedLabels.push({ ...category, labels: categoryLabels });
    }
  }

  return groupedLabels.sort((left, right) => left.name.localeCompare(right.name));
}

function issueLabelData(labels: RestIssueListItem["labels"]) {
  return labels
    .map((label) =>
      [
        label.categoryName ?? "",
        label.id,
        label.name,
        label.categoryId ?? "",
        String(Boolean(label.categoryIsExclusive)),
      ].join(","),
    )
    .join("|")
    .concat(labels.length ? "|" : "");
}

function projectMilestoneOptions(milestones: ProjectMilestone[]) {
  const options = [];
  for (const milestone of milestones) {
    const id = stringField(milestone.id, "");
    const title = stringField(milestone.title, "");
    if (id && title) {
      options.push({ id, title });
    }
  }
  return options;
}

function projectIssueLabelOptions(
  labels: Array<Record<string, unknown>>,
  issues: RestIssueListItem[],
) {
  const projectLabels = [];
  for (const label of labels) {
    const id = stringField(label.id, "");
    const name = stringField(label.name, "");
    if (id && name) {
      projectLabels.push({
        categoryId: stringField(label.categoryId, ""),
        categoryIsExclusive: Boolean(label.categoryIsExclusive),
        categoryName: stringField(label.categoryName, stringField(label.category, "")),
        color: stringField(label.color, ""),
        id,
        name,
      });
    }
  }
  projectLabels.sort(compareIssueLabels);

  return projectLabels.length > 0 ? projectLabels : uniqueLabels(issues);
}

function uniqueLabels(issues: RestIssueListItem[]) {
  const labels = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive?: boolean;
      categoryName: string;
      color?: string;
      id: string;
      name: string;
    }
  >();
  for (const issue of issues) {
    for (const label of issue.labels) {
      const id = stringField(label.id, "");
      if (id && !labels.has(id)) {
        labels.set(id, {
          categoryId: stringField(label.categoryId, ""),
          categoryIsExclusive: Boolean(label.categoryIsExclusive),
          categoryName: stringField(label.categoryName, ""),
          color: label.color,
          id,
          name: label.name,
        });
      }
    }
  }
  return Array.from(labels.values()).sort(compareIssueLabels);
}

function countSelectedIssueLabels(issues: RestIssueListItem[]) {
  const labelCounts = new Map<string, number>();
  for (const issue of issues) {
    for (const label of issue.labels) {
      const id = stringField(label.id, "");
      if (id) {
        labelCounts.set(id, (labelCounts.get(id) ?? 0) + 1);
      }
    }
  }
  return labelCounts;
}

function hiddenLabelIdsForSelectedIssueCount(
  labelCounts: ReadonlyMap<string, number>,
  selectedIssueCount: number,
) {
  const hiddenLabelIds = new Set<string>();
  if (selectedIssueCount === 0) {
    return hiddenLabelIds;
  }
  for (const [labelId, count] of labelCounts) {
    if (count === selectedIssueCount) {
      hiddenLabelIds.add(labelId);
    }
  }
  return hiddenLabelIds;
}

function groupLabels(
  labels: Array<{
    categoryIsExclusive?: boolean;
    categoryId: string;
    categoryName: string;
    color?: string;
    id: string;
    name: string;
  }>,
) {
  const groups = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      labels: Array<{ categoryIsExclusive?: boolean; color?: string; id: string; name: string }>;
    }
  >();
  for (const label of labels) {
    const group = groups.get(label.categoryId) ?? {
      categoryId: label.categoryId,
      categoryName: label.categoryName,
      labels: [],
    };
    group.labels.push({
      categoryIsExclusive: label.categoryIsExclusive,
      color: label.color,
      id: label.id,
      name: label.name,
    });
    groups.set(label.categoryId, group);
  }
  return Array.from(groups.values());
}

function projectAssignableUserOptions(
  assignableUsers: ProjectAssignableUserOptionSource[],
  issues: RestIssueListItem[],
  currentUserId: string,
) {
  const fallbackUsers = uniqueUsers(issues, currentUserId);
  if (assignableUsers.length === 0) {
    return fallbackUsers;
  }

  const fallbackByLoginId = new Map(fallbackUsers.map((user) => [user.loginId, user]));
  const users = new Map<
    string,
    { avatarUrl: string; id: string; label: string; loginId: string }
  >();

  for (const item of assignableUsers) {
    if (item.type && item.type !== "user") {
      continue;
    }
    const loginId = stringField(item.loginId, "");
    if (!loginId) {
      continue;
    }
    const fallback = fallbackByLoginId.get(loginId);
    const id = stringField(item.userId, fallback?.id ?? loginId);
    addUser(users, {
      avatarUrl: avatarUrlField(item.avatarUrl, fallback?.avatarUrl),
      id,
      label: stringField(item.displayName, stringField(item.pureNameOnly, fallback?.label ?? "")),
      loginId,
    });
  }

  return Array.from(users.values());
}

function projectIssueSearchUserOptions(
  searchUsers: ProjectIssueSearchUserOptionSource[],
  issues: RestIssueListItem[],
  role: "assignee" | "author",
) {
  if (searchUsers.length === 0) {
    return uniqueIssueUsers(issues, role);
  }

  const users: Array<{ avatarUrl: string; id: string; label: string; loginId: string }> = [];
  for (const item of searchUsers) {
    const loginId = stringField(item.loginId, "");
    const id = stringField(item.userId, "");
    if (id && loginId) {
      users.push({
        avatarUrl: avatarUrlField(item.avatarUrl),
        id,
        label: stringField(item.displayName, stringField(item.pureNameOnly, "")),
        loginId,
      });
    }
  }
  return users;
}

function uniqueUsers(issues: RestIssueListItem[], currentUserId: string) {
  const users = new Map<
    string,
    { avatarUrl: string; id: string; label: string; loginId: string }
  >();
  for (const issue of issues) {
    addUser(users, {
      avatarUrl: avatarUrlField(issue.assigneeAvatarUrl),
      id: stringField((issue as Record<string, unknown>).assigneeUserId, ""),
      label: stringField(issue.assigneeLabel, ""),
      loginId: stringField(issue.assigneeLoginId, ""),
    });
    addUser(users, {
      avatarUrl: avatarUrlField(issue.authorAvatarUrl),
      id: stringField((issue as Record<string, unknown>).authorUserId, ""),
      label: stringField(issue.authorLabel, ""),
      loginId: stringField(issue.authorLoginId, ""),
    });
  }
  const current = users.get(currentUserId);
  return [
    ...(current ? [current] : []),
    ...Array.from(users.values()).filter((user) => user.id !== currentUserId),
  ];
}

function uniqueIssueUsers(issues: RestIssueListItem[], role: "assignee" | "author") {
  const users = new Map<
    string,
    { avatarUrl: string; id: string; label: string; loginId: string }
  >();
  for (const issue of issues) {
    addUser(
      users,
      role === "assignee"
        ? {
            avatarUrl: avatarUrlField(issue.assigneeAvatarUrl),
            id: stringField((issue as Record<string, unknown>).assigneeUserId, ""),
            label: stringField(issue.assigneeLabel, ""),
            loginId: stringField(issue.assigneeLoginId, ""),
          }
        : {
            avatarUrl: avatarUrlField(issue.authorAvatarUrl),
            id: stringField((issue as Record<string, unknown>).authorUserId, ""),
            label: stringField(issue.authorLabel, ""),
            loginId: stringField(issue.authorLoginId, ""),
          },
    );
  }
  return Array.from(users.values());
}

function addUser(
  users: Map<string, { avatarUrl: string; id: string; label: string; loginId: string }>,
  user: { avatarUrl: string; id: string; label: string; loginId: string },
) {
  if (user.id && user.loginId && !users.has(user.id)) {
    users.set(user.id, {
      avatarUrl: user.avatarUrl || "/assets/images/default-avatar-32.png",
      id: user.id,
      label: user.label || user.loginId,
      loginId: user.loginId,
    });
  }
}

function countField(issues: ProjectIssueListRestResponse, key: string) {
  const value = (issues as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

function idSearch(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function arraySearch(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const normalized = String(item);
      return normalized ? [normalized] : [];
    });
  }
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return [String(value)];
  }
  return [];
}

function stringSearch(value: unknown, fallback = "") {
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function readTwoColumnHighlightedIssueId() {
  if (typeof history === "undefined" || !history.state || typeof history.state !== "object") {
    return "";
  }
  return stringField(
    (history.state as Record<string, unknown>).yonaIssueListHighlightedIssueId,
    "",
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

function avatarUrlField(value: unknown, fallback = "/assets/images/default-avatar-32.png") {
  const normalized = stringField(value, "").trim();
  return normalized || fallback;
}

function mountedAppLocalUrl(basePath: string, url: string) {
  return /^\/(?:assets|images)\//u.test(url) ? prefixBasePath(basePath, url) : url;
}

function projectMilestoneMenuEnabled(project: ProjectContainer) {
  const record = project as Record<string, unknown>;
  const menuSetting =
    record.menuSetting && typeof record.menuSetting === "object"
      ? (record.menuSetting as Record<string, unknown>)
      : {};
  return booleanField(menuSetting.milestone ?? record.showMilestone);
}

function projectMemberControlsEnabled(project: ProjectContainer) {
  return booleanField((project as Record<string, unknown>).viewerCanUpdate);
}

function projectMemberSearchOptionsEnabled(project: ProjectContainer) {
  const record = project as Record<string, unknown>;
  if ("viewerIsProjectMember" in record) {
    return booleanField(record.viewerIsProjectMember);
  }
  return projectMemberControlsEnabled(project);
}

function projectAuthorSearchOptionsEnabled(
  project: ProjectContainer,
  assignableUsers: ProjectAssignableUserOptionSource[],
  currentUserId: string,
) {
  const record = project as Record<string, unknown>;
  if ("viewerIsProjectOrOrganizationUser" in record) {
    return booleanField(record.viewerIsProjectOrOrganizationUser);
  }
  if ("viewerIsOrganizationMember" in record) {
    return (
      booleanField(record.viewerIsOrganizationMember) || projectMemberSearchOptionsEnabled(project)
    );
  }
  if (projectMemberSearchOptionsEnabled(project)) {
    return true;
  }
  return assignableUsers.some((user) => stringField(user.userId, "") === currentUserId);
}

function projectManagerControlsEnabled(project: ProjectContainer) {
  const record = project as Record<string, unknown>;
  if ("viewerIsProjectManager" in record) {
    return booleanField(record.viewerIsProjectManager);
  }
  return booleanField(record.viewerCanUpdate);
}

function projectIssueLabelCreatable(project: ProjectContainer) {
  const record = project as Record<string, unknown>;
  if ("viewerCanCreateIssueLabel" in record) {
    return booleanField(record.viewerCanCreateIssueLabel);
  }
  return projectManagerControlsEnabled(project);
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function numberField(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function truncateParentIssueTitle(title: string) {
  const trimmed = title.slice(0, 10).trim();
  return title.length > 10 ? `${trimmed}...` : trimmed;
}
