import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type HTMLAttributes, type LiHTMLAttributes } from "react";
import { currentSessionQueryOptions } from "../../../api/session";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  listProjectIssues,
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

  if (!projectQuery.data || !sessionQuery.data || !issuesQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectIssuesBody
        currentUserId={stringField(sessionQuery.data.actorId, "0")}
        issues={issuesQuery.data}
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectIssuesBody({
  currentUserId,
  issues,
  ownerName,
  projectName,
  runtimeConfig,
  search,
}: {
  currentUserId: string;
  issues: ProjectIssueListRestResponse;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  search: ProjectIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const hasIssues = issues.items.length > 0;
  const draftItems = shouldShowDraftItems(search) ? (issues.draftItems ?? []) : [];

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div {...pjaxContainer} className="row-fluid issue-list-wrap">
          <div className="left-menu span2 span-hard-wrap">
            <div className="inner advanced">
              <QuickSearch
                currentUserId={currentUserId}
                issues={issues}
                search={search}
                state={search.state}
              />
              <IssueSearchForm
                basePath={runtimeConfig.basePath}
                currentUserId={currentUserId}
                ownerName={ownerName}
                projectName={projectName}
                search={search}
              />
            </div>
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
                state="open"
              />
              <StateTab
                active={search.state === "closed"}
                count={countField(issues, "closedIssueCount")}
                label={t("issue.state.closed")}
                state="closed"
              />
              <li>
                <TwoColumnModeCheckbox />
              </li>
              <li className="show-subtasks-li">
                <ShowSubtasksCheckbox />
              </li>
            </ul>
            {!hasIssues ? (
              <>
                <div className="error-wrap">
                  <i className="ico ico-err1"></i>
                  <p>{t("issue.is.empty")}</p>
                </div>
                <IssueListKeymap />
              </>
            ) : (
              <>
                <div className="filter-wrap board">
                  <MassUpdateToolbar
                    basePath={runtimeConfig.basePath}
                    currentUserId={currentUserId}
                    issues={issues.items}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                  {issues.items.length > 1 ? (
                    <IssueFilters orderBy={search.orderBy} orderDir={search.orderDir} />
                  ) : null}
                </div>
                <ul className="post-list-wrap row-fluid">
                  {draftItems.map((issue) => (
                    <ProjectIssueItem
                      basePath={runtimeConfig.basePath}
                      issue={issue}
                      key={`draft-${issue.id || issue.issueNumber}`}
                      ownerName={ownerName}
                      projectName={projectName}
                    />
                  ))}
                  {issues.items.map((issue) => (
                    <ProjectIssueItem
                      basePath={runtimeConfig.basePath}
                      issue={issue}
                      key={issue.id || issue.issueNumber}
                      ownerName={ownerName}
                      projectName={projectName}
                    />
                  ))}
                </ul>
                <div className="pull-left" style={{ padding: "10px" }}>
                  <a
                    href={excelHref(runtimeConfig.basePath, ownerName, projectName, search)}
                    className="ybtn small"
                  >
                    <i className="yobicon-file-excel"></i> {t("issue.downloadAsExcel")}
                  </a>
                </div>
                <IssueListKeymap />
                <div id="pagination" data-total={totalPages(issues)}></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
    <div className="filters pull-right">
      {filters.map((filter) => {
        const active = orderBy === filter.field;
        const legacySort = {
          orderby: filter.field,
          orderdir: active && orderDir === "desc" ? "asc" : "desc",
        } as unknown as HTMLAttributes<HTMLAnchorElement>;
        return (
          /* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy sort filters use href="#" plus order attrs. */
          <a
            href="#"
            {...legacySort}
            className={active ? "filter active" : "filter"}
            key={filter.field}
          >
            <i className={`ico btn-gray-arrow${!active || orderDir === "desc" ? " down" : ""}`}></i>
            {filter.label}
          </a>
        );
      })}
    </div>
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
  basePath,
  currentUserId,
  issues,
  ownerName,
  projectName,
}: {
  basePath: string;
  currentUserId: string;
  issues: RestIssueListItem[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const milestones = uniqueMilestones(issues);
  const labels = uniqueLabels(issues);
  const users = uniqueUsers(issues, currentUserId);

  return (
    <div className="mass-update-wrap hide-in-mobile">
      <form
        id="mass-update-form"
        className="mass-update-form pull-left"
        action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
        method="post"
      >
        <div className="btn-group check-all">
          {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update wraps this checkbox in a label. */}
          <label htmlFor="check-all">
            <input type="checkbox" id="check-all" data-target="checked-issue" />
          </label>
        </div>
        <MassUpdateDropdown
          id="state"
          label={t("issue.update.state")}
          name="state"
          options={[
            { label: t("issue.state.open"), value: "OPEN" },
            { label: t("issue.state.closed"), value: "CLOSED" },
          ]}
        />
        <div id="assignee" className="btn-group" data-name="assignee.id">
          <button className="btn dropdown-toggle medium" data-toggle="dropdown" disabled>
            <span className="d-label">{t("issue.update.assignee.id")}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu mass-update-list">
            <li data-value="0">
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
              <a>{t("issue.noAssignee")}</a>
            </li>
            <li data-value={currentUserId}>
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
              <a>{t("issue.assignToMe")}</a>
            </li>
            {users.length ? <li className="divider"></li> : null}
            {users.map((user) => (
              <li data-value={user.id} key={user.id}>
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
                <a className="usf-group">
                  <span className="avatar-wrap smaller">
                    <img src={user.avatarUrl} width="20" height="20" alt="" />
                  </span>
                  <strong className="name">{user.label}</strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {user.loginId}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {milestones.length ? (
          <MassUpdateDropdown
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
          />
        ) : null}
        {labels.length ? (
          <>
            <LabelMassUpdateDropdown
              id="attaching-label"
              label={t("issue.update.attachLabel")}
              listId="attach-label-list"
              name="attachingLabelIds"
              options={labels}
            />
            <LabelMassUpdateDropdown
              id="detaching-label"
              label={t("issue.update.detachLabel")}
              listId="delete-label-list"
              name="detachingLabelIds"
              options={labels}
            />
          </>
        ) : null}
      </form>
    </div>
  );
}

function MassUpdateDropdown({
  id,
  label,
  name,
  options,
}: {
  id: string;
  label: string;
  name: string;
  options: Array<{ divider?: boolean; label?: string; value: string }>;
}) {
  return (
    <div id={id} className="btn-group" data-name={name}>
      <button className="btn dropdown-toggle medium" data-toggle="dropdown" disabled>
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
  id,
  label,
  listId,
  name,
  options,
}: {
  id: string;
  label: string;
  listId: string;
  name: string;
  options: Array<{
    categoryId: string;
    categoryName: string;
    id: string;
    name: string;
  }>;
}) {
  return (
    <div id={id} className="btn-group" data-name={name}>
      <button className="btn dropdown-toggle medium" data-toggle="dropdown" disabled>
        <span className="d-label">{label}</span>
        <span className="d-caret">
          <span className="caret"></span>
        </span>
      </button>
      <ul id={listId} className="dropdown-menu mass-update-list">
        {groupLabels(options).map((group) => (
          <LabelMassUpdateGroup group={group} key={group.categoryId} />
        ))}
      </ul>
    </div>
  );
}

function LabelMassUpdateGroup({
  group,
}: {
  group: {
    categoryId: string;
    categoryName: string;
    labels: Array<{ id: string; name: string }>;
  };
}) {
  return (
    <>
      <li className="disabled" data-category={group.categoryId}>
        <span>{group.categoryName}</span>
      </li>
      {group.labels.map((label) => (
        <li data-value={label.id} data-category={group.categoryId} key={label.id}>
          {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
          <a>
            <span className="issue-label active list-label" data-label-id={label.id}>
              {label.name}
            </span>
          </a>
        </li>
      ))}
      <li className="divider" data-category={group.categoryId}></li>
    </>
  );
}

function ProjectIssueItem({
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
  const { t } = useLegacyMessages();
  const issueId = stringField(issue.id, String(issue.issueNumber));
  const issueNumber = stringField(issue.issueNumber, issueId);
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const authorLoginId = stringField(issue.authorLoginId, "");
  const authorHref = prefixBasePath(basePath, `/${authorLoginId}`);
  const assigneeLoginId = stringField(issue.assigneeLoginId, "");
  const createdLabel = stringField(issue.createdLabel, stringField(issue.updatedLabel, ""));
  const issueWeight = issue.weight ?? 0;
  const titleParts = splitHeaderWordsInBrackets(issue.title);
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;
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

  return (
    <li
      className="post-item title"
      id={`issue-item-${issueId}`}
      data-item="issue-item"
      data-value={`${authorLoginId} ${issueNumber} ${issue.title}`}
      {...legacyHref}
    >
      <div className="span9 span-hard-wrap">
        {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy mass-update checkbox label targets the row checkbox by id. */}
        <label htmlFor={`issue-${issueId}`} className="mass-update-check hide-in-mobile">
          <input
            id={`issue-${issueId}`}
            type="checkbox"
            name="checked-issue"
            data-toggle="issue-checkbox"
            data-issue-id={issueId}
            data-issue-labels={issueLabelData(issue)}
          />
        </label>
        <div {...legacyFor} className="issue-item-row">
          <div className="title-wrap">
            <a href={issueHref} className="title">
              <span className="post-id">
                {issue.isDraft ? (
                  <span className="draft-number">#{t("issue.state.draft")}</span>
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
              <LegacyTitlePrefixAnchor key={`${issueId}-${prefix}`}>
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
            {issue.milestoneId ? (
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
            {issue.labels.map((label) => (
              /* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy issue labels use href="#" and JS filter behavior. */
              <a
                href="#"
                className="label issue-label list-label active"
                data-category-id={label.categoryId ?? ""}
                data-label-id={label.id}
                key={String(label.id)}
              >
                {label.name}
              </a>
            ))}
            <div className="child-issue-list hide">
              <IssueChildRows
                basePath={basePath}
                issues={issue.childIssues ?? []}
                ownerName={ownerName}
                projectName={projectName}
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
                alt=""
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
  issues,
  ownerName,
  projectName,
}: {
  basePath: string;
  issues: RestIssueChildItem[];
  ownerName: string;
  projectName: string;
}) {
  const openIssues = issues.filter((issue) => issue.state !== "closed");
  const closedIssues = issues.filter((issue) => issue.state === "closed");
  const orderedIssues = [...openIssues, ...closedIssues];

  return orderedIssues.length ? (
    <div className="child-issues">
      {orderedIssues.map((issue) => (
        <IssueChildRow
          basePath={basePath}
          issue={issue}
          key={`${issue.state}-${issue.issueNumber}`}
          ownerName={ownerName}
          projectName={projectName}
        />
      ))}
    </div>
  ) : null;
}

function IssueChildRow({
  basePath,
  issue,
  ownerName,
  projectName,
}: {
  basePath: string;
  issue: RestIssueChildItem;
  ownerName: string;
  projectName: string;
}) {
  const issueNumber = stringField(issue.issueNumber, "");
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const isClosed = issue.state === "closed";

  return (
    <div className="issue-item  child-issue">
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
      <span className="font12 no-border-at-child"></span>
      <span className="child-issue-date" title={issue.createdLabel}>
        {issue.createdLabel}
      </span>
    </div>
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
  issues,
  search,
  state,
}: {
  currentUserId: string;
  issues: ProjectIssueListRestResponse;
  search: ProjectIssuesSearch;
  state: "closed" | "open";
}) {
  const { t } = useLegacyMessages();
  const pjaxFilter = { "pjax-filter": "" } as unknown as HTMLAttributes<HTMLAnchorElement>;
  const allLabel = state === "closed" ? t("issue.list.all.closed") : t("issue.list.all.open");
  const allCount = countField(issues, state === "closed" ? "closedIssueCount" : "openIssueCount");

  return (
    <ul className="lst-stacked unstyled">
      <li
        className={
          !search.assigneeId && !search.authorId && !search.commenterId ? "active" : undefined
        }
      >
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-assignee-id=""
          data-author-id=""
          data-commenter-id=""
          data-milestone-id={search.milestoneId}
        >
          {allLabel}
          <span className="num-badge pull-right">{allCount}</span>
        </a>
      </li>
      <li className={search.assigneeId === currentUserId ? "active" : undefined}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-assignee-id={currentUserId}
          data-author-id=""
          data-commenter-id=""
          data-milestone-id={search.milestoneId}
        >
          {t("issue.list.assignedToMe")}
          <span className="num-badge pull-right">{countField(issues, "assignedToMeCount")}</span>
        </a>
      </li>
      <li className={search.authorId === currentUserId ? "active" : undefined}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-assignee-id=""
          data-author-id={currentUserId}
          data-commenter-id=""
          data-milestone-id={search.milestoneId}
        >
          {t("issue.list.authoredByMe")}
          <span className="num-badge pull-right">{countField(issues, "authoredByMeCount")}</span>
        </a>
      </li>
      <li className={search.commenterId === currentUserId ? "active" : undefined}>
        {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter attrs. */}
        <a
          {...pjaxFilter}
          href="#"
          data-assignee-id=""
          data-author-id=""
          data-commenter-id={currentUserId}
          data-milestone-id={search.milestoneId}
        >
          {t("issue.list.commentedByMe")}
          <span className="num-badge pull-right">{countField(issues, "commentedByMeCount")}</span>
        </a>
      </li>
    </ul>
  );
}

function IssueSearchForm({
  basePath,
  currentUserId,
  ownerName,
  projectName,
  search,
}: {
  basePath: string;
  currentUserId: string;
  ownerName: string;
  projectName: string;
  search: ProjectIssuesSearch;
}) {
  const { t } = useLegacyMessages();

  return (
    <form
      id="search"
      name="search"
      action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
      method="get"
    >
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
            name="filter"
            className="textbox full"
            type="text"
            defaultValue={search.filter}
            data-search="filter"
          />
          <button type="button" className="search-btn" data-submit="submit">
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
            >
              <option value="">{t("common.order.all")}</option>
              <option value={currentUserId}>{t("issue.list.authoredByMe")}</option>
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
            >
              <option value="">{t("common.order.all")}</option>
              <option value="0">{t("issue.noAssignee")}</option>
              <option value={currentUserId}>{t("issue.list.assignedToMe")}</option>
            </select>
          </dd>
        </dl>
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
            />
            <button type="button" className="search-btn btn-calendar">
              <i className="yobicon-calendar2"></i>
            </button>
          </dd>
        </dl>
        <div className="labels-wrap">
          <a
            href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
            className="ybtn ybtn-default ybtn-mini pull-right"
          >
            <i className="yobicon-cog vmiddle"></i>
            <span className="vmiddle" style={{ marginLeft: "2px" }}>
              {t("label.manage")}
            </span>
          </a>
        </div>
      </div>
    </form>
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
  const legacyState = { state } as unknown as HTMLAttributes<HTMLAnchorElement>;
  const dataPjax = { "data-pjax": "" } as unknown as HTMLAttributes<HTMLLIElement>;

  return (
    <li className={active ? "active" : undefined} {...dataPjax}>
      {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus state attr. */}
      <a href="#" {...legacyState}>
        {label}
        <span className="num-badge">{count}</span>
      </a>
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

function ShowSubtasksCheckbox() {
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
          <input id="toggle-show-subtasks" type="checkbox" />
          <span className="show-subtasks-text">{t("common.show.subtasks")}</span>
        </div>
      </label>
    </div>
  );
}

function IssueListKeymap() {
  const { t } = useLegacyMessages();

  return (
    <div className="pull-left" style={{ padding: "10px 0", marginLeft: "55px" }}>
      <a href="#helpKeys" data-toggle="modal" className="ybtn ybtn-inverse ybtn-mini">
        {t("title.keymap")}
      </a>
    </div>
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
  search: ProjectIssuesSearch,
) {
  const params = new URLSearchParams();
  if (search.filter) {
    params.set("filter", search.filter);
  }
  if (search.state === "closed") {
    params.set("state", "closed");
  }
  params.set("format", "xls");
  return `${prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}?${params.toString()}`;
}

function issueLabelData(issue: RestIssueListItem) {
  return issue.labels
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
    .concat(issue.labels.length ? "|" : "");
}

function uniqueMilestones(issues: RestIssueListItem[]) {
  const milestones = new Map<string, { id: string; title: string }>();
  for (const issue of issues) {
    const id = stringField(issue.milestoneId, "");
    const title = stringField(issue.milestoneTitle, "");
    if (id && id !== "0" && title && !milestones.has(id)) {
      milestones.set(id, { id, title });
    }
  }
  return Array.from(milestones.values());
}

function uniqueLabels(issues: RestIssueListItem[]) {
  const labels = new Map<
    string,
    { categoryId: string; categoryName: string; id: string; name: string }
  >();
  for (const issue of issues) {
    for (const label of issue.labels) {
      const id = stringField(label.id, "");
      if (id && !labels.has(id)) {
        labels.set(id, {
          categoryId: stringField(label.categoryId, ""),
          categoryName: stringField(label.categoryName, ""),
          id,
          name: label.name,
        });
      }
    }
  }
  return Array.from(labels.values());
}

function groupLabels(
  labels: Array<{ categoryId: string; categoryName: string; id: string; name: string }>,
) {
  const groups = new Map<
    string,
    { categoryId: string; categoryName: string; labels: Array<{ id: string; name: string }> }
  >();
  for (const label of labels) {
    const group = groups.get(label.categoryId) ?? {
      categoryId: label.categoryId,
      categoryName: label.categoryName,
      labels: [],
    };
    group.labels.push({ id: label.id, name: label.name });
    groups.set(label.categoryId, group);
  }
  return Array.from(groups.values());
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
  return typeof value === "string" ? value : fallback;
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
