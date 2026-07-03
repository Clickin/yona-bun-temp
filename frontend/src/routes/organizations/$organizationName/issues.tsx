import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { HTMLAttributes, LiHTMLAttributes, ReactNode } from "react";
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
  projectNames: string[];
  state: "closed" | "open";
};

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
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationIssuesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationIssuesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();
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
    <OrganizationIssuesBody
      currentUserId={stringField(sessionQuery.data.actorId, "")}
      issues={issuesQuery.data}
      organization={organizationQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

function OrganizationIssuesBody({
  currentUserId,
  issues,
  organization,
  runtimeConfig,
  search,
}: {
  currentUserId: string;
  issues: OrganizationIssueListRestResponse;
  organization: OrganizationContainer;
  runtimeConfig: RuntimeConfig;
  search: OrganizationIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const organizationName = stringField(organization.organizationName, issues.organizationName);
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const hasIssues = issues.items.length > 0;

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        active="issues"
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <div {...pjaxContainer} className="row-fluid issue-list-wrap">
            <div className="left-menu span2 span-hard-wrap">
              <div className="inner advanced">
                <QuickSearch currentUserId={currentUserId} search={search} />
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
                  state="open"
                />
                <StateTab
                  active={search.state === "closed"}
                  count={issues.closedIssueCount}
                  label={t("issue.state.closed")}
                  state="closed"
                />
                <li>
                  <TwoColumnModeCheckbox />
                </li>
              </ul>
              {hasIssues ? (
                <>
                  {issues.items.length > 1 ? (
                    <IssueFilters orderBy={search.orderBy} orderDir={search.orderDir} />
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
                  <div id="pagination" data-total={totalPages(issues)}></div>
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
  search,
}: {
  currentUserId: string;
  search: OrganizationIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const pjaxFilter: Record<"pjax-filter", string> = { "pjax-filter": "" };
  const projectNames = search.projectNames.join(",");

  return (
    <ul className="lst-stacked unstyled">
      <li className={!search.assigneeId && !search.authorId && !search.mentionId ? "active" : ""}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter data attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-assignee-id=""
          data-author-id=""
          data-mention-id=""
          data-project-names={projectNames}
          data-milestone-id=""
        >
          {t("issue.list.all")}
        </a>
      </li>
      <li className={search.assigneeId === currentUserId ? "active" : ""}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter data attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-author-id=""
          data-assignee-id={currentUserId}
          data-project-names={projectNames}
          data-milestone-id=""
          data-mention-id=""
        >
          {t("issue.list.assignedToMe")}
        </a>
      </li>
      <li className={search.authorId === currentUserId ? "active" : ""}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter data attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-author-id={currentUserId}
          data-assignee-id=""
          data-milestone-id=""
          data-project-names={projectNames}
          data-mention-id=""
        >
          {t("issue.list.authoredByMe")}
        </a>
      </li>
      <li className={search.mentionId === currentUserId ? "active" : ""}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter data attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-author-id=""
          data-assignee-id=""
          data-milestone-id=""
          data-project-names={projectNames}
          data-mention-id={currentUserId}
        >
          {t("issue.list.mentionedOfMe")}
        </a>
      </li>
    </ul>
  );
}

function StateTab({
  active,
  count,
  label,
  state,
}: {
  active: boolean;
  count: number;
  label: string;
  state: "closed" | "open";
}) {
  const legacyState: Record<"state", string> = { state };

  return (
    <li className={active ? "active" : ""}>
      {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus state attr. */}
      <a href="#" {...legacyState}>
        {label}
        <span className="num-badge">{count}</span>
      </a>
    </li>
  );
}

function IssueFilters({ orderBy, orderDir }: { orderBy: string; orderDir: string }) {
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
            orderBy: filter.field,
            orderDir: active ? nextDir : "desc",
          } satisfies Record<"orderBy" | "orderDir", string>;
          return (
            /* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy sort filters use href="#" plus order attrs. */
            <a
              href="#"
              {...legacySort}
              className={active ? "filter active" : "filter"}
              key={filter.field}
            >
              <i
                className={`ico btn-gray-arrow${!active || orderDir === "desc" ? " down" : ""}`}
              ></i>
              {filter.label}
            </a>
          );
        })}
      </div>
    </div>
  );
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
  const projectHref = prefixBasePath(basePath, `/${issue.ownerName}/${issue.projectName}`);
  const issueHref = `${projectHref}/issue/${issue.issueNumber}`;
  const authorHref = prefixBasePath(basePath, `/${issue.authorLoginId}`);
  const assigneeHref = prefixBasePath(basePath, `/${issue.assigneeLoginId}`);
  const createdLabel = stringField(issue.createdLabel, issue.updatedLabel);
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;

  return (
    <li className="post-item title" id={`issue-item-${issue.id}`} {...legacyHref}>
      <div className="span10 span-hard-wrap">
        <a
          href={authorHref}
          className="avatar-wrap mlarge hide-in-mobile"
          data-toggle="tooltip"
          data-placement="top"
          title={issue.authorLoginId}
        >
          <img src={issue.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
        </a>
        <div className="title-wrap">
          <a href={issueHref} className="title">
            {issue.title}
          </a>
        </div>
        <div className="infos">
          {issue.authorLabel ? (
            <a
              href={authorHref}
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
              title={issue.authorLoginId}
            >
              {issue.authorLabel}
            </a>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={createdLabel}>
            {createdLabel}
          </span>
          {issue.milestoneId ? (
            <span className="infos-item mileston-tag">
              <a
                href={`${projectHref}/milestone/${issue.milestoneId}`}
                data-toggle="tooltip"
                data-placement="top"
                title={t("milestone")}
              >
                {issue.milestoneTitle}
              </a>
            </span>
          ) : null}
          {issue.commentCount > 0 || issue.voterCount > 0 ? (
            <span className="infos-item item-count-groups">
              {issue.commentCount > 0 ? (
                <a href={`${issueHref}#comments`}>
                  <span className="count-groups item-icon ">
                    <i className="yobicon-comments"></i>
                  </span>
                  <span className="count-groups item-count ">{issue.commentCount}</span>
                </a>
              ) : null}
              {issue.voterCount > 0 ? (
                <a href={`${issueHref}#vote`}>
                  <span className="count-groups item-icon strong">
                    <i className="yobicon-hearts"></i>
                  </span>
                  <span className="count-groups item-count strong">{issue.voterCount}</span>
                </a>
              ) : null}
            </span>
          ) : null}
          <a href={projectHref} className="infos-link-item group-project-name">
            {issue.projectName}
          </a>
          <span className="post-id margin-right-5">#{issue.issueNumber}</span>
          {issue.labels.map((label) => (
            <a
              href={`${projectHref}/issues?state=${state}&labelIds=${label.id}`}
              className="label issue-label list-label"
              data-label-id={label.id}
              style={{ background: label.color }}
              key={String(label.id)}
            >
              {label.name}
            </a>
          ))}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right">
          {issue.assigneeLoginId ? (
            <a
              href={assigneeHref}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title={`${t("issue.assignee")}: ${issue.assigneeLabel}`}
            >
              <img
                src={issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png"}
                width="32"
                height="32"
                alt=""
              />
            </a>
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
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
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
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
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
            <OrganizationRouteLink to={`/organizations/${organizationName}`}>
              {t("title.organizationHome")}
            </OrganizationRouteLink>
          </li>
          <li className={active === "issues" ? "active" : ""}>
            <OrganizationRouteLink to={`/organizations/${organizationName}/issues`}>
              {t("menu.issue")}
            </OrganizationRouteLink>
          </li>
          <li className="">
            <OrganizationRouteLink to={`/organizations/${organizationName}/boards`}>
              {t("menu.board")}
            </OrganizationRouteLink>
          </li>
          <li className="">
            <OrganizationRouteLink to={`/organizations/${organizationName}/pullrequests`}>
              {t("menu.pullRequest")}
            </OrganizationRouteLink>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <OrganizationRouteLink to={`/organizations/${organizationName}/settingform`}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </OrganizationRouteLink>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrganizationRouteLink({ children, to }: { children: ReactNode; to: string }) {
  const legacyLinkProps = {
    activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
    search: {},
    to,
  } as unknown as Parameters<typeof Link>[0];
  return <Link {...legacyLinkProps}>{children}</Link>;
}

function totalPages(issues: OrganizationIssueListRestResponse) {
  if (typeof issues.totalPages === "number") {
    return issues.totalPages;
  }
  const pageSize = Number(issues.pageSize) || 20;
  return Math.max(1, Math.ceil((Number(issues.totalCount) || 0) / pageSize));
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
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
