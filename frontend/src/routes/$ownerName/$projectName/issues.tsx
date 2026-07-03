import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent as ReactFormEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type LiHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { currentSessionQueryOptions } from "../../../api/session";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import type { ProjectContainer, ProjectMilestone } from "../../../api/types";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
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
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

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
  state: "closed" | "open";
};

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
      state: stringSearch(search.state, "open") === "closed" ? "closed" : "open",
    };
  },
});

function ProjectIssuesRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectIssuesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
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
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <link
        rel="stylesheet"
        href={prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/labels.css`,
        )}
        type="text/css"
      />
      <IssueListAssets
        basePath={runtimeConfig.basePath}
        ownerName={ownerName}
        projectName={projectName}
        supportedLanguages={runtimeConfig.supportedLanguages}
      />
      <ProjectIssuesBody
        assignableUsers={assignableUsersQuery.data.items}
        currentUserId={stringField(sessionQuery.data.actorId, "0")}
        isAnonymous={Boolean(sessionQuery.data.isAnonymous)}
        currentUserLoginId={stringField(sessionQuery.data.loginId, "")}
        currentSearchString={location.searchStr}
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

function IssueListAssets({
  basePath,
  ownerName,
  projectName,
  supportedLanguages,
}: {
  basePath: string;
  ownerName: string;
  projectName: string;
  supportedLanguages?: string[];
}) {
  return (
    <>
      <IssueListSelect2Partial basePath={basePath} supportedLanguages={supportedLanguages} />
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/lib/moment-with-langs.min.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/lib/pikaday/pikaday.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.ui.Calendar.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/lib/jquery.pageslide.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/service/yona.twoColumnMode.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/service/yona.showSubtask.js")}
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function(){
  $yobi.loadModule("issue.List");
  yobi.ShortcutKey.setKeymapLink({
    "N": "${prefixBasePath(basePath, `/${ownerName}/${projectName}/issueform`)}"
  });
});
`,
        }}
      ></script>
    </>
  );
}

function IssueListSelect2Partial({
  basePath,
  supportedLanguages,
}: {
  basePath: string;
  supportedLanguages?: string[];
}) {
  const language = resolveInitialLanguage(supportedLanguages);
  const localeScript =
    language === "ko-KR"
      ? "/assets/javascripts/lib/select2/select2_locale_ko.js"
      : language === "ja-JP"
        ? "/assets/javascripts/lib/select2/select2_locale_ja.js"
        : "";

  return (
    <>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/lib/select2/select2.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(basePath, "/assets/javascripts/common/yobi.ui.Select2.js")}
      ></script>
      {localeScript ? <script defer src={prefixBasePath(basePath, localeScript)}></script> : null}
      <script
        id="tplSelect2FormatUser"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name} ${loginId}">\n    <span class="avatar-wrap smaller"><img src="${avatarURL}" width="20" height="20"></span>\n    <strong class="name">${name}</strong>\n    <span class="loginid">${loginId}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2FormatMilestone"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html: '<div title="[${stateLabel}] ${name}">\n    ${name}\n</div>',
        }}
      />
      <script
        id="tplSelect2Projects"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name}">\n    <span class="avatar-wrap smaller"><img src="${avatarURL}" width="16" height="16"></span>\n    <span class="loginid">${owner}</span>\n    <span class="name">${name}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2ProjectsWithoutAvatar"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name}">\n    <span class="width25px"></span>\n    <span class="loginid">${owner}</span>\n    <span class="name">${name}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2FormatIssues"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html: '<div title="${name}">\n    ${name}\n</div>',
        }}
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
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const hasIssues = issues.items.length > 0;
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
  const normalItems = issues.items.filter(
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
  const handleStateChange = (nextState: "closed" | "open") => {
    void navigate({
      to: projectIssuesRoutePath(ownerName, projectName, {
        ...search,
        pageNum: 1,
        state: nextState,
      }),
    });
  };
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
  const showLabelManagement = projectIssueLabelCreatable(project);
  const showLabelEdit = projectManagerControlsEnabled(project);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div {...pjaxContainer} className="row-fluid issue-list-wrap">
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
              issues={issues.items}
              isAnonymous={isAnonymous}
              labels={labels}
              milestones={milestones}
              ownerName={ownerName}
              projectName={projectName}
              search={search}
              showCurrentUserOptions={showMassUpdateControls}
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
          <div className="span10 span-hard-wrap" id="span10">
            <div className="pull-right">
              <a
                href={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/issueform`,
                )}
                className="ybtn ybtn-success"
              >
                {t("issue.menu.new")}
              </a>
            </div>
            <ul className="nav nav-tabs nm">
              <StateTab
                active={search.state === "open"}
                count={countField(issues, "openIssueCount")}
                label={t("issue.state.open")}
                onStateChange={handleStateChange}
                state="open"
              />
              <StateTab
                active={search.state === "closed"}
                count={countField(issues, "closedIssueCount")}
                label={t("issue.state.closed")}
                onStateChange={handleStateChange}
                state="closed"
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
            {!hasIssues ? (
              <>
                <div className="error-wrap">
                  <i className="ico ico-err1"></i>
                  <p>{t("issue.is.empty")}</p>
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
                <div className="pull-left" style={{ padding: "10px" }}>
                  <a
                    href={excelHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      currentSearchString,
                    )}
                    className="ybtn small"
                  >
                    <i className="yobicon-file-excel"></i> {t("issue.downloadAsExcel")}
                  </a>
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
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    onPageChange(value);
  };

  return (
    <div id="pagination" className="page-navigation-wrap" data-total={totalPages}>
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link activeProps={{ className: undefined }} to={pageRoutePath(currentPage - 1)}>
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
            <Link activeProps={{ className: undefined }} to={pageRoutePath(currentPage + 1)}>
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
    <div className="filters pull-right">
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
  const legacyOrderAttributes = { orderby: field, orderdir: orderDir } as Record<string, string>;
  const selectIssueSortFilter = (event: ReactMouseEvent) => {
    event.preventDefault();
    onSortChange(field, orderDir);
  };

  return (
    <button
      type="button"
      className={active ? "filter active" : "filter"}
      onClick={selectIssueSortFilter}
      {...legacyOrderAttributes}
    >
      {children}
      {label}
    </button>
  );
}

function shouldShowDraftItems(search: ProjectIssuesSearch) {
  return (
    search.state === "open" &&
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
  const selectedIssueCount = selectedIssues.length;
  const hasSelectedIssues = selectedIssueCount > 0;
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

  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        id="mass-update-form"
        className="mass-update-form pull-left"
        action={massUpdateAction}
        method="post"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="btn-group check-all">
          {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update wraps this checkbox in a label. */}
          <label htmlFor="check-all">
            <input
              type="checkbox"
              id="check-all"
              data-target="checked-issue"
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
            data-toggle="dropdown"
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
            {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- legacy dropdown item is an inert anchor inside a list item. */}
            <li data-value="0" onClick={() => submitMassUpdate("assignee.id", "0")}>
              <LegacyInertDropdownAnchor>{t("issue.noAssignee")}</LegacyInertDropdownAnchor>
            </li>
            {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- legacy dropdown item is an inert anchor inside a list item. */}
            <li
              data-value={currentUserId}
              onClick={() => submitMassUpdate("assignee.id", currentUserId)}
            >
              <LegacyInertDropdownAnchor>{t("issue.assignToMe")}</LegacyInertDropdownAnchor>
            </li>
            {users.length ? <li className="divider"></li> : null}
            {users.map((user) => (
              /* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- legacy dropdown item is an inert anchor inside a list item. */
              <li
                data-value={user.id}
                key={user.id}
                onClick={() => submitMassUpdate("assignee.id", user.id)}
              >
                <LegacyInertDropdownAnchor className="usf-group">
                  <span className="avatar-wrap smaller">
                    <img src={user.avatarUrl} width="20" height="20" alt="" />
                  </span>
                  <strong className="name">{user.label}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {user.loginId}
                  </span>
                </LegacyInertDropdownAnchor>
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
  return (
    <div id={id} className={massUpdateDropdownGroupClassName(isOpen)} data-name={name}>
      <button
        className="btn dropdown-toggle medium"
        data-toggle="dropdown"
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
            <li
              data-value={option.value}
              key={option.value}
              onClick={() => onSelect(name, option.value)}
              onKeyDown={(event) =>
                submitMassUpdateFromOptionKey(event, () => onSelect(name, option.value))
              }
            >
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
              <a>{option.label}</a>
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
        data-toggle="dropdown"
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
          onClick={() => onSelect(name, label.id)}
          onKeyDown={(event) =>
            submitMassUpdateFromOptionKey(event, () => onSelect(name, label.id))
          }
        >
          {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
          <a>
            <span className="issue-label active list-label" data-label-id={label.id}>
              {label.name}
            </span>
          </a>
        </li>
      ))}
      <li className="divider" data-category={group.categoryId} hidden={categoryHidden}></li>
    </>
  );
}

function massUpdateDropdownGroupClassName(isOpen: boolean) {
  return isOpen ? "btn-group open" : "btn-group";
}

function LegacyInertDropdownAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const Anchor = "a";
  return <Anchor className={className}>{children}</Anchor>;
}

function submitMassUpdateFromOptionKey(
  event: ReactKeyboardEvent<HTMLLIElement>,
  submit: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  submit();
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
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const authorLoginId = stringField(issue.authorLoginId, "");
  const authorHref = prefixBasePath(basePath, `/${authorLoginId}`);
  const assigneeLoginId = stringField(issue.assigneeLoginId, "");
  const createdLabel = stringField(issue.createdLabel, stringField(issue.updatedLabel, ""));
  const issueWeight = issue.weight ?? 0;
  const issueLabels = sortedIssueLabels(issue);
  const titleParts = splitHeaderWordsInBrackets(issue.title);
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;
  const currentIssueRowHoverStyle =
    issueRowHoverStyle?.issueId === issueId ? issueRowHoverStyle : null;
  const issueRowStyle: CSSProperties | undefined =
    currentIssueRowHoverStyle || useTwoColumnMode
      ? {
          ...(currentIssueRowHoverStyle
            ? { backgroundColor: currentIssueRowHoverStyle.backgroundColor }
            : {}),
          ...(useTwoColumnMode ? { cursor: "pointer" } : {}),
        }
      : undefined;
  const legacyFor = {
    htmlFor: `issue-${issueId}`,
  } as unknown as HTMLAttributes<HTMLDivElement>;
  const dueDateAttrs =
    issue.state === "open"
      ? {
          "data-placement": "top",
          "data-toggle": "tooltip",
          title: issue.dueDateLabel,
        }
      : {};
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
  const handleIssueItemKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    revealChildIssueListFromRow(event.target instanceof Element ? event.target : null);
  };

  return (
    <li
      className={`post-item title${issueSelected ? " active" : ""}${highlighted ? " highlightBg" : ""}`}
      id={`issue-item-${issueId}`}
      data-item="issue-item"
      data-value={`${authorLoginId} ${issueNumber} ${issue.title}`}
      onClick={handleIssueItemClick}
      onKeyDown={handleIssueItemKeyDown}
      onMouseEnter={() => onIssueRowHover({ backgroundColor: "#fafafa", issueId })}
      onMouseLeave={() => onIssueRowHover({ backgroundColor: "#fff", issueId })}
      style={issueRowStyle}
      {...legacyHref}
    >
      <div className="span9 span-hard-wrap">
        {showMassUpdateControls ? (
          /* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update checkbox label targets the row checkbox by id. */
          <label htmlFor={`issue-${issueId}`} className="mass-update-check hide-in-mobile">
            <input
              id={`issue-${issueId}`}
              type="checkbox"
              name="checked-issue"
              data-toggle="issue-checkbox"
              data-issue-id={issueId}
              data-issue-labels={issueLabelData(issueLabels)}
              checked={issueSelected}
              onChange={(event) => onIssueSelectedChange(issueId, event.currentTarget.checked)}
            />
          </label>
        ) : null}
        <div {...legacyFor} className="issue-item-row">
          <div className="title-wrap" onClickCapture={handleTitleWrapClick}>
            <a href={issueHref} className="title">
              <span className="post-id">
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
            </a>
            {issueWeight > 0 ? (
              <span
                className="weight-up-arrow"
                data-toggle="tooltip"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-up"></i>
              </span>
            ) : null}
            {issueWeight < 0 ? (
              <span
                className="weight-down-arrow"
                data-toggle="tooltip"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-down"></i>
              </span>
            ) : null}
            {titleParts.prefixes.map((prefix) => (
              <LegacyTitlePrefixAnchor
                active={hoveredTitlePrefix === prefix}
                key={`${issueId}-${prefix}`}
                to={titlePrefixRoute(prefix)}
                onTitlePrefixHover={onTitlePrefixHover}
                onTitlePrefixSearch={onTitlePrefixSearch}
              >
                {prefix}
              </LegacyTitlePrefixAnchor>
            ))}
            <a href={issueHref} className="title">
              {titleParts.title}
            </a>
          </div>
          <div className="infos">
            {issue.authorLabel ? (
              <a
                href={authorHref}
                className="infos-item infos-link-item"
                data-toggle="tooltip"
                data-placement="bottom"
                title={authorLoginId}
              >
                {issue.authorLabel}
              </a>
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
            <span
              className="infos-item"
              data-toggle="tooltip"
              data-placement="bottom"
              title={createdLabel}
            >
              {createdLabel}
            </span>
            <IssueSubtaskSummary
              basePath={basePath}
              issue={issue}
              ownerName={ownerName}
              projectName={projectName}
            />
            {showMilestone && issue.milestoneId ? (
              <span className="mileston-tag">
                <a
                  href={prefixBasePath(
                    basePath,
                    `/${ownerName}/${projectName}/milestone/${issue.milestoneId}`,
                  )}
                  data-toggle="tooltip"
                  data-placement="bottom"
                  title={t("milestone")}
                >
                  {issue.milestoneTitle}
                </a>
              </span>
            ) : null}
            {issue.commentCount > 0 || issue.voterCount > 0 || (issue.sharerCount ?? 0) > 0 ? (
              <span className="infos-item item-count-groups">
                {issue.commentCount > 0 ? (
                  <a href={`${issueHref}#comments`} className="comments-count comments-count-color">
                    <span className="count-groups item-icon">
                      <i className="yobicon-comment2"></i>
                    </span>
                    <span className="count-groups item-count">{issue.commentCount}</span>
                  </a>
                ) : null}
                {issue.voterCount > 0 ? (
                  <a href={`${issueHref}#vote`} className="vote-count vote-color">
                    <span className="count-groups item-icon">
                      <i className="yobicon-hearts"></i>
                    </span>
                    <span className="count-groups item-count strong">{issue.voterCount}</span>
                  </a>
                ) : null}
                {(issue.sharerCount ?? 0) > 0 ? (
                  /* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy sharerCount.scala.html renders an anchor without href. */
                  <a
                    className="sharer-color"
                    data-toggle="tooltip"
                    data-placement="bottom"
                    title={t("issue.sharer")}
                  >
                    <span className="count-groups item-icon">
                      <i className="yobicon-friends"></i>
                    </span>
                    <span className="count-groups item-count strong">{issue.sharerCount}</span>
                  </a>
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
              style={childIssueListVisible ? { display: "block" } : undefined}
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
        <div className="mt5 pull-right">
          {assigneeLoginId ? (
            <a
              href={prefixBasePath(basePath, `/${assigneeLoginId}`)}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title={`${t("issue.assignee")}: ${issue.assigneeLabel}`}
            >
              <img
                src={issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png"}
                width="32"
                height="32"
                alt={issue.assigneeLabel}
              />
            </a>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        {issue.dueDateLabel ? (
          <div
            className={`mr20 mt10 pull-right${
              issue.state === "closed" ? " darkgray-txt" : issue.dueDateOverdue ? " overdue" : ""
            }`}
            {...dueDateAttrs}
          >
            <i className="yobicon-clock2 mr3 vmiddle"></i>
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
  const issueNumber = stringField(issue.issueNumber, "");
  const issueId = stringField(issue.id, "");
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const isClosed = issue.state === "closed";
  const labels = issue.labels.slice().sort(compareIssueLabels);
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
    <div className={childClassName} onClickCapture={handleChildRowClick}>
      <span className={`state-label ${isClosed ? "closed" : "open"}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <a className="twoColumeModeTarget" href={issueHref}>
        <span className="item-name">
          <span className="subtask-number">
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{issue.title}</span>
          <span>{issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}</span>
        </span>
      </a>
      <span className="font12 no-border-at-child">
        <IssueChildCommentAndVotePair issue={issue} issueHref={issueHref} />
      </span>
      {labels.map((label) => (
        <a
          href={childLabelHref(String(label.id))}
          className="label issue-label list-label active twoColumeModeTarget"
          data-category-id={String(label.categoryId ?? "")}
          data-label-id={String(label.id)}
          key={String(label.id)}
          onClick={(event) =>
            handleChildLabelClick(event, String(label.id), childLabelHref(String(label.id)))
          }
          style={childIssueLabelStyle(label.color)}
        >
          {label.name}
        </a>
      ))}
      <span className="child-issue-date" title={issue.createdLabel}>
        {issue.createdLabel}
      </span>
    </div>
  );
}

function childIssueLabelStyle(color: string | undefined): CSSProperties | undefined {
  return color ? { background: color } : undefined;
}

function IssueChildCommentAndVotePair({
  issue,
  issueHref,
}: {
  issue: RestIssueChildItem;
  issueHref: string;
}) {
  const commentCount = numberField(issue.commentCount);
  const voterCount = numberField(issue.voterCount);
  if (!commentCount && !voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {commentCount ? (
        <a href={`${issueHref}#comments`} className="comments-count comments-count-color">
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{commentCount}</span>
        </a>
      ) : null}
      {voterCount ? (
        <a href={`${issueHref}#vote`} className="vote-count vote-color">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{voterCount}</span>
        </a>
      ) : null}
    </span>
  );
}

function IssueSubtaskSummary({
  basePath,
  issue,
  ownerName,
  projectName,
}: {
  basePath: string;
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
            }`}
          >
            <div
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span
            className={`subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""}`}
          >
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {childTotalCount}
          </span>
        </>
      ) : null}
      {parentIssueNumber ? (
        <span className="infos-item subtask">
          <a
            href={prefixBasePath(
              basePath,
              `/${ownerName}/${projectName}/issue/${parentIssueNumber}`,
            )}
          >
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </a>
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
  state: "closed" | "open";
}) {
  const { t } = useLegacyMessages();
  const pjaxFilter = { "pjax-filter": "" } as unknown as HTMLAttributes<HTMLButtonElement>;
  const allLabel = state === "closed" ? t("issue.list.all.closed") : t("issue.list.all.open");
  const allCount = countField(issues, state === "closed" ? "closedIssueCount" : "openIssueCount");

  return (
    <ul className="lst-stacked unstyled">
      <li
        className={
          !search.assigneeId && !search.authorId && !search.commenterId ? "active" : undefined
        }
      >
        <button
          {...pjaxFilter}
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
          <span className="num-badge pull-right">{allCount}</span>
        </button>
      </li>
      {!isAnonymous ? (
        <>
          <li className={search.assigneeId === currentUserId ? "active" : undefined}>
            <button
              {...pjaxFilter}
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
              <span className="num-badge pull-right">
                {countField(issues, "assignedToMeCount")}
              </span>
            </button>
          </li>
          <li className={search.authorId === currentUserId ? "active" : undefined}>
            <button
              {...pjaxFilter}
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
              <span className="num-badge pull-right">
                {countField(issues, "authoredByMeCount")}
              </span>
            </button>
          </li>
          <li className={search.commenterId === currentUserId ? "active" : undefined}>
            <button
              {...pjaxFilter}
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
              <span className="num-badge pull-right">
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
    assigneeId: stringFormValue(data, "assigneeId"),
    authorId: stringFormValue(data, "authorId"),
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
    state: stringFormValue(data, "state") === "closed" ? "closed" : "open",
  };
}

function stringFormValue(data: FormData, name: string) {
  return String(data.get(name) ?? "");
}

function isValidIssueDueDate(value: string) {
  const trimmed = value.trim();
  return trimmed === "" || !Number.isNaN(Date.parse(trimmed));
}

function YobiToast({ message, noticeKey }: { message: string; noticeKey: number }) {
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
  showCurrentUserOptions,
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
  showCurrentUserOptions: boolean;
}) {
  const { t } = useLegacyMessages();
  const [invalidDueDateNoticeKey, setInvalidDueDateNoticeKey] = useState(0);
  const authors = projectIssueSearchUserOptions(issueAuthors, issues, "author");
  const assignees = projectIssueSearchUserOptions(issueAssignees, issues, "assignee");
  const hasMilestones = milestones.open.length > 0 || milestones.closed.length > 0;
  const selectedMilestone = selectedSearchMilestone(search.milestoneId, milestones);
  const handleSubmit = (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dueDateInput = event.currentTarget.querySelector<HTMLInputElement>(
      "[data-toggle='calendar']",
    );
    if (dueDateInput && !isValidIssueDueDate(dueDateInput.value)) {
      setInvalidDueDateNoticeKey((currentKey) => currentKey + 1);
      dueDateInput.focus();
      return;
    }

    onSearchSubmit(projectIssuesSearchFromForm(event.currentTarget, search));
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
      <YobiToast noticeKey={invalidDueDateNoticeKey} message={t("issue.error.invalid.duedate")} />
      <input type="hidden" name="orderBy" value={search.orderBy} />
      <input type="hidden" name="orderDir" value={search.orderDir} />
      <input type="hidden" name="state" value={search.state} />
      <input
        type="hidden"
        name="commenterId"
        value={search.commenterId}
        data-search="commenterId"
      />
      <hr className="hide-in-mobile" />
      <div className="search">
        <div className="search-bar">
          <input
            key={search.filter}
            name="filter"
            className="textbox full"
            type="text"
            defaultValue={search.filter}
            data-search="filter"
            onBlur={(event) => submitSearchControlForm(event.currentTarget)}
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

      <div id="advanced-search-form" className="srch-advanced hide-in-mobile">
        <dl className="issue-option">
          <dt>{t("issue.author")}</dt>
          <dd>
            <select
              id="authorId"
              name="authorId"
              data-search="authorId"
              data-toggle="select2"
              data-format="user"
              data-container-css-class="fullsize"
              defaultValue={search.authorId}
              onChange={(event) => submitSearchControlForm(event.currentTarget)}
            >
              <option value="">{t("common.order.all")}</option>
              {!isAnonymous && showCurrentUserOptions ? (
                <option value={currentUserId}>{t("issue.list.authoredByMe")}</option>
              ) : null}
              {authors.map((author) => (
                <option
                  key={author.id}
                  value={author.id}
                  data-avatar-url={author.avatarUrl}
                  data-login-id={author.loginId}
                >
                  {author.label}
                </option>
              ))}
            </select>
          </dd>
        </dl>
        <dl className="issue-option">
          <dt>{t("issue.assignee")}</dt>
          <dd>
            <select
              id="assigneeId"
              name="assigneeId"
              data-search="assigneeId"
              data-toggle="select2"
              data-format="user"
              data-container-css-class="fullsize"
              defaultValue={search.assigneeId}
              onChange={(event) => submitSearchControlForm(event.currentTarget)}
            >
              <option value="">{t("common.order.all")}</option>
              <option value="0">{t("issue.noAssignee")}</option>
              {!isAnonymous && showCurrentUserOptions ? (
                <option value={currentUserId}>{t("issue.list.assignedToMe")}</option>
              ) : null}
              {assignees.map((assignee) => (
                <option
                  key={assignee.id}
                  value={assignee.id}
                  data-avatar-url={assignee.avatarUrl}
                  data-login-id={assignee.loginId}
                >
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
              <select
                id="milestoneId"
                key={[search.milestoneId, milestones.open.length, milestones.closed.length].join(
                  ":",
                )}
                name="milestoneId"
                data-search="milestoneId"
                data-toggle="select2"
                data-format="milestone"
                data-container-css-class="fullsize"
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
                    basePath={basePath}
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
              id="issueDueDate"
              type="text"
              name="dueDate"
              className="textbox full"
              defaultValue={search.dueDate}
              data-toggle="calendar"
              onBlur={(event) => submitSearchControlForm(event.currentTarget)}
            />
            <button type="button" className="search-btn btn-calendar">
              <i className="yobicon-calendar2"></i>
            </button>
          </dd>
        </dl>
        <div className="labels-wrap">
          {labelControls.showManageLink ? (
            <a
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
              className="ybtn ybtn-default ybtn-mini pull-right"
            >
              <i className="yobicon-cog vmiddle"></i>
              {labels.length === 0 ? (
                <span className="vmiddle" style={{ marginLeft: "2px" }}>
                  {t("label.manage")}
                </span>
              ) : null}
            </a>
          ) : null}
          <IssueSearchLabelSelect
            basePath={basePath}
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

function SearchMilestoneStatus({
  basePath,
  milestone,
  ownerName,
  projectName,
}: {
  basePath: string;
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
        <a
          href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestone/${milestoneId}`)}
          className="title"
        >
          {stringField(milestone.title, "")}
        </a>
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
          <div className="bar" style={{ width: `${completionPercent}%` }}></div>
        </div>
        <div className="progress-info">
          <span className="pull-right">
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
  basePath,
  labels,
  ownerName,
  projectName,
  search,
  showLabelEdit,
}: {
  basePath: string;
  labels: Array<Record<string, unknown>>;
  ownerName: string;
  projectName: string;
  search: ProjectIssuesSearch;
  showLabelEdit: boolean;
}) {
  const { t } = useLegacyMessages();
  const groupedLabels = groupProjectLabels(labels);

  if (groupedLabels.length === 0) {
    return null;
  }

  return (
    <dl className="issue-option">
      <dt>
        {t("label")}{" "}
        {showLabelEdit ? (
          <a
            href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
            target="_blank"
            className="label-edit"
            rel="noreferrer"
          >
            [{t("button.edit")}]
          </a>
        ) : null}
      </dt>
      <dd>
        <select
          id="labelIds"
          name="labelIds"
          multiple
          data-search="labelIds"
          data-toggle="select2"
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder={t("label.select")}
          className="hide"
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
  onStateChange,
  state,
}: {
  active: boolean;
  count: number;
  label: string;
  onStateChange: (state: "closed" | "open") => void;
  state: "closed" | "open";
}) {
  const legacyState = {
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      onStateChange(state);
    },
    state,
  } as unknown as HTMLAttributes<HTMLButtonElement>;
  const dataPjax = { "data-pjax": "" } as unknown as HTMLAttributes<HTMLLIElement>;

  return (
    <li className={active ? "active" : undefined} {...dataPjax}>
      <button type="button" {...legacyState}>
        {label}
        <span className="num-badge">{count}</span>
      </button>
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

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      data-content={t("common.two.column.mode.desc")}
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

  return (
    <div
      className="show-subtasks mr10"
      id="two-column-mode-checkbox"
      data-toggle="popover"
      data-trigger="hover"
      data-placement="top"
      title={t("common.show.subtasks")}
      data-content={t("common.show.subtasks.desc")}
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
    </div>
  );
}

function IssueListKeymap({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const ctrlKey = isMac ? "⌘" : "CTRL";
  const showPullRequest = stringField((project as Record<string, unknown>).vcs, "GIT") === "GIT";
  const showProjectSetting = projectMemberControlsEnabled(project);

  return (
    <div className="pull-left" style={{ padding: "10px 0", marginLeft: "55px" }}>
      <button
        type="button"
        data-toggle="modal"
        data-target="#helpKeys"
        className="ybtn ybtn-inverse ybtn-mini"
      >
        {t("title.keymap")}
      </button>
      <div id="helpKeys" className="modal hide fade keymap-help" tabIndex={-1} role="dialog">
        <div className="row-fluid">
          <div className="span3">
            <h5>{t("project.projects")}</h5>
            <KeymapEntry keys={["H"]} label={t("menu.home")} />
            <KeymapEntry keys={["B"]} label={t("menu.board")} />
            <KeymapEntry keys={["I"]} label={t("menu.issue")} />
            <KeymapEntry keys={["C"]} label={t("menu.code")} />
            <KeymapEntry keys={["M"]} label={t("milestone")} />
            {showPullRequest ? <KeymapEntry keys={["P"]} label={t("menu.pullRequest")} /> : null}
            {showProjectSetting ? <KeymapEntry keys={["Q"]} label={t("project.setting")} /> : null}
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
          <button type="button" className="ybtn ybtn-info" data-dismiss="modal">
            {t("button.confirm")}
          </button>
        </p>
      </div>
    </div>
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
      (name === "state" && value === "open")
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
      avatarUrl: stringField(
        item.avatarUrl,
        fallback?.avatarUrl ?? "/assets/images/default-avatar-32.png",
      ),
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
        avatarUrl: stringField(item.avatarUrl, "/assets/images/default-avatar-32.png"),
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
      avatarUrl: stringField(issue.assigneeAvatarUrl, "/assets/images/default-avatar-32.png"),
      id: stringField((issue as Record<string, unknown>).assigneeUserId, ""),
      label: stringField(issue.assigneeLabel, ""),
      loginId: stringField(issue.assigneeLoginId, ""),
    });
    addUser(users, {
      avatarUrl: stringField(issue.authorAvatarUrl, "/assets/images/default-avatar-32.png"),
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
            avatarUrl: stringField(issue.assigneeAvatarUrl, "/assets/images/default-avatar-32.png"),
            id: stringField((issue as Record<string, unknown>).assigneeUserId, ""),
            label: stringField(issue.assigneeLabel, ""),
            loginId: stringField(issue.assigneeLoginId, ""),
          }
        : {
            avatarUrl: stringField(issue.authorAvatarUrl, "/assets/images/default-avatar-32.png"),
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

function LegacyTitlePrefixAnchor({
  active,
  children,
  onTitlePrefixHover,
  onTitlePrefixSearch,
  to,
}: {
  active: boolean;
  children: string;
  onTitlePrefixHover: (prefix: string) => void;
  onTitlePrefixSearch: (filter: string) => void;
  to: string;
}) {
  const submitTitlePrefixSearch = (event: ReactMouseEvent) => {
    event.preventDefault();
    onTitlePrefixSearch(children);
  };
  return (
    <Link
      activeProps={{ className: undefined }}
      className={active ? "title-prefix title-prefix-hover" : "title-prefix"}
      to={to}
      onClick={submitTitlePrefixSearch}
      onMouseEnter={() => onTitlePrefixHover(children)}
      onMouseLeave={() => onTitlePrefixHover("")}
    >
      {children}
    </Link>
  );
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
