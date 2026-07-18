import { useQuery } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  type ChangeEvent,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { currentSessionQueryOptions } from "../../../api/session";
import {
  listOrganizationIssues,
  type OrganizationIssueListRestResponse,
  type RestIssueListItem,
} from "../../../auth-workspace-client";
import { apiQueryKeys } from "../../../api/query-keys";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { styles } from "./-organization-issues.stylex";

type OrganizationIssuesSearch = {
  assigneeId: string;
  authorId: string;
  filter: string;
  mentionId: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  preservedParams?: [string, string][];
  projectNames: string[];
  state: "closed" | "open";
};

type LegacyStateTabAttrs = { state: OrganizationIssuesSearch["state"] };
type LegacySortFilterAttrs = {
  orderby: string;
  orderdir: string;
};
type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };

export const Route = createFileRoute("/organizations/$organizationName/issues")({
  component: OrganizationIssuesRoute,
  validateSearch(search: Record<string, unknown>): OrganizationIssuesSearch {
    return {
      assigneeId: stringSearch(search.assigneeId),
      authorId: stringSearch(search.authorId),
      filter: stringSearch(search.filter),
      mentionId: stringSearch(search.mentionId),
      orderBy: stringSearch(search.orderBy, "createdDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
      projectNames: arraySearch(search.projectNames ?? search["projectNames[]"]),
      state: stringSearch(search.state, "open") === "closed" ? "closed" : "open",
    };
  },
});

function OrganizationIssuesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationIssuesScreen runtimeConfig={runtimeConfig} />;
}

function OrganizationIssuesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const location = useLocation();
  const search = organizationIssuesSearchFromString(location.searchStr);
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const issuesQuery = useQuery({
    queryFn: () =>
      listOrganizationIssues(runtimeConfig, organizationName, {
        assigneeId: idSearch(search.assigneeId),
        authorId: idSearch(search.authorId),
        filter: search.filter,
        mentionId: idSearch(search.mentionId),
        orderBy: search.orderBy,
        orderDir: search.orderDir,
        pageNum: search.pageNum,
        projectNames: search.projectNames,
        state: search.state,
      }),
    queryKey: [
      ...apiQueryKeys.organization.base(organizationName),
      "issues",
      search.assigneeId,
      search.authorId,
      search.filter,
      search.mentionId,
      search.orderBy,
      search.orderDir,
      search.pageNum,
      search.projectNames.join("\u0000"),
      search.state,
    ],
  });

  if (!issuesQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <OrganizationIssuesBody
      currentUserId={stringField(sessionQuery.data.actorId, "")}
      isAnonymous={Boolean(sessionQuery.data.isAnonymous)}
      issues={issuesQuery.data}
      organizationName={organizationName}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

function OrganizationIssuesBody({
  currentUserId,
  isAnonymous,
  issues,
  organizationName: routeOrganizationName,
  runtimeConfig,
  search,
}: {
  currentUserId: string;
  isAnonymous: boolean;
  issues: OrganizationIssueListRestResponse;
  organizationName: string;
  runtimeConfig: RuntimeConfig;
  search: OrganizationIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const organizationName = stringField(issues.organizationName, routeOrganizationName);
  const hasIssues = issues.items.length > 0;

  const navigateToSearch = (
    event: MouseEvent<HTMLButtonElement>,
    nextSearch: OrganizationIssuesSearch,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    void navigate({ to: organizationIssuesRoutePath(organizationName, nextSearch) });
  };
  const submitSearchForm = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    void navigate({
      to: organizationIssuesRoutePath(organizationName, {
        ...search,
        assigneeId: stringFormValue(formData, "assigneeId"),
        authorId: stringFormValue(formData, "authorId"),
        filter: stringFormValue(formData, "filter"),
        mentionId: stringFormValue(formData, "mentionId"),
        orderBy: stringFormValue(formData, "orderBy", "createdDate"),
        orderDir: stringFormValue(formData, "orderDir", "desc"),
        pageNum: 1,
        projectNames: formData
          .getAll("projectNames[]")
          .filter((value): value is string => typeof value === "string"),
        state: stringFormValue(formData, "state") === "closed" ? "closed" : "open",
      }),
    });
  };
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearchForm(event.currentTarget);
  };
  const handleProjectsChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (event.currentTarget.form) {
      submitSearchForm(event.currentTarget.form);
    }
  };
  const handleQuickSearch = (
    event: MouseEvent<HTMLButtonElement>,
    {
      assigneeId,
      authorId,
      mentionId,
    }: {
      assigneeId: string;
      authorId: string;
      mentionId: string;
    },
  ) => {
    navigateToSearch(event, {
      ...search,
      assigneeId,
      authorId,
      mentionId,
      pageNum: 1,
    });
  };
  const handleStateChange = (event: MouseEvent<HTMLButtonElement>, state: "closed" | "open") => {
    navigateToSearch(event, {
      ...search,
      pageNum: 1,
      state,
    });
  };
  const handleSortChange = (
    event: MouseEvent<HTMLButtonElement>,
    orderBy: string,
    orderDir: string,
  ) => {
    navigateToSearch(event, {
      ...search,
      orderBy,
      orderDir,
      pageNum: 1,
    });
  };

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-stylex-owner="organization-issues-page">
        <div {...stylex.props(styles.page)} data-stylex-owner="organization-issues-wrap">
          <div className="row-fluid issue-list-wrap" data-stylex-owner="organization-issues-list">
            <div className="left-menu span2 span-hard-wrap">
              <div className="inner advanced">
                <QuickSearch
                  currentUserId={currentUserId}
                  isAnonymous={isAnonymous}
                  onQuickSearch={handleQuickSearch}
                  search={search}
                />
                <form
                  className={stylex.props(styles.search).className}
                  data-stylex-owner="organization-issues-search"
                  id="search"
                  name="search"
                  action={prefixBasePath(
                    runtimeConfig.basePath,
                    `/organizations/${organizationName}/issues`,
                  )}
                  method="get"
                  onSubmit={handleSearchSubmit}
                >
                  <select
                    id="projects"
                    name="projectNames[]"
                    multiple
                    {...stylex.props(styles.projectSelect)}
                    data-stylex-owner="organization-issues-project-select"
                    data-placeholder={t("organization.choose.projects")}
                    data-container-css-class="fullsize"
                    defaultValue={search.projectNames}
                    onChange={handleProjectsChange}
                  >
                    {issues.visibleProjects.map((project) => (
                      <option value={project.projectName} key={project.projectName}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                  <hr />
                  <input type="hidden" name="orderBy" value={search.orderBy} />
                  <input type="hidden" name="orderDir" value={search.orderDir} />
                  <input type="hidden" name="state" value={search.state} />
                  <input type="hidden" name="authorId" value={search.authorId} />
                  <input type="hidden" name="assigneeId" value={search.assigneeId} />
                  <input type="hidden" name="mentionId" value={search.mentionId} />
                  <div className="search">
                    <div
                      {...stylex.props(styles.searchBar)}
                      data-stylex-owner="organization-issues-search-bar"
                    >
                      <input
                        name="filter"
                        {...stylex.props(styles.searchInput)}
                        data-stylex-owner="organization-issues-search-input"
                        type="text"
                        defaultValue={search.filter}
                      />
                      <button
                        {...stylex.props(styles.searchButton)}
                        data-stylex-owner="organization-issues-search-button"
                        type="submit"
                      >
                        <i className="yobicon-search"></i>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            <div
              className="span10 span-hard-wrap"
              id="span10"
              data-stylex-owner="organization-issues-results"
            >
              <ul {...stylex.props(styles.tabs)} data-stylex-owner="organization-issues-tabs">
                <StateTab
                  active={search.state === "open"}
                  count={issues.openIssueCount}
                  label={t("issue.state.open")}
                  onStateChange={handleStateChange}
                  state="open"
                />
                <StateTab
                  active={search.state === "closed"}
                  count={issues.closedIssueCount}
                  label={t("issue.state.closed")}
                  onStateChange={handleStateChange}
                  state="closed"
                />
                <li>
                  <TwoColumnModeCheckbox />
                </li>
              </ul>
              {hasIssues ? (
                <>
                  {issues.items.length > 1 ? (
                    <IssueFilters
                      onSortChange={handleSortChange}
                      orderBy={search.orderBy}
                      orderDir={search.orderDir}
                    />
                  ) : null}
                  <ul
                    {...stylex.props(styles.list)}
                    className={`${stylex.props(styles.list).className} post-list-wrap`}
                    data-stylex-owner="organization-issues-items"
                  >
                    {issues.items.map((issue) => (
                      <OrganizationIssueItem
                        basePath={runtimeConfig.basePath}
                        issue={issue}
                        key={
                          issue.id || `${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`
                        }
                        state={search.state}
                      />
                    ))}
                  </ul>
                  <OrganizationIssuePagination
                    currentPage={search.pageNum}
                    organizationName={organizationName}
                    search={search}
                    totalPages={totalPages(issues)}
                  />
                </>
              ) : (
                <div
                  {...stylex.props(styles.empty)}
                  className={`${stylex.props(styles.empty).className} error-wrap`}
                  data-stylex-owner="organization-issues-empty"
                >
                  <i className="ico ico-err1"></i>
                  <p>{t("issue.is.empty")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickSearch({
  currentUserId,
  isAnonymous,
  onQuickSearch,
  search,
}: {
  currentUserId: string;
  isAnonymous: boolean;
  onQuickSearch: (
    event: MouseEvent<HTMLButtonElement>,
    filters: { assigneeId: string; authorId: string; mentionId: string },
  ) => void;
  search: OrganizationIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const projectNames = search.projectNames.join(",");

  return (
    <ul
      {...stylex.props(styles.quickSearch)}
      className={`${stylex.props(styles.quickSearch).className} lst-stacked unstyled`}
      data-stylex-owner="organization-issues-quick-search"
    >
      <li className={!search.assigneeId && !search.authorId && !search.mentionId ? "active" : ""}>
        <button
          type="button"
          data-assignee-id=""
          data-author-id=""
          data-mention-id=""
          data-project-names={projectNames}
          data-milestone-id=""
          onClick={(event) => onQuickSearch(event, { assigneeId: "", authorId: "", mentionId: "" })}
        >
          {t("issue.list.all")}
        </button>
      </li>
      {!isAnonymous ? (
        <>
          <li className={search.assigneeId === currentUserId ? "active" : ""}>
            <button
              type="button"
              data-author-id=""
              data-assignee-id={currentUserId}
              data-project-names={projectNames}
              data-milestone-id=""
              data-mention-id=""
              onClick={(event) =>
                onQuickSearch(event, { assigneeId: currentUserId, authorId: "", mentionId: "" })
              }
            >
              {t("issue.list.assignedToMe")}
            </button>
          </li>
          <li className={search.authorId === currentUserId ? "active" : ""}>
            <button
              type="button"
              data-author-id={currentUserId}
              data-assignee-id=""
              data-milestone-id=""
              data-project-names={projectNames}
              data-mention-id=""
              onClick={(event) =>
                onQuickSearch(event, { assigneeId: "", authorId: currentUserId, mentionId: "" })
              }
            >
              {t("issue.list.authoredByMe")}
            </button>
          </li>
          <li className={search.mentionId === currentUserId ? "active" : ""}>
            <button
              type="button"
              data-author-id=""
              data-assignee-id=""
              data-milestone-id=""
              data-project-names={projectNames}
              data-mention-id={currentUserId}
              onClick={(event) =>
                onQuickSearch(event, { assigneeId: "", authorId: "", mentionId: currentUserId })
              }
            >
              {t("issue.list.mentionedOfMe")}
            </button>
          </li>
        </>
      ) : null}
    </ul>
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
  onStateChange: (event: MouseEvent<HTMLButtonElement>, state: "closed" | "open") => void;
  state: "closed" | "open";
}) {
  const legacyTabStateAttrs = { state } satisfies LegacyStateTabAttrs;

  return (
    <li className={active ? "active" : ""}>
      <button
        type="button"
        {...legacyTabStateAttrs}
        onClick={(event) => onStateChange(event, state)}
      >
        {label}
        <span className="num-badge">{count}</span>
      </button>
    </li>
  );
}

function IssueFilters({
  onSortChange,
  orderBy,
  orderDir,
}: {
  onSortChange: (event: MouseEvent<HTMLButtonElement>, orderBy: string, orderDir: string) => void;
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
    <div className="filter-wrap small-heights">
      <div className="filters pull-right">
        {filters.map((filter) => {
          const active = orderBy === filter.field;
          const nextDir = active && orderDir === "desc" ? "asc" : "desc";
          const legacySort = {
            orderby: filter.field,
            orderdir: active ? nextDir : "desc",
          } satisfies LegacySortFilterAttrs;
          return (
            <button
              type="button"
              {...legacySort}
              className={active ? "filter active" : "filter"}
              key={filter.field}
              onClick={(event) => onSortChange(event, filter.field, legacySort.orderdir)}
            >
              <i
                className={`ico btn-gray-arrow${!active || orderDir === "desc" ? " down" : ""}`}
              ></i>
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrganizationIssuePagination({
  currentPage,
  organizationName,
  search,
  totalPages,
}: {
  currentPage: number;
  organizationName: string;
  search: OrganizationIssuesSearch;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  if (totalPages <= 0) {
    return <div id="pagination" data-total={totalPages}></div>;
  }

  const pageNum = clampPageNum(currentPage, totalPages);
  const hasPrev = pageNum > 1;
  const hasNext = pageNum < totalPages;
  const pageRoutePath = (nextPageNum: number) =>
    organizationIssuesRoutePath(organizationName, {
      ...search,
      pageNum: nextPageNum,
    });
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(pageNum);
      return;
    }
    const nextPageNum = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(nextPageNum);
    void navigate({ to: pageRoutePath(nextPageNum) });
  };

  return (
    <div
      {...stylex.props(styles.pagination)}
      id="pagination"
      className={`${stylex.props(styles.pagination).className} page-navigation-wrap`}
      data-stylex-owner="organization-issues-pagination"
      data-total={totalPages}
    >
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={pageRoutePath(pageNum - 1)}
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
            type="number"
            pattern="[0-9]*"
            className="input-mini nospinner"
            name="pageNum"
            max={totalPages}
            min={1}
            defaultValue={pageNum}
            key={pageNum}
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
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={pageRoutePath(pageNum + 1)}
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

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function OrganizationIssueItem({
  basePath,
  issue,
  state,
}: {
  basePath: string;
  issue: RestIssueListItem;
  state: string;
}) {
  const { t } = useLegacyMessages();
  const projectRoutePath = `/${issue.ownerName}/${issue.projectName}`;
  const issueRoutePath = `${projectRoutePath}/issue/${issue.issueNumber}`;
  const authorRoutePath = `/${issue.authorLoginId}`;
  const assigneeRoutePath = `/${issue.assigneeLoginId}`;
  const issueHref = prefixBasePath(basePath, issueRoutePath);
  const createdLabel = stringField(issue.createdLabel, issue.updatedLabel);
  const legacyIssueRowAttrs = { href: issueHref } satisfies LegacyIssueRowAttributes;

  return (
    <li
      {...stylex.props(styles.row)}
      className={`${stylex.props(styles.row).className} post-item title`}
      data-stylex-owner="organization-issues-row"
      id={`issue-item-${issue.id}`}
      {...legacyIssueRowAttrs}
    >
      <div className="span10 span-hard-wrap">
        <Link
          to={authorRoutePath}
          className="avatar-wrap mlarge hide-in-mobile"
          title={issue.authorLoginId}
        >
          <img src={issue.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
        </Link>
        <div className="title-wrap">
          <Link to={issueRoutePath} className="title">
            {issue.title}
          </Link>
        </div>
        <div
          {...stylex.props(styles.meta)}
          className={`${stylex.props(styles.meta).className} infos`}
          data-stylex-owner="organization-issues-row-meta"
        >
          {issue.authorLabel ? (
            <Link
              to={authorRoutePath}
              className="infos-item infos-link-item"
              title={issue.authorLoginId}
            >
              {issue.authorLabel}
            </Link>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={createdLabel}>
            {createdLabel}
          </span>
          {issue.milestoneId ? (
            <span className="infos-item mileston-tag">
              <Link
                to="/$ownerName/$projectName/milestone/$milestoneId"
                params={{
                  ownerName: issue.ownerName,
                  projectName: issue.projectName,
                  milestoneId: String(issue.milestoneId),
                }}
                search={{ state: "open" }}
                title={t("milestone")}
              >
                {issue.milestoneTitle}
              </Link>
            </span>
          ) : null}
          {issue.commentCount > 0 || issue.voterCount > 0 ? (
            <span className="infos-item item-count-groups">
              {issue.commentCount > 0 ? (
                <Link to={issueRoutePath} hash="comments">
                  <span className="count-groups item-icon ">
                    <i className="yobicon-comments"></i>
                  </span>
                  <span className="count-groups item-count ">{issue.commentCount}</span>
                </Link>
              ) : null}
              {issue.voterCount > 0 ? (
                <Link to={issueRoutePath} hash="vote">
                  <span className="count-groups item-icon strong">
                    <i className="yobicon-hearts"></i>
                  </span>
                  <span className="count-groups item-count strong">{issue.voterCount}</span>
                </Link>
              ) : null}
            </span>
          ) : null}
          <Link to={projectRoutePath} className="infos-link-item group-project-name">
            {issue.projectName}
          </Link>
          <span className="post-id margin-right-5">#{issue.issueNumber}</span>
          {issue.labels.map((label) => (
            <Link
              to="/$ownerName/$projectName/issues"
              params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
              search={{
                assigneeId: "",
                authorId: "",
                commenterId: "",
                dueDate: "",
                filter: "",
                labelIds: [String(label.id)],
                milestoneId: "",
                orderBy: "updatedDate",
                orderDir: "desc",
                pageNum: 1,
                state: state === "closed" ? "closed" : "open",
              }}
              {...stylex.props(styles.issueLabelBackground(label.color))}
              className={`${stylex.props(styles.issueLabelBackground(label.color)).className} label issue-label list-label`}
              data-label-id={label.id}
              key={String(label.id)}
            >
              {label.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right">
          {issue.assigneeLoginId ? (
            <Link
              to={assigneeRoutePath}
              className="avatar-wrap assinee"
              title={`${t("issue.assignee")}: ${issue.assigneeLabel}`}
            >
              <img
                src={issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png"}
                width="32"
                height="32"
                alt={issue.assigneeLabel}
              />
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        {issue.dueDateLabel ? (
          <div
            className={`mr20 mt10 pull-right${issue.dueDateOverdue ? " overdue" : ""}`}
            title={issue.dueDateLabel}
          >
            <i className="yobicon-clock2"></i>
            {issue.state === "open" && issue.dueDateOverdue
              ? t("issue.dueDate.overdue")
              : issue.dueDateLabel}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function TwoColumnModeCheckbox() {
  const { t } = useLegacyMessages();
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [showPopover, setShowPopover] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPopoverTimers = () => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const showDelayedPopover = () => {
    clearPopoverTimers();
    showTimerRef.current = setTimeout(() => setShowPopover(true), 100);
  };
  const hideDelayedPopover = () => {
    clearPopoverTimers();
    hideTimerRef.current = setTimeout(() => setShowPopover(false), 100);
  };

  useEffect(() => clearPopoverTimers, []);

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      onBlur={hideDelayedPopover}
      onFocus={showDelayedPopover}
      onMouseEnter={showDelayedPopover}
      onMouseLeave={hideDelayedPopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
      <label className="checkbox">
        <div className="two-column-icon-border">
          <input
            id="two-column-mode"
            type="checkbox"
            checked={useTwoColumnMode}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              localStorage.setItem("useTwoColumnMode", String(checked));
              setUseTwoColumnMode(checked);
            }}
          />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
      {showPopover ? (
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

function OrganizationHeader({
  logoUrl,
  organizationName,
}: {
  logoUrl: string;
  organizationName: string;
}) {
  return (
    <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
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
  active: "issues";
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
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={{}}
              to="/organizations/$organizationName"
              params={{ organizationName }}
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className={active === "issues" ? "active" : ""}>
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
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
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
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
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
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

function totalPages(issues: OrganizationIssueListRestResponse) {
  if (typeof issues.totalPages === "number") {
    return issues.totalPages;
  }
  const pageSize = Number(issues.pageSize) || 20;
  return Math.max(1, Math.ceil((Number(issues.totalCount) || 0) / pageSize));
}

function organizationIssuesSearchFromString(searchString: string) {
  const search = new URLSearchParams(searchString);
  return {
    assigneeId: stringSearch(search.get("assigneeId")),
    authorId: stringSearch(search.get("authorId")),
    filter: stringSearch(search.get("filter")),
    mentionId: stringSearch(search.get("mentionId")),
    orderBy: stringSearch(search.get("orderBy"), "createdDate"),
    orderDir: stringSearch(search.get("orderDir"), "desc"),
    pageNum: Number(search.get("pageNum")) || 1,
    preservedParams: preservedSearchEntries(search),
    projectNames: [...search.getAll("projectNames"), ...search.getAll("projectNames[]")].filter(
      (projectName) => projectName !== "[]",
    ),
    state: stringSearch(search.get("state"), "open") === "closed" ? "closed" : "open",
  } satisfies OrganizationIssuesSearch;
}

function organizationIssuesRoutePath(organizationName: string, search: OrganizationIssuesSearch) {
  const params = new URLSearchParams([
    ...(search.preservedParams ?? []),
    ...optionalSearchEntries({
      assigneeId: search.assigneeId,
      authorId: search.authorId,
      filter: search.filter,
      mentionId: search.mentionId,
      orderBy: search.orderBy,
      orderDir: search.orderDir,
    }),
    ["pageNum", String(search.pageNum)],
    ...search.projectNames.map((projectName): [string, string] => ["projectNames[]", projectName]),
    ["state", search.state],
  ]);

  return `/organizations/${organizationName}/issues?${params.toString()}`;
}

function preservedSearchEntries(search: URLSearchParams) {
  return [...search.entries()].filter(([key]) => !knownOrganizationIssueSearchParams.has(key));
}

const knownOrganizationIssueSearchParams = new Set([
  "assigneeId",
  "authorId",
  "filter",
  "mentionId",
  "orderBy",
  "orderDir",
  "pageNum",
  "projectNames",
  "projectNames[]",
  "state",
]);

function optionalSearchEntries(values: Record<string, string>) {
  return Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== "");
}

function stringFormValue(formData: FormData, name: string, fallback = "") {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

function stringSearch(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arraySearch(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function idSearch(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
