import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { currentSessionQueryOptions } from "../../../api/session";
import type { OrganizationContainer } from "../../../api/types";
import {
  listOrganizationIssues,
  type OrganizationIssueListRestResponse,
  type RestIssueListItem,
} from "../../../auth-workspace-client";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

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

type LegacyPjaxFilterAttrs = { "pjax-filter": "" };
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

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrganizationIssuesScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationIssuesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const location = useLocation();
  const search = organizationIssuesSearchFromString(location.searchStr);
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });
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

  if (!organizationQuery.data || !issuesQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <SiteLayoutShell
      projectSearchScope={{ organizationName }}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      <OrganizationIssuesBody
        currentUserId={stringField(sessionQuery.data.actorId, "")}
        isAnonymous={Boolean(sessionQuery.data.isAnonymous)}
        issues={issuesQuery.data}
        organization={organizationQuery.data}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </SiteLayoutShell>
  );
}

function OrganizationIssuesBody({
  currentUserId,
  isAnonymous,
  issues,
  organization,
  runtimeConfig,
  search,
}: {
  currentUserId: string;
  isAnonymous: boolean;
  issues: OrganizationIssueListRestResponse;
  organization: OrganizationContainer;
  runtimeConfig: RuntimeConfig;
  search: OrganizationIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();
  const organizationName = stringField(organization.organizationName, issues.organizationName);
  const logoUrl = stringField(organization.logoUrl, "") || "/assets/images/group_default.png";
  const legacyPjaxRootAttrs = { "pjax-container": "" } satisfies HTMLAttributes<HTMLDivElement> & {
    "pjax-container": string;
  };
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
      <OrganizationHeader logoUrl={logoUrl} organizationName={organizationName} />
      <OrganizationMenu
        active="issues"
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <div {...legacyPjaxRootAttrs} className="row-fluid issue-list-wrap">
            <div className="left-menu span2 span-hard-wrap">
              <div className="inner advanced">
                <QuickSearch
                  currentUserId={currentUserId}
                  isAnonymous={isAnonymous}
                  onQuickSearch={handleQuickSearch}
                  search={search}
                />
                <form
                  id="search"
                  name="search"
                  action={prefixBasePath(
                    runtimeConfig.basePath,
                    `/organizations/${organizationName}/issues`,
                  )}
                  method="get"
                >
                  <select
                    id="projects"
                    name="projectNames[]"
                    multiple
                    data-placeholder={t("organization.choose.projects")}
                    data-toggle="select2"
                    data-container-css-class="fullsize"
                    defaultValue={search.projectNames}
                  >
                    {issues.visibleProjects.map((project) => (
                      <option
                        value={project.projectName}
                        data-avatar-url="/assets/images/project_default_logo.png"
                        key={project.projectName}
                      >
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                  <hr />
                  <input type="hidden" name="orderBy" value={search.orderBy} />
                  <input type="hidden" name="orderDir" value={search.orderDir} />
                  <input type="hidden" name="state" value={search.state} />
                  <input
                    type="hidden"
                    name="authorId"
                    value={search.authorId}
                    data-search="authorId"
                  />
                  <input
                    type="hidden"
                    name="assigneeId"
                    value={search.assigneeId}
                    data-search="assigneeId"
                  />
                  <input
                    type="hidden"
                    name="mentionId"
                    value={search.mentionId}
                    data-search="mentionId"
                  />
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
                </form>
              </div>
            </div>
            <div className="span10 span-hard-wrap" id="span10">
              <ul className="nav nav-tabs nm">
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
                  <ul className="post-list-wrap">
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
                <div className="error-wrap">
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
  const legacyQuickSearchAttrs = { "pjax-filter": "" } satisfies LegacyPjaxFilterAttrs;
  const projectNames = search.projectNames.join(",");

  return (
    <ul className="lst-stacked unstyled">
      <li className={!search.assigneeId && !search.authorId && !search.mentionId ? "active" : ""}>
        <button
          {...legacyQuickSearchAttrs}
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
              {...legacyQuickSearchAttrs}
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
              {...legacyQuickSearchAttrs}
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
              {...legacyQuickSearchAttrs}
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
    <div id="pagination" className="page-navigation-wrap" data-total={totalPages}>
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
    <li className="post-item title" id={`issue-item-${issue.id}`} {...legacyIssueRowAttrs}>
      <div className="span10 span-hard-wrap">
        <Link
          to={authorRoutePath}
          className="avatar-wrap mlarge hide-in-mobile"
          data-toggle="tooltip"
          data-placement="top"
          title={issue.authorLoginId}
        >
          <img src={issue.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
        </Link>
        <div className="title-wrap">
          <Link to={issueRoutePath} className="title">
            {issue.title}
          </Link>
        </div>
        <div className="infos">
          {issue.authorLabel ? (
            <Link
              to={authorRoutePath}
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
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
                to={`${projectRoutePath}/milestone/${issue.milestoneId}`}
                data-toggle="tooltip"
                data-placement="top"
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
              to={`${projectRoutePath}/issues?state=${state}&labelIds=${label.id}`}
              className="label issue-label list-label"
              data-label-id={label.id}
              style={{ background: label.color }}
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
            </Link>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        {issue.dueDateLabel ? (
          <div
            className={`mr20 mt10 pull-right${issue.dueDateOverdue ? " overdue" : ""}`}
            data-toggle="tooltip"
            data-placement="top"
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
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
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
                  to={`/organizations/${organizationName}`}
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
              to={`/organizations/${organizationName}`}
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
              search={{}}
              to={`/organizations/${organizationName}/issues`}
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
              search={{}}
              to={`/organizations/${organizationName}/boards`}
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
              search={{}}
              to={`/organizations/${organizationName}/pullrequests`}
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
                  search={{}}
                  to={`/organizations/${organizationName}/settingform`}
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

function booleanField(value: unknown) {
  return value === true;
}
